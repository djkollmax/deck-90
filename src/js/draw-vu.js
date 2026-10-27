'use strict';
// ═══════════════════════════════════════════════════════════
//  DRAW: VU METER
// ═══════════════════════════════════════════════════════════
const DB_LO = -40, DB_HI = 3;
// older phone browsers have no roundRect: a plain rectangle will do there
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h) { this.rect(x, y, w, h); };
}

// Arc: from 210° to 330° clockwise (canvas coords, 0=right, CW)
// Passes through 270° (straight up) = 12 o'clock position ✓
const A0 = 210 * Math.PI / 180;  // -40 dB end
const A1 = 330 * Math.PI / 180;  // +3 dB end
const A_SPAN = A1 - A0;           // 120° = 2π/3

function db2a(db) {
  const t = (Math.max(DB_LO, Math.min(DB_HI, db)) - DB_LO) / (DB_HI - DB_LO);
  return A0 + t * A_SPAN;
}


// With the metal frames (6.13) every face sits in a meter's frame: drawVU draws it and gives the face the box
// inside it; a face asks for its size here instead of the canvas'.
let vuBox = null;
const vuDims = canvas => vuBox ? [vuBox.w, vuBox.h] : [canvas.offsetWidth || canvas.width, canvas.offsetHeight || canvas.height];
const vuFramed = () => typeof chassis !== 'undefined' && chassis !== 'CLASSIC';
function drawVUHiFi90(canvas, ctx, st) {
  const [W, H] = vuDims(canvas);
  ctx.clearRect(0, 0, W, H);

  // High-end 90s Hi-Fi faceplate: champagne glass + blue fluorescent lower bar.
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#161a20');
  bg.addColorStop(.42, '#090d12');
  bg.addColorStop(1, '#020408');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  const glass = ctx.createLinearGradient(0, 0, W, H);
  glass.addColorStop(0, 'rgba(255,255,255,.10)');
  glass.addColorStop(.22, 'rgba(255,255,255,.025)');
  glass.addColorStop(.55, 'rgba(255,255,255,0)');
  glass.addColorStop(1, 'rgba(120,190,255,.035)');
  ctx.fillStyle = glass; ctx.fillRect(0, 0, W, H);

  const GAREA = H * 0.70;
  const cx = W / 2;
  const cy = GAREA * 0.94;
  // keep the whole arc and its top labels inside the canvas, whatever the panel's shape
  const R  = Math.max(20, Math.min(GAREA * 0.78, cy - 40, (W / 2 - 18) / 0.87 - 34));

  // warm printed scale plate
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, R + 30, A0, A1);
  ctx.closePath();
  const plate = ctx.createRadialGradient(cx, cy, 10, cx, cy, R + 35);
  plate.addColorStop(0, 'rgba(255,220,145,.025)');
  plate.addColorStop(.65, 'rgba(255,220,145,.055)');
  plate.addColorStop(1, 'rgba(0,0,0,.55)');
  ctx.fillStyle = plate; ctx.fill();

  function drawZone(dbA, dbB, col, w, glow){
    ctx.beginPath();
    ctx.arc(cx, cy, R, db2a(dbA), db2a(dbB));
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'butt';
    ctx.shadowColor = col; ctx.shadowBlur = glow || 0;
    ctx.stroke(); ctx.shadowBlur = 0;
  }
  drawZone(DB_LO, -8, 'rgba(65,170,255,.34)', 18, 10);
  drawZone(-8, -1, 'rgba(255,220,90,.52)', 18, 12);
  drawZone(-1, DB_HI, 'rgba(255,70,30,.60)', 18, 15);
  drawZone(DB_LO, -8, '#2da8ff', 7, 8);
  drawZone(-8, -1, '#ffe05a', 7, 8);
  drawZone(-1, DB_HI, '#ff4b22', 7, 12);

  const ticks = [
    {db:-40,lbl:'-40',maj:true }, {db:-30,lbl:'-30',maj:true },
    {db:-20,lbl:'-20',maj:true }, {db:-15,lbl:'',maj:false},
    {db:-10,lbl:'-10',maj:true }, {db:-7,lbl:'',maj:false},
    {db:-5,lbl:'-5',maj:true }, {db:-3,lbl:'',maj:false},
    {db:-2,lbl:'',maj:false}, {db:-1,lbl:'',maj:false},
    {db:0,lbl:'0',maj:true }, {db:1,lbl:'',maj:false},
    {db:2,lbl:'',maj:false}, {db:3,lbl:'+3',maj:true }
  ];

  ticks.forEach(({db,lbl,maj}) => {
    const ang = db2a(db), cos = Math.cos(ang), sin = Math.sin(ang);
    const ri = R - 18, ro = R + (maj ? 22 : 15);
    ctx.beginPath(); ctx.moveTo(cx + ri*cos, cy + ri*sin); ctx.lineTo(cx + ro*cos, cy + ro*sin);
    ctx.strokeStyle = maj ? 'rgba(210,235,255,.78)' : 'rgba(125,160,190,.42)';
    ctx.lineWidth = maj ? 1.5 : 1; ctx.stroke();
    if(lbl){
      ctx.font = (maj ? 'bold ' : '') + '9px Courier New';
      ctx.fillStyle = db >= 0 ? '#ff9a6a' : '#c9e9ff';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = db >= 0 ? 'rgba(255,80,30,.55)' : 'rgba(70,170,255,.45)';
      ctx.shadowBlur = 7;
      ctx.fillText(lbl, cx + (ro+12)*cos, cy + (ro+12)*sin);
      ctx.shadowBlur = 0;
    }
  });

  // Blue fluorescent lower LED bar, typical high-end 90s component stack.
  const barX = 12, barY = GAREA + (H - GAREA) * 0.28;
  const barW = W - 24, barH = H - barY - 8;
  const N = 42;
  const segW = (barW - (N - 1) * 1.5) / N;
  for(let i=0;i<N;i++){
    const segDb = DB_LO + (i/(N-1))*(DB_HI-DB_LO);
    const lit = segDb <= st.lvl;
    const isPk = Math.abs(segDb - st.peak) < (DB_HI - DB_LO) / N * 1.5;
    let on = '#48baff', off = 'rgba(20,55,78,.38)', glow='rgba(72,186,255,.55)';
    if(segDb >= -7){ on = '#ffe66a'; off='rgba(72,61,16,.38)'; glow='rgba(255,230,106,.55)'; }
    if(segDb >= -1){ on = '#ff5a2e'; off='rgba(70,22,10,.38)'; glow='rgba(255,90,46,.62)'; }
    const sx = barX + i * (segW + 1.5);
    ctx.fillStyle = lit ? on : isPk ? on : off;
    ctx.globalAlpha = lit ? 1 : isPk ? .7 : 1;
    ctx.shadowColor = lit || isPk ? glow : 'transparent';
    ctx.shadowBlur = lit ? 7 : isPk ? 4 : 0;
    ctx.fillRect(sx, barY, segW, barH);
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(sx, barY, segW, 1);
  }

  // Peak marker on the arc
  if(st.peak > DB_LO + 1){
    const pa = db2a(st.peak), pc = Math.cos(pa), ps = Math.sin(pa);
    ctx.beginPath();
    ctx.moveTo(cx + (R - 17) * pc, cy + (R - 17) * ps);
    ctx.lineTo(cx + (R + 20) * pc, cy + (R + 20) * ps);
    ctx.strokeStyle = st.peak >= -1 ? '#ff5a2e' : '#ffe66a';
    ctx.lineWidth = 3;
    ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 12; ctx.stroke(); ctx.shadowBlur = 0;
  }

  // Needle: more physical, white anodized with red jewel tip.
  const na = db2a(st.lvl), nc = Math.cos(na), ns = Math.sin(na);
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.95)'; ctx.shadowBlur = 7; ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 3;
  ctx.beginPath(); ctx.moveTo(cx - nc*14, cy - ns*14); ctx.lineTo(cx + (R+25)*nc, cy + (R+25)*ns);
  const ng = ctx.createLinearGradient(cx - nc*14, cy - ns*14, cx + (R+25)*nc, cy + (R+25)*ns);
  ng.addColorStop(0, '#9aa8b5'); ng.addColorStop(.52, '#ffffff'); ng.addColorStop(1, '#f1d7a2');
  ctx.strokeStyle = ng; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx + (R+25)*nc, cy + (R+25)*ns, 2.4, 0, Math.PI*2);
  ctx.fillStyle = '#ff5630'; ctx.shadowColor = '#ff5630'; ctx.shadowBlur = 9; ctx.fill();
  ctx.restore();

  const piv = ctx.createRadialGradient(cx-2, cy-3, 0, cx, cy, 9);
  piv.addColorStop(0, '#f9fbff'); piv.addColorStop(.45, '#7f8c99'); piv.addColorStop(1, '#1d242e');
  ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI*2); ctx.fillStyle = piv; ctx.fill();
  ctx.strokeStyle = 'rgba(190,220,255,.45)'; ctx.stroke();

  const dbTxt = st.lvl <= DB_LO + 1 ? '-∞' : (st.lvl >= 0 ? '+' : '') + st.lvl.toFixed(1);
  ctx.font = 'bold 11px Courier New'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = st.lvl >= -1 ? '#ff9a6a' : '#9fd7ff';
  ctx.shadowColor = st.lvl >= -1 ? 'rgba(255,90,46,.7)' : 'rgba(70,180,255,.55)'; ctx.shadowBlur = 8;
  ctx.fillText(dbTxt + ' VU', W/2, GAREA + (H-GAREA)*.17); ctx.shadowBlur = 0;

  ctx.font = 'bold 8px Courier New'; ctx.textAlign = 'left';
  if (W >= 300) {                                  // narrow panels: the scale needs the room
    ctx.fillStyle = 'rgba(160,215,255,.62)'; ctx.fillText('HI-FI REFERENCE VU', 8, 13);
    ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(255,220,145,.50)'; ctx.fillText('CLASSIC 90s', W-8, 13);
  }

  if(st.clip){
    ctx.beginPath(); ctx.arc(W-18, 28, 5, 0, Math.PI*2); ctx.fillStyle = '#ff4424';
    ctx.shadowColor = '#ff4424'; ctx.shadowBlur = 16; ctx.fill(); ctx.shadowBlur = 0;
  }
}

// ═══ Classic needle meters (6.5): CINTA 70s (warm backlit cream face, black needle) and AZUL (blue
// backlit face, amber needle). Real VU scale, −20 … +3, spaced like the instrument: the needle moves
// with the voltage, so the top of the scale is wide and the bottom bunched up. Original designs. ═══
const VU_THEMES = {
  REEL70: { face: ['#fbedc4', '#efd193', '#c99a52'], glow: 'rgba(255,190,90,.35)', ink: '#1a130a', red: '#c4261b', soft: 'rgba(40,25,10,.55)',
            needle: '#111', needleGlow: null, bezel: ['#3a3631', '#1a1816'], read: '#ffcf7a', title: 'VU', sub: 'PEAK' },
  // CREMA (6.13): the classic backlit cream meter — an even, bright face, black ink, a bold red band, a black needle
  CREAM:  { face: ['#fff6e2', '#f9e5b8', '#ecca8a'], glow: 'rgba(255,252,240,.55)', ink: '#18120c', red: '#e2271b', soft: 'rgba(35,25,12,.6)',
            needle: '#141210', needleGlow: null, needleW: 2.6, bezel: ['#2a2a2c', '#121214'], read: '#f2a541', title: 'VU', sub: 'PEAK' },
  // AZUL INTENSO (6.15): a saturated, deep-blue face lit bright from below, white ink, a coral band, an amber
  // needle that glows; the meter fills its frame (no readout under it)
  COBALT: { face: ['#167cf6', '#0551cf', '#011f6c'], glow: 'rgba(25,135,255,.42)', ink: '#ffffff', red: '#ff5a46', soft: 'rgba(225,238,255,.85)',
            needle: '#ffad2a', needleGlow: 'rgba(255,160,35,1)', needleW: 3.4, bezel: ['#1b1f27', '#0a0c10'], read: '#b9c6ff', title: 'VU', sub: 'PEAK',
            noRead: true, lineK: 1.9, glass: 0.35, vignette: 'rgba(0,12,60,.62)' },
  BLUE:   { face: ['#2a6fd6', '#1546a0', '#071a44'], glow: 'rgba(80,170,255,.45)', ink: '#e6f3ff', red: '#ff6a5a', soft: 'rgba(200,230,255,.7)',
            needle: '#ffb347', needleGlow: 'rgba(255,170,60,.8)', bezel: ['#1b1f27', '#0a0c10'], read: '#9fd7ff', title: 'VU', sub: 'PEAK' },
};
const VU_LO = -20, VU_HI = 3;
const vuVolt = db => Math.pow(10, db / 20);
function vuT(db) {                                     // 0 … 1 along the scale
  const a = vuVolt(VU_LO), b = vuVolt(VU_HI);
  return Math.max(-0.03, Math.min(1.04, (vuVolt(Math.min(VU_HI + 1, db)) - a) / (b - a)));
}
function drawVUClassic(canvas, ctx, st, th) {
  const [W, H] = vuDims(canvas);
  ctx.clearRect(0, 0, W, H);
  const framed = vuFramed();
  // bezel (framed: the meter's black frame, its edge catching the light)
  const bz = ctx.createLinearGradient(0, 0, 0, H);
  if (framed) { bz.addColorStop(0, '#1c1e22'); bz.addColorStop(1, '#0b0c0e'); }
  else { bz.addColorStop(0, th.bezel[0]); bz.addColorStop(1, th.bezel[1]); }
  ctx.fillStyle = bz; ctx.fillRect(0, 0, W, H);
  // the readout strip under the window; framed, a black window of its own
  const m = framed ? Math.max(6, Math.min(16, W * 0.022)) : 8;
  const READ = th.noRead ? 0 : framed ? Math.max(18, Math.min(46, H * 0.14)) : 18, rGap = framed && !th.noRead ? Math.max(3, m * 0.45) : 0;
  const wx = m, wy = m, ww = W - 2 * m, wh = H - 2 * m - READ - rGap;
  const rad = framed ? Math.max(6, Math.min(14, W * 0.014)) : 6;
  if (ww < 40 || wh < 30) return;                       // too small to draw a meter (a panel still settling)
  if (framed) vuFrameEdge(ctx, W, H);
  ctx.save();
  ctx.beginPath(); ctx.roundRect(wx, wy, ww, wh, rad); ctx.clip();
  // the backlit face: brightest low in the middle, where the lamp sits
  const face = ctx.createRadialGradient(W / 2, wy + wh * 1.05, 4, W / 2, wy + wh * .6, Math.max(ww, wh) * .95);
  face.addColorStop(0, th.face[0]); face.addColorStop(.55, th.face[1]); face.addColorStop(1, th.face[2]);
  ctx.fillStyle = face; ctx.fillRect(wx, wy, ww, wh);
  const lamp = ctx.createRadialGradient(W / 2, wy + wh, 0, W / 2, wy + wh, wh * .9);
  // fade to the lamp's own colour, transparent: fading to transparent black greys the middle of the face
  lamp.addColorStop(0, th.glow); lamp.addColorStop(1, th.glow.replace(/,\s*[\d.]+\)$/, ',0)'));
  ctx.fillStyle = lamp; ctx.fillRect(wx, wy, ww, wh);
  if (th.vignette) {                                    // the face darkens towards its edges, away from the lamp
    const vg = ctx.createRadialGradient(W / 2, wy + wh * .95, Math.min(ww, wh) * .25, W / 2, wy + wh * .7, Math.max(ww * .62, wh * 1.1));
    vg.addColorStop(0, th.vignette.replace(/,\s*[\d.]+\)$/, ',0)')); vg.addColorStop(1, th.vignette);
    ctx.fillStyle = vg; ctx.fillRect(wx, wy, ww, wh);
  }

  // geometry: the pivot sits below the window, the scale is a wide shallow arc
  const half = 47 * Math.PI / 180;
  const fsMax = framed ? 22 : 13;                        // framed meters: figures grow with the meter
  const fs0 = Math.max(8, Math.min(fsMax, ww * .045));
  // as wide as the numbers at both ends allow; in a tall window the pivot comes up into view
  const Rw = (ww / 2 - 8) / Math.sin(half) - 11 - fs0 * 1.6;
  // framed and wide: a larger, flatter arc that takes more of the window (its ends stay inside it)
  const big = framed && ww > wh * 2.6;
  let R = Math.max(30, Math.min(Rw, wh * (big ? 1.55 : 1.18)));
  // the arc's top sits below the figures over it (framed: they grow with the meter)
  let cy = wy + (big ? Math.max(wh * .22, 11 * Math.max(1, fs0 / 13) + fs0 * 1.7 + 6) : wh * .22) + R;
  if (cy < wy + wh - 10) {                               // a tall window: pivot at the bottom, in view
    R = Math.max(30, Math.min(Rw, wh - 38 - fs0 * 1.6));
    const tall = R + 24 + fs0 * 1.6 + 30;                  // labels on top … pivot plate below
    cy = Math.min(wy + wh - 14, wy + (wh - tall) / 2 + R + 24 + fs0 * 1.6);
  }
  const cx = W / 2, hubIn = cy < wy + wh - 2;
  const ang = t => -Math.PI / 2 - half + t * 2 * half;
  const P = (t, r) => [cx + Math.cos(ang(t)) * r, cy + Math.sin(ang(t)) * r];
  // scale arcs: thin ink line, thick red band from 0 to +3
  ctx.lineCap = 'butt';
  const fs = Math.max(8, Math.min(fsMax, R * .085, fs0));
  const k = framed ? fs / 13 : 1;                        // line weights follow the figures
  const lk = k * (th.lineK || 1);                        // AZUL INTENSO draws its scale thicker
  ctx.beginPath(); ctx.arc(cx, cy, R, ang(0), ang(vuT(0))); ctx.strokeStyle = th.ink; ctx.lineWidth = 1.4 * lk; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, R + 3 * lk, ang(vuT(0)), ang(1)); ctx.strokeStyle = th.red; ctx.lineWidth = 6 * lk; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, R, ang(vuT(0)), ang(1)); ctx.strokeStyle = th.red; ctx.lineWidth = 1.4 * lk; ctx.stroke();
  // ticks and numbers
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  [[-20, 1], [-10, 1], [-7, 1], [-5, 1], [-3, 1], [-2, 1], [-1, 1], [0, 1], [1, 1], [2, 1], [3, 1], [-15, 0], [-4, 0], [-0.5, 0], [0.5, 0], [1.5, 0], [2.5, 0]].forEach(([db, major]) => {
    const t = vuT(db), [x1, y1] = P(t, R), [x2, y2] = P(t, R + (major ? 11 : 6) * k);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = db > 0 ? th.red : th.ink; ctx.lineWidth = (major ? 1.4 : 1) * lk; ctx.stroke();
    const few = R < 70;                                   // a very small meter: only the main figures
    if (major && (db >= -10 || db === -20) && !(R < 90 && (db === -2 || db === 2)) && !(few && ![-20, -10, -5, 0, 3].includes(db))) {
      const [tx, ty] = P(t, R + 11 * k + fs * .9);
      ctx.font = (db === 0 || framed ? 'bold ' : '') + fs + 'px Georgia, "Times New Roman", serif';
      ctx.fillStyle = db > 0 ? th.red : th.ink;
      ctx.fillText(db > 0 ? '+' + db : String(Math.abs(db)), tx, ty);
    }
  });
  // the percent scale under the arc
  ctx.font = Math.max(6, fs * .62) + 'px Georgia, serif'; ctx.fillStyle = th.soft;
  [[0, '0'], [vuT(-6), '50'], [vuT(0), '100']].forEach(([t, l]) => { const [x, y] = P(t, R - 10); ctx.fillText(l, x, y); });
  ctx.beginPath(); ctx.arc(cx, cy, R - 4, ang(0), ang(vuT(0))); ctx.strokeStyle = th.soft; ctx.lineWidth = .8; ctx.stroke();
  // VU and the − / + signs
  // the pivot below the window (a low meter): VU sits in the room left under the arc's top, sized to it,
  // and the − / + by the arc's ends, never on the scale
  const under = cy - R + 14 * k + fs * .9, room = wy + wh - 4 - under;
  const tfs = hubIn ? fs * 1.9 : Math.max(9, Math.min(fs * 1.9, room * .5));
  ctx.font = 'bold ' + Math.round(tfs) + 'px Georgia, "Times New Roman", serif'; ctx.fillStyle = th.ink;
  if (R >= 60) ctx.fillText(th.title, cx, hubIn ? cy - R * .42 : under + room * .5);   // a tiny meter has no room for it
  const sfs = hubIn ? fs * 1.3 : Math.max(8, Math.min(fs * 1.3, room * .35));
  ctx.font = 'bold ' + Math.round(sfs) + 'px Georgia, serif';
  if (hubIn || !big) {
    const sr = R * .78;
    { const [x, y] = P(-0.04, sr); ctx.fillText('−', x, Math.min(y, wy + wh * .86)); }
    { const [x, y] = P(1.03, sr); ctx.fillStyle = th.red; ctx.fillText('+', x, Math.min(y, wy + wh * .86)); }
  } else {                                              // under each end of the arc, at the height of VU
    const sy = under + room * .5, [lx0] = P(0, R), [rx0] = P(1, R);
    ctx.fillText('−', lx0 + (cx - lx0) * .32, sy);
    ctx.fillStyle = th.red; ctx.fillText('+', rx0 - (rx0 - cx) * .32, sy);
  }
  // peak lamp (lights on a near-clip peak)
  const lit = st.clip || st.samplePeak > -0.5;
  const lx = wx + ww - 16 * k, ly = wy + 14 * k;
  ctx.beginPath(); ctx.arc(lx, ly, 4.5 * k, 0, Math.PI * 2);
  ctx.fillStyle = lit ? '#ff3a26' : 'rgba(90,20,15,.55)'; ctx.shadowColor = '#ff3a26'; ctx.shadowBlur = lit ? 14 : 0; ctx.fill(); ctx.shadowBlur = 0;
  if (ww >= 180) { ctx.font = `bold ${Math.round(7 * k)}px ${framed ? 'Georgia, serif' : 'Arial, sans-serif'}`; ctx.fillStyle = framed ? th.ink : th.soft; ctx.textAlign = 'right'; ctx.fillText(th.sub, lx - 8 * k, ly + 1); }
  // needle (thin, with a counterweight below the window)
  const t = vuT(st.lvl), a = ang(t);
  ctx.save();
  ctx.shadowColor = th.needleGlow || 'rgba(0,0,0,.35)'; ctx.shadowBlur = th.needleGlow ? (th.lineK ? 10 : 6) : 3; ctx.shadowOffsetX = th.needleGlow ? 0 : 2; ctx.shadowOffsetY = th.needleGlow ? 0 : 2;
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * (R + 9 * k), cy + Math.sin(a) * (R + 9 * k));
  ctx.strokeStyle = th.needle; ctx.lineWidth = th.needleW || 1.6; ctx.lineCap = 'round'; ctx.stroke();
  ctx.restore();
  if (hubIn) {                                          // the pivot is in view: a small black hub on a plate
    ctx.beginPath(); ctx.arc(cx, cy, 13, Math.PI, 0); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fillStyle = '#111'; ctx.fill();
  }
  // glass: a soft diagonal reflection and the top shade of the bezel
  const gl = ctx.createLinearGradient(wx, wy, wx + ww * .7, wy + wh);
  const ga = th.glass ?? 1;
  gl.addColorStop(0, `rgba(255,255,255,${.22 * ga})`); gl.addColorStop(.35, `rgba(255,255,255,${.04 * ga})`); gl.addColorStop(.36, 'rgba(255,255,255,0)');
  ctx.fillStyle = gl; ctx.fillRect(wx, wy, ww, wh);
  const sh = ctx.createLinearGradient(0, wy, 0, wy + 14);
  sh.addColorStop(0, 'rgba(0,0,0,.35)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sh; ctx.fillRect(wx, wy, ww, 14);
  ctx.restore();
  const dbTxt = st.lvl <= DB_LO + 1 ? '-∞' : (st.lvl >= 0 ? '+' : '') + st.lvl.toFixed(1);
  if (!framed) {
    ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(wx, wy, ww, wh, 6); ctx.stroke();
    if (th.noRead) return;
    // readout on the bezel
    ctx.font = 'bold 10px Courier New'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = st.lvl >= 0 ? '#ff8a6a' : th.read;
    ctx.fillText(dbTxt + ' VU', W / 2, H - READ / 2 - 3);
    return;
  }
  vuWindowRing(ctx, wx, wy, ww, wh, rad);
  if (th.noRead) return;                                // AZUL INTENSO: the meter alone
  // the readout's black window, the level in mono figures
  const ry = wy + wh + rGap, rh = H - m - ry;
  ctx.beginPath(); ctx.roundRect(wx, ry, ww, rh, Math.max(3, rad * 0.5));
  ctx.fillStyle = '#040405'; ctx.fill();
  const ish = ctx.createLinearGradient(0, ry, 0, ry + rh * 0.5);
  ish.addColorStop(0, 'rgba(0,0,0,.6)'); ish.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = ish; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.font = `${Math.max(9, Math.round(rh * 0.5))}px "Consolas", "Lucida Console", "DejaVu Sans Mono", "Courier New", monospace`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = st.lvl >= 0 ? '#ff8a6a' : th.read; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 4;
  ctx.fillText(dbTxt.replace('-', '−') + ' VU', W / 2, ry + rh / 2 + 1);
  ctx.shadowBlur = 0;
}
// the meter frame's outer edge: lit along the top and left, in shadow along the bottom
function vuFrameEdge(ctx, W, H) {
  ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0.5, H - 1); ctx.lineTo(0.5, 0.5); ctx.lineTo(W - 1, 0.5); ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,.8)';
  ctx.beginPath(); ctx.moveTo(W - 0.5, 1); ctx.lineTo(W - 0.5, H - 0.5); ctx.lineTo(1, H - 0.5); ctx.stroke();
}
// the polished ring round a meter's window: a dark cut, a bright edge on top fading to dark at the bottom
function vuWindowRing(ctx, x, y, w, h, r) {
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.75)';
  ctx.beginPath(); ctx.roundRect(x - 1.5, y - 1.5, w + 3, h + 3, r + 1.5); ctx.stroke();
  const pol = ctx.createLinearGradient(0, y - 3, 0, y + h + 3);
  pol.addColorStop(0, 'rgba(220,224,230,.75)'); pol.addColorStop(.12, 'rgba(150,155,162,.45)'); pol.addColorStop(.6, 'rgba(70,74,80,.35)'); pol.addColorStop(1, 'rgba(160,165,172,.35)');
  ctx.lineWidth = 1.2; ctx.strokeStyle = pol;
  ctx.beginPath(); ctx.roundRect(x - 3.2, y - 3.2, w + 6.4, h + 6.4, r + 3); ctx.stroke();
  ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(0,0,0,.55)';
  ctx.beginPath(); ctx.roundRect(x + 0.5, y + 0.5, w - 1, h - 1, r); ctx.stroke();
}

function drawVU(canvas, ctx, st) {
  if (vuSkin === 'REEL70') return drawVUClassic(canvas, ctx, st, VU_THEMES.REEL70);
  if (vuSkin === 'BLUE') return drawVUClassic(canvas, ctx, st, VU_THEMES.BLUE);
  if (vuSkin === 'CREAM') return drawVUClassic(canvas, ctx, st, VU_THEMES.CREAM);
  if (vuSkin === 'COBALT') return drawVUClassic(canvas, ctx, st, VU_THEMES.COBALT);
  if (!vuFramed() || vuBox) return vuSkin === 'HIFI90' ? drawVUHiFi90(canvas, ctx, st) : drawVUStudio(canvas, ctx, st);
  // STUDIO and HI-FI 90s with the metal frames: the same black frame and polished ring round the whole face
  const W = canvas.offsetWidth || canvas.width, H = canvas.offsetHeight || canvas.height;
  const m = Math.max(6, Math.min(16, W * 0.022)), r = Math.max(6, Math.min(14, W * 0.014));
  ctx.clearRect(0, 0, W, H);
  const bz = ctx.createLinearGradient(0, 0, 0, H); bz.addColorStop(0, '#1c1e22'); bz.addColorStop(1, '#0b0c0e');
  ctx.fillStyle = bz; ctx.fillRect(0, 0, W, H);
  vuFrameEdge(ctx, W, H);
  if (W - 2 * m < 40 || H - 2 * m < 30) return;
  ctx.save(); ctx.translate(m, m); ctx.beginPath(); ctx.roundRect(0, 0, W - 2 * m, H - 2 * m, r); ctx.clip();
  vuBox = { w: W - 2 * m, h: H - 2 * m };
  try { vuSkin === 'HIFI90' ? drawVUHiFi90(canvas, ctx, st) : drawVUStudio(canvas, ctx, st); }
  finally { vuBox = null; ctx.restore(); }
  vuWindowRing(ctx, m, m, W - 2 * m, H - 2 * m, r);
}
function drawVUStudio(canvas, ctx, st) {
  const [W, H] = vuDims(canvas);

  ctx.clearRect(0, 0, W, H);

  // Panel bg
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0c0c16'); bg.addColorStop(1, '#060610');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  // ── GAUGE GEOMETRY ──
  const GAREA = H * 0.69;
  const cx = W / 2;
  const cy = GAREA * 0.91;
  const R  = Math.max(20, Math.min(GAREA * 0.73, cy - 34, (W / 2 - 18) / 0.87 - 28));

  // Dark gauge sector background
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, R + 26, A0, A1);
  ctx.closePath();
  const gaugeGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R + 26);
  gaugeGrad.addColorStop(0,   'rgba(8,8,20,0.0)');
  gaugeGrad.addColorStop(0.7, 'rgba(8,8,20,0.5)');
  gaugeGrad.addColorStop(1,   'rgba(8,8,20,0.9)');
  ctx.fillStyle = gaugeGrad;
  ctx.fill();

  // ── COLORED ZONES ──
  function drawZone(dbA, dbB, col, w) {
    ctx.beginPath();
    ctx.arc(cx, cy, R, db2a(dbA), db2a(dbB));
    ctx.strokeStyle = col; ctx.lineWidth = w;
    ctx.lineCap = 'butt'; ctx.stroke();
  }
  const ZW = 15;
  // Level-reactive: zones brighten as needle enters each region
  const gAct = st.lvl > DB_LO + 2 ? Math.min(1, (st.lvl - DB_LO) / 34) : 0;
  const yAct = st.lvl > -6        ? Math.min(1, (st.lvl + 6) / 6)       : 0;
  const rAct = st.lvl > 0         ? Math.min(1,  st.lvl / 3)             : 0;
  drawZone(DB_LO, -6,   `rgba(0,160,50,${(0.10 + gAct*0.40).toFixed(2)})`,    ZW + 10);
  drawZone(-6,    0,    `rgba(200,180,0,${(0.08 + yAct*0.40).toFixed(2)})`,    ZW + 10);
  drawZone(0,     DB_HI,`rgba(220,30,0,${(0.08 + rAct*0.48).toFixed(2)})`,    ZW + 10);
  drawZone(DB_LO, -6,  '#007a28', ZW);
  drawZone(-6,    0,   '#8a8000', ZW);
  drawZone(0,     DB_HI,'#aa2000', ZW);
  drawZone(DB_LO, -6,  `rgba(0,230,80,${(0.16 + gAct*0.60).toFixed(2)})`,  2);
  drawZone(-6,    0,   `rgba(255,240,0,${(0.12 + yAct*0.65).toFixed(2)})`,  2);
  drawZone(0,     DB_HI,`rgba(255,60,0,${(0.16 + rAct*0.70).toFixed(2)})`,  2);

  // ── TICK MARKS & LABELS ──
  const ticks = [
    {db:-40,lbl:'-40',maj:true }, {db:-30,lbl:'-30',maj:true },
    {db:-20,lbl:'-20',maj:true }, {db:-15,lbl:'',   maj:false},
    {db:-10,lbl:'-10',maj:true }, {db:-7, lbl:'',   maj:false},
    {db:-5, lbl:'-5', maj:true }, {db:-3, lbl:'',   maj:false},
    {db:-2, lbl:'',   maj:false}, {db:-1, lbl:'',   maj:false},
    {db:0,  lbl:'0',  maj:true }, {db:1,  lbl:'',   maj:false},
    {db:2,  lbl:'',   maj:false}, {db:3,  lbl:'+3', maj:true }
  ];

  ticks.forEach(({ db, lbl, maj }) => {
    const ang = db2a(db);
    const cos = Math.cos(ang), sin = Math.sin(ang);
    const ri  = R - ZW / 2 - 2;
    const ro  = R + ZW / 2 + 2 + (maj ? 6 : 2);
    ctx.beginPath();
    ctx.moveTo(cx + ri * cos, cy + ri * sin);
    ctx.lineTo(cx + ro * cos, cy + ro * sin);
    ctx.strokeStyle = maj ? '#666' : '#333'; ctx.lineWidth = maj ? 1.5 : 1;
    ctx.stroke();
    if (lbl) {
      const rl = ro + 11;
      ctx.font = (maj ? 'bold ' : '') + '9px Courier New';
      ctx.fillStyle = db >= 0 ? '#ff7755' : '#888';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(lbl, cx + rl * cos, cy + rl * sin);
    }
  });

  // ── PEAK HOLD ──
  if (st.peak > DB_LO + 1) {
    const pa = db2a(st.peak);
    const pc = Math.cos(pa), ps = Math.sin(pa);
    ctx.beginPath();
    ctx.moveTo(cx + (R - ZW / 2 - 1) * pc, cy + (R - ZW / 2 - 1) * ps);
    ctx.lineTo(cx + (R + ZW / 2 + 1) * pc, cy + (R + ZW / 2 + 1) * ps);
    ctx.strokeStyle = st.peak >= 0 ? '#ff5500' : '#ffee00';
    ctx.lineWidth = 3;
    ctx.shadowColor = st.peak >= 0 ? '#ff5500' : '#ffee00';
    ctx.shadowBlur  = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // ── NEEDLE ──
  const na = db2a(st.lvl);
  const nc = Math.cos(na), ns = Math.sin(na);

  // Shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur  = 5;
  ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 2;

  ctx.beginPath();
  ctx.moveTo(cx - nc * 12, cy - ns * 12); // slight overhang behind pivot
  ctx.lineTo(cx + (R + 22) * nc, cy + (R + 22) * ns);
  const needleGrad = ctx.createLinearGradient(
    cx - nc * 12, cy - ns * 12,
    cx + (R + 22) * nc, cy + (R + 22) * ns
  );
  needleGrad.addColorStop(0, '#888');
  needleGrad.addColorStop(0.4, '#f0e8c0');
  needleGrad.addColorStop(1, '#d0b888');
  ctx.strokeStyle = needleGrad;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();

  // Red jewel tip
  ctx.beginPath();
  ctx.arc(cx + (R + 22) * nc, cy + (R + 22) * ns, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = '#ff3311';
  ctx.shadowColor = '#ff4422'; ctx.shadowBlur = 10; ctx.fill();
  ctx.shadowBlur = 0;

  // Pivot cap
  ctx.beginPath();
  ctx.arc(cx, cy, 7, 0, Math.PI * 2);
  const pivGrad = ctx.createRadialGradient(cx - 2, cy - 2, 0, cx, cy, 7);
  pivGrad.addColorStop(0, '#aaa');
  pivGrad.addColorStop(1, '#333');
  ctx.fillStyle = pivGrad;
  ctx.fill();
  ctx.strokeStyle = '#555'; ctx.lineWidth = 1;
  ctx.stroke();

  // "VU" center label
  ctx.font = 'bold 12px Courier New';
  ctx.fillStyle = 'rgba(130,210,145,0.52)';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  // (left out when it would land on the dB readout below, in tall narrow panels)
  if (cy + R * 0.40 + 8 < GAREA + (H - GAREA) * 0.18 - 8) ctx.fillText('VU', W / 2, cy + R * 0.40);

  // ── CLIP LED ──
  const clipX = W - 18, clipY = 12;
  ctx.beginPath();
  ctx.arc(clipX, clipY, 5.5, 0, Math.PI * 2);
  if (st.clip) {
    ctx.fillStyle = '#ff2200';
    ctx.shadowColor = '#ff3300'; ctx.shadowBlur = 14;
  } else {
    ctx.fillStyle = '#220800';
    ctx.shadowBlur = 0;
  }
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.font = '7px Courier New';
  ctx.fillStyle = st.clip ? '#ff8866' : '#2a1206';
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  ctx.fillText('CLIP', clipX - 8, clipY);

  // ── dB READOUT ──
  const dbTxt = st.lvl <= DB_LO + 1 ? '-∞' : (st.lvl >= 0 ? '+' : '') + st.lvl.toFixed(1);
  ctx.font = 'bold 11px Courier New';
  ctx.fillStyle = st.lvl >= 0 ? '#ff7755' : '#88cc88';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(dbTxt + ' VU', W / 2, GAREA + (H - GAREA) * 0.18);

  // ── LED BAR ──
  const barX = 10, barY = GAREA + (H - GAREA) * 0.32;
  const barW = W - 20, barH = H - barY - 6;
  const N = 36;
  const segW = (barW - (N - 1)) / N;

  for (let i = 0; i < N; i++) {
    const segDb = DB_LO + (i / (N - 1)) * (DB_HI - DB_LO);
    const lit   = segDb <= st.lvl;
    const isPk  = Math.abs(segDb - st.peak) < (DB_HI - DB_LO) / N * 1.5;
    let col;
    if (segDb >= 0)        col = lit ? '#ff2200' : isPk ? '#992000' : '#200800';
    else if (segDb >= -6)  col = lit ? '#ddcc00' : isPk ? '#887800' : '#1c1800';
    else                   col = lit ? '#00cc44' : isPk ? '#007720' : '#071e0d';

    const sx = barX + i * (segW + 1);
    ctx.fillStyle = col;
    if (lit || isPk) {
      ctx.shadowColor = col;
      ctx.shadowBlur  = lit ? 5 : 3;
    } else {
      ctx.shadowBlur = 0;
    }
    ctx.fillRect(sx, barY, segW, barH);
    if (lit) {
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(sx, barY, segW, 1);
    }
  }
  ctx.shadowBlur = 0;

  // Bar frame
  ctx.strokeStyle = '#111120'; ctx.lineWidth = 1;
  ctx.strokeRect(barX - 1, barY - 1, barW + 2, barH + 2);
}
