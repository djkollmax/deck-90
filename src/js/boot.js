'use strict';
// Runs in <head>, before anything is drawn: the program (Electron) never shows the browser's start
// screen, so it's hidden from the very first paint instead of flashing until the page has loaded.
if (/Electron/.test(navigator.userAgent)) document.documentElement.classList.add('app-boot');
// The frame (TITANIO unless CLÁSICO was chosen) from the first paint too.
try {
  const p = JSON.parse(localStorage.getItem('deck90-prefs')) || {}, h = document.documentElement.classList;
  if (p.chassis !== 'CLASSIC') h.add('chassis-ti');
  if (p.chassis === 'BLACK') h.add('fin-black');
  if (p.chassis === 'GOLD') h.add('fin-gold');
} catch (_) { document.documentElement.classList.add('chassis-ti'); }
// the displays' lettering is a bundled font: once it's loaded, draw the idle screen again with it
if (document.fonts && document.fonts.load) {
  Promise.all([document.fonts.load("600 16px 'Deck90 Display'"), document.fonts.load("500 16px 'Deck90 Display'"), document.fonts.load("16px 'Deck90 Dots'")])
    .then(() => { if (typeof running !== 'undefined' && !running && typeof drawIdle === 'function') drawIdle(); }).catch(() => {});
}
