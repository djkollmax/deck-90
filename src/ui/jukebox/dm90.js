'use strict';
// ═══════════════════════════════════════════════════════════
//  DM-90 DIGITAL MUSIC SERVER (7.10.0): the faceplate of the rack's music unit, double height (1200 × 560), in the
//  DT-90 and DC-90's materials (their metal, keys, screws and VFD, the same glyphs). It only draws and says what was
//  touched; ui/jukebox/jukebox.js gives it the song and the list and does what the keys ask.
//    const dm = new Deck90Music(container, { theme: 'silver' | 'black' });
//    dm.setNow({ title, artist, quality, index, total, elapsed, duration, playing, paused, online })
//    dm.setList({ header, right, rows: [{ text, sub, end, playing }], cursor, top, count })   // rows: the visible ones
//    dm.setModes({ repeat, shuffle }); dm.setView(key); dm.setLevels(l, r); dm.setPower(on); dm.setTheme(t); dm.setDimmer(0–2)
//    dm.onKey((key, { hold, index, double, delta, fraction }) => …)   keys: the ids in LAYOUT.keys, 'row' (a list
//      row clicked: index is its place among the visible rows), 'wheel' (the knob or the list: delta in rows),
//      'seek' (the scroll bar clicked or dragged: fraction 0–1 of the list)
// ═══════════════════════════════════════════════════════════
(function (global) {
// the DC-90's glyphs (5 × 7 dots) and seven-segment digits, the same on every unit of the rack
const DOT_GLYPHS = {
  ' ': [0, 0, 0, 0, 0, 0, 0],
  A: [14, 17, 17, 31, 17, 17, 17],
  B: [30, 17, 17, 30, 17, 17, 30],
  C: [14, 17, 16, 16, 16, 17, 14],
  D: [30, 17, 17, 17, 17, 17, 30],
  E: [31, 16, 16, 30, 16, 16, 31],
  F: [31, 16, 16, 30, 16, 16, 16],
  G: [14, 17, 16, 23, 17, 17, 15],
  H: [17, 17, 17, 31, 17, 17, 17],
  I: [14, 4, 4, 4, 4, 4, 14],
  J: [7, 2, 2, 2, 18, 18, 12],
  K: [17, 18, 20, 24, 20, 18, 17],
  L: [16, 16, 16, 16, 16, 16, 31],
  M: [17, 27, 21, 21, 17, 17, 17],
  N: [17, 25, 25, 21, 19, 19, 17],
  O: [14, 17, 17, 17, 17, 17, 14],
  P: [30, 17, 17, 30, 16, 16, 16],
  Q: [14, 17, 17, 17, 21, 18, 13],
  R: [30, 17, 17, 30, 20, 18, 17],
  S: [15, 16, 16, 14, 1, 1, 30],
  T: [31, 4, 4, 4, 4, 4, 4],
  U: [17, 17, 17, 17, 17, 17, 14],
  V: [17, 17, 17, 17, 17, 10, 4],
  W: [17, 17, 17, 21, 21, 21, 10],
  X: [17, 17, 10, 4, 10, 17, 17],
  Y: [17, 17, 10, 4, 4, 4, 4],
  Z: [31, 1, 2, 4, 8, 16, 31],
  '0': [14, 17, 19, 21, 25, 17, 14],
  '1': [4, 12, 4, 4, 4, 4, 14],
  '2': [14, 17, 1, 2, 4, 8, 31],
  '3': [30, 1, 1, 14, 1, 1, 30],
  '4': [2, 6, 10, 18, 31, 2, 2],
  '5': [31, 16, 16, 30, 1, 1, 30],
  '6': [14, 16, 16, 30, 17, 17, 14],
  '7': [31, 1, 2, 4, 8, 8, 8],
  '8': [14, 17, 17, 14, 17, 17, 14],
  '9': [14, 17, 17, 15, 1, 1, 14],
  '.': [0, 0, 0, 0, 0, 12, 12],
  ',': [0, 0, 0, 0, 4, 4, 8],
  ':': [0, 12, 12, 0, 12, 12, 0],
  ';': [0, 12, 12, 0, 4, 4, 8],
  '-': [0, 0, 0, 31, 0, 0, 0],
  '_': [0, 0, 0, 0, 0, 0, 31],
  '/': [1, 2, 2, 4, 8, 8, 16],
  '\\': [16, 8, 8, 4, 2, 2, 1],
  '+': [0, 4, 4, 31, 4, 4, 0],
  '=': [0, 0, 31, 0, 31, 0, 0],
  '(': [2, 4, 8, 8, 8, 4, 2],
  ')': [8, 4, 2, 2, 2, 4, 8],
  '[': [14, 8, 8, 8, 8, 8, 14],
  ']': [14, 2, 2, 2, 2, 2, 14],
  '?': [14, 17, 1, 2, 4, 0, 4],
  '!': [4, 4, 4, 4, 4, 0, 4],
  '&': [12, 18, 20, 8, 21, 18, 13],
  "'": [4, 4, 8, 0, 0, 0, 0],
  '"': [10, 10, 10, 0, 0, 0, 0],
  '*': [0, 21, 14, 31, 14, 21, 0],
  '#': [10, 10, 31, 10, 31, 10, 10],
  '%': [25, 25, 2, 4, 8, 19, 19],
  '@': [14, 17, 23, 21, 23, 16, 14],
  '<': [1, 2, 4, 8, 4, 2, 1],
  '>': [16, 8, 4, 2, 4, 8, 16],
  '|': [4, 4, 4, 4, 4, 4, 4],
  '°': [6, 9, 9, 6, 0, 0, 0],
  '·': [0, 0, 0, 4, 0, 0, 0],
  '…': [0, 0, 0, 0, 0, 0, 21],
  'Á': [4, 8, 14, 17, 31, 17, 17],
  'É': [4, 8, 31, 16, 30, 16, 31],
  'Í': [2, 4, 14, 4, 4, 4, 14],
  'Ó': [4, 8, 14, 17, 17, 17, 14],
  'Ú': [4, 8, 17, 17, 17, 17, 14],
  'Ü': [10, 0, 17, 17, 17, 17, 14],
  'Ñ': [10, 20, 17, 25, 21, 19, 17],
  'Ç': [14, 17, 16, 16, 17, 14, 4],
};

// Make common typographic punctuation work without an external fallback font.
DOT_GLYPHS['−'] = DOT_GLYPHS['-'];
DOT_GLYPHS['–'] = DOT_GLYPHS['-'];
DOT_GLYPHS['—'] = DOT_GLYPHS['-'];
DOT_GLYPHS['‘'] = DOT_GLYPHS["'"];
DOT_GLYPHS['’'] = DOT_GLYPHS["'"];
DOT_GLYPHS['“'] = DOT_GLYPHS['"'];
DOT_GLYPHS['”'] = DOT_GLYPHS['"'];
for (const character of 'abcdefghijklmnopqrstuvwxyzáéíóúüñç') {
  DOT_GLYPHS[character] = DOT_GLYPHS[character.toUpperCase()];
}

const SEVEN_SEGMENTS = {
  a: '5,1 25,1 28,4 25,7 5,7 2,4',
  b: '26,6 29,9 29,22 26,25 23,22 23,9',
  c: '26,27 29,30 29,43 26,46 23,43 23,30',
  d: '5,45 25,45 28,48 25,51 5,51 2,48',
  e: '4,27 7,30 7,43 4,46 1,43 1,30',
  f: '4,6 7,9 7,22 4,25 1,22 1,9',
  g: '5,23 25,23 28,26 25,29 5,29 2,26',
};

const DIGIT_MAP = {
  '0': ['a', 'b', 'c', 'd', 'e', 'f'],
  '1': ['b', 'c'],
  '2': ['a', 'b', 'g', 'e', 'd'],
  '3': ['a', 'b', 'g', 'c', 'd'],
  '4': ['f', 'g', 'b', 'c'],
  '5': ['a', 'f', 'g', 'c', 'd'],
  '6': ['a', 'f', 'g', 'e', 'c', 'd'],
  '7': ['a', 'b', 'c'],
  '8': ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
  '9': ['a', 'b', 'c', 'd', 'f', 'g'],
  '-': ['g'],
  ' ': [],
};
const SVG_NS = 'http://www.w3.org/2000/svg';
const LIT = 'var(--vfd,#80ffe5)', DIM = 'var(--vfd-dim,#193e34)';
const METER_LIT = i => i >= 21 ? '#ff4a3d' : i >= 18 ? '#ffd23a' : LIT, METER_DIM = i => i >= 21 ? '#40171299' : i >= 18 ? '#3d331299' : DIM;
const css = (name, fallback) => `var(--${name},var(--_d90-${name},${fallback}))`;
const clean = v => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').normalize('NFC').slice(0, 300);
const clamp = v => Number.isNaN(Number(v)) ? 0 : Math.min(1, Math.max(0, Number(v) || 0));
function node(name, attrs = {}) { const el = document.createElementNS(SVG_NS, name); for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v)); return el; }
// a character the glyphs don't have: its letter without the accent (Ö → O, È → E), or '?'
function glyph(ch) {
  let g = DOT_GLYPHS[ch];
  if (g) return g;
  const base = ch.normalize('NFD').replace(/[̀-ͯ]/g, '');
  return DOT_GLYPHS[base] || DOT_GLYPHS[base.toUpperCase()] || DOT_GLYPHS['?'];
}
// 7.10.9: an accented capital is the full capital with its accent in a dot above the cell (in the 5 × 7 cell it
// had to shrink and looked lower case: BABASóNICOS)
const ACCENTS={'Á':['A',[3]],'É':['E',[3]],'Í':['I',[3]],'Ó':['O',[3]],'Ú':['U',[3]],'Ü':['U',[1,3]]};
// a line of dot-matrix text as one path (a long list redraws fast): round dots of a 5 × 7 cell, `max` characters
function dotsPath(text, x, y, pitch, max = 999) {
  const r = pitch * .42, d = [];   // 7.10.3: fuller dots, easier to read
  let i = 0;
  for (const ch of clean(text).toUpperCase()) {
    if (i >= max) break;
    const acc = ACCENTS[ch], rows = acc ? DOT_GLYPHS[acc[0]] : glyph(ch);
    for (let row = acc ? -1 : 0; row < 7; row++) for (let col = 0; col < 5; col++) if (row < 0 ? acc[1].includes(col) : rows[row] & (1 << (4 - col))) {
      const cx = x + (i * 6 + col + .5) * pitch, cy = y + (row + .5) * pitch;
      d.push(`M${(cx - r).toFixed(2)} ${cy.toFixed(2)}a${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(2 * r).toFixed(2)} 0a${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(-2 * r).toFixed(2)} 0`);
    }
    i++;
  }
  return d.join('');
}
// a text cut to `max` characters, with … when it was longer
const fit = (t, max) => { const a = [...clean(t)]; return a.length > max ? a.slice(0, Math.max(1, max - 1)).join('') + '…' : a.join(''); };

const ROWS = 10, ROW_Y = 174, ROW_H = 23.4, PITCH = 2.2;
const COLS = { main: { x: 70, max: 42 }, sub: { x: 640, max: 21 }, end: { right: 1132, max: 15 } };
const LAYOUT = Object.freeze({
  keys: {   // 7.10.3: narrower keys, and DIMMER and COLOR
    power: { x: 35, y: 445, w: 80, h: 32, label: 'POWER' },
    setup: { x: 35, y: 492, w: 80, h: 30, label: 'SETUP' },
    prev: { x: 145, y: 446, w: 100, h: 29, icon: 'prev' }, play: { x: 253, y: 446, w: 120, h: 29, icon: 'play' },
    pause: { x: 381, y: 446, w: 100, h: 29, icon: 'pause' }, stop: { x: 489, y: 446, w: 100, h: 29, icon: 'stop' },
    next: { x: 597, y: 446, w: 100, h: 29, icon: 'next' }, repeat: { x: 705, y: 446, w: 74, h: 29, label: 'REPEAT' },
    shuffle: { x: 787, y: 446, w: 74, h: 29, label: 'SHUFFLE' }, queue: { x: 869, y: 446, w: 92, h: 29, label: 'Q · PLAY NEXT' },
    dimmer: { x: 969, y: 446, w: 60, h: 29, label: 'DIMMER' },
    artists: { x: 145, y: 493, w: 100, h: 29, label: 'ARTISTS' }, albums: { x: 253, y: 493, w: 120, h: 29, label: 'ALBUMS' },
    songs: { x: 381, y: 493, w: 100, h: 29, label: 'SONGS' }, list: { x: 489, y: 493, w: 100, h: 29, label: 'QUEUE' },
    search: { x: 597, y: 493, w: 100, h: 29, label: 'SEARCH' }, back: { x: 705, y: 493, w: 74, h: 29, label: '◀ BACK' },
    enter: { x: 787, y: 493, w: 82, h: 29, label: 'ENTER ▶' }, all: { x: 877, y: 493, w: 84, h: 29, label: 'SHUFFLE ALL' },   // 7.10.4
    color: { x: 969, y: 493, w: 60, h: 29, label: 'COLOR' },
  },
  knob: { cx: 1100, cy: 484, r: 40 },
});
const NAMES = { power: 'POWER', setup: 'SETUP: el servidor Jellyfin', prev: 'Tema anterior', play: 'PLAY', pause: 'PAUSA', stop: 'STOP', next: 'Tema siguiente',
  repeat: 'REPEAT: toda la cola, un tema o apagado', shuffle: 'SHUFFLE: al azar', queue: 'Q: lo marcado suena después de este',
  artists: 'Artistas', albums: 'Álbumes', songs: 'Todos los temas', list: 'La cola', search: 'Buscar', back: 'Atrás', enter: 'ENTER: abrir o tocar lo marcado',
  dimmer: 'DIMMER: el brillo del display', all: 'SHUFFLE ALL: toda la biblioteca al azar', color: 'COLOR: el color de los displays del rack' };
const VIEW_KEYS = ['artists', 'albums', 'songs', 'list', 'search'];

function grainMarkup(label) {
  let seed = 904031, paths = '';
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < 34; i++) {
    const y = (.17 + i * .535 + random() * .17).toFixed(3), x = (random() * 255).toFixed(2), length = (120 + random() * 237).toFixed(2);
    paths += `<path d="M${x} ${y}h${length}" stroke="${label}" stroke-width=".16" opacity="${(.035 + random() * .055).toFixed(3)}"/>`;
    paths += `<path d="M${(Number(x) + 14.7).toFixed(2)} ${(Number(y) + .23).toFixed(3)}h${(Number(length) * .61).toFixed(2)}" stroke="#fff" stroke-width=".14" opacity="${(.035 + random() * .06).toFixed(3)}"/>`;
  }
  return paths;
}

function buildFaceplate(p) {
  const label = css('label', '#313332'), dim = css('label-dim', '#666c68'), edge = css('edge', '#838d86');
  const top = 'var(--face-top,var(--face,var(--_d90-face-top,#deded8)))', face = css('face', '#bfc3bc'), bottom = 'var(--face-bottom,var(--face,var(--_d90-face-bottom,#8e968e)))';
  const H = 560, DY = 36, DH = 386;
  return `<defs>
    <linearGradient id="${p}-chassis-metal" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#626a64"/><stop offset=".009" stop-color="#232a25"/><stop offset=".04" stop-color="#151b17"/>
      <stop offset=".93" stop-color="#1b221d"/><stop offset=".991" stop-color="#090d0b"/><stop offset="1" stop-color="#545d55"/>
    </linearGradient>
    <linearGradient id="${p}-plate-metal" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${bottom}"/><stop offset=".009" stop-color="${top}"/><stop offset=".028" stop-color="${face}"/>
      <stop offset=".10" stop-color="${top}"/><stop offset=".30" stop-color="${face}"/><stop offset=".72" stop-color="${face}"/>
      <stop offset=".84" stop-color="${top}"/><stop offset=".983" stop-color="${bottom}"/><stop offset=".994" stop-color="${bottom}"/>
      <stop offset="1" stop-color="${top}"/>
    </linearGradient>
    <linearGradient id="${p}-window-bevel" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#070b08"/><stop offset=".01" stop-color="#9ba79e"/><stop offset=".02" stop-color="#363e38"/>
      <stop offset=".04" stop-color="#070c09"/><stop offset=".96" stop-color="#010503"/><stop offset=".985" stop-color="#222c24"/>
      <stop offset=".995" stop-color="#a0aba0"/><stop offset="1" stop-color="#101811"/>
    </linearGradient>
    <linearGradient id="${p}-glass" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#09110e"/><stop offset=".03" stop-color="#020806"/><stop offset=".85" stop-color="#010604"/><stop offset="1" stop-color="#030a06"/>
    </linearGradient>
    <linearGradient id="${p}-key" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="var(--key-top,var(--_d90-key-top))"/><stop offset=".08" stop-color="var(--key-top,var(--_d90-key-top))"/>
      <stop offset=".18" stop-color="var(--key-face,var(--_d90-key-face))"/><stop offset=".78" stop-color="var(--key-face,var(--_d90-key-face))"/>
      <stop offset=".94" stop-color="var(--key-bottom,var(--_d90-key-bottom))"/><stop offset="1" stop-color="var(--key-top,var(--_d90-key-top))"/>
    </linearGradient>
    <radialGradient id="${p}-knob" cx="38%" cy="30%" r="75%">
      <stop offset="0" stop-color="var(--key-top,var(--_d90-key-top))"/><stop offset=".55" stop-color="var(--key-face,var(--_d90-key-face))"/>
      <stop offset="1" stop-color="var(--key-bottom,var(--_d90-key-bottom))"/>
    </radialGradient>
    <pattern id="${p}-metal-grain" width="612" height="18.4" patternUnits="userSpaceOnUse">${grainMarkup(label)}</pattern>
    <clipPath id="${p}-plate-clip"><rect x="4.8" y="4.8" width="1190.4" height="${H - 9.6}" rx="2.4"/></clipPath>
    <clipPath id="${p}-title-clip"><rect x="390" y="48" width="505" height="31"/></clipPath>
    <clipPath id="${p}-artist-clip"><rect x="390" y="89" width="505" height="22"/></clipPath>
    <clipPath id="${p}-quality-clip"><rect x="390" y="113" width="505" height="15"/></clipPath>
    <filter id="${p}-vfd-glow" x="-5%" y="-10%" width="110%" height="120%"><feGaussianBlur stdDeviation=".55" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="${p}-vfd-glow-hi" x="-5%" y="-10%" width="110%" height="120%"><feGaussianBlur stdDeviation="1.3" result="halo"/><feGaussianBlur in="SourceGraphic" stdDeviation=".5" result="blur"/>
      <feMerge><feMergeNode in="halo"/><feMergeNode in="halo"/><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <radialGradient id="${p}-screw-metal" cx="30%" cy="20%" r="79%">
      <stop offset="0" stop-color="#a4ada4"/><stop offset=".23" stop-color="#5c685e"/><stop offset=".60" stop-color="#263329"/><stop offset="1" stop-color="#0c140e"/>
    </radialGradient>
    <g id="${p}-rack-screw">
      <circle cx=".45" cy=".9" r="7.55" fill="#010403" opacity=".63"/>
      <circle r="7.1" fill="#121b14" stroke="${edge}" stroke-width=".65"/>
      <circle r="6.05" fill="url(#${p}-screw-metal)" stroke="#c4cfc1" stroke-opacity=".37" stroke-width=".42"/>
      <circle r="4.75" fill="none" stroke="#18281b" stroke-width=".42" opacity=".62"/>
      <path d="M-2.9-1.65L0-3.3l2.9 1.65v3.3L0 3.3l-2.9-1.65Z" fill="#071009" stroke="#70806e" stroke-width=".38"/>
      <path d="M-3.7-3.85A5.35 5.35 0 0 1 2.2-5" fill="none" stroke="#d9e4d4" stroke-width=".44" opacity=".47"/>
    </g>
  </defs>
  <g data-layer="faceplate">
    <rect x=".65" y=".65" width="1198.7" height="${H - 1.3}" rx="5.1" fill="url(#${p}-chassis-metal)" stroke="#080d0a" stroke-width="1.3"/>
    <rect x="2.1" y="2.1" width="1195.8" height="${H - 4.2}" rx="4" fill="#a5ada5" stroke="#030705" stroke-opacity=".8" stroke-width=".55"/>
    <rect x="4.35" y="4.35" width="1191.3" height="${H - 8.7}" rx="2.8" fill="url(#${p}-plate-metal)" stroke="#050b07" stroke-width=".65"/>
    <rect x="4.8" y="4.8" width="1190.4" height="${H - 9.6}" rx="2.4" fill="url(#${p}-metal-grain)" clip-path="url(#${p}-plate-clip)"/>
    <path d="M6 5.4H1194M5.4 6V${H - 6}" fill="none" stroke="#fff" stroke-opacity=".33" stroke-width=".65"/>
    <path d="M6 ${H - 5.1}H1194M1194.9 6V${H - 6}" fill="none" stroke="#030805" stroke-opacity=".7" stroke-width=".9"/>
    <g font-family="Arial,Helvetica,sans-serif" fill="${label}">
      <text x="39" y="26" font-size="18" font-weight="700" letter-spacing="3.1">DECK 90</text>
      <text x="652" y="23" text-anchor="middle" font-size="10" font-weight="500" letter-spacing="1.8">DM-90 DIGITAL MUSIC SERVER</text>
    </g>
    <g font-family="Arial,Helvetica,sans-serif" fill="${dim}" font-size="7.1" letter-spacing="1.35">
      <text x="1153" y="23" text-anchor="end">NETWORK AUDIO · JELLYFIN</text>
      <text x="75" y="${H - 9}" text-anchor="middle" font-size="6.1">STANDBY</text>
      <text x="1100" y="540" text-anchor="middle" font-size="6.1">SELECT</text>
    </g>
    <path d="M35 31H1165" stroke="#050b07" stroke-opacity=".25" stroke-width=".7"/>
    <path d="M35 31.65H1165" stroke="#fff" stroke-opacity=".19" stroke-width=".5"/>
    <rect x="33.4" y="${DY - .2}" width="1133.2" height="${DH + 2.2}" rx="4.4" fill="#000" opacity=".5"/>
    <rect x="35" y="${DY}" width="1130" height="${DH}" rx="4.4" fill="url(#${p}-window-bevel)" stroke="${edge}" stroke-width=".7" data-role="display-window"/>
    <rect x="38.6" y="${DY + 3.3}" width="1122.8" height="${DH - 6.6}" rx="3.3" fill="#000302" stroke="#020705" stroke-width="1.4"/>
    <rect x="41.2" y="${DY + 5}" width="1117.6" height="${DH - 10}" rx="2.5" fill="url(#${p}-glass)"/>
    <path d="M45 ${DY + 5.3}H1155" stroke="#d9eee2" stroke-opacity=".14" stroke-width=".55"/>
    <path d="M45 ${DY + DH - 4.75}H1155" stroke="#9fb7a6" stroke-opacity=".23" stroke-width=".6"/>
    <path d="M35 433.2H1165" stroke="#050c07" stroke-width=".6" stroke-opacity=".27"/>
    <path d="M35 433.85H1165" stroke="#fff" stroke-width=".42" stroke-opacity=".19"/>
    <use href="#${p}-rack-screw" x="17" y="16"/><use href="#${p}-rack-screw" x="1183" y="16"/>
    <use href="#${p}-rack-screw" x="17" y="${H - 16}"/><use href="#${p}-rack-screw" x="1183" y="${H - 16}"/>
  </g>`;
}

class Deck90Music {
  constructor(container, { theme = 'silver' } = {}) {
    if (!container || !container.appendChild) throw new TypeError('Deck90Music needs a container element.');
    this.root = container; global.__deck90MusicCount = (global.__deck90MusicCount || 0) + 1; this.prefix = 'deck90dm-' + global.__deck90MusicCount;
    this._state = { theme: theme === 'black' ? 'black' : 'silver', powered: true, view: '',
      now: { title: '', artist: '', quality: '', index: 0, total: 0, elapsed: 0, duration: 0, playing: false, paused: false, online: false },
      list: { header: '', right: '', rows: [], cursor: -1, top: 0, count: 0 }, levels: { left: 0, right: 0 } };
    this._callbacks = new Set(); this._presses = new Map(); this._listeners = []; this._cache = {}; this._meterCounts = { left: -1, right: -1 };
    this._frame = null; this._remain = true; this._knobAngle = 0;
    this.svg = node('svg', { xmlns: SVG_NS, viewBox: '0 0 1200 560', width: '100%', preserveAspectRatio: 'xMidYMid meet', role: 'group', 'aria-label': 'DECK 90 DM-90 Digital Music Server' });
    Object.assign(this.svg.style, { width: '100%', height: 'auto', display: 'block', userSelect: 'none' });
    this._applyTheme();
    this.svg.innerHTML = buildFaceplate(this.prefix);
    this._display = node('g', { 'data-role': 'display', 'aria-hidden': 'true', filter: `url(#${this.prefix}-vfd-glow)` });
    this.svg.append(this._display);
    this._buildDisplay(); this._buildKeys(); this._buildKnob();
    this.root.appendChild(this.svg);
    this._renderNow(); this._renderList(); this._paintLevels(); this._schedule();
  }
  getState() { return JSON.parse(JSON.stringify(this._state)); }
  onKey(cb) { this._callbacks.add(cb); return () => this._callbacks.delete(cb); }
  setNow(u = {}) {
    const n = this._state.now;
    for (const k of ['title', 'artist', 'quality']) if (k in u) n[k] = clean(u[k]);
    for (const k of ['index', 'total', 'elapsed', 'duration']) if (k in u) n[k] = Math.max(0, Math.min(99999, Number(u[k]) || 0));
    for (const k of ['playing', 'paused', 'online']) if (k in u) n[k] = !!u[k];
    this._renderNow(); this._paintLevels(); this._schedule(); return this;
  }
  setList(u = {}) {
    const l = this._state.list;
    for (const k of ['header', 'right']) if (k in u) l[k] = clean(u[k]);
    if (Array.isArray(u.rows)) l.rows = u.rows.slice(0, ROWS).map(r => ({ text: clean(r.text), sub: clean(r.sub), end: clean(r.end), playing: !!r.playing, dim: !!r.dim }));
    for (const k of ['cursor', 'top', 'count']) if (k in u) l[k] = Number(u[k]) | 0;
    this._renderList(); return this;
  }
  setModes({ repeat = 'off', shuffle = false } = {}) { this._modes = { repeat: ['all', 'one'].includes(repeat) ? repeat : 'off', shuffle: !!shuffle }; this._paintModes(); this._updateLeds(); return this; }
  setView(key) { this._state.view = VIEW_KEYS.includes(key) ? key : ''; this._updateLeds(); return this; }
  setTimeMode(mode) { this._remain = mode !== 'elapsed'; this._cache.time = null; this._renderNow(); return this; }
  setLevels(left, right) { this._state.levels = { left: clamp(left), right: clamp(right) }; this._paintLevels(); return this; }
  // 7.10.3: DIMMER: 0 bright (a halo round the dots, the default), 1 brightest (a wider halo, the dim cells darker),
  // 2 low (for a dark room)
  setDimmer(level) { this._dim = [0, 1, 2].includes(level) ? level : 0; this._paintDim(); return this; }
  _paintDim() {
    const d = this._dim || 0;
    this._display.setAttribute('filter', `url(#${this.prefix}-vfd-glow${d === 2 ? '' : '-hi'})`);
    this._display.setAttribute('opacity', !this._state.powered ? '.035' : d === 2 ? '.6' : '1');
    this._display.style.filter = d === 1 ? 'brightness(1.25) saturate(1.1)' : '';
  }
  setPower(on) { this._state.powered = !!on; this._paintDim(); this._powerLed.setAttribute('fill', on ? LIT : DIM); this._paintLevels(); this._updateLeds(); this._schedule(); return this; }
  setTheme(theme) { this._state.theme = theme === 'black' ? 'black' : 'silver'; this._applyTheme(); return this; }
  rows() { return ROWS; }
  _emit(key, info = {}) { for (const cb of [...this._callbacks]) cb(key, Object.assign({ hold: false }, info)); }
  _listen(t, type, cb, opt) { t.addEventListener(type, cb, opt); this._listeners.push([t, type, cb, opt]); }
  _applyTheme() {
    const v = this._state.theme === 'black'
      ? { face: '#292c2d', 'face-top': '#484c4d', 'face-bottom': '#101415', label: '#d0d1cb', 'label-dim': '#969e97', edge: '#646a67', 'key-top': '#505659', 'key-face': '#272d30', 'key-bottom': '#0c1114', 'key-label': '#cdd2d1' }
      : { face: '#c7c5be', 'face-top': '#ece9df', 'face-bottom': '#92938d', label: '#2d302e', 'label-dim': '#686d67', edge: '#90958f', 'key-top': '#5c6366', 'key-face': '#30363a', 'key-bottom': '#101719', 'key-label': '#d2d7d5' };
    for (const [k, val] of Object.entries(v)) this.svg.style.setProperty('--_d90-' + k, val);
    this.svg.setAttribute('data-theme', this._state.theme);
  }
  _text(text, x, y, pitch, fill = LIT, attrs = {}) { return node('path', Object.assign({ d: dotsPath(text, x, y, pitch), fill }, attrs)); }
  _digits(x, y, count, scale, colon) {
    const g = node('g', { transform: `translate(${x} ${y}) scale(${scale})` }), cells = [];
    for (let i = 0; i < count; i++) {
      const cell = node('g', { transform: `translate(${i * 34 + (colon && i > 1 ? 10 : 0)} 0)` }), seg = {};
      for (const [name, pts] of Object.entries(SEVEN_SEGMENTS)) { seg[name] = node('polygon', { points: pts, fill: DIM }); cell.append(seg[name]); }
      cells.push(seg); g.append(cell);
    }
    if (colon) for (const cy of [18, 36]) g.append(node('circle', { cx: 70, cy, r: 2.5, fill: LIT }));
    this._display.append(g); return cells;
  }
  _paintDigits(cells, text) { for (let i = 0; i < cells.length; i++) { const on = DIGIT_MAP[text[i]] || []; for (const [n, s] of Object.entries(cells[i])) s.setAttribute('fill', on.includes(n) ? LIT : DIM); } }
  _buildDisplay() {
    const D = this._display, p = this.prefix;
    this._timeDigits = this._digits(58, 54, 4, 1.23, true);
    this._minus = node('rect', { x: 42, y: 83, width: 11, height: 5, rx: 1, fill: DIM }); D.append(this._minus);
    D.append(this._text('TRACK', 278, 53, 1.4));
    this._trackDigits = this._digits(276, 80, 4, .55, false);      // 7.10.13: four digits (SHUFFLE ALL queues thousands)
    this._total = node('path', { fill: LIT }); D.append(this._total);
    this._net = node('path', { fill: DIM, d: dotsPath('JELLYFIN', 278, 121, 1.05) }); D.append(this._net);
    const clip = (id, el) => { const g = node('g', { 'clip-path': `url(#${p}-${id}-clip)` }); g.append(el); D.append(g); return el; };
    this._title = clip('title', node('path', { fill: LIT }));
    this._artist = clip('artist', node('path', { fill: LIT }));
    this._quality = clip('quality', node('path', { fill: LIT }));
    D.append(node('rect', { x: 391, y: 133, width: 503, height: 2, fill: DIM }));
    this._progress = node('rect', { x: 391, y: 133, width: 0, height: 2, fill: LIT }); D.append(this._progress);
    this._indicators = {};
    for (const [word, x] of [['PLAY', 925], ['PAUSE', 996], ['NET', 1077]]) { this._indicators[word.toLowerCase()] = this._text(word, x, 55, 1.5, DIM); D.append(this._indicators[word.toLowerCase()]); }
    this._modeLamps = {};
    for (const [key, word, x] of [['repeat', 'REPEAT', 925], ['one', '1', 973], ['shuffle', 'SHUFFLE', 996]]) { this._modeLamps[key] = this._text(word, x, 121, 1.05, DIM); D.append(this._modeLamps[key]); }
    this._levelNodes = {};
    for (const [ch, letter, y] of [['left', 'L', 86], ['right', 'R', 108]]) {
      D.append(this._text(letter, 925, y - 1, 1.1));
      this._levelNodes[ch] = [];
      for (let i = 0; i < 24; i++) { const s = node('rect', { x: 943 + i * 8, y, width: 6, height: 7, rx: .6, fill: METER_DIM(i) }); D.append(s); this._levelNodes[ch].push(s); }
    }
    // the list: a line between, its header, ten rows, a scroll bar
    D.append(node('path', { d: 'M50 146.5H1150', stroke: DIM, 'stroke-width': 1 }));
    this._header = node('path', { fill: LIT }); this._headerRight = node('path', { fill: LIT }); D.append(this._header, this._headerRight);
    this._rowBar = node('rect', { x: 46, y: 0, width: 1092, height: 21, rx: 2, fill: LIT, opacity: 0 }); D.append(this._rowBar);
    this._rowNodes = [];
    for (let i = 0; i < ROWS; i++) {
      const y = ROW_Y + i * ROW_H;
      const hit = node('rect', { x: 44, y: y - 4, width: 1096, height: ROW_H, fill: 'transparent', 'data-row': i });
      hit.style.cursor = 'pointer';
      const mark = node('path', { fill: LIT }), main = node('path', { fill: LIT }), sub = node('path', { fill: LIT, opacity: .9 }), end = node('path', { fill: LIT });   // 7.10.3: brighter
      D.append(mark, main, sub, end); this._rowNodes.push({ y, mark, main, sub, end, hit });
    }
    D.append(node('rect', { x: 1143, y: ROW_Y - 3, width: 6, height: ROWS * ROW_H - 4, rx: 1.5, fill: DIM }));
    this._thumb = node('rect', { x: 1143, y: ROW_Y - 3, width: 6, height: 0, rx: 1.5, fill: LIT }); D.append(this._thumb);
    // the rows take clicks (the display ignores the pointer otherwise)
    this._hits = node('g', { 'data-role': 'list-rows' });
    for (const r of this._rowNodes) this._hits.append(r.hit);
    this.svg.append(this._hits);
    const rowOf = e => { const t = e.target.closest && e.target.closest('[data-row]'); return t ? Number(t.getAttribute('data-row')) : -1; };
    this._listen(this._hits, 'click', e => { const i = rowOf(e); if (i >= 0) this._emit('row', { index: i, double: false }); });
    this._listen(this._hits, 'dblclick', e => { const i = rowOf(e); if (i >= 0) this._emit('row', { index: i, double: true }); });
    let acc = 0;
    const wheel = e => { e.preventDefault(); acc += e.deltaY / (e.deltaMode === 1 ? 3 : 60); const n = Math.trunc(acc); if (n) { acc -= n; this._turnKnob(n); this._emit('wheel', { delta: n }); } };
    this._listen(this._hits, 'wheel', wheel, { passive: false });
    this._wheel = wheel;
    // 7.10.2: the scroll bar takes the pointer: a click on it jumps there, the thumb drags (a long list in a moment)
    const H = ROWS * ROW_H - 4, bar = node('rect', { x: 1137, y: ROW_Y - 6, width: 21, height: H + 6, fill: 'transparent', 'data-role': 'scrollbar' });
    bar.style.cursor = 'pointer'; this.svg.append(bar); this._bar = bar;
    const yOf = e => { const m = this.svg.getScreenCTM(); return m ? (e.clientY - m.f) / m.d : 0; };
    let grab = null;
    const seek = y => {
      const l = this._state.list; if (l.count <= ROWS) return;
      const h = Number(this._thumb.getAttribute('height')) || 8, f = Math.max(0, Math.min(1, (y - grab - (ROW_Y - 3)) / Math.max(1, H - h)));
      this._emit('seek', { fraction: f });
    };
    this._listen(bar, 'pointerdown', e => {
      if (e.button) return;
      e.preventDefault(); try { bar.setPointerCapture(e.pointerId); } catch (_) {}
      const y = yOf(e), ty = Number(this._thumb.getAttribute('y')), th = Number(this._thumb.getAttribute('height')) || 0;
      grab = y >= ty && y <= ty + th ? y - ty : th / 2;            // on the thumb: hold it where it was taken; elsewhere: its middle
      seek(y);
    });
    this._listen(bar, 'pointermove', e => { if (grab !== null) seek(yOf(e)); });
    const drop = () => { grab = null; };
    this._listen(bar, 'pointerup', drop); this._listen(bar, 'pointercancel', drop); this._listen(bar, 'lostpointercapture', drop);
    this._listen(bar, 'wheel', wheel, { passive: false });
  }
  _buildKeys() {
    this._buttons = {};
    const label = 'var(--key-label,var(--_d90-key-label,#d2d7d5))';
    const icons = { play: 'M-4-6L6 0L-4 6Z', stop: 'M-5-5H5V5H-5Z', pause: 'M-5-5H-1V5H-5ZM1-5H5V5H1Z', prev: 'M-7-5H-5V5H-7ZM-4 0L3-5V5ZM3 0L10-5V5Z', next: 'M7-5H9V5H7ZM-8-5L-1 0L-8 5ZM-1-5L6 0L-1 5Z' };
    for (const [key, b] of Object.entries(LAYOUT.keys)) {
      const g = node('g', { 'data-key': key, role: 'button', tabindex: 0, 'aria-label': NAMES[key] || key, 'aria-pressed': 'false' });
      g.style.cursor = 'pointer'; g.style.outline = 'none';
      const face = node('rect', { x: b.x, y: b.y, width: b.w, height: b.h, rx: 2.5, fill: `url(#${this.prefix}-key)`, stroke: 'var(--edge,var(--_d90-edge))', 'stroke-width': .9 });
      g.append(node('rect', { x: b.x, y: b.y + 1.8, width: b.w, height: b.h, rx: 2.5, fill: '#080e0a', opacity: .75 }), face,
        node('path', { d: `M${b.x + 3} ${b.y + 1.3}H${b.x + b.w - 3}`, stroke: '#fff', 'stroke-opacity': .35, 'stroke-width': .7 }));
      let icon = null;
      if (b.icon) { icon = node('path', { d: icons[b.icon], transform: `translate(${b.x + b.w / 2} ${b.y + b.h / 2})`, fill: label, 'pointer-events': 'none' }); g.append(icon); }
      else {                                                       // 7.10.9: bigger letters, as big as the key lets them be
        const n = b.label.length, size = Math.max(7, Math.min(key === 'power' ? 12 : 10.5, (b.w - 10 - (n - 1) * .7) / (n * .7)));
        const t = node('text', { x: b.x + b.w / 2, y: b.y + b.h / 2 + size * .36, 'text-anchor': 'middle', 'font-family': 'Arial,Helvetica,sans-serif', 'font-size': size, 'font-weight': 700, 'letter-spacing': .7, fill: label, 'pointer-events': 'none' }); t.textContent = b.label; g.append(t);
      }
      const led = node('rect', { x: b.x + 7, y: b.y + b.h - 3.6, width: b.w - 14, height: 1.2, fill: DIM, opacity: .25 }); g.append(led);
      this._buttons[key] = { g, face, led, icon, pressed: false, hover: false, focused: false };
      this.svg.append(g);
      const start = (e, kind) => {
        if (kind === 'pointer' && e.button !== undefined && e.button !== 0) return;
        if (this._presses.has(key)) return;
        e.preventDefault && e.preventDefault(); g.focus && g.focus();
        if (kind === 'pointer') try { g.setPointerCapture(e.pointerId); } catch (_) {}
        const press = { hold: false, timer: setTimeout(() => { if (this._presses.get(key) === press) { press.hold = true; this._emit(key, { hold: true }); } }, 1000) };
        this._presses.set(key, press); this._buttons[key].pressed = true; this._paintButton(key);
      };
      const finish = (e, cancel) => {
        const press = this._presses.get(key); if (!press) return;
        clearTimeout(press.timer); this._presses.delete(key); this._buttons[key].pressed = false; this._paintButton(key);
        if (!cancel && !press.hold) this._emit(key);
      };
      this._listen(g, 'pointerdown', e => start(e, 'pointer')); this._listen(g, 'pointerup', e => finish(e));
      this._listen(g, 'pointercancel', e => finish(e, true)); this._listen(g, 'lostpointercapture', e => finish(e, true));
      this._listen(g, 'pointerenter', () => { this._buttons[key].hover = true; this._paintButton(key); });
      this._listen(g, 'pointerleave', () => { this._buttons[key].hover = false; this._paintButton(key); });
      this._listen(g, 'focus', () => { this._buttons[key].focused = true; this._paintButton(key); });
      this._listen(g, 'blur', e => { this._buttons[key].focused = false; finish(e, true); this._paintButton(key); });
      this._listen(g, 'keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); if (!e.repeat) start(e, 'keyboard'); } });
      this._listen(g, 'keyup', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); finish(e); } });
    }
    this._powerLed = node('circle', { cx: 125, cy: 461, r: 2.2, fill: LIT }); this.svg.append(this._powerLed);
  }
  // the SELECT knob: turning it (the wheel, or dragging up and down) moves through the list
  _buildKnob() {
    const k = LAYOUT.knob, g = node('g', { 'data-role': 'select-knob', role: 'slider', tabindex: 0, 'aria-label': 'SELECT: recorre la lista' });
    g.style.cursor = 'ns-resize'; g.style.outline = 'none';
    g.append(node('circle', { cx: k.cx + .8, cy: k.cy + 2, r: k.r + 2, fill: '#000', opacity: .5 }),
      node('circle', { cx: k.cx, cy: k.cy, r: k.r + 1.5, fill: 'none', stroke: 'var(--edge,var(--_d90-edge))', 'stroke-width': 1 }),
      node('circle', { cx: k.cx, cy: k.cy, r: k.r, fill: `url(#${this.prefix}-knob)`, stroke: '#050a07', 'stroke-width': .8 }));
    const grip = node('g', {});
    for (let i = 0; i < 36; i++) { const a = i * Math.PI / 18; grip.append(node('path', { d: `M${k.cx + Math.cos(a) * (k.r - 6)} ${k.cy + Math.sin(a) * (k.r - 6)}L${k.cx + Math.cos(a) * (k.r - 1.5)} ${k.cy + Math.sin(a) * (k.r - 1.5)}`, stroke: '#fff', 'stroke-opacity': .12, 'stroke-width': 1 })); }
    this._knobMark = node('line', { x1: k.cx, y1: k.cy - k.r + 9, x2: k.cx, y2: k.cy - k.r + 19, stroke: LIT, 'stroke-width': 2.4, 'stroke-linecap': 'round' });
    g.append(grip, node('circle', { cx: k.cx, cy: k.cy, r: k.r * .55, fill: 'none', stroke: '#fff', 'stroke-opacity': .08 }), this._knobMark);
    this.svg.append(g); this._knob = g;
    this._listen(g, 'wheel', this._wheel, { passive: false });
    let dragY = null, acc = 0;
    this._listen(g, 'pointerdown', e => { dragY = e.clientY; acc = 0; try { g.setPointerCapture(e.pointerId); } catch (_) {} });
    this._listen(g, 'pointermove', e => {
      if (dragY === null) return;
      const box = this.svg.getBoundingClientRect(), unit = 14 * box.height / 560;   // 14 px of the drawing a row
      acc += (e.clientY - dragY) / unit; dragY = e.clientY;
      const n = Math.trunc(acc); if (n) { acc -= n; this._turnKnob(n); this._emit('wheel', { delta: n }); }
    });
    const up = () => { dragY = null; };
    this._listen(g, 'pointerup', up); this._listen(g, 'pointercancel', up);
    this._listen(g, 'keydown', e => {
      const d = { ArrowDown: 1, ArrowUp: -1, PageDown: ROWS, PageUp: -ROWS }[e.key];
      if (d) { e.preventDefault(); e.stopPropagation(); this._turnKnob(d); this._emit('wheel', { delta: d }); }
    });
  }
  _turnKnob(n) { const k = LAYOUT.knob; this._knobAngle = (this._knobAngle + n * 15) % 360; this._knobMark.setAttribute('transform', `rotate(${this._knobAngle} ${k.cx} ${k.cy})`); }
  _paintButton(key) {
    const b = this._buttons[key];
    b.face.setAttribute('fill', b.pressed ? 'var(--key-bottom,var(--_d90-key-bottom))' : b.hover ? 'var(--key-hover,var(--key-top,var(--_d90-key-top)))' : `url(#${this.prefix}-key)`);
    b.g.setAttribute('transform', b.pressed ? 'translate(0 .9)' : 'translate(0 0)');
    b.face.setAttribute('stroke', b.focused ? LIT : 'var(--edge,var(--_d90-edge))'); b.face.setAttribute('stroke-width', b.focused ? '1.7' : '.9');
  }
  _updateLeds() {
    const n = this._state.now, m = this._modes || { repeat: 'off', shuffle: false };
    for (const [key, b] of Object.entries(this._buttons)) {
      const on = this._state.powered && (key === 'power' || key === 'play' && n.playing || key === 'pause' && n.paused || key === 'repeat' && m.repeat !== 'off'
        || key === 'shuffle' && m.shuffle || key === this._state.view);
      b.led.setAttribute('fill', on ? LIT : DIM); b.led.setAttribute('opacity', on ? '.9' : '.22'); b.g.setAttribute('aria-pressed', String(on));
      if (b.icon) b.icon.setAttribute('fill', on ? LIT : 'var(--key-label,var(--_d90-key-label,#d2d7d5))');
    }
  }
  _paintModes() {
    const m = this._modes || { repeat: 'off', shuffle: false }, lit = { repeat: m.repeat !== 'off', one: m.repeat === 'one', shuffle: m.shuffle };
    for (const [k, el] of Object.entries(this._modeLamps)) el.setAttribute('fill', lit[k] ? LIT : DIM);
  }
  _renderNow() {
    const n = this._state.now, c = this._cache;
    const remain = this._remain && n.duration > 0, s = remain ? Math.ceil(Math.max(0, n.duration - n.elapsed)) : Math.floor(n.elapsed);
    const time = n.index ? String(Math.min(99, Math.floor(s / 60))).padStart(2, '0') + String(s % 60).padStart(2, '0') : '----';
    if (c.time !== time) { this._paintDigits(this._timeDigits, time); c.time = time; }
    this._minus.setAttribute('fill', remain && n.index ? LIT : DIM);
    const tr = n.total ? String(n.index % 10000).padStart(4, ' ') : '----';
    if (c.track !== tr) { this._paintDigits(this._trackDigits, tr); c.track = tr; }
    const total = n.total ? '/' + Math.min(99999, n.total) : '';
    if (c.total !== total) { this._total.setAttribute('d', dotsPath(total, 354, 107, .95)); c.total = total; }
    if (c.title !== n.title) { this._title.setAttribute('d', dotsPath(n.title, 0, 0, 3.3)); this._titleW = [...n.title].length * 19.8; this._titleT = performance.now(); c.title = n.title; }
    if (c.artist !== n.artist) { this._artist.setAttribute('d', dotsPath(n.artist, 0, 0, 2.15)); this._artistW = [...n.artist].length * 12.9; this._artistT = performance.now(); c.artist = n.artist; }
    if (c.quality !== n.quality) { this._quality.setAttribute('d', dotsPath(n.quality, 0, 0, 1.75)); this._qualityW = [...n.quality].length * 10.5; this._qualityT = performance.now(); c.quality = n.quality; }
    this._place(this._title, 53, this._titleW, this._titleT, performance.now());
    this._place(this._artist, 92, this._artistW, this._artistT, performance.now());
    this._place(this._quality, 116, this._qualityW, this._qualityT, performance.now());
    this._progress.setAttribute('width', String(n.duration > 0 ? 503 * clamp(n.elapsed / n.duration) : 0));
    const lit = { play: n.playing, pause: n.paused, net: n.online };
    for (const [k, el] of Object.entries(this._indicators)) el.setAttribute('fill', lit[k] ? LIT : DIM);
    this._net.setAttribute('fill', n.online ? LIT : DIM);
    this._updateLeds();
  }
  // a line too long for the window goes there and back, as the DC-90's (and even with Windows' animations off)
  _place(el, y, width, since, time) {
    const far = Math.max(0, (width || 0) - 502);
    let off = 0;
    if (far > 0 && this._state.powered) {
      const travel = far / 30 * 1000, delay = 1500, ph = Math.max(0, time - since) % (2 * travel + 2 * delay);
      off = ph > delay && ph < delay + travel ? (ph - delay) * .03 : ph >= delay + travel && ph < 2 * delay + travel ? far : ph >= 2 * delay + travel ? far - (ph - 2 * delay - travel) * .03 : 0;
    }
    el.setAttribute('transform', `translate(${(391 - off).toFixed(2)} ${y})`);
    return far > 0;
  }
  _renderList() {
    const l = this._state.list;
    this._header.setAttribute('d', dotsPath(fit(l.header, 64), 52, 154, 1.65));
    const right = fit(l.right, 36);
    this._headerRight.setAttribute('d', dotsPath(right, 1146 - [...right].length * 9.9 + 1.65, 154, 1.65));
    for (let i = 0; i < ROWS; i++) {
      const r = l.rows[i], n = this._rowNodes[i], sel = r && l.top + i === l.cursor;
      n.mark.setAttribute('d', r ? dotsPath(sel ? '>' : r.playing ? '*' : '', 52, n.y, PITCH) : '');
      n.main.setAttribute('d', r ? dotsPath(fit(r.text, r.sub ? COLS.main.max : 88), COLS.main.x, n.y, PITCH) : '');
      n.sub.setAttribute('d', r && r.sub ? dotsPath(fit(r.sub, COLS.sub.max), COLS.sub.x, n.y, PITCH) : '');
      const end = r ? fit(r.end, COLS.end.max) : '';
      n.end.setAttribute('d', end ? dotsPath(end, COLS.end.right - [...end].length * 6 * PITCH + PITCH, n.y, PITCH) : '');
      const o = !r ? 0 : sel || r.playing ? 1 : r.dim ? .55 : .96;
      n.main.setAttribute('opacity', o); n.mark.setAttribute('opacity', o);
      n.hit.style.pointerEvents = r ? 'auto' : 'none';
      if (sel) { this._rowBar.setAttribute('y', n.y - 3.2); this._rowBar.setAttribute('opacity', .15); }
    }
    if (!(l.cursor >= l.top && l.cursor < l.top + l.rows.length)) this._rowBar.setAttribute('opacity', 0);
    const H = ROWS * ROW_H - 4, h = l.count > ROWS ? Math.max(14, H * ROWS / l.count) : 0;
    this._thumb.setAttribute('height', h);
    this._thumb.setAttribute('y', ROW_Y - 3 + (l.count > ROWS ? (H - h) * l.top / Math.max(1, l.count - ROWS) : 0));
  }
  _paintLevels() {
    for (const ch of ['left', 'right']) {
      const count = this._state.powered && this._state.now.playing ? Math.round(this._state.levels[ch] * 24) : 0;
      if (count === this._meterCounts[ch]) continue;
      for (let i = 0; i < 24; i++) this._levelNodes[ch][i].setAttribute('fill', i < count ? METER_LIT(i) : METER_DIM(i));
      this._meterCounts[ch] = count;
    }
  }
  _schedule() { if (this._frame === null) this._frame = requestAnimationFrame(t => this._tick(t)); }
  _tick(t) {
    this._frame = null;
    const a = this._place(this._title, 53, this._titleW, this._titleT, t), b = this._place(this._artist, 92, this._artistW, this._artistT, t), c = this._place(this._quality, 116, this._qualityW, this._qualityT, t);
    if (a || b || c) this._schedule();
  }
}

global.Deck90Music = Deck90Music;
})(typeof globalThis !== 'undefined' ? globalThis : window);
