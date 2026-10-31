'use strict';
// ═══════════════════════════════════════════════════════════
//  RADIO PROXY (7.9.3): what the station says about itself
//  The page can't read a stream's headers or its in-band titles (an <audio> hides them, and the page may not
//  fetch). So the radio plays through here: a small server on 127.0.0.1 (a random port and a secret path, for
//  Deck 90's own page only) asks the station for the stream with "Icy-MetaData: 1", passes the audio on untouched
//  and takes out what the station sends between it: the song playing ("StreamTitle"), and from the headers the
//  format and bitrate (icy-br; measured from the stream when the station doesn't say). One connection, as before.
//  A stream that can't come through here (HLS playlists, a refused request) the page plays directly.
// ═══════════════════════════════════════════════════════════
const http = require('http');
const crypto = require('crypto');

const KBPS = [24, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
const nearest = k => KBPS.reduce((a, b) => Math.abs(b - k) < Math.abs(a - k) ? b : a, KBPS[0]);
function codecOf(type) {
  const t = String(type || '').toLowerCase();
  if (/mpeg|mp3/.test(t)) return 'MP3';
  if (/aac|mp4|m4a/.test(t)) return 'AAC';
  if (/flac/.test(t)) return 'FLAC';
  if (/opus/.test(t)) return 'OPUS';
  if (/ogg|vorbis/.test(t)) return 'OGG';
  return '';
}
// a title in UTF-8, or Latin-1 when that's what the station sends
function decodeTitle(buf) {
  let s = buf.toString('utf8');
  if (s.includes('�')) s = buf.toString('latin1');
  const m = /StreamTitle='([\s\S]*?)';/.exec(s);
  return m ? m[1].replace(/\s+/g, ' ').trim().slice(0, 200) : null;
}

function createRadioProxy({ net, log, onMeta, agent }) {
  const token = crypto.randomBytes(16).toString('hex');
  let server = null, port = 0, starting = null;

  function start() {
    if (port) return Promise.resolve(port);
    if (starting) return starting;
    starting = new Promise((ok, no) => {
      server = http.createServer(handle);
      server.on('error', err => { log('radio proxy: ' + err.message); no(err); });
      server.listen(0, '127.0.0.1', () => { port = server.address().port; ok(port); });
    }).catch(() => { starting = null; return 0; });
    return starting;
  }

  function handle(req, res) {
    let u;
    try { u = new URL(req.url, 'http://127.0.0.1'); } catch (_) { res.writeHead(400); return res.end(); }
    if (req.method !== 'GET' || u.pathname !== '/r/' + token) { res.writeHead(404); return res.end(); }
    const target = u.searchParams.get('u') || '', id = (u.searchParams.get('id') || '').slice(0, 20);
    if (!/^https?:\/\//i.test(target) || target.length > 1200) { res.writeHead(400); return res.end(); }

    let up, closed = false;
    const stop = () => { if (closed) return; closed = true; try { up && up.abort(); } catch (_) {} try { res.end(); } catch (_) {} };
    req.on('close', stop);
    try {
      up = net.request({ url: target, redirect: 'follow' });
      up.setHeader('Icy-MetaData', '1');
      up.setHeader('User-Agent', agent);
    } catch (err) { log('radio proxy: ' + err.message); res.writeHead(502); return res.end(); }

    up.on('response', r => {
      if (closed) return;
      const one = k => { const v = r.headers[k]; return Array.isArray(v) ? v[0] : v; };
      if (r.statusCode >= 400) { res.writeHead(r.statusCode); return stop(); }
      const type = String(one('content-type') || 'audio/mpeg');
      if (/mpegurl|m3u|text\/html/i.test(type)) { res.writeHead(415); return stop(); }   // a playlist or a page: not a stream
      res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
      const metaint = parseInt(one('icy-metaint'), 10) || 0;
      const said = parseInt(one('icy-br'), 10) || 0;
      onMeta({ id, codec: codecOf(type), kbps: said > 0 && said <= 1500 ? said : 0 });
      // the bitrate, when the station doesn't say it: the audio that arrives between 4 s and 12 s (the first
      // seconds come in a burst, to fill the player)
      const t0 = Date.now(); let b4 = -1, measured = said > 0, audioBytes = 0;
      let left = metaint, metaLeft = -1, meta = [], lastTitle = null;
      r.on('data', chunk => {
        if (closed) return;
        const out = [];
        let i = 0;
        while (i < chunk.length) {
          if (!metaint) { out.push(chunk.subarray(i)); break; }
          if (metaLeft < 0 && left > 0) { const n = Math.min(left, chunk.length - i); out.push(chunk.subarray(i, i + n)); i += n; left -= n; continue; }
          if (metaLeft < 0) { metaLeft = chunk[i] * 16; i++; meta = []; if (!metaLeft) { metaLeft = -1; left = metaint; } continue; }
          const n = Math.min(metaLeft, chunk.length - i); meta.push(chunk.subarray(i, i + n)); i += n; metaLeft -= n;
          if (!metaLeft) {
            metaLeft = -1; left = metaint;
            const title = decodeTitle(Buffer.concat(meta));
            if (title !== null && title !== lastTitle) { lastTitle = title; onMeta({ id, title }); }
          }
        }
        for (const a of out) { audioBytes += a.length; res.write(a); }
        if (!measured) {
          const ms = Date.now() - t0;
          if (ms >= 4000 && b4 < 0) b4 = audioBytes;
          else if (ms >= 12000 && b4 >= 0) { measured = true; onMeta({ id, kbps: nearest((audioBytes - b4) * 8 / (ms - 4000)), measured: true }); }
        }
      });
      r.on('end', stop);
      r.on('error', stop);
    });
    up.on('error', err => {
      log('radio proxy: ' + (err && err.message || err) + ' · ' + target.slice(0, 100));
      if (!res.headersSent) { try { res.writeHead(502); } catch (_) {} }
      stop();
    });
    up.end();
  }

  return {
    start,
    url: (target, id) => port ? 'http://127.0.0.1:' + port + '/r/' + token + '?u=' + encodeURIComponent(target) + '&id=' + encodeURIComponent(String(id)) : null,
    stop: () => { try { server && server.close(); } catch (_) {} },
  };
}

module.exports = { createRadioProxy, codecOf, decodeTitle };
