// Music files with the tags a test asks for (7.10.24), made from the fixtures' sound: an MP3 with an ID3v2.3 tag in
// front, a FLAC with its Vorbis comments, so a pretend library can have the artists and albums it needs.
//   mp3(file, { title, artist, album, albumArtist, track, year }), flac(file, { … }), plain(file) (no tags at all)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FIX = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');
const syncsafe = n => Buffer.from([(n >> 21) & 127, (n >> 14) & 127, (n >> 7) & 127, n & 127]);
function noId3(b) { return b.toString('latin1', 0, 3) === 'ID3' ? b.subarray(10 + ((b[6] & 127) << 21 | (b[7] & 127) << 14 | (b[8] & 127) << 7 | (b[9] & 127))) : b; }
const sound = noId3(fs.readFileSync(path.join(FIX, 'tone.mp3')));

function id3(tags) {
  const frames = [];
  const text = (id, v) => { if (v == null || v === '') return; const body = Buffer.concat([Buffer.from([3]), Buffer.from(String(v), 'utf8')]);
    const h = Buffer.alloc(10); h.write(id, 0, 'latin1'); h.writeUInt32BE(body.length, 4); frames.push(h, body); };
  text('TIT2', tags.title); text('TPE1', tags.artist); text('TPE2', tags.albumArtist); text('TALB', tags.album); text('TRCK', tags.track); text('TYER', tags.year);
  const all = Buffer.concat(frames);
  return Buffer.concat([Buffer.from('ID3', 'latin1'), Buffer.from([3, 0, 0]), syncsafe(all.length), all]);
}
export function mp3(file, tags = {}) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, Buffer.concat([id3(tags), sound])); return file; }
export function plain(file) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, sound); return file; }

// FLAC: its STREAMINFO and frames kept, the comments written new
const flacSrc = fs.readFileSync(path.join(FIX, 'tone-24-96.flac'));
const flacParts = (() => {
  let p = 4, info = null;
  for (;;) { const last = flacSrc[p] & 0x80, type = flacSrc[p] & 0x7F, len = flacSrc.readUIntBE(p + 1, 3); if (type === 0) info = flacSrc.subarray(p + 4, p + 4 + len); p += 4 + len; if (last) break; }
  return { info, frames: flacSrc.subarray(p) };
})();
export function flac(file, tags = {}) {
  const c = [['TITLE', tags.title], ['ARTIST', tags.artist], ['ALBUMARTIST', tags.albumArtist], ['ALBUM', tags.album], ['TRACKNUMBER', tags.track], ['DATE', tags.year]]
    .filter(([, v]) => v != null && v !== '').map(([k, v]) => Buffer.from(k + '=' + v, 'utf8'));
  const vendor = Buffer.from('deck90-test');
  const u32 = n => { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b; };
  const vc = Buffer.concat([u32(vendor.length), vendor, u32(c.length), ...c.flatMap(x => [u32(x.length), x])]);
  const head = (type, len, last) => Buffer.from([(last ? 0x80 : 0) | type, (len >> 16) & 255, (len >> 8) & 255, len & 255]);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.concat([Buffer.from('fLaC'), head(0, flacParts.info.length), flacParts.info, head(4, vc.length, true), vc, flacParts.frames]));
  return file;
}
export const fixture = name => path.join(FIX, name);
