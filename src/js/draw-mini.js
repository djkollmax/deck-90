'use strict';
// ═══════════════════════════════════════════════════════════
//  DRAW: MINI STRIP (P)
//  Two little reels that turn while music plays, L/R LED bars on the VU scale with peak hold,
//  and the loudness numbers. The title bar above it keeps the track and the window buttons.
// ═══════════════════════════════════════════════════════════
let miniAngle = 0;
const MINI_SEGS = 36, MINI_MIN = -36, MINI_MAX = 4;    // VU dB across the bar

function miniReel(ctx, x, y, r, a) {
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  g.addColorStop(0, '#f4dc9a'); g.addColorStop(0.6, '#c9a24f'); g.addColorStop(1, '#7a5a22');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#0b0d12';                                      // three windows in the flange
  for (let k = 0; k < 3; k++) {
    const t = a + k * Math.PI * 2 / 3;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(t - 0.42) * r * 0.36, y + Math.sin(t - 0.42) * r * 0.36);
    ctx.arc(x, y, r * 0.82, t - 0.42, t + 0.42);
    ctx.arc(x, y, r * 0.36, t + 0.42, t - 0.42, true);
    ctx.fill();
  }
  ctx.fillStyle = '#d9dde3';
  ctx.beginPath(); ctx.arc(x, y, r * 0.24, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#c9a24f';
  ctx.beginPath(); ctx.arc(x, y, r * 0.11, 0, Math.PI * 2); ctx.fill();
}

function miniBar(ctx, x, y, w, h, lvl, peak, label) {
  const gap = w < 200 ? 1 : 2, sw = Math.max(1, (w - gap * (MINI_SEGS - 1)) / MINI_SEGS);
  const lit = (lvl - MINI_MIN) / (MINI_MAX - MINI_MIN) * MINI_SEGS;
  const pk = Math.round((peak - MINI_MIN) / (MINI_MAX - MINI_MIN) * MINI_SEGS) - 1;
  for (let i = 0; i < MINI_SEGS; i++) {
    const db = MINI_MIN + (i + 0.5) / MINI_SEGS * (MINI_MAX - MINI_MIN);
    const on = i < lit, isPk = i === pk && peak > MINI_MIN;
    const col = db >= 0 ? [255, 74, 37] : db >= -6 ? [255, 211, 106] : [74, 255, 160];
    ctx.fillStyle = (on || isPk) ? `rgb(${col})` : `rgba(${col},0.10)`;
    ctx.fillRect(x + i * (sw + gap), y, sw, h);
  }
  ctx.font = `bold ${Math.max(8, Math.round(h * 0.75))}px Courier New`;
  ctx.fillStyle = 'rgba(217,189,115,0.55)'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  ctx.fillText(label, x - 5, y + h / 2);
}

function drawMini(canvas, ctx, live) {
  const W = canvas.offsetWidth || canvas.width;
  const H = canvas.offsetHeight || canvas.height;
  if (W < 60 || H < 20) return;
  ctx.fillStyle = '#07090e'; ctx.fillRect(0, 0, W, H);

  // reels in a little tape window
  const r = Math.min(H * 0.34, 26), wy = H / 2;
  const showReels = W > 470;
  let x0 = 8;
  if (showReels) {
    const ww = r * 5.2;
    ctx.fillStyle = '#0d1016'; ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.fillRect(x0, wy - r - 5, ww, 2 * r + 10); ctx.strokeRect(x0 + 0.5, wy - r - 4.5, ww - 1, 2 * r + 9);
    const playing = live && npPlaying();
    if (playing) miniAngle += dtMs / 1000 * 2.2;
    miniReel(ctx, x0 + r + 6, wy, r, miniAngle);
    miniReel(ctx, x0 + ww - r - 6, wy, r, miniAngle * 1.15);
    x0 += ww + 14;
  }

  // loudness block on the right
  const rw = W > 420 ? 132 : 92;
  const rx = W - rw - 6;
  const m = live ? miniVals.m : -Infinity;
  const big = Math.max(14, Math.min(H * 0.42, 34));
  ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
  ctx.font = `900 ${big}px Courier New`;
  ctx.fillStyle = '#79d9ff'; ctx.shadowColor = 'rgba(121,217,255,0.35)'; ctx.shadowBlur = 10;
  ctx.fillText(isFinite(m) && m > -70 ? m.toFixed(1) : '--.-', W - 8, wy + big * 0.32);
  ctx.shadowBlur = 0;
  ctx.font = `${Math.max(7, Math.round(H * 0.11))}px Courier New`;
  ctx.fillStyle = 'rgba(160,170,180,0.55)';
  const I = live ? miniVals.i : -Infinity, tp = live ? miniVals.tp : -90;
  ctx.fillText('LUFS · I ' + (isFinite(I) ? I.toFixed(1) : '--.-'), W - 8, wy - big * 0.45);
  ctx.fillStyle = tp > -1 ? '#ff4a25' : 'rgba(160,170,180,0.55)';
  ctx.fillText((tpAvailable ? 'TP ' : 'PK ') + (tp > -89 ? tp.toFixed(1) : '--.-'), W - 8, wy + big * 0.32 + Math.max(9, H * 0.16));

  // L / R bars between them
  const bx = x0 + 14, bw = Math.max(40, rx - bx - 10), bh = Math.max(6, Math.min(14, H * 0.18));
  const lv = s => live ? s.lvl : MINI_MIN - 1, pk = s => live ? s.peak : MINI_MIN - 1;
  miniBar(ctx, bx, wy - bh - 3, bw, bh, lv(vu.L), pk(vu.L), 'L');
  miniBar(ctx, bx, wy + 3, bw, bh, lv(vu.R), pk(vu.R), 'R');
}
