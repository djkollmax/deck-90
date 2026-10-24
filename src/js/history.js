'use strict';
// ═══════════════════════════════════════════════════════════
//  TRACK HISTORY
//  One line per track heard from the system audio for at least 30 s: its integrated loudness,
//  loudness range, peak, BPM and what Spotify's normalisation would do to it. Kept on the PC
//  (the program's data folder; localStorage in a browser) and exported as a CSV that Excel opens.
// ═══════════════════════════════════════════════════════════
const HIST_MIN_BLOCKS = 300;            // 30 s of measured, playing audio (one gate block every 100 ms)
const HIST_PAGE_T0 = Date.now();        // ids stay unique across reloads
let histBpm = [];                       // the locked BPM, read once a second
let histLast = null;                    // the entry saved last (checkpoints of the same play update it)

function historyReset() { histBpm = []; }
setInterval(() => {
  if (running && npPlaying() && bpmVal > 0 && bpmConfidence >= 0.45) {
    histBpm.push(Math.round(bpmVal));
    if (histBpm.length > 1200) histBpm.shift();
  }
}, 1000);
function histBpmValue() {                // the reading held longest, if the tempo was locked for a while
  if (histBpm.length < 8) return null;
  const n = new Map(); let best = 0, val = null;
  for (const b of histBpm) { const c = (n.get(b) || 0) + 1; n.set(b, c); if (c > best) { best = c; val = b; } }
  return val;
}
const histR1 = x => (typeof x === 'number' && isFinite(x)) ? Math.round(x * 10) / 10 : null;

// What the track has measured so far, or null if there's nothing worth keeping yet.
// ended: the next track was just announced, so its first moments may already be in the numbers:
// leave out the last second (gate blocks and peaks).
function historyEntry(minBlocks, info, ended) {
  info = info || np;
  if (!info || activeSource !== 'sys' || gateBlocks.length < minBlocks) return null;
  const blocks = ended ? gateBlocks.slice(0, -10) : gateBlocks;
  const I = integratedLufs(blocks);
  if (!isFinite(I)) return null;
  const tpMax = ended ? tpSettled : tpMaxDb, pkMax = ended ? pkSettled : pkMaxDb;
  const peak = tpAvailable && isFinite(tpMax) ? tpMax : pkMax;
  return {
    id: HIST_PAGE_T0 + '|' + Math.round(trackStart) + '|' + npKey.slice(0, 400),
    at: Math.round(Date.now() - (performance.now() - trackStart)),
    title: info.title || '', artist: info.artist || '', album: info.album || '', app: info.app || '',
    dur: info.dur > 0 ? Math.round(info.dur) : null,
    heard: Math.round(blocks.length / 10),
    i: histR1(I), lra: histR1(loudnessRange()),
    tp: tpAvailable && isFinite(tpMax) ? histR1(tpMax) : null,
    pk: histR1(pkMax),
    bpm: histBpmValue(),
    spot: histR1(spotifyGain(I, peak)),
  };
}
function historyFinalize(reason, info) {
  try {
    const e = historyEntry(HIST_MIN_BLOCKS, info, reason === 'next track');
    if (!e) return;
    if (reason === 'checkpoint' && histLast && histLast.id === e.id && histLast.heard >= e.heard) return;   // nothing new since the last save
    histLast = e;
    histStore.add(e);
    if (histOpen()) histRender();
  } catch (err) { if (typeof report === 'function') report('history ' + reason, err); }
}
window.addEventListener('beforeunload', () => historyFinalize('close'));
// every 45 s the track so far is saved too, so a crash or a Windows shutdown loses at most that
setInterval(() => { if (running) historyFinalize('checkpoint'); }, 45000);

// ── storage: the program keeps it in its data folder; a browser in localStorage ──
const HIST_LS = 'deck90-history';
const histStore = window.trackLog ? {
  add: e => window.trackLog.add(e),
  list: () => window.trackLog.list(),
  clear: () => window.trackLog.clear(),
  saveCsv: (text, name) => window.trackLog.saveCsv(text, name),
} : {
  read() { try { const a = JSON.parse(localStorage.getItem(HIST_LS)); return Array.isArray(a) ? a : []; } catch (_) { return []; } },
  write(a) { try { localStorage.setItem(HIST_LS, JSON.stringify(a.slice(0, 500))); } catch (_) {} },
  add(e) { const a = this.read().filter(x => x.id !== e.id); a.unshift(e); this.write(a); return Promise.resolve(true); },
  list() { return Promise.resolve(this.read()); },
  clear() { this.write([]); return Promise.resolve(true); },
  saveCsv(text, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    return Promise.resolve({ ok: true });
  },
};

// ── CSV for Excel (Argentina/Spain: ';' between fields, ',' for decimals) ──
const pad2 = n => String(n).padStart(2, '0');
function histDate(t, withYear) {
  const d = new Date(t);
  return (withYear ? d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate())
                   : pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1)) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
}
// h:mm:ss, which Excel reads as a duration (m:ss would be taken as hours and minutes)
const histHMS = s => { if (s === null || s === undefined) return ''; s = Math.round(s); return Math.floor(s / 3600) + ':' + pad2(Math.floor(s / 60) % 60) + ':' + pad2(s % 60); };
function csvField(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return String(v).replace('.', ',');
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;                 // never let a title become an Excel formula
  return /[;"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function historyCsv(list) {
  const head = ['Fecha', 'Tema', 'Artista', 'Álbum', 'Reproductor', 'Duración', 'Escuchado', 'LUFS integrado', 'LRA', 'True peak máx (dBTP)', 'Pico máx (dBFS)', 'BPM', 'Spotify (dB)'];
  const rows = list.map(e => [histDate(e.at, true), e.title, e.artist, e.album, e.app, histHMS(e.dur), histHMS(e.heard),
                              e.i, e.lra, e.tp, e.pk, e.bpm, e.spot].map(csvField).join(';'));
  return [head.join(';')].concat(rows).join('\r\n') + '\r\n';
}

// ── the window ──
const histModal = document.getElementById('histModal');
const histOpen = () => histModal.classList.contains('show');
let histTimer = 0, histClearArmed = 0;
function histCell(tr, text, cls) { const td = document.createElement('td'); td.textContent = text; if (cls) td.className = cls; tr.appendChild(td); }
const histNum = (x, d = 1) => x === null || x === undefined ? '—' : x.toFixed(d);
const histGain = g => g === null || g === undefined ? '—' : fmtGain(g);
const histGainCls = g => g === null || g === undefined ? '' : g < -6 ? 'hot' : g < -3 ? 'warn' : 'good';
function histRow(e, live) {
  const tr = document.createElement('tr');
  if (live) tr.className = 'live';
  histCell(tr, live ? '● AHORA' : histDate(e.at, false), 'when');
  const td = document.createElement('td'); td.className = 'track';
  const t = document.createElement('b'); t.textContent = e.title || '(sin título)';
  const a = document.createElement('span'); a.textContent = [e.artist, e.album].filter(Boolean).join(' · ');
  td.title = [e.title, e.artist, e.album].filter(Boolean).join(' — ');
  td.appendChild(t); td.appendChild(a); tr.appendChild(td);
  histCell(tr, histNum(e.i), 'n');
  histCell(tr, histNum(e.lra), 'n');
  histCell(tr, e.tp !== null && e.tp !== undefined ? histNum(e.tp) : histNum(e.pk), 'n' + ((e.tp ?? e.pk) > -1 ? ' hot' : ''));
  histCell(tr, e.bpm ? String(e.bpm) : '—', 'n');
  histCell(tr, histGain(e.spot), 'n ' + histGainCls(e.spot));
  return tr;
}
let histCache = [];
async function histRender(reload = true) {
  if (reload) { try { histCache = await histStore.list(); } catch (_) { histCache = []; } }
  const body = document.getElementById('histBody');
  body.textContent = '';
  const live = historyEntry(50);
  if (live) body.appendChild(histRow(live, true));
  histCache.slice(0, 500).forEach(e => body.appendChild(histRow(e)));
  const n = histCache.length;
  document.getElementById('histEmpty').style.display = n || live ? 'none' : 'block';
  document.getElementById('histCount').textContent = n ? n + (n === 1 ? ' tema' : ' temas') + (n > 500 ? ' · se ven los últimos 500, el archivo lleva todos' : '') : '';
  document.getElementById('histExport').disabled = !n;
  document.getElementById('histClear').disabled = !n;
}
function showHistory(on) {
  histModal.classList.toggle('show', on);
  clearInterval(histTimer); histClearArmed = 0;
  document.getElementById('histClear').textContent = 'BORRAR TODO';
  if (on) { histRender(); histTimer = setInterval(() => histRender(false), 1000); }   // the "now" line keeps moving
}
document.getElementById('histClose').addEventListener('click', () => showHistory(false));
histModal.addEventListener('click', e => { if (e.target === histModal) showHistory(false); });
document.getElementById('histExport').addEventListener('click', async () => {
  const list = await histStore.list();
  if (!list.length) return;
  const d = new Date();
  const name = 'Deck 90 - historial ' + d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + '.csv';
  const r = await histStore.saveCsv(historyCsv(list), name);
  if (r && r.ok) toast('Historial guardado' + (r.path ? '<br><span>' + r.path.replace(/[<>&]/g, '') + '</span>' : ''), 4500);
  else if (r && r.error) toast('⚠ No se pudo guardar: ' + String(r.error).replace(/[<>&]/g, ''), 6000);
});
document.getElementById('histClear').addEventListener('click', async () => {
  const b = document.getElementById('histClear');
  if (Date.now() - histClearArmed > 4000) { histClearArmed = Date.now(); b.textContent = '¿SEGURO? TOCÁ OTRA VEZ'; return; }
  histClearArmed = 0; b.textContent = 'BORRAR TODO';
  await histStore.clear(); histLast = null; histRender();
});
