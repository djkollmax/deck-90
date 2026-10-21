'use strict';
// ═══════════════════════════════════════════════════════════
//  DRAW: GONIOMETER (vectorscope)
//  Each sample pair is a dot at x = side (R−L), y = mid (L+R): mono is a vertical line, wide stereo a
//  round cloud, out-of-phase content leans toward the horizontal. Auto-gain keeps quiet music
//  readable, and phosphor persistence leaves short trails like a CRT scope.
// ═══════════════════════════════════════════════════════════
let gonioGain = 1;
function drawGonio(canvas, ctx, live) {
  const W = canvas.offsetWidth || canvas.width;
  const H = canvas.offsetHeight || canvas.height;
  const barH = 12;                                   // correlation bar at the bottom
  const S = Math.max(20, Math.min(W, H - barH - 6)); // the scope is square
  const cx = W / 2, cy = (H - barH - 6) / 2, R = S / 2 - 4;

  // phosphor fade
  ctx.fillStyle = live ? 'rgba(4,8,10,0.30)' : '#04080a';
  ctx.fillRect(0, 0, W, H);

  // graticule: circle, L / R diagonals, M / S axes
  ctx.save();
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(116,255,183,0.10)';
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, R / 2, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R);
  ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(116,255,183,0.06)';
  const d = R * Math.SQRT1_2;
  ctx.beginPath();
  ctx.moveTo(cx - d, cy - d); ctx.lineTo(cx + d, cy + d);
  ctx.moveTo(cx + d, cy - d); ctx.lineTo(cx - d, cy + d);
  ctx.stroke();
  ctx.font = '8px Courier New'; ctx.fillStyle = 'rgba(116,255,183,0.35)';
  ctx.textAlign = 'center';
  ctx.fillText('M', cx, cy - R - 1 > 8 ? cy - R - 1 : 9);
  ctx.textAlign = 'right'; ctx.fillText('L', cx - d - 2, cy - d);
  ctx.textAlign = 'left';  ctx.fillText('R', cx + d + 2, cy - d);
  ctx.restore();

  if (live) {
    // Auto-gain: aim the loudest dot at ~85 % of the radius, slow to open up, quick to back off.
    let mx = 1e-6;
    const n = 2048, from = FFT - n;
    for (let i = from; i < FFT; i++) {
      const a = Math.abs(bufL[i]) + Math.abs(bufR[i]);
      if (a > mx) mx = a;
    }
    const target = Math.min(40, 0.85 / (mx * Math.SQRT1_2));
    gonioGain += (target - gonioGain) * (target < gonioGain ? 0.5 : 1 - Math.exp(-dtMs / 1500));
    const k = R * gonioGain * Math.SQRT1_2;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R + 2, 0, Math.PI * 2); ctx.clip();   // a kick that outruns the gain stays on the screen
    ctx.fillStyle = 'rgba(140,255,200,0.55)';
    for (let i = from; i < FFT; i += 2) {
      const L = bufL[i], Rr = bufR[i];
      const x = cx + (Rr - L) * k, y = cy - (L + Rr) * k;
      ctx.fillRect(x, y, 1.3, 1.3);
    }
    ctx.restore();
  }

  // correlation bar: −1 … +1, the same value as the PHASE card
  const by = H - barH - 2, bx = 8, bw = W - 16;
  ctx.fillStyle = '#0b1114'; ctx.fillRect(bx, by, bw, barH);
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, barH - 1);
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(bx + bw / 2, by + 2, 1, barH - 4);
  if (live) {
    const c = Math.max(-1, Math.min(1, phaseSm));
    const x = bx + (c + 1) / 2 * bw;
    ctx.fillStyle = c < 0 ? '#ff4a25' : c < 0.25 ? '#ffd36a' : '#74ffb7';
    ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 6;
    ctx.fillRect(x - 2, by + 2, 4, barH - 4);
    ctx.shadowBlur = 0;
  }
  ctx.font = '7px Courier New'; ctx.fillStyle = 'rgba(160,170,180,0.4)';
  ctx.textAlign = 'left';  ctx.fillText('−1', bx + 2, by - 2);
  ctx.textAlign = 'right'; ctx.fillText('+1', bx + bw - 2, by - 2);
}
