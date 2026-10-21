'use strict';
// ═══════════════════════════════════════════════════════════
//  IDLE DRAWS
// ═══════════════════════════════════════════════════════════
function drawIdleVU(canvas, ctx) {
  const W = canvas.offsetWidth  || canvas.width;
  const H = canvas.offsetHeight || canvas.height;
  ctx.fillStyle = '#06060f'; ctx.fillRect(0, 0, W, H);
  const st = mkVU();
  drawVU(canvas, ctx, st);
}

function drawIdlePanel(canvas, ctx, txt) {
  const W = canvas.offsetWidth  || canvas.width;
  const H = canvas.offsetHeight || canvas.height;
  ctx.fillStyle = '#05050f'; ctx.fillRect(0, 0, W, H);

  // subtle scanlines
  for (let y = 0; y < H; y += 3) {
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(0, y, W, 1);
  }

  ctx.font = '11px Courier New'; ctx.fillStyle = '#181828';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(txt, W / 2, H / 2);
}


function drawIdleFL(canvas, ctx) {
  const W = canvas.offsetWidth  || canvas.width;
  const H = canvas.offsetHeight || canvas.height;
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#090806');
  bg.addColorStop(.52, '#030302');
  bg.addColorStop(1, '#0b0804');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(255,170,60,.22)';
  ctx.strokeRect(.5, .5, W-1, H-1);
  for (let y = 8; y < H - 18; y += 8) {
    ctx.strokeStyle = 'rgba(255,185,80,.065)';
    ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke();
  }
  const bars = 19;
  const baseY = H - 30;
  const gap = 5;
  const bw = Math.max(8, (W - 34 - gap*(bars-1)) / bars);
  for (let i=0;i<bars;i++) {
    const x = 17 + i*(bw+gap);
    for (let s=0;s<15;s++) {
      const lit = s < 2 + (i % 5 === 0 ? 1 : 0);
      ctx.fillStyle = lit ? 'rgba(41,255,116,.46)' : 'rgba(12,45,24,.32)';
      ctx.shadowColor = lit ? 'rgba(41,255,116,.38)' : 'transparent';
      ctx.shadowBlur = lit ? 7 : 0;
      ctx.fillRect(x, baseY - s*7, bw, 5);
      ctx.shadowBlur = 0;
    }
  }
  ctx.font = 'bold 10px Courier New';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,195,95,.70)';
  ctx.fillText('FL DISPLAY 90s · PRESS CAPTURE TO START', W/2, 18);
}

function drawIdleColumns(canvas, ctx) {
  const W = canvas.offsetWidth || canvas.width, H = canvas.offsetHeight || canvas.height;
  spPeak.fill(-Infinity);
  drawColumnsFrame(ctx, W, H, null);
}

function drawIdle() {
  sizeCanvases();
  if (mods.vu) { drawIdleVU(cVL, xVL); drawIdleVU(cVR, xVR); }
  if (mods.spectrum) {
    if (spectrumSkin === 'FL90') drawIdleFL(cSP, xSP);
    else if (spectrumSkin === 'COLUMNS') drawIdleColumns(cSP, xSP);
    else if (spectrumSkin === 'RETRO') { spPeak.fill(0); drawRetroFrame(cSP, xSP, null); }
    else drawIdlePanel(cSP, xSP, '── SPECTRUM ANALYZER ──');
  }
  if (mods.osc) drawIdlePanel(cOS, xOS, '── OSCILLOSCOPE ──');
  if (mods.gonio) drawGonio(cGO, xGO, false);
  if (miniMode) drawMini(cMI, xMI, false);
  if (mods.deck) drawDeck(cDK, xDK, false);
  if (mods.tape) drawBigTape(cTP, xTP, false);
  lufsHist.length = 0; drawLufsHistory(performance.now());
}
