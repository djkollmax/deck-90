'use strict';
// ═══════════════════════════════════════════════════════════
//  A COPY OF THE SETTINGS (⚙ → EXTRAS → AJUSTES)
//  GUARDAR COPIA writes what Deck 90 remembers (the look on screen, C1–C3, the clock and the city) to a
//  file; CARGAR reads one back after a second tap to confirm, and starts the page again with it.
//  The track history isn't in it: it exports to Excel from its own window.
// ═══════════════════════════════════════════════════════════
const BACKUP_KEYS = ['deck90-prefs', 'deck90-presets-v2', 'deck90-clock', 'deck90-radio'];
let backupArmed = 0;

function backupText() {
  const data = {};
  for (const k of BACKUP_KEYS) { try { const v = localStorage.getItem(k); if (v != null) data[k] = JSON.parse(v); } catch (_) {} }
  return JSON.stringify({ app: 'Deck 90', kind: 'ajustes', version: (typeof aboutVersion === 'string' && aboutVersion) || '', saved: new Date().toISOString(), data }, null, 2);
}
// a file from GUARDAR COPIA: only the known parts, each an object
function backupRead(text) {
  let j; try { j = JSON.parse(text); } catch (_) { return null; }
  if (!j || j.app !== 'Deck 90' || j.kind !== 'ajustes' || !j.data || typeof j.data !== 'object') return null;
  const out = {};
  for (const k of BACKUP_KEYS) if (j.data[k] && typeof j.data[k] === 'object') out[k] = j.data[k];
  return Object.keys(out).length ? out : null;
}
async function backupSave() {
  if (!window.appSettings) { toast('La copia de ajustes funciona en el programa.', 2600); return; }
  savePrefs();
  const r = await window.appSettings.save(backupText());
  if (r && r.ok) toast('Ajustes guardados en <span>' + String(r.path).split(/[\\/]/).pop().replace(/[<>&]/g, '') + '</span>', 3200);
  else if (r && r.error) toast('⚠ No pude guardar los ajustes: ' + String(r.error).replace(/[<>&]/g, ''), 4000);
}
async function backupLoad(btn) {
  if (!window.appSettings) { toast('La copia de ajustes funciona en el programa.', 2600); return; }
  if (Date.now() - backupArmed > 5000) {              // first tap: ask
    backupArmed = Date.now(); btn.textContent = '¿REEMPLAZAR? TOCÁ DE NUEVO';
    setTimeout(() => { if (Date.now() - backupArmed >= 5000) btn.textContent = 'CARGAR'; }, 5100);
    return;
  }
  backupArmed = 0; btn.textContent = 'CARGAR';
  const r = await window.appSettings.open();
  if (!r || r.canceled) return;
  if (r.error) { toast('⚠ No pude leer el archivo: ' + String(r.error).replace(/[<>&]/g, ''), 4000); return; }
  const data = backupRead(r.text);
  if (!data) { toast('⚠ Ese archivo no es una copia de ajustes de Deck 90.', 4000); return; }
  try { for (const k in data) localStorage.setItem(k, JSON.stringify(data[k])); } catch (_) { toast('⚠ No pude cargar los ajustes.', 3000); return; }
  toast('Ajustes cargados', 1500);
  setTimeout(() => window.appSettings.reload ? window.appSettings.reload() : location.reload(), 400);   // everything starts again with them
}
document.querySelector('.seg[data-group="backup"]').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  e.stopPropagation();                                 // not the console's own handler (it would save the old look over it)
  if (b.dataset.v === 'save') backupSave(); else backupLoad(b);
});
