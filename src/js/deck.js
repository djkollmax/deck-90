'use strict';
// ═══════════════════════════════════════════════════════════
//  CASSETTE DECK (single or double), reels turning while audio runs
// ═══════════════════════════════════════════════════════════
// Tape physics: a C-90 side is 45 min. The feeding reel shrinks, the take-up reel grows, and each
// turns at (tape speed / its own radius), so the small reel spins visibly faster, like the real thing.
const decks = [
  { pos: 790,  ang: [0, 0], side: 'A', title: 'SPOTLESS MIX · VOL 1', stripe: '#d9bd73', counter: 412 },
  { pos: 1710, ang: [0, 0], side: 'B', title: 'LATE NIGHT DUB',       stripe: '#79d9ff', counter: 1187 },
];
const SIDE_SECONDS = 2700;
// rounded rect that never throws: tiny or negative sizes (a panel caught mid-resize) are clamped
function rr(ctx, x, y, w, h, r){
  w = Math.max(0, w || 0); h = Math.max(0, h || 0);
  r = Math.max(0, Math.min(r || 0, w / 2, h / 2));
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h);
}

function drawReel(ctx, cx, cy, rHub, ang) {
  // hub: white ring with six drive teeth, turning
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(ang);
  ctx.beginPath(); ctx.arc(0, 0, rHub, 0, Math.PI * 2);
  ctx.fillStyle = '#e9e6dc'; ctx.fill();
  ctx.beginPath(); ctx.arc(0, 0, rHub * 0.62, 0, Math.PI * 2);
  ctx.fillStyle = '#16171a'; ctx.fill();
  ctx.fillStyle = '#e9e6dc';
  for (let k = 0; k < 6; k++) {
    ctx.rotate(Math.PI / 3);
    ctx.fillRect(-rHub * 0.11, -rHub * 0.64, rHub * 0.22, rHub * 0.26);
  }
  ctx.restore();
}

// ── high-end deck parts ──────────────────────────────────────
const SEG7 = { 0:'abcdef', 1:'bc', 2:'abged', 3:'abgcd', 4:'fgbc', 5:'afgcd', 6:'afgedc', 7:'abc', 8:'abcdefg', 9:'abcfgd' };
function draw7(ctx, x, y, w, h, ch, on, off) {
  const t = Math.max(1.2, w * 0.17), g = t * 0.25;
  const seg = {
    a: [x + t / 2 + g, y, w - t - 2 * g, t], d: [x + t / 2 + g, y + h - t, w - t - 2 * g, t], g: [x + t / 2 + g, y + h / 2 - t / 2, w - t - 2 * g, t],
    f: [x, y + t / 2 + g, t, h / 2 - t - g], b: [x + w - t, y + t / 2 + g, t, h / 2 - t - g],
    e: [x, y + h / 2 + t / 2, t, h / 2 - t - g], c: [x + w - t, y + h / 2 + t / 2, t, h / 2 - t - g],
  };
  ctx.save(); ctx.transform(1, 0, -0.08, 1, (y + h) * 0.08, 0);
  for (const k of 'abcdefg') {
    const lit = (SEG7[ch] || '').includes(k);
    ctx.fillStyle = lit ? on : off;
    if (lit) { ctx.shadowColor = on; ctx.shadowBlur = t * 2.2; }
    const [sx, sy, sw, sh] = seg[k]; ctx.fillRect(sx, sy, sw, sh);
    ctx.shadowBlur = 0;
  }
  ctx.restore();
}
function brushed(ctx, x, y, w, h, base) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, base[0]); g.addColorStop(.5, base[1]); g.addColorStop(1, base[2]);
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  for (let xx = x; xx < x + w; xx += 2) {               // fine horizontal brushing
    ctx.fillStyle = `rgba(255,255,255,${(Math.sin(xx * 12.9898) * 43758.5453 % 1 + 1) % 1 * 0.025})`;
    ctx.fillRect(xx, y, 1, h);
  }
  ctx.restore();
}
function metalKey(ctx, x, y, w, h, sym, lit, litCol) {
  rr(ctx, x, y, w, h, Math.min(4, h * 0.18));
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#5d6069'); g.addColorStop(.08, '#41444c'); g.addColorStop(.92, '#24262b'); g.addColorStop(1, '#16171a');
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.8)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.10)'; ctx.fillRect(x + 2, y + 1, w - 4, 1);
  ctx.font = `${Math.round(h * 0.40)}px "Segoe UI Symbol", Arial, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = lit ? litCol : 'rgba(220,214,196,.72)';
  if (lit) { ctx.shadowColor = litCol; ctx.shadowBlur = h * 0.5; }
  ctx.fillText(sym, x + w / 2, y + h * 0.53);
  ctx.shadowBlur = 0;
  if (lit) { ctx.fillStyle = litCol; ctx.fillRect(x + w * 0.3, y + h - 3, w * 0.4, 1.5); }
}
function knob(ctx, cx, cy, r, ang, label, legendPx) {
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, r * 1.12, 0, Math.PI * 2); ctx.fillStyle = '#0a0b0d'; ctx.fill();
  const g = ctx.createRadialGradient(cx - r * .3, cy - r * .35, r * .1, cx, cy, r);
  g.addColorStop(0, '#8a8d95'); g.addColorStop(.55, '#4a4d55'); g.addColorStop(1, '#232429');
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = Math.max(1, r * 0.05);
  for (let k = 0; k < 40; k++) {                                 // knurling
    const a = k / 40 * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r * .86, cy + Math.sin(a) * r * .86); ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); ctx.stroke();
  }
  const cap = ctx.createRadialGradient(cx - r * .2, cy - r * .25, 0, cx, cy, r * .7);
  cap.addColorStop(0, '#b9bcc4'); cap.addColorStop(1, '#5c5f67');
  ctx.beginPath(); ctx.arc(cx, cy, r * .68, 0, Math.PI * 2); ctx.fillStyle = cap; ctx.fill();
  ctx.strokeStyle = '#d9bd73'; ctx.lineWidth = Math.max(1.2, r * .08);
  ctx.beginPath(); ctx.moveTo(cx + Math.cos(ang) * r * .2, cy + Math.sin(ang) * r * .2); ctx.lineTo(cx + Math.cos(ang) * r * .62, cy + Math.sin(ang) * r * .62); ctx.stroke();
  ctx.fillStyle = 'rgba(217,189,115,.75)'; ctx.font = `${legendPx}px Arial, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillText(label, cx, cy + r * 1.25);
  ctx.restore();
}

function drawCassetteDeck(ctx, X, Y, W, H, d, levels, running) {
  const legend = Math.max(6, Math.round(H * 0.042));
  const gold = '#d9bd73', goldDim = 'rgba(217,189,115,.6)';
  const FL = '#7ff6e6', FLdim = 'rgba(127,246,230,.07)';

  // ── chassis: black anodized faceplate, bevelled edges, side cheeks
  ctx.save();
  rr(ctx, X, Y, W, H, 5); ctx.clip();
  brushed(ctx, X, Y, W, H, ['#2b2e34', '#1b1d22', '#121317']);
  ctx.restore();
  rr(ctx, X, Y, W, H, 5); ctx.strokeStyle = 'rgba(255,255,255,.10)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fillRect(X + 4, Y + 1, W - 8, 1);
  ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(X + 4, Y + H - 2, W - 8, 2);

  // ── top legend strip
  const tY = Y + H * 0.085;
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.round(H * 0.06)}px "Courier New", monospace`; ctx.textAlign = 'left'; ctx.fillStyle = gold;
  ctx.shadowColor = 'rgba(217,189,115,.35)'; ctx.shadowBlur = 6;
  ctx.fillText('DECK 90', X + W * 0.03, tY);
  ctx.shadowBlur = 0;
  ctx.font = `${legend}px Arial, sans-serif`; ctx.textAlign = 'right'; ctx.fillStyle = goldDim;
  ctx.fillText('SO-1' + d.side + '  ·  3-HEAD CASSETTE DECK  ·  DUAL CAPSTAN', X + W * 0.97, tY);
  ctx.fillStyle = 'rgba(217,189,115,.18)'; ctx.fillRect(X + W * 0.03, Y + H * 0.15, W * 0.94, 1);

  // ── cassette well (lit), left
  const wX = X + W * 0.03, wY = Y + H * 0.2, wW = W * 0.4, wH = H * 0.72;
  rr(ctx, wX - 3, wY - 3, wW + 6, wH + 6, 6); ctx.fillStyle = '#060607'; ctx.fill();
  rr(ctx, wX, wY, wW, wH, 5);
  const well = ctx.createRadialGradient(wX + wW / 2, wY - wH * 0.1, wH * 0.05, wX + wW / 2, wY + wH * 0.4, wH * 1.1);
  well.addColorStop(0, running ? '#6d5a3c' : '#3a3328'); well.addColorStop(.45, running ? '#2b241b' : '#1b1814'); well.addColorStop(1, '#0b0a09');
  ctx.fillStyle = well; ctx.fill();

  let cw = wW * 0.86, ch = cw * 0.638;
  if (ch > wH * 0.8) { ch = wH * 0.8; cw = ch / 0.638; }
  const cX = wX + (wW - cw) / 2, cY = wY + wH * 0.06;
  const reelY = cY + ch * 0.47, reelL = cX + cw * 0.2875, reelR = cX + cw * 0.7125;
  const rHub = ch * 0.08, rMin = rHub * 1.35, rMax = cw * 0.205;
  const f = Math.max(0, Math.min(1, d.pos / SIDE_SECONDS));
  const rTake = Math.sqrt(rMin * rMin + f * (rMax * rMax - rMin * rMin));
  const rFeed = Math.sqrt(rMin * rMin + (1 - f) * (rMax * rMax - rMin * rMin));

  // tape packs seen through the clear shell (warm, with a sheen ring)
  [[reelL, rTake], [reelR, rFeed]].forEach(([x, r]) => {
    const g = ctx.createRadialGradient(x, reelY, rMin * .9, x, reelY, r);
    g.addColorStop(0, '#5a3f28'); g.addColorStop(.6, '#3d2a1b'); g.addColorStop(.97, '#2a1c12'); g.addColorStop(1, '#6b5038');
    ctx.beginPath(); ctx.arc(x, reelY, r, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(255,220,170,.08)'; ctx.lineWidth = 1;
    for (let rr2 = rMin + 3; rr2 < r; rr2 += 3) { ctx.beginPath(); ctx.arc(x, reelY, rr2, 0, Math.PI * 2); ctx.stroke(); }
  });
  // tape path along the bottom: left pack → guide → heads → capstan → guide → right pack
  const pathY = cY + ch * 0.9;
  ctx.strokeStyle = '#3b2819'; ctx.lineWidth = Math.max(1.5, ch * 0.012);
  ctx.beginPath();
  ctx.moveTo(reelL - rTake * 0.2, reelY + rTake * 0.98); ctx.lineTo(cX + cw * 0.12, pathY);
  ctx.lineTo(cX + cw * 0.88, pathY); ctx.lineTo(reelR + rFeed * 0.2, reelY + rFeed * 0.98); ctx.stroke();

  // clear smoked shell on top
  rr(ctx, cX, cY, cw, ch, cw * 0.03);
  ctx.fillStyle = 'rgba(40,44,52,.38)'; ctx.fill();
  ctx.strokeStyle = 'rgba(210,225,255,.30)'; ctx.lineWidth = 1.2; ctx.stroke();
  // partial label band on top (premium tapes)
  const lX = cX + cw * 0.06, lY = cY + ch * 0.06, lW = cw * 0.88, lH = ch * 0.17;
  rr(ctx, lX, lY, lW, lH, 2);
  const lab = ctx.createLinearGradient(lX, 0, lX + lW, 0);
  lab.addColorStop(0, '#16181d'); lab.addColorStop(1, '#2a2d35');
  ctx.fillStyle = lab; ctx.fill();
  ctx.fillStyle = d.stripe; ctx.fillRect(lX, lY + lH - 2, lW, 2);
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  ctx.font = `bold ${Math.round(lH * 0.62)}px Georgia, serif`; ctx.fillStyle = '#e8e2d2';
  ctx.fillText(d.side, lX + lW * 0.03, lY + lH * 0.5);
  ctx.font = `italic ${Math.round(lH * 0.42)}px "Segoe Print", "Comic Sans MS", cursive`; ctx.fillStyle = '#e8d9a8';
  ctx.fillText(d.title, lX + lW * 0.12, lY + lH * 0.52);
  ctx.font = `bold ${Math.round(lH * 0.30)}px Arial, sans-serif`; ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(232,226,210,.55)';
  ctx.fillText('METAL 90', cX + cw * 0.94, cY + ch * 0.30);
  // hubs + their clear rings
  [[reelL, d.ang[0]], [reelR, d.ang[1]]].forEach(([x, a]) => {
    ctx.beginPath(); ctx.arc(x, reelY, rHub * 1.45, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(210,225,255,.25)'; ctx.lineWidth = 1; ctx.stroke();
    drawReel(ctx, x, reelY, rHub, a);
  });
  // screws
  ctx.fillStyle = 'rgba(200,205,215,.55)';
  [[.035, .06], [.965, .06], [.5, .06], [.035, .94], [.965, .94]].forEach(([px, py]) => { ctx.beginPath(); ctx.arc(cX + cw * px, cY + ch * py, ch * 0.018, 0, Math.PI * 2); ctx.fill(); });
  // deck mechanics under the shell opening: heads, capstans, pinch rollers
  const mY = cY + ch + (wY + wH - cY - ch) * 0.35;
  const head = ctx.createLinearGradient(0, mY - ch * 0.08, 0, mY + ch * 0.06);
  head.addColorStop(0, '#e6e8ec'); head.addColorStop(1, '#6e737c');
  ctx.fillStyle = head;
  [[0.4, 0.08], [0.5, 0.09], [0.6, 0.08]].forEach(([px, hw]) => ctx.fillRect(cX + cw * (px - hw / 2), mY - ch * 0.08, cw * hw, ch * 0.13));
  [[0.22, 0.78]].forEach(([a, b]) => [a, b].forEach(px => {
    ctx.beginPath(); ctx.arc(cX + cw * px, mY - ch * 0.03, ch * 0.022, 0, Math.PI * 2); ctx.fillStyle = '#c9ccd3'; ctx.fill();
    ctx.beginPath(); ctx.arc(cX + cw * (px + (px < .5 ? .05 : -.05)), mY - ch * 0.03, ch * 0.045, 0, Math.PI * 2); ctx.fillStyle = '#161618'; ctx.fill();
  }));
  // door glass + reflection
  rr(ctx, wX, wY, wW, wH, 5);
  const refl = ctx.createLinearGradient(wX, wY, wX + wW * 0.8, wY + wH);
  refl.addColorStop(0, 'rgba(255,255,255,.14)'); refl.addColorStop(.28, 'rgba(255,255,255,.03)'); refl.addColorStop(.29, 'rgba(255,255,255,0)');
  ctx.fillStyle = refl; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 1; ctx.stroke();

  // ── FL display, centre
  const fX = X + W * 0.46, fY = Y + H * 0.2, fW = W * 0.33, fH = H * 0.4;
  rr(ctx, fX - 3, fY - 3, fW + 6, fH + 6, 5); ctx.fillStyle = '#050607'; ctx.fill();
  rr(ctx, fX, fY, fW, fH, 4);
  const glass = ctx.createLinearGradient(0, fY, 0, fY + fH);
  glass.addColorStop(0, '#081314'); glass.addColorStop(1, '#030707');
  ctx.fillStyle = glass; ctx.fill();
  // counter, 4 digits
  const timeMode = d.side === 'A' && !!np;
  const secs = Math.floor(d.counter);
  const dg = timeMode ? (String(Math.floor(secs / 60) % 100).padStart(2, '0') + String(secs % 60).padStart(2, '0'))
                      : String(secs % 10000).padStart(4, '0');
  const dH = fH * 0.42, dW = dH * 0.52, dGap = dW * 0.28;
  const dX0 = fX + fW * 0.05, dY0 = fY + fH * 0.1;
  for (let k = 0; k < 4; k++) draw7(ctx, dX0 + k * (dW + dGap), dY0, dW, dH, dg[k], FL, FLdim);
  if (timeMode) {                                         // m:ss colon
    const cx = dX0 + 2 * (dW + dGap) - dGap / 2, r = Math.max(1.2, dW * 0.08);
    ctx.fillStyle = FL; ctx.shadowColor = FL; ctx.shadowBlur = 6;
    [0.33, 0.7].forEach(fy => { ctx.beginPath(); ctx.arc(cx, dY0 + dH * fy, r, 0, Math.PI * 2); ctx.fill(); });
    ctx.shadowBlur = 0;
  }
  // indicators
  ctx.font = `bold ${Math.max(6, Math.round(fH * 0.09))}px Arial, sans-serif`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  const ind = (txt, x, y, on, col) => { ctx.fillStyle = on ? (col || FL) : 'rgba(127,246,230,.10)'; if (on) { ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 6; } ctx.fillText(txt, x, y); ctx.shadowBlur = 0; };
  const iX = dX0 + 4 * (dW + dGap) + fW * 0.02;
  const showPause = d.side === 'A' && np && np.status !== 'Playing' && !running;
  ind(showPause ? 'PAUSE ❚❚' : 'PLAY ▶', iX, fY + fH * 0.15, running || showPause, showPause ? '#ffd27a' : '#9dffc8');
  ind('REC ●', iX, fY + fH * 0.28, false);
  ind('METAL', iX, fY + fH * 0.41, true);
  ind('TYPE I  II  IV', fX + fW * 0.05, fY + fH * 0.62, true, 'rgba(127,246,230,.55)');
  ind('NR OFF', fX + fW * 0.62, fY + fH * 0.62, true, 'rgba(127,246,230,.55)');
  // peak meters with dB scale
  const segs = 24, mX = fX + fW * 0.1, mW = fW * 0.86, sH = fH * 0.07, sGap = 1.5, sW = (mW - sGap * (segs - 1)) / segs;
  const dbAt = k => -40 + k * (48 / (segs - 1));
  ['L', 'R'].forEach((chn, row) => {
    const yy = fY + fH * 0.72 + row * (sH + 3);
    ctx.fillStyle = 'rgba(127,246,230,.55)'; ctx.font = `${Math.max(6, Math.round(sH * 1.2))}px Arial`; ctx.textAlign = 'right';
    ctx.fillText(chn, mX - 4, yy + sH / 2);
    for (let k = 0; k < segs; k++) {
      const db = dbAt(k), on = levels[row] >= db;
      const col = db >= 3 ? '#ff6a4d' : FL;
      ctx.fillStyle = on ? col : FLdim;
      if (on) { ctx.shadowColor = col; ctx.shadowBlur = 5; }
      ctx.fillRect(mX + k * (sW + sGap), yy, sW, sH);
      ctx.shadowBlur = 0;
    }
  });
  ctx.font = `${Math.max(5, Math.round(fH * 0.06))}px Arial`; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(127,246,230,.35)';
  [-40, -20, -10, -6, -3, 0, 3, 8].forEach(db => {
    const k = (db + 40) / 48 * (segs - 1);
    ctx.fillText(db > 0 ? '+' + db : String(db), mX + k * (sW + sGap) + sW / 2, fY + fH * 0.95);
  });
  // glass sheen
  rr(ctx, fX, fY, fW, fH, 4);
  const sh2 = ctx.createLinearGradient(0, fY, 0, fY + fH);
  sh2.addColorStop(0, 'rgba(255,255,255,.06)'); sh2.addColorStop(.4, 'rgba(255,255,255,0)');
  ctx.fillStyle = sh2; ctx.fill();

  // ── transport keys under the display
  const keys = ['◀◀', '▶', '■', '▶▶', '❚❚', '●'];
  const kY = Y + H * 0.66, kH = H * 0.13, kG = W * 0.006, kW = (fW - kG * (keys.length - 1)) / keys.length;
  keys.forEach((k, i) => {
    const lit = (k === '▶' && running) || (k === '■' && !running);
    const pressedRecently = deckHits.length >= 0 && performance.now() - (deckPressed[k] || 0) < 180;
    metalKey(ctx, fX + i * (kW + kG), kY + (pressedRecently ? 1 : 0), kW, kH, k, lit || pressedRecently, k === '▶' ? '#7dffb4' : k === '●' ? '#ff5a3d' : '#ffb35a');
    deckHits.push({ x: fX + i * (kW + kG), y: kY, w: kW, h: kH, k });
  });
  ctx.font = `${legend}px Arial, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillStyle = goldDim;
  ['REW', 'PLAY', 'STOP', 'FF', 'PAUSE', 'REC'].forEach((t, i) => ctx.fillText(t, fX + i * (kW + kG) + kW / 2, kY + kH + 3));

  // ── right: knobs, power, phones
  const kx = X + W * 0.86, kr = Math.min(W * 0.035, H * 0.1);
  knob(ctx, kx, Y + H * 0.33, kr, -Math.PI * 0.5 + (levels[0] + 40) / 48 * 0.6, 'REC LEVEL', legend);
  knob(ctx, kx + kr * 2.6, Y + H * 0.33, kr * 0.8, -Math.PI * 0.5, 'BIAS', legend);
  // power switch + LED
  const pX = kx - kr, pY = Y + H * 0.7;
  rr(ctx, pX, pY, kr * 1.5, H * 0.1, 3); ctx.fillStyle = '#0d0e10'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.1)'; ctx.stroke();
  metalKey(ctx, pX + 2, pY + 2, kr * 1.5 - 4, H * 0.1 - 4, '', false, gold);
  ctx.beginPath(); ctx.arc(pX + kr * 1.9, pY + H * 0.05, Math.max(2, H * 0.012), 0, Math.PI * 2);
  ctx.fillStyle = '#ff6b3d'; ctx.shadowColor = '#ff6b3d'; ctx.shadowBlur = 8; ctx.fill(); ctx.shadowBlur = 0;
  ctx.fillStyle = goldDim; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText('POWER', pX, pY + H * 0.12);
  // phones jack
  const jX = kx + kr * 2.6, jY = pY + H * 0.05;
  ctx.beginPath(); ctx.arc(jX, jY, kr * 0.45, 0, Math.PI * 2); ctx.fillStyle = '#9a9ea7'; ctx.fill();
  ctx.beginPath(); ctx.arc(jX, jY, kr * 0.22, 0, Math.PI * 2); ctx.fillStyle = '#050505'; ctx.fill();
  ctx.fillStyle = goldDim; ctx.textAlign = 'center'; ctx.fillText('PHONES', jX, pY + H * 0.12);
  ctx.textBaseline = 'alphabetic';
}
