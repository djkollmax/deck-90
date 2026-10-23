// Deck 90 as a program: the same page as src/index.html, but system audio comes straight
// from Windows (WASAPI loopback) without the browser's "share your screen" dialog, the window is
// frameless, and a small PowerShell bridge reads Windows' "now playing" sessions.
const { app, BrowserWindow, session, desktopCapturer, Menu, shell, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { createMpris } = require('./mpris');
const { createRemote } = require('./remote');
const crypto = require('crypto');

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
if (!app.requestSingleInstanceLock()) { app.quit(); process.exit(0); }

let win;
let remote = null;          // phone display server (off until the user turns it on)
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });

app.whenReady().then(() => {
  const ses = session.defaultSession;
  // "SISTEMA" → the whole screen as a (discarded) video source plus loopback audio: no picker.
  ses.setDisplayMediaRequestHandler((request, callback) => {
    desktopCapturer.getSources({ types: ['screen'] })
      .then(sources => callback({ video: sources[0], audio: 'loopback' }))
      .catch(() => callback({}));
  });
  // Capture and full screen only for our own local page.
  const ours = wc => !!wc && !!win && wc === win.webContents && wc.getURL().startsWith('file://');
  const ALLOWED = ['media', 'display-capture', 'fullscreen'];
  ses.setPermissionRequestHandler((wc, permission, cb) => cb(ALLOWED.includes(permission) && ours(wc)));
  ses.setPermissionCheckHandler((wc, permission) => ALLOWED.includes(permission) && ours(wc));

  Menu.setApplicationMenu(null);
  // No Windows frame: the rack is the window. It still resizes from its edges and snaps (Win+arrows).
  win = new BrowserWindow({
    width: 1120, height: 900, useContentSize: true, minWidth: 760, minHeight: 600,
    frame: false,
    title: 'Deck 90',
    icon: path.join(__dirname, '..', 'assets', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    backgroundColor: '#0c0f16',
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
  // Mini mode: a small strip that stays on top of other windows. Its size and place are remembered.
  const STATE = path.join(app.getPath('userData'), 'window.json');
  let saved = {}; try { saved = JSON.parse(fs.readFileSync(STATE, 'utf8')); } catch (_) {}
  let miniOn = false, miniBusy = false, normalBounds = null, wasMax = false;
  const clampMini = (b, wa) => b && ({ x: b.x, y: b.y, width: Math.min(b.width, 900, wa.width), height: Math.min(b.height, 300) });
  const onScreen = b => b && screen.getAllDisplays().some(d => { const a = d.workArea;
    return b.x < a.x + a.width - 40 && b.x + b.width > a.x + 40 && b.y >= a.y - 10 && b.y < a.y + a.height - 40; });
  const saveMini = () => { if (!win.isMaximized()) saved.mini = win.getBounds(); try { fs.writeFileSync(STATE, JSON.stringify(saved)); } catch (_) {} };
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
  const saveState = () => { try { fs.writeFileSync(STATE, JSON.stringify(saved)); } catch (_) {} };
  saved.remote = Object.assign({ on: false, port: 9090, key: '' }, saved.remote);
  if (!/^[A-Za-z0-9_-]{8,}$/.test(saved.remote.key)) { saved.remote.key = crypto.randomBytes(6).toString('base64url'); saveState(); }
  const remoteState = () => remote ? remote.state() : { on: false, urls: [], clients: 0 };
  const pushRemote = extra => { if (win && !win.isDestroyed()) win.webContents.send('remote-state', Object.assign(remoteState(), extra || {})); };
  remote = createRemote({
    onCmd: mediaCommand, log: mlog, onClients: () => pushRemote(),
    getNowPlaying: () => lastInfo && phoneInfo(lastInfo),
  });
  async function setRemote(on) {
    if (on) {
      const st = await remote.start(saved.remote.port, saved.remote.key);
      if (st.error) { saved.remote.on = false; saveState(); pushRemote({ error: st.error }); return; }
    } else remote.stop();
    saved.remote.on = !!on; saveState(); pushRemote();
  }
  ipcMain.on('remote-set', (e, on) => setRemote(!!on));
  ipcMain.on('remote-get', () => pushRemote());
  ipcMain.on('remote-frame', (e, f) => { if (remote) remote.frame(f); });
  if (saved.remote.on) win.webContents.once('did-finish-load', () => setRemote(true));

  // The strip never maximizes (a double-click on its title bar, Win+Up, Super+Up …)
  win.on('maximize', () => { if (miniOn) win.unmaximize(); });
  win.on('close', () => { if (miniOn) saveMini(); });
  ipcMain.on('win', async (e, what) => {
    if (what === 'mini') return setMini(!miniOn);
    if (what === 'min') { await leaveFullScreen(); win.minimize(); }
    else if (what === 'max') {
      if (win.isFullScreen()) await leaveFullScreen();
      else win.isMaximized() ? win.unmaximize() : win.maximize();
    }
    else if (what === 'fs') { if (miniOn) return; if (win.isFullScreen()) await leaveFullScreen(); else win.setFullScreen(true); }
    else if (what === 'close') win.close();
  });
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
let media = null, mediaRestarts = 0, mediaBuf = '', lastStatus = '';
let LOG = null;   // %APPDATA%\\Deck 90\\media.log once the app is ready
let lastLog = '', logRepeats = 0, logBytes = 0;
function mlog(msg) {
  if (!LOG) return;
  if (msg === lastLog) { logRepeats++; return; }               // a stuck error repeats every 400 ms: log it once
  let out = '';
  if (logRepeats) out += new Date().toISOString() + ' (previous line repeated ' + logRepeats + ' times)\n';
  lastLog = msg; logRepeats = 0;
  out += new Date().toISOString() + ' ' + msg + '\n';
  if ((logBytes += out.length) > 1000000) return;              // never let one session fill the disk
  try { fs.appendFileSync(LOG, out); } catch (_) {}
}
let mpris = null;
let lastInfo = null;          // the newest track info (with its cover), resent when the page (re)loads
function sendMedia(info) {
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
  LOG = path.join(app.getPath('userData'), 'media.log');
  try { if (fs.existsSync(LOG) && fs.statSync(LOG).size > 200000) fs.unlinkSync(LOG); } catch (_) {}
  if (process.platform === 'linux') {            // Linux: MPRIS over D-Bus
    mpris = createMpris(sendMedia, mlog);
    mpris.start();
    mlog('mpris bridge started');
    return;
  }
  if (process.platform !== 'win32') return;
  mediaBuf = '';
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
        if (info.ready) { mlog('bridge ready'); mediaRestarts = 0; }
        sendMedia(info);
      } catch (e) { mlog('bad line: ' + line.slice(0, 200)); }
    }
  });
  media.stderr.setEncoding('utf8');
  media.stderr.on('data', d => mlog('ps: ' + String(d).trim().slice(0, 500)));
  media.on('exit', code => {
    mlog('bridge exit ' + code);
    media = null;
    if (!app.isQuitting && mediaRestarts++ < 5) setTimeout(startMedia, 3000);
  });
}
ipcMain.on('app-log', (e, msg) => mlog('page: ' + msg));
function mediaCommand(cmd) {
  if (media && media.stdin.writable && ['toggle', 'play', 'pause', 'stop', 'next', 'prev'].includes(cmd)) media.stdin.write(cmd + '\n');
  if (mpris) mpris.command(cmd);
}
ipcMain.on('media-cmd', (e, cmd) => mediaCommand(cmd));
app.whenReady().then(startMedia);
app.on('before-quit', () => { app.isQuitting = true; if (remote) remote.stop(); if (mpris) mpris.stop(); if (media) { try { media.stdin.end(); media.kill(); } catch (_) {} } });

app.on('window-all-closed', () => app.quit());
