// A pretend radio station for the tests, on 127.0.0.1 and a free port:
//   /tone.mp3  the tone, as a plain file
//   /s         an ICY stream of the tone in a loop, a song title every 8 KiB, changing every 3 s, icy-br 128
//   /nobr      the same stream without icy-br (the program measures the rate itself)
// drop() breaks off the streams playing now.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const TONE = fs.readFileSync(path.join(here, '..', 'fixtures', 'tone.mp3'));
export const SONGS = ['Los Pericos - Párrafo', 'Soda Stereo - De Música Ligera', 'Charly García - Demoliendo Hoteles'];

export function startStation() {
  const live = new Set();
  const server = http.createServer((req, res) => {
    if (req.url.startsWith('/tone.mp3')) {
      res.writeHead(200, { 'Content-Type': 'audio/mpeg', 'Content-Length': TONE.length });
      res.end(TONE); return;
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
    const tick = () => {
      if (closed) return;
      let n = 2048;                                          // ~16 KB/s, 128 kbps
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
    ok({ base, drop: async () => { for (const r of live) r.destroy(); live.clear(); }, close: () => new Promise(done => { server.closeAllConnections?.(); server.close(() => done()); }) });
  }));
}
