// What a music file on a data CD is made of (7.9.22), for the DC-90 and the car stereo: its size without the tags,
// and for FLAC and WAV the sample rate and bits its header says. Reads only the file's first 64 KB.
const fs = require('fs');

const AUDIO = /\.(mp3|m4a|aac|ogg|opus|flac|wav)$/i;
// an ID3v2 tag at the start (MP3s and some FLACs): its whole length, header included
const id3 = b => b.length >= 10 && b.toString('latin1', 0, 3) === 'ID3'
  ? 10 + ((b[6] & 127) << 21 | (b[7] & 127) << 14 | (b[8] & 127) << 7 | (b[9] & 127)) + (b[5] & 16 ? 10 : 0) : 0;

function parse(b, size, name) {
  const out = { size, audio: size };
  const tag = id3(b);
  if (tag) out.audio = Math.max(0, size - tag);
  if (/\.flac$/i.test(name)) {
    const i = tag;                                             // "fLaC", then STREAMINFO (always the first block)
    if (b.length >= i + 26 && b.toString('latin1', i, i + 4) === 'fLaC') {
      const d = i + 8;
      out.rate = (b[d + 10] << 12) | (b[d + 11] << 4) | (b[d + 12] >> 4);
      out.channels = ((b[d + 12] >> 1) & 7) + 1;
      out.bits = (((b[d + 12] & 1) << 4) | (b[d + 13] >> 4)) + 1;
    }
  } else if (/\.wav$/i.test(name) && b.length >= 12 && b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WAVE') {
    for (let i = 12; i + 8 <= b.length;) {                     // the chunks, until "fmt "
      const id = b.toString('latin1', i, i + 4), len = b.readUInt32LE(i + 4);
      if (id === 'fmt ' && i + 24 <= b.length) { out.channels = b.readUInt16LE(i + 10); out.rate = b.readUInt32LE(i + 12); out.bits = b.readUInt16LE(i + 22); break; }
      i += 8 + len + (len & 1);
    }
  }
  if (!(out.rate > 0 && out.rate <= 768000 && out.bits > 0 && out.bits <= 64)) { delete out.rate; delete out.bits; delete out.channels; }
  return out;
}

async function audioFileInfo(file) {
  if (typeof file !== 'string' || file.length > 1024 || !AUDIO.test(file)) return null;
  let fh;
  try {
    const st = await fs.promises.stat(file);
    if (!st.isFile()) return null;
    fh = await fs.promises.open(file, 'r');
    const buf = Buffer.alloc(Math.min(65536, st.size));
    const { bytesRead } = await fh.read(buf, 0, buf.length, 0);
    return parse(buf.subarray(0, bytesRead), st.size, file);
  } catch (_) { return null; } finally { if (fh) await fh.close().catch(() => {}); }
}

module.exports = { audioFileInfo, _parse: parse };
