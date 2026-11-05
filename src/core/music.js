'use strict';
// ═══════════════════════════════════════════════════════════
//  THE MUSIC SERVER (core, 7.10.0: no screen). The person's Jellyfin music, through the main process
//  (electron/jellyfin.js): the library's artists, albums and songs, a queue played here (one <audio>) at the
//  file's own quality, REPEAT and SHUFFLE, and Q: what goes next. The DM-90 (ui/jukebox/) drives it and hears back
//  through the hub (core/events.js):
//    'music'   something changed: signed in or out, what plays, the queue, a list that arrived
// ═══════════════════════════════════════════════════════════
const musicAudio = new Audio();
musicAudio.crossOrigin = 'anonymous';   // 7.10.14: so the equalizer (core/eq.js) may take its sound (main.js lets media answers allow it)
musicAudio.preload = 'auto';
let musicServer = { server: '', name: '', signedIn: false };
let musicQueue = [], musicPos = -1, musicNextAt = -1, musicNowInfo = null, musicError = '';
// 7.10.10: library, the one music library the lists show ('' = all of them, merged)
const musicModes = (() => { const m = store.read('deck90-music', {});
  return { repeat: ['all', 'one'].includes(m.repeat) ? m.repeat : 'off', shuffle: m.shuffle === true,
    library: /^[0-9a-f-]{1,64}$/i.test(m.library || '') ? m.library : '' }; })();
function musicModesSave() { store.write('deck90-music', musicModes); }
const musicNow = () => musicQueue[musicPos] || null;
const musicPlaying = () => !musicAudio.paused && !!musicAudio.getAttribute('src');
const musicPaused = () => musicAudio.paused && !!musicAudio.getAttribute('src') && musicPos >= 0;
const musicApi = () => window.jellyfin || null;

// ── the server ──
async function musicStatus() {
  if (!musicApi()) { musicServer = { server: '', name: '', signedIn: false, none: true }; deck.emit('music'); return musicServer; }
  musicServer = (await musicApi().status().catch(() => null)) || musicServer;
  deck.emit('music'); return musicServer;
}
async function musicSignIn(server, user, pw) {
  const r = await musicApi().signIn(server, user, pw).catch(e => ({ error: e.message }));
  if (r && r.ok) { musicLib = { artists: null, albums: {}, songs: null, tracks: {} }; musicIndex = null; musicLibs = null; await musicStatus(); }
  return r || { error: 'sin respuesta' };
}
async function musicSignOut() { musicStop(); await musicApi().signOut(); musicLib = { artists: null, albums: {}, songs: null, tracks: {} }; musicIndex = null; musicLibs = null; await musicStatus(); }

// ── the library (kept once read: a big library is read once per session) ──
let musicLib = { artists: null, albums: {}, songs: null, tracks: {} };
const ticks = t => Math.round((Number(t) || 0) / 1e7);
// names in order as a person reads them: no accents, case or a leading article in the way
const musicSortKey = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/^(the|los|las|el|la)\s+/i, '').toLowerCase();
const musicCmp = (a, b) => musicSortKey(a).localeCompare(musicSortKey(b));
// a long list sorted by a name, each key made once (15,000 songs in a moment)
const musicSortBy = (list, name) => list.map(x => [musicSortKey(name(x)), x]).sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0).map(p => p[1]);
// a song as the screens use it; its quality when the server said it (album lists ask for it)
function musicSong(i) {
  const src = i.MediaSources && i.MediaSources[0], a = src && (src.MediaStreams || []).find(s => s.Type === 'Audio');
  return { id: i.Id, name: i.Name || 'UNTITLED', artist: i.AlbumArtist || (i.Artists || [])[0] || '', artists: (i.Artists || []).join(', '),
    album: i.Album || '', albumId: i.AlbumId || '', n: i.IndexNumber || 0, disc: i.ParentIndexNumber || 0, len: ticks(i.RunTimeTicks),
    year: i.ProductionYear || 0, media: a ? { codec: String(a.Codec || '').toLowerCase(), container: String(src.Container || '').toLowerCase(),
      kbps: Math.round((a.BitRate || src.Bitrate || 0) / 1000), rate: a.SampleRate || 0, bits: a.BitDepth || 0, ch: a.Channels || 0 } : null };
}
async function musicRead(kind, id, query) {
  if (musicModes.library && (kind === 'artists' || kind === 'items')) query = Object.assign({}, query, { Library: musicModes.library });
  const r = await musicApi().read(kind, id, query).catch(e => ({ error: e.message }));
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
  musicLib = { artists: null, albums: {}, songs: null, tracks: musicLib.tracks }; musicIndex = null;   // an album's songs stay the same
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
    musicLib.tracks[albumId] = (r.Items || []).map(musicSong);
  }
  return musicLib.tracks[albumId];
}
// every song of an artist, album after album (Q on an artist)
async function musicArtistSongs(artistId) {
  const q = { IncludeItemTypes: 'Audio', Recursive: true, SortBy: 'ProductionYear,Album,ParentIndexNumber,IndexNumber', Fields: 'MediaSources', Limit: 5000, AlbumArtistIds: artistId };
  let r = await musicRead('items', '', q);
  if (!(r.Items || []).length) { delete q.AlbumArtistIds; q.ArtistIds = artistId; r = await musicRead('items', '', q); }
  return (r.Items || []).map(musicSong);
}
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
    return musicSortBy((r.Items || []).map(musicSong), s => s.name);
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
async function musicStart() {
  const s = musicNow(); if (!s) { deck.emit('music'); return; }
  musicTakeSound();
  musicNowInfo = s.media ? s : null;
  if (!s.media) {                                                  // its quality: the server's details of it
    musicRead('item', s.id).then(i => { const full = musicSong(i); s.media = full.media; if (!s.len) s.len = full.len; if (musicNow() === s) { musicNowInfo = s; deck.emit('music'); } }).catch(() => {});
  }
  musicTry = { s, flac: !musicPlayable(s.media) };
  const url = await musicApi().stream(s.id, !musicTry.flac);
  if (musicNow() !== s) return;
  musicAudio.src = url;
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
function musicStop() { musicAudio.pause(); musicAudio.removeAttribute('src'); musicAudio.load(); deck.emit('music'); }
function musicPauseHere() { if (musicPlaying()) musicAudio.pause(); }
musicAudio.addEventListener('ended', () => {
  const n = musicAfter(musicPos, false);
  if (n === null) { musicAudio.currentTime = 0; musicStop(); musicPos = musicModes.shuffle ? -1 : 0; deck.emit('music'); }
  else if (n === musicPos) { musicAudio.currentTime = 0; musicAudio.play().catch(() => {}); }
  else musicJump(n);
});
['play', 'pause', 'loadedmetadata', 'error'].forEach(ev => musicAudio.addEventListener(ev, () => deck.emit('music')));
// 7.10.13: a song that won't play as it is (ALAC, WMA… whose format the list didn't say) is asked again as FLAC; one
// that won't play at all is skipped, so a long SHUFFLE ALL goes on (five in a row stop it)
let musicTry = { s: null, flac: false }, musicFails = 0;
musicAudio.addEventListener('playing', () => { musicFails = 0; });
musicAudio.addEventListener('error', async () => {
  if (!musicAudio.getAttribute('src')) return;
  const s = musicNow(); if (!s) return;
  if (musicTry.s === s && !musicTry.flac) {
    musicTry.flac = true;
    const url = await musicApi().stream(s.id, false);
    if (musicNow() !== s) return;
    musicAudio.src = url; musicAudio.play().catch(() => {});
    return;
  }
  deck.notice('⚠ El servidor no mandó <span>' + s.name.replace(/[<>&]/g, '') + '</span>' + (musicFails < 4 ? ': sigo con el próximo' : ''), 2600);
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
