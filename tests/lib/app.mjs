// Starts Deck 90 for a test: a fresh profile, no network (the radio finds the pretend station, no weather, no
// MusicBrainz), a pretend CD drive in place of Windows' (see drive below), the welcome closed and the toasts hidden.
//
//   const d = await launch({ station, size: [1300, 1100], drive: { tracks: … } });
//   await d.win.evaluate(() => tunerKey('power'));
//   … d.cmds() (the bridge commands since the last call), d.toasts(), d.errors() …
//   await d.close();
//
// Electron: ELECTRON_PATH, or the one installed with npm. Playwright: PW_DIR (a folder holding
// node_modules/playwright-core), or the one installed with npm.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const require = createRequire(path.join(ROOT, 'package.json'));

async function playwright() {
  if (process.env.PW_DIR) return import(pathToFileURL(path.join(process.env.PW_DIR, 'node_modules', 'playwright-core', 'index.mjs')).href);
  return import(pathToFileURL(path.join(path.dirname(require.resolve('playwright-core/package.json')), 'index.mjs')).href);
}
/** Playwright itself, for a phone's browser in the tests. */
export const playwrightModule = playwright;
const electronPath = () => process.env.ELECTRON_PATH || require('electron');

// errors that only mean this computer has no system sound to listen to
const NOISE = /monitor|NotReadable|NotFound|capture|Requested device|Permission denied|502 \(Bad Gateway\)|503 \(Service Unavailable\)|404 \(Not Found\)/i;   // (a station off the air, on purpose)

/** A disc of n audio tracks of len seconds (with table-of-contents frames, so its names can be looked up). */
export const disc = (n, len, extra = {}) => ({
  drive: 'E:', name: 'USB DVD', present: true, files: [],
  tracks: Array.from({ length: n }, (_, i) => ({ n: i + 1, audio: true, len: typeof len === 'function' ? len(i + 1) : len, start: 150 + i * 13600 })),
  leadout: 150 + n * 13600, ...extra,
});

export async function launch({ station, size, drive, names, welcome = false, toasts = false } = {}) {
  const { _electron } = await playwright();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'deck90-test-'));
  const app = await _electron.launch({ executablePath: electronPath(), args: ['--no-sandbox', '--user-data-dir=' + profile, ROOT] });
  const base = station ? station.base : 'http://127.0.0.1:9';
  // the main process: no network, and the pretend drive
  await app.evaluate(({ ipcMain, BrowserWindow }, { base, drive, names, size }) => {
    if (size) BrowserWindow.getAllWindows()[0]?.setSize(size[0], size[1]);
    const handle = (ch, fn) => { ipcMain.removeHandler(ch); ipcMain.handle(ch, fn); };
    global.cmds = []; global.finds = [];
    // global.findAnswer(q, base), when a test sets it, says what Radio Browser has (several streams of a station)
    handle('radio-find', (e, q) => { global.finds.push(q); return global.findAnswer ? global.findAnswer(q, base) : [{ name: q, url: base + '/s', codec: 'MP3', bitrate: 128 }]; });
    // the world's stations (the radio's search): three of the name asked, from the country asked (France by default)
    handle('radio-search', (e, q, cc) => { global.searches = (global.searches || []).concat([[q, cc]]);
      return ['Uno', 'Dos FLAC', 'Tres'].map((n, i) => ({ name: (q || 'Radio') + ' ' + n, url: base + '/s?w' + i, codec: i === 1 ? 'FLAC' : 'MP3', bitrate: i === 1 ? 0 : 128, cc: cc || 'FR', place: i ? '' : 'Île-de-France' })); });
    // 7.10.20: the stations near a place (LOC): two of the town asked
    handle('radio-near', (e, lat, lon, town, cc) => { global.nears = (global.nears || []).concat([[lat, lon, town, cc]]);
      return ['FM', 'Rock'].map((n, i) => ({ name: town + ' ' + n, url: base + '/s?n' + i, codec: 'AAC', bitrate: 128, cc: cc || 'AR', place: town, clicks: 90 - i })); });
    handle('radio-top', () => [
      { name: 'La 100 - 99.9 FM', url: base + '/s' }, { name: 'Radio 10 AM 710', url: base + '/s' }, { name: 'Cadena 3', url: base + '/s' }]);
    handle('weather-find', () => []); handle('weather-now', () => null);
    handle('cd-names', () => names || null);
    handle('cd-cover', (e, rel) => { global.coversAsked = (global.coversAsked || []).concat(rel); return global.cdCover || ''; });   // 7.10.17
    // the drive: plays a disc straight through as Windows' CD audio does, reporting every 0.5 s (a pause says stopped)
    const D = global.drive = { disc: drive || null, tr: 0, st: 'stopped', t0: 0, pos: 0, slow: false, deaf: false, heard: [] };
    const send = m => BrowserWindow.getAllWindows()[0]?.webContents.send('cd', m);
    const at = () => D.st === 'playing' ? (Date.now() - D.t0) / 1000 : D.pos;
    const len = n => ((D.disc && D.disc.tracks || []).find(t => t.n === n) || {}).len || 0;
    clearInterval(global.driveTimer); let beat = 0;
    global.driveTimer = setInterval(() => {
      if (D.st !== 'playing') return;
      if (at() >= len(D.tr)) {
        const next = (D.disc.tracks || []).find(t => t.n > D.tr && t.audio);
        if (next) { D.tr = next.n; D.t0 = Date.now(); D.heard.push(D.tr + 'n'); }
        else { D.st = 'stopped'; D.pos = 0; D.heard.push('END'); send({ state: 'stopped', track: D.tr, pos: 0 }); return; }
      }
      if (++beat % 5 === 0) send({ state: 'playing', track: D.tr, pos: at() });
    }, 100);
    ipcMain.removeAllListeners('media-cmd');
    ipcMain.on('media-cmd', (e, c) => {
      global.cmds.push(c);
      // Windows' volume: 2 % a key, as the bridge reports it after the stereo's VOL keys
      // 7.10.11: the DV-90 sets it to a number, mutes it and reads it
      let mv;
      if ((mv = /^vol-(get|set (\d{1,3})|mute ([01]))$/.exec(c))) {
        const V = global.volume = global.volume || { vol: 50, mute: false };
        if (mv[2]) V.vol = Math.min(100, +mv[2]); if (mv[3]) V.mute = mv[3] === '1';
        clearTimeout(global.volTimer); global.volTimer = setTimeout(() => BrowserWindow.getAllWindows()[0]?.webContents.send('volume', { ...V }), 60);
        return;
      }
      if (/^(volup|voldown|mute)$/.test(c)) {
        const V = global.volume = global.volume || { vol: 50, mute: false };
        if (c === 'mute') V.mute = !V.mute; else { V.vol = Math.max(0, Math.min(100, V.vol + (c === 'volup' ? 2 : -2))); V.mute = false; }
        clearTimeout(global.volTimer); global.volTimer = setTimeout(() => BrowserWindow.getAllWindows()[0]?.webContents.send('volume', { ...V }), 60);
        return;
      }
      if (!/^cd-/.test(c)) return;
      let m;
      if (c === 'cd-info') { if (!D.deaf) setTimeout(() => send(D.disc || { drive: null }), 30); }   // deaf: a drive that doesn't answer
      else if ((m = /^cd-play (\d+)$/.exec(c))) {
        const was = D.tr; D.tr = +m[1]; D.t0 = Date.now(); D.st = 'playing'; D.heard.push(D.tr + 'j');
        if (D.slow) { setTimeout(() => send({ state: 'seeking', track: was || 1, pos: 0 }), 150); setTimeout(() => send({ state: 'playing', track: D.tr, pos: at() }), 700); }
        else setTimeout(() => send({ state: 'playing', track: D.tr, pos: at() }), 80);
      }
      // Windows' CD audio has no paused state: after "pause" it says "stopped", at the same place
      else if (c === 'cd-pause') { D.pos = at(); D.st = 'paused'; send({ state: 'stopped', track: D.tr, pos: D.pos }); }
      else if (c === 'cd-resume') { D.t0 = Date.now() - D.pos * 1000; D.st = 'playing'; send({ state: 'playing', track: D.tr, pos: D.pos }); }
      else if (c === 'cd-stop') { D.st = 'stopped'; D.pos = 0; D.heard.push('STOP'); send({ state: 'stopped', track: D.tr, pos: 0 }); }
      else if (c === 'cd-eject') { D.st = 'stopped'; send({ state: 'ejected' }); }
      else if (c === 'cd-close') send({ state: 'closed' });
    });
  }, { base, drive, names, size });
  const win = await app.firstWindow();
  // the window has the keyboard (on a CI display it sometimes starts without it, and key presses go nowhere)
  const focus = () => app.evaluate(({ BrowserWindow }) => { const w = BrowserWindow.getAllWindows()[0]; w && w.focus(); w && w.webContents.focus(); });
  const errs = [];
  win.on('pageerror', e => errs.push(e.message));
  win.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await win.waitForFunction(() => typeof tunerKey === 'function' && typeof cdUnitKey === 'function', null, { timeout: 20000 });
  await win.waitForTimeout(1500);
  if (!welcome) await win.evaluate(() => typeof showWelcome === 'function' && showWelcome(false));
  await focus();
  const noted = [];
  await win.exposeFunction('noteToast', t => noted.push(t));
  await win.evaluate(hide => {
    const o = toast; toast = (h, ms) => { window.noteToast(String(h).replace(/<[^>]+>/g, '')); return o(h, ms); };
    if (hide) { const s = document.createElement('style'); s.textContent = '#toast{display:none!important}'; document.head.append(s); }
  }, !toasts);
  // every saved station plays the pretend one (no internet), keeping its name and dial
  if (station) await win.evaluate(url => { for (const b of RADIO_BANDS) radioMem[b] = radioMem[b].map(s => s && Object.assign({}, s, { url })); }, base + '/s');
  return {
    app, win,
    cmds: () => app.evaluate(() => { const c = global.cmds; global.cmds = []; return c.filter(x => !/^(volup|voldown|vol-.*)$/.test(x)); }),
    vols: () => app.evaluate(() => global.cmds.filter(x => /^vol-/.test(x))),
    heard: () => app.evaluate(() => { const h = global.drive.heard; global.drive.heard = []; return h.join(' '); }),
    drive: patch => app.evaluate((_, p) => Object.assign(global.drive, p), patch),
    toasts: () => noted.splice(0),
    errors: () => errs.filter(e => !NOISE.test(e)),
    wait: ms => win.waitForTimeout(ms),
    /** clicks the middle of what the selector finds, as a person would */
    click: async (sel, wait = 700) => { const b = await win.locator(sel).boundingBox(); await win.mouse.click(b.x + b.width / 2, b.y + b.height / 2); await win.waitForTimeout(wait); },
    hold: async (sel, ms = 1200) => { const b = await win.locator(sel).boundingBox(); await win.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await win.mouse.down(); await win.waitForTimeout(ms); await win.mouse.up(); await win.waitForTimeout(600); },
    /** the drive says this, as the bridge would */
    driveSays: m => app.evaluate(({ BrowserWindow }, m) => BrowserWindow.getAllWindows()[0].webContents.send('cd', m), m),
    close: async () => { await app.close().catch(() => {}); fs.rmSync(profile, { recursive: true, force: true }); },
  };
}
