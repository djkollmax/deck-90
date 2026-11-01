'use strict';
// ═══════════════════════════════════════════════════════════
//  UPDATES (program only)
//  The main process looks at GitHub when the program starts (and every few hours). When there's a
//  newer Deck 90 it says so here; INSTALAR downloads it, checks it and restarts into it.
// ═══════════════════════════════════════════════════════════
(function () {
  if (!window.appUpdate) return;
  const bar = document.getElementById('updBar'), txt = document.getElementById('updText');
  const go = document.getElementById('updGo'), info = document.getElementById('updInfo'), x = document.getElementById('updX');
  let st = null, dismissed = '';
  const esc = s => String(s || '').replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
  function render() {
    const key = st ? st.state + '|' + (st.version || '') : '';
    let show = false, text = '', goLabel = '', infoOn = false, err = false;
    if (!st) { /* nothing yet */ }
    else if (st.state === 'available') {
      show = true; infoOn = true;
      text = 'DECK 90 <b>' + esc(st.version) + '</b> DISPONIBLE';
      goLabel = st.auto ? 'INSTALAR' : 'BAJAR DE GITHUB';
    } else if (st.state === 'manual') {
      show = true; infoOn = false; goLabel = 'BAJAR DE GITHUB';
      text = 'DECK 90 ' + esc(st.version) + ' cambia el motor del programa: hay que bajarlo completo';
    } else if (st.state === 'downloading') { show = true; text = 'BAJANDO DECK 90 ' + esc(st.version) + '…'; }
    else if (st.state === 'installing') { show = true; text = 'INSTALANDO ' + esc(st.version) + '…'; }
    else if (st.state === 'restarting') { show = true; text = 'LISTO · REINICIANDO…'; }
    else if (st.state === 'error' && st.error === 'install') {
      show = true; err = true; goLabel = st.url ? 'BAJAR DE GITHUB' : '';
      text = '⚠ No se pudo actualizar' + (st.message ? ': ' + esc(st.message) : '') + (st.fromNote ? '.' : '. Sigue la versión de antes.');
    }
    if (show && dismissed === key && !['downloading', 'installing', 'restarting'].includes(st.state)) show = false;
    bar.classList.toggle('show', show);
    bar.classList.toggle('err', err);
    txt.innerHTML = text;
    go.textContent = goLabel;
    info.style.display = infoOn ? '' : 'none';
    x.style.display = ['downloading', 'installing', 'restarting'].includes(st && st.state) ? 'none' : '';
  }
  window.appUpdate.on(s => {
    st = s; render();
    // asked for from the tray: say how it went even when there's nothing to install
    if (s.manual && s.state === 'current') toast('Deck 90 ' + esc(s.current) + ' está al día', 2500);
    if (s.manual && s.state === 'error' && s.error === 'check') toast('⚠ No pude consultar GitHub: ' + esc(s.message), 4000);
  });
  go.addEventListener('click', () => {
    if (!st) return;
    if (st.state === 'available' && st.auto) window.appUpdate.install();
    else window.appUpdate.open();
  });
  info.addEventListener('click', () => window.appUpdate.open());
  x.addEventListener('click', () => { dismissed = st ? st.state + '|' + (st.version || '') : ''; render(); });
  window.appUpdate.get();
})();
