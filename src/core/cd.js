'use strict';
// ═══════════════════════════════════════════════════════════
//  THE CD (core: no screen). The PC's drive through the program's bridge (electron/media.ps1: Windows' own CD
//  audio), or a disc of files played here; the disc's names (MusicBrainz), quick skips that seek once, REPEAT
//  and SHUFFLE. The screens (the car stereo, the rack's DC-90) drive it with cdAsk / cdGo / cdTrack / cdToggle /
//  cdStop and hear back through the hub (core/events.js):
//    'cd'        something changed: the disc, the track, playing or not, the names
//    'cd-disc'   the drive said what's in it        'notice'   a line for the person (a toast)
// ═══════════════════════════════════════════════════════════
// ── the CD: the drive through the bridge; a disc of files plays here ──
const cdAudio = new Audio();
let cdInfo = null, cdState = { state: '', track: 0, pos: 0, at: 0 }, cdFile = 0, cdAsked = 0;
const cdAudioTracks = () => cdInfo && cdInfo.tracks ? cdInfo.tracks.filter(t => t.audio) : [];
const cdFiles = () => cdInfo && cdInfo.files ? cdInfo.files : [];
const cdPlaying = () => ['playing', 'seeking', 'not ready'].includes(cdState.state) || (!cdAudio.paused && !!cdAudio.getAttribute('src'));
const fileUrl = p => 'file:///' + String(p).replace(/\\/g, '/').split('/').map(encodeURIComponent).join('/').replace(/^([A-Za-z])%3A/, '$1:');
const mmss = s => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
function cdAsk() {
  cdInfo = null; cdAsked = performance.now();
  if (!window.cdrom) { cdInfo = { drive: null, none: 'windows' }; deck.emit('cd'); return; }
  window.cdrom.cmd('cd-info'); deck.emit('cd');
}
function cdStop() {
  if (cdState.state === 'playing' || cdState.state === 'paused') window.cdrom && window.cdrom.cmd('cd-stop');
  cdState = { state: '', track: 0, pos: 0, at: 0 };
  cdAudio.pause(); cdAudio.removeAttribute('src'); cdAudio.load();
}
function cdPlayFile(i) {
  const f = cdFiles(); if (!f.length) return;
  cdFile = (i + f.length) % f.length;
  cdAudio.src = fileUrl(f[cdFile]);
  cdAudio.play().catch(() => deck.notice('⚠ No pude leer ese archivo del disco', 2600));
  deck.emit('cd');
}
// TRACK ◀ ▶: the audio track (or file) before or after, around the disc's ends; ◀ in a track's first 3 s goes to
// the one before, later to the start of the same one. The jump shows at once (quick presses add up), before the
// drive confirms it.
function cdTrack(d) {
  if (cdModes.shuffle) {                                       // SHUFFLE: ▶▶ the next drawn, |◀◀ back the way it came
    const files = cdFiles().length, cur = cdCurrent();
    let t;
    if (d > 0) t = cdAfter(cur, true);
    else if (cdPosition() > 3 || !cdShuf.hist.length) t = cur;
    else { t = cdShuf.hist.pop(); cdShuf.order.unshift(cur); }
    if (t === null || t === undefined) return;
    if (files) cdPlayFile(t); else if (window.cdrom) cdGo(t);
    return;
  }
  if (cdFiles().length) { cdPlayFile(d < 0 && cdAudio.currentTime > 3 ? cdFile : cdFile + d); return; }
  const tr = cdAudioTracks(); if (!tr.length || !window.cdrom) return;
  const cur = cdState.track || tr[0].n;
  let i = tr.findIndex(t => t.n === cur); if (i < 0) i = 0;
  if (!(d < 0 && cdPosition() > 3)) i = (i + d + tr.length) % tr.length;
  cdGo(tr[i].n);
}
// The disc's names (7.9.5): album, artist and each song, looked up by the program from the disc's table of
// contents (MusicBrainz). Until they come, or for a disc that isn't there, the tracks are numbers as before.
let cdNames = null, cdNamesFor = '';
function cdNamesAsk(info) {
  const key = info && info.present && Array.isArray(info.tracks) ? info.tracks.map(t => t.start || 0).join(',') + '|' + (info.leadout || 0) : '';
  if (key === cdNamesFor) return;
  cdNamesFor = key; cdNames = null;
  if (!key || !info.leadout || !window.cdrom || !window.cdrom.names) return;
  window.cdrom.names({ tracks: info.tracks, leadout: info.leadout }).then(r => {
    if (cdNamesFor !== key || !r || !r.tracks) return;
    cdNames = r;
    radioLog('cd: ' + r.artist + ' – ' + r.album);
    deck.notice('CD · <span>' + String(r.artist).replace(/[<>&]/g, '') + '</span> · ' + String(r.album).replace(/[<>&]/g, ''), 3000);
    deck.emit('cd');
  }).catch(() => {});
}
// REPEAT and SHUFFLE (7.9.14), from the DC-90's keys: repeat 'off' | 'all' (the disc over again) | 'one' (the same
// song), shuffle draws the disc in a random order, each song once (then again with REPEAT, or the end). A drive
// plays a disc straight through by itself, so near the end of a song the program jumps where these modes say,
// only when that isn't the song that comes next anyway (no gap then).
const cdModes = (() => { try { const m = JSON.parse(localStorage.getItem('deck90-cdmodes')) || {};
  return { repeat: ['all', 'one'].includes(m.repeat) ? m.repeat : 'off', shuffle: m.shuffle === true }; } catch (_) { return { repeat: 'off', shuffle: false }; } })();
let cdShuf = { order: [], hist: [] }, cdEndDone = '';
function cdModesSave() { try { localStorage.setItem('deck90-cdmodes', JSON.stringify(cdModes)); } catch (_) {} }
const cdList = () => cdFiles().length ? cdFiles().map((_, i) => i) : cdAudioTracks().map(t => t.n);
const cdCurrent = () => cdFiles().length ? cdFile : (cdState.track || (cdAudioTracks()[0] || {}).n);
function cdShuffleDeal(cur) {
  const L = cdList().filter(n => n !== cur);
  for (let i = L.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [L[i], L[j]] = [L[j], L[i]]; }
  cdShuf.order = L;
}
function cdShuffleStart() { cdShuf = { order: [], hist: [] }; cdShuffleDeal(cdCurrent()); }
// the song after this one: by hand (▶▶) or at its end; null = the disc ends
function cdAfter(cur, byHand) {
  const L = cdList(); if (!L.length) return null;
  if (!byHand && cdModes.repeat === 'one') return cur;
  if (cdModes.shuffle) {
    if (!cdShuf.order.length) { if (!byHand && cdModes.repeat === 'off') return null; cdShuffleDeal(cur); if (!cdShuf.order.length) return cur; }
    cdShuf.hist.push(cur); return cdShuf.order.shift();
  }
  const i = L.indexOf(cur);
  if (i >= 0 && i < L.length - 1) return L[i + 1];
  return byHand || cdModes.repeat !== 'off' ? L[0] : null;
}
// the drive: near the end of each song, go where the modes say if that isn't where the disc goes by itself
setInterval(() => {
  if (cdFiles().length || cdState.state !== 'playing' || cdJump || !window.cdrom) return;
  const tr = cdAudioTracks(), i = tr.findIndex(t => t.n === cdState.track); if (i < 0 || !tr[i].len) return;
  const key = String(cdState.track), pos = cdPosition();      // once per play of a song (it starts over: again)
  if (pos < tr[i].len - 2) { if (cdEndDone === key) cdEndDone = ''; return; }
  if (cdEndDone === key || pos < tr[i].len - 0.35) return;
  cdEndDone = key;
  const natural = i < tr.length - 1 ? tr[i + 1].n : null;
  if (cdModes.repeat === 'off' && !cdModes.shuffle) return;
  const want = cdAfter(cdState.track, false);
  if (want === natural) return;
  if (want === null) { window.cdrom.cmd('cd-stop'); cdState = { state: 'stopped', track: cdState.track, pos: 0, at: performance.now() }; deck.emit('cd'); return; }
  cdGo(want);
}, 200);
const cdSongName = n => cdNames && cdNames.tracks && cdNames.tracks[n] ? cdNames.tracks[n] : null;
let cdJump = null;                                             // the track asked for, until the drive is there
// A jump shows at once; the drive gets it at once too, unless it's one of quick presses in a row (|◀◀ ▶▶| ▶▶|):
// then only the last one goes, 0.25 s after the presses stop, so the drive seeks once instead of on every press.
let cdGoT = 0, cdGoAt = 0;
function cdGo(n) {
  const now = performance.now(), send = () => { cdGoT = 0; window.cdrom.cmd('cd-play ' + n); cdJump = { n, until: performance.now() + 4000 }; };
  clearTimeout(cdGoT);
  if (now - cdGoAt > 600) send(); else cdGoT = setTimeout(send, 250);
  cdGoAt = now;
  cdJump = { n, until: now + 4600 };
  cdState = { state: 'seeking', track: n, pos: 0, at: now };
  deck.emit('cd');
}
function cdToggle() {
  if (cdFiles().length) { if (cdAudio.paused) { if (cdAudio.getAttribute('src')) cdAudio.play().catch(() => {}); else cdPlayFile(0); } else cdAudio.pause(); return; }
  const tr = cdAudioTracks(); if (!tr.length || !window.cdrom) return;
  if (cdState.state === 'paused') window.cdrom.cmd('cd-resume');
  else if (cdPlaying()) window.cdrom.cmd('cd-pause');
  else cdGo(cdState.track || tr[0].n);
}
function cdPosition() {
  if (cdFiles().length) return cdAudio.currentTime || 0;
  return cdState.pos + (cdState.state === 'playing' ? (performance.now() - cdState.at) / 1000 : 0);   // between the drive's reports
}
if (window.cdrom) window.cdrom.on(m => {
  if (!m || typeof m !== 'object') return;
  if (m.error) { deck.notice('⚠ CD: ' + String(m.error).replace(/[<>&]/g, '').slice(0, 120), 3600); return; }
  if ('drive' in m) {                                          // what's in the drive: the CD starts, as in a car
    cdInfo = m;
    cdNamesAsk(m);
    cdShuf = { order: [], hist: [] };                          // a new disc: a new draw
    if (cdModes.shuffle) cdShuffleDeal(cdAudioTracks().length ? cdAudioTracks()[0].n : 0);
    deck.emit('cd-disc');                                      // (the stereo in CD mode plays it; the DC-90 may be waiting)
    deck.emit('cd'); return;
  }
  if (m.state) {
    if (m.state === 'ejected') { cdInfo = { drive: cdInfo && cdInfo.drive, present: false }; cdState = { state: '', track: 0, pos: 0, at: 0 }; }
    else if (cdJump && m.track !== cdJump.n && performance.now() < cdJump.until && ['playing', 'seeking', 'not ready'].includes(m.state)) {
      cdState = { state: 'seeking', track: cdJump.n, pos: 0, at: performance.now() };   // still on the way: a report from before the jump
    } else {
      if (cdJump && (m.track === cdJump.n || performance.now() >= cdJump.until)) cdJump = null;
      cdState = { state: m.state, track: m.track | 0, pos: m.pos || 0, at: performance.now() };
    }
    deck.emit('cd');
  }
});
cdAudio.addEventListener('ended', () => { const t = cdAfter(cdFile, false); if (t === null) { cdAudio.currentTime = 0; deck.emit('cd'); } else cdPlayFile(t); });
['play', 'pause'].forEach(ev => cdAudio.addEventListener(ev, () => deck.emit('cd')));
