'use strict';
// ═══════════════════════════════════════════════════════════
//  WHAT'S SAVED (core). Every setting lives in the window's localStorage as JSON, under a 'deck90-…' key:
//    deck90-prefs    the rack's prefs, one section per module (stereo, tuner, cdunit, rotate, …; controls.js
//                    writes it whole with savePrefs)
//    deck90-radio    the bands' memories (core/radio.js)      deck90-cdmodes   REPEAT and SHUFFLE (core/cd.js)
//    deck90-music    the DM-90's REPEAT and SHUFFLE (core/music.js; the server's sign-in lives in the main process)
//    deck90-clock    the header's clock and city (clock.js)   and history, presets, welcome, about (their files)
//  Reading never fails: a missing or damaged value gives the fallback. backup.js saves and restores them all.
// ═══════════════════════════════════════════════════════════
const store = {
  read(key, fallback = null) {
    try { const v = localStorage.getItem(key); if (v == null) return fallback; const j = JSON.parse(v); return j == null ? fallback : j; } catch (_) { return fallback; }
  },
  write(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (_) { return false; } },
  has(key) { try { return localStorage.getItem(key) != null; } catch (_) { return false; } },
  /** a module's section of deck90-prefs, or null */
  section(name) { const p = store.read('deck90-prefs', {}), s = p && typeof p === 'object' ? p[name] : null; return s && typeof s === 'object' ? s : null; },
};
