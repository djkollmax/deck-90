'use strict';
// ═══════════════════════════════════════════════════════════
//  THE CD-90 (the CINTA module's third style, with the metal frames)
//  A brushed-steel CD panel from the mock-up (img/cd/): the tray, eject, the eight track keys, power and its LED,
//  TIME and REPEAT; beside it the FL display — time, track number, PLAY/PAUSE/STOP, the track calendar, the song
//  in dot-matrix letters, the song's progress and a live spectrum — and the five transport keys of the SO-90.
//  The panel follows the height; the display and the keys take the width that's left.
//  Measurements are the mock-up's pixels (it is 746 px tall), scaled by H / 746.
// ═══════════════════════════════════════════════════════════
const CD90 = {}, CD90_FILES = { panel: 'cd-panel.jpg', mask: 'cd-panel-mask.png', display: 'cd-display.jpg' };
let cd90Loaded = 0;
for (const [k, f] of Object.entries(CD90_FILES)) {
  const im = new Image();
  im.onload = () => { if (++cd90Loaded === 3 && typeof running !== 'undefined' && !running && typeof drawIdle === 'function') drawIdle(); };
  im.src = 'img/cd/' + f; CD90[k] = im;
}
const cd90Ready = () => cd90Loaded === 3 && typeof tape90Ready === 'function' && tape90Ready();
let cdPanelCanvas = null;
function cdPanel() {                                     // the photo with its own rounded outline, put together once
  if (cdPanelCanvas) return cdPanelCanvas;
  const c = document.createElement('canvas'); c.width = CD90.panel.width; c.height = CD90.panel.height;
  const x = c.getContext('2d'); x.drawImage(CD90.mask, 0, 0, c.width, c.height);
  const m = x.getImageData(0, 0, c.width, c.height);
  for (let i = 0; i < m.data.length; i += 4) m.data[i + 3] = m.data[i];
  x.putImageData(m, 0, 0); x.globalCompositeOperation = 'source-in'; x.drawImage(CD90.panel, 0, 0);
  return (cdPanelCanvas = c);
}
// A wide module gets a wider panel. The photo is cut into three horizontal bands and each one stretches only
// at its own columns, so the lettering, the keys' numbers and the rounded corners keep their shape:
//   top (labels, tray, eject): two strips of the tray, one each side of "COMPACT DISC", which stays centred;
//   keys: each key on both sides of its number, and the gaps between keys;
//   bottom: the steel between the LED and TIME.
// Columns are [from, to, weight] in the photo's pixels (842 × 567); the extra width is shared by weight.
const CD_KX = [40, 137, 232, 329, 425, 522, 618, 714];  // left edge of keys 1–8 (each 90 wide)
const CD_GAPS = [134, 230, 326, 423, 520, 615, 712];     // the cleanest steel column between each two keys
const CD_BANDS = [
  { y0: 0, y1: 330, cols: [[205, 265, 1], [467, 527, 1]] },
  { y0: 330, y1: 440, cols: CD_KX.flatMap((x, i) => [[x + 14, x + 30, 2], [x + 60, x + 76, 2]].concat(i < 7 ? [[CD_GAPS[i], CD_GAPS[i] + 1, 3]] : [])) },
  { y0: 440, y1: 567, cols: [[260, 500, 1]] },
];
// where each piece of a band goes for `extra` more pixels: [from, to, new from, new to], whole pixels
function cdBandMap(band, extra) {
  const tw = band.cols.reduce((t, c) => t + c[2], 0), segs = [];
  let sx = 0, dx = 0, given = 0, wsum = 0;
  for (const [a, b, w] of band.cols) {
    if (a > sx) { segs.push([sx, a, dx, dx + a - sx]); dx += a - sx; }
    wsum += w; const upto = Math.round(extra * wsum / tw), add = upto - given; given = upto;
    segs.push([a, b, dx, dx + b - a + add]); dx += b - a + add; sx = b;
  }
  segs.push([sx, 842, dx, dx + 842 - sx]);
  return segs;
}
const cdMapX = (segs, x) => { for (const [a, b, c, d] of segs) if (x <= b) return c + (x - a) * (d - c) / (b - a); return x; };
let cdWide = { extra: -1, canvas: null, maps: null };
function cdPanelWide(extra) {
  if (cdWide.extra === extra) return cdWide;
  const src = cdPanel(), maps = CD_BANDS.map(b => cdBandMap(b, extra));
  const c = document.createElement('canvas'); c.width = 842 + extra; c.height = 567;
  const x = c.getContext('2d'); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
  CD_BANDS.forEach((b, i) => { for (const [a, e, f, g] of maps[i]) x.drawImage(src, a, b.y0, e - a, b.y1 - b.y0, f, b.y0, g - f, b.y1 - b.y0); });
  return (cdWide = { extra, canvas: c, maps });
}

// the player's state: the track number counts the songs played since the program started
const cd = { track: 0, key: '', remain: false, repeat: false, edgesN: 0 };

function drawCD90(ctx, W, H, play) {
  const s = Math.min(H / 746, W / 1750), P = v => v * s, oy = (H - 746 * s) / 2;
  // a module wider than the mock-up: half the spare width widens the panel, up to 75 % more
  const extra = Math.round(Math.max(0, Math.min((W / s - 1750) * 0.5, 842 * 0.75)));
  const wide = cdPanelWide(extra);
  if (np && npKey && npKey !== cd.key) { cd.key = npKey; cd.track++; }
  if (!cd.track) cd.track = 1;
  ctx.save();
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  // the black brushed plate
  let pat = t90Patterns.get(ctx);
  if (!pat) { pat = ctx.createPattern(D90.plate, 'repeat'); t90Patterns.set(ctx, pat); }
  if (pat.setTransform) pat.setTransform(new DOMMatrix().scaleSelf(Math.max(0.35, s * 1.3)));
  ctx.fillStyle = pat; ctx.fillRect(0, 0, W, H);
  const shade = ctx.createLinearGradient(0, 0, 0, H);
  shade.addColorStop(0, 'rgba(255,255,255,.04)'); shade.addColorStop(1, 'rgba(0,0,0,.25)');
  ctx.fillStyle = shade; ctx.fillRect(0, 0, W, H);
  ctx.translate(0, oy);

  // ── the steel panel
  const pX = P(44), pY = P(66), pW = P(842 + extra), pH = P(567);
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = P(16); ctx.shadowOffsetY = P(5);
  ctx.drawImage(wide.canvas, pX, pY, pW, pH); ctx.restore();
  // panel pixels → canvas, through the stretch of the band the point is in
  const bandAt = y => (y < 330 ? 0 : y < 440 ? 1 : 2);
  const Q = (x, y) => [pX + P(cdMapX(wide.maps[bandAt(y)], x)), pY + P(y)];
  // power LED: green while it plays, dim otherwise
  { const [lx, ly] = Q(176, 509), r = P(11);
    ctx.beginPath(); ctx.arc(lx, ly, r, 0, Math.PI * 2);
    if (running) { ctx.fillStyle = '#3dff6a'; ctx.shadowColor = '#3dff6a'; ctx.shadowBlur = P(18); }
    else ctx.fillStyle = '#1d3a22';
    ctx.fill(); ctx.shadowBlur = 0; }
  // the current track's key glows (1–8)
  const cur = ((cd.track - 1) % 8);
  { const [x, y] = Q(CD_KX[cur] + 4, 351), [x2] = Q(CD_KX[cur] + 87, 351);
    ctx.save(); rr(ctx, x, y + P(4), x2 - x, P(64), P(6));
    ctx.fillStyle = play ? 'rgba(95,243,234,.16)' : 'rgba(95,243,234,.08)'; ctx.shadowColor = '#5ff3ea'; ctx.shadowBlur = play ? P(14) : 0; ctx.fill(); ctx.restore(); }
  // keys on the panel that do something here
  const key = (x, y, w, h, k, act) => { const [a, b] = Q(x, y), [a2] = Q(x + w, y); tapeHits.push({ x: a, y: b + oy, w: a2 - a, h: P(h), k, local: act }); };
  key(529, 476, 135, 64, 'TIME', () => { cd.remain = !cd.remain; });
  key(670, 476, 135, 64, 'REPEAT', () => { cd.repeat = !cd.repeat; toast(cd.repeat ? 'REPEAT · <span>solo el indicador: el que repite es el reproductor</span>' : 'REPEAT apagado', 2400); });
  key(698, 134, 87, 129, '⏏', () => toast('El CD-90 solo reproduce 🙂', 2000));
  // pressed keys sink for a moment
  ['TIME', 'REPEAT', '⏏'].forEach(k => {
    if (performance.now() - (deckPressed[k] || 0) < 180) { const h = tapeHits.find(t => t.k === k); ctx.fillStyle = 'rgba(0,0,0,.28)'; rr(ctx, h.x, h.y - oy, h.w, h.h, P(6)); ctx.fill(); }
  });

  // ── the display, from the panel to the right edge (its bezel stretched in the middle only)
  const dX = P(916 + extra), dY = P(88), dH = P(368), dW = Math.max(P(500), W - P(40) - dX);
  const Dm = CD90.display, b = 34, bs = P(b), Dw = Dm.width, Dh = Dm.height;
  const nine = (sx, sy, sw, sh, x, y, w, h) => { if (w > 0 && h > 0) ctx.drawImage(Dm, sx, sy, sw, sh, x, y, w, h); };
  nine(0, 0, b, b, dX, dY, bs, bs); nine(Dw - b, 0, b, b, dX + dW - bs, dY, bs, bs);
  nine(0, Dh - b, b, b, dX, dY + dH - bs, bs, bs); nine(Dw - b, Dh - b, b, b, dX + dW - bs, dY + dH - bs, bs, bs);
  nine(b, 0, Dw - 2 * b, b, dX + bs, dY, dW - 2 * bs, bs); nine(b, Dh - b, Dw - 2 * b, b, dX + bs, dY + dH - bs, dW - 2 * bs, bs);
  nine(0, b, b, Dh - 2 * b, dX, dY + bs, bs, dH - 2 * bs); nine(Dw - b, b, b, Dh - 2 * b, dX + dW - bs, dY + bs, bs, dH - 2 * bs);
  nine(b, b, Dw - 2 * b, Dh - 2 * b, dX + bs, dY + bs, dW - 2 * bs, dH - 2 * bs);
  const gX = dX + P(26), gY = dY + P(26), gW = dW - P(52), gH = dH - P(52);
  ctx.save(); rr(ctx, gX, gY, gW, gH, P(8)); ctx.clip();
  cdDisplay(ctx, gX, gY, gW, gH, play);
  ctx.restore();

  // ── the transport keys (the SO-90's), under the display
  const keys = ['◀◀', '▶', '■', '▶▶', '❚❚'];
  const kY = P(476), kH = P(140), kGap = P(16);
  const kW = Math.min((dW - P(8) - kGap * (keys.length - 1)) / keys.length, P(380));
  const kRow = kW * keys.length + kGap * (keys.length - 1), kX0 = dX + (dW - kRow) / 2;
  rr(ctx, kX0 - P(8), kY - P(8), kRow + P(16), kH + P(16), P(8)); ctx.fillStyle = 'rgba(0,0,0,.75)'; ctx.fill();
  keys.forEach((k, i) => {
    const x = kX0 + i * (kW + kGap);
    const lit = (k === '▶' && play) || (k === '■' && !running);
    const pressed = performance.now() - (deckPressed[k] || 0) < 180, y = kY + (pressed ? P(3) : 0);
    ctx.drawImage(T90.key, x, y, kW, kH);
    if (pressed) { ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(x, y, kW, kH); }
    const green = '#3ff0b4', amber = '#ffb35a';
    ctx.font = `bold ${Math.max(8, Math.round(P(46)))}px Arial, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (lit) { ctx.fillStyle = k === '▶' ? green : amber; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = P(16); } else ctx.fillStyle = '#a3a5a8';
    ctx.fillText(k, x + kW / 2, y + kH * 0.47); ctx.shadowBlur = 0;
    if (lit && k === '▶') { ctx.fillStyle = green; ctx.shadowColor = green; ctx.shadowBlur = P(12); rr(ctx, x + kW * 0.28, y + kH * 0.82, kW * 0.44, Math.max(2, P(7)), P(3)); ctx.fill(); ctx.shadowBlur = 0; }
    tapeHits.push({ x, y: kY + oy, w: kW, h: kH, k });
  });
  ctx.restore();
}

function cdDisplay(ctx, gX, gY, gW, gH, play) {
  const FL = '#5ff3ea', GHOST = 'rgba(95,243,234,.045)', DIM = 'rgba(95,243,234,.6)', UNLIT = 'rgba(95,243,234,.12)', glow = Math.max(4, gH * 0.03);
  const face = (px, w = 600) => `${w} ${Math.max(6, Math.round(px * 1.08))}px "Deck90 Display", "Bahnschrift SemiBold Condensed", "Arial Narrow", Arial, sans-serif`;
  const pad = Math.min(gW * 0.04, gH * 0.12);
  // time: elapsed, or (TIME) what's left of the song
  const pos = np ? npPosition() : bigTape.counter, dur = np && np.dur > 0 ? np.dur : 0;
  let t = cd.remain && dur ? Math.max(0, dur - pos) : pos; t = Math.floor(t);
  const dg = String(Math.floor(t / 60) % 100).padStart(2, '0') + String(t % 60).padStart(2, '0');
  const dH = gH * 0.36, dW = dH * 0.52, dGap = dW * 0.24, dX0 = gX + pad + (cd.remain && dur ? dW * 0.55 : 0), dY0 = gY + gH * 0.09;
  if (cd.remain && dur) { ctx.fillStyle = FL; ctx.shadowColor = FL; ctx.shadowBlur = glow; ctx.fillRect(gX + pad, dY0 + dH * 0.47, dW * 0.4, Math.max(2, dW * 0.16)); ctx.shadowBlur = 0; }
  for (let k = 0; k < 4; k++) draw7(ctx, dX0 + k * (dW + dGap), dY0, dW, dH, dg[k], FL, GHOST);
  { const q = Math.max(1.6, dW * 0.13), cx = dX0 + 2 * (dW + dGap) - dGap / 2;
    ctx.fillStyle = FL; ctx.shadowColor = FL; ctx.shadowBlur = glow;
    [0.36, 0.66].forEach(fy => ctx.fillRect(cx - q / 2, dY0 + dH * fy - q / 2, q, q)); ctx.shadowBlur = 0; }
  let x = dX0 + 4 * (dW + dGap) + gH * 0.08;
  // TRACK and its number
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = face(gH * 0.075); ctx.fillStyle = DIM; ctx.fillText('TRACK', x, dY0 + dH * 0.12);
  const tr = String(Math.min(99, cd.track)).padStart(2, '0'), tH = dH * 0.72, tW = tH * 0.52;
  for (let k = 0; k < 2; k++) draw7(ctx, x + k * (tW + tW * 0.24), dY0 + dH - tH, tW, tH, tr[k], FL, GHOST);
  x += 2 * tW * 1.24 + gH * 0.14;
  // PLAY / PAUSE / STOP, CD, REMAIN, REPEAT
  ctx.font = face(gH * 0.1);
  const state = play ? 'PLAY ▶' : (running ? 'PAUSE ❚❚' : 'STOP ■');
  ctx.fillStyle = play ? FL : '#ffd27a'; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = glow;
  ctx.fillText(state, x, dY0 + dH * 0.25); ctx.shadowBlur = 0;
  ctx.fillStyle = FL; ctx.fillText('CD', x, dY0 + dH * 0.72);
  const leftEnd = x + Math.max(ctx.measureText('PAUSE ❚❚').width, ctx.measureText('CD').width) + gH * 0.12;
  // right: the track calendar 1–8 (or the last eight), the current one bright; REMAIN and REPEAT under it.
  // Whatever doesn't fit beside PLAY/CD is left out (the calendar first).
  const calR = gX + gW - pad, step = gH * 0.105, calL = calR - 8 * step;
  ctx.font = face(gH * 0.065, 500);
  const flagsW = ctx.measureText('REMAIN    ⟲ REPEAT').width;
  const showCal = calL > leftEnd, showFlags = calR - flagsW > leftEnd;
  if (showCal) {
    const first = Math.max(1, cd.track - 7);
    ctx.font = face(gH * 0.08); ctx.textAlign = 'right';
    for (let k = 7; k >= 0; k--) {
      const n = first + k, cx = calR - (7 - k) * step;
      ctx.fillStyle = n === cd.track ? FL : n < cd.track ? DIM : UNLIT;
      if (n === cd.track) { ctx.shadowColor = FL; ctx.shadowBlur = glow; }
      ctx.fillText(String(n), cx, dY0 + dH * 0.22); ctx.shadowBlur = 0;
    }
  }
  if (showFlags) {
    ctx.font = face(gH * 0.065, 500); ctx.textAlign = 'right';
    ctx.fillStyle = cd.repeat ? FL : UNLIT; ctx.fillText('⟲ REPEAT', calR, dY0 + dH * 0.72);
    const rw = ctx.measureText('⟲ REPEAT').width + gH * 0.12;
    ctx.fillStyle = cd.remain ? FL : UNLIT; ctx.fillText('REMAIN', calR - rw, dY0 + dH * 0.72);
  }
  ctx.textAlign = 'left';
  // the song in dot-matrix letters; scrolls with a pause when it doesn't fit
  const song = np && np.title ? (np.artist ? np.artist + ' - ' : '') + np.title : 'DECK 90';
  const px = gH * 0.1, tX = gX + pad, tWd = gW - 2 * pad, tY = gY + gH * 0.6;
  ctx.font = `${Math.max(9, Math.round(px * 1.3))}px "Deck90 Dots", "Lucida Console", "Consolas", monospace`;
  const tw = ctx.measureText(song).width;
  ctx.save(); ctx.beginPath(); ctx.rect(tX, tY - px, tWd, px * 2); ctx.clip();
  ctx.fillStyle = FL; ctx.shadowColor = FL; ctx.shadowBlur = glow;
  if (tw <= tWd) ctx.fillText(song, tX, tY);
  else {
    const gap = px * 4, loop = tw + gap, speed = px * 2.4, pause = 2, cycle = loop / speed + pause;
    const ph = (performance.now() / 1000) % cycle, off = ph < pause ? 0 : (ph - pause) * speed;
    ctx.fillText(song, tX - off, tY); ctx.fillText(song, tX - off + loop, tY);
  }
  ctx.restore(); ctx.shadowBlur = 0;
  // the song's progress: a row of segments
  const segs = 24, pY = gY + gH * 0.7, pH = gH * 0.035, pW = tWd * 0.78, pitch = pW / segs;
  const lit = dur ? Math.round(Math.min(1, pos / dur) * segs) : 0;
  for (let k = 0; k < segs; k++) { ctx.fillStyle = k < lit ? FL : UNLIT; if (k < lit) { ctx.shadowColor = FL; ctx.shadowBlur = glow * .6; } ctx.fillRect(tX + k * pitch, pY, pitch * 0.8, pH); ctx.shadowBlur = 0; }
  // the spectrum: 22 bands, segmented, with falling peaks
  // as many bands as the width takes, each about as wide as in the mock-up
  const sTop = gY + gH * 0.76, sBot = gY + gH * 0.96, rows = 6;
  const bandsN = Math.max(16, Math.min(40, Math.round(tWd / (gH * 0.14)))), bw = tWd / bandsN;
  if (cd.edgesN !== bandsN) { cd.edgesN = bandsN; cd.edges = logEdges(bandsN, 40, 16000); cd.db = new Float32Array(bandsN); cd.bands = new Float32Array(bandsN); cd.peaks = new Float32Array(bandsN); cd.peakT = new Float32Array(bandsN); }
  const T = typeof dtMs !== 'undefined' ? dtMs / 1000 : 0.016;
  if (running && aMain) {
    aMain.getFloatFrequencyData(bufFD); bandsMax(bufFD, cd.edges, cd.db);
    for (let k = 0; k < bandsN; k++) {
      const v = Math.max(0, Math.min(1, (cd.db[k] + 85) / 60));
      cd.bands[k] = v > cd.bands[k] ? v : Math.max(v, cd.bands[k] - 1.6 * T);
      if (cd.bands[k] >= cd.peaks[k]) { cd.peaks[k] = cd.bands[k]; cd.peakT[k] = 0.6; }
      else if ((cd.peakT[k] -= T) < 0) cd.peaks[k] = Math.max(0, cd.peaks[k] - 0.8 * T);
    }
  } else for (let k = 0; k < bandsN; k++) { cd.bands[k] = Math.max(0, cd.bands[k] - 1.6 * T); cd.peaks[k] = Math.max(0, cd.peaks[k] - 0.8 * T); }
  const rowH = (sBot - sTop) / rows;
  for (let k = 0; k < bandsN; k++) {
    const on = Math.round(cd.bands[k] * rows), pk = Math.min(rows - 1, Math.round(cd.peaks[k] * rows) - 1);
    for (let r = 0; r < rows; r++) {
      const yy = sBot - (r + 1) * rowH, lit2 = r < on || (r === pk && pk >= on);
      ctx.fillStyle = lit2 ? FL : UNLIT; if (lit2) { ctx.shadowColor = FL; ctx.shadowBlur = glow * .6; }
      ctx.fillRect(tX + k * bw + bw * 0.12, yy + rowH * 0.18, bw * 0.76, rowH * 0.64); ctx.shadowBlur = 0;
    }
  }
}
