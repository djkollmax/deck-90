'use strict';
// ═══════════════════════════════════════════════════════════
//  SINTONIZADOR DT-90 (7.8.7): the rack's radio, a hi-fi tuner under the meters (VER → RADIO, or 9)
//  It is the same radio as the car stereo: the same stations, bands and memories, played by stereo.js's engine
//  (Radio Browser, one <audio>). The component (vendor/dt90-tuner.js) only draws and says which key was touched.
//    POWER          the radio on or off (on pauses what the PC was playing; off brings it back)
//    BAND           FM1 → FM2 → FM3 → AM, or the four band keys under it (7.9.0)
//    ◀ ▶ / the knob the country's most heard stations
//    1–6            the band's memories (hold 1 s, or MEMO then the number: keep what plays there)
//    SCAN           8 s of each                     MODE   AUTO / MONO on the display
//    DISP           the line under the dial: station, time, temperature
//  It isn't one of the looks' modules: a look or the rotation never hides it.
// ═══════════════════════════════════════════════════════════
const TUNER_DISP = ['name', 'clock', 'temp'];
let tunerCfg = { show: true, disp: 'name', mono: false };
try {
  const t = (JSON.parse(localStorage.getItem('deck90-prefs')) || {}).tuner;
  if (t && typeof t === 'object') tunerCfg = { show: t.show !== false, disp: TUNER_DISP.includes(t.disp) ? t.disp : 'name', mono: !!t.mono };
} catch (_) {}
let tuner = null, tunerPower = false, tunerMemo = 0, tunerResumePc = false, tunerShownKey = '';
let tunerAvg = -24, tunerAt = 0, tunerLv = { L: 0, R: 0 };
const tunerPanel = document.getElementById('tunerPanel');
const tunerShown = () => tunerCfg.show && !miniMode;

// the frame of the rack decides the tuner's: titanium and champagne are silver plates, black and classic black
function tunerTheme() {
  if (!tuner) return;
  const c = typeof chassis === 'string' ? chassis : 'TI';
  tuner.setTheme(c === 'BLACK' || c === 'CLASSIC' ? 'black' : 'silver');
  tunerPanel.classList.toggle('gold', c === 'GOLD');
}

// the bands as keys of their own under BAND (where STANDBY was printed): FM1 FM2 FM3 / FM4 AM, the one in use lit
let tunerBandKeys = null;
function tunerBandKeysBuild() {
  const svg = tuner.svg, NS = 'http://www.w3.org/2000/svg', p = tuner.prefix;
  const mk = (n, a) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); return e; };
  [...svg.querySelectorAll('text')].filter(t => t.textContent === 'STANDBY').forEach(t => t.remove());
  tunerBandKeys = {};
  const pos = { FM1: [35, 152, 27], FM2: [64, 152, 27], FM3: [93, 152, 27], FM4: [35, 172, 41], AM: [79, 172, 41] };
  for (const [b, [x, y, w]] of Object.entries(pos)) {
    const g = mk('g', { 'data-band': b, role: 'button', 'aria-label': 'Banda ' + b, tabindex: 0 });
    g.style.cursor = 'pointer';
    g.append(mk('rect', { x, y: y + 1.4, width: w, height: 16, rx: 2, fill: '#080e0a', opacity: .7 }),
      mk('rect', { x, y, width: w, height: 16, rx: 2, fill: `url(#${p}-key)`, stroke: 'var(--edge,var(--_d90-edge))', 'stroke-width': .8 }));
    const t = mk('text', { x: x + w / 2, y: y + 11.4, 'text-anchor': 'middle', 'font-family': 'Arial,Helvetica,sans-serif', 'font-size': w < 30 ? 7.6 : 8.6, 'font-weight': 700, 'letter-spacing': .6, fill: 'var(--label,var(--_d90-label))', 'pointer-events': 'none' });
    t.textContent = b;
    const led = mk('rect', { x: x + 5, y: y + 13.2, width: w - 10, height: 1.2, fill: 'var(--vfd-dim,#193e34)', opacity: .4 });
    g.append(t, led);
    g.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); g.setAttribute('transform', 'translate(0 .9)'); });
    const up = () => g.removeAttribute('transform');
    g.addEventListener('pointerup', () => { up(); tunerBand(b); });
    g.addEventListener('pointerleave', up);
    g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); tunerBand(b); } });
    svg.append(g);
    tunerBandKeys[b] = led;
  }
}
function tunerBands() {
  if (!tunerBandKeys) return;
  for (const [b, led] of Object.entries(tunerBandKeys)) {
    const on = b === radioMem.band && tunerPower;
    led.setAttribute('fill', on ? 'var(--vfd,#80ffe5)' : 'var(--vfd-dim,#193e34)'); led.setAttribute('opacity', on ? '.95' : '.3');
  }
}
// a band: its memory 1 (or the one it was on), on the air if the tuner is on
function tunerBand(b) {
  if (!RADIO_BANDS.includes(b)) return;
  const same = b === radioMem.band;
  radioMem.band = b; if (!same) radioMem.slot = 1; saveRadio(); radioScan = 0;
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
  tunerBandKeysBuild();
  tuner.onKey(tunerKey);
  tunerShownKey = ''; tunerSync();
}

function tunerShow(on, quiet) {
  tunerCfg.show = !!on;
  tunerPanel.classList.toggle('mod-off', !on);
  if (on) tunerBuild();
  savePrefs(); if (typeof syncConsole === 'function') syncConsole();
  if (typeof sizeCanvases === 'function') requestAnimationFrame(() => { sizeCanvases(); if (!running) drawIdle(); });
  if (!quiet) toast(on ? 'RADIO · <span>el sintonizador</span> en el rack (9 lo esconde)' : 'El sintonizador queda guardado (9 lo vuelve a mostrar)' + (radioPlaying() ? ': la radio sigue sonando' : ''), 2200);
}

// what the display shows: the station in use (or the memory it's on), its band and dial
function tunerStation() { return radioNow || radioMem[radioMem.band][(radioMem.slot || 1) - 1] || null; }
function tunerLine() {
  if (tunerCfg.disp === 'clock') { const t = new Date(); return { name: String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0'), text: '' }; }
  if (tunerCfg.disp === 'temp') {
    const where = typeof clockCfg === 'object' && clockCfg.place ? clockCfg.place.name : '';
    return { name: stereoTemp() || 'SIN CLIMA', text: where };
  }
  const st = tunerStation();
  const name = st ? st.name : radioMem.band + ' VACÍA';
  const text = !tunerPower ? 'STANDBY' : radioPlaying() ? (tunerDial(st).f === null ? 'EN VIVO POR INTERNET' : 'EN VIVO') : radioNow ? 'SINTONIZANDO…' : 'ELEGÍ UNA MEMORIA 1–6';
  return { name, text };
}
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
function tunerSync() {
  if (!tuner) return;
  const st = tunerStation(), live = radioPlaying(), dial = tunerDial(st), am = dial.am;
  const line = tunerLine();
  tunerBands();
  const r = {
    band: am ? 'AM' : radioMem.band === 'AM' ? 'FM1' : radioMem.band, frequency: dial.f,
    label: dial.f === null && st ? shortName(st.name) : '', preset: radioMem.slot || 0,
    name: line.name, text: line.text, stereo: !am, mono: am || tunerCfg.mono, auto: !tunerCfg.mono,
    tuned: live, scan: !!radioScan, memo: !!tunerMemo, signal: live ? 5 : tunerPower && radioNow ? 2 : 0,
  };
  const key = JSON.stringify(r) + tunerPower;
  if (key === tunerShownKey) return;
  tunerShownKey = key;
  tuner.setRadio(r);
  tuner.setPower(tunerPower);
}
setInterval(() => { if (tuner && tunerShown()) tunerSync(); }, 300);
['playing', 'pause', 'error'].forEach(ev => radioAudio.addEventListener(ev, () => { if (tuner) tunerSync(); }));

// every frame from the loop: the L/R bars on the sound Deck 90 hears, around the music's own loudness
function tunerFeed(now) {
  if (!tuner) return;
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
  if (on) {
    if (typeof cdUnitYield === 'function' && cdUnitYield()) tunerResumePc = true;   // the CD stops; the PC's player was waiting for it
    if (typeof np === 'object' && np && np.status === 'Playing' && window.nowPlaying && !tunerResumePc) { window.nowPlaying.cmd('pause'); tunerResumePc = true; }
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
  if (k === 'disp') {
    tunerCfg.disp = TUNER_DISP[(TUNER_DISP.indexOf(tunerCfg.disp) + 1) % TUNER_DISP.length]; savePrefs();
    toast('DISP · <span>' + { name: 'la radio', clock: 'la hora', temp: 'la temperatura' }[tunerCfg.disp] + '</span>', 1200);
    return tunerSync();
  }
  if (k === 'mode') { tunerCfg.mono = !tunerCfg.mono; savePrefs(); toast('MODE · <span>' + (tunerCfg.mono ? 'MONO' : 'AUTO') + '</span> en el display', 1200); return tunerSync(); }
  if (k === 'memo') {
    if (!radioNow) { toast('Primero sintonizá una radio y después MEMO y el número', 2600); return; }
    tunerMemo = tunerMemo ? 0 : setTimeout(() => { tunerMemo = 0; tunerSync(); }, 6000);
    if (tunerMemo) toast('MEMO · tocá el <span>1–6</span> donde guardarla', 2400);
    return tunerSync();
  }
  if (!tunerPower && k !== 'band') tunerOn(true, k !== 'scan');   // a station key wakes the tuner, as on the real one
  if (k === 'band') return tunerBand(RADIO_BANDS[(RADIO_BANDS.indexOf(radioMem.band) + 1) % RADIO_BANDS.length]);
  if (k === 'tune-up' || k === 'tune-down') { radioScan = 0; radioStep(k === 'tune-up' ? 1 : -1); return tunerSync(); }
  if (k === 'scan') {
    if (radioScan) { radioScan = 0; toast('SCAN · <span>se queda en esta</span>', 1400); }
    else { radioScan = 1; toast('SCAN · <span>8 s de cada radio</span>, SCAN otra vez para quedarte', 2200); }
    return tunerSync();
  }
  if (/^m[1-6]$/.test(k)) {
    const n = Number(k[1]);
    if (tunerMemo) { clearTimeout(tunerMemo); tunerMemo = 0; radioMemory(n, true); }
    else radioMemory(n, !!hold);
    return tunerSync();
  }
}
// the radio goes on in the tuner when the stereo closes playing it, if the tuner is in the rack
function tunerKeeps() { if (!tunerCfg.show || !radioPlaying()) return false; tunerPower = true; tunerSync(); return true; }
// the radio stopped somewhere else (the stereo's modes): the tuner goes to standby
function tunerStopped() { if (tunerPower) { tunerPower = false; tunerMemo = 0; tunerSync(); } }

tunerPanel.classList.toggle('mod-off', !tunerCfg.show);
if (tunerCfg.show) tunerBuild();
