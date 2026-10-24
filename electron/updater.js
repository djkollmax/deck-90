// Updates from GitHub. Each release carries, besides the full zips, a small "app bundle": the
// program's own files (electron/, src/, assets/, package.json) as gzipped JSON. When a newer release
// exists, the page offers it; installing downloads that bundle, checks its SHA-256 against the one
// GitHub publishes for it, copies the current files to resources\app-anterior, writes the new ones
// over resources\app and restarts. A release built on a different Electron needs the full zip: then
// the page sends the user to GitHub instead.
//
// Safety nets:
//  - every write and rename is retried for a moment (antivirus and the search indexer briefly lock
//    fresh files on Windows);
//  - if a write fails, exactly the files already written are put back (or removed, if they're new);
//  - resources\deck90-update.json marks an install in progress. If the program starts and finds it
//    still "writing" (power cut, crash) or still "booting" (the new version started and died before
//    its window loaded), it restores resources\app-anterior, restarts into it and doesn't offer that
//    version again.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');

const REPO = 'djkollmax/deck-90';
const API = `https://api.github.com/repos/${REPO}/releases/latest`;
const PAGE = `https://github.com/${REPO}/releases`;
const DOWNLOAD = `https://github.com/${REPO}/releases/download/`;
const MAX_BUNDLE = 20 << 20;
const FILE_OK = /^(package\.json|LICENSE|(electron|src|assets)\/[A-Za-z0-9._ \/-]+)$/;
const TOP = ['electron', 'src', 'assets'];
const LOCKED = ['EPERM', 'EBUSY', 'EACCES'];

// 'a' newer than 'b' ("6.4.1" > "6.4.0")
function newer(a, b) {
  const pa = String(a).split('.').map(Number), pb = String(b).split('.').map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
  return false;
}
function safePath(p) {
  return typeof p === 'string' && FILE_OK.test(p) && !p.split('/').some(s => s === '' || s === '.' || s === '..');
}
function friendly(e) {
  if (e && (e.code === 'EPERM' || e.code === 'EACCES' || e.code === 'EROFS')) return 'Windows no me deja escribir en la carpeta del programa';
  if (e && (e.code === 'ENOSPC')) return 'no hay lugar en el disco';
  if (e && e.code && e.syscall) return 'no se pudieron escribir los archivos del programa (' + e.code + ')';
  return (e && e.message ? e.message : String(e)).slice(0, 160);
}
const sleepSync = ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
// a file operation, retried for up to ~2.5 s while Windows holds the file
function retry(fn) {
  for (let i = 0; ; i++) {
    try { return fn(); }
    catch (e) { if (i >= 9 || !LOCKED.includes(e.code)) throw e; sleepSync(50 * (i + 1)); }
  }
}
// every file under the program's own folders, as 'src/js/x.js'
function listFiles(dir) {
  const out = [];
  const walk = rel => {
    let ents; try { ents = fs.readdirSync(path.join(dir, ...rel.split('/')), { withFileTypes: true }); } catch (_) { return; }
    for (const d of ents) { const r = rel + '/' + d.name; if (d.isDirectory()) walk(r); else out.push(r); }
  };
  TOP.forEach(walk);
  for (const f of ['package.json', 'LICENSE']) if (fs.existsSync(path.join(dir, f))) out.push(f);
  return out;
}
function copyTree(from, to) {                       // file by file, each one retried; returns the files that failed
  const failed = [];
  for (const p of listFiles(from)) {
    const src = path.join(from, ...p.split('/')), dst = path.join(to, ...p.split('/'));
    try { fs.mkdirSync(path.dirname(dst), { recursive: true }); retry(() => fs.copyFileSync(src, dst)); }
    catch (_) { failed.push(p); }
  }
  return failed;
}

// ── persistent notes: versions not to offer again, and a message for the next start ──
function notesFile(app) { return path.join(app.getPath('userData'), 'update.json'); }
function readNotes(app) {
  try { const n = JSON.parse(fs.readFileSync(notesFile(app), 'utf8')); return { skip: [], manual: [], ...n }; }
  catch (_) { return { skip: [], manual: [] }; }
}
function writeNotes(app, n) { try { fs.writeFileSync(notesFile(app), JSON.stringify(n)); } catch (_) {} }

// ── at start-up, before anything else: finish or undo an interrupted install ──
// Returns true when it restored the previous version and is restarting into it.
function recoverOnStart({ app, log }) {
  let appDir, marker, mk;
  try {
    appDir = app.getAppPath();
    marker = path.join(path.dirname(appDir), 'deck90-update.json');
    if (!fs.existsSync(marker)) return false;
    mk = JSON.parse(fs.readFileSync(marker, 'utf8'));
  } catch (e) { try { fs.rmSync(marker, { force: true }); } catch (_) {} return false; }
  if (mk.phase === 'installed') {                   // first start of the new version: confirmed once its window loads
    try { fs.writeFileSync(marker, JSON.stringify({ ...mk, phase: 'booting' })); } catch (_) {}
    return false;
  }
  const backup = path.join(path.dirname(appDir), 'app-anterior');
  if (!fs.existsSync(path.join(backup, 'package.json'))) { try { fs.rmSync(marker, { force: true }); } catch (_) {} return false; }
  const why = mk.phase === 'writing' ? 'la instalación se cortó' : 'no llegó a arrancar';
  const failed = copyTree(backup, appDir);
  log('update: ' + mk.to + ' ' + why + ', restored ' + mk.from + (failed.length ? ' (' + failed.length + ' files failed)' : ''));
  const n = readNotes(app);
  if (mk.to && !n.skip.includes(mk.to)) n.skip.push(mk.to);
  n.note = { failed: mk.to, back: mk.from, why, incomplete: failed.length > 0 };
  writeNotes(app, n);
  try { fs.rmSync(marker, { force: true }); } catch (_) {}
  app.relaunch(); app.exit(0);
  return true;
}

function createUpdater({ app, net, log, onState, relaunchArgs }) {
  let state = { state: 'idle' }, release = null, busy = false;
  const set = s => { state = Object.assign({ current: app.getVersion() }, s); onState(state); };
  const headers = () => ({ 'Accept': 'application/vnd.github+json', 'User-Agent': 'Deck90/' + app.getVersion() });
  const appDir = app.getAppPath();
  const resDir = path.dirname(appDir);
  const marker = path.join(resDir, 'deck90-update.json');
  const notes = readNotes(app);
  if (notes.note) {                                 // tell the user once what happened at start-up
    const n = notes.note; delete notes.note; writeNotes(app, notes);
    state = { state: 'error', error: 'install', current: app.getVersion(), version: n.failed, url: `${PAGE}/tag/v${n.failed}`,
              fromNote: true, message: 'la ' + n.failed + ' ' + n.why + '; volví a la ' + n.back + (n.incomplete ? ' (revisá la carpeta del programa)' : '') };
  }

  // the window of the new version loaded: the update is good
  function confirmBoot() {
    try {
      if (!fs.existsSync(marker)) return;
      const mk = JSON.parse(fs.readFileSync(marker, 'utf8'));
      if (mk.phase === 'booting' && mk.to === app.getVersion()) { fs.rmSync(marker, { force: true }); log('update: ' + mk.to + ' started fine'); }
    } catch (_) {}
  }

  let checking = null;
  function check() { return checking || (checking = doCheck().finally(() => { checking = null; })); }
  async function doCheck() {
    if (busy) return state;
    if (!app.isPackaged) { set({ state: 'dev' }); return state; }       // running from the source folder
    try {
      const r = await net.fetch(API, { headers: headers() });
      if (!r.ok) throw new Error('GitHub ' + r.status);
      const rel = await r.json();
      if (busy) return state;                                          // an install started meanwhile
      const m = /^v(\d+\.\d+\.\d+)$/.exec(rel.tag_name || '');
      if (!m || rel.draft || rel.prerelease) throw new Error('unexpected release ' + rel.tag_name);
      const version = m[1];
      if (!newer(version, app.getVersion()) || notes.skip.includes(version)) {
        release = null;
        if (!state.fromNote) set({ state: 'current', latest: version });   // leave the start-up message up
        return state;
      }
      const url = `${PAGE}/tag/v${version}`;
      const asset = (rel.assets || []).find(a => a && a.name === `Deck-90-${version}-app.bundle`);
      const sha = asset && /^sha256:([0-9a-f]{64})$/.exec(asset.digest || '');
      const ok = !notes.manual.includes(version) && asset && sha && asset.size > 0 && asset.size < MAX_BUNDLE && String(asset.browser_download_url).startsWith(DOWNLOAD);
      release = ok ? { version, url, download: asset.browser_download_url, sha256: sha[1], size: asset.size } : { version, url };
      log('update: ' + version + ' available' + (ok ? '' : ' (manual download)'));
      set({ state: 'available', version, url, auto: !!ok });
    } catch (e) {
      log('update check: ' + e.message);                              // offline, rate limit…: try again later, quietly
      if (state.state !== 'available' && !state.fromNote) set({ state: 'error', error: 'check', message: friendly(e) });
    }
    return state;
  }

  async function install() {
    const rel = release;
    if (busy || !rel || !rel.download) return;
    busy = true;
    const { version, url } = rel;
    const backup = path.join(resDir, 'app-anterior');
    const written = [];                    // [path, existed before]
    let ok = false;
    try {
      set({ state: 'downloading', version });
      const r = await net.fetch(rel.download, { headers: { 'User-Agent': headers()['User-Agent'] } });
      if (!r.ok) throw new Error('la descarga falló (' + r.status + ')');
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length !== rel.size) throw new Error('la descarga llegó incompleta');
      if (crypto.createHash('sha256').update(buf).digest('hex') !== rel.sha256) throw new Error('el archivo no coincide con el publicado (SHA-256)');
      const b = JSON.parse(zlib.gunzipSync(buf, { maxOutputLength: 64 << 20 }).toString('utf8'));
      if (!b || b.format !== 1 || b.name !== 'deck-90' || b.version !== version || !b.files || typeof b.files !== 'object') throw new Error('paquete inesperado');
      if (b.electron !== process.versions.electron) {                // a new Electron comes only in the full zip
        log('update: ' + version + ' needs Electron ' + b.electron + ' (have ' + process.versions.electron + ')');
        if (!notes.manual.includes(version)) { notes.manual.push(version); writeNotes(app, notes); }
        release = { version, url };
        set({ state: 'manual', version, url });
        return;
      }
      const files = Object.entries(b.files);
      if (!files.some(([p]) => p === 'electron/main.js') || !files.some(([p]) => p === 'src/index.html')) throw new Error('paquete incompleto');
      for (const [p, data] of files) if (!safePath(p) || typeof data !== 'string') throw new Error('paquete con una ruta no válida');
      const decoded = files.map(([p, data]) => [p, Buffer.from(data, 'base64')]);

      set({ state: 'installing', version });
      // a fresh copy of the current files (if the old copy can't be removed, e.g. open in Explorer, it's overwritten)
      try { fs.rmSync(backup, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); } catch (_) {}
      if (copyTree(appDir, backup).length) throw new Error('no pude guardar una copia de la versión actual');
      fs.writeFileSync(marker, JSON.stringify({ phase: 'writing', from: app.getVersion(), to: version, at: Date.now() }));
      const before = new Set(listFiles(appDir));
      for (const [p, data] of decoded) {
        const dest = path.join(appDir, ...p.split('/'));
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        retry(() => fs.writeFileSync(dest + '.update-tmp', data));
        written.push([p, before.has(p)]);
        retry(() => fs.renameSync(dest + '.update-tmp', dest));
      }
      // files the new version no longer has
      const keep = new Set(files.map(([p]) => p));
      for (const p of before) if (!keep.has(p) && p !== 'LICENSE') { try { retry(() => fs.rmSync(path.join(appDir, ...p.split('/')), { force: true })); } catch (_) {} }
      fs.writeFileSync(marker, JSON.stringify({ phase: 'installed', from: app.getVersion(), to: version, at: Date.now() }));
      ok = true;
      log('update: installed ' + version + ', restarting');
      set({ state: 'restarting', version });
      setTimeout(() => { app.relaunch(relaunchArgs ? { args: relaunchArgs() } : undefined); app.quit(); }, 700);
    } catch (e) {
      log('update install: ' + (e && e.stack ? e.stack.split('\n')[0] : e));
      // put back exactly what was written: old files from the copy, new ones removed
      let undoFailed = 0;
      for (const [p, existed] of written.reverse()) {
        const dest = path.join(appDir, ...p.split('/'));
        try {
          retry(() => fs.rmSync(dest + '.update-tmp', { force: true }));
          if (existed) retry(() => fs.copyFileSync(path.join(backup, ...p.split('/')), dest));
          else retry(() => fs.rmSync(dest, { force: true }));
        } catch (e2) { undoFailed++; log('update rollback ' + p + ': ' + e2.message); }
      }
      if (!undoFailed) { try { fs.rmSync(marker, { force: true }); } catch (_) {} }
      set({ state: 'error', error: 'install', version, url,
            message: friendly(e) + (undoFailed ? '. Quedaron archivos a medias: al reiniciar Deck 90 vuelve solo a la versión anterior' : '') });
    } finally { if (!ok) busy = false; }
  }

  return { check, install, confirmBoot, state: () => state, url: () => (release && release.url) || (state.url) || PAGE };
}

module.exports = { createUpdater, recoverOnStart, newer, safePath };
