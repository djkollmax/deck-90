'use strict';
// ═══════════════════════════════════════════════════════════
//  CONTROLS
// ═══════════════════════════════════════════════════════════
// Look preferences survive a reload (per browser; never required to work).
const PREFS_KEY = 'deck90-prefs';
function savePrefs(){
  try { localStorage.setItem(PREFS_KEY, JSON.stringify({ spectrumSkin, flSensitivity, vuSkin, mode: spectrumModeIndex, cal: vuCal, mods, drawerOpen, controlsHidden, deckDouble, tapeStyle })); } catch(_){}
}
function loadPrefs(){
  try { return JSON.parse(localStorage.getItem(PREFS_KEY)) || {}; } catch(_) { return {}; }
}

function setDrawer(open){
  drawerOpen = open;
  document.getElementById('console').classList.toggle('open', open);
  savePrefs(); syncConsole(); applyModules();
}
function setControlsHidden(hidden){
  controlsHidden = hidden;
  document.querySelector('.rack-unit').classList.toggle('controls-hidden', hidden);
  if (hidden) toast('Controles escondidos · <span>H</span> o la pestaña de arriba para volver', 2600);
  savePrefs(); applyModules();
}
document.getElementById('consoleTab').addEventListener('click', () => setControlsHidden(false));
function toggleTapeOnly(){
  if (modsBeforeTape) { Object.assign(mods, modsBeforeTape); modsBeforeTape = null; }
  else { modsBeforeTape = Object.assign({}, mods); for (const k in mods) mods[k] = k === 'tape'; }
  applyModules(); savePrefs(); syncConsole();
}
function toggleModule(m){
  const on = Object.values(mods).filter(Boolean).length;
  if (mods[m] && on === 1) { toast('Tiene que quedar al menos un módulo prendido.', 2500); return; }
  mods[m] = !mods[m];
  applyModules(); savePrefs(); syncConsole();
}
function cycleSkin(){
  const ids = SPECTRUM_SKINS.map(s => s[0]);
  setSpectrumSkin(ids[(ids.indexOf(spectrumSkin) + 1) % ids.length]); savePrefs(); syncConsole();
  const name = SPECTRUM_SKINS.find(s => s[0] === spectrumSkin)[1];
  toast('SPECTRUM · <span>' + name + '</span>', 1400);
}
// "MÁS ▾": the other six styles in a small menu under the button
const skinMenu = document.getElementById('skinMenu');
function showSkinMenu(on) {
  skinMenu.classList.toggle('show', on);
  if (on) {
    const b = document.querySelector('.seg[data-group="skin"] .more').getBoundingClientRect();
    skinMenu.style.left = Math.max(8, Math.min(window.innerWidth - skinMenu.offsetWidth - 8, b.left)) + 'px';
    skinMenu.style.top = (b.bottom + 4) + 'px';
    skinMenu.querySelectorAll('button').forEach(x => x.classList.toggle('on', x.dataset.v === spectrumSkin));
  }
}
skinMenu.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  setSpectrumSkin(b.dataset.v); showSkinMenu(false); savePrefs(); syncConsole();
  if (!mods.spectrum) toggleModule('spectrum');
});
document.addEventListener('click', e => { if (skinMenu.classList.contains('show') && !e.target.closest('#skinMenu') && !e.target.closest('.more')) showSkinMenu(false); });
function toggleFullscreen(){
  if (window.winCtl && window.winCtl.fs) { window.winCtl.fs(); return; }   // program: native window full screen
  if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
  else document.exitFullscreen();
}

// One delegated handler for the whole console.
document.getElementById('console').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  const g = b.closest('.seg').dataset.group, v = b.dataset.v;
  if (g === 'src') {
    if (v === 'stop') stopAudio();
    else if (v === 'demo') startDemo();
    else startAudio(v);
    return;
  }
  if (g === 'skin') { if (v === 'more') { showSkinMenu(!skinMenu.classList.contains('show')); return; } setSpectrumSkin(v); }
  if (g === 'vu')   setVUSkin(v);
  if (g === 'cal')  vuCal = v === 'AUTO' ? 'AUTO' : Number(v);
  if (g === 'sens') setFlSensitivity(Number(v));
  if (g === 'mode') setSpectrumMode(Number(v));
  if (g === 'mods') toggleModule(v);
  if (g === 'deckmode') { deckDouble = v === 'double'; if (!mods.deck) toggleModule('deck'); }
  if (g === 'tapestyle') { tapeStyle = v; if (!mods.tape) toggleModule('tape'); }
  if (g === 'phone') phoneButton(v);
  if (g === 'tools') {
    if (v === 'fs') toggleFullscreen();
    if (v === 'drawer') setDrawer(!drawerOpen);
    if (v === 'hide') setControlsHidden(true);
    if (v === 'tapeonly') toggleTapeOnly();
    if (v === 'mini') toggleMini();
    if (v === 'history') showHistory(!histOpen());
  }
  savePrefs(); syncConsole();
  if (!running) drawIdle();
});

// ── MINI MODE ───────────────────────────────────────────────
// In the program the main process resizes the window, puts it on top and tells the page;
// in a browser the page just switches to the strip.
function setMini(on) {
  miniMode = on;
  document.body.classList.toggle('mini', on);
  requestAnimationFrame(() => { sizeCanvases(); if (!running) drawIdle(); });
}
function toggleMini() {
  if (window.winCtl && window.winCtl.mini) window.winCtl.mini();
  else setMini(!miniMode);
}
if (window.winCtl && window.winCtl.onMini) window.winCtl.onMini(on => { showSkinMenu(false); setMini(on); });
window.addEventListener('resize', () => { if (skinMenu.classList.contains('show')) showSkinMenu(false); });
document.querySelector('.mini-panel').addEventListener('dblclick', toggleMini);

// ── SPLASH ──────────────────────────────────────────────────
function closeSplash() {
  const splash = document.getElementById('splash');
  if (splash.style.display === 'none') return;
  splash.classList.add('fade-out');
  setTimeout(() => { splash.style.display = 'none'; }, 420);
}
document.getElementById('splashSys').addEventListener('click', e => { e.stopPropagation(); closeSplash(); startAudio('sys'); });
document.getElementById('splashMic').addEventListener('click', e => { e.stopPropagation(); closeSplash(); startAudio('mic'); });
document.getElementById('splashDemo').addEventListener('click', e => { e.stopPropagation(); closeSplash(); startDemo(); });

// ── KEYBOARD ────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.ctrlKey || e.altKey || e.metaKey) return;
  const k = e.key.toLowerCase();
  // An open window takes Esc (and L closes the history again); nothing else reaches the rack meanwhile.
  if (histOpen() || document.getElementById('phoneModal').classList.contains('show')) {
    if (k === 'escape' || (k === 'l' && histOpen())) { e.preventDefault(); showHistory(false); showPhoneModal(false); }
    return;
  }
  const act = {
    s: () => { closeSplash(); startAudio('sys'); },
    m: () => { closeSplash(); startAudio('mic'); },
    d: () => { closeSplash(); startDemo(); },
    ' ': () => { if (running) stopAudio(); },
    escape: () => { if (skinMenu.classList.contains('show')) { showSkinMenu(false); return; } if (running && !document.fullscreenElement) stopAudio(); },
    f: toggleFullscreen,
    t: cycleSkin,
    v: () => { const o = ['MODERN', 'HIFI90', 'REEL70', 'BLUE']; setVUSkin(o[(o.indexOf(vuSkin) + 1) % o.length]); savePrefs(); syncConsole(); },
    k: () => { setFlSensitivity(); savePrefs(); syncConsole(); },
    n: () => { setSpectrumMode(spectrumModeIndex + 1); savePrefs(); syncConsole(); },
    a: () => setDrawer(!drawerOpen),
    l: () => { if (!miniMode) showHistory(true); },
    h: () => setControlsHidden(!controlsHidden),
    1: () => toggleModule('vu'), 2: () => toggleModule('bpm'), 3: () => toggleModule('meters'),
    4: () => toggleModule('spectrum'), 5: () => toggleModule('osc'), 6: () => toggleModule('deck'), 7: () => toggleModule('tape'), 8: () => toggleModule('gonio'), z: () => toggleTapeOnly(), p: () => { if (!e.repeat) toggleMini(); },
    c: () => { const o = ['AUTO', 18, 14, 10]; vuCal = o[(o.indexOf(vuCal) + 1) % o.length]; savePrefs(); syncConsole(); },
  }[k];
  if (act) { e.preventDefault(); act(); }
});

// ── INIT ────────────────────────────────────────────────────
const prefs = loadPrefs();
setSpectrumMode(Number.isInteger(prefs.mode) ? prefs.mode : 0);
setFlSensitivity(Number.isInteger(prefs.flSensitivity) ? prefs.flSensitivity : 1);
setVUSkin(['HIFI90', 'REEL70', 'BLUE'].includes(prefs.vuSkin) ? prefs.vuSkin : 'MODERN');
setSpectrumSkin(SPECTRUM_SKINS.some(s => s[0] === prefs.spectrumSkin) ? prefs.spectrumSkin : 'MODERN');
if ([18, 14, 10].includes(prefs.cal)) vuCal = prefs.cal;
if (prefs.mods && typeof prefs.mods === 'object') {
  for (const k in mods) if (typeof prefs.mods[k] === 'boolean') mods[k] = prefs.mods[k];
  if (typeof prefs.mods.gonio !== 'boolean') mods.gonio = false;   // settings from before 6.1: the goniometer starts off
  if (!Object.values(mods).some(Boolean)) for (const k in mods) mods[k] = true;
}
if (typeof prefs.deckDouble === 'boolean') deckDouble = prefs.deckDouble;
if (prefs.tapeStyle === 'CLEAR' || prefs.tapeStyle === 'REEL') tapeStyle = prefs.tapeStyle;
if (prefs.drawerOpen) { drawerOpen = true; document.getElementById('console').classList.add('open'); }
if (prefs.controlsHidden) { controlsHidden = true; document.querySelector('.rack-unit').classList.add('controls-hidden'); }
applyModules();
syncConsole();
sizeCanvases();
drawIdle();
document.getElementById('ledPower').className = 'led amber';
// Running as the Deck 90 program (Electron): system audio is taken directly, no sharing dialog.
const IS_APP = /Electron/.test(navigator.userAgent);
if (IS_APP) {
  document.body.classList.add('is-app');
  // Shift+✕ quits for real even when ✕ leaves Deck 90 in the tray
  document.querySelectorAll('.win-ctl button').forEach(b => b.addEventListener('click', e => window.winCtl && window.winCtl[b.dataset.w === 'close' && e.shiftKey ? 'quit' : b.dataset.w]()));
  // The program starts listening right away: no splash, straight to whatever is playing on the PC.
  const sp = document.getElementById('splash');
  if (sp) sp.style.display = 'none';
  // a timer, not an animation frame: started with Windows the window is hidden and gets no frames
  setTimeout(() => { sizeCanvases(); startAudio('sys'); }, 30);
  const tip = document.querySelector('.splash-tip');
  if (tip) tip.innerHTML = '<span>SISTEMA</span> escucha directo todo lo que suena en la PC (Spotless incluido), sin diálogos.<br>' +
    '<span>S</span> sistema · <span>M</span> micrófono · <span>D</span> demo · <span>ESPACIO</span> detener · <span>F</span> pantalla completa<br>' +
    '<span>T</span> spectrum · <span>V</span> VU · <span>C</span> calibración · <span>K</span> sens · <span>N</span> tono · <span>L</span> historial';
}
if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
  toast('Este navegador no puede capturar el audio del sistema.<br><span>Usá Chrome o Edge en la PC.</span>', 9000);
}
