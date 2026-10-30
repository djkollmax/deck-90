'use strict';
// ═══════════════════════════════════════════════════════════
//  MODO VIDRIERA: the looks turn by themselves (LOOKS → ↻ ROTAR, or R)
//  Every few minutes of music the rack goes to the next look of the chosen set (the ten favourites, your
//  C1–C3, or all of them), with a short fade. The clock only runs while something sounds: a paused song,
//  the mini strip, the big tape alone, a hidden window or an open menu hold it where it is.
// ═══════════════════════════════════════════════════════════
const ROTATE_MINS = [1, 3, 5, 10];
const ROTATE_SETS = { factory: 'LOS 10 DE FÁBRICA', mine: 'LOS MÍOS (C1–C3)', all: 'TODOS' };
let rotateCfg = { on: false, min: 3, set: 'factory' };
try {
  const r = (JSON.parse(localStorage.getItem('deck90-prefs')) || {}).rotate;
  if (r && typeof r === 'object') rotateCfg = { on: !!r.on, min: ROTATE_MINS.includes(r.min) ? r.min : 3, set: r.set in ROTATE_SETS ? r.set : 'factory' };
} catch (_) {}
let rotateLeft = rotateCfg.min * 60e3;
const rotateMenu = document.getElementById('rotateMenu');
const rotateMenuOpen = () => rotateMenu.classList.contains('show');

// the looks of the set, in order: 1, its second look, 2, its second look… then C1–C3
function rotateList() {
  const fav = [];
  FACTORY_PRESETS.forEach((p, i) => { fav.push(p); if (FACTORY_ALT[i]) fav.push(FACTORY_ALT[i]); });
  const mine = customs.filter(Boolean);
  return rotateCfg.set === 'mine' ? mine : rotateCfg.set === 'all' ? fav.concat(mine) : fav;
}
function rotateNext() {
  const list = rotateList();
  if (list.length < 2) return;
  const now = presetSnapshot(), at = list.findIndex(l => sameSnap(l.snap, now));
  const next = list[(at + 1) % list.length];
  const rack = document.querySelector('.rack-unit');
  rack.classList.add('look-fade');                          // out, change, back in
  setTimeout(() => {
    applySnap(next.snap);
    toast('↻ <span>' + next.name + '</span>', 1800);
    requestAnimationFrame(() => rack.classList.remove('look-fade'));
  }, 260);
}
function setRotate(on, quiet) {
  rotateCfg.on = !!on; rotateLeft = rotateCfg.min * 60e3;
  savePrefs(); syncConsole(); renderRotateMenu();
  if (quiet) return;
  if (on && rotateList().length < 2) toast('Para rotar hacen falta al menos dos looks: guardá los tuyos en <span>C1–C3</span> o elegí otros', 3600);
  else toast(on ? '↻ LOOKS ROTANDO · <span>cada ' + rotateCfg.min + ' min</span> mientras suena música' : 'Los looks quedan quietos', 2400);
}

// the small menu under ↻ ROTAR
function renderRotateMenu() {
  const opt = (g, v, label, on) => '<button data-g="' + g + '" data-v="' + v + '"' + (on ? ' class="on"' : '') + '>' + label + '</button>';
  rotateMenu.innerHTML = '<div class="style-head">LOOKS QUE ROTAN SOLOS</div>' +
    '<div class="rot-row"><span>ROTAR</span>' + opt('on', '0', 'APAGADO', !rotateCfg.on) + opt('on', '1', 'PRENDIDO', rotateCfg.on) + '</div>' +
    '<div class="rot-row"><span>CADA</span>' + ROTATE_MINS.map(m => opt('min', m, m + ' MIN', rotateCfg.min === m)).join('') + '</div>' +
    '<div class="rot-row"><span>CUÁLES</span>' + Object.entries(ROTATE_SETS).map(([k, l]) => opt('set', k, l, rotateCfg.set === k)).join('') + '</div>' +
    '<div class="style-foot">Cambia solo mientras suena música, con un fundido corto. La tecla <kbd>R</kbd> lo prende y lo apaga.</div>';
}
function showRotateMenu(on) {
  if (on) {
    renderRotateMenu(); rotateMenu.classList.add('show');
    const b = document.querySelector('.seg.preset button[data-v="rotate"]').getBoundingClientRect();
    rotateMenu.style.left = Math.max(8, Math.min(window.innerWidth - rotateMenu.offsetWidth - 8, b.right - rotateMenu.offsetWidth)) + 'px';
    rotateMenu.style.top = Math.max(8, Math.min(window.innerHeight - rotateMenu.offsetHeight - 8, b.bottom + 6)) + 'px';
  } else rotateMenu.classList.remove('show');
}
rotateMenu.addEventListener('click', e => {
  e.stopPropagation();                                  // the menu is drawn again: its old button is gone when the page sees the click
  const b = e.target.closest('button[data-g]'); if (!b) return;
  if (b.dataset.g === 'on') { setRotate(b.dataset.v === '1'); return; }
  if (b.dataset.g === 'min') rotateCfg.min = Number(b.dataset.v);
  if (b.dataset.g === 'set') {
    rotateCfg.set = b.dataset.v;
    if (rotateList().length < 2) toast('Todavía no hay dos looks tuyos: guardalos en <span>C1–C3</span> (GUARDAR y el número)', 3400);
  }
  rotateLeft = rotateCfg.min * 60e3; savePrefs(); renderRotateMenu();
});
document.addEventListener('click', e => { if (rotateMenuOpen() && !e.target.closest('#rotateMenu') && !e.target.closest('button[data-v="rotate"]')) showRotateMenu(false); });
window.addEventListener('resize', () => { if (rotateMenuOpen()) showRotateMenu(false); });

// the clock: only music time counts
setInterval(() => {
  if (!rotateCfg.on) return;
  const playing = running && performance.now() - lastSound < 2500 && !miniMode && !modsBeforeTape && !document.hidden
    && !(typeof skinMenu !== 'undefined' && skinMenu.classList.contains('show')) && !rotateMenuOpen()
    && !(typeof aboutOpen === 'function' && aboutOpen()) && !(typeof welcomeOpen === 'function' && welcomeOpen())
    && !(typeof histOpen === 'function' && histOpen()) && !presetSaveArmed;
  if (!playing) return;
  rotateLeft -= 1000;
  if (rotateLeft <= 0) { rotateLeft = rotateCfg.min * 60e3; rotateNext(); }
}, 1000);
