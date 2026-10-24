// Updates from GitHub. Each release carries, besides the full zips, a small "app bundle": the
// program's own files (electron/, src/, assets/, package.json) as gzipped JSON. When a newer release
// exists, the page offers it; installing downloads that bundle, checks its SHA-256 against the one
// GitHub publishes for it, copies the current files to resources\app-anterior, writes the new ones
// over resources\app and restarts. A release built on a different Electron needs the full zip: then
// the page sends the user to GitHub instead.
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

function createUpdater({ app, net, log, onState }) {
  let state = { state: 'idle' }, release = null, busy = false;
  const set = s => { state = Object.assign({ current: app.getVersion() }, s); onState(state); };
  const headers = () => ({ 'Accept': 'application/vnd.github+json', 'User-Agent': 'Deck90/' + app.getVersion() });

  async function check() {
    if (busy) return state;
    if (!app.isPackaged) { set({ state: 'dev' }); return state; }       // running from the source folder
    try {
      const r = await net.fetch(API, { headers: headers() });
      if (!r.ok) throw new Error('GitHub ' + r.status);
      const rel = await r.json();
      const m = /^v(\d+\.\d+\.\d+)$/.exec(rel.tag_name || '');
      if (!m || rel.draft || rel.prerelease) throw new Error('unexpected release ' + rel.tag_name);
      const version = m[1];
      if (!newer(version, app.getVersion())) { release = null; set({ state: 'current', latest: version }); return state; }
      const url = `${PAGE}/tag/v${version}`;
      const asset = (rel.assets || []).find(a => a && a.name === `Deck-90-${version}-app.bundle`);
      const sha = asset && /^sha256:([0-9a-f]{64})$/.exec(asset.digest || '');
      const ok = asset && sha && asset.size > 0 && asset.size < MAX_BUNDLE && String(asset.browser_download_url).startsWith(DOWNLOAD);
      release = ok ? { version, url, download: asset.browser_download_url, sha256: sha[1], size: asset.size } : { version, url };
      log('update: ' + version + ' available' + (ok ? '' : ' (no bundle: manual download)'));
      set({ state: 'available', version, url, auto: !!ok });
    } catch (e) {
      log('update check: ' + e.message);                              // offline, rate limit…: try again later, quietly
      set({ state: 'error', error: 'check', message: friendly(e) });
    }
    return state;
  }

  async function install() {
    if (busy || !release || !release.download) return;
    busy = true;
    const { version, url } = release;
    const appDir = app.getAppPath();
    const backup = path.join(path.dirname(appDir), 'app-anterior');
    let wrote = false, pending = {};
    try {
      set({ state: 'downloading', version });
      const r = await net.fetch(release.download, { headers: { 'User-Agent': headers()['User-Agent'] } });
      if (!r.ok) throw new Error('la descarga falló (' + r.status + ')');
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length !== release.size) throw new Error('la descarga llegó incompleta');
      if (crypto.createHash('sha256').update(buf).digest('hex') !== release.sha256) throw new Error('el archivo no coincide con el publicado (SHA-256)');
      const b = JSON.parse(zlib.gunzipSync(buf, { maxOutputLength: 64 << 20 }).toString('utf8'));
      if (!b || b.format !== 1 || b.name !== 'deck-90' || b.version !== version || !b.files || typeof b.files !== 'object') throw new Error('paquete inesperado');
      if (b.electron !== process.versions.electron) {                // a new Electron comes only in the full zip
        log('update: ' + version + ' needs Electron ' + b.electron + ' (have ' + process.versions.electron + ')');
        release = { version, url };
        set({ state: 'manual', version, url });
        return;
      }
      const files = Object.entries(b.files);
      if (!files.some(([p]) => p === 'electron/main.js') || !files.some(([p]) => p === 'src/index.html')) throw new Error('paquete incompleto');
      for (const [p, data] of files) if (!safePath(p) || typeof data !== 'string') throw new Error('paquete con una ruta no válida');
      const decoded = files.map(([p, data]) => [p, Buffer.from(data, 'base64')]);
      pending = b.files;

      set({ state: 'installing', version });
      fs.rmSync(backup, { recursive: true, force: true });
      fs.cpSync(appDir, backup, { recursive: true });
      wrote = true;
      for (const [p, data] of decoded) {
        const dest = path.join(appDir, ...p.split('/'));
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest + '.update-tmp', data);
        fs.renameSync(dest + '.update-tmp', dest);
      }
      log('update: installed ' + version + ', restarting');
      set({ state: 'restarting', version });
      setTimeout(() => { app.relaunch(); app.quit(); }, 700);
    } catch (e) {
      log('update install: ' + (e && e.stack ? e.stack.split('\n')[0] : e));
      if (wrote) {                                                   // put the old files back: the program keeps working
        try { fs.cpSync(backup, appDir, { recursive: true, force: true }); } catch (e2) { log('update rollback: ' + e2.message); }
        for (const p of Object.keys(pending)) try { fs.rmSync(path.join(appDir, ...p.split('/')) + '.update-tmp', { force: true }); } catch (_) {}
      }
      set({ state: 'error', error: 'install', version, url, message: friendly(e) });
    } finally { busy = false; }
  }

  return { check, install, state: () => state, url: () => (release && release.url) || PAGE };
}

module.exports = { createUpdater, newer, safePath };
