'use strict';
// ═══════════════════════════════════════════════════════════
//  THE CAR STEREO ON THE PHONE (7.9.4): the ESTÉREO view
//  The DP940's front, its display drawn here by the same component as on the PC (vendor/dp940-display.js) and
//  fed with what the PC's stereo shows (the frames' "sv"), its meters on the PC's sound. Its keys work the PC's
//  stereo: the radio and its memories, the bands, MODE (PC · RADIO · CD), DISP, the colours, the volume, the CD.
//  The sound stays on the PC: the phone is its front and its remote. Best lying down (landscape).
// ═══════════════════════════════════════════════════════════
const ST_KEYS = [   // [key, left %, top %, width %, height %, round] as on the PC's stereo (PWR stays there)
  ['volup', 2.399, 27.458, 5.197, 12.987],
  ['voldown', 2.399, 64.007, 5.197, 13.544],
  ['sel', 3.598, 46.011, 7.996, 16.141, 1],
  ['mode', 10.195, 27.829, 6.397, 15.213, 1],
  ['disp', 14.193, 45.269, 5.897, 15.213, 1],
  ['band', 10.195, 63.636, 6.397, 15.028, 1],
  ['hdb', 20.090, 31.911, 4.698, 16.327, 1],
  ['sdm', 20.090, 57.143, 4.798, 16.698, 1],
  ['att', 9.595, 80.891, 6.997, 12.987],
  ['scan', 17.191, 80.891, 6.85, 12.987],                // 7.10.20: SCAN's half; LOC (the list of the PC's city) is on the PC
  ['prev', 31.784, 80.891, 6.697, 12.987],
  ['next', 38.481, 80.891, 6.697, 12.987],
  ['m1', 46.377, 80.891, 5.997, 12.987],
  ['m2', 52.374, 80.891, 6.997, 12.987],
  ['m3', 59.970, 80.891, 6.997, 12.987],
  ['m4', 66.967, 80.891, 6.897, 12.987],
  ['m5', 74.663, 80.891, 6.597, 12.987],
  ['m6', 81.259, 80.891, 8.996, 12.987],
  ['slot', 17.091, 15.213, 73.463, 10.019],
  ['eject', 91.854, 24.490, 4.998, 15.955, 1],
];
const stFace = el('stFace');
let stDisp = null, stView = null, stAvg = -24, stAt = 0;

(function build() {
  for (const [k, l, t, w, h, round] of ST_KEYS) {
    const b = document.createElement('button');
    b.className = 'st-hot' + (round ? ' round' : ''); b.dataset.st = k;
    b.style.cssText = 'left:' + l + '%;top:' + t + '%;width:' + w + '%;height:' + h + '%';
    stFace.appendChild(b);
  }
  if (typeof Deck90Display === 'function') {
    stDisp = new Deck90Display(el('stDisplay'), { attackMs: 35, releaseMs: 140 });
    const svg = stDisp.svg;                                    // only its glass, over the photo's own LCD
    svg.setAttribute('viewBox', '23 24 1141 156'); svg.setAttribute('preserveAspectRatio', 'none');
    svg.removeAttribute('width'); svg.removeAttribute('height');
  }
})();

// a key: to the PC (held 1 s, the memories and SDM do their second thing; VOL repeats while held)
function stKey(k, hold) {
  if (opts.haptic === '1' && navigator.vibrate) navigator.vibrate(hold ? 40 : 15);
  fetch('/stk?k=' + encodeURIComponent(KEY) + '&c=' + encodeURIComponent(k) + (hold ? '&h=1' : ''), { method: 'POST' })
    .then(r => { if (!r.ok) toast('La PC no aceptó la tecla.'); })
    .catch(() => toast('Sin conexión con la PC.'));
}
(function keys() {
  let holdT = 0, held = false, volT = 0;
  stFace.addEventListener('pointerdown', e => {
    const b = e.target.closest('.st-hot'); if (!b) return;
    e.preventDefault(); b.classList.add('down'); held = false;
    const k = b.dataset.st;
    if (/^vol(up|down)$/.test(k)) {
      held = true; stKey(k);
      volT = setTimeout(function rep() { stKey(k); volT = setTimeout(rep, 180); }, 450);
      return;
    }
    if (/^(m[1-6]|sdm|band)$/.test(k)) holdT = setTimeout(() => { held = true; stKey(k, true); }, 1000);   // 7.10.12: BAND held, A.MEM
  });
  const up = () => { clearTimeout(holdT); clearTimeout(volT); stFace.querySelectorAll('.st-hot.down').forEach(b => b.classList.remove('down')); };
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => stFace.addEventListener(ev, up));
  stFace.addEventListener('click', e => {
    const b = e.target.closest('.st-hot'); if (!b) return;
    if (held) { held = false; return; }
    stKey(b.dataset.st);
  });
  stFace.addEventListener('contextmenu', e => e.preventDefault());   // a long press is a key, not a menu
})();

// what the PC's stereo shows, on this one
function stApply(v) {
  stView = v;
  if (!stDisp || !v) return;
  const d = el('stDisplay');
  stFace.style.setProperty('--st-hue', (v.hue || 0) + 'deg');
  stFace.style.setProperty('--st-dim', v.dim || 1);
  d.className = d.className.replace(/\s*\blook(-[a-z]+)?\b/g, '') + (v.look ? ' look look-' + v.look + (v.light ? ' look-light' : '') : '');
  el('stFace').dataset.face = v.face || '';                    // 7.9.21: a look that changes the whole front
  el('stereoView').classList.toggle('aux-on', !!v.aux);
  if (v.kind === 'radio' && v.radio) { stDisp.setPlayback(false); stDisp.setRadio(v.radio); }
  else if (v.kind === 'track' && v.track) { stDisp.setTrack(v.track); stDisp.setElapsed(v.elapsed || 0); }
  if (!v.live) stDisp.setLevels(0, 0);
}
const applyFrameBefore = applyFrame;
applyFrame = f => { applyFrameBefore(f); if (f && f.sv) stApply(f.sv); };

// the meters: the PC's sound, around the music's own loudness, as the PC's stereo does
(function meters(now) {
  requestAnimationFrame(meters);
  if (!stDisp || !stView || !stView.live || !document.body.classList.contains('view-stereo')) return;
  const dt = stAt ? Math.min(200, now - stAt) : 16; stAt = now;
  const L = vu.L.dbfs, R = vu.R.dbfs, loud = Math.max(L, R);
  if (loud > -60) stAvg += (loud - stAvg) * (1 - Math.exp(-dt / 2500));
  const f = d => d < -60 ? 0 : Math.max(0, Math.min(1, (d - (stAvg - 8)) / 13));
  stDisp.setLevels(f(L), f(R));
})(0);
