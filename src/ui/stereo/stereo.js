'use strict';
// ═══════════════════════════════════════════════════════════
//  ESTÉREO (7.7): Deck 90 as a car stereo. The tools' radio button (or E) closes the rack and the window
//  becomes the stereo's front (img/stereo/front.jpg) with the live DP940 display over its LCD
//  (vendor/dp940-display.js) and a key over each of its buttons:
//    VOL ▲▼  Windows' volume (also the mouse wheel anywhere on the front)    ATT  silence
//    MODE    PC (what the computer plays), RADIO (stations over the internet), CD, or SERVER (the DM-90's music)
//    SEL     play / pause: the radio, or the player's song                    DISP  song · time · temp · TIEMPO
//    TUNE ◀▶ the previous / next radio station, or song                      SCAN  8 s of each station
//    1–6     the band's memories, held 7–12 (BAND held, A.MEM, then a number keeps the station there)  BAND  FM1 · FM2 · FM3 · FM4 · FM5 · HIFI · AM
//    HDB     the display's brightness   SDM  its colour (or the whole front)   PWR  back to the rack   ⏏  the tray
//  CD mode (7.8, Windows): the PC's CD/DVD drive, through the program's bridge (electron/media.ps1). An audio CD
//  plays from the drive (Windows' own CD audio); a disc of MP3s and the like plays its files here. TRACK ◀▶ and
//  SEL work on it; the display shows TRACK 03 and its time, or the file's name.
//  PC mode, music playing: the song in 16-segment letters, its artist and time, the L/R meters on the real
//  audio; paused: the radio screen. RADIO mode: the station's frequency (or name) and the meters on its sound.
//  The window side is the mini strip's (its own size and place, always on top); see electron/main.js.
// ═══════════════════════════════════════════════════════════
// DISP: what the big letters show, in any mode: the normal screen (song, station or track), the time, the
// temperature (the header's weather), both taking turns, or what's left of the song (7.9.21); the line under it
// says what's playing
// 7.9.21: BPM and loudness went; HORA Y TEMP alternates the two, TIEMPO counts down what's left of the song big
const STEREO_DISP = ['song', 'clock', 'temp', 'clocktemp', 'time'];
const STEREO_DISP_NAME = { song: 'NORMAL', clock: 'HORA', temp: 'TEMPERATURA', clocktemp: 'HORA Y TEMPERATURA', time: 'TIEMPO (lo que le queda al tema)' };
const STEREO_HUES = [0, 38, 150, 196, 248, 300];          // SDM: the original burgundy and amber, then five more lights
const STEREO_DIM = [1, 1.32, .72, .48];                    // HDB: the display's brightness (normal, high, medium, low)
const STEREO_DIM_NAME = ['NORMAL', 'ALTO', 'MEDIO', 'BAJO'];
// SDM 7 onward: whole looks, each its own glass, letters, labels and meters (ui/stereo/stereo-face.css, .st-display.look-<id>)
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
  // 7.9.21: four more for the glass, and three that change the whole front (face: the panel and its keys too)
  { id: 'carbon', name: 'CARBONO', say: 'negro, letras blancas, carteles rojos' },
  { id: 'neon', name: 'NEÓN', say: 'negro, letras celestes, carteles fucsia' },
  { id: 'emerald', name: 'ESMERALDA', say: 'verde profundo, letras verde claro, vúmetros dorados' },
  { id: 'plasma', name: 'PLASMA', say: 'el naranja rojizo de las pantallas de plasma' },
  { id: 'tokio', name: 'TOKIO', say: 'al estilo Sony de los 2000: frente negro, teclas con luz azul, letras blancas', face: 'tokio' },
  { id: 'studio', name: 'ESTUDIO', say: 'frente negro mate de equipo pro, letras ámbar, vúmetros verdes', face: 'pro' },
  { id: 'titan', name: 'TITANIO', say: 'frente plateado de equipo pro, vidrio negro, letras blancas y naranja', face: 'titan' },
  // 7.10.5: the colours of Damián's own DP940, taken from photos of it lit in the car
  { id: 'real', name: 'ORIGINAL', say: 'los colores del DP940 de verdad: vidrio violeta, letras amarillas, segmentos apagados verde oliva' },
];
const STEREO_COLORS = STEREO_HUES.length + STEREO_LOOKS.length;   // SDM: six lights, then the looks
const stereoLook = () => STEREO_LOOKS[stereoCfg.color - STEREO_HUES.length - 1] || null;
let stereoMode = false, stereoDisplay = null, stereoTextAt = 0, stereoShown = '';
let stereoCfg = { disp: 'song', color: 1, dim: 0, mode: 'pc' };
{
  const c = store.section('stereo');
  if (c) stereoCfg = {
    disp: STEREO_DISP.includes(c.disp) ? c.disp : 'song', color: c.color >= 1 && c.color <= STEREO_COLORS ? c.color | 0 : 1,
    dim: c.dim >= 0 && c.dim < STEREO_DIM.length ? c.dim | 0 : 0, mode: ['radio', 'cd', 'music'].includes(c.mode) ? c.mode : 'pc' };
}

// ── the display ──
function stereoOpen(on) {
  stereoMode = on;
  document.body.classList.toggle('stereo', on);
  if (on && radioPlaying() && stereoCfg.mode !== 'radio') { stereoCfg.mode = 'radio'; savePrefs(); }   // the tuner's radio goes on here
  else if (on && cdPlaying() && stereoCfg.mode !== 'cd') { stereoCfg.mode = 'cd'; savePrefs(); }        // and the DC-90's CD
  else if (on && musicPlaying() && stereoCfg.mode !== 'music') { stereoCfg.mode = 'music'; savePrefs(); }   // and the DM-90's music (7.10.4)
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
    if (musicPlaying() && !(typeof jbKeeps === 'function' && jbKeeps())) musicStop();   // 7.10.4: the DM-90's music goes on in the rack
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
  p.querySelector('.st-face').dataset.face = look && look.face || '';   // 7.9.21: the looks that change the whole front
  p.style.setProperty('--st-dim', STEREO_DIM[stereoCfg.dim]);
  p.classList.toggle('aux-on', !!capture.running || radioPlaying() || cdPlaying());
}
// DISP's words, and the line under them: what's playing in this mode
function stereoTemp() {
  if (typeof wx === 'undefined' || !wx || typeof wx.temp !== 'number' || Date.now() - wxAt > 3 * 3600e3) return '';
  return Math.round(wx.temp) + '°C';
}
// what the mode plays is sounding (7.10.4: the DM-90's music is a mode too: SERVER)
const stereoLive = () => stereoCfg.mode === 'radio' ? radioPlaying() : stereoCfg.mode === 'cd' ? cdPlaying() : stereoCfg.mode === 'music' ? musicPlaying() : stereoPlaying();
function stereoDispText() {
  if (stereoFlash.until > Date.now()) return stereoFlash.text;   // the volume, for a moment
  let d = stereoCfg.disp;
  if (d === 'clocktemp') d = stereoTemp() && Math.floor(Date.now() / 4000) % 2 ? 'temp' : 'clock';   // 4 s each
  if (d === 'clock') { const t = new Date(); return String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0'); }
  if (d === 'temp') return stereoTemp() || 'NO WEATHER';
  if (d === 'time') {
    if (stereoCfg.mode === 'radio') return 'LIVE';
    const i = stereoInfo();
    if (stereoCfg.mode === 'cd') return i.length ? String(i.number).padStart(2, '0') + '  -' + mmss(Math.max(0, i.length - cdPosition())) : '--:--';
    if (stereoCfg.mode === 'music') return i.length ? String(i.number).padStart(2, '0') + '  -' + mmss(Math.max(0, i.length - musicAudio.currentTime)) : '--:--';
    const dur = np && np.dur > 0 ? np.dur : 0, pos = np ? npPosition() : 0;
    return stereoPlaying() ? (dur ? '-' + mmss(Math.max(0, dur - pos)) : mmss(pos)) : '--:--';
  }
  return '';
}
// 7.9.21: VOL ▲ ▼ and ATT write the volume big on the display for two seconds ("VOL 24"), Windows' own number
const stereoFlash = { text: '', until: 0 };
function stereoFlashSay(text) { stereoFlash.text = text; stereoFlash.until = Date.now() + 2000; stereoText(true); }
if (window.nowPlaying && window.nowPlaying.onVolume) window.nowPlaying.onVolume(v => {
  if (!v || !stereoMode || stereoFlash.until < Date.now() - 1500) return;   // only an answer to the stereo's own keys
  stereoFlashSay(v.mute ? 'ATT' : v.vol >= 0 ? 'VOL ' + v.vol : stereoFlash.text);
});
// 7.9.21: the small print at the bottom: the song's number and length (the time left counts down there) and the
// quality: the radio's stream ("MP3 128"), an audio CD's PCM ("CD 16/44"), a disc of files their format (FLAC, MP3)
function stereoInfo() {
  if (stereoCfg.mode === 'radio') return { quality: radioPlaying() && !radioTrouble ? radioQuality(radioNow) : '' };
  if (stereoCfg.mode === 'music') {
    const m = musicNow();
    return m ? { number: musicPos + 1, length: isFinite(musicAudio.duration) ? musicAudio.duration : m.len || 0, quality: musicQualityShort(m.media) } : {};
  }
  if (stereoCfg.mode !== 'cd' || !cdInfo || !cdInfo.present) return {};
  const files = cdFiles();
  if (files.length) return { number: cdFile + 1, length: isFinite(cdAudio.duration) ? cdAudio.duration : 0, quality: cdQuality(), disc: true };
  const tr = cdAudioTracks(), n = cdState.track || (tr[0] && tr[0].n) || 0, t = tr.find(x => x.n === n);
  return tr.length ? { number: n, length: t && t.len || 0, quality: cdQuality(), disc: true } : {};
}
function stereoContext() {
  const d = stereoCfg.disp;
  if (d === 'temp' && stereoTemp() && typeof clockCfg === 'object' && clockCfg.place) {
    const where = clockCfg.place.name + (wx && typeof wx.max === 'number' ? ' · ↑' + Math.round(wx.max) + '° ↓' + Math.round(wx.min) + '°' : '');
    return where;
  }
  if (stereoCfg.mode === 'radio') { const st = radioNow || radioMem[radioMem.band][(radioMem.slot || 1) - 1]; return st ? (st.freq ? radioMem.band + ' ' + st.freq + ' · ' : '') + st.name : radioMem.band; }
  if (stereoCfg.mode === 'music') { const m = musicNow(); return m ? m.name + (m.artist ? ' · ' + m.artist : '') : 'DM-90'; }
  if (stereoCfg.mode === 'cd') {
    if (cdFiles().length) return String(cdFiles()[cdFile] || '').split(/[\\/]/).pop().replace(/\.[^.]+$/, '');
    const n = cdAudioTracks().length ? cdState.track || cdAudioTracks()[0].n : 0, song = n && cdSongName(n);
    return song ? song.title + (song.artist ? ' · ' + song.artist : '') : n ? 'CD · TRACK ' + String(n).padStart(2, '0') : 'CD';
  }
  return np && np.title ? np.title + (np.artist ? ' · ' + np.artist : '') : '';
}
const stereoPlaying = () => capture.running && (np ? npPlaying() : audible());
function stereoText(force) {
  if (!stereoDisplay) return;
  let key;
  const extra = stereoDispText();
  if (extra) {                                                 // DISP: the time, the temperature, BPM or loudness
    key = 'disp|' + stereoCfg.mode + '|' + extra + '|' + stereoContext() + '|' + radioPlaying() + '|' + JSON.stringify(stereoInfo());
    if (key !== stereoShown || force) {
      stereoShown = key;
      if (stereoCfg.mode === 'radio') {                        // the radio keeps its own screen, the words in place of the dial
        stereoDisplay.setPlayback(false);
        stereoDisplay.setRadio({ band: '', frequency: extra, preset: radioMem.slot || 1, live: radioPlaying(), name: stereoContext(), mono: radioMem.band === 'AM', quality: stereoInfo().quality || '' });
      } else stereoDisplay.setTrack({ title: extra, artist: stereoContext(), playing: true, ...stereoInfo() });
    }
    stereoDisplay.setElapsed(stereoCfg.mode === 'cd' ? cdPosition() : stereoCfg.mode === 'music' ? musicAudio.currentTime || 0 : stereoCfg.mode === 'pc' && np ? npPosition() : 0);
    if (!(stereoLive())) stereoDisplay.setLevels(0, 0);
    stereoPaint(); return;
  }
  if (stereoCfg.mode === 'music') {                            // 7.10.4: the DM-90's song, as the CD's
    const m = musicNow(), info = stereoInfo();
    const title = m ? m.name : musicServer.signedIn ? 'SERVER' : 'NO SERVER';
    const artist = m ? [m.artists || m.artist, m.album].filter(Boolean).join(' · ') + (musicPaused() ? ' · PAUSE' : '')
      : musicServer.signedIn ? 'DM-90 · SEL PLAYS IT ALL AT RANDOM' : 'DM-90 · SETUP IN THE RACK';
    key = 'music|' + title + '|' + artist + '|' + JSON.stringify(info);
    if (key !== stereoShown || force) { stereoShown = key; stereoDisplay.setTrack({ title, artist, playing: true, ...info }); }
    stereoDisplay.setElapsed(musicAudio.currentTime || 0);
    if (!musicPlaying()) stereoDisplay.setLevels(0, 0);
  } else if (stereoCfg.mode === 'cd') {
    let title, artist = '', playing = true;
    const tr = cdAudioTracks(), files = cdFiles();
    if (!cdInfo) title = 'READING';
    else if (cdInfo.none === 'windows') { title = 'WINDOWS ONLY'; artist = 'THE CD DRIVE WORKS ON WINDOWS'; }
    else if (!cdInfo.drive) { title = 'NO CD DRIVE'; artist = 'CONNECT A CD DRIVE AND PRESS MODE'; }
    else if (!cdInfo.present) { title = 'NO DISC'; artist = 'INSERT A DISC AND PRESS THE SLOT'; }
    else if (files.length) {
      const f = String(files[cdFile] || '').split(/[\\/]/).pop().replace(/\.[^.]+$/, '');
      title = f || 'MP3'; artist = 'DISC · ' + (cdFile + 1) + '/' + files.length;
    } else if (tr.length) {
      const n = cdState.track || tr[0].n, total = tr.reduce((a, t) => a + (t.len || 0), 0), song = cdSongName(n);
      if (song) { title = song.title; artist = song.artist + ' · ' + String(n).padStart(2, '0') + (cdState.state === 'paused' ? ' · PAUSE' : ''); }
      else { title = 'TRACK ' + String(n).padStart(2, '0'); artist = 'CD · ' + tr.length + ' TRACKS · ' + mmss(total) + (cdState.state === 'paused' ? ' · PAUSE' : ''); }
    } else { title = 'NO AUDIO'; artist = 'THIS DISC HAS NO MUSIC'; }
    const info = stereoInfo();
    key = 'cd|' + title + '|' + artist + '|' + JSON.stringify(info);
    if (key !== stereoShown || force) { stereoShown = key; stereoDisplay.setTrack({ title, artist, playing, ...info }); }
    stereoDisplay.setElapsed(cdPosition());
    if (!cdPlaying()) stereoDisplay.setLevels(0, 0);
  } else if (stereoCfg.mode === 'radio') {
    const st = radioNow || (radioMem[radioMem.band][(radioMem.slot || 1) - 1]) || RADIO_DEFAULTS[0];
    const live = radioPlaying();
    const freq = st.freq ? st.freq : shortName(st.name).toUpperCase();
    const q = stereoInfo().quality || '', song = radioSong();
    // the line under the frequency is short: the song, and every few seconds the station (7.9.21: the quality is
    // at the bottom now; a station that dropped says so)
    const trouble = radioNow && radioTrouble === 'retry' ? 'RECONNECTING…' : radioNow && radioTrouble === 'lost' ? 'NO SIGNAL' : '';
    const line = trouble || (!live ? '' : song && Math.floor(Date.now() / 4000) % 3 !== 2 ? song : st.name);
    key = 'radio|' + radioMem.band + '|' + freq + '|' + live + '|' + radioMem.slot + '|' + line + '|' + q;
    if (key !== stereoShown || force) {
      stereoShown = key;
      stereoDisplay.setPlayback(false);
      stereoDisplay.setRadio({ band: radioMem.band, frequency: freq, preset: radioMem.slot || 1, live, name: line, mono: radioMem.band === 'AM', quality: q });
    }
  } else {
    const playing = stereoPlaying();
    let title = '', artist = '';
    if (playing) {
      const song = np && np.title ? np.title : activeSource === 'demo' ? 'DEMO 124 BPM' : activeSource === 'mic' ? 'MICROPHONE' : 'PC AUDIO';
      artist = np && np.artist ? np.artist : '';
      title = song;
    }
    key = 'pc|' + playing + '|' + title + '|' + artist;
    if (key !== stereoShown || force) {
      stereoShown = key;
      if (playing) stereoDisplay.setTrack({ title, artist, playing: true });
      else { stereoDisplay.setRadio({ band: 'FM1', frequency: '102.3', preset: 12, live: false, name: '', mono: false, quality: '' }); stereoDisplay.setPlayback(false); }
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
  if (stereoLive()) stereoLevels(now);
  if (now - stereoTextAt > 250) { stereoTextAt = now; stereoText(); }
}
setInterval(() => { if (stereoMode && !capture.running) stereoText(); }, 500);   // the loop sleeps with nothing running

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
    live: stereoLive(),
    hue: look ? 0 : STEREO_HUES[stereoCfg.color - 1], dim: STEREO_DIM[stereoCfg.dim],
    look: look ? look.id : '', light: !!(look && look.light), face: look && look.face || '', aux: !!capture.running || radioPlaying() || cdPlaying(),
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
const stereoResume = { pc: false, cd: false, music: false };
function stereoSwitch(next) {
  const from = stereoCfg.mode;
  if (from === 'pc' && npPcPlaying() && window.nowPlaying) { window.nowPlaying.cmd('pause'); stereoResume.pc = true; }
  if (from === 'radio') radioStop();
  if (from === 'cd') {
    if (cdState.state === 'playing' && window.cdrom) { cdCmd('cd-pause'); stereoResume.cd = true; }
    else if (!cdAudio.paused) { cdAudio.pause(); stereoResume.cd = true; }
  }
  if (from === 'music' && musicPlaying()) { musicPauseHere(); stereoResume.music = true; }
  stereoCfg.mode = next; savePrefs();
  if (next === 'music' && stereoResume.music) { stereoResume.music = false; musicToggle(); toast('MODE · <span>SERVER</span> · sigue donde estaba', 1600); return true; }
  if (next === 'pc' && stereoResume.pc) { stereoResume.pc = false; if (window.nowPlaying) window.nowPlaying.cmd('play'); }
  if (next === 'cd' && stereoResume.cd) {
    stereoResume.cd = false;
    if (cdFiles().length && cdAudio.getAttribute('src')) cdAudio.play().catch(() => {});
    else if (cdState.state === 'paused' && window.cdrom) cdCmd('cd-resume');
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
  stereoFlashSay(step > 0 ? 'VOL +' : step < 0 ? 'VOL -' : 'ATT');   // until Windows says the number
  if (step < 0) { for (let i = 0; i < STEREO_VOL_DOWN; i++) window.nowPlaying.cmd('voldown'); return; }
  window.nowPlaying.cmd(step > 0 ? 'volup' : 'mute');
  if (!step) toast('ATT · <span>silencio</span> (otra vez para volver)', 1400);
}
let stereoMemo = 0;
function stereoKey(k, hold) {
  if (k === 'volup') return stereoVolume(1);
  if (k === 'voldown') return stereoVolume(-1);
  if (k === 'att') return stereoVolume(0);
  if (k === 'pwr') return toggleStereo();
  if (k === 'eject') {
    if (!window.cdrom) { toast('La bandeja se abre desde el programa en Windows.', 2400); return; }
    cdStop(); cdCmd('cd-eject'); toast('⏏ · <span>bandeja</span>', 1400); return;
  }
  if (k === 'mode' || k === 'slot') {
    const next = k === 'slot' ? 'cd' : { pc: 'radio', radio: 'cd', cd: 'music', music: 'pc' }[stereoCfg.mode];
    if (next === stereoCfg.mode) { cdAsk(); return; }
    const resumed = stereoSwitch(next);
    if (next === 'pc') toast('MODE · <span>PC</span>: lo que suena en la computadora', 1800);
    else if (next === 'radio') { toast('MODE · <span>RADIO</span> por internet', 1600); if (radioNow) radioTune(radioNow); else radioMemory(radioMem.slot || 1); }
    else if (next === 'music') { if (!resumed) toast('MODE · <span>SERVER</span>: la música del DM-90' + (musicServer.signedIn ? ' (SEL la pone)' : ' · conectalo con SETUP en el rack'), 2200); }
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
  // 7.10.12: BAND held is A.MEM (printed under it): the next number keeps the station playing, as the tuner's MEMO
  if (k === 'band' && hold) {
    if (!radioNow) { toast('Primero sintonizá una radio (TUNE) y después BAND apretado y el número', 2600); return; }
    clearTimeout(stereoMemo); stereoMemo = setTimeout(() => { stereoMemo = 0; }, 6000);
    toast('A.MEM · tocá el <span>1–6</span> donde guardarla (mantenelo apretado para el <span>7–12</span>)', 2600);
    return;
  }
  if (k === 'band') {
    radioMem.band = RADIO_BANDS[(RADIO_BANDS.indexOf(radioMem.band) + 1) % RADIO_BANDS.length]; radioMem.slot = 0; saveRadio();
    toast('BAND · <span>' + radioMem.band + '</span> · doce memorias (1–6, y 7–12 manteniendo apretado)', 1800);
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
  if (/^m[1-6]$/.test(k)) {                                        // 7.10.12: held, 7–12; after A.MEM, kept there
    if (stereoCfg.mode !== 'radio') stereoSwitch('radio');
    const store = !!stereoMemo; clearTimeout(stereoMemo); stereoMemo = 0;
    return radioMemory(Number(k[1]) + (hold ? 6 : 0), store);
  }
  const radio = stereoCfg.mode === 'radio';
  if (stereoCfg.mode === 'music' && (k === 'sel' || k === 'prev' || k === 'next')) {   // 7.10.4: the DM-90's queue
    if (k === 'sel') {
      if (musicQueue.length || musicAudio.getAttribute('src')) musicToggle();
      else if (musicServer.signedIn) musicShuffleAll().then(n => n && toast('SHUFFLE ALL · <span>' + n.toLocaleString('es-AR') + ' temas</span> al azar', 2000)).catch(() => {});
      else toast('MÚSICA · <span>conectá Jellyfin</span> con SETUP en el DM-90 del rack', 2400);
    } else if (k === 'next') musicNext(); else musicPrev();
    return;
  }
  if (stereoCfg.mode === 'cd' && (k === 'sel' || k === 'prev' || k === 'next')) {
    if (k === 'sel') cdToggle(); else cdTrack(k === 'next' ? 1 : -1);
    return;
  }
  if (k === 'sel') {
    // 7.10.13: the radio "paused" is stopped and waiting (a live stream doesn't wait): ▶ tunes it back (tuner.js's source)
    if (radio) {
      const src = npSources.find(x => x.name === 'radio');
      if (radioPlaying()) { src.cmd('pause'); toast('RADIO · <span>pausa</span>', 1200); }
      else if (tunerHeld) src.cmd('play');
      else if (radioNow) radioTune(radioNow); else radioMemory(radioMem.slot || 1);
    }
    else if (window.nowPlaying) window.nowPlaying.cmd('toggle');
    return;
  }
  if (k === 'prev' || k === 'next') {
    if (radio) { radioScanSet(false); return radioStep(k === 'next' ? 1 : -1); }
    if (window.nowPlaying) window.nowPlaying.cmd(k);
    return;
  }
  if (k === 'scan') {
    if (!radio) stereoSwitch('radio');
    if (radioScan) { radioScanSet(false); toast('SCAN · <span>te quedás en esta</span>', 1500); }
    else { radioScanSet(true); toast('SCAN · <span>8 s de cada radio</span>, SCAN otra vez para quedarte', 2200); }
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
    if (/^(m[1-6]|sdm|band)$/.test(b.dataset.st)) holdT = setTimeout(() => { held = true; stereoKey(b.dataset.st, true); }, 1000);
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
deck.on('music', () => { if (stereoCfg.mode === 'music') stereoText(true); });
deck.on('cd-disc', () => {
  if (stereoCfg.mode !== 'cd' || !stereoMode) return;
  if (cdAudioTracks().length) cdCmd('cd-play ' + cdAudioTracks()[0].n);
  else if (cdFiles().length) cdPlayFile(0);
});
