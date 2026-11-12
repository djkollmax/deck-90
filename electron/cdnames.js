'use strict';
// ═══════════════════════════════════════════════════════════
//  CD NAMES (7.9.5): the album, the artist and each song of an audio CD, from MusicBrainz
//  An audio CD carries no names, only where each track starts. That table of contents identifies the disc:
//  MusicBrainz's disc ID is a SHA-1 of it, and their free database answers with the release, its artist and
//  its tracks (by the exact ID, or by the table of contents when the ID isn't there yet: the closest releases).
//  Only the disc's numbers are sent. Answers are kept in the program's folder, so a disc is looked up once.
// ═══════════════════════════════════════════════════════════
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { readJson, writeJson } = require('./jsonfile');

const hex = (n, w) => (n >>> 0).toString(16).toUpperCase().padStart(w, '0');
// MusicBrainz disc ID: first and last track, the lead-out and the 99 track offsets, as hex, SHA-1, base64 with . _ -
function discId(first, last, leadout, offsets) {
  let s = hex(first, 2) + hex(last, 2) + hex(leadout, 8);
  for (let i = 1; i <= 99; i++) s += hex(offsets[i] || 0, 8);
  return crypto.createHash('sha1').update(s, 'ascii').digest('base64').replace(/\+/g, '.').replace(/\//g, '_').replace(/=/g, '-');
}
// The audio part of the disc: tracks 1..last audio; an enhanced CD's data track after them moves the audio
// lead-out 11400 frames before it (the gap between sessions), as MusicBrainz counts it.
function audioToc(info) {
  const tr = (info && Array.isArray(info.tracks) ? info.tracks : []).filter(t => t && t.start > 0);
  const audio = tr.filter(t => t.audio);
  if (!audio.length || audio[0].n !== 1) return null;
  const last = audio[audio.length - 1].n;
  const next = tr.find(t => t.n === last + 1 && !t.audio);
  const leadout = next ? next.start - 11400 : info.leadout;
  if (!(leadout > audio[audio.length - 1].start)) return null;
  const offsets = [];
  for (const t of audio) offsets[t.n] = t.start;
  return { first: 1, last, leadout, offsets };
}
const credit = ac => (Array.isArray(ac) ? ac : []).map(a => (a.name || (a.artist && a.artist.name) || '') + (a.joinphrase || '')).join('').trim();

function createCdNames({ net, dir, agent, log }) {
  const file = path.join(dir, 'cd-names.json');
  const cache = readJson(file, log);                              // 7.10.16: written whole or not at all (jsonfile.js)
  const save = () => { try { writeJson(file, cache); } catch (_) {} };

  async function fetchJson(url) {
    const ac = new AbortController(), t = setTimeout(() => ac.abort(), 12000);   // MusicBrainz can be slow at busy hours (7.10.14: 12 s, was 30)
    try {
      const r = await net.fetch(url, { signal: ac.signal, headers: { 'User-Agent': agent, Accept: 'application/json' } });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } finally { clearTimeout(t); }
  }

  async function lookup(info) {
    const toc = audioToc(info);
    if (!toc) return null;
    const id = discId(toc.first, toc.last, toc.leadout, toc.offsets);
    const hit = cache[id];
    if (hit && (hit.album || Date.now() - (hit.at || 0) < 24 * 3600e3)) return hit.album ? hit : null;   // not found: try again a day later
    const tocParam = [toc.first, toc.last, toc.leadout].concat(Array.from({ length: toc.last }, (_, i) => toc.offsets[i + 1])).join('+');
    let j = null;
    // 7.9.19: a slow or failed answer is asked again twice (MusicBrainz takes one request a second); still
    // nothing, the page is told it couldn't ask ({ error }), so it tries again later instead of giving up
    for (let attempt = 1; ; attempt++) {
      try {
        j = await fetchJson('https://musicbrainz.org/ws/2/discid/' + encodeURIComponent(id) + '?toc=' + tocParam + '&inc=recordings+artist-credits&fmt=json');
        break;
      } catch (err) {
        const why = err && err.name === 'AbortError' ? 'no answer in 12 s' : (err && err.message || String(err));
        log('cd names: ' + id + ' attempt ' + attempt + ': ' + why);
        if (attempt >= 3) return { error: why };
        await new Promise(ok => setTimeout(ok, 2000 * attempt));
      }
    }
    const releases = j && Array.isArray(j.releases) ? j.releases : [];
    let out = { id, at: Date.now() };
    for (const rel of releases) {
      const media = (rel.media || []).find(m => (m.discs || []).some(d => d.id === id)) ||
        (rel.media || []).find(m => (m['track-count'] || (m.tracks || []).length) === toc.last);
      if (!media || !Array.isArray(media.tracks)) continue;
      const albumArtist = credit(rel['artist-credit']);
      const tracks = {};
      for (const t of media.tracks) {
        const n = t.position || Number(t.number);
        const by = credit(t['artist-credit']) || albumArtist;
        tracks[n] = { title: String(t.title || (t.recording && t.recording.title) || '').slice(0, 200), artist: by.slice(0, 200) };
      }
      out = { id, at: Date.now(), album: String(rel.title || '').slice(0, 200), artist: albumArtist.slice(0, 200), year: String(rel.date || '').slice(0, 4), tracks };
      break;
    }
    cache[id] = out; save();
    log('cd names: ' + id + (out.album ? ' → ' + out.artist + ' – ' + out.album : ' not in MusicBrainz'));
    return out.album ? out : null;
  }
  return { lookup };
}

module.exports = { createCdNames, discId, audioToc };
