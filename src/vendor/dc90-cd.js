/**
 * DECK 90 DC-90 COMPACT DISC PLAYER — revision 3, enlarged VFD and wide drawer.
 * One standalone JavaScript. Pure SVG, no dependencies, external assets or network.
 * API:
 *   const cd = new Deck90CD(container, {theme:'silver'|'black'});
 *   cd.setTrack({title,artist,track,totalTracks,elapsed,duration,playing,paused});
 *   cd.setLevels(left,right); // 0..1, no recreated nodes
 *   cd.setDrawer(true|false); // animated, closing/opening the full-width front
 *   const off = cd.onKey((id,{hold})=>{});
 *   cd.setPower(bool); cd.setTheme('silver'|'black'); cd.getState(); cd.destroy();
 * Keys: power,eject,prev,play,stop,next,pause. Short on release, hold once at 1 s.
 * The host controls playback; this component emits intents and draws state.
 * Opening the drawer clears playing/paused state. No real audio or optical drive.
 * Public CSS vars: --vfd,--vfd-dim,--face,--face-top,--face-bottom,--label,
 * --label-dim,--edge,--key-top,--key-face,--key-bottom,--key-label,--key-hover,--drawer-face,
 * --drawer-top,--drawer-bottom,--drawer-label. Inherited from the container.
 * Master viewBox1200x280. VFD1130x104; drawer front1120px=93.3% of rack width.
 *
 * Deck 90 7.9.14: REPEAT and SHUFFLE keys (OPEN / CLOSE narrower) and their lamps under the meters, setModes(). 7.9.13: meters end yellow/red; setTimeMode(remain). 7.9.10: Damián's DC-90 revision 3 (the big display); src/js/cdunit.js drives it with the PC's drive.
 * One change: a long title scrolls even when Windows says "reduced motion" (animations off).
 */
(function(global){
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

/** DECK 90 DC-90 revision 3: a double-height panoramic VFD and the same wide drawer.
 * Native SVG, no external assets. The class API and all materials are unchanged. */
const LAYOUT = Object.freeze({
  width:1200,height:280,
  display:{x:35,y:36,width:1130,height:104},
  displayContent:{x:51,y:46,width:1098,height:84},
  drawer:{x:35,y:153,width:1130,height:58,face:{x:40,y:157,width:1120,height:49},openTravel:14},
  powerLed:{x:125,y:248,r:2.2},
  buttons:{
    power:{x:35,y:232,width:80,height:32},
    prev:{x:145,y:233,width:140,height:29},
    play:{x:298,y:233,width:160,height:29},
    pause:{x:471,y:233,width:140,height:29},
    stop:{x:624,y:233,width:140,height:29},
    next:{x:777,y:233,width:140,height:29},
    repeat:{x:930,y:233,width:62,height:29},   // Deck 90 7.9.14: REPEAT and SHUFFLE, OPEN / CLOSE narrower
    shuffle:{x:1000,y:233,width:62,height:29},
    eject:{x:1072,y:233,width:83,height:29},
  },
});
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

function buildFaceplate(prefix){
  const p=safePrefix(prefix),label=css('label','#313332'),dim=css('label-dim','#666c68'),edge=css('edge','#838d86');
  const top='var(--face-top,var(--face,var(--_d90-face-top,#deded8)))';
  const face=css('face','#bfc3bc');
  const bottom='var(--face-bottom,var(--face,var(--_d90-face-bottom,#8e968e)))';
  const drawer=css('drawer-face','#353c36'),drawerTop=css('drawer-top','#646c64'),drawerBottom=css('drawer-bottom','#171d18');
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
    <linearGradient id="${p}-drawer-well" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#000201"/><stop offset=".16" stop-color="#010503"/>
      <stop offset=".88" stop-color="#030806"/><stop offset="1" stop-color="#1a231c"/>
    </linearGradient>
    <linearGradient id="${p}-drawer-metal" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${drawerBottom}"/><stop offset=".028" stop-color="${drawerTop}"/>
      <stop offset=".07" stop-color="${drawer}"/><stop offset=".20" stop-color="${drawerTop}"/>
      <stop offset=".29" stop-color="${drawer}"/><stop offset=".86" stop-color="${drawer}"/>
      <stop offset=".97" stop-color="${drawerBottom}"/><stop offset="1" stop-color="${drawerTop}"/>
    </linearGradient>
    <linearGradient id="${p}-drawer-lip" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#030604"/><stop offset=".28" stop-color="${drawerBottom}"/>
      <stop offset=".48" stop-color="${drawerTop}"/><stop offset=".62" stop-color="${drawer}"/>
      <stop offset="1" stop-color="#0b120d"/>
    </linearGradient>
    <linearGradient id="${p}-key-real" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${css('key-bottom','#151d17')}"/>
      <stop offset=".035" stop-color="${css('key-top','#727e73')}"/>
      <stop offset=".10" stop-color="${css('key-top','#58645a')}"/>
      <stop offset=".27" stop-color="${css('key-bottom','#222c24')}"/>
      <stop offset=".90" stop-color="${css('key-bottom','#111a13')}"/>
      <stop offset=".978" stop-color="#070d09"/><stop offset="1" stop-color="#526555"/>
    </linearGradient>
    <pattern id="${p}-metal-grain" width="612" height="18.4" patternUnits="userSpaceOnUse">${grainMarkup(label)}</pattern>
    <clipPath id="${p}-plate-clip"><rect x="4.8" y="4.8" width="1190.4" height="270.4" rx="2.4"/></clipPath>
    <clipPath id="${p}-drawer-face-clip"><rect x="40" y="157" width="1120" height="49" rx="2.2"/></clipPath>
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
      <text x="652" y="23" text-anchor="middle" font-size="10" font-weight="500" letter-spacing="1.8">DC-90 COMPACT DISC PLAYER</text>
    </g>
    <g font-family="Arial,Helvetica,sans-serif" fill="${dim}" font-size="7.1" letter-spacing="1.35">
      <text x="1153" y="23" text-anchor="end">PRECISION DISC TRANSPORT</text>
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
    <rect x="34" y="153.2" width="1132" height="59.5" rx="3.7" fill="#000" opacity=".6"/>
    <rect x="35" y="153" width="1130" height="58" rx="3.2" fill="url(#${p}-window-bevel)" stroke="${edge}" stroke-width=".75"/>
    <rect x="37.3" y="155.3" width="1125.4" height="54.6" rx="2.4" fill="#000302"/>
    <rect x="39" y="156" width="1122" height="51.8" rx="2" fill="url(#${p}-drawer-well)"/>
    <path d="M42 156.9H1158" stroke="#000" stroke-width="2.2" stroke-opacity=".95"/>
    <path d="M43 208.7H1157" stroke="#bdcbbd" stroke-width=".55" stroke-opacity=".3"/>
    <path d="M37 158V206M1163 158V206" stroke="#060e08" stroke-width="1.2"/>
    <path d="M34 224H1166" stroke="#050c07" stroke-opacity=".3" stroke-width=".6"/>
    <path d="M34 224.7H1166" stroke="#fff" stroke-opacity=".16" stroke-width=".4"/>
    <use href="#${p}-rack-screw" x="17" y="16"/><use href="#${p}-rack-screw" x="1183" y="16"/>
    <use href="#${p}-rack-screw" x="17" y="264"/><use href="#${p}-rack-screw" x="1183" y="264"/>
  </g>`;
}

function buildDrawer(prefix){
  const p=safePrefix(prefix),label=css('drawer-label','#c6d1c4'),edge=css('edge','#7b867b');
  return `<g id="${p}-drawer-face" data-role="drawer-detail">
    <rect x="40.3" y="159.1" width="1119.4" height="49" rx="2.3" fill="#000" opacity=".74"/>
    <rect x="40" y="157" width="1120" height="49" rx="2.2" fill="url(#${p}-drawer-metal)" stroke="${edge}" stroke-width=".65" data-role="drawer-face"/>
    <rect x="40" y="157" width="1120" height="49" rx="2.2" fill="url(#${p}-metal-grain)" opacity=".57" clip-path="url(#${p}-drawer-face-clip)"/>
    <path d="M43 158.15H1157" stroke="#fff" stroke-width=".62" stroke-opacity=".43"/>
    <path d="M43 159.1H1157" stroke="#050b07" stroke-width=".43" stroke-opacity=".52"/>
    <path d="M41.3 160V202.8M1158.7 160V202.8" stroke="#fff" stroke-width=".62" stroke-opacity=".17"/>
    <path d="M42.1 160V202.4M1157.9 160V202.4" stroke="#030906" stroke-width=".75" stroke-opacity=".64"/>
    <path d="M320 176.15H880" stroke="#030806" stroke-width="1.3" stroke-linecap="round" opacity=".9"/>
    <path d="M320 177.1H880" stroke="#d4ded1" stroke-width=".45" opacity=".19"/>
    <rect x="41" y="202.8" width="1118" height="3.2" rx=".7" fill="url(#${p}-drawer-lip)"/>
    <path d="M43 204.6H1157" stroke="#020704" stroke-width=".8" stroke-opacity=".65"/>
    <text x="600" y="192.1" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="7.4" font-weight="400" letter-spacing="3.5" fill="${label}" fill-opacity=".72">COMPACT DISC</text>
    <path d="M541 194.7H659" stroke="${label}" stroke-width=".35" stroke-opacity=".12"/>
  </g>`;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const LIT = 'var(--vfd,#80ffe5)', DIM = 'var(--vfd-dim,#193e34)';
// Deck 90 7.9.13: the meters end in yellow (19-21) and red (22-24) like the VUs, the zones faintly visible unlit
const METER_LIT = i => i >= 21 ? '#ff4a3d' : i >= 18 ? '#ffd23a' : LIT, METER_DIM = i => i >= 21 ? '#40171299' : i >= 18 ? '#3d331299' : DIM;
const clean = value => String(value ?? '').replace(/[\u0000-\u001f]/g, ' ').normalize('NFC').slice(0,256);
const clamp = value => Number.isNaN(Number(value)) ? 0 : Math.min(1,Math.max(0,Number(value)||0));
const safeNumber = (value, fallback=0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
function node(name,attributes={}){const el=document.createElementNS(SVG_NS,name);for(const[key,value]of Object.entries(attributes))el.setAttribute(key,String(value));return el;}

class Deck90CD {
  constructor(container,{theme='silver'}={}){
    if(typeof container==='string')container=document.querySelector(container);
    if(!container?.appendChild)throw new TypeError('Deck90CD requires a container element.');
    this.root=container;global.__deck90CDCount=(global.__deck90CDCount||0)+1;this.prefix=`deck90cd-${global.__deck90CDCount}`;
    this._state={theme:theme==='black'?'black':'silver',powered:true,drawerOpen:false,track:{title:'GIRLFRIEND',artist:'PHOENIX',track:1,totalTracks:12,elapsed:0,duration:250,playing:false,paused:false},levels:{left:0,right:0}};
    this._listeners=[];this._callbacks=new Set();this._presses=new Map();this._cache={};this._meterCounts={left:-1,right:-1};this._destroyed=false;this._frame=null;this._previousTime=0;this._drawerPosition=0;this._drawerTarget=0;
    this.svg=node('svg',{xmlns:SVG_NS,viewBox:'0 0 1200 280',width:'100%',preserveAspectRatio:'xMidYMid meet',role:'group','aria-label':'DECK 90 DC-90 Compact Disc Player','data-deck90-cd':this.prefix});
    this.svg.style.width='100%';this.svg.style.height='auto';this.svg.style.display='block';this.svg.style.userSelect='none';this.svg.style.touchAction='pan-y';
    this._applyTheme();this.svg.innerHTML=buildFaceplate(this.prefix);
    const defs=node('defs');defs.innerHTML=`<clipPath id="${this.prefix}-title-clip"><rect x="390" y="52" width="505" height="27"/></clipPath><clipPath id="${this.prefix}-artist-clip"><rect x="390" y="91" width="505" height="20"/></clipPath><filter id="${this.prefix}-vfd-glow" x="-12%" y="-25%" width="124%" height="150%"><feGaussianBlur stdDeviation=".55" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter><linearGradient id="${this.prefix}-key" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--key-top,var(--_d90-key-top))"/><stop offset=".08" stop-color="var(--key-top,var(--_d90-key-top))"/><stop offset=".18" stop-color="var(--key-face,var(--_d90-key-face))"/><stop offset=".78" stop-color="var(--key-face,var(--_d90-key-face))"/><stop offset=".94" stop-color="var(--key-bottom,var(--_d90-key-bottom))"/><stop offset="1" stop-color="var(--key-top,var(--_d90-key-top))"/></linearGradient>`;this.svg.append(defs);
    this._opening=node('rect',{x:43,y:157,width:1114,height:0,rx:1.4,fill:'#010403','data-role':'drawer-opening'});this.svg.append(this._opening);
    this._drawer=node('g',{'data-role':'drawer',transform:'translate(0 0)'});this._drawer.innerHTML=buildDrawer(this.prefix);this.svg.append(this._drawer);
    this._display=node('g',{'data-role':'display','aria-hidden':'true',filter:`url(#${this.prefix}-vfd-glow)`});this.svg.append(this._display);
    this._buildDisplay();this._buildControls();this.root.appendChild(this.svg);
    this._motion=global.matchMedia?.('(prefers-reduced-motion: reduce)');if(this._motion?.addEventListener)this._listen(this._motion,'change',()=>this._schedule());
    this._renderTrack();this._paintDrawer();this._paintLevels();this._schedule();
  }
  getState(){return JSON.parse(JSON.stringify(this._state));}
  setTrack(update={}){
    this._assertAlive();if(!update||typeof update!=='object')return this;
    const track=this._state.track;
    for(const key of ['title','artist'])if(key in update)track[key]=clean(update[key]);
    if('track'in update)track.track=Math.max(1,Math.min(99,Math.round(safeNumber(update.track,track.track))));
    if('totalTracks'in update)track.totalTracks=Math.max(1,Math.min(99,Math.round(safeNumber(update.totalTracks,track.totalTracks))));
    track.track=Math.min(track.track,track.totalTracks);
    if('duration'in update)track.duration=Math.max(0,Math.min(5999,safeNumber(update.duration,track.duration)));
    if('elapsed'in update)track.elapsed=Math.max(0,Math.min(5999,safeNumber(update.elapsed,track.elapsed)));
    if(track.duration>0)track.elapsed=Math.min(track.elapsed,track.duration);
    if('playing'in update){track.playing=Boolean(update.playing);if(track.playing)track.paused=false;}
    if('paused'in update){track.paused=Boolean(update.paused);if(track.paused)track.playing=false;}
    if(this._state.drawerOpen){track.playing=false;track.paused=false;}
    this._renderTrack();this._paintLevels();this._schedule();return this;
  }
  /** Deck 90 7.9.13: 'remain' counts down to the end of the track (a minus lights left of the time), 'elapsed' counts up. */
  setTimeMode(mode){this._assertAlive();this._remain=mode==='remain';this._cache.time=null;this._renderTrack();return this;}
  /** Deck 90 7.9.14: the play modes for the lamps and keys: repeat 'off' | 'all' | 'one', shuffle true/false. */
  setModes({repeat='off',shuffle=false}={}){this._assertAlive();this._modes={repeat:['all','one'].includes(repeat)?repeat:'off',shuffle:Boolean(shuffle)};this._paintModes();this._updateLeds();return this;}
  _paintModes(){const m=this._modes||{repeat:'off',shuffle:false};if(!this._modeLamps)return;const lit={repeat:m.repeat!=='off',one:m.repeat==='one',shuffle:m.shuffle};for(const[key,group]of Object.entries(this._modeLamps))for(const dot of group.children)dot.setAttribute('fill',lit[key]?LIT:DIM);}
  setLevels(left,right){this._assertAlive();this._state.levels={left:clamp(left),right:clamp(right)};this._paintLevels();return this;}
  setDrawer(open){
    this._assertAlive();this._state.drawerOpen=Boolean(open);this._drawerTarget=open?1:0;
    if(open){this._state.track.playing=false;this._state.track.paused=false;}
    this._renderTrack();this._paintLevels();this._schedule();return this;
  }
  setPower(powered){
    this._assertAlive();this._state.powered=Boolean(powered);this._display.setAttribute('opacity',powered?'1':'.035');this._powerLed.setAttribute('fill',powered?LIT:DIM);this._paintLevels();this._updateLeds();this._schedule();return this;
  }
  setTheme(theme){this._assertAlive();this._state.theme=theme==='black'?'black':'silver';this._applyTheme();return this;}
  onKey(callback){this._assertAlive();if(typeof callback!=='function')throw new TypeError('onKey requires a callback.');this._callbacks.add(callback);return()=>this._callbacks.delete(callback);}
  destroy(){
    if(this._destroyed)return;this._destroyed=true;if(this._frame!==null)cancelAnimationFrame(this._frame);
    for(const press of this._presses.values())clearTimeout(press.timer);this._presses.clear();
    for(const[target,type,callback,options]of this._listeners)target.removeEventListener(type,callback,options);this._listeners.length=0;this._callbacks.clear();this.svg.remove();
  }
  _assertAlive(){if(this._destroyed)throw new Error('Deck90CD has been destroyed.');}
  _listen(target,type,callback,options){target.addEventListener(type,callback,options);this._listeners.push([target,type,callback,options]);}
  _applyTheme(){
    const values=this._state.theme==='black'
      ?{face:'#292c2d','face-top':'#484c4d','face-bottom':'#101415',label:'#d0d1cb','label-dim':'#969e97',edge:'#646a67','key-top':'#505659','key-face':'#272d30','key-bottom':'#0c1114','key-label':'#cdd2d1','drawer-face':'#202622','drawer-top':'#565d58','drawer-bottom':'#0e1511','drawer-label':'#bdc6bd'}
      :{face:'#c7c5be','face-top':'#ece9df','face-bottom':'#92938d',label:'#2d302e','label-dim':'#686d67',edge:'#90958f','key-top':'#5c6366','key-face':'#30363a','key-bottom':'#101719','key-label':'#d2d7d5','drawer-face':'#343936','drawer-top':'#69716b','drawer-bottom':'#171d18','drawer-label':'#c6cdc4'};
    for(const[key,value]of Object.entries(values))this.svg.style.setProperty(`--_d90-${key}`,value);this.svg.setAttribute('data-theme',this._state.theme);
  }
  _dots(text,x,y,pitch=1.2,fill=LIT){
    const group=node('g',{transform:`translate(${x} ${y})`,fill});let index=0;
    for(const char of clean(text).toUpperCase()){const rows=DOT_GLYPHS[char]||DOT_GLYPHS['?'];for(let row=0;row<7;row++)for(let col=0;col<5;col++)if(rows[row]&(1<<(4-col)))group.append(node('circle',{cx:(index*6+col+.5)*pitch,cy:(row+.5)*pitch,r:pitch*.35,fill}));index++;}return group;
  }
  _digitGroup(x,y,count,scale,colon=false){
    const group=node('g',{transform:`translate(${x} ${y}) scale(${scale})`});const cells=[];
    for(let i=0;i<count;i++){const cell=node('g',{transform:`translate(${i*34+(colon&&i>1?10:0)} 0)`}),segments={};for(const[name,points]of Object.entries(SEVEN_SEGMENTS)){segments[name]=node('polygon',{points,fill:DIM,'data-segment':name});cell.append(segments[name]);}cells.push(segments);group.append(cell);}
    if(colon)for(const cy of [18,36])group.append(node('circle',{cx:70,cy,r:2.5,fill:LIT}));
    this._display.append(group);return cells;
  }
  _paintDigits(cells,text){for(let i=0;i<cells.length;i++){const names=DIGIT_MAP[text[i]]||[];for(const[name,segment]of Object.entries(cells[i]))segment.setAttribute('fill',names.includes(name)?LIT:DIM);}}
  _buildDisplay(){
    this._timeDigits=this._digitGroup(58,54,4,1.23,true);this._minus=node('rect',{x:42,y:83,width:11,height:5,rx:1,fill:DIM,'data-role':'remain'});this._display.append(this._minus);/* Deck 90 7.9.13: remaining-time minus */this._trackDigits=this._digitGroup(282,78,2,.72);
    this._display.append(this._dots('TRACK',278,53,1.4));this._total=node('g',{'data-role':'total-tracks'});this._display.append(this._total);
    const clip=node('g',{'data-role':'title-viewport','clip-path':`url(#${this.prefix}-title-clip)`});this._title=node('g',{'data-role':'title'});clip.append(this._title);this._display.append(clip);
    const artistClip=node('g',{'clip-path':`url(#${this.prefix}-artist-clip)`});this._artist=node('g',{'data-role':'artist'});artistClip.append(this._artist);this._display.append(artistClip);
    this._display.append(node('rect',{x:391,y:126,width:503,height:2,fill:DIM}));this._progress=node('rect',{x:391,y:126,width:0,height:2,fill:LIT,'data-role':'progress'});this._display.append(this._progress);
    this._indicators={};for(const[word,x]of [['PLAY',925],['PAUSE',996],['DISC',1077]]){const group=this._dots(word,x,55,1.5);this._indicators[word.toLowerCase()]=group;this._display.append(group);}
    this._modeLamps={};for(const[key,word,x]of [['repeat','REPEAT',925],['one','1',973],['shuffle','SHUFFLE',996]]){const group=this._dots(word,x,121,1.05);this._modeLamps[key]=group;this._display.append(group);}   // Deck 90 7.9.14
    this._openStatus=this._dots('OPEN',925,55,1.5);this._openStatus.setAttribute('opacity','0');this._display.append(this._openStatus);
    this._levelNodes={};for(const[channel,letter,y]of [['left','L',86],['right','R',108]]){const g=node('g',{'data-role':channel==='left'?'level-l':'level-r'});g.append(this._dots(letter,925,y-1,1.1));this._levelNodes[channel]=[];for(let i=0;i<24;i++){const segment=node('rect',{x:943+i*8,y,width:6,height:7,rx:.6,fill:METER_DIM(i),'data-index':i});g.append(segment);this._levelNodes[channel].push(segment);}this._display.append(g);}
  }
  _buildControls(){
    this._buttons={};const labels={power:'POWER',prev:'PREVIOUS',play:'PLAY',pause:'PAUSE',stop:'STOP',next:'NEXT',eject:'OPEN / CLOSE',repeat:'REPEAT: todo el disco, un tema o apagado',shuffle:'SHUFFLE: orden al azar'};
    for(const[key,box]of Object.entries(LAYOUT.buttons)){
      const group=node('g',{'data-key':key,role:'button',tabindex:0,'aria-label':labels[key],'aria-pressed':'false'});group.style.cursor='pointer';group.style.outline='none';
      const face=node('rect',{x:box.x,y:box.y,width:box.width,height:box.height,rx:2.5,fill:`url(#${this.prefix}-key)`,stroke:'var(--edge,var(--_d90-edge))','stroke-width':.9});
      group.append(node('rect',{x:box.x,y:box.y+1.8,width:box.width,height:box.height,rx:2.5,fill:'#080e0a',opacity:.75}),face,node('path',{d:`M${box.x+3} ${box.y+1.3}H${box.x+box.width-3}`,stroke:'#fff','stroke-opacity':.35,'stroke-width':.7}));
      if(key==='power'||key==='repeat'||key==='shuffle'){const text=node('text',{x:box.x+box.width/2,y:box.y+box.height/2+3,'text-anchor':'middle','font-family':'Arial,Helvetica,sans-serif','font-size':key==='power'?10:8.4,'font-weight':700,'letter-spacing':.7,fill:'var(--key-label,var(--_d90-key-label,#d2d7d5))'});text.textContent=key.toUpperCase();group.append(text);}
      else group.append(this._icon(key,box.x+box.width/2,box.y+box.height/2));
      const led=node('rect',{x:box.x+7,y:box.y+box.height-3.6,width:box.width-14,height:1.2,fill:DIM,opacity:.25});group.append(led);
      this._buttons[key]={group,face,led,icon:group.querySelector('[data-role="transport-icon"]'),pressed:false,hover:false,focused:false};this.svg.append(group);
      const start=(event,kind)=>{if(kind==='pointer'&&event.button!==undefined&&event.button!==0)return;if(this._presses.has(key))return;event.preventDefault?.();group.focus?.();if(kind==='pointer')try{group.setPointerCapture?.(event.pointerId);}catch{}const press={hold:false,timer:null};press.timer=setTimeout(()=>{if(!this._destroyed&&this._presses.get(key)===press){press.hold=true;this._emit(key,true);}},1000);this._presses.set(key,press);this._buttons[key].pressed=true;this._paintButton(key);};
      const finish=(event,cancel=false)=>{const press=this._presses.get(key);if(!press)return;clearTimeout(press.timer);this._presses.delete(key);this._buttons[key].pressed=false;this._paintButton(key);if(!cancel&&!press.hold)this._emit(key,false);};
      this._listen(group,'pointerdown',event=>start(event,'pointer'));this._listen(group,'pointerup',event=>finish(event));this._listen(group,'pointercancel',event=>finish(event,true));this._listen(group,'lostpointercapture',event=>finish(event,true));
      this._listen(group,'pointerenter',()=>{this._buttons[key].hover=true;this._paintButton(key);});this._listen(group,'pointerleave',()=>{this._buttons[key].hover=false;this._paintButton(key);});
      this._listen(group,'focus',()=>{this._buttons[key].focused=true;this._paintButton(key);});this._listen(group,'blur',event=>{this._buttons[key].focused=false;finish(event,true);this._paintButton(key);});
      this._listen(group,'keydown',event=>{if(event.key==='Enter'||event.key===' '||event.code==='Space'){event.preventDefault?.();if(!event.repeat)start(event,'keyboard');}});this._listen(group,'keyup',event=>{if(event.key==='Enter'||event.key===' '||event.code==='Space'){event.preventDefault?.();finish(event);}});this._listen(group,'click',event=>{if(event.detail===0&&!this._presses.has(key))this._emit(key,false);});
    }
    this._powerLed=node('circle',{cx:LAYOUT.powerLed.x,cy:LAYOUT.powerLed.y,r:LAYOUT.powerLed.r,fill:LIT,'data-role':'power-led'});this.svg.append(this._powerLed);
  }
  _icon(key,x,y){
    const g=node('g',{transform:`translate(${x} ${y})`,fill:'var(--key-label,var(--_d90-key-label,#d2d7d5))','pointer-events':'none','data-role':'transport-icon'});
    const paths={play:'M-4-6L6 0L-4 6Z',stop:'M-5-5H5V5H-5Z',pause:'M-5-5H-1V5H-5ZM1-5H5V5H1Z',prev:'M-7-5H-5V5H-7ZM-4 0L3-5V5ZM3 0L10-5V5Z',next:'M7-5H9V5H7ZM-8-5L-1 0L-8 5ZM-1-5L6 0L-1 5Z',eject:'M-6 2L0-5L6 2ZM-6 4H6V6H-6Z'};
    g.append(node('path',{d:paths[key]||''}));return g;
  }
  _paintButton(key){const b=this._buttons[key];b.face.setAttribute('fill',b.pressed?'var(--key-bottom,var(--_d90-key-bottom))':b.hover?'var(--key-hover,var(--key-top,var(--_d90-key-top)))':`url(#${this.prefix}-key)`);b.group.setAttribute('transform',b.pressed?'translate(0 .9)':'translate(0 0)');b.face.setAttribute('stroke',b.focused?LIT:'var(--edge,var(--_d90-edge))');b.face.setAttribute('stroke-width',b.focused?'1.7':'.9');}
  _emit(key,hold){if(!this._destroyed)for(const callback of [...this._callbacks])callback(key,{hold:Boolean(hold)});}
  _renderTrack(){
    const t=this._state.track,open=this._state.drawerOpen;
    const remain=this._remain&&t.duration>0,seconds=remain?Math.ceil(t.duration-t.elapsed):Math.floor(t.elapsed),time=String(Math.floor(seconds/60)).padStart(2,'0')+String(seconds%60).padStart(2,'0');
    if(this._minus)this._minus.setAttribute('fill',remain&&!open?LIT:DIM);   // Deck 90 7.9.13: remaining time
    if(this._cache.time!==time||this._cache.open!==open){this._paintDigits(this._timeDigits,open?'----':time);this._cache.time=time;}
    const track=String(t.track).padStart(2,'0');if(this._cache.track!==track){this._paintDigits(this._trackDigits,track);this._cache.track=track;}
    if(this._cache.total!==t.totalTracks){this._total.replaceChildren(this._dots('/'+String(t.totalTracks).padStart(2,'0'),333,107,1.3));this._cache.total=t.totalTracks;}
    const title=open?'BANDEJA ABIERTA':t.title||'COMPACT DISC';
    if(this._cache.title!==title){this._title.replaceChildren(this._dots(title,0,0,3.3));this._title.setAttribute('transform','translate(391 53)');this._titleWidth=[...title.toUpperCase()].length*19.8;this._titleStarted=performance.now();this._cache.title=title;}
    const artist=open?'OPEN / CLOSE':t.artist;
    if(this._cache.artist!==artist){this._artist.replaceChildren(this._dots(artist,391,92,2.15));this._cache.artist=artist;}
    for(const[key,indicator]of Object.entries(this._indicators)){const on=!open&&(key==='disc'||key==='play'&&t.playing||key==='pause'&&t.paused);for(const dot of indicator.children)dot.setAttribute('fill',on?LIT:DIM);indicator.setAttribute('opacity',open&&key==='play'?'0':'1');}
    this._openStatus.setAttribute('opacity',open?'1':'0');this._progress.setAttribute('width',String(t.duration>0?503*clamp(t.elapsed/t.duration):0));this._cache.open=open;
    this.svg.setAttribute('aria-label',`DECK 90 DC-90. ${open?'Bandeja abierta.':`Pista ${t.track}. ${t.title}. ${t.artist}. ${t.playing?'Reproduciendo':t.paused?'Pausa':'Detenido'}.`}`);this._updateLeds();
  }
  _updateLeds(){const t=this._state.track;for(const[key,b]of Object.entries(this._buttons)){const active=this._state.powered&&(key==='power'||key==='play'&&t.playing||key==='pause'&&t.paused||key==='eject'&&this._state.drawerOpen||key==='repeat'&&this._modes&&this._modes.repeat!=='off'||key==='shuffle'&&this._modes&&this._modes.shuffle);b.led.setAttribute('fill',active?LIT:DIM);b.led.setAttribute('opacity',active?'.9':'.22');b.group.setAttribute('aria-pressed',String(active));if(b.icon)b.icon.setAttribute('fill',active?LIT:'var(--key-label,var(--_d90-key-label,#d2d7d5))');}}
  _paintLevels(){for(const channel of ['left','right']){const count=this._state.powered&&!this._state.drawerOpen&&this._state.track.playing?Math.round(this._state.levels[channel]*24):0;if(count===this._meterCounts[channel])continue;for(let i=0;i<24;i++)this._levelNodes[channel][i].setAttribute('fill',i<count?METER_LIT(i):METER_DIM(i));this._meterCounts[channel]=count;}}
  _paintDrawer(){const travel=LAYOUT.drawer.openTravel*this._drawerPosition;this._drawer.setAttribute('transform',`translate(0 ${travel===0?'0':travel.toFixed(3)})`);this._opening.setAttribute('height',String(Math.max(0,travel+1)));}
  _schedule(){if(!this._destroyed&&this._frame===null)this._frame=requestAnimationFrame(time=>this._tick(time));}
  _tick(time){
    if(this._destroyed)return;this._frame=null;const dt=this._previousTime?Math.max(0,Math.min(64,time-this._previousTime)):16;this._previousTime=time;const diff=this._drawerTarget-this._drawerPosition;
    if(diff!==0){this._drawerPosition=this._motion?.matches?this._drawerTarget:this._drawerPosition+diff*(1-Math.exp(-dt/150));if(Math.abs(this._drawerTarget-this._drawerPosition)<=.00003)this._drawerPosition=this._drawerTarget;this._paintDrawer();}
    const distance=Math.max(0,(this._titleWidth||0)-502);let scroll=false;
    if(distance>0&&this._state.powered){/* Deck 90: scrolls even with Windows' animations off */const travel=distance/30*1000,delay=1500,phase=Math.max(0,time-this._titleStarted)%(2*travel+2*delay);let offset=0;if(phase>delay&&phase<delay+travel)offset=(phase-delay)*.03;else if(phase>=delay+travel&&phase<2*delay+travel)offset=distance;else if(phase>=2*delay+travel)offset=distance-(phase-2*delay-travel)*.03;this._title.setAttribute('transform',`translate(${(391-offset).toFixed(3)} 53)`);scroll=true;}else this._title.setAttribute('transform','translate(391 53)');
    if(scroll||Math.abs(this._drawerTarget-this._drawerPosition)>.00003)this._schedule();
  }
}

global.Deck90CD=Deck90CD;
})(typeof globalThis!=='undefined'?globalThis:window);
