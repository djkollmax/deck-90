'use strict';
// ═══════════════════════════════════════════════════════════
//  THE DOUBLE-DIN DISPLAY (7.10.30): Deck 90's own, for the double-DIN front (img/stereo/front-ddin.jpg), whose glass
//  is twice as tall as the DP940's. It answers the same calls as vendor/dp940-display.js (setRadio, setTrack,
//  setPlayback, setElapsed, setLevels, destroy …), so stereo.js drives either, and draws with the same colours, so
//  every SDM look (stereo-face.css) colours it too. On the bigger glass, as a high-end unit of the late 90s:
//    · the big 16-segment line, nine fixed cells that scroll a longer text one letter at a time (the DP940's font)
//    · two dot-matrix lines under it (5 × 7 dots, 28 characters, the units' letters: dot-glyphs.js): the song or the station, then the album, the
//      station's country, the disc: setRadio({ line2 }), setTrack({ album })
//    · a 20-band spectrum analyser on the sound (setSpectrum), the song's progress as a bar of segments
//    · the clock and the temperature always at the bottom (setClock, setTemp), with the quality and the time
//    · the L/R meters, taller, curved and stepped as the DP940's
//  The glass is 1222 × 500 units, the shape of the photo's (934 × 382 px).
// ═══════════════════════════════════════════════════════════
(function (globalThis) {
  const NS = 'http://www.w3.org/2000/svg';
  const W = 1222, H = 500;
  const CELLS = 9, BIG_H = 112, BIG_X = 312, BIG_Y = 30;              // the big line (to x 1064)
  const DM_CHARS = 28, DM_X = 312, DM_W = 752, DM_P = DM_W / (DM_CHARS * 6), DM_DOT = DM_P * .8;   // the dot lines
  const DM_Y = [160, 204];
  const SP_BANDS = 20, SP_ROWS = 14, SP_X = 165, SP_W = 899, SP_Y = 252, SP_H = 120;   // the spectrum
  const PG_N = 60, PG_Y = 384;                                           // the progress bar
  const LEVELS = 14, ROW_CELLS = [5, 5, 5, 4, 4, 4, 4, 3, 3, 3, 2, 2, 2, 2];
  const svgNode = (name, attributes = {}) => {
    const node = document.createElementNS(NS, name);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
    return node;
  };
  const label = (text, x, y, options = {}) => {
    const node = svgNode('text', { x, y, fill: '#9ab34b', 'font-family': 'Arial, sans-serif', 'font-weight': 700, 'font-size': 22, ...options });
    node.textContent = text;
    return node;
  };
  const safeText = value => (globalThis.Deck90DotText || String)(String(value ?? '').replace(/[\u0000-\u001f]/g, ' ')).slice(0, 512);   // 7.10.38: ½ → 1/2
  const safeSeconds = value => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
  const clamp = value => Number.isNaN(Number(value)) ? 0 : Math.max(0, Math.min(1, Number(value) || 0));
  const mmss = s => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  let nextId = 0;

  // a long text through fixed cells, one character at a time: still for a moment at each end
  function scrollAt(length, cells, startedAt, now, stepMs) {
    const over = length - cells;
    if (over <= 0) return 0;
    const hold = 1800, travel = over * stepMs, cycle = hold * 2 + travel;
    const t = (now - startedAt) % cycle;
    return t < hold ? 0 : t < hold + travel ? Math.floor((t - hold) / stepMs) : over;
  }

  class Deck90DoubleDin {
    constructor(root, options = {}) {
      if (!root?.appendChild) throw new TypeError('A container element is required.');
      this.root = root;
      this.options = { attackMs: 35, releaseMs: 140, ...options };
      this.font = options.font || globalThis.Deck90Display?.FONT;
      this.glyphs = options.glyphs || globalThis.Deck90DotGlyphs || {};   // ui/jukebox/dot-glyphs.js
      if (!this.font) throw new Error('The DP940 font (Deck90Display.FONT) is needed.');
      this.id = 'd2d-' + (++nextId);
      this.state = {
        mode: 'radio',
        radio: { band: 'FM1', frequency: '102.3', preset: 1, live: false, name: '', line2: '', mono: false, local: false, quality: '', ...options.radio },
        track: { title: '', artist: '', album: '', elapsed: 0, playing: false, number: 0, length: 0, quality: '', source: 'CD', disc: false },
        levels: { left: 0, right: 0 }, clock: '', temp: '',
      };
      this._visual = { left: 0, right: 0 };
      this._shown = { left: -1, right: -1 };
      this._spec = new Float32Array(SP_BANDS); this._specShown = new Int8Array(SP_BANDS).fill(-1); this._peak = new Float32Array(SP_BANDS);
      this._lines = [{ text: '', at: 0, shown: null }, { text: '', at: 0, shown: null }];
      this._big = { text: '', at: 0, shown: null };
      this._destroyed = false; this._lastFrame = 0;
      this.root.classList.add('deck90-display', 'ddin-display');
      this.svg = svgNode('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'DECK 90', class: 'd90-screen' });
      const P = DM_P;
      // the glass (its gradient named like the DP940's: the looks recolour rect[fill*="lcd-film"]), the dots' pattern
      this.svg.innerHTML = `<defs>
        <linearGradient id="${this.id}-lcd-film" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4D203C"/><stop offset=".25" stop-color="#681E43"/><stop offset=".7" stop-color="#5F193B"/><stop offset="1" stop-color="#3C162B"/></linearGradient>
        <filter id="${this.id}-glow" x="-20%" y="-30%" width="140%" height="160%"><feGaussianBlur stdDeviation="1.1" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        ${DM_Y.map((y, i) => `<pattern id="${this.id}-dots${i}" patternUnits="userSpaceOnUse" x="${DM_X}" y="${y}" width="${6 * P}" height="${7 * P}">${
          Array.from({ length: 35 }, (_, k) => `<rect data-dmghost="1" x="${(k % 5) * P}" y="${Math.floor(k / 5) * P}" width="${DM_DOT}" height="${DM_DOT}" fill="#62751e"/>`).join('')}</pattern>`).join('')}
      </defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#${this.id}-lcd-film)"/>`;
      // the L/R meters: curved, stepped columns (bottom rows long, reaching in; the top short)
      this._meterNodes = {};
      for (const channel of ['left', 'right']) {
        const group = svgNode('g', { 'data-channel': channel, fill: '#35544b' });
        this._meterNodes[channel] = [];
        for (let k = 0; k < LEVELS; k++) {
          const cell = svgNode('g', { 'data-level': k, opacity: .36 });
          const y = 452 - k * 30, h = 21, f = k / (LEVELS - 1), outer = 18 + 44 * f * f, slant = 3 + 7 * f;
          for (let c = 0; c < ROW_CELLS[k]; c++) {
            const x0 = outer + c * 25, x1 = x0 + 21;
            const pts = channel === 'left' ? [[x0 + slant, y], [x1 + slant, y], [x1, y + h], [x0, y + h]] : [[W - x0 - slant, y], [W - x1 - slant, y], [W - x1, y + h], [W - x0, y + h]];
            cell.append(svgNode('path', { d: 'M' + pts.map(p => p.map(v => v.toFixed(1)).join(' ')).join(' L') + ' Z' }));
          }
          group.append(cell); this._meterNodes[channel].push(cell);
        }
        this.svg.append(group);
      }
      this.svg.append(label('L', 22, 40, { fill: '#D4E7D9', 'font-size': 28 }), label('R', W - 22, 40, { fill: '#D4E7D9', 'font-size': 28, 'text-anchor': 'end' }));
      // the big line: nine cells, each with its unlit segments, and a layer for the lit ones
      const fontScale = BIG_H / this.font.height, advance = (this.font.advance || 112) * fontScale;
      const big = svgNode('g', { filter: `url(#${this.id}-glow)`, 'data-layer': 'title' });
      this._cells = [];
      for (let i = 0; i < CELLS; i++) {
        const cell = svgNode('g', { transform: `translate(${(BIG_X + i * advance).toFixed(1)} ${BIG_Y}) scale(${fontScale.toFixed(4)})` });
        for (const [name, points] of Object.entries(this.font.segments)) {
          if (!/^(a1|a2|b|c|d1|d2|e|f|g1|g2|h|i|j|k|l|m)$/.test(name)) continue;
          cell.append(svgNode('polygon', { points: points.map(p => p.join(',')).join(' '), fill: '#62751e', opacity: .47 }));
        }
        const lit = svgNode('g'); cell.append(lit);
        big.append(cell); this._cells.push(lit);
      }
      this.svg.append(big);
      // the dot lines: their unlit dots (a pattern), and the lit ones as one path each
      this._dm = DM_Y.map((y, i) => {
        this.svg.append(svgNode('rect', { x: DM_X, y, width: DM_CHARS * 6 * P, height: 7 * P, fill: `url(#${this.id}-dots${i})`, opacity: .4, 'data-role': 'dm-ghost' }));
        const path = svgNode('path', { d: '', 'data-dm': String(i + 1), fill: i ? '#c3cf7a' : '#ffe41c' });
        this.svg.append(path); return path;
      });
      // the spectrum: twenty bands of fourteen cells, each cell its own (the meters' colours and tips)
      const spec = svgNode('g', { 'data-channel': 'spec', 'data-role': 'spectrum' });
      this._specCells = [];
      const bw = SP_W / SP_BANDS, rh = SP_H / SP_ROWS;
      for (let b = 0; b < SP_BANDS; b++) {
        const col = [];
        for (let r = 0; r < SP_ROWS; r++) {
          const g = svgNode('g', { 'data-level': r, fill: '#35544b', opacity: .3 });
          g.append(svgNode('rect', { x: (SP_X + b * bw + 3).toFixed(1), y: (SP_Y + SP_H - (r + 1) * rh + 1).toFixed(1), width: (bw - 6).toFixed(1), height: (rh - 2.6).toFixed(1) }));
          spec.append(g); col.push(g);
        }
        this._specCells.push(col);
      }
      this.svg.append(spec);
      // the progress bar: segments as the big line's (lit or unlit: the looks colour them as letters)
      const pg = svgNode('g', { 'data-role': 'progress' }), pw = SP_W / PG_N;
      this._pg = [];
      for (let i = 0; i < PG_N; i++) {
        const x = SP_X + i * pw;
        const seg = svgNode('polygon', { points: `${(x + 3).toFixed(1)},${PG_Y} ${(x + pw - 1).toFixed(1)},${PG_Y} ${(x + pw - 3).toFixed(1)},${PG_Y + 11} ${(x + 1).toFixed(1)},${PG_Y + 11}`, fill: '#62751e', opacity: .47 });
        pg.append(seg); this._pg.push(seg);
      }
      this._pgShown = -1;
      this.svg.append(pg);
      this._status = svgNode('g', { 'data-layer': 'status' });
      this._number = svgNode('g', { 'data-layer': 'number' });
      this._footer = svgNode('g', { 'data-layer': 'footer' });
      this.svg.append(this._status, this._number, this._footer);
      this.root.replaceChildren(this.svg);
      this._render();
      this._tick = this._tick.bind(this);
      this._frame = requestAnimationFrame(this._tick);
    }

    getState() { return JSON.parse(JSON.stringify(this.state)); }

    setRadio(radio = {}) {
      this._alive();
      const r = this.state.radio;
      for (const key of ['band', 'frequency', 'name', 'line2']) if (key in radio) r[key] = safeText(radio[key]);
      if ('mono' in radio) r.mono = Boolean(radio.mono);
      if ('local' in radio) r.local = Boolean(radio.local);
      if ('frequency' in radio) r.quality = safeText(radio.quality).slice(0, 14);
      if ('live' in radio) { r.live = Boolean(radio.live); if (!r.live) this.state.levels = { left: 0, right: 0 }; }
      if ('preset' in radio) r.preset = Math.max(1, Math.min(99, Math.trunc(Number(radio.preset) || 1)));
      if (this.state.mode === 'radio') this._render();
      return this;
    }

    setTrack(track = {}) {
      this._alive();
      const t = this.state.track;
      if ('title' in track) t.title = safeText(track.title);
      if ('artist' in track) t.artist = safeText(track.artist);
      if ('elapsed' in track) t.elapsed = safeSeconds(track.elapsed);
      if ('title' in track) {
        t.album = safeText(track.album || track.line2 || '');
        t.number = Math.max(0, Math.min(9999, Math.trunc(Number(track.number) || 0)));
        t.length = safeSeconds(track.length);
        t.quality = safeText(track.quality).slice(0, 14);
        t.disc = Boolean(track.disc);
        t.source = safeText(track.source || 'CD').slice(0, 4).toUpperCase();
      }
      if ('playing' in track) return this.setPlayback(Boolean(track.playing));
      this._render();
      return this;
    }

    setPlayback(playing) {
      this._alive();
      if (!playing && this.state.mode === 'radio' && !this.state.track.playing) return this;
      this.state.track.playing = Boolean(playing);
      this.state.mode = playing ? 'music' : 'radio';
      if (!playing) { this.state.levels = { left: 0, right: 0 }; this._visual = { left: 0, right: 0 }; this._spec.fill(0); }
      this._render();
      return this;
    }

    setElapsed(seconds) {
      this._alive();
      const s = safeSeconds(seconds);
      if (Math.floor(s) === Math.floor(this.state.track.elapsed)) { this.state.track.elapsed = s; return this; }
      this.state.track.elapsed = s;
      if (this.state.mode === 'music') this._renderFooter();
      return this;
    }

    setLevels(left, right) { this._alive(); this.state.levels = { left: clamp(left), right: clamp(right) }; return this; }
    setDecibels(left, right) { return this.setLevels((Number(left) + 40) / 43, (Number(right) + 40) / 43); }
    // the spectrum's bands, 0..1 each (low to high); none or empty: dark
    setSpectrum(bands) {
      this._alive();
      for (let b = 0; b < SP_BANDS; b++) this._spec[b] = bands ? clamp(bands[b]) : 0;
      return this;
    }
    setClock(text) { this._alive(); text = safeText(text).slice(0, 8); if (text !== this.state.clock) { this.state.clock = text; this._renderFooter(); } return this; }
    setTemp(text) { this._alive(); text = safeText(text).slice(0, 8); if (text !== this.state.temp) { this.state.temp = text; this._renderFooter(); } return this; }

    getSVG() { this._alive(); const c = this.svg.cloneNode(true); c.setAttribute('xmlns', NS); return new XMLSerializer().serializeToString(c); }
    destroy() {
      if (this._destroyed) return;
      cancelAnimationFrame(this._frame);
      this.root.replaceChildren();
      this.root.classList.remove('deck90-display', 'ddin-display');
      this._destroyed = true;
    }
    _alive() { if (this._destroyed) throw new Error('This display was destroyed.'); }

    // ── drawing ──
    _render() {
      const music = this.state.mode === 'music', r = this.state.radio, t = this.state.track;
      const big = music ? t.title || 'PLAYING' : (r.band ? r.band + ' ' : '') + r.frequency;
      if (big !== this._big.text) { this._big = { text: big, at: performance.now(), shown: null }; }
      this._setLine(0, music ? t.artist : r.live ? r.name : '');
      this._setLine(1, music ? t.album : r.live ? r.line2 : '');
      // the box: STEREO / MONO for the radio, PLAY and the source for the music; LOCAL or TRACK under it
      this._status.replaceChildren();
      this._status.append(svgNode('rect', { x: 170, y: 32, width: 126, height: 66, rx: 2, fill: 'none', stroke: '#dfc73e', 'stroke-width': 2 }));
      const mono = !music && r.mono;
      this._status.append(label(music ? 'PLAY' : 'STEREO', 233, 61, { fill: mono ? '#809641' : '#ffdd50', 'font-size': 25, 'text-anchor': 'middle' }));
      this._status.append(label(music ? t.source || 'CD' : 'MONO', 233, 90, { fill: music || mono ? '#ffdd50' : '#809641', 'font-size': 24, 'text-anchor': 'middle' }));
      this._status.append(music ? label('TRACK', 233, 126, { 'font-size': 22, 'text-anchor': 'middle' }) : label('LOCAL', 233, 126, { 'font-size': 22, 'text-anchor': 'middle', fill: r.local ? '#ff1e1e' : '#809641' }));
      // the number under them: the memory, or the song's (smaller from three figures)
      this._number.replaceChildren();
      const n = music ? t.number : r.preset;
      if (n) { const size = n < 100 ? 70 : n < 1000 ? 50 : 38; this._number.append(label(String(n), 233, 200 - (70 - size) * .35, { fill: '#ffdf4f', 'font-size': size, 'text-anchor': 'middle' })); }
      this.svg.setAttribute('aria-label', music ? `DECK 90. ${t.title}${t.artist ? ', ' + t.artist : ''}` : `DECK 90. Radio ${r.band} ${r.frequency}`);
      this._renderFooter();
      this._paintText(performance.now());
    }

    _setLine(i, text) {
      text = safeText(text).toLocaleUpperCase('es');
      if (text !== this._lines[i].text) this._lines[i] = { text, at: performance.now(), shown: null };
    }

    _renderFooter() {
      const music = this.state.mode === 'music', r = this.state.radio, t = this.state.track;
      this._footer.replaceChildren();
      const Y = 442, S = 27;
      this._footer.append(svgNode('rect', { x: 165, y: 414, width: 118, height: 36, rx: 3, fill: '#e32322', opacity: .95 }));
      this._footer.append(label('S-HDB', 224, 442, { fill: '#ffde46', 'font-size': 27, 'text-anchor': 'middle' }));
      if (music) {
        const left = t.length > 0, secs = left ? Math.max(0, t.length - t.elapsed) : t.elapsed;
        this._footer.append(label((left ? '-' : '') + mmss(secs), 300, Y, { fill: '#ffdd50', 'font-size': 30, 'letter-spacing': 2, 'data-role': 'time' }));
        if (t.quality) this._footer.append(label(t.quality, 448, Y, { fill: '#ffdd50', 'font-size': S }));
        if (t.disc) this._footer.append(label('DISC', 660, Y, { fill: '#ffdd50', 'font-size': S }));
        this._progress(left ? t.elapsed / t.length : -1);
      } else {
        this._footer.append(label('LOUD', 300, Y, { 'font-size': S }));
        if (r.quality) this._footer.append(label(r.quality, 392, Y, { fill: '#ffdd50', 'font-size': S, 'letter-spacing': 1 }));
        else this._footer.append(label('MTL', 392, Y, { 'font-size': S }));
        this._footer.append(label(r.live ? 'LIVE' : 'TUNED', 572, Y, { fill: r.live ? '#ffdd50' : '#809641', 'font-size': S }));
        this._footer.append(label('RAND', 660, Y, { 'font-size': S }));
        this._progress(-1);
      }
      if (this.state.clock) this._footer.append(label(this.state.clock, 830, Y, { fill: '#c8d997', 'font-size': 30, 'letter-spacing': 1, 'data-role': 'clock' }));
      if (this.state.temp) this._footer.append(label(this.state.temp, 1064, Y, { fill: '#c8d997', 'font-size': 30, 'text-anchor': 'end', 'data-role': 'temp' }));
    }

    _progress(f) {
      const on = f < 0 ? 0 : Math.round(Math.max(0, Math.min(1, f)) * PG_N);
      if (on === this._pgShown) return;
      this._pgShown = on;
      this._pg.forEach((seg, i) => { const lit = i < on; seg.setAttribute('fill', lit ? '#ffdf4f' : '#62751e'); seg.setAttribute('opacity', lit ? '1' : '.47'); });
    }

    // the big cells and the dot lines, at the scroll's place (redrawn only when it moves)
    _paintText(now) {
      const b = this._big, chars = [...b.text.toLocaleUpperCase('es').normalize('NFC')];
      const from = scrollAt(chars.length, CELLS, b.at, now, 320);
      if (from !== b.shown) {
        b.shown = from;
        const font = this.font;
        this._cells.forEach((lit, i) => {
          lit.replaceChildren();
          const ch = chars[from + i]; if (!ch) return;
          const glyph = font.glyphs[ch] || font.glyphs[ch.normalize('NFD')[0]] || font.glyphs['?'] || [];
          for (const name of glyph) {
            const pts = font.segments[name];
            if (pts) lit.append(svgNode('polygon', { points: pts.map(p => p.join(',')).join(' '), fill: '#ffdf4f' }));
          }
        });
      }
      this._lines.forEach((line, i) => {
        const chars = [...line.text.normalize('NFC')], from = scrollAt(chars.length, DM_CHARS, line.at, now, 230);
        if (from === line.shown) return;
        line.shown = from;
        let d = '';
        const P = DM_P, y0 = DM_Y[i];
        for (let c = 0; c < DM_CHARS; c++) {
          const ch = chars[from + c]; if (!ch || ch === ' ') continue;
          const g = this.glyphs[ch] || this.glyphs[ch.normalize('NFD')[0]] || this.glyphs['?'];
          if (!g) continue;
          for (let row = 0; row < 7; row++) for (let col = 0; col < 5; col++) {
            if (!(g[row] >> (4 - col) & 1)) continue;
            d += `M${(DM_X + (c * 6 + col) * P).toFixed(1)} ${(y0 + row * P).toFixed(1)}h${DM_DOT.toFixed(1)}v${DM_DOT.toFixed(1)}h-${DM_DOT.toFixed(1)}z`;
          }
        }
        this._dm[i].setAttribute('d', d);
      });
    }

    _paintMeters(dt) {
      const live = this.state.mode === 'music' || this.state.radio.live;
      for (const channel of ['left', 'right']) {
        const on = live ? Math.round(this._visual[channel] * LEVELS) : 0;
        if (on === this._shown[channel]) continue;
        this._shown[channel] = on;
        for (const node of this._meterNodes[channel]) {
          const lit = Number(node.getAttribute('data-level')) < on;
          node.setAttribute('fill', lit ? '#c5f4df' : '#35544b'); node.setAttribute('opacity', lit ? '1' : '.36');
        }
      }
      // the spectrum: a quick rise, a slower fall, and its peaks hanging a moment
      for (let b = 0; b < SP_BANDS; b++) {
        const target = live ? this._spec[b] : 0, cur = this._peak[b];
        this._peak[b] = target > cur ? cur + (target - cur) * (1 - Math.exp(-dt / 30)) : cur + (target - cur) * (1 - Math.exp(-dt / 220));
        const on = Math.round(this._peak[b] * SP_ROWS);
        if (on === this._specShown[b]) continue;
        this._specShown[b] = on;
        this._specCells[b].forEach((g, r) => { const lit = r < on; g.setAttribute('fill', lit ? '#c5f4df' : '#35544b'); g.setAttribute('opacity', lit ? '1' : '.3'); });
      }
    }

    _tick(now) {
      if (this._destroyed) return;
      const dt = Math.min(100, this._lastFrame ? now - this._lastFrame : 16);
      this._lastFrame = now;
      for (const channel of ['left', 'right']) {
        const target = this.state.mode === 'music' || this.state.radio.live ? this.state.levels[channel] : 0;
        const time = target > this._visual[channel] ? this.options.attackMs : this.options.releaseMs;
        this._visual[channel] += (target - this._visual[channel]) * (1 - Math.exp(-dt / Math.max(1, time)));
      }
      this._paintMeters(dt);
      this._paintText(now);
      this._frame = requestAnimationFrame(this._tick);
    }
  }
  globalThis.Deck90DoubleDin = Deck90DoubleDin;
})(globalThis);
