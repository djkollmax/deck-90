// Phone display: a small web server on the home network. A phone (or tablet) opens
// http://<this PC>:<port>/?k=<key> and gets the VU meters, the big cassette and the loudness numbers,
// live, plus the transport keys. Off until the user turns it on; every request needs the key.
//
// Routes:  /            the page (needs ?k=)
//          /events      Server-Sent Events: 'np' (now playing) and 'f' (meter frames, ~30/s)
//          /cmd?c=…     transport command (toggle | play | pause | stop | next | prev)
//          /remote/*, /js/<shared drawing file>, /vendor/qrcode.js   static files
const http = require('http');
const os = require('os');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SRC = path.join(__dirname, '..', 'src');
// Only these files are ever served: the phone page and the drawing code it shares with the rack.
const STATIC = {
  '/remote/index.html': 'remote/index.html',
  '/remote/remote.css': 'remote/remote.css',
  '/remote/shim.js': 'remote/shim.js',
  '/remote/remote.js': 'remote/remote.js',
  '/js/deck.js': 'js/deck.js',
  '/js/draw-vu.js': 'js/draw-vu.js',
  '/js/tape.js': 'js/tape.js',
  '/js/nowplaying.js': 'js/nowplaying.js',
};
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8' };
const CMDS = ['toggle', 'play', 'pause', 'stop', 'next', 'prev'];

function lanAddresses() {
  const out = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const a of list || []) {
      if (a.family !== 'IPv4' && a.family !== 4) continue;
      if (a.internal || a.address.startsWith('169.254.')) continue;
      out.push(a.address);
    }
  }
  // home networks first (192.168.x, then 10.x, then 172.16–31.x); VPN/virtual adapters last
  const rank = ip => ip.startsWith('192.168.') ? 0 : ip.startsWith('10.') ? 1 : /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ? 2 : 3;
  return out.sort((a, b) => rank(a) - rank(b));
}

function createRemote({ onCmd, log, getNowPlaying, onClients }) {
  let server = null, port = 0, key = '';
  const clients = new Set();
  let lastFrame = null;

  const MAX_CLIENTS = 8;
  function send(res, event, data, droppable) {
    // a phone that stops reading (frozen tab, weak Wi-Fi) must not pile frames up in memory
    if (res.writableLength > 1 << 20) { try { res.destroy(); } catch (_) {} return; }
    if (droppable && res.writableLength > 64 << 10) return;
    try { res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); } catch (_) {}
  }
  function keyOk(u) {
    const k = u.searchParams.get('k') || '';
    if (!key || !/^[A-Za-z0-9_-]{1,64}$/.test(k)) return false;          // keys are base64url: anything else is wrong
    const a = Buffer.from(k), b = Buffer.from(key);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }
  // A bad request must never take the program down: answer 500 and carry on.
  function handler(req, res) {
    try { route(req, res); }
    catch (e) { log('remote: ' + e.message); try { res.writeHead(500).end(); } catch (_) {} }
  }
  function route(req, res) {
    let u;
    try { u = new URL(req.url, 'http://x'); } catch (_) { res.writeHead(400).end(); return; }
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (u.pathname === '/favicon.ico') { res.writeHead(204).end(); return; }
    if (u.pathname === '/' || u.pathname === '/index.html') {
      if (!keyOk(u)) { res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Deck 90: falta la clave. Escaneá el código QR de la PC.'); return; }
      u.pathname = '/remote/index.html';
    }
    const file = STATIC[u.pathname];
    if (file && req.method === 'GET') {
      fs.readFile(path.join(SRC, file), (err, buf) => {
        if (err) { res.writeHead(404).end(); return; }
        res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream',
          'Content-Security-Policy': "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'none'" });
        res.end(buf);
      });
      return;
    }
    if (u.pathname === '/events' && req.method === 'GET') {
      if (!keyOk(u)) { res.writeHead(403).end(); return; }
      if (clients.size >= MAX_CLIENTS) { res.writeHead(503).end(); return; }
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Connection': 'keep-alive' });
      res.write('retry: 2000\n\n');
      clients.add(res);
      onClients(clients.size);
      log('remote: client connected (' + clients.size + ')');
      send(res, 'np', getNowPlaying() || { none: true });
      if (lastFrame) send(res, 'f', lastFrame);
      const ping = setInterval(() => { try { res.write(': ping\n\n'); } catch (_) {} }, 15000);
      req.on('close', () => { clearInterval(ping); clients.delete(res); onClients(clients.size); log('remote: client left (' + clients.size + ')'); });
      return;
    }
    if (u.pathname === '/cmd' && req.method === 'POST') {
      if (!keyOk(u)) { res.writeHead(403).end(); return; }
      const c = u.searchParams.get('c');
      if (!CMDS.includes(c)) { res.writeHead(400).end(); return; }
      onCmd(c);
      res.writeHead(204).end();
      return;
    }
    res.writeHead(404).end();
  }

  return {
    start(p, k) {
      return new Promise(resolve => {
        if (server) return resolve(this.state());
        key = k; port = p;
        const fail = e => { log('remote: ' + e.message); try { server && server.close(); } catch (_) {} server = null; resolve(Object.assign(this.state(), { error: e.code || e.message })); };
        server = http.createServer(handler);
        server.on('error', fail);
        try { server.listen(port, '0.0.0.0', () => { log('remote: listening on ' + port); resolve(this.state()); }); }
        catch (e) { fail(e); }
      });
    },
    stop() {
      for (const res of clients) { try { res.end(); } catch (_) {} }
      clients.clear(); onClients(0);
      if (server) { try { server.close(); } catch (_) {} server = null; }
      lastFrame = null;
    },
    frame(f) { lastFrame = f; for (const res of clients) send(res, 'f', f, true); },
    nowPlaying(info) { for (const res of clients) send(res, 'np', info); },
    state() {
      const urls = server ? lanAddresses().map(ip => `http://${ip}:${port}/?k=${key}`) : [];
      return { on: !!server, port, urls, clients: clients.size };
    },
  };
}

module.exports = { createRemote, lanAddresses };
