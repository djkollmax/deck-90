/**
 * DECK 90 · DT-90 SYNTHESIZER TUNER — material revision 2, matching the DC-90.
 *
 * API:
 *   const tuner = new Deck90Tuner(container, { theme: 'silver' | 'black' });
 *   tuner.setRadio({ band, frequency, preset, name, text, stereo, mono,
 *                    tuned, auto, scan, memo, signal }); // partial updates
 *   tuner.setLevels(left, right); // normalized 0..1; reuses existing nodes
 *   const off = tuner.onKey((id, { hold }) => { ... });
 *   tuner.destroy();
 * Key IDs: power, band-fm1..band-am (Deck 90), tune-down, tune-up, scan, memo, mode, disp, m1..m6.
 * Short press emits on release; hold emits once at 1000 ms with no extra short.
 * Wheel on tuning knob: upward -> tune-up; downward -> tune-down.
 * Controls emit intents; the host applies the radio/power changes.
 * Optional helpers: setPower(bool), setTheme('silver'|'black'), getState().
 * FM: 87.50..108.00 MHz in .05 steps. AM: 530..1710 kHz in 10 steps.
 * CSS colors inherited from container: --vfd, --vfd-dim, --needle, --face,
 * --face-top, --face-bottom, --label, --label-dim, --edge, --key-top,
 * --key-face, --key-bottom, --key-label, --key-hover. ViewBox1200x280.
 * No external images, fonts, imports or network.
 *
 * Deck 90 7.9.11 (realistic revision), patches marked in the code: setRadio({ frequency: null }) is an
 * internet-only station (digits show dashes, the needle hides) and setRadio({ label }) then writes its name
 * big where the digits go; preset 0 shows M-; band FM4; MODE has no lamp (it picks the text line in Deck 90);
 * the RDS line scrolls even with Windows' animations off.
 * Deck 90 7.9.21: setRadio({ quality, place }) writes the stream's quality after TUNED and where the station is
 * under the memory.
 * Deck 90 7.10.7: a sixth band key, HI-FI (band-hifi, band 'HIFI'), between FM4 and AM; the memories narrower.
 * Deck 90 7.10.9: bigger key letters, fitted to each key (keyFont); accented capitals full height, the accent above.
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

/** DT-90 material revision matching the DC-90 rack. Native SVG, no external assets. */
// Deck 90 7.9.11: the BAND key is five direct band keys (FM1 FM2 FM3 FM4 AM, ids band-fm1..band-am); memories narrower
// Deck 90 7.10.7: six, HI-FI (band-hifi) before AM; the memories narrower again (69 wide, from x 406)
const LAYOUT=Object.freeze({
  "width": 1200,
  "height": 280,
  "display": {
    "x": 35,
    "y": 36,
    "width": 1130,
    "height": 104
  },
  "displayContent": {
    "x": 51,
    "y": 46,
    "width": 1098,
    "height": 84
  },
  "dial": {
    "x": 35,
    "y": 153,
    "width": 850,
    "height": 58
  },
  "needleTrack": {
    "x1": 65,
    "x2": 854,
    "y1": 158,
    "y2": 205
  },
  "knob": {
    "cx": 1045,
    "cy": 184,
    "r": 40
  },
  "powerLed": {
    "x": 125,
    "y": 248,
    "r": 2.2
  },
  "buttons": {
    "power": {
      "x": 35,
      "y": 233,
      "width": 80,
      "height": 29
    },
    "band-fm1": {
      "x": 134,
      "y": 235,
      "width": 40,
      "height": 26
    },
    "band-fm2": {
      "x": 178,
      "y": 235,
      "width": 40,
      "height": 26
    },
    "band-fm3": {
      "x": 222,
      "y": 235,
      "width": 40,
      "height": 26
    },
    "band-fm4": {
      "x": 266,
      "y": 235,
      "width": 40,
      "height": 26
    },
    "band-hifi": {
      "x": 310,
      "y": 235,
      "width": 40,
      "height": 26
    },
    "band-am": {
      "x": 354,
      "y": 235,
      "width": 40,
      "height": 26
    },
    "tune-down": {
      "x": 925,
      "y": 174,
      "width": 30,
      "height": 28
    },
    "tune-up": {
      "x": 1132,
      "y": 174,
      "width": 30,
      "height": 28
    },
    "scan": {
      "x": 900,
      "y": 235,
      "width": 59,
      "height": 26
    },
    "memo": {
      "x": 967,
      "y": 235,
      "width": 59,
      "height": 26
    },
    "mode": {
      "x": 1034,
      "y": 235,
      "width": 59,
      "height": 26
    },
    "disp": {
      "x": 1101,
      "y": 235,
      "width": 59,
      "height": 26
    },
    "m1": {
      "x": 406,
      "y": 235,
      "width": 69,
      "height": 26
    },
    "m2": {
      "x": 485,
      "y": 235,
      "width": 69,
      "height": 26
    },
    "m3": {
      "x": 564,
      "y": 235,
      "width": 69,
      "height": 26
    },
    "m4": {
      "x": 643,
      "y": 235,
      "width": 69,
      "height": 26
    },
    "m5": {
      "x": 722,
      "y": 235,
      "width": 69,
      "height": 26
    },
    "m6": {
      "x": 801,
      "y": 235,
      "width": 69,
      "height": 26
    }
  }
});
// Deck 90 7.10.9: bigger key letters, as big as the key lets them be (Arial bold capitals ≈ 0.7 em wide each)
// Deck 90 7.10.9: an accented capital is the full capital with its accent in a dot above the cell
const ACCENTS={'Á':['A',[3]],'É':['E',[3]],'Í':['I',[3]],'Ó':['O',[3]],'Ú':['U',[3]],'Ü':['U',[1,3]]};
const keyFont=(text,width,want,ls=.7)=>{const n=String(text).length;return Math.max(7,Math.min(want,(width-10-(n-1)*ls)/(n*.7)));};
const css=(name,fallback)=>`var(--${name},var(--_d90-${name},${fallback}))`;
const safePrefix=prefix=>{if(!/^[A-Za-z_][\w.-]*$/.test(prefix))throw new TypeError('A safe unique SVG id prefix is required.');return prefix;};

// Fixed, very low-contrast strokes reproduce the horizontal draw of fine metal.
// The long tile and irregular pitches avoid the visible four-pixel grid of v1.
function grainMarkup(label){
  let seed=904031,paths='';
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<34;i++){
    const y=(.17+i*.535+random()*.17).toFixed(3),x=(random()*255).toFixed(2),length=(120+random()*237).toFixed(2);
    const opacity=(.035+random()*.055).toFixed(3);
    paths+=`<path d="M${x} ${y}h${length}" stroke="${label}" stroke-width=".16" opacity="${opacity}"/>`;
    paths+=`<path d="M${(Number(x)+14.7).toFixed(2)} ${(Number(y)+.23).toFixed(3)}h${(Number(length)*.61).toFixed(2)}" stroke="#fff" stroke-width=".14" opacity="${(.035+random()*.06).toFixed(3)}"/>`;
  }
  return paths;
}

function n(value){return Number(value.toFixed(3));}

function fmX(frequency){return 65+(frequency-87.5)/20.5*789;}

function amX(frequency){return 65+(frequency-530)/1180*789;}

function printedDial(){
  let ticks='';
  for(let i=0;i<=41;i++){const value=87.5+i*.5,x=fmX(value),major=value%2===0||i===0||i===41;ticks+=`<path d="M${n(x)} 173v${major?6:3.2}"/>`;}
  for(let i=0;i<=118;i++){const value=530+i*10,x=amX(value),major=value%100===0||i===0||i===118;ticks+=`<path d="M${n(x)} 188v${major?6:3.2}"/>`;}
  const fm=[87.5,90,92,94,96,98,100,102,104,106,108],am=[530,600,800,1000,1200,1400,1600,1710];
  return `<g fill="none" stroke="var(--dial-mark,#879c8e)" stroke-width=".6" opacity=".88">${ticks}</g>
  <g fill="var(--dial-label,#b9c8bc)" font-family="Arial,Helvetica,sans-serif" font-size="8" text-anchor="middle">${fm.map(v=>`<text x="${n(fmX(v))}" y="168.4">${v}</text>`).join('')}${am.map(v=>`<text x="${n(amX(v))}" y="203.3">${v}</text>`).join('')}</g>
  <g fill="var(--dial-label,#a4b6a9)" font-family="Arial,Helvetica,sans-serif" font-size="7.3" font-weight="700"><text x="43.5" y="168.4">FM</text><text x="43.5" y="203.3">AM</text></g>
  <path d="M64 183.7H855" stroke="#52685a" stroke-width=".5" opacity=".72"/><path d="M65 184.6H854" stroke="#020805" stroke-width=".6" opacity=".8"/>`;
}

function tunerDefinitions(p){return `<linearGradient id="${p}-dial-glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#030806"/><stop offset=".1" stop-color="#0e1913"/><stop offset=".65" stop-color="#08140d"/><stop offset="1" stop-color="#030a06"/></linearGradient>
  <linearGradient id="${p}-knob-metal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d5d9d2"/><stop offset=".14" stop-color="#a8b0a7"/><stop offset=".31" stop-color="#e6e8df"/><stop offset=".52" stop-color="#858e85"/><stop offset=".73" stop-color="#c8cfc4"/><stop offset="1" stop-color="#707c70"/></linearGradient>
  <radialGradient id="${p}-knob-center" cx="46%" cy="41%" r="62%"><stop offset="0" stop-color="#e3e6db" stop-opacity=".14"/><stop offset=".70" stop-color="#dfe5d9" stop-opacity=".02"/><stop offset="1" stop-color="#0d1a10" stop-opacity=".19"/></radialGradient>
  <linearGradient id="${p}-knob-rim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6ebdf"/><stop offset=".10" stop-color="#7e8c7d"/><stop offset=".48" stop-color="#202d22"/><stop offset=".92" stop-color="#08120b"/><stop offset="1" stop-color="#b1bfae"/></linearGradient>
  <clipPath id="${p}-static-dial-clip"><rect x="39.5" y="157" width="841" height="50" rx="2.2"/></clipPath>`;}

function tunerHardware(p,dim,edge){
  let ticks='';for(let i=0;i<48;i++){const a=i*Math.PI/24;ticks+=`<path d="M${n(1045+Math.sin(a)*42)} ${n(184-Math.cos(a)*42)}L${n(1045+Math.sin(a)*43)} ${n(184-Math.cos(a)*43)}"/>`;}
  return `<rect x="34" y="153.2" width="852" height="59.5" rx="3.7" fill="#000" opacity=".6"/>
  <rect x="35" y="153" width="850" height="58" rx="3.2" fill="url(#${p}-window-bevel)" stroke="${edge}" stroke-width=".75" data-role="dial-window"/>
  <rect x="38.5" y="156" width="843" height="52" rx="2.3" fill="#000302"/><rect x="39.5" y="157" width="841" height="50" rx="2.2" fill="url(#${p}-dial-glass)"/>
  <g clip-path="url(#${p}-static-dial-clip)">${printedDial()}</g>
  <path d="M41.5 157.2H879" stroke="#d9eee2" stroke-opacity=".13" stroke-width=".5"/><path d="M41.5 207.3H879" stroke="#9fb7a6" stroke-opacity=".2" stroke-width=".5"/>
  <circle cx="1045" cy="185.3" r="41.8" fill="#000" opacity=".38"/><g fill="none" stroke="${dim}" stroke-width=".65" opacity=".72">${ticks}</g>
  <circle cx="1045" cy="184" r="41.3" fill="#111b14" stroke="#040b07" stroke-width=".7"/><circle cx="1045" cy="184" r="40.2" fill="url(#${p}-knob-rim)"/>
  <circle cx="1045" cy="184" r="38.6" fill="url(#${p}-knob-metal)" stroke="#4b574b" stroke-width=".5"/><circle cx="1045" cy="184" r="37.5" fill="url(#${p}-knob-center)"/>
  <circle cx="1045" cy="184" r="37.1" fill="none" stroke="#fff" stroke-opacity=".16" stroke-width=".55"/><circle cx="1045" cy="184" r="35.6" fill="none" stroke="#233724" stroke-opacity=".16" stroke-width=".45"/>`;
}

function buildFaceplate(prefix){
  const p=safePrefix(prefix),label=css('label','#313332'),dim=css('label-dim','#666c68'),edge=css('edge','#838d86');
  const top='var(--face-top,var(--face,var(--_d90-face-top,#deded8)))';
  const face=css('face','#bfc3bc');
  const bottom='var(--face-bottom,var(--face,var(--_d90-face-bottom,#8e968e)))';
  return `<defs>
    <linearGradient id="${p}-chassis-metal" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#626a64"/><stop offset=".018" stop-color="#232a25"/>
      <stop offset=".08" stop-color="#151b17"/><stop offset=".87" stop-color="#1b221d"/>
      <stop offset=".982" stop-color="#090d0b"/><stop offset="1" stop-color="#545d55"/>
    </linearGradient>
    <linearGradient id="${p}-plate-metal" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${bottom}"/><stop offset=".018" stop-color="${top}"/>
      <stop offset=".055" stop-color="${face}"/><stop offset=".20" stop-color="${top}"/>
      <stop offset=".43" stop-color="${face}"/><stop offset=".80" stop-color="${face}"/>
      <stop offset=".966" stop-color="${bottom}"/><stop offset=".987" stop-color="${bottom}"/>
      <stop offset="1" stop-color="${top}"/>
    </linearGradient>
    <linearGradient id="${p}-window-bevel" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#070b08"/><stop offset=".035" stop-color="#9ba79e"/>
      <stop offset=".075" stop-color="#363e38"/><stop offset=".15" stop-color="#070c09"/>
      <stop offset=".86" stop-color="#010503"/><stop offset=".945" stop-color="#222c24"/>
      <stop offset=".981" stop-color="#a0aba0"/><stop offset="1" stop-color="#101811"/>
    </linearGradient>
    <linearGradient id="${p}-glass" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#09110e"/><stop offset=".09" stop-color="#020806"/>
      <stop offset=".7" stop-color="#010604"/><stop offset="1" stop-color="#030a06"/>
    </linearGradient>
    <linearGradient id="${p}-key-real" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${css('key-bottom','#151d17')}"/>
      <stop offset=".035" stop-color="${css('key-top','#727e73')}"/>
      <stop offset=".10" stop-color="${css('key-top','#58645a')}"/>
      <stop offset=".27" stop-color="${css('key-bottom','#222c24')}"/>
      <stop offset=".90" stop-color="${css('key-bottom','#111a13')}"/>
      <stop offset=".978" stop-color="#070d09"/><stop offset="1" stop-color="#526555"/>
    </linearGradient>
    ${tunerDefinitions(p)}
    <pattern id="${p}-metal-grain" width="612" height="18.4" patternUnits="userSpaceOnUse">${grainMarkup(label)}</pattern>
    <clipPath id="${p}-plate-clip"><rect x="4.8" y="4.8" width="1190.4" height="270.4" rx="2.4"/></clipPath>
    <radialGradient id="${p}-screw-metal" cx="30%" cy="20%" r="79%">
      <stop offset="0" stop-color="#a4ada4"/><stop offset=".23" stop-color="#5c685e"/>
      <stop offset=".60" stop-color="#263329"/><stop offset="1" stop-color="#0c140e"/>
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
  <g id="${p}-faceplate" data-layer="faceplate">
    <rect x=".65" y=".65" width="1198.7" height="278.7" rx="5.1" fill="url(#${p}-chassis-metal)" stroke="#080d0a" stroke-width="1.3"/>
    <rect x="2.1" y="2.1" width="1195.8" height="275.8" rx="4" fill="#a5ada5" stroke="#030705" stroke-opacity=".8" stroke-width=".55"/>
    <rect x="4.35" y="4.35" width="1191.3" height="271.3" rx="2.8" fill="url(#${p}-plate-metal)" stroke="#050b07" stroke-width=".65"/>
    <rect x="4.8" y="4.8" width="1190.4" height="270.4" rx="2.4" fill="url(#${p}-metal-grain)" clip-path="url(#${p}-plate-clip)"/>
    <path d="M6 5.4H1194M5.4 6V274" fill="none" stroke="#fff" stroke-opacity=".33" stroke-width=".65"/>
    <path d="M6 274.9H1194M1194.9 6V274" fill="none" stroke="#030805" stroke-opacity=".7" stroke-width=".9"/>
    <g font-family="Arial,Helvetica,sans-serif" fill="${label}">
      <text x="39" y="26" font-size="18" font-weight="700" letter-spacing="3.1">DECK 90</text>
      <text x="652" y="23" text-anchor="middle" font-size="10" font-weight="500" letter-spacing="1.8">DT-90 SYNTHESIZER TUNER</text>
      <text x="1045" y="231.8" text-anchor="middle" font-size="6.6" letter-spacing="1.4">TUNING</text>
    </g>
    <g font-family="Arial,Helvetica,sans-serif" fill="${dim}" font-size="7.1" letter-spacing="1.35">
      <text x="1153" y="23" text-anchor="end">PRECISION FM / AM</text>
      <text x="75" y="274" text-anchor="middle" font-size="6.1">STANDBY</text>
    </g>
    <path d="M35 31H1165" stroke="#050b07" stroke-opacity=".25" stroke-width=".7"/>
    <path d="M35 31.65H1165" stroke="#fff" stroke-opacity=".19" stroke-width=".5"/>
    <rect x="33.4" y="35.8" width="1133.2" height="106.2" rx="4.4" fill="#000" opacity=".5"/>
    <rect x="35" y="36" width="1130" height="104" rx="4.4" fill="url(#${p}-window-bevel)" stroke="${edge}" stroke-width=".7" data-role="display-window"/>
    <rect x="38.6" y="39.3" width="1122.8" height="97.4" rx="3.3" fill="#000302" stroke="#020705" stroke-width="1.4"/>
    <rect x="41.2" y="41" width="1117.6" height="94" rx="2.5" fill="url(#${p}-glass)"/>
    <path d="M45 41.3H1155" stroke="#d9eee2" stroke-opacity=".14" stroke-width=".55"/>
    <path d="M45 135.25H1155" stroke="#9fb7a6" stroke-opacity=".23" stroke-width=".6"/>
    <path d="M35 147.2H1165" stroke="#050c07" stroke-width=".6" stroke-opacity=".27"/>
    <path d="M35 147.85H1165" stroke="#fff" stroke-width=".42" stroke-opacity=".19"/>
    ${tunerHardware(p,dim,edge)}
    <path d="M34 224H886" stroke="#050c07" stroke-opacity=".3" stroke-width=".6"/>
    <path d="M34 224.7H886" stroke="#fff" stroke-opacity=".16" stroke-width=".4"/>
    <use href="#${p}-rack-screw" x="17" y="16"/><use href="#${p}-rack-screw" x="1183" y="16"/>
    <use href="#${p}-rack-screw" x="17" y="264"/><use href="#${p}-rack-screw" x="1183" y="264"/>
  </g>`;
}


const SVG_NS = 'http://www.w3.org/2000/svg';
const VFD = 'var(--vfd,#80ffe5)';
const DIM = 'var(--vfd-dim,#193e34)';
// Deck 90 7.9.13: the meters end in yellow (19-21) and red (22-24) like the VUs, the zones faintly visible unlit
const METER_LIT = i => i >= 21 ? '#ff4a3d' : i >= 18 ? '#ffd23a' : VFD, METER_DIM = i => i >= 21 ? '#40171299' : i >= 18 ? '#3d331299' : DIM;
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
    this.svg = node('svg', { xmlns: SVG_NS, viewBox: '0 0 1200 280', width: '100%', role: 'group', 'aria-label': 'DECK 90 DT-90 synthesizer tuner', 'data-deck90-tuner': this.prefix, preserveAspectRatio: 'xMidYMid meet' });
    this.svg.style.width = '100%';
    this.svg.style.height = 'auto';
    this.svg.style.display = 'block';
    this.svg.style.userSelect = 'none';
    this.svg.style.touchAction = 'pan-y';
    this._applyTheme();
    this.svg.innerHTML = buildFaceplate(this.prefix);
    const defs = node('defs');
    defs.innerHTML = `<clipPath id="${this.prefix}-rds-clip"><rect x="515" y="52" width="385" height="25"/></clipPath>
      <filter id="${this.prefix}-vfd-glow" x="-15%" y="-20%" width="130%" height="140%"><feGaussianBlur stdDeviation=".7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <linearGradient id="${this.prefix}-key" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--key-top,var(--_d90-key-top))"/><stop offset=".08" stop-color="var(--key-top,var(--_d90-key-top))"/><stop offset=".18" stop-color="var(--key-face,var(--_d90-key-face))"/><stop offset=".78" stop-color="var(--key-face,var(--_d90-key-face))"/><stop offset=".94" stop-color="var(--key-bottom,var(--_d90-key-bottom))"/><stop offset="1" stop-color="var(--key-top,var(--_d90-key-top))"/></linearGradient>`;
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
    // FM4: Deck 90 7.9.2
    if (['FM1', 'FM2', 'FM3', 'FM4', 'HIFI', 'AM'].includes(String(update.band).toUpperCase())) radio.band = String(update.band).toUpperCase();
    if ('frequency' in update && (update.frequency === null || update.frequency === '')) radio.frequency = null;   // internet only
    else if ('frequency' in update && finite(update.frequency)) radio.frequency = Number(update.frequency);
    const am = radio.band === 'AM';
    if (radio.frequency !== null) {
      radio.frequency = Math.max(am ? 530 : 87.5, Math.min(am ? 1710 : 108, radio.frequency));
      radio.frequency = am ? Math.round(radio.frequency / 10) * 10 : Math.round(radio.frequency * 20) / 20;
    }
    if ('preset' in update && finite(update.preset)) radio.preset = Math.max(0, Math.min(6, Math.round(Number(update.preset))));   // 0: no memory
    if ('signal' in update && finite(update.signal)) radio.signal = Math.max(0, Math.min(5, Math.round(Number(update.signal))));
    for (const key of ['name', 'text', 'label', 'quality', 'place']) if (key in update) radio[key] = clean(update[key]);   // quality, place: Deck 90 7.9.21
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
    this._needleShade();
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
      face: '#292c2d', 'face-top': '#484c4d', 'face-bottom': '#101415', label: '#d0d1cb', 'label-dim': '#969e97', edge: '#646a67', 'key-top': '#505659', 'key-face': '#272d30', 'key-bottom': '#0c1114', 'key-label': '#cdd2d1',
    } : {
      face: '#c7c5be', 'face-top': '#ece9df', 'face-bottom': '#92938d', label: '#2d302e', 'label-dim': '#686d67', edge: '#90958f', 'key-top': '#5c6366', 'key-face': '#30363a', 'key-bottom': '#101719', 'key-label': '#d2d7d5',
    };
    for (const [key, value] of Object.entries(values)) this.svg.style.setProperty(`--_d90-${key}`, value);
    this.svg.setAttribute('data-theme', this._state.theme);
  }

  _dots(text, x, y, pitch = 1.25, { fill = VFD, ghost = false } = {}) {
    const group = node('g', { transform: `translate(${x} ${y})`, fill });
    let column = 0;
    for (const char of clean(text).toUpperCase()) {
      const acc = ACCENTS[char], rows = acc ? DOT_GLYPHS[acc[0]] : DOT_GLYPHS[char] || DOT_GLYPHS['?'];   // Deck 90 7.10.9
      for (let row = acc ? -1 : 0; row < 7; row++) for (let bit = 0; bit < 5; bit++) {
        const on = row < 0 ? acc[1].includes(bit) : Boolean(rows[row] & (1 << (4 - bit)));
        if (row < 0 && !on) continue;
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
    const digitLayer = node('g', { transform: 'translate(148 51) scale(1.22)', 'data-role': 'frequency' });
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
    this._digitLayer = digitLayer;

    this._display.append(digitLayer);
    this._bigLabel = node('g', { 'data-role': 'big-label' });   // internet only: the name in place of the digits
    this._display.append(this._bigLabel);
    this._signal = [];
    const signal = node('g', { 'data-role': 'signal' });
    for (let i = 0; i < 5; i++) {
      const bar = node('rect', { x: 431 + i * 11, y: 112 - (i + 1) * 6, width: 7, height: (i + 1) * 6, rx: .6, fill: DIM });
      signal.append(bar); this._signal.push(bar);
    }
    signal.append(this._dots('SIGNAL', 426, 119, .95, { fill: DIM }));
    this._display.append(signal);
    this._indicators = {};
    for (const [word, x, y] of [['STEREO', 516, 90], ['MONO', 640, 90], ['TUNED', 764, 90], ['AUTO', 516, 114], ['MEMO', 640, 114], ['SCAN', 764, 114]]) {
      const indicator = this._dots(word, x, y, 1.3);
      indicator.setAttribute('data-indicator', word.toLowerCase());
      this._indicators[word.toLowerCase()] = indicator;
      this._display.append(indicator);
    }
    this._levelNodes = {};
    for (const [channel, letter, y] of [['left', 'L', 91], ['right', 'R', 113]]) {
      const group = node('g', { 'data-role': channel === 'left' ? 'level-l' : 'level-r' });
      group.append(this._dots(letter, 925, y - 1, 1.1));
      this._levelNodes[channel] = [];
      for (let i = 0; i < 24; i++) {
        const segment = node('rect', { x: 943 + i * 8, y, width: 6, height: 6, rx: .6, fill: METER_DIM(i), 'data-index': i });
        group.append(segment); this._levelNodes[channel].push(segment);
      }
      this._display.append(group);
    }
    /* Deck 90 7.9.21: the stream's quality after TUNED ("MP3 128") and where the station is under the memory ("BS AS") */
    this._quality = node('g', { 'data-role': 'quality' });
    this._place = node('g', { 'data-role': 'place' });
    this._display.append(this._quality, this._place);
    const rdsClip = node('g', { 'clip-path': `url(#${this.prefix}-rds-clip)`, 'data-role': 'rds-viewport' });
    this._rds = node('g', { 'data-role': 'rds-text' });
    rdsClip.append(this._rds); this._display.append(rdsClip);
  }

  _buildNeedle() {
    this._needle = node('g', { 'data-role': 'needle', filter: `url(#${this.prefix}-vfd-glow)`, 'aria-hidden': 'true' });
    this._needle.append(node('line', { x1: 0, x2: 0, y1: 158, y2: 205, stroke: NEEDLE, 'stroke-width': 2.2 }));
    this._needle.append(node('path', { d: 'M-3 157H3L0 161Z', fill: NEEDLE }));
    this.svg.append(this._needle);
    this._knobMarker = node('line', { x1: 1045, y1: 150, x2: 1045, y2: 160, stroke: 'var(--label,var(--_d90-label))', 'stroke-width': 2, 'stroke-linecap': 'round', 'data-role': 'knob-marker' });
    this.svg.append(this._knobMarker);
  }

  _buildControls() {
    this._buttons = {};
    const words = { power: 'POWER', band: 'BAND', 'band-fm1': 'FM1', 'band-fm2': 'FM2', 'band-fm3': 'FM3', 'band-fm4': 'FM4', 'band-hifi': 'HI-FI', 'band-am': 'AM',   /* Deck 90 7.10.7 */ 'tune-down': '◀', 'tune-up': '▶', scan: 'SCAN', memo: 'MEMO', mode: 'MODE', disp: 'DISP' };
    for (const [key, box] of Object.entries(LAYOUT.buttons)) {
      const group = node('g', { 'data-key': key, role: 'button', tabindex: 0, 'aria-label': key.startsWith('m') && /^m\d$/.test(key) ? `Memoria ${key.slice(1)}. Mantener un segundo para memorizar.` : words[key], 'aria-pressed': 'false' });
      group.style.cursor = 'pointer'; group.style.outline = 'none';
      const face = node('rect', { x: box.x, y: box.y, width: box.width, height: box.height, rx: 2.4, fill: `url(#${this.prefix}-key)`, stroke: 'var(--edge,var(--_d90-edge))', 'stroke-width': .9 });
      const shadow = node('rect', { x: box.x, y: box.y + 1.8, width: box.width, height: box.height, rx: 2.4, fill: '#080e0a', opacity: .75 });
      group.append(shadow, face);
      const highlight = node('path', { d: `M${box.x + 3} ${box.y + 1.3}H${box.x + box.width - 3}`, stroke: '#fff', 'stroke-opacity': .36, 'stroke-width': .7 });
      group.append(highlight);
      const said = /^m\d$/.test(key) ? key.slice(1) : words[key];
      const size = keyFont(said, box.width, key.startsWith('tune-') ? 11 : key === 'power' || /^m\d$/.test(key) ? 12 : 10.5);   // Deck 90 7.10.9
      const text = node('text', { x: box.x + box.width / 2, y: box.y + box.height / 2 + size * .36, 'text-anchor': 'middle', 'font-family': 'Arial,Helvetica,sans-serif', 'font-size': size, 'font-weight': 700, 'letter-spacing': .7, fill: 'var(--key-label,var(--_d90-key-label,#d2d7d5))', 'pointer-events': 'none' });
      text.textContent = said;
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
    this._powerLed = node('circle', { cx: 125, cy: 248, r: 2.4, fill: VFD, 'data-role': 'power-led' });
    this.svg.append(this._powerLed);
    const knob = node('circle', { cx: 1045, cy: 184, r: 41.5, fill: 'transparent', 'data-role': 'tuning-knob', role: 'slider', tabindex: 0, 'aria-label': 'Sintonía. Rueda o flechas para cambiar la frecuencia.', 'aria-valuemin': 87.5, 'aria-valuemax': 108, 'aria-valuenow': 98.5 });
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
    this._needleShade();
    const big = net && radio.label ? radio.label.toUpperCase().slice(0, 14) : '';
    if (this._cache.big !== big) {   // internet only: big name over the digits area (x 150-418, y 51-115, left of SIGNAL)
      const pitch = big ? Math.min(8.4, 268 / ([...big].length * 6)) : 1;
      this._bigLabel.replaceChildren(...(big ? [this._dots(big, 150, 51 + (64 - 7 * pitch) / 2, pitch)] : []));
      this._digitLayer.setAttribute('opacity', big ? '0' : '1');
      this._units.setAttribute('opacity', big ? '0' : '1');
      this._cache.big = big;
    }
    if (this._cache.band !== radio.band) { this._band.replaceChildren(this._dots(radio.band, 56, 55, 2.3)); this._cache.band = radio.band; }
    if (this._cache.preset !== radio.preset) { this._preset.replaceChildren(this._dots(radio.preset ? `M${radio.preset}` : 'M-', 58, 94, 2.1)); this._cache.preset = radio.preset; }
    const unit = am ? 'KHZ' : 'MHZ';
    if (this._cache.unit !== unit) { this._units.replaceChildren(this._dots(unit, 370, 94, 2.1)); this._cache.unit = unit; }
    for (const [key, indicator] of Object.entries(this._indicators)) {
      const lit = key === 'stereo' ? radio.stereo && !radio.mono : radio[key];
      indicator.setAttribute('fill', lit ? VFD : DIM);
      for (const dot of indicator.children) dot.setAttribute('fill', lit ? VFD : DIM);
    }
    for (let i = 0; i < 5; i++) this._signal[i].setAttribute('fill', i < radio.signal ? VFD : DIM);
    /* Deck 90 7.9.21: quality and place, small dots that shrink to fit their room */
    const quality = String(radio.quality || '').toUpperCase().slice(0, 12), place = String(radio.place || '').toUpperCase().slice(0, 14);
    if (this._cache.quality !== quality) {
      const pitch = Math.min(1.3, 78 / Math.max(1, [...quality].length * 6));
      this._quality.replaceChildren(...(quality ? [this._dots(quality, 838, 90 + (7 * 1.3 - 7 * pitch) / 2, pitch)] : []));
      this._cache.quality = quality;
    }
    if (this._cache.place !== place) {
      const pitch = Math.min(1.3, 86 / Math.max(1, [...place].length * 6));
      this._place.replaceChildren(...(place ? [this._dots(place, 58, 114 + (7 * 1.3 - 7 * pitch) / 2, pitch)] : []));
      this._cache.place = place;
    }
    const text = clean([radio.name, radio.text].filter(Boolean).join(' - ')) || 'DECK 90';
    if (this._cache.rds !== text) {
      this._rds.replaceChildren(this._dots(text, 0, 0, 2.7));
      this._rds.setAttribute('transform', 'translate(516 55)');
      this._rdsWidth = [...text.toUpperCase()].length * 16.2;
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
      const active = this._state.powered && (key === `m${radio.preset}` || key === 'scan' && radio.scan || key === 'memo' && radio.memo || key === `band-${radio.band.toLowerCase()}` || key === 'power');   // Deck 90 7.9.4: MODE has no lamp (it chooses the text line)
      button.led.setAttribute('fill', active ? VFD : DIM);
      button.led.setAttribute('opacity', active ? '.9' : '.22');
      button.group.setAttribute('aria-pressed', String(active));
    }
  }

  _paintLevels() {
    for (const channel of ['left', 'right']) {
      const count = this._state.powered ? Math.round(this._state.levels[channel] * this._levelNodes[channel].length) : 0;
      if (this._meterCounts[channel] === count) continue;
      for (let index = 0; index < this._levelNodes[channel].length; index++) this._levelNodes[channel][index].setAttribute('fill', index < count ? METER_LIT(index) : METER_DIM(index));
      this._meterCounts[channel] = count;
    }
  }

  /** Deck 90: no needle for a station with no place on the dial (internet only), so it never points somewhere wrong. */
  _needleShade() {
    const net = this._state.radio.frequency === null;
    this._needle.setAttribute('opacity', net ? '0' : this._state.powered ? '1' : '.12');
  }

  _paintNeedle() {
    const x = 65 + this._needlePosition * 789;
    this._needle.setAttribute('transform', `translate(${x.toFixed(3)} 0)`);
    this._knobMarker.setAttribute('transform', `rotate(${(-135 + this._needlePosition * 270).toFixed(3)} 1045 184)`);
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
    if (difference !== 0) {
      this._needlePosition = reduceMotion ? this._needleTarget : this._needlePosition + difference * (1 - Math.exp(-dt / 100));
      if (Math.abs(this._needleTarget - this._needlePosition) <= .00003) this._needlePosition = this._needleTarget;
      this._paintNeedle();
    }
    const distance = Math.max(0, (this._rdsWidth || 0) - 382);
    let scroll = false;
    if (distance > 0 && this._state.powered) {   // Deck 90 7.9.7: scrolls even with Windows' animations off
      const travel = distance / 32 * 1000, delay = 1400, cycle = 2 * travel + 2 * delay;
      const phase = Math.max(0, time - this._rdsStarted) % cycle;
      let offset = 0;
      if (phase > delay && phase < delay + travel) offset = (phase - delay) * .032;
      else if (phase >= delay + travel && phase < delay * 2 + travel) offset = distance;
      else if (phase >= delay * 2 + travel) offset = distance - (phase - delay * 2 - travel) * .032;
      this._rds.setAttribute('transform', `translate(${(516 - offset).toFixed(3)} 55)`);
      scroll = true;
    } else this._rds.setAttribute('transform', 'translate(516 55)');
    if (scroll || Math.abs(this._needleTarget - this._needlePosition) > .00003) this._schedule();
  }
}

global.Deck90Tuner = Deck90Tuner;
})(typeof globalThis !== 'undefined' ? globalThis : window);
