'use strict';
// ═══════════════════════════════════════════════════════════
//  DM-90 DIGITAL MUSIC SERVER (7.10.0): the rack's double unit for the person's Jellyfin music (VER → MÚSICA, or J).
//  The faceplate is ui/jukebox/dm90.js; the library, the queue and the player are core/music.js.
//    POWER     on and off (off: the music stops, the PC's player goes on)     SETUP   the server and the user
//    ARTISTAS · ÁLBUMES · TEMAS · COLA · BUSCAR   what the list shows        ◀ ATRÁS   the list before
//    SELECT (the knob, the wheel, ↑ ↓)  moves through the list   ENTER (or a double click)  opens it or plays from it
//    Q · A LA COLA (or Q)   what's marked plays next, after the song playing (an album or an artist: all of it)
//    ▶ ❚❚ ■ |◀◀ ▶▶  REPEAT (all, one, off) · SHUFFLE    letters: jump to the first name that starts so
//  With the pointer on it (or after a click on it) the keyboard is the unit's: ↑ ↓ PgUp PgDn Home End, Enter,
//  Backspace (back), Q, Space (play / pause), / (search: type, Enter), letters (jump). Esc gives it back.
// ═══════════════════════════════════════════════════════════
let jbCfg = { show: false, remain: true };
{ const c = store.section('jukebox'); if (c) jbCfg = { show: c.show === true, remain: c.remain !== false }; }
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
  jbTheme(); jb.setPower(jbPower); jb.setModes(musicModes); jb.setTimeMode(jbCfg.remain ? 'remain' : 'elapsed');
  jb.onKey(jbKey);
  jbShownKey = ''; jbSync(); jbRenderList();
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
  if (it.kind === 'artist') return { text: it.name, sub: jbView.kind === 'search' ? 'ARTISTA' : '', end: '' };
  if (it.kind === 'album') return { text: it.name, sub: jbView.kind === 'artist' ? '' : it.artist, end: [it.year || '', it.count ? it.count + ' TEMAS' : ''].filter(Boolean).join(' · ') };
  if (it.kind === 'more') return { text: it.name, sub: '', end: '', dim: true };
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
  const count = v.items.length, fmt = n => n.toLocaleString('es-AR');
  let header = v.title + (count && v.kind !== 'home' ? ' · ' + fmt(count) : ''), right = '';
  if (jbSearchText !== null) { header = 'BUSCAR: ' + jbSearchText + '_'; right = 'ENTER BUSCA · ESC SALE'; }
  else if (jbLoading) right = jbLoading;
  else if (jbJump.text && performance.now() - jbJump.at < 1500) right = '→ ' + jbJump.text;
  else right = musicQueue.length ? 'COLA ' + (musicPos >= 0 ? musicPos + 1 + '/' : '') + musicQueue.length : '';
  jb.setList({ header, right, rows: v.items.slice(v.top, v.top + rows).map((it, k) => jbRow(it, v.top + k)), cursor: v.cursor, top: v.top, count });
  jb.setView(jbSearchText !== null || v.kind === 'search' ? 'search' : { artists: 'artists', albums: 'albums', songs: 'songs', list: 'list' }[v.kind] || '');
}
function jbHome(text) { jbView = { kind: 'home', items: (text || []).map(name => ({ kind: 'more', name })), cursor: 0, top: 0, title: 'DM-90' }; jbStack = []; jbRenderList(); }
// load a list: what the server says goes on screen when it arrives (a slower answer for an older ask is dropped)
let jbAsk = 0;
async function jbLoad(view, load, push) {
  const t = ++jbAsk;
  jbLoading = 'LEYENDO…'; jbRenderList();
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
  jbSearchText = null;
  if (kind === 'artists') return jbLoad({ kind: 'artists', title: 'ARTISTAS' }, async () => (await musicArtists()).map(a => Object.assign({ kind: 'artist' }, a)));
  if (kind === 'albums') return jbLoad({ kind: 'albums', title: 'ÁLBUMES' }, async () => (await musicAlbums()).map(a => Object.assign({ kind: 'album' }, a)));
  if (kind === 'songs') return jbLoad({ kind: 'songs', title: 'TEMAS' }, async () => (await musicSongs()).map(s => Object.assign({ kind: 'song' }, s)));
  if (kind === 'list') { jbStack = []; jbView = { kind: 'list', title: 'COLA', items: musicQueue.map(s => Object.assign({ kind: 'song' }, s)), cursor: Math.max(0, musicPos), top: 0 }; return jbRenderList(); }
  if (kind === 'search') { jbSearchText = ''; jbRenderList(); }
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
  if (it.kind === 'artist') return jbLoad({ kind: 'artist', title: it.name + ' › ÁLBUMES', artistId: it.id }, async () => (await musicAlbums(it.id)).map(a => Object.assign({ kind: 'album' }, a)), true);
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
function jbMove(d) { if (!jbView.items.length) return; jbView.cursor = Math.max(0, Math.min(jbView.items.length - 1, jbView.cursor + d)); jbRenderList(); }
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
async function jbRunSearch() {
  const q = (jbSearchText || '').trim();
  jbSearchText = null;
  if (!q) return jbRenderList();
  await jbLoad({ kind: 'search', title: 'BUSCAR “' + q + '”' }, async () => (await musicSearch(q)), true);
}

// ── the keys ──
function jbKey(k, { hold, index, double, delta } = {}) {
  jbActive = true;
  if (k === 'power') return jbOn(!jbPower);
  if (k === 'setup') return jbSetup(true);
  if (!jbPower) { jbOn(true); return; }
  if (k === 'wheel') return jbMove(delta);
  if (k === 'row') { jbView.cursor = jbView.top + index; jbRenderList(); if (double) jbEnter(); return; }
  if (['artists', 'albums', 'songs', 'list', 'search'].includes(k)) return jbOpen(k);
  if (k === 'back') return jbBack();
  if (k === 'enter') return jbEnter();
  if (k === 'queue') return jbQueue();
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
jbPanel.addEventListener('pointerenter', () => { jbActive = true; });
jbPanel.addEventListener('pointerleave', () => { if (jbSearchText === null) jbActive = false; });
document.addEventListener('pointerdown', e => { if (!jbPanel.contains(e.target)) { jbActive = false; if (jbSearchText !== null) { jbSearchText = null; jbRenderList(); } } }, true);
document.addEventListener('keydown', e => {
  if (!jb || !jbActive || !jbShown() || !jbPower || e.ctrlKey || e.altKey || e.metaKey) return;
  if (e.target && e.target.closest && e.target.closest('input, textarea, select')) return;
  if (document.querySelector('#jbSetup.show, #phoneModal.show, #histModal.show')) return;
  const k = e.key, take = () => { e.preventDefault(); e.stopImmediatePropagation(); };
  if (jbSearchText !== null) {                                   // typing a search
    if (k === 'Enter') { take(); jbRunSearch(); }
    else if (k === 'Escape') { take(); jbSearchText = null; jbRenderList(); }
    else if (k === 'Backspace') { take(); jbSearchText = jbSearchText.slice(0, -1); jbRenderList(); }
    else if (k.length === 1 && jbSearchText.length < 60) { take(); jbSearchText += k; jbRenderList(); }
    return;
  }
  const move = { ArrowDown: 1, ArrowUp: -1, PageDown: jb.rows(), PageUp: -jb.rows(), Home: -1e9, End: 1e9 }[k];
  if (move) { take(); return jbMove(move); }
  if (k === 'Enter') { take(); return jbEnter(); }
  if (k === 'Backspace') { take(); return jbBack(); }
  if (k === 'Escape') { take(); jbActive = false; return; }
  if (k === ' ') { take(); if (!e.repeat) jbKey(musicPlaying() ? 'pause' : 'play'); return; }
  if (k === '/') { take(); return jbOpen('search'); }
  if (k.toLowerCase() === 'q') { take(); if (!e.repeat) jbQueue(); return; }
  if (/^[\p{L}\p{N}]$/u.test(k)) { take(); return jbLetter(k); }
}, true);

// ── SETUP: the Jellyfin server, the user and the password (the password goes to the server, never kept) ──
function jbSetup(on) {
  const m = document.getElementById('jbSetup');
  m.classList.toggle('show', on);
  if (!on) return;
  document.getElementById('jbServer').value = musicServer.server || 'http://localhost:8096';
  document.getElementById('jbUser').value = musicServer.name || '';
  document.getElementById('jbPass').value = '';
  document.getElementById('jbSetupMsg').textContent = musicServer.signedIn ? 'Conectado como ' + musicServer.name + ' en ' + musicServer.server : '';
  document.getElementById('jbSignOut').style.display = musicServer.signedIn ? '' : 'none';
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
document.getElementById('jbSignOut').addEventListener('click', async () => { await musicSignOut(); jbSetup(false); jbHome(['SIN SERVIDOR: SETUP PARA CONECTAR']); toast('MÚSICA · <span>desconectado</span>', 1600); });
document.getElementById('jbClose').addEventListener('click', () => jbSetup(false));
document.getElementById('jbSetup').addEventListener('click', e => { if (e.target.id === 'jbSetup') jbSetup(false); });
document.getElementById('jbSetup').addEventListener('keydown', e => {
  e.stopPropagation();
  if (e.key === 'Enter') { e.preventDefault(); jbSignInNow(); }
  if (e.key === 'Escape') { e.preventDefault(); jbSetup(false); }
});

// ── the display: what plays, from the player ──
function jbSync() {
  if (!jb) return;
  const s = musicNow(), on = jbPower;
  const r = {
    title: !on ? '' : s ? s.name : musicServer.signedIn ? 'ELEGÍ UN TEMA' : musicServer.none ? 'JELLYFIN EN EL PROGRAMA INSTALADO' : 'SIN SERVIDOR · SETUP',
    artist: !on ? '' : s ? [s.artists || s.artist, s.album + (s.year ? ' (' + s.year + ')' : '')].filter(Boolean).join(' · ') : musicServer.signedIn ? (musicServer.name + ' · ' + musicServer.server.replace(/^https?:\/\//, '')).toUpperCase() : '',
    quality: on && s ? musicQualityLong(s.media) || 'CALIDAD: LEYENDO…' : '',
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
musicStatus().then(() => { if (!musicServer.signedIn) jbHome([musicServer.none ? 'JELLYFIN SE USA DESDE EL PROGRAMA INSTALADO' : 'SIN SERVIDOR: SETUP PARA CONECTAR']); else jbHome(['ARTISTAS, ÁLBUMES, TEMAS O BUSCAR']); });
