'use strict';
// Phone display: live meters from Deck 90 on the PC, drawn with the rack's own code.
const cVL = el('vuL'), cVR = el('vuR'), xVL = cVL.getContext('2d'), xVR = cVR.getContext('2d');
let target = null, lastMsg = 0, connected = false, lastFrameAt = 0;
const VIEWS = ['view-all', 'view-vu', 'view-tape'];
let view = 0;
try { view = Math.max(0, VIEWS.indexOf(localStorage.getItem('deck90-phone-view'))); } catch (_) {}

// ── layout ──
function setView(i) {
  view = (i + VIEWS.length) % VIEWS.length;
  document.body.classList.remove(...VIEWS); document.body.classList.add(VIEWS[view]);
  try { localStorage.setItem('deck90-phone-view', VIEWS[view]); } catch (_) {}
  requestAnimationFrame(size);
}
function size() {
  const pr = Math.min(window.devicePixelRatio || 1, 2.5);
  for (const c of [cVL, cVR, cTP]) {
    const p = c.parentElement, w = Math.max(10, p.clientWidth), h = Math.max(10, p.clientHeight);
    c.width = Math.round(w * pr); c.height = Math.round(h * pr);
    c.style.width = w + 'px'; c.style.height = h + 'px';
    c.getContext('2d').setTransform(pr, 0, 0, pr, 0, 0);
  }
}
window.addEventListener('resize', () => requestAnimationFrame(size));
el('btnView').addEventListener('click', () => setView(view + 1));
el('btnFull').addEventListener('click', () => {
  const d = document.documentElement;
  if (document.fullscreenElement) document.exitFullscreen();
  else if (d.requestFullscreen) d.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
  else toast('Este navegador no tiene pantalla completa: usá “Agregar a pantalla de inicio”.');
  keepAwake();
});

// ── keep the screen on ──
// The Wake Lock API needs a secure page, which a LAN address isn't. Fallback: a tiny muted video that
// keeps playing (what NoSleep.js does); browsers keep the screen on while a visible video plays.
// Best effort: some phones still sleep, hence the tip.
let wake = null, wakeTipShown = false, awakeVideo = null;
async function keepAwake() {
  if ('wakeLock' in navigator) {
    try { wake = await navigator.wakeLock.request('screen'); return; } catch (_) {}
  }
  try {
    if (!awakeVideo) {
      const c = document.createElement('canvas'); c.width = c.height = 2;
      const g = c.getContext('2d'); let t = 0;
      setInterval(() => { g.fillStyle = (t++ & 1) ? '#07080a' : '#07080b'; g.fillRect(0, 0, 2, 2); }, 500);
      awakeVideo = document.createElement('video');
      awakeVideo.muted = true; awakeVideo.playsInline = true; awakeVideo.setAttribute('playsinline', ''); awakeVideo.loop = true;
      awakeVideo.className = 'awake';
      awakeVideo.srcObject = c.captureStream(2);
      document.body.appendChild(awakeVideo);
    }
    await awakeVideo.play();
  } catch (_) {}
  if (!wakeTipShown) {
    wakeTipShown = true;
    toast('Si la pantalla se apaga igual: Ajustes → Pantalla → Tiempo de espera, o dejalo cargando.', 6000);
  }
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && wake) keepAwake(); });

// ── data from the PC ──
function applyFrame(f) {
  target = f; lastFrameAt = performance.now();
  running = !!f.run;
  if (f.aud) lastAudible = performance.now();
  if (f.skin) vuSkin = f.skin;
  if (f.tape) tapeStyle = f.tape;
  for (const [k, a] of [['L', f.L], ['R', f.R]]) {
    const s = vu[k];
    s.peak = a[1]; s.clip = !!a[2]; s.dbfs = a[3]; s.samplePeak = a[4];
  }
}
const fmt = (x, d = 1) => (x === null || x === undefined || !isFinite(x)) ? '--.-' : x.toFixed(d);
function numbers() {
  const f = target; if (!f) return;
  const silent = !f.run || !(f.m > -70);
  el('nM').textContent = silent ? '--.-' : fmt(f.m);
  el('nI').textContent = f.run && f.i > -70 ? fmt(f.i) : '--.-';
  el('nLra').textContent = f.lra !== null && isFinite(f.lra) ? fmt(f.lra) : '--';
  const tpOn = f.tp !== null;
  const tp = tpOn ? f.tp : f.pk;
  el('nTp').textContent = f.run && tp > -89 ? fmt(tp) : '--.-';
  el('nTp').className = tp > -1 ? 'hot' : tp > -6 ? 'warn' : '';
  el('nTpU').textContent = tpOn ? 'TRUE PEAK · MAX ' + (f.tpMax !== null ? fmt(f.tpMax) : '--.-') : 'PEAK dBFS';
  el('nBpm').textContent = f.run && f.bpm > 0 ? f.bpm : '--';
  el('nPh').textContent = silent ? '--' : (f.ph >= 0 ? '+' : '') + f.ph.toFixed(2);
  el('nPh').className = silent ? '' : f.ph < 0 ? 'hot' : f.ph < 0.25 ? 'warn' : 'good';
}
function setState() {
  const st = el('state');
  if (!connected || performance.now() - lastMsg > 4000) { st.textContent = 'SIN CONEXIÓN'; st.className = 'state off'; return; }
  const play = running && npPlaying();
  st.textContent = !running ? 'STOP' : play ? 'PLAY' : 'PAUSA';
  st.className = 'state ' + (!running ? 'stop' : play ? 'play' : 'pause');
}

function connect() {
  const es = new EventSource('/events?k=' + encodeURIComponent(KEY));
  es.addEventListener('error', () => {
    // network errors retry by themselves; an HTTP error (PC restarted, another program on the port) closes
    // the stream for good, so start over in a few seconds
    if (es.readyState === 2) setTimeout(connect, 4000);
  });
  es.addEventListener('open', () => { connected = true; lastMsg = performance.now(); });
  es.addEventListener('f', e => { lastMsg = performance.now(); connected = true; try { applyFrame(JSON.parse(e.data)); } catch (_) {} });
  es.addEventListener('np', e => {
    lastMsg = performance.now();
    let info; try { info = JSON.parse(e.data); } catch (_) { return; }
    npHandlers.forEach(cb => cb(info));
    if (info.none) { el('npTitle').textContent = 'DECK 90'; el('npArtist').textContent = 'nada sonando'; }
  });
  es.addEventListener('error', () => { connected = false; });
}

// ── render ──
let lastT = 0, numT = 0;
function frame(t) {
  requestAnimationFrame(frame);
  dtMs = lastT ? Math.min(100, t - lastT) : 16.7; lastT = t; frameScale = dtMs / 16.667;
  // frames come ~30 a second: ease toward them so the needles glide at the phone's own frame rate
  if (target) {
    const k = 1 - Math.exp(-dtMs / 35);
    const stale = performance.now() - lastFrameAt > 1500;
    vu.L.lvl += ((stale ? -60 : target.L[0]) - vu.L.lvl) * k;
    vu.R.lvl += ((stale ? -60 : target.R[0]) - vu.R.lvl) * k;
  }
  const vis = getComputedStyle(cVL.parentElement).display !== 'none';
  if (vis) guard('vu', () => { drawVU(cVL, xVL, vu.L); drawVU(cVR, xVR, vu.R); });
  if (getComputedStyle(cTP.parentElement).display !== 'none') guard('tape', () => drawBigTape(cTP, xTP, true));
  if (t - numT > 200) { numT = t; numbers(); setState(); }
}

setView(view);
size();
connect();
requestAnimationFrame(frame);
document.addEventListener('click', () => keepAwake(), { once: true });
