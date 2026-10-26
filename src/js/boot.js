'use strict';
// Runs in <head>, before anything is drawn: the program (Electron) never shows the browser's start
// screen, so it's hidden from the very first paint instead of flashing until the page has loaded.
if (/Electron/.test(navigator.userAgent)) document.documentElement.classList.add('app-boot');
