'use strict';
// ═══════════════════════════════════════════════════════════
//  PRESETS: five favourite looks (1–5, fixed) and three of your own (C1–C3)
//  A preset keeps the VU face, the spectrum style and its sensitivity, the screen tone, the VU
//  calibration, which modules show, and the deck and cassette styles. 1–5 (F1–F5) and C1–C3 (F6–F8)
//  load; GUARDAR then C1–C3 (or Shift+click, Shift+F6–F8) stores what's on screen there.
//  Everything else (and the look itself between sessions) is remembered as always.
// ═══════════════════════════════════════════════════════════
const PRESETS_KEY = 'deck90-presets-v2', OLD_PRESETS_KEY = 'deck90-presets';
const CUSTOM_N = 3;
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
const sameSnap = (a, b) => !!a && !!b && ['vuSkin', 'spectrumSkin', 'flSensitivity', 'mode', 'cal', 'deckDouble', 'tapeStyle'].every(k => a[k] === b[k]) &&
  Object.keys(mods).every(k => !!(a.mods && a.mods[k]) === !!(b.mods && b.mods[k]));
// your three: [{ name, snap } | null]. 6.6.0 let you overwrite 1–5: those looks move into C1–C3.
function loadCustoms() {
  try { const c = JSON.parse(localStorage.getItem(PRESETS_KEY)); if (Array.isArray(c)) return Array.from({ length: CUSTOM_N }, (_, i) => c[i] && c[i].snap ? c[i] : null); } catch (_) {}
  const out = Array(CUSTOM_N).fill(null);
  try {
    const old = JSON.parse(localStorage.getItem(OLD_PRESETS_KEY));
    if (Array.isArray(old)) old.forEach((p, i) => {
      if (p && p.snap && !sameSnap(p.snap, FACTORY_PRESETS[i] && FACTORY_PRESETS[i].snap)) { const k = out.indexOf(null); if (k >= 0) out[k] = p; }
    });
  } catch (_) {}
  return out;
}
let customs = loadCustoms();
let presetSaveArmed = false;
function storeCustoms() { try { localStorage.setItem(PRESETS_KEY, JSON.stringify(customs)); } catch (_) {} }
// slot ids: '1'…'5' the favourites, 'c1'…'c3' yours
const presetOf = id => /^c[1-3]$/.test(id) ? customs[Number(id[1]) - 1] : FACTORY_PRESETS[Number(id) - 1];
const presetLabel = id => /^c/.test(id) ? 'C' + id[1] : String(id);

function applyPreset(id) {
  const p = presetOf(id);
  if (!p) { toast('C' + id[1] + ' está vacío · <span>GUARDAR</span> y tocá C' + id[1] + ' para guardar ahí lo que ves', 3000); return; }
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
  toast('PRESET ' + presetLabel(id) + ' · <span>' + p.name + '</span>', 1600);
}
function savePreset(id) {
  presetSaveArmed = false;
  if (!/^c[1-3]$/.test(id)) { syncConsole(); toast('Los presets 1–5 son fijos · guardá tus looks en <span>C1, C2 o C3</span>', 3000); return; }
  const snap = presetSnapshot();
  const fav = FACTORY_PRESETS.findIndex(f => sameSnap(f.snap, snap));
  customs[Number(id[1]) - 1] = { name: fav >= 0 ? FACTORY_PRESETS[fav].name : vuName(snap.vuSkin) + ' · ' + skinName(snap.spectrumSkin), snap };
  storeCustoms(); syncConsole();
  toast('Guardado en ' + presetLabel(id) + ' · <span>' + customs[Number(id[1]) - 1].name + '</span>', 2200);
}
function presetMatches(id) { const p = presetOf(id); return !!p && sameSnap(presetSnapshot(), p.snap); }
// the console segment: 1–5 and C1–C3 load (Shift+click on C saves), GUARDAR arms a save
function presetButton(v, shift) {
  if (v === 'save') {
    presetSaveArmed = !presetSaveArmed; syncConsole();
    if (presetSaveArmed) toast('Tocá <span>C1, C2 o C3</span> para guardar ahí lo que está en pantalla', 3000);
    return;
  }
  if (presetSaveArmed || shift) savePreset(v); else applyPreset(v);
}
// tooltips with each preset's name, refreshed with the console; an empty C looks empty
function presetTitles() {
  document.querySelectorAll('.seg[data-group="preset"] button[data-v]').forEach(b => {
    const id = b.dataset.v; if (id === 'save') return;
    const p = presetOf(id), custom = /^c/.test(id), f = custom ? 5 + Number(id[1]) : Number(id);
    b.classList.toggle('empty', custom && !p);
    b.title = (custom ? 'Tu preset ' : 'Preset ') + presetLabel(id) + ': ' + (p ? p.name : 'vacío') + ' (F' + f + ')' + (custom ? ' · Shift+clic guarda acá lo que ves' : '');
  });
}
