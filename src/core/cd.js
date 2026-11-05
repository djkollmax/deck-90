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
// 7.9.22: the drive's commands go through here. Windows' CD audio (MCI) has no paused state: after "pause" it says
// "stopped" (at the same place, and "play" goes on from there), so after our own pause a stopped disc is paused
let cdPauseSent = false;
function cdCmd(c) {
  if (c === 'cd-pause') cdPauseSent = true; else if (/^cd-(play|resume|stop|eject|close)/.test(c)) cdPauseSent = false;
  window.cdrom.cmd(c);
}
const mmss = s => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
// 7.10.14: a read that gets no answer in 9 s is asked once more; then the drive is taken as empty, and said so
let cdAskT = 0, cdAskTries = 0;
function cdAsk(again) {
  cdInfo = null; cdAsked = performance.now();
  if (!window.cdrom) { cdInfo = { drive: null, none: 'windows' }; deck.emit('cd'); return; }
  if (!again) cdAskTries = 0;
  clearTimeout(cdAskT);
  cdAskT = setTimeout(() => {
    cdAskT = 0;
    if (cdInfo) return;
    if (++cdAskTries < 2) { radioLog('cd: no answer to cd-info, asking again'); cdAsk(true); return; }
    cdInfo = { drive: '?', present: false }; cdWaitDisc = null;
    deck.notice('⚠ CD · <span>la lectora no contesta</span>: probá OPEN / CLOSE', 3200); deck.emit('cd');
  }, 9000);
  cdCmd('cd-info'); deck.emit('cd');
}
// a jump still waiting to go to the drive (quick presses) is dropped: STOP, POWER, a pause mean it
function cdJumpDrop() { clearTimeout(cdGoT); cdGoT = 0; cdJump = null; }
function cdStop() {
  // 7.10.14: also a disc seeking or spinning up, and one with a jump on its way
  if ((cdState.state && cdState.state !== 'stopped' && cdState.state !== 'closed') || cdJump || cdGoT) window.cdrom && cdCmd('cd-stop');
  cdJumpDrop();
  cdState = { state: '', track: 0, pos: 0, at: 0 };
  cdAudio.pause(); cdAudio.removeAttribute('src'); cdAudio.load();
}
// OPEN / CLOSE (7.10.14, for the DC-90 and the car stereo): the tray opened, or closed and the disc read as soon as the
// drive has it (it spins up first: asked every 2 s, up to 15 s), instead of once after a fixed wait
let cdWaitDisc = null, cdWaitT = 0;
function cdEject() {
  cdStop(); clearTimeout(cdWaitT); cdWaitDisc = null;
  cdCmd('cd-eject');
  cdInfo = { drive: cdInfo && cdInfo.drive, present: false }; deck.emit('cd');
}
function cdClose() {
  cdCmd('cd-close'); clearTimeout(cdWaitT);
  cdWaitDisc = { until: performance.now() + 15000 };
  cdInfo = null; deck.emit('cd');
  cdWaitT = setTimeout(() => cdAsk(), 2000);
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
let cdNames = null, cdNamesFor = '', cdNamesRetry = 0;
function cdNamesAsk(info) {
  const key = info && info.present && Array.isArray(info.tracks) ? info.tracks.map(t => t.start || 0).join(',') + '|' + (info.leadout || 0) : '';
  if (key === cdNamesFor) return;
  cdNamesFor = key; cdNames = null; clearTimeout(cdNamesRetry);
  if (!key || !info.leadout || !window.cdrom || !window.cdrom.names) return;
  window.cdrom.names({ tracks: info.tracks, leadout: info.leadout }).then(r => {
    if (cdNamesFor !== key) return;
    if (r && r.error) {                                        // 7.9.19: MusicBrainz didn't answer: again in a minute,
      cdNamesFor = '';                                         // and on the next read of the disc (OPEN/CLOSE, POWER)
      radioLog('cd names: no answer (' + r.error + '), trying again in 60 s');
      cdNamesRetry = setTimeout(() => { if (cdInfo === info) cdNamesAsk(info); }, 60000);
      return;
    }
    if (!r || !r.tracks) return;
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
const cdModes = (() => { const m = store.read('deck90-cdmodes', {});
  return { repeat: ['all', 'one'].includes(m.repeat) ? m.repeat : 'off', shuffle: m.shuffle === true }; })();
let cdShuf = { order: [], hist: [] }, cdEndDone = '';
function cdModesSave() { store.write('deck90-cdmodes', cdModes); }
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
  if (want === null) { cdCmd('cd-stop'); cdState = { state: 'stopped', track: tr[0].n, pos: 0, at: performance.now() }; deck.emit('cd'); return; }   // over: back at the first song
  cdGo(want);
}, 200);
// 7.10.14: the drive stopped by itself at the end of the disc (its report can beat the jump above): REPEAT and SHUFFLE
// go on from there ('went'); without them the disc is over ('over': back at the first song, as a CD player does)
function cdDiscEnded(prev) {
  const tr = cdAudioTracks(), last = tr[tr.length - 1];
  if (!last || prev.track !== last.n || !last.len || prev.pos + (performance.now() - prev.at) / 1000 < last.len - 3) return '';
  const want = cdModes.repeat === 'off' && !cdModes.shuffle ? null : cdAfter(last.n, false);
  cdEndDone = String(last.n);
  if (want === null || want === undefined) return 'over';
  cdGo(want); return 'went';
}
// a disc told apart from another: its tracks' starts and its end, or its files
const cdDiscKey = i => !i || !i.present ? '' : (i.tracks || []).map(t => t.start || t.len || 0).join(',') + '|' + (i.leadout || 0) + '|' + (i.files || []).length + (i.files && i.files[0] || '');
const cdSongName = n => cdNames && cdNames.tracks && cdNames.tracks[n] ? cdNames.tracks[n] : null;
let cdJump = null;                                             // the track asked for, until the drive is there
// A jump shows at once; the drive gets it at once too, unless it's one of quick presses in a row (|◀◀ ▶▶| ▶▶|):
// then only the last one goes, 0.25 s after the presses stop, so the drive seeks once instead of on every press.
let cdGoT = 0, cdGoAt = 0;
function cdGo(n) {
  const now = performance.now(), send = () => { cdGoT = 0; cdCmd('cd-play ' + n); cdJump = { n, until: performance.now() + 4000 }; };
  clearTimeout(cdGoT);
  if (now - cdGoAt > 600) send(); else cdGoT = setTimeout(send, 250);
  cdGoAt = now;
  cdJump = { n, until: now + 4600 };
  cdState = { state: 'seeking', track: n, pos: 0, at: now };
  deck.emit('cd');
}
// STOP: the disc stops at the start of the song it was on (cdStop, for POWER and the tray, forgets the song)
function cdStopHere() {
  cdJumpDrop();
  if (cdFiles().length) { cdAudio.pause(); cdAudio.currentTime = 0; }
  else if (window.cdrom) { cdCmd('cd-stop'); cdState = { state: 'stopped', track: cdState.track, pos: 0, at: performance.now() }; }
  deck.emit('cd');
}
// a pause from outside (the radio took the sound): the disc waits where it was
function cdPauseHere() {
  const jumping = cdJump || cdGoT;
  cdJumpDrop();
  if (cdFiles().length) { if (!cdAudio.paused) cdAudio.pause(); }
  else if ((cdPlaying() || jumping) && window.cdrom) { cdCmd('cd-pause'); cdState = { state: 'paused', track: cdState.track, pos: cdPosition(), at: performance.now() }; }
  deck.emit('cd');
}
function cdToggle() {
  if (cdFiles().length) { if (cdAudio.paused) { if (cdAudio.getAttribute('src')) cdAudio.play().catch(() => {}); else cdPlayFile(0); } else cdAudio.pause(); return; }
  const tr = cdAudioTracks(); if (!tr.length || !window.cdrom) return;
  if (cdState.state === 'paused') cdCmd('cd-resume');
  else if (cdPlaying()) { cdJumpDrop(); cdCmd('cd-pause'); cdState = { state: 'paused', track: cdState.track, pos: cdPosition(), at: performance.now() }; deck.emit('cd'); }
  else cdGo(cdState.track && tr.some(t => t.n === cdState.track) ? cdState.track : tr[0].n);
}
// 7.9.22: the quality of what the disc plays. An audio CD is PCM, 16 bits at 44.1 kHz ("CD 16/44"); a file says its
// format, with bits and kHz when the file says them (FLAC 24/96, WAV 16/44), or its average kbps (MP3 320), from
// what the main process reads of it (window.cdrom.fileInfo: its size without tags, and the header's rate and bits)
let cdFileInfo = {};                                           // per disc (a new one: read again)
const cdExt = f => (((String(f || '').match(/\.([a-z0-9]{2,4})$/i) || [])[1] || '').toUpperCase().replace('M4A', 'AAC'));
function cdQuality() {
  if (!cdInfo || !cdInfo.present) return '';
  const files = cdFiles();
  if (!files.length) return cdAudioTracks().length ? 'CD 16/44' : '';
  const f = String(files[cdFile] || ''), ext = cdExt(f), i = cdFileInfo[f];
  if (i === undefined && window.cdrom && window.cdrom.fileInfo) {
    cdFileInfo[f] = null;
    window.cdrom.fileInfo(f).then(r => { cdFileInfo[f] = r || {}; deck.emit('cd'); }).catch(() => { cdFileInfo[f] = {}; });
  }
  if (i && i.bits && i.rate) return ext + ' ' + i.bits + '/' + Math.floor(i.rate / 1000);
  const dur = cdAudio.duration;
  if (i && i.audio > 0 && isFinite(dur) && dur > 1 && cdAudio.getAttribute('src')) return ext + ' ' + Math.round(i.audio * 8 / dur / 1000);
  return ext;
}
function cdPosition() {
  if (cdFiles().length) return cdAudio.currentTime || 0;
  return cdState.pos + (cdState.state === 'playing' ? (performance.now() - cdState.at) / 1000 : 0);   // between the drive's reports
}
if (window.cdrom) window.cdrom.on(m => {
  if (!m || typeof m !== 'object') return;
  if (m.error) { deck.notice('⚠ CD: ' + String(m.error).replace(/[<>&]/g, '').slice(0, 120), 3600); return; }
  if ('drive' in m) {                                          // what's in the drive: the CD starts, as in a car
    clearTimeout(cdAskT); cdAskT = 0;
    // 7.10.14: the tray just closed and the disc isn't readable yet: asked again in 2 s (READING meanwhile)
    if (cdWaitDisc && m.drive && !m.present && performance.now() < cdWaitDisc.until) { clearTimeout(cdWaitT); cdWaitT = setTimeout(() => cdAsk(), 2000); return; }
    cdWaitDisc = null;
    const same = cdDiscKey(cdInfo) && cdDiscKey(cdInfo) === cdDiscKey(m);
    cdInfo = m;
    cdNamesAsk(m);
    if (!same) {                                               // a new disc: a new draw, its files' quality read again
      cdShuf = { order: [], hist: [] }; cdFileInfo = {};
      if (cdModes.shuffle) cdShuffleDeal(cdAudioTracks().length ? cdAudioTracks()[0].n : 0);
    }
    deck.emit('cd-disc');                                      // (the stereo in CD mode plays it; the DC-90 may be waiting)
    deck.emit('cd'); return;
  }
  if (m.state) {
    let ended = '';
    // 7.10.14: 'open' is the tray opened with the drive's own button: the disc is gone as with ⏏
    if (m.state === 'ejected' || m.state === 'open') { cdJumpDrop(); cdInfo = { drive: cdInfo && cdInfo.drive, present: false }; cdState = { state: '', track: 0, pos: 0, at: 0 }; }
    else if (m.state === 'stopped' && !cdPauseSent && cdState.state === 'playing' && !cdJump && (ended = cdDiscEnded(cdState)) === 'went') { /* went on (REPEAT, SHUFFLE) */ }
    else if (cdJump && m.track !== cdJump.n && performance.now() < cdJump.until && ['playing', 'seeking', 'not ready'].includes(m.state)) {
      cdState = { state: 'seeking', track: cdJump.n, pos: 0, at: performance.now() };   // still on the way: a report from before the jump
    } else {
      if (cdJump && (m.track === cdJump.n || performance.now() >= cdJump.until)) cdJump = null;
      cdState = { state: m.state === 'stopped' && cdPauseSent ? 'paused' : m.state, track: ended === 'over' ? cdAudioTracks()[0].n : m.track | 0, pos: m.pos || 0, at: performance.now() };
    }
    deck.emit('cd');
  }
});
cdAudio.addEventListener('ended', () => { const t = cdAfter(cdFile, false); if (t === null) { cdAudio.currentTime = 0; deck.emit('cd'); } else cdPlayFile(t); });
['play', 'pause'].forEach(ev => cdAudio.addEventListener(ev, () => deck.emit('cd')));
