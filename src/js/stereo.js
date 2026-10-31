'use strict';
// ═══════════════════════════════════════════════════════════
//  ESTÉREO (7.7): Deck 90 as a car stereo. The tools' radio button (or E) closes the rack and the window
//  becomes the stereo's front (img/stereo/front.jpg) with the live DP940 display over its LCD
//  (vendor/dp940-display.js) and a key over each of its buttons:
//    VOL ▲▼  Windows' volume (also the mouse wheel anywhere on the front)    ATT  silence
//    MODE    PC (what the computer plays) or RADIO (stations over the internet)
//    SEL     play / pause: the radio, or the player's song                    DISP  song · BPM · loudness · time
//    TUNE ◀▶ the previous / next radio station, or song                      SCAN  8 s of each station
//    1–6     the band's memories (hold one to keep the station playing there)  BAND  FM1 · FM2 · FM3
//    HDB     the display's brightness   SDM  its colour   PWR  back to the rack   ⏏  opens the drive's tray
//  CD mode (7.8, Windows): the PC's CD/DVD drive, through the program's bridge (electron/media.ps1). An audio CD
//  plays from the drive (Windows' own CD audio); a disc of MP3s and the like plays its files here. TRACK ◀▶ and
//  SEL work on it; the display shows TRACK 03 and its time, or the file's name.
//  PC mode, music playing: the song in 16-segment letters, its artist and time, the L/R meters on the real
//  audio; paused: the radio screen. RADIO mode: the station's frequency (or name) and the meters on its sound.
//  The window side is the mini strip's (its own size and place, always on top); see electron/main.js.
// ═══════════════════════════════════════════════════════════
// DISP: what the big letters show, in any mode: the normal screen (song, station or track), the time, the
// temperature (the header's weather), the BPM or the loudness; the line under it says what's playing
const STEREO_DISP = ['song', 'clock', 'temp', 'bpm', 'lufs'];
const STEREO_DISP_NAME = { song: 'NORMAL', clock: 'HORA', temp: 'TEMPERATURA', bpm: 'BPM', lufs: 'LOUDNESS' };
const STEREO_HUES = [0, 38, 150, 196, 248, 300];          // SDM: the original burgundy and amber, then five more lights
const STEREO_DIM = [1, .72, .48];                          // HDB: the display's brightness
const RADIO_KEY = 'deck90-radio';
// FM1 comes with Buenos Aires stations and 80s80s (Hamburg, internet only: no dial, the display shows its name);
// each is looked up by name in Radio Browser when first tuned (cc: the country, '' for anywhere)
const RADIO_DEFAULTS = [
  { name: 'Aspen', freq: '102.3', q: 'Aspen', cc: 'AR' }, { name: '80s80s', freq: '', q: '80s80s', cc: 'DE' },
  { name: 'Metro', freq: '95.1', q: 'Metro 95', cc: 'AR' }, { name: 'Rock & Pop', freq: '95.9', q: 'Rock & Pop', cc: 'AR' },
  { name: 'La 100', freq: '99.9', q: 'La 100', cc: 'AR' }, { name: 'Vorterix', freq: '92.1', q: 'Vorterix', cc: 'AR' },
];
const RADIO_FM2 = [{ name: 'Con Vos', freq: '89.9', q: 'Con Vos', cc: 'AR' }, null, null, null, null, null];
// AM (7.8): the Buenos Aires AM stations, over the internet too
const RADIO_AM = [
  { name: 'Mitre', freq: '790', q: 'Radio Mitre', cc: 'AR' }, { name: 'Radio 10', freq: '710', q: 'Radio 10', cc: 'AR' },
  { name: 'Continental', freq: '590', q: 'Radio Continental', cc: 'AR' }, { name: 'Rivadavia', freq: '630', q: 'Rivadavia', cc: 'AR' },
  { name: 'Radio Nacional', freq: '870', q: 'Radio Nacional', cc: 'AR' }, { name: 'La Red', freq: '910', q: 'La Red', cc: 'AR' },
];
const RADIO_BANDS = ['FM1', 'FM2', 'FM3', 'AM'];
let stereoMode = false, stereoDisplay = null, stereoTextAt = 0, stereoShown = '';
let stereoCfg = { disp: 'song', color: 1, dim: 0, mode: 'pc' };
try {
  const c = (JSON.parse(localStorage.getItem('deck90-prefs')) || {}).stereo;
  if (c && typeof c === 'object') stereoCfg = {
    disp: STEREO_DISP.includes(c.disp) ? c.disp : 'song', color: c.color >= 1 && c.color <= 6 ? c.color | 0 : 1,
    dim: c.dim >= 0 && c.dim <= 2 ? c.dim | 0 : 0, mode: ['radio', 'cd'].includes(c.mode) ? c.mode : 'pc' };
} catch (_) {}
// the memories: { FM1: [6 × station|null], FM2, FM3 }, the band and slot in use
let radioMem = { band: 'FM1', slot: 1, FM1: RADIO_DEFAULTS.slice(), FM2: RADIO_FM2.slice(), FM3: Array(6).fill(null), AM: RADIO_AM.slice() };
try {
  const r = JSON.parse(localStorage.getItem(RADIO_KEY));
  if (r && typeof r === 'object') for (const b of RADIO_BANDS) {
    if (Array.isArray(r[b])) radioMem[b] = Array.from({ length: 6 }, (_, i) => r[b][i] && r[b][i].name ? { name: String(r[b][i].name).slice(0, 80), freq: String(r[b][i].freq || '').slice(0, 8), q: String(r[b][i].q || r[b][i].name).slice(0, 60), cc: /^[A-Z]{2}$/.test(r[b][i].cc || '') ? r[b][i].cc : '', url: /^https?:\/\//.test(r[b][i].url || '') ? r[b][i].url : '' } : null);
    if (RADIO_BANDS.includes(r.band)) radioMem.band = r.band;
    if (r.slot >= 0 && r.slot <= 6) radioMem.slot = r.slot | 0;
  }
  // 7.8: FM1-6 is Vorterix 92.1 instead of Los 40 (kept if it was stored there by hand)
  if (radioMem.FM1[5] && radioMem.FM1[5].name === 'Los 40' && radioMem.FM1[5].q === 'Los 40') radioMem.FM1[5] = Object.assign({}, RADIO_DEFAULTS[5]);
} catch (_) {}
const saveRadio = () => { try { localStorage.setItem(RADIO_KEY, JSON.stringify(radioMem)); } catch (_) {} };

// ── the radio itself: one <audio> playing the station's stream (Deck 90 hears it like any other sound) ──
const radioAudio = new Audio();
radioAudio.preload = 'none';
let radioNow = null, radioTop = null, radioTopAt = -1, radioScan = 0, radioTry = 0;
const radioPlaying = () => !radioAudio.paused && !!radioNow;
const shortName = n => String(n || '').replace(/\b(fm|radio|am)\b/gi, '').replace(/\s+/g, ' ').trim().slice(0, 12) || 'RADIO';
async function radioResolve(st) {
  if (st.url) return [st.url];
  if (!window.radio) return null;
  const found = await window.radio.find(st.q || st.name, st.cc === undefined ? 'AR' : st.cc);
  if (!found) return null;
  return found.map(f => f.url);
}
async function radioTune(st, label) {
  if (!st) return;
  const t = ++radioTry;
  radioNow = st; stereoText(true);
  toast('RADIO · <span>' + (st.freq ? st.freq + ' ' : '') + st.name.replace(/[<>&]/g, '') + '</span>' + (label ? ' · ' + label : ''), 1800);
  const urls = await radioResolve(st);
  if (t !== radioTry) return;                                  // another station was chosen meanwhile
  if (!urls) { toast('⚠ No pude buscar la radio: ¿hay internet?', 3200); return; }
  if (!urls.length) { toast('⚠ No encontré <span>' + st.name.replace(/[<>&]/g, '') + '</span> en Radio Browser', 3200); return; }
  for (const u of urls) {
    try {
      radioAudio.src = u; await radioAudio.play();
      if (t !== radioTry) return;
      if (!st.url) { st.url = u; saveRadio(); }
      if (typeof activeSource !== 'undefined' && activeSource !== 'sys' && window.winCtl) startAudio('sys');   // the meters follow it through the PC's sound
      stereoText(true); return;
    } catch (_) { if (t !== radioTry) return; }
  }
  if (st.url) { st.url = ''; saveRadio(); }                    // an old address: look it up again next time
  toast('⚠ <span>' + st.name.replace(/[<>&]/g, '') + '</span> no responde ahora', 3200);
}
function radioStop() { radioTry++; radioScan = 0; radioAudio.pause(); radioAudio.removeAttribute('src'); radioAudio.load(); stereoText(true); }
radioAudio.addEventListener('pause', () => stereoText(true));
radioAudio.addEventListener('playing', () => stereoText(true));
async function radioStep(d) {                                  // TUNE: the most heard stations in Argentina
  if (!radioTop) { radioTop = window.radio ? await window.radio.top() : null; if (!radioTop || !radioTop.length) { radioTop = null; toast('⚠ No pude traer la lista de radios', 3000); return; } }
  radioTopAt = (radioTopAt + d + radioTop.length) % radioTop.length;
  const r = radioTop[radioTopAt];
  radioMem.slot = 0;                                           // a tuned station, not a memory
  radioTune({ name: r.name, freq: '', q: r.name, cc: 'AR', url: r.url }, (radioTopAt + 1) + '/' + radioTop.length);
}
setInterval(() => { if (radioScan && stereoCfg.mode === 'radio' && radioScan++ % 8 === 0) radioStep(1); }, 1000);
function radioMemory(n, hold) {
  const list = radioMem[radioMem.band];
  if (hold) {
    if (!radioNow) { toast('Primero sintonizá una radio (TUNE ◀ ▶) y después mantené apretado el número', 3000); return; }
    list[n - 1] = { name: radioNow.name, freq: radioNow.freq || '', q: radioNow.q || radioNow.name, cc: radioNow.cc || '', url: radioNow.url || '' };
    radioMem.slot = n; saveRadio(); stereoText(true);
    toast('Guardada en <span>' + radioMem.band + '-' + n + '</span> · ' + radioNow.name.replace(/[<>&]/g, ''), 2200);
    return;
  }
  const st = list[n - 1];
  if (!st) { toast(radioMem.band + '-' + n + ' está vacía: sintonizá con <span>TUNE ◀ ▶</span> y mantené apretado el ' + n, 3200); return; }
  radioMem.slot = n; saveRadio(); radioScan = 0;
  radioTune(st, radioMem.band + '-' + n);
}

// ── the CD: the drive through the bridge; a disc of files plays here ──
const cdAudio = new Audio();
let cdInfo = null, cdState = { state: '', track: 0, pos: 0, at: 0 }, cdFile = 0, cdAsked = 0;
const cdAudioTracks = () => cdInfo && cdInfo.tracks ? cdInfo.tracks.filter(t => t.audio) : [];
const cdFiles = () => cdInfo && cdInfo.files ? cdInfo.files : [];
const cdPlaying = () => cdState.state === 'playing' || (!cdAudio.paused && !!cdAudio.getAttribute('src'));
const fileUrl = p => 'file:///' + String(p).replace(/\\/g, '/').split('/').map(encodeURIComponent).join('/').replace(/^([A-Za-z])%3A/, '$1:');
const mmss = s => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
function cdAsk() {
  cdInfo = null; cdAsked = performance.now();
  if (!window.cdrom) { cdInfo = { drive: null, none: 'windows' }; stereoText(true); return; }
  window.cdrom.cmd('cd-info'); stereoText(true);
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
  cdAudio.play().catch(() => toast('⚠ No pude leer ese archivo del disco', 2600));
  stereoText(true);
}
function cdTrack(d) {                                          // TRACK ◀ ▶: a track (or file) before or after
  if (cdFiles().length) { cdPlayFile(d < 0 && cdAudio.currentTime > 3 ? cdFile : cdFile + d); return; }
  const tr = cdAudioTracks(); if (!tr.length) return;
  const cur = cdState.track || tr[0].n, pos = cdPosition();
  let n = d < 0 && pos > 3 ? cur : cur + d;
  n = Math.max(tr[0].n, Math.min(tr[tr.length - 1].n, n));
  window.cdrom.cmd('cd-play ' + n);
}
function cdToggle() {
  if (cdFiles().length) { if (cdAudio.paused) { if (cdAudio.getAttribute('src')) cdAudio.play().catch(() => {}); else cdPlayFile(0); } else cdAudio.pause(); return; }
  const tr = cdAudioTracks(); if (!tr.length || !window.cdrom) return;
  window.cdrom.cmd(cdState.state === 'playing' ? 'cd-pause' : cdState.state === 'paused' ? 'cd-resume' : 'cd-play ' + tr[0].n);
}
function cdPosition() {
  if (cdFiles().length) return cdAudio.currentTime || 0;
  return cdState.pos + (cdState.state === 'playing' ? (performance.now() - cdState.at) / 1000 : 0);
}
if (window.cdrom) window.cdrom.on(m => {
  if (!m || typeof m !== 'object') return;
  if (m.error) { toast('⚠ CD: ' + String(m.error).replace(/[<>&]/g, '').slice(0, 120), 3600); return; }
  if ('drive' in m) {                                          // what's in the drive: the CD starts, as in a car
    cdInfo = m;
    if (stereoCfg.mode === 'cd' && stereoMode) {
      if (cdAudioTracks().length) window.cdrom.cmd('cd-play ' + cdAudioTracks()[0].n);
      else if (cdFiles().length) cdPlayFile(0);
    }
    stereoText(true); return;
  }
  if (m.state) {
    if (m.state === 'ejected') { cdInfo = { drive: cdInfo && cdInfo.drive, present: false }; cdState = { state: '', track: 0, pos: 0, at: 0 }; }
    else cdState = { state: m.state, track: m.track | 0, pos: m.pos || 0, at: performance.now() };
    stereoText(true);
  }
});
cdAudio.addEventListener('ended', () => cdPlayFile(cdFile + 1));
['play', 'pause'].forEach(ev => cdAudio.addEventListener(ev, () => stereoText(true)));

// ── the display ──
function stereoOpen(on) {
  stereoMode = on;
  document.body.classList.toggle('stereo', on);
  if (on && !stereoDisplay && typeof Deck90Display === 'function') {
    stereoDisplay = new Deck90Display(document.getElementById('stDisplay'), { attackMs: 35, releaseMs: 140, radio: { band: radioMem.band, frequency: '102.3', preset: radioMem.slot || 1 } });
    const svg = stereoDisplay.svg;                             // only its glass, over the photo's own LCD
    svg.setAttribute('viewBox', '23 24 1141 156'); svg.setAttribute('preserveAspectRatio', 'none');
    svg.removeAttribute('width'); svg.removeAttribute('height');
    stereoShown = ''; stereoText(true);
    if (stereoCfg.mode === 'cd') cdAsk();
  }
  if (!on) {
    if (radioPlaying() || radioNow) radioStop();               // the stereo off: its radio and CD too
    cdStop();
    if (stereoDisplay) { stereoDisplay.destroy(); stereoDisplay = null; }
  }
  stereoPaint();
}
function toggleStereo() {
  if (window.winCtl && window.winCtl.stereo) window.winCtl.stereo();
  else setMini(!stereoMode, 'stereo');
}
function stereoPaint() {
  const p = document.getElementById('stereo');
  p.style.setProperty('--st-hue', STEREO_HUES[stereoCfg.color - 1] + 'deg');
  p.style.setProperty('--st-dim', STEREO_DIM[stereoCfg.dim]);
  p.classList.toggle('aux-on', !!running || radioPlaying() || cdPlaying());
}
// DISP's words, and the line under them: what's playing in this mode
function stereoTemp() {
  if (typeof wx === 'undefined' || !wx || typeof wx.temp !== 'number' || Date.now() - wxAt > 3 * 3600e3) return '';
  return Math.round(wx.temp) + '°C';
}
function stereoDispText() {
  const d = stereoCfg.disp;
  if (d === 'clock') { const t = new Date(); return String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0'); }
  if (d === 'temp') return stereoTemp() || 'SIN CLIMA';
  if (d === 'bpm') return bpmVal > 0 && running ? Math.round(bpmVal) + ' BPM' : '--- BPM';
  if (d === 'lufs') { const i = typeof miniVals === 'object' && isFinite(miniVals.i) ? miniVals.i : NaN; return isFinite(i) ? i.toFixed(1) + ' LUFS' : '--.- LUFS'; }
  return '';
}
function stereoContext() {
  const d = stereoCfg.disp;
  if (d === 'temp' && stereoTemp() && typeof clockCfg === 'object' && clockCfg.place) {
    const where = clockCfg.place.name + (wx && typeof wx.max === 'number' ? ' · ↑' + Math.round(wx.max) + '° ↓' + Math.round(wx.min) + '°' : '');
    return where;
  }
  if (stereoCfg.mode === 'radio') { const st = radioNow || radioMem[radioMem.band][(radioMem.slot || 1) - 1]; return st ? (st.freq ? radioMem.band + ' ' + st.freq + ' · ' : '') + st.name : radioMem.band; }
  if (stereoCfg.mode === 'cd') {
    if (cdFiles().length) return String(cdFiles()[cdFile] || '').split(/[\\/]/).pop().replace(/\.[^.]+$/, '');
    return cdAudioTracks().length ? 'CD · TRACK ' + String(cdState.track || cdAudioTracks()[0].n).padStart(2, '0') : 'CD';
  }
  return np && np.title ? np.title + (np.artist ? ' · ' + np.artist : '') : '';
}
const stereoPlaying = () => running && (np ? npPlaying() : audible());
function stereoText(force) {
  if (!stereoDisplay) return;
  let key;
  const extra = stereoDispText();
  if (extra) {                                                 // DISP: the time, the temperature, BPM or loudness
    key = 'disp|' + stereoCfg.mode + '|' + extra + '|' + stereoContext() + '|' + radioPlaying();
    if (key !== stereoShown || force) {
      stereoShown = key;
      if (stereoCfg.mode === 'radio') {                        // the radio keeps its own screen, the words in place of the dial
        stereoDisplay.setPlayback(false);
        stereoDisplay.setRadio({ band: '', frequency: extra, preset: radioMem.slot || 1, live: radioPlaying(), name: stereoContext() });
      } else stereoDisplay.setTrack({ title: extra, artist: stereoContext(), playing: true });
    }
    stereoDisplay.setElapsed(stereoCfg.mode === 'cd' ? cdPosition() : stereoCfg.mode === 'pc' && np ? npPosition() : 0);
    if (!(stereoCfg.mode === 'radio' ? radioPlaying() : stereoCfg.mode === 'cd' ? cdPlaying() : stereoPlaying())) stereoDisplay.setLevels(0, 0);
    stereoPaint(); return;
  }
  if (stereoCfg.mode === 'cd') {
    let title, artist = '', playing = true;
    const tr = cdAudioTracks(), files = cdFiles();
    if (!cdInfo) title = 'LEYENDO';
    else if (cdInfo.none === 'windows') { title = 'SOLO WINDOWS'; artist = 'EL CD SE LEE DESDE EL PROGRAMA EN WINDOWS'; }
    else if (!cdInfo.drive) { title = 'SIN LECTORA'; artist = 'CONECTÁ LA LECTORA DE CD Y TOCÁ MODE'; }
    else if (!cdInfo.present) { title = 'NO DISC'; artist = 'PONÉ UN CD Y TOCÁ LA RANURA'; }
    else if (files.length) {
      const f = String(files[cdFile] || '').split(/[\\/]/).pop().replace(/\.[^.]+$/, '');
      title = f || 'MP3'; artist = 'DISCO · ' + (cdFile + 1) + '/' + files.length;
    } else if (tr.length) {
      const n = cdState.track || tr[0].n, total = tr.reduce((a, t) => a + (t.len || 0), 0);
      title = 'TRACK ' + String(n).padStart(2, '0'); artist = 'CD · ' + tr.length + ' PISTAS · ' + mmss(total) + (cdState.state === 'paused' ? ' · PAUSA' : '');
    } else { title = 'SIN AUDIO'; artist = 'ESTE DISCO NO TIENE MÚSICA'; }
    key = 'cd|' + title + '|' + artist;
    if (key !== stereoShown || force) { stereoShown = key; stereoDisplay.setTrack({ title, artist, playing }); }
    stereoDisplay.setElapsed(cdPosition());
    if (!cdPlaying()) stereoDisplay.setLevels(0, 0);
  } else if (stereoCfg.mode === 'radio') {
    const st = radioNow || (radioMem[radioMem.band][(radioMem.slot || 1) - 1]) || RADIO_DEFAULTS[0];
    const live = radioPlaying();
    const freq = st.freq ? st.freq : shortName(st.name).toUpperCase();
    key = 'radio|' + radioMem.band + '|' + freq + '|' + live + '|' + radioMem.slot;
    if (key !== stereoShown || force) {
      stereoShown = key;
      stereoDisplay.setPlayback(false);
      stereoDisplay.setRadio({ band: radioMem.band, frequency: freq, preset: radioMem.slot || 1, live, name: live ? st.name : '' });
    }
  } else {
    const playing = stereoPlaying();
    let title = '', artist = '';
    if (playing) {
      const song = np && np.title ? np.title : activeSource === 'demo' ? 'DEMO 124 BPM' : activeSource === 'mic' ? 'MICRÓFONO' : 'AUDIO DE LA PC';
      artist = np && np.artist ? np.artist : '';
      title = song;
    }
    key = 'pc|' + playing + '|' + title + '|' + artist;
    if (key !== stereoShown || force) {
      stereoShown = key;
      if (playing) stereoDisplay.setTrack({ title, artist, playing: true });
      else { stereoDisplay.setRadio({ band: 'FM1', frequency: '102.3', preset: 12, live: false, name: '' }); stereoDisplay.setPlayback(false); }
    }
    if (playing) stereoDisplay.setElapsed(np ? npPosition() : 0);
  }
  stereoPaint();
}
// The stereo's own meters (7.8.1): lively like a car stereo's, not a VU. Each frame's level (the analyser's
// ~40 ms RMS, before any VU ballistics) is shown around the music's own loudness of the last few seconds:
// that loudness sits a little above the middle, the beats and the quiet moments swing above and below it,
// whatever the master's level. The display adds a quick rise and a short fall.
let stAvg = -20, stAt = 0;
function stereoLevels(now) {
  const dt = stAt ? Math.min(200, now - stAt) : 16; stAt = now;
  const L = vu.L.dbfs, R = vu.R.dbfs, loud = Math.max(L, R);
  if (loud > -60) stAvg += (loud - stAvg) * (1 - Math.exp(-dt / 2500));
  const f = d => d < -60 ? 0 : Math.max(0, Math.min(1, (d - (stAvg - 8)) / 13));
  stereoDisplay.setLevels(f(L), f(R));
}
// every frame from the loop: the meters (smoothed by the display itself); the words a few times a second
function stereoFeed(now) {
  if (!stereoDisplay) return;
  if (stereoCfg.mode === 'radio' ? radioPlaying() : stereoCfg.mode === 'cd' ? cdPlaying() : stereoPlaying()) stereoLevels(now);
  if (now - stereoTextAt > 250) { stereoTextAt = now; stereoText(); }
}
setInterval(() => { if (stereoMode && !running) stereoText(); }, 500);   // the loop sleeps with nothing running

// ── the keys ──
// Changing mode pauses what the mode you leave was playing, and coming back to it picks it up again:
// the player's song (PC), the CD where it was; the radio, a live stream, is tuned again. Returns true when the
// CD was picked up again (then the drive needn't be read).
const stereoResume = { pc: false, cd: false };
function stereoSwitch(next) {
  const from = stereoCfg.mode;
  if (from === 'pc' && np && np.status === 'Playing' && window.nowPlaying) { window.nowPlaying.cmd('pause'); stereoResume.pc = true; }
  if (from === 'radio') radioStop();
  if (from === 'cd') {
    if (cdState.state === 'playing' && window.cdrom) { window.cdrom.cmd('cd-pause'); stereoResume.cd = true; }
    else if (!cdAudio.paused) { cdAudio.pause(); stereoResume.cd = true; }
  }
  stereoCfg.mode = next; savePrefs();
  if (next === 'pc' && stereoResume.pc) { stereoResume.pc = false; if (window.nowPlaying) window.nowPlaying.cmd('play'); }
  if (next === 'cd' && stereoResume.cd) {
    stereoResume.cd = false;
    if (cdFiles().length && cdAudio.getAttribute('src')) cdAudio.play().catch(() => {});
    else if (cdState.state === 'paused' && window.cdrom) window.cdrom.cmd('cd-resume');
    else return false;
    toast('MODE · <span>CD</span> · sigue donde estaba', 1600);
    return true;                                                // picked up again: no need to read the drive
  }
  return false;
}
function stereoVolume(step) {
  if (!window.nowPlaying) { toast('El volumen se maneja desde el programa en Windows.', 2400); return; }
  window.nowPlaying.cmd(step > 0 ? 'volup' : step < 0 ? 'voldown' : 'mute');
  if (!step) toast('ATT · <span>silencio</span> (otra vez para volver)', 1400);
}
function stereoKey(k, hold) {
  if (k === 'volup') return stereoVolume(1);
  if (k === 'voldown') return stereoVolume(-1);
  if (k === 'att') return stereoVolume(0);
  if (k === 'pwr') return toggleStereo();
  if (k === 'eject') {
    if (!window.cdrom) { toast('La bandeja se abre desde el programa en Windows.', 2400); return; }
    cdStop(); window.cdrom.cmd('cd-eject'); toast('⏏ · <span>bandeja</span>', 1400); return;
  }
  if (k === 'mode' || k === 'slot') {
    const next = k === 'slot' ? 'cd' : { pc: 'radio', radio: 'cd', cd: 'pc' }[stereoCfg.mode];
    if (next === stereoCfg.mode) { cdAsk(); return; }
    const resumed = stereoSwitch(next);
    if (next === 'pc') toast('MODE · <span>PC</span>: lo que suena en la computadora', 1800);
    else if (next === 'radio') { toast('MODE · <span>RADIO</span> por internet', 1600); if (radioNow) radioTune(radioNow); else radioMemory(radioMem.slot || 1); }
    else if (!resumed) { toast('MODE · <span>CD</span> · leyendo la lectora…', 1600); cdAsk(); }
    return stereoText(true);
  }
  if (k === 'disp') {
    stereoCfg.disp = STEREO_DISP[(STEREO_DISP.indexOf(stereoCfg.disp) + 1) % STEREO_DISP.length]; savePrefs();
    toast('DISP · <span>' + STEREO_DISP_NAME[stereoCfg.disp] + '</span>' + (stereoCfg.disp === 'temp' && !stereoTemp() ? ' · prendé el clima en ⚙ PANTALLA → RELOJ' : ''), stereoCfg.disp === 'temp' && !stereoTemp() ? 3200 : 1500);
    return stereoText(true);
  }
  if (k === 'hdb') { stereoCfg.dim = (stereoCfg.dim + 1) % STEREO_DIM.length; savePrefs(); return stereoPaint(); }
  if (k === 'sdm') { stereoCfg.color = stereoCfg.color % 6 + 1; savePrefs(); toast('COLOR · <span>' + stereoCfg.color + '</span> de 6', 1200); return stereoPaint(); }
  if (k === 'band') {
    radioMem.band = RADIO_BANDS[(RADIO_BANDS.indexOf(radioMem.band) + 1) % RADIO_BANDS.length]; radioMem.slot = 0; saveRadio();
    toast('BAND · <span>' + radioMem.band + '</span> · seis memorias (1–6)', 1500);
    return stereoText(true);
  }
  if (/^m[1-6]$/.test(k)) {
    if (stereoCfg.mode !== 'radio') stereoSwitch('radio');
    return radioMemory(Number(k[1]), hold);
  }
  const radio = stereoCfg.mode === 'radio';
  if (stereoCfg.mode === 'cd' && (k === 'sel' || k === 'prev' || k === 'next')) {
    if (k === 'sel') cdToggle(); else cdTrack(k === 'next' ? 1 : -1);
    return;
  }
  if (k === 'sel') {
    if (radio) { if (radioPlaying()) { radioAudio.pause(); toast('RADIO · <span>pausa</span>', 1200); } else if (radioNow && radioAudio.src) radioAudio.play().catch(() => radioTune(radioNow)); else radioMemory(radioMem.slot || 1); }
    else if (window.nowPlaying) window.nowPlaying.cmd('toggle');
    return;
  }
  if (k === 'prev' || k === 'next') {
    if (radio) { radioScan = 0; return radioStep(k === 'next' ? 1 : -1); }
    if (window.nowPlaying) window.nowPlaying.cmd(k);
    return;
  }
  if (k === 'scan') {
    if (!radio) stereoSwitch('radio');
    if (radioScan) { radioScan = 0; toast('SCAN · <span>te quedás en esta</span>', 1500); }
    else { radioScan = 1; toast('SCAN · <span>8 s de cada radio</span>, SCAN otra vez para quedarte', 2200); }
  }
}

(function () {
  const p = document.getElementById('stereo');
  // a key: a click; the memories also know a long press (1 s keeps the station there)
  let holdT = 0, held = false;
  p.addEventListener('pointerdown', e => {
    const b = e.target.closest('.st-hot'); if (!b) return;
    b.classList.add('down'); held = false;
    if (/^m[1-6]$/.test(b.dataset.st)) holdT = setTimeout(() => { held = true; stereoKey(b.dataset.st, true); }, 1000);
  });
  const up = e => { clearTimeout(holdT); p.querySelectorAll('.st-hot.down').forEach(b => b.classList.remove('down')); };
  p.addEventListener('pointerup', up); p.addEventListener('pointerleave', up); p.addEventListener('pointercancel', up);
  p.addEventListener('click', e => {
    const b = e.target.closest('.st-hot'); if (!b) return;
    if (held) { held = false; return; }
    stereoKey(b.dataset.st, false);
  });
  // the wheel anywhere on the front: the volume, like turning the knob
  p.addEventListener('wheel', e => { e.preventDefault(); stereoVolume(e.deltaY < 0 ? 1 : -1); }, { passive: false });
  stereoPaint();
})();
