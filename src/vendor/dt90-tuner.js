/**
 * DECK 90 · DT-90 SYNTHESIZER TUNER — standalone, dependency-free SVG component.
 *
 * API:
 *   const tuner = new Deck90Tuner(container, { theme: 'silver' | 'black' });
 *   tuner.setRadio({ band, frequency, preset, name, text, stereo, mono,
 *                    tuned, auto, scan, memo, signal }); // partial updates
 *   tuner.setLevels(left, right); // normalized 0..1; reuses existing nodes
 *   const off = tuner.onKey((id, { hold }) => { ... });
 *   tuner.destroy();
 * Key IDs: power, band, tune-down, tune-up, scan, memo, mode, disp, m1..m6.
 * Short press emits on release; hold emits once at 1000 ms with no extra short.
 * Wheel on tuning knob: upward -> tune-up; downward -> tune-down.
 * Controls emit intents; the host applies the radio/power changes.
 * Optional helpers: setPower(bool), setTheme('silver'|'black'), getState().
 * FM: 87.50..108.00 MHz in .05 steps. AM: 530..1710 kHz in 10 steps.
 * CSS colors inherited from container: --vfd, --vfd-dim, --needle, --face,
 * --face-top, --face-bottom, --label, --label-dim, --edge, --key-top,
 * --key-bottom, --key-hover. No external images, fonts, imports or network.
 *
 * Deck 90 7.8.7, one small addition marked "internet only": setRadio({ frequency: null }) is a station heard
 * only over the internet (no dial position): the digits show dashes and the needle stays where it was; and
 * preset 0 is a station tuned outside the memories (M-). 7.9.0: setRadio({ label }) with frequency null writes the
 * label in big dot-matrix letters where the digits go (an internet station's name, "80S80S"), the digits and the
 * MHZ hidden.
 */
(function (global) {
'use strict';
/**
 * Original DECK 90 glyph geometry. No external fonts or resources.
 * DOT_GLYPHS: seven rows of five bits, bit 4 at the left edge.
 * SEVEN_SEGMENTS: SVG polygon point strings in a 30 x 52 cell.
 */
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

const DECIMAL_POINTS = '31,45 36,45 36,51 31,51';
const GLYPH_METRICS = { dotColumns: 5, dotRows: 7, digitWidth: 30, digitHeight: 52 };

/** Useful when porting the data or adding characters. Throws on malformed data. */
function validateGlyphs() {
  for (const [character, rows] of Object.entries(DOT_GLYPHS)) {
    if (rows.length !== 7 || rows.some(row => !Number.isInteger(row) || row < 0 || row > 31)) {
      throw new Error(`Invalid 5x7 glyph: ${character}`);
    }
  }
  for (const [digit, segments] of Object.entries(DIGIT_MAP)) {
    if (segments.some(name => !(name in SEVEN_SEGMENTS))) throw new Error(`Invalid digit: ${digit}`);
  }
  return true;
}

/** Static, original DECK 90 rack faceplate. All visible VFD content and controls
 * are added by the runtime. Every definition is scoped to the supplied prefix. */
const LAYOUT = Object.freeze({
  width: 1200, height: 220,
  display: { x: 160, y: 38, width: 720, height: 105 },
  displayContent: { x: 180, y: 48, width: 680, height: 80 },
  dial: { x: 165, y: 150, width: 710, height: 39 },
  needleTrack: { x1: 194, x2: 843, y1: 153, y2: 186 },
  knob: { cx: 992, cy: 91, r: 47 },
  buttons: {
    power: { x: 35, y: 74, width: 85, height: 35 },
    band: { x: 35, y: 119, width: 85, height: 26 },
    'tune-down': { x: 902, y: 97, width: 32, height: 25 },
    'tune-up': { x: 1070, y: 97, width: 32, height: 25 },
    scan: { x: 904, y: 158, width: 58, height: 24 },
    memo: { x: 966, y: 158, width: 58, height: 24 },
    mode: { x: 1028, y: 158, width: 58, height: 24 },
    disp: { x: 1090, y: 158, width: 58, height: 24 },
    m1: { x: 180, y: 192, width: 102, height: 20 },
    m2: { x: 294, y: 192, width: 102, height: 20 },
    m3: { x: 408, y: 192, width: 102, height: 20 },
    m4: { x: 522, y: 192, width: 102, height: 20 },
    m5: { x: 636, y: 192, width: 102, height: 20 },
    m6: { x: 750, y: 192, width: 102, height: 20 },
  },
});

const css = (name, fallback) => `var(--${name},var(--_d90-${name},${fallback}))`;
const n = value => Number(value.toFixed(3));
const fmX = frequency => 194 + (frequency - 87.5) / 20.5 * 649;
const amX = frequency => 194 + (frequency - 530) / 1180 * 649;

function printedDial() {
  const lines = [];
  // Both printed scales use the same left/right travel limits as the pointer.
  for (let i = 0; i <= 41; i++) {
    const x = fmX(87.5 + i * .5);
    const major = i % 4 === 1 || i === 0 || i === 41;
    lines.push(`<path d="M${n(x)} 163.5v${major ? 5 : 2.7}"/>`);
  }
  for (let i = 0; i <= 118; i++) {
    const frequency = 530 + i * 10;
    const x = amX(frequency);
    const major = frequency % 100 === 0 || i === 0 || i === 118;
    lines.push(`<path d="M${n(x)} 176.5v${major ? 5 : 2.6}"/>`);
  }
  const fm = [87.5, 90, 92, 94, 96, 98, 100, 102, 104, 106, 108];
  const am = [530, 600, 800, 1000, 1200, 1400, 1600, 1710];
  return `<g fill="none" stroke="#8B978F" stroke-width=".6" opacity=".9">${lines.join('')}</g>
  <g fill="#C1CAC0" font-family="Arial,Helvetica,sans-serif" font-size="7.4" text-anchor="middle" font-weight="400">
  ${fm.map(value => `<text x="${n(fmX(value))}" y="160.9">${value}</text>`).join('')}
  ${am.map(value => `<text x="${n(amX(value))}" y="185.2">${value}</text>`).join('')}
  </g>
  <g fill="#A7B4AA" font-family="Arial,Helvetica,sans-serif" font-size="7.1" font-weight="700">
  <text x="174" y="160.7">FM</text><text x="174" y="184.7">AM</text>
  </g>
  <path d="M193 172H844" stroke="#51635A" stroke-width=".45"/>
  <path d="M175 151.3H865" stroke="#000" stroke-opacity=".8" stroke-width="1.4"/>`;
}

function buildFaceplate(prefix) {
  if (!/^[A-Za-z_][\w.-]*$/.test(prefix)) throw new TypeError('A safe, unique SVG id prefix is required.');
  const p = prefix;
  const edge = css('edge', '#7B7E7C');
  const label = css('label', '#303532');
  const dim = css('label-dim', '#5B625D');
  const faceTop = 'var(--face-top,var(--face,var(--_d90-face-top,#E7E7E2)))';
  const faceBottom = 'var(--face-bottom,var(--face,var(--_d90-face-bottom,#A9ACA7)))';
  let knobTicks = '';
  for (let i = 0; i < 40; i++) {
    const angle = i * Math.PI / 20;
    const x1 = 992 + Math.sin(angle) * 50.8, y1 = 91 - Math.cos(angle) * 50.8;
    const x2 = 992 + Math.sin(angle) * 53.1, y2 = 91 - Math.cos(angle) * 53.1;
    knobTicks += `<path d="M${n(x1)} ${n(y1)}L${n(x2)} ${n(y2)}"/>`;
  }
  return `<defs>
  <linearGradient id="${p}-plate-metal" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${faceTop}"/><stop offset=".08" stop-color="${css('face', '#CDCFCA')}"/>
    <stop offset=".83" stop-color="${css('face', '#CDCFCA')}"/><stop offset="1" stop-color="${faceBottom}"/>
  </linearGradient>
  <linearGradient id="${p}-recess-bevel" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#343C38"/><stop offset=".12" stop-color="#080C0B"/>
    <stop offset=".9" stop-color="#070A09"/><stop offset="1" stop-color="#8C9890"/>
  </linearGradient>
  <linearGradient id="${p}-glass-shade" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#10201B"/><stop offset=".3" stop-color="#050B08"/>
    <stop offset="1" stop-color="#020705"/>
  </linearGradient>
  <linearGradient id="${p}-knob-metal" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${css('key-top', '#E4E5DF')}"/>
    <stop offset=".24" stop-color="${css('face-top', '#E9EAE5')}"/>
    <stop offset=".55" stop-color="${css('key-bottom', '#9A9E97')}"/>
    <stop offset=".75" stop-color="${css('key-top', '#D6D8D1')}"/>
    <stop offset="1" stop-color="${css('key-bottom', '#858C84')}"/>
  </linearGradient>
  <linearGradient id="${p}-knob-rim" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#EBEEE7"/><stop offset=".4" stop-color="#6D766D"/>
    <stop offset="1" stop-color="#191F1B"/>
  </linearGradient>
  <radialGradient id="${p}-screw-metal" cx="35%" cy="22%" r="75%">
    <stop offset="0" stop-color="#777E78"/><stop offset=".35" stop-color="#353C36"/>
    <stop offset="1" stop-color="#111612"/>
  </radialGradient>
  <pattern id="${p}-brushed-lines" width="13" height="3.8" patternUnits="userSpaceOnUse">
    <path d="M0 .5H13M2 2.1H10" stroke="${label}" stroke-width=".26" opacity=".16"/>
    <path d="M0 1.25H8M6 3.1H13" stroke="#FFF" stroke-width=".28" opacity=".17"/>
  </pattern>
  <clipPath id="${p}-static-plate-clip"><rect x="1" y="1" width="1198" height="218" rx="4"/></clipPath>
  <clipPath id="${p}-static-display-clip"><rect x="169" y="44" width="702" height="93" rx="4"/></clipPath>
  <clipPath id="${p}-static-dial-clip"><rect x="174" y="152" width="691" height="35" rx="2"/></clipPath>
  <g id="${p}-rack-screw">
    <circle cx=".5" cy=".8" r="7.4" fill="#000" opacity=".3"/>
    <circle r="7.1" fill="#111713" stroke="${edge}" stroke-width=".65"/>
    <circle r="5.7" fill="url(#${p}-screw-metal)" stroke="#A4ADA4" stroke-opacity=".25" stroke-width=".5"/>
    <path d="M-2.9-1.65L0-3.3l2.9 1.65v3.3L0 3.3l-2.9-1.65Z" fill="#080D0A" stroke="#657062" stroke-width=".4"/>
  </g>
  </defs>
  <g id="${p}-faceplate" data-layer="faceplate">
    <rect x=".7" y=".7" width="1198.6" height="218.6" rx="4" fill="url(#${p}-plate-metal)" stroke="${edge}" stroke-width="1.4"/>
    <rect x="1" y="1" width="1198" height="218" rx="4" fill="url(#${p}-brushed-lines)" clip-path="url(#${p}-static-plate-clip)"/>
    <path d="M5 3H1195M3 5V215" fill="none" stroke="#FFF" stroke-opacity=".32" stroke-width=".8"/>
    <path d="M5 217H1195M1197 5V215" fill="none" stroke="#000" stroke-opacity=".3" stroke-width="1"/>
    <path d="M32 33H1168" stroke="${dim}" stroke-opacity=".29" stroke-width=".7"/>
    <g fill="${label}" font-family="Arial,Helvetica,sans-serif">
      <text x="39" y="26" font-size="18" font-weight="700" letter-spacing="3.1">DECK 90</text>
      <text x="561" y="24.5" text-anchor="middle" font-size="10" font-weight="500" letter-spacing="1.75">DT-90 SYNTHESIZER TUNER</text>
      <text x="992" y="148.2" text-anchor="middle" font-size="8.4" letter-spacing="1.5">TUNING</text>
    </g>
    <g fill="${dim}" font-family="Arial,Helvetica,sans-serif" font-size="7.4" letter-spacing="1.4">
      <text x="78" y="165" text-anchor="middle">STANDBY</text>
      <text x="1125" y="25" text-anchor="end">FM / AM</text>
    </g>
    <rect x="159" y="37" width="722" height="107" rx="5.5" fill="#000" opacity=".22"/>
    <rect x="160" y="38" width="720" height="105" rx="5" fill="url(#${p}-recess-bevel)" stroke="${edge}" stroke-width=".8"/>
    <rect x="168" y="43" width="704" height="95" rx="4.1" fill="#010503"/>
    <rect x="169" y="44" width="702" height="93" rx="3.5" fill="url(#${p}-glass-shade)"/>
    <path d="M174 44.4H866" stroke="#ADDDD0" stroke-opacity=".11" stroke-width=".6"/>
    <path d="M174 137.2H866" stroke="#D7EAE2" stroke-opacity=".18" stroke-width=".6"/>
    <rect x="165" y="150" width="710" height="39" rx="3" fill="url(#${p}-recess-bevel)" stroke="${edge}" stroke-width=".55"/>
    <rect x="171" y="151.5" width="698" height="35.9" rx="2" fill="#111A15"/>
    ${printedDial()}
    <circle cx="992" cy="92.2" r="49.4" fill="#000" opacity=".28"/>
    <g fill="none" stroke="${dim}" stroke-width=".65" opacity=".7">${knobTicks}</g>
    <circle cx="992" cy="91" r="48.3" fill="#181F1A" stroke="#000" stroke-opacity=".35" stroke-width="1"/>
    <circle cx="992" cy="91" r="46.5" fill="url(#${p}-knob-rim)"/>
    <circle cx="992" cy="91" r="44.7" fill="url(#${p}-knob-metal)" stroke="#3B443D" stroke-width=".6"/>
    <circle cx="992" cy="91" r="42.2" fill="none" stroke="#FFF" stroke-opacity=".14" stroke-width=".65"/>
    <path d="M992 49.3v10" stroke="${label}" stroke-width="1.4" opacity=".85"/>
    <use href="#${p}-rack-screw" x="17" y="16"/><use href="#${p}-rack-screw" x="1183" y="16"/>
    <use href="#${p}-rack-screw" x="17" y="204"/><use href="#${p}-rack-screw" x="1183" y="204"/>
  </g>`;
}


const SVG_NS = 'http://www.w3.org/2000/svg';
const VFD = 'var(--vfd,#80ffe5)';
const DIM = 'var(--vfd-dim,#193e34)';
const NEEDLE = 'var(--needle,#ff5445)';
const normalized = value => Number.isNaN(Number(value)) ? 0 : Math.min(1, Math.max(0, Number(value) || 0));
const finite = value => Number.isFinite(Number(value));
const clean = value => String(value ?? '').replace(/[\u0000-\u001f]/g, ' ').normalize('NFC').slice(0, 256);
function node(name, attributes = {}) {
  const el = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) el.setAttribute(key, String(value));
  return el;
}

class Deck90Tuner {
  constructor(container, { theme = 'silver' } = {}) {
    if (typeof container === 'string') container = document.querySelector(container);
    if (!container?.appendChild) throw new TypeError('Deck90Tuner requires a container element.');
    this.root = container;
    global.__deck90TunerCount = (global.__deck90TunerCount || 0) + 1;
    this.prefix = `deck90tuner-${global.__deck90TunerCount}`;
    this._destroyed = false;
    this._listeners = [];
    this._callbacks = new Set();
    this._presses = new Map();
    this._cache = {};
    this._frame = null;
    this._previousTime = 0;
    this._state = {
      theme: theme === 'black' ? 'black' : 'silver', powered: true,
      radio: { band: 'FM1', frequency: 98.5, preset: 1, name: 'DECK 90 FM', text: 'SONIDO DE LOS 90', stereo: true, mono: false, tuned: true, auto: true, scan: false, memo: false, signal: 4 },
      levels: { left: 0, right: 0 },
    };
    this._needlePosition = this._fraction();
    this._needleTarget = this._needlePosition;
    this._meterCounts = { left: -1, right: -1 };
    this.svg = node('svg', { xmlns: SVG_NS, viewBox: '0 0 1200 220', width: '100%', role: 'group', 'aria-label': 'DECK 90 DT-90 synthesizer tuner', 'data-deck90-tuner': this.prefix, preserveAspectRatio: 'xMidYMid meet' });
    this.svg.style.width = '100%';
    this.svg.style.height = 'auto';
    this.svg.style.display = 'block';
    this.svg.style.userSelect = 'none';
    this.svg.style.touchAction = 'pan-y';
    this._applyTheme();
    this.svg.innerHTML = buildFaceplate(this.prefix);
    const defs = node('defs');
    defs.innerHTML = `<clipPath id="${this.prefix}-rds-clip"><rect x="181" y="116" width="678" height="18"/></clipPath>
      <filter id="${this.prefix}-vfd-glow" x="-15%" y="-20%" width="130%" height="140%"><feGaussianBlur stdDeviation=".7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <linearGradient id="${this.prefix}-key" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--key-top,var(--_d90-key-top))"/><stop offset=".15" stop-color="var(--face,var(--_d90-face))"/><stop offset="1" stop-color="var(--key-bottom,var(--_d90-key-bottom))"/></linearGradient>`;
    this.svg.append(defs);
    this._display = node('g', { 'data-role': 'display', filter: `url(#${this.prefix}-vfd-glow)`, 'aria-hidden': 'true' });
    this.svg.append(this._display);
    this._buildDisplay();
    this._buildNeedle();
    this._buildControls();
    this.root.appendChild(this.svg);
    this._motion = global.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (this._motion?.addEventListener) this._listen(this._motion, 'change', () => { this._previousTime = 0; this._schedule(); });
    this._renderRadio();
    this._paintNeedle();
    this._tick = this._tick.bind(this);
    this._schedule();
  }

  getState() { return JSON.parse(JSON.stringify(this._state)); }

  setRadio(update = {}) {
    this._assertAlive();
    if (!update || typeof update !== 'object') return this;
    const radio = this._state.radio;
    if (['FM1', 'FM2', 'FM3', 'AM'].includes(String(update.band).toUpperCase())) radio.band = String(update.band).toUpperCase();
    if ('frequency' in update && (update.frequency === null || update.frequency === '')) radio.frequency = null;   // internet only
    else if ('frequency' in update && finite(update.frequency)) radio.frequency = Number(update.frequency);
    const am = radio.band === 'AM';
    if (radio.frequency !== null) {
      radio.frequency = Math.max(am ? 530 : 87.5, Math.min(am ? 1710 : 108, radio.frequency));
      radio.frequency = am ? Math.round(radio.frequency / 10) * 10 : Math.round(radio.frequency * 20) / 20;
    }
    if ('preset' in update && finite(update.preset)) radio.preset = Math.max(0, Math.min(6, Math.round(Number(update.preset))));   // 0: no memory
    if ('signal' in update && finite(update.signal)) radio.signal = Math.max(0, Math.min(5, Math.round(Number(update.signal))));
    for (const key of ['name', 'text', 'label']) if (key in update) radio[key] = clean(update[key]);
    for (const key of ['stereo', 'mono', 'tuned', 'auto', 'scan', 'memo']) if (key in update) radio[key] = Boolean(update[key]);
    this._needleTarget = this._fraction();
    this._renderRadio();
    this._schedule();
    return this;
  }

  /** Two normalized input levels. No nodes are created, replaced or removed here. */
  setLevels(left, right) {
    this._assertAlive();
    this._state.levels.left = normalized(left);
    this._state.levels.right = normalized(right);
    this._paintLevels();
    return this;
  }

  onKey(callback) {
    this._assertAlive();
    if (typeof callback !== 'function') throw new TypeError('onKey requires a callback function.');
    this._callbacks.add(callback);
    return () => this._callbacks.delete(callback);
  }

  /** Optional helper: buttons emit intent; the host decides whether to switch power. */
  setPower(powered) {
    this._assertAlive();
    this._state.powered = Boolean(powered);
    this._display.setAttribute('opacity', powered ? '1' : '.035');
    this._needle.setAttribute('opacity', powered ? '1' : '.12');
    this._powerLed.setAttribute('fill', powered ? VFD : DIM);
    this._powerLed.setAttribute('opacity', powered ? '1' : '.6');
    this._paintLevels();
    this._updateButtonLeds();
    this._schedule();
    return this;
  }

  /** Optional helper; public CSS custom properties still take precedence. */
  setTheme(theme) {
    this._assertAlive();
    this._state.theme = theme === 'black' ? 'black' : 'silver';
    this._applyTheme();
    return this;
  }

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    if (this._frame !== null) cancelAnimationFrame(this._frame);
    for (const press of this._presses.values()) clearTimeout(press.timer);
    this._presses.clear();
    for (const [target, type, callback, options] of this._listeners) target.removeEventListener(type, callback, options);
    this._listeners.length = 0;
    this._callbacks.clear();
    this.svg.remove();
  }

  _assertAlive() { if (this._destroyed) throw new Error('Deck90Tuner has been destroyed.'); }

  _listen(target, type, callback, options) {
    target.addEventListener(type, callback, options);
    this._listeners.push([target, type, callback, options]);
  }

  _applyTheme() {
    const black = this._state.theme === 'black';
    const values = black ? {
      face: '#272c2b', 'face-top': '#454c48', 'face-bottom': '#151a18', label: '#d3d9d1', 'label-dim': '#929f95', edge: '#59635c', 'key-top': '#525b54', 'key-bottom': '#171e19',
    } : {
      face: '#ced1cb', 'face-top': '#f0f0e9', 'face-bottom': '#999f98', label: '#303932', 'label-dim': '#5c685e', edge: '#89918a', 'key-top': '#eceee7', 'key-bottom': '#949e92',
    };
    for (const [key, value] of Object.entries(values)) this.svg.style.setProperty(`--_d90-${key}`, value);
    this.svg.setAttribute('data-theme', this._state.theme);
  }

  _dots(text, x, y, pitch = 1.25, { fill = VFD, ghost = false } = {}) {
    const group = node('g', { transform: `translate(${x} ${y})`, fill });
    let column = 0;
    for (const char of clean(text).toUpperCase()) {
      const rows = DOT_GLYPHS[char] || DOT_GLYPHS['?'];
      for (let row = 0; row < 7; row++) for (let bit = 0; bit < 5; bit++) {
        const on = Boolean(rows[row] & (1 << (4 - bit)));
        if (!on && !ghost) continue;
        group.append(node('circle', { cx: (column * 6 + bit + .5) * pitch, cy: (row + .5) * pitch, r: pitch * .35, fill: on ? fill : DIM }));
      }
      column++;
    }
    return group;
  }

  _buildDisplay() {
    this._band = node('g', { 'data-role': 'band' });
    this._preset = node('g', { 'data-role': 'preset' });
    this._units = node('g', { 'data-role': 'units' });
    this._display.append(this._band, this._preset, this._units);
    this._digitNodes = [];
    this._digitGroups = [];
    const digitLayer = node('g', { transform: 'translate(238 48)', 'data-role': 'frequency' });
    for (let index = 0; index < 5; index++) {
      const group = node('g', { transform: `translate(${index * 34 + (index > 2 ? 8 : 0)} 0)` });
      const segments = {};
      for (const [name, points] of Object.entries(SEVEN_SEGMENTS)) {
        segments[name] = node('polygon', { points, fill: DIM, 'data-segment': name });
        group.append(segments[name]);
      }
      digitLayer.append(group);
      this._digitGroups.push(group);
      this._digitNodes.push(segments);
    }
    this._decimal = node('polygon', { points: DECIMAL_POINTS, transform: 'translate(68 0)', fill: VFD, 'data-role': 'decimal' });
    digitLayer.append(this._decimal);
    this._display.append(digitLayer);
    this._digitLayer = digitLayer;
    this._bigLabel = node('g', { 'data-role': 'big-label' });   // internet only: the name in place of the digits
    this._display.append(this._bigLabel);
    this._signal = [];
    const signal = node('g', { 'data-role': 'signal' });
    for (let i = 0; i < 5; i++) {
      const bar = node('rect', { x: 493 + i * 10, y: 83 - (i + 1) * 5, width: 6, height: (i + 1) * 5, rx: .6, fill: DIM });
      signal.append(bar); this._signal.push(bar);
    }
    signal.append(this._dots('SIGNAL', 489, 91, .95, { fill: DIM }));
    this._display.append(signal);
    this._indicators = {};
    for (const [word, x, y] of [['STEREO', 566, 49], ['MONO', 667, 49], ['TUNED', 768, 49], ['AUTO', 566, 69], ['MEMO', 667, 69], ['SCAN', 768, 69]]) {
      const indicator = this._dots(word, x, y, 1.45);
      indicator.setAttribute('data-indicator', word.toLowerCase());
      this._indicators[word.toLowerCase()] = indicator;
      this._display.append(indicator);
    }
    this._levelNodes = {};
    for (const [channel, letter, y] of [['left', 'L', 92], ['right', 'R', 103]]) {
      const group = node('g', { 'data-role': channel === 'left' ? 'level-l' : 'level-r' });
      group.append(this._dots(letter, 565, y - 1, .9));
      this._levelNodes[channel] = [];
      for (let i = 0; i < 24; i++) {
        const segment = node('rect', { x: 580 + i * 11.1, y, width: 8.6, height: 5.5, rx: .55, fill: DIM, 'data-index': i });
        group.append(segment); this._levelNodes[channel].push(segment);
      }
      this._display.append(group);
    }
    const rdsClip = node('g', { 'clip-path': `url(#${this.prefix}-rds-clip)`, 'data-role': 'rds-viewport' });
    this._rds = node('g', { 'data-role': 'rds-text' });
    rdsClip.append(this._rds); this._display.append(rdsClip);
  }

  _buildNeedle() {
    this._needle = node('g', { 'data-role': 'needle', filter: `url(#${this.prefix}-vfd-glow)`, 'aria-hidden': 'true' });
    this._needle.append(node('line', { x1: 0, x2: 0, y1: 153, y2: 186, stroke: NEEDLE, 'stroke-width': 2.2 }));
    this._needle.append(node('path', { d: 'M-3 152H3L0 156Z', fill: NEEDLE }));
    this.svg.append(this._needle);
    this._knobMarker = node('line', { x1: 992, y1: 51, x2: 992, y2: 62, stroke: 'var(--label,var(--_d90-label))', 'stroke-width': 2, 'stroke-linecap': 'round', 'data-role': 'knob-marker' });
    this.svg.append(this._knobMarker);
  }

  _buildControls() {
    this._buttons = {};
    const words = { power: 'POWER', band: 'BAND', 'tune-down': '◀', 'tune-up': '▶', scan: 'SCAN', memo: 'MEMO', mode: 'MODE', disp: 'DISP' };
    for (const [key, box] of Object.entries(LAYOUT.buttons)) {
      const group = node('g', { 'data-key': key, role: 'button', tabindex: 0, 'aria-label': key.startsWith('m') && /^m\d$/.test(key) ? `Memoria ${key.slice(1)}. Mantener un segundo para memorizar.` : words[key], 'aria-pressed': 'false' });
      group.style.cursor = 'pointer'; group.style.outline = 'none';
      const face = node('rect', { x: box.x, y: box.y, width: box.width, height: box.height, rx: 2.4, fill: `url(#${this.prefix}-key)`, stroke: 'var(--edge,var(--_d90-edge))', 'stroke-width': .9 });
      const shadow = node('rect', { x: box.x, y: box.y + 1.8, width: box.width, height: box.height, rx: 2.4, fill: '#080e0a', opacity: .75 });
      group.append(shadow, face);
      const highlight = node('path', { d: `M${box.x + 3} ${box.y + 1.3}H${box.x + box.width - 3}`, stroke: '#fff', 'stroke-opacity': .36, 'stroke-width': .7 });
      group.append(highlight);
      const text = node('text', { x: box.x + box.width / 2, y: box.y + box.height / 2 + 3, 'text-anchor': 'middle', 'font-family': 'Arial,Helvetica,sans-serif', 'font-size': key.startsWith('tune-') ? 9 : key === 'power' ? 10 : 8.8, 'font-weight': 700, 'letter-spacing': .7, fill: 'var(--label,var(--_d90-label))', 'pointer-events': 'none' });
      text.textContent = /^m\d$/.test(key) ? key.slice(1) : words[key];
      group.append(text);
      const led = node('rect', { x: box.x + 6, y: box.y + box.height - 3.7, width: box.width - 12, height: 1.2, fill: DIM, opacity: .4 });
      group.append(led);
      this._buttons[key] = { group, face, led, hover: false, pressed: false, focused: false };
      this.svg.append(group);
      const start = (event, kind) => {
        if (kind === 'pointer' && event.button !== undefined && event.button !== 0) return;
        if (this._presses.has(key)) return;
        event.preventDefault?.();
        group.focus?.();
        if (kind === 'pointer') { try { group.setPointerCapture?.(event.pointerId); } catch {} }
        const press = { kind, hold: false, timer: null };
        press.timer = setTimeout(() => { if (!this._destroyed && this._presses.get(key) === press) { press.hold = true; this._emit(key, true); } }, 1000);
        this._presses.set(key, press);
        this._buttons[key].pressed = true;
        this._paintButton(key);
      };
      const finish = (event, cancel = false) => {
        const press = this._presses.get(key);
        if (!press) return;
        clearTimeout(press.timer); this._presses.delete(key);
        this._buttons[key].pressed = false; this._paintButton(key);
        if (!cancel && !press.hold) this._emit(key, false);
      };
      this._listen(group, 'pointerdown', event => start(event, 'pointer'));
      this._listen(group, 'pointerup', event => finish(event));
      this._listen(group, 'pointercancel', event => finish(event, true));
      this._listen(group, 'lostpointercapture', event => finish(event, true));
      this._listen(group, 'pointerenter', () => { this._buttons[key].hover = true; this._paintButton(key); });
      this._listen(group, 'pointerleave', () => { this._buttons[key].hover = false; this._paintButton(key); });
      this._listen(group, 'focus', () => { this._buttons[key].focused = true; this._paintButton(key); });
      this._listen(group, 'blur', event => { this._buttons[key].focused = false; finish(event, true); this._paintButton(key); });
      this._listen(group, 'keydown', event => { if (event.key === 'Enter' || event.key === ' ' || event.code === 'Space') { event.preventDefault?.(); if (!event.repeat) start(event, 'keyboard'); } });
      this._listen(group, 'keyup', event => { if (event.key === 'Enter' || event.key === ' ' || event.code === 'Space') { event.preventDefault?.(); finish(event); } });
      this._listen(group, 'click', event => { if (event.detail === 0 && !this._presses.has(key)) this._emit(key, false); });
    }
    this._powerLed = node('circle', { cx: 77.5, cy: 60, r: 2.4, fill: VFD, 'data-role': 'power-led' });
    this.svg.append(this._powerLed);
    const knob = node('circle', { cx: 992, cy: 91, r: 48, fill: 'transparent', 'data-role': 'tuning-knob', role: 'slider', tabindex: 0, 'aria-label': 'Sintonía. Rueda o flechas para cambiar la frecuencia.', 'aria-valuemin': 87.5, 'aria-valuemax': 108, 'aria-valuenow': 98.5 });
    knob.style.cursor = 'ns-resize';
    this._listen(knob, 'wheel', event => { if (!event.deltaY) return; event.preventDefault?.(); this._emit(event.deltaY < 0 ? 'tune-up' : 'tune-down', false); }, { passive: false });
    this._listen(knob, 'keydown', event => {
      if (['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'].includes(event.key)) { event.preventDefault?.(); this._emit(['ArrowUp', 'ArrowRight'].includes(event.key) ? 'tune-up' : 'tune-down', false); }
    });
    this._knob = knob; this.svg.append(knob);
  }

  _paintButton(key) {
    const button = this._buttons[key];
    button.face.setAttribute('fill', button.pressed ? 'var(--key-bottom,var(--_d90-key-bottom))' : button.hover ? 'var(--key-hover,var(--key-top,var(--_d90-key-top)))' : `url(#${this.prefix}-key)`);
    button.group.setAttribute('transform', button.pressed ? 'translate(0 .9)' : 'translate(0 0)');
    button.face.setAttribute('stroke', button.focused ? VFD : 'var(--edge,var(--_d90-edge))');
    button.face.setAttribute('stroke-width', button.focused ? '1.7' : '.9');
    button.group.setAttribute('data-pressed', String(button.pressed));
  }

  _emit(key, hold) {
    if (this._destroyed) return;
    for (const callback of [...this._callbacks]) callback(key, { hold: Boolean(hold) });
  }

  _fraction() {
    const { band, frequency } = this._state.radio;
    if (frequency === null) return this._needleTarget ?? 0;   // internet only: the needle stays
    return band === 'AM' ? (frequency - 530) / 1180 : (frequency - 87.5) / 20.5;
  }

  _renderRadio() {
    const radio = this._state.radio;
    const am = radio.band === 'AM';
    if (this._cache.am !== am) {
      for (let index = 0; index < 5; index++) this._digitGroups[index].setAttribute('transform', `translate(${index * 34 + (!am && index > 2 ? 8 : 0)} 0)`);
      this._cache.am = am;
    }
    const net = radio.frequency === null;                   // internet only
    const digitText = net ? '-----' : am ? String(Math.round(radio.frequency)).padStart(5, ' ') : radio.frequency.toFixed(2).replace('.', '').padStart(5, ' ');
    if (this._cache.digits !== digitText) {
      for (let index = 0; index < 5; index++) {
        const on = DIGIT_MAP[digitText[index]] || [];
        for (const [name, segment] of Object.entries(this._digitNodes[index])) segment.setAttribute('fill', on.includes(name) ? VFD : DIM);
      }
      this._cache.digits = digitText;
    }
    this._decimal.setAttribute('opacity', am || net ? '0' : '1');
    const big = net && radio.label ? radio.label.toUpperCase().slice(0, 14) : '';
    if (this._cache.big !== big) {
      const pitch = big ? Math.min(6.4, 236 / ([...big].length * 6)) : 1;
      this._bigLabel.replaceChildren(...(big ? [this._dots(big, 236, 48 + (52 - 7 * pitch) / 2, pitch)] : []));
      this._digitLayer.setAttribute('opacity', big ? '0' : '1');
      this._units.setAttribute('opacity', big ? '0' : '1');
      this._cache.big = big;
    }
    if (this._cache.band !== radio.band) { this._band.replaceChildren(this._dots(radio.band, 181, 53, 1.75)); this._cache.band = radio.band; }
    if (this._cache.preset !== radio.preset) { this._preset.replaceChildren(this._dots(radio.preset ? `M${radio.preset}` : 'M-', 182, 82, 1.8)); this._cache.preset = radio.preset; }
    const unit = am ? 'KHZ' : 'MHZ';
    if (this._cache.unit !== unit) { this._units.replaceChildren(this._dots(unit, 434, 76, 1.65)); this._cache.unit = unit; }
    for (const [key, indicator] of Object.entries(this._indicators)) {
      const lit = key === 'stereo' ? radio.stereo && !radio.mono : radio[key];
      indicator.setAttribute('fill', lit ? VFD : DIM);
      for (const dot of indicator.children) dot.setAttribute('fill', lit ? VFD : DIM);
    }
    for (let i = 0; i < 5; i++) this._signal[i].setAttribute('fill', i < radio.signal ? VFD : DIM);
    const text = clean([radio.name, radio.text].filter(Boolean).join(' - ')) || 'DECK 90';
    if (this._cache.rds !== text) {
      this._rds.replaceChildren(this._dots(text, 0, 0, 1.8));
      this._rds.setAttribute('transform', 'translate(182 119)');
      this._rdsWidth = [...text.toUpperCase()].length * 10.8;
      this._rdsStarted = performance.now();
      this._cache.rds = text;
    }
    this._knob.setAttribute('aria-valuemin', am ? '530' : '87.5');
    this._knob.setAttribute('aria-valuemax', am ? '1710' : '108');
    const said = net ? 'internet' : `${radio.frequency.toFixed(am ? 0 : 2)} ${am ? 'kHz' : 'MHz'}`;
    this._knob.setAttribute('aria-valuenow', String(net ? '' : radio.frequency));
    this._knob.setAttribute('aria-valuetext', said);
    this.svg.setAttribute('aria-label', `DECK 90. ${radio.band} ${said}. Memoria ${radio.preset}. ${text}`);
    this._updateButtonLeds();
  }

  _updateButtonLeds() {
    const radio = this._state.radio;
    for (const [key, button] of Object.entries(this._buttons)) {
      const active = this._state.powered && (key === `m${radio.preset}` || key === 'scan' && radio.scan || key === 'memo' && radio.memo || key === 'mode' && radio.mono || key === 'power');
      button.led.setAttribute('fill', active ? VFD : DIM);
      button.led.setAttribute('opacity', active ? '.9' : '.22');
      button.group.setAttribute('aria-pressed', String(active));
    }
  }

  _paintLevels() {
    for (const channel of ['left', 'right']) {
      const count = this._state.powered ? Math.round(this._state.levels[channel] * this._levelNodes[channel].length) : 0;
      if (this._meterCounts[channel] === count) continue;
      for (let index = 0; index < this._levelNodes[channel].length; index++) this._levelNodes[channel][index].setAttribute('fill', index < count ? VFD : DIM);
      this._meterCounts[channel] = count;
    }
  }

  _paintNeedle() {
    const x = 194 + this._needlePosition * 649;
    this._needle.setAttribute('transform', `translate(${x.toFixed(3)} 0)`);
    this._knobMarker.setAttribute('transform', `rotate(${(-135 + this._needlePosition * 270).toFixed(3)} 992 91)`);
  }

  _schedule() {
    if (this._destroyed || this._frame !== null) return;
    this._frame = requestAnimationFrame(time => this._tick(time));
  }

  _tick(time) {
    if (this._destroyed) return;
    this._frame = null;
    const dt = this._previousTime ? Math.min(64, Math.max(0, time - this._previousTime)) : 16;
    this._previousTime = time;
    const reduceMotion = this._motion?.matches;
    const difference = this._needleTarget - this._needlePosition;
    if (Math.abs(difference) > .00003) {
      this._needlePosition = reduceMotion ? this._needleTarget : this._needlePosition + difference * (1 - Math.exp(-dt / 100));
      this._paintNeedle();
    } else if (difference !== 0) { this._needlePosition = this._needleTarget; this._paintNeedle(); }
    const distance = Math.max(0, (this._rdsWidth || 0) - 674);
    let scroll = false;
    if (distance > 0 && this._state.powered && !reduceMotion) {
      const travel = distance / 32 * 1000, delay = 1400, cycle = 2 * travel + 2 * delay;
      const phase = Math.max(0, time - this._rdsStarted) % cycle;
      let offset = 0;
      if (phase > delay && phase < delay + travel) offset = (phase - delay) * .032;
      else if (phase >= delay + travel && phase < delay * 2 + travel) offset = distance;
      else if (phase >= delay * 2 + travel) offset = distance - (phase - delay * 2 - travel) * .032;
      this._rds.setAttribute('transform', `translate(${(182 - offset).toFixed(3)} 119)`);
      scroll = true;
    } else this._rds.setAttribute('transform', 'translate(182 119)');
    if (scroll || Math.abs(this._needleTarget - this._needlePosition) > .00003) this._schedule();
  }
}

global.Deck90Tuner = Deck90Tuner;
})(typeof globalThis !== 'undefined' ? globalThis : window);
