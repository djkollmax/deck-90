// Deck 90 as a program: the same page as src/index.html, but system audio comes straight
// from Windows (WASAPI loopback) without the browser's "share your screen" dialog, the window is
// frameless, and a small PowerShell bridge reads Windows' "now playing" sessions.
const { app, BrowserWindow, session, desktopCapturer, Menu, shell, ipcMain, screen, dialog, net, Tray, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { createMpris } = require('./mpris');
const { createRemote } = require('./remote');
const { createTrackLog } = require('./tracklog');
const { createUpdater, recoverOnStart } = require('./updater');
const crypto = require('crypto');

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
if (!app.requestSingleInstanceLock()) { app.quit(); process.exit(0); }
// An update that was cut off, or that didn't start: go back to the previous version before anything else.
if (app.isPackaged && recoverOnStart({ app, log: m => { try { fs.appendFileSync(path.join(app.getPath('userData'), 'media.log'), new Date().toISOString() + ' ' + m + '\n'); } catch (_) {} } })) {
  process.exit(0);
}

let win;
let remote = null;          // phone display server (off until the user turns it on)
// Started with Windows (--oculto): the window waits in the tray until it's wanted.
const START_HIDDEN = process.argv.includes('--oculto');
let tray = null;
// maximize() also shows a window, so a start in the tray that should come back maximized waits for showWin()
let pendingMax = false;
function showWin() {
  if (!win || win.isDestroyed()) return;
  if (win.isMinimized()) win.restore();
  if (pendingMax) { pendingMax = false; win.maximize(); }
  win.show(); win.focus();
}
// a file rewritten whole: to a temporary one first, so a crash or a power cut never leaves it half written
function writeAtomic(file, text) { const tmp = file + '.tmp'; fs.writeFileSync(tmp, text); fs.renameSync(tmp, file); }
// anything that slips through in the main process goes to the log instead of a dialog box
process.on('uncaughtException', err => { mlog('main: ' + String(err && err.stack || err).split('\n').slice(0, 3).join(' | ')); });
process.on('unhandledRejection', err => { mlog('main (promise): ' + String(err && err.stack || err).split('\n').slice(0, 3).join(' | ')); });
app.on('second-instance', () => showWin());

app.whenReady().then(() => {
  const ses = session.defaultSession;
  // "SISTEMA" → the whole screen as a (discarded) video source plus loopback audio: no picker.
  ses.setDisplayMediaRequestHandler((request, callback) => {
    desktopCapturer.getSources({ types: ['screen'] })
      .then(sources => {
        if (!sources.length) throw new Error('no screen');             // e.g. a disconnected remote desktop session
        callback({ video: sources[0], audio: 'loopback' });
      })
      .catch(e => { mlog('capture: ' + e.message); try { callback({}); } catch (_) {} });
  });
  // Capture and full screen only for our own local page.
  const ours = wc => !!wc && !!win && wc === win.webContents && wc.getURL().startsWith('file://');
  const ALLOWED = ['media', 'display-capture', 'fullscreen'];
  ses.setPermissionRequestHandler((wc, permission, cb) => cb(ALLOWED.includes(permission) && ours(wc)));
  ses.setPermissionCheckHandler((wc, permission) => ALLOWED.includes(permission) && ours(wc));

  // The normal window's size and place are remembered too (only if that place is still on a screen).
  const onScreenAt = b => b && Number.isFinite(b.x) && b.width >= 760 && b.height >= 600 && screen.getAllDisplays().some(d => { const a = d.workArea;
    return b.x < a.x + a.width - 80 && b.x + b.width > a.x + 80 && b.y >= a.y - 10 && b.y < a.y + a.height - 80; });
  // Mini mode: a small strip that stays on top of other windows. Its size and place are remembered.
  const STATE = path.join(app.getPath('userData'), 'window.json');
  let saved = {}; try { saved = JSON.parse(fs.readFileSync(STATE, 'utf8')); } catch (_) {}
  Menu.setApplicationMenu(null);
  // No Windows frame: the rack is the window. It still resizes from its edges and snaps (Win+arrows).
  win = new BrowserWindow({
    width: 1120, height: 900, useContentSize: true, minWidth: 760, minHeight: 600,
    ...(onScreenAt(saved.normal) ? { x: saved.normal.x, y: saved.normal.y, width: saved.normal.width, height: saved.normal.height, useContentSize: false } : {}),
    frame: false,
    title: 'Deck 90',
    icon: path.join(__dirname, '..', 'assets', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    backgroundColor: '#0c0f16',
    show: false,
    webPreferences: { backgroundThrottling: false, contextIsolation: true, sandbox: true,
                      preload: path.join(__dirname, 'preload.js') },
  });
  // Windows ignores minimize() while the window is full screen (F11, ⛶ or the page's own
  // fullscreen), so leave full screen first and minimize once that has happened.
  const leaveFullScreen = () => new Promise(resolve => {
    win.webContents.executeJavaScript('document.fullscreenElement && document.exitFullscreen()').catch(() => {});
    if (!win.isFullScreen()) return resolve();
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };
    win.once('leave-full-screen', () => setTimeout(finish, 60));
    win.setFullScreen(false);
    setTimeout(finish, 700);                     // fallback if the event never comes
  });
  let miniOn = false, miniBusy = false, normalBounds = null, wasMax = false;
  const clampMini = (b, wa) => b && ({ x: b.x, y: b.y, width: Math.min(b.width, 900, wa.width), height: Math.min(b.height, 300) });
  const onScreen = b => b && screen.getAllDisplays().some(d => { const a = d.workArea;
    return b.x < a.x + a.width - 40 && b.x + b.width > a.x + 40 && b.y >= a.y - 10 && b.y < a.y + a.height - 40; });
  const saveMini = () => { if (!win.isMaximized()) saved.mini = win.getBounds(); saveState(); };
  async function setMini(on) {
    if (on === miniOn || miniBusy) return;
    miniBusy = true;
    try {
      if (on) {
        if (win.isFullScreen()) await leaveFullScreen();
        wasMax = win.isMaximized();
        normalBounds = wasMax ? win.getNormalBounds() : win.getBounds();
        if (wasMax) win.unmaximize();
        const wa = screen.getDisplayMatching(normalBounds).workArea;
        win.setMinimumSize(300, 96);
        win.setMaximizable(false); win.setFullScreenable(false);
        win.setBounds(onScreen(saved.mini) ? clampMini(saved.mini, wa) : { width: 600, height: 132, x: wa.x + wa.width - 620, y: wa.y + 20 });
        win.setAlwaysOnTop(true, 'floating');
      } else {
        if (win.isMaximized()) win.unmaximize();
        saveMini();
        miniOn = false;            // before maximize(): on Windows its event fires right away, and the strip guard would undo it
        win.setAlwaysOnTop(false);
        win.setMaximizable(true); win.setFullScreenable(true);
        win.setMinimumSize(760, 600);
        if (normalBounds) win.setBounds(normalBounds);
        if (wasMax) win.maximize();
      }
      miniOn = on;
      win.webContents.send('mini', on);
    } finally { miniBusy = false; }
  }
  // ── Phone display ──
  function saveState() { try { writeAtomic(STATE, JSON.stringify(saved)); } catch (e) { mlog('window.json: ' + e.message); } }
  saved.remote = Object.assign({ on: false, port: 9090, key: '' }, saved.remote);
  if (!Number.isInteger(saved.remote.port) || saved.remote.port < 1024 || saved.remote.port > 65535) saved.remote.port = 9090;
  if (!/^[A-Za-z0-9_-]{8,}$/.test(saved.remote.key)) { saved.remote.key = crypto.randomBytes(6).toString('base64url'); saveState(); }
  const remoteState = () => remote ? remote.state() : { on: false, urls: [], clients: 0 };
  const pushRemote = extra => {
    if (win && !win.isDestroyed()) win.webContents.send('remote-state', Object.assign(remoteState(), extra || {}));
    if (typeof trayMenu === 'function') try { trayMenu(); } catch (_) {}
  };
  remote = createRemote({
    onCmd: mediaCommand, log: mlog, onClients: () => pushRemote(),
    getNowPlaying: () => lastInfo && phoneInfo(lastInfo),
  });
  // one change at a time: quick on/off clicks must end where the last one says
  let remoteQ = Promise.resolve();
  function setRemote(on) { remoteQ = remoteQ.then(() => applyRemote(on)).catch(e => mlog('phone: ' + e.message)); return remoteQ; }
  async function applyRemote(on) {
    if (on) {
      // 9090 first, then the next few if something else holds it (the QR shows whichever it got)
      let st = null;
      for (let p = saved.remote.port, tries = 0; tries < 6; p = p >= 9095 ? 9090 : p + 1, tries++) {
        st = await remote.start(p, saved.remote.key);
        if (!st.error) { saved.remote.port = p; break; }
        if (st.error !== 'EADDRINUSE' && st.error !== 'EACCES') break;   // EACCES: a port Windows reserved (Hyper-V, WSL, Docker)
      }
      if (st.error) { saveState(); pushRemote({ error: st.error, port: saved.remote.port }); return; }   // keeps the user's ON for next time
    } else remote.stop();
    saved.remote.on = !!on; saveState(); pushRemote();
  }
  // anyone who once scanned the QR keeps access: a new key cuts them all off (the QR shows the new one)
  function newPhoneKey() {
    saved.remote.key = crypto.randomBytes(6).toString('base64url'); saveState();
    mlog('phone: new key');
    if (saved.remote.on) { setRemote(false); setRemote(true); }
  }
  ipcMain.on('remote-set', (e, on) => { if (ours(e.sender)) setRemote(!!on); });
  ipcMain.on('remote-get', e => { if (ours(e.sender)) pushRemote(); });
  ipcMain.on('remote-frame', (e, f) => { if (remote && ours(e.sender)) remote.frame(f); });
  if (saved.remote.on) win.webContents.once('did-finish-load', () => setRemote(true));

  // ── Track history ──
  const trackLog = createTrackLog({ dir: app.getPath('userData'), log: mlog });
  ipcMain.on('tl-add', (e, entry) => { if (ours(e.sender)) trackLog.add(entry); });
  ipcMain.handle('tl-list', e => ours(e.sender) ? trackLog.list() : []);
  ipcMain.handle('tl-clear', e => ours(e.sender) ? trackLog.clear() : false);
  ipcMain.handle('tl-save-csv', async (e, text, name) => {
    if (!ours(e.sender) || typeof text !== 'string' || text.length > 20e6) return { error: 'datos no válidos' };
    const base = String(name || 'Deck 90 - historial.csv').replace(/[\\/:*?"<>|]/g, '-').slice(0, 120);
    const r = await dialog.showSaveDialog(win, { title: 'Exportar historial', defaultPath: path.join(app.getPath('documents'), base),
                                                 filters: [{ name: 'CSV para Excel', extensions: ['csv'] }] });
    if (r.canceled || !r.filePath) return { canceled: true };
    try { fs.writeFileSync(r.filePath, '\ufeff' + text, 'utf8'); return { ok: true, path: r.filePath }; }
    catch (err) { return { error: err.code === 'EBUSY' ? 'el archivo está abierto en Excel' : err.message }; }
  });

  // ── Updates: GitHub, a few seconds after start and every 6 hours ──
  const updater = createUpdater({ app, net, log: mlog,
    // after an update, come back visible (a start with Windows passes --oculto, which the restart would repeat)
    relaunchArgs: () => process.argv.slice(1).filter(a => a !== '--oculto'),
    onState: st => { if (win && !win.isDestroyed()) win.webContents.send('update', st); if (typeof trayMenu === 'function') try { trayMenu(); } catch (_) {} } });
  ipcMain.on('upd-get', e => { if (ours(e.sender)) e.sender.send('update', updater.state()); });
  ipcMain.on('upd-install', e => { if (ours(e.sender)) updater.install(); });
  ipcMain.on('upd-open', e => { if (ours(e.sender)) shell.openExternal(updater.url()); });
  win.webContents.once('did-finish-load', () => {
    updater.confirmBoot();
    setTimeout(() => updater.maybeCheck(60 * 1000), 8000);
    setInterval(() => updater.check(), 3600 * 1000);                  // hourly: Deck 90 often lives in the tray for days
    win.on('show', () => updater.maybeCheck(30 * 60 * 1000));         // and when it comes back from there
  });

  // The strip never maximizes (a double-click on its title bar, Win+Up, Super+Up …)
  win.on('maximize', () => { if (miniOn) win.unmaximize(); });
  // remember the normal window (not the mini strip, not full screen) a moment after it moves or resizes
  let normT = 0;
  const saveNormal = () => {
    if (miniOn || win.isDestroyed() || win.isFullScreen() || win.isMinimized()) return;
    saved.normal = win.isMaximized() ? Object.assign({}, saved.normal || {}, win.getNormalBounds()) : win.getBounds();
    saved.maximized = win.isMaximized();
    saveState();
  };
  ['resize', 'move', 'maximize', 'unmaximize'].forEach(ev => win.on(ev, () => { clearTimeout(normT); normT = setTimeout(saveNormal, 500); }));
  win.on('close', e => {
    if (miniOn) saveMini(); else saveNormal();
    // ✕ leaves Deck 90 in the tray (measuring, phone display on) unless the user turned that off
    if (tray && saved.tray.close && !app.isQuitting) {
      e.preventDefault(); win.hide();
      if (!saved.tray.told && process.platform === 'win32') {
        saved.tray.told = true; saveState();
        try { tray.displayBalloon({ iconType: 'info', title: 'Deck 90 sigue acá', content: 'Sigue midiendo en la bandeja, junto al reloj. Para cerrarlo del todo: clic derecho → Salir.' }); } catch (_) {}
      }
    }
  });
  // Windows is ending the session: let the window close (not on the query: the user may still cancel)
  win.on('session-end', () => { app.isQuitting = true; trackLog.flush(); });
  app.on('will-quit', () => trackLog.flush());               // after the page's last entry (sent as it closes)
  // The window appears once the page says it's listening (its meters live, not the empty rack waiting for a
  // source); if that takes long, it appears anyway.
  let shownOnce = false;
  const firstShow = () => {
    if (shownOnce || win.isDestroyed()) return; shownOnce = true;
    const hidden = START_HIDDEN && tray;
    if (saved.maximized && !miniOn) { if (hidden) pendingMax = true; else win.maximize(); }
    if (!hidden) win.show();
  };
  // if the first paint never comes, show the window anyway instead of leaving an invisible program
  win.once('ready-to-show', () => setTimeout(firstShow, 2500));
  setTimeout(firstShow, 5000);                                 // even if the first paint never comes

  // ── Tray: an icon by the clock, with the essentials ──
  // ✕ to the tray by default only on Windows: many Linux desktops show no tray icon, and then a hidden
  // window could never come back.
  saved.tray = Object.assign({ close: process.platform === 'win32', told: false }, saved.tray);
  // "Arrancar con Windows": a fixed name, and the entry follows the program if its folder moves
  const LOGIN = { args: ['--oculto'], name: 'Deck 90' };
  const canLogin = process.platform === 'win32' && app.isPackaged;
  const loginOn = () => canLogin && !!saved.login;
  // re-made only if the entry is gone (the folder moved): one turned off in the Task Manager stays off
  if (canLogin && saved.login) {
    try { if (!app.getLoginItemSettings({ path: process.execPath, args: LOGIN.args }).openAtLogin) app.setLoginItemSettings({ openAtLogin: true, path: process.execPath, ...LOGIN }); } catch (_) {}
  }
  function trayMenu() {
    if (!tray) return;
    const st = remoteState();
    const items = [
      { label: win.isVisible() ? 'Esconder Deck 90' : 'Mostrar Deck 90', click: () => { win.isVisible() ? win.hide() : showWin(); trayMenu(); } },
      { label: 'Modo mini', type: 'checkbox', checked: miniOn, click: () => { showWin(); setMini(!miniOn); } },
      { type: 'separator' },
      { label: 'Pantalla en el celular', type: 'checkbox', checked: !!st.on, click: () => setRemote(!st.on) },
      ...(st.on ? [{ label: 'Nueva clave para el celular', click: newPhoneKey }] : []),
      { type: 'separator' },
    ];
    if (canLogin) items.push({ label: 'Arrancar con Windows', type: 'checkbox', checked: loginOn(),
      click: m => { saved.login = m.checked; saveState(); try { app.setLoginItemSettings({ openAtLogin: m.checked, path: process.execPath, ...LOGIN }); } catch (_) {} trayMenu(); } });
    items.push({ label: 'Al cerrar, quedar en la bandeja', type: 'checkbox', checked: saved.tray.close, click: m => { saved.tray.close = m.checked; saveState(); } });
    const up = updater.state();
    items.push({ type: 'separator' },
      up.state === 'available' && up.auto
        ? { label: 'Instalar Deck 90 ' + up.version, click: () => { showWin(); updater.install(); } }
        : { label: 'Buscar actualizaciones', click: () => { updater.check(true); showWin(); } },
      { label: 'Salir', click: () => { app.isQuitting = true; app.quit(); } });
    tray.setContextMenu(Menu.buildFromTemplate(items));
    tray.setToolTip('Deck 90' + (st.on ? ' · celular ' + (st.clients ? 'conectado' : 'esperando') : ''));
  }
  try {
    const ico = path.join(__dirname, '..', 'assets', process.platform === 'win32' ? 'icon.ico' : 'icon.png');
    if (process.platform === 'win32') tray = new Tray(ico);                 // the .ico carries every size: sharp at any scaling
    else { const img = nativeImage.createFromPath(ico); tray = new Tray(img.isEmpty() ? img : img.resize({ width: 22, height: 22 })); }
    tray.on('click', () => { win.isVisible() && !win.isMinimized() ? win.hide() : showWin(); trayMenu(); });
    win.on('show', trayMenu); win.on('hide', trayMenu);
    trayMenu();
  } catch (e) { mlog('tray: ' + e.message); tray = null; }
  ipcMain.on('win', async (e, what) => {
    if (!ours(e.sender)) return;
    if (what === 'ready') return firstShow();
    if (what === 'mini') return setMini(!miniOn);
    if (what === 'min') { await leaveFullScreen(); win.minimize(); }
    else if (what === 'max') {
      if (win.isFullScreen()) await leaveFullScreen();
      else win.isMaximized() ? win.unmaximize() : win.maximize();
    }
    else if (what === 'fs') { if (miniOn) return; if (win.isFullScreen()) await leaveFullScreen(); else win.setFullScreen(true); }
    else if (what === 'close') win.close();
    else if (what === 'quit') { app.isQuitting = true; app.quit(); }       // Shift+✕: close for real, tray or not
  });
  // The page died (GPU driver, out of memory) after days in the tray: load it again, a few times an hour at most.
  let reloads = [];
  win.webContents.on('render-process-gone', (e, d) => {
    mlog('page gone: ' + d.reason + ' (' + d.exitCode + ')');
    if (d.reason === 'clean-exit' || app.isQuitting) return;
    const now = Date.now(); reloads = reloads.filter(t => now - t < 3600e3);
    if (reloads.length >= 5) { mlog('page gone too often: not reloading'); return; }
    reloads.push(now);
    setTimeout(() => { if (!win.isDestroyed()) win.webContents.reload(); }, 2000 * reloads.length);
  });
  win.on('unresponsive', () => mlog('page not responding'));
  win.on('responsive', () => mlog('page responding again'));
  // Release check (DECK90_SMOKE=1): start, load the page, see that its scripts ran, report and quit.
  if (process.env.DECK90_SMOKE) {
    const pageErrors = [];
    // Electron 35+ puts level ('error'…) and message on the event; older ones passed them as arguments
    win.webContents.on('console-message', (e, ...old) => {
      const level = e && e.level !== undefined ? e.level : old[0], message = e && e.message !== undefined ? e.message : old[1];
      if (level === 'error' || level >= 3) pageErrors.push(message);
    });
    win.webContents.once('did-finish-load', () => setTimeout(async () => {
      let ok = false;
      try { ok = await win.webContents.executeJavaScript("typeof frame === 'function' && typeof applyPreset === 'function' && typeof historyCsv === 'function' && !!document.getElementById('mSpot')"); } catch (_) {}
      const line = 'DECK90_SMOKE ' + (ok && !pageErrors.length ? 'ok' : 'FAIL') + ' ' + app.getVersion() + ' electron ' + process.versions.electron + (pageErrors.length ? ' errors: ' + pageErrors.join(' | ') : '');
      console.log(line);
      // Windows doesn't always hand a windowed program's console output to the caller: write it to a file too
      if (process.env.DECK90_SMOKE_OUT) { try { fs.writeFileSync(process.env.DECK90_SMOKE_OUT, line + '\n'); } catch (_) {} }
      app.isQuitting = true; app.exit(ok && !pageErrors.length ? 0 : 1);
    }, 4000));
  }
  // The bridge can report the track before the page is listening: hand it over once the page is up.
  win.webContents.on('did-finish-load', () => { if (lastInfo) win.webContents.send('media', lastInfo); });
  win.loadFile(path.join(__dirname, '..', 'src', 'index.html'));
  // Links open in the real browser (https only); dropping a file or link on the window must not replace the rack.
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https:\/\//i.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', e => e.preventDefault());
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') { if (!miniOn) win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    if (input.type === 'keyDown' && input.key === 'Escape' && win.isFullScreen()) { win.setFullScreen(false); e.preventDefault(); }
  });
});

// ── "now playing" bridge: a hidden PowerShell process reading Windows' media sessions ──
let media = null, mediaRestarts = 0, mediaBuf = '', lastStatus = '', mediaSeen = 0, mediaUp = 0;
let LOG = null;   // %APPDATA%\\Deck 90\\media.log once the app is ready
let lastLog = '', logRepeats = 0, logBytes = 0;
function mlog(msg) {
  if (!LOG) return;
  if (msg === lastLog) { logRepeats++; return; }               // a stuck error repeats every 400 ms: log it once
  let out = '';
  if (logRepeats) out += new Date().toISOString() + ' (previous line repeated ' + logRepeats + ' times)\n';
  lastLog = msg; logRepeats = 0;
  out += new Date().toISOString() + ' ' + msg + '\n';
  // past 1 MB the log moves to media.1.log and starts again (two files at most)
  if ((logBytes += out.length) > 1000000) { try { fs.renameSync(LOG, LOG.replace(/\.log$/, '.1.log')); } catch (_) {} logBytes = out.length; }
  try { fs.appendFileSync(LOG, out); } catch (_) {}
}
function openLog() {
  if (LOG) return;
  LOG = path.join(app.getPath('userData'), 'media.log');
  try { logBytes = fs.statSync(LOG).size; } catch (_) { logBytes = 0; }
}
let mpris = null;
let lastInfo = null;          // the newest track info (with its cover), resent when the page (re)loads
// Browsers report the tab's title: "(3) Artist - Song (Official Video) - YouTube". Keep the song: no unread
// count, no site name, no video tags, the artist (the channel) not repeated in the title.
const BROWSER = /chrome|msedge|edge|firefox|opera|brave|vivaldi|308046B0AF4A39CB|^arc$/i;
const VIDEO_TAG = /\s*[\(\[](?:official\s*)?(?:music\s*)?(?:video|audio|visualizer|lyric(?:s)?(?:\s*video)?|video\s*oficial|audio\s*oficial|videoclip|clip\s*oficial|hd|hq|4k)(?:\s*oficial)?[\)\]]/gi;
function cleanInfo(info) {
  if (!info || info.none || info.ready || !BROWSER.test(info.app || '')) return info;
  const o = Object.assign({}, info);
  let t = String(o.title || ''), a = String(o.artist || '');
  t = t.replace(/^\(\d+\+?\)\s*/, '').replace(/\s*[-–|·]\s*(YouTube(?: Music)?|Spotify|SoundCloud|Deezer|Tidal|Apple Music)\s*$/i, '');
  t = t.replace(VIDEO_TAG, '').trim();
  a = a.replace(/\s*-\s*Topic$/i, '').replace(/VEVO$/i, '').trim();
  // "Artist - Song" with the artist (the channel) known: drop it from the title
  const m = /^(.+?)\s+[-–]\s+(.+)$/.exec(t);
  const key = x => x.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '');
  if (m && a && key(m[1]) === key(a)) { a = m[1]; t = m[2]; }       // the title's spelling ("Gustavo Cerati", not "GustavoCerati")
  else if (m && !a) { a = m[1]; t = m[2]; }
  o.title = t || info.title; o.artist = a;
  return o;
}
function sendMedia(info) {
  info = cleanInfo(info);
  const st = info.none ? 'none' : (info.app || '?') + ' · ' + (info.status || '?') + ' · ' + (info.title || '');
  if (!info.ready && st !== lastStatus) { mlog('player: ' + st); lastStatus = st; }
  if (!info.ready) lastInfo = info.none ? null : Object.assign({}, lastInfo && !info.cover && lastInfo.title === info.title ? { cover: lastInfo.cover } : {}, info);
  if (win && !win.isDestroyed()) win.webContents.send('media', info);
  if (remote && !info.ready) remote.nowPlaying(phoneInfo(info));
}
function phoneInfo(info) {
  const o = Object.assign({}, info);
  if (o.cover && !/^(data:image\/|https:)/.test(o.cover)) delete o.cover;   // a file:// cover means nothing to the phone
  return o;
}
function startMedia() {
  openLog();
  if (process.platform === 'linux') {            // Linux: MPRIS over D-Bus
    mpris = createMpris(sendMedia, mlog);
    mpris.start();
    mlog('mpris bridge started');
    return;
  }
  if (process.platform !== 'win32') return;
  mediaBuf = '';
  mediaSeen = Date.now();
  media = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, 'media.ps1')],
                { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
  media.on('error', e => { mlog('bridge error: ' + e.message); });   // e.g. powershell.exe missing or blocked
  media.stdin.on('error', () => {});                                    // writing to a bridge that is exiting
  mlog('bridge started pid ' + media.pid);
  media.stdout.setEncoding('utf8');
  media.stdout.on('data', chunk => {
    mediaBuf += chunk;
    let i;
    while ((i = mediaBuf.indexOf('\n')) >= 0) {
      const line = mediaBuf.slice(0, i).trim(); mediaBuf = mediaBuf.slice(i + 1);
      if (!line) continue;
      try {
        const info = JSON.parse(line);
        mediaSeen = Date.now();
        if (info.hb) continue;                                  // heartbeat: the bridge is alive
        if (info.ready) { mlog('bridge ready'); mediaUp = Date.now(); }
        sendMedia(info);
      } catch (e) { mlog('bad line: ' + line.slice(0, 200)); }
    }
  });
  media.stderr.setEncoding('utf8');
  media.stderr.on('data', d => mlog('ps: ' + String(d).trim().slice(0, 500)));
  const me = media;
  media.on('exit', code => {
    mlog('bridge exit ' + code);
    if (media === me) media = null;
    if (app.isQuitting) return;
    // start again, waiting longer after each quick failure (3 s … 5 min); a bridge that ran a good while starts over
    if (mediaUp && Date.now() - mediaUp > 120000) mediaRestarts = 0;
    mediaUp = 0;
    setTimeout(startMedia, Math.min(300000, 3000 * Math.pow(2, mediaRestarts++)));
  });
}
// The bridge says something at least every 5 s; one silent for 30 s is stuck: start it again.
setInterval(() => {
  if (media && Date.now() - mediaSeen > 30000) { mlog('bridge silent for 30 s: restarting it'); mediaSeen = Date.now(); try { media.kill(); } catch (_) {} }
}, 10000).unref();
const fromWin = e => !!win && !win.isDestroyed() && e.sender === win.webContents;
ipcMain.on('app-log', (e, msg) => { if (fromWin(e)) mlog('page: ' + String(msg).slice(0, 800)); });
function mediaCommand(cmd) {
  if (media && media.stdin.writable && ['toggle', 'play', 'pause', 'stop', 'next', 'prev'].includes(cmd)) media.stdin.write(cmd + '\n');
  if (mpris) mpris.command(cmd);
}
ipcMain.on('media-cmd', (e, cmd) => { if (fromWin(e)) mediaCommand(cmd); });

// ── The weather in the header display ──
// From Open-Meteo (free, no key; data under CC BY 4.0): a place looked up once by the name typed in the drawer,
// then its weather now and today's high and low, every 15 minutes. Only numbers go back to the page.
let weatherErr = '';
async function getJson(url) {
  const ac = new AbortController(), t = setTimeout(() => ac.abort(), 15000);
  try {
    const r = await net.fetch(url, { signal: ac.signal, headers: { 'User-Agent': 'Deck90/' + app.getVersion() } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}
const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : null);
function weatherFail(what, err) {
  const m = what + ': ' + (err && err.message || err);
  if (m !== weatherErr) { weatherErr = m; mlog('weather ' + m); }             // once, not every 15 minutes
}
ipcMain.handle('weather-find', async (e, q) => {
  if (!fromWin(e)) return null;
  const name = String(q || '').trim().slice(0, 80);
  if (!name) return [];
  try {
    const j = await getJson('https://geocoding-api.open-meteo.com/v1/search?count=5&language=es&format=json&name=' + encodeURIComponent(name));
    return (Array.isArray(j.results) ? j.results : []).slice(0, 5)
      .map(p => ({ name: String(p.name || '').slice(0, 60), area: [p.admin1, p.country].filter(x => typeof x === 'string').join(', ').slice(0, 80), lat: num(p.latitude), lon: num(p.longitude) }))
      .filter(p => p.name && p.lat !== null && p.lon !== null);
  } catch (err) { weatherFail('find', err); return null; }
});
ipcMain.handle('weather-now', async (e, lat, lon) => {
  if (!fromWin(e)) return null;
  lat = Number(lat); lon = Number(lon);
  if (!(Math.abs(lat) <= 90 && Math.abs(lon) <= 180)) return null;
  try {
    const j = await getJson('https://api.open-meteo.com/v1/forecast?latitude=' + lat.toFixed(4) + '&longitude=' + lon.toFixed(4) +
      '&current=temperature_2m,weather_code,is_day&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1');
    const c = j.current || {}, d = j.daily || {}, first = a => (Array.isArray(a) ? num(a[0]) : null);
    const out = { temp: num(c.temperature_2m), code: num(c.weather_code), day: c.is_day === 0 ? 0 : 1, max: first(d.temperature_2m_max), min: first(d.temperature_2m_min) };
    if (out.temp === null) throw new Error('no temperature in the answer');
    weatherErr = '';
    return out;
  } catch (err) { weatherFail('now', err); return null; }
});
app.whenReady().then(startMedia);

// ── Spotless' own volume and levelling ──
// Deck 90 measures what comes out of the player, after its volume slider. Spotless keeps its settings in
// %APPDATA%\spotless\settings.json (~/.config/spotless on Linux); its volume goes through librespot's
// cubic curve, (0.9·v + 0.1)³, so 71 % is −7.9 dB. The page uses this to estimate the master's loudness.
let spotlessLast = '';
function spotlessState() {
  const file = path.join(app.getPath('appData'), 'spotless', 'settings.json');
  let s = null;
  try {
    const j = JSON.parse(fs.readFileSync(file, 'utf8'));
    const v = Number(j.volume);
    if (Number.isFinite(v) && v >= 0 && v <= 100) {
      const lin = Math.floor(v * 65535 / 100) / 65535;         // as Spotless hands it to librespot
      const gain = v >= 100 ? 0 : v <= 0 ? -Infinity : 60 * Math.log10(0.9 * lin + 0.1);
      // Spotless 1.2's equaliser: on and not flat, it changes the level by frequency, which can't be taken back out
      const eq = j.equaliser && typeof j.equaliser === 'object' ? j.equaliser : null;
      const eqOn = !!(eq && eq.on && (Number(eq.preamp) || (Array.isArray(eq.bands) && eq.bands.some(b => Number(b)))));
      s = { volume: v, levelling: !!j.levelling, eq: eqOn, gainDb: Number.isFinite(gain) ? Math.round(gain * 100) / 100 : null };
    }
  } catch (_) {}
  const key = JSON.stringify(s);
  if (key !== spotlessLast) {
    spotlessLast = key;
    if (s) mlog('spotless: volume ' + s.volume + ' % (' + s.gainDb + ' dB), levelling ' + (s.levelling ? 'on' : 'off') + ', equaliser ' + (s.eq ? 'on' : 'off'));
    if (win && !win.isDestroyed()) win.webContents.send('spotless', s);
  }
}
app.whenReady().then(() => {
  setInterval(spotlessState, 3000);                          // the user may move the slider while it plays
  if (win) win.webContents.on('did-finish-load', () => { spotlessLast = ''; spotlessState(); });
});
app.on('before-quit', () => { app.isQuitting = true; if (remote) remote.stop(); if (mpris) mpris.stop(); if (media) { try { media.stdin.end(); media.kill(); } catch (_) {} } });

app.on('window-all-closed', () => app.quit());
