'use strict';
// ═══════════════════════════════════════════════════════════
//  DM-90 DIGITAL MUSIC SERVER (7.10.0): the rack's double unit for the person's Jellyfin music (VER → MÚSICA, or J).
//  The faceplate is ui/jukebox/dm90.js; the library, the queue and the player are core/music.js. Its display and
//  keys speak English, as a 90s unit would (7.9.23); the toasts and SETUP, Spanish.
//    POWER     on and off (off: the music stops, the PC's player goes on)     SETUP   the server and the user
//    ARTISTS · ALBUMS · SONGS · QUEUE · SEARCH   what the list shows         ◀ BACK   the list before
//    SELECT (the knob, the wheel, ↑ ↓)  moves through the list   ENTER (or a double click)  opens it or plays from it
//    Q · PLAY NEXT (or Q)   what's marked plays next, after the song playing (an album or an artist: all of it)
//    ▶ ❚❚ ■ |◀◀ ▶▶  REPEAT (all, one, off) · SHUFFLE · SHUFFLE ALL (the whole library at random)
//    COLOR  the rack's displays' colour   DIMMER  this display's brightness   letters: jump to the first name
//  After a click on it the keyboard is the unit's (a click elsewhere, or Esc, gives it back): ↑ ↓ PgUp PgDn Home End, Enter,
//  Backspace (back), Q, Space (play / pause), / (search: the results come as you type), letters (jump; E, P and J
//  stay the program's, Shift + a letter jumps with any). Esc gives
//  it back. The scroll bar beside the list drags (or a click jumps there): a long list in a moment.
// ═══════════════════════════════════════════════════════════
// 7.10.3: COLOR is the rack's displays' colour (the DT-90, the DC-90 and the DM-90 together, as one system), DIMMER
// their brightness (7.10.6: all three too)
const UNIT_COLORS = [
  { id: 'aqua', name: 'AGUA', vfd: '#80ffe5', dim: '#193e34' }, { id: 'amber', name: 'ÁMBAR', vfd: '#ffb84a', dim: '#3e2b0f' },
  { id: 'green', name: 'VERDE', vfd: '#8cff5a', dim: '#1d3b12' }, { id: 'blue', name: 'AZUL', vfd: '#8fd0ff', dim: '#152f48' },
  { id: 'white', name: 'BLANCO', vfd: '#eef4ff', dim: '#2b3038' }, { id: 'red', name: 'ROJO', vfd: '#ff5f4f', dim: '#40150f' },
  { id: 'violet', name: 'VIOLETA', vfd: '#c6a0ff', dim: '#2b1d45' },
  // 7.10.4: seven more
  { id: 'orange', name: 'NARANJA', vfd: '#ff8a2a', dim: '#40220c' }, { id: 'yellow', name: 'AMARILLO', vfd: '#ffe14a', dim: '#3d3510' },
  { id: 'cyan', name: 'CIAN', vfd: '#4ae8ff', dim: '#0f3540' }, { id: 'pink', name: 'ROSA', vfd: '#ff7ac8', dim: '#40142e' },
  { id: 'lime', name: 'LIMA', vfd: '#c8ff3a', dim: '#2f3d0e' }, { id: 'ice', name: 'HIELO', vfd: '#c8f0ff', dim: '#203640' },
  { id: 'gold', name: 'ORO', vfd: '#ffd27a', dim: '#3d3018' }];
const JB_DIM_NAME = ['ALTO', 'MÁXIMO', 'BAJO'];
let jbCfg = { show: false, remain: true, color: 'aqua', dim: 0 };
{ const c = store.section('jukebox'); if (c) jbCfg = { show: c.show === true, remain: c.remain !== false,
  color: UNIT_COLORS.some(u => u.id === c.color) ? c.color : 'aqua', dim: [0, 1, 2].includes(c.dim) ? c.dim : 0 }; }
function unitColorApply() {
  const u = UNIT_COLORS.find(x => x.id === jbCfg.color) || UNIT_COLORS[0];
  for (const id of ['tunerPanel', 'cdPanel', 'jbPanel', 'volPanel']) {
    const el = document.getElementById(id); if (!el) continue;
    el.style.setProperty('--vfd', u.vfd); el.style.setProperty('--vfd-dim', u.dim);
    // 7.10.6: DIMMER too, on the tuner and the CD as on the DM-90 (brightest / low; the DM-90 draws its own)
    el.classList.toggle('dim-max', jbCfg.dim === 1); el.classList.toggle('dim-low', jbCfg.dim === 2);
  }
  if (typeof hdrApply === 'function') hdrApply();                 // 7.10.9: the header display too (clock.js)
}
unitColorApply();
let jb = null, jbPower = false, jbActive = false, jbShownKey = '', jbAvg = -24, jbAt = 0, jbLv = { L: 0, R: 0 };
const jbPanel = document.getElementById('jbPanel');
const jbShown = () => jbCfg.show && !miniMode;
// the list on screen: what it is, its items, the marked one; ATRÁS goes back through jbStack
let jbView = { kind: 'home', items: [], cursor: 0, top: 0, title: '' }, jbStack = [], jbSearchText = null, jbJump = { text: '', at: 0 }, jbLoading = '';

function jbTheme() {
  if (!jb) return;
  const c = typeof chassis === 'string' ? chassis : 'TI';
  jb.setTheme(c === 'BLACK' || c === 'ANTHRACITE' || c === 'CLASSIC' ? 'black' : 'silver');
  jbPanel.classList.toggle('gold', c === 'GOLD');
}
function jbBuild() {
  if (jb || typeof Deck90Music !== 'function') return;
  jb = new Deck90Music(document.getElementById('jukebox'), { theme: 'silver' });
  jbTheme(); jb.setPower(jbPower); jb.setDimmer(jbCfg.dim); jb.setModes(musicModes); jb.setTimeMode(jbCfg.remain ? 'remain' : 'elapsed');
  jb.onKey(jbKey);
  jbTimeKey();
  jbShownKey = ''; jbSync(); jbRenderList();
}
// 7.10.11: a touch on the time switches it between the time left (a minus lights) and the time played, as on the
// DC-90; remembered
function jbTimeKey() {
  const hit = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  for (const [k, v] of Object.entries({ x: 38, y: 48, width: 205, height: 74, fill: 'transparent', role: 'button', tabindex: 0, 'data-role': 'time-key',
    'aria-label': 'Tiempo: restante o transcurrido' })) hit.setAttribute(k, v);
  hit.style.cursor = 'pointer'; hit.style.outline = 'none';
  const flip = () => {
    jbCfg.remain = !jbCfg.remain; savePrefs();
    jb.setTimeMode(jbCfg.remain ? 'remain' : 'elapsed');
    toast('DM-90 · <span>' + (jbCfg.remain ? 'tiempo restante' : 'tiempo transcurrido') + '</span>', 1200);
  };
  hit.addEventListener('click', flip);
  hit.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); flip(); } });
  jb.svg.append(hit);
}
function jbShow(on, quiet) {
  jbCfg.show = !!on;
  jbPanel.classList.toggle('mod-off', !on);
  if (on) jbBuild();
  savePrefs(); syncConsole();
  requestAnimationFrame(() => { sizeCanvases(); if (!capture.running) drawIdle(); });
  if (!quiet) toast(on ? 'MÚSICA · <span>el DM-90</span> en el rack: tu música de Jellyfin (J lo esconde)' : 'El DM-90 queda guardado (J lo vuelve a mostrar)' + (musicPlaying() ? ': la música sigue sonando' : ''), 2400);
}

// ── on and off ──
async function jbOn(on) {
  if (on === jbPower) return;
  jbPower = on; jb && jb.setPower(on);
  if (on) {
    await musicStatus();
    if (musicServer.none) toast('MÚSICA · <span>Jellyfin</span> se usa desde el programa instalado', 2400);
    else if (!musicServer.signedIn) jbSetup(true);
    else if (jbView.kind === 'home') jbOpen('artists');
  } else {
    musicStop(); jbSearchText = null;
    if (musicResumePc) { musicResumePc = false; if (window.nowPlaying) window.nowPlaying.cmd('play'); }
    toast('MÚSICA · <span>apagada</span>', 1200);
  }
  jbSync(); jbRenderList();
}

// ── the lists ──
const jbTime = s => s ? mmss(s) : '';
function jbRow(it, i) {
  const now = musicNow();
  if (it.kind === 'artist') return { text: it.name, sub: jbView.kind === 'search' ? 'ARTIST' : '', end: '' };
  if (it.kind === 'album') return { text: it.name, sub: jbView.kind === 'artist' ? '' : it.artist,
    end: jbView.kind === 'search' ? ['ALBUM', it.year || ''].filter(Boolean).join(' · ') : [it.year || '', it.count ? it.count + ' SONGS' : ''].filter(Boolean).join(' · ') };
  if (it.kind === 'more') return { text: it.name, sub: '', end: '', dim: true };
  if (it.kind === 'head') return { text: '── ' + it.name + ' ──', sub: '', end: '', dim: true };   // a search's groups
  const n = jbView.kind === 'album' && it.n ? String(it.n).padStart(2, '0') + ' ' : '';
  return { text: n + it.name, sub: jbView.kind === 'album' && it.artist === jbView.artist ? '' : it.artist,
    end: [jbTime(it.len), musicQualityShort(it.media)].filter(Boolean).join(' '),
    playing: jbView.kind === 'list' ? i === musicPos : !!now && now.id === it.id };
}
function jbRenderList() {
  if (!jb) return;
  const v = jbView, rows = jb.rows();
  v.cursor = Math.max(0, Math.min(v.cursor, v.items.length - 1));
  if (v.cursor < v.top) v.top = v.cursor;
  if (v.cursor >= v.top + rows) v.top = v.cursor - rows + 1;
  v.top = Math.max(0, Math.min(v.top, Math.max(0, v.items.length - rows)));
  const count = v.items.length, found = v.kind === 'search' ? v.items.filter(i => i.kind !== 'head').length : count, fmt = n => n.toLocaleString('es-AR');
  let header = v.title + (found && v.kind !== 'home' ? ' · ' + fmt(found) : '') + (musicLibraryName() && ['artists', 'albums', 'songs', 'search'].includes(v.kind) ? ' · ' + musicLibraryName().toUpperCase() : ''), right = '';   // 7.10.10
  if (jbSearchText !== null) { header = 'SEARCH: ' + jbSearchText + '_'; right = jbLoading || jbFound(); }
  else if (jbLoading) right = jbLoading;
  else if (jbJump.text && performance.now() - jbJump.at < 1500) right = '→ ' + jbJump.text;
  else right = musicQueue.length ? 'QUEUE ' + (musicPos >= 0 ? musicPos + 1 + '/' : '') + musicQueue.length : '';
  jb.setList({ header, right, rows: v.items.slice(v.top, v.top + rows).map((it, k) => jbRow(it, v.top + k)), cursor: v.cursor, top: v.top, count });
  jb.setView(jbSearchText !== null || v.kind === 'search' ? 'search' : { artists: 'artists', albums: 'albums', songs: 'songs', list: 'list' }[v.kind] || '');
}
function jbHome(text) { jbView = { kind: 'home', items: (text || []).map(name => ({ kind: 'more', name })), cursor: 0, top: 0, title: 'DM-90' }; jbStack = []; jbRenderList(); }
// load a list: what the server says goes on screen when it arrives (a slower answer for an older ask is dropped)
let jbAsk = 0;
async function jbLoad(view, load, push) {
  const t = ++jbAsk;
  jbLoading = 'READING…'; jbRenderList();
  try {
    const items = await load();
    if (t !== jbAsk) return;
    if (push && jbView.kind !== 'home') jbStack.push(jbView);
    jbView = Object.assign({ cursor: 0, top: 0 }, view, { items });
  } catch (e) {
    if (t !== jbAsk) return;
    toast('MÚSICA · <span>' + (e.message === 'signed out' ? 'sin sesión: SETUP' : 'el servidor no contestó') + '</span>', 2400);
  } finally { if (t === jbAsk) { jbLoading = ''; jbRenderList(); } }
}
function jbOpen(kind) {
  if (!jbReady()) return;
  if (kind !== 'search') jbSearchText = null;
  if (kind === 'artists') return jbLoad({ kind: 'artists', title: 'ARTISTS' }, async () => (await musicArtists()).map(a => Object.assign({ kind: 'artist' }, a)));
  if (kind === 'albums') return jbLoad({ kind: 'albums', title: 'ALBUMS' }, async () => (await musicAlbums()).map(a => Object.assign({ kind: 'album' }, a)));
  if (kind === 'songs') return jbLoad({ kind: 'songs', title: 'SONGS' }, async () => (await musicSongs()).map(s => Object.assign({ kind: 'song' }, s)));
  if (kind === 'list') { ++jbAsk; jbLoading = ''; jbStack = []; jbView = { kind: 'list', title: 'QUEUE', items: musicQueue.map(s => Object.assign({ kind: 'song' }, s)), cursor: Math.max(0, musicPos), top: 0 }; return jbRenderList(); }
  if (kind === 'search') return jbSearchStart();
}
function jbReady() {
  if (!jbPower) { jbOn(true); return false; }
  if (!musicServer.signedIn) { jbSetup(true); return false; }
  return true;
}
const jbSongs = () => jbView.items.filter(it => it.kind === 'song');
// ENTER: an artist opens its albums, an album its songs; a song plays, with the rest of the list after it
async function jbEnter() {
  const it = jbView.items[jbView.cursor]; if (!it || !jbReady()) return;
  if (it.kind === 'artist') return jbLoad({ kind: 'artist', title: it.name + ' › ALBUMS', artistId: it.id }, async () => (await musicAlbums(it.id)).map(a => Object.assign({ kind: 'album' }, a)), true);
  if (it.kind === 'album') return jbLoad({ kind: 'album', title: it.name + (it.year ? ' (' + it.year + ')' : ''), artist: it.artist, albumId: it.id }, async () => (await musicTracks(it.id)).map(s => Object.assign({ kind: 'song' }, s)), true);
  if (it.kind !== 'song') return;
  if (jbView.kind === 'list') { musicJump(jbView.cursor); return; }
  const songs = jbSongs();
  await musicPlay(songs, songs.indexOf(it));
  toast('▶ · <span>' + it.name.replace(/[<>&]/g, '') + '</span>' + (songs.length > 1 ? ' · ' + songs.length + ' en la cola' : ''), 1600);
}
// Q: the marked song (or all of an album or an artist) plays next
async function jbQueue() {
  const it = jbView.items[jbView.cursor]; if (!it || !jbReady()) return;
  let songs = [];
  try {
    if (it.kind === 'song') songs = [it];
    else if (it.kind === 'album') songs = await musicTracks(it.id);
    else if (it.kind === 'artist') songs = await musicArtistSongs(it.id);
  } catch (_) { toast('MÚSICA · <span>el servidor no contestó</span>', 2000); return; }
  if (!songs.length) return;
  const wasIdle = musicPos < 0 && !musicPlaying();
  musicQueueNext(songs.map(s => Object.assign({}, s, { kind: 'song' })));
  toast('Q · <span>' + (songs.length === 1 ? songs[0].name.replace(/[<>&]/g, '') : songs.length + ' temas') + '</span> ' + (wasIdle ? 'en la cola: ▶ la empieza' : 'después de este'), 1800);
  if (jbView.kind === 'list') jbOpen('list');
  if (jbView.kind !== 'list' && jbView.cursor < jbView.items.length - 1) jbView.cursor++;   // the next one, ready for another Q
  jbRenderList();
}
// SHUFFLE ALL (7.10.4): every song of the library, at random; the queue shows them
async function jbShuffleAll() {
  if (!jbReady()) return;
  jbLoading = 'READING LIBRARY…'; jbRenderList();
  try {
    const n = await musicShuffleAll();
    jb.setModes(musicModes);
    toast('SHUFFLE ALL · <span>' + n.toLocaleString('es-AR') + ' temas</span> al azar', 2000);
    jbLoading = ''; jbOpen('list');
  } catch (_) { jbLoading = ''; jbRenderList(); toast('MÚSICA · <span>el servidor no contestó</span>', 2000); }
}
function jbMove(d) {
  const it = jbView.items; if (!it.length) return;
  let c = Math.max(0, Math.min(it.length - 1, jbView.cursor + d));
  if (it[c].kind === 'head') c = c + (d < 0 && c > 0 ? -1 : 1) < it.length ? c + (d < 0 && c > 0 ? -1 : 1) : c - 1;   // a group's title is skipped
  jbView.cursor = Math.max(0, c); jbRenderList();
}
// letters: the first name that starts with what was typed (typed quickly, more than one letter)
function jbLetter(ch) {
  const now = performance.now();
  jbJump.text = now - jbJump.at < 1000 ? jbJump.text + ch : ch; jbJump.at = now;
  const key = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/^(the|los|las|el|la)\s+/i, '').toLowerCase();
  const want = key(jbJump.text), i = jbView.items.findIndex(it => key(it.name).startsWith(want));
  if (i >= 0) jbView.cursor = i;
  jbRenderList();
  setTimeout(() => jbRenderList(), 1600);
}
function jbBack() {
  if (jbSearchText !== null) { jbSearchText = null; return jbRenderList(); }
  if (jbStack.length) { jbView = jbStack.pop(); jbRenderList(); }
}
// SEARCH (7.10.2): the results come while typing, from the whole library (read once: READING LIBRARY…); any words,
// in any order, in the song, the artist or the album. ↑ ↓ move through them as you type, ENTER opens or plays the
// marked one, ESC leaves the typing with the results on screen, ◀ BACK goes back to them from what was opened
let jbSearchT = 0, jbSearchN = { artists: 0, albums: 0, songs: 0 };
const jbPlural = (n, one, many) => n + ' ' + (n === 1 ? one : many);
function jbFound() {
  const n = jbSearchN, parts = [n.artists && jbPlural(n.artists, 'ARTIST', 'ARTISTS'), n.albums && jbPlural(n.albums, 'ALBUM', 'ALBUMS'), n.songs && jbPlural(n.songs, 'SONG', 'SONGS')].filter(Boolean);
  return (jbSearchText || '').trim() ? parts.join(' · ') || 'NOTHING FOUND' : 'TYPE A SONG, ARTIST OR ALBUM';
}
async function jbSearchStart() {
  ++jbAsk;                                                         // 7.10.13: a slower list asked before doesn't cover the search
  if (jbView.kind !== 'search') { if (jbView.kind !== 'home') jbStack.push(jbView); jbView = { kind: 'search', title: 'SEARCH', items: [], cursor: 0, top: 0 }; jbSearchN = { artists: 0, albums: 0, songs: 0 }; }
  jbSearchText = jbView.q || '';
  if (!musicIndex) {
    jbLoading = 'READING LIBRARY…'; jbRenderList();
    try { await musicSearchReady(); } catch (_) { toast('MÚSICA · <span>el servidor no contestó</span>', 2000); }
    jbLoading = '';
  }
  jbSearchLive();
}
function jbSearchLive() {
  clearTimeout(jbSearchT);
  if (jbView.kind !== 'search') return;
  const q = jbSearchText === null ? jbView.q : jbSearchText, r = musicSearchNow(q || '');
  jbView.q = q; jbView.title = q ? 'SEARCH “' + q.trim() + '”' : 'SEARCH';
  // 7.10.4: in three groups, each under its title: ARTISTS · 3, ALBUMS · 12, SONGS · 140
  const head = (name, list) => list.length ? [{ kind: 'head', name: name + ' · ' + list.length.toLocaleString('es-AR') }, ...list] : [];
  jbView.items = [...head('ARTISTS', r.artists), ...head('ALBUMS', r.albums), ...head('SONGS', r.songs)];
  jbView.cursor = jbView.items.length > 1 ? 1 : 0; jbView.top = 0;
  jbSearchN = { artists: r.artists.length, albums: r.albums.length, songs: r.songs.length };
  jbRenderList();
}
function jbSearchType(text) {
  jbSearchText = text.slice(0, 60); jbRenderList();
  clearTimeout(jbSearchT); jbSearchT = setTimeout(jbSearchLive, 90);
}

// ── the keys ──
function jbKey(k, { hold, index, double, delta, fraction } = {}) {
  jbKbd(true);
  if (k === 'power') return jbOn(!jbPower);
  if (k === 'setup' && hold) return jbLibraryNext();               // 7.10.10: SETUP held, the next library (all, then each)
  if (k === 'setup') return jbSetup(true);
  if (k === 'color') {                                            // the rack's displays, all three (held: the one before)
    const i = UNIT_COLORS.findIndex(u => u.id === jbCfg.color), n = UNIT_COLORS.length;
    jbCfg.color = UNIT_COLORS[(i + (hold ? n - 1 : 1)) % n].id; unitColorApply(); savePrefs();
    toast('COLOR · <span>' + UNIT_COLORS.find(u => u.id === jbCfg.color).name + '</span> en los displays del rack y el reloj', 1400);
    return;
  }
  if (k === 'dimmer') { jbCfg.dim = (jbCfg.dim + 1) % 3; jb.setDimmer(jbCfg.dim); if (typeof dv !== 'undefined' && dv) dv.setDimmer(jbCfg.dim); unitColorApply(); savePrefs(); toast('DIMMER · brillo <span>' + JB_DIM_NAME[jbCfg.dim] + '</span> en los displays del rack y el reloj', 1200); return; }
  if (!jbPower) { jbOn(true); return; }
  if (k === 'wheel') return jbMove(delta);
  if (k === 'seek') {                                             // 7.10.2: the scroll bar, dragged or clicked
    const rows = jb.rows(), n = jbView.items.length; if (n <= rows) return;
    const top = Math.round(fraction * (n - rows)), off = Math.max(0, Math.min(rows - 1, jbView.cursor - jbView.top));
    jbView.top = top; jbView.cursor = top + off; jbRenderList(); return;
  }
  if (k === 'row') { jbView.cursor = jbView.top + index; jbRenderList(); if (double) jbEnter(); return; }
  if (['artists', 'albums', 'songs', 'list', 'search'].includes(k)) return jbOpen(k);
  if (k === 'back') return jbBack();
  if (k === 'enter') return jbEnter();
  if (k === 'queue') return jbQueue();
  if (k === 'all') return jbShuffleAll();
  if (k === 'repeat' || k === 'shuffle') {
    if (k === 'repeat') musicModes.repeat = { off: 'all', all: 'one', one: 'off' }[musicModes.repeat];
    else { musicModes.shuffle = !musicModes.shuffle; if (musicModes.shuffle) musicShuffleDeal(); }
    musicModesSave(); jb.setModes(musicModes);
    toast(k === 'repeat' ? 'REPEAT · <span>' + { off: 'apagado', all: 'toda la cola', one: 'este tema' }[musicModes.repeat] + '</span>'
      : 'SHUFFLE · <span>' + (musicModes.shuffle ? 'al azar' : 'en orden') + '</span>', 1400);
    return;
  }
  if (k === 'play') {
    if (musicPlaying()) return;
    if (musicAudio.getAttribute('src') || musicQueue.length) return musicToggle();
    const it = jbView.items[jbView.cursor];
    if (it && it.kind === 'song') return jbEnter();
    return;
  }
  if (k === 'pause') { if (musicPlaying() || musicPaused()) musicToggle(); return; }
  if (k === 'stop') { musicStop(); return; }
  if (k === 'next') return musicNext();
  if (k === 'prev') return musicPrev();
}

// the keyboard, while the unit is the one in use (the pointer on it, or clicked last)
// 7.10.4: a click on it (not the pointer just passing over) gives it the keyboard, so E, P and the rest still work
// (the unit glows a little while the keyboard is its)
function jbKbd(on) { jbActive = on; jbPanel.classList.toggle('kbd', on); }
document.addEventListener('pointerdown', e => {
  if (jbPanel.contains(e.target)) { jbKbd(true); return; }
  jbKbd(false); if (jbSearchText !== null) { jbSearchText = null; jbRenderList(); }
}, true);
document.addEventListener('keydown', e => {
  if (!jb || !jbActive || !jbShown() || !jbPower || e.ctrlKey || e.altKey || e.metaKey) return;
  if (e.target && e.target.closest && e.target.closest('input, textarea, select')) return;
  if (document.querySelector('#jbSetup.show, #phoneModal.show, #histModal.show')) return;
  const k = e.key, take = () => { e.preventDefault(); e.stopImmediatePropagation(); };
  if (jbSearchText !== null) {                                   // typing a search: the results follow each letter
    const step = { ArrowDown: 1, ArrowUp: -1, PageDown: jb.rows(), PageUp: -jb.rows() }[k];
    if (step) { take(); jbMove(step); }
    else if (k === 'Enter') { take(); jbSearchLive(); jbSearchText = null; jbEnter(); }
    else if (k === 'Escape') { take(); jbSearchLive(); jbSearchText = null; jbRenderList(); }
    else if (k === 'Backspace') { take(); if (jbSearchText) jbSearchType(jbSearchText.slice(0, -1)); else { jbSearchText = null; jbRenderList(); } }
    else if (k.length === 1) { take(); jbSearchType(jbSearchText + k); }
    return;
  }
  const move = { ArrowDown: 1, ArrowUp: -1, PageDown: jb.rows(), PageUp: -jb.rows(), Home: -1e9, End: 1e9 }[k];
  if (move) { take(); return jbMove(move); }
  if (k === 'Enter') { take(); return jbEnter(); }
  if (k === 'Backspace') { take(); return jbBack(); }
  if (k === 'Escape') { take(); jbKbd(false); return; }
  if (k === ' ') { take(); if (!e.repeat) jbKey(musicPlaying() ? 'pause' : 'play'); return; }
  if (k === '/') { take(); return jbOpen('search'); }
  if (k.toLowerCase() === 'q') { take(); if (!e.repeat) jbQueue(); return; }
  // 7.10.6: E (the stereo), P (the strip) and J (this unit) stay the program's even here; Shift + a letter jumps
  // with any letter (Shift+E: the first name with E)
  if (!e.shiftKey && /^[epjg]$/i.test(k)) return;                 // 7.10.11: G too (keep the song)
  if (/^[\p{L}\p{N}]$/u.test(k)) { take(); return jbLetter(k.toLowerCase()); }
}, true);

// ── SETUP: the Jellyfin server, the user and the password (the password goes to the server, never kept) ──
// 7.10.10: which of the server's music libraries the lists show: all of them merged, or one (SETUP held goes
// through them; the SETUP dialog has them in a list); the list on screen reads again from the one chosen
async function jbLibraryNext() {
  if (!musicServer.signedIn) return jbSetup(true);
  let libs; try { libs = await musicLibraries(); } catch (_) { toast('⚠ No pude leer las bibliotecas del servidor', 2200); return; }
  if (libs.length < 2) { toast('BIBLIOTECA · el servidor tiene <span>una sola</span> de música', 2000); return; }
  const ids = ['', ...libs.map(l => l.id)], i = ids.indexOf(musicModes.library);
  jbLibrarySet(ids[(i + 1) % ids.length]);
}
function jbLibrarySet(id) {
  musicLibrarySet(id);
  toast('BIBLIOTECA · <span>' + (musicLibraryName() || 'todas').replace(/[<>&]/g, '') + '</span>' + (id ? '' : ' (' + (musicLibs || []).map(l => l.name).join(' + ').replace(/[<>&]/g, '') + ')'), 2000);
  const sel = document.getElementById('jbLibrary'); if (sel) sel.value = id;
  if (['artists', 'albums', 'songs'].includes(jbView.kind) && !jbStack.length) jbOpen(jbView.kind);
  else if (jbPower) jbOpen('artists');
}
async function jbLibraryList() {
  const sel = document.getElementById('jbLibrary'), row = document.getElementById('jbLibraryRow');
  row.style.display = 'none';
  if (!musicServer.signedIn) return;
  let libs; try { libs = await musicLibraries(); } catch (_) { return; }
  if (libs.length < 2) return;
  sel.replaceChildren(new Option('Todas (' + libs.map(l => l.name).join(' + ') + ')', ''), ...libs.map(l => new Option(l.name, l.id)));
  sel.value = musicModes.library; row.style.display = '';
}
function jbSetup(on) {
  const m = document.getElementById('jbSetup');
  m.classList.toggle('show', on);
  if (!on) return;
  document.getElementById('jbServer').value = musicServer.server || 'http://localhost:8096';
  document.getElementById('jbUser').value = musicServer.name || '';
  document.getElementById('jbPass').value = '';
  document.getElementById('jbSetupMsg').textContent = musicServer.signedIn ? 'Conectado como ' + musicServer.name + ' en ' + musicServer.server : '';
  document.getElementById('jbSignOut').style.display = musicServer.signedIn ? '' : 'none';
  jbLibraryList();
  setTimeout(() => document.getElementById(musicServer.signedIn ? 'jbServer' : document.getElementById('jbUser').value ? 'jbPass' : 'jbUser').focus(), 50);
}
async function jbSignInNow() {
  const msg = document.getElementById('jbSetupMsg'), go = document.getElementById('jbGo');
  msg.textContent = 'Conectando…'; go.disabled = true;
  const r = await musicSignIn(document.getElementById('jbServer').value, document.getElementById('jbUser').value, document.getElementById('jbPass').value);
  go.disabled = false; document.getElementById('jbPass').value = '';
  if (!r.ok) { msg.textContent = '⚠ ' + (r.error || 'No pude conectar'); return; }
  if (!r.library) { msg.textContent = '⚠ Conectado, pero ese usuario no tiene una biblioteca de música'; return; }
  jbSetup(false);
  toast('MÚSICA · <span>conectado</span> como ' + String(r.name).replace(/[<>&]/g, ''), 2000);
  if (!jbPower) jbOn(true); else jbOpen('artists');
}
document.getElementById('jbGo').addEventListener('click', jbSignInNow);
document.getElementById('jbSignOut').addEventListener('click', async () => { await musicSignOut(); jbSetup(false); jbHome(['NO SERVER: PRESS SETUP TO CONNECT']); toast('MÚSICA · <span>desconectado</span>', 1600); });
document.getElementById('jbClose').addEventListener('click', () => jbSetup(false));
document.getElementById('jbLibrary').addEventListener('change', e => jbLibrarySet(e.target.value));
document.getElementById('jbSetup').addEventListener('click', e => { if (e.target.id === 'jbSetup') jbSetup(false); });
document.getElementById('jbSetup').addEventListener('keydown', e => {
  e.stopPropagation();
  if (e.key === 'Enter') { e.preventDefault(); jbSignInNow(); }
  if (e.key === 'Escape') { e.preventDefault(); jbSetup(false); }
});

// the music goes on in the DM-90 when the stereo closes playing it, if the unit is in the rack (7.10.4)
function jbKeeps() { if (!jbCfg.show || !musicPlaying()) return false; jbPower = true; jb && jb.setPower(true); jbSync(); jbRenderList(); return true; }

// 7.10.4: the header hears the DM-90 (its song, artist, album and time, and the history counts it), and so does
// Windows (the media flyout, the keyboard's media keys) through the page's media session
// 7.10.4: the header, the history and the keyboard's media keys follow the DM-90 while it plays or waits paused;
// 7.10.7: through nowplaying.js's sources, with the radio and the CD (the deck's keys drive it too)
npSource('dm90', () => {
  const s = musicNow();
  if (!s || !(musicPlaying() || musicPaused())) return null;
  return { app: 'Deck 90 · DM-90', title: s.name, artist: s.artists || s.artist, album: s.album, status: musicPlaying() ? 'Playing' : 'Paused',
    pos: musicAudio.currentTime || 0, dur: isFinite(musicAudio.duration) ? musicAudio.duration : s.len || 0, at: Date.now() };
}, c => {
  if (c === 'prev') return musicPrev();
  if (c === 'next') return musicNext();
  if (c === 'pause') return musicPauseHere();
  if (c === 'toggle' || (c === 'play' && !musicPlaying())) return musicToggle();
});

// ── the display: what plays, from the player ──
function jbSync() {
  if (!jb) return;
  const s = musicNow(), on = jbPower;
  const r = {
    title: !on ? '' : s ? s.name : musicServer.signedIn ? 'SELECT A SONG' : musicServer.none ? 'JELLYFIN IN THE INSTALLED PROGRAM' : 'NO SERVER · SETUP',
    artist: !on ? '' : s ? [s.artists || s.artist, s.album + (s.year ? ' (' + s.year + ')' : '')].filter(Boolean).join(' · ') : musicServer.signedIn ? (musicServer.name + ' · ' + musicServer.server.replace(/^https?:\/\//, '')).toUpperCase() : '',
    quality: on && s ? musicQualityLong(s.media) || 'QUALITY: READING…' : '',
    index: s ? musicPos + 1 : 0, total: musicQueue.length, elapsed: on && s ? Math.floor(musicAudio.currentTime || 0) : 0,
    duration: on && s ? Math.round(isFinite(musicAudio.duration) ? musicAudio.duration : s.len || 0) : 0,
    playing: on && musicPlaying(), paused: on && musicPaused(), online: on && !!musicServer.signedIn,
  };
  jbPanel.classList.toggle('idle', jbPower && !musicPlaying() && (radioPlaying() || cdPlaying()));
  const key = JSON.stringify(r);
  if (key === jbShownKey) return;
  jbShownKey = key; jb.setNow(r);
}
setInterval(() => { if (jb && jbShown()) jbSync(); }, 250);
deck.on('music', () => { if (!jb) return; jbSync(); if (jbView.kind === 'list') jbView.items = musicQueue.map(s => Object.assign({ kind: 'song' }, s)); jbRenderList(); });
// the radio or the CD take the sound: the music pauses where it was (PLAY goes on)
radioAudio.addEventListener('playing', () => musicPauseHere());
deck.on('cd', () => { if (cdPlaying() && musicPlaying()) musicPauseHere(); });

// every frame from the loop: the L/R bars on the sound Deck 90 hears
function jbFeed(now) {
  if (!jb) return;
  if (!musicPlaying()) { jbLv.L = jbLv.R = 0; jb.setLevels(0, 0); return; }
  const dt = jbAt ? Math.min(200, now - jbAt) : 16; jbAt = now;
  const L = vu.L.dbfs, R = vu.R.dbfs, loud = Math.max(L, R);
  if (loud > -60) jbAvg += (loud - jbAvg) * (1 - Math.exp(-dt / 2500));
  const lv = d => d < -60 ? 0 : Math.max(0, Math.min(1, (d - (jbAvg - 10)) / 14));
  const fall = 1 - Math.exp(-dt / 160);
  for (const [k, d] of [['L', L], ['R', R]]) { const t = lv(d); jbLv[k] = t > jbLv[k] ? t : jbLv[k] + (t - jbLv[k]) * fall; }
  jb.setLevels(jbLv.L, jbLv.R);
}

jbPanel.classList.toggle('mod-off', !jbCfg.show);
if (jbCfg.show) jbBuild();
musicStatus().then(() => { if (!musicServer.signedIn) jbHome([musicServer.none ? 'JELLYFIN WORKS IN THE INSTALLED PROGRAM' : 'NO SERVER: PRESS SETUP TO CONNECT']); else jbHome(['ARTISTS, ALBUMS, SONGS OR SEARCH']); });
