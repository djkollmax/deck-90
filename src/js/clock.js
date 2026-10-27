'use strict';
// ═══════════════════════════════════════════════════════════
//  CLOCK AND WEATHER in the header display (metal frames)
//  Left of the song: the time in the decks' 7-segment digits, with the day and date. Right of it: the weather
//  where you are, an FL icon, the temperature, the sky and today's high and low. ⚙ → RELOJ turns them on and
//  off and takes the city. The weather comes from Open-Meteo through the main process, every 15 minutes.
//  The display grows to the whole width between the brand and the status; when it gets narrow, the weather's
//  words go first, then the weather, then the date.
// ═══════════════════════════════════════════════════════════
const CLOCK_KEY = 'deck90-clock';
const CLOCK_MODES = ['off', 'clock', 'weather'];
const clockCfg = (() => {
  let c = {};
  try { c = JSON.parse(localStorage.getItem(CLOCK_KEY)) || {}; } catch (_) {}
  const p = c.place;
  return {
    mode: CLOCK_MODES.includes(c.mode) ? c.mode : 'weather',
    place: p && typeof p.name === 'string' && Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180 ? p : null,
  };
})();
function saveClock() { try { localStorage.setItem(CLOCK_KEY, JSON.stringify(clockCfg)); } catch (_) {} }

const hcEl = { box: el('np'), clock: el('hcBox'), digits: el('hcDigits'), day: el('hcDay'), date: el('hcDate'),
  wx: el('hwBox'), icon: el('hwIcon'), temp: el('hwTemp'), cond: el('hwCond'), range: el('hwRange'), city: el('cityInput') };
const HC_ON = '#8ef8ea', HC_OFF = 'rgba(127,246,230,.07)', HC_GLASS = '#030303';
if (typeof SEG7 === 'object') Object.assign(SEG7, { '-': 'g', '°': 'abfg' });
const DIAS = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
const WX_TEXT = { 0: 'DESPEJADO', 1: 'CASI DESPEJADO', 2: 'ALGO NUBLADO', 3: 'NUBLADO', 45: 'NIEBLA', 48: 'NIEBLA',
  51: 'LLOVIZNA', 53: 'LLOVIZNA', 55: 'LLOVIZNA', 56: 'LLOVIZNA HELADA', 57: 'LLOVIZNA HELADA',
  61: 'LLUVIA DÉBIL', 63: 'LLUVIA', 65: 'LLUVIA FUERTE', 66: 'LLUVIA HELADA', 67: 'LLUVIA HELADA',
  71: 'NIEVE', 73: 'NIEVE', 75: 'NIEVE FUERTE', 77: 'NIEVE', 80: 'CHAPARRONES', 81: 'CHAPARRONES', 82: 'CHAPARRONES FUERTES',
  85: 'NEVADAS', 86: 'NEVADAS', 95: 'TORMENTA', 96: 'TORMENTA CON GRANIZO', 99: 'TORMENTA CON GRANIZO' };
function wxKind(c) {
  if (c === 0 || c === 1) return 'clear';
  if (c === 2) return 'partly';
  if (c === 45 || c === 48) return 'fog';
  if (c >= 51 && c <= 57) return 'drizzle';
  if ((c >= 61 && c <= 67) || (c >= 80 && c <= 82)) return 'rain';
  if ((c >= 71 && c <= 77) || c === 85 || c === 86) return 'snow';
  if (c >= 95) return 'storm';
  return 'cloud';
}

let hcH = 0, hcLast = '', wx = null, wxAt = 0, wxTimer = 0, wxBusy = false;
const hcShown = () => clockCfg.mode !== 'off' && document.documentElement.classList.contains('chassis-ti') && !document.body.classList.contains('mini');
// a canvas sized in CSS pixels, drawn sharp at the screen's density
function hcCanvas(c, w, h) {
  const pr = window.devicePixelRatio || 1;
  c.style.width = w + 'px'; c.style.height = h + 'px';
  if (c.width !== Math.round(w * pr) || c.height !== Math.round(h * pr)) { c.width = Math.round(w * pr); c.height = Math.round(h * pr); }
  const x = c.getContext('2d'); x.setTransform(pr, 0, 0, pr, 0, 0); x.clearRect(0, 0, w, h);
  return x;
}
// 7-segment text: digits and - ° as cells, ':' as two dots; returns its width for a height
function segWidth(txt, h) { let w = 0; for (const ch of txt) w += ch === ':' ? h * 0.3 : h * 0.5 + h * 0.12; return w - h * 0.12; }
function segDraw(x, txt, h, ghost, colonOn) {
  let px = 0;
  for (const ch of txt) {
    if (ch === ':') {
      const r = Math.max(1.3, h * 0.055), cx = px + h * 0.15 - h * 0.06;
      x.fillStyle = colonOn ? HC_ON : HC_OFF;
      if (colonOn) { x.shadowColor = HC_ON; x.shadowBlur = h * 0.18; }
      [0.32, 0.7].forEach(fy => { x.beginPath(); x.arc(cx, h * fy, r, 0, Math.PI * 2); x.fill(); });
      x.shadowBlur = 0; px += h * 0.3; continue;
    }
    if (ghost) draw7(x, px, 0, h * 0.5, h, '8', HC_OFF, HC_OFF);
    if (ch !== ' ') draw7(x, px, 0, h * 0.5, h, ch, HC_ON, ghost ? 'rgba(0,0,0,0)' : HC_OFF);
    px += h * 0.5 + h * 0.12;
  }
}

function drawClock(now) {
  const h = hcH, hh = String(now.getHours()).padStart(2, '0'), mm = String(now.getMinutes()).padStart(2, '0');
  const colon = now.getMilliseconds() < 500, key = hh + mm + colon + h;
  if (key === hcLast) return;
  hcLast = key;
  const txt = hh + ':' + mm, x = hcCanvas(hcEl.digits, Math.ceil(segWidth(txt, h)) + 2, h);
  segDraw(x, txt, h, true, colon);
  hcEl.day.textContent = DIAS[now.getDay()];
  hcEl.date.textContent = now.getDate() + ' ' + MESES[now.getMonth()];
}

// the weather icon, drawn in FL lines: sun, moon, clouds, rain, drizzle, snow, storm, fog
function wxIcon(kind, night) {
  const s = hcH, x = hcCanvas(hcEl.icon, s, s), lw = Math.max(1.4, s * 0.06);
  x.strokeStyle = HC_ON; x.fillStyle = HC_ON; x.lineWidth = lw; x.lineCap = 'round'; x.lineJoin = 'round';
  x.shadowColor = HC_ON; x.shadowBlur = s * 0.12;
  const sun = (cx, cy, r) => {
    x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.stroke();
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; x.beginPath(); x.moveTo(cx + Math.cos(a) * r * 1.5, cy + Math.sin(a) * r * 1.5); x.lineTo(cx + Math.cos(a) * r * 2, cy + Math.sin(a) * r * 2); x.stroke(); }
  };
  const moon = (cx, cy, r) => {
    x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill();
    x.shadowBlur = 0; x.fillStyle = HC_GLASS; x.beginPath(); x.arc(cx + r * 0.55, cy - r * 0.35, r * 0.9, 0, Math.PI * 2); x.fill();
    x.fillStyle = HC_ON; x.shadowBlur = s * 0.12;
  };
  const cloud = (cx, cy, w) => {          // flat-bottomed, three bumps; the glass is painted inside so it hides what's behind
    const b = cy + w * 0.22, l = cx - w / 2, r = cx + w / 2;
    x.beginPath(); x.moveTo(l + w * 0.12, b);
    x.arc(l + w * 0.2, b - w * 0.16, w * 0.16, Math.PI * 0.5, Math.PI * 1.35);
    x.arc(cx - w * 0.04, b - w * 0.3, w * 0.24, Math.PI * 1.1, Math.PI * 1.9);
    x.arc(r - w * 0.2, b - w * 0.18, w * 0.18, Math.PI * 1.45, Math.PI * 0.5);
    x.closePath();
    x.save(); x.shadowBlur = 0; x.fillStyle = HC_GLASS; x.fill(); x.restore(); x.stroke();
  };
  const c = s / 2;
  if (kind === 'clear') { if (night) moon(c, c, s * 0.26); else sun(c, c, s * 0.17); }
  else if (kind === 'partly') { if (night) moon(c - s * 0.12, c - s * 0.12, s * 0.17); else sun(c - s * 0.13, c - s * 0.13, s * 0.11); cloud(c + s * 0.06, c + s * 0.04, s * 0.62); }
  else if (kind === 'cloud') cloud(c, c - s * 0.02, s * 0.78);
  else if (kind === 'fog') { [[0.3, 0.12, 0.88], [0.5, 0.2, 0.8], [0.7, 0.12, 0.88]].forEach(([fy, a, b]) => { x.beginPath(); x.moveTo(s * a, s * fy); x.lineTo(s * b, s * fy); x.stroke(); }); }
  else {
    cloud(c, c - s * 0.16, s * 0.7);
    const top = c + s * 0.12;
    if (kind === 'rain') [-0.2, 0, 0.2].forEach(dx => { x.beginPath(); x.moveTo(c + s * dx + s * 0.05, top); x.lineTo(c + s * dx - s * 0.04, top + s * 0.24); x.stroke(); });
    if (kind === 'drizzle') [-0.2, 0, 0.2].forEach((dx, i) => { x.beginPath(); x.arc(c + s * dx, top + s * (i % 2 ? 0.16 : 0.08), lw * 0.75, 0, Math.PI * 2); x.fill(); });
    if (kind === 'snow') [-0.2, 0, 0.2].forEach((dx, i) => { const cx = c + s * dx, cy = top + s * (i % 2 ? 0.17 : 0.09), r = s * 0.06;
      for (let k = 0; k < 3; k++) { const a = k * Math.PI / 3; x.beginPath(); x.moveTo(cx - Math.cos(a) * r, cy - Math.sin(a) * r); x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); x.stroke(); } });
    if (kind === 'storm') { x.beginPath(); x.moveTo(c + s * 0.04, top - s * 0.02); x.lineTo(c - s * 0.08, top + s * 0.16); x.lineTo(c + s * 0.04, top + s * 0.16); x.lineTo(c - s * 0.06, top + s * 0.34); x.stroke(); }
  }
}

function drawWeather() {
  const old = !wx || Date.now() - wxAt > 3 * 3600e3;            // three hours without news: don't show stale numbers
  if (!clockCfg.place) {
    hcEl.wx.classList.add('hint'); hcCanvas(hcEl.icon, 0, 0); hcCanvas(hcEl.temp, 0, 0);
    hcEl.cond.textContent = 'CLIMA'; hcEl.range.textContent = '⚙ → RELOJ → CIUDAD';
    return;
  }
  hcEl.wx.classList.remove('hint');
  const t = old ? null : Math.round(wx.temp);
  const txt = t === null ? '--°' : (t < 0 ? '-' : '') + Math.abs(t) + '°';
  const h = hcH, x = hcCanvas(hcEl.temp, Math.ceil(segWidth(txt, h)) + 2, h);
  segDraw(x, txt, h, false, true);
  wxIcon(old ? 'cloud' : wxKind(wx.code), !old && !wx.day);
  hcEl.cond.textContent = old ? (wxBusy ? 'BUSCANDO…' : 'SIN DATOS') : (WX_TEXT[wx.code] || 'NUBLADO');
  hcEl.range.textContent = old || wx.max === null ? clockCfg.place.name.toUpperCase()
    : 'MÁX ' + Math.round(wx.max) + '° · MÍN ' + Math.round(wx.min) + '°';
  hcEl.wx.title = clockCfg.place.name + (clockCfg.place.area ? ', ' + clockCfg.place.area : '') + ' · datos de Open-Meteo.com (⚙ → RELOJ para cambiar la ciudad)';
}

async function fetchWeather() {
  clearTimeout(wxTimer);
  if (clockCfg.mode !== 'weather' || !clockCfg.place || !window.weather) return;
  wxBusy = true; drawWeather();
  let r = null;
  try { r = await window.weather.now(clockCfg.place.lat, clockCfg.place.lon); } catch (_) {}
  wxBusy = false;
  if (r && typeof r.temp === 'number') { wx = r; wxAt = Date.now(); }
  drawWeather();
  wxTimer = setTimeout(fetchWeather, r ? 15 * 60e3 : 3 * 60e3);   // offline: try again in a few minutes
}

// size everything to the display's height and drop what doesn't fit
function layoutClock() {
  const on = hcShown(), h = document.documentElement.classList;
  h.toggle('hdr-clock', on); h.toggle('hdr-wx', on && clockCfg.mode === 'weather');
  if (!on) return;
  const box = hcEl.box, cs = getComputedStyle(box);
  const inner = box.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  const nh = Math.max(16, Math.round(inner - 4));
  if (nh !== hcH) { hcH = nh; hcLast = ''; }
  drawClock(new Date());
  if (clockCfg.mode === 'weather') drawWeather();
  // the song keeps its room: when it's cramped (or cut while there's little room), the weather's words go,
  // then the date, then the weather
  const steps = ['hc-tight', 'hc-tighter', 'hc-tightest'];
  box.classList.remove(...steps);
  const room = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const song = box.classList.contains('on') ? Math.max(el('npTitle').scrollWidth, el('npArtist').scrollWidth) + 32 : 0;
  const need = Math.max(200, Math.min(song, room * 0.45));       // a very long title doesn't push everything out
  for (const st of steps) {
    const sides = hcEl.clock.offsetWidth + hcEl.wx.offsetWidth;   // 0 when hidden
    if (room - sides >= need) break;
    box.classList.add(st);
  }
}

function setClockMode(v) {
  if (!CLOCK_MODES.includes(v)) return;
  clockCfg.mode = v; saveClock(); syncClockSeg(); layoutClock();
  if (v === 'weather') { if (clockCfg.place) fetchWeather(); else { hcEl.city.focus(); toast('Escribí tu ciudad en <span>RELOJ</span> y Enter', 2600); } }
}
function syncClockSeg() {
  document.querySelectorAll('.seg[data-group="clock"] button').forEach(b => b.classList.toggle('on', b.dataset.v === clockCfg.mode));
  if (document.activeElement !== hcEl.city) hcEl.city.value = clockCfg.place ? clockCfg.place.name : '';
}
// the city: typed in the drawer, looked up by name, the first match kept
hcEl.city.addEventListener('keydown', async e => {
  if (e.key === 'Escape') { hcEl.city.blur(); syncClockSeg(); return; }
  if (e.key !== 'Enter') return;
  e.preventDefault();
  const q = hcEl.city.value.trim();
  if (!q) return;
  if (!window.weather) { toast('El clima funciona en el programa, no en el navegador.', 2800); return; }
  toast('Buscando <span>' + q.replace(/[<>&]/g, '') + '</span>…', 1500);
  let found = null;
  try { found = await window.weather.find(q); } catch (_) {}
  if (found === null) { toast('⚠ No pude consultar el clima: ¿hay internet?', 3200); return; }
  if (!found.length) { toast('⚠ No encontré <span>' + q.replace(/[<>&]/g, '') + '</span>. Probá con otro nombre.', 3200); return; }
  const p = found[0];
  clockCfg.place = { name: p.name, area: p.area, lat: p.lat, lon: p.lon };
  if (clockCfg.mode !== 'weather') clockCfg.mode = 'weather';
  wx = null; wxAt = 0; saveClock(); hcEl.city.blur(); syncClockSeg(); layoutClock();
  toast('CLIMA · <span>' + p.name.replace(/[<>&]/g, '') + (p.area ? ', ' + p.area.replace(/[<>&]/g, '') : '') + '</span>', 3000);
  fetchWeather();
});
hcEl.city.addEventListener('blur', syncClockSeg);
// clicking the weather (or its hint) opens the drawer at the city
hcEl.wx.addEventListener('click', () => { if (!drawerOpen) setDrawer(true); if (controlsHidden) setControlsHidden(false); setTimeout(() => hcEl.city.focus(), 50); });

// the second hand: the colon blinks, the minutes turn
(function tick() {
  if (hcShown() && hcH) drawClock(new Date());
  setTimeout(tick, 500 - (Date.now() % 500) + 5);
})();
new ResizeObserver(() => requestAnimationFrame(layoutClock)).observe(hcEl.box);
new MutationObserver(() => requestAnimationFrame(layoutClock)).observe(el('npTitle'), { childList: true, characterData: true, subtree: true });
new MutationObserver(() => requestAnimationFrame(layoutClock)).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
new MutationObserver(() => requestAnimationFrame(layoutClock)).observe(document.body, { attributes: true, attributeFilter: ['class'] });
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => requestAnimationFrame(layoutClock));
// after sleep or a long time in the tray, the weather is fetched again when the window comes back
document.addEventListener('visibilitychange', () => { if (!document.hidden && clockCfg.mode === 'weather' && Date.now() - wxAt > 15 * 60e3) fetchWeather(); });
syncClockSeg(); layoutClock(); fetchWeather();
