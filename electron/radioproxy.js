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
// what an Ogg stream carries, from its first page (7.10.7): FLAC (lossless) or Opus; Vorbis stays OGG
function sniff(buf) {
  if (buf.subarray(0, 4).toString('latin1') !== 'OggS') return buf.subarray(0, 4).toString('latin1') === 'fLaC' ? 'FLAC' : '';
  const s = buf.toString('latin1');
  return s.includes('\x7FFLAC') ? 'FLAC' : s.includes('OpusHead') ? 'OPUS' : '';
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

    // 7.10.7: when the station's connection breaks while the page is still listening, the proxy asks again for the
    // same stream and carries on in the same answer, so the player (with seconds of sound ahead) never notices: up
    // to 4 tries a break (0.5, 1, 2, 3 s apart), for MP3 and AAC, whose frames a decoder picks up anywhere. Ogg
    // and FLAC start with a header the player only takes once, so they end as before (the page tunes again)
    let up = null, closed = false, sent = false, tries = 0, type = '', bridged = 0;
    // 7.10.7: the cushion. The player can't be told to wait, so the proxy waits for it: it holds the station's first
    // 3 s (most send 4 s at once, so there's no wait) and then hands them over at once; the player keeps them ahead
    // from then on, against a slow moment of the internet or a break in the stream. And how the stream is doing:
    // the seconds of sound handed over minus the seconds played since (the "ahead"), every second, for SIGNAL
    let held = [], heldBytes = 0, flowing = false, rate = 0, firstAt = 0, handed = 0, aheadTimer = 0;
    const HOLD = 3;
    const hand = a => { handed += a.length; try { res.write(a); } catch (_) {} };
    const ahead = () => {
      if (!rate || !firstAt) return null;
      let a = handed * 8 / (rate * 1000) - (Date.now() - firstAt) / 1000;
      if (a < 0) { firstAt -= -a * 1000; a = 0; }                   // it ran dry and the player waited
      return Math.round(a * 10) / 10;
    };
    const flow = () => {
      if (flowing || closed) return;
      flowing = true; firstAt = Date.now();
      for (const a of held) hand(a);
      held = []; heldBytes = 0;
      aheadTimer = setInterval(() => { const a = ahead(); if (a !== null && !closed) onMeta({ id, ahead: a }); }, 1000);
    };
    const stop = () => { if (closed) return; closed = true; clearInterval(aheadTimer); try { up && up.abort(); } catch (_) {} try { res.end(); } catch (_) {} };
    req.on('close', stop);
    const again = why => {
      if (closed) return;
      try { up && up.abort(); } catch (_) {}
      if (!sent || !/^(MP3|AAC)$/.test(codecOf(type)) || tries >= 4) {
        if (sent) log('radio proxy: ' + why + ', gave up · ' + target.slice(0, 100));
        return stop();
      }
      const wait = [500, 1000, 2000, 3000][tries++];
      log('radio proxy: ' + why + ', asking again in ' + wait + ' ms · ' + target.slice(0, 100));
      setTimeout(connect, wait);
    };
    function connect() {
      if (closed) return;
      try {
        up = net.request({ url: target, redirect: 'follow' });
        up.setHeader('Icy-MetaData', '1');
        up.setHeader('User-Agent', agent);
      } catch (err) { log('radio proxy: ' + err.message); if (!sent) { res.writeHead(502); return res.end(); } return again(err.message); }
      const mine = up;
      mine.on('response', r => {
        if (closed || mine !== up) return;
        const one = k => { const v = r.headers[k]; return Array.isArray(v) ? v[0] : v; };
        const kind = String(one('content-type') || 'audio/mpeg');
        if (r.statusCode >= 400 || /mpegurl|m3u|text\/html/i.test(kind)) {      // a playlist or a page: not a stream
          if (sent) return again('HTTP ' + r.statusCode);
          res.writeHead(r.statusCode >= 400 ? r.statusCode : 415); return stop();
        }
        const metaint = parseInt(one('icy-metaint'), 10) || 0;
        const said = parseInt(one('icy-br'), 10) || 0;
        if (!sent) {
          type = kind; sent = true;
          res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
          onMeta({ id, codec: codecOf(type), kbps: said > 0 && said <= 1500 ? said : 0 });
          rate = said > 0 && said <= 1500 ? said : 0;
          const most = setTimeout(flow, HOLD * 1000);                  // a slow station: what came in 3 s
          res.on('close', () => clearTimeout(most));
        } else { bridged++; log('radio proxy: back (' + bridged + ') · ' + target.slice(0, 100)); onMeta({ id, bridged }); }
        // the bitrate, when the station doesn't say it: the audio that arrives between 4 s and 12 s (the first
        // seconds come in a burst, to fill the player)
        const t0 = Date.now(); let b4 = -1, measured = said > 0 || bridged > 0, audioBytes = 0, sniffed = bridged > 0;
        let left = metaint, metaLeft = -1, meta = [], lastTitle = null;
        r.on('data', chunk => {
          if (closed || mine !== up) return;
          tries = 0;                                                 // sound again: a later break gets its tries anew
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
          // 7.10.7: Ogg says what it carries in its first page: FLAC or Opus (both sent as "application/ogg")
          if (!sniffed && out.length) { sniffed = true; const c = sniff(Buffer.concat(out).subarray(0, 512)); if (c && c !== codecOf(type)) onMeta({ id, codec: c }); }
          for (const a of out) {
            audioBytes += a.length;
            if (flowing) hand(a);
            else { held.push(a); heldBytes += a.length; if (heldBytes * 8 / ((rate || (/FLAC/.test(codecOf(type)) ? 900 : 128)) * 1000) >= HOLD) flow(); }
          }
          if (!measured) {
            const ms = Date.now() - t0;
            if (ms >= 4000 && b4 < 0) b4 = audioBytes;
            else if (ms >= 12000 && b4 >= 0) {
              measured = true;
              const k = (audioBytes - b4) * 8 / (ms - 4000);
              if (!rate) rate = k;                                       // the exact rate, for the "ahead"
              onMeta({ id, kbps: nearest(k), measured: true });
            }
          }
        });
        r.on('end', () => { if (mine === up) again('the station ended the stream'); });
        r.on('error', err => { if (mine === up) again((err && err.message) || 'error'); });
      });
      mine.on('error', err => {
        if (mine !== up) return;
        if (!sent) {
          log('radio proxy: ' + (err && err.message || err) + ' · ' + target.slice(0, 100));
          try { res.writeHead(502); } catch (_) {}
          return stop();
        }
        again((err && err.message) || String(err));
      });
      mine.end();
    }
    connect();
  }

  return {
    start,
    url: (target, id) => port ? 'http://127.0.0.1:' + port + '/r/' + token + '?u=' + encodeURIComponent(target) + '&id=' + encodeURIComponent(String(id)) : null,
    stop: () => { try { server && server.close(); } catch (_) {} },
  };
}

module.exports = { createRadioProxy, codecOf, decodeTitle, sniff };
