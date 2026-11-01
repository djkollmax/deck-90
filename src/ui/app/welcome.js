'use strict';
// ═══════════════════════════════════════════════════════════
//  BIENVENIDA: the first start of the program shows three steps (where it listens, how it looks, the
//  weather and the phone). Everything chosen here happens live behind it. It shows once; ACERCA DE has
//  a button to see it again.
// ═══════════════════════════════════════════════════════════
const welcomeModal = document.getElementById('welcomeModal');
const welcomeOpen = () => welcomeModal.classList.contains('show');
const WELCOME_KEY = 'deck90-welcome-done';
let welcomeStep = 0;

function welcomeSync() {
  welcomeModal.querySelectorAll('.welcome-step').forEach(s => s.classList.toggle('on', Number(s.dataset.step) === welcomeStep));
  welcomeModal.querySelectorAll('.welcome-dots i').forEach((d, i) => d.classList.toggle('on', i <= welcomeStep));
  welcomeModal.querySelectorAll('.welcome-src button').forEach(b => b.classList.toggle('on', b.dataset.src === activeSource));
  welcomeModal.querySelectorAll('.welcome-looks button').forEach(b => b.classList.toggle('on', presetMatches(b.dataset.look)));
  document.getElementById('welcomeBack').style.visibility = welcomeStep ? '' : 'hidden';
  document.getElementById('welcomeNext').textContent = welcomeStep < 2 ? 'SIGUIENTE' : 'EMPEZAR';
  const city = document.getElementById('welcomeCity');
  if (document.activeElement !== city && typeof clockCfg === 'object' && clockCfg.place) city.value = clockCfg.place.name;
}
function showWelcome(on) {
  if (on) {
    if (typeof showAbout === 'function' && aboutOpen()) showAbout(false);
    if (typeof histOpen === 'function' && histOpen()) showHistory(false);
    welcomeStep = 0;
    welcomeModal.querySelector('.welcome-looks').innerHTML = FACTORY_PRESETS.map((p, i) =>
      '<button data-look="' + (i + 1) + '"><img src="img/thumbs/vu-' + p.snap.vuSkin + '.jpg" alt=""><img src="img/thumbs/sp-' + p.snap.spectrumSkin + '.jpg" alt=""><b>' + (i + 1) + ' · ' + p.name + '</b></button>').join('');
  } else { try { localStorage.setItem(WELCOME_KEY, '1'); } catch (_) {} }
  welcomeModal.classList.toggle('show', on);
  if (on) welcomeSync();
}
function welcomeGo(d) {
  const n = welcomeStep + d;
  if (n > 2) { showWelcome(false); toast('Listo. <span>I</span> muestra las teclas y las novedades.', 3000); return; }
  welcomeStep = Math.max(0, n); welcomeSync();
}

document.getElementById('welcomeClose').addEventListener('click', () => showWelcome(false));
document.getElementById('welcomeBack').addEventListener('click', () => welcomeGo(-1));
document.getElementById('welcomeNext').addEventListener('click', () => welcomeGo(1));
welcomeModal.querySelector('.welcome-src').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.src === 'demo') startDemo(); else startAudio(b.dataset.src);
  setTimeout(welcomeSync, 300);
});
welcomeModal.querySelector('.welcome-looks').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const p = FACTORY_PRESETS[Number(b.dataset.look) - 1];
  if (!sameSnap(presetSnapshot(), p.snap)) applyPreset(b.dataset.look);   // its first look (from the second, the slot turns back to it)
  welcomeSync();
});
const welcomeCity = async () => { if (typeof lookupCity === 'function' && await lookupCity(document.getElementById('welcomeCity').value)) welcomeSync(); };
document.getElementById('welcomeCityGo').addEventListener('click', welcomeCity);
document.getElementById('welcomeCity').addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); welcomeCity(); } });
document.getElementById('welcomePhone').addEventListener('click', () => phoneButton('qr'));
document.getElementById('aboutWelcome').addEventListener('click', () => showWelcome(true));

// the first start of the program: once the rack is up
(function () {
  let done = false; try { done = !!localStorage.getItem(WELCOME_KEY); } catch (_) {}
  if (!done && window.deck90FirstRun && /Electron/.test(navigator.userAgent)) setTimeout(() => { if (!miniMode) showWelcome(true); }, 900);
  else if (!done) { try { localStorage.setItem(WELCOME_KEY, '1'); } catch (_) {} }   // set up before the welcome existed
})();
