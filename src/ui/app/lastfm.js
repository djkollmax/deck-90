'use strict';
// ── LAST.FM (7.10.10): what Deck 90's own sources play goes to the person's Last.fm profile ──
// The radio (a song the station names as "Artist - Song"), the CD (a disc MusicBrainz knows) and the DM-90: "now
// playing" once a song has played 5 s, and a scrobble when it ends having been heard more than half (or 4 minutes;
// a radio song, whose length isn't known, 90 s). What the PC plays isn't sent: Spotify and the other players
// scrobble their own. The main process (electron/lastfm.js) keeps the key and the session and talks to Last.fm.
let lfmState = { hasKey: false, signedIn: false, user: '', waiting: false, sent: 0, queued: 0 }, lfmCur = null;
const lfmEl = id => document.getElementById(id);
async function lfmStatus() {
  if (!window.lastfm) return lfmState;
  lfmState = (await window.lastfm.status().catch(() => null)) || lfmState;
  const b = lfmEl('lfmBtn'); if (b) { b.textContent = lfmState.signedIn ? lfmState.user.toUpperCase() : 'CONECTAR'; b.classList.toggle('on', lfmState.signedIn); }
  return lfmState;
}
lfmStatus();
// the song a source plays, as Last.fm wants it (artist and title), or null
function lfmSong(src, info) {
  if (!src || !info) return null;
  if (src.name === 'radio') {
    const m = /^(.+?)\s+-\s+(.+)$/.exec(typeof radioSong === 'function' ? radioSong() : '');
    return m ? { artist: m[1].trim(), title: m[2].trim(), album: '', dur: 0 } : null;
  }
  if (!info.artist || !info.title) return null;
  return { artist: String(info.artist).split(/,\s*/)[0], title: info.title, album: info.album === 'Audio CD' ? '' : info.album || '', dur: info.dur || 0 };
}
const lfmEnough = c => c.dur > 30 ? c.heard >= Math.min(c.dur / 2, 240) : c.dur === 0 && c.heard >= 90;
function lfmEnd(c) {
  if (!c || !lfmEnough(c)) return;
  window.lastfm.scrobble({ artist: c.artist, title: c.title, album: c.album, dur: c.dur, at: c.at });
  lfmState.sent++;
  lfmSentAt = Date.now();
}
// 7.10.11: SCROBBLING in the header, by SIG: shown while connected, lit while the song playing goes to Last.fm, a
// green flash when one was scrobbled
let lfmSentAt = 0;
function lfmLed() {
  const g = lfmEl('lfmGroup'), led = lfmEl('ledLfm'); if (!g) return;
  const on = !!(lfmState.signedIn && lfmCur && lfmCur.told), sent = Date.now() - lfmSentAt < 1500;
  g.classList.toggle('show', !!lfmState.signedIn); g.classList.toggle('on', on || sent);
  led.classList.toggle('on', on && !sent); led.classList.toggle('sent', sent);
  g.title = !lfmState.signedIn ? '' : sent ? 'Last.fm: anotado' : on ? 'Last.fm: ' + lfmCur.artist + ' – ' + lfmCur.title + (lfmEnough(lfmCur) ? ' (se anota al terminar)' : '')
    : 'Last.fm: conectado como ' + lfmState.user + ' (anota la radio, el CD y el DM-90)';
}
function lfmTick() {
  if (!lfmState.signedIn || !window.lastfm) { lfmCur = null; return; }
  const src = typeof npSourceNow !== 'undefined' ? npSourceNow : null, now = Date.now();
  let info = null; try { info = src && src.info(); } catch (_) {}
  const song = lfmSong(src, info), key = song ? src.name + '|' + song.artist + '|' + song.title : '';
  // 7.10.13: the same song from the start again (REPEAT one, or played twice): a new listen
  if (lfmCur && key === lfmCur.key && info && info.dur > 0 && lfmCur.pos - (info.pos || 0) > 20) { lfmEnd(lfmCur); lfmCur = null; }
  if (lfmCur && key !== lfmCur.key) {
    if (!key && now - lfmCur.seen < 15000) return;               // a moment with nothing (a radio reconnecting): the same song
    lfmEnd(lfmCur); lfmCur = null;
  }
  if (!song) return;
  if (!lfmCur) lfmCur = Object.assign({ key, at: now / 1000, heard: 0, seen: now, told: false }, song);
  if (info.status === 'Playing') lfmCur.heard += Math.min(2, (now - lfmCur.seen) / 1000);
  lfmCur.seen = now; lfmCur.pos = info.pos || 0;
  if (!lfmCur.told && info.status === 'Playing' && lfmCur.heard >= 5) { lfmCur.told = true; window.lastfm.nowPlaying(song); }
}
setInterval(() => { lfmTick(); lfmLed(); }, 1000);
window.addEventListener('beforeunload', () => { if (lfmCur) lfmEnd(lfmCur); });

// ── its dialog (⚙ → EXTRAS → LAST.FM) ──
async function lfmSetup(on) {
  lfmEl('lfmSetup').classList.toggle('show', on);
  if (!on) return;
  await lfmStatus();
  lfmShow('');
  setTimeout(() => (lfmState.hasKey ? lfmEl('lfmGo') : lfmEl('lfmKey')).focus(), 50);
}
function lfmShow(msg) {
  const s = lfmState;
  lfmEl('lfmState').innerHTML = !window.lastfm ? 'Last.fm anda en el programa instalado'
    : s.signedIn ? 'Conectado como <b>' + s.user.replace(/[<>&]/g, '') + '</b> · ' + s.sent.toLocaleString('es-AR') + ' temas anotados' + (s.queued ? ' · ' + s.queued + ' esperando internet' : '')
    : s.waiting ? 'Falta autorizar a Deck 90 en la página de Last.fm' : 'Sin conectar';
  lfmEl('lfmKeys').style.display = s.signedIn ? 'none' : '';
  lfmEl('lfmGo').style.display = s.signedIn ? 'none' : '';
  lfmEl('lfmGo').textContent = s.hasKey && !lfmEl('lfmKey').value ? 'CONECTAR (CON LA KEY GUARDADA)' : 'CONECTAR';
  lfmEl('lfmDone').style.display = !s.signedIn && s.waiting ? '' : 'none';
  lfmEl('lfmOut').style.display = s.signedIn ? '' : 'none';
  lfmEl('lfmMsg').textContent = msg || '';
}
async function lfmBegin() {
  if (!window.lastfm) return;
  lfmShow('Pidiendo permiso a Last.fm…');
  const r = await window.lastfm.begin(lfmEl('lfmKey').value, lfmEl('lfmSecret').value).catch(e => ({ error: e.message }));
  lfmEl('lfmSecret').value = '';
  await lfmStatus();
  if (!r || r.error) { lfmShow('⚠ ' + (r && r.error || 'No pude conectar')); return; }
  lfmEl('lfmKey').value = '';
  lfmShow('Se abrió Last.fm en el navegador: tocá YES, ALLOW ACCESS y después LISTO acá.');
}
async function lfmFinish() {
  lfmShow('Confirmando con Last.fm…');
  const r = await window.lastfm.finish().catch(e => ({ error: e.message }));
  await lfmStatus();
  if (!r || r.error) { lfmShow('⚠ ' + (r && r.error || 'No pude confirmar')); return; }
  lfmShow('');
  toast('LAST.FM · <span>conectado</span> como ' + String(r.user).replace(/[<>&]/g, ''), 2200);
}
lfmEl('lfmGo').addEventListener('click', lfmBegin);
lfmEl('lfmDone').addEventListener('click', lfmFinish);
lfmEl('lfmOut').addEventListener('click', async () => { await window.lastfm.signOut(); await lfmStatus(); lfmCur = null; lfmShow(''); toast('LAST.FM · <span>desconectado</span>', 1600); });
lfmEl('lfmClose').addEventListener('click', () => lfmSetup(false));
lfmEl('lfmSetup').addEventListener('click', e => { if (e.target.id === 'lfmSetup') lfmSetup(false); });
lfmEl('lfmSetup').addEventListener('keydown', e => {
  e.stopPropagation();
  if (e.key === 'Escape') { e.preventDefault(); lfmSetup(false); }
  else if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); lfmBegin(); }
});
