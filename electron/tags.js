'use strict';
// What a music file says about itself (7.10.24), for the DM-90's PC and USB sources (localmusic.js): its title,
// artists, album, track and disc numbers, year, length, format and quality, and where its embedded cover is. Only the
// headers are read (a few small reads, never the sound): ID3v2 (and ID3v1) with the MPEG frame and its Xing/VBRI
// header, FLAC's metadata blocks, MP4/M4A's boxes (iTunes tags), Ogg Vorbis and Opus comments, WAV's fmt, LIST INFO
// and id3 chunks, and raw AAC (ADTS).
//   readTags(file) → { title, artist, artists, albumArtist, album, n, disc, year, comp, len, codec, container, kbps,
//                      rate, bits, ch, playable, pic: { at, len, mime } | null } or null (not music, or unreadable)
//   readPicture(file, pic) → Buffer of the cover (pic as readTags gave it)
const fs = require('fs');

const MAX_READ = 16 * 1024 * 1024;                               // a tag bigger than this is not read whole

// reads from a file through a window of its bytes (one read covers many small asks)
class Reader {
  constructor(fh, size) { this.fh = fh; this.size = size; this.at = 0; this.buf = Buffer.alloc(0); }
  async get(pos, len) {
    if (pos < 0 || len < 0 || pos >= this.size) return Buffer.alloc(0);
    len = Math.min(len, this.size - pos);
    if (pos >= this.at && pos + len <= this.at + this.buf.length) return this.buf.subarray(pos - this.at, pos - this.at + len);
    const want = Math.min(this.size - pos, Math.max(len, 65536));
    const b = Buffer.alloc(want);
    const { bytesRead } = await this.fh.read(b, 0, want, pos);
    this.at = pos; this.buf = b.subarray(0, bytesRead);
    return this.buf.subarray(0, Math.min(len, bytesRead));
  }
}

// ── text ──
const clean = s => String(s || '').replace(/\u0000+$/g, '').replace(/[\u0000-\u001f]/g, ' ').trim();
function utf16(b, be) {
  if (b.length >= 2 && ((b[0] === 0xFF && b[1] === 0xFE) || (b[0] === 0xFE && b[1] === 0xFF))) { be = b[0] === 0xFE; b = b.subarray(2); }
  b = b.subarray(0, b.length & ~1);
  if (!be) return b.toString('utf16le');
  const c = Buffer.from(b); c.swap16(); return c.toString('utf16le');
}
function decode(b, enc) {
  if (enc === 1) return utf16(b, false);
  if (enc === 2) return utf16(b, true);
  if (enc === 3) return b.toString('utf8');
  return b.toString('latin1');
}
// where a string of an ID3 encoding ends (its terminator: one zero, or two for UTF-16)
function zeroAt(b, from, enc) {
  if (enc === 1 || enc === 2) { for (let i = from; i + 1 < b.length; i += 2) if (b[i] === 0 && b[i + 1] === 0) return i; return b.length; }
  const i = b.indexOf(0, from); return i < 0 ? b.length : i;
}
const numberOf = v => { const m = /^\s*(\d{1,4})/.exec(String(v || '')); return m ? Number(m[1]) : 0; };
const yearOf = v => { const m = /(\d{4})/.exec(String(v || '')); const y = m ? Number(m[1]) : 0; return y >= 1000 && y <= 2999 ? y : 0; };

// the tags as one record, whatever they were called in the file
function blank() { return { title: '', artists: [], albumArtist: '', album: '', n: 0, disc: 0, year: 0, comp: false, pic: null }; }
function put(t, key, value) {
  const v = clean(value); if (!v) return;
  switch (key) {
    case 'title': if (!t.title) t.title = v; break;
    case 'artist': for (const a of v.split(/\u0000/).map(clean).filter(Boolean)) if (!t.artists.includes(a)) t.artists.push(a); break;
    case 'albumartist': if (!t.albumArtist) t.albumArtist = v; break;
    case 'album': if (!t.album) t.album = v; break;
    case 'track': if (!t.n) t.n = numberOf(v); break;
    case 'disc': if (!t.disc) t.disc = numberOf(v); break;
    case 'year': if (!t.year) t.year = yearOf(v); break;
    case 'comp': t.comp = t.comp || /^(1|true|yes)$/i.test(v); break;
  }
}
// Vorbis comments (FLAC, Ogg): their names
const VORBIS = { TITLE: 'title', ARTIST: 'artist', ALBUMARTIST: 'albumartist', 'ALBUM ARTIST': 'albumartist', ALBUM_ARTIST: 'albumartist',
  ALBUM: 'album', TRACKNUMBER: 'track', DISCNUMBER: 'disc', DATE: 'year', YEAR: 'year', ORIGINALDATE: 'year', COMPILATION: 'comp' };
function vorbisComments(b, t, off = 0) {
  if (b.length < off + 8) return;
  const vlen = b.readUInt32LE(off); let p = off + 4 + vlen;
  if (p + 4 > b.length) return;
  const count = b.readUInt32LE(p); p += 4;
  for (let i = 0; i < count && p + 4 <= b.length; i++) {
    const len = b.readUInt32LE(p); p += 4;
    if (p + len > b.length) break;
    const s = b.toString('utf8', p, p + len); p += len;
    const eq = s.indexOf('='); if (eq < 1) continue;
    const k = s.slice(0, eq).toUpperCase(), v = s.slice(eq + 1);
    if (k === 'METADATA_BLOCK_PICTURE' && !t._picData) {        // Ogg's cover: a FLAC picture block in base64
      try { const pb = Buffer.from(v, 'base64'), pic = flacPicture(pb, 0); if (pic) t._picData = pb.subarray(pic.at, pic.at + pic.len), t._picMime = pic.mime; } catch (_) {}
    } else if (VORBIS[k]) put(t, VORBIS[k], v);
  }
}
// a FLAC PICTURE block (type, mime, description, size, data): where its data is and what it is
function flacPicture(b, off) {
  if (b.length < off + 32) return null;
  const type = b.readUInt32BE(off), ml = b.readUInt32BE(off + 4); let p = off + 8;
  if (p + ml + 4 > b.length) return null;
  const mime = b.toString('latin1', p, p + ml); p += ml;
  const dl = b.readUInt32BE(p); p += 4 + dl + 16;
  if (p + 4 > b.length) return null;
  const len = b.readUInt32BE(p); p += 4;
  return { type, mime: mime || 'image/jpeg', at: p, len };
}

// ── ID3v2 ──
const syncsafe = (b, i) => (b[i] & 127) << 21 | (b[i + 1] & 127) << 14 | (b[i + 2] & 127) << 7 | (b[i + 3] & 127);
const ID3_TEXT = { TIT2: 'title', TT2: 'title', TPE1: 'artist', TP1: 'artist', TPE2: 'albumartist', TP2: 'albumartist', TALB: 'album', TAL: 'album',
  TRCK: 'track', TRK: 'track', TPOS: 'disc', TPA: 'disc', TYER: 'year', TYE: 'year', TDRC: 'year', TORY: 'year', TDOR: 'year', TCMP: 'comp', TCP: 'comp' };
// the tag at `at` (10 bytes of header there): its length (0 when there's none) and what it says, into t
async function id3v2(r, at, t) {
  const h = await r.get(at, 10);
  if (h.length < 10 || h.toString('latin1', 0, 3) !== 'ID3' || h[3] < 2 || h[3] > 4) return 0;
  const v = h[3], flags = h[5], size = syncsafe(h, 6), total = 10 + size + (flags & 16 ? 10 : 0);
  if (size > MAX_READ) return total;
  let body = await r.get(at + 10, size), base = at + 10, direct = true;
  if (flags & 0x80 && v < 4) {                                   // the whole tag unsynchronised (v2.2, v2.3): undone, covers not read in place
    const out = []; for (let i = 0; i < body.length; i++) { out.push(body[i]); if (body[i] === 0xFF && body[i + 1] === 0) i++; }
    body = Buffer.from(out); direct = false;
  }
  let p = 0;
  if (flags & 0x40 && v >= 3) p = v === 4 ? syncsafe(body, 0) : body.readUInt32BE(0) + 4;   // an extended header
  const idLen = v === 2 ? 3 : 4, hLen = v === 2 ? 6 : 10;
  const okId = (i) => i + idLen <= body.length && /^[A-Z0-9]+$/.test(body.toString('latin1', i, i + idLen));
  let best = null;
  while (p + hLen <= body.length && okId(p)) {
    const id = body.toString('latin1', p, p + idLen);
    let len = v === 2 ? body.readUIntBE(p + 3, 3) : v === 4 ? syncsafe(body, p + 4) : body.readUInt32BE(p + 4);
    if (v === 4) {                                               // some writers put plain sizes in v2.4: the one that leads to a frame
      const plain = body.readUInt32BE(p + 4), next = p + hLen + len;
      if ((body[p + 4] & 0x80 || (next < body.length && body[next] !== 0 && !okId(next))) && (p + hLen + plain >= body.length || body[p + hLen + plain] === 0 || okId(p + hLen + plain))) len = plain;
    }
    const fflags = v >= 3 ? body.readUInt16BE(p + 8) : 0, start = p + hLen;
    if (len <= 0 || start + len > body.length) break;
    // v2.4 frames may be unsynchronised, compressed or carry a length of their own: only plain ones are read
    const odd = v === 4 ? fflags & 0x0F : v === 3 ? fflags & 0xC0 : 0;
    const f = body.subarray(start, start + len);
    if (!odd && ID3_TEXT[id] && f.length > 1) {
      let s = decode(f.subarray(1), f[0]);
      if (ID3_TEXT[id] !== 'artist') s = s.split('\u0000')[0];
      put(t, ID3_TEXT[id], s);
    } else if (!odd && (id === 'APIC' || id === 'PIC') && f.length > 4) {
      const enc = f[0]; let q = 1, mime;
      if (id === 'PIC') { const fmt = f.toString('latin1', 1, 4).toLowerCase(); mime = fmt === 'png' ? 'image/png' : 'image/jpeg'; q = 4; }
      else { const z = f.indexOf(0, 1); mime = f.toString('latin1', 1, z < 0 ? 1 : z) || 'image/jpeg'; q = z + 1; if (!/\//.test(mime)) mime = 'image/' + (/png/i.test(mime) ? 'png' : 'jpeg'); }
      const type = f[q]; q = zeroAt(f, q + 1, enc) + (enc === 1 || enc === 2 ? 2 : 1);
      if (q < f.length && (!best || (type === 3 && best.type !== 3))) best = { type, mime, at: base + start + q, len: f.length - q, data: direct ? null : f.subarray(q) };
    }
    p = start + len;
  }
  if (best) { if (best.data) { t._picData = best.data; t._picMime = best.mime; } else t.pic = { at: best.at, len: best.len, mime: best.mime }; }
  return total;
}
// ID3v1 at the end: only when the file had nothing better
async function id3v1(r, t) {
  if (r.size < 128) return;
  const b = await r.get(r.size - 128, 128);
  if (b.toString('latin1', 0, 3) !== 'TAG') return;
  const s = (i, n) => b.toString('latin1', i, i + n).replace(/\u0000.*$/, '').trim();
  put(t, 'title', s(3, 30)); put(t, 'artist', s(33, 30)); put(t, 'album', s(63, 30)); put(t, 'year', s(93, 4));
  if (b[125] === 0 && b[126]) put(t, 'track', String(b[126]));
}

// ── MPEG audio (MP3) ──
const MP3_KBPS = { // [version 1 | 2][layer 1..3]
  1: [null, [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448], [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384], [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320]],
  2: [null, [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256], [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160], [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160]],
};
const MP3_RATE = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] };
function mpegHeader(b, i) {
  if (i + 4 > b.length || b[i] !== 0xFF || (b[i + 1] & 0xE0) !== 0xE0) return null;
  const ver = (b[i + 1] >> 3) & 3, layer = 4 - ((b[i + 1] >> 1) & 3), bi = b[i + 2] >> 4, si = (b[i + 2] >> 2) & 3;
  if (ver === 1 || layer === 4 || bi === 0 || bi === 15 || si === 3) return null;
  const kbps = MP3_KBPS[ver === 3 ? 1 : 2][layer][bi], rate = MP3_RATE[ver][si], pad = (b[i + 2] >> 1) & 1;
  const spf = layer === 1 ? 384 : layer === 3 && ver !== 3 ? 576 : 1152;
  const len = layer === 1 ? (Math.floor(12 * kbps * 1000 / rate) + pad) * 4 : Math.floor(spf / 8 * kbps * 1000 / rate) + pad;
  return { ver, layer, kbps, rate, spf, len, ch: (b[i + 3] >> 6) === 3 ? 1 : 2 };
}
async function mpeg(r, at, t) {
  const b = await r.get(at, 65536 + 4);
  for (let i = 0; i + 4 < b.length; i++) {
    const h = mpegHeader(b, i); if (!h) continue;
    const n = mpegHeader(b, i + h.len);                          // a real frame has another right after it
    if (!n && i + h.len + 4 <= b.length) continue;
    const start = at + i, end = r.size - (t._v1 ? 128 : 0), side = h.ver === 3 ? (h.ch === 1 ? 21 : 36) : (h.ch === 1 ? 13 : 21);
    let frames = 0, bytes = 0;
    const x = b.toString('latin1', i + side, i + side + 4);
    if (x === 'Xing' || x === 'Info') {
      const fl = b.readUInt32BE(i + side + 4); let q = i + side + 8;
      if (fl & 1) { frames = b.readUInt32BE(q); q += 4; }
      if (fl & 2) bytes = b.readUInt32BE(q);
    } else if (b.toString('latin1', i + 36, i + 40) === 'VBRI') { bytes = b.readUInt32BE(i + 46); frames = b.readUInt32BE(i + 50); }
    let len, kbps;
    if (frames) { len = frames * h.spf / h.rate; kbps = x === 'Info' ? h.kbps : Math.round((bytes || end - start) * 8 / len / 1000); }   // Info: a CBR file says its rate
    else { kbps = h.kbps; len = (end - start) * 8 / (h.kbps * 1000); }
    return { codec: h.layer === 3 ? 'mp3' : 'mp' + h.layer, container: 'mp3', rate: h.rate, ch: h.ch, bits: 0, kbps, len };
  }
  return null;
}

// ── FLAC ──
async function flac(r, at, t) {
  const sig = await r.get(at, 4);
  if (sig.toString('latin1') !== 'fLaC') return null;
  let p = at + 4, info = null;
  for (let k = 0; k < 64; k++) {
    const h = await r.get(p, 4); if (h.length < 4) break;
    const last = h[0] & 0x80, type = h[0] & 0x7F, len = h.readUIntBE(1, 3), body = p + 4;
    if (type === 0) {
      const s = await r.get(body, 34);
      if (s.length >= 18) {
        const rate = (s[10] << 12) | (s[11] << 4) | (s[12] >> 4), ch = ((s[12] >> 1) & 7) + 1, bits = (((s[12] & 1) << 4) | (s[13] >> 4)) + 1;
        const samples = (s[13] & 15) * 2 ** 32 + s.readUInt32BE(14);
        info = { codec: 'flac', container: 'flac', rate, ch, bits, len: rate ? samples / rate : 0 };
      }
    } else if (type === 4 && len <= MAX_READ) vorbisComments(await r.get(body, len), t);
    else if (type === 6 && !t.pic) {
      const pic = flacPicture(await r.get(body, Math.min(len, 65536)), 0);
      if (pic && pic.at + pic.len <= len) t.pic = { at: body + pic.at, len: pic.len, mime: pic.mime };
    }
    p = body + len;
    if (last) break;
  }
  if (info && info.len) info.kbps = Math.round((r.size - p) * 8 / info.len / 1000);
  return info;
}

// ── MP4 / M4A ──
async function boxes(r, from, to) {
  const out = [];
  for (let p = from; p + 8 <= to && out.length < 4000;) {
    const h = await r.get(p, 16); if (h.length < 8) break;
    let size = h.readUInt32BE(0), head = 8;
    const type = h.toString('latin1', 4, 8);
    if (size === 1 && h.length >= 16) { size = Number(h.readBigUInt64BE(8)); head = 16; }
    else if (size === 0) size = to - p;
    if (size < head || p + size > to + 8) break;
    out.push({ type, at: p + head, end: Math.min(to, p + size) });
    p += size;
  }
  return out;
}
const MP4_TEXT = { '\xa9nam': 'title', '\xa9ART': 'artist', aART: 'albumartist', '\xa9alb': 'album', '\xa9day': 'year' };
async function mp4(r, t) {
  const top = await boxes(r, 0, r.size);
  if (!top.length || top[0].type !== 'ftyp') return null;
  const moov = top.find(b => b.type === 'moov'); if (!moov) return null;
  const mdat = top.filter(b => b.type === 'mdat').reduce((n, b) => n + (b.end - b.at), 0);
  const info = { codec: '', container: 'm4a', rate: 0, ch: 0, bits: 0, kbps: 0, len: 0 };
  let avg = 0;
  for (const b of await boxes(r, moov.at, moov.end)) {
    if (b.type === 'mvhd' && !info.len) {
      const m = await r.get(b.at, 32), v1 = m[0] === 1;
      const scale = m.readUInt32BE(v1 ? 20 : 12), dur = v1 ? Number(m.readBigUInt64BE(24)) : m.readUInt32BE(16);
      if (scale) info.len = dur / scale;
    } else if (b.type === 'trak' && !info.codec) {
      const mdia = (await boxes(r, b.at, b.end)).find(x => x.type === 'mdia'); if (!mdia) continue;
      const kids = await boxes(r, mdia.at, mdia.end), hdlr = kids.find(x => x.type === 'hdlr');
      if (!hdlr || (await r.get(hdlr.at + 8, 4)).toString('latin1') !== 'soun') continue;
      const mdhd = kids.find(x => x.type === 'mdhd');
      if (mdhd) { const m = await r.get(mdhd.at, 32), v1 = m[0] === 1, scale = m.readUInt32BE(v1 ? 20 : 12), dur = v1 ? Number(m.readBigUInt64BE(24)) : m.readUInt32BE(16); if (scale && dur) info.len = dur / scale; }
      const minf = kids.find(x => x.type === 'minf'), stbl = minf && (await boxes(r, minf.at, minf.end)).find(x => x.type === 'stbl');
      const stsd = stbl && (await boxes(r, stbl.at, stbl.end)).find(x => x.type === 'stsd'); if (!stsd) continue;
      const entry = (await boxes(r, stsd.at + 8, stsd.end))[0]; if (!entry) continue;
      const e = await r.get(entry.at, 28);
      info.codec = { mp4a: 'aac', alac: 'alac', fLaC: 'flac', Opus: 'opus', 'ac-3': 'ac3', 'ec-3': 'eac3', '.mp3': 'mp3' }[entry.type] || entry.type.toLowerCase();
      info.ch = e.readUInt16BE(16); info.bits = e.readUInt16BE(18); info.rate = e.readUInt32BE(24) >>> 16;
      for (const c of await boxes(r, entry.at + 28, entry.end)) {
        if (c.type === 'esds') {
          const d = await r.get(c.at + 4, Math.min(256, c.end - c.at - 4));
          for (let i = 0; i + 13 < d.length; i++) if (d[i] === 0x04) {          // DecoderConfigDescriptor: its average bitrate
            let q = i + 1; while (d[q] & 0x80 && q < i + 4) q++; q++;
            if (q + 13 <= d.length) { avg = d.readUInt32BE(q + 9); if (d[q] === 0x6B || d[q] === 0x69) info.codec = 'mp3'; }
            break;
          }
        } else if (c.type === 'alac') {
          const a = await r.get(c.at + 4, 24);
          if (a.length >= 24) { info.bits = a[5]; info.ch = a[9]; avg = a.readUInt32BE(16); info.rate = a.readUInt32BE(20) || info.rate; }
        }
      }
    } else if (b.type === 'udta') {
      const meta = (await boxes(r, b.at, b.end)).find(x => x.type === 'meta'); if (!meta) continue;
      const peek = await r.get(meta.at + 4, 4), full = peek.toString('latin1') === 'hdlr' ? 0 : 4;   // a QuickTime meta has no version
      const ilst = (await boxes(r, meta.at + full, meta.end)).find(x => x.type === 'ilst'); if (!ilst) continue;
      for (const item of await boxes(r, ilst.at, ilst.end)) {
        const data = (await boxes(r, item.at, item.end)).find(x => x.type === 'data'); if (!data) continue;
        const at = data.at + 8, len = data.end - at, kind = (await r.get(data.at, 4)).readUInt32BE(0) & 0xFFFFFF;
        if (item.type === 'covr') { if (!t.pic && len > 0) t.pic = { at, len, mime: kind === 14 ? 'image/png' : 'image/jpeg' }; continue; }
        if (len > 65536) continue;
        const v = await r.get(at, len);
        if (MP4_TEXT[item.type]) put(t, MP4_TEXT[item.type], v.toString('utf8'));
        else if ((item.type === 'trkn' || item.type === 'disk') && v.length >= 4) put(t, item.type === 'trkn' ? 'track' : 'disc', String(v.readUInt16BE(2)));
        else if (item.type === 'cpil' && v.length) t.comp = t.comp || v[0] === 1;
      }
    }
  }
  if (!info.codec) return null;
  info.kbps = Math.round(avg ? avg / 1000 : info.len ? mdat * 8 / info.len / 1000 : 0);
  return info;
}

// ── Ogg (Vorbis, Opus, FLAC) ──
async function ogg(r, t) {
  const packets = [], cur = [];
  let p = 0, serial = null;
  while (packets.length < 2 && p < Math.min(r.size, MAX_READ)) {
    const h = await r.get(p, 27);
    if (h.length < 27 || h.toString('latin1', 0, 4) !== 'OggS') break;
    const n = h[26], segs = await r.get(p + 27, n), sid = h.readUInt32LE(14);
    let q = p + 27 + n;
    if (serial === null) serial = sid;
    for (let i = 0; i < n; i++) {
      if (sid === serial) cur.push(await r.get(q, segs[i]).then(b => Buffer.from(b)));
      q += segs[i];
      if (sid === serial && segs[i] < 255) { packets.push(Buffer.concat(cur.splice(0))); if (packets.length >= 2) break; }
    }
    p = q;
  }
  if (!packets.length) return null;
  const id = packets[0], info = { codec: '', container: 'ogg', rate: 0, ch: 0, bits: 0, kbps: 0, len: 0 };
  let pre = 0, scale = 0;
  if (id.toString('latin1', 1, 7) === 'vorbis' && id[0] === 1) { info.codec = 'vorbis'; info.ch = id[11]; info.rate = scale = id.readUInt32LE(12); }
  else if (id.toString('latin1', 0, 8) === 'OpusHead') { info.codec = 'opus'; info.ch = id[9]; pre = id.readUInt16LE(10); info.rate = scale = 48000; }
  else if (id[0] === 0x7F && id.toString('latin1', 1, 5) === 'FLAC') {
    const s = id.subarray(17); info.codec = 'flac';
    info.rate = scale = (s[10] << 12) | (s[11] << 4) | (s[12] >> 4); info.ch = ((s[12] >> 1) & 7) + 1; info.bits = (((s[12] & 1) << 4) | (s[13] >> 4)) + 1;
  } else return null;
  const c = packets[1];
  if (c) {
    if (info.codec === 'vorbis' && c[0] === 3 && c.toString('latin1', 1, 7) === 'vorbis') vorbisComments(c, t, 7);
    else if (info.codec === 'opus' && c.toString('latin1', 0, 8) === 'OpusTags') vorbisComments(c, t, 8);
    else if (info.codec === 'flac' && (c[0] & 0x7F) === 4) vorbisComments(c, t, 4);
  }
  // its length: the last page's granule position
  const tail = await r.get(Math.max(0, r.size - 65536), 65536);
  for (let i = tail.lastIndexOf('OggS'); i >= 0; i = tail.lastIndexOf('OggS', i - 1)) {
    if (i + 18 <= tail.length && tail.readUInt32LE(i + 14) === serial) {
      const g = Number(tail.readBigUInt64LE(i + 6));
      if (scale && g > 0) info.len = Math.max(0, g - pre) / scale;
      break;
    }
  }
  if (info.len) info.kbps = Math.round(r.size * 8 / info.len / 1000);
  return info;
}

// ── WAV ──
const WAV_TEXT = { INAM: 'title', IART: 'artist', IPRD: 'album', ICRD: 'year', ITRK: 'track', IPRT: 'track' };
async function wav(r, t) {
  const h = await r.get(0, 12);
  if (h.toString('latin1', 0, 4) !== 'RIFF' || h.toString('latin1', 8, 12) !== 'WAVE') return null;
  const info = { codec: '', container: 'wav', rate: 0, ch: 0, bits: 0, kbps: 0, len: 0 };
  let byterate = 0, data = 0;
  for (let p = 12, k = 0; p + 8 <= r.size && k < 200; k++) {
    const c = await r.get(p, 8); if (c.length < 8) break;
    const id = c.toString('latin1', 0, 4), len = c.readUInt32LE(4), body = p + 8;
    if (id === 'fmt ') {
      const f = await r.get(body, Math.min(len, 40));
      let tag = f.readUInt16LE(0); info.ch = f.readUInt16LE(2); info.rate = f.readUInt32LE(4); byterate = f.readUInt32LE(8); info.bits = f.readUInt16LE(14);
      if (tag === 0xFFFE && f.length >= 26) tag = f.readUInt16LE(24);
      info.codec = tag === 1 ? (info.bits === 8 ? 'pcm_u8' : 'pcm_s' + info.bits + 'le') : tag === 3 ? 'pcm_f' + info.bits + 'le' : tag === 0x55 ? 'mp3' : 'wav_' + tag;
    } else if (id === 'data') data = Math.min(len, r.size - body);
    else if (id === 'LIST' && len <= 65536) {
      const l = await r.get(body, len);
      if (l.toString('latin1', 0, 4) === 'INFO') for (let q = 4; q + 8 <= l.length;) {
        const sid = l.toString('latin1', q, q + 4), sl = l.readUInt32LE(q + 4);
        if (WAV_TEXT[sid]) put(t, WAV_TEXT[sid], l.toString('utf8', q + 8, Math.min(l.length, q + 8 + sl)).replace(/\u0000.*$/, ''));
        q += 8 + sl + (sl & 1);
      }
    } else if (id === 'id3 ' || id === 'ID3 ') await id3v2(r, body, t);
    if (len > 0xFFFFFFF0) break;
    p = body + len + (len & 1);
  }
  if (!info.codec) return null;
  if (byterate && data) info.len = data / byterate;
  info.kbps = Math.round(byterate * 8 / 1000);
  return info;
}

// ── raw AAC (ADTS) ──
const AAC_RATE = [96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000, 7350];
async function adts(r, at) {
  const b = await r.get(at, 65536);
  let i = 0; while (i + 7 < b.length && !(b[i] === 0xFF && (b[i + 1] & 0xF6) === 0xF0)) i++;
  if (i + 7 >= b.length) return null;
  const rate = AAC_RATE[(b[i + 2] >> 2) & 15], ch = ((b[i + 2] & 1) << 2) | (b[i + 3] >> 6);
  let frames = 0, bytes = 0;
  for (let q = i; q + 7 < b.length && frames < 400; frames++) {
    if (b[q] !== 0xFF || (b[q + 1] & 0xF6) !== 0xF0) break;
    const len = ((b[q + 3] & 3) << 11) | (b[q + 4] << 3) | (b[q + 5] >> 5); if (len < 7) break;
    bytes += len; q += len;
  }
  if (!rate || !frames) return null;
  const per = bytes / frames, len = (r.size - at - i) / per * 1024 / rate;
  return { codec: 'aac', container: 'aac', rate, ch, bits: 0, len, kbps: Math.round(per * 8 * rate / 1024 / 1000) };
}

// what Chromium plays as it is (the same as core/music.js's musicPlayable)
const playable = m => /^(mp3|aac|flac|opus|vorbis)$/.test(m.codec) || /^pcm_(s16le|s24le|s32le|f32le|u8)$/.test(m.codec);

async function readTags(file) {
  let fh;
  try {
    const st = await fs.promises.stat(file);
    if (!st.isFile() || st.size < 64) return null;
    fh = await fs.promises.open(file, 'r');
    const r = new Reader(fh, st.size), t = blank(), ext = (/\.([a-z0-9]+)$/i.exec(file) || [])[1].toLowerCase();
    let info = null;
    if (ext === 'mp3' || ext === 'flac' || ext === 'aac') {
      const tag = await id3v2(r, 0, t);
      if (ext === 'flac') info = await flac(r, tag, t);
      else {
        const end = await r.get(r.size - 128, 3); t._v1 = end.toString('latin1') === 'TAG';
        info = ext === 'aac' ? await adts(r, tag) : await mpeg(r, tag, t);
        if (t._v1 && !t.title) await id3v1(r, t);
      }
    } else if (ext === 'm4a' || ext === 'mp4' || ext === 'm4b') info = await mp4(r, t);
    else if (ext === 'ogg' || ext === 'oga' || ext === 'opus') info = await ogg(r, t);
    else if (ext === 'wav') info = await wav(r, t);
    if (!info) return null;
    const artists = t.artists;
    const out = { title: t.title, artist: artists[0] || '', artists: artists.join(', '), albumArtist: t.albumArtist, album: t.album, n: t.n, disc: t.disc,
      year: t.year, comp: t.comp, len: Math.round((info.len || 0) * 1000) / 1000, codec: info.codec, container: info.container, kbps: info.kbps || 0,
      rate: info.rate || 0, bits: info.bits || 0, ch: info.ch || 0, playable: playable(info), pic: t.pic && t.pic.len > 0 && t.pic.at + t.pic.len <= st.size ? t.pic : null };
    if (!out.pic && t._picData && t._picData.length <= 4 * 1024 * 1024) out.picData = 'data:' + t._picMime + ';base64,' + t._picData.toString('base64');
    return out;
  } catch (_) { return null; } finally { if (fh) await fh.close().catch(() => {}); }
}

async function readPicture(file, pic) {
  if (!pic || !(pic.len > 0) || pic.len > 16 * 1024 * 1024) return null;
  let fh;
  try {
    fh = await fs.promises.open(file, 'r');
    const b = Buffer.alloc(pic.len), { bytesRead } = await fh.read(b, 0, pic.len, pic.at);
    return bytesRead === pic.len ? b : null;
  } catch (_) { return null; } finally { if (fh) await fh.close().catch(() => {}); }
}

module.exports = { readTags, readPicture };
