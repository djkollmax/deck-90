'use strict';
// ═══════════════════════════════════════════════════════════
//  MAIN LOOP
// ═══════════════════════════════════════════════════════════
let beatStep = 0, wasFlashing = false;
let sparkT = 0;
function drawLufsHistory(now) {
  if (now - sparkT < 100) return;
  sparkT = now;
  const c = el('lufsHist'); if (!c) return;
  const x = c.getContext('2d'), W = c.clientWidth, H = 22, LO = -32, HI = -4;
  x.clearRect(0, 0, W, H);
  const y = v => H - 1 - (Math.max(LO, Math.min(HI, v)) - LO) / (HI - LO) * (H - 2);
  [[-14, 'rgba(116,255,183,.22)'], [-9, 'rgba(255,120,60,.22)']].forEach(([v, col]) => {
    x.strokeStyle = col; x.setLineDash([]); x.beginPath(); x.moveTo(0, y(v) + .5); x.lineTo(W, y(v) + .5); x.stroke();
  });
  x.setLineDash([]);
  if (lufsHist.length < 2) return;
  const step = W / 299, x0 = W - (lufsHist.length - 1) * step;
  x.beginPath();
  lufsHist.forEach((v, i) => { const px = x0 + i * step; i ? x.lineTo(px, y(v)) : x.moveTo(px, y(v)); });
  const fill = x.createLinearGradient(0, 0, 0, H);
  fill.addColorStop(0, 'rgba(121,217,255,.28)'); fill.addColorStop(1, 'rgba(121,217,255,0)');
  x.lineTo(W, H); x.lineTo(x0, H); x.closePath(); x.fillStyle = fill; x.fill();
  x.beginPath();
  lufsHist.forEach((v, i) => { const px = x0 + i * step; i ? x.lineTo(px, y(v)) : x.moveTo(px, y(v)); });
  x.strokeStyle = 'rgba(160,230,255,.9)'; x.lineWidth = 1.2; x.stroke();
}
const bleds = document.querySelectorAll('.beat-leds .led');

// Errors never stop the show: each part runs guarded, the loop always schedules the next frame,
// and the first occurrence of each error is reported (program: written to media.log).
const seenErrors = new Set();
function report(where, e) {
  const msg = where + ': ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : String(e));
  if (seenErrors.has(msg)) return;
  seenErrors.add(msg);
  console.error(msg);
  if (window.appLog) window.appLog(msg);
}
window.addEventListener('error', ev => report('window', ev.error || ev.message));
window.addEventListener('unhandledrejection', ev => report('promise', ev.reason));
function guard(where, fn) {
  try { fn(); }
  catch (e) {
    report(where, e);
    // A drawing function that threw may have left save()s open: unwind them (bounded) and reset the state.
    const dpr = window.devicePixelRatio || 1;
    [xVL, xVR, xGO, xSP, xOS, xDK, xTP, xMI].forEach(c => { try {
      for (let i = 0; i < 32; i++) c.restore();
      c.setTransform(dpr, 0, 0, dpr, 0, 0); c.shadowBlur = 0; c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    } catch (_) {} });
  }
}

let lastRafAt = 0, lastDrawAt = 0;
// The window in the tray or minimized (the program says so): keep measuring, don't draw.
let winShown = true;
if (window.winCtl && window.winCtl.onShown) window.winCtl.onShown(v => { winShown = !!v; wakeDisplays(); });

// ── Displays at rest are left as they are
// With nothing coming in (a paused song), every display settles within seconds: the needles on their stop,
// the bars and their peaks on the floor, the tape still. Once a frame changes nothing that any display shows
// (twenty frames in a row, so the phosphor trails have faded too), the displays are not drawn again until
// something they show moves, a sound comes in, the window changes or you do something. Anything that moves
// by itself (a scrolling song title, the spectrogram, the shop-window demo) keeps them drawing.
let lastSound = 0;                       // the last frame with any signal at all (above −80 dBFS)
let wakeUntil = 0;                       // drawing stays on until then
let restSig = 0, restSame = 0;    // (restAnim, set by a display that moves by itself, lives in stills.js)
let displaysDrawnAt = 0;                 // the last time the displays were drawn (the still layers' clock)
function wakeDisplays(ms = 1500) { wakeUntil = Math.max(wakeUntil, performance.now() + ms); restSame = 0; }
['pointerdown', 'pointermove', 'keydown', 'wheel'].forEach(ev => window.addEventListener(ev, () => wakeDisplays(), { capture: true, passive: true }));
window.addEventListener('resize', () => wakeDisplays());
if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', () => wakeDisplays());
// everything the displays show that can change without a sound or a click, as one number
function restSignature() {
  try { return restSignatureOf(); } catch (_) { return NaN; }   // never equal: the displays keep drawing
}
function restSignatureOf() {
  let h = 17;
  // (levels under −100 dB are under every display's floor: they count as one)
  const num = v => { h = (Math.imul(h, 31) + (isFinite(v) ? Math.round(Math.max(-100, v) * 100) : -999999)) | 0; };
  const arr = a => { if (a) for (let i = 0; i < a.length; i++) num(a[i]); };
  for (const st of [vu.L, vu.R]) { num(st.lvl); num(st.peak); num(st.samplePeak); num(st.clip ? 1 : 0); }
  arr(spPeak); arr(spLvl); arr(colLevels); arr(rtLevels); arr(flShown);
  if (typeof ledLv !== 'undefined') [ledLv, ledPk, ambL, ambR, ambPkL, ambPkR, rtaLv, rtaPk, lcdDb, lcdPk].forEach(arr);
  if (typeof cd !== 'undefined') { arr(cd.bands); arr(cd.peaks); num(cd.track); num(cd.remain ? 1 : 0); num(cd.repeat ? 1 : 0); }
  num(bigTape.pos); arr(bigTape.ang); num(bigTape.counter);
  decks.forEach(d => { num(d.pos); arr(d.ang); num(d.counter); });
  num(miniAngle); num(miniVals.m); num(miniVals.i); num(miniVals.tp);
  num(gonioGain); num(phaseSm);
  num(running ? 1 : 0); num(npPlaying() ? 1 : 0);
  if (np) { num(npPosition() * 10); num(np.dur); }
  // the words and the choices on screen (a new song, a style picked from the tray or the phone)
  const words = [np && np.title, np && np.artist, np && np.status, decks.map(d => d.title).join('|'), miniMode, vuSkin, spectrumSkin,
    tapeStyle, deckDouble, typeof chassis !== 'undefined' && chassis, flSensitivity, spectrumModeIndex, vuCal, Object.values(mods).join('')].join('·');
  for (let i = 0; i < words.length; i++) h = (Math.imul(h, 31) + words.charCodeAt(i)) | 0;
  return h;
}
function loop(ts) {
  if (!running) return;
  rafId = requestAnimationFrame(loop);          // schedule first: a failing frame can't freeze the next one
  lastRafAt = performance.now();
  // at most about 60 drawn frames a second (a 120 or 144 Hz screen gets one every other refresh), and 30
  // while nothing has been heard for a few seconds (a paused song: the needles rest, the tape stands still)
  const quiet = performance.now() - lastAudible > 2500;
  if (ts - lastDrawAt < 1000 / (quiet ? 30 : 60) - 4) return;
  lastDrawAt = ts;
  try { frame(winShown); } catch (e) { report('frame', e); }
}
// Minimized (or fully covered) windows get no animation frames on Windows, even with background
// throttling off. Without this the measuring stopped too: integrated LUFS, LRA and BPM froze and the
// phone display fell to zero. A timer takes over at ~30/s, measuring and feeding the phone, not drawing.
setInterval(() => {
  if (!running || performance.now() - lastRafAt < 120) return;
  try { frame(false); } catch (e) { report('frame', e); }
}, 33);
function frame(draw) {
  const now = performance.now();
  dtMs = lastFrame ? Math.min(100, now - lastFrame) : 16.7;
  lastFrame = now;
  frameScale = dtMs / 16.667;

  // VU
  const inL = readChannel(aL, bufL, vu.L), inR = readChannel(aR, bufR, vu.R);
  const loud = Math.max(vu.L.dbfs, vu.R.dbfs);
  if (loud > -50) lastAudible = now;
  if (loud > -80) lastSound = now;
  if (loud > -55) {                       // ignore silence and fades
    autoRms += (loud - autoRms) * (1 - Math.exp(-dtMs / 6000));
    autoRef = Math.max(4, Math.min(24, -autoRms - 4));
  }
  tickVU(vu.L, inL);
  tickVU(vu.R, inR);
  if (!draw) {
    guard('meters', () => updateMasterMeters(now));
    guard('bpm', () => tickBPM(now));
    phoneTick(now);
    return;
  }
  // at rest (nothing heard for a second, nothing touched, the last twenty frames the same): leave the displays
  const silent = now - lastSound > 1000;
  const resting = silent && now > wakeUntil && !restAnim && restSame >= 20 && restSignature() === restSig;
  if (!resting) {
    restAnim = false;                    // a display that moves by itself says so while it draws
    displaysDrawnAt = now;
    if (miniMode && typeof stereoMode !== 'undefined' && stereoMode) { /* the stereo draws itself (below) */ }
    else if (miniMode) guard('mini', () => drawMini(cMI, xMI, true));
    else {
      if (mods.vu) guard('vu', () => { drawVU(cVL, xVL, vu.L); drawVU(cVR, xVR, vu.R); });
      if (mods.gonio) guard('gonio', () => drawGonio(cGO, xGO, true));
      // Spectrum + Osc + decks
      if (mods.spectrum) guard('spectrum', () => drawSpectrum(cSP, xSP));
      if (mods.osc) guard('osc', () => drawOsc(cOS, xOS));
      if (mods.deck) guard('deck', () => drawDeck(cDK, xDK, true));
      if (mods.tape) guard('tape', () => drawBigTape(cTP, xTP, true));
    }
    if (silent) { const sig = restSignature(); restSame = sig === restSig ? restSame + 1 : 0; restSig = sig; }
    else restSame = 0;
  }
  if (!miniMode && mods.meters) guard('lufsHistory', () => drawLufsHistory(now));
  if (typeof stereoMode !== 'undefined' && stereoMode && draw) guard('stereo', () => stereoFeed(now));
  if (typeof tunerShown === 'function' && tunerShown() && draw) guard('tuner', () => tunerFeed(now));
  if (typeof cdUnitShown === 'function' && cdUnitShown() && draw) guard('cdunit', () => cdUnitFeed(now));

  // Meters + BPM
  guard('meters', () => updateMasterMeters(now));
  guard('bpm', () => tickBPM(now));
  const bpmEl  = el('bpmValue');
  if (bpmVal > 0) {
    setText('bpmValue', String(Math.round(bpmVal)));
    setText('bpmConf', bpmConfidence >= 0.45 ? '♩ LOCKED' : '♩ TRACKING');
  } else {
    setText('bpmValue', '--');
    setText('bpmConf', Math.max(vu.L.lvl, vu.R.lvl) > -40 ? 'LISTENING…' : 'NO SIGNAL');
  }

  // Beat flash: the four LEDs step through the bar like a hardware counter.
  const flashing = now < beatFlashUntil;
  if (flashing && !wasFlashing) beatStep = (beatStep + 1) % 4;
  if (flashing !== wasFlashing) {
    bpmEl.classList.toggle('beat', flashing);
    if (flashing) { const r = el('beatRing'); r.classList.remove('hit'); void r.offsetWidth; r.classList.add('hit'); }
    bleds.forEach((l, i) => {
      const on = flashing && i === beatStep;
      l.style.background = on ? '#00ff88' : '';
      l.style.boxShadow  = on ? '0 0 8px #00ff88' : '';
    });
    wasFlashing = flashing;
  }

  // Header LEDs
  if (vuCal === 'AUTO' && now - (loop.calT || 0) > 500) {
    loop.calT = now;
    const ab = document.querySelector('.seg[data-group="cal"] button[data-v="AUTO"]');
    const t = 'AUTO −' + Math.round(autoRef);
    if (ab && ab.textContent !== t) ab.textContent = t;
  }
  phoneTick(now);
  const maxVu = Math.max(vu.L.lvl, vu.R.lvl);
  setCls('ledSig', maxVu > -40 ? 'led green' : 'led');
  setCls('ledClip', (vu.L.clip || vu.R.clip) ? 'led red' : 'led');
}
