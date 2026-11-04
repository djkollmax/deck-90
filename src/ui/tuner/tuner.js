'use strict';
// ═══════════════════════════════════════════════════════════
//  SINTONIZADOR DT-90 (7.8.7): the rack's radio, a hi-fi tuner under the meters (VER → RADIO, or 9)
//  It is the same radio as the car stereo: the same stations, bands and memories, played by stereo.js's engine
//  (Radio Browser, one <audio>). The component (vendor/dt90-tuner.js) only draws and says which key was touched.
//    POWER          the radio on or off (on pauses what the PC was playing; off brings it back)
//    BAND           FM1 → FM2 → FM3 → AM, or the four band keys under it (7.9.0)
//    ◀ ▶ / the knob the country's most heard stations
//    1–6            the band's memories (hold 1 s, or MEMO then the number: keep what plays there)
//    SCAN           8 s of each (held: any station in the world)
//    MODE           after the station: song · place and dial · quality · all of them (held: EVEN LEVEL)
//    DISP           the line: station, the song alone, the temperature, the time on the air (held: SLEEP)
//    the top right: the clock, and under it SLEEP's minutes, EVEN LEVEL's cut or what's ahead of the player
//  It isn't one of the looks' modules: a look or the rotation never hides it.
// ═══════════════════════════════════════════════════════════
// 7.10.13: DISP adds the song alone and the time on the air (the clock went to the top right); MODE adds all of it
const TUNER_DISP = ['name', 'song', 'temp', 'air'];
const TUNER_LINES = ['song', 'station', 'quality', 'all'];   // MODE (7.9.4): what follows the station on the line
let tunerCfg = { show: true, disp: 'name', line: 'song' };
{
  const t = store.section('tuner');
  if (t) tunerCfg = { show: t.show !== false, disp: TUNER_DISP.includes(t.disp) ? t.disp : 'name', line: TUNER_LINES.includes(t.line) ? t.line : 'song' };   // 'clock' (before 7.10.13): the station
}
let tuner = null, tunerPower = false, tunerMemo = 0, tunerResumePc = false, tunerShownKey = '';
let tunerAvg = -24, tunerAt = 0, tunerLv = { L: 0, R: 0 };
const tunerPanel = document.getElementById('tunerPanel');
const tunerShown = () => tunerCfg.show && !miniMode;

// the frame of the rack decides the tuner's: titanium and champagne are silver plates, black and classic black
function tunerTheme() {
  if (!tuner) return;
  const c = typeof chassis === 'string' ? chassis : 'TI';
  tuner.setTheme(c === 'BLACK' || c === 'ANTHRACITE' || c === 'CLASSIC' ? 'black' : 'silver');
  tunerPanel.classList.toggle('gold', c === 'GOLD');
}

// the bands are keys of the tuner itself (FM1 FM2 FM3 FM4 FM5 HI-FI AM, next to POWER); the vendor lights the one in use
function tunerBands() {}
// a band: its memory 1 (or the one it was on), on the air if the tuner is on
function tunerBand(b) {
  if (!RADIO_BANDS.includes(b)) return;
  const same = b === radioMem.band;
  radioMem.band = b; if (!same) radioMem.slot = 1; saveRadio(); radioScanSet(false);
  const st = radioMem[b][(radioMem.slot || 1) - 1];
  toast('BANDA · <span>' + b + '</span>' + (st ? ' · ' + radioMem.slot + ' ' + st.name.replace(/[<>&]/g, '') : ''), 1600);
  if (!tunerPower) tunerOn(true, true);
  radioMemory(radioMem.slot || 1);
  tunerSync();
}

function tunerBuild() {
  if (tuner || typeof Deck90Tuner !== 'function') return;
  tuner = new Deck90Tuner(document.getElementById('tuner'), { theme: 'silver' });
  tunerTheme();
  tuner.onKey(tunerKey);
  tunerShownKey = ''; tunerSync();
}

function tunerShow(on, quiet) {
  tunerCfg.show = !!on;
  tunerPanel.classList.toggle('mod-off', !on);
  if (on) tunerBuild();
  savePrefs(); syncConsole();
  requestAnimationFrame(() => { sizeCanvases(); if (!capture.running) drawIdle(); });
  if (!quiet) toast(on ? 'RADIO · <span>el sintonizador</span> en el rack (9 lo esconde)' : 'El sintonizador queda guardado (9 lo vuelve a mostrar)' + (radioPlaying() ? ': la radio sigue sonando' : ''), 2200);
}

// what the display shows: the station in use (or the memory it's on), its band and dial
function tunerStation() { return radioNow || radioMem[radioMem.band][(radioMem.slot || 1) - 1] || null; }
// 7.10.13: how long this station has been on the air (since it last started playing)
let tunerAirAt = 0, tunerAirId = -1;
const tunerAir = () => { const s = Math.floor((Date.now() - tunerAirAt) / 1000); return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map(n => String(n).padStart(2, '0')).join(':'); };
radioAudio.addEventListener('playing', () => { if (radioAired !== tunerAirId) { tunerAirId = radioAired; tunerAirAt = Date.now(); } });
function tunerLine() {
  if (tunerCfg.disp === 'temp') {
    const where = typeof clockCfg === 'object' && clockCfg.place ? clockCfg.place.name : '';
    return { name: stereoTemp() || 'NO WEATHER', text: where };
  }
  const st = tunerStation();
  const name = st ? st.name : radioMem.band + ' EMPTY';
  const live = tunerLive(), q = live ? radioQuality(st) : '', song = live ? radioSong() : '';
  // 7.9.21: on the air, one line "ASPEN · DARYL HALL & JOHN OATES - MANEATER" (the quality stays after TUNED, the
  // place under the memory). MODE picks what follows the station: the song (TEMA), where it is and its dial
  // (RADIO), or the quality spelled out (CALIDAD)
  const dial = tunerDial(st), where = !st ? '' : radioMem.band + ' ' + (dial.f === null ? 'INTERNET' : dial.f + (dial.am ? ' KHZ' : ' MHZ'));
  const kb = q ? 'QUALITY ' + q.replace(/^(\S+)\s+(\d+)$/, '$1 · $2 KBPS') : 'QUALITY UNKNOWN';
  if (tunerPower && live) {
    if (tunerCfg.disp === 'song') return { name: song || name + ' · NO SONG NAME FROM THE STATION', text: '' };
    if (tunerCfg.disp === 'air') return { name: name + ' · ON THE AIR ' + tunerAir(), text: '' };
    const after = tunerCfg.line === 'station' ? [radioPlace(st, true), where].filter(Boolean).join(' · ')
      : tunerCfg.line === 'quality' ? kb
      : tunerCfg.line === 'all' ? [song, radioPlace(st, true), where, q ? kb : ''].filter(Boolean).join(' · ')
      : song || (dial.f === null ? 'LIVE ON THE INTERNET' : 'LIVE');
    return { name: [name, after].filter(Boolean).join(' · '), text: '' };
  }
  const cdHas = cdHasSound();                                   // 7.9.15: on, the CD has the sound
  // 7.9.21: a station that doesn't answer, or whose sound dropped and is being tuned again
  const trouble = !radioNow ? '' : radioTrouble === 'retry' ? 'RECONNECTING…' : radioTrouble === 'lost' ? 'NO SIGNAL' : '';
  const text = !tunerPower ? 'STANDBY' : trouble || (cdHas ? 'STANDBY · CD PLAYING'
    : radioNow && radioAudio.getAttribute('src') ? 'TUNING…' : st ? 'STANDBY · PRESS A MEMORY OR ▶' : 'SELECT A MEMORY 1–6');
  return { name, text };
}
// on the air: playing and no trouble (a stream that broke keeps playing() true while it's tuned again)
const tunerLive = () => radioPlaying() && !radioTrouble;
// the dial: the station's own frequency, or one in its name ("La 100 - 99.9 FM", "Radio 10 AM 710"); none (a station
// heard only over the internet, 80s80s): its name in big letters where the digits go
function tunerDial(st) {
  if (!st) return { f: null, am: radioMem.band === 'AM' };
  const own = Number(String(st.freq || '').replace(',', '.'));
  if (st.freq && isFinite(own)) return { f: own, am: radioMem.band === 'AM' || own >= 530 };
  const n = String(st.name || '');
  let m = /(?:^|[^\d.,])((?:8[7-9]|9\d|10[0-8])[.,]\d{1,2})(?![\d])/.exec(n);
  if (m) return { f: Number(m[1].replace(',', '.')), am: false };
  m = /(?:\bam\s*(\d{3,4})\b|\b(\d{3,4})\s*(?:am|khz)\b)/i.exec(n);
  const k = m && Number(m[1] || m[2]);
  if (k >= 530 && k <= 1710) return { f: k, am: true };
  return { f: null, am: radioMem.band === 'AM' };
}
// 7.10.13: the top right: the clock, and under it SLEEP's minutes, else EVEN LEVEL's cut, else what the player has ahead
const tunerClock = () => { const t = new Date(); return String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0'); };
function tunerCornerSub(live) {
  if (tunerSleepAt) return 'SLEEP ' + Math.max(1, Math.ceil((tunerSleepAt - Date.now()) / 60000)) + ' MIN';
  if (!live) return '';
  if (!radioMem.even) return 'EVEN LEVEL OFF';
  const cut = radioAudio.volume < .995 ? Math.round(20 * Math.log10(Math.max(.01, radioAudio.volume))) : 0;
  if (cut) return 'EVEN LEVEL ' + cut + ' DB';
  const a = radioMeta.id === radioTry ? radioMeta.ahead : undefined;
  return typeof a === 'number' ? 'BUFFER ' + a.toFixed(1) + ' S' : 'EVEN LEVEL 0 DB';
}
// 7.10.13: SLEEP (DISP held): the radio goes off by itself in 15, 30, 60 or 90 minutes
const TUNER_SLEEP = [0, 15, 30, 60, 90];
let tunerSleepAt = 0, tunerSleepMin = 0, tunerSleepT = 0;
function tunerSleep(min) {
  clearTimeout(tunerSleepT); tunerSleepT = 0;
  tunerSleepMin = min; tunerSleepAt = min ? Date.now() + min * 60000 : 0;
  if (min) tunerSleepT = setTimeout(() => {
    tunerSleepAt = 0; tunerSleepMin = 0; tunerSleepT = 0;
    if (tunerPower) tunerOn(false); else if (radioNow) radioStop();
    toast('SLEEP · <span>la radio se apagó</span>', 4000);
  }, min * 60000);
  if (tuner) tunerSync();
}
function tunerSync() {
  if (!tuner) return;
  const st = tunerStation(), live = tunerLive(), dial = tunerDial(st), am = dial.am;
  const line = tunerLine();
  tunerBands();
  const r = {
    band: am ? 'AM' : radioMem.band === 'AM' ? 'FM1' : radioMem.band, frequency: dial.f,
    label: dial.f === null && st ? shortName(st.name) : '', preset: radioMem.slot || 0,
    name: line.name, text: line.text, stereo: !am, mono: am, auto: true,   // 7.9.4: FM always STEREO, AM always MONO
    tuned: live, scan: !!radioScan, memo: !!tunerMemo, signal: live ? radioSignal() : tunerPower && radioNow ? 1 : 0,   // 7.10.7: the stream's health
    quality: live ? radioQuality(st) : '', place: tunerPower && tunerCfg.disp === 'name' ? radioPlace(st) : '',   // 7.9.21
    corner: tunerPower ? tunerClock() : '', cornerSub: tunerPower ? tunerCornerSub(live) : '',   // 7.10.13
  };
  tunerPanel.classList.toggle('idle', tunerPower && !live && cdHasSound());   // 7.9.15: on, the other unit playing
  const key = JSON.stringify(r) + tunerPower;
  if (key === tunerShownKey) return;
  tunerShownKey = key;
  tuner.setRadio(r);
  tuner.setPower(tunerPower);
}
setInterval(() => { if (tuner && tunerShown()) tunerSync(); }, 300);
['playing', 'pause', 'error'].forEach(ev => radioAudio.addEventListener(ev, () => { if (tuner) tunerSync(); }));
// 7.9.15: the radio sounding pauses a CD that was playing (it stays on, PLAY goes on from where it was)
const cdHasSound = () => typeof cdUnitPower !== 'undefined' && cdUnitPower && cdPlaying();
radioAudio.addEventListener('playing', () => { if (tunerPower && cdHasSound() && typeof cdUnitYield === 'function' && cdUnitYield()) tunerResumePc = true; });

// every frame from the loop: the L/R bars on the sound Deck 90 hears, around the music's own loudness
function tunerFeed(now) {
  if (!tuner) return;
  if (!radioPlaying()) { tunerLv.L = tunerLv.R = 0; tuner.setLevels(0, 0); return; }   // 7.9.15: on but silent, no bars (the CD's sound isn't the radio's)
  const dt = tunerAt ? Math.min(200, now - tunerAt) : 16; tunerAt = now;
  const L = vu.L.dbfs, R = vu.R.dbfs, loud = Math.max(L, R);
  if (loud > -60) tunerAvg += (loud - tunerAvg) * (1 - Math.exp(-dt / 2500));
  const lv = d => d < -60 ? 0 : Math.max(0, Math.min(1, (d - (tunerAvg - 10)) / 14));
  const fall = 1 - Math.exp(-dt / 160);
  for (const [k, d] of [['L', L], ['R', R]]) { const t = lv(d); tunerLv[k] = t > tunerLv[k] ? t : tunerLv[k] + (t - tunerLv[k]) * fall; }
  tuner.setLevels(tunerLv.L, tunerLv.R);
}

// on and off: the PC's player waits while the radio plays, like the stereo's modes
// keyTunes: the key that woke it tunes its own station (a memory, a band, ◀ ▶), so POWER's doesn't start first
function tunerOn(on, keyTunes) {
  if (on === tunerPower) return;
  tunerPower = on; tunerMemo = 0;
  // 7.9.21: POWER with the CD playing turns the tuner on in standby, its station on the display, and the CD goes on;
  // a station key (a memory, a band, ◀ ▶, SCAN) puts the radio on and pauses the CD
  if (on && !keyTunes && cdHasSound()) toast('RADIO · <span>encendida</span> · el CD sigue: una memoria la pone', 2200);
  else if (on) {
    if (typeof cdUnitYield === 'function' && cdUnitYield()) tunerResumePc = true;   // the CD pauses; the PC's player was waiting for it
    if (npPcPlaying() && window.nowPlaying && !tunerResumePc) { window.nowPlaying.cmd('pause'); tunerResumePc = true; }
    if (!keyTunes && !radioPlaying()) { if (radioNow) radioTune(radioNow); else radioMemory(radioMem.slot || 1); }
  } else {
    radioStop();
    if (tunerResumePc) { tunerResumePc = false; if (window.nowPlaying) window.nowPlaying.cmd('play'); }
    toast('RADIO · <span>apagada</span>', 1200);
  }
  tunerSync();
}

function tunerKey(k, { hold } = {}) {
  if (k === 'power') return tunerOn(!tunerPower);
  if (k.startsWith('band-')) return tunerBand(k.slice(5).toUpperCase());
  if (k === 'disp' && hold) {                                       // 7.10.13: DISP held, SLEEP: off in 15, 30, 60, 90 min
    const next = TUNER_SLEEP[(TUNER_SLEEP.indexOf(tunerSleepMin) + 1) % TUNER_SLEEP.length];
    tunerSleep(next);
    toast('SLEEP · ' + (next ? '<span>la radio se apaga en ' + next + ' minutos</span> (DISP apretado otra vez: más tiempo o apagado)' : '<span>apagado</span>'), 2600);
    return;
  }
  if (k === 'disp') {
    tunerCfg.disp = TUNER_DISP[(TUNER_DISP.indexOf(tunerCfg.disp) + 1) % TUNER_DISP.length]; savePrefs();
    toast('DISP · <span>' + { name: 'la radio', song: 'el tema solo', temp: 'la temperatura', air: 'el tiempo al aire' }[tunerCfg.disp] + '</span>', 1300);
    return tunerSync();
  }
  if (k === 'mode' && hold) {                                       // 7.10.7: MODE held, EVEN LEVEL on or off
    radioEvenSet(!radioMem.even);
    toast('EVEN LEVEL · ' + (radioMem.even ? '<span>todas las radios al mismo volumen</span> (bajando las fuertes)' : '<span>apagado</span>: cada radio como sale'), 2200);
    return tunerSync();
  }
  if (k === 'mode') {
    tunerCfg.line = TUNER_LINES[(TUNER_LINES.indexOf(tunerCfg.line) + 1) % TUNER_LINES.length]; savePrefs();
    toast('MODE · <span>' + { song: 'el tema', station: 'de dónde es', quality: 'la calidad', all: 'todo junto' }[tunerCfg.line] + '</span> después de la radio', 1400);
    return tunerSync();
  }
  if (k === 'scan' && hold) return rfOpen(true);                     // 7.10.10: SCAN held, any station in the world (finder.js)
  if (k === 'memo' && hold) return songSave();                       // 7.10.11: MEMO held, keep the song playing (saved.js)
  if (k === 'memo') {
    if (!radioNow) { toast('Primero sintonizá una radio y después MEMO y el número', 2600); return; }
    clearTimeout(tunerMemo);                                         // 7.10.13: off, its timer goes too
    tunerMemo = tunerMemo ? 0 : setTimeout(() => { tunerMemo = 0; tunerSync(); }, 6000);
    if (tunerMemo) toast('MEMO · tocá el <span>1–6</span> donde guardarla (mantenelo apretado para el <span>7–12</span>)', 2600);
    return tunerSync();
  }
  if (!tunerPower && k !== 'band') tunerOn(true, k !== 'scan');   // a station key wakes the tuner, as on the real one
  if (k === 'band') return tunerBand(RADIO_BANDS[(RADIO_BANDS.indexOf(radioMem.band) + 1) % RADIO_BANDS.length]);
  if (k === 'tune-up' || k === 'tune-down') { radioScanSet(false); radioStep(k === 'tune-up' ? 1 : -1); return tunerSync(); }
  if (k === 'scan') {
    if (radioScan) { radioScanSet(false); toast('SCAN · <span>se queda en esta</span>', 1400); }
    else { radioScanSet(true); toast('SCAN · <span>8 s de cada radio</span>, SCAN otra vez para quedarte · mantenelo apretado para buscar en el mundo', 2600); }
    return tunerSync();
  }
  // 7.10.12: held, the number above it (1 → 7 … 6 → 12); MEMO first keeps the station there
  if (/^m[1-6]$/.test(k)) {
    const n = Number(k[1]) + (hold ? 6 : 0);
    if (tunerMemo) { clearTimeout(tunerMemo); tunerMemo = 0; radioMemory(n, true); }
    else radioMemory(n, false);
    return tunerSync();
  }
}
// the radio goes on in the tuner when the stereo closes playing it, if the tuner is in the rack
function tunerKeeps() { if (!tunerCfg.show || !radioPlaying()) return false; tunerPower = true; tunerSync(); return true; }
// the radio stopped somewhere else (the stereo's modes): the tuner goes to standby
// 7.10.13: stopped from elsewhere (the stereo's MODE, SLEEP): the PC's player it paused plays again, unless
// another unit of Deck 90 took the sound meanwhile
function tunerStopped() {
  if (tunerPower) { tunerPower = false; clearTimeout(tunerMemo); tunerMemo = 0; tunerSync(); }
  if (tunerResumePc) setTimeout(() => {
    if (!tunerResumePc || tunerPower || radioActive() || cdPlaying() || (typeof musicPlaying === 'function' && musicPlaying())) return;
    tunerResumePc = false; if (window.nowPlaying) window.nowPlaying.cmd('play');
  }, 1500);
}

tunerPanel.classList.toggle('mod-off', !tunerCfg.show);
if (tunerCfg.show) tunerBuild();

// the radio (src/core/radio.js): its changes on the display; stopped for good, the unit goes off
deck.on('radio', () => { if (tuner) tunerSync(); });
deck.on('radio-off', () => tunerStopped());

// 7.10.7: the radio in the header, the history, the deck's keys and the keyboard's media keys while it plays: the
// song the station sends ("Artist - Song"), else the station itself. ◀◀ ▶▶ go through the band's memories; ■ and ❚❚
// stop it and leave it waiting (▶ puts it back), on the tuner or the stereo
let tunerHeld = null;
npSource('radio', () => {
  const st = radioNow;
  const on = st && (radioPlaying() || radioTrouble === 'retry');   // 7.10.13: reconnecting, it's still the radio's
  if (!on) return tunerHeld && !radioPlaying() ? { app: 'Deck 90 · Radio', title: tunerHeld.name, artist: '', album: tunerHeld.freq ? radioMem.band + ' ' + tunerHeld.freq : radioMem.band, status: 'Paused', pos: 0, dur: 0, at: Date.now() } : null;
  tunerHeld = null;
  const song = radioSong(), m = /^(.+?) - (.+)$/.exec(song || '');
  const station = st.name + (st.freq ? ' ' + st.freq : '');
  return { app: 'Deck 90 · Radio', title: m ? m[2] : song || st.name, artist: m ? m[1] : song ? '' : radioPlace(st, true), album: station,
    status: 'Playing', pos: 0, dur: 0, at: Date.now() };
}, c => {
  if (c === 'prev' || c === 'next') {
    const list = radioMem[radioMem.band], from = (radioMem.slot || 1) - 1;
    for (let i = 1; i <= RADIO_SLOTS; i++) {
      const k = (from + (c === 'next' ? i : -i) + 2 * RADIO_SLOTS) % RADIO_SLOTS;
      if (list[k]) { tunerHeld = null; radioScanSet(false); radioMemory(k + 1); return; }
    }
    return;
  }
  if (radioPlaying() && (c === 'pause' || c === 'toggle')) { tunerHeld = radioNow; radioStop(true); return; }
  if (!radioPlaying() && tunerHeld && (c === 'play' || c === 'toggle')) { const st = tunerHeld; tunerHeld = null; if (typeof cdUnitYield === 'function' && cdUnitYield()) tunerResumePc = true; if (npPcPlaying() && window.nowPlaying && !tunerResumePc) { window.nowPlaying.cmd('pause'); tunerResumePc = true; } radioTune(st); }
});
deck.on('radio-off', () => { tunerHeld = null; });
