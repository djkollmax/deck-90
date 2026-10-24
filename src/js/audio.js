'use strict';
// ═══════════════════════════════════════════════════════════
//  AUDIO INIT
// ═══════════════════════════════════════════════════════════
function toast(msg, ms){
  const t = document.getElementById('toast');
  if(!t) return;
  t.innerHTML = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), ms || 6000);
}

const RAW_AUDIO = { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 2 };

// Linux: PulseAudio/PipeWire expose "Monitor of <output>" as an input device, which is exactly the
// system mix. Use it when present (no sharing dialog); otherwise fall back to getDisplayMedia.
const IS_LINUX = /Linux/.test(navigator.userAgent) && !/Android/.test(navigator.userAgent);
async function linuxMonitorStream() {
  try {
    let devs = await navigator.mediaDevices.enumerateDevices();
    if (!devs.some(d => d.label)) {                       // labels appear only after a permission grant
      const tmp = await navigator.mediaDevices.getUserMedia({ audio: true });
      tmp.getTracks().forEach(t => t.stop());
      devs = await navigator.mediaDevices.enumerateDevices();
    }
    const mon = devs.find(d => d.kind === 'audioinput' && /monitor/i.test(d.label));
    if (!mon) return null;
    return await navigator.mediaDevices.getUserMedia({ audio: Object.assign({}, RAW_AUDIO, { deviceId: { exact: mon.deviceId } }), video: false });
  } catch (e) { return null; }
}

// Builds the audio graph on whatever stream we got (system capture, mic or the demo signal).
function buildGraph(source) {
  srcNode = source;

  // Always work in stereo: a mono source (most mics) is copied to both sides instead of leaving R dead.
  upmix = actx.createGain();
  upmix.channelCount = 2;
  upmix.channelCountMode = 'explicit';
  upmix.channelInterpretation = 'speakers';
  srcNode.connect(upmix);

  splitter = actx.createChannelSplitter(2);
  upmix.connect(splitter);
  aL = actx.createAnalyser(); aL.fftSize = FFT; aL.smoothingTimeConstant = 0;
  aR = actx.createAnalyser(); aR.fftSize = FFT; aR.smoothingTimeConstant = 0;
  splitter.connect(aL, 0);
  splitter.connect(aR, 1);

  // K-weighting (BS.1770): high shelf +4 dB around 1.5 kHz, then a 38 Hz high-pass.
  const shelf = actx.createBiquadFilter();
  shelf.type = 'highshelf'; shelf.frequency.value = 1681.97; shelf.gain.value = 3.9998;
  const rlb = actx.createBiquadFilter();
  rlb.type = 'highpass'; rlb.frequency.value = 38.135;
  rlb.Q.value = 20 * Math.log10(0.5003);   // Web Audio takes a high-pass Q in dB: this is BS.1770's linear Q of 0.5003
  upmix.connect(shelf); shelf.connect(rlb);
  const kSplit = actx.createChannelSplitter(2);
  rlb.connect(kSplit);
  aKL = actx.createAnalyser(); aKL.fftSize = FFT; aKL.smoothingTimeConstant = 0;
  aKR = actx.createAnalyser(); aKR.fftSize = FFT; aKR.smoothingTimeConstant = 0;
  kSplit.connect(aKL, 0); kSplit.connect(aKR, 1);

  aMain = actx.createAnalyser();
  aMain.fftSize = FFT;
  aMain.smoothingTimeConstant = SMTH;
  upmix.connect(aMain);

  // Unsmoothed, shorter FFT for beat onsets: smoothing 0.88 smeared the kicks in v4.
  aBeat = actx.createAnalyser();
  aBeat.fftSize = 1024;
  aBeat.smoothingTimeConstant = 0;
  upmix.connect(aBeat);

  bufFD = new Float32Array(aMain.frequencyBinCount);
  bufBeat = new Float32Array(aBeat.frequencyBinCount);
  prevBeat = null;

  // Onset envelope computed on the audio clock in 512-sample blocks (~11 ms), so tempo accuracy
  // does not depend on the monitor refresh rate or on the tab being in front.
  const lowF = actx.createBiquadFilter(); lowF.type = 'lowpass'; lowF.frequency.value = 160;
  const hiF  = actx.createBiquadFilter(); hiF.type = 'highpass'; hiF.frequency.value = 2500;
  const bands = actx.createChannelMerger(2);
  upmix.connect(lowF); upmix.connect(hiF);
  lowF.connect(bands, 0, 0); hiF.connect(bands, 0, 1);
  attachOnsetDetector(actx, bands);
}

// Energy of the low band (ch 0) and high band (ch 1) every 512 samples, measured on the audio
// thread by an AudioWorklet (ScriptProcessorNode only as a fallback for old engines).
const ONSET_WORKLET = `
class OnsetEnergy extends AudioWorkletProcessor {
  constructor() { super(); this.n = 0; this.sl = 0; this.sh = 0; this.block = 0; }
  process(inputs, outputs) {
    const inp = inputs[0];
    if (inp && inp.length) {
      const lo = inp[0], hi = inp[1] || inp[0];
      for (let i = 0; i < lo.length; i++) { this.sl += lo[i] * lo[i]; this.sh += hi[i] * hi[i]; }
      this.n += lo.length;
      if (this.n >= 512) {
        this.port.postMessage([this.sl / this.n, this.sh / this.n, this.block++]);
        this.n = 0; this.sl = 0; this.sh = 0;
      }
    }
    return true;
  }
}
registerProcessor('onset-energy', OnsetEnergy);
// Sample-aligned stereo measurements on the audio thread (two analysers read one after the other can
// be a render quantum apart): L/R correlation sums, and true peak per ITU-R BS.1770-4 Annex 2
// (4x oversampling with the recommendation's 48-tap polyphase FIR, max of the absolute values).
const TP_H = [
  [ 0.0017089843750, 0.0109863281250,-0.0196533203125, 0.0332031250000,-0.0594482421875, 0.1373291015625, 0.9721679687500,-0.1022949218750, 0.0476074218750,-0.0266113281250, 0.0148925781250,-0.0083007812500],
  [-0.0291748046875, 0.0292968750000,-0.0517578125000, 0.0891113281250,-0.1665039062500, 0.4650878906250, 0.7797851562500,-0.2003173828125, 0.1015625000000,-0.0582275390625, 0.0330810546875,-0.0189208984375],
  [-0.0189208984375, 0.0330810546875,-0.0582275390625, 0.1015625000000,-0.2003173828125, 0.7797851562500, 0.4650878906250,-0.1665039062500, 0.0891113281250,-0.0517578125000, 0.0292968750000,-0.0291748046875],
  [-0.0083007812500, 0.0148925781250,-0.0266113281250, 0.0476074218750,-0.1022949218750, 0.9721679687500, 0.1373291015625,-0.0594482421875, 0.0332031250000,-0.0196533203125, 0.0109863281250, 0.0017089843750]];
class StereoCorr extends AudioWorkletProcessor {
  constructor() {
    super(); this.n = 0; this.ll = 0; this.rr = 0; this.lr = 0; this.tp = 0;
    this.hl = new Float32Array(12); this.hr = new Float32Array(12); this.pos = 0;   // input history, newest at pos
  }
  peak(h, pos) {
    let m = 0;
    for (let k = 0; k < 4; k++) {
      const c = TP_H[k]; let y = 0;
      for (let j = 0; j < 12; j++) y += c[j] * h[(pos - j + 12) % 12];
      if (y < 0) y = -y; if (y > m) m = y;
    }
    return m;
  }
  process(inputs) {
    const inp = inputs[0];
    if (inp && inp.length) {
      const l = inp[0], r = inp[1] || inp[0];
      for (let i = 0; i < l.length; i++) {
        const a = l[i], b = r[i];
        this.ll += a * a; this.rr += b * b; this.lr += a * b;
        this.pos = (this.pos + 1) % 12; this.hl[this.pos] = a; this.hr[this.pos] = b;
        const p = Math.max(this.peak(this.hl, this.pos), this.peak(this.hr, this.pos));
        if (p > this.tp) this.tp = p;
      }
      this.n += l.length;
      if (this.n >= 1024) { this.port.postMessage([this.ll, this.rr, this.lr, this.tp]); this.n = 0; this.ll = 0; this.rr = 0; this.lr = 0; this.tp = 0; }
    }
    return true;
  }
}
registerProcessor('stereo-corr', StereoCorr);
`;
let corrNode = null, corrLL = 0, corrRR = 0, corrLR = 0, corrFresh = false;
let tpBlock = 0, tpAvailable = false, tpFresh = false;   // largest true peak (linear) since the last frame
let onsetPrevLow = -100, onsetPrevHigh = -100;
function onsetBlock(msLow, msHigh, block, sampleRate) {
  const dl = 10 * Math.log10(msLow + 1e-10), dh = 10 * Math.log10(msHigh + 1e-10);
  const v = Math.max(0, dl - onsetPrevLow) + 0.4 * Math.max(0, dh - onsetPrevHigh);
  onsetPrevLow = onsetPrevLow * 0.3 + dl * 0.7; onsetPrevHigh = onsetPrevHigh * 0.3 + dh * 0.7;
  const t = (block * 512 / sampleRate) * 1000;
  onsetEnv.push({ t, v: (dl > -70 ? v : 0) });
  while (onsetEnv.length && t - onsetEnv[0].t > 8000) onsetEnv.shift();
}
function attachOnsetDetector(ctx, bands) {
  onsetPrevLow = onsetPrevHigh = -100;
  const sr = ctx.sampleRate;
  const mute = ctx.createGain(); mute.gain.value = 0; mute.connect(ctx.destination);
  const fallback = () => {
    if (ctx.state === 'closed') return;
    const proc = ctx.createScriptProcessor(512, 2, 1);
    let block = 0;
    proc.onaudioprocess = ev => {
      const lo = ev.inputBuffer.getChannelData(0), hi = ev.inputBuffer.getChannelData(1);
      let sl = 0, sh = 0;
      for (let i = 0; i < lo.length; i++) { sl += lo[i] * lo[i]; sh += hi[i] * hi[i]; }
      onsetBlock(sl / lo.length, sh / hi.length, block++, sr);
    };
    bands.connect(proc); proc.connect(mute);
    scriptNode = proc;
  };
  if (!ctx.audioWorklet || typeof AudioWorkletNode === 'undefined') return fallback();
  // data: URL, not a Blob URL: pages opened from file:// can't load worklets from blob: URLs
  const url = 'data:application/javascript;base64,' + btoa(ONSET_WORKLET);
  ctx.audioWorklet.addModule(url).then(() => {
    if (ctx.state === 'closed' || ctx !== actx) return;
    const node = new AudioWorkletNode(ctx, 'onset-energy', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 2, channelCountMode: 'explicit' });
    node.port.onmessage = e => onsetBlock(e.data[0], e.data[1], e.data[2], sr);
    bands.connect(node); node.connect(mute);
    scriptNode = node;
    if (upmix) {
      const c = new AudioWorkletNode(ctx, 'stereo-corr', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 2, channelCountMode: 'explicit' });
      c.port.onmessage = e => { corrLL += e.data[0]; corrRR += e.data[1]; corrLR += e.data[2]; if (e.data[3] > tpBlock) tpBlock = e.data[3]; corrFresh = true; tpFresh = true; tpAvailable = true; };
      upmix.connect(c); c.connect(mute);
      corrNode = c;
    }
  }).catch(fallback);
}

function resetPeakLabels() { el('mPeakTitle').textContent = 'Peak'; el('mPeakUnit').textContent = 'dBFS'; }
// keepTrack: the system audio again, same track as before the stop: its integrated loudness, LRA,
// peak maxima and BPM tally carry on instead of starting over.
let measuredSrc = null;
function resetMeters(keepTrack) {
  spPeak.fill(-Infinity); spPeakTm.fill(0); spLvl.fill(-120); lufsHist.length = 0; lufsHistT = performance.now();
  vu.L = mkVU(); vu.R = mkVU();
  loudBlocks = []; resetPeakLabels();
  if (!keepTrack) { gateBlocks = []; lraReset(); resetTrackPeaks(); spotGain = NaN; if (typeof historyReset === 'function') historyReset(); }
  tpHoldDb = -90; peakHoldDb = -90; phaseSm = 1; crestSm = 0; autoRms = -18; autoRef = 18; onsetEnv = []; ledFlux = []; nextTempo = 0;
  bpmVal = 0; bpmConfidence = 0; lastBeat = 0;
  lastFrame = 0;
}

let srcGen = 0;   // bumps on every start: a slower, older start gives up instead of running alongside
async function startAudio(mode) {
  const gen = ++srcGen;
  if (running || actx) await stopAudio();
  if (gen !== srcGen) return;
  try {
    if (mode === 'sys' && IS_LINUX) stream = await linuxMonitorStream();
    if (mode === 'sys' && stream) {
      // Linux monitor source found: that's the system mix, nothing else to ask for
    } else if (mode === 'sys' && IS_LINUX && typeof IS_APP !== 'undefined' && IS_APP) {
      // The program can't share the screen's audio on Linux: without a monitor source there's nothing to capture.
      toast('⚠ NO HAY FUENTE "MONITOR"<br><span>PulseAudio/PipeWire no muestra el audio del sistema como entrada. Usá <b>MIC</b> o revisá <b>pavucontrol</b>.</span>', 9000);
      return;
    } else if (mode === 'sys') {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: 1, height: 1, frameRate: 1 },
        audio: RAW_AUDIO,
        systemAudio: 'include',
        selfBrowserSurface: 'exclude',
        surfaceSwitching: 'exclude'
      });
      stream.getVideoTracks().forEach(t => t.stop());
      if (!stream.getAudioTracks().length) {
        stream.getTracks().forEach(t => t.stop()); stream = null;
        toast('⚠ NO SE CAPTURÓ AUDIO<br><span>Elegí <b>Pantalla completa</b> y tildá <b>“Compartir audio del sistema”</b> antes de Compartir.</span>', 9000);
        return;
      }
    } else {
      stream = await navigator.mediaDevices.getUserMedia({ audio: RAW_AUDIO, video: false });
    }

    if (gen !== srcGen) { stream.getTracks().forEach(t => t.stop()); stream = null; return; }
    // No forced sample rate: v4 forced 48 kHz, which breaks (Firefox) or resamples when the device runs at 44.1 kHz.
    actx = new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') await actx.resume();
    buildGraph(actx.createMediaStreamSource(stream));

    // If the user presses Chrome's "Stop sharing" bar, stop cleanly instead of freezing the meters.
    stream.getAudioTracks().forEach(t => t.addEventListener('ended', () => { if (running) stopAudio(); }));

    resetMeters(mode === 'sys' && measuredSrc === 'sys' && !!np);
    measuredSrc = mode;
    running = true;
    setUI('on', mode);
    document.body.classList.add('audio-active');
    rafId = requestAnimationFrame(loop);

  } catch (e) {
    console.error(e);
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
    if (e.name === 'NotAllowedError') toast('Permiso cancelado.', 3500);
    else toast('⚠ ERROR: ' + (e.message || e.name), 8000);
  }
}

// Demo signal: a built-in groove (124 BPM kick + bass + hats + pad) so the interface can be checked without capturing anything.
async function startDemo() {
  const gen = ++srcGen;
  if (running || actx) await stopAudio();
  if (gen !== srcGen) return;
  actx = new (window.AudioContext || window.webkitAudioContext)();
  if (actx.state === 'suspended') actx.resume();
  const out = actx.createGain(); out.gain.value = 0.5;
  const merger = actx.createChannelMerger(2);
  const bpm = 124, beat = 60 / bpm, t0 = actx.currentTime + 0.05, bars = 64;

  const panL = actx.createGain(), panR = actx.createGain();
  panL.connect(merger, 0, 0); panR.connect(merger, 0, 1);
  out.connect(panL); out.connect(panR);
  const hatL = actx.createGain(), hatR = actx.createGain();
  hatL.gain.value = .9; hatR.gain.value = .4;
  hatL.connect(merger, 0, 0); hatR.connect(merger, 0, 1);

  const noiseBuf = actx.createBuffer(1, actx.sampleRate * 0.08, actx.sampleRate);
  const nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = (Math.random() * 2 - 1) * (1 - i / nd.length);

  for (let b = 0; b < bars * 4; b++) {
    const t = t0 + b * beat;
    // kick
    const k = actx.createOscillator(), kg = actx.createGain();
    k.frequency.setValueAtTime(130, t); k.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    kg.gain.setValueAtTime(1.0, t); kg.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    k.connect(kg); kg.connect(out); k.start(t); k.stop(t + 0.36);
    // bass on the off-beat
    const bs = actx.createOscillator(), bg = actx.createGain();
    bs.type = 'sawtooth'; bs.frequency.value = [55, 55, 65.4, 49][(b >> 2) % 4];
    bg.gain.setValueAtTime(0.0001, t + beat / 2); bg.gain.exponentialRampToValueAtTime(0.18, t + beat / 2 + 0.01);
    bg.gain.exponentialRampToValueAtTime(0.0001, t + beat * 0.95);
    bs.connect(bg); bg.connect(out); bs.start(t + beat / 2); bs.stop(t + beat);
    // hats, panned left-ish
    for (let h = 0; h < 2; h++) {
      const n = actx.createBufferSource(), hp = actx.createBiquadFilter(), hg = actx.createGain();
      n.buffer = noiseBuf; hp.type = 'highpass'; hp.frequency.value = 7000;
      hg.gain.value = h ? 0.10 : 0.06;
      n.connect(hp); hp.connect(hg); hg.connect(hatL); hg.connect(hatR);
      n.start(t + h * beat / 2);
    }
  }
  // pad chord, slowly breathing
  [220, 277.2, 329.6, 440].forEach((f, i) => {
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = 'triangle'; o.frequency.value = f; o.detune.value = i * 4 - 6;
    g.gain.value = 0.035;
    o.connect(g); g.connect(i % 2 ? panR : panL);
    o.start(t0); o.stop(t0 + bars * 4 * beat);
  });

  buildGraph(merger);
  merger.connect(actx.destination);      // the demo is audible on purpose
  resetMeters(false);
  measuredSrc = 'demo';
  running = true;
  setUI('on', 'demo');
  document.body.classList.add('audio-active');
  rafId = requestAnimationFrame(loop);
}

async function stopAudio() {
  if (running && typeof historyFinalize === 'function') historyFinalize('stop');
  running = false;
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  // v4 never stopped the tracks: Chrome kept "sharing your screen / mic" until the tab was closed.
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
  if (corrNode) { corrNode.port.onmessage = null; try { corrNode.disconnect(); } catch (_) {} corrNode = null; }
  corrLL = corrRR = corrLR = 0; corrFresh = false; tpBlock = 0; tpAvailable = false; tpFresh = false;
  if (scriptNode) { scriptNode.onaudioprocess = null; if (scriptNode.port) scriptNode.port.onmessage = null; try { scriptNode.disconnect(); } catch (_) {} scriptNode = null; }
  if (srcNode) { try { srcNode.disconnect(); } catch(_){} srcNode = null; }
  // Detach before awaiting: a new source may already be starting, and it must not lose its context.
  const old = actx; actx = null;
  aL = aR = aKL = aKR = aMain = aBeat = null;
  if (old) { try { await old.close(); } catch(_){} }
  if (running) return;                       // something new started meanwhile: leave its UI alone
  setUI('off');
  document.body.classList.remove('audio-active');
  drawIdle();
}

const SOURCE_LABEL = { sys: 'SYSTEM AUDIO', mic: 'MICROPHONE', demo: 'DEMO SIGNAL' };
let activeSource = null;
const mods = { vu: true, bpm: true, gonio: true, meters: true, spectrum: true, osc: true, deck: false, tape: false };
let modsBeforeTape = null;
let deckDouble = true;
let drawerOpen = false, controlsHidden = false;
function applyModules() {
  document.querySelectorAll('[data-mod]').forEach(e => e.classList.toggle('mod-off', !mods[e.dataset.mod]));
  const row = document.querySelector('.main-row');
  row.classList.toggle('no-vu', !mods.vu);
  row.classList.toggle('empty', !mods.vu && !mods.bpm && !mods.gonio);
  document.querySelector('.rack-unit').classList.toggle('no-bottom', !mods.spectrum && !mods.osc && !mods.deck && !mods.tape);
  document.querySelector('.rack-unit').classList.toggle('only-tape', mods.tape && Object.keys(mods).every(k => k === 'tape' || !mods[k]));
  requestAnimationFrame(() => { sizeCanvases(); if (!running) drawIdle(); });
}
function setUI(state, mode) {
  const on = state === 'on';
  activeSource = on ? mode : null;
  el('ledPower').className = 'led ' + (on ? 'green' : 'amber');
  el('statusText').className = on ? 'on' : '';
  el('statusText').textContent = on ? (SOURCE_LABEL[mode] || 'ACTIVE') : 'STANDBY';
  if (!on) {
    el('ledSig').className  = 'led';
    el('ledClip').className = 'led';
    el('bpmValue').textContent = '--';
    el('bpmConf').textContent  = 'NO SIGNAL';
    ['mLufs','mPeak','mCrest'].forEach(id => el(id).textContent = '--.-');
    resetPeakLabels(); el('mLra').textContent = 'LRA --';
    el('mPhase').textContent = '--';
    el('mLufsS').textContent = 'S --.-';
  }
  syncConsole();
}

// Every control lives in the console; this keeps the lit buttons in step with the state.
function syncConsole() {
  const state = {
    src: activeSource,
    skin: spectrumSkin,
    vu: vuSkin,
    cal: String(vuCal),
    sens: String(flSensitivity),
    mode: String(spectrumModeIndex),
  };
  document.querySelectorAll('#console .seg').forEach(seg => {
    const g = seg.dataset.group;
    seg.querySelectorAll('button').forEach(b => {
      if (g === 'src' && b.dataset.v === 'stop') { b.disabled = !activeSource; return; }
      if (g === 'mods') { b.classList.toggle('on', !!mods[b.dataset.v]); return; }
      if (g === 'tools') { b.classList.toggle('on', (b.dataset.v === 'drawer' && drawerOpen) || (b.dataset.v === 'tapeonly' && !!modsBeforeTape)); return; }
      if (g === 'deckmode') { b.classList.toggle('on', (b.dataset.v === 'double') === deckDouble); return; }
      if (g === 'tapestyle') { b.classList.toggle('on', b.dataset.v === tapeStyle); return; }
      if (g === 'phone') { const on = typeof phoneState !== 'undefined' && phoneState.on; b.classList.toggle('on', b.dataset.v === (on ? 'on' : 'off')); return; }
      b.classList.toggle('on', g in state && state[g] === b.dataset.v);
    });
  });
  const ab = document.querySelector('.seg[data-group="cal"] button[data-v="AUTO"]');
  if (ab && (vuCal !== 'AUTO' || !activeSource)) ab.textContent = 'AUTO';
  const sens = document.querySelector('.seg[data-group="sens"]');
  if (sens) sens.classList.toggle('dim', spectrumSkin !== 'FL90');
}

// ═══════════════════════════════════════════════════════════
//  VU BALLISTICS
// ═══════════════════════════════════════════════════════════
// Returns RMS in VU (0 VU = -18 dBFS) and stores the true sample peak for the clip LED.
function readChannel(analyser, buf, st) {
  analyser.getFloatTimeDomainData(buf);
  let s = 0, pk = 0;
  for (let i = 0; i < FFT; i++) {
    const v = buf[i];
    s += v * v;
    const a = v < 0 ? -v : v;
    if (a > pk) pk = a;
  }
  st.samplePeak = pk < 1e-9 ? -90 : 20 * Math.log10(pk);
  const rms = Math.sqrt(s / FFT);
  const dbfs = rms < 1e-10 ? -90 : 20 * Math.log10(rms);
  st.dbfs = dbfs;
  return Math.max(-70, dbfs + vuRef());
}

function calText(){
  return (vuCal === 'AUTO' ? 'AUTO · ' : '') + '0 VU = −' + vuRef().toFixed(0) + ' dBFS';
}

function tickVU(st, db) {
  // Needle = damped spring (ωn 17 rad/s, ζ 0.8): ~300 ms rise like a real VU, with the slight
  // overshoot and settle of a moving coil instead of a plain exponential slide.
  const T = dtMs / 1000, steps = Math.max(1, Math.ceil(T / 0.004)), h = T / steps, wn = 17, z = 0.8;
  for (let i = 0; i < steps; i++) {
    const a = wn * wn * (db - st.lvl) - 2 * z * wn * st.vel;
    st.vel += a * h; st.lvl += st.vel * h;
  }
  if (st.lvl < -70) { st.lvl = -70; st.vel = 0; }
  if (st.lvl > 6)   { st.lvl = 6;   st.vel = 0; }   // pin stop

  if (st.lvl > st.peak) { st.peak = st.lvl; st.peakTmr = PEAK_HOLD_MS; }
  else if (st.peakTmr > 0) st.peakTmr -= dtMs;
  else st.peak = Math.max(-70, st.peak - PEAK_FALL * dtMs / 1000);

  // Clip = a real sample at (or over) full scale, not an RMS level that can never get there.
  if (st.samplePeak >= -0.1) { st.clip = true; st.clipTmr = 1200; }
  else if (st.clipTmr > 0) st.clipTmr -= dtMs;
  else st.clip = false;
}

// ═══════════════════════════════════════════════════════════
//  BPM DETECTION
// ═══════════════════════════════════════════════════════════
// Tempo = autocorrelation of an onset envelope, not a chain of single beats: heavily compressed modern
// masters have no clean "kick louder than average" moments, which is why v5.0 stayed on LISTENING.
// 1) per frame: spectral flux (30–250 Hz plus a lighter 250 Hz–4 kHz band) → onset envelope with timestamps
// 2) every 0.5 s: resample the last 8 s to a 10 ms grid, autocorrelate lags for 70–180 BPM,
//    weight towards ~120 BPM to avoid half/double tempo, refine the peak, smooth the result.
let onsetEnv = [], ledFlux = [];
let nextTempo = 0, scriptNode = null;
const GRID = 10;   // ms
function tickBPM(now) {
  aBeat.getFloatFrequencyData(bufBeat);
  const bpb = (actx.sampleRate / 2) / aBeat.frequencyBinCount;
  const b0 = Math.max(1, Math.floor(30 / bpb)), b1 = Math.ceil(250 / bpb), b2 = Math.min(bufBeat.length - 1, Math.ceil(4000 / bpb));
  let flux = 0;
  if (prevBeat) {
    for (let i = b0; i <= b2; i++) {
      const d = bufBeat[i] - prevBeat[i];           // dB rise: level-independent, works on loud masters
      if (d > 0 && bufBeat[i] > -90) flux += (i <= b1 ? 1 : 0.25) * d;
    }
  } else prevBeat = new Float32Array(bufBeat.length);
  prevBeat.set(bufBeat);

  ledFlux.push({ t: now, v: flux });
  while (ledFlux.length && now - ledFlux[0].t > 1500) ledFlux.shift();

  // Beat LED: local adaptive threshold over the last 1.5 s
  let mean = 0; for (const f of ledFlux) mean += f.v; mean /= ledFlux.length;
  let vari = 0; for (const f of ledFlux) vari += (f.v - mean) ** 2;
  const thr = mean + 1.5 * Math.sqrt(vari / ledFlux.length);
  if (flux > thr && flux > 2 && now - lastBeat > 250) { lastBeat = now; beatFlashUntil = now + 100; }

  const span = onsetEnv.length ? onsetEnv[onsetEnv.length - 1].t - onsetEnv[0].t : 0;
  if (now >= nextTempo && span > 4000) {
    nextTempo = now + 500;
    estimateTempo(onsetEnv[onsetEnv.length - 1].t);
  }
  if (Math.max(vu.L.dbfs, vu.R.dbfs) < -60) { bpmVal = 0; bpmConfidence = 0; }
}

function estimateTempo(now) {
  const t0 = onsetEnv[0].t, N = Math.floor((now - t0) / GRID);
  const g = new Float32Array(N);
  let k = 0;
  for (let i = 0; i < N; i++) {                     // sample-and-hold resampling onto a 10 ms grid
    const t = t0 + i * GRID;
    while (k < onsetEnv.length - 1 && onsetEnv[k + 1].t <= t) k++;
    g[i] = onsetEnv[k].v;
  }
  let m = 0; for (let i = 0; i < N; i++) m += g[i]; m /= N;
  let e = 0; for (let i = 0; i < N; i++) { g[i] -= m; if (g[i] < 0) g[i] *= 0.3; e += g[i] * g[i]; }
  if (e <= 0) return;

  const lagMin = Math.floor(60000 / 180 / GRID), lagMax = Math.ceil(60000 / 70 / GRID);
  const ac = new Float32Array(lagMax + 2);
  for (let L = lagMin - 1; L <= lagMax + 1; L++) {
    let s = 0;
    for (let i = L; i < N; i++) s += g[i] * g[i - L];
    ac[L] = s / (N - L);
  }
  let best = -1, bestScore = -Infinity;
  for (let L = lagMin; L <= lagMax; L++) {
    const bpm = 60000 / (L * GRID);
    const w = Math.exp(-0.5 * Math.pow(Math.log2(bpm / 120) / 0.9, 2));   // tempo prior
    // reward lags whose double also correlates (a real beat period repeats)
    const L2 = Math.min(2 * L, N - 1);
    let s2 = 0; for (let i = L2; i < N; i++) s2 += g[i] * g[i - L2];
    const score = (ac[L] + 0.5 * s2 / (N - L2)) * w;
    if (score > bestScore) { bestScore = score; best = L; }
  }
  if (best < 0 || ac[best] <= 0) return;
  // parabolic refinement between neighbouring lags
  const a = ac[best - 1], b = ac[best], c = ac[best + 1];
  const off = (a - 2 * b + c) !== 0 ? 0.5 * (a - c) / (a - 2 * b + c) : 0;
  const est = 60000 / ((best + Math.max(-0.5, Math.min(0.5, off))) * GRID);
  const conf = Math.max(0, Math.min(1, b / (e / N) * 1.6));

  if (!bpmVal || Math.abs(est - bpmVal) > 6) bpmVal = est;          // jump to a new tempo at once
  else bpmVal = bpmVal * 0.7 + est * 0.3;                          // otherwise settle
  bpmConfidence = bpmConfidence * 0.6 + conf * 0.4;
}
