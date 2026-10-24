'use strict';
// ═══════════════════════════════════════════════════════════
//  MORE SPECTRUM STYLES (6.5)
//  LED 80s · FL SHOWROOM · FL AMBER (stereo) · RTA 1/3 OCT · LCD · SPECTROGRAM
//  Each draw function takes null levels for the idle (stopped) frame. All are original designs.
// ═══════════════════════════════════════════════════════════

// ── shared: log-spaced bands from an analyser's spectrum ──
function logEdges(n, f0, f1) { const e = []; for (let i = 0; i <= n; i++) e.push(f0 * Math.pow(f1 / f0, i / n)); return e; }
// loudest bin per band (what hardware analyzers show), in dBFS
function bandsMax(fd, edges, out) {
  const nyq = actx.sampleRate / 2, bins = fd.length;
  for (let b = 0; b < edges.length - 1; b++) {
    const i1 = Math.max(1, Math.floor(edges[b] / nyq * bins)), i2 = Math.min(bins, Math.max(i1 + 1, Math.ceil(edges[b + 1] / nyq * bins)));
    let m = -140; for (let i = i1; i < i2; i++) if (fd[i] > m) m = fd[i];
    out[b] = isFinite(m) ? m : -140;
  }
  return out;
}
// power sum per band (a real RTA reading: pink noise reads flat), in dBFS
function bandsPower(fd, lo, hi, out) {
  const nyq = actx.sampleRate / 2, bins = fd.length;
  for (let b = 0; b < lo.length; b++) {
    let i1 = Math.max(1, Math.round(lo[b] / nyq * bins)), i2 = Math.min(bins, Math.round(hi[b] / nyq * bins));
    if (i2 <= i1) i2 = i1 + 1;                              // the lowest bands are narrower than one bin
    let p = 0; for (let i = i1; i < i2; i++) p += Math.pow(10, fd[i] / 10);
    out[b] = p > 0 ? 10 * Math.log10(p) : -140;
  }
  return out;
}
// rise at once, fall at `rate` dB per second
function fall(state, b, db, rate) { state[b] = db >= state[b] ? db : Math.max(db, state[b] - rate * dtMs / 1000); return state[b]; }
// peak hold: `hold` frames at 60 Hz, then fall `drop` per frame
function holdPeak(peak, tm, b, v, hold, drop, floor) {
  if (v > peak[b]) { peak[b] = v; tm[b] = hold; }
  else if (tm[b] > 0) tm[b] -= frameScale;
  else peak[b] = Math.max(floor, peak[b] - drop * frameScale);
}
const tilt = f => 3 * Math.log2(f / 1000);                  // +3 dB/octave so cymbals show like on hardware
function hwGain() { return flGain(flSensitivity, audible()); }

// ═══ LED 80s: round LEDs, green / yellow / red, one LED holds the peak ═══
const LED_N = 16, LED_ROWS = 16;
const ledEdges = logEdges(LED_N, 40, 16000);
const ledDb = new Float32Array(LED_N), ledLv = new Float32Array(LED_N).fill(-140);
const ledPk = new Float32Array(LED_N), ledPkTm = new Float32Array(LED_N), ledOut = new Float32Array(LED_N);
// one pre-drawn LED per colour, lit or not, at the current size (drawing hundreds of glows a frame is too slow)
const ledSprites = new Map();
function ledSprite(col, on, w, h) {
  const key = col.join(',') + (on ? '+' : '-') + w.toFixed(1) + 'x' + h.toFixed(1);
  let c = ledSprites.get(key);
  if (c) return c;
  if (ledSprites.size > 64) ledSprites.clear();             // sizes change when the window does
  const P = Math.ceil(Math.min(w, h) * 1.2);                 // room for the glow
  c = document.createElement('canvas'); c.width = Math.ceil(w + 2 * P); c.height = Math.ceil(h + 2 * P);
  const g = c.getContext('2d'), [r, gg, bb] = col, rr = Math.min(w, h) * .35;
  const shape = () => { g.beginPath(); g.roundRect(P, P, w, h, rr); };
  if (on) { g.shadowColor = `rgba(${r},${gg},${bb},.8)`; g.shadowBlur = P * .9; }
  shape(); g.fillStyle = on ? `rgb(${r},${gg},${bb})` : `rgba(${r},${gg},${bb},.11)`; g.fill();
  g.shadowBlur = 0;
  if (on) { const hl = g.createLinearGradient(0, P, 0, P + h); hl.addColorStop(0, 'rgba(255,255,255,.55)'); hl.addColorStop(.5, 'rgba(255,255,255,0)'); shape(); g.fillStyle = hl; g.fill(); }
  ledSprites.set(key, c);
  return c;
}
const fLabel = f => f >= 1000 ? (f / 1000).toFixed(f >= 10000 ? 0 : 1).replace('.0', '') + 'k' : String(Math.round(f));
function drawLED80(canvas, ctx, levels) {
  const W = canvas.offsetWidth || canvas.width, H = canvas.offsetHeight || canvas.height;
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#120708'); bg.addColorStop(1, '#060203');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  const TOP = 20, BOT = 16, L = 10, R = 10;
  const cw = (W - L - R) / LED_N, ch = (H - TOP - BOT) / LED_ROWS;
  const lw = Math.max(3, cw * 0.72), lh = Math.max(2, ch * 0.62);
  for (let b = 0; b < LED_N; b++) {
    const lit = levels ? Math.round(levels[b] * LED_ROWS) : 0;
    const pk = levels ? Math.round(ledPk[b] * LED_ROWS) : 0;
    for (let row = 0; row < LED_ROWS; row++) {
      const col = row >= LED_ROWS - 3 ? [255, 50, 40] : row >= LED_ROWS - 6 ? [255, 210, 40] : [60, 255, 90];
      const on = row < lit || (row === pk - 1 && pk > lit);
      const x = L + (b + 0.5) * cw, y = TOP + (LED_ROWS - row - 0.5) * ch;
      const sp = ledSprite(col, on, lw, lh);
      ctx.drawImage(sp, Math.round(x - sp.width / 2), Math.round(y - sp.height / 2));
    }
    if (cw > 22 || b % 2 === 0) {
      ctx.font = '7px Arial, sans-serif'; ctx.fillStyle = 'rgba(235,225,225,.55)'; ctx.textAlign = 'center';
      ctx.fillText(fLabel(Math.sqrt(ledEdges[b] * ledEdges[b + 1])), L + (b + .5) * cw, H - 5);
    }
  }
  // smoked red window
  const sm = ctx.createLinearGradient(0, 0, 0, H);
  sm.addColorStop(0, 'rgba(255,255,255,.06)'); sm.addColorStop(.18, 'rgba(255,255,255,0)'); sm.addColorStop(1, 'rgba(120,0,0,.08)');
  ctx.fillStyle = sm; ctx.fillRect(0, 0, W, H);
  ctx.font = 'bold 8px Arial, sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(240,230,230,.7)';
  ctx.fillText('SPECTRUM ANALYZER', 10, 12);
  ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(255,90,70,.6)'; ctx.fillText('LED 80s', W - 10, 12);
}
function drawSpectrumLED80(canvas, ctx) {
  aMain.getFloatFrequencyData(bufFD);
  bandsMax(bufFD, ledEdges, ledDb);
  const g = hwGain(), out = ledLv, lv = ledOut;
  for (let b = 0; b < LED_N; b++) {
    const db = fall(out, b, ledDb[b] + tilt(Math.sqrt(ledEdges[b] * ledEdges[b + 1])) + g, 40);
    lv[b] = Math.max(0, Math.min(1, (db + 60) / 60));
    holdPeak(ledPk, ledPkTm, b, lv[b], 30, 0.02, 0);
  }
  drawLED80(canvas, ctx, lv);
}

// ═══ FL SHOWROOM: the turquoise display; after a few seconds of silence it runs its shop demo ═══
let showroomSilentSince = 0;
const showDemo = new Float32Array(FL_BARS.length);
function showroomDemo(t) {
  const phase = Math.floor(t / 6000) % 3;                   // three patterns, 6 s each
  for (let b = 0; b < FL_BARS.length; b++) {
    const x = b / (FL_BARS.length - 1);
    let v;
    if (phase === 0) v = Math.sin(t / 380 + x * 7) * .5 + .5;                                  // wave
    else if (phase === 1) v = Math.abs(x - ((t / 1600) % 1)) < .12 ? 1 : .08;                  // sweep
    else v = (Math.sin(t / 260 + b * 1.7) * .5 + .5) * (1 - Math.abs(x - .5));                 // mountain
    showDemo[b] = FL_FLOOR + v * (-FL_FLOOR - 4);
  }
  return showDemo;
}
function drawSpectrumShowroom(canvas, ctx) {
  const now = performance.now();
  if (audible()) showroomSilentSince = 0; else if (!showroomSilentSince) showroomSilentSince = now;
  const demo = showroomSilentSince && now - showroomSilentSince > 3000;
  flRawLevels(flRaw);
  const g = flGain(flSensitivity, audible());
  const src = demo ? showroomDemo(now) : null;
  for (let b = 0; b < FL_BARS.length; b++) flShown[b] = demo ? src[b] : Math.min(0, smoothBar(b, flRaw[b]) + g);
  flPeaks(flShown, spPeak, spPeakTm, frameScale);
  drawFLDisplay(canvas, ctx, flShown, spPeak, FL_PAL.TURQ, demo);
}

// ═══ FL AMBER: stereo, the left channel rises from the middle, the right one hangs down ═══
const AMB_N = 16;
const ambEdges = logEdges(AMB_N, 40, 16000);
let bufFDL = null, bufFDR = null;
const ambL = new Float32Array(AMB_N).fill(-140), ambR = new Float32Array(AMB_N).fill(-140);
const ambRawL = new Float32Array(AMB_N), ambRawR = new Float32Array(AMB_N);
const ambOutL = new Float32Array(AMB_N), ambOutR = new Float32Array(AMB_N);
const ambPkL = new Float32Array(AMB_N), ambPkR = new Float32Array(AMB_N), ambTmL = new Float32Array(AMB_N), ambTmR = new Float32Array(AMB_N);
function drawAmber(canvas, ctx, lvL, lvR) {
  const W = canvas.offsetWidth || canvas.width, H = canvas.offsetHeight || canvas.height;
  // glossy black front with a smoked window
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#16110c'); bg.addColorStop(.5, '#060403'); bg.addColorStop(1, '#100b07');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  const LBL = 14, L = 22, R = 10, TOP = 16, BOT = 6;
  const mid = TOP + (H - TOP - BOT) / 2;
  const half = (H - TOP - BOT - LBL) / 2;
  const slot = (W - L - R) / AMB_N, bw = Math.max(3, slot * .7);
  const segH = Math.max(2, Math.min(6, half / 16)), gap = segH > 3 ? 2 : 1;
  const segs = Math.max(4, Math.floor(half / (segH + gap)));
  const SEG = [['#ffb02e', 'rgba(70,36,6,.45)'], ['#ff8a1e', 'rgba(70,30,6,.45)'], ['#ff4e12', 'rgba(70,20,6,.45)']];
  const draw = (lv, pk, up) => {
    for (let b = 0; b < AMB_N; b++) {
      const x = L + b * slot + (slot - bw) / 2;
      const lit = lv ? Math.round(lv[b] * segs) : 0, p = lv ? Math.round(pk[b] * segs) : 0;
      for (let s = 0; s < segs; s++) {
        const c = SEG[s > segs * .8 ? 2 : s > segs * .6 ? 1 : 0];
        const on = s < lit || (s === p - 1 && p > lit);
        const y = up ? mid - LBL / 2 - (s + 1) * (segH + gap) : mid + LBL / 2 + s * (segH + gap) + gap;
        ctx.fillStyle = on ? c[0] : c[1];
        ctx.shadowColor = on ? c[0] : 'transparent'; ctx.shadowBlur = on ? 6 : 0;
        ctx.fillRect(x, y, bw, segH);
      }
      ctx.shadowBlur = 0;
    }
  };
  draw(lvL, ambPkL, true);
  draw(lvR, ambPkR, false);
  // middle strip: band names
  ctx.font = '7px Courier New'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,170,70,.62)';
  for (let b = 0; b < AMB_N; b += slot < 26 ? 2 : 1) ctx.fillText(fLabel(Math.sqrt(ambEdges[b] * ambEdges[b + 1])), L + (b + .5) * slot, mid + 3);
  ctx.font = 'bold 9px Courier New'; ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(255,176,46,.8)';
  ctx.fillText('L', 6, mid - LBL / 2 - 4); ctx.fillText('R', 6, mid + LBL / 2 + 11);
  ctx.font = 'bold 8px Courier New'; ctx.fillStyle = 'rgba(255,176,46,.7)'; ctx.fillText('STEREO SPECTRUM', 8, 11);
  ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(255,140,40,.55)'; ctx.fillText('FL AMBER', W - 8, 11);
  // glass
  const gl = ctx.createLinearGradient(0, 0, W, H);
  gl.addColorStop(0, 'rgba(255,255,255,.07)'); gl.addColorStop(.3, 'rgba(255,255,255,0)'); gl.addColorStop(1, 'rgba(255,140,40,.03)');
  ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(255,150,50,.2)'; ctx.strokeRect(.5, .5, W - 1, H - 1);
}
function drawSpectrumAmber(canvas, ctx) {
  if (!bufFDL || bufFDL.length !== aL.frequencyBinCount) { bufFDL = new Float32Array(aL.frequencyBinCount); bufFDR = new Float32Array(aR.frequencyBinCount); }
  aL.getFloatFrequencyData(bufFDL); aR.getFloatFrequencyData(bufFDR);
  bandsMax(bufFDL, ambEdges, ambRawL); bandsMax(bufFDR, ambEdges, ambRawR);
  const g = hwGain(), lvL = ambOutL, lvR = ambOutR;
  for (let b = 0; b < AMB_N; b++) {
    const t = tilt(Math.sqrt(ambEdges[b] * ambEdges[b + 1]));
    lvL[b] = Math.max(0, Math.min(1, (fall(ambL, b, ambRawL[b] + t + g, 38) + 60) / 60));
    lvR[b] = Math.max(0, Math.min(1, (fall(ambR, b, ambRawR[b] + t + g, 38) + 60) / 60));
    holdPeak(ambPkL, ambTmL, b, lvL[b], 50, .012, 0);
    holdPeak(ambPkR, ambTmR, b, lvR[b], 50, .012, 0);
  }
  drawAmber(canvas, ctx, lvL, lvR);
}

// ═══ RTA 1/3 OCT: 31 ISO bands, power per band like a studio real-time analyzer ═══
const RTA_F = [20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000, 12500, 16000, 20000];
const RTA_LO = RTA_F.map(f => f / Math.pow(2, 1 / 6)), RTA_HI = RTA_F.map(f => f * Math.pow(2, 1 / 6));
const RTA_TOP = -10, RTA_RANGE = 66;
let rtaGain = 0;
const rtaRaw = new Float32Array(31), rtaLv = new Float32Array(31).fill(-140), rtaPk = new Float32Array(31).fill(-140), rtaTm = new Float32Array(31);
function drawRTA(canvas, ctx, levels) {
  const W = canvas.offsetWidth || canvas.width, H = canvas.offsetHeight || canvas.height;
  ctx.fillStyle = '#0b0c0e'; ctx.fillRect(0, 0, W, H);
  const L = 30, R = 30, TOP = 16, BOT = 16;
  const PW = W - L - R, PH = H - TOP - BOT;
  const y = db => TOP + (RTA_TOP - Math.max(RTA_TOP - RTA_RANGE, Math.min(RTA_TOP, db))) / RTA_RANGE * PH;
  // scale on both sides, every 6 dB
  ctx.font = '7px Arial, sans-serif'; ctx.textBaseline = 'middle';
  for (let d = RTA_TOP; d >= RTA_TOP - RTA_RANGE; d -= 6) {
    const yy = Math.round(y(d)) + .5;
    ctx.strokeStyle = d === -18 ? 'rgba(120,200,255,.18)' : 'rgba(255,255,255,.06)'; ctx.beginPath(); ctx.moveTo(L, yy); ctx.lineTo(W - R, yy); ctx.stroke();
    ctx.fillStyle = 'rgba(200,205,210,.55)'; ctx.textAlign = 'right'; ctx.fillText(String(d), L - 4, yy); ctx.textAlign = 'left'; ctx.fillText(String(d), W - R + 4, yy);
  }
  ctx.textBaseline = 'alphabetic';
  const slot = PW / 31, bw = Math.max(2, slot * .74);
  const segH = Math.max(1.5, Math.min(4, PH / 40)), gap = 1, segs = Math.floor(PH / (segH + gap));
  for (let b = 0; b < 31; b++) {
    const x = L + b * slot + (slot - bw) / 2;
    const lit = levels ? Math.round((levels[b] - (RTA_TOP - RTA_RANGE)) / RTA_RANGE * segs) : 0;
    for (let s = 0; s < segs; s++) {
      const db = RTA_TOP - RTA_RANGE + (s + .5) / segs * RTA_RANGE;
      const on = s < lit;
      const col = db > RTA_TOP - 6 ? (on ? '#ff3b30' : 'rgba(255,59,48,.10)') : db > RTA_TOP - 15 ? (on ? '#ffd02a' : 'rgba(255,208,42,.08)') : (on ? '#3cff7a' : 'rgba(60,255,122,.07)');
      ctx.fillStyle = col;
      ctx.fillRect(x, TOP + PH - (s + 1) * (segH + gap) + gap, bw, segH);
    }
    if (levels && rtaPk[b] > RTA_TOP - RTA_RANGE) { ctx.fillStyle = '#e8f4ff'; ctx.fillRect(x, Math.round(y(rtaPk[b])), bw, 1.5); }
    const f = RTA_F[b];
    if ([31.5, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000].includes(f) || (slot > 24 && b % 1 === 0)) {
      ctx.font = '7px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(200,205,210,.6)';
      ctx.fillText(fLabel(f), x + bw / 2, H - 5);
    }
  }
  ctx.font = 'bold 8px Arial, sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(220,225,230,.75)';
  ctx.fillText('RTA · 1/3 OCTAVE', L, 11);
  ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(160,170,180,.55)'; ctx.fillText(levels && rtaGain ? 'dBFS +' + rtaGain + ' dB' : 'dBFS', W - R, 11);
}
function drawSpectrumRTA(canvas, ctx) {
  aMain.getFloatFrequencyData(bufFD);
  bandsPower(bufFD, RTA_LO, RTA_HI, rtaRaw);
  const g = flSensitivity * 6;                               // N 0 · H +6 · MAX +12 dB (the scale says so)
  rtaGain = g;
  for (let b = 0; b < 31; b++) {
    const v = fall(rtaLv, b, rtaRaw[b] + g, 24);
    holdPeak(rtaPk, rtaTm, b, v, 90, .3, -140);
  }
  drawRTA(canvas, ctx, rtaLv);
}

// ═══ LCD: a green dot-matrix panel with dark pixels and their faint shadow ═══
const LCD_N = 24, LCD_ROWS = 16;
const lcdEdges = logEdges(LCD_N, 40, 16000);
const lcdOut = new Float32Array(LCD_N), lcdRaw = new Float32Array(LCD_N), lcdDb = new Float32Array(LCD_N).fill(-140), lcdPk = new Float32Array(LCD_N), lcdTm = new Float32Array(LCD_N);
function drawLCD(canvas, ctx, levels) {
  const W = canvas.offsetWidth || canvas.width, H = canvas.offsetHeight || canvas.height;
  // bezel
  ctx.fillStyle = '#15171a'; ctx.fillRect(0, 0, W, H);
  const M = 8, x0 = M, y0 = M, w = W - 2 * M, h = H - 2 * M;
  const glass = ctx.createLinearGradient(0, y0, 0, y0 + h);
  glass.addColorStop(0, '#a9b98f'); glass.addColorStop(1, '#8c9c76');
  ctx.fillStyle = glass; ctx.fillRect(x0, y0, w, h);
  const TOPTXT = 14, BOT = 12;
  const cols = LCD_N * 3, cw = (w - 12) / cols, ch = (h - TOPTXT - BOT) / LCD_ROWS;
  const px = Math.max(1.2, Math.min(cw, ch) * .88);
  const pixel = (cx, cy, on) => {
    const xx = x0 + 6 + cx * cw + (cw - px) / 2, yy = y0 + TOPTXT + cy * ch + (ch - px) / 2;
    if (on) { ctx.fillStyle = 'rgba(30,40,25,.22)'; ctx.fillRect(xx + 1.2, yy + 1.2, px, px); }   // the shadow on the backplate
    ctx.fillStyle = on ? 'rgba(22,32,20,.88)' : 'rgba(22,32,20,.07)';
    ctx.fillRect(xx, yy, px, px);
  };
  for (let b = 0; b < LCD_N; b++) {
    const lit = levels ? Math.round(levels[b] * LCD_ROWS) : 0;
    const pk = levels ? Math.round(lcdPk[b] * LCD_ROWS) : 0;
    for (let r = 0; r < LCD_ROWS; r++) {
      const on = r < lit || (r === pk - 1 && pk > lit);
      pixel(b * 3, LCD_ROWS - 1 - r, on); pixel(b * 3 + 1, LCD_ROWS - 1 - r, on);
      pixel(b * 3 + 2, LCD_ROWS - 1 - r, false);
    }
  }
  ctx.font = 'bold 9px Courier New'; ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(22,32,20,.8)';
  ctx.fillText('SPECTRUM', x0 + 6, y0 + 11);
  ctx.textAlign = 'right'; ctx.fillText(levels ? 'ON' : '--', x0 + w - 6, y0 + 11);
  ctx.font = '7px Courier New'; ctx.textAlign = 'center';
  for (let b = 0; b < LCD_N; b += 4) ctx.fillText(fLabel(Math.sqrt(lcdEdges[b] * lcdEdges[b + 1])), x0 + 6 + (b * 3 + 1) * cw, y0 + h - 3);
  // reflection on the plastic window
  const rf = ctx.createLinearGradient(x0, y0, x0 + w, y0 + h);
  rf.addColorStop(0, 'rgba(255,255,255,.18)'); rf.addColorStop(.35, 'rgba(255,255,255,0)');
  ctx.fillStyle = rf; ctx.fillRect(x0, y0, w, h);
}
function drawSpectrumLCD(canvas, ctx) {
  aMain.getFloatFrequencyData(bufFD);
  bandsMax(bufFD, lcdEdges, lcdRaw);
  const g = hwGain(), lv = lcdOut;
  for (let b = 0; b < LCD_N; b++) {
    lv[b] = Math.max(0, Math.min(1, (fall(lcdDb, b, lcdRaw[b] + tilt(Math.sqrt(lcdEdges[b] * lcdEdges[b + 1])) + g, 30) + 60) / 60));
    holdPeak(lcdPk, lcdTm, b, lv[b], 40, .015, 0);
  }
  drawLCD(canvas, ctx, lv);
}

// ═══ SPECTROGRAM: time runs right to left, frequency upwards (log), colour = level ═══
const SG_LUT = (() => {                                      // black → violet → red → orange → yellow → white
  const stops = [[0, 0, 0, 0], [.18, 40, 10, 80], [.38, 120, 20, 120], [.58, 220, 50, 60], [.76, 255, 140, 20], [.9, 255, 225, 80], [1, 255, 255, 235]];
  const lut = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = i / 255; let k = 0; while (k < stops.length - 2 && t > stops[k + 1][0]) k++;
    const a = stops[k], b = stops[k + 1], u = (t - a[0]) / (b[0] - a[0]);
    for (let c = 0; c < 3; c++) lut[i * 3 + c] = a[c + 1] + (b[c + 1] - a[c + 1]) * u;
  }
  return lut;
})();
const SG_F0 = 30, SG_F1 = 20000, SG_LO = -100, SG_HI = -25;
let sgCanvas = null, sgCtx = null, sgCol = null, sgAcc = 0;
function sgColour(db, data, o) {
  const i = Math.max(0, Math.min(255, Math.round((db - SG_LO) / (SG_HI - SG_LO) * 255))) * 3;
  data[o] = SG_LUT[i]; data[o + 1] = SG_LUT[i + 1]; data[o + 2] = SG_LUT[i + 2]; data[o + 3] = 255;
}
function sgFrame(canvas, ctx, plotW, plotH, L, TOP) {
  const W = canvas.offsetWidth || canvas.width, H = canvas.offsetHeight || canvas.height;
  ctx.fillStyle = '#050407'; ctx.fillRect(0, 0, W, H);
  if (sgCanvas) ctx.drawImage(sgCanvas, L, TOP, plotW, plotH);
  // frequency axis
  ctx.font = '7px Courier New'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for (const f of [50, 100, 200, 500, 1000, 2000, 5000, 10000]) {
    const yy = TOP + plotH * (1 - Math.log(f / SG_F0) / Math.log(SG_F1 / SG_F0));
    ctx.fillStyle = 'rgba(220,200,255,.55)'; ctx.fillText(fLabel(f), L - 3, yy);
    ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fillRect(L, Math.round(yy), plotW, 1);
  }
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  ctx.font = 'bold 8px Courier New'; ctx.fillStyle = 'rgba(230,210,255,.7)'; ctx.fillText('ESPECTROGRAMA', L, 10);
  ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(200,190,230,.5)'; ctx.fillText('← ' + Math.round(plotW / 60) + ' s', W - 4, 10);
}
function drawSpectrogram(canvas, ctx) {
  const W = canvas.offsetWidth || canvas.width, H = canvas.offsetHeight || canvas.height;
  const L = 30, TOP = 14, R = 4, BOT = 4;
  const plotW = Math.max(20, Math.round(W - L - R)), plotH = Math.max(20, Math.round(H - TOP - BOT));
  if (!sgCanvas || sgCanvas.width !== plotW || sgCanvas.height !== plotH) {
    sgCanvas = document.createElement('canvas'); sgCanvas.width = plotW; sgCanvas.height = plotH;
    sgCtx = sgCanvas.getContext('2d'); sgCtx.fillStyle = '#000'; sgCtx.fillRect(0, 0, plotW, plotH);
    sgCol = sgCtx.createImageData(1, plotH);
  }
  aMain.getFloatFrequencyData(bufFD);
  sgAcc += 60 * dtMs / 1000;                                  // 60 px a second, whatever the frame rate
  const dx = Math.min(plotW, Math.floor(sgAcc)); sgAcc -= dx;
  if (dx > 0) {
    const nyq = actx.sampleRate / 2, bins = bufFD.length, d = sgCol.data;
    for (let yy = 0; yy < plotH; yy++) {
      const fa = SG_F0 * Math.pow(SG_F1 / SG_F0, 1 - (yy + 1) / plotH), fb = SG_F0 * Math.pow(SG_F1 / SG_F0, 1 - yy / plotH);
      const i1 = Math.max(1, Math.floor(fa / nyq * bins)), i2 = Math.min(bins, Math.max(i1 + 1, Math.ceil(fb / nyq * bins)));
      let m = -140; for (let i = i1; i < i2; i++) if (bufFD[i] > m) m = bufFD[i];
      sgColour(m, d, yy * 4);
    }
    sgCtx.drawImage(sgCanvas, -dx, 0);
    for (let k = 0; k < dx; k++) sgCtx.putImageData(sgCol, plotW - 1 - k, 0);
  }
  sgFrame(canvas, ctx, plotW, plotH, L, TOP);
}
function drawIdleSpectrogram(canvas, ctx) {
  const W = canvas.offsetWidth || canvas.width, H = canvas.offsetHeight || canvas.height;
  sgFrame(canvas, ctx, Math.max(20, Math.round(W - 34)), Math.max(20, Math.round(H - 18)), 30, 14);
}
// 64 log bands for the phone's spectrogram, as one base64 string of 0–255 levels
const SG_PHONE_N = 64, sgPhoneEdges = logEdges(SG_PHONE_N, SG_F0, SG_F1), sgPhoneDb = new Float32Array(SG_PHONE_N);
function spectrogramBands() {
  if (!aMain) return null;
  aMain.getFloatFrequencyData(bufFD);
  bandsMax(bufFD, sgPhoneEdges, sgPhoneDb);
  let s = '';
  for (let b = 0; b < SG_PHONE_N; b++) s += String.fromCharCode(Math.max(0, Math.min(255, Math.round((sgPhoneDb[b] - SG_LO) / (SG_HI - SG_LO) * 255))));
  return btoa(s);
}

// ── the whole catalogue: what the console, T and the idle screen use ──
const SPECTRUM_SKINS = [
  ['MODERN', 'MODERN'], ['RETRO', 'RETRO 97'], ['COLUMNS', 'COLUMNS'], ['FL90', 'FL 90s'],
  ['LED80', 'LED 80s'], ['SHOWROOM', 'FL SHOWROOM'], ['AMBER', 'FL ÁMBAR'], ['RTA', 'RTA 1/3'], ['LCD', 'LCD'], ['SPECTRO', 'ESPECTROGRAMA'],
];
function drawSpectrumMore(canvas, ctx) {
  if (spectrumSkin === 'LED80') { drawSpectrumLED80(canvas, ctx); return true; }
  if (spectrumSkin === 'SHOWROOM') { drawSpectrumShowroom(canvas, ctx); return true; }
  if (spectrumSkin === 'AMBER') { drawSpectrumAmber(canvas, ctx); return true; }
  if (spectrumSkin === 'RTA') { drawSpectrumRTA(canvas, ctx); return true; }
  if (spectrumSkin === 'LCD') { drawSpectrumLCD(canvas, ctx); return true; }
  if (spectrumSkin === 'SPECTRO') { drawSpectrogram(canvas, ctx); return true; }
  return false;
}
function drawIdleMore(canvas, ctx) {
  if (spectrumSkin === 'LED80') { ledPk.fill(0); drawLED80(canvas, ctx, null); return true; }
  if (spectrumSkin === 'SHOWROOM') { drawFLDisplay(canvas, ctx, null, null, FL_PAL.TURQ); return true; }
  if (spectrumSkin === 'AMBER') { drawAmber(canvas, ctx, null, null); return true; }
  if (spectrumSkin === 'RTA') { drawRTA(canvas, ctx, null); return true; }
  if (spectrumSkin === 'LCD') { drawLCD(canvas, ctx, null); return true; }
  if (spectrumSkin === 'SPECTRO') { drawIdleSpectrogram(canvas, ctx); return true; }
  return false;
}
