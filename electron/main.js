// Deck 90 as a program: the same page as src/index.html, but system audio comes straight
// from Windows (WASAPI loopback) without the browser's "share your screen" dialog, the window is
// frameless, and a small PowerShell bridge reads Windows' "now playing" sessions.
const { app, BrowserWindow, session, desktopCapturer, Menu, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { createMpris } = require('./mpris');

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
if (!app.requestSingleInstanceLock()) { app.quit(); }

let win;
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });

app.whenReady().then(() => {
  const ses = session.defaultSession;
  // "SISTEMA" → the whole screen as a (discarded) video source plus loopback audio: no picker.
  ses.setDisplayMediaRequestHandler((request, callback) => {
    desktopCapturer.getSources({ types: ['screen'] })
      .then(sources => callback({ video: sources[0], audio: 'loopback' }))
      .catch(() => callback({}));
  });
  ses.setPermissionRequestHandler((wc, permission, cb) => cb(['media', 'display-capture', 'fullscreen'].includes(permission)));
  ses.setPermissionCheckHandler((wc, permission) => ['media', 'display-capture', 'fullscreen'].includes(permission));

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
  ipcMain.on('win', async (e, what) => {
    if (what === 'min') { await leaveFullScreen(); win.minimize(); }
    else if (what === 'max') {
      if (win.isFullScreen()) await leaveFullScreen();
      else win.isMaximized() ? win.unmaximize() : win.maximize();
    }
    else if (what === 'fs') { if (win.isFullScreen()) await leaveFullScreen(); else win.setFullScreen(true); }
    else if (what === 'close') win.close();
  });
  win.loadFile(path.join(__dirname, '..', 'src', 'index.html'));
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    if (input.type === 'keyDown' && input.key === 'Escape' && win.isFullScreen()) { win.setFullScreen(false); }
  });
});

// ── "now playing" bridge: a hidden PowerShell process reading Windows' media sessions ──
let media = null, mediaRestarts = 0, mediaBuf = '', lastStatus = '';
let LOG = null;   // %APPDATA%\\Deck 90\\media.log once the app is ready
function mlog(msg) { if (!LOG) return; try { fs.appendFileSync(LOG, new Date().toISOString() + ' ' + msg + '\n'); } catch (_) {} }
let mpris = null;
function sendMedia(info) {
  const st = info.none ? 'none' : (info.app || '?') + ' · ' + (info.status || '?') + ' · ' + (info.title || '');
  if (!info.ready && st !== lastStatus) { mlog('player: ' + st); lastStatus = st; }
  if (win && !win.isDestroyed()) win.webContents.send('media', info);
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
  media = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, 'media.ps1')],
                { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
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
        if (info.ready) mlog('bridge ready');
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
ipcMain.on('media-cmd', (e, cmd) => {
  if (media && ['toggle', 'play', 'pause', 'stop', 'next', 'prev'].includes(cmd)) media.stdin.write(cmd + '\n');
  if (mpris) mpris.command(cmd);
});
app.whenReady().then(startMedia);
app.on('before-quit', () => { app.isQuitting = true; if (mpris) mpris.stop(); if (media) { try { media.stdin.end(); media.kill(); } catch (_) {} } });

app.on('window-all-closed', () => app.quit());
