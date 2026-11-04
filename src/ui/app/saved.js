'use strict';
// ── SAVED SONGS (7.10.11): G (or MEMO held on the DT-90) keeps the song playing, from the radio, the CD, the DM-90
// or the PC, to look it up later: a list with when and where it played, a search for it on YouTube and Spotify,
// and a CSV for Excel. Kept in deck90-saved (the newest first, 500 at most) ──
const SAVED_KEY = 'deck90-saved';
let savedClearArmed = 0;
const savedList = () => { const a = store.read(SAVED_KEY, []); return Array.isArray(a) ? a.filter(x => x && x.title) : []; };
// the song playing now, as it's saved: { title, artist, where, at }, or null when there's no song to name
function savedNow() {
  const src = typeof npSourceNow !== 'undefined' ? npSourceNow : null;
  if (src && src.name === 'radio') {
    const song = typeof radioSong === 'function' ? radioSong() : '', m = /^(.+?)\s+-\s+(.+)$/.exec(song);
    if (!song) return null;                                         // the station doesn't say what it plays
    const st = radioNow;
    return { title: m ? m[2].trim() : song, artist: m ? m[1].trim() : '', where: 'Radio · ' + (st ? st.name + (st.freq ? ' ' + st.freq : '') : ''), at: Date.now() };
  }
  if (!np || !np.title) return null;
  const where = np.app === 'Deck 90 · CD' ? 'CD' + (np.album && np.album !== 'Audio CD' ? ' · ' + np.album : '')
    : np.app === 'Deck 90 · DM-90' ? 'DM-90' + (np.album ? ' · ' + np.album : '') : (np.app || 'PC') + (np.album ? ' · ' + np.album : '');
  if (np.app === 'Deck 90 · CD' && !np.artist) return null;        // a track with no name
  return { title: np.title, artist: np.artist || '', where, at: Date.now() };
}
function songSave() {
  const s = savedNow();
  if (!s) { toast('★ · <span>no sé qué tema suena</span>' + (radioPlaying() ? ': esta radio no lo dice' : ''), 2200); return false; }
  const list = savedList(), same = list[0] && list[0].title === s.title && list[0].artist === s.artist && s.at - list[0].at < 30 * 60e3;
  if (same) { toast('★ · <span>ya estaba guardado</span>', 1600); return false; }
  list.unshift(s); store.write(SAVED_KEY, list.slice(0, 500));
  toast('★ GUARDADO · <span>' + ((s.artist ? s.artist + ' – ' : '') + s.title).replace(/[<>&]/g, '') + '</span><br>L → ★ GUARDADOS para verlos', 2600);
  if (savedModal.classList.contains('show')) savedRender();
  return true;
}
const savedModal = document.getElementById('savedModal');
const savedQ = s => encodeURIComponent((s.artist ? s.artist + ' ' : '') + s.title);
function savedRender() {
  const list = savedList(), body = document.getElementById('savedBody');
  body.replaceChildren(...list.map((s, i) => {
    const tr = document.createElement('tr');
    const td = (text, cls) => { const c = document.createElement('td'); if (cls) c.className = cls; if (text !== undefined) c.textContent = text; tr.appendChild(c); return c; };
    td(histDate(s.at), 'when');
    td((s.artist ? s.artist + ' – ' : '') + s.title, 'track');
    td(s.where || '');
    const go = td(undefined, 'saved-go');
    for (const [name, url] of [['YOUTUBE', 'https://www.youtube.com/results?search_query='], ['SPOTIFY', 'https://open.spotify.com/search/']]) {
      const a = document.createElement('a'); a.href = url + savedQ(s); a.target = '_blank'; a.rel = 'noopener'; a.textContent = name; go.appendChild(a);
    }
    const x = document.createElement('button'); x.className = 'saved-x'; x.title = 'Sacarlo de la lista'; x.textContent = '✕'; x.dataset.i = i;
    td(undefined).appendChild(x);
    return tr;
  }));
  document.getElementById('savedEmpty').style.display = list.length ? 'none' : '';
  document.getElementById('savedCount').textContent = list.length ? list.length + (list.length === 1 ? ' tema' : ' temas') : '';
  document.getElementById('savedExport').disabled = document.getElementById('savedClear').disabled = !list.length;
}
function showSaved(on) {
  savedModal.classList.toggle('show', on);
  savedClearArmed = 0; document.getElementById('savedClear').textContent = 'BORRAR TODO';
  if (on) savedRender();
}
document.getElementById('histSaved').addEventListener('click', () => showSaved(true));
document.getElementById('savedClose').addEventListener('click', () => showSaved(false));
savedModal.addEventListener('click', e => {
  if (e.target === savedModal) return showSaved(false);
  const x = e.target.closest('.saved-x');
  if (x) { const list = savedList(); list.splice(Number(x.dataset.i), 1); store.write(SAVED_KEY, list); savedRender(); }
});
savedModal.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); showSaved(false); } });
document.getElementById('savedClear').addEventListener('click', () => {
  const b = document.getElementById('savedClear');
  if (Date.now() - savedClearArmed > 4000) { savedClearArmed = Date.now(); b.textContent = '¿SEGURO? TOCÁ OTRA VEZ'; return; }
  savedClearArmed = 0; b.textContent = 'BORRAR TODO'; store.write(SAVED_KEY, []); savedRender();
});
document.getElementById('savedExport').addEventListener('click', async () => {
  const list = savedList(); if (!list.length) return;
  const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const csv = ['Cuándo;Artista;Tema;Dónde sonaba', ...list.map(s => [histDate(s.at, true), s.artist, s.title, s.where].map(q).join(';'))].join('\r\n');
  const d = new Date(), name = 'Deck 90 - temas guardados ' + d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + '.csv';
  const r = await histStore.saveCsv(csv, name);
  if (r && r.ok) toast('Temas guardados en un archivo' + (r.path ? '<br><span>' + r.path.replace(/[<>&]/g, '') + '</span>' : ''), 4500);
  else if (r && r.error) toast('⚠ No se pudo guardar: ' + String(r.error).replace(/[<>&]/g, ''), 6000);
});
