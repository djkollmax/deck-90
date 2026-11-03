'use strict';
// ═══════════════════════════════════════════════════════════
//  REPRODUCTOR DE CD DC-90 (7.9.2): the rack's CD unit, under the tuner (VER → CD, or 0)
//  It plays the PC's CD/DVD drive (a USB one too) through the same engine as the car stereo's CD mode
//  (stereo.js: the bridge's MCI commands for an audio CD, an <audio> for a disc of MP3s). The component
//  (vendor/dc90-cd.js) only draws and says which key was touched.
//    POWER          on: reads the drive and plays the disc; off: stops it (the PC's player picks up again)
//    OPEN / CLOSE   opens the real tray; again closes it and reads the disc
//    ▶  ❚❚  ■       play, pause, stop          |◀◀ ▶▶|   track before / after (around the disc's ends)
//  The CD and the radio are one at a time: playing one turns the other off.
// ═══════════════════════════════════════════════════════════
let cdUnitCfg = { show: true };
{
  const c = store.section('cdunit');
  if (c) cdUnitCfg = { show: c.show !== false, remain: c.remain === true };
}
let cdUnit = null, cdUnitPower = false, cdUnitWants = false, cdUnitResumePc = false, cdUnitShownKey = '', cdUnitClosing = 0;
let cdUnitAvg = -24, cdUnitAt = 0, cdUnitLv = { L: 0, R: 0 };
const cdUnitPanel = document.getElementById('cdPanel');
const cdUnitShown = () => cdUnitCfg.show && !miniMode;

function cdUnitTheme() {
  if (!cdUnit) return;
  const c = typeof chassis === 'string' ? chassis : 'TI';
  cdUnit.setTheme(c === 'BLACK' || c === 'ANTHRACITE' || c === 'CLASSIC' ? 'black' : 'silver');
  cdUnitPanel.classList.toggle('gold', c === 'GOLD');
}
function cdUnitBuild() {
  if (cdUnit || typeof Deck90CD !== 'function') return;
  cdUnit = new Deck90CD(document.getElementById('cdUnit'), { theme: 'silver' });
  [...cdUnit.svg.querySelectorAll('text')].filter(t => t.textContent === 'STANDBY').forEach(t => t.remove());
  cdUnitTheme();
  cdUnit.onKey(cdUnitKey);
  cdUnitTimeKey();
  cdUnit.setModes(cdModes);
  cdUnit.setPower(false);
  cdUnitShownKey = ''; cdUnitSync();
}
// 7.9.13: a touch on the time switches it between the time played and the time left (a minus lights), like the
// TIME key of a real player; remembered
function cdUnitTimeKey() {
  cdUnit.setTimeMode(cdUnitCfg.remain ? 'remain' : 'elapsed');
  const hit = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  for (const [k, v] of Object.entries({ x: 38, y: 46, width: 200, height: 84, fill: 'transparent', role: 'button', tabindex: 0, 'data-role': 'time-key',
    'aria-label': 'Tiempo: transcurrido o restante' })) hit.setAttribute(k, v);
  hit.style.cursor = 'pointer'; hit.style.outline = 'none';
  const flip = () => {
    cdUnitCfg.remain = !cdUnitCfg.remain; savePrefs();
    cdUnit.setTimeMode(cdUnitCfg.remain ? 'remain' : 'elapsed');
    toast('CD · <span>' + (cdUnitCfg.remain ? 'tiempo restante' : 'tiempo transcurrido') + '</span>', 1200);
  };
  hit.addEventListener('click', flip);
  hit.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); flip(); } });
  cdUnit.svg.append(hit);
}
function cdUnitShow(on, quiet) {
  cdUnitCfg.show = !!on;
  cdUnitPanel.classList.toggle('mod-off', !on);
  if (on) cdUnitBuild();
  savePrefs(); syncConsole();
  requestAnimationFrame(() => { sizeCanvases(); if (!capture.running) drawIdle(); });
  if (!quiet) toast(on ? 'CD · <span>el reproductor DC-90</span> en el rack (0 lo esconde)' : 'El reproductor de CD queda guardado (0 lo vuelve a mostrar)', 2200);
}

// what plays: an audio CD (its track and time from the drive) or a disc of MP3s (the file playing here)
const cdUnitPlaying = () => cdPlaying();
function cdUnitLine() {
  if (!window.cdrom || (cdInfo && cdInfo.none === 'windows')) return { title: 'CD DRIVE ON WINDOWS ONLY', artist: 'DC-90' };
  if (!cdUnitPower) return { title: 'COMPACT DISC', artist: 'PRESS POWER' };
  if (cdUnitClosing) return { title: 'CLOSING…', artist: '' };
  if (!cdInfo) return { title: 'READING DISC…', artist: '' };
  if (!cdInfo.drive) return { title: 'NO CD DRIVE', artist: 'CONNECT ONE BY USB' };
  if (!cdInfo.present) return { title: 'NO DISC', artist: (cdInfo.name || cdInfo.drive) + ' · OPEN / CLOSE' };
  const files = cdFiles();
  if (files.length) {
    const f = String(files[cdFile] || '').split(/[\\/]/).pop().replace(/\.[^.]+$/, '');
    return { title: f || 'FILE', artist: (cdExt(files[cdFile]) || 'MP3') + ' DISC · ' + (cdFile + 1) + ' OF ' + files.length };   // 7.9.22: its format
  }
  const tr = cdAudioTracks();
  if (!tr.length) return { title: 'NO AUDIO ON DISC', artist: cdInfo.name || cdInfo.drive };
  const total = tr.reduce((s, t) => s + (t.len || 0), 0), n = cdState.track || tr[0].n, song = cdSongName(n);
  if (song) {                                                    // 7.9.5: from MusicBrainz
    const line = song.artist + (cdNames.album ? ' · ' + cdNames.album : '');
    return { title: song.title, artist: line + (cdNames.year && line.length + 7 <= 39 ? ' (' + cdNames.year + ')' : '') };   // the year if it fits
  }
  return { title: 'AUDIO CD · TRACK ' + String(n).padStart(2, '0'), artist: tr.length + ' TRACKS · ' + mmss(total) + ' · ' + (cdInfo.name || cdInfo.drive) };
}
function cdUnitSync() {
  if (!cdUnit) return;
  const line = cdUnitLine(), files = cdFiles(), tr = cdAudioTracks();
  const playing = cdUnitPlaying() && cdState.state !== 'paused';
  const paused = files.length ? !!cdAudio.getAttribute('src') && cdAudio.paused : cdState.state === 'paused';
  let track = 0, total = 0, elapsed = 0, duration = 0;   // 7.9.23: no disc, no track (dashes)
  if (files.length) { track = cdFile + 1; total = files.length; elapsed = cdAudio.currentTime || 0; duration = isFinite(cdAudio.duration) ? cdAudio.duration : 0; }
  else if (tr.length) {
    const cur = cdState.track || tr[0].n, i = Math.max(0, tr.findIndex(t => t.n === cur));
    track = i + 1; total = tr.length; elapsed = cdState.state ? cdPosition() : 0; duration = tr[i] ? tr[i].len || 0 : 0;
  }
  const r = { title: line.title, artist: line.artist, track, totalTracks: total, elapsed: Math.floor(elapsed), duration: Math.round(duration), playing, paused: !playing && paused,
    quality: cdUnitPower ? cdQuality() : '' };   // 7.9.22: CD 16/44, FLAC 24/96, MP3 320
  cdUnitPanel.classList.toggle('idle', cdUnitPower && !cdPlaying() && radioPlaying());   // 7.9.15: on, the radio playing
  const key = JSON.stringify(r) + cdUnitPower;
  if (key === cdUnitShownKey) return;
  cdUnitShownKey = key;
  cdUnit.setTrack(r);
}
setInterval(() => { if (cdUnit && cdUnitShown()) cdUnitSync(); }, 250);

// every frame from the loop: the L/R bars on the sound Deck 90 hears
function cdUnitFeed(now) {
  if (!cdUnit) return;
  const dt = cdUnitAt ? Math.min(200, now - cdUnitAt) : 16; cdUnitAt = now;
  const L = vu.L.dbfs, R = vu.R.dbfs, loud = Math.max(L, R);
  if (loud > -60) cdUnitAvg += (loud - cdUnitAvg) * (1 - Math.exp(-dt / 2500));
  const lv = d => d < -60 ? 0 : Math.max(0, Math.min(1, (d - (cdUnitAvg - 10)) / 14));
  const fall = 1 - Math.exp(-dt / 160);
  for (const [k, d] of [['L', L], ['R', R]]) { const t = lv(d); cdUnitLv[k] = t > cdUnitLv[k] ? t : cdUnitLv[k] + (t - cdUnitLv[k]) * fall; }
  cdUnit.setLevels(cdUnitLv.L, cdUnitLv.R);
}

// the CD takes the sound: the PC's player waits, the radio goes quiet (whoever paused the PC hands that over).
// 7.9.15: like two units of a real rack, the tuner stays on (its station on the display, dimmer), only silent.
function cdUnitTakeSound() {
  if (tunerPower) {
    if (tunerResumePc) { tunerResumePc = false; cdUnitResumePc = true; }
    radioStop(true);
  }
  if (np && np.status === 'Playing' && window.nowPlaying && !cdUnitResumePc) { window.nowPlaying.cmd('pause'); cdUnitResumePc = true; }
}
// the radio took it: the CD pauses where it was and stays on (7.9.15; PLAY goes on from there)
function cdUnitYield() {
  if (!cdUnitPower) return false;
  const had = cdUnitResumePc;
  cdUnitResumePc = false; cdUnitWants = false;
  cdPauseHere();
  cdUnitSync();
  return had;
}
// start the disc that's in: its first audio track, or its first file
function cdUnitStart() {
  if (!cdInfo || !cdInfo.present) return false;
  const tr = cdAudioTracks();
  if (tr.length) { cdUnitTakeSound(); cdGo(cdState.track && tr.some(t => t.n === cdState.track) ? cdState.track : tr[0].n); return true; }
  if (cdFiles().length) { cdUnitTakeSound(); cdPlayFile(cdAudio.getAttribute('src') ? cdFile : 0); return true; }
  return false;
}
// the drive answered (stereo.js calls this): a disc asked to play starts now
function cdUnitInfo() {
  if (cdUnitPower && cdUnitWants && !stereoMode) {
    cdUnitWants = false;
    if (!cdUnitStart() && cdInfo && cdInfo.drive && !cdInfo.present) toast('CD · <span>no hay disco</span> en la lectora', 2200);
  }
  cdUnitSync();
}
function cdUnitRead() { cdUnitWants = true; cdAsk(); cdUnitSync(); }

// 7.9.21: POWER with the radio playing reads the disc (its names and songs on the display) and the radio goes on;
// PLAY or another CD key plays it. A key that wakes the unit (keyPlays) plays it at once, as before.
function cdUnitOn(on, keyPlays) {
  if (on === cdUnitPower) return;
  cdUnitPower = on; cdUnit && cdUnit.setPower(on);
  if (on && !keyPlays && radioPlaying()) { cdUnitWants = false; cdAsk(); toast('CD · <span>encendido</span> · la radio sigue: PLAY pone el disco', 2200); }
  else if (on) cdUnitRead();
  else {
    cdUnitWants = false; cdStop();
    if (cdUnitResumePc) { cdUnitResumePc = false; if (window.nowPlaying) window.nowPlaying.cmd('play'); }
    toast('CD · <span>apagado</span>', 1200);
  }
  cdUnitSync();
}

function cdUnitKey(k, { hold } = {}) {
  if (k === 'power') return cdUnitOn(!cdUnitPower);
  if (!window.cdrom || (cdInfo && cdInfo.none === 'windows')) { toast('La lectora de CD se usa desde el programa en Windows.', 2600); return; }
  if (!cdUnitPower) {
    if (k !== 'eject') { cdUnitOn(true, true); return; }              // any key wakes it and plays the disc that's in
    cdUnitPower = true; cdUnit.setPower(true);                  // OPEN / CLOSE wakes it with the tray open
  }
  if (k === 'repeat' || k === 'shuffle') {                     // 7.9.14: the play modes
    if (k === 'repeat') cdModes.repeat = { off: 'all', all: 'one', one: 'off' }[cdModes.repeat];
    else { cdModes.shuffle = !cdModes.shuffle; if (cdModes.shuffle) cdShuffleStart(); }
    cdModesSave(); cdUnit.setModes(cdModes);
    toast(k === 'repeat' ? 'REPEAT · <span>' + { off: 'apagado', all: 'todo el disco', one: 'este tema' }[cdModes.repeat] + '</span>'
      : 'SHUFFLE · <span>' + (cdModes.shuffle ? 'al azar' : 'en orden') + '</span>', 1400);
    return;
  }
  if (k === 'eject') {
    const open = cdUnit.getState().drawerOpen;
    if (!open) {
      cdStop(); cdCmd('cd-eject'); cdUnit.setDrawer(true); toast('⏏ · <span>bandeja abierta</span>: poné el disco y OPEN / CLOSE otra vez', 2600);
    } else {
      cdUnit.setDrawer(false); cdCmd('cd-close');
      clearTimeout(cdUnitClosing);
      cdUnitClosing = setTimeout(() => { cdUnitClosing = 0; cdUnitRead(); }, 3500);   // the disc spins up before it can be read
      toast('⏏ · <span>cerrando</span> y leyendo el disco…', 2200);
    }
    return cdUnitSync();
  }
  if (cdUnit.getState().drawerOpen) { cdUnit.setDrawer(false); cdCmd('cd-close'); cdUnitClosing = setTimeout(() => { cdUnitClosing = 0; cdUnitRead(); }, 3500); return cdUnitSync(); }
  if (!cdInfo || !cdInfo.present) { cdUnitRead(); return; }
  const files = cdFiles();
  if (k === 'play') {
    if (files.length ? !cdAudio.paused : cdState.state === 'playing') return;
    if (cdState.state === 'paused' || (files.length && cdAudio.getAttribute('src'))) { cdUnitTakeSound(); cdToggle(); }
    else cdUnitStart();
  }
  if (k === 'pause') { if (cdUnitPlaying() || cdState.state === 'paused' || (files.length && cdAudio.getAttribute('src'))) { if (!cdUnitPlaying()) cdUnitTakeSound(); cdToggle(); } }
  if (k === 'stop') cdStopHere();
  if (k === 'prev' || k === 'next') { cdUnitTakeSound(); cdTrack(k === 'next' ? 1 : -1); }
  cdUnitSync();
}

// the CD goes on in the rack when the stereo closes playing it, if the unit is there
function cdUnitKeeps() {
  if (!cdUnitCfg.show || !cdPlaying()) return false;
  cdUnitPower = true; cdUnit && cdUnit.setPower(true); cdUnitSync(); return true;
}

cdUnitPanel.classList.toggle('mod-off', !cdUnitCfg.show);
if (cdUnitCfg.show) cdUnitBuild();

// the CD (src/core/cd.js): its changes on the display; a disc read, the one asked to play starts
deck.on('cd', () => { if (cdUnit) cdUnitSync(); });
deck.on('cd-disc', () => cdUnitInfo());
