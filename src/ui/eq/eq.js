'use strict';
// ── DE-90 GRAPHIC EQUALIZER (7.10.14): core/eq.js's ten bands as a rack unit (its faceplate: de90.js). EQ turns it on
// and off, ◀ ▶ choose a band and − + (the wheel, the knob) its level, a column touched on the display sets that band,
// the presets put their curve; a band changed by hand makes the curve USER, which is kept. Only for what Deck 90 plays
// itself (the radio, the DM-90, a data CD's files): a toast says so the first time. W shows or hides it ──
let eqCfg = { show: false, band: 5 };
{ const v = store.section('eq'); if (v) eqCfg = { show: v.show === true, band: Number.isInteger(v.band) && v.band >= 0 && v.band < 10 ? v.band : 5 }; }
let de = null;
const eqPanel = document.getElementById('eqPanel');
const EQ_HZ = ['31 Hz', '62 Hz', '125 Hz', '250 Hz', '500 Hz', '1 kHz', '2 kHz', '4 kHz', '8 kHz', '16 kHz'];
function eqTheme() {
  if (!de) return;
  const c = typeof chassis === 'string' ? chassis : 'TI';
  de.setTheme(c === 'BLACK' || c === 'ANTHRACITE' || c === 'CLASSIC' ? 'black' : 'silver');
  eqPanel.classList.toggle('gold', c === 'GOLD');
}
const eqDraw = () => { if (de) de.set({ on: eqState.on, preset: eqState.preset, gains: eqState.gains, band: eqCfg.band }); };
function eqUnitBuild() {
  if (de || typeof Deck90EqUnit !== 'function') return;
  de = new Deck90EqUnit(document.getElementById('equalizer'), { theme: 'silver' });
  eqTheme(); de.setDimmer(typeof jbCfg === 'object' ? jbCfg.dim : 0); eqDraw();
  de.onKey(eqKey);
}
function eqShow(on, quiet) {
  eqCfg.show = !!on;
  eqPanel.classList.toggle('mod-off', !on);
  if (on) eqUnitBuild();
  savePrefs(); syncConsole();
  requestAnimationFrame(() => { sizeCanvases(); if (!capture.running) drawIdle(); });
  if (!quiet) toast(on ? 'ECUALIZADOR · <span>el DE-90</span> en el rack (W lo esconde)' : 'El ecualizador sigue como lo dejaste (W lo vuelve a mostrar)', 2200);
}
const eqSaid = () => { try { return localStorage.getItem('deck90-eq-said') === '1'; } catch (_) { return true; } };
function eqKey(k, { band, gain } = {}) {
  const was = eqState.on;
  if (k === 'power') eqSetOn(!eqState.on);
  else if (k === 'left' || k === 'right') { eqCfg.band = (eqCfg.band + (k === 'right' ? 1 : 9)) % 10; savePrefs(); eqDraw(); return; }
  else if (k === 'up' || k === 'down') eqBand(eqCfg.band, eqState.gains[eqCfg.band] + (k === 'up' ? 1 : -1));
  else if (k === 'knob') eqBand(eqCfg.band, gain);
  else if (k === 'band') { if (eqCfg.band !== band) { eqCfg.band = band; savePrefs(); } eqBand(band, gain); }
  else if (EQ_NAMES.includes(k.toUpperCase())) eqPreset(k.toUpperCase());
  else return;
  if (k === 'up' || k === 'down' || k === 'knob' || k === 'band') toast(`EQ · ${EQ_HZ[eqCfg.band]} <span>${eqState.gains[eqCfg.band] > 0 ? '+' : ''}${eqState.gains[eqCfg.band]} dB</span>`, 900);
  else if (k === 'power') toast(eqState.on ? 'ECUALIZADOR · <span>' + eqState.preset + '</span>' : 'ECUALIZADOR · <span>apagado</span>, el sonido tal cual', 1600);
  else toast('ECUALIZADOR · <span>' + eqState.preset + '</span>', 1200);
  // the first time it's on: what it reaches
  if (!was && eqState.on && !eqSaid()) {
    try { localStorage.setItem('deck90-eq-said', '1'); } catch (_) {}
    setTimeout(() => toast('El ecualizador suena en la radio, el DM-90 y los archivos de un CD de datos. <span>Lo de la PC (Spotify…) y un CD de audio no pasan por Deck 90.</span>', 5200), 1700);
  }
}
deck.on('eq', eqDraw);
eqPanel.classList.toggle('mod-off', !eqCfg.show);
if (eqCfg.show) eqUnitBuild();
