'use strict';
// ═══════════════════════════════════════════════════════════
//  PRESETS: five favourite looks
//  A preset keeps the VU face, the spectrum style and its sensitivity, the screen tone, the VU
//  calibration, which modules show, and the deck and cassette styles. Click 1–5 (or F1–F5) to load;
//  GUARDAR then a number (or Shift+click, Shift+F1–F5) stores what's on screen there.
// ═══════════════════════════════════════════════════════════
const PRESETS_KEY = 'deck90-presets';
const presetMods = (on) => Object.fromEntries(Object.keys(mods).map(k => [k, on.includes(k)]));
const FACTORY_PRESETS = [
  { name: 'Estudio',   snap: { vuSkin: 'MODERN', spectrumSkin: 'MODERN',   flSensitivity: 1, mode: 0, cal: 'AUTO', deckDouble: true,  tapeStyle: 'REEL',  mods: presetMods(['vu', 'bpm', 'gonio', 'meters', 'spectrum', 'osc']) } },
  { name: 'Hi-Fi 90s', snap: { vuSkin: 'HIFI90', spectrumSkin: 'FL90',     flSensitivity: 1, mode: 0, cal: 'AUTO', deckDouble: true,  tapeStyle: 'REEL',  mods: presetMods(['vu', 'bpm', 'meters', 'spectrum', 'deck']) } },
  { name: 'Cinta 70s', snap: { vuSkin: 'REEL70', spectrumSkin: 'AMBER',    flSensitivity: 1, mode: 1, cal: 'AUTO', deckDouble: false, tapeStyle: 'REEL',  mods: presetMods(['vu', 'meters', 'spectrum', 'tape']) } },
  { name: 'Vidriera',  snap: { vuSkin: 'BLUE',   spectrumSkin: 'SHOWROOM', flSensitivity: 2, mode: 0, cal: 'AUTO', deckDouble: false, tapeStyle: 'CLEAR', mods: presetMods(['vu', 'bpm', 'spectrum', 'tape']) } },
  { name: 'Mastering', snap: { vuSkin: 'MODERN', spectrumSkin: 'RTA',      flSensitivity: 1, mode: 3, cal: 18,     deckDouble: true,  tapeStyle: 'REEL',  mods: presetMods(['vu', 'gonio', 'meters', 'spectrum', 'osc']) } },
];
const vuName = v => ({ MODERN: 'Studio', HIFI90: 'Hi-Fi 90s', REEL70: 'Cinta 70s', BLUE: 'Azul' }[v] || v);
const skinName = s => (SPECTRUM_SKINS.find(x => x[0] === s) || [s, s])[1];

function presetSnapshot() {
  return { vuSkin, spectrumSkin, flSensitivity, mode: spectrumModeIndex, cal: vuCal, deckDouble, tapeStyle, mods: Object.assign({}, modsBeforeTape || mods) };
}
function loadPresets() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(PRESETS_KEY)); } catch (_) {}
  return FACTORY_PRESETS.map((f, i) => (saved && saved[i] && saved[i].snap && typeof saved[i].snap === 'object') ? saved[i] : JSON.parse(JSON.stringify(f)));
}
let presets = loadPresets();
let presetSaveArmed = false;
function storePresets() { try { localStorage.setItem(PRESETS_KEY, JSON.stringify(presets)); } catch (_) {} }

function applyPreset(i) {
  const p = presets[i]; if (!p) return;
  const s = p.snap;
  if (modsBeforeTape) modsBeforeTape = null;
  if (['MODERN', 'HIFI90', 'REEL70', 'BLUE'].includes(s.vuSkin)) setVUSkin(s.vuSkin);
  if (SPECTRUM_SKINS.some(x => x[0] === s.spectrumSkin)) setSpectrumSkin(s.spectrumSkin);
  if ([0, 1, 2].includes(s.flSensitivity)) setFlSensitivity(s.flSensitivity);
  if (Number.isInteger(s.mode)) setSpectrumMode(s.mode);
  if (s.cal === 'AUTO' || [18, 14, 10].includes(s.cal)) vuCal = s.cal;
  if (typeof s.deckDouble === 'boolean') deckDouble = s.deckDouble;
  if (s.tapeStyle === 'REEL' || s.tapeStyle === 'CLEAR') tapeStyle = s.tapeStyle;
  if (s.mods && typeof s.mods === 'object') {
    for (const k in mods) mods[k] = !!s.mods[k];
    if (!Object.values(mods).some(Boolean)) mods.vu = true;
  }
  applyModules(); savePrefs(); syncConsole();
  if (!running) drawIdle();
  toast('PRESET ' + (i + 1) + ' · <span>' + p.name + '</span>', 1600);
}
function savePreset(i) {
  const snap = presetSnapshot();
  const factory = FACTORY_PRESETS[i];
  presets[i] = { name: vuName(snap.vuSkin) + ' · ' + skinName(snap.spectrumSkin), snap };
  if (JSON.stringify(snap) === JSON.stringify(factory.snap)) presets[i].name = factory.name;
  storePresets();
  presetSaveArmed = false;
  syncConsole();
  toast('Guardado en el PRESET ' + (i + 1) + ' · <span>' + presets[i].name + '</span>', 2200);
}
function presetMatches(i) {
  const a = presetSnapshot(), b = presets[i] && presets[i].snap;
  if (!b) return false;
  return ['vuSkin', 'spectrumSkin', 'flSensitivity', 'mode', 'cal', 'deckDouble', 'tapeStyle'].every(k => a[k] === b[k]) &&
         Object.keys(mods).every(k => !!a.mods[k] === !!(b.mods && b.mods[k]));
}
// the console segment: 1–5 load (Shift+click saves), GUARDAR arms a save
function presetButton(v, shift) {
  if (v === 'save') {
    presetSaveArmed = !presetSaveArmed; syncConsole();
    if (presetSaveArmed) toast('Tocá <span>1–5</span> para guardar ahí lo que está en pantalla', 3000);
    return;
  }
  const i = Number(v) - 1;
  if (presetSaveArmed || shift) savePreset(i); else applyPreset(i);
}
// tooltips with each preset's name, refreshed with the console
function presetTitles() {
  document.querySelectorAll('.seg[data-group="preset"] button[data-v]').forEach(b => {
    const i = Number(b.dataset.v) - 1;
    if (presets[i]) b.title = 'Preset ' + (i + 1) + ': ' + presets[i].name + ' (F' + (i + 1) + ') · Shift+clic guarda acá lo que ves';
  });
}
