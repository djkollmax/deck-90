// Track history, kept as JSON in the program's data folder (%APPDATA%\Deck 90\history.json).
// The page sends one entry per track; everything is checked here before it is stored.
const fs = require('fs');
const path = require('path');

const MAX_ENTRIES = 5000;
const STR = 300;

function clean(e) {
  if (!e || typeof e !== 'object') return null;
  const s = v => typeof v === 'string' ? v.slice(0, STR) : '';
  const n = (v, lo, hi) => typeof v === 'number' && isFinite(v) && v >= lo && v <= hi ? Math.round(v * 10) / 10 : null;
  if (typeof e.id !== 'string' || !e.id || e.id.length > 1000) return null;
  const at = n(e.at, 946684800000, 4102444800000);      // 2000 … 2100
  const i = n(e.i, -90, 10);
  if (at === null || i === null) return null;
  return {
    id: e.id, at: Math.round(at),
    title: s(e.title), artist: s(e.artist), album: s(e.album), app: s(e.app),
    dur: n(e.dur, 0, 86400), heard: n(e.heard, 0, 86400),
    i, lra: n(e.lra, 0, 100), tp: n(e.tp, -120, 30), pk: n(e.pk, -120, 30),
    bpm: n(e.bpm, 20, 400), spot: n(e.spot, -100, 100),
  };
}

function createTrackLog({ dir, log }) {
  const FILE = path.join(dir, 'history.json');
  let list = null;
  function load() {
    if (list) return list;
    try { const a = JSON.parse(fs.readFileSync(FILE, 'utf8')); list = Array.isArray(a) ? a.map(clean).filter(Boolean) : []; }
    catch (e) { if (e.code !== 'ENOENT') log('history: unreadable file, starting a new one (' + e.message + ')'); list = []; }
    return list;
  }
  function save() {
    try {
      const tmp = FILE + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(list));
      fs.renameSync(tmp, FILE);                         // never leaves half a file behind
    } catch (e) { log('history: ' + e.message); }
  }
  return {
    add(entry) {
      const e = clean(entry); if (!e) return false;
      const l = load();
      const k = l.findIndex(x => x.id === e.id);
      if (k >= 0) { if ((l[k].heard || 0) > (e.heard || 0)) return true; l.splice(k, 1); }   // the same play, measured further
      l.unshift(e);
      if (l.length > MAX_ENTRIES) l.length = MAX_ENTRIES;
      save(); return true;
    },
    list() { return load().slice(); },
    clear() { list = []; save(); return true; },
  };
}

module.exports = { createTrackLog, clean };
