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
//    HDB     the display's brightness   SDM  its colour   PWR / ⏏  back to the rack
//  PC mode, music playing: the song in 16-segment letters, its artist and time, the L/R meters on the real
//  audio; paused: the radio screen. RADIO mode: the station's frequency (or name) and the meters on its sound.
//  The window side is the mini strip's (its own size and place, always on top); see electron/main.js.
// ═══════════════════════════════════════════════════════════
const STEREO_DISP = ['song', 'bpm', 'lufs', 'clock'];
const STEREO_DISP_NAME = { song: 'TEMA', bpm: 'BPM', lufs: 'LOUDNESS', clock: 'HORA' };
const STEREO_HUES = [0, 38, 150, 196, 248, 300];          // SDM: the original burgundy and amber, then five more lights
const STEREO_DIM = [1, .72, .48];                          // HDB: the display's brightness
const RADIO_KEY = 'deck90-radio';
// FM1 comes with Buenos Aires stations and 80s80s (Hamburg, internet only: no dial, the display shows its name);
// each is looked up by name in Radio Browser when first tuned (cc: the country, '' for anywhere)
const RADIO_DEFAULTS = [
  { name: 'Aspen', freq: '102.3', q: 'Aspen', cc: 'AR' }, { name: '80s80s', freq: '', q: '80s80s', cc: 'DE' },
  { name: 'Metro', freq: '95.1', q: 'Metro 95', cc: 'AR' }, { name: 'Rock & Pop', freq: '95.9', q: 'Rock & Pop', cc: 'AR' },
  { name: 'La 100', freq: '99.9', q: 'La 100', cc: 'AR' }, { name: 'Los 40', freq: '105.5', q: 'Los 40', cc: 'AR' },
];
const RADIO_FM2 = [{ name: 'Con Vos', freq: '89.9', q: 'Con Vos', cc: 'AR' }, null, null, null, null, null];
let stereoMode = false, stereoDisplay = null, stereoTextAt = 0, stereoShown = '';
let stereoCfg = { disp: 'song', color: 1, dim: 0, mode: 'pc' };
try {
  const c = (JSON.parse(localStorage.getItem('deck90-prefs')) || {}).stereo;
  if (c && typeof c === 'object') stereoCfg = {
    disp: STEREO_DISP.includes(c.disp) ? c.disp : 'song', color: c.color >= 1 && c.color <= 6 ? c.color | 0 : 1,
    dim: c.dim >= 0 && c.dim <= 2 ? c.dim | 0 : 0, mode: c.mode === 'radio' ? 'radio' : 'pc' };
} catch (_) {}
// the memories: { FM1: [6 × station|null], FM2, FM3 }, the band and slot in use
let radioMem = { band: 'FM1', slot: 1, FM1: RADIO_DEFAULTS.slice(), FM2: RADIO_FM2.slice(), FM3: Array(6).fill(null) };
try {
  const r = JSON.parse(localStorage.getItem(RADIO_KEY));
  if (r && typeof r === 'object') for (const b of ['FM1', 'FM2', 'FM3']) {
    if (Array.isArray(r[b])) radioMem[b] = Array.from({ length: 6 }, (_, i) => r[b][i] && r[b][i].name ? { name: String(r[b][i].name).slice(0, 80), freq: String(r[b][i].freq || '').slice(0, 8), q: String(r[b][i].q || r[b][i].name).slice(0, 60), cc: /^[A-Z]{2}$/.test(r[b][i].cc || '') ? r[b][i].cc : '', url: /^https?:\/\//.test(r[b][i].url || '') ? r[b][i].url : '' } : null);
    if (['FM1', 'FM2', 'FM3'].includes(r.band)) radioMem.band = r.band;
    if (r.slot >= 0 && r.slot <= 6) radioMem.slot = r.slot | 0;
  }
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

// ── the display ──
function stereoOpen(on) {
  stereoMode = on;
  document.body.classList.toggle('stereo', on);
  if (on && !stereoDisplay && typeof Deck90Display === 'function') {
    stereoDisplay = new Deck90Display(document.getElementById('stDisplay'), { radio: { band: radioMem.band, frequency: '102.3', preset: radioMem.slot || 1 } });
    const svg = stereoDisplay.svg;                             // only its glass, over the photo's own LCD
    svg.setAttribute('viewBox', '23 24 1141 156'); svg.setAttribute('preserveAspectRatio', 'none');
    svg.removeAttribute('width'); svg.removeAttribute('height');
    stereoShown = ''; stereoText(true);
  }
  if (!on) {
    if (radioPlaying() || radioNow) radioStop();               // the stereo off: its radio too
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
  p.classList.toggle('aux-on', !!running || radioPlaying());
}
const stereoPlaying = () => running && (np ? npPlaying() : audible());
function stereoText(force) {
  if (!stereoDisplay) return;
  let key;
  if (stereoCfg.mode === 'radio') {
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
      if (stereoCfg.disp === 'song') title = song;
      else if (stereoCfg.disp === 'bpm') { title = bpmVal > 0 ? Math.round(bpmVal) + ' BPM' : '--- BPM'; artist = song; }
      else if (stereoCfg.disp === 'lufs') { const i = typeof miniVals === 'object' && isFinite(miniVals.i) ? miniVals.i : NaN; title = isFinite(i) ? i.toFixed(1) + ' LUFS' : '--.- LUFS'; artist = song; }
      else { const d = new Date(); title = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); artist = song; }
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
// every frame from the loop: the meters (smoothed by the display itself); the words a few times a second
function stereoFeed(now) {
  if (!stereoDisplay) return;
  if (stereoCfg.mode === 'radio' ? radioPlaying() : stereoPlaying()) stereoDisplay.setDecibels(vu.L.lvl, vu.R.lvl);
  if (now - stereoTextAt > 250) { stereoTextAt = now; stereoText(); }
}
setInterval(() => { if (stereoMode && !running) stereoText(); }, 500);   // the loop sleeps with nothing running

// ── the keys ──
function stereoVolume(step) {
  if (!window.nowPlaying) { toast('El volumen se maneja desde el programa en Windows.', 2400); return; }
  window.nowPlaying.cmd(step > 0 ? 'volup' : step < 0 ? 'voldown' : 'mute');
  if (!step) toast('ATT · <span>silencio</span> (otra vez para volver)', 1400);
}
function stereoKey(k, hold) {
  if (k === 'volup') return stereoVolume(1);
  if (k === 'voldown') return stereoVolume(-1);
  if (k === 'att') return stereoVolume(0);
  if (k === 'pwr' || k === 'eject') return toggleStereo();
  if (k === 'mode') {
    stereoCfg.mode = stereoCfg.mode === 'radio' ? 'pc' : 'radio'; savePrefs();
    if (stereoCfg.mode === 'pc') { radioStop(); toast('MODE · <span>PC</span>: lo que suena en la computadora', 1800); }
    else { toast('MODE · <span>RADIO</span> por internet', 1600); radioMemory(radioMem.slot || 1); }
    return stereoText(true);
  }
  if (k === 'disp') {
    stereoCfg.disp = STEREO_DISP[(STEREO_DISP.indexOf(stereoCfg.disp) + 1) % STEREO_DISP.length]; savePrefs();
    toast('DISP · <span>' + STEREO_DISP_NAME[stereoCfg.disp] + '</span>' + (stereoCfg.mode === 'radio' ? ' (en modo PC, con música)' : ''), 1500);
    return stereoText(true);
  }
  if (k === 'hdb') { stereoCfg.dim = (stereoCfg.dim + 1) % STEREO_DIM.length; savePrefs(); return stereoPaint(); }
  if (k === 'sdm') { stereoCfg.color = stereoCfg.color % 6 + 1; savePrefs(); toast('COLOR · <span>' + stereoCfg.color + '</span> de 6', 1200); return stereoPaint(); }
  if (k === 'band') {
    radioMem.band = { FM1: 'FM2', FM2: 'FM3', FM3: 'FM1' }[radioMem.band]; radioMem.slot = 0; saveRadio();
    toast('BAND · <span>' + radioMem.band + '</span> · seis memorias (1–6)', 1500);
    return stereoText(true);
  }
  if (/^m[1-6]$/.test(k)) {
    if (stereoCfg.mode !== 'radio') { stereoCfg.mode = 'radio'; savePrefs(); }
    return radioMemory(Number(k[1]), hold);
  }
  const radio = stereoCfg.mode === 'radio';
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
    if (!radio) { stereoCfg.mode = 'radio'; savePrefs(); }
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
