'use strict';
// What the rack's drawing files expect to find (normally set up by core.js / audio.js), so the phone
// page can reuse deck.js, draw-vu.js, tape.js and nowplaying.js unchanged.
let running = false, dtMs = 16.7, frameScale = 1;
let vuSkin = 'MODERN', deckDouble = false;
function mkVU() { return { lvl: -60, vel: 0, peak: -60, peakTmr: 0, clip: false, clipTmr: 0, samplePeak: -90, dbfs: -90 }; }
const vu = { L: mkVU(), R: mkVU() };
let gateBlocks = [], tpMaxDb = -Infinity;
function lraReset() {}
function el(id) { return document.getElementById(id); }
function guard(where, fn) { try { fn(); } catch (e) { console.error(where, e); } }
function toast(msg, ms) {
  const t = el('toast'); t.innerHTML = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), ms || 3000);
}
const cTP = el('tape'), xTP = cTP.getContext('2d');
const cDK = el('deck'), xDK = cDK.getContext('2d');

// The page talks to Deck 90 on the PC: events in, transport commands out.
const KEY = new URLSearchParams(location.search).get('k') || '';
const npHandlers = [];
window.nowPlaying = {
  on: cb => npHandlers.push(cb),
  cmd: c => fetch('/cmd?k=' + encodeURIComponent(KEY) + '&c=' + encodeURIComponent(c), { method: 'POST' })
    .then(r => { if (!r.ok) toast('La PC no aceptó el comando.'); })
    .catch(() => toast('Sin conexión con la PC.')),
};
