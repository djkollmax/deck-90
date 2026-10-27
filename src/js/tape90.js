'use strict';
// ═══════════════════════════════════════════════════════════
//  THE BIG TAPE, SO-90 REEL (metal frames, REEL cassette)
//  Built from pieces of the panel's mock-up (img/tape/): the brushed-aluminium cassette with two windows,
//  gold open reels that turn about their true centres with the brown tape packs changing behind their
//  cut-outs, the FL display behind its chrome bezel, and five dark transport keys. The cassette follows
//  the panel's height; the display and the keys take the width that's left.
//  Measurements are the mock-up's pixels (it is 725 px tall), scaled by H / 725.
// ═══════════════════════════════════════════════════════════
const T90 = {}, T90_FILES = { shell: 'shell.jpg', shellMask: 'shell-mask.png', reel: 'reel.png', display: 'display.jpg', key: 'key.png' };
let t90Loaded = 0;
const T90_N = Object.keys(T90_FILES).length;
for (const [k, f] of Object.entries(T90_FILES)) {
  const im = new Image();
  im.onload = () => { if (++t90Loaded === T90_N && typeof running !== 'undefined' && !running && typeof drawIdle === 'function') drawIdle(); };
  im.src = 'img/tape/' + f;
  T90[k] = im;
}
const tape90Ready = () => t90Loaded === T90_N && typeof deck90Ready === 'function' && deck90Ready();
// the cassette with its own outline: the photo (JPEG) and its shape (a grey mask) put together once
let t90Shell = null;
function tapeShell() {
  if (t90Shell) return t90Shell;
  const c = document.createElement('canvas'); c.width = T90.shell.width; c.height = T90.shell.height;
  const x = c.getContext('2d');
  x.drawImage(T90.shellMask, 0, 0, c.width, c.height);
  const m = x.getImageData(0, 0, c.width, c.height);                 // grey → alpha
  for (let i = 0; i < m.data.length; i += 4) { m.data[i + 3] = m.data[i]; }
  x.putImageData(m, 0, 0);
  x.globalCompositeOperation = 'source-in'; x.drawImage(T90.shell, 0, 0);
  return (t90Shell = c);
}
const t90Patterns = new WeakMap();

function drawBigTape90(ctx, W, H, play) {
  // by the height, or by the width in a tall panel (then centred vertically)
  const s = Math.min(H / 725, W / 1600), P = v => v * s, oy = (H - 725 * s) / 2;
  ctx.save();
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  // ── the black brushed plate
  let pat = t90Patterns.get(ctx);
  if (!pat) { pat = ctx.createPattern(D90.plate, 'repeat'); t90Patterns.set(ctx, pat); }
  if (pat.setTransform) pat.setTransform(new DOMMatrix().scaleSelf(Math.max(0.35, s * 1.3)));
  ctx.fillStyle = pat; ctx.fillRect(0, 0, W, H);
  const shade = ctx.createLinearGradient(0, 0, 0, H);
  shade.addColorStop(0, 'rgba(255,255,255,.04)'); shade.addColorStop(1, 'rgba(0,0,0,.25)');
  ctx.fillStyle = shade; ctx.fillRect(0, 0, W, H);
  ctx.translate(0, oy);

  // ── the SO-90 REEL cassette: the photo as it is (aluminium, clear windows and the parts behind them);
  // over each reel, the one that turns. Q() takes the photo's pixels (it is 934 px tall) to the canvas.
  const sX = P(52), sY = P(102), sH = P(566), sW = sH * 1525 / 934, Q = v => P(v * 566 / 934);
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.65)'; ctx.shadowBlur = P(18); ctx.shadowOffsetY = P(6);
  ctx.drawImage(tapeShell(), sX, sY, sW, sH); ctx.restore();
  const [rl, rr2] = reelRadii(bigTape.pos), PACK = 230;          // a full pack, in the photo's pixels
  [[443.5, 432.5, rl, bigTape.ang[0], false], [1066.5, 429.5, rr2, bigTape.ang[1], true]].forEach(([cx, cy, rel, ang, brand]) => {
    const x = sX + Q(cx), y = sY + Q(cy), R = Q(rel * PACK);
    // what's behind the reel: the dark of the case, and the tape pack as it is now
    const back = ctx.createRadialGradient(x, y, Q(90), x, y, Q(269));
    back.addColorStop(0, '#191310'); back.addColorStop(1, '#080605');
    ctx.beginPath(); ctx.arc(x, y, Q(269), 0, Math.PI * 2); ctx.fillStyle = back; ctx.fill();
    const g = ctx.createRadialGradient(x, y, Q(95), x, y, R);
    g.addColorStop(0, '#2a1a10'); g.addColorStop(0.7, '#42291a'); g.addColorStop(1, '#5e3f28');
    ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(255,215,175,.06)'; ctx.lineWidth = Math.max(0.5, Q(1.5));
    for (let q = Q(100); q < R - Q(4); q += Q(8)) { ctx.beginPath(); ctx.arc(x, y, q, 0, Math.PI * 2); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(x, y, R - Q(1.5), 0, Math.PI * 2); ctx.strokeStyle = 'rgba(160,118,82,.65)'; ctx.lineWidth = Math.max(0.8, Q(4)); ctx.stroke();
    // the reel: gold flange and white hub, one piece turning about its true centre
    const D = Q(540);
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.drawImage(T90.reel, -D / 2, -D / 2, D, D);
    if (brand && Q(34) >= 6) {                           // DECK 90 along the right reel's rim, as printed on it
      ctx.font = `bold ${Math.round(Q(34))}px Georgia, "Times New Roman", serif`; ctx.fillStyle = 'rgba(58,40,16,.88)';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const rad = Q(226), txt = 'DECK 90';
      let total = 0; for (const ch of txt) total += ctx.measureText(ch).width * 1.08 / rad;
      let a0 = -1.95 - total / 2;
      for (const ch of txt) { const cw = ctx.measureText(ch).width * 1.08 / rad; ctx.save(); ctx.rotate(a0 + cw / 2); ctx.fillText(ch, 0, -rad); ctx.restore(); a0 += cw; }
    }
    ctx.restore();
    // the light on it stays put; the clear window's glare over the top left
    const light = ctx.createLinearGradient(x - Q(266), y - Q(266), x + Q(266), y + Q(266));
    light.addColorStop(0, 'rgba(255,248,230,.10)'); light.addColorStop(.5, 'rgba(255,255,255,0)'); light.addColorStop(1, 'rgba(0,0,0,.10)');
    ctx.beginPath(); ctx.arc(x, y, Q(267), 0, Math.PI * 2); ctx.fillStyle = light; ctx.fill();
    const glare = ctx.createLinearGradient(x - Q(300), y - Q(300), x, y);
    glare.addColorStop(0, 'rgba(255,255,255,.16)'); glare.addColorStop(.32, 'rgba(255,255,255,.03)'); glare.addColorStop(.33, 'rgba(255,255,255,0)');
    ctx.fillStyle = glare; ctx.fill();
  });
  // the label: side, the song, the tape's name
  const song = np && np.title ? (np.artist ? np.artist + ' – ' : '') + np.title : 'DECK 90';
  if (Q(46) >= 6) {
    ctx.textBaseline = 'middle';
    ctx.font = `500 ${Math.round(Q(44))}px "Segoe UI", "Helvetica Neue", Arial, sans-serif`; ctx.textAlign = 'right'; ctx.fillStyle = '#2b2b2e';
    ctx.fillText('SO-90 REEL', sX + Q(1387), sY + Q(86));
    const room = Q(1387 - 137) - ctx.measureText('SO-90 REEL').width - Q(50);
    ctx.font = `500 ${Math.round(Q(46))}px "Segoe UI", "Helvetica Neue", Arial, sans-serif`; ctx.textAlign = 'left';
    let t = 'A  ·  ' + song;
    if (ctx.measureText(t).width > room) { while (t.length > 6 && ctx.measureText(t + '…').width > room) t = t.slice(0, -1); t = t.trimEnd() + '…'; }
    ctx.fillText(t, sX + Q(137), sY + Q(86));
  }

  // ── the display, from the cassette to the right edge
  const dX = sX + sW + P(42), dY = P(120), dH = P(342), dW = Math.max(P(400), W - P(53) - dX);
  const Dm = T90.display, b = 30, bs = P(b), Dw = Dm.width, Dh = Dm.height;
  const nine = (sx, sy, sw, sh, x, y, w, h) => { if (w > 0 && h > 0) ctx.drawImage(Dm, sx, sy, sw, sh, x, y, w, h); };
  nine(0, 0, b, b, dX, dY, bs, bs); nine(Dw - b, 0, b, b, dX + dW - bs, dY, bs, bs);
  nine(0, Dh - b, b, b, dX, dY + dH - bs, bs, bs); nine(Dw - b, Dh - b, b, b, dX + dW - bs, dY + dH - bs, bs, bs);
  nine(b, 0, Dw - 2 * b, b, dX + bs, dY, dW - 2 * bs, bs); nine(b, Dh - b, Dw - 2 * b, b, dX + bs, dY + dH - bs, dW - 2 * bs, bs);
  nine(0, b, b, Dh - 2 * b, dX, dY + bs, bs, dH - 2 * bs); nine(Dw - b, b, b, Dh - 2 * b, dX + dW - bs, dY + bs, bs, dH - 2 * bs);
  nine(b, b, Dw - 2 * b, Dh - 2 * b, dX + bs, dY + bs, dW - 2 * bs, dH - 2 * bs);
  const gX = dX + P(22), gY = dY + P(22), gW = dW - P(44), gH = dH - P(44);
  ctx.save(); rr(ctx, gX, gY, gW, gH, P(6)); ctx.clip();
  tapeDisplay(ctx, gX, gY, gW, gH, play, song);
  ctx.restore();

  // ── five transport keys under the display
  const keys = ['◀◀', '▶', '■', '▶▶', '❚❚'];
  const kY = P(512), kH = P(136), kGap = P(18);
  const kW = Math.min((dW - P(8) - kGap * (keys.length - 1)) / keys.length, P(380));
  const kRow = kW * keys.length + kGap * (keys.length - 1), kX0 = dX + (dW - kRow) / 2;
  rr(ctx, kX0 - P(8), kY - P(8), kRow + P(16), kH + P(16), P(8)); ctx.fillStyle = 'rgba(0,0,0,.75)'; ctx.fill();
  keys.forEach((k, i) => {
    const x = kX0 + i * (kW + kGap);
    const lit = (k === '▶' && play) || (k === '■' && !running);
    const pressed = performance.now() - (deckPressed[k] || 0) < 180;
    const y = kY + (pressed ? P(3) : 0);
    ctx.drawImage(T90.key, x, y, kW, kH);
    if (pressed) { ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(x, y, kW, kH); }
    const green = '#4dff8a', amber = '#ffb35a';
    ctx.font = `bold ${Math.max(8, Math.round(P(46)))}px Arial, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (lit) { ctx.fillStyle = k === '▶' ? green : amber; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = P(16); }
    else ctx.fillStyle = '#a3a5a8';
    ctx.fillText(k, x + kW / 2, y + kH * 0.47);
    ctx.shadowBlur = 0;
    if (lit && k === '▶') {                              // the lit bar under PLAY
      ctx.fillStyle = green; ctx.shadowColor = green; ctx.shadowBlur = P(12);
      rr(ctx, x + kW * 0.28, y + kH * 0.8, kW * 0.44, Math.max(2, P(7)), P(3)); ctx.fill(); ctx.shadowBlur = 0;
    }
    tapeHits.push({ x, y: kY + oy, w: kW, h: kH, k });
  });
  ctx.restore();
}

// The SO-90's display: the song's time, PLAY / PAUSE / STOP, the tape, the song in dot-matrix letters (it scrolls
// when long) and L/R level meters with yellow (−6 dB) and red (0 dB) zones.
function tapeDisplay(ctx, gX, gY, gW, gH, play, song) {
  const FL = '#5ff3ea', GHOST = 'rgba(95,243,234,.04)', DIM = 'rgba(95,243,234,.62)', glow = Math.max(4, gH * 0.03);
  const secs = Math.floor(bigTape.counter);
  const dg = String(Math.floor(secs / 60) % 100).padStart(2, '0') + String(secs % 60).padStart(2, '0');
  const dH = gH * 0.38, dW = dH * 0.52, dGap = dW * 0.24, dX0 = gX + Math.min(gW * 0.06, gH * 0.25), dY0 = gY + gH * 0.12;
  for (let k = 0; k < 4; k++) draw7(ctx, dX0 + k * (dW + dGap), dY0, dW, dH, dg[k], FL, GHOST);
  { const q = Math.max(1.6, dW * 0.13), cx = dX0 + 2 * (dW + dGap) - dGap / 2;
    ctx.fillStyle = FL; ctx.shadowColor = FL; ctx.shadowBlur = glow;
    [0.36, 0.66].forEach(fy => ctx.fillRect(cx - q / 2, dY0 + dH * fy - q / 2, q, q)); ctx.shadowBlur = 0; }
  const iX = dX0 + 4 * (dW + dGap) + gH * 0.12;
  const face = px => `600 ${Math.max(6, Math.round(px * 1.08))}px "Deck90 Display", "Bahnschrift", "Segoe UI", Arial, sans-serif`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  // the indicators take the room right of the digits: smaller when the display is narrow
  ctx.font = face(gH * 0.085);
  const room = gX + gW - iX - gH * 0.06, need = ctx.measureText('REEL - TYPE II').width;
  if (need > room) ctx.font = face(gH * 0.085 * Math.max(0.45, room / need));
  const state = play ? 'PLAY ▶' : (running ? 'PAUSE ❚❚' : 'STOP ■');
  ctx.fillStyle = play ? FL : '#ffd27a'; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = glow;
  ctx.fillText(state, iX, gY + gH * 0.23); ctx.shadowBlur = 0;
  ctx.fillStyle = DIM; ctx.fillText('REEL - TYPE II', iX, gY + gH * 0.41);
  // the song in dot-matrix letters; scrolls with a pause when it doesn't fit
  const tX = dX0, tW = gX + gW - gH * 0.12 - tX, tY = gY + gH * 0.655, px = gH * 0.105;
  ctx.font = `${Math.max(9, Math.round(px * 1.3))}px "Deck90 Dots", "Lucida Console", "Consolas", monospace`;
  const tw = ctx.measureText(song).width;
  ctx.save(); ctx.beginPath(); ctx.rect(tX, tY - px, tW, px * 2); ctx.clip();
  ctx.fillStyle = FL; ctx.shadowColor = FL; ctx.shadowBlur = glow;
  if (tw <= tW) ctx.fillText(song, tX, tY);
  else {
    const gap = px * 4, loop = tw + gap, speed = px * 2.4, pause = 2, cycle = loop / speed + pause;
    const ph = (performance.now() / 1000) % cycle, off = ph < pause ? 0 : (ph - pause) * speed;
    ctx.fillText(song, tX - off, tY); ctx.fillText(song, tX - off + loop, tY);
  }
  ctx.restore(); ctx.shadowBlur = 0;
  // L/R meters with their zones
  const segs = 24, mX = dX0, mW = gX + gW - gH * 0.12 - mX, pitch = mW / segs, sGap = Math.max(1, pitch * 0.14), sW = pitch - sGap, sH = gH * 0.07;
  const zone = db => db >= -0.05 ? 2 : db >= -6.7 ? 1 : 0;
  const LIT = [FL, '#ffd24a', '#ff4f3a'], OFF = ['rgba(95,243,234,.12)', 'rgba(255,210,74,.14)', 'rgba(255,79,58,.16)'];
  [vu.L.lvl, vu.R.lvl].forEach((lv, row) => {
    const yy = gY + gH * (row ? 0.86 : 0.77);
    for (let k = 0; k < segs; k++) {
      const db = -40 + k * 48 / (segs - 1), z = zone(db), on = lv >= db;
      ctx.fillStyle = on ? LIT[z] : OFF[z];
      if (on) { ctx.shadowColor = LIT[z]; ctx.shadowBlur = glow; }
      rr(ctx, mX + k * pitch, yy, sW, sH, Math.min(sH * 0.15, 3)); ctx.fill(); ctx.shadowBlur = 0;
    }
  });
}
