// A pretend Jellyfin server for the tests (two music libraries: 30 artists and one more apart) (its FLAC songs are a minute of 24/96 silence, the MP3s the 6 s tone), on 127.0.0.1 and a free port: user "damian", password "secreto", a music
// library of made-up artists (30 × 3 albums × 8 songs, FLAC 24/96 and MP3 320 by turns) and a movie library that
// must never show. Only what the DM-90 asks: sign-in, views, album artists, items (with search, paging and the
// filters it uses), one item, and the songs' sound (the tone fixtures).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const MP3 = fs.readFileSync(path.join(here, '..', 'fixtures', 'tone.mp3'));
const FLAC = fs.readFileSync(path.join(here, '..', 'fixtures', 'tone-24-96.flac'));
const TOKEN = 'tok-123', USER = 'u1', LIB = 'lib-music', LIB2 = 'lib-music2', MOVIES = 'lib-movies';
const hex = (k, n) => k + n.toString(16).padStart(6, '0');

export function library() {
  const artists = [], albums = [], songs = [];
  const NAMES = ['Abril Sur', 'Banda Inventada', 'Los Pericotes', 'Cielo Norte', 'Delta Nueve', 'Eco Azul', 'Faro Rojo', 'Gris Perla', 'Hora Cero', 'Isla Verde',
    'Jazmín Negro', 'Kilómetro 9', 'Luz Mala', 'Marea Alta', 'Niebla', 'Oro Viejo', 'Pampa Seca', 'Quinta Avenida', 'Río Abajo', 'Sombra Larga',
    'Trueno Blanco', 'Ultramar', 'Vía Láctea', 'Winter Coast', 'Xilofón', 'Yerba Buena', 'Zona Sur', 'Ángel Caído', 'Ébano', 'Órbita'];
  NAMES.forEach((name, a) => {
    const ar = { Id: hex('a', a), Name: name, Type: 'MusicArtist' };
    artists.push(ar);
    for (let b = 0; b < 3; b++) {
      const al = { Id: hex('b', a * 10 + b), Name: ['Primer Disco', 'En Vivo En Ningún Lado', 'Grandes Éxitos Inventados'][b], AlbumArtist: name, AlbumArtists: [{ Id: ar.Id, Name: name }],
        ProductionYear: 1980 + a % 15 + b * 3, Type: 'MusicAlbum', ChildCount: 8 };
      albums.push(al);
      for (let t = 0; t < 8; t++) {
        const flac = (a + b + t) % 2 === 0;
        songs.push({ Id: hex('c', a * 100 + b * 10 + t), Name: 'Canción ' + String.fromCharCode(65 + t) + ' de ' + name, Type: 'Audio', IndexNumber: t + 1, ParentIndexNumber: 1,
          Album: al.Name, AlbumId: al.Id, AlbumArtist: name, Artists: [name], ProductionYear: al.ProductionYear, RunTimeTicks: (150 + t * 20) * 1e7,
          _flac: flac, MediaSources: [{ Container: flac ? 'flac' : 'mp3', Bitrate: flac ? 4608000 : 320000,
            MediaStreams: [{ Type: 'Audio', Codec: flac ? 'flac' : 'mp3', BitRate: flac ? 4608000 : 320000, SampleRate: flac ? 96000 : 44100, BitDepth: flac ? 24 : 0, Channels: 2 }] }] });
      }
    }
  });
  // a second music library: one artist, one album, three songs (the DM-90 reads every music library)
  const two = { artists: [{ Id: 'd000001', Name: 'Otra Biblioteca', Type: 'MusicArtist' }],
    albums: [{ Id: 'e000001', Name: 'Disco Aparte', AlbumArtist: 'Otra Biblioteca', ProductionYear: 1999, Type: 'MusicAlbum', ChildCount: 3 }], songs: [] };
  for (let t = 0; t < 3; t++) two.songs.push({ Id: 'f00000' + t, Name: 'Aparte ' + (t + 1), Type: 'Audio', IndexNumber: t + 1, Album: 'Disco Aparte', AlbumId: 'e000001',
    AlbumArtist: 'Otra Biblioteca', Artists: ['Otra Biblioteca'], ProductionYear: 1999, RunTimeTicks: 200e7, _flac: false,
    MediaSources: [{ Container: 'mp3', MediaStreams: [{ Type: 'Audio', Codec: 'mp3', BitRate: 256000, SampleRate: 44100, Channels: 2 }] }] });
  return { artists, albums, songs, two };
}

export function startJellyfin() {
  const lib = library(), log = [];
  const strip = it => { const o = Object.assign({}, it); delete o._flac; return o; };
  const authed = (req, u) => /Token="tok-123"/.test(req.headers.authorization || '') || u.searchParams.get('api_key') === TOKEN;
  const page = (items, q) => {
    const start = Number(q.get('StartIndex') || 0), limit = Number(q.get('Limit') || 1e9);
    return { Items: items.slice(start, start + limit).map(strip), TotalRecordCount: items.length };
  };
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x'), q = u.searchParams;
    log.push(req.method + ' ' + u.pathname + u.search);
    const json = (code, body) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(body === undefined ? '' : JSON.stringify(body)); };
    if (req.method === 'POST' && u.pathname === '/Users/AuthenticateByName') {
      let body = ''; req.on('data', c => { body += c; });
      req.on('end', () => {
        let b = {}; try { b = JSON.parse(body); } catch (_) {}
        if (b.Username === 'damian' && b.Pw === 'secreto') json(200, { AccessToken: TOKEN, ServerId: 's1', User: { Id: USER, Name: 'damian' } });
        else json(401);
      });
      return;
    }
    if (!authed(req, u)) return json(401);
    let m;
    if (u.pathname === `/Users/${USER}/Views`) return json(200, { Items: [{ Id: MOVIES, Name: 'Películas', CollectionType: 'movies' }, { Id: LIB, Name: 'Música', CollectionType: 'music' }, { Id: LIB2, Name: 'Más música', CollectionType: 'music' }] });
    if (u.pathname === '/Artists/AlbumArtists') {
      if (q.get('ParentId') === LIB2) return json(200, page(lib.two.artists, q));
      if (q.get('ParentId') !== LIB) return json(200, { Items: [{ Id: 'zz', Name: 'UNA PELÍCULA' }] });
      let a = lib.artists.slice().sort((x, y) => x.Name.localeCompare(y.Name));
      if (q.get('SearchTerm')) a = a.filter(x => x.Name.toLowerCase().includes(q.get('SearchTerm').toLowerCase()));
      return json(200, page(a, q));
    }
    if ((m = /^\/Users\/u1\/Items\/([0-9a-z-]+)$/.exec(u.pathname))) {
      const it = lib.songs.concat(lib.two.songs).find(s => s.Id === m[1]) || lib.albums.find(s => s.Id === m[1]);
      return it ? json(200, strip(it)) : json(404);
    }
    if (u.pathname === `/Users/${USER}/Items`) {
      const types = (q.get('IncludeItemTypes') || '').split(','), parent = q.get('ParentId');
      let items = [];
      if (parent === LIB2) items = [...(types.includes('MusicAlbum') ? lib.two.albums : []), ...(types.includes('Audio') ? lib.two.songs : [])];
      else if (parent && parent !== LIB) items = lib.songs.concat(lib.two.songs).filter(s => s.AlbumId === parent);   // an album's songs
      else {
        if (parent !== LIB) return json(200, { Items: [{ Id: 'zz', Name: 'UNA PELÍCULA', Type: 'Movie' }], TotalRecordCount: 1 });
        if (types.includes('MusicAlbum')) items = items.concat(lib.albums);
        if (types.includes('Audio')) items = items.concat(lib.songs);
      }
      const artist = q.get('AlbumArtistIds');
      if (artist) { const name = (lib.artists.concat(lib.two.artists).find(a => a.Id === artist) || {}).Name; items = items.filter(i => i.AlbumArtist === name); }
      if (q.get('SearchTerm')) items = items.filter(i => i.Name.toLowerCase().includes(q.get('SearchTerm').toLowerCase()));
      if ((q.get('SortBy') || '').startsWith('SortName')) items = items.slice().sort((x, y) => x.Name.localeCompare(y.Name));
      if (!/MediaSources/.test(q.get('Fields') || '')) items = items.map(i => { const o = Object.assign({}, i); delete o.MediaSources; return o; });
      return json(200, page(items, q));
    }
    if ((m = /^\/Audio\/([0-9a-z-]+)\/stream(\.flac)?$/.exec(u.pathname))) {
      const s = lib.songs.concat(lib.two.songs).find(x => x.Id === m[1]);
      if (!s) return json(404);
      const buf = s._flac || m[2] ? FLAC : MP3;
      res.writeHead(200, { 'Content-Type': s._flac || m[2] ? 'audio/flac' : 'audio/mpeg', 'Content-Length': buf.length, 'Accept-Ranges': 'none' });
      return res.end(buf);
    }
    json(404);
  });
  return new Promise(ok => server.listen(0, '127.0.0.1', () => {
    const base = 'http://127.0.0.1:' + server.address().port;
    ok({ base, lib, log, close: () => new Promise(done => { server.closeAllConnections?.(); server.close(() => done()); }) });
  }));
}
