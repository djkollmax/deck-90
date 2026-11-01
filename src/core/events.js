'use strict';
// ═══════════════════════════════════════════════════════════
//  THE HUB between the core (src/core: what works with no screen) and the screens. The core says what
//  happened, deck.emit('radio'); each screen that shows it listens, deck.on('radio', fn). A line for the person
//  goes as deck.notice(html, ms) (the page shows it as a toast). A listener that fails doesn't stop the others.
// ═══════════════════════════════════════════════════════════
const deck = (() => {
  const subs = Object.create(null);
  return {
    on(ev, fn) { (subs[ev] || (subs[ev] = [])).push(fn); },
    emit(ev, ...args) { for (const fn of subs[ev] || []) { try { fn(...args); } catch (e) { console.error('deck ' + ev + ':', e); } } },
    notice(html, ms) { this.emit('notice', html, ms); },
  };
})();
