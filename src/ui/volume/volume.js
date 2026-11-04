'use strict';
// ── DV-90 MASTER VOLUME (7.10.11): the computer's volume as a rack unit (its faceplate: dv90.js). The knob, the
// wheel, − + and 10 … 80 set Windows' volume (the bridge, media.ps1: vol-set; on Linux pactl), MUTE silences it; the
// display follows the volume however it changes (the keyboard's keys, Windows' own slider: read every 3 s while it
// shows). U shows or hides it ──
let volCfg = { show: false };
{ const v = store.section('volume'); if (v) volCfg = { show: v.show === true }; }
let dv = null, volNow = { vol: -1, mute: false }, volSentAt = 0, volWant = -1, volTimer = 0, volAvg = -24, volAt = 0, volLv = { L: 0, R: 0 };
const volPanel = document.getElementById('volPanel');
const volShown = () => volCfg.show && !miniMode;
const volCmd = c => { if (window.nowPlaying) window.nowPlaying.cmd(c); };
function volTheme() {
  if (!dv) return;
  const c = typeof chassis === 'string' ? chassis : 'TI';
  dv.setTheme(c === 'BLACK' || c === 'ANTHRACITE' || c === 'CLASSIC' ? 'black' : 'silver');
  volPanel.classList.toggle('gold', c === 'GOLD');
}
function volBuild() {
  if (dv || typeof Deck90VolumeUnit !== 'function') return;
  dv = new Deck90VolumeUnit(document.getElementById('volume'), { theme: 'silver' });
  volTheme(); dv.setVolume(volNow); dv.setDimmer(typeof jbCfg === 'object' ? jbCfg.dim : 0);
  dv.onKey(volKey);
  volCmd('vol-get');
}
function volShow(on, quiet) {
  volCfg.show = !!on;
  volPanel.classList.toggle('mod-off', !on);
  if (on) volBuild();
  savePrefs(); syncConsole();
  requestAnimationFrame(() => { sizeCanvases(); if (!capture.running) drawIdle(); });
  if (!quiet) toast(on ? 'VOLUMEN · <span>el DV-90</span> en el rack (U lo esconde)' : 'El volumen queda guardado (U lo vuelve a mostrar)', 2200);
}
// a volume to set: shown at once, sent to Windows at most every 80 ms (the last one always goes)
function volSet(v) {
  v = Math.max(0, Math.min(100, Math.round(v)));
  volNow = { vol: v, mute: volNow.mute && v > 0 ? volNow.mute : false }; volWant = v; volSentAt = performance.now();
  if (dv) dv.setVolume(volNow);
  if (!volTimer) volTimer = setTimeout(function send() { volTimer = 0; if (volWant >= 0) { volCmd('vol-set ' + volWant); volWant = -1; } }, 80);
}
function volKey(k, { value } = {}) {
  if (!window.nowPlaying) { toast('El volumen se maneja desde el programa (Deck 90.exe).', 3000); return; }
  const base = volNow.vol >= 0 ? volNow.vol : 50;
  if (k === 'mute') { volNow.mute = !volNow.mute; if (dv) dv.setVolume(volNow); volSentAt = performance.now(); volCmd('vol-mute ' + (volNow.mute ? 1 : 0)); return; }
  if (k === 'up' || k === 'down') return volSet(base + (k === 'up' ? 2 : -2));
  if (k === 'knob') return volSet(value);
  const m = /^p(\d+)$/.exec(k); if (m) return volSet(+m[1]);
}
// what Windows says (after any change, and every 3 s): shown, unless a change of ours is still on its way
if (window.nowPlaying && window.nowPlaying.onVolume) window.nowPlaying.onVolume(v => {
  if (!v || performance.now() - volSentAt < 700) return;
  volNow = { vol: Number(v.vol), mute: !!v.mute };
  if (dv) dv.setVolume(volNow);
});
setInterval(() => { if (dv && volShown() && !document.hidden && performance.now() - volSentAt > 1500) volCmd('vol-get'); }, 3000);
// every frame from the loop: the L/R bars on the sound Deck 90 hears, round the music's own loudness
function volFeed(now) {
  if (!dv) return;
  const dt = volAt ? Math.min(200, now - volAt) : 16; volAt = now;
  const L = vu.L.dbfs, R = vu.R.dbfs, loud = Math.max(L, R);
  if (loud > -60) volAvg += (loud - volAvg) * (1 - Math.exp(-dt / 2500));
  const lv = d => d < -60 ? 0 : Math.max(0, Math.min(1, (d - (volAvg - 10)) / 14));
  const fall = 1 - Math.exp(-dt / 160);
  for (const [k, d] of [['L', L], ['R', R]]) { const t = lv(d); volLv[k] = t > volLv[k] ? t : volLv[k] + (t - volLv[k]) * fall; }
  dv.setLevels(volLv.L, volLv.R);
}
volPanel.classList.toggle('mod-off', !volCfg.show);
if (volCfg.show) volBuild();
