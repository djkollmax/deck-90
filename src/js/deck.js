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
// How a cassette turns. Side A plays left → right past the heads: the left reel pays the tape out (its pack
// shrinks), the right one winds it up (grows), and seen from the front both turn counterclockwise. The tape
// runs at a constant 4.76 cm/s, so each reel turns at that speed over its pack's radius: about 0.7 turns a
// second on a bare hub (1.1 cm), 0.3 on a full C90 pack (2.5 cm). Radii relative to a full pack.
const REEL_HUB = 0.44, REEL_V = 1.9;                       // hub / full pack; rad/s at a full pack
function reelRadii(pos) {                                    // [left (paying out), right (winding up)], relative
  const f = Math.max(0, Math.min(1, pos / SIDE_SECONDS)), h2 = REEL_HUB * REEL_HUB;
  return [Math.sqrt(h2 + (1 - f) * (1 - h2)), Math.sqrt(h2 + f * (1 - h2))];
}
function turnReels(st, T) {                                  // both counterclockwise, each at its own speed
  const [rl, rr2] = reelRadii(st.pos);
  st.ang[0] -= REEL_V / rl * T;
  st.ang[1] -= REEL_V / rr2 * T;
}
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
// A fluorescent 7-segment digit: upright, each segment a long hexagon whose pointed ends meet its
// neighbours at the corners, with a hair of dark between them.
function draw7(ctx, x, y, w, h, ch, on, off) {
  const t = Math.max(1.4, w * 0.19), g = Math.max(0.6, t * 0.16), m = t / 2;
  const L = x + m, R = x + w - m, T = y + m, M = y + h / 2, B = y + h - m;
  const hor = (x0, x1, cy) => [[x0 + g, cy], [x0 + g + m, cy - m], [x1 - g - m, cy - m], [x1 - g, cy], [x1 - g - m, cy + m], [x0 + g + m, cy + m]];
  const ver = (cx, y0, y1) => [[cx, y0 + g], [cx + m, y0 + g + m], [cx + m, y1 - g - m], [cx, y1 - g], [cx - m, y1 - g - m], [cx - m, y0 + g + m]];
  const seg = { a: hor(L, R, T), g: hor(L, R, M), d: hor(L, R, B), f: ver(L, T, M), b: ver(R, T, M), e: ver(L, M, B), c: ver(R, M, B) };
  for (const k of 'abcdefg') {
    const lit = (SEG7[ch] || '').includes(k);
    ctx.fillStyle = lit ? on : off;
    if (lit) { ctx.shadowColor = on; ctx.shadowBlur = t * 1.8; }
    ctx.beginPath(); seg[k].forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
  }
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
  // Across: the cassette well (left) and the knobs (right) follow the deck's height; the display and the
  // transport keys take whatever width is left, so a wide deck fills its panel instead of staying small.
  const mx = Math.max(W * 0.012, H * 0.07), gap = H * 0.05;
  const kr = Math.min(W * 0.035, H * 0.1), kSp = Math.max(kr * 2.6, legend * 4.4);   // knobs: size, and spacing so their labels never touch
  const wW = Math.min(W * 0.4, H * 1.12), rW = kSp + kr * 1.9 + gap * 0.4;
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
  ctx.fillText('DECK 90', X + mx, tY);
  ctx.shadowBlur = 0;
  ctx.font = `${legend}px Arial, sans-serif`; ctx.textAlign = 'right'; ctx.fillStyle = goldDim;
  ctx.fillText('SO-1' + d.side + '  ·  3-HEAD CASSETTE DECK  ·  DUAL CAPSTAN' + (W > H * 4 ? '  ·  DOLBY B·C NR  ·  HX PRO' : ''), X + W - mx, tY);
  ctx.fillStyle = 'rgba(217,189,115,.18)'; ctx.fillRect(X + mx, Y + H * 0.15, W - mx * 2, 1);

  // ── cassette well (lit), left
  const wX = X + mx, wY = Y + H * 0.2, wH = H * 0.72;
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
  const rLeft = Math.sqrt(rMin * rMin + (1 - f) * (rMax * rMax - rMin * rMin));   // paying out
  const rRight = Math.sqrt(rMin * rMin + f * (rMax * rMax - rMin * rMin));        // winding up

  // tape packs seen through the clear shell (warm, with a sheen ring)
  [[reelL, rLeft], [reelR, rRight]].forEach(([x, r]) => {
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
  ctx.moveTo(reelL - rLeft * 0.2, reelY + rLeft * 0.98); ctx.lineTo(cX + cw * 0.12, pathY);
  ctx.lineTo(cX + cw * 0.88, pathY); ctx.lineTo(reelR + rRight * 0.2, reelY + rRight * 0.98); ctx.stroke();

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
  const fX = wX + wW + gap * 1.4, fY = Y + H * 0.2, fH = H * 0.4, fW = X + W - mx - rW - gap - fX;
  rr(ctx, fX - 3, fY - 3, fW + 6, fH + 6, 5); ctx.fillStyle = '#050607'; ctx.fill();
  rr(ctx, fX, fY, fW, fH, 4);
  const glass = ctx.createLinearGradient(0, fY, 0, fY + fH);
  glass.addColorStop(0, '#081314'); glass.addColorStop(1, '#030707');
  ctx.fillStyle = glass; ctx.fill();
  deckDisplay(ctx, fX, fY, fW, fH, d, levels, running, H);
  // glass sheen
  rr(ctx, fX, fY, fW, fH, 4);
  const sh2 = ctx.createLinearGradient(0, fY, 0, fY + fH);
  sh2.addColorStop(0, 'rgba(255,255,255,.06)'); sh2.addColorStop(.4, 'rgba(255,255,255,0)');
  ctx.fillStyle = sh2; ctx.fill();

  // ── transport keys under the display
  const keys = ['◀◀', '▶', '■', '▶▶', '❚❚', '●'];
  const kY = Y + H * 0.66, kH = H * 0.13, kG = Math.max(W * 0.006, H * 0.025);
  const kW = Math.min((fW - kG * (keys.length - 1)) / keys.length, H * 0.5);
  const kX0 = fX + (fW - (kW * keys.length + kG * (keys.length - 1))) / 2;
  keys.forEach((k, i) => {
    const lit = (k === '▶' && running) || (k === '■' && !running);
    const pressedRecently = deckHits.length >= 0 && performance.now() - (deckPressed[k] || 0) < 180;
    metalKey(ctx, kX0 + i * (kW + kG), kY + (pressedRecently ? 1 : 0), kW, kH, k, lit || pressedRecently, k === '▶' ? '#7dffb4' : k === '●' ? '#ff5a3d' : '#ffb35a');
    deckHits.push({ x: kX0 + i * (kW + kG), y: kY, w: kW, h: kH, k });
  });
  ctx.font = `${legend}px Arial, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillStyle = goldDim;
  ['REW', 'PLAY', 'STOP', 'FF', 'PAUSE', 'REC'].forEach((t, i) => ctx.fillText(t, kX0 + i * (kW + kG) + kW / 2, kY + kH + 3));

  // ── right: knobs, power, phones
  const kx = X + W - mx - kSp - kr * 0.9;
  knob(ctx, kx, Y + H * 0.33, kr, -Math.PI * 0.5 + (levels[0] + 40) / 48 * 0.6, 'REC LEVEL', legend);
  knob(ctx, kx + kSp, Y + H * 0.33, kr * 0.8, -Math.PI * 0.5, 'BIAS', legend);
  // power switch + LED
  const pX = kx - kr, pY = Y + H * 0.7;
  rr(ctx, pX, pY, kr * 1.5, H * 0.1, 3); ctx.fillStyle = '#0d0e10'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.1)'; ctx.stroke();
  metalKey(ctx, pX + 2, pY + 2, kr * 1.5 - 4, H * 0.1 - 4, '', false, gold);
  ctx.beginPath(); ctx.arc(pX + kr * 1.9, pY + H * 0.05, Math.max(2, H * 0.012), 0, Math.PI * 2);
  ctx.fillStyle = '#ff6b3d'; ctx.shadowColor = '#ff6b3d'; ctx.shadowBlur = 8; ctx.fill(); ctx.shadowBlur = 0;
  ctx.fillStyle = goldDim; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText('POWER', pX, pY + H * 0.12);
  // phones jack
  const jX = kx + kSp, jY = pY + H * 0.05;
  ctx.beginPath(); ctx.arc(jX, jY, kr * 0.45, 0, Math.PI * 2); ctx.fillStyle = '#9a9ea7'; ctx.fill();
  ctx.beginPath(); ctx.arc(jX, jY, kr * 0.22, 0, Math.PI * 2); ctx.fillStyle = '#050505'; ctx.fill();
  ctx.fillStyle = goldDim; ctx.textAlign = 'center'; ctx.fillText('PHONES', jX, pY + H * 0.12);
  ctx.textBaseline = 'alphabetic';
}

// What the deck's FL display shows: the counter (deck A: the song's time), the indicators and the L/R peak
// meters; on a wide display also the remaining time. Shared by both deck designs.
function deckDisplay(ctx, fX, fY, fW, fH, d, levels, running, H) {
  const FL = '#7ff6e6', GHOST = 'rgba(127,246,230,.035)', UNLIT = 'rgba(127,246,230,.13)', DIM = 'rgba(64,200,190,.85)';
  const wide = fW > fH * 5 && fH >= 40;                    // room for the remaining time and more indicators
  const roomy = fH >= 50;                                  // tall enough for three indicator lines
  const compact = fH < 60;                                 // a low display: digits, PLAY/METAL and the meters only
  const glow = Math.max(4, fH * 0.03);
  // condensed bold lettering, as printed on the FL glass
  const face = px => `bold ${Math.max(6, Math.round(px))}px "Bahnschrift SemiBold Condensed", "Bahnschrift", "Arial Narrow", "Roboto Condensed", Arial, sans-serif`;
  // the counter: deck A shows the song's m:ss, deck B its tape counter
  const timeMode = d.side === 'A' && !!np;
  const secs = Math.floor(d.counter);
  const dg = timeMode ? (String(Math.floor(secs / 60) % 100).padStart(2, '0') + String(secs % 60).padStart(2, '0'))
                      : String(secs % 10000).padStart(4, '0');
  const dH = fH * (compact ? 0.46 : 0.37), dW = dH * 0.52, dGap = dW * 0.24;
  const dX0 = fX + fW * 0.045, dY0 = fY + fH * (compact ? 0.07 : 0.12);
  for (let k = 0; k < 4; k++) draw7(ctx, dX0 + k * (dW + dGap), dY0, dW, dH, dg[k], FL, GHOST);
  const colon = (cx, top, h, wd) => {                     // two small square dots
    const q = Math.max(1.6, wd * 0.13);
    ctx.fillStyle = FL; ctx.shadowColor = FL; ctx.shadowBlur = glow;
    [0.36, 0.66].forEach(fy => ctx.fillRect(cx - q / 2, top + h * fy - q / 2, q, q));
    ctx.shadowBlur = 0;
  };
  if (timeMode) colon(dX0 + 2 * (dW + dGap) - dGap / 2, dY0, dH, dW);
  // indicators
  ctx.font = face(fH * (compact ? 0.14 : 0.1)); ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  const ind = (txt, x, y, on, col) => {
    ctx.fillStyle = on ? (col || FL) : 'rgba(127,246,230,.22)';
    if (on) { ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = glow; }
    ctx.fillText(txt, x, y); ctx.shadowBlur = 0;
  };
  const iX = dX0 + 4 * (dW + dGap) + fW * 0.03;
  const showPause = d.side === 'A' && np && np.status !== 'Playing' && !running;
  ind(showPause ? 'PAUSE ❚❚' : 'PLAY ▶', iX, fY + fH * (compact ? 0.17 : roomy ? 0.16 : 0.18), running || showPause, showPause ? '#ffd27a' : FL);
  if (roomy && !compact) ind('REC ●', iX, fY + fH * 0.275, false);
  ind('METAL', iX, fY + fH * (compact ? 0.42 : roomy ? 0.385 : 0.40), true);
  const rowY = fY + fH * 0.555;
  if (!compact) ind('TYPE I  II  IV', fX + fW * 0.045, rowY, true, DIM);
  if (!wide) { if (!compact) ind('NR OFF', fX + fW * 0.62, rowY, true, DIM); }
  else {
    // a wide display: the song's (or the side's) remaining time at the right, and the deck's other indicators
    const remain = d.side === 'A' && np && np.dur > 0 ? Math.max(0, np.dur - d.counter) : Math.max(0, SIDE_SECONDS - d.pos);
    const rs = Math.floor(remain), rg = String(Math.floor(rs / 60) % 100).padStart(2, '0') + String(rs % 60).padStart(2, '0');
    const rH = dH * 0.78, rWd = rH * 0.52, rGap = rWd * 0.24, rX = fX + fW * 0.965 - (4 * rWd + 3 * rGap), rY = dY0 + (dH - rH);
    for (let k = 0; k < 4; k++) draw7(ctx, rX + k * (rWd + rGap), rY, rWd, rH, rg[k], FL, GHOST);
    colon(rX + 2 * (rWd + rGap) - rGap / 2, rY, rH, rWd);
    ind('REMAIN', rX - fH * 0.06 - ctx.measureText('REMAIN').width, rY + rH * 0.5, true, DIM);
    if (!compact) {
      const cX2 = iX + (rX - iX) * 0.45;
      ind('DOLBY B', cX2, fY + fH * 0.16, running);
      ind('HX PRO', cX2, fY + fH * 0.275, running);
      ind('⇄ AUTO REV', cX2, fY + fH * 0.385, true);
      ind('NR B   C   OFF', fX + fW * 0.32, rowY, true, DIM);
      ind('MPX FILTER', fX + fW * 0.62, rowY, false);
    }
  }
  // L/R peak meters: thick segments with a dark gap, the unlit ones still faintly there
  const mX = fX + fW * 0.089, mW = fW * 0.866, sH = fH * (compact ? 0.11 : 0.068);
  const segs = wide ? Math.max(24, Math.min(48, Math.round(mW / (fH * 0.11)))) : 24;
  const pitch = mW / segs, sGap = Math.max(1, pitch * 0.13), sW = pitch - sGap, rad = Math.min(sH * 0.14, 3);
  const dbAt = k => -40 + k * (48 / (segs - 1));
  ['L', 'R'].forEach((chn, row) => {
    const yy = fY + fH * (compact ? (row ? 0.80 : 0.64) : (row ? 0.735 : 0.637));
    ctx.font = face(fH * (compact ? 0.12 : 0.085)); ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(127,246,230,.9)';
    ctx.fillText(chn, mX - fW * 0.018, yy + sH / 2);
    for (let k = 0; k < segs; k++) {
      const db = dbAt(k), on = levels[row] >= db;
      const col = db >= 3 ? '#ff6a4d' : FL;
      ctx.fillStyle = on ? col : UNLIT;
      if (on) { ctx.shadowColor = col; ctx.shadowBlur = glow; }
      rr(ctx, mX + k * pitch, yy, sW, sH, rad); ctx.fill();
      ctx.shadowBlur = 0;
    }
  });
  if (compact) return;                                     // no room for the dB scale
  ctx.font = face(fH * 0.06); ctx.textAlign = 'center'; ctx.fillStyle = DIM;
  [-40, -20, -10, -6, -3, 0, 3, 8].forEach(db => {
    const k = (db + 40) / 48 * (segs - 1);
    ctx.fillText(db > 0 ? '+' + db : String(db), mX + k * pitch + sW / 2, fY + fH * 0.865);
  });
}
