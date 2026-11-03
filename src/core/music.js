'use strict';
// ═══════════════════════════════════════════════════════════
//  THE MUSIC SERVER (core, 7.10.0: no screen). The person's Jellyfin music, through the main process
//  (electron/jellyfin.js): the library's artists, albums and songs, a queue played here (one <audio>) at the
//  file's own quality, REPEAT and SHUFFLE, and Q: what goes next. The DM-90 (ui/jukebox/) drives it and hears back
//  through the hub (core/events.js):
//    'music'   something changed: signed in or out, what plays, the queue, a list that arrived
// ═══════════════════════════════════════════════════════════
const musicAudio = new Audio();
musicAudio.preload = 'auto';
let musicServer = { server: '', name: '', signedIn: false };
let musicQueue = [], musicPos = -1, musicNextAt = -1, musicNowInfo = null, musicError = '';
const musicModes = (() => { const m = store.read('deck90-music', {});
  return { repeat: ['all', 'one'].includes(m.repeat) ? m.repeat : 'off', shuffle: m.shuffle === true }; })();
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
  if (r && r.ok) { musicLib = { artists: null, albums: {}, songs: null, tracks: {} }; musicIndex = null; await musicStatus(); }
  return r || { error: 'sin respuesta' };
}
async function musicSignOut() { musicStop(); await musicApi().signOut(); musicLib = { artists: null, albums: {}, songs: null, tracks: {} }; musicIndex = null; await musicStatus(); }

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
  const r = await musicApi().read(kind, id, query).catch(e => ({ error: e.message }));
  if (r && r.error) { musicError = r.error; if (r.error === 'signed out') await musicStatus(); throw new Error(r.error); }
  return r;
}
async function musicArtists() {
  if (!musicLib.artists) {
    const r = await musicRead('artists', '', { Limit: 50000 });
    musicLib.artists = musicSortBy((r.Items || []).map(i => ({ id: i.Id, name: i.Name || '?' })), a => a.name);   // 7.10.4: libraries merged
  }
  return musicLib.artists;
}
async function musicAlbums(artistId) {
  const key = artistId || '*';
  if (!musicLib.albums[key]) {
    const q = { IncludeItemTypes: 'MusicAlbum', Recursive: true, Limit: 50000, Fields: 'ProductionYear,ChildCount',
      SortBy: artistId ? 'ProductionYear,SortName' : 'AlbumArtist,ProductionYear,SortName' };
    if (artistId) q.AlbumArtistIds = artistId;
    let r = await musicRead('items', '', q);
    if (artistId && !(r.Items || []).length) { delete q.AlbumArtistIds; q.ArtistIds = artistId; r = await musicRead('items', '', q); }   // older servers
    musicLib.albums[key] = (r.Items || []).map(i => ({ id: i.Id, name: i.Name || '?', artist: i.AlbumArtist || '', year: i.ProductionYear || 0, count: i.ChildCount || 0 }))
      .sort((a, b) => (artistId ? 0 : musicCmp(a.artist, b.artist)) || (a.year - b.year) || musicCmp(a.name, b.name));
  }
  return musicLib.albums[key];
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
async function musicSongs() {
  if (!musicLib.songs) {
    const r = await musicRead('items', '', { IncludeItemTypes: 'Audio', Recursive: true, SortBy: 'SortName', Limit: 100000 });
    musicLib.songs = musicSortBy((r.Items || []).map(musicSong), s => s.name);
  }
  return musicLib.songs;
}
// 7.10.2: the search runs here, over the whole library read once (artists, albums, every song): instant while
// typing, any word in any order, in the name, the artist or the album, with or without accents ("sting fields"
// finds Fields of Gold). Names that start with what was typed come first.
const musicKey = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
let musicIndex = null;
async function musicSearchReady() {
  if (!musicIndex) {
    const [ar, al, so] = await Promise.all([musicArtists(), musicAlbums(), musicSongs()]);
    const k = (it, ...f) => Object.assign(it, { _k: musicKey(f.join(' ')), _n: musicKey(it.name) });
    musicIndex = { artists: ar.map(a => k(Object.assign({ kind: 'artist' }, a), a.name)),
      albums: al.map(a => k(Object.assign({ kind: 'album' }, a), a.name, a.artist, a.year || '')),
      songs: so.map(x => k(Object.assign({ kind: 'song' }, x), x.name, x.artist, x.artists, x.album)) };
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
  if (musicPos < 0) { musicQueue = songs.slice(); musicPos = -1; musicNextAt = -1; deck.emit('music'); return songs.length; }
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
  const url = await musicApi().stream(s.id, musicPlayable(s.media));
  if (musicNow() !== s) return;
  musicAudio.src = url;
  musicAudio.play().catch(e => { if (musicNow() === s && e.name !== 'AbortError') { musicError = 'no pude tocar ' + s.name; deck.notice('⚠ No pude tocar <span>' + s.name.replace(/[<>&]/g, '') + '</span>', 2600); } });
  deck.emit('music');
}
function musicJump(i) { if (i >= 0 && i < musicQueue.length) { musicPos = i; musicNextAt = -1; musicStart(); } }
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
  else if (musicQueue.length) { if (musicPos < 0) musicPos = musicModes.shuffle ? (musicShuffleDeal(), musicShuf[0]) : 0; musicStart(); }
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
musicAudio.addEventListener('error', () => { if (musicAudio.getAttribute('src')) { const s = musicNow(); deck.notice('⚠ El servidor no mandó <span>' + (s ? s.name.replace(/[<>&]/g, '') : 'el tema') + '</span>', 2600); } });

// the music takes the sound (as the CD and the radio do): the radio and the CD go quiet, the PC's player waits;
// screens may add to this (ui/jukebox/jukebox.js)
let musicResumePc = false;
function musicTakeSound() {
  if (radioPlaying()) radioStop(true);
  if (cdPlaying()) cdPauseHere();
  if (npPcPlaying() && window.nowPlaying && !musicResumePc) { window.nowPlaying.cmd('pause'); musicResumePc = true; }
}
