'use strict';
// ═══════════════════════════════════════════════════════════
//  THE DECK 90 CASSETTE DECK (metal frames: TITANIO, NEGRO, CHAMPAGNE)
//  A black brushed faceplate built from pieces of the panel's mock-up (img/deck/): the cassette well with a
//  DECK 90 TYPE IV tape whose hubs turn, the FL display, six square transport keys, two knurled knobs, the
//  power key, its LED and the phones jack. The well and the knobs follow the deck's height; the display and
//  the keys take the width that's left, so one deck or two fill their panel.
//  Measurements below are in the mock-up's pixels (it is 724 px tall); everything is scaled by H / 724.
// ═══════════════════════════════════════════════════════════
const D90 = {}, D90_FILES = {
  plate: 'plate.jpg', well: 'well.png', cassette: 'cassette.jpg', hub: 'hub.png', display: 'display.png',
  key: 'key.png', knobBig: 'knob-big.png', knobSmall: 'knob-small.png', power: 'power.png', jack: 'jack.png',
  screw: 'screw.png', logo: 'logo.png',
};
let d90Loaded = 0;
const D90_N = Object.keys(D90_FILES).length;
for (const [k, f] of Object.entries(D90_FILES)) {
  const im = new Image();
  im.onload = () => { if (++d90Loaded === D90_N && typeof running !== 'undefined' && !running && typeof drawIdle === 'function') drawIdle(); };
  im.src = 'img/deck/' + f;
  D90[k] = im;
}
const deck90Ready = () => d90Loaded === D90_N;
const d90Patterns = new WeakMap();

function drawDeck90(ctx, X, Y, W, H, d, levels, running) {
  const s = H / 724;                                       // mock-up pixels → canvas pixels
  const P = v => v * s;
  ctx.save();
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';

  // ── the faceplate: brushed black aluminium, a lit top edge, a dark cut all round
  let pat = d90Patterns.get(ctx);
  if (!pat) { pat = ctx.createPattern(D90.plate, 'repeat'); d90Patterns.set(ctx, pat); }
  if (pat.setTransform) pat.setTransform(new DOMMatrix().translateSelf(X, Y).scaleSelf(Math.max(0.35, s * 1.3)));
  rr(ctx, X, Y, W, H, P(10)); ctx.fillStyle = pat; ctx.fill();
  const shade = ctx.createLinearGradient(0, Y, 0, Y + H);
  shade.addColorStop(0, 'rgba(255,255,255,.05)'); shade.addColorStop(.25, 'rgba(255,255,255,0)'); shade.addColorStop(1, 'rgba(0,0,0,.22)');
  ctx.fillStyle = shade; ctx.fill();
  ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(0,0,0,.85)'; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(X + P(10), Y + 1, W - P(20), Math.max(1, P(2)));
  ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(X + P(10), Y + H - Math.max(1, P(3)), W - P(20), Math.max(1, P(3)));
  // screws
  const sc = P(50);
  [[P(44), P(40)], [W - P(44), P(40)], [P(44), H - P(51)], [W - P(44), H - P(51)]].forEach(([x, y]) => ctx.drawImage(D90.screw, X + x - sc / 2, Y + y - sc / 2, sc, sc));
  // name, legend, and the line under them
  const lh = P(50), lw = lh * D90.logo.width / D90.logo.height;
  ctx.drawImage(D90.logo, X + P(120), Y + P(40), lw, lh);
  ctx.font = `${Math.max(6, Math.round(P(20)))}px "Segoe UI", Arial, sans-serif`; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(200,205,212,.42)';
  ctx.fillText('SO-1' + d.side + '  ·  3-HEAD CASSETTE DECK  ·  DUAL CAPSTAN' + (W > H * 4 ? '  ·  DOLBY B·C NR  ·  HX PRO' : ''), X + W - P(120), Y + P(66));
  const lineY = Y + P(106);
  ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(X + P(61), lineY, W - P(119), Math.max(1, P(2)));
  ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(X + P(61), lineY + Math.max(1, P(2)), W - P(119), Math.max(1, P(2)));

  // ── the cassette well: its bevelled frame, the DECK 90 tape inside, turning hubs, the door's glass
  const wX = X + P(56), wY = Y + P(144), wW = P(750), wH = P(463);
  ctx.drawImage(D90.well, wX, wY, wW, wH);
  const cX = wX + P(40), cY = wY + P(39), cW = P(675), cH = P(384);
  ctx.drawImage(D90.cassette, cX, cY, cW, cH);
  // the tape packs, behind the plastic: the left one pays out, the right one winds up (see reelRadii).
  // Clear in the centre window, faint through the smoked strip around the hubs.
  const [rl, rr2] = reelRadii(d.pos), R_FULL = 128;
  // the hubs' true centres (where each looks the same turned 60°): the spindles the reels turn on
  const HUBS = [[195.5, 172.45], [480.33, 172.38]];
  const packs = [[HUBS[0][0], HUBS[0][1], rl * R_FULL], [HUBS[1][0], HUBS[1][1], rr2 * R_FULL]];
  const pack = (alpha) => packs.forEach(([px, py, r]) => {
    const x = cX + P(px), y = cY + P(py), R = P(r);
    const g = ctx.createRadialGradient(x, y, P(50), x, y, R);
    g.addColorStop(0, `rgba(30,20,14,${alpha})`); g.addColorStop(0.75, `rgba(52,36,25,${alpha})`); g.addColorStop(1, `rgba(78,56,38,${alpha})`);
    ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = `rgba(255,225,190,${alpha * 0.07})`; ctx.lineWidth = Math.max(0.5, P(1));   // the wound layers
    for (let q = P(58); q < R - P(3); q += P(6)) { ctx.beginPath(); ctx.arc(x, y, q, 0, Math.PI * 2); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(x, y, R - P(1), 0, Math.PI * 2);                                     // the pack's edge catches the light
    ctx.strokeStyle = `rgba(150,112,80,${alpha * 0.8})`; ctx.lineWidth = Math.max(0.8, P(2.5)); ctx.stroke();
  });
  const win = [264, 132, 146, 84], band = [67, 125, 542, 102];
  ctx.save();                                  // centre window: what was in the photo goes, the packs as they are now
  ctx.beginPath(); ctx.rect(cX + P(win[0]), cY + P(win[1]), P(win[2]), P(win[3])); ctx.clip();
  ctx.fillStyle = '#151312'; ctx.fillRect(cX + P(win[0]), cY + P(win[1]), P(win[2]), P(win[3]));
  pack(1);
  const smoke = ctx.createLinearGradient(0, cY + P(win[1]), 0, cY + P(win[1] + win[3]));
  smoke.addColorStop(0, 'rgba(255,255,255,.07)'); smoke.addColorStop(.45, 'rgba(255,255,255,.015)'); smoke.addColorStop(1, 'rgba(0,0,0,.25)');
  ctx.fillStyle = smoke; ctx.fillRect(cX + P(win[0]), cY + P(win[1]), P(win[2]), P(win[3]));
  ctx.restore();
  ctx.save();                                  // the smoked strip: only a hint of the packs
  ctx.beginPath(); ctx.rect(cX + P(band[0]), cY + P(band[1]), P(band[2]), P(band[3]));
  ctx.rect(cX + P(win[0]), cY + P(win[1]), P(win[2]), P(win[3])); ctx.clip('evenodd');
  pack(0.22);
  ctx.restore();
  // the hubs turn exactly about their centres (the image is centred on them to a fraction of a pixel and
  // made six-fold symmetric); the light on them doesn't turn, as on a real reel
  const hubD = P(108);
  [[HUBS[0][0], HUBS[0][1], d.ang[0]], [HUBS[1][0], HUBS[1][1], d.ang[1]]].forEach(([hx, hy, a]) => {
    const x = cX + P(hx), y = cY + P(hy);
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.drawImage(D90.hub, -hubD / 2, -hubD / 2, hubD, hubD); ctx.restore();
    const light = ctx.createLinearGradient(x - P(40), y - P(40), x + P(40), y + P(40));
    light.addColorStop(0, 'rgba(255,248,235,.16)'); light.addColorStop(.45, 'rgba(255,255,255,0)'); light.addColorStop(1, 'rgba(0,0,0,.24)');
    ctx.beginPath(); ctx.arc(x, y, P(50), 0, Math.PI * 2); ctx.fillStyle = light; ctx.fill();
  });
  if (d.side !== 'A') {                                    // the tape is printed with side A: deck B shows B
    ctx.fillStyle = 'rgb(22,20,19)'; ctx.fillRect(cX + P(91), cY + P(165), P(25), P(25));
    ctx.font = `${Math.max(6, Math.round(P(24)))}px "Segoe UI", Arial, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(205,203,196,.85)'; ctx.fillText(d.side, cX + P(103), cY + P(177.5));
  }
  // the label: the song in big letters, the artist under it (deck B: the one that played before)
  const prev = d.side !== 'A' && typeof trackHistory !== 'undefined' ? trackHistory[0] : null;
  const song = d.side === 'A' ? (np && np.title ? np : null) : prev;
  const line1 = song ? song.title : (d.title || ''), line2 = song ? (song.artist || '') : '';
  const fit = (txt, px, weight, maxW) => {                 // shrink to fit (down to 70 %), then cut with …
    let size = px;
    ctx.font = `${weight} ${Math.round(size)}px "Segoe UI", "Helvetica Neue", Arial, sans-serif`;
    while (ctx.measureText(txt).width > maxW && size > px * 0.7) { size -= 1; ctx.font = `${weight} ${Math.round(size)}px "Segoe UI", "Helvetica Neue", Arial, sans-serif`; }
    let t = txt;
    if (ctx.measureText(t).width > maxW) { while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1); t = t.trimEnd() + '…'; }
    return t;
  };
  const lX = cX + P(48), lW = P(578);
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  if (P(34) >= 7) {                                        // only where it can be read
    const t1 = fit(line1, P(34), 600, lW);
    ctx.fillStyle = '#ece8dc'; ctx.fillText(t1, lX, cY + P(line2 ? 38 : 52));
    if (line2 && P(22) >= 6) {
      const t2 = fit(line2, P(22), 400, lW);
      ctx.fillStyle = 'rgba(200,196,186,.82)'; ctx.fillText(t2, lX, cY + P(76));
    }
  }
  // the door's glass over it
  const glass = ctx.createLinearGradient(cX, cY, cX + cW * 0.7, cY + cH);
  glass.addColorStop(0, 'rgba(255,255,255,.10)'); glass.addColorStop(.3, 'rgba(255,255,255,.02)'); glass.addColorStop(.31, 'rgba(255,255,255,0)');
  ctx.fillStyle = glass; ctx.fillRect(cX, cY, cW, cH);
  if (running) { ctx.fillStyle = 'rgba(255,200,120,.035)'; ctx.fillRect(cX, cY, cW, cH); }   // the well's lamp

  // ── right side: knobs, power key + LED, phones jack (fixed size, against the right edge)
  const rW = P(440);
  const rX = X + W - rW;                                   // where the right section starts (the display's right edge)
  // ── the display, from the well to the right section
  const dX = wX + wW + P(32), dY = Y + P(155), dH = P(256), dW = Math.max(P(300), rX - dX);
  // the display's bevel, stretched in the middle only (its corners keep their shape)
  const D = D90.display, b = 26, bs = P(b);
  const nine = (sx, sy, sw, sh, x, y, w, h) => { if (w > 0 && h > 0) ctx.drawImage(D, sx, sy, sw, sh, x, y, w, h); };
  const Dw = D.width, Dh = D.height;
  nine(0, 0, b, b, dX, dY, bs, bs); nine(Dw - b, 0, b, b, dX + dW - bs, dY, bs, bs);
  nine(0, Dh - b, b, b, dX, dY + dH - bs, bs, bs); nine(Dw - b, Dh - b, b, b, dX + dW - bs, dY + dH - bs, bs, bs);
  nine(b, 0, Dw - 2 * b, b, dX + bs, dY, dW - 2 * bs, bs); nine(b, Dh - b, Dw - 2 * b, b, dX + bs, dY + dH - bs, dW - 2 * bs, bs);
  nine(0, b, b, Dh - 2 * b, dX, dY + bs, bs, dH - 2 * bs); nine(Dw - b, b, b, Dh - 2 * b, dX + dW - bs, dY + bs, bs, dH - 2 * bs);
  nine(b, b, Dw - 2 * b, Dh - 2 * b, dX + bs, dY + bs, dW - 2 * bs, dH - 2 * bs);
  // what it shows, inside the glass
  const gX = dX + P(22), gY = dY + P(24), gW = dW - P(44), gH = dH - P(44);
  ctx.save(); rr(ctx, gX, gY, gW, gH, P(4)); ctx.clip();
  deckDisplay(ctx, gX + P(6), gY + P(4), gW - P(12), gH - P(6), d, levels, running, H);
  ctx.restore();

  // ── TRANSPORT and its keys (under the display; on a very wide deck they keep a real key's size, centred)
  const keys = ['◀◀', '▶', '■', '▶▶', '❚❚', '●'];
  const kTop = Y + P(481), kH = P(101), kGap = P(12);
  const kW = Math.min((dW - P(26) - kGap * (keys.length - 1)) / keys.length, P(330));
  const kRow = kW * keys.length + kGap * (keys.length - 1), kX0 = dX + (dW - kRow) / 2;
  const tY = Y + P(455);
  ctx.font = `${Math.max(6, Math.round(P(19)))}px "Segoe UI", Arial, sans-serif`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(205,208,214,.62)';
  const tl = 'T R A N S P O R T';
  ctx.fillText(tl, kX0 + P(6), tY);
  const tEnd = kX0 + P(6) + ctx.measureText(tl).width + P(12), lEnd = kX0 + kRow;
  ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(tEnd, tY, lEnd - tEnd, Math.max(1, P(1.5)));
  ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(tEnd, tY + Math.max(1, P(1.5)), lEnd - tEnd, Math.max(1, P(1.5)));
  rr(ctx, kX0 - P(8), kTop - P(7), kW * keys.length + kGap * (keys.length - 1) + P(16), kH + P(14), P(6));   // the keys' slot
  ctx.fillStyle = 'rgba(0,0,0,.72)'; ctx.fill();
  keys.forEach((k, i) => {
    const x = kX0 + i * (kW + kGap);
    const lit = (k === '▶' && running) || (k === '■' && !running);
    const pressed = performance.now() - (deckPressed[k] || 0) < 180;
    const y = kTop + (pressed ? P(3) : 0);
    ctx.drawImage(D90.key, x, y, kW, kH);
    if (pressed) { ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(x, y, kW, kH); }
    // the symbol, engraved; lit keys glow
    const col = k === '▶' ? '#7dffb4' : k === '●' ? '#ff5a3d' : '#ffb35a';
    ctx.font = `bold ${Math.max(7, Math.round(P(34)))}px Arial, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (lit) { ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = P(14); }
    else { ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillText(k, x + kW / 2, y + kH / 2 + Math.max(1, P(2))); ctx.fillStyle = '#17181a'; }
    ctx.fillText(k, x + kW / 2, y + kH / 2);
    ctx.shadowBlur = 0;
    deckHits.push({ x, y: kTop, w: kW, h: kH, k });
  });

  // knobs: REC LEVEL follows the left channel, BIAS stays put
  const kbD = P(200), ksD = P(158);
  const kbX = rX + P(127.5), knY = Y + P(285);
  ctx.save(); ctx.translate(kbX, knY); ctx.rotate(-0.35 + Math.max(0, Math.min(1, (levels[0] + 40) / 48)) * 0.7);
  ctx.drawImage(D90.knobBig, -kbD / 2, -kbD / 2, kbD, kbD); ctx.restore();
  ctx.drawImage(D90.knobSmall, rX + P(319.5) - ksD / 2, knY - ksD / 2, ksD, ksD);
  // power key, LED, phones
  ctx.drawImage(D90.power, rX + P(66), Y + P(496), P(110), P(72));
  ctx.beginPath(); ctx.arc(rX + P(205), Y + P(530), Math.max(1.5, P(9)), 0, Math.PI * 2);
  ctx.fillStyle = '#5dff6a'; ctx.shadowColor = '#5dff6a'; ctx.shadowBlur = P(16); ctx.fill(); ctx.shadowBlur = 0;
  const jD = P(92);
  ctx.drawImage(D90.jack, rX + P(320) - jD / 2, Y + P(532) - jD / 2, jD, jD);
  ctx.restore();
}
