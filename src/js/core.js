'use strict';
// ═══════════════════════════════════════════════════════════
//  GLOBALS
// ═══════════════════════════════════════════════════════════
const FFT   = 4096;
const SMTH  = 0.6;    // crisper attack; the fall is shaped per bar (smoothBar)

let actx, stream, srcNode, upmix, splitter, aMain, aL, aR, aKL, aKR, aBeat;
let running = false, rafId = null;

// Reusable buffers: nothing is allocated per frame (no GC stutter).
const bufL  = new Float32Array(FFT), bufR  = new Float32Array(FFT);
const bufKL = new Float32Array(FFT), bufKR = new Float32Array(FFT);
const bufTD = new Float32Array(FFT);
let bufFD = new Float32Array(FFT / 2), bufBeat = new Float32Array(FFT / 2), prevBeat = null;

// Frame timing: everything that moves is time-based, so a 60 Hz and a 144 Hz monitor behave alike.
let lastFrame = 0, dtMs = 16.7, frameScale = 1;

// VU ballistics. Classic VU: 300 ms to reach 99% (tau ≈ 65 ms), same up and down.
// Calibration: 0 VU = -18 dBFS (EBU R68 / common studio reference). The needle shows VU, the clip LED uses the real sample peak.
// 0 VU reference. AUTO follows the music (slow, ~6 s) so the needles live around −4 VU whether the
// track is a quiet 70s master or a −6 LUFS modern one; fixed values are for real metering.
let vuCal = 'AUTO';
let autoRef = 18, autoRms = -18;
function vuRef(){ return vuCal === 'AUTO' ? autoRef : Number(vuCal); }
const PEAK_HOLD_MS = 1800;    // peak marker hold
const PEAK_FALL = 12;         // dB/s after the hold
function mkVU() {
  return { lvl: -60, vel: 0, peak: -60, peakTmr: 0, clip: false, clipTmr: 0, samplePeak: -90, dbfs: -90 };
}
const vu = { L: mkVU(), R: mkVU() };

// Spectrum peaks (hold/decay expressed for 60 fps, scaled by frameScale)
const NBARS = 128;
const spPeak   = new Float32Array(NBARS).fill(-Infinity);
const spPeakTm = new Float32Array(NBARS).fill(0);
const SP_HOLD  = 80;
const SP_DECAY = 0.4; // dB per 60 Hz frame after hold
const spLvl = new Float32Array(NBARS).fill(-120);
const BAR_FALL = 38;   // dB/s
function smoothBar(b, db) {
  if (db >= spLvl[b]) spLvl[b] = db;
  else spLvl[b] = Math.max(db, spLvl[b] - BAR_FALL * dtMs / 1000);
  return spLvl[b];
}

// Loudness (ITU-R BS.1770: K-weighting, L+R power sum, 400 ms momentary / 3 s short-term)
let loudBlocks = [];            // {t, ms}
let peakHoldDb = -90, peakHoldT = 0;
const lufsHist = []; let lufsHistT = 0;
let gateBlocks = [];          // mean-square of 400 ms blocks, one every 100 ms (75 % overlap)
const ABS_GATE = Math.pow(10, (-70 + 0.691) / 10);   // -70 LUFS as block power
function integratedLufs(blocks = gateBlocks){
  let n = 0, sum = 0;
  for (const ms of blocks) if (ms > ABS_GATE) { n++; sum += ms; }
  if (n < 5) return -Infinity;
  const relGate = sum / n * 0.1;                        // -10 LU below the absolutely-gated mean
  let n2 = 0, sum2 = 0;
  for (const ms of blocks) if (ms > ABS_GATE && ms > relGate) { n2++; sum2 += ms; }
  return n2 ? -0.691 + 10 * Math.log10(sum2 / n2) : -Infinity;
}
// Loudness range (EBU Tech 3342): short-term loudness every 100 ms, gated at -70 LUFS and 20 LU under the
// gated mean, LRA = 95th - 10th percentile. Per track, like the integrated loudness.
// Kept as a 0.1 LU histogram (-70 … +30 LUFS) plus the power sum above the absolute gate, so a long
// track or mix costs the same as a short one.
const LRA_MIN = -70, LRA_STEP = 0.1, LRA_BINS = 1000;
const lraHist = new Uint32Array(LRA_BINS);
let lraN = 0, lraPow = 0, lraValue = NaN, lraT = 0, lraFrom = 0, gateFrom = 0;
let measureN = 0;            // bumps for every new measurement (track change, a new start): part of the history id
const GATE_MAX = 216000;     // 6 hours of gate blocks: long DJ sets and podcasts stay whole
let crestRing = [];          // the last 400 ms of {t, peak and sum of squares per channel, samples}
function lraReset(now) { lraHist.fill(0); lraN = 0; lraPow = 0; lraValue = NaN; lraT = 0; lraFrom = (now || performance.now()) + 3000; }
function lraAdd(lufsS) {
  if (!(lufsS > LRA_MIN)) return;                            // absolute gate
  const b = Math.min(LRA_BINS - 1, Math.floor((lufsS - LRA_MIN) / LRA_STEP));
  lraHist[b]++; lraN++; lraPow += Math.pow(10, (lufsS + 0.691) / 10);
}
function loudnessRange() {
  if (lraN < 50) return NaN;                                 // a few seconds before it means anything
  const relGate = -0.691 + 10 * Math.log10(lraPow / lraN) - 20;
  const first = Math.max(0, Math.ceil((relGate - LRA_MIN) / LRA_STEP));
  let n = 0;
  for (let b = first; b < LRA_BINS; b++) n += lraHist[b];
  if (n < 50) return NaN;
  const pct = q => {                                         // value at quantile q, bin centres
    const target = q * (n - 1); let c = 0;
    for (let b = first; b < LRA_BINS; b++) { c += lraHist[b]; if (c > target) return LRA_MIN + (b + 0.5) * LRA_STEP; }
    return LRA_MIN + (LRA_BINS - 0.5) * LRA_STEP;
  };
  return pct(0.95) - pct(0.10);
}
// True peak: hold for reading plus the track's maximum. Sample peak maximum too, for when there's no true peak.
let tpHoldDb = -90, tpHoldT = 0, tpMaxDb = -Infinity, pkMaxDb = -Infinity;
// The player reports a new track a moment after (or before) its sound changes. So peaks count from 1 s
// into a track, and the track history uses the "settled" maxima, which leave out the last second: when
// the next track is announced, that second may already be the next track's first transient.
let pkSettled = -Infinity, tpSettled = -Infinity;
const pkRecent = [];
function notePeaks(now, pk, tp) {
  pkRecent.push({ t: now, pk, tp });
  while (pkRecent.length && now - pkRecent[0].t > 1000) {
    const o = pkRecent.shift();
    if (o.pk > pkSettled) pkSettled = o.pk;
    if (o.tp > tpSettled) tpSettled = o.tp;
  }
}
function resetTrackPeaks() { tpMaxDb = pkMaxDb = pkSettled = tpSettled = -Infinity; pkRecent.length = 0; }
// Spotify's loudness normalisation (the default "Normal" level): every track is played at -14 LUFS
// integrated. Louder tracks are turned down; quieter ones are turned up only as far as their peak
// stays at -1 dB (no limiter at this level). Returns the change in dB, NaN until there's an integrated.
const SPOTIFY_TARGET = -14;
function spotifyGain(I, peakMax) {
  if (!isFinite(I)) return NaN;
  const g = SPOTIFY_TARGET - I;
  if (g <= 0) return g;
  return Math.max(0, Math.min(g, -1 - (isFinite(peakMax) ? peakMax : -1)));
}
function trackPeakMax() { return tpAvailable && isFinite(tpMaxDb) ? tpMaxDb : pkMaxDb; }
let spotGain = NaN;
// Spotless (librespot) lowers the level before Windows ever hears it: its volume knob is a cubic
// curve over 60 dB and its own normalisation ("nivelación") can change it again. The main process
// reads both from Spotless's settings; the master's own loudness is what we hear minus that gain.
let playerState = null;                 // { volume, levelling, gainDb } or null
if (window.nowPlaying && window.nowPlaying.onPlayer) window.nowPlaying.onPlayer(s => { playerState = s && typeof s === 'object' ? s : null; });
const playerIsSpotless = info => !!(info && /spotless/i.test(info.app || ''));
// dB the player took off what we measure (0 = nothing known), NaN when it can't be known (levelling on)
function playerGainFor(info) {
  if (!playerState || !playerIsSpotless(info)) return 0;
  if (playerState.levelling) return NaN;
  return isFinite(playerState.gainDb) ? playerState.gainDb : 0;
}
const fmtVol = s => 'Spotless al ' + Math.round(s.volume) + ' % (' + fmtGain(s.gainDb) + ' dB)';
const fmtGain = g => (g > 0.05 ? '+' : g < -0.05 ? '\u2212' : '') + Math.abs(g).toFixed(1);
let phaseSm = 1, crestSm = 0;

// BPM: spectral-flux onsets + adaptive threshold + median of folded intervals
let lastBeat  = 0;
let bpmVal    = 0, bpmConfidence = 0;
let beatFlashUntil = 0;



// Mastering visual modes
const SPECTRUM_MODES = ['MASTERING','ANALOG','CRT','OLED'];
let spectrumModeIndex = 0;
let spectrumSkin = 'MODERN';
let flSensitivity = 1; // 0 normal · 1 hot · 2 max
let vuSkin = 'MODERN';

function resetSpectrumPeaks(){
  spPeak.fill(-Infinity);
  spPeakTm.fill(0);
  spLvl.fill(-120);
}

function setSpectrumSkin(skin){
  spectrumSkin = skin;
  document.body.classList.toggle('spectrum-fl', spectrumSkin === 'FL90');
  resetSpectrumPeaks();
  if (!running && typeof drawIdle === 'function') drawIdle();
}

function setFlSensitivity(next){
  flSensitivity = (typeof next === 'number') ? next : (flSensitivity + 1) % 3;
  resetSpectrumPeaks();
  if (!running && typeof drawIdle === 'function') drawIdle();
}

function setVUSkin(skin){
  vuSkin = skin;
  if (!running && typeof drawIdle === 'function') drawIdle();
}

function setSpectrumMode(idx){
  spectrumModeIndex = (idx + SPECTRUM_MODES.length) % SPECTRUM_MODES.length;
  const mode = SPECTRUM_MODES[spectrumModeIndex];
  document.body.classList.remove('mode-analog','mode-crt','mode-oled');
  if(mode === 'ANALOG') document.body.classList.add('mode-analog');
  if(mode === 'CRT') document.body.classList.add('mode-crt');
  if(mode === 'OLED') document.body.classList.add('mode-oled');
}

// Mastering meters. Loudness follows ITU-R BS.1770 (K-weighting done by the audio graph,
// channel powers summed, gated windows not applied: this is the live momentary/short-term reading).
const mEls = {};
function el(id){ return mEls[id] || (mEls[id] = document.getElementById(id)); }

// Mean square of only the samples that arrived since the previous frame (no double counting).
function freshMeanSquare(buf, n){
  let s = 0;
  for(let i = FFT - n; i < FFT; i++) s += buf[i] * buf[i];
  return s / n;
}
function windowLoudness(now, ms){
  let w = 0, s = 0;
  for(let i = loudBlocks.length - 1; i >= 0; i--){
    const b = loudBlocks[i];
    if(now - b.t > ms) break;
    s += b.ms * b.dt; w += b.dt;
  }
  return w > 0 ? -0.691 + 10 * Math.log10(Math.max(s / w, 1e-12)) : -Infinity;
}

function updateMasterMeters(now){
  if(!running || !aKL || !aKR) return;
  aKL.getFloatTimeDomainData(bufKL);
  aKR.getFloatTimeDomainData(bufKR);

  const n = Math.max(64, Math.min(FFT, Math.round(dtMs / 1000 * actx.sampleRate)));
  const ms = freshMeanSquare(bufKL, n) + freshMeanSquare(bufKR, n);   // G = 1.0 for L and R
  loudBlocks.push({ t: now, ms, dt: dtMs });
  while(loudBlocks.length && now - loudBlocks[0].t > 3000) loudBlocks.shift();

  const lufsM = windowLoudness(now, 400);
  const lufsS = windowLoudness(now, 3000);
  if (now - lufsHistT >= 100) {
    // One block per 100 ms of time, not per frame: a slow frame (busy PC, minimized window) counts for
    // the blocks it covered, so the integrated value and the time heard stay right (at most 0.5 s caught up).
    const steps = Math.min(5, Math.floor((now - lufsHistT) / 100));
    lufsHistT = steps === 5 ? now : lufsHistT + steps * 100;
    const playing = npPlaying();
    for (let k = 0; k < steps; k++) {
      lufsHist.push(isFinite(lufsM) ? lufsM : -70); if (lufsHist.length > 300) lufsHist.shift();
      if (isFinite(lufsM) && playing && now >= gateFrom) { gateBlocks.push(Math.pow(10, (lufsM + 0.691) / 10)); if (gateBlocks.length > GATE_MAX) gateBlocks.shift(); }
      if (isFinite(lufsS) && playing && now >= lraFrom) lraAdd(lufsS);   // the first 3 s are still the previous track / silence
    }
    const I = integratedLufs();
    miniVals.i = I;
    el('mLufsI').textContent = isFinite(I) ? 'I ' + I.toFixed(1) : 'I --.-';
    const pg = playerGainFor(np);
    spotGain = isFinite(pg) ? spotifyGain(I - pg, trackPeakMax() - pg) : NaN;
    const sp = el('mSpot');
    if (isNaN(pg) && isFinite(I)) {
      sp.textContent = 'SPOTIFY ?'; sp.className = 'spot warn';
      sp.title = 'Spotless tiene la nivelación prendida: ya normaliza el sonido, así que no se puede saber cuánto ajustaría Spotify el master. Apagala en Spotless para medirlo.';
    } else {
      sp.textContent = isFinite(spotGain) ? 'SPOTIFY ' + fmtGain(spotGain) + ' dB' : '';
      sp.className = 'spot' + (spotGain < -6 ? ' hot' : spotGain < -3 ? ' warn' : '');
      sp.title = 'Cuánto subiría o bajaría Spotify este tema (normalización a −14 LUFS)' +
        (pg ? '. Compensa el volumen de ' + fmtVol(playerState) + ': el master mide ' + (I - pg).toFixed(1) + ' LUFS' : '');
    }
    if (now - lraT >= 1000) { lraT = now; lraValue = loudnessRange(); el('mLra').textContent = isFinite(lraValue) ? 'LRA ' + lraValue.toFixed(1) : 'LRA --'; }
  }

  // Sample peak (unweighted) with a readable 1.5 s hold; crest per channel over the last 400 ms
  let peak = 0, sumL = 0, sumR = 0, cross = 0, pL = 0, pR = 0;
  for(let i = FFT - n; i < FFT; i++){
    const L = bufL[i], R = bufR[i];
    sumL += L*L; sumR += R*R; cross += L*R;
    const aL_ = L < 0 ? -L : L, aR_ = R < 0 ? -R : R;
    if (aL_ > pL) pL = aL_; if (aR_ > pR) pR = aR_;
  }
  peak = Math.max(pL, pR);
  crestRing.push({ t: now, pL, pR, sL: sumL, sR: sumR, n });
  while (crestRing.length > 1 && now - crestRing[0].t > 400) crestRing.shift();
  const peakDb = 20 * Math.log10(Math.max(peak, 1e-9));
  const counting = npPlaying() && now - trackStart > 1000;
  const pkNow = counting && peakDb > -89 ? peakDb : -Infinity;
  if (pkNow > pkMaxDb) pkMaxDb = pkNow;
  let tpNow = -Infinity;
  if(peakDb >= peakHoldDb || now - peakHoldT > 1500){ peakHoldDb = peakDb; peakHoldT = now; }
  const k300 = 1 - Math.exp(-dtMs / 300);
  {
    let wpL = 0, wpR = 0, wsL = 0, wsR = 0, wn = 0;
    for (const c of crestRing) { if (c.pL > wpL) wpL = c.pL; if (c.pR > wpR) wpR = c.pR; wsL += c.sL; wsR += c.sR; wn += c.n; }
    const rL = wsL / wn, rR = wsR / wn;
    // each channel's own peak against its own RMS: a signal on one side only isn't 3 dB off
    const cL = rL > 1e-7 ? 20 * Math.log10(wpL) - 10 * Math.log10(rL) : NaN, cR = rR > 1e-7 ? 20 * Math.log10(wpR) - 10 * Math.log10(rR) : NaN;
    const c = isFinite(cL) && isFinite(cR) ? (rL >= rR ? cL : cR) : isFinite(cL) ? cL : cR;
    if (isFinite(c)) crestSm += (c - crestSm) * k300;
  }
  const crest = crestSm;
  // Phase: sample-aligned sums from the audio thread when available, else this frame's buffers.
  if (corrFresh) { sumL = corrLL; sumR = corrRR; cross = corrLR; corrLL = corrRR = corrLR = 0; corrFresh = false; }
  const den = Math.sqrt(sumL * sumR);
  if(den > 1e-9) phaseSm += (cross / den - phaseSm) * k300;

  miniVals.m = lufsM; miniVals.s = lufsS; miniVals.tp = tpAvailable ? tpHoldDb : peakHoldDb;
  const silent = !isFinite(lufsM) || lufsM < -70;
  el('mLufs').textContent = silent ? '--.-' : lufsM.toFixed(1);
  el('mLufsS').textContent = (!isFinite(lufsS) || lufsS < -70) ? 'S --.-' : 'S ' + lufsS.toFixed(1);
  // Peak card: true peak (dBTP) when the audio thread measures it, sample peak (dBFS) otherwise.
  let shownDb = peakHoldDb;
  if (tpAvailable) {
    if (tpFresh) {                                         // ~47 messages/s against 60–144 frames/s
      const tpDb = 20 * Math.log10(Math.max(tpBlock, 1e-9)); tpBlock = 0; tpFresh = false;
      if (tpDb >= tpHoldDb || now - tpHoldT > 1500) { tpHoldDb = tpDb; tpHoldT = now; }
      if (counting && tpDb > -89) { tpNow = tpDb; if (tpDb > tpMaxDb) tpMaxDb = tpDb; }
    }
    shownDb = tpHoldDb;
    el('mPeakTitle').textContent = 'True peak';
    el('mPeakUnit').textContent = 'dBTP · MAX ' + (isFinite(tpMaxDb) ? tpMaxDb.toFixed(1) : '--.-');
  }
  notePeaks(now, pkNow, tpNow);
  const mPeak = el('mPeak');
  mPeak.textContent = shownDb < -89 ? '--.-' : shownDb.toFixed(1);
  mPeak.className = 'metric-value ' + (shownDb > -1 ? 'hot' : shownDb > -6 ? 'warn' : '');
  el('mCrest').textContent = silent || !isFinite(crest) ? '--.-' : crest.toFixed(1);
  const mPhase = el('mPhase');
  if(silent){ mPhase.textContent = '--'; mPhase.className = 'metric-value good'; }
  else {
    mPhase.textContent = (phaseSm >= 0 ? '+' : '') + phaseSm.toFixed(2);
    mPhase.className = 'metric-value ' + (phaseSm < 0 ? 'hot' : phaseSm < .25 ? 'warn' : 'good');
  }
}

// ═══════════════════════════════════════════════════════════
//  CANVAS REFERENCES
// ═══════════════════════════════════════════════════════════
const cVL = document.getElementById('vuL');
const cVR = document.getElementById('vuR');
const cSP = document.getElementById('spectrum');
const cOS = document.getElementById('oscilloscope');
const xVL = cVL.getContext('2d');
const xVR = cVR.getContext('2d');
const xSP = cSP.getContext('2d');
const xOS = cOS.getContext('2d');
const cDK = document.getElementById('deck');
const xDK = cDK.getContext('2d');
const cTP = document.getElementById('tape');
const cGO = document.getElementById('gonio');
const cMI = document.getElementById('mini');
const xMI = cMI.getContext('2d');
let miniMode = false;
const miniVals = { m: -Infinity, s: -Infinity, i: -Infinity, tp: -90 };
const xGO = cGO.getContext('2d');
const xTP = cTP.getContext('2d');

// Fit every canvas to the space its panel has right now (the layout is flexible, so this runs on
// load, on resize and whenever a module is switched on or off).
function availHeight(c, min) {
  const p = c.parentElement, cs = getComputedStyle(p);
  let h = p.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  for (const ch of p.children) if (ch !== c && getComputedStyle(ch).position !== 'absolute') h -= ch.offsetHeight + 4;
  return Math.max(min, Math.floor(h));
}
function sizeCanvases() {
  const pr = window.devicePixelRatio || 1;
  const all = [[cVL, 140], [cVR, 140], [cGO, 120], [cSP, 90], [cOS, 60], [cDK, 100], [cTP, 160], [cMI, 40]];
  all.forEach(([c]) => { c.style.height = '0px'; });        // let the panels settle without the old canvas size
  const sizes = all.map(([c, min]) => [c, c.parentElement.clientWidth - 16, availHeight(c, min)]);
  sizes.forEach(([c, w, h]) => {
    w = Math.max(50, w);
    c.width  = Math.round(w * pr);
    c.height = Math.round(h * pr);
    c.style.width  = w + 'px';
    c.style.height = h + 'px';
    c.getContext('2d').scale(pr, pr);
  });
  const sp = document.getElementById('lufsHist');
  if (sp) { const w = sp.clientWidth || 200; sp.width = Math.round(w * pr); sp.height = Math.round(22 * pr); sp.getContext('2d').setTransform(pr, 0, 0, pr, 0, 0); }
}
let resizeT = 0;
window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(() => { sizeCanvases(); if (!running && typeof drawIdle === 'function') drawIdle(); }, 60); });
