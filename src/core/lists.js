'use strict';
// ═══════════════════════════════════════════════════════════
//  THE DM-90'S LISTS (core, 7.10.36: no screen). The person's own lists of songs, each one remembering where it was
//  left (the song and the second), so going back to it goes on from there:
//    SERVER   the person's Jellyfin playlists (electron/jellyfin.js, lists): the phone (deck-90-android) and
//             Jellyfin's own apps have the same ones, and the place each was left is kept in Jellyfin too, so a
//             list left on the phone goes on in the PC from the same song, and the other way round
//    PC, USB  lists kept in this PC (deck90-lists), the songs of that source
//  A list is { src, id, name, count }. The screens (ui/jukebox/) call these and hear back through 'music'.
// ═══════════════════════════════════════════════════════════
const LISTS_MAX = 5000;
let listsLocal = (() => {
  const k = store.read('deck90-lists', {}), out = { pc: [], usb: [] };
  for (const src of ['pc', 'usb']) for (const l of Array.isArray(k && k[src]) ? k[src] : []) {
    if (!l || typeof l.id !== 'string' || typeof l.name !== 'string' || !Array.isArray(l.songs)) continue;
    out[src].push({ id: l.id, name: l.name.slice(0, 100), songs: l.songs.filter(x => x && typeof x.id === 'string').slice(0, LISTS_MAX),
      place: l.place && typeof l.place.song === 'string' ? { song: l.place.song, i: l.place.i | 0, t: Math.max(0, Number(l.place.t) || 0) } : null });
  }
  return out;
})();
const listsSave = () => store.write('deck90-lists', listsLocal);
// the list Q held adds to (the last one opened, made or played), and the one the queue came from
let listCur = (() => { const c = store.read('deck90-list-cur', null); return c && MUSIC_SOURCES.includes(c.src) && typeof c.id === 'string' ? { src: c.src, id: c.id, name: String(c.name || '') } : null; })();
let listPlaying = null;                                            // { list, queue }: while the queue is that list's
function listCurSet(list) { listCur = list ? { src: list.src, id: list.id, name: list.name } : null; store.write('deck90-list-cur', listCur); }
const listSame = (a, b) => !!a && !!b && a.src === b.src && a.id === b.id;
const listLocalOf = list => (listsLocal[list.src] || []).find(l => l.id === list.id) || null;
const listKeep = s => ({ src: s.src, id: s.id, name: s.name, artist: s.artist, artists: s.artists, album: s.album, albumId: s.albumId, n: s.n, disc: s.disc, len: s.len, year: s.year, media: s.media });
function listCheck(r) { if (!r || r.error) throw new Error(r && r.error || 'sin respuesta'); return r; }

// the source's lists, by name
async function musicLists(src = musicModes.source) {
  if (musicIsLocal(src)) return listsLocal[src].map(l => ({ src, id: l.id, name: l.name, count: l.songs.length })).sort((a, b) => musicCmp(a.name, b.name));
  if (!window.jellyfin || !musicServer.signedIn) return [];
  return (listCheck(await window.jellyfin.lists('all')).Items || []).map(l => Object.assign({ src: 'server' }, l));
}
// a list's songs (a server one's carry their entry in the playlist, to take one out)
async function musicListSongs(list) {
  if (musicIsLocal(list.src)) { const l = listLocalOf(list); return l ? l.songs.map(s => Object.assign({}, s, { src: list.src })) : []; }
  return (listCheck(await window.jellyfin.lists('songs', list.id)).Items || []).map(i => Object.assign(musicSong(i, 'server'), { entry: i.PlaylistItemId || '' }));
}
async function musicListCreate(name, src = musicModes.source, songs = []) {
  name = String(name || '').trim().slice(0, 100) || 'LISTA';
  let list;
  if (musicIsLocal(src)) {
    const l = { id: 'l' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name, songs: songs.map(listKeep).slice(0, LISTS_MAX), place: null };
    listsLocal[src].push(l); listsSave(); list = { src, id: l.id, name, count: l.songs.length };
  } else {
    const r = listCheck(await window.jellyfin.lists('create', name, songs.map(s => s.id)));
    list = { src: 'server', id: r.id, name, count: songs.length };
  }
  listCurSet(list); deck.emit('music');
  return list;
}
// songs to the end of a list (of its own source only: a server list can't hold a pendrive's song)
async function musicListAdd(list, songs) {
  songs = songs.filter(s => s && s.id && s.src === list.src);
  if (!songs.length) return 0;
  if (musicIsLocal(list.src)) {
    const l = listLocalOf(list); if (!l) throw new Error('ya no está');
    const room = LISTS_MAX - l.songs.length; songs = songs.slice(0, Math.max(0, room));
    l.songs.push(...songs.map(listKeep)); listsSave();
  } else listCheck(await window.jellyfin.lists('add', list.id, songs.map(s => s.id)));
  listCurSet(list); deck.emit('music');
  return songs.length;
}
// the i-th song out of a list (song: as musicListSongs gave it)
async function musicListRemove(list, i, song) {
  if (musicIsLocal(list.src)) { const l = listLocalOf(list); if (l && l.songs[i]) { l.songs.splice(i, 1); listsSave(); } }
  else listCheck(await window.jellyfin.lists('remove', list.id, [song.entry]));
  deck.emit('music');
}
async function musicListDelete(list) {
  if (musicIsLocal(list.src)) { listsLocal[list.src] = listsLocal[list.src].filter(l => l.id !== list.id); listsSave(); }
  else listCheck(await window.jellyfin.lists('delete', list.id));
  if (listSame(listCur, list)) listCurSet(null);
  if (listPlaying && listSame(listPlaying.list, list)) listPlaying = null;
  deck.emit('music');
}

// ── where a list was left: { song, i, t } (the song's id, its place in the list, the second) ──
async function musicListPlace(list) {
  if (musicIsLocal(list.src)) { const l = listLocalOf(list); return l && l.place; }
  const r = await window.jellyfin.lists('places').catch(() => null);
  try { const p = JSON.parse((r && r.places || {})['list:' + list.id] || 'null'); return p && typeof p.song === 'string' ? p : null; } catch (_) { return null; }
}
// play a list from its i-th song; the song it was left on goes on from its second
async function musicListPlay(list, songs, i) {
  const place = await musicListPlace(list).catch(() => null);
  if (place && songs[i] && place.song === songs[i].id && place.t > 5) musicResumeAt = place.t;
  listCurSet(list);
  listPlaying = { list, queue: null };
  await musicPlay(songs, i);
  listPlaying.queue = musicQueue;
  listPlaceSave(true);
}
// the place, as it goes: kept here every few seconds, in Jellyfin every 15 s and on pause (a phone may be waiting)
let listPlaceAt = 0, listPlaceSent = '';
function listPlaceSave(now) {
  if (!listPlaying) return;
  if (listPlaying.queue && listPlaying.queue !== musicQueue) { listPlaying = null; return; }   // another queue: the list was left
  const s = musicNow(); if (!s) return;
  const list = listPlaying.list, place = { song: s.id, i: musicPos, t: Math.floor(musicAudio.currentTime || 0), at: Date.now() };
  if (musicIsLocal(list.src)) { const l = listLocalOf(list); if (l) { l.place = place; if (now || Date.now() - listPlaceAt > 5000) { listPlaceAt = Date.now(); listsSave(); } } return; }
  const key = place.song + '|' + Math.floor(place.t / 15);
  if (key === listPlaceSent || (!now && Date.now() - listPlaceAt < 15000)) return;
  listPlaceAt = Date.now(); listPlaceSent = key;
  window.jellyfin.lists('place', list.id, JSON.stringify(place)).catch(() => {});
}
deck.on('music', () => listPlaceSave(musicPaused()));
musicAudios.forEach(a => a.addEventListener('timeupdate', () => { if (a === musicAudio && !a.paused) listPlaceSave(false); }));
window.addEventListener('beforeunload', () => listPlaceSave(true));
