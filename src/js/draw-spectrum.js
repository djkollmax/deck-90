'use strict';
// ═══════════════════════════════════════════════════════════
//  DRAW: SPECTRUM — COLUMNS
// ═══════════════════════════════════════════════════════════
// Column analyzer: black, ~40 wide log bands with no rounding, one
// vertical light-blue→white gradient for all bars, a thin grey peak line, 0–60 dB on the right.
const COL_N = 41, COL_FMIN = 50, COL_FMAX = 22050;
function colBand(i){ return COL_FMIN * Math.pow(COL_FMAX / COL_FMIN, i / COL_N); }
function colLabel(f){
  return f >= 1000 ? (f / 1000).toFixed(f >= 10000 ? 0 : 1) + 'K' : String(Math.round(f));
}
function drawColumnsFrame(ctx, W, H, levels) {
  const RIGHT = 30, BOTTOM = 11, TOP = 6;
  const PW = W - RIGHT, PH = H - BOTTOM - TOP;
  const y = db => TOP + (-Math.max(-60, Math.min(0, db)) / 60) * PH;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);

  // grid + dB scale on the right
  ctx.font = '7px Segoe UI, Arial, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for (let d = 0; d <= 60; d += 10) {
    const yy = Math.round(y(-d)) + .5;
    ctx.strokeStyle = '#333'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(PW, yy); ctx.stroke();
    ctx.fillStyle = '#b8b8b8'; ctx.fillText(d + 'dB', W - 3, yy);
  }

  const bw = PW / COL_N;
  if (levels) {
    const grad = ctx.createLinearGradient(0, y(0), 0, y(-60));
    grad.addColorStop(0, '#5e9ee8'); grad.addColorStop(.45, '#a9cdf6'); grad.addColorStop(1, '#ffffff');
    for (let i = 0; i < COL_N; i++) {
      const x0 = Math.round(i * bw), x1 = Math.round((i + 1) * bw) - 1;
      const top = y(levels[i]);
      if (levels[i] > -60) { ctx.fillStyle = grad; ctx.fillRect(x0, top, x1 - x0, y(-60) - top); }
      if (spPeak[i] > -60) {                                  // peak line
        ctx.fillStyle = '#8a8a8a';
        ctx.fillRect(x0, Math.round(y(spPeak[i])), x1 - x0, 1);
      }
    }
  }
  // frequency labels under the bands, alternating colours
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  const every = bw < 22 ? 2 : 1;
  for (let i = 0; i < COL_N; i += every) {
    ctx.fillStyle = (i / every) % 2 ? '#e0a050' : '#9cc8f0';
    ctx.fillText(colLabel(colBand(i + .5)), (i + .5) * bw, H - 2);
  }
}
const colLevels = new Float32Array(COL_N);

// Retro analyzer in the style of late-90s desktop players: a 76×16 grid (19 bars × 3 cells, 1-cell gap,
// 16 rows), coloured row by row from red on top through orange and yellow to green at the bottom.
const RT_BARS = 19, RT_W = 76, RT_H = 16;
const RT_ROWS = ['#ef3110','#ce2910','#d65a00','#d66600','#d67300','#c67b08','#dea518','#d6b521',
                 '#bdde29','#94de21','#29ce10','#32be10','#39b510','#319c08','#299400','#188408'];
const RT_BG = '#000000', RT_DOT = '#182129', RT_PEAK = '#969696';
const rtLevels = new Float32Array(RT_BARS);
function drawRetroFrame(canvas, ctx, levels) {
  const W = canvas.offsetWidth || canvas.width, H = canvas.offsetHeight || canvas.height;
  // The 76×16 grid drawn as vectors so it stays crisp at any size:
  // small background dots, 3-cell-wide bars, a hairline between rows like the original's pixels.
  const cw = W / RT_W, ch = H / RT_H;
  ctx.fillStyle = RT_BG; ctx.fillRect(0, 0, W, H);
  const d = Math.max(1.5, Math.min(cw, ch) * 0.28);
  ctx.fillStyle = RT_DOT;
  for (let yy = 1; yy < RT_H; yy += 2) for (let xx = 1; xx < RT_W; xx += 2)
    ctx.fillRect(xx * cw + (cw - d) / 2, yy * ch + (ch - d) / 2, d, d);
  if (!levels) return;
  const gap = Math.max(1, ch * 0.14);
  for (let b = 0; b < RT_BARS; b++) {
    const x0 = Math.round(b * 4 * cw), x1 = Math.round((b * 4 + 3) * cw);
    const rows = Math.round(levels[b] * RT_H);
    for (let r = 0; r < rows; r++) {
      const yy = RT_H - 1 - r;
      ctx.fillStyle = RT_ROWS[yy];
      ctx.fillRect(x0, Math.round(yy * ch), x1 - x0, Math.max(1, Math.round(ch - gap)));
    }
    const pk = Math.round(spPeak[b] * RT_H);
    if (pk > 0) {
      ctx.fillStyle = RT_PEAK;
      ctx.fillRect(x0, Math.round((RT_H - pk) * ch), x1 - x0, Math.max(2, Math.round(ch * 0.45)));
    }
  }
}
function drawSpectrumRetro(canvas, ctx) {
  const fd = bufFD;
  aMain.getFloatFrequencyData(fd);
  const nyq = actx.sampleRate / 2, bins = aMain.frequencyBinCount;
  const F0 = 40, F1 = 16000;
  for (let b = 0; b < RT_BARS; b++) {
    const f1 = F0 * Math.pow(F1 / F0, b / RT_BARS), f2 = F0 * Math.pow(F1 / F0, (b + 1) / RT_BARS);
    const bi1 = Math.max(1, Math.floor(f1 / nyq * bins)), bi2 = Math.min(bins, Math.max(bi1 + 1, Math.ceil(f2 / nyq * bins)));
    let maxDb = -120;
    for (let i = bi1; i < bi2; i++) if (fd[i] > maxDb) maxDb = fd[i];
    // tilt the display up towards the highs; ~+3 dB per octave keeps cymbals visible
    maxDb += 3 * Math.log2((f1 + f2) / 2 / 1000);
    const lv = Math.max(0, Math.min(1, (smoothBar(b, maxDb) + 66) / 60));
    rtLevels[b] = lv;
    if (lv > spPeak[b] || !isFinite(spPeak[b])) { spPeak[b] = lv; spPeakTm[b] = 22; }
    else if (spPeakTm[b] > 0) spPeakTm[b] -= frameScale;
    else spPeak[b] = Math.max(0, spPeak[b] - 0.012 * frameScale);
  }
  drawRetroFrame(canvas, ctx, rtLevels);
}
function drawSpectrumColumns(canvas, ctx) {
  const W = canvas.offsetWidth || canvas.width, H = canvas.offsetHeight || canvas.height;
  const fd = bufFD;
  aMain.getFloatFrequencyData(fd);
  const nyq = actx.sampleRate / 2, bins = aMain.frequencyBinCount;
  for (let b = 0; b < COL_N; b++) {
    const bi1 = Math.max(1, Math.floor(colBand(b) / nyq * bins));
    const bi2 = Math.min(bins, Math.max(bi1 + 1, Math.ceil(colBand(b + 1) / nyq * bins)));
    let maxDb = -120;
    for (let i = bi1; i < bi2; i++) if (fd[i] > maxDb) maxDb = fd[i];
    if (!isFinite(maxDb)) maxDb = -120;
    maxDb = smoothBar(b, maxDb + 6);              // +6: shift so typical music sits mid-scale
    colLevels[b] = maxDb;
    if (maxDb > spPeak[b]) { spPeak[b] = maxDb; spPeakTm[b] = 60; }
    else if (spPeakTm[b] > 0) spPeakTm[b] -= frameScale;
    else spPeak[b] = Math.max(-61, spPeak[b] - 0.35 * frameScale);
  }
  drawColumnsFrame(ctx, W, H, colLevels);
}


// ═══════════════════════════════════════════════════════════
//  DRAW: SPECTRUM ANALYZER
// ═══════════════════════════════════════════════════════════
function freqColor(t) {
  // t 0-1: blue->cyan->green->yellow->red
  let r, g, b;
  if      (t < 0.25) { r=0;                      g=Math.round(t/0.25*255);        b=255; }
  else if (t < 0.50) { r=0;                      g=255;                            b=Math.round((1-(t-0.25)/0.25)*255); }
  else if (t < 0.75) { r=Math.round((t-0.50)/0.25*255); g=255;                    b=0; }
  else               { r=255;                    g=Math.round((1-(t-0.75)/0.25)*255); b=0; }
  return [r, g, b];
}


// ── FL 90s: the levels are measured here, the display is drawn by drawFLDisplay so the phone page
// can draw the same panel from the levels the PC sends it.
const FL_BARS = [31.5,45,63,90,125,180,250,355,500,710,1000,1400,2000,2800,4000,5600,8000,11200,16000];
const FL_FLOOR = -72;
// raw level of each band: the loudest FFT bin within ±½ octave (dBFS, no smoothing, no gain)
function flRawLevels(out) {
  const fd = bufFD;
  aMain.getFloatFrequencyData(fd);
  const nyq = actx.sampleRate / 2, bins = aMain.frequencyBinCount;
  for (let b = 0; b < FL_BARS.length; b++) {
    const f = FL_BARS[b];
    const bi1 = Math.max(0, Math.floor(f / Math.SQRT2 / nyq * bins));
    const bi2 = Math.min(bins, Math.ceil(f * Math.SQRT2 / nyq * bins));
    let maxDb = FL_FLOOR;
    for (let i = bi1; i < bi2; i++) if (fd[i] > maxDb) maxDb = fd[i];
    out[b] = isFinite(maxDb) ? maxDb : FL_FLOOR;
  }
  return out;
}
// The FL 90s view is intentionally more visually responsive than the mastering view: HOT/MAX lift
// the display so yellow and red segments appear with real music, like classic hi-fi analyzers.
function flGain(sens, live) { return !live ? 0 : sens === 0 ? 10 : sens === 1 ? 18 : 24; }
// peak caps: hold ~70 frames at 60 Hz, then fall 0.55 dB a frame
function flPeaks(levels, peak, peakTm, scale) {
  for (let b = 0; b < FL_BARS.length; b++) {
    if (levels[b] > peak[b]) { peak[b] = levels[b]; peakTm[b] = 70; }
    else if (peakTm[b] > 0) peakTm[b] -= scale;
    else peak[b] = Math.max(FL_FLOOR, peak[b] - .55 * scale);
  }
}

const flRaw = new Float32Array(FL_BARS.length), flShown = new Float32Array(FL_BARS.length);
function drawSpectrumFL(canvas, ctx, pal) {
  flRawLevels(flRaw);
  const g = flGain(flSensitivity, audible());
  for (let b = 0; b < FL_BARS.length; b++) flShown[b] = Math.min(0, smoothBar(b, flRaw[b]) + g);
  flPeaks(flShown, spPeak, spPeakTm, frameScale);
  drawFLDisplay(canvas, ctx, flShown, spPeak, pal);
}

// Colour schemes of the fluorescent display. GREEN is the original FL 90s; TURQ is the shop-window
// display (blue-green with magenta tops); AMBER the warm orange of 90s Japanese mini systems.
const FL_PAL = {
  GREEN: { seg: [['#29ff74', 'rgba(12,45,24,.40)', 'rgba(41,255,116,.55)'], ['#ffe25a', 'rgba(65,55,8,.36)', 'rgba(255,226,90,.55)'], ['#ff8b22', 'rgba(68,28,10,.36)', 'rgba(255,139,34,.62)']],
           bg: ['#090806', '#030302', '#0b0804'], tint: '255,185,80', frame: 'rgba(255,170,60,.22)', zero: 'rgba(255,95,40,.22)',
           glowA: 'rgba(255,165,54,.060)', glowB: 'rgba(40,255,120,.030)', cap: 'rgba(80,255,135,.68)', capGlow: 'rgba(80,255,135,.45)',
           title: 'FL DISPLAY 90s', sub: 'CLASSIC FL DISPLAY', lamps: ['POWER', 'STEREO', 'EQ', 'PEAK HOLD'], lampOn: 'rgba(41,255,116,.9)', lampHot: 'rgba(255,139,34,.95)' },
  TURQ:  { seg: [['#2ff3e0', 'rgba(8,40,44,.42)', 'rgba(47,243,224,.55)'], ['#7ad7ff', 'rgba(14,34,58,.40)', 'rgba(122,215,255,.55)'], ['#ff5fd2', 'rgba(52,12,44,.40)', 'rgba(255,95,210,.62)']],
           bg: ['#04080b', '#010305', '#040a0d'], tint: '120,230,240', frame: 'rgba(90,220,235,.22)', zero: 'rgba(255,95,210,.22)',
           glowA: 'rgba(60,220,255,.060)', glowB: 'rgba(255,95,210,.025)', cap: 'rgba(110,245,235,.75)', capGlow: 'rgba(80,240,230,.5)',
           title: 'FL SHOWROOM', sub: 'DIGITAL SPECTRUM', lamps: ['POWER', 'SURROUND', 'BASS', 'DEMO'], lampOn: 'rgba(47,243,224,.9)', lampHot: 'rgba(255,95,210,.95)' },
  AMBER: { seg: [['#ffb02e', 'rgba(52,26,4,.42)', 'rgba(255,176,46,.55)'], ['#ff9520', 'rgba(56,24,4,.40)', 'rgba(255,149,32,.58)'], ['#ff5a14', 'rgba(60,16,4,.42)', 'rgba(255,90,20,.65)']],
           bg: ['#0a0603', '#030201', '#0b0603'], tint: '255,170,70', frame: 'rgba(255,150,50,.24)', zero: 'rgba(255,90,20,.25)',
           glowA: 'rgba(255,150,40,.070)', glowB: 'rgba(255,90,20,.025)', cap: 'rgba(255,180,70,.75)', capGlow: 'rgba(255,160,50,.5)',
           title: 'FL AMBER', sub: 'SPECTRUM ANALYZER', lamps: ['POWER', 'STEREO', 'AUTO', 'PEAK'], lampOn: 'rgba(255,176,46,.95)', lampHot: 'rgba(255,90,20,.95)' },
  // FL SPECTRUM (7.3): a clean black window in a gold line, green bars turning yellow and orange at the top,
  // orange peak caps, the bands named underneath and one PEAK HOLD lamp. No scale: just the bars.
  SPEC:  { seg: [['#22ec6a', 'rgba(14,40,22,.50)', 'rgba(40,236,110,.50)'], ['#f4ec42', 'rgba(52,50,12,.46)', 'rgba(244,236,66,.50)'], ['#ffae22', 'rgba(60,38,10,.46)', 'rgba(255,174,34,.58)']],
           bg: ['#070707', '#020202', '#060605'], tint: '240,222,176', frame: 'rgba(205,165,82,.90)', zero: 'rgba(0,0,0,0)',
           glowA: 'rgba(255,200,90,.030)', glowB: 'rgba(40,255,120,.018)', cap: '#efe2c0', capGlow: 'rgba(0,0,0,0)',
           title: 'FL SPECTRUM', sub: '', lamps: ['PEAK HOLD'], lampOn: '#ff9c1c', lampHot: '#ff9c1c', clean: true, peakCap: '#ff9c1c', zones: [.6, .86] },
  // FL SPECTRUM CIAN: the same window in turquoise; each bar's top segments glow paler, whatever its height
  SPEC2: { seg: [['#18dcc8', 'rgba(8,38,38,.55)', 'rgba(30,226,210,.50)'], ['#5fece0', 'rgba(8,38,38,.55)', 'rgba(80,236,224,.50)'], ['#b4faf4', 'rgba(8,38,38,.55)', 'rgba(170,250,244,.55)']],
           bg: ['#060707', '#020303', '#050606'], tint: '230,240,236', frame: 'rgba(205,165,82,.90)', zero: 'rgba(0,0,0,0)',
           glowA: 'rgba(60,230,220,.030)', glowB: 'rgba(40,200,220,.018)', cap: '#f0b44c', label: '#e9e6dc', capGlow: 'rgba(0,0,0,0)',
           title: 'FL SPECTRUM', sub: '', lamps: ['PEAK HOLD'], lampOn: '#ff9c1c', lampHot: '#ff9c1c', clean: true, peakCap: '#ff9c1c', topZones: [4, 7] },
};
// The glow under many lit shapes at once: they are blurred on a quarter-size canvas and laid under them. A glow
// is soft anyway, and blurring a sixteenth of the pixels is what makes a big FL display cheap to light.
// shapes: [[Path2D in the display's coordinates, glow colour], …]; blur as a canvas shadowBlur; y0..y1 the
// band the shapes sit in (only that band, and the glow around it, is laid back: a quiet song lights a strip)
let softGlowCanvas = null;
function softGlow(ctx, W, H, shapes, blur, y0 = 0, y1 = H) {
  if (!shapes.length) return;
  const pr = ctx.getTransform().a || 1, q = 4, gw = Math.max(1, Math.ceil(W * pr / q)), gh = Math.max(1, Math.ceil(H * pr / q));
  const m = blur * 2 + q, sy = Math.max(0, Math.floor((y0 - m) * pr / q)), ey = Math.min(gh, Math.ceil((y1 + m) * pr / q));
  if (ey <= sy) return;
  const g = softGlowCanvas || (softGlowCanvas = document.createElement('canvas'));
  if (g.width !== gw || g.height !== gh) { g.width = gw; g.height = gh; }
  const x = g.getContext('2d'), off = gw + 64;               // the shapes far to the left, only their shadows in view
  x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, sy, gw, ey - sy);
  x.setTransform(pr / q, 0, 0, pr / q, -off, 0);
  x.shadowOffsetX = off; x.shadowOffsetY = 0; x.shadowBlur = blur / q;
  for (const [path, color] of shapes) { x.shadowColor = color; x.fillStyle = '#000'; x.fill(path); }
  ctx.drawImage(g, 0, sy, gw, ey - sy, 0, sy * q / pr, gw * q / pr, (ey - sy) * q / pr);
}
function drawFLDisplay(canvas, ctx, levels, peaks, pal, blink) {
  pal = pal || FL_PAL.GREEN;
  const W = canvas.offsetWidth  || canvas.width;
  const H = canvas.offsetHeight || canvas.height;
  const PA = pal.clean ? Math.max(24, Math.min(36, H * .1)) : 24;
  const TOP = pal.clean ? Math.max(20, Math.min(46, H * .13)) : 0;   // the clean one keeps a strip for its name
  const [Z1, Z2] = pal.zones || [.55, .72];                   // where the yellow and the top colour begin
  const DFLOOR = FL_FLOOR, DCEIL = 0;
  const flBars = FL_BARS;
  function dbToY(db){ return TOP + (H - PA - TOP) * (1 - (db - DFLOOR) / (DCEIL - DFLOOR)); }
  // evenly spaced bands like a hardware graphic display; bars take 72 % of their slot, so they
  // grow with the window instead of staying thin
  const slot = (W - 8) / flBars.length;
  const bw = Math.max(3, slot * 0.72);
  const segH = Math.max(3, Math.min(9, (H - PA - TOP) / 34));
  const segGap = segH > 4 ? 2 : 1;
  const segCount = Math.max(1, Math.floor((H - PA - 8 - TOP) / (segH + segGap)));
  const segY = s => H - PA - 8 - s * (segH + segGap);
  const segC = s => pal.seg[pal.topZones ? 0 : s > segCount * Z2 ? 2 : s > segCount * Z1 ? 1 : 0];
  const key = pal.title + '|' + pal.seg[0][0] + '|' + canvas.id;   // (two palettes share a name: FL SPECTRUM)

  // ── still: the glass, the scale, every segment unlit and the band labels
  blit(ctx, still('fl-back:' + canvas.id, W, H, key, x => {
    const bg = x.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, pal.bg[0]);
    bg.addColorStop(.45, pal.bg[1]);
    bg.addColorStop(1, pal.bg[2]);
    x.fillStyle = bg;
    x.fillRect(0, 0, W, H);
    if (pal.clean) {                                    // a dark steel edge and a thin gold line inside it
      x.strokeStyle = 'rgba(70,72,76,.9)'; x.lineWidth = 3; x.strokeRect(1.5, 1.5, W - 3, H - 3);
      x.strokeStyle = pal.frame; x.lineWidth = 1.5; x.strokeRect(4.25, 4.25, W - 8.5, H - 8.5);
    } else {
    x.fillStyle = 'rgba(' + pal.tint + ',.035)';
    x.fillRect(0, 0, W, 18);
    // display frame
    x.strokeStyle = pal.frame;
    x.lineWidth = 1;
    x.strokeRect(.5, .5, W-1, H-1);
    }
    // horizontal reference lines
    if (!pal.clean) [-60,-48,-36,-24,-12,0].forEach(db => {
      const y = dbToY(db);
      x.beginPath(); x.moveTo(0, y); x.lineTo(W, y);
      x.strokeStyle = db === 0 ? pal.zero : 'rgba(' + pal.tint + ',.10)';
      x.stroke();
      x.font = '7px Courier New';
      x.fillStyle = 'rgba(' + pal.tint + ',.38)';
      x.textAlign = 'left';
      x.fillText(db + 'dB', 4, y - 2);
    });
    for (let b = 0; b < flBars.length; b++) {
      const bx = 4 + b * slot + (slot - bw) / 2;
      for (let s = 0; s < segCount; s++) {
        const sy = segY(s);
        x.fillStyle = segC(s)[1]; x.fillRect(bx, sy, bw, segH);
        x.fillStyle = 'rgba(255,255,255,.025)'; x.fillRect(bx, sy, bw, 1);
      }
      // labels (fewer when the panel is narrow)
      const f = flBars[b];
      let lbl = f >= 1000 ? (f/1000).toFixed(f>=10000?0:1).replace('.0','') + 'k' : String(Math.round(f));
      const every = slot < 16 ? 4 : 2;
      if (pal.clean) {                                  // every other band, big and cream
        if (b % (slot < 30 ? 4 : 2) === 0) {
          x.font = `bold ${Math.max(9, Math.min(18, Math.round(slot * .21), Math.round(PA * .62)))}px Courier New`; x.fillStyle = pal.label || pal.cap; x.textAlign = 'center';
          x.fillText(lbl, bx + bw / 2, H - PA * .32);
        }
      } else if (b % every === 0 || f === 1000 || f === 16000) {
        x.font = '8px Courier New';
        x.fillStyle = 'rgba(' + pal.tint + ',.58)';
        x.textAlign = 'center';
        x.fillText(lbl, bx + bw / 2, H - 6);
      }
    }
  }));

  // ── what moves: the lit segments, glowing, and the peak caps. Each colour is filled as one shape, so its
  // glow is blurred once a frame instead of once per segment (hundreds of blurs a frame before).
  const litP = [new Path2D(), new Path2D(), new Path2D()], capP = [new Path2D(), new Path2D(), new Path2D()], hiP = new Path2D();
  const litN = [0, 0, 0], capN = [0, 0, 0];
  let litTop = H;
  for (let b = 0; b < flBars.length; b++) {
    const x = 4 + b * slot + (slot - bw) / 2;
    const y = dbToY(levels ? levels[b] : DFLOOR);
    const litCount = levels ? Math.max(0, Math.round(((H - PA) - y) / (H - PA - TOP) * segCount)) : 0;
    for (let s = 0; s < litCount && s < segCount; s++) {
      const top = Math.min(litCount, segCount) - 1 - s;            // (topZones: counted down from the bar's top)
      const sy = segY(s), ci = pal.topZones ? (top < pal.topZones[0] ? 2 : top < pal.topZones[1] ? 1 : 0) : s > segCount * Z2 ? 2 : s > segCount * Z1 ? 1 : 0;
      litP[ci].rect(x, sy, bw, segH); litN[ci]++;
      hiP.rect(x, sy, bw, 1);
      if (sy < litTop) litTop = sy;
    }
    if (peaks && peaks[b] > DFLOOR) {
      const ci = pal.clean ? 2 : peaks[b] > -12 ? 2 : peaks[b] > -28 ? 1 : 0;   // the clean one: all orange
      const ch = pal.clean ? Math.max(3, Math.round(segH * .6)) : 2;
      capP[ci].rect(x, Math.max(TOP ? TOP - ch : 4, dbToY(peaks[b]) - (pal.clean ? ch - 2 : 0)), bw, ch); capN[ci]++;
    }
  }
  softGlow(ctx, W, H, [0, 1, 2].filter(ci => litN[ci]).map(ci => [litP[ci], pal.seg[ci][2]]), 8, litTop, segY(0) + segH);
  for (let ci = 0; ci < 3; ci++) if (litN[ci]) { ctx.fillStyle = pal.seg[ci][0]; ctx.fill(litP[ci]); }
  ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fill(hiP);
  for (let ci = 0; ci < 3; ci++) if (capN[ci]) { ctx.fillStyle = ctx.shadowColor = pal.peakCap || pal.seg[ci][0]; ctx.shadowBlur = 9; ctx.fill(capP[ci]); }
  ctx.shadowBlur = 0;

  // ── vintage glass scanlines and fluorescent bloom, both screened over the display. They are kept as one
  // layer, the bloom screened onto the scanlines: screening that is the same as screening them one by one.
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  blit(ctx, still('fl-glass:' + canvas.id, W, H, key, x => {
    if (!pal.clean) for (let yy = 2; yy < H - PA; yy += 4) { x.fillStyle = 'rgba(' + pal.tint + ',.022)'; x.fillRect(0, yy, W, 1); }
    x.globalCompositeOperation = 'screen';
    const glow = x.createRadialGradient(W*.50, H*.42, 0, W*.50, H*.42, Math.max(W,H)*.62);
    glow.addColorStop(0, pal.glowA);
    glow.addColorStop(.48, pal.glowB);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = glow;
    x.fillRect(0,0,W,H);
  }));
  ctx.restore();

  // ── still, on top: the indicator lamps (only when there is room for them and the caption; the last one
  // blinks in demo) and the caption; all of it in the top strip, so the layer is only that tall
  const lampOn = !blink || (Math.floor(performance.now() / 500) % 2 === 0);
  blit(ctx, still('fl-top:' + canvas.id, W, Math.min(H, Math.max(44, TOP + 16)), key + '|' + lampOn, x => {
    if (pal.clean) {                                    // the name on the left, one PEAK HOLD lamp on the right
      const fs = Math.max(10, Math.min(20, Math.round(TOP * .42)));
      x.textBaseline = 'middle';
      x.font = `bold ${fs}px Courier New`; x.textAlign = 'left'; x.fillStyle = pal.cap;
      x.fillText(pal.title, 16, TOP * .55 + 2);
      if (W > 300) {
        x.font = `bold ${fs - 2}px Courier New`; x.textAlign = 'right';
        x.fillText(pal.lamps[0], W - 16, TOP * .55 + 2);
        const tw = x.measureText(pal.lamps[0]).width;
        x.beginPath(); x.arc(W - 16 - tw - 10, TOP * .55 + 2, Math.max(3, fs * .3), 0, Math.PI * 2);
        x.fillStyle = x.shadowColor = pal.lampOn; x.shadowBlur = 8; x.fill(); x.shadowBlur = 0;
      }
      return;
    }
    if (W > 420) {
      pal.lamps.forEach((txt, i) => {
        const lx = W - 230 + i * 58;
        const on = i < 3 || lampOn;
        x.beginPath();
        x.arc(lx, 10, 3.2, 0, Math.PI*2);
        x.fillStyle = !on ? 'rgba(60,60,60,.5)' : i === 3 ? pal.lampHot : pal.lampOn;
        x.shadowColor = x.fillStyle;
        x.shadowBlur = on ? 8 : 0;
        x.fill();
        x.shadowBlur = 0;
        x.font = '6px Courier New';
        x.fillStyle = 'rgba(' + pal.tint + ',.50)';
        x.textAlign = 'left';
        x.fillText(txt, lx + 7, 12);
      });
      x.font = 'bold 9px Courier New';
      x.textAlign = 'right';
      x.fillStyle = 'rgba(' + pal.tint + ',.74)';
      x.fillText(pal.sub, W - 8, 25);
    }
    // caption
    x.font = 'bold 9px Courier New';
    x.textAlign = 'left';
    x.fillStyle = pal.cap;
    x.shadowColor = pal.capGlow;
    x.shadowBlur = 8;
    x.fillText(pal.title, 8, 13);
    x.shadowBlur = 0;
  }));
}

function drawSpectrum(canvas, ctx) {
  if (spectrumSkin === 'FL90') { drawSpectrumFL(canvas, ctx); return; }
  if (typeof drawSpectrumMore === 'function' && drawSpectrumMore(canvas, ctx)) return;
  if (spectrumSkin === 'COLUMNS')   { drawSpectrumColumns(canvas, ctx);   return; }
  if (spectrumSkin === 'RETRO')   { drawSpectrumRetro(canvas, ctx);   return; }
  const W = canvas.offsetWidth  || canvas.width;
  const H = canvas.offsetHeight || canvas.height;
  const PA = 18; // bottom padding for freq labels

  const fd = bufFD;
  aMain.getFloatFrequencyData(fd);

  const nyq  = actx.sampleRate / 2;
  const bins = aMain.frequencyBinCount;
  const FMIN = 20, FMAX = 20000;

  function fToX(f) {
    return (Math.log10(f / FMIN) / Math.log10(FMAX / FMIN)) * W;
  }
  function dbToY(db, floor, ceil) {
    return (H - PA) * (1 - (db - floor) / (ceil - floor));
  }

  const DFLOOR = -80, DCEIL = 0;

  // still: the panel, the dB and frequency grids and their figures
  const oled = SPECTRUM_MODES[spectrumModeIndex] === 'OLED';
  blit(ctx, still('sp-back:' + canvas.id, W, H, String(oled), x => {
    x.fillStyle = oled ? '#010206' : '#06060f'; x.fillRect(0, 0, W, H);
    // dB grid
    [-60,-48,-36,-24,-12,0].forEach(db => {
      const y = dbToY(db, DFLOOR, DCEIL);
      x.beginPath(); x.moveTo(0, y); x.lineTo(W, y);
      x.strokeStyle = db === 0 ? '#1a1a30' : '#0e0e1c'; x.lineWidth = 1;
      x.stroke();
      x.font = '7px Courier New'; x.fillStyle = '#3a3a60';
      x.textAlign = 'left'; x.fillText(db + 'dB', 3, y - 2);
    });
    // Freq grid
    const fgrid = [[50,'50'],[100,'100'],[200,'200'],[500,'500'],
                   [1000,'1k'],[2000,'2k'],[5000,'5k'],[10000,'10k'],[20000,'20k']];
    fgrid.forEach(([f, lbl]) => {
      const fx = fToX(f);
      x.beginPath(); x.moveTo(fx, 0); x.lineTo(fx, H - PA);
      x.strokeStyle = '#0e0e1c'; x.lineWidth = 1; x.stroke();
      x.font = '8px Courier New'; x.fillStyle = '#4a4a78';
      // keep the edge labels (20k) inside the panel instead of half cut off
      const half = x.measureText(lbl).width / 2 + 2;
      x.textAlign = 'center'; x.fillText(lbl, Math.min(W - half, Math.max(half, fx)), H - 4);
    });
  }));

  // Bars
  const contourPts = [];
  for (let b = 0; b < NBARS; b++) {
    const f1 = FMIN * Math.pow(FMAX / FMIN,  b      / NBARS);
    const f2 = FMIN * Math.pow(FMAX / FMIN, (b + 1) / NBARS);
    const bi1 = Math.max(0,    Math.floor(f1 / nyq * bins));
    const bi2 = Math.min(bins, Math.ceil (f2 / nyq * bins));

    let maxDb = DFLOOR;
    for (let i = bi1; i < bi2; i++) if (fd[i] > maxDb) maxDb = fd[i];
    if (!isFinite(maxDb)) maxDb = DFLOOR;
    maxDb = smoothBar(b, maxDb);

    // Peak hold
    if (maxDb > spPeak[b]) {
      spPeak[b] = maxDb; spPeakTm[b] = SP_HOLD;
    } else if (spPeakTm[b] > 0) {
      spPeakTm[b] -= frameScale;
    } else {
      spPeak[b] = Math.max(DFLOOR, spPeak[b] - SP_DECAY * frameScale);
    }

    const x1 = fToX(f1);
    const x2 = fToX(f2);
    const bw = Math.max(1, x2 - x1 - 1);
    const y  = dbToY(maxDb, DFLOOR, DCEIL);
    const bh = (H - PA) - y;

    if (bh > 0) {
      const t = b / NBARS;
      const [r, g, bv] = freqColor(t);
      const lvlT = Math.max(0, Math.min(1, (maxDb - DFLOOR) / (DCEIL - DFLOOR)));

      const grad = ctx.createLinearGradient(0, y, 0, H - PA);
      grad.addColorStop(0,   `rgba(${r},${g},${bv},${0.45 + lvlT * 0.55})`);
      grad.addColorStop(0.5, `rgba(${r},${g},${bv},${0.2  + lvlT * 0.3})`);
      grad.addColorStop(1,   `rgba(${r},${g},${bv},0.04)`);
      ctx.fillStyle = grad;
      ctx.fillRect(x1, y, bw, bh);

      // Top cap glow
      ctx.fillStyle = `rgba(${r},${g},${bv},${0.7 + lvlT * 0.3})`;
      ctx.fillRect(x1, y, bw, Math.min(2, bh));
    }
    contourPts.push({ x: (x1 + x2) / 2, y: Math.min(H - PA, Math.max(0, dbToY(maxDb, DFLOOR, DCEIL))) });
  }

  // Peak hold marks
  for (let b = 0; b < NBARS; b++) {
    if (spPeak[b] <= DFLOOR) continue;
    const f1 = FMIN * Math.pow(FMAX / FMIN,  b      / NBARS);
    const f2 = FMIN * Math.pow(FMAX / FMIN, (b + 1) / NBARS);
    const x1 = fToX(f1), x2 = fToX(f2);
    const py = dbToY(spPeak[b], DFLOOR, DCEIL);
    const t  = b / NBARS;
    const [r, g, bv] = freqColor(t);
    ctx.fillStyle = `rgba(${r},${g},${bv},0.55)`;
    ctx.fillRect(x1, py, Math.max(1, x2 - x1 - 1), 1.5);
  }

  // Contour line — triple pass: bloom + glow + sharp core
  if (contourPts.length > 2) {
    const drawContour = () => {
      ctx.beginPath();
      ctx.moveTo(contourPts[0].x, contourPts[0].y);
      for (let i = 1; i < contourPts.length - 1; i++) {
        const mx = (contourPts[i].x + contourPts[i + 1].x) / 2;
        const my = (contourPts[i].y + contourPts[i + 1].y) / 2;
        ctx.quadraticCurveTo(contourPts[i].x, contourPts[i].y, mx, my);
      }
    };
    drawContour(); ctx.strokeStyle = 'rgba(110,190,255,0.09)'; ctx.lineWidth = 8;   ctx.lineCap = 'round'; ctx.stroke();
    drawContour(); ctx.strokeStyle = 'rgba(150,215,255,0.28)'; ctx.lineWidth = 2.5; ctx.stroke();
    drawContour(); ctx.strokeStyle = 'rgba(225,248,255,0.80)'; ctx.lineWidth = 1.2; ctx.stroke();
  }
  // Floor halo — reactive glow rising from baseline
  ctx.save();
  for (let b = 0; b < NBARS; b++) {
    const f1h = FMIN * Math.pow(FMAX / FMIN,  b      / NBARS);
    const f2h = FMIN * Math.pow(FMAX / FMIN, (b + 1) / NBARS);
    const x1h = fToX(f1h), x2h = fToX(f2h);
    const bwh = Math.max(1, x2h - x1h - 1);
    const mxDb = spPeak[b] > DFLOOR ? spPeak[b] : DFLOOR;
    const lvlT = Math.max(0, (mxDb - DFLOOR) / (DCEIL - DFLOOR));
    if (lvlT < 0.04) continue;
    const refH = Math.min(lvlT * (H - PA) * 0.28, (H - PA) * 0.28);
    const th = b / NBARS;
    const [rh, gh, bvh] = freqColor(th);
    const refGrad = ctx.createLinearGradient(0, H - PA, 0, H - PA - refH);
    refGrad.addColorStop(0, `rgba(${rh},${gh},${bvh},${(0.18 * lvlT).toFixed(3)})`);
    refGrad.addColorStop(1, `rgba(${rh},${gh},${bvh},0)`);
    ctx.fillStyle = refGrad;
    ctx.fillRect(x1h, H - PA - refH, bwh, refH);
  }
  ctx.restore();
}
