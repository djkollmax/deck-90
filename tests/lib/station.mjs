// A pretend radio station for the tests, on 127.0.0.1 and a free port:
//   /tone.mp3  the tone, as a plain file
//   /s         an ICY stream of the tone in a loop (its first 4 s at once), a song title every 8 KiB, changing every 3 s, icy-br 128
//   /nobr      the same stream without icy-br (the program measures the rate itself)
//   /gone      404: a station that's gone
//   /ogg       an Ogg FLAC stream with no ICY titles, each song a new stream in it whose comments name it (7.10.28)
//   /flac      an Ogg FLAC stream that names nothing, as Radio Paradise's; /rp?chan=n says its song, as RP's page does
// drop() breaks off the streams playing now; down(ms) answers 503 for a while (a station that's off the air).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const TONE = fs.readFileSync(path.join(here, '..', 'fixtures', 'tone.mp3'));
export const SONGS = ['Los Pericos - Párrafo', 'Soda Stereo - De Música Ligera', 'Charly García - Demoliendo Hoteles'];
export const OGG = fs.readFileSync(path.join(here, '..', 'fixtures', 'chained-flac.ogg'));   // "Banda Inventada - Tema 1", then "Tema 2"
export const PLAIN_OGG = fs.readFileSync(path.join(here, '..', 'fixtures', 'plain-flac.ogg'));
export const RP_SONG = { artist: 'Grupo Imaginario', title: 'Canción del Paraíso' };


export function startStation() {
  const live = new Set();
  let downUntil = 0;
  const server = http.createServer((req, res) => {
    if (Date.now() < downUntil) { res.writeHead(503); res.end(); return; }
    if (req.url.startsWith('/gone')) { res.writeHead(404); res.end(); return; }   // a station that's gone (7.10.13)
    if (req.url.startsWith('/tone.mp3')) {
      res.writeHead(200, { 'Content-Type': 'audio/mpeg', 'Content-Length': TONE.length });
      res.end(TONE); return;
    }
    if (req.url.startsWith('/rp?')) {                        // 7.10.28: Radio Paradise's page
      const chan = new URL(req.url, 'http://x').searchParams.get('chan');
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(Object.assign({ time: 120, chan }, RP_SONG))); return;
    }
    if (req.url.startsWith('/ogg') || /^\/(\w+-)?flac/.test(req.url)) {   // 7.10.28: Ogg FLAC, about in real time (a burst first)
      const file = req.url.startsWith('/ogg') ? OGG : PLAIN_OGG;
      res.writeHead(200, { 'Content-Type': 'application/ogg' });
      let at = 0, first = true, gone = false; const t = setInterval(() => {
        if (gone) return clearInterval(t);
        const n = first ? 9000 : 600; first = false; res.write(file.subarray(at, at + n)); at += n; if (at >= file.length) at = 0;
      }, 125);
      live.add(res); req.on('close', () => { gone = true; live.delete(res); clearInterval(t); });
      return;
    }
    const icy = req.headers['icy-metadata'] === '1', metaint = 8192;
    const head = { 'Content-Type': 'audio/mpeg', 'icy-name': 'Test FM' };
    if (icy) head['icy-metaint'] = metaint;
    if (!req.url.startsWith('/nobr')) head['icy-br'] = '128';
    res.writeHead(200, head);
    let pos = 0, since = 0, closed = false;
    const t0 = Date.now();
    live.add(res);
    req.on('close', () => { closed = true; live.delete(res); });
    let burst = 65536;                                       // the first 4 s at once, as Icecast does (burst-size)
    const tick = () => {
      if (closed) return;
      let n = burst || 2048; burst = 0;                      // then ~16 KB/s, 128 kbps
      while (n > 0) {
        const take = Math.min(n, TONE.length - pos, icy ? metaint - since : Infinity);
        res.write(TONE.subarray(pos, pos + take)); pos = (pos + take) % TONE.length; n -= take; since += take;
        if (icy && since === metaint) {
          since = 0;
          const m = Buffer.from("StreamTitle='" + SONGS[Math.floor((Date.now() - t0) / 3000) % SONGS.length] + "';", 'utf8');
          const b = Buffer.alloc(1 + Math.ceil(m.length / 16) * 16); b[0] = Math.ceil(m.length / 16); m.copy(b, 1); res.write(b);
        }
      }
      setTimeout(tick, 125);
    };
    tick();
  });
  return new Promise(ok => server.listen(0, '127.0.0.1', () => {
    const base = 'http://127.0.0.1:' + server.address().port;
    // drop(): every stream playing now breaks off, as a station's server does when it restarts
    ok({ base, drop: async () => { for (const r of live) r.destroy(); live.clear(); }, down: ms => { downUntil = Date.now() + ms; }, close: () => new Promise(done => { server.closeAllConnections?.(); server.close(() => done()); }) });
  }));
}
