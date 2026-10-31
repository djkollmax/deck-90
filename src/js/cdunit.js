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
try {
  const c = (JSON.parse(localStorage.getItem('deck90-prefs')) || {}).cdunit;
  if (c && typeof c === 'object') cdUnitCfg = { show: c.show !== false };
} catch (_) {}
let cdUnit = null, cdUnitPower = false, cdUnitWants = false, cdUnitResumePc = false, cdUnitShownKey = '', cdUnitClosing = 0;
let cdUnitAvg = -24, cdUnitAt = 0, cdUnitLv = { L: 0, R: 0 };
const cdUnitPanel = document.getElementById('cdPanel');
const cdUnitShown = () => cdUnitCfg.show && !miniMode;

function cdUnitTheme() {
  if (!cdUnit) return;
  const c = typeof chassis === 'string' ? chassis : 'TI';
  cdUnit.setTheme(c === 'BLACK' || c === 'CLASSIC' ? 'black' : 'silver');
  cdUnitPanel.classList.toggle('gold', c === 'GOLD');
}
function cdUnitBuild() {
  if (cdUnit || typeof Deck90CD !== 'function') return;
  cdUnit = new Deck90CD(document.getElementById('cdUnit'), { theme: 'silver' });
  [...cdUnit.svg.querySelectorAll('text')].filter(t => t.textContent === 'STANDBY').forEach(t => t.remove());
  cdUnitTheme();
  cdUnit.onKey(cdUnitKey);
  cdUnit.setPower(false);
  cdUnitShownKey = ''; cdUnitSync();
}
function cdUnitShow(on, quiet) {
  cdUnitCfg.show = !!on;
  cdUnitPanel.classList.toggle('mod-off', !on);
  if (on) cdUnitBuild();
  savePrefs(); if (typeof syncConsole === 'function') syncConsole();
  if (typeof sizeCanvases === 'function') requestAnimationFrame(() => { sizeCanvases(); if (!running) drawIdle(); });
  if (!quiet) toast(on ? 'CD · <span>el reproductor DC-90</span> en el rack (0 lo esconde)' : 'El reproductor de CD queda guardado (0 lo vuelve a mostrar)', 2200);
}

// what plays: an audio CD (its track and time from the drive) or a disc of MP3s (the file playing here)
const cdUnitPlaying = () => cdPlaying();
function cdUnitLine() {
  if (!window.cdrom || (cdInfo && cdInfo.none === 'windows')) return { title: 'LA LECTORA SE USA EN WINDOWS', artist: 'DC-90' };
  if (!cdUnitPower) return { title: 'COMPACT DISC', artist: 'POWER PARA PRENDER' };
  if (cdUnitClosing) return { title: 'CERRANDO LA BANDEJA…', artist: '' };
  if (!cdInfo) return { title: 'LEYENDO EL DISCO…', artist: '' };
  if (!cdInfo.drive) return { title: 'NO HAY LECTORA DE CD', artist: 'CONECTÁ UNA POR USB' };
  if (!cdInfo.present) return { title: 'SIN DISCO', artist: (cdInfo.name || cdInfo.drive) + ' · OPEN / CLOSE' };
  const files = cdFiles();
  if (files.length) {
    const f = String(files[cdFile] || '').split(/[\\/]/).pop().replace(/\.[^.]+$/, '');
    return { title: f || 'MP3', artist: 'DISCO MP3 · ' + (cdFile + 1) + ' DE ' + files.length };
  }
  const tr = cdAudioTracks();
  if (!tr.length) return { title: 'DISCO SIN AUDIO', artist: cdInfo.name || cdInfo.drive };
  const total = tr.reduce((s, t) => s + (t.len || 0), 0);
  return { title: 'CD AUDIO · PISTA ' + String(cdState.track || tr[0].n).padStart(2, '0'), artist: tr.length + ' PISTAS · ' + mmss(total) + ' · ' + (cdInfo.name || cdInfo.drive) };
}
function cdUnitSync() {
  if (!cdUnit) return;
  const line = cdUnitLine(), files = cdFiles(), tr = cdAudioTracks();
  const playing = cdUnitPlaying() && cdState.state !== 'paused';
  const paused = files.length ? !!cdAudio.getAttribute('src') && cdAudio.paused : cdState.state === 'paused';
  let track = 1, total = 1, elapsed = 0, duration = 0;
  if (files.length) { track = cdFile + 1; total = files.length; elapsed = cdAudio.currentTime || 0; duration = isFinite(cdAudio.duration) ? cdAudio.duration : 0; }
  else if (tr.length) {
    const cur = cdState.track || tr[0].n, i = Math.max(0, tr.findIndex(t => t.n === cur));
    track = i + 1; total = tr.length; elapsed = cdState.state ? cdPosition() : 0; duration = tr[i] ? tr[i].len || 0 : 0;
  }
  const r = { title: line.title, artist: line.artist, track, totalTracks: total, elapsed: Math.floor(elapsed), duration: Math.round(duration), playing, paused: !playing && paused };
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

// the CD takes the sound: the PC's player waits, the radio goes off (whoever paused the PC hands that over)
function cdUnitTakeSound() {
  if (typeof tunerPower !== 'undefined' && tunerPower) {
    if (tunerResumePc) { tunerResumePc = false; cdUnitResumePc = true; }
    radioStop();
  }
  if (typeof np === 'object' && np && np.status === 'Playing' && window.nowPlaying && !cdUnitResumePc) { window.nowPlaying.cmd('pause'); cdUnitResumePc = true; }
}
// the radio took it: the CD stops, quietly
function cdUnitYield() {
  if (!cdUnitPower) return false;
  const had = cdUnitResumePc;
  cdUnitResumePc = false; cdUnitWants = false;
  cdStop(); cdUnitPower = false; cdUnit && cdUnit.setPower(false); cdUnitSync();
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
  if (cdUnitPower && cdUnitWants && !(typeof stereoMode !== 'undefined' && stereoMode)) {
    cdUnitWants = false;
    if (!cdUnitStart() && cdInfo && cdInfo.drive && !cdInfo.present) toast('CD · <span>no hay disco</span> en la lectora', 2200);
  }
  cdUnitSync();
}
function cdUnitRead() { cdUnitWants = true; cdAsk(); cdUnitSync(); }

function cdUnitOn(on) {
  if (on === cdUnitPower) return;
  cdUnitPower = on; cdUnit && cdUnit.setPower(on);
  if (on) cdUnitRead();
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
    if (k !== 'eject') { cdUnitOn(true); return; }              // any key wakes it and plays the disc that's in
    cdUnitPower = true; cdUnit.setPower(true);                  // OPEN / CLOSE wakes it with the tray open
  }
  if (k === 'eject') {
    const open = cdUnit.getState().drawerOpen;
    if (!open) {
      cdStop(); window.cdrom.cmd('cd-eject'); cdUnit.setDrawer(true); toast('⏏ · <span>bandeja abierta</span>: poné el disco y OPEN / CLOSE otra vez', 2600);
    } else {
      cdUnit.setDrawer(false); window.cdrom.cmd('cd-close');
      clearTimeout(cdUnitClosing);
      cdUnitClosing = setTimeout(() => { cdUnitClosing = 0; cdUnitRead(); }, 3500);   // the disc spins up before it can be read
      toast('⏏ · <span>cerrando</span> y leyendo el disco…', 2200);
    }
    return cdUnitSync();
  }
  if (cdUnit.getState().drawerOpen) { cdUnit.setDrawer(false); window.cdrom.cmd('cd-close'); cdUnitClosing = setTimeout(() => { cdUnitClosing = 0; cdUnitRead(); }, 3500); return cdUnitSync(); }
  if (!cdInfo || !cdInfo.present) { cdUnitRead(); return; }
  const files = cdFiles();
  if (k === 'play') {
    if (files.length ? !cdAudio.paused : cdState.state === 'playing') return;
    if (cdState.state === 'paused' || (files.length && cdAudio.getAttribute('src'))) { cdUnitTakeSound(); cdToggle(); }
    else cdUnitStart();
  }
  if (k === 'pause') { if (cdUnitPlaying() || cdState.state === 'paused' || (files.length && cdAudio.getAttribute('src'))) { if (!cdUnitPlaying()) cdUnitTakeSound(); cdToggle(); } }
  if (k === 'stop') { if (files.length) { cdAudio.pause(); cdAudio.currentTime = 0; } else if (window.cdrom) { window.cdrom.cmd('cd-stop'); cdState = { state: 'stopped', track: cdState.track, pos: 0, at: performance.now() }; } }
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
