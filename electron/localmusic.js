'use strict';
// The DM-90's PC and USB sources (7.10.24): the music in the person's own folders (chosen in SETUP: F:\Música,
// D:\Audio…) and on the pendrives and memory cards plugged in (found by themselves: Windows' removable drives, which
// the bridge reports, or what's mounted under /media and /run/media on Linux). Every file is read once for its tags
// (tags.js) and kept in an index (userData/localmusic-index.json, by path, size and date), so the library is ready at
// once the next time and a folder that changed is read again in a moment; the folders are watched while the program runs.
//
// It answers the page the way the Jellyfin server does (jellyfin.js), in Jellyfin's own shapes, so the DM-90's core
// (src/core/music.js) uses one code for the three: read('artists' | 'items' | 'item' | 'libraries'), stream(id), cover(id).
// The sound goes to the page through a small server of its own on 127.0.0.1 (a secret in each address, ranges for
// seeking, and CORS, so the equalizer may take it). Only files in the libraries are served, by their id.
const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { readJson, writeJson } = require('./jsonfile');
const { readTags, readPicture } = require('./tags');

const AUDIO = /\.(mp3|flac|m4a|mp4|m4b|aac|ogg|oga|opus|wav)$/i;
const OTHER = /\.(wma|ape|aiff?|dsf|dff|wv|mpc|alac|tta)$/i;   // music Chromium can't play: counted, not listed
const SKIP_DIR = /^(\$recycle\.bin|system volume information|\.trash.*|\.spotlight-v100|\.fseventsd|node_modules|lost\+found)$/i;
const COVER = /^(cover|folder|front|albumart(small)?|album|portada|tapa)\.(jpe?g|png)$/i;
const MAX_SONGS = 300000, MAX_DEPTH = 24, MAX_COVER = 8 * 1024 * 1024;
const TICKS = 1e7;
const hash = s => crypto.createHash('sha1').update(s).digest('hex').slice(0, 32);
const fold = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const same = (a, b) => a.replace(/[\\/]+$/, '').toLowerCase() === b.replace(/[\\/]+$/, '').toLowerCase();
const DISC_DIR =/^(cd|disc|disco|disk|dvd)\s*[-_.]?\s*\d{1,2}$/i;
const MIME = { mp3: 'audio/mpeg', flac: 'audio/flac', m4a: 'audio/mp4', mp4: 'audio/mp4', m4b: 'audio/mp4', aac: 'audio/aac', ogg: 'audio/ogg', oga: 'audio/ogg', opus: 'audio/ogg', wav: 'audio/wav' };

// a song's name from its file when it has no title: no extension, no track number in front ("01 - Tema", "1. Tema")
function nameFromFile(file) {
  const base = path.basename(file).replace(/\.[^.]+$/, '');
  return base.replace(/^\s*(\d{1,3}|[A-Da-d]\d{1,2})\s*([-._)]\s*|\s+)/, '').replace(/_/g, ' ').trim() || base;
}
const numberFromFile = file => { const m = /^\s*(?:\d-)?(\d{1,3})(?=[\s._)-])/.exec(path.basename(file)); return m ? Number(m[1]) : 0; };

function createLocalMusic({ dir, log = () => {}, send = () => {} }) {
  const cfgFile = path.join(dir, 'localmusic.json'), indexFile = path.join(dir, 'localmusic-index.json');
  let cfg = readJson(cfgFile, log);
  cfg.folders = Array.isArray(cfg.folders) ? cfg.folders.filter(f => typeof f === 'string' && f.length < 1024).slice(0, 40) : [];
  // the index: path → [size, mtime, tags]
  let index = null, indexDirty = false, indexTimer = null;
  const loadIndex = () => { if (!index) { const j = readJson(indexFile, log); index = new Map(Object.entries(j.files && typeof j.files === 'object' ? j.files : {})); } return index; };
  const saveIndex = () => {
    indexDirty = true; clearTimeout(indexTimer);
    indexTimer = setTimeout(() => {
      if (!indexDirty) return; indexDirty = false;
      try { writeJson(indexFile, { v: 1, files: Object.fromEntries(index) }); } catch (e) { log('localmusic: index not written: ' + e.message); }
    }, 1500);
  };

  // the two libraries: their roots ({ id, path, name }), their songs and what's made of them
  const libs = { pc: lib(), usb: lib() };
  function lib() { return { roots: [], songs: [], byId: new Map(), albums: new Map(), artists: new Map(), scanning: 0, read: 0, found: 0, other: 0, unplayable: 0, at: 0, gen: 0 }; }
  const rootOf = (kind, p, name) => ({ id: hash(kind + ':' + p), path: p, name: name || path.basename(p.replace(/[\\/]+$/, '')) || p });

  // ── reading a folder ──
  async function walk(root, out, counts, stop) {
    const todo = [[root, 0]];
    while (todo.length && !stop()) {
      const [d, depth] = todo.pop();
      let list;
      try { list = await fs.promises.readdir(d, { withFileTypes: true }); } catch (_) { continue; }
      for (const e of list) {
        if (e.name.startsWith('.')) continue;
        const p = path.join(d, e.name);
        if (e.isDirectory()) { if (depth < MAX_DEPTH && !SKIP_DIR.test(e.name)) todo.push([p, depth + 1]); }
        else if (AUDIO.test(e.name)) { if (out.length < MAX_SONGS) out.push(p); }
        else if (OTHER.test(e.name)) counts.other++;
      }
    }
  }
  // read the libraries' roots again: only files new or changed since the index are opened
  async function scan(kind, why) {
    const L = libs[kind], gen = ++L.gen;
    const stop = () => gen !== L.gen;
    L.scanning = Date.now(); L.read = 0; L.found = 0; status(kind);
    const files = [], counts = { other: 0 };
    for (const r of L.roots) { const n = files.length; await walk(r.path, files, counts, stop); r.count = files.length - n; }
    if (stop()) return;
    L.found = files.length; status(kind);
    const idx = loadIndex(), found = [];
    let at = 0, last = 0, fresh = 0;
    const one = async () => {
      while (at < files.length && !stop()) {
        const f = files[at++];
        let st; try { st = await fs.promises.stat(f); } catch (_) { continue; }
        const key = f, have = idx.get(key);
        let t = have && have[0] === st.size && have[1] === Math.round(st.mtimeMs) ? have[2] : undefined;
        if (t === undefined) {
          t = await readTags(f);
          if (t && t.picData) { delete t.picData; t.picLater = true; }   // an Ogg's cover (base64 in its comments): read when asked, not kept in the index
          idx.set(key, [st.size, Math.round(st.mtimeMs), t]); fresh++;
        }
        if (t) found.push([f, t]);
        L.read++;
        if (Date.now() - last > 400) { last = Date.now(); status(kind); }
      }
    };
    await Promise.all(Array.from({ length: 6 }, one));
    if (stop()) return;
    if (fresh) saveIndex();
    build(kind, found, counts);
    L.scanning = 0; L.at = Date.now();
    log('localmusic: ' + kind + ' ' + (why || 'read') + ': ' + L.songs.length + ' songs, ' + L.albums.size + ' albums (' + fresh + ' files read, ' + (L.unplayable + L.other) + ' not playable)');
    status(kind, { changed: true });
  }

  // the songs, their albums and their artists, from the files' tags (and, without tags, from the folders)
  function build(kind, found, counts) {
    const L = libs[kind];
    L.songs = []; L.byId = new Map(); L.albums = new Map(); L.artists = new Map(); L.other = counts.other; L.unplayable = 0;
    const rootFor = f => L.roots.find(r => f === r.path || f.startsWith(r.path.replace(/[\\/]+$/, '') + path.sep)) || L.roots[0];
    for (const [f, t] of found) {
      if (!t.playable) { L.unplayable++; continue; }
      const root = rootFor(f); if (!root) continue;
      let d = path.dirname(f), folder = path.basename(d), up = path.dirname(d);
      if (DISC_DIR.test(folder) && up !== d) { folder = path.basename(up); d = up; up = path.dirname(up); }   // CD1, CD2: one album
      const inRoot = same(d, root.path), upIsRoot = inRoot || same(up, root.path);
      const s = {
        id: hash(kind + ':' + f), path: f, root: root.id, dir: path.dirname(f),
        name: t.title || nameFromFile(f), artist: t.artist || t.albumArtist || (!upIsRoot ? path.basename(up) : ''), artists: t.artists || t.artist || '',
        album: t.album || (inRoot ? root.name : folder), albumArtist: t.albumArtist || '', comp: !!t.comp,
        n: t.n || numberFromFile(f), disc: t.disc || (DISC_DIR.test(path.basename(path.dirname(f))) ? Number(/\d+/.exec(path.basename(path.dirname(f)))[0]) : 0),
        year: t.year || 0, len: t.len || 0, pic: t.pic || null, picLater: !!t.picLater,
        media: { codec: t.codec, container: t.container, kbps: t.kbps, rate: t.rate, bits: t.bits, ch: t.ch },
      };
      if (!s.artists) s.artists = s.artist;
      // the album: its name with its album artist, or its name in its folder (a compilation without album artist)
      const akey = fold(s.album) + '|' + (s.albumArtist ? fold(s.albumArtist) : 'dir:' + d);
      let a = L.albums.get(hash(akey));
      if (!a) { a = { id: hash(akey), name: s.album, artist: s.albumArtist, year: 0, songs: [], dir: d, root: root.id, artists: new Set() }; L.albums.set(a.id, a); }
      a.songs.push(s); a.artists.add(fold(s.artist)); if (s.year && (!a.year || s.year < a.year)) a.year = s.year;
      if (!a.cover && (s.pic || s.picLater)) a.cover = s;
      s.albumId = a.id;
      L.songs.push(s); L.byId.set(s.id, s);
    }
    for (const a of L.albums.values()) {
      if (!a.artist) a.artist = a.artists.size === 1 ? a.songs[0].artist || 'Unknown Artist' : a.songs.some(s => s.comp) || a.artists.size > 1 ? 'Various Artists' : 'Unknown Artist';
      a.songs.sort((x, y) => (x.disc - y.disc) || (x.n - y.n) || x.name.localeCompare(y.name));
      const ar = hash('ar:' + fold(a.artist));
      a.artistId = ar;
      let A = L.artists.get(ar); if (!A) { A = { id: ar, name: a.artist, albums: [], roots: new Set() }; L.artists.set(ar, A); }
      A.albums.push(a); A.roots.add(a.root);
      for (const s of a.songs) s.albumArtistName = a.artist;
    }
  }

  // ── the answers, as Jellyfin's ──
  const songItem = s => ({ Id: s.id, Name: s.name, AlbumArtist: s.albumArtistName || s.artist, Artists: s.artists ? s.artists.split(/\s*,\s*/) : [], Album: s.album,
    AlbumId: s.albumId, IndexNumber: s.n || undefined, ParentIndexNumber: s.disc || undefined, RunTimeTicks: Math.round(s.len * TICKS), ProductionYear: s.year || undefined,
    MediaSources: [{ Container: s.media.container, Bitrate: s.media.kbps * 1000, MediaStreams: [{ Type: 'Audio', Codec: s.media.codec, BitRate: s.media.kbps * 1000,
      SampleRate: s.media.rate, BitDepth: s.media.bits || undefined, Channels: s.media.ch }] }] });
  const albumItem = a => ({ Id: a.id, Name: a.name, AlbumArtist: a.artist, ProductionYear: a.year || undefined, ChildCount: a.songs.length });
  const inLib = (q, root) => !q.Library || q.Library === root;
  // the first reading of a library, waited for (the program just opened: its folders are being read)
  const firstRead = kind => libs[kind].at ? Promise.resolve() : new Promise(r => { const t0 = Date.now(), t = setInterval(() => { if (libs[kind].at || Date.now() - t0 > 60000) { clearInterval(t); r(); } }, 100); });
  async function read(kind, what, id, q = {}) {
    const L = libs[kind]; if (!L) return { error: 'no source' };
    await firstRead(kind);
    if (what === 'libraries') return { Items: L.roots.map(r => ({ id: r.id, name: r.name })) };
    if (what === 'artists') {
      const items = [...L.artists.values()].filter(A => !q.Library || A.roots.has(q.Library)).map(A => ({ Id: A.id, Name: A.name }));
      return { Items: items, TotalRecordCount: items.length };
    }
    if (what === 'item') { const s = L.byId.get(String(id)); return s ? songItem(s) : { error: 'not found' }; }
    if (what !== 'items') return { error: 'not allowed' };
    const type = String(q.IncludeItemTypes || ''), byAlbumArtist = q.AlbumArtistIds && String(q.AlbumArtistIds), byArtist = q.ArtistIds && String(q.ArtistIds);
    if (type === 'MusicAlbum') {
      let al = [...L.albums.values()].filter(a => inLib(q, a.root));
      if (byAlbumArtist) al = al.filter(a => a.artistId === byAlbumArtist);
      if (byArtist) { const A = L.artists.get(byArtist), name = A && fold(A.name); al = al.filter(a => a.artistId === byArtist || (name && a.artists.has(name))); }
      return { Items: al.map(albumItem), TotalRecordCount: al.length };
    }
    if (type === 'Audio') {
      let songs;
      if (q.ParentId) { const a = L.albums.get(String(q.ParentId)); songs = a ? a.songs.slice() : []; }
      else {
        songs = L.songs.filter(s => inLib(q, s.root));
        if (byAlbumArtist || byArtist) {
          const A = L.artists.get(byAlbumArtist || byArtist), name = A && fold(A.name);
          songs = songs.filter(s => (byAlbumArtist && L.albums.get(s.albumId).artistId === byAlbumArtist) || (byArtist && fold(s.artist) === name));
          songs.sort((x, y) => ((x.year || 0) - (y.year || 0)) || fold(x.album).localeCompare(fold(y.album)) || (x.disc - y.disc) || (x.n - y.n));
        }
      }
      return { Items: songs.map(songItem), TotalRecordCount: songs.length };
    }
    return { Items: [] };
  }

  // ── the sound: a little server of its own, only for the songs of the libraries ──
  const secret = crypto.randomBytes(16).toString('hex');
  let server = null, port = 0;
  function start() {
    if (server) return port ? Promise.resolve(port) : new Promise(r => server.once('listening', () => r(port)));
    server = http.createServer(serve);
    return new Promise(resolve => {
      server.on('error', e => { log('localmusic: server: ' + e.message); server = null; port = 0; resolve(0); });
      server.listen(0, '127.0.0.1', () => { port = server.address().port; resolve(port); });
    });
  }
  function serve(req, res) {
    const m = /^\/([0-9a-f]{32})\/(pc|usb)\/([0-9a-f]{32})(?:\.\w+)?$/.exec(req.url.split('?')[0]);
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Range', 'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges' };
    if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
    const s = m && m[1] === secret && libs[m[2]].byId.get(m[3]);
    if (!s || (req.method !== 'GET' && req.method !== 'HEAD')) { res.writeHead(404, cors); return res.end(); }
    fs.stat(s.path, (err, st) => {
      if (err) { res.writeHead(404, cors); return res.end(); }
      const type = MIME[(/\.([a-z0-9]+)$/i.exec(s.path) || [])[1].toLowerCase()] || 'application/octet-stream';
      let a = 0, b = st.size - 1, code = 200;
      const r = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
      if (r && (r[1] || r[2])) {
        if (r[1]) { a = Number(r[1]); if (r[2]) b = Math.min(b, Number(r[2])); } else { a = Math.max(0, st.size - Number(r[2])); }
        if (a > b || a >= st.size) { res.writeHead(416, Object.assign({ 'Content-Range': 'bytes */' + st.size }, cors)); return res.end(); }
        code = 206;
      }
      const h = Object.assign({ 'Content-Type': type, 'Content-Length': b - a + 1, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' }, cors);
      if (code === 206) h['Content-Range'] = 'bytes ' + a + '-' + b + '/' + st.size;
      res.writeHead(code, h);
      if (req.method === 'HEAD') return res.end();
      const f = fs.createReadStream(s.path, { start: a, end: b });
      f.on('error', () => res.destroy()); res.on('close', () => f.destroy());
      f.pipe(res);
    });
  }
  async function stream(kind, id) {
    if (!libs[kind]) return '';
    await firstRead(kind);
    const s = libs[kind].byId.get(String(id)); if (!s) return '';
    const p = await start(); if (!p) return '';
    return 'http://127.0.0.1:' + p + '/' + secret + '/' + kind + '/' + s.id + path.extname(s.path).toLowerCase();
  }
  // the cover: the one inside the file, another song's of the album, or a picture in its folder
  const covers = new Map();
  async function cover(kind, id, albumId) {
    const L = libs[kind]; if (!L) return '';
    const s = L.byId.get(String(id)), a = L.albums.get(String(albumId || (s && s.albumId)));
    const key = kind + ':' + (a ? a.id : id);
    if (covers.has(key)) return covers.get(key);
    let url = '';
    for (const c of [s, a && a.cover].filter(Boolean)) {
      if (c.picLater) { const t = await readTags(c.path); if (t && t.picData) { url = t.picData; break; } }
      if (c.pic) { const b = await readPicture(c.path, c.pic); if (b && b.length <= MAX_COVER) { url = 'data:' + c.pic.mime + ';base64,' + b.toString('base64'); break; } }
    }
    // the song's folder, then the album's (CD1 and CD2 share the picture above them)
    for (const d of [...new Set([s && s.dir, a && a.songs[0] && a.songs[0].dir, a && a.dir].filter(Boolean))]) {
      if (url) break;
      try {
        const pics = (await fs.promises.readdir(d)).filter(n => /\.(jpe?g|png)$/i.test(n));
        const pick = pics.find(n => COVER.test(n)) || pics.find(n => /cover|front|folder/i.test(n)) || pics[0];
        if (pick) { const b = await fs.promises.readFile(path.join(d, pick)); if (b.length <= MAX_COVER) url = 'data:image/' + (/png$/i.test(pick) ? 'png' : 'jpeg') + ';base64,' + b.toString('base64'); }
      } catch (_) {}
    }
    if (covers.size > 400) covers.clear();
    covers.set(key, url);
    return url;
  }

  // ── what the page sees ──
  function summary(kind) {
    const L = libs[kind];
    return { roots: L.roots.map(r => ({ id: r.id, path: r.path, name: r.name, count: L.songs.filter(s => s.root === r.id).length })),
      songs: L.songs.length, albums: L.albums.size, artists: L.artists.size, scanning: !!L.scanning, read: L.read, found: L.found,
      unplayable: L.unplayable + L.other, ready: !L.scanning && !!L.at };
  }
  const statusAll = () => ({ pc: summary('pc'), usb: summary('usb') });
  function status(kind, extra) { send(Object.assign({ kind }, statusAll(), extra || {})); }

  // ── the PC's folders ──
  let watchers = [], watchTimer = null;
  function watch() {
    for (const w of watchers) try { w.close(); } catch (_) {}
    watchers = [];
    for (const r of libs.pc.roots) {
      try {
        const w = fs.watch(r.path, { recursive: true, persistent: false }, (ev, name) => {
          if (name && !AUDIO.test(String(name)) && /\.[a-z0-9]{2,4}$/i.test(String(name))) return;   // a picture or a text: nothing
          clearTimeout(watchTimer); watchTimer = setTimeout(() => scan('pc', 'changed'), 4000);
        });
        w.on('error', () => {}); watchers.push(w);
      } catch (_) {}
    }
  }
  function setFolders(list) {
    const seen = new Set();
    cfg.folders = (Array.isArray(list) ? list : []).map(String).filter(f => f && f.length < 1024 && path.isAbsolute(f))
      .map(f => path.normalize(f)).filter(f => { const k = fold(f); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 40);
    try { writeJson(cfgFile, cfg); } catch (e) { log('localmusic: folders not saved: ' + e.message); }
    libs.pc.roots = cfg.folders.map(f => rootOf('pc', f));
    watch();
    scan('pc', 'folders');
    return statusAll();
  }

  // ── USB: the drives plugged in ──
  let drivesKey = '', pretend = false, poll = null;
  function setDrives(list, from) {
    if (pretend && from !== 'test') return;
    const drives = (Array.isArray(list) ? list : []).filter(d => d && typeof d.path === 'string').slice(0, 12);
    const key = drives.map(d => d.path + '|' + (d.name || '')).sort().join('\n');
    if (key === drivesKey) return;
    const before = new Set(libs.usb.roots.map(r => r.path)), was = libs.usb.roots;
    drivesKey = key;
    libs.usb.roots = drives.map(d => rootOf('usb', d.path, String(d.name || '').trim() || (process.platform === 'win32' ? 'USB ' + d.path.replace(/[\\/]+$/, '') : path.basename(d.path))));
    const added = libs.usb.roots.filter(r => !before.has(r.path)), gone = was.filter(r => !libs.usb.roots.some(x => x.path === r.path));
    log('localmusic: usb ' + (libs.usb.roots.map(r => r.name + ' (' + r.path + ')').join(', ') || 'none'));
    if (gone.length && !libs.usb.roots.length) { libs.usb.gen++; build('usb', [], { other: 0 }); libs.usb.scanning = 0; libs.usb.at = Date.now(); }
    status('usb', { changed: true, plug: added.length ? 'in' : 'out', name: (added[0] || gone[0] || {}).name || '' });
    if (libs.usb.roots.length) scan('usb', 'plugged');
  }
  // Linux: what's mounted under /media or /run/media (as the file managers show it); Windows: the bridge says
  function linuxDrives() {
    fs.readFile('/proc/mounts', 'utf8', (err, text) => {
      if (err) return;
      const out = [];
      for (const line of text.split('\n')) {
        const p = (line.split(' ')[1] || '').replace(/\\040/g, ' ').replace(/\\011/g, '\t').replace(/\\134/g, '\\');
        if (/^\/(run\/)?media\/[^/]+(\/[^/]+)?$/.test(p) && p.split('/').length >= (p.startsWith('/run') ? 5 : 4)) out.push({ path: p, name: path.basename(p) });
      }
      setDrives(out, 'linux');
    });
  }
  function startUsb() {
    if (process.platform === 'linux' && !poll) { linuxDrives(); poll = setInterval(linuxDrives, 3000); poll.unref(); }
  }

  // ── at the start: the folders kept, read again (in a moment: the index has them) ──
  libs.pc.roots = cfg.folders.map(f => rootOf('pc', f));
  if (libs.pc.roots.length) setTimeout(() => { scan('pc', 'start'); watch(); }, 1500);
  else libs.pc.at = Date.now();
  libs.usb.at = Date.now();
  startUsb();

  return {
    status: statusAll, read, stream, cover, setFolders, folders: () => cfg.folders.slice(),
    rescan: kind => { if (libs[kind]) scan(kind, 'asked'); return statusAll(); },
    setDrives,
    // the tests: pretend drives (the real ones are no longer looked at)
    pretendDrives: list => { pretend = true; setDrives(list, 'test'); },
    close: () => { for (const w of watchers) try { w.close(); } catch (_) {} if (poll) clearInterval(poll); if (server) server.close(); },
  };
}

module.exports = { createLocalMusic, nameFromFile };
