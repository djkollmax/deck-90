'use strict';
// ═══════════════════════════════════════════════════════════
//  THE BIG TAPE, SO-90 REEL (metal frames, REEL cassette)
//  Built from pieces of the panel's mock-up (img/tape/): the brushed-aluminium cassette with two windows,
//  gold open reels that turn about their true centres with the brown tape packs changing behind their
//  cut-outs, the FL display behind its chrome bezel, and five dark transport keys. The cassette follows
//  the panel's height; the display and the keys take the width that's left.
//  Measurements are the mock-up's pixels (it is 725 px tall), scaled by H / 725.
// ═══════════════════════════════════════════════════════════
const T90 = {}, T90_FILES = { shell: 'shell.jpg', reel: 'reel.png', display: 'display.jpg', key: 'key.png' };
let t90Loaded = 0;
const T90_N = Object.keys(T90_FILES).length;
for (const [k, f] of Object.entries(T90_FILES)) {
  const im = new Image();
  im.onload = () => { if (++t90Loaded === T90_N && typeof running !== 'undefined' && !running && typeof drawIdle === 'function') drawIdle(); };
  im.src = 'img/tape/' + f;
  T90[k] = im;
}
const tape90Ready = () => t90Loaded === T90_N && typeof deck90Ready === 'function' && deck90Ready();
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

  // ── the SO-90 REEL cassette
  const sX = P(52), sY = P(102), sW = P(896), sH = P(566);
  ctx.save(); rr(ctx, sX, sY, sW, sH, P(20)); ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = P(18); ctx.shadowOffsetY = P(6);
  ctx.fillStyle = '#000'; ctx.fill(); ctx.restore();
  ctx.save(); rr(ctx, sX, sY, sW, sH, P(20)); ctx.clip(); ctx.drawImage(T90.shell, sX, sY, sW, sH); ctx.restore();
  // its windows: what's behind the glass is drawn fresh — tape packs, the strands to the guides, the turning reels
  const [rl, rr2] = reelRadii(bigTape.pos), PACK = 150;
  const wins = [[79, 72, 334, 347, 250.5, 251.25, rl, bigTape.ang[0], false], [464, 72, 349, 347, 630.25, 249.25, rr2, bigTape.ang[1], true]];
  wins.forEach(([wx, wy, ww, wh, cx, cy, rel, ang, brand]) => {
    const x0 = sX + P(wx), y0 = sY + P(wy), w = P(ww), h = P(wh), x = sX + P(cx), y = sY + P(cy), R = P(rel * PACK);
    ctx.save(); rr(ctx, x0, y0, w, h, P(6)); ctx.clip();
    const bg = ctx.createRadialGradient(x, y, P(20), x, y, P(240));
    bg.addColorStop(0, '#1d1814'); bg.addColorStop(1, '#060504');
    ctx.fillStyle = bg; ctx.fillRect(x0, y0, w, h);
    // the tape pack (seen through the reel's cut-outs) and the strand leaving it towards the bottom guide
    const g = ctx.createRadialGradient(x, y, P(56), x, y, R);
    g.addColorStop(0, '#24160e'); g.addColorStop(0.7, '#3b281b'); g.addColorStop(1, '#5a3f2a');
    ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(255,220,180,.05)'; ctx.lineWidth = Math.max(0.5, P(1));
    for (let q = P(60); q < R - P(3); q += P(5)) { ctx.beginPath(); ctx.arc(x, y, q, 0, Math.PI * 2); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(x, y, R - P(1), 0, Math.PI * 2); ctx.strokeStyle = 'rgba(150,110,78,.7)'; ctx.lineWidth = Math.max(0.8, P(2.5)); ctx.stroke();
    const side = brand ? 1 : -1;                         // left reel: strand on its left; right reel: on its right
    ctx.strokeStyle = '#3a2618'; ctx.lineWidth = Math.max(1, P(3));
    ctx.beginPath(); ctx.moveTo(x + side * R * 0.98, y + R * 0.2); ctx.lineTo(x + side * P(150), y0 + h + P(4)); ctx.stroke();
    // the reel: gold flange and white hub, one piece turning about its centre
    const D = P(328);
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.drawImage(T90.reel, -D / 2, -D / 2, D, D);
    if (brand && P(18) >= 6) {                           // DECK 90 printed along the right reel's rim
      ctx.font = `bold ${Math.round(P(18))}px "Segoe UI", Arial, sans-serif`; ctx.fillStyle = 'rgba(70,48,20,.82)';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const txt = 'DECK 90', rad = P(140); let a0 = -Math.PI / 2 - 0.22;
      for (const ch of txt) { const cw = ctx.measureText(ch).width / rad; ctx.save(); ctx.rotate(a0 + cw / 2); ctx.fillText(ch, 0, -rad); ctx.restore(); a0 += cw * 1.12; }
    }
    ctx.restore();
    // the light on the reel stays put while it turns
    const light = ctx.createLinearGradient(x - P(160), y - P(160), x + P(160), y + P(160));
    light.addColorStop(0, 'rgba(255,245,225,.10)'); light.addColorStop(.5, 'rgba(255,255,255,0)'); light.addColorStop(1, 'rgba(0,0,0,.22)');
    ctx.beginPath(); ctx.arc(x, y, P(161), 0, Math.PI * 2); ctx.fillStyle = light; ctx.fill();
    // the window's smoked glass: a reflection at the top left, a shadow along the frame
    const refl = ctx.createLinearGradient(x0, y0, x0 + w * 0.6, y0 + h * 0.6);
    refl.addColorStop(0, 'rgba(255,255,255,.22)'); refl.addColorStop(.18, 'rgba(255,255,255,.04)'); refl.addColorStop(.19, 'rgba(255,255,255,0)');
    ctx.fillStyle = refl; ctx.fillRect(x0, y0, w, h);
    ctx.lineWidth = P(10); ctx.strokeStyle = 'rgba(0,0,0,.35)'; rr(ctx, x0, y0, w, h, P(6)); ctx.stroke();
    ctx.restore();
  });
  // the label: side, the song, the tape's name
  const song = np && np.title ? (np.artist ? np.artist + ' – ' : '') + np.title : 'DECK 90';
  if (P(26) >= 6) {
    ctx.textBaseline = 'middle';
    ctx.font = `600 ${Math.round(P(25))}px "Segoe UI", "Helvetica Neue", Arial, sans-serif`; ctx.textAlign = 'right'; ctx.fillStyle = '#3c3c40';
    ctx.fillText('SO-90 REEL', sX + P(835), sY + P(33));
    const room = P(835 - 72) - ctx.measureText('SO-90 REEL').width - P(30);
    ctx.font = `500 ${Math.round(P(26))}px "Segoe UI", "Helvetica Neue", Arial, sans-serif`; ctx.textAlign = 'left'; ctx.fillStyle = '#3f3f43';
    let t = 'A  •  ' + song;
    if (ctx.measureText(t).width > room) { while (t.length > 6 && ctx.measureText(t + '…').width > room) t = t.slice(0, -1); t = t.trimEnd() + '…'; }
    ctx.fillText(t, sX + P(72), sY + P(33));
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
  const face = px => `${Math.max(6, Math.round(px))}px "Bahnschrift", "Segoe UI", Arial, sans-serif`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  // the indicators take the room right of the digits: smaller when the display is narrow
  ctx.font = face(gH * 0.085);
  const room = gX + gW - iX - gH * 0.06, need = ctx.measureText('REEL - TYPE II').width;
  if (need > room) ctx.font = face(gH * 0.085 * Math.max(0.45, room / need));
  const state = play ? 'PLAY ▶' : (running ? 'PAUSE ❚❚' : 'STOP ■');
  ctx.fillStyle = play ? FL : '#ffd27a'; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = glow;
  ctx.fillText(state, iX, gY + gH * 0.23); ctx.shadowBlur = 0;
  ctx.fillStyle = DIM; ctx.fillText('REEL - TYPE II', iX, gY + gH * 0.41);
  // the song, in dot-matrix-like letters; scrolls with a pause when it doesn't fit
  const tX = dX0, tW = gX + gW - gH * 0.12 - tX, tY = gY + gH * 0.655, px = gH * 0.105;
  ctx.font = `${Math.max(7, Math.round(px))}px "Lucida Console", "Consolas", "Courier New", monospace`;
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
