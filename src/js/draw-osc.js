'use strict';
// ═══════════════════════════════════════════════════════════
//  DRAW: OSCILLOSCOPE
// ═══════════════════════════════════════════════════════════
function drawOsc(canvas, ctx) {
  const W = canvas.offsetWidth  || canvas.width;
  const H = canvas.offsetHeight || canvas.height;

  const td = bufTD;
  aMain.getFloatTimeDomainData(td);

  // Phosphor persistence — partial clear so old frames linger (CRT glow)
  ctx.fillStyle = 'rgba(5,5,14,0.80)'; ctx.fillRect(0, 0, W, H);

  // Grid
  ctx.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    ctx.beginPath(); ctx.moveTo(0, H * i / 4); ctx.lineTo(W, H * i / 4);
    ctx.strokeStyle = i === 2 ? '#121228' : '#0a0a1c'; ctx.stroke();
  }
  for (let i = 1; i < 10; i++) {
    ctx.beginPath(); ctx.moveTo(W * i / 10, 0); ctx.lineTo(W * i / 10, H);
    ctx.strokeStyle = '#0a0a1c'; ctx.stroke();
  }

  // Find zero crossing for stable trigger
  let start = 0;
  for (let i = 1; i < FFT * 0.6; i++) {
    if (td[i - 1] < 0 && td[i] >= 0) { start = i; break; }
  }
  const len = Math.min(FFT - start, Math.floor(FFT * 0.5));

  // Waveform path helper — called 3×
  const oscPath = () => {
    ctx.beginPath();
    for (let i = 0; i < len; i++) {
      const x = (i / len) * W;
      const y = H / 2 - td[start + i] * H * 0.44;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
  };
  // Pass 1: outer bloom
  oscPath(); ctx.strokeStyle = 'rgba(200,155,50,0.09)'; ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.stroke();
  // Pass 2: mid glow
  oscPath(); ctx.strokeStyle = 'rgba(225,178,65,0.32)'; ctx.lineWidth = 5; ctx.stroke();
  // Pass 3: sharp core
  oscPath();
  const oscGrad = ctx.createLinearGradient(0, 0, W, 0);
  oscGrad.addColorStop(0,    'rgba(180,130,40,0.3)');
  oscGrad.addColorStop(0.05, 'rgba(245,195,72,1)');
  oscGrad.addColorStop(0.95, 'rgba(245,195,72,1)');
  oscGrad.addColorStop(1,    'rgba(180,130,40,0.3)');
  ctx.strokeStyle = oscGrad; ctx.lineWidth = 1.6; ctx.stroke();

  // Labels
  ctx.font = '7px Courier New'; ctx.textAlign = 'right';
  ctx.fillStyle = '#282840';
  ctx.fillText('TIME DOMAIN', W - 4, H - 4);
  ctx.textAlign = 'left';
  ctx.fillText('TRIG ▶', 4, H - 4);
}

