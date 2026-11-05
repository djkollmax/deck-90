'use strict';
// ═══════════════════════════════════════
//  DV-90 MASTER VOLUME (7.10.11): the faceplate of the rack's volume unit (1200 × 280, the DT-90's and DC-90's size),
//  in their materials: the plate, the keys, the screws and the VFD. It shows the computer's volume big, a bar of it,
//  MUTE, and the L/R level of what plays; a big VOLUME knob (turned by dragging round it or with the wheel), MUTE,
//  − and +, and keys for 10 … 80. It only draws and says what was touched; ui/volume/volume.js sets the volume.
//
//    const dv = new Deck90VolumeUnit(container, { theme: 'silver' | 'black' });
//    dv.setVolume({ vol: 0–100 or -1 (unknown), mute });  dv.setLevels(l, r);  dv.setTheme(t);  dv.setDimmer(0–2)
//    dv.onKey((key, { value, hold }) => …)   keys: mute, down, up, p10 … p80, knob (value: the volume the knob was turned
//    to), color (hold: held), dimmer
// ═══════════════════════════════════════
(function (global) {
const SVG_NS = 'http://www.w3.org/2000/svg';
const LIT = 'var(--vfd,#80ffe5)', DIM = 'var(--vfd-dim,#193e34)';
const METER_LIT = i => i >= 44 ? '#ff4a3d' : i >= 38 ? '#ffd23a' : LIT, METER_DIM = i => i >= 44 ? '#40171299' : i >= 38 ? '#3d331299' : DIM;
const SEVEN = { a: '5,1 25,1 28,4 25,7 5,7 2,4', b: '26,6 29,9 29,22 26,25 23,22 23,9', c: '26,27 29,30 29,43 26,46 23,43 23,30',
  d: '5,45 25,45 28,48 25,51 5,51 2,48', e: '4,27 7,30 7,43 4,46 1,43 1,30', f: '4,6 7,9 7,22 4,25 1,22 1,9', g: '5,23 25,23 28,26 25,29 5,29 2,26' };
const DIGITS = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgecd', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg', '-': 'g', ' ': '' };
// 5 × 7 dots, the units' glyphs (only what this display writes)
const DOTS = { V: [17, 17, 17, 17, 17, 10, 4], O: [14, 17, 17, 17, 17, 17, 14], L: [16, 16, 16, 16, 16, 16, 31], U: [17, 17, 17, 17, 17, 17, 14],
  M: [17, 27, 21, 21, 17, 17, 17], E: [31, 16, 16, 30, 16, 16, 31], T: [31, 4, 4, 4, 4, 4, 4], R: [30, 17, 17, 30, 20, 18, 17], '%': [24, 25, 2, 4, 8, 19, 3],
  S: [15, 16, 16, 14, 1, 1, 30], Y: [17, 17, 10, 4, 4, 4, 4], N: [17, 25, 21, 19, 17, 17, 17], A: [14, 17, 17, 31, 17, 17, 17], I: [14, 4, 4, 4, 4, 4, 14],
  W: [17, 17, 17, 21, 21, 21, 10], D: [28, 18, 17, 17, 17, 18, 28], '0': [14, 17, 19, 21, 25, 17, 14], '1': [4, 12, 4, 4, 4, 4, 14], '2': [14, 17, 1, 2, 4, 8, 31],
  '3': [31, 2, 4, 2, 1, 17, 14], '4': [2, 6, 10, 18, 31, 2, 2], '5': [31, 16, 30, 1, 1, 17, 14], '6': [6, 8, 16, 30, 17, 17, 14], '7': [31, 1, 2, 4, 8, 8, 8],
  '8': [14, 17, 17, 14, 17, 17, 14], '9': [14, 17, 17, 15, 1, 2, 12], '·': [0, 0, 0, 4, 0, 0, 0], ' ': [0, 0, 0, 0, 0, 0, 0], '-': [0, 0, 0, 31, 0, 0, 0],
  // 7.10.14: the rest of the alphabet, for the DE-90
  B: [30, 17, 17, 30, 17, 17, 30], C: [14, 17, 16, 16, 16, 17, 14], F: [31, 16, 16, 30, 16, 16, 16], G: [14, 17, 16, 23, 17, 17, 15], H: [17, 17, 17, 31, 17, 17, 17],
  J: [7, 2, 2, 2, 2, 18, 12], K: [17, 18, 20, 24, 20, 18, 17], P: [30, 17, 17, 30, 16, 16, 16], Q: [14, 17, 17, 17, 21, 18, 13], X: [17, 17, 10, 4, 10, 17, 17],
  Z: [31, 1, 2, 4, 8, 16, 31], '+': [0, 4, 4, 31, 4, 4, 0], '.': [0, 0, 0, 0, 0, 12, 12], '/': [1, 1, 2, 4, 8, 16, 16] };
const KEYS = { mute: { x: 35, y: 196, w: 96, h: 32, label: 'MUTE' }, down: { x: 146, y: 196, w: 64, h: 32, label: '−' }, up: { x: 218, y: 196, w: 64, h: 32, label: '+' } };
[10, 20, 30, 40, 50, 60, 70, 80].forEach((v, i) => { KEYS['p' + v] = { x: 300 + i * 64, y: 196, w: 58, h: 32, label: String(v) }; });
// 7.10.15: the rack's displays from here too (they were only on the DM-90): COLOR (held, the one before) and DIMMER
KEYS.color = { x: 826, y: 196, w: 60, h: 32, label: 'COLOR' }; KEYS.dimmer = { x: 892, y: 196, w: 64, h: 32, label: 'DIMMER' };
const KNOB = { cx: 1062, cy: 206, r: 52 }, SPAN = 135;            // the knob turns from −135° (0) to +135° (100)
const NAMES = { mute: 'MUTE: silencio', down: 'Bajar el volumen', up: 'Subir el volumen', color: 'Color de los displays del rack', dimmer: 'Brillo de los displays del rack' };
let count = 0;
function node(name, attrs = {}) { const el = document.createElementNS(SVG_NS, name); for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v)); return el; }
const css = (name, fallback) => `var(--${name},var(--_d90-${name},${fallback}))`;
function dotsPath(text, x, y, pitch) {
  const r = pitch * .42, d = []; let i = 0;
  for (const ch of String(text).toUpperCase()) {
    const rows = DOTS[ch] || DOTS[' '];
    for (let row = 0; row < 7; row++) for (let col = 0; col < 5; col++) if (rows[row] & (1 << (4 - col))) {
      const cx = x + (i * 6 + col + .5) * pitch, cy = y + (row + .5) * pitch;
      d.push(`M${(cx - r).toFixed(2)} ${cy.toFixed(2)}a${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(2 * r).toFixed(2)} 0a${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(-2 * r).toFixed(2)} 0`);
    }
    i++;
  }
  return d.join('');
}
function grain(label) {
  let seed = 904031, paths = '';
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < 34; i++) {
    const y = (.17 + i * .535 + random() * .17).toFixed(3), x = (random() * 255).toFixed(2), length = (120 + random() * 237).toFixed(2);
    paths += `<path d="M${x} ${y}h${length}" stroke="${label}" stroke-width=".16" opacity="${(.035 + random() * .055).toFixed(3)}"/>`;
  }
  return paths;
}
// 7.10.14: the plate is shared with the DE-90 (de90.js): its title, the label at the right and the small labels vary
const VOLUME_PLATE = { title: 'DV-90 MASTER VOLUME', side: 'SYSTEM OUTPUT', labels: [] };
function faceplate(p, o = VOLUME_PLATE) {
  const label = css('label', '#313332'), dim = css('label-dim', '#666c68'), edge = css('edge', '#838d86');
  const top = 'var(--face-top,var(--face,var(--_d90-face-top,#deded8)))', face = css('face', '#bfc3bc'), bottom = 'var(--face-bottom,var(--face,var(--_d90-face-bottom,#8e968e)))';
  const H = 280, DY = 36, DH = 104;
  return `<defs>
    <linearGradient id="${p}-chassis" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#626a64"/><stop offset=".02" stop-color="#232a25"/><stop offset=".08" stop-color="#151b17"/><stop offset=".9" stop-color="#1b221d"/><stop offset=".98" stop-color="#090d0b"/><stop offset="1" stop-color="#545d55"/></linearGradient>
    <linearGradient id="${p}-plate" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${bottom}"/><stop offset=".018" stop-color="${top}"/><stop offset=".05" stop-color="${face}"/><stop offset=".2" stop-color="${top}"/><stop offset=".45" stop-color="${face}"/><stop offset=".75" stop-color="${face}"/><stop offset=".88" stop-color="${top}"/><stop offset=".98" stop-color="${bottom}"/><stop offset="1" stop-color="${top}"/></linearGradient>
    <linearGradient id="${p}-bevel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#070b08"/><stop offset=".03" stop-color="#9ba79e"/><stop offset=".06" stop-color="#363e38"/><stop offset=".12" stop-color="#070c09"/><stop offset=".88" stop-color="#010503"/><stop offset=".95" stop-color="#222c24"/><stop offset=".98" stop-color="#a0aba0"/><stop offset="1" stop-color="#101811"/></linearGradient>
    <linearGradient id="${p}-glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#09110e"/><stop offset=".08" stop-color="#020806"/><stop offset=".85" stop-color="#010604"/><stop offset="1" stop-color="#030a06"/></linearGradient>
    <linearGradient id="${p}-key" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--key-top,var(--_d90-key-top))"/><stop offset=".08" stop-color="var(--key-top,var(--_d90-key-top))"/><stop offset=".18" stop-color="var(--key-face,var(--_d90-key-face))"/><stop offset=".78" stop-color="var(--key-face,var(--_d90-key-face))"/><stop offset=".94" stop-color="var(--key-bottom,var(--_d90-key-bottom))"/><stop offset="1" stop-color="var(--key-top,var(--_d90-key-top))"/></linearGradient>
    <radialGradient id="${p}-knob" cx="38%" cy="30%" r="75%"><stop offset="0" stop-color="#e9ece8"/><stop offset=".35" stop-color="#b7bdb7"/><stop offset=".75" stop-color="#7d847e"/><stop offset="1" stop-color="#3f4641"/></radialGradient>
    <pattern id="${p}-grain" width="612" height="18.4" patternUnits="userSpaceOnUse">${grain(label)}</pattern>
    <clipPath id="${p}-plate-clip"><rect x="4.8" y="4.8" width="1190.4" height="${H - 9.6}" rx="2.4"/></clipPath>
    <filter id="${p}-glow" x="-5%" y="-20%" width="110%" height="140%"><feGaussianBlur stdDeviation=".55" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="${p}-glow-hi" x="-5%" y="-20%" width="110%" height="140%"><feGaussianBlur stdDeviation="1.3" result="halo"/><feGaussianBlur in="SourceGraphic" stdDeviation=".5" result="blur"/><feMerge><feMergeNode in="halo"/><feMergeNode in="halo"/><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <radialGradient id="${p}-screw" cx="30%" cy="20%" r="79%"><stop offset="0" stop-color="#a4ada4"/><stop offset=".23" stop-color="#5c685e"/><stop offset=".6" stop-color="#263329"/><stop offset="1" stop-color="#0c140e"/></radialGradient>
    <g id="${p}-rack-screw"><circle cx=".45" cy=".9" r="7.55" fill="#010403" opacity=".63"/><circle r="7.1" fill="#121b14" stroke="${edge}" stroke-width=".65"/><circle r="6.05" fill="url(#${p}-screw)" stroke="#c4cfc1" stroke-opacity=".37" stroke-width=".42"/><path d="M-2.9-1.65L0-3.3l2.9 1.65v3.3L0 3.3l-2.9-1.65Z" fill="#071009" stroke="#70806e" stroke-width=".38"/></g>
  </defs>
  <g data-layer="faceplate">
    <rect x=".65" y=".65" width="1198.7" height="${H - 1.3}" rx="5.1" fill="url(#${p}-chassis)" stroke="#080d0a" stroke-width="1.3"/>
    <rect x="2.1" y="2.1" width="1195.8" height="${H - 4.2}" rx="4" fill="#a5ada5" stroke="#030705" stroke-opacity=".8" stroke-width=".55"/>
    <rect x="4.35" y="4.35" width="1191.3" height="${H - 8.7}" rx="2.8" fill="url(#${p}-plate)" stroke="#050b07" stroke-width=".65"/>
    <rect x="4.8" y="4.8" width="1190.4" height="${H - 9.6}" rx="2.4" fill="url(#${p}-grain)" clip-path="url(#${p}-plate-clip)"/>
    <path d="M6 5.4H1194M5.4 6V${H - 6}" fill="none" stroke="#fff" stroke-opacity=".33" stroke-width=".65"/>
    <g font-family="Arial,Helvetica,sans-serif" fill="${label}">
      <text x="39" y="26" font-size="18" font-weight="700" letter-spacing="3.1">DECK 90</text>
      <text x="652" y="23" text-anchor="middle" font-size="10" font-weight="500" letter-spacing="1.8">${o.title}</text>
    </g>
    <g font-family="Arial,Helvetica,sans-serif" fill="${dim}" font-size="7.1" letter-spacing="1.35">
      <text x="1153" y="23" text-anchor="end">${o.side}</text>
      ${o === VOLUME_PLATE ? `<text x="${KNOB.cx}" y="${H - 9}" text-anchor="middle" font-size="6.6">VOLUME</text>
      <text x="35" y="185">MUTE</text><text x="146" y="185">− DOWN</text><text x="218" y="185">UP +</text><text x="300" y="185">LEVEL</text><text x="826" y="185">DISPLAY</text>`
        : o.labels.map(([x, y, t, a]) => `<text x="${x}" y="${y}"${a ? ` text-anchor="${a}"` : ''}${y > 260 ? ' font-size="6.6"' : ''}>${t}</text>`).join('')}
    </g>
    <path d="M35 31H1165" stroke="#050b07" stroke-opacity=".25" stroke-width=".7"/>
    <rect x="33.4" y="${DY - .2}" width="1133.2" height="${DH + 2.2}" rx="4.4" fill="#000" opacity=".5"/>
    <rect x="35" y="${DY}" width="1130" height="${DH}" rx="4.4" fill="url(#${p}-bevel)" stroke="${edge}" stroke-width=".7"/>
    <rect x="38.6" y="${DY + 3.3}" width="1122.8" height="${DH - 6.6}" rx="3.3" fill="#000302" stroke="#020705" stroke-width="1.4"/>
    <rect x="41.2" y="${DY + 5}" width="1117.6" height="${DH - 10}" rx="2.5" fill="url(#${p}-glass)"/>
    <path d="M45 ${DY + 5.3}H1155" stroke="#d9eee2" stroke-opacity=".14" stroke-width=".55"/>
    <path d="M35 155.2H990" stroke="#050c07" stroke-width=".6" stroke-opacity=".27"/><path d="M35 155.85H990" stroke="#fff" stroke-width=".42" stroke-opacity=".19"/>
    <use href="#${p}-rack-screw" x="17" y="16"/><use href="#${p}-rack-screw" x="1183" y="16"/>
    <use href="#${p}-rack-screw" x="17" y="${H - 16}"/><use href="#${p}-rack-screw" x="1183" y="${H - 16}"/>
  </g>`;
}

class Deck90VolumeUnit {
  constructor(container, { theme = 'silver' } = {}) {
    if (!container || !container.appendChild) throw new TypeError('Deck90VolumeUnit needs a container element.');
    this.root = container; this.prefix = 'deck90dv-' + (++count);
    this._state = { theme: theme === 'black' ? 'black' : 'silver', vol: -1, mute: false, levels: { left: 0, right: 0 } };
    this._callbacks = new Set(); this._listeners = []; this._dim = 0; this._lastLv = { left: -1, right: -1 };
    this.svg = node('svg', { xmlns: SVG_NS, viewBox: '0 0 1200 280', width: '100%', preserveAspectRatio: 'xMidYMid meet', role: 'group', 'aria-label': 'DECK 90 DV-90 Master Volume' });
    Object.assign(this.svg.style, { width: '100%', height: 'auto', display: 'block', userSelect: 'none' });
    this._applyTheme();
    this.svg.innerHTML = faceplate(this.prefix);
    this._display = node('g', { 'data-role': 'display', 'aria-hidden': 'true', filter: `url(#${this.prefix}-glow-hi)` });
    this.svg.append(this._display);
    this._buildDisplay(); this._buildKeys(); this._buildKnob();
    this.root.appendChild(this.svg);
    this._render();
  }
  onKey(cb) { this._callbacks.add(cb); return () => this._callbacks.delete(cb); }
  getState() { return JSON.parse(JSON.stringify(this._state)); }
  setVolume({ vol, mute } = {}) {
    if (vol !== undefined) this._state.vol = Number.isFinite(+vol) && +vol >= 0 ? Math.min(100, Math.round(+vol)) : -1;
    if (mute !== undefined) this._state.mute = !!mute;
    this._render(); return this;
  }
  setLevels(left, right) {
    const c = v => Math.max(0, Math.min(1, Number(v) || 0));
    this._state.levels = { left: c(left), right: c(right) }; this._paintLevels(); return this;
  }
  setTheme(theme) { this._state.theme = theme === 'black' ? 'black' : 'silver'; this._applyTheme(); return this; }
  setDimmer(level) {
    this._dim = [0, 1, 2].includes(level) ? level : 0;
    this._display.setAttribute('filter', `url(#${this.prefix}-glow${this._dim === 2 ? '' : '-hi'})`);
    this._display.setAttribute('opacity', this._dim === 2 ? '.6' : '1');
    return this;
  }
  destroy() { for (const [el, ev, fn, o] of this._listeners) el.removeEventListener(ev, fn, o); this._callbacks.clear(); this.svg.remove(); }
  _listen(el, ev, fn, o) { el.addEventListener(ev, fn, o); this._listeners.push([el, ev, fn, o]); }
  _emit(key, info = {}) { for (const cb of [...this._callbacks]) cb(key, info); }
  _applyTheme() {
    const v = this._state.theme === 'black'
      ? { face: '#292c2d', 'face-top': '#484c4d', 'face-bottom': '#101415', label: '#d0d1cb', 'label-dim': '#969e97', edge: '#646a67', 'key-top': '#505659', 'key-face': '#272d30', 'key-bottom': '#0c1114', 'key-label': '#cdd2d1' }
      : { face: '#c7c5be', 'face-top': '#ece9df', 'face-bottom': '#92938d', label: '#2d302e', 'label-dim': '#686d67', edge: '#90958f', 'key-top': '#5c6366', 'key-face': '#30363a', 'key-bottom': '#101719', 'key-label': '#d2d7d5' };
    for (const [k, val] of Object.entries(v)) this.svg.style.setProperty('--_d90-' + k, val);
    this.svg.setAttribute('data-theme', this._state.theme);
  }
  _buildDisplay() {
    const D = this._display;
    D.append(node('path', { d: dotsPath('VOLUME', 60, 50, 1.5), fill: LIT }));
    // three big digits, the volume (0–100)
    this._digits = [];
    const g = node('g', { transform: 'translate(60 66) scale(1.12)' });
    for (let i = 0; i < 3; i++) {
      const cell = node('g', { transform: `translate(${i * 34} 0)` }), seg = {};
      for (const [n, pts] of Object.entries(SEVEN)) { seg[n] = node('polygon', { points: pts, fill: DIM }); cell.append(seg[n]); }
      this._digits.push(seg); g.append(cell);
    }
    D.append(g);
    this._pct = node('path', { d: dotsPath('%', 182, 110, 1.5), fill: DIM }); D.append(this._pct);
    this._muteText = node('path', { d: dotsPath('MUTE', 205, 50, 1.6), fill: DIM }); D.append(this._muteText);
    // the bar: 50 cells, one for every 2 %
    this._bar = [];
    for (let i = 0; i < 50; i++) { const r = node('rect', { x: 300 + i * 16.8, y: 52, width: 14.2, height: 24, rx: 1, fill: DIM }); D.append(r); this._bar.push(r); }
    D.append(node('path', { d: dotsPath('0', 300, 82, 1.1), fill: DIM }), node('path', { d: dotsPath('50', 715, 82, 1.1), fill: DIM }), node('path', { d: dotsPath('100', 1122, 82, 1.1), fill: DIM }));
    // what plays: L and R, 50 cells each, yellow and red at the top
    this._meters = { left: [], right: [] };
    for (const [ch, letter, y] of [['left', 'L', 100], ['right', 'R', 116]]) {
      D.append(node('path', { d: dotsPath(letter, 286, y, 1.1), fill: LIT }));
      for (let i = 0; i < 50; i++) { const r = node('rect', { x: 300 + i * 16.8, y, width: 14.2, height: 8, rx: .6, fill: METER_DIM(i) }); D.append(r); this._meters[ch].push(r); }
    }
  }
  _buildKeys() {
    this._buttons = {};
    const label = 'var(--key-label,var(--_d90-key-label,#d2d7d5))';
    for (const [key, b] of Object.entries(KEYS)) {
      const g = node('g', { 'data-key': key, role: 'button', tabindex: 0, 'aria-label': NAMES[key] || 'Volumen al ' + b.label });
      g.style.cursor = 'pointer'; g.style.outline = 'none';
      const face = node('rect', { x: b.x, y: b.y, width: b.w, height: b.h, rx: 2.5, fill: `url(#${this.prefix}-key)`, stroke: 'var(--edge,var(--_d90-edge))', 'stroke-width': .9 });
      const size = key === 'down' || key === 'up' ? 20 : key === 'color' || key === 'dimmer' ? 10.5 : 12;
      const t = node('text', { x: b.x + b.w / 2, y: b.y + b.h / 2 + size * .36, 'text-anchor': 'middle', 'font-family': 'Arial,Helvetica,sans-serif', 'font-size': size, 'font-weight': 700, 'letter-spacing': .7, fill: label, 'pointer-events': 'none' });
      t.textContent = b.label;
      const led = node('rect', { x: b.x + 7, y: b.y + b.h - 3.6, width: b.w - 14, height: 1.2, fill: DIM, opacity: .25 });
      g.append(node('rect', { x: b.x, y: b.y + 1.8, width: b.w, height: b.h, rx: 2.5, fill: '#080e0a', opacity: .75 }), face,
        node('path', { d: `M${b.x + 3} ${b.y + 1.3}H${b.x + b.w - 3}`, stroke: '#fff', 'stroke-opacity': .35, 'stroke-width': .7 }), t, led);
      this._buttons[key] = { g, face, led };
      this.svg.append(g);
      let repeat = 0, colorAt = 0;
      const stop = () => { clearTimeout(repeat); clearInterval(repeat); repeat = 0; face.setAttribute('transform', ''); };
      const up = () => { if (colorAt) { const held = performance.now() - colorAt > 600; colorAt = 0; this._emit('color', { hold: held }); } stop(); };
      // − and + repeat while held, as a volume key does
      this._listen(g, 'pointerdown', e => {
        if (e.button !== undefined && e.button !== 0) return;
        e.preventDefault(); try { g.setPointerCapture(e.pointerId); } catch (_) {}
        face.setAttribute('transform', `translate(0 1)`);
        if (key === 'color') { colorAt = performance.now(); return; }   // said when let go: held, the colour before
        this._emit(key);
        if (key === 'down' || key === 'up') repeat = setTimeout(() => { repeat = setInterval(() => this._emit(key), 90); }, 400);
      });
      this._listen(g, 'pointerup', up); this._listen(g, 'pointercancel', () => { colorAt = 0; stop(); }); this._listen(g, 'lostpointercapture', up);
      this._listen(g, 'keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); this._emit(key); } });
    }
  }
  _buildKnob() {
    const k = KNOB, g = node('g', { 'data-role': 'volume-knob', role: 'slider', tabindex: 0, 'aria-label': 'VOLUME', 'aria-valuemin': 0, 'aria-valuemax': 100 });
    g.style.cursor = 'grab'; g.style.outline = 'none';
    // the scale round it: 0 … 100
    for (let i = 0; i <= 10; i++) {
      const a = (-SPAN + i * 27 - 90) * Math.PI / 180, r1 = k.r + 6, r2 = k.r + (i % 5 ? 10 : 14);
      g.append(node('line', { x1: k.cx + Math.cos(a) * r1, y1: k.cy + Math.sin(a) * r1, x2: k.cx + Math.cos(a) * r2, y2: k.cy + Math.sin(a) * r2, stroke: css('label-dim', '#686d67'), 'stroke-width': i % 5 ? .8 : 1.4 }));
    }
    g.append(node('circle', { cx: k.cx + .8, cy: k.cy + 2.5, r: k.r + 2, fill: '#000', opacity: .45 }),
      node('circle', { cx: k.cx, cy: k.cy, r: k.r + 1.5, fill: 'none', stroke: 'var(--edge,var(--_d90-edge))', 'stroke-width': 1 }),
      node('circle', { cx: k.cx, cy: k.cy, r: k.r, fill: `url(#${this.prefix}-knob)`, stroke: '#2a302c', 'stroke-width': .9 }));
    for (let i = 0; i < 48; i++) { const a = i * Math.PI / 24; g.append(node('path', { d: `M${k.cx + Math.cos(a) * (k.r - 5)} ${k.cy + Math.sin(a) * (k.r - 5)}L${k.cx + Math.cos(a) * (k.r - .8)} ${k.cy + Math.sin(a) * (k.r - .8)}`, stroke: '#000', 'stroke-opacity': .18, 'stroke-width': 1 })); }
    g.append(node('circle', { cx: k.cx, cy: k.cy, r: k.r * .62, fill: 'none', stroke: '#fff', 'stroke-opacity': .25 }));
    this._knobMark = node('line', { x1: k.cx, y1: k.cy - k.r + 8, x2: k.cx, y2: k.cy - k.r + 22, stroke: '#1a1f1c', 'stroke-width': 3.2, 'stroke-linecap': 'round' });
    g.append(this._knobMark);
    this.svg.append(g); this._knob = g;
    const angleAt = e => {
      const m = this.svg.getScreenCTM(), pt = this.svg.createSVGPoint();   // the drawing's own units (it may sit letterboxed)
      pt.x = e.clientX; pt.y = e.clientY;
      const q = m ? pt.matrixTransform(m.inverse()) : pt, x = q.x - k.cx, y = q.y - k.cy;
      return Math.atan2(x, -y) * 180 / Math.PI;                   // 0 at the top, clockwise
    };
    let dragging = false;
    const turn = e => {
      const a = Math.max(-SPAN, Math.min(SPAN, angleAt(e)));
      this._emit('knob', { value: Math.round((a + SPAN) / (2 * SPAN) * 100) });
    };
    this._listen(g, 'pointerdown', e => { if (e.button !== undefined && e.button !== 0) return; e.preventDefault(); dragging = true; g.style.cursor = 'grabbing'; try { g.setPointerCapture(e.pointerId); } catch (_) {} turn(e); });
    this._listen(g, 'pointermove', e => { if (dragging) turn(e); });
    const end = () => { dragging = false; g.style.cursor = 'grab'; };
    this._listen(g, 'pointerup', end); this._listen(g, 'pointercancel', end); this._listen(g, 'lostpointercapture', end);
    // the wheel anywhere on the unit: 2 % a notch
    this._listen(this.svg, 'wheel', e => { e.preventDefault(); this._emit(e.deltaY < 0 ? 'up' : 'down'); }, { passive: false });
    this._listen(g, 'keydown', e => {
      if (['ArrowUp', 'ArrowRight'].includes(e.key)) { e.preventDefault(); e.stopPropagation(); this._emit('up'); }
      if (['ArrowDown', 'ArrowLeft'].includes(e.key)) { e.preventDefault(); e.stopPropagation(); this._emit('down'); }
    });
  }
  _render() {
    const { vol, mute } = this._state, known = vol >= 0;
    const text = known ? String(vol).padStart(3, ' ') : ' --';
    this._digits.forEach((seg, i) => { const on = DIGITS[text[i]] || ''; for (const [n, s] of Object.entries(seg)) s.setAttribute('fill', on.includes(n) ? LIT : DIM); });
    this._pct.setAttribute('fill', known ? LIT : DIM);
    this._muteText.setAttribute('fill', mute ? '#ff5f4f' : DIM);
    const cells = known ? Math.round(vol / 2) : 0;
    this._bar.forEach((r, i) => r.setAttribute('fill', i < cells ? LIT : DIM));
    this._bar.forEach(r => r.setAttribute('opacity', mute ? '.35' : '1'));
    const a = known ? -SPAN + vol / 100 * 2 * SPAN : -SPAN;
    this._knobMark.setAttribute('transform', `rotate(${a} ${KNOB.cx} ${KNOB.cy})`);
    this._knob.setAttribute('aria-valuenow', known ? vol : 0);
    this._buttons.mute.led.setAttribute('fill', mute ? '#ff5f4f' : DIM); this._buttons.mute.led.setAttribute('opacity', mute ? '.9' : '.25');
    for (const v of [10, 20, 30, 40, 50, 60, 70, 80]) { const on = known && vol === v; const led = this._buttons['p' + v].led; led.setAttribute('fill', on ? LIT : DIM); led.setAttribute('opacity', on ? '.9' : '.25'); }
    this.svg.setAttribute('aria-label', 'DECK 90 DV-90. Volumen ' + (known ? vol + ' %' : 'desconocido') + (mute ? ', en silencio' : ''));
  }
  _paintLevels() {
    for (const ch of ['left', 'right']) {
      const n = Math.round(this._state.levels[ch] * 50);
      if (n === this._lastLv[ch]) continue;
      this._lastLv[ch] = n;
      this._meters[ch].forEach((r, i) => r.setAttribute('fill', i < n ? METER_LIT(i) : METER_DIM(i)));
    }
  }
}
global.Deck90VolumeUnit = Deck90VolumeUnit;
global.Deck90UnitKit = { node, css, dotsPath, faceplate, DOTS, SEVEN, DIGITS, LIT, DIM, SVG_NS };   // 7.10.14: for the DE-90
})(typeof globalThis !== 'undefined' ? globalThis : window);
