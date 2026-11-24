'use strict';
// ═══════════════════════════════════════════════════════════
//  THE MUSIC SERVER (core, 7.10.0: no screen). The person's Jellyfin music, through the main process
//  (electron/jellyfin.js): the library's artists, albums and songs, a queue played here (one <audio>) at the
//  file's own quality, REPEAT and SHUFFLE, and Q: what goes next. The DM-90 (ui/jukebox/) drives it and hears back
//  through the hub (core/events.js):
//    'music'   something changed: signed in or out, what plays, the queue, a list that arrived, a source
//  7.10.24: three sources, SOURCE on the DM-90: SERVER (Jellyfin), PC (the person's folders) and USB (the pendrives
//  plugged in), the last two from electron/localmusic.js, which answers as Jellyfin does: the same lists and the same
//  player for the three. Each song knows its source (src), so a queue goes on playing when the source changes.
// ═══════════════════════════════════════════════════════════
// 7.10.36: two players: musicAudio is the one that sounds, musicSpare loads the next song ahead and takes over the
// moment this one ends (gapless: a live album or a mix flows on, no silence between songs); they swap each time
const musicAudios = [new Audio(), new Audio()];
for (const a of musicAudios) {
  a.crossOrigin = 'anonymous';   // 7.10.14: so the equalizer (core/eq.js) may take its sound (main.js lets media answers allow it)
  a.preload = 'auto';
}
let musicAudio = musicAudios[0], musicSpare = musicAudios[1], musicAhead = null;   // { s, pos }: what the spare holds
// a listener on both players that hears only the one sounding
const musicOn = (ev, fn) => musicAudios.forEach(a => a.addEventListener(ev, e => { if (a === musicAudio) fn(e); }));
let musicServer = { server: '', name: '', signedIn: false };
let musicLocal = null;                                             // 7.10.24: the PC's and USB's libraries (localmusic.js's status)
const MUSIC_SOURCES = ['server', 'pc', 'usb'];
let musicQueue = [], musicPos = -1, musicNextAt = -1, musicNowInfo = null, musicError = '';
// 7.10.10: library, the one music library the lists show ('' = all of them, merged)
// 7.10.24: source, the one the lists show; libraries, the library chosen in each (library is the source's)
const musicModes = (() => { const m = store.read('deck90-music', {}), lib = v => /^[0-9a-f-]{1,64}$/i.test(v || '') ? v : '';
  const source = MUSIC_SOURCES.includes(m.source) ? m.source : 'server', libraries = { server: lib(m.library), pc: '', usb: '' };
  if (m.libraries && typeof m.libraries === 'object') for (const k of ['pc', 'usb']) libraries[k] = lib(m.libraries[k]);
  return { repeat: ['all', 'one'].includes(m.repeat) ? m.repeat : 'off', shuffle: m.shuffle === true, source, libraries, library: libraries[source] }; })();
function musicModesSave() {
  musicModes.libraries[musicModes.source] = musicModes.library;
  store.write('deck90-music', { repeat: musicModes.repeat, shuffle: musicModes.shuffle, source: musicModes.source,
    library: musicModes.libraries.server, libraries: { pc: musicModes.libraries.pc, usb: musicModes.libraries.usb } });
}
const musicNow = () => musicQueue[musicPos] || null;
const musicPlaying = () => !musicAudio.paused && !!musicAudio.getAttribute('src');
const musicPaused = () => musicAudio.paused && !!musicAudio.getAttribute('src') && musicPos >= 0;
// the source's way in: Jellyfin's, or the PC's and USB's (the same calls)
function musicApiOf(src) {
  if (src !== 'pc' && src !== 'usb') return window.jellyfin || null;
  const L = window.localMusic; if (!L) return null;
  return { read: (kind, id, query) => L.read(src, kind, id, query), stream: id => L.stream(src, id), cover: (id, albumId) => L.cover(src, id, albumId) };
}
const musicApi = () => musicApiOf(musicModes.source);
const musicIsLocal = (src = musicModes.source) => src === 'pc' || src === 'usb';
// a source with music to show: signed in to the server, or a library with songs in it
function musicSourceReady(src = musicModes.source) {
  if (!musicIsLocal(src)) return !!musicServer.signedIn;
  return !!(musicLocal && musicLocal[src] && musicLocal[src].songs > 0);
}
const musicSourceName = (src = musicModes.source) => ({ server: 'SERVER', pc: 'PC', usb: 'USB' })[src];

// ── the server ──
async function musicStatus() {
  if (window.localMusic && !musicLocal) musicLocal = await window.localMusic.status().catch(() => null);
  if (!window.jellyfin) { musicServer = { server: '', name: '', signedIn: false, none: true }; deck.emit('music'); return musicServer; }
  musicServer = (await window.jellyfin.status().catch(() => null)) || musicServer;
  deck.emit('music'); return musicServer;
}
async function musicSignIn(server, user, pw) {
  // 7.10.37: always Jellyfin's, whatever SOURCE is on (on PC or USB it went to the PC's library, which has no
  // sign-in, and SETUP stayed on "Conectando…")
  if (!window.jellyfin) return { error: 'sin servidor' };
  const r = await Promise.resolve().then(() => window.jellyfin.signIn(server, user, pw)).catch(e => ({ error: e.message }));
  if (r && r.ok) { musicForget('server'); await musicStatus(); }
  return r || { error: 'sin respuesta' };
}
async function musicSignOut() { if (musicNow() && !musicIsLocal(musicNow().src)) musicStop(); await window.jellyfin.signOut(); musicForget('server'); await musicStatus(); }

// ── the library (kept once read: a big library is read once per session) ──
let musicLib = { artists: null, albums: {}, songs: null, tracks: {} };
const musicLibNew = () => ({ artists: null, albums: {}, songs: null, tracks: {} });
// 7.10.24: what each source's lists were (the one shown lives in musicLib, musicIndex and musicLibs)
const musicKept = {};
function musicForget(src) {
  if (src === musicModes.source) { musicLib = musicLibNew(); musicIndex = null; musicLibs = null; }
  else delete musicKept[src];
}
function musicSourceSet(src) {
  if (!MUSIC_SOURCES.includes(src) || src === musicModes.source) return;
  musicKept[musicModes.source] = { lib: musicLib, index: musicIndex, libs: musicLibs };
  const k = musicKept[src] || { lib: musicLibNew(), index: null, libs: null };
  musicLib = k.lib; musicIndex = k.index; musicLibs = k.libs;
  musicModes.libraries[musicModes.source] = musicModes.library;
  musicModes.source = src; musicModes.library = musicModes.libraries[src] || '';
  musicModesSave(); deck.emit('music');
}
const ticks = t => Math.round((Number(t) || 0) / 1e7);
// names in order as a person reads them: no accents, case or a leading article in the way
const musicSortKey = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/^(the|los|las|el|la)\s+/i, '').toLowerCase();
const musicCmp = (a, b) => musicSortKey(a).localeCompare(musicSortKey(b));
// a long list sorted by a name, each key made once (15,000 songs in a moment)
const musicSortBy = (list, name) => list.map(x => [musicSortKey(name(x)), x]).sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0).map(p => p[1]);
// a song as the screens use it; its quality when the server said it (album lists ask for it)
function musicSong(i, from = musicModes.source) {
  const src = i.MediaSources && i.MediaSources[0], a = src && (src.MediaStreams || []).find(s => s.Type === 'Audio');
  return { src: from, id: i.Id, name: i.Name || 'UNTITLED', artist: i.AlbumArtist || (i.Artists || [])[0] || '', artists: (i.Artists || []).join(', '),
    album: i.Album || '', albumId: i.AlbumId || '', n: i.IndexNumber || 0, disc: i.ParentIndexNumber || 0, len: ticks(i.RunTimeTicks),
    year: i.ProductionYear || 0, media: a ? { codec: String(a.Codec || '').toLowerCase(), container: String(src.Container || '').toLowerCase(),
      kbps: Math.round((a.BitRate || src.Bitrate || 0) / 1000), rate: a.SampleRate || 0, bits: a.BitDepth || 0, ch: a.Channels || 0 } : null };
}
async function musicRead(kind, id, query, from = musicModes.source) {
  if (from === musicModes.source && musicModes.library && (kind === 'artists' || kind === 'items' || kind === 'folder')) query = Object.assign({}, query, { Library: musicModes.library });
  const api = musicApiOf(from); if (!api) throw new Error('no source');
  const r = await api.read(kind, id, query).catch(e => ({ error: e.message }));
  if (r && r.error) { musicError = r.error; if (r.error === 'signed out') await musicStatus(); throw new Error(r.error); }
  return r;
}
// 7.10.10: the server's music libraries ({ id, name }), and the choice of one (or all, '')
let musicLibs = null;
async function musicLibraries() {
  if (!musicLibs) { const r = await musicRead('libraries'); musicLibs = (r.Items || []).map(l => ({ id: String(l.id), name: String(l.name || '?') })); }
  if (musicModes.library && !musicLibs.some(l => l.id === musicModes.library)) { musicModes.library = ''; musicModesSave(); }   // gone from the server
  return musicLibs;
}
const musicLibraryName = () => { const l = musicModes.library && musicLibs && musicLibs.find(x => x.id === musicModes.library); return l ? l.name : ''; };
function musicLibrarySet(id) {
  musicModes.library = id || ''; musicModesSave();
  musicLib = Object.assign(musicLibNew(), { tracks: musicLib.tracks }); musicIndex = null;   // an album's songs stay the same
  deck.emit('music');
}
// 7.10.13: one read at a time for each list (SEARCH and SHUFFLE ALL together read 15,000 songs once), kept in the
// library it was asked for: a library chosen meanwhile starts its own (musicLib is a new object then)
function musicOnce(lib, key, read) {
  if (lib[key]) return Promise.resolve(lib[key]);
  lib._reading = lib._reading || {};
  return lib._reading[key] || (lib._reading[key] = read().then(v => { lib[key] = v; return v; }).finally(() => { delete lib._reading[key]; }));
}
function musicArtists() {
  return musicOnce(musicLib, 'artists', async () => {
    const r = await musicRead('artists', '', { Limit: 50000 });
    return musicSortBy((r.Items || []).map(i => ({ id: i.Id, name: i.Name || '?' })), a => a.name);   // 7.10.4: libraries merged
  });
}
async function musicAlbums(artistId) {
  const key = artistId || '*', lib = musicLib;
  if (!lib.albums[key]) {
    const q = { IncludeItemTypes: 'MusicAlbum', Recursive: true, Limit: 50000, Fields: 'ProductionYear,ChildCount',
      SortBy: artistId ? 'ProductionYear,SortName' : 'AlbumArtist,ProductionYear,SortName' };
    if (artistId) q.AlbumArtistIds = artistId;
    let r = await musicRead('items', '', q);
    if (artistId && !(r.Items || []).length) { delete q.AlbumArtistIds; q.ArtistIds = artistId; r = await musicRead('items', '', q); }   // older servers
    lib.albums[key] = (r.Items || []).map(i => ({ id: i.Id, name: i.Name || '?', artist: i.AlbumArtist || '', year: i.ProductionYear || 0, count: i.ChildCount || 0 }))
      .sort((a, b) => (artistId ? 0 : musicCmp(a.artist, b.artist)) || (a.year - b.year) || musicCmp(a.name, b.name));
  }
  return lib.albums[key];
}
async function musicTracks(albumId) {
  if (!musicLib.tracks[albumId]) {
    const r = await musicRead('items', '', { ParentId: albumId, IncludeItemTypes: 'Audio', Recursive: true, SortBy: 'ParentIndexNumber,IndexNumber,SortName', Fields: 'MediaSources', Limit: 2000 });
    musicLib.tracks[albumId] = (r.Items || []).map(i => musicSong(i));
  }
  return musicLib.tracks[albumId];
}
// every song of an artist, album after album (Q on an artist)
async function musicArtistSongs(artistId) {
  const q = { IncludeItemTypes: 'Audio', Recursive: true, SortBy: 'ProductionYear,Album,ParentIndexNumber,IndexNumber', Fields: 'MediaSources', Limit: 5000, AlbumArtistIds: artistId };
  let r = await musicRead('items', '', q);
  if (!(r.Items || []).length) { delete q.AlbumArtistIds; q.ArtistIds = artistId; r = await musicRead('items', '', q); }
  return (r.Items || []).map(i => musicSong(i));
}
// 7.10.28: FOLDERS (the PC and USB): a folder's folders and songs as they are on the disk ('' = the library's own
// folders); and every song under a folder (Q on it)
async function musicFolder(id) {
  const r = await musicRead('folder', id || '');
  return { name: r.Name || '', items: (r.Items || []).map(i => i.Type === 'Folder' ? { kind: 'folder', id: i.Id, name: i.Name || '?', count: i.ChildCount || 0 }
    : Object.assign({ kind: 'song' }, musicSong(i))) };
}
async function musicFolderSongs(id) { return ((await musicRead('folder', id, { Recursive: true })).Items || []).map(i => musicSong(i)); }
// 7.10.4: SHUFFLE ALL: every song of the library, in a random order
async function musicShuffleAll() {
  const all = await musicSongs();
  if (!all.length) return 0;
  musicModes.shuffle = true; musicModesSave();
  await musicPlay(all, Math.floor(Math.random() * all.length));
  return all.length;
}
function musicSongs() {
  return musicOnce(musicLib, 'songs', async () => {
    const r = await musicRead('items', '', { IncludeItemTypes: 'Audio', Recursive: true, SortBy: 'SortName', Limit: 100000 });
    return musicSortBy((r.Items || []).map(i => musicSong(i)), s => s.name);
  });
}
// 7.10.2: the search runs here, over the whole library read once (artists, albums, every song): instant while
// typing, any word in any order, in the name, the artist or the album, with or without accents ("sting fields"
// finds Fields of Gold). Names that start with what was typed come first.
const musicKey = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
let musicIndex = null;
async function musicSearchReady() {
  if (!musicIndex) {
    const lib = musicLib;
    const [ar, al, so] = await Promise.all([musicArtists(), musicAlbums(), musicSongs()]);
    const k = (it, ...f) => Object.assign(it, { _k: musicKey(f.join(' ')), _n: musicKey(it.name) });
    const index = { artists: ar.map(a => k(Object.assign({ kind: 'artist' }, a), a.name)),
      albums: al.map(a => k(Object.assign({ kind: 'album' }, a), a.name, a.artist, a.year || '')),
      songs: so.map(x => k(Object.assign({ kind: 'song' }, x), x.name, x.artist, x.artists, x.album)) };
    if (lib !== musicLib) return index;                            // another library was chosen meanwhile: not kept
    musicIndex = index;
  }
  return musicIndex;
}
function musicSearchNow(q) {
  const words = musicKey(q).split(/\s+/).filter(Boolean);
  if (!words.length || !musicIndex) return { artists: [], albums: [], songs: [] };
  const first = musicKey(q).trim();
  const find = (list, max) => {
    const hit = list.filter(it => words.every(w => it._k.includes(w)));
    hit.sort((a, b) => (b._n.startsWith(first) - a._n.startsWith(first)) || 0);
    return hit.slice(0, max);
  };
  return { artists: find(musicIndex.artists, 60), albums: find(musicIndex.albums, 200), songs: find(musicIndex.songs, 800) };
}
async function musicSearch(q) { await musicSearchReady(); const r = musicSearchNow(q); return [...r.artists, ...r.albums, ...r.songs]; }

// ── the quality: short for the lists ("FLAC 24/96", "MP3 320") and spelled out for the song playing ──
const MUSIC_CODEC = { pcm: 'WAV', vorbis: 'OGG', wmav2: 'WMA', wmapro: 'WMA', mp3: 'MP3', aac: 'AAC', flac: 'FLAC', alac: 'ALAC', opus: 'OPUS', ape: 'APE' };
const musicCodec = m => !m ? '' : MUSIC_CODEC[m.codec] || (/^pcm/.test(m.codec) ? 'WAV' : /^dsd/.test(m.codec) ? 'DSD' : (m.codec || m.container).toUpperCase());
const musicLossless = m => !!m && (/^(flac|alac|ape|wavpack|tta)$/.test(m.codec) || /^(pcm|dsd)/.test(m.codec));
function musicQualityShort(m) {
  if (!m) return '';
  const c = musicCodec(m);
  if (musicLossless(m) && m.bits && m.rate) return c + ' ' + m.bits + '/' + Math.floor(m.rate / 1000);
  return m.kbps ? c + ' ' + m.kbps : c;
}
function musicQualityLong(m) {
  if (!m) return '';
  const khz = m.rate ? String(Math.round(m.rate / 100) / 10) + ' KHZ' : '';
  return [musicCodec(m) + (musicLossless(m) ? ' LOSSLESS' : ''), m.bits && khz ? m.bits + ' BIT / ' + khz : khz,
    m.kbps ? m.kbps + ' KBPS' : '', m.ch === 1 ? 'MONO' : m.ch === 2 ? 'STEREO' : m.ch > 2 ? m.ch + ' CHANNELS' : ''].filter(Boolean).join(' · ');
}
// what Chromium plays as it is; anything else the server turns into FLAC on the way
const musicPlayable = m => !m || /^(mp3|aac|flac|opus|vorbis)$/.test(m.codec) || /^pcm_(s16le|s24le|s32le|f32le|u8)$/.test(m.codec);

// ── the queue and the player ──
function musicOrder() { return musicModes.shuffle ? musicShuf : musicQueue.map((_, i) => i); }
let musicShuf = [];
function musicShuffleDeal() {
  const rest = musicQueue.map((_, i) => i).filter(i => i !== musicPos);
  for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
  musicShuf = musicPos >= 0 ? [musicPos, ...rest] : rest;
}
// play `list` (songs) from its i-th: the queue becomes the list
function musicPlay(list, i) {
  musicQueue = list.slice(0, 100000); musicPos = Math.max(0, Math.min(i | 0, musicQueue.length - 1)); musicNextAt = -1;
  if (musicModes.shuffle) musicShuffleDeal();
  return musicStart();
}
// Q: songs to play next, after the current one (and after the ones Q put there before, in the order given)
function musicQueueNext(songs) {
  songs = songs.filter(s => s && s.id);
  if (!songs.length) return 0;
  if (musicPos < 0 && !musicQueue.length) { musicQueue = songs.slice(); musicPos = -1; musicNextAt = -1; deck.emit('music'); return songs.length; }
  if (musicPos < 0) {                                              // 7.10.13: a queue that ended: these first, the rest kept
    musicQueue.unshift(...songs); musicNextAt = songs.length;
    if (musicModes.shuffle) musicShuf = [...songs.map((_, k) => k), ...musicShuf.map(k => k + songs.length)];
    deck.emit('music'); return songs.length;
  }
  const at = musicNextAt > musicPos ? musicNextAt : musicPos + 1;
  musicQueue.splice(at, 0, ...songs);
  if (musicModes.shuffle) {                                      // shuffled: they still come next
    musicShuf = musicShuf.map(k => k >= at ? k + songs.length : k);
    const here = musicShuf.indexOf(musicPos), after = musicNextAt > musicPos ? musicShuf.indexOf(musicNextAt - 1) + 1 : here + 1;
    musicShuf.splice(Math.max(after, here + 1), 0, ...songs.map((_, k) => at + k));
  }
  musicNextAt = at + songs.length;
  deck.emit('music');
  return songs.length;
}
// 7.10.28: the queue edited from its list: a song out of it (not the one playing), or moved to play next
function musicQueueRemove(i) {
  if (!(i >= 0 && i < musicQueue.length) || i === musicPos) return false;
  musicQueue.splice(i, 1);
  if (i < musicPos) musicPos--;
  if (musicNextAt > i) musicNextAt--;
  if (musicNextAt <= musicPos + 1) musicNextAt = -1;
  musicShuf = musicShuf.filter(k => k !== i).map(k => k > i ? k - 1 : k);
  deck.emit('music');
  return true;
}
function musicQueueMoveNext(i) {
  const s = musicQueue[i];
  if (!s || i === musicPos) return false;
  musicQueueRemove(i);
  musicQueueNext([s]);
  return true;
}
async function musicStart() {
  const s = musicNow(); if (!s) { deck.emit('music'); return; }
  musicTakeSound();
  musicAheadDrop();
  musicNowInfo = s.media ? s : null;
  if (!s.media) {                                                  // its quality: the server's details of it
    musicRead('item', s.id, null, s.src).then(i => { const full = musicSong(i, s.src); s.media = full.media; if (!s.len) s.len = full.len; if (musicNow() === s) { musicNowInfo = s; deck.emit('music'); } }).catch(() => {});
  }
  musicTry = { s, flac: !musicIsLocal(s.src) && !musicPlayable(s.media) };
  const api = musicApiOf(s.src), url = api ? await api.stream(s.id, !musicTry.flac).catch(() => '') : '';
  if (musicNow() !== s) return;
  if (!url) { musicError = 'sin fuente'; deck.notice('⚠ <span>' + s.name.replace(/[<>&]/g, '') + '</span> ya no está ' + (s.src === 'usb' ? 'en el pendrive' : s.src === 'pc' ? 'en la PC' : 'en el servidor'), 2600); deck.emit('music'); return; }
  musicAudio.src = url;
  if (musicResumeAt > 0) { const at = musicResumeAt; musicResumeAt = 0; musicAudio.addEventListener('loadedmetadata', () => { if (musicNow() === s && at < (musicAudio.duration || 0) - 2) musicAudio.currentTime = at; }, { once: true }); }
  musicAudio.play().catch(e => { if (musicNow() === s && e.name !== 'AbortError') { musicError = 'no pude tocar ' + s.name; deck.notice('⚠ No pude tocar <span>' + s.name.replace(/[<>&]/g, '') + '</span>', 2600); } });
  deck.emit('music');
}
function musicJump(i) { if (i >= 0 && i < musicQueue.length) { if (!(i < musicNextAt && i > musicPos)) musicNextAt = -1; musicPos = i; musicStart(); } }   // 7.10.13: into the Q'd ones, the rest of them still come first
// what comes after the queue position `from`; byUser: ▶▶ (REPEAT one moves on anyway); null: the end
function musicAfter(from, byUser) {
  if (musicModes.repeat === 'one' && !byUser) return from;
  const o = musicOrder(), k = o.indexOf(from);
  if (k + 1 < o.length) return o[k + 1];
  if (musicModes.repeat === 'off') return null;
  if (musicModes.shuffle) { musicPos = -1; musicShuffleDeal(); return musicShuf[0]; }
  return o[0];
}
function musicNext() { const n = musicAfter(musicPos, true); if (n !== null) musicJump(n); }
function musicPrev() {
  if (musicAudio.currentTime > 3 || musicPos < 0) { musicAudio.currentTime = 0; return; }
  const o = musicOrder(), k = o.indexOf(musicPos);
  musicJump(k > 0 ? o[k - 1] : musicModes.repeat === 'all' ? o[o.length - 1] : musicPos);
}
function musicToggle() {
  if (musicPlaying()) musicAudio.pause();
  else if (musicAudio.getAttribute('src')) { musicTakeSound(); musicAudio.play().catch(() => {}); }
  else if (musicQueue.length) { if (musicPos < 0) musicPos = musicNextAt > 0 ? (musicModes.shuffle ? musicShuf[0] : 0) : musicModes.shuffle ? (musicShuffleDeal(), musicShuf[0]) : 0; musicStart(); }
}
function musicStop() { musicAheadDrop(); musicAudio.pause(); musicAudio.removeAttribute('src'); musicAudio.load(); deck.emit('music'); }
function musicPauseHere() { if (musicPlaying()) musicAudio.pause(); }
musicOn('ended', () => {
  const n = musicAfter(musicPos, false);
  if (n === null) { musicAudio.currentTime = 0; musicStop(); musicPos = musicModes.shuffle ? -1 : 0; deck.emit('music'); }
  else if (n === musicPos) { musicAudio.currentTime = 0; musicAudio.play().catch(() => {}); }
  else musicJump(n);
});
['play', 'pause', 'loadedmetadata', 'error'].forEach(ev => musicOn(ev, () => deck.emit('music')));
// 7.10.13: a song that won't play as it is (ALAC, WMA… whose format the list didn't say) is asked again as FLAC; one
// that won't play at all is skipped, so a long SHUFFLE ALL goes on (five in a row stop it)
let musicTry = { s: null, flac: false }, musicFails = 0;
musicOn('playing', () => { musicFails = 0; musicAheadLoad(); });
musicOn('error', async () => {
  if (!musicAudio.getAttribute('src')) return;
  const s = musicNow(); if (!s) return;
  if (musicTry.s === s && !musicTry.flac && !musicIsLocal(s.src)) {
    musicTry.flac = true;
    const url = await musicApiOf(s.src).stream(s.id, false);
    if (musicNow() !== s) return;
    musicAudio.src = url; musicAudio.play().catch(() => {});
    return;
  }
  deck.notice('⚠ ' + (musicIsLocal(s.src) ? 'No pude tocar' : 'El servidor no mandó') + ' <span>' + s.name.replace(/[<>&]/g, '') + '</span>' + (musicFails < 4 ? ': sigo con el próximo' : ''), 2600);
  const n = musicAfter(musicPos, true);
  if (++musicFails < 5 && n !== null && n !== musicPos) setTimeout(() => { if (musicNow() === s) musicJump(n); }, 1200);
});

// the music takes the sound (as the CD and the radio do): the radio and the CD go quiet, the PC's player waits;
// screens may add to this (ui/jukebox/jukebox.js)
let musicResumePc = false;
function musicTakeSound() {
  if (radioActive()) radioStop(true);                              // 7.10.13: one being tuned or reconnecting too
  if (cdPlaying()) cdPauseHere();
  if (npPcPlaying() && window.nowPlaying && !musicResumePc) { window.nowPlaying.cmd('pause'); musicResumePc = true; }
}

// ── 7.10.24: the PC's and USB's libraries change (read again, a folder added, a pendrive in or out) ──
let musicLocalHeard = [];
if (window.localMusic) window.localMusic.on(st => {
  musicLocal = st;
  if (st.changed) {
    musicForget(st.kind);
    // a pendrive taken out while its song plays: the music stops there
    const s = musicNow();
    if (st.kind === 'usb' && st.plug === 'out' && !st.usb.roots.length && musicQueue.some(x => x.src === 'usb')) {
      const was = s && s.src === 'usb' && (musicPlaying() || musicPaused());
      if (s && s.src === 'usb') { musicStop(); musicPos = -1; }
      musicQueue = musicQueue.filter(x => x.src !== 'usb'); musicNextAt = -1;           // its songs leave the queue with it
      if (musicPos >= 0) musicPos = Math.max(0, musicQueue.indexOf(s));
      if (musicModes.shuffle) musicShuffleDeal();
      if (was) deck.notice('USB · <span>el pendrive se sacó</span>: la música paró', 2400);
    }
  }
  for (const f of musicLocalHeard) f(st);
  deck.emit('music');
});

// ── 7.10.24: the queue kept: closed and opened again, it's there, paused at the same song and second (PLAY goes on) ──
let musicResumeAt = 0, musicKeepT = 0, musicKeptKey = '';
const MUSIC_KEEP = 3000;
function musicKeep() {
  if (musicKeepT) return;                                          // one write waiting is enough (timeupdate comes four times a second)
  musicKeepT = setTimeout(() => {
    musicKeepT = 0;
    const from = Math.max(0, musicPos - 200), q = musicQueue.slice(from, from + MUSIC_KEEP);   // a huge SHUFFLE ALL: the part around the song
    const key = q.length + '|' + (musicPos - from) + '|' + (q[0] && q[0].id) + '|' + (q[q.length - 1] && q[q.length - 1].id) + '|' + Math.floor(musicAudio.currentTime / 5);
    if (key === musicKeptKey) return; musicKeptKey = key;
    store.write('deck90-music-queue', { pos: musicPos < 0 ? -1 : musicPos - from, t: Math.floor(musicAudio.currentTime || 0),
      songs: q.map(x => ({ src: x.src, id: x.id, name: x.name, artist: x.artist, artists: x.artists, album: x.album, albumId: x.albumId, n: x.n, disc: x.disc, len: x.len, year: x.year, media: x.media })) });
  }, 800);
}
{ const k = store.read('deck90-music-queue', null);
  if (k && Array.isArray(k.songs) && k.songs.length) {
    musicQueue = k.songs.filter(x => x && typeof x.id === 'string' && typeof x.name === 'string').map(x => Object.assign({ src: MUSIC_SOURCES.includes(x.src) ? x.src : 'server' }, x));
    musicPos = Number.isInteger(k.pos) && k.pos < musicQueue.length ? k.pos : -1;
    musicResumeAt = musicPos >= 0 && k.t > 0 ? k.t : 0;
    if (musicModes.shuffle) musicShuffleDeal();
  } }
deck.on('music', musicKeep);
musicOn('timeupdate', () => { if (!musicAudio.paused) { musicKeep(); musicNearEnd(); } });

// ── 7.10.36: gapless. Once a song plays, the one after it (as REPEAT and SHUFFLE say) loads in the spare player; in
// the song's last moments a fine watch starts the spare exactly as this one runs out, and the two swap. If the
// spare isn't ready (a slow server), 'ended' starts the next one as before ──
const MUSIC_LEAD = .045;                                           // s before the end: what play() takes to sound
let musicTail = null;                                              // the player finishing the last song's last moment
async function musicAheadLoad() {
  if (musicSpare === musicTail) return;                            // it loads the next one once it's done (musicGapless)
  const n = musicAfter(musicPos, false);
  if (n === null || n === musicPos) return musicAheadDrop();       // the end, or REPEAT one (the same song again)
  const s = musicQueue[n];
  if (musicAhead && musicAhead.s === s && musicAhead.pos === n) return;
  musicAheadDrop();
  const api = musicApiOf(s.src), ahead = { s, pos: n };
  musicAhead = ahead;
  const url = api ? await api.stream(s.id, musicIsLocal(s.src) || musicPlayable(s.media)).catch(() => '') : '';
  if (musicAhead !== ahead || !url) { if (musicAhead === ahead) musicAhead = null; return; }
  musicSpare.src = url; musicSpare.load();
}
function musicAheadDrop() {
  musicAhead = null; clearInterval(musicNearT); musicNearT = 0;
  if (musicSpare !== musicTail && musicSpare.getAttribute('src')) { musicSpare.pause(); musicSpare.removeAttribute('src'); musicSpare.load(); }
}
let musicNearT = 0;
function musicNearEnd() {
  const left = (musicAudio.duration || 0) - musicAudio.currentTime;
  if (musicNearT || !musicAhead || !isFinite(left) || left > 1.5) return;
  musicNearT = setInterval(() => {
    const l = (musicAudio.duration || 0) - musicAudio.currentTime;
    if (musicAudio.paused || !musicAhead) { clearInterval(musicNearT); musicNearT = 0; return; }
    if (l <= MUSIC_LEAD) { clearInterval(musicNearT); musicNearT = 0; musicGapless(); }
  }, 5);
}
function musicGapless() {
  const a = musicAhead;
  if (!a || musicQueue[a.pos] !== a.s || musicAfter(musicPos, false) !== a.pos || musicSpare.readyState < 3) return false;
  const old = musicAudio;
  musicAudio = musicSpare; musicSpare = old; musicAhead = null;
  musicAudio.volume = old.volume; musicAudio.muted = old.muted;
  musicPos = a.pos; musicTry = { s: a.s, flac: false }; musicNowInfo = a.s.media ? a.s : null;
  musicTail = old;
  musicAudio.play().catch(() => {});
  if (!a.s.media) musicRead('item', a.s.id, null, a.s.src).then(i => { const full = musicSong(i, a.s.src); a.s.media = full.media; if (!a.s.len) a.s.len = full.len; if (musicNow() === a.s) { musicNowInfo = a.s; deck.emit('music'); } }).catch(() => {});
  setTimeout(() => {                                               // its last moment, then quiet, and ready for the next one
    if (musicTail === old) musicTail = null;
    if (old !== musicAudio) { old.pause(); old.removeAttribute('src'); old.load(); }
    if (musicPlaying()) musicAheadLoad();
  }, 400);
  deck.emit('music');
  return true;
}
// REPEAT, SHUFFLE or the queue changed: what comes next may be another song
deck.on('music', () => { if (musicAhead && (musicQueue[musicAhead.pos] !== musicAhead.s || musicAfter(musicPos, false) !== musicAhead.pos)) { musicAheadDrop(); if (musicPlaying()) musicAheadLoad(); } });

// ── 7.10.36: the DM-90's own output (SETUP → SALIDA DE LA MÚSICA): headphones or the speakers, only for its music;
// '' is Windows' own. Kept with the device's name, so it's found again if its id changes ──
let musicSink = (() => { const k = store.read('deck90-music-sink', null); return k && typeof k.id === 'string' ? { id: k.id, label: String(k.label || '') } : { id: '', label: '' }; })();
async function musicOutputs() {
  try { return (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'audiooutput' && d.deviceId !== 'default' && d.deviceId !== 'communications').map(d => ({ id: d.deviceId, label: d.label || 'Salida ' + d.deviceId.slice(0, 6) })); }
  catch (_) { return []; }
}
async function musicSinkApply() {
  let id = musicSink.id;
  if (id) {                                                        // the device still there (or found by its name)
    const outs = await musicOutputs(), same = outs.find(o => o.id === id) || outs.find(o => musicSink.label && o.label === musicSink.label);
    id = same ? same.id : '';
  }
  for (const a of musicAudios) if (a.setSinkId) await a.setSinkId(id).catch(() => {});
  const g = typeof eqGraphs !== 'undefined' && eqGraphs.music;     // the equalizer's chain plays it, when it's joined
  if (g && g.ctx.setSinkId) await g.ctx.setSinkId(id).catch(() => {});
  return id;
}
async function musicSinkSet(id, label) {
  musicSink = { id: String(id || ''), label: String(label || '') };
  store.write('deck90-music-sink', musicSink);
  const used = await musicSinkApply();
  deck.emit('music');
  return used;
}
if (musicSink.id) setTimeout(musicSinkApply, 0);
