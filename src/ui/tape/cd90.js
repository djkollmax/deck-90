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
  const pX = P(44), pY = P(66), pW = P(842 + extra), pH = P(567);
  // panel pixels → canvas, through the stretch of the band the point is in
  const bandAt = y => (y < 330 ? 0 : y < 440 ? 1 : 2);
  const Q = (x, y) => [pX + P(cdMapX(wide.maps[bandAt(y)], x)), pY + P(y)];
  const cur = ((cd.track - 1) % 8);
  // the display, from the panel to the right edge, and the transport keys under it
  const dX = P(916 + extra), dY = P(88), dH = P(368), dW = Math.max(P(500), W - P(40) - dX);
  const gX = dX + P(26), gY = dY + P(26), gW = dW - P(52), gH = dH - P(52);
  const keys = ['◀◀', '▶', '■', '▶▶', '❚❚'];
  const kY = P(476), kH = P(140), kGap = P(16);
  const kW = Math.min((dW - P(8) - kGap * (keys.length - 1)) / keys.length, P(380));
  const kRow = kW * keys.length + kGap * (keys.length - 1), kX0 = dX + (dW - kRow) / 2;
  // keys on the panel that do something here
  const panelKeys = [[529, 476, 135, 64, 'TIME', () => { cd.remain = !cd.remain; }],
    [670, 476, 135, 64, 'REPEAT', () => { cd.repeat = !cd.repeat; toast(cd.repeat ? 'REPEAT · <span>solo el indicador: el que repite es el reproductor</span>' : 'REPEAT apagado', 2400); }],
    [698, 134, 87, 129, '⏏', () => toast('El CD-90 solo reproduce 🙂', 2000)]];
  const now = performance.now(), pressed = ['TIME', 'REPEAT', '⏏'].concat(keys).filter(k => now - (deckPressed[k] || 0) < 180).join(',');
  const dur = np && np.dur > 0 ? np.dur : 0;
  const stillKey = [extra, play, running, cd.track, cd.remain && !!dur, cd.repeat, pressed].join('|');
  ctx.save();
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';

  // ── still: the plate, the steel panel and its lights, the display's bezel and still marks, the keys
  blit(ctx, still('cd90:' + (ctx.canvas.id || ''), W, H, stillKey, x => {
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    // the black brushed plate
    const pat = x.createPattern(D90.plate, 'repeat');
    if (pat.setTransform) pat.setTransform(new DOMMatrix().scaleSelf(Math.max(0.35, s * 1.3)));
    x.fillStyle = pat; x.fillRect(0, 0, W, H);
    const shade = x.createLinearGradient(0, 0, 0, H);
    shade.addColorStop(0, 'rgba(255,255,255,.04)'); shade.addColorStop(1, 'rgba(0,0,0,.25)');
    x.fillStyle = shade; x.fillRect(0, 0, W, H);
    x.translate(0, oy);
    // the steel panel
    x.save(); x.shadowColor = 'rgba(0,0,0,.6)'; x.shadowBlur = P(16); x.shadowOffsetY = P(5);
    x.drawImage(wide.canvas, pX, pY, pW, pH); x.restore();
    // power LED: green while it plays, dim otherwise
    { const [lx, ly] = Q(176, 509), r = P(11);
      x.beginPath(); x.arc(lx, ly, r, 0, Math.PI * 2);
      if (running) { x.fillStyle = '#3dff6a'; x.shadowColor = '#3dff6a'; x.shadowBlur = P(18); }
      else x.fillStyle = '#1d3a22';
      x.fill(); x.shadowBlur = 0; }
    // the current track's key glows (1–8)
    { const [kx, ky] = Q(CD_KX[cur] + 4, 351), [kx2] = Q(CD_KX[cur] + 87, 351);
      x.save(); rr(x, kx, ky + P(4), kx2 - kx, P(64), P(6));
      x.fillStyle = play ? 'rgba(95,243,234,.16)' : 'rgba(95,243,234,.08)'; x.shadowColor = '#5ff3ea'; x.shadowBlur = play ? P(14) : 0; x.fill(); x.restore(); }
    // pressed keys sink for a moment
    panelKeys.forEach(([px, py, w, h, k]) => {
      if (!pressed.split(',').includes(k)) return;
      const [a, b] = Q(px, py), [a2] = Q(px + w, py);
      x.fillStyle = 'rgba(0,0,0,.28)'; rr(x, a, b, a2 - a, P(h), P(6)); x.fill();
    });
    // the display's bezel (stretched in the middle only)
    const Dm = CD90.display, b = 34, bs = P(b), Dw = Dm.width, Dh = Dm.height;
    const nine = (sx, sy, sw, sh, px, py, w, h) => { if (w > 0 && h > 0) x.drawImage(Dm, sx, sy, sw, sh, px, py, w, h); };
    nine(0, 0, b, b, dX, dY, bs, bs); nine(Dw - b, 0, b, b, dX + dW - bs, dY, bs, bs);
    nine(0, Dh - b, b, b, dX, dY + dH - bs, bs, bs); nine(Dw - b, Dh - b, b, b, dX + dW - bs, dY + dH - bs, bs, bs);
    nine(b, 0, Dw - 2 * b, b, dX + bs, dY, dW - 2 * bs, bs); nine(b, Dh - b, Dw - 2 * b, b, dX + bs, dY + dH - bs, dW - 2 * bs, bs);
    nine(0, b, b, Dh - 2 * b, dX, dY + bs, bs, dH - 2 * bs); nine(Dw - b, b, b, Dh - 2 * b, dX + dW - bs, dY + bs, bs, dH - 2 * bs);
    nine(b, b, Dw - 2 * b, Dh - 2 * b, dX + bs, dY + bs, dW - 2 * bs, dH - 2 * bs);
    x.save(); rr(x, gX, gY, gW, gH, P(8)); x.clip();
    cdDisplay(x, gX, gY, gW, gH, play, 'still');
    x.restore();
    // the transport keys (the SO-90's), under the display
    rr(x, kX0 - P(8), kY - P(8), kRow + P(16), kH + P(16), P(8)); x.fillStyle = 'rgba(0,0,0,.75)'; x.fill();
    keys.forEach((k, i) => {
      const kx = kX0 + i * (kW + kGap);
      const lit = (k === '▶' && play) || (k === '■' && !running);
      const down = pressed.split(',').includes(k), ky = kY + (down ? P(3) : 0);
      x.drawImage(T90.key, kx, ky, kW, kH);
      if (down) { x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(kx, ky, kW, kH); }
      const green = '#3ff0b4', amber = '#ffb35a';
      x.font = `bold ${Math.max(8, Math.round(P(46)))}px Arial, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
      if (lit) { x.fillStyle = k === '▶' ? green : amber; x.shadowColor = x.fillStyle; x.shadowBlur = P(16); } else x.fillStyle = '#a3a5a8';
      x.fillText(k, kx + kW / 2, ky + kH * 0.47); x.shadowBlur = 0;
      if (lit && k === '▶') { x.fillStyle = green; x.shadowColor = green; x.shadowBlur = P(12); rr(x, kx + kW * 0.28, ky + kH * 0.82, kW * 0.44, Math.max(2, P(7)), P(3)); x.fill(); x.shadowBlur = 0; }
    });
  }));
  ctx.translate(0, oy);
  panelKeys.forEach(([px, py, w, h, k, act]) => { const [a, b] = Q(px, py), [a2] = Q(px + w, py); tapeHits.push({ x: a, y: b + oy, w: a2 - a, h: P(h), k, local: act }); });
  keys.forEach((k, i) => tapeHits.push({ x: kX0 + i * (kW + kGap), y: kY + oy, w: kW, h: kH, k }));

  // ── what's lit on the display
  ctx.save(); rr(ctx, gX, gY, gW, gH, P(8)); ctx.clip();
  cdDisplay(ctx, gX, gY, gW, gH, play, 'live');
  ctx.restore();
  ctx.restore();
}

// The CD-90's display. `part` 'still' draws what's always there (unlit digits and cells, TRACK, CD, the track
// calendar and the REMAIN / REPEAT flags); 'live' what lights up and moves (and keeps the spectrum's bands).
function cdDisplay(ctx, gX, gY, gW, gH, play, part) {
  const FL = '#5ff3ea', GHOST = 'rgba(95,243,234,.045)', DIM = 'rgba(95,243,234,.6)', UNLIT = 'rgba(95,243,234,.12)', glow = Math.max(4, gH * 0.03);
  const still = part === 'still', CLEAR = 'rgba(0,0,0,0)';
  const face = (px, w = 600) => `${w} ${Math.max(6, Math.round(px * 1.08))}px "Deck90 Display", "Bahnschrift SemiBold Condensed", "Arial Narrow", Arial, sans-serif`;
  const pad = Math.min(gW * 0.04, gH * 0.12);
  // time: elapsed, or (TIME) what's left of the song
  const pos = np ? npPosition() : bigTape.counter, dur = np && np.dur > 0 ? np.dur : 0;
  let t = cd.remain && dur ? Math.max(0, dur - pos) : pos; t = Math.floor(t);
  const dg = String(Math.floor(t / 60) % 100).padStart(2, '0') + String(t % 60).padStart(2, '0');
  const dH = gH * 0.36, dW = dH * 0.52, dGap = dW * 0.24, dX0 = gX + pad + (cd.remain && dur ? dW * 0.55 : 0), dY0 = gY + gH * 0.09;
  if (!still && cd.remain && dur) { ctx.fillStyle = FL; ctx.shadowColor = FL; ctx.shadowBlur = glow; ctx.fillRect(gX + pad, dY0 + dH * 0.47, dW * 0.4, Math.max(2, dW * 0.16)); ctx.shadowBlur = 0; }
  for (let k = 0; k < 4; k++) draw7(ctx, dX0 + k * (dW + dGap), dY0, dW, dH, still ? ' ' : dg[k], FL, still ? GHOST : CLEAR);
  if (!still) {
    const q = Math.max(1.6, dW * 0.13), cx = dX0 + 2 * (dW + dGap) - dGap / 2;
    ctx.fillStyle = FL; ctx.shadowColor = FL; ctx.shadowBlur = glow;
    ctx.beginPath(); [0.36, 0.66].forEach(fy => ctx.rect(cx - q / 2, dY0 + dH * fy - q / 2, q, q)); ctx.fill(); ctx.shadowBlur = 0;
  }
  let x = dX0 + 4 * (dW + dGap) + gH * 0.08;
  // TRACK and its number
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  if (still) { ctx.font = face(gH * 0.075); ctx.fillStyle = DIM; ctx.fillText('TRACK', x, dY0 + dH * 0.12); }
  const tr = String(Math.min(99, cd.track)).padStart(2, '0'), tH = dH * 0.72, tW = tH * 0.52;
  for (let k = 0; k < 2; k++) draw7(ctx, x + k * (tW + tW * 0.24), dY0 + dH - tH, tW, tH, still ? ' ' : tr[k], FL, still ? GHOST : CLEAR);
  x += 2 * tW * 1.24 + gH * 0.14;
  // PLAY / PAUSE / STOP, CD, REMAIN, REPEAT
  ctx.font = face(gH * 0.1);
  if (!still) {
    const state = play ? 'PLAY ▶' : (running ? 'PAUSE ❚❚' : 'STOP ■');
    ctx.fillStyle = play ? FL : '#ffd27a'; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = glow;
    ctx.fillText(state, x, dY0 + dH * 0.25); ctx.shadowBlur = 0;
  } else { ctx.fillStyle = FL; ctx.fillText('CD', x, dY0 + dH * 0.72); }
  const leftEnd = x + Math.max(ctx.measureText('PAUSE ❚❚').width, ctx.measureText('CD').width) + gH * 0.12;
  // right: the track calendar 1–8 (or the last eight), the current one bright; REMAIN and REPEAT under it.
  // Whatever doesn't fit beside PLAY/CD is left out (the calendar first).
  const calR = gX + gW - pad, step = gH * 0.105, calL = calR - 8 * step;
  ctx.font = face(gH * 0.065, 500);
  const flagsW = ctx.measureText('REMAIN    ⟲ REPEAT').width;
  const showCal = calL > leftEnd, showFlags = calR - flagsW > leftEnd;
  if (still && showCal) {
    const first = Math.max(1, cd.track - 7);
    ctx.font = face(gH * 0.08); ctx.textAlign = 'right';
    for (let k = 7; k >= 0; k--) {
      const n = first + k, cx = calR - (7 - k) * step;
      ctx.fillStyle = n === cd.track ? FL : n < cd.track ? DIM : UNLIT;
      if (n === cd.track) { ctx.shadowColor = FL; ctx.shadowBlur = glow; }
      ctx.fillText(String(n), cx, dY0 + dH * 0.22); ctx.shadowBlur = 0;
    }
  }
  if (still && showFlags) {
    ctx.font = face(gH * 0.065, 500); ctx.textAlign = 'right';
    ctx.fillStyle = cd.repeat ? FL : UNLIT; ctx.fillText('⟲ REPEAT', calR, dY0 + dH * 0.72);
    const rw = ctx.measureText('⟲ REPEAT').width + gH * 0.12;
    ctx.fillStyle = cd.remain ? FL : UNLIT; ctx.fillText('REMAIN', calR - rw, dY0 + dH * 0.72);
  }
  ctx.textAlign = 'left';
  const px = gH * 0.1, tX = gX + pad, tWd = gW - 2 * pad, tY = gY + gH * 0.6;
  if (!still) {
    // the song in dot-matrix letters; scrolls with a pause when it doesn't fit
    const song = np && np.title ? (np.artist ? np.artist + ' - ' : '') + np.title : 'DECK 90';
    ctx.font = `${Math.max(9, Math.round(px * 1.3))}px "Deck90 Dots", "Lucida Console", "Consolas", monospace`;
    const tw = ctx.measureText(song).width;
    ctx.save(); ctx.beginPath(); ctx.rect(tX, tY - px, tWd, px * 2); ctx.clip();
    ctx.fillStyle = FL; ctx.shadowColor = FL; ctx.shadowBlur = glow;
    if (tw <= tWd) ctx.fillText(song, tX, tY);
    else {
      const gap = px * 4, loop = tw + gap, speed = px * 2.4, pause = 2, cycle = loop / speed + pause;
      const ph = (performance.now() / 1000) % cycle, off = ph < pause ? 0 : (ph - pause) * speed;
      restAnim = true;                                     // it scrolls by itself: keep drawing
      ctx.fillText(song, tX - off, tY); ctx.fillText(song, tX - off + loop, tY);
    }
    ctx.restore(); ctx.shadowBlur = 0;
  }
  // the song's progress (a row of segments) and the spectrum (segmented bands with falling peaks): the unlit
  // cells are still; the lit ones glow as one shape
  const cell = (cx, cy, w, h) => { if (still) ctx.rect(cx, cy, w, h); else glowCell(ctx, cx, cy, w, h, 0, FL, glow * .6); };
  if (still) ctx.beginPath();
  const segs = 24, pY = gY + gH * 0.7, pH = gH * 0.035, pW = tWd * 0.78, pitch = pW / segs;
  const litP = dur ? Math.round(Math.min(1, pos / dur) * segs) : 0;
  for (let k = 0; k < segs; k++) if (still || k < litP) cell(tX + k * pitch, pY, pitch * 0.8, pH);
  // as many bands as the width takes, each about as wide as in the mock-up
  const sTop = gY + gH * 0.76, sBot = gY + gH * 0.96, rows = 6;
  const bandsN = Math.max(16, Math.min(40, Math.round(tWd / (gH * 0.14)))), bw = tWd / bandsN;
  if (cd.edgesN !== bandsN) { cd.edgesN = bandsN; cd.edges = logEdges(bandsN, 40, 16000); cd.db = new Float32Array(bandsN); cd.bands = new Float32Array(bandsN); cd.peaks = new Float32Array(bandsN); cd.peakT = new Float32Array(bandsN); }
  if (!still) {
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
  }
  const rowH = (sBot - sTop) / rows;
  for (let k = 0; k < bandsN; k++) {
    const on = Math.round(cd.bands[k] * rows), pk = Math.min(rows - 1, Math.round(cd.peaks[k] * rows) - 1);
    for (let r = 0; r < rows; r++) {
      if (!still && !(r < on || (r === pk && pk >= on))) continue;
      cell(tX + k * bw + bw * 0.12, sBot - (r + 1) * rowH + rowH * 0.18, bw * 0.76, rowH * 0.64);
    }
  }
  if (still) { ctx.fillStyle = UNLIT; ctx.fill(); }
}
