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


function drawSpectrumFL(canvas, ctx) {
  const W = canvas.offsetWidth  || canvas.width;
  const H = canvas.offsetHeight || canvas.height;
  const PA = 24;
  const fd = bufFD;
  aMain.getFloatFrequencyData(fd);

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#090806');
  bg.addColorStop(.45, '#030302');
  bg.addColorStop(1, '#0b0804');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(255,180,70,.035)';
  ctx.fillRect(0, 0, W, 18);

  const nyq  = actx.sampleRate / 2;
  const bins = aMain.frequencyBinCount;
  const FMIN = 31.5, FMAX = 16000;
  const DFLOOR = -72, DCEIL = 0;
  const flBars = [31.5,45,63,90,125,180,250,355,500,710,1000,1400,2000,2800,4000,5600,8000,11200,16000];

  function fToX(f){ return (Math.log10(f / FMIN) / Math.log10(FMAX / FMIN)) * W; }
  function dbToY(db){ return (H - PA) * (1 - (db - DFLOOR) / (DCEIL - DFLOOR)); }

  // classic amber display frame
  ctx.strokeStyle = 'rgba(255,170,60,.22)';
  ctx.lineWidth = 1;
  ctx.strokeRect(.5, .5, W-1, H-1);

  // horizontal reference lines
  [-60,-48,-36,-24,-12,0].forEach(db => {
    const y = dbToY(db);
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y);
    ctx.strokeStyle = db === 0 ? 'rgba(255,95,40,.22)' : 'rgba(255,185,80,.10)';
    ctx.stroke();
    ctx.font = '7px Courier New';
    ctx.fillStyle = 'rgba(255,185,80,.38)';
    ctx.textAlign = 'left';
    ctx.fillText(db + 'dB', 4, y - 2);
  });

  // segmented fluorescent bars
  const gap = 4;
  for (let b = 0; b < flBars.length; b++) {
    const f = flBars[b];
    const f1 = f / Math.sqrt(2);
    const f2 = f * Math.sqrt(2);
    const bi1 = Math.max(0, Math.floor(f1 / nyq * bins));
    const bi2 = Math.min(bins, Math.ceil(f2 / nyq * bins));
    let maxDb = DFLOOR;
    for (let i = bi1; i < bi2; i++) if (fd[i] > maxDb) maxDb = fd[i];
    if (!isFinite(maxDb)) maxDb = DFLOOR;
    maxDb = smoothBar(b, maxDb);

    // The FL 90s view is intentionally more visually responsive than the mastering view.
    // HOT/MAX lift the display so yellow and red segments appear with real music, like classic hi-fi analyzers.
    const sensGain = !audible() ? 0 : flSensitivity === 0 ? 10 : flSensitivity === 1 ? 18 : 24;
    maxDb = Math.min(0, maxDb + sensGain);

    if (maxDb > spPeak[b]) { spPeak[b] = maxDb; spPeakTm[b] = 70; }
    else if (spPeakTm[b] > 0) spPeakTm[b] -= frameScale;
    else spPeak[b] = Math.max(DFLOOR, spPeak[b] - .55 * frameScale);

    // evenly spaced bands like a hardware graphic display; bars take 72 % of their slot, so they
    // grow with the window instead of staying thin
    const slot = (W - 8) / flBars.length;
    const bw = Math.max(6, slot * 0.72);
    const x = 4 + b * slot + (slot - bw) / 2;
    const xCenter = x + bw / 2;
    const y = dbToY(maxDb);
    const segH = Math.max(4, Math.min(9, (H - PA) / 34));
    const segGap = 2;
    const segCount = Math.floor((H - PA - 8) / (segH + segGap));
    const litCount = Math.max(0, Math.round(((H - PA) - y) / (H - PA) * segCount));

    for (let s=0; s<segCount; s++) {
      const sy = H - PA - 8 - s * (segH + segGap);
      const lit = s < litCount;
      let colOff = 'rgba(12,45,24,.40)';
      let colOn = '#29ff74';
      let glow = 'rgba(41,255,116,.55)';
      if (s > segCount * .72) { colOff='rgba(68,28,10,.36)'; colOn='#ff8b22'; glow='rgba(255,139,34,.62)'; }
      else if (s > segCount * .55) { colOff='rgba(65,55,8,.36)'; colOn='#ffe25a'; glow='rgba(255,226,90,.55)'; }
      ctx.fillStyle = lit ? colOn : colOff;
      ctx.shadowColor = lit ? glow : 'transparent';
      ctx.shadowBlur = lit ? 8 : 0;
      ctx.fillRect(x, sy, bw, segH);
      ctx.shadowBlur = 0;
      ctx.fillStyle = lit ? 'rgba(255,255,255,.18)' : 'rgba(255,255,255,.025)';
      ctx.fillRect(x, sy, bw, 1);
    }

    // peak cap
    const py = dbToY(spPeak[b]);
    ctx.fillStyle = spPeak[b] > -12 ? '#ff8b22' : spPeak[b] > -28 ? '#ffe25a' : '#29ff74';
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 9;
    ctx.fillRect(x, Math.max(4, py), bw, 2);
    ctx.shadowBlur = 0;

    // labels
    let lbl = f >= 1000 ? (f/1000).toFixed(f>=10000?0:1).replace('.0','') + 'k' : String(Math.round(f));
    if (b % 2 === 0 || f === 1000 || f === 16000) {
      ctx.font = '8px Courier New';
      ctx.fillStyle = 'rgba(255,195,95,.58)';
      ctx.textAlign = 'center';
      ctx.fillText(lbl, xCenter, H - 6);
    }
  }

  // vintage glass scanlines and fluorescent bloom
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let yy = 2; yy < H - PA; yy += 4) {
    ctx.fillStyle = 'rgba(255,210,120,.022)';
    ctx.fillRect(0, yy, W, 1);
  }
  const glow = ctx.createRadialGradient(W*.50, H*.42, 0, W*.50, H*.42, Math.max(W,H)*.62);
  glow.addColorStop(0, 'rgba(255,165,54,.060)');
  glow.addColorStop(.48, 'rgba(40,255,120,.030)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0,0,W,H);
  ctx.restore();

  // top stereo receiver indicator lamps
  const lamps = ['POWER','STEREO','EQ','PEAK HOLD'];
  lamps.forEach((txt, i) => {
    const lx = W - 230 + i * 58;
    ctx.beginPath();
    ctx.arc(lx, 10, 3.2, 0, Math.PI*2);
    ctx.fillStyle = i === 3 ? 'rgba(255,139,34,.95)' : 'rgba(41,255,116,.9)';
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.font = '6px Courier New';
    ctx.fillStyle = 'rgba(255,205,110,.50)';
    ctx.textAlign = 'left';
    ctx.fillText(txt, lx + 7, 12);
  });

  // FL-display captions
  ctx.font = 'bold 9px Courier New';
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,185,80,.74)';
  ctx.fillText('CLASSIC FL DISPLAY', W - 8, 25);
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(80,255,135,.68)';
  ctx.shadowColor = 'rgba(80,255,135,.45)';
  ctx.shadowBlur = 8;
  ctx.fillText('FL DISPLAY 90s', 8, 13);
  ctx.shadowBlur = 0;
}

function drawSpectrum(canvas, ctx) {
  if (spectrumSkin === 'FL90') { drawSpectrumFL(canvas, ctx); return; }
  if (spectrumSkin === 'COLUMNS')   { drawSpectrumColumns(canvas, ctx);   return; }
  if (spectrumSkin === 'RETRO')   { drawSpectrumRetro(canvas, ctx);   return; }
  const W = canvas.offsetWidth  || canvas.width;
  const H = canvas.offsetHeight || canvas.height;
  const PA = 18; // bottom padding for freq labels

  const fd = bufFD;
  aMain.getFloatFrequencyData(fd);

  ctx.fillStyle = (SPECTRUM_MODES[spectrumModeIndex] === 'OLED') ? '#010206' : '#06060f'; ctx.fillRect(0, 0, W, H);

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

  // dB grid
  [-60,-48,-36,-24,-12,0].forEach(db => {
    const y = dbToY(db, DFLOOR, DCEIL);
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y);
    ctx.strokeStyle = db === 0 ? '#1a1a30' : '#0e0e1c'; ctx.lineWidth = 1;
    ctx.stroke();
    ctx.font = '7px Courier New'; ctx.fillStyle = '#3a3a60';
    ctx.textAlign = 'left'; ctx.fillText(db + 'dB', 3, y - 2);
  });

  // Freq grid
  const fgrid = [[50,'50'],[100,'100'],[200,'200'],[500,'500'],
                 [1000,'1k'],[2000,'2k'],[5000,'5k'],[10000,'10k'],[20000,'20k']];
  fgrid.forEach(([f, lbl]) => {
    const x = fToX(f);
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H - PA);
    ctx.strokeStyle = '#0e0e1c'; ctx.lineWidth = 1; ctx.stroke();
    ctx.font = '8px Courier New'; ctx.fillStyle = '#4a4a78';
    // keep the edge labels (20k) inside the panel instead of half cut off
    const half = ctx.measureText(lbl).width / 2 + 2;
    ctx.textAlign = 'center'; ctx.fillText(lbl, Math.min(W - half, Math.max(half, x)), H - 4);
  });

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
