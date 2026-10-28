'use strict';
// ═══════════════════════════════════════════════════════════
//  BIG CLEAR CASSETTE: one large transparent tape, whole reels visible
// ═══════════════════════════════════════════════════════════
const bigTape = { pos: 1100, ang: [0, 0.7], counter: 0 };
let tapeStyle = 'REEL';
let tapeHits = [];

function drawSpokedHub(ctx, cx, cy, r, ang) {
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang);
  // outer white flange ring
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.arc(0, 0, r * 0.78, 0, Math.PI * 2, true);
  ctx.fillStyle = '#f1efe8'; ctx.fill();
  // six spokes
  ctx.fillStyle = '#e6e3da';
  for (let k = 0; k < 6; k++) {
    ctx.save(); ctx.rotate(k * Math.PI / 3);
    ctx.beginPath(); ctx.moveTo(-r * 0.09, -r * 0.42); ctx.lineTo(r * 0.09, -r * 0.42); ctx.lineTo(r * 0.06, -r * 0.8); ctx.lineTo(-r * 0.06, -r * 0.8); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  // inner drive ring with teeth
  ctx.beginPath(); ctx.arc(0, 0, r * 0.44, 0, Math.PI * 2); ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2, true);
  ctx.fillStyle = '#f4f2ec'; ctx.fill();
  for (let k = 0; k < 6; k++) {
    ctx.save(); ctx.rotate(k * Math.PI / 3 + Math.PI / 6);
    ctx.fillRect(-r * 0.045, -r * 0.31, r * 0.09, r * 0.09);
    ctx.restore();
  }
  // tape clamp notch
  ctx.fillStyle = '#cfcac0'; ctx.fillRect(r * 0.78, -r * 0.06, r * 0.18, r * 0.12);
  ctx.restore();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1; ctx.stroke();
}

// part: 'under' (the shell under the moving parts), 'live' (packs, tape, hubs) or 'front' (label, screws, glare);
// the big tape keeps the two still ones as layers. Without a part, all three.
function drawClearCassette(ctx, cX, cY, cw, ch, st, title, side, part) {
  const R = cw * 0.03;
  const reelY = cY + ch * 0.47, reelL = cX + cw * 0.2875, reelR = cX + cw * 0.7125;
  const rHub = ch * 0.1, rMin = rHub * 1.05, rMax = cw * 0.2;
  if (!part || part === 'under') {
    // soft shadow under the tape
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = ch * 0.12; ctx.shadowOffsetY = ch * 0.05;
    rr(ctx, cX, cY, cw, ch, R); ctx.fillStyle = 'rgba(20,24,30,.55)'; ctx.fill(); ctx.restore();

    // clear shell body (smoked, slightly blue)
    rr(ctx, cX, cY, cw, ch, R);
    const body = ctx.createLinearGradient(cX, cY, cX + cw, cY + ch);
    body.addColorStop(0, 'rgba(190,210,240,.10)'); body.addColorStop(.5, 'rgba(160,180,210,.05)'); body.addColorStop(1, 'rgba(190,210,240,.09)');
    ctx.fillStyle = body; ctx.fill();

    // internal ribs and wells seen through the plastic
    ctx.strokeStyle = 'rgba(210,225,250,.16)'; ctx.lineWidth = 1;
    [[reelL, rMax * 1.05], [reelR, rMax * 1.05]].forEach(([x, r]) => { ctx.beginPath(); ctx.arc(x, reelY, r, 0, Math.PI * 2); ctx.stroke(); });
    ctx.beginPath(); ctx.moveTo(cX + cw * 0.04, cY + ch * 0.2); ctx.lineTo(cX + cw * 0.96, cY + ch * 0.2); ctx.stroke();
  }
  if (!part || part === 'live') {
    const f = Math.max(0, Math.min(1, st.pos / SIDE_SECONDS));
    const rLeft = Math.sqrt(rMin * rMin + (1 - f) * (rMax * rMax - rMin * rMin));   // paying out
    const rRight = Math.sqrt(rMin * rMin + f * (rMax * rMax - rMin * rMin));        // winding up

    // tape packs
    [[reelL, rLeft, st.ang[0]], [reelR, rRight, st.ang[1]]].forEach(([x, r, a]) => {
      const g = ctx.createRadialGradient(x, reelY, rMin, x, reelY, r);
      g.addColorStop(0, '#4e3524'); g.addColorStop(.7, '#3a2719'); g.addColorStop(.985, '#2a1b11'); g.addColorStop(1, '#7a5a3e');
      ctx.beginPath(); ctx.arc(x, reelY, r, 0, Math.PI * 2); ctx.arc(x, reelY, rMin, 0, Math.PI * 2, true); ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = 'rgba(255,215,170,.07)';
      for (let q = rMin + 2; q < r; q += 2.4) { ctx.beginPath(); ctx.arc(x, reelY, q, 0, Math.PI * 2); ctx.stroke(); }
      // rotating sheen on the pack (shows the motion)
      ctx.save(); ctx.translate(x, reelY); ctx.rotate(a * 0.5);
      const sh = ctx.createLinearGradient(-r, 0, r, 0);
      sh.addColorStop(0, 'rgba(255,230,190,0)'); sh.addColorStop(.48, 'rgba(255,230,190,.10)'); sh.addColorStop(.52, 'rgba(255,230,190,.10)'); sh.addColorStop(1, 'rgba(255,230,190,0)');
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.arc(0, 0, rMin, 0, Math.PI * 2, true); ctx.fillStyle = sh; ctx.fill();
      ctx.restore();
    });

    // tape path: packs → guide rollers → past the pressure pad
    const gy = cY + ch * 0.86, gL = cX + cw * 0.115, gR = cX + cw * 0.885, gr = cw * 0.018;
    ctx.strokeStyle = '#3f2b1c'; ctx.lineWidth = Math.max(1.6, ch * 0.01);
    ctx.beginPath(); ctx.moveTo(reelL - rLeft * 0.97, reelY + rLeft * 0.25); ctx.lineTo(gL - gr, gy); ctx.lineTo(gL, gy + gr);
    ctx.lineTo(gR, gy + gr); ctx.lineTo(gR + gr, gy); ctx.lineTo(reelR + rRight * 0.97, reelY + rRight * 0.25); ctx.stroke();
    [gL, gR].forEach(x => {
      ctx.beginPath(); ctx.arc(x, gy, gr, 0, Math.PI * 2); ctx.fillStyle = '#f0eee8'; ctx.fill();
      ctx.beginPath(); ctx.arc(x, gy, gr * 0.4, 0, Math.PI * 2); ctx.fillStyle = '#9a968c'; ctx.fill();
    });
    // pressure pad on its bronze spring
    ctx.fillStyle = '#b08d57'; ctx.fillRect(cX + cw * 0.44, gy - ch * 0.028, cw * 0.12, ch * 0.012);
    ctx.fillStyle = '#d8d4c8'; ctx.fillRect(cX + cw * 0.475, gy - ch * 0.016, cw * 0.05, ch * 0.02);

    // spoked hubs
    drawSpokedHub(ctx, reelL, reelY, rHub, st.ang[0]);
    drawSpokedHub(ctx, reelR, reelY, rHub, st.ang[1]);
  }
  if (part && part !== 'front') return;

  // label strip (translucent)
  const lX = cX + cw * 0.06, lY = cY + ch * 0.055, lW = cw * 0.88, lH = ch * 0.13;
  rr(ctx, lX, lY, lW, lH, 3); ctx.fillStyle = 'rgba(245,242,232,.82)'; ctx.fill();
  ctx.fillStyle = '#d9bd73'; ctx.fillRect(lX, lY + lH - 3, lW, 3);
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  ctx.font = `bold ${Math.round(lH * 0.62)}px Georgia, serif`; ctx.fillStyle = '#26221c';
  ctx.fillText(side, lX + lW * 0.025, lY + lH * 0.47);
  ctx.font = `italic ${Math.round(lH * 0.46)}px "Segoe Print", "Comic Sans MS", cursive`; ctx.fillStyle = '#23338a';
  { let t = title; const room = lW * 0.70;
    while (t.length > 4 && ctx.measureText(t).width > room) t = t.slice(0, -2);
    if (t !== title) t = t.replace(/\s*\S?$/, '') + '…';
    ctx.fillText(t, lX + lW * 0.09, lY + lH * 0.5); }
  ctx.font = `bold ${Math.round(lH * 0.28)}px Arial, sans-serif`; ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(60,55,45,.7)';
  ctx.fillText('CLEAR · 90', lX + lW * 0.975, lY + lH * 0.5);

  // bottom trapezoid outline + openings
  const tY = cY + ch * 0.79;
  ctx.beginPath(); ctx.moveTo(cX + cw * 0.17, cY + ch); ctx.lineTo(cX + cw * 0.22, tY); ctx.lineTo(cX + cw * 0.78, tY); ctx.lineTo(cX + cw * 0.83, cY + ch);
  ctx.strokeStyle = 'rgba(220,235,255,.30)'; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = 'rgba(10,12,16,.55)';
  [0.31, 0.69].forEach(px => { ctx.beginPath(); ctx.arc(cX + cw * px, cY + ch * 0.93, ch * 0.022, 0, Math.PI * 2); ctx.fill(); });
  rr(ctx, cX + cw * 0.42, cY + ch * 0.9, cw * 0.16, ch * 0.06, 2); ctx.fill();

  // screws (metal with a cross)
  [[.035, .07], [.965, .07], [.5, .07], [.035, .93], [.965, .93]].forEach(([px, py]) => {
    const sx = cX + cw * px, sy = cY + ch * py, sr = ch * 0.022;
    const sg = ctx.createRadialGradient(sx - sr * .3, sy - sr * .3, 0, sx, sy, sr);
    sg.addColorStop(0, '#f2f2f2'); sg.addColorStop(1, '#7a7d84');
    ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fillStyle = sg; ctx.fill();
    ctx.strokeStyle = 'rgba(40,40,40,.7)'; ctx.lineWidth = Math.max(1, sr * 0.22);
    ctx.beginPath(); ctx.moveTo(sx - sr * .55, sy); ctx.lineTo(sx + sr * .55, sy); ctx.moveTo(sx, sy - sr * .55); ctx.lineTo(sx, sy + sr * .55); ctx.stroke();
  });

  // edges and glare
  rr(ctx, cX, cY, cw, ch, R); ctx.strokeStyle = 'rgba(225,238,255,.55)'; ctx.lineWidth = 1.5; ctx.stroke();
  rr(ctx, cX + 3, cY + 3, cw - 6, ch - 6, R * 0.8); ctx.strokeStyle = 'rgba(225,238,255,.12)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.save(); rr(ctx, cX, cY, cw, ch, R); ctx.clip();
  const gl = ctx.createLinearGradient(cX, cY, cX + cw * 0.6, cY + ch);
  gl.addColorStop(0, 'rgba(255,255,255,.16)'); gl.addColorStop(.22, 'rgba(255,255,255,.05)'); gl.addColorStop(.23, 'rgba(255,255,255,0)');
  ctx.fillStyle = gl; ctx.fillRect(cX, cY, cw, ch);
  ctx.restore();
}

// ── REEL style: machined aluminium shell, big windows, mini open reels with cut-out flanges ──
function drawOpenReel(ctx, cx, cy, rFlange, rPack, rMinPack, ang, tint) {
  // tape pack behind the flange
  const g = ctx.createRadialGradient(cx, cy, rMinPack, cx, cy, rPack);
  g.addColorStop(0, '#4a3222'); g.addColorStop(.8, '#352318'); g.addColorStop(1, '#6e5038');
  ctx.beginPath(); ctx.arc(cx, cy, rPack, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = 'rgba(255,215,170,.07)'; ctx.lineWidth = 1;
  for (let q = rMinPack + 2; q < rPack; q += 2.2) { ctx.beginPath(); ctx.arc(cx, cy, q, 0, Math.PI * 2); ctx.stroke(); }

  ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang);
  // flange: metal disc with three trapezoid windows (even-odd fill leaves them open)
  ctx.beginPath();
  ctx.arc(0, 0, rFlange, 0, Math.PI * 2);
  for (let k = 0; k < 3; k++) {
    const a0 = k * 2 * Math.PI / 3 + 0.32, a1 = a0 + 1.12;
    const ri = rFlange * 0.42, ro = rFlange * 0.86;
    ctx.moveTo(Math.cos(a0) * ri, Math.sin(a0) * ri);
    ctx.arc(0, 0, ri, a0, a1);
    ctx.lineTo(Math.cos(a1) * ro, Math.sin(a1) * ro);
    ctx.arc(0, 0, ro, a1, a0, true);
    ctx.closePath();
  }
  const mg = ctx.createLinearGradient(-rFlange, -rFlange, rFlange, rFlange);
  if (tint === 'gold') { mg.addColorStop(0, '#f6e3a6'); mg.addColorStop(.45, '#c9a24e'); mg.addColorStop(.55, '#e7c97c'); mg.addColorStop(1, '#8e6a2a'); }
  else { mg.addColorStop(0, '#f4f6f8'); mg.addColorStop(.45, '#b9bec6'); mg.addColorStop(.55, '#e3e6ea'); mg.addColorStop(1, '#7f858e'); }
  ctx.fillStyle = mg; ctx.fill('evenodd');
  ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1; ctx.stroke();
  // engraved legend on the flange
  ctx.fillStyle = 'rgba(40,30,15,.55)'; ctx.font = `bold ${Math.max(6, Math.round(rFlange * 0.11))}px Arial, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.save(); ctx.rotate(-0.15); ctx.fillText('DECK 90', 0, -rFlange * 0.93 + rFlange * 0.06); ctx.restore();
  // hub: machined silver ring with teeth
  const hr = rFlange * 0.34;
  const hg = ctx.createRadialGradient(-hr * .3, -hr * .3, 0, 0, 0, hr);
  hg.addColorStop(0, '#ffffff'); hg.addColorStop(1, '#8d939b');
  ctx.beginPath(); ctx.arc(0, 0, hr, 0, Math.PI * 2); ctx.arc(0, 0, hr * 0.55, 0, Math.PI * 2, true); ctx.fillStyle = hg; ctx.fill('evenodd');
  ctx.fillStyle = '#c9cdd3';
  for (let k = 0; k < 6; k++) { ctx.save(); ctx.rotate(k * Math.PI / 3); ctx.fillRect(-hr * 0.08, -hr * 0.58, hr * 0.16, hr * 0.16); ctx.restore(); }
  ctx.restore();
}

// part: 'under', 'live' or 'front', as the clear one
function drawReelCassette(ctx, cX, cY, cw, ch, st, title, side, part) {
  const R = cw * 0.025;
  const wins = [[0.0875, 0.11, 0.40, 0.64], [0.5125, 0.11, 0.40, 0.64]];   // windows centred on the reels, thin bridge between
  const reelY = cY + ch * 0.43, reelL = cX + cw * 0.2875, reelR = cX + cw * 0.7125;
  const rFl = Math.min(cw * 0.185, ch * 0.30);
  const rMinPack = rFl * 0.38, rMaxPack = rFl * 0.97;
  const f = Math.max(0, Math.min(1, st.pos / SIDE_SECONDS));
  const rLeft = Math.sqrt(rMinPack * rMinPack + (1 - f) * (rMaxPack * rMaxPack - rMinPack * rMinPack));   // paying out
  const rRight = Math.sqrt(rMinPack * rMinPack + f * (rMaxPack * rMaxPack - rMinPack * rMinPack));        // winding up

  if (!part || part === 'under') {
    // shadow
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.75)'; ctx.shadowBlur = ch * 0.12; ctx.shadowOffsetY = ch * 0.05;
    rr(ctx, cX, cY, cw, ch, R); ctx.fillStyle = '#9ca1a8'; ctx.fill(); ctx.restore();
    // aluminium body with the two windows cut out (even-odd)
    ctx.save();
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(cX, cY, cw, ch, R); else ctx.rect(cX, cY, cw, ch);
    wins.forEach(([x, y, w, h]) => { if (ctx.roundRect) ctx.roundRect(cX + cw * x, cY + ch * y, cw * w, ch * h, cw * 0.012); else ctx.rect(cX + cw * x, cY + ch * y, cw * w, ch * h); });
    const al = ctx.createLinearGradient(cX, cY, cX, cY + ch);
    al.addColorStop(0, '#eef0f2'); al.addColorStop(.18, '#c9cdd2'); al.addColorStop(.55, '#b3b8bf'); al.addColorStop(1, '#d6d9dd');
    ctx.fillStyle = al; ctx.fill('evenodd');
    // brushed grain
    ctx.clip('evenodd');
    for (let xx = cX; xx < cX + cw; xx += 2) { ctx.fillStyle = `rgba(255,255,255,${(Math.sin(xx * 7.31) * 0.5 + 0.5) * 0.06})`; ctx.fillRect(xx, cY, 1, ch); }
    ctx.restore();

    // what's behind the windows: the dark deck well
    wins.forEach(([x, y, w, h]) => {
      ctx.save();
      rr(ctx, cX + cw * x, cY + ch * y, cw * w, ch * h, cw * 0.012); ctx.clip();
      const bg = ctx.createLinearGradient(0, cY + ch * y, 0, cY + ch * (y + h));
      bg.addColorStop(0, '#15171b'); bg.addColorStop(1, '#0a0b0d');
      ctx.fillStyle = bg; ctx.fillRect(cX + cw * x, cY + ch * y, cw * w, ch * h);
      ctx.restore();
    });
  }
  if (!part || part === 'live') {
    // tape running under the reels to the bottom guides
    const gy = cY + ch * 0.83;
    ctx.save();                                   // the tape is only visible through the windows
    ctx.beginPath();
    wins.forEach(([x, y, w, h]) => ctx.rect(cX + cw * x, cY + ch * y, cw * w, ch * h));
    ctx.clip();
    ctx.strokeStyle = '#3f2b1c'; ctx.lineWidth = Math.max(1.6, ch * 0.01);
    ctx.beginPath(); ctx.moveTo(reelL - rLeft * 0.96, reelY + rLeft * 0.28); ctx.lineTo(cX + cw * 0.1, gy);
    ctx.lineTo(cX + cw * 0.9, gy); ctx.lineTo(reelR + rRight * 0.96, reelY + rRight * 0.28); ctx.stroke();
    ctx.restore();

    // the reels (gold on side A, silver on side B)
    drawOpenReel(ctx, reelL, reelY, rFl, rLeft, rMinPack, st.ang[0], side === 'A' ? 'gold' : 'silver');
    drawOpenReel(ctx, reelR, reelY, rFl, rRight, rMinPack, st.ang[1], side === 'A' ? 'gold' : 'silver');
  }
  if (part && part !== 'front') return;

  // window bevels
  wins.forEach(([x, y, w, h]) => {
    rr(ctx, cX + cw * x, cY + ch * y, cw * w, ch * h, cw * 0.012);
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1.2; ctx.stroke();
    rr(ctx, cX + cw * x + 1.5, cY + ch * y + 1.5, cw * w - 3, ch * h - 3, cw * 0.01);
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1; ctx.stroke();
  });

  // engraved top band: side + title
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  ctx.font = `bold ${Math.round(ch * 0.05)}px Arial, sans-serif`; ctx.fillStyle = 'rgba(60,64,70,.85)';
  { let t = side + '  ·  ' + title; const room = cw * 0.66;
    while (t.length > 6 && ctx.measureText(t).width > room) t = t.slice(0, -2);
    if (t !== side + '  ·  ' + title) t += '…';
    ctx.fillText(t, cX + cw * 0.06, cY + ch * 0.055); }
  ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(60,64,70,.55)';
  ctx.fillText('SO-90 REEL', cX + cw * 0.94, cY + ch * 0.055);

  // bottom block: guide holes, capstan holes, pad window
  const by = cY + ch * 0.78;
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(cX + cw * 0.04, by, cw * 0.92, 1);
  ctx.fillStyle = '#1a1c20';
  [0.12, 0.88].forEach(px => { ctx.beginPath(); ctx.arc(cX + cw * px, cY + ch * 0.88, ch * 0.03, 0, Math.PI * 2); ctx.fill(); });
  [0.33, 0.67].forEach(px => { rr(ctx, cX + cw * px - cw * 0.025, cY + ch * 0.86, cw * 0.05, ch * 0.05, 2); ctx.fill(); });
  rr(ctx, cX + cw * 0.44, cY + ch * 0.87, cw * 0.12, ch * 0.06, 2); ctx.fill();
  ctx.fillStyle = '#b08d57'; ctx.fillRect(cX + cw * 0.46, cY + ch * 0.885, cw * 0.08, ch * 0.012);

  // black screws, like the machined original
  [[.03, .05], [.97, .05], [.5, .2], [.5, .66], [.03, .95], [.97, .95], [.22, .9], [.78, .9]].forEach(([px, py]) => {
    const sx = cX + cw * px, sy = cY + ch * py, sr = ch * 0.024;
    ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fillStyle = '#1b1c1f'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.strokeStyle = 'rgba(120,120,120,.6)';
    ctx.beginPath(); ctx.moveTo(sx - sr * .5, sy); ctx.lineTo(sx + sr * .5, sy); ctx.moveTo(sx, sy - sr * .5); ctx.lineTo(sx, sy + sr * .5); ctx.stroke();
  });
  // outer edge highlight
  rr(ctx, cX, cY, cw, ch, R); ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.2; ctx.stroke();
}

function drawBigTape(canvas, ctx, live) {
  const W = canvas.offsetWidth || canvas.width, H = canvas.offsetHeight || canvas.height;
  if (W < 60 || H < 40) return;                 // panel collapsed mid-resize
  tapeHits = [];
  const play = live && running && npPlaying();
  if (play) {
    const T = dtMs / 1000;
    bigTape.pos += T; if (bigTape.pos > SIDE_SECONDS) bigTape.pos = 60;
    turnReels(bigTape, T);
    bigTape.counter = np && np.status === 'Playing' ? npPosition() : bigTape.counter + T;
  }
  // the CD-90, with the metal frames (CLÁSICO or a portrait panel: the REEL cassette instead)
  if (tapeStyle === 'CD' && typeof chassis !== 'undefined' && chassis !== 'CLASSIC' && typeof cd90Ready === 'function' && cd90Ready() && W / H >= 1.4) {
    drawCD90(ctx, W, H, play); return;
  }
  // the SO-90 REEL built from the mock-up, with the metal frames (not in a portrait panel: that keeps the drawn one)
  if ((tapeStyle === 'REEL' || tapeStyle === 'CD') && typeof chassis !== 'undefined' && chassis !== 'CLASSIC' && typeof tape90Ready === 'function' && tape90Ready() && W / H >= 1.4) {
    drawBigTape90(ctx, W, H, play); return;
  }
  const wide = W / H >= 1.9;
  let cw, ch, cX, cY, iX, iY, iW, iH;
  if (wide) {
    ch = H * 0.82; cw = ch / 0.638;
    if (cw > W * 0.62) { cw = W * 0.62; ch = cw * 0.638; }
    cX = W * 0.04; cY = (H - ch) / 2;
    iX = cX + cw + W * 0.035; iW = W - iX - W * 0.03; iY = cY + ch * 0.08; iH = ch * 0.84;
  } else {
    cw = Math.min(W * 0.86, (H * 0.66) / 0.638); ch = cw * 0.638;
    cX = (W - cw) / 2; cY = H * 0.05;
    iX = W * 0.07; iW = W * 0.86; iY = cY + ch + H * 0.04; iH = H - iY - H * 0.03;
  }
  const cassette = tapeStyle !== 'CLEAR' ? drawReelCassette : drawClearCassette, title = decks[0].title;
  const FL = '#7ff6e6', FLdim = 'rgba(127,246,230,.07)';
  const dispH = iH * 0.55;
  const keys = ['◀◀', '▶', '■', '▶▶', '❚❚'];
  const kY = iY + dispH + iH * 0.1, kH = Math.min(iH * 0.28, 46), kG = iW * 0.02, kW = (iW - kG * (keys.length - 1)) / keys.length;
  const now = performance.now(), pressedKey = keys.find(k => now - (deckPressed[k] || 0) < 180) || '';

  // ── still: the stage, the cassette's shell under its moving parts, the display's window and the keys
  blit(ctx, still('tape-back:' + canvas.id, W, H, [tapeStyle, play, running, pressedKey].join('|'), x => {
    // stage: dark felt with a warm spotlight
    x.fillStyle = '#07080b'; x.fillRect(0, 0, W, H);
    const spot = x.createRadialGradient(W * 0.4, -H * 0.1, H * 0.05, W * 0.4, H * 0.45, Math.max(W, H) * 0.8);
    spot.addColorStop(0, play ? 'rgba(255,214,150,.16)' : 'rgba(255,214,150,.08)'); spot.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = spot; x.fillRect(0, 0, W, H);
    cassette(x, cX, cY, cw, ch, bigTape, title, 'A', 'under');
    rr(x, iX, iY, iW, dispH, 6); x.fillStyle = '#040707'; x.fill(); x.strokeStyle = 'rgba(255,255,255,.08)'; x.stroke();
    // keys (lit like the deck's)
    keys.forEach((k, i) => {
      const lit = (k === '▶' && play) || (k === '■' && !running), pressed = k === pressedKey;
      metalKey(x, iX + i * (kW + kG), kY + (pressed ? 1 : 0), kW, kH, k, lit || pressed, k === '▶' ? '#7dffb4' : '#ffb35a');
    });
  }));
  // what moves in the cassette, then its still front (label, screws, glass) over it
  cassette(ctx, cX, cY, cw, ch, bigTape, title, 'A', 'live');
  stamp(ctx, 'tape-front:' + canvas.id, tapeStyle + '|' + title, cX - 3, cY - 3, cw + 6, ch + 6, x => cassette(x, cX, cY, cw, ch, bigTape, title, 'A', 'front'));
  keys.forEach((k, i) => tapeHits.push({ x: iX + i * (kW + kG), y: kY, w: kW, h: kH, k }));

  // ── info: FL time, scrolling title, meters
  const secs = Math.floor(bigTape.counter);
  const dg = String(Math.floor(secs / 60) % 100).padStart(2, '0') + String(secs % 60).padStart(2, '0');
  const dH = Math.min(dispH * 0.42, iW * 0.13), dW = dH * 0.52, dGap = dW * 0.3;
  const dX0 = iX + iW * 0.05, dY0 = iY + dispH * 0.1;
  for (let k = 0; k < 4; k++) draw7(ctx, dX0 + k * (dW + dGap), dY0, dW, dH, dg[k], FL, FLdim);
  { const cx = dX0 + 2 * (dW + dGap) - dGap / 2, r = Math.max(1.4, dW * 0.08);
    ctx.fillStyle = FL; ctx.shadowColor = FL; ctx.shadowBlur = 6;
    [0.33, 0.7].forEach(fy => { ctx.beginPath(); ctx.arc(cx, dY0 + dH * fy, r, 0, Math.PI * 2); ctx.fill(); }); ctx.shadowBlur = 0; }
  ctx.font = `600 ${Math.max(8, Math.round(dH * 0.26))}px "Deck90 Display", "Arial Narrow", Arial, sans-serif`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = play ? '#9dffc8' : '#ffd27a'; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 6;
  ctx.fillText(play ? 'PLAY ▶' : (running ? 'PAUSE ❚❚' : 'STOP ■'), dX0 + 4 * (dW + dGap) + iW * 0.03, dY0 + dH * 0.3);
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(127,246,230,.55)';
  ctx.fillText(tapeStyle === 'CLEAR' ? 'CLEAR · TYPE II' : 'REEL · TYPE II', dX0 + 4 * (dW + dGap) + iW * 0.03, dY0 + dH * 0.75);
  // scrolling title (marquee) when it doesn't fit
  const tStr = np ? ((np.artist ? np.artist + ' — ' : '') + (np.title || '')) : 'DECK 90';
  ctx.save();
  ctx.beginPath(); ctx.rect(iX + iW * 0.05, iY + dispH * 0.62, iW * 0.9, dispH * 0.2); ctx.clip();
  ctx.font = `600 ${Math.max(9, Math.round(dispH * 0.15))}px "Deck90 Display", "Arial Narrow", Arial, sans-serif`; ctx.fillStyle = FL; ctx.shadowColor = FL; ctx.shadowBlur = 5;
  const tw = ctx.measureText(tStr).width, room = iW * 0.9;
  const off = tw > room ? ((performance.now() / 40) % (tw + 60)) : 0;
  ctx.fillText(tStr, iX + iW * 0.05 - off, iY + dispH * 0.72);
  if (tw > room) ctx.fillText(tStr, iX + iW * 0.05 - off + tw + 60, iY + dispH * 0.72);
  ctx.restore();
  // meters (each lit segment's glow a stamped sprite)
  const segs = 30, mX = iX + iW * 0.08, mW = iW * 0.86, sH = Math.max(3, dispH * 0.05), gap = 1.5, sW = (mW - gap * (segs - 1)) / segs;
  [vu.L.lvl, vu.R.lvl].forEach((lv, row) => {
    const yy = iY + dispH * 0.84 + row * (sH + 3);
    for (let k = 0; k < segs; k++) {
      const db = -40 + k * 48 / (segs - 1), on = lv >= db, col = db >= 3 ? '#ff6a4d' : FL;
      if (on) glowCell(ctx, mX + k * (sW + gap), yy, sW, sH, 0, col, 4);
      else { ctx.fillStyle = FLdim; ctx.fillRect(mX + k * (sW + gap), yy, sW, sH); }
    }
  });
}
function tapeKeyAt(ev){
  const r = cTP.getBoundingClientRect(), x = ev.clientX - r.left, y = ev.clientY - r.top;
  return tapeHits.find(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
}

function drawDeck(canvas, ctx, live) {
  const W = canvas.offsetWidth || canvas.width, H = canvas.offsetHeight || canvas.height;
  if (W < 60 || H < 40) return;                 // panel collapsed mid-resize
  deckHits = [];
  const n = deckDouble ? 2 : 1;
  const play = live && running && npPlaying();
  const levels = [vu.L.lvl, vu.R.lvl];
  // the DECK 90 faceplate with the metal frames (once its pieces are loaded), the drawn one with CLÁSICO
  const premium = typeof chassis !== 'undefined' && chassis !== 'CLASSIC' && deck90Ready();
  // each deck fills its half: as tall as the panel allows, and as wide as its half (the display and keys
  // stretch); only a very wide half leaves some room at the sides, and a narrow one keeps it 2.4 : 1
  const box = i => {
    const slotW = W / n, pad = Math.min(8, slotW * 0.015), padY = Math.min(6, H * 0.03), minA = premium ? 2.7 : 2.4;
    let dw = slotW - pad * 2, dh = H - padY * 2;
    if (dw / dh > 7.2) dw = dh * 7.2; else if (dw / dh < minA) dh = dw / minA;
    return [i * slotW + (slotW - dw) / 2, (H - dh) / 2, dw, dh];
  };
  if (premium) {                                 // what doesn't move, for both decks: one still layer
    const now = performance.now(), pressed = ['◀◀', '▶', '■', '▶▶', '❚❚', '●'].filter(k => now - (deckPressed[k] || 0) < 180).join(',');
    const prev = typeof trackHistory !== 'undefined' && trackHistory[0] ? trackHistory[0].title + '|' + trackHistory[0].artist : '';
    const key = [n, play, pressed, np && np.title ? np.title + '|' + np.artist : '', prev, decks[0].title, decks[1].title].join('|');
    blit(ctx, still('deck90:' + canvas.id, W, H, key, x => {
      x.fillStyle = '#07080c'; x.fillRect(0, 0, W, H);
      for (let i = 0; i < n; i++) { const [dx, dy, dw, dh] = box(i); drawDeck90(x, dx, dy, dw, dh, decks[i], levels, play, 'still'); }
    }));
  } else {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#07080c'; ctx.fillRect(0, 0, W, H);
  }
  for (let i = 0; i < n; i++) {
    const d = decks[i];
    if (play) {
      const T = dtMs / 1000;
      d.pos += T; if (d.pos > SIDE_SECONDS) d.pos = 60;          // auto reverse
      d.counter += T * 0.9;
      if (i === 0 && np) {                                    // deck A shows the track's elapsed time
        if (np.status === 'Playing') d.counter = npPosition();
        else d.counter += T - T * 0.9;                        // reported paused but audible: keep time ourselves (1 s/s)
      }
      turnReels(d, T);                                             // as a real cassette: see reelRadii
    }
    const [dx, dy, dw, dh] = box(i);
    if (premium) drawDeck90(ctx, dx, dy, dw, dh, d, levels, play, 'live');
    else drawCassetteDeck(ctx, dx, dy, dw, dh, d, levels, play);
  }
}
