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

// 7.10.36: every key of the program, unit by unit (? opens it from anywhere; I too, on its tab)
const ABOUT_KEYS = [
  ['EL RACK', [
    ['?', 'Esta lista de teclas'], ['I', 'Novedades y teclas'], ['S · M · D', 'Escuchar el sistema, el micrófono o la demo'], ['Espacio', 'Detener'],
    ['F1–F5', 'Looks favoritos (otra vez: su segundo look)'], ['F6–F8', 'Tus looks C1–C3 (Shift: guardar lo que ves)'], ['R', 'Looks que rotan solos (modo vidriera)'],
    ['1–8', 'Mostrar o esconder VU, BPM, medidores, espectro, OSC, casetera, cinta, gonio'], ['9', 'El sintonizador (DT-90)'], ['0', 'El CD (DC-90, la lectora de la PC)'],
    ['J', 'La música (DM-90: Jellyfin, la PC y el pendrive)'], ['U', 'El volumen de la PC (DV-90)'], ['W', 'El ecualizador (DE-90)'], ['G', 'Guardar el tema que suena (★, en L)'],
    ['V', 'Cara del vúmetro'], ['T', 'Estilo de espectro'], ['K', 'Sensibilidad SENS'], ['C', 'Calibración del 0 VU'],
    ['N', 'Tono de pantalla'], ['A', 'Ajustes ⚙'], ['L', 'Historial de temas'], ['Z', 'Solo la cinta grande'],
    ['E', 'El estéreo de auto'], ['P', 'La tira (modo mini)'], ['H', 'Esconder los controles'], ['F', 'Pantalla completa'], ['Esc', 'Cerrar'],
  ]],
  ['EL ESTÉREO (E)', [
    ['MODE', 'PC, RADIO, CD o MÚSICA (el DM-90)'], ['AUX', 'Directo a lo que suena en la PC'], ['SEL', 'Reproducir / pausa'], ['▲ ▼ VOL', 'Volumen (o la rueda del mouse)'],
    ['1–6', 'Memorias de radio (sostenido: guardar) · en CD y música, el tema (sostenido: 7–12)'], ['BAND', 'FM1–FM4 y AM'], ['◀ ▶', 'Radio o tema anterior y siguiente'],
    ['SCAN', '8 s de cada radio (sostenido: cualquier radio del mundo)'], ['LOC', 'Las radios de tu ciudad'], ['ATT', 'Silencio'],
    ['DISP', 'Qué muestra el display'], ['SDM', 'Color del display (sostenido: el anterior)'], ['HDB', 'Brillo (sostenido: el otro frente)'],
    ['PWR', 'Volver al rack (sostenido: frente DP940 o doble DIN)'], ['⏏ · la ranura', 'Abrir la lectora · pasar a CD'],
  ]],
  ['LA RADIO (DT-90)', [
    ['POWER', 'Prender o apagar'], ['BAND', 'FM1–FM4 y AM'], ['◀ ▶ · la perilla', 'Las radios más escuchadas del país'], ['1–6', 'Memorias (sostenido o MEMO y el número: guardar)'],
    ['MEMO sostenido', 'Guardar el tema que suena (★)'], ['SCAN', '8 s de cada una (sostenido: cualquier radio del mundo)'],
    ['MODE', 'Qué sigue al nombre de la radio (sostenido: EVEN LEVEL)'], ['DISP', 'Radio, tema, temperatura o tiempo al aire (sostenido: SLEEP)'],
  ]],
  ['EL CD (DC-90)', [
    ['POWER', 'Prender o apagar'], ['⏏', 'Abrir o cerrar la bandeja'], ['▶ ❚❚ ■', 'Tocar, pausa, parar'], ['◀◀ ▶▶', 'Tema anterior y siguiente (rápido: varios)'],
    ['REPEAT · SHUFFLE', 'Todo el disco o un tema · al azar'],
  ]],
  ['LA MÚSICA (DM-90)', [
    ['SOURCE', 'SERVIDOR (Jellyfin), PC o USB'], ['SETUP', 'El servidor, las carpetas, el pendrive y la salida de la música (sostenido: la biblioteca)'],
    ['ARTISTS · ALBUMS · SONGS', 'Las listas de la biblioteca'], ['FOLDERS', 'Las carpetas (PC y USB)'], ['LISTS', 'Tus listas: cada una sigue donde la dejaste'],
    ['QUEUE', 'La cola'], ['SEARCH · /', 'Buscar (tema, artista o disco)'], ['ENTER · ◀ BACK', 'Abrir o tocar lo marcado · volver'],
    ['Q', 'Lo marcado suena después de este'], ['Q sostenido', 'Sumar lo marcado a la lista en uso · en la cola o en una lista: sacarlo · en LISTS (dos veces): borrar la lista'],
    ['Supr', 'Sacar de la cola o de la lista'], ['REPEAT · SHUFFLE', 'Toda la cola o un tema · al azar'], ['SHUFFLE ALL', 'Toda la biblioteca al azar'],
    ['Espacio', 'Reproducir / pausa'], ['↑ ↓ · la perilla', 'Recorrer la lista'], ['Una letra', 'Saltar al nombre que empieza así'],
    ['DIMMER · COLOR', 'Brillo y color de los displays (COLOR sostenido: el anterior)'], ['El tiempo', 'Restante o transcurrido'],
  ]],
  ['ECUALIZADOR (DE-90) Y VOLUMEN (DV-90)', [
    ['EQ', 'Prender o apagar el ecualizador'], ['Los presets', 'FLAT, ROCK, POP, JAZZ, CLASSIC, VOCAL, BASS, LOUD o el tuyo (USER)'], ['◀ ▶ − +', 'Elegir una banda y subirla o bajarla (o tocar su columna en el display)'],
    ['DV-90: la perilla · − + · 10…80', 'El volumen de Windows (también la rueda)'], ['MUTE', 'Silencio'],
  ]],
];

function aboutRender() {
  document.getElementById('aboutVer').textContent = aboutVersion ? 'VERSIÓN ' + aboutVersion : '';
  const el = (navigator.userAgent.match(/Electron\/([\d.]+)/) || [])[1], ch = (navigator.userAgent.match(/Chrome\/([\d.]+)/) || [])[1];
  document.getElementById('aboutTech').textContent = el ? 'Electron ' + el + (ch ? ' · Chromium ' + ch.split('.')[0] : '') : '';
  document.querySelectorAll('#aboutModal .about-tab').forEach(b => b.classList.toggle('on', b.dataset.tab === aboutTab));
  const body = document.getElementById('aboutBody');
  if (aboutTab === 'keys') {
    body.innerHTML = '<table class="about-keys">' + ABOUT_KEYS.map(([head, keys]) => '<tr class="about-keys-head"><th colspan="2">' + aboutEsc(head) + '</th></tr>' +
      keys.map(([k, t]) => '<tr><td><kbd>' + aboutEsc(k) + '</kbd></td><td>' + aboutEsc(t) + '</td></tr>').join('')).join('') + '</table>';
    return;
  }
  if (!aboutNotes) { body.innerHTML = '<div class="about-empty">Cargando…</div>'; return; }
  if (!aboutNotes.length) { body.innerHTML = '<div class="about-empty">No pude leer las novedades.</div>'; return; }
  body.innerHTML = '<div class="about-count">' + aboutNotes.length + ' versiones, de la más nueva a la primera</div>' + aboutNotes.map((n, i) =>
    '<details class="about-ver"' + (i === 0 || n.v === aboutVersion ? ' open' : '') + '><summary><b>' + n.v + '</b>' + (n.v === aboutVersion ? '<span class="about-now">LA TUYA</span>' : '') +
    (n.date ? '<i>' + n.date + '</i>' : '') + '</summary><div class="about-notes">' + n.html + '</div></details>').join('');
}

function showAbout(on, tab) {
  if (on && histOpen()) showHistory(false);
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
