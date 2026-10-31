/**
 * DECK 90 DC-90 COMPACT DISC PLAYER — original wide-drawer rack module.
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
 * --label-dim,--edge,--key-top,--key-bottom,--key-hover,--drawer-face,
 * --drawer-top,--drawer-bottom,--drawer-label. Inherited from the container.
 * Master viewBox1200x220. Physical drawer front1120px =93.3% of rack width.
 *
 * Deck 90 7.9.2: Damián's DC-90 component as delivered, unchanged; src/js/cdunit.js drives it with the PC's drive.
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

/** Original DECK 90 wide-drawer CD rack geometry. The runtime adds the VFD,
 * controls, LEDs and the moving drawer wrapper. No external assets. */
const LAYOUT = Object.freeze({
  width: 1200,
  height: 220,
  display: { x: 145, y: 35, width: 1010, height: 49 },
  displayContent: { x: 160, y: 42, width: 980, height: 35 },
  drawer: {
    x: 35, y: 98, width: 1130, height: 58,
    face: { x: 40, y: 102, width: 1120, height: 49 },
    openTravel: 14,
  },
  powerLed: { x: 75, y: 88, r: 2.2 },
  buttons: {
    power: { x: 35, y: 44, width: 80, height: 35 },
    prev: { x: 145, y: 174, width: 140, height: 29 },
    play: { x: 298, y: 174, width: 160, height: 29 },
    pause: { x: 471, y: 174, width: 140, height: 29 },
    stop: { x: 624, y: 174, width: 140, height: 29 },
    next: { x: 777, y: 174, width: 140, height: 29 },
    eject: { x: 965, y: 174, width: 190, height: 29 },
  },
});

const css = (name, fallback) => `var(--${name},var(--_d90-${name},${fallback}))`;
const safePrefix = prefix => {
  if (!/^[A-Za-z_][\w.-]*$/.test(prefix)) throw new TypeError('A safe unique SVG id prefix is required.');
  return prefix;
};

/** The static chassis, display window and the wide empty drawer recess. */
function buildFaceplate(prefix) {
  const p = safePrefix(prefix);
  const label = css('label', '#303932');
  const dim = css('label-dim', '#687267');
  const edge = css('edge', '#8B938A');
  const top = 'var(--face-top,var(--face,var(--_d90-face-top,#F0F0E9)))';
  const bottom = 'var(--face-bottom,var(--face,var(--_d90-face-bottom,#999F98)))';
  return `<defs>
  <linearGradient id="${p}-plate-metal" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${top}"/>
    <stop offset=".075" stop-color="${css('face', '#CED1CB')}"/>
    <stop offset=".89" stop-color="${css('face', '#CED1CB')}"/>
    <stop offset="1" stop-color="${bottom}"/>
  </linearGradient>
  <linearGradient id="${p}-window-bevel" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#252D28"/><stop offset=".13" stop-color="#020705"/>
    <stop offset=".86" stop-color="#080D0A"/><stop offset="1" stop-color="#85958A"/>
  </linearGradient>
  <linearGradient id="${p}-glass" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#10201B"/><stop offset=".34" stop-color="#040A07"/>
    <stop offset="1" stop-color="#010503"/>
  </linearGradient>
  <linearGradient id="${p}-drawer-well" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#000302"/><stop offset=".12" stop-color="#070C09"/>
    <stop offset=".86" stop-color="#030705"/><stop offset="1" stop-color="#172019"/>
  </linearGradient>
  <linearGradient id="${p}-drawer-metal" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="var(--drawer-top,${top})"/>
    <stop offset=".10" stop-color="var(--drawer-face,var(--_d90-drawer-face,${css('face', '#CED1CB')}))"/>
    <stop offset=".86" stop-color="var(--drawer-face,var(--_d90-drawer-face,${css('face', '#CED1CB')}))"/>
    <stop offset="1" stop-color="var(--drawer-bottom,${bottom})"/>
  </linearGradient>
  <linearGradient id="${p}-drawer-lip" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#070D09"/><stop offset=".28" stop-color="${bottom}"/>
    <stop offset=".72" stop-color="${css('face', '#CED1CB')}"/><stop offset="1" stop-color="#1A211B"/>
  </linearGradient>
  <pattern id="${p}-metal-grain" width="31" height="4.2" patternUnits="userSpaceOnUse">
    <path d="M0 .55H31M4 2.8H23" stroke="${label}" stroke-width=".24" opacity=".15"/>
    <path d="M0 1.5H19M14 3.65H31" stroke="#FFF" stroke-width=".22" opacity=".19"/>
  </pattern>
  <clipPath id="${p}-plate-clip"><rect x="1.3" y="1.3" width="1197.4" height="217.4" rx="4"/></clipPath>
  <clipPath id="${p}-drawer-face-clip"><rect x="40" y="102" width="1120" height="49" rx="2.2"/></clipPath>
  <radialGradient id="${p}-screw-metal" cx="33%" cy="22%" r="78%">
    <stop offset="0" stop-color="#7E867F"/><stop offset=".34" stop-color="#3A433C"/>
    <stop offset="1" stop-color="#101711"/>
  </radialGradient>
  <g id="${p}-rack-screw">
    <circle cx=".5" cy=".8" r="7.3" fill="#000" opacity=".3"/>
    <circle r="7.1" fill="#101712" stroke="${edge}" stroke-width=".6"/>
    <circle r="5.6" fill="url(#${p}-screw-metal)" stroke="#ADB6AB" stroke-opacity=".24" stroke-width=".45"/>
    <path d="M-2.9-1.65L0-3.3l2.9 1.65v3.3L0 3.3l-2.9-1.65Z" fill="#071009" stroke="#626F61" stroke-width=".38"/>
  </g>
  </defs>
  <g id="${p}-faceplate" data-layer="faceplate">
    <rect x=".7" y=".7" width="1198.6" height="218.6" rx="4" fill="url(#${p}-plate-metal)" stroke="${edge}" stroke-width="1.4"/>
    <rect x="1.3" y="1.3" width="1197.4" height="217.4" rx="4" fill="url(#${p}-metal-grain)" clip-path="url(#${p}-plate-clip)"/>
    <path d="M5 3H1195M3 5V215" fill="none" stroke="#FFF" stroke-opacity=".34" stroke-width=".8"/>
    <path d="M5 217H1195M1197 5V215" fill="none" stroke="#000" stroke-opacity=".3" stroke-width="1"/>
    <g font-family="Arial,Helvetica,sans-serif" fill="${label}">
      <text x="39" y="26" font-size="18" font-weight="700" letter-spacing="3.1">DECK 90</text>
      <text x="652" y="23" text-anchor="middle" font-size="10" font-weight="500" letter-spacing="1.8">DC-90 COMPACT DISC PLAYER</text>
    </g>
    <g font-family="Arial,Helvetica,sans-serif" fill="${dim}" font-size="7.1" letter-spacing="1.35">
      <text x="1153" y="23" text-anchor="end">PRECISION DISC TRANSPORT</text>
      <text x="75" y="167" text-anchor="middle">STANDBY</text>
    </g>
    <path d="M35 31H1165" stroke="${dim}" stroke-opacity=".28" stroke-width=".6"/>
    <rect x="144" y="34" width="1012" height="51" rx="4.8" fill="#000" opacity=".23"/>
    <rect x="145" y="35" width="1010" height="49" rx="4.4" fill="url(#${p}-window-bevel)" stroke="${edge}" stroke-width=".7"/>
    <rect x="151" y="39" width="998" height="41" rx="3" fill="#010503"/>
    <rect x="152" y="40" width="996" height="39" rx="2.4" fill="url(#${p}-glass)"/>
    <path d="M157 40.3H1143" stroke="#AEDBD0" stroke-opacity=".12" stroke-width=".55"/>
    <path d="M157 79.4H1143" stroke="#D5E9DD" stroke-opacity=".17" stroke-width=".55"/>
    <path d="M35 93.7H1165" stroke="${dim}" stroke-width=".55" stroke-opacity=".21"/>
    <rect x="34.2" y="97.2" width="1131.6" height="59.6" rx="3.8" fill="#000" opacity=".23"/>
    <rect x="35" y="98" width="1130" height="58" rx="3.2" fill="url(#${p}-window-bevel)" stroke="${edge}" stroke-width=".8"/>
    <rect x="39" y="101" width="1122" height="51.8" rx="2" fill="url(#${p}-drawer-well)"/>
    <path d="M43 102H1157" stroke="#000" stroke-width="2.3" stroke-opacity=".9"/>
    <path d="M44 151.9H1156" stroke="#68776C" stroke-width=".6" stroke-opacity=".45"/>
    <path d="M43 105V149M1157 105V149" stroke="#48554B" stroke-width=".55" stroke-opacity=".45"/>
    <path d="M34 164H1166" stroke="${dim}" stroke-opacity=".21" stroke-width=".6"/>
    <use href="#${p}-rack-screw" x="17" y="16"/><use href="#${p}-rack-screw" x="1183" y="16"/>
    <use href="#${p}-rack-screw" x="17" y="204"/><use href="#${p}-rack-screw" x="1183" y="204"/>
  </g>`;
}

/** The movable front lip is 1120 px wide, 93.3% of the complete 1200 px unit.
 * Keep it in a separate runtime wrapper to animate the opening without changing
 * the static drawer recess or the display. The closed state has no visible disc. */
function buildDrawer(prefix) {
  const p = safePrefix(prefix);
  const label = 'var(--drawer-label,var(--_d90-drawer-label,var(--label,var(--_d90-label,#303932))))';
  const edge = css('edge', '#8B938A');
  return `<g id="${p}-drawer-face" data-role="drawer-detail">
    <rect x="40.2" y="103.6" width="1119.6" height="49" rx="2.3" fill="#000" opacity=".47"/>
    <rect x="40" y="102" width="1120" height="49" rx="2.2" fill="url(#${p}-drawer-metal)" stroke="${edge}" stroke-width=".65" data-role="drawer-face"/>
    <rect x="40" y="102" width="1120" height="49" rx="2.2" fill="url(#${p}-metal-grain)" opacity=".7" clip-path="url(#${p}-drawer-face-clip)"/>
    <path d="M43 103.3H1157" stroke="#FFF" stroke-width=".65" stroke-opacity=".4"/>
    <path d="M43 149.5H1157" stroke="#101811" stroke-width="1.35" stroke-opacity=".52"/>
    <path d="M41.3 105V148M1158.7 105V148" stroke="#FFF" stroke-width=".65" stroke-opacity=".18"/>
    <rect x="41" y="147.8" width="1118" height="3.2" rx=".7" fill="url(#${p}-drawer-lip)"/>
    <text x="600" y="128.8" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="8.3" font-weight="400" letter-spacing="3.35" fill="${label}" fill-opacity=".67">COMPACT DISC</text>
    <path d="M532 132H668" stroke="${label}" stroke-width=".35" stroke-opacity=".13"/>
  </g>`;
}


const SVG_NS = 'http://www.w3.org/2000/svg';
const LIT = 'var(--vfd,#80ffe5)', DIM = 'var(--vfd-dim,#193e34)';
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
    this.svg=node('svg',{xmlns:SVG_NS,viewBox:'0 0 1200 220',width:'100%',preserveAspectRatio:'xMidYMid meet',role:'group','aria-label':'DECK 90 DC-90 Compact Disc Player','data-deck90-cd':this.prefix});
    this.svg.style.width='100%';this.svg.style.height='auto';this.svg.style.display='block';this.svg.style.userSelect='none';this.svg.style.touchAction='pan-y';
    this._applyTheme();this.svg.innerHTML=buildFaceplate(this.prefix);
    const defs=node('defs');defs.innerHTML=`<clipPath id="${this.prefix}-title-clip"><rect x="366" y="42" width="505" height="15"/></clipPath><clipPath id="${this.prefix}-artist-clip"><rect x="366" y="61" width="505" height="13"/></clipPath><filter id="${this.prefix}-vfd-glow" x="-12%" y="-25%" width="124%" height="150%"><feGaussianBlur stdDeviation=".55" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter><linearGradient id="${this.prefix}-key" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--key-top,var(--_d90-key-top))"/><stop offset=".18" stop-color="var(--face,var(--_d90-face))"/><stop offset="1" stop-color="var(--key-bottom,var(--_d90-key-bottom))"/></linearGradient>`;this.svg.append(defs);
    this._opening=node('rect',{x:43,y:102,width:1114,height:0,rx:1.4,fill:'#010403','data-role':'drawer-opening'});this.svg.append(this._opening);
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
    const values=this._state.theme==='black'?{face:'#272c2b','face-top':'#454c48','face-bottom':'#151a18',label:'#d3d9d1','label-dim':'#929f95',edge:'#59635c','key-top':'#525b54','key-bottom':'#171e19','drawer-face':'#181f1b','drawer-label':'#afc0b2'}:{face:'#ced1cb','face-top':'#f0f0e9','face-bottom':'#999f98',label:'#303932','label-dim':'#5c685e',edge:'#89918a','key-top':'#eceee7','key-bottom':'#949e92','drawer-face':'#a3ada5','drawer-label':'#29382c'};
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
    this._timeDigits=this._digitGroup(166,43,4,.63,true);this._trackDigits=this._digitGroup(285,54,2,.43);
    this._display.append(this._dots('TRACK',282,43,.94));this._total=node('g',{'data-role':'total-tracks'});this._display.append(this._total);
    const clip=node('g',{'data-role':'title-viewport','clip-path':`url(#${this.prefix}-title-clip)`});this._title=node('g',{'data-role':'title'});clip.append(this._title);this._display.append(clip);
    const artistClip=node('g',{'clip-path':`url(#${this.prefix}-artist-clip)`});this._artist=node('g',{'data-role':'artist'});artistClip.append(this._artist);this._display.append(artistClip);
    this._display.append(node('rect',{x:367,y:78,width:503,height:1.5,fill:DIM}));this._progress=node('rect',{x:367,y:78,width:0,height:1.5,fill:LIT,'data-role':'progress'});this._display.append(this._progress);
    this._indicators={};for(const[word,x]of [['PLAY',891],['PAUSE',962],['DISC',1045]]){const group=this._dots(word,x,44,1.15);this._indicators[word.toLowerCase()]=group;this._display.append(group);}
    this._openStatus=this._dots('OPEN',891,44,1.15);this._openStatus.setAttribute('opacity','0');this._display.append(this._openStatus);
    this._levelNodes={};for(const[channel,letter,y]of [['left','L',62],['right','R',73]]){const g=node('g',{'data-role':channel==='left'?'level-l':'level-r'});g.append(this._dots(letter,891,y-1,.8));this._levelNodes[channel]=[];for(let i=0;i<24;i++){const segment=node('rect',{x:904+i*9.55,y,width:7.3,height:4.2,rx:.45,fill:DIM,'data-index':i});g.append(segment);this._levelNodes[channel].push(segment);}this._display.append(g);}
  }
  _buildControls(){
    this._buttons={};const labels={power:'POWER',prev:'PREVIOUS',play:'PLAY',pause:'PAUSE',stop:'STOP',next:'NEXT',eject:'OPEN / CLOSE'};
    for(const[key,box]of Object.entries(LAYOUT.buttons)){
      const group=node('g',{'data-key':key,role:'button',tabindex:0,'aria-label':labels[key],'aria-pressed':'false'});group.style.cursor='pointer';group.style.outline='none';
      const face=node('rect',{x:box.x,y:box.y,width:box.width,height:box.height,rx:2.5,fill:`url(#${this.prefix}-key)`,stroke:'var(--edge,var(--_d90-edge))','stroke-width':.9});
      group.append(node('rect',{x:box.x,y:box.y+1.8,width:box.width,height:box.height,rx:2.5,fill:'#080e0a',opacity:.75}),face,node('path',{d:`M${box.x+3} ${box.y+1.3}H${box.x+box.width-3}`,stroke:'#fff','stroke-opacity':.35,'stroke-width':.7}));
      if(key==='power'){const text=node('text',{x:box.x+box.width/2,y:box.y+box.height/2+3,'text-anchor':'middle','font-family':'Arial,Helvetica,sans-serif','font-size':10,'font-weight':700,'letter-spacing':.7,fill:'var(--label,var(--_d90-label))'});text.textContent='POWER';group.append(text);}
      else group.append(this._icon(key,box.x+box.width/2,box.y+box.height/2));
      const led=node('rect',{x:box.x+7,y:box.y+box.height-3.6,width:box.width-14,height:1.2,fill:DIM,opacity:.25});group.append(led);
      this._buttons[key]={group,face,led,pressed:false,hover:false,focused:false};this.svg.append(group);
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
    const g=node('g',{transform:`translate(${x} ${y})`,fill:'var(--label,var(--_d90-label))','pointer-events':'none'});
    const paths={play:'M-4-6L6 0L-4 6Z',stop:'M-5-5H5V5H-5Z',pause:'M-5-5H-1V5H-5ZM1-5H5V5H1Z',prev:'M-7-5H-5V5H-7ZM-4 0L3-5V5ZM3 0L10-5V5Z',next:'M7-5H9V5H7ZM-8-5L-1 0L-8 5ZM-1-5L6 0L-1 5Z',eject:'M-6 2L0-5L6 2ZM-6 4H6V6H-6Z'};
    g.append(node('path',{d:paths[key]||''}));return g;
  }
  _paintButton(key){const b=this._buttons[key];b.face.setAttribute('fill',b.pressed?'var(--key-bottom,var(--_d90-key-bottom))':b.hover?'var(--key-hover,var(--key-top,var(--_d90-key-top)))':`url(#${this.prefix}-key)`);b.group.setAttribute('transform',b.pressed?'translate(0 .9)':'translate(0 0)');b.face.setAttribute('stroke',b.focused?LIT:'var(--edge,var(--_d90-edge))');b.face.setAttribute('stroke-width',b.focused?'1.7':'.9');}
  _emit(key,hold){if(!this._destroyed)for(const callback of [...this._callbacks])callback(key,{hold:Boolean(hold)});}
  _renderTrack(){
    const t=this._state.track,open=this._state.drawerOpen;
    const seconds=Math.floor(t.elapsed),time=String(Math.floor(seconds/60)).padStart(2,'0')+String(seconds%60).padStart(2,'0');
    if(this._cache.time!==time||this._cache.open!==open){this._paintDigits(this._timeDigits,open?'----':time);this._cache.time=time;}
    const track=String(t.track).padStart(2,'0');if(this._cache.track!==track){this._paintDigits(this._trackDigits,track);this._cache.track=track;}
    if(this._cache.total!==t.totalTracks){this._total.replaceChildren(this._dots('/'+String(t.totalTracks).padStart(2,'0'),318,68,.95));this._cache.total=t.totalTracks;}
    const title=open?'BANDEJA ABIERTA':t.title||'COMPACT DISC';
    if(this._cache.title!==title){this._title.replaceChildren(this._dots(title,0,0,1.65));this._title.setAttribute('transform','translate(367 43)');this._titleWidth=[...title.toUpperCase()].length*9.9;this._titleStarted=performance.now();this._cache.title=title;}
    const artist=open?'OPEN / CLOSE':t.artist;
    if(this._cache.artist!==artist){this._artist.replaceChildren(this._dots(artist,367,63,1.15));this._cache.artist=artist;}
    for(const[key,indicator]of Object.entries(this._indicators)){const on=!open&&(key==='disc'||key==='play'&&t.playing||key==='pause'&&t.paused);for(const dot of indicator.children)dot.setAttribute('fill',on?LIT:DIM);indicator.setAttribute('opacity',open&&key==='play'?'0':'1');}
    this._openStatus.setAttribute('opacity',open?'1':'0');this._progress.setAttribute('width',String(t.duration>0?503*clamp(t.elapsed/t.duration):0));this._cache.open=open;
    this.svg.setAttribute('aria-label',`DECK 90 DC-90. ${open?'Bandeja abierta.':`Pista ${t.track}. ${t.title}. ${t.artist}. ${t.playing?'Reproduciendo':t.paused?'Pausa':'Detenido'}.`}`);this._updateLeds();
  }
  _updateLeds(){const t=this._state.track;for(const[key,b]of Object.entries(this._buttons)){const active=this._state.powered&&(key==='power'||key==='play'&&t.playing||key==='pause'&&t.paused||key==='eject'&&this._state.drawerOpen);b.led.setAttribute('fill',active?LIT:DIM);b.led.setAttribute('opacity',active?'.9':'.22');b.group.setAttribute('aria-pressed',String(active));}}
  _paintLevels(){for(const channel of ['left','right']){const count=this._state.powered&&!this._state.drawerOpen&&this._state.track.playing?Math.round(this._state.levels[channel]*24):0;if(count===this._meterCounts[channel])continue;for(let i=0;i<24;i++)this._levelNodes[channel][i].setAttribute('fill',i<count?LIT:DIM);this._meterCounts[channel]=count;}}
  _paintDrawer(){const travel=LAYOUT.drawer.openTravel*this._drawerPosition;this._drawer.setAttribute('transform',`translate(0 ${travel===0?'0':travel.toFixed(3)})`);this._opening.setAttribute('height',String(Math.max(0,travel+1)));}
  _schedule(){if(!this._destroyed&&this._frame===null)this._frame=requestAnimationFrame(time=>this._tick(time));}
  _tick(time){
    if(this._destroyed)return;this._frame=null;const dt=this._previousTime?Math.max(0,Math.min(64,time-this._previousTime)):16;this._previousTime=time;const diff=this._drawerTarget-this._drawerPosition;
    if(diff!==0){this._drawerPosition=this._motion?.matches?this._drawerTarget:this._drawerPosition+diff*(1-Math.exp(-dt/150));if(Math.abs(this._drawerTarget-this._drawerPosition)<=.00003)this._drawerPosition=this._drawerTarget;this._paintDrawer();}
    const distance=Math.max(0,(this._titleWidth||0)-502);let scroll=false;
    if(distance>0&&this._state.powered&&!this._motion?.matches){const travel=distance/30*1000,delay=1500,phase=Math.max(0,time-this._titleStarted)%(2*travel+2*delay);let offset=0;if(phase>delay&&phase<delay+travel)offset=(phase-delay)*.03;else if(phase>=delay+travel&&phase<2*delay+travel)offset=distance;else if(phase>=2*delay+travel)offset=distance-(phase-2*delay-travel)*.03;this._title.setAttribute('transform',`translate(${(367-offset).toFixed(3)} 43)`);scroll=true;}else this._title.setAttribute('transform','translate(367 43)');
    if(scroll||Math.abs(this._drawerTarget-this._drawerPosition)>.00003)this._schedule();
  }
}

global.Deck90CD=Deck90CD;
})(typeof globalThis!=='undefined'?globalThis:window);
