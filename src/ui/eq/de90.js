'use strict';
// ═══════════════════════════════════════
//  DE-90 GRAPHIC EQUALIZER (7.10.14): the faceplate of the rack's equalizer, the DV-90's size and plate (dv90.js's
//  kit). Its display shows the curve as ten columns of cells, ±12 dB round a centre line, the band chosen marked, the
//  preset's name big and EQ ON / OFF; keys EQ (on/off), ◀ ▶ (the band), − + (its level), the presets and a knob for
//  the band's level. A column touched or dragged on the display sets that band. It only draws and says what was
//  touched; ui/eq/eq.js works core/eq.js.
//
//    const de = new Deck90EqUnit(container, { theme });  de.set({ on, preset, gains: [10], band });
//    de.setTheme(t); de.setDimmer(0–2); de.onKey((key, { band, gain }) => …)
//    keys: power, left, right, down, up, the presets (flat, rock, pop, jazz, classic, vocal, bass, loud, user),
//    band (a column touched: band, gain), knob (gain)
// ═══════════════════════════════════════
(function (global) {
const K = global.Deck90UnitKit;
const { node, css, dotsPath, faceplate, LIT, DIM } = K;
const FREQS = ['31', '62', '125', '250', '500', '1K', '2K', '4K', '8K', '16K'];
const PRESETS = ['flat', 'rock', 'pop', 'jazz', 'classic', 'vocal', 'bass', 'loud', 'user'];
const KEYS = { power: { x: 35, y: 196, w: 86, h: 32, label: 'EQ' }, left: { x: 134, y: 196, w: 48, h: 32, label: '◀' }, right: { x: 188, y: 196, w: 48, h: 32, label: '▶' },
  down: { x: 250, y: 196, w: 48, h: 32, label: '−' }, up: { x: 304, y: 196, w: 48, h: 32, label: '+' } };
PRESETS.forEach((p, i) => { KEYS[p] = { x: 368 + i * 66, y: 196, w: 60, h: 32, label: p.toUpperCase() }; });
const COL = { x0: 300, w: 84, cellW: 52, y0: 44, rows: 13, pitch: 6, cellH: 4.4 };   // row 0 = +12 dB … row 12 = −12 dB
const KNOB = { cx: 1062, cy: 206, r: 52 }, SPAN = 135;
let count = 0;
const fit = (text, width, want) => Math.max(7, Math.min(want, (width - 10 - (text.length - 1) * .7) / (text.length * .7)));

class Deck90EqUnit {
  constructor(container, { theme = 'silver' } = {}) {
    this.root = container; this.prefix = 'deck90de-' + (++count);
    this._s = { on: false, preset: 'FLAT', gains: Array(10).fill(0), band: 0, theme: theme === 'black' ? 'black' : 'silver' };
    this._cb = new Set(); this._ls = [];
    this.svg = node('svg', { xmlns: K.SVG_NS, viewBox: '0 0 1200 280', width: '100%', preserveAspectRatio: 'xMidYMid meet', role: 'group', 'aria-label': 'DECK 90 DE-90 Graphic Equalizer' });
    Object.assign(this.svg.style, { width: '100%', height: 'auto', display: 'block', userSelect: 'none' });
    this._applyTheme();
    this.svg.innerHTML = faceplate(this.prefix, { title: 'DE-90 GRAPHIC EQUALIZER', side: '10 BAND · DECK 90 SOURCES', labels: [
      [35, 185, 'ON / OFF'], [134, 185, 'BAND'], [250, 185, 'LEVEL'], [368, 185, 'PRESETS'], [KNOB.cx, 271, 'BAND LEVEL', 'middle']] });
    this._display = node('g', { 'data-role': 'display', 'aria-hidden': 'true', filter: `url(#${this.prefix}-glow-hi)` });
    this.svg.append(this._display);
    this._buildDisplay(); this._buildKeys(); this._buildKnob();
    this.root.appendChild(this.svg);
    this._render();
  }
  onKey(cb) { this._cb.add(cb); return () => this._cb.delete(cb); }
  getState() { return JSON.parse(JSON.stringify(this._s)); }
  set(o = {}) {
    for (const k of ['on', 'preset', 'band']) if (k in o) this._s[k] = o[k];
    if (Array.isArray(o.gains)) this._s.gains = o.gains.slice(0, 10);
    this._render(); return this;
  }
  setTheme(t) { this._s.theme = t === 'black' ? 'black' : 'silver'; this._applyTheme(); return this; }
  setDimmer(level) {
    this._display.setAttribute('filter', `url(#${this.prefix}-glow${level === 2 ? '' : '-hi'})`);
    this._display.setAttribute('opacity', level === 2 ? '.6' : '1');
    return this;
  }
  _emit(key, info = {}) { for (const cb of [...this._cb]) cb(key, info); }
  _listen(el, ev, fn, o) { el.addEventListener(ev, fn, o); this._ls.push([el, ev, fn, o]); }
  _applyTheme() {
    const v = this._s.theme === 'black'
      ? { face: '#292c2d', 'face-top': '#484c4d', 'face-bottom': '#101415', label: '#d0d1cb', 'label-dim': '#969e97', edge: '#646a67', 'key-top': '#505659', 'key-face': '#272d30', 'key-bottom': '#0c1114', 'key-label': '#cdd2d1' }
      : { face: '#c7c5be', 'face-top': '#ece9df', 'face-bottom': '#92938d', label: '#2d302e', 'label-dim': '#686d67', edge: '#90958f', 'key-top': '#5c6366', 'key-face': '#30363a', 'key-bottom': '#101719', 'key-label': '#d2d7d5' };
    for (const [k, val] of Object.entries(v)) this.svg.style.setProperty('--_d90-' + k, val);
  }
  _buildDisplay() {
    const D = this._display;
    this._eq = node('path', { fill: LIT }); this._onOff = node('path', { fill: LIT }); this._name = node('path', { fill: LIT }); this._gainText = node('path', { fill: LIT });
    D.append(this._eq, this._onOff, this._name, this._gainText);
    this._eq.setAttribute('d', dotsPath('EQ', 60, 50, 1.6));
    // the columns: 13 cells each, the centre one (0 dB) a line
    this._cells = []; this._labels = []; this._marks = [];
    for (let b = 0; b < 10; b++) {
      const x = COL.x0 + b * COL.w + (COL.w - COL.cellW) / 2, col = [];
      for (let r = 0; r < COL.rows; r++) {
        const c = node('rect', { x, y: COL.y0 + r * COL.pitch, width: COL.cellW, height: r === 6 ? 1.6 : COL.cellH, rx: .6, fill: DIM });
        if (r === 6) c.setAttribute('y', COL.y0 + r * COL.pitch + 1.4);
        D.append(c); col.push(c);
      }
      this._cells.push(col);
      const lab = node('path', { d: dotsPath(FREQS[b], x + COL.cellW / 2 - (FREQS[b].length * 6 - 1) * 1.05 / 2, 125, 1.05), fill: DIM });
      D.append(lab); this._labels.push(lab);
      const mark = node('rect', { x: x - 5, y: COL.y0 - 3, width: COL.cellW + 10, height: COL.rows * COL.pitch + 4, rx: 2, fill: 'none', stroke: LIT, 'stroke-width': .8, opacity: 0 });
      D.append(mark); this._marks.push(mark);
    }
    // touched or dragged: that band to that height
    this._hit = node('rect', { x: COL.x0, y: COL.y0 - 4, width: COL.w * 10, height: COL.rows * COL.pitch + 8, fill: 'transparent', 'data-role': 'curve' });
    this._hit.style.cursor = 'ns-resize';
    this.svg.append(this._hit);
    const at = e => {
      const m = this.svg.getScreenCTM(), pt = this.svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
      const q = m ? pt.matrixTransform(m.inverse()) : pt;
      const band = Math.max(0, Math.min(9, Math.floor((q.x - COL.x0) / COL.w)));
      const row = (q.y - COL.y0 - COL.cellH / 2) / COL.pitch;           // 0 … 12
      return { band, gain: Math.max(-12, Math.min(12, Math.round((6 - row) * 2))) };
    };
    let drag = -1;
    this._listen(this._hit, 'pointerdown', e => { e.preventDefault(); try { this._hit.setPointerCapture(e.pointerId); } catch (_) {} const a = at(e); drag = a.band; this._emit('band', a); });
    this._listen(this._hit, 'pointermove', e => { if (drag < 0) return; const a = at(e); this._emit('band', { band: drag, gain: a.gain }); });
    const end = () => { drag = -1; };
    this._listen(this._hit, 'pointerup', end); this._listen(this._hit, 'pointercancel', end);
    this._listen(this.svg, 'wheel', e => { e.preventDefault(); this._emit(e.deltaY < 0 ? 'up' : 'down'); }, { passive: false });
  }
  _buildKeys() {
    this._buttons = {};
    const label = 'var(--key-label,var(--_d90-key-label,#d2d7d5))';
    for (const [key, b] of Object.entries(KEYS)) {
      const g = node('g', { 'data-key': key, role: 'button', tabindex: 0, 'aria-label': key === 'power' ? 'Ecualizador encendido o apagado' : b.label });
      g.style.cursor = 'pointer'; g.style.outline = 'none';
      const face = node('rect', { x: b.x, y: b.y, width: b.w, height: b.h, rx: 2.5, fill: `url(#${this.prefix}-key)`, stroke: 'var(--edge,var(--_d90-edge))', 'stroke-width': .9 });
      const size = b.label.length === 1 ? 16 : fit(b.label, b.w, 11);
      const t = node('text', { x: b.x + b.w / 2, y: b.y + b.h / 2 + size * .36, 'text-anchor': 'middle', 'font-family': 'Arial,Helvetica,sans-serif', 'font-size': size, 'font-weight': 700, 'letter-spacing': .7, fill: label, 'pointer-events': 'none' });
      t.textContent = b.label;
      const led = node('rect', { x: b.x + 7, y: b.y + b.h - 3.6, width: b.w - 14, height: 1.2, fill: DIM, opacity: .25 });
      g.append(node('rect', { x: b.x, y: b.y + 1.8, width: b.w, height: b.h, rx: 2.5, fill: '#080e0a', opacity: .75 }), face,
        node('path', { d: `M${b.x + 3} ${b.y + 1.3}H${b.x + b.w - 3}`, stroke: '#fff', 'stroke-opacity': .35, 'stroke-width': .7 }), t, led);
      this._buttons[key] = { g, face, led };
      this.svg.append(g);
      let rep = 0;
      const stop = () => { clearTimeout(rep); clearInterval(rep); rep = 0; face.setAttribute('transform', ''); };
      this._listen(g, 'pointerdown', e => {
        if (e.button !== undefined && e.button !== 0) return;
        e.preventDefault(); try { g.setPointerCapture(e.pointerId); } catch (_) {}
        face.setAttribute('transform', 'translate(0 1)'); this._emit(key);
        if (key === 'up' || key === 'down') rep = setTimeout(() => { rep = setInterval(() => this._emit(key), 110); }, 400);
      });
      this._listen(g, 'pointerup', stop); this._listen(g, 'pointercancel', stop); this._listen(g, 'lostpointercapture', stop);
      this._listen(g, 'keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); this._emit(key); } });
    }
  }
  _buildKnob() {
    const k = KNOB, g = node('g', { 'data-role': 'level-knob', role: 'slider', tabindex: 0, 'aria-label': 'BAND LEVEL', 'aria-valuemin': -12, 'aria-valuemax': 12 });
    g.style.cursor = 'grab'; g.style.outline = 'none';
    for (let i = 0; i <= 8; i++) {
      const a = (-SPAN + i * (2 * SPAN / 8) - 90) * Math.PI / 180, r1 = k.r + 6, r2 = k.r + (i % 4 ? 10 : 14);
      g.append(node('line', { x1: k.cx + Math.cos(a) * r1, y1: k.cy + Math.sin(a) * r1, x2: k.cx + Math.cos(a) * r2, y2: k.cy + Math.sin(a) * r2, stroke: css('label-dim', '#686d67'), 'stroke-width': i % 4 ? .8 : 1.4 }));
    }
    g.append(node('circle', { cx: k.cx + .8, cy: k.cy + 2.5, r: k.r + 2, fill: '#000', opacity: .45 }),
      node('circle', { cx: k.cx, cy: k.cy, r: k.r + 1.5, fill: 'none', stroke: 'var(--edge,var(--_d90-edge))', 'stroke-width': 1 }),
      node('circle', { cx: k.cx, cy: k.cy, r: k.r, fill: `url(#${this.prefix}-knob)`, stroke: '#2a302c', 'stroke-width': .9 }),
      node('circle', { cx: k.cx, cy: k.cy, r: k.r * .62, fill: 'none', stroke: '#fff', 'stroke-opacity': .25 }));
    this._knobMark = node('line', { x1: k.cx, y1: k.cy - k.r + 8, x2: k.cx, y2: k.cy - k.r + 22, stroke: '#1a1f1c', 'stroke-width': 3.2, 'stroke-linecap': 'round' });
    g.append(this._knobMark); this.svg.append(g); this._knob = g;
    const turn = e => {
      const m = this.svg.getScreenCTM(), pt = this.svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
      const q = m ? pt.matrixTransform(m.inverse()) : pt, a = Math.max(-SPAN, Math.min(SPAN, Math.atan2(q.x - k.cx, -(q.y - k.cy)) * 180 / Math.PI));
      this._emit('knob', { gain: Math.round(a / SPAN * 12) });
    };
    let on = false;
    this._listen(g, 'pointerdown', e => { if (e.button !== undefined && e.button !== 0) return; e.preventDefault(); on = true; g.style.cursor = 'grabbing'; try { g.setPointerCapture(e.pointerId); } catch (_) {} turn(e); });
    this._listen(g, 'pointermove', e => { if (on) turn(e); });
    const end = () => { on = false; g.style.cursor = 'grab'; };
    this._listen(g, 'pointerup', end); this._listen(g, 'pointercancel', end); this._listen(g, 'lostpointercapture', end);
    this._listen(g, 'keydown', e => {
      if (['ArrowUp', 'ArrowRight'].includes(e.key)) { e.preventDefault(); e.stopPropagation(); this._emit('up'); }
      if (['ArrowDown', 'ArrowLeft'].includes(e.key)) { e.preventDefault(); e.stopPropagation(); this._emit('down'); }
    });
  }
  _render() {
    const { on, preset, gains, band } = this._s;
    this._onOff.setAttribute('d', dotsPath(on ? 'ON' : 'OFF', 88, 50, 1.6));
    const name = String(preset).toUpperCase(), pitch = Math.min(3, 205 / (name.length * 6));
    this._name.setAttribute('d', dotsPath(name, 60, 70, pitch));
    const g = gains[band] || 0, gt = FREQS[band] + ' HZ ' + (g > 0 ? '+' : '') + g + ' DB';
    this._gainText.setAttribute('d', dotsPath(gt.replace('K HZ', ' KHZ'), 60, 116, 1.15));
    for (let b = 0; b < 10; b++) {
      const v = gains[b] || 0, top = 6 - Math.round(v / 2);           // the row the curve reaches
      this._cells[b].forEach((c, r) => {
        const lit = r === 6 || (v > 0 ? r >= top && r < 6 : v < 0 ? r > 6 && r <= top : false);
        c.setAttribute('fill', lit ? LIT : DIM);
        c.setAttribute('opacity', lit && !on ? '.3' : '1');                       // off: the curve kept, faint
      });
      this._labels[b].setAttribute('fill', b === band ? LIT : DIM);
      this._marks[b].setAttribute('opacity', b === band ? '.55' : '0');
    }
    this._gainText.setAttribute('fill', on ? LIT : DIM); this._name.setAttribute('fill', on ? LIT : DIM);
    this._knobMark.setAttribute('transform', `rotate(${g / 12 * SPAN} ${KNOB.cx} ${KNOB.cy})`);
    this._knob.setAttribute('aria-valuenow', g);
    const lamp = (k, lit) => { const b = this._buttons[k]; if (b) { b.led.setAttribute('fill', lit ? LIT : DIM); b.led.setAttribute('opacity', lit ? '.9' : '.25'); } };
    lamp('power', on); PRESETS.forEach(p => lamp(p, on && preset.toLowerCase() === p));
    this.svg.setAttribute('aria-label', 'DECK 90 DE-90. Ecualizador ' + (on ? 'encendido, ' + name : 'apagado'));
  }
}
global.Deck90EqUnit = Deck90EqUnit;
})(typeof globalThis !== 'undefined' ? globalThis : window);
