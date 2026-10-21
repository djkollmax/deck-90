'use strict';
// ── Now playing (from Windows' media sessions, via the program's bridge) ──
let np = null, npKey = '', trackStart = 0;
const trackHistory = [];
// Trust the sound as much as the player: if there is real audio, the tape is running, even when the
// player reports "Paused" (Spotless' alpha doesn't always update Windows when playback resumes).
let lastAudible = 0;
function audible(){ return performance.now() - lastAudible < 1500; }
function npPlaying(){ return np ? (np.status === 'Playing' || audible()) : audible(); }
function npPosition(now){
  if (!np || !isFinite(np.pos)) return 0;
  let p = np.pos;
  if (np.status === 'Playing' && np.at) p += Math.max(0, (Date.now() - np.at) / 1000);
  return np.dur > 0 ? Math.min(p, np.dur) : p;
}
function short(t, n){ t = t || ''; return t.length > n ? t.slice(0, n - 1) + '…' : t; }
function onNowPlaying(info){
  if (info.ready) return;
  const box = el('np');
  if (info.none || !(info.title || info.artist)) { np = null; box.classList.remove('on'); return; }
  const key = (info.app || '') + '|' + info.title + '|' + info.artist;
  if (key !== npKey) {                                   // a new track
    if (np && np.title) trackHistory.unshift(np);
    trackHistory.length = Math.min(trackHistory.length, 5);
    npKey = key; trackStart = performance.now();
    gateBlocks = []; lraBlocks = []; tpMaxDb = -Infinity;   // integrated loudness, LRA and TP max are per track
    decks[0].title = short(info.artist ? info.artist + ' – ' + info.title : info.title, 34);
    decks[0].counter = 0;
    const prev = trackHistory[0];
    decks[1].title = prev ? short('antes: ' + (prev.artist ? prev.artist + ' – ' : '') + prev.title, 34) : short(info.album || 'LATE NIGHT DUB', 34);
    el('npCover').classList.remove('on');              // the new track's cover (if any) comes in this same message
  }
  if (info.cover) { el('npCover').src = info.cover; el('npCover').classList.add('on'); }
  np = Object.assign({}, np && npKey === key ? np : {}, info);
  el('npTitle').textContent = info.title || '';
  el('npArtist').textContent = [info.artist, info.album].filter(Boolean).join(' · ');
  box.classList.add('on');
  box.classList.toggle('paused', info.status !== 'Playing' && !audible());
  document.title = info.title ? (info.artist ? info.artist + ' – ' : '') + info.title + ' · Deck 90' : 'Deck 90';
}
if (window.nowPlaying) window.nowPlaying.on(info => guard('nowPlaying', () => onNowPlaying(info)));

// Deck keys are live: they drive Spotless (or whatever player Windows reports).
let deckHits = [];
const deckPressed = {};
const DECK_CMD = { '◀◀': 'prev', '▶': 'play', '■': 'pause', '▶▶': 'next', '❚❚': 'toggle' };
function deckKeyAt(ev){
  const r = cDK.getBoundingClientRect(), x = ev.clientX - r.left, y = ev.clientY - r.top;
  return deckHits.find(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
}
cDK.addEventListener('mousemove', ev => { const h = deckKeyAt(ev); cDK.style.cursor = h && (window.nowPlaying || h.k === '●') ? 'pointer' : 'default'; });
cDK.addEventListener('click', ev => {
  const h = deckKeyAt(ev); if (!h) return;
  if (h.k === '●') { toast('REC · esta casetera solo reproduce 🙂', 2200); return; }
  if (!window.nowPlaying) { toast('Las teclas manejan Spotless desde el programa (Deck 90.exe).', 3500); return; }
  const cmd = DECK_CMD[h.k];
  deckPressed[h.k] = performance.now();
  if (cmd) window.nowPlaying.cmd(cmd);
  if (!running) drawDeck(cDK, xDK, false);
});

cTP.addEventListener('mousemove', ev => { cTP.style.cursor = tapeKeyAt(ev) ? 'pointer' : 'default'; });
cTP.addEventListener('click', ev => {
  const h = tapeKeyAt(ev); if (!h) return;
  if (!window.nowPlaying) { toast('Las teclas manejan Spotless desde el programa (Deck 90.exe).', 3500); return; }
  deckPressed[h.k] = performance.now();
  const cmd = DECK_CMD[h.k]; if (cmd) window.nowPlaying.cmd(cmd);
});
