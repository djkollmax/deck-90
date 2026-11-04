'use strict';
// ── RADIO SEARCH (7.10.10): any station in the world, by name and/or country, from Radio Browser (the main
// process asks it: radio-search). SCAN held on the DT-90 opens it; a station touched plays (a tuned station, not a
// memory) and the numbers below keep the one playing in the band's memories ──
const RF_COUNTRIES = ['AR', 'UY', 'CL', 'BR', 'PY', 'BO', 'PE', 'CO', 'VE', 'EC', 'MX', 'CU', 'US', 'CA', 'ES', 'PT', 'FR', 'IT',
  'DE', 'AT', 'CH', 'GB', 'IE', 'NL', 'BE', 'DK', 'SE', 'NO', 'FI', 'IS', 'PL', 'CZ', 'HU', 'GR', 'TR', 'RU', 'UA', 'IL', 'ZA',
  'EG', 'MA', 'IN', 'CN', 'JP', 'KR', 'TW', 'HK', 'SG', 'TH', 'ID', 'PH', 'AU', 'NZ', 'JM'];
let rfResults = [], rfBusy = 0;
const rfEl = id => document.getElementById(id);
const rfCountryName = (() => { let dn = null; try { dn = new Intl.DisplayNames(['es'], { type: 'region' }); } catch (_) {} return cc => (dn && dn.of(cc)) || cc; })();
{
  const sel = rfEl('rfCountry');
  const opts = RF_COUNTRIES.map(cc => [cc, rfCountryName(cc)]).sort((a, b) => a[1].localeCompare(b[1], 'es'));
  sel.append(new Option('Todos los países', ''), ...opts.map(([cc, n]) => new Option(n, cc)));
}
function rfOpen(on) {
  const m = rfEl('rfFind');
  m.classList.toggle('show', on);
  if (!on) return;
  rfEl('rfBand').textContent = radioMem.band === 'HIFI' ? 'HI-FI' : radioMem.band;
  rfKeepSync();
  setTimeout(() => rfEl('rfName').focus(), 50);
}
const rfKeepSync = () => rfEl('rfFind').querySelectorAll('.rf-keep button').forEach(b => { b.disabled = !radioNow; });
async function rfSearch() {
  const q = rfEl('rfName').value.trim(), cc = rfEl('rfCountry').value, msg = rfEl('rfMsg');
  if (!q && !cc) { msg.textContent = 'Escribí un nombre o elegí un país'; return; }
  if (!window.radio || !window.radio.search) { msg.textContent = '⚠ La búsqueda anda en el programa instalado'; return; }
  const t = ++rfBusy;
  msg.textContent = 'Buscando…';
  const r = await window.radio.search(q, cc).catch(() => null);
  if (t !== rfBusy) return;
  if (!r) { msg.textContent = '⚠ No pude buscar: ¿hay internet?'; return; }
  rfResults = r;
  msg.textContent = r.length ? r.length + (r.length === 1 ? ' radio' : ' radios') + (r.length >= 60 ? ' (las 60 más escuchadas)' : '') : 'No encontré radios con ese nombre';
  rfRender();
}
function rfRender() {
  const list = rfEl('rfList');
  list.replaceChildren(...rfResults.map((r, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'rf-item' + (radioNow && radioNow.url === r.url ? ' on' : ''); b.dataset.i = i; b.setAttribute('role', 'option');
    const name = document.createElement('b'); name.textContent = r.name;
    const where = document.createElement('small'); where.textContent = [r.place, r.cc ? rfCountryName(r.cc) : ''].filter(Boolean).join(', ');
    const q = document.createElement('i'), codec = String(r.codec || '').toUpperCase();
    q.textContent = (codec === 'FLAC' ? 'HI-FI · ' : '') + [codec, r.bitrate || ''].filter(Boolean).join(' ');
    if (codec === 'FLAC') q.className = 'hifi';
    b.append(name, where, q);
    return b;
  }));
}
function rfPlay(i) {
  const r = rfResults[i];
  if (!r) return;
  radioScanSet(false);
  radioMem.slot = 0;                                             // a tuned station, not a memory
  if (tunerCfg.show && !tunerPower) tunerOn(true, true);
  radioTune({ name: r.name.slice(0, 80), freq: '', q: r.name.slice(0, 60), cc: r.cc || '', url: r.url, codec: String(r.codec || '').toUpperCase().slice(0, 8), kbps: r.bitrate || 0 }, 'del mundo');
  setTimeout(() => { rfRender(); rfKeepSync(); }, 50);
}
rfEl('rfGo').addEventListener('click', rfSearch);
rfEl('rfClose').addEventListener('click', () => rfOpen(false));
rfEl('rfFind').addEventListener('click', e => { if (e.target.id === 'rfFind') rfOpen(false); });
rfEl('rfList').addEventListener('click', e => { const b = e.target.closest('.rf-item'); if (b) rfPlay(Number(b.dataset.i)); });
rfEl('rfFind').querySelector('.rf-keep').addEventListener('click', e => {
  const b = e.target.closest('button[data-m]'); if (!b || !radioNow) return;
  radioMemory(Number(b.dataset.m), true);
  if (typeof tunerSync === 'function') tunerSync();
});
rfEl('rfCountry').addEventListener('change', rfSearch);
rfEl('rfFind').addEventListener('keydown', e => {
  e.stopPropagation();
  if (e.key === 'Escape') { e.preventDefault(); rfOpen(false); }
  else if (e.key === 'Enter' && !e.target.closest('.rf-item, .rf-keep')) { e.preventDefault(); rfSearch(); }
});
deck.on('radio', () => { if (rfEl('rfFind').classList.contains('show')) rfKeepSync(); });
