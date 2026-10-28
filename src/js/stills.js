'use strict';
// ═══════════════════════════════════════════════════════════
//  STILL LAYERS (shared by every display, here and on the phone)
//  What doesn't move in a display (faces and scales, photos, bezels, frames, unlit segments) is painted once
//  into an offscreen canvas at the screen's density and copied in each frame, instead of being drawn again
//  sixty times a second. `key` names everything the still parts depend on: when it changes (the size, the
//  style, the frame…) they are painted again.
// ═══════════════════════════════════════════════════════════
const stillLayers = new Map();
function still(id, W, H, key, paint) {
  const pr = window.devicePixelRatio || 1, k = key + '|' + W + 'x' + H + '@' + pr;
  let L = stillLayers.get(id);
  if (!L) stillLayers.set(id, L = { c: document.createElement('canvas'), k: '' });
  L.t = performance.now();
  if (L.k !== k) {
    L.c.width = Math.max(1, Math.round(W * pr)); L.c.height = Math.max(1, Math.round(H * pr));
    const x = L.c.getContext('2d');
    x.setTransform(pr, 0, 0, pr, 0, 0);
    paint(x);
    L.k = k;
  }
  return L.c;
}
// a still layer copied onto its display pixel for pixel
function blit(ctx, layer) {
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(layer, 0, 0); ctx.restore();
}
// A still piece in part of a display (a reel's tape pack, a cassette window's glass…): painted once, in the
// display's own coordinates, onto exactly the screen pixels it covers, and stamped there each frame.
// (x0, y0, w, h) is the piece's box in the current coordinates (scale and offset only, no rotation); anything
// it paints outside that box is cut.
function stamp(ctx, id, key, x0, y0, w, h, paint) {
  const m = ctx.getTransform();
  const X0 = Math.floor(m.a * x0 + m.e), Y0 = Math.floor(m.d * y0 + m.f);
  const X1 = Math.ceil(m.a * (x0 + w) + m.e), Y1 = Math.ceil(m.d * (y0 + h) + m.f);
  const k = key + '|' + [m.a, m.d, m.e, m.f, x0, y0, w, h].map(v => Math.round(v * 1000)).join(',');
  let L = stillLayers.get(id);
  if (!L) stillLayers.set(id, L = { c: document.createElement('canvas'), k: '' });
  L.t = performance.now();
  if (L.k !== k) {
    L.c.width = Math.max(1, X1 - X0); L.c.height = Math.max(1, Y1 - Y0);
    const x = L.c.getContext('2d');
    x.setTransform(m.a, 0, 0, m.d, m.e - X0, m.f - Y0);
    paint(x);
    L.k = k;
  }
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(L.c, X0, Y0); ctx.restore();
}
// layers nothing has shown for a while (another style chosen, a module put away, the window in the tray) give
// their memory back; one that is needed again is painted again
setInterval(() => {
  const t = performance.now();
  stillLayers.forEach((L, id) => { if (t - L.t > 20000) stillLayers.delete(id); });
}, 10000);
// a display font that arrives after a still layer was painted: paint them all again with it
if (typeof document !== 'undefined' && document.fonts && document.fonts.addEventListener)
  document.fonts.addEventListener('loadingdone', () => stillLayers.forEach(L => { L.k = ''; }));
// A lit cell with its glow (a meter segment, a spectrum cell): the blurred glow is painted once per colour,
// size and quarter-pixel position, and stamped wherever that cell lights up. Stamped one after another they
// look exactly as cells drawn and blurred one by one, at a fraction of the cost. (glow: the shadow's colour,
// when it isn't the cell's own)
const glowSprites = new Map();
function glowCell(ctx, x, y, w, h, r, color, blur, glow = color) {
  const m = ctx.getTransform(), X = m.a * x + m.e, Y = m.d * y + m.f;
  const fx = Math.round((X - Math.floor(X)) * 4) / 4, fy = Math.round((Y - Math.floor(Y)) * 4) / 4;
  const W = w * m.a, H = h * m.d, pad = Math.ceil(blur * 2) + 2;
  const k = color + '|' + glow + '|' + W.toFixed(2) + '|' + H.toFixed(2) + '|' + r + '|' + blur + '|' + fx + '|' + fy;
  let c = glowSprites.get(k);
  if (!c) {
    if (glowSprites.size > 600) glowSprites.clear();         // sizes change with the window: never let it grow
    c = document.createElement('canvas'); c.width = Math.ceil(W + 2 * pad + 1); c.height = Math.ceil(H + 2 * pad + 1);
    const g = c.getContext('2d');
    g.fillStyle = color; g.shadowColor = glow; g.shadowBlur = blur;
    g.beginPath(); g.roundRect ? g.roundRect(pad + fx, pad + fy, W, H, r * m.a) : g.rect(pad + fx, pad + fy, W, H); g.fill();
    glowSprites.set(k, c);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(c, Math.floor(X) - pad, Math.floor(Y) - pad); ctx.setTransform(m);
}
