'use strict';
// ── THE EQUALIZER (7.10.14): ten bands for the sound Deck 90 itself plays: the radio, the DM-90 and a data CD's
// files. They go through one Web Audio chain (31 Hz … 16 kHz, ±12 dB, a low and a high shelf at the ends, peaks
// between, a gain before them and a limiter after, so a boost doesn't clip). A player joins the chain the first time the equalizer is
// on (that can't be undone while the program runs, so one that never used it is never touched); off, the chain is
// the sound passes straight by. What the PC plays (Spotless) and an audio CD (Windows plays it) don't pass through Deck 90: not equalized.
// Saved in deck90-eq. The DE-90 (ui/eq/) is its face; it says what changed through deck ('eq') ──
const EQ_BANDS = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
const EQ_PRESETS = {
  FLAT:    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  ROCK:    [5, 4, 3, 1, -1, -1, 1, 3, 4, 5],
  POP:     [-1, 1, 3, 4, 3, 0, -1, -1, 1, 2],
  JAZZ:    [3, 2, 1, 2, -1, -1, 0, 1, 2, 3],
  CLASSIC: [4, 3, 2, 1, -1, -1, 0, 2, 3, 4],
  VOCAL:   [-2, -1, 0, 2, 4, 4, 3, 1, 0, -1],
  BASS:    [7, 6, 5, 3, 1, 0, 0, 0, 0, 0],
  LOUD:    [6, 4, 1, 0, -1, -1, 0, 1, 4, 6],
};
const EQ_NAMES = [...Object.keys(EQ_PRESETS), 'USER'];
const eqClamp = g => Math.max(-12, Math.min(12, Math.round(Number(g) * 2) / 2 || 0));
let eqState = (() => {
  const s = store.read('deck90-eq', {}), arr = a => Array.isArray(a) && a.length === 10 ? a.map(eqClamp) : null;
  const user = arr(s.user) || EQ_PRESETS.FLAT.slice(), preset = EQ_NAMES.includes(s.preset) ? s.preset : 'FLAT';
  return { on: s.on === true, preset, gains: preset === 'USER' ? user.slice() : EQ_PRESETS[preset].slice(), user };
})();
const eqSave = () => store.write('deck90-eq', { on: eqState.on, preset: eqState.preset, user: eqState.user });
let eqGraph = null;                                               // { ctx, input, pre, filters, limit, wet, dry, tap }
const eqJoined = new Set();
// input → dry ─────────────────────────────────────────→ out → the speakers (and tap)
//       → pre → 31 Hz … 16 kHz → limit → wet ──────────↗
// off, only dry sounds (the sound exactly as it came); on, only wet: crossed over smoothly
function eqBuild() {
  if (eqGraph) return eqGraph;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  const ctx = new Ctx({ latencyHint: 'playback' }), g = () => ctx.createGain();
  const input = g(), pre = g(), wet = g(), dry = g(), out = g();
  const filters = EQ_BANDS.map((f, i) => {
    const b = ctx.createBiquadFilter();
    b.type = i === 0 ? 'lowshelf' : i === EQ_BANDS.length - 1 ? 'highshelf' : 'peaking';
    b.frequency.value = f; b.Q.value = 1.1; b.gain.value = 0;
    return b;
  });
  // a limiter at the end: a boost on a loud station rounds off instead of clipping
  const limit = ctx.createDynamicsCompressor();
  limit.threshold.value = -1.5; limit.knee.value = 1.5; limit.ratio.value = 20; limit.attack.value = .002; limit.release.value = .12;
  input.connect(dry); dry.connect(out);
  input.connect(pre); pre.connect(filters[0]);
  for (let i = 1; i < filters.length; i++) filters[i - 1].connect(filters[i]);
  filters[filters.length - 1].connect(limit); limit.connect(wet); wet.connect(out);
  out.connect(ctx.destination);
  const tap = ctx.createAnalyser(); tap.fftSize = 2048; out.connect(tap);   // what comes out (eqLevel)
  wet.gain.value = 0; dry.gain.value = 1;
  eqGraph = { ctx, input, pre, filters, limit, wet, dry, tap };
  return eqGraph;
}
// a player into the chain (once); the context wakes whenever one of them plays
function eqJoin(el) {
  if (eqJoined.has(el) || !eqBuild()) return;
  try { eqGraph.ctx.createMediaElementSource(el).connect(eqGraph.input); eqJoined.add(el); }
  catch (e) { if (typeof appLog === 'function') appLog('eq: ' + e.message); return; }
  el.addEventListener('play', () => { if (eqGraph.ctx.state !== 'running') eqGraph.ctx.resume().catch(() => {}); });
  if (!el.paused && eqGraph.ctx.state !== 'running') eqGraph.ctx.resume().catch(() => {});
}
const eqPlayers = () => [radioAudio, musicAudio, cdAudio];
// the gains into the chain, smoothly (no click); on or off crosses between the bands and the sound as it came
function eqApply() {
  if (!eqGraph) return;
  const t = eqGraph.ctx.currentTime, g = eqState.gains;
  eqGraph.filters.forEach((f, i) => f.gain.setTargetAtTime(g[i], t, .03));
  // half the highest boost taken off first (the limiter keeps the rest from clipping): a boost still sounds as one
  eqGraph.pre.gain.setTargetAtTime(Math.pow(10, -Math.max(0, ...g) * .5 / 20), t, .03);
  eqGraph.wet.gain.setTargetAtTime(eqState.on ? 1 : 0, t, .04);
  eqGraph.dry.gain.setTargetAtTime(eqState.on ? 0 : 1, t, .04);
}
// the level coming out of the chain, in dBFS (-Infinity silent): proof the sound really passes through it
function eqLevel() {
  if (!eqGraph) return -Infinity;
  const a = new Float32Array(eqGraph.tap.fftSize); eqGraph.tap.getFloatTimeDomainData(a);
  let s = 0; for (const v of a) s += v * v;
  return 10 * Math.log10(s / a.length || 1e-20);
}
function eqSetOn(on) {
  eqState.on = !!on;
  if (eqState.on) { eqPlayers().forEach(eqJoin); }
  eqApply(); eqSave(); deck.emit('eq');
}
function eqPreset(name) {
  if (!EQ_NAMES.includes(name)) return;
  eqState.preset = name;
  eqState.gains = (name === 'USER' ? eqState.user : EQ_PRESETS[name]).slice();
  if (!eqState.on) eqSetOn(true); else { eqApply(); eqSave(); deck.emit('eq'); }
}
// a band set by hand: the curve becomes USER (kept), starting from the one that was on
function eqBand(i, gain) {
  if (!(i >= 0 && i < 10)) return;
  eqState.gains[i] = eqClamp(gain);
  eqState.preset = 'USER'; eqState.user = eqState.gains.slice();
  if (!eqState.on) eqSetOn(true); else { eqApply(); eqSave(); deck.emit('eq'); }
}
if (eqState.on) setTimeout(() => { eqPlayers().forEach(eqJoin); eqApply(); }, 0);
