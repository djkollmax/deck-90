'use strict';
// ═══════════════════════════════════════════════════════════
//  PHONE DISPLAY (program only)
//  The main process serves a page on the home network; this side switches it on and off, shows the
//  QR code to open it, and streams the meter values (~30 per second) while a phone is watching.
// ═══════════════════════════════════════════════════════════
let phoneState = { on: false, urls: [], clients: 0 };
let phoneLastSend = 0;
const phoneFl = new Float32Array(19);
const PHONE_MS = 33;

const r1 = x => Math.round(x * 10) / 10;
function phoneFrame() {
  const v = s => [r1(s.lvl), r1(s.peak), s.clip ? 1 : 0, r1(s.dbfs), r1(s.samplePeak)];
  const fin = x => (typeof x === 'number' && isFinite(x)) ? r1(x) : null;
  return {
    run: running, src: activeSource, aud: running && audible(),
    L: v(vu.L), R: v(vu.R),
    m: fin(miniVals.m), s: fin(miniVals.s), i: fin(miniVals.i), lra: fin(lraValue), sp: fin(spotGain),
    tp: tpAvailable ? fin(tpHoldDb) : null, tpMax: fin(tpMaxDb), pk: fin(peakHoldDb),
    ph: Math.round(phaseSm * 100) / 100, bpm: bpmVal > 0 ? Math.round(bpmVal) : 0, lock: bpmConfidence >= 0.45,
    skin: vuSkin, tape: tapeStyle, sens: flSensitivity,
    // FL 90s bands as measured (dBFS, whole numbers): the phone smooths and lifts them itself
    fl: running && aMain ? Array.from(flRawLevels(phoneFl), x => Math.round(x)) : null,
    // the phone's spectrogram: 64 bands, 30 Hz – 20 kHz, 0–255, as base64
    sg: running && aMain ? spectrogramBands() : null,
    flc: spectrumSkin === 'SHOWROOM' ? 'TURQ' : spectrumSkin === 'AMBER' ? 'AMBER' : 'GREEN',
  };
}
// Called from the render loop, and on a slow timer while stopped so the phone still shows STOP.
function phoneTick(now) {
  if (!window.phoneDisplay || !phoneState.on || !phoneState.clients) return;
  if (now - phoneLastSend < PHONE_MS) return;
  phoneLastSend = now;
  try { window.phoneDisplay.frame(phoneFrame()); } catch (_) {}
}
setInterval(() => { if (!running) phoneTick(performance.now()); }, 500);

function phoneButton(v) {
  if (!window.phoneDisplay) { toast('La pantalla en el celular funciona desde el programa (Deck 90.exe).', 3500); return; }
  if (v === 'on') { window.phoneDisplay.set(true); showPhoneModal(true); }
  if (v === 'off') { window.phoneDisplay.set(false); showPhoneModal(false); }
  if (v === 'qr') {
    if (!phoneState.on) window.phoneDisplay.set(true);
    showPhoneModal(true);
  }
}

// ── QR modal ──
function drawQR(canvas, text) {
  const qr = qrcode(0, 'M'); qr.addData(text); qr.make();
  const n = qr.getModuleCount(), quiet = 3, cell = Math.max(3, Math.floor(240 / (n + quiet * 2)));
  const size = cell * (n + quiet * 2);
  canvas.width = size; canvas.height = size;
  const c = canvas.getContext('2d');
  c.fillStyle = '#fff'; c.fillRect(0, 0, size, size);
  c.fillStyle = '#000';
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (qr.isDark(y, x)) c.fillRect((x + quiet) * cell, (y + quiet) * cell, cell, cell);
}
function renderPhoneModal() {
  const m = el('phoneModal'); if (!m || !m.classList.contains('show')) return;
  const url = phoneState.urls[0] || '';
  const st = el('phoneStatus');
  if (phoneState.error) {
    st.innerHTML = '⚠ No se pudo abrir el puerto ' + (phoneState.port || 9090) + ' (' + phoneState.error + ').';
  } else if (!phoneState.on) {
    st.textContent = 'Apagado.';
  } else if (!url) {
    st.textContent = 'No encuentro una red: conectá la PC al WiFi o al router.';
  } else {
    st.textContent = phoneState.clients ? `● ${phoneState.clients} pantalla${phoneState.clients > 1 ? 's' : ''} conectada${phoneState.clients > 1 ? 's' : ''}` : 'Esperando al celular…';
  }
  st.className = 'phone-status' + (phoneState.clients ? ' live' : '');
  const qc = el('phoneQR');
  if (url && qc.dataset.url !== url) { drawQR(qc, url); qc.dataset.url = url; }
  qc.style.visibility = url ? 'visible' : 'hidden';
  el('phoneUrl').textContent = url;
  el('phoneOther').textContent = phoneState.urls.length > 1 ? 'Otras direcciones de esta PC: ' + phoneState.urls.slice(1).map(u => u.replace(/\/\?k=.*/, '')).join(' · ') : '';
}
function showPhoneModal(on) {
  el('phoneModal').classList.toggle('show', on);
  if (on && window.phoneDisplay) window.phoneDisplay.get();     // the PC may have changed network since
  renderPhoneModal();
}
document.getElementById('phoneClose').addEventListener('click', () => showPhoneModal(false));
document.getElementById('phoneModal').addEventListener('click', e => { if (e.target.id === 'phoneModal') showPhoneModal(false); });
document.getElementById('phoneOff').addEventListener('click', () => { phoneButton('off'); });

if (window.phoneDisplay) {
  window.phoneDisplay.on(st => {
    phoneState = st;
    if (st.error) toast('⚠ Pantalla en el celular: no se pudo usar el puerto (' + st.error + ').', 6000);
    syncConsole(); renderPhoneModal();
  });
  window.phoneDisplay.get();
}
