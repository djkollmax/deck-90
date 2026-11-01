'use strict';
// ═══════════════════════════════════════════════════════════
//  ESTÉREO (7.7): Deck 90 as a car stereo. The tools' radio button (or E) closes the rack and the window
//  becomes the stereo's front (img/stereo/front.jpg) with the live DP940 display over its LCD
//  (vendor/dp940-display.js) and a key over each of its buttons:
//    VOL ▲▼  Windows' volume (also the mouse wheel anywhere on the front)    ATT  silence
//    MODE    PC (what the computer plays) or RADIO (stations over the internet)
//    SEL     play / pause: the radio, or the player's song                    DISP  song · BPM · loudness · time
//    TUNE ◀▶ the previous / next radio station, or song                      SCAN  8 s of each station
//    1–6     the band's memories (hold one to keep the station playing there)  BAND  FM1 · FM2 · FM3 · FM4 · AM
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
const STEREO_DIM = [1, 1.32, .72, .48];                    // HDB: the display's brightness (normal, high, medium, low)
const STEREO_DIM_NAME = ['NORMAL', 'ALTO', 'MEDIO', 'BAJO'];
// SDM 7 onward: whole looks, each its own glass, letters, labels and meters (styles.css, .st-display.look-<id>)
const STEREO_LOOKS = [
  { id: 'hd', name: 'HD', say: 'negro, letras amarillas' },
  { id: 'amber', name: 'ÁMBAR', say: 'negro, letras ámbar de los 80' },
  { id: 'ice', name: 'HIELO', say: 'azul noche, letras celestes de VFD' },
  { id: 'night', name: 'VERDE NOCHE', say: 'negro verdoso, letras verdes' },
  { id: 'sport', name: 'ROJO SPORT', say: 'negro, letras rojas' },
  { id: 'white', name: 'BLANCO', say: 'negro, letras blancas' },
  { id: 'lcd', name: 'LCD CLARO', say: 'vidrio claro, letras oscuras', light: true },
  { id: 'miami', name: 'MIAMI', say: 'violeta, letras rosas, vúmetros celestes' },
  { id: 'gold', name: 'ORO', say: 'marrón profundo, letras doradas' },
  { id: 'aqua', name: 'AQUA', say: 'verde agua, letras turquesa' },
  // 7.8.7: twelve more
  { id: 'cobalt', name: 'COBALTO', say: 'azul profundo, letras blanco azulado' },
  { id: 'lime', name: 'LIMA', say: 'negro, letras verde lima' },
  { id: 'rose', name: 'ROSA', say: 'negro, letras rosa' },
  { id: 'violet', name: 'VIOLETA', say: 'negro, letras violeta' },
  { id: 'fire', name: 'FUEGO', say: 'negro, letras naranja, vúmetros rojos' },
  { id: 'matrix', name: 'MATRIX', say: 'fósforo verde de terminal' },
  { id: 'sunset', name: 'ATARDECER', say: 'violeta oscuro, letras naranja, vúmetros rosa' },
  { id: 'nixie', name: 'NIXIE', say: 'marrón, el naranja de los tubos nixie' },
  { id: 'oled', name: 'OLED', say: 'negro puro, blanco frío, vúmetros azules' },
  { id: 'lcdblue', name: 'LCD AZUL', say: 'LCD con luz azul, letras blancas' },
  { id: 'lcdamber', name: 'LCD ÁMBAR', say: 'LCD con luz ámbar, letras oscuras', light: true },
  { id: 'duo', name: 'BICOLOR', say: 'negro, letras amarillas, carteles celestes, vúmetros verdes' },
];
const STEREO_COLORS = STEREO_HUES.length + STEREO_LOOKS.length;   // SDM: six lights, then the looks
const stereoLook = () => STEREO_LOOKS[stereoCfg.color - STEREO_HUES.length - 1] || null;
let stereoMode = false, stereoDisplay = null, stereoTextAt = 0, stereoShown = '';
let stereoCfg = { disp: 'song', color: 1, dim: 0, mode: 'pc' };
try {
  const c = (JSON.parse(localStorage.getItem('deck90-prefs')) || {}).stereo;
  if (c && typeof c === 'object') stereoCfg = {
    disp: STEREO_DISP.includes(c.disp) ? c.disp : 'song', color: c.color >= 1 && c.color <= STEREO_COLORS ? c.color | 0 : 1,
    dim: c.dim >= 0 && c.dim < STEREO_DIM.length ? c.dim | 0 : 0, mode: ['radio', 'cd'].includes(c.mode) ? c.mode : 'pc' };
} catch (_) {}

// ── the display ──
function stereoOpen(on) {
  stereoMode = on;
  document.body.classList.toggle('stereo', on);
  if (on && radioPlaying() && stereoCfg.mode !== 'radio') { stereoCfg.mode = 'radio'; savePrefs(); }   // the tuner's radio goes on here
  else if (on && cdPlaying() && stereoCfg.mode !== 'cd') { stereoCfg.mode = 'cd'; savePrefs(); }        // and the DC-90's CD
  if (on && !stereoDisplay && typeof Deck90Display === 'function') {
    stereoDisplay = new Deck90Display(document.getElementById('stDisplay'), { attackMs: 35, releaseMs: 140, radio: { band: radioMem.band, frequency: '102.3', preset: radioMem.slot || 1 } });
    const svg = stereoDisplay.svg;                             // only its glass, over the photo's own LCD
    svg.setAttribute('viewBox', '23 24 1141 156'); svg.setAttribute('preserveAspectRatio', 'none');
    svg.removeAttribute('width'); svg.removeAttribute('height');
    stereoShown = ''; stereoText(true);
    if (stereoCfg.mode === 'cd' && !cdPlaying()) cdAsk();       // (a disc already playing in the rack's DC-90 goes on)
  }
  if (!on) {
    // the stereo off: its radio and CD too (the radio goes on in the rack's tuner, when it's there)
    if ((radioPlaying() || radioNow) && !(typeof tunerKeeps === 'function' && tunerKeeps())) radioStop();
    if (!(typeof cdUnitKeeps === 'function' && cdUnitKeeps())) cdStop();
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
  const look = stereoLook(), d = document.getElementById('stDisplay');
  p.style.setProperty('--st-hue', (look ? 0 : STEREO_HUES[stereoCfg.color - 1]) + 'deg');
  d.className = d.className.replace(/\s*\blook(-[a-z]+)?\b/g, '') + (look ? ' look look-' + look.id + (look.light ? ' look-light' : '') : '');
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
        stereoDisplay.setRadio({ band: '', frequency: extra, preset: radioMem.slot || 1, live: radioPlaying(), name: stereoContext(), mono: radioMem.band === 'AM' });
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
      const n = cdState.track || tr[0].n, total = tr.reduce((a, t) => a + (t.len || 0), 0), song = cdSongName(n);
      if (song) { title = song.title; artist = song.artist + ' · ' + String(n).padStart(2, '0') + (cdState.state === 'paused' ? ' · PAUSA' : ''); }
      else { title = 'TRACK ' + String(n).padStart(2, '0'); artist = 'CD · ' + tr.length + ' PISTAS · ' + mmss(total) + (cdState.state === 'paused' ? ' · PAUSA' : ''); }
    } else { title = 'SIN AUDIO'; artist = 'ESTE DISCO NO TIENE MÚSICA'; }
    key = 'cd|' + title + '|' + artist;
    if (key !== stereoShown || force) { stereoShown = key; stereoDisplay.setTrack({ title, artist, playing }); }
    stereoDisplay.setElapsed(cdPosition());
    if (!cdPlaying()) stereoDisplay.setLevels(0, 0);
  } else if (stereoCfg.mode === 'radio') {
    const st = radioNow || (radioMem[radioMem.band][(radioMem.slot || 1) - 1]) || RADIO_DEFAULTS[0];
    const live = radioPlaying();
    const freq = st.freq ? st.freq : shortName(st.name).toUpperCase();
    const q = live ? radioQuality(st) : '', song = radioSong();
    // the line under the frequency is short: the song, and every few seconds the station with its quality
    const line = !live ? '' : song && Math.floor(Date.now() / 4000) % 3 !== 2 ? song : [st.name, q].filter(Boolean).join(' · ');
    key = 'radio|' + radioMem.band + '|' + freq + '|' + live + '|' + radioMem.slot + '|' + line;
    if (key !== stereoShown || force) {
      stereoShown = key;
      stereoDisplay.setPlayback(false);
      stereoDisplay.setRadio({ band: radioMem.band, frequency: freq, preset: radioMem.slot || 1, live, name: line, mono: radioMem.band === 'AM' });
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
      else { stereoDisplay.setRadio({ band: 'FM1', frequency: '102.3', preset: 12, live: false, name: '', mono: false }); stereoDisplay.setPlayback(false); }
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

// The stereo on the phone (7.9.4): the phone draws its own DP940 display; this says what to put on it, by running
// the PC's stereoText into a recorder in place of the real display, so both say exactly the same.
function phoneStereoView() {
  const rec = { kind: '', setRadio(o) { this.kind = 'radio'; this.radio = o; }, setTrack(o) { this.kind = 'track'; this.track = o; },
    setPlayback(p) { this.playback = p; }, setElapsed(s) { this.elapsed = s; }, setLevels() {} };
  const keepDisplay = stereoDisplay, keepShown = stereoShown;
  stereoDisplay = rec; stereoShown = '';
  try { stereoText(true); } finally { stereoDisplay = keepDisplay; stereoShown = keepShown; }
  const look = stereoLook();
  return {
    kind: rec.kind, radio: rec.radio || null, track: rec.track || null, elapsed: Math.floor(rec.elapsed || 0),
    live: stereoCfg.mode === 'radio' ? radioPlaying() : stereoCfg.mode === 'cd' ? cdPlaying() : stereoPlaying(),
    hue: look ? 0 : STEREO_HUES[stereoCfg.color - 1], dim: STEREO_DIM[stereoCfg.dim],
    look: look ? look.id : '', light: !!(look && look.light), aux: !!running || radioPlaying() || cdPlaying(),
  };
}
const PHONE_STEREO_KEYS = ['volup', 'voldown', 'att', 'sel', 'mode', 'disp', 'band', 'hdb', 'sdm', 'scan', 'prev', 'next', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6', 'slot', 'eject'];
if (window.phoneDisplay && window.phoneDisplay.onStereoKey) window.phoneDisplay.onStereoKey((k, hold) => {
  if (PHONE_STEREO_KEYS.includes(k)) stereoKey(k, !!hold);
});

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
// VOL ▲ is one step of Windows' volume (2 %); VOL ▼ three at once (6 %), so turning it down is quick, as in a car
const STEREO_VOL_DOWN = 3;
function stereoVolume(step) {
  if (!window.nowPlaying) { toast('El volumen se maneja desde el programa en Windows.', 2400); return; }
  if (step < 0) { for (let i = 0; i < STEREO_VOL_DOWN; i++) window.nowPlaying.cmd('voldown'); return; }
  window.nowPlaying.cmd(step > 0 ? 'volup' : 'mute');
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
  if (k === 'hdb') { stereoCfg.dim = (stereoCfg.dim + 1) % STEREO_DIM.length; savePrefs(); toast('HDB · brillo <span>' + STEREO_DIM_NAME[stereoCfg.dim] + '</span>', 1200); return stereoPaint(); }
  if (k === 'sdm') {
    stereoCfg.color = (stereoCfg.color - 1 + (hold ? STEREO_COLORS - 1 : 1)) % STEREO_COLORS + 1; savePrefs();   // held: the one before
    const look = stereoLook();
    toast('SDM ' + stereoCfg.color + '/' + STEREO_COLORS + ' · <span>' + (look ? look.name + '</span>: ' + look.say : 'COLOR ' + stereoCfg.color + '</span>'), look ? 2000 : 1200);
    return stereoPaint();
  }
  if (k === 'band') {
    radioMem.band = RADIO_BANDS[(RADIO_BANDS.indexOf(radioMem.band) + 1) % RADIO_BANDS.length]; radioMem.slot = 0; saveRadio();
    toast('BAND · <span>' + radioMem.band + '</span> · seis memorias (1–6)', 1500);
    return stereoText(true);
  }
  if (/^m[1-6]$/.test(k) && stereoCfg.mode === 'cd') {     // on a CD the numbers are its tracks: 1–6, held 7–12 (printed above them)
    const n = Number(k[1]) + (hold ? 6 : 0);
    if (cdFiles().length) { if (n <= cdFiles().length) cdPlayFile(n - 1); else toast('El disco tiene ' + cdFiles().length + ' archivos', 1600); return; }
    const tr = cdAudioTracks();
    if (tr.some(t => t.n === n)) { cdGo(n); toast('TRACK · <span>' + String(n).padStart(2, '0') + '</span>', 1200); }
    else toast(tr.length ? 'El CD tiene ' + tr.length + ' pistas' : 'No hay un CD de audio', 1600);
    return;
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
  // a key: a click; the memories also know a long press (1 s keeps the station there), and SDM (1 s: the look before)
  // VOL ▲ ▼ act on the press and repeat while held (every 0.1 s after 0.35 s)
  let holdT = 0, held = false, volT = 0;
  p.addEventListener('pointerdown', e => {
    const b = e.target.closest('.st-hot'); if (!b) return;
    b.classList.add('down'); held = false;
    if (/^vol(up|down)$/.test(b.dataset.st)) {
      held = true; stereoKey(b.dataset.st, false);
      volT = setTimeout(function rep() { stereoKey(b.dataset.st, false); volT = setTimeout(rep, 100); }, 350);
      return;
    }
    if (/^(m[1-6]|sdm)$/.test(b.dataset.st)) holdT = setTimeout(() => { held = true; stereoKey(b.dataset.st, true); }, 1000);
  });
  const up = e => { clearTimeout(holdT); clearTimeout(volT); p.querySelectorAll('.st-hot.down').forEach(b => b.classList.remove('down')); };
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

// the radio and the CD (src/core) say what changed; in CD mode a disc that comes in plays, as in a car
deck.on('radio', () => stereoText(true));
deck.on('cd', () => stereoText(true));
deck.on('cd-disc', () => {
  if (stereoCfg.mode !== 'cd' || !stereoMode) return;
  if (cdAudioTracks().length) window.cdrom.cmd('cd-play ' + cdAudioTracks()[0].n);
  else if (cdFiles().length) cdPlayFile(0);
});
