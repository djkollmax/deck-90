'use strict';
// ═══════════════════════════════════════════════════════════
//  ACERCA DE / NOVEDADES (ⓘ, I, or the tray)
//  The version, what Deck 90 is, a check for updates, the keys, and everything that changed in each
//  version (src/novedades.md, the changelog in Spanish, read by the program), the newest open. It opens by itself once after an
//  update, on the new version's notes.
// ═══════════════════════════════════════════════════════════
const aboutModal = document.getElementById('aboutModal');
const aboutOpen = () => aboutModal.classList.contains('show');
const ABOUT_SEEN_KEY = 'deck90-about-seen';
let aboutVersion = '', aboutNotes = null, aboutTab = 'news';

// from the program: { version, notes } (the page itself may not read files)
const aboutInfo = () => window.appAbout && window.appAbout.info ? window.appAbout.info().catch(() => null) : Promise.resolve(null);
let aboutHadPrefs = false; try { aboutHadPrefs = !!localStorage.getItem('deck90-prefs'); } catch (_) {}   // set up before this window existed
const aboutEsc = s => String(s).replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
const aboutInline = s => aboutEsc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>');
const ABOUT_MON = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

// novedades.md → [{ v, date, html }]: ## version — date, ### sections, - bullets (nested by two spaces)
function aboutParse(md) {
  const out = []; let cur = null, depth = 0, para = [];
  const close = to => { while (depth > to) { cur.html += '</li></ul>'; depth--; } };
  const flush = () => { if (para.length && cur) { close(0); cur.html += '<p>' + aboutInline(para.join(' ')) + '</p>'; } para = []; };
  for (const raw of md.split(/\r?\n/)) {
    const line = raw.replace(/\s+$/, '');
    let m;
    if ((m = /^## +(\d+\.\d+\.\d+)\s*(?:[—–-]\s*(\d{4})-(\d\d)-(\d\d))?/.exec(line))) {
      flush(); if (cur) close(0);
      cur = { v: m[1], date: m[2] ? Number(m[4]) + ' ' + ABOUT_MON[Number(m[3]) - 1] + ' ' + m[2] : '', html: '' }; out.push(cur); continue;
    }
    if (!cur) continue;
    if ((m = /^#{3,} +(.*)/.exec(line))) { flush(); close(0); cur.html += '<h4>' + aboutInline(m[1]) + '</h4>'; continue; }
    if ((m = /^( *)[-*] +(.*)/.exec(line))) {
      flush();
      const d = Math.floor(m[1].length / 2) + 1;
      if (d > depth) { while (depth < d) { cur.html += '<ul><li>'; depth++; } }
      else { close(d); cur.html += '</li><li>'; }
      cur.html += aboutInline(m[2]); continue;
    }
    if (!line.trim()) { flush(); continue; }
    if (depth && /^ {2,}\S/.test(raw)) { cur.html += ' ' + aboutInline(line.trim()); continue; }   // a bullet that wraps
    close(0); para.push(line.trim());
  }
  flush(); if (cur) close(0);
  return out;
}

const ABOUT_KEYS = [
  ['S · M · D', 'Escuchar el sistema, el micrófono o la demo'], ['Espacio', 'Detener'],
  ['F1–F5', 'Looks favoritos (otra vez: su segundo look)'], ['F6–F8', 'Tus looks C1–C3 (Shift: guardar lo que ves)'], ['R', 'Looks que rotan solos (modo vidriera)'], ['E', 'Estéreo: el estéreo de auto con radio por internet'],
  ['1–8', 'Mostrar o esconder VU, BPM, medidores, espectro, OSC, casetera, cinta, gonio'],
  ['V', 'Cara del vúmetro'], ['T', 'Estilo de espectro'], ['K', 'Sensibilidad SENS'], ['C', 'Calibración del 0 VU'],
  ['N', 'Tono de pantalla'], ['A', 'Ajustes ⚙'], ['L', 'Historial de temas'], ['Z', 'Solo la cinta grande'],
  ['P', 'Modo mini'], ['H', 'Esconder los controles'], ['F', 'Pantalla completa'], ['I', 'Esta ventana'], ['Esc', 'Cerrar'],
];

function aboutRender() {
  document.getElementById('aboutVer').textContent = aboutVersion ? 'VERSIÓN ' + aboutVersion : '';
  const el = (navigator.userAgent.match(/Electron\/([\d.]+)/) || [])[1], ch = (navigator.userAgent.match(/Chrome\/([\d.]+)/) || [])[1];
  document.getElementById('aboutTech').textContent = el ? 'Electron ' + el + (ch ? ' · Chromium ' + ch.split('.')[0] : '') : '';
  document.querySelectorAll('#aboutModal .about-tab').forEach(b => b.classList.toggle('on', b.dataset.tab === aboutTab));
  const body = document.getElementById('aboutBody');
  if (aboutTab === 'keys') {
    body.innerHTML = '<table class="about-keys">' + ABOUT_KEYS.map(([k, t]) => '<tr><td><kbd>' + aboutEsc(k) + '</kbd></td><td>' + aboutEsc(t) + '</td></tr>').join('') + '</table>';
    return;
  }
  if (!aboutNotes) { body.innerHTML = '<div class="about-empty">Cargando…</div>'; return; }
  if (!aboutNotes.length) { body.innerHTML = '<div class="about-empty">No pude leer las novedades.</div>'; return; }
  body.innerHTML = '<div class="about-count">' + aboutNotes.length + ' versiones, de la más nueva a la primera</div>' + aboutNotes.map((n, i) =>
    '<details class="about-ver"' + (i === 0 || n.v === aboutVersion ? ' open' : '') + '><summary><b>' + n.v + '</b>' + (n.v === aboutVersion ? '<span class="about-now">LA TUYA</span>' : '') +
    (n.date ? '<i>' + n.date + '</i>' : '') + '</summary><div class="about-notes">' + n.html + '</div></details>').join('');
}

function showAbout(on, tab) {
  if (on && typeof showHistory === 'function' && histOpen()) showHistory(false);
  aboutModal.classList.toggle('show', on);
  if (!on) return;
  if (tab) aboutTab = tab;
  aboutRender();
  document.getElementById('aboutBody').scrollTop = 0;
  if (!aboutNotes) aboutInfo().then(i => { aboutNotes = aboutParse((i && i.notes) || ''); aboutRender(); });
}

document.getElementById('aboutClose').addEventListener('click', () => showAbout(false));
aboutModal.addEventListener('click', e => { if (e.target === aboutModal) showAbout(false); });
document.querySelectorAll('#aboutModal .about-tab').forEach(b => b.addEventListener('click', () => { aboutTab = b.dataset.tab; aboutRender(); }));
document.getElementById('aboutCheck').addEventListener('click', () => {
  if (window.appUpdate && window.appUpdate.check) { window.appUpdate.check(); toast('Buscando actualizaciones…', 1500); }
});
document.getElementById('aboutCheck').style.display = window.appUpdate && window.appUpdate.check ? '' : 'none';
if (window.appAbout) window.appAbout.onOpen(() => showAbout(true, 'news'));

// the version, and the notes open by themselves once after an update
aboutInfo().then(i => {
  aboutVersion = (i && i.version) || '';
  if (!aboutVersion) return;
  let seen = null;
  try { seen = localStorage.getItem(ABOUT_SEEN_KEY) || (aboutHadPrefs ? 'antes' : null); } catch (_) {}
  try { localStorage.setItem(ABOUT_SEEN_KEY, aboutVersion); } catch (_) {}
  if (seen && seen !== aboutVersion) setTimeout(() => { if (!aboutOpen() && !miniMode) showAbout(true, 'news'); }, 1500);
});
