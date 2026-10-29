// Window buttons for the frameless rack (minimise / maximise / close).
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('nowPlaying', {
  on:  cb => ipcRenderer.on('media', (e, info) => cb(info)),
  cmd: c  => ipcRenderer.send('media-cmd', c),
  // Spotless' volume and levelling, read from its settings ({ volume, levelling, gainDb } or null)
  onPlayer: cb => ipcRenderer.on('spotless', (e, s) => cb(s)),
});
contextBridge.exposeInMainWorld('winCtl', {
  min:   () => ipcRenderer.send('win', 'min'),
  max:   () => ipcRenderer.send('win', 'max'),
  close: () => ipcRenderer.send('win', 'close'),
  fs:    () => ipcRenderer.send('win', 'fs'),
  mini:  () => ipcRenderer.send('win', 'mini'),
  quit:  () => ipcRenderer.send('win', 'quit'),
  ready: () => ipcRenderer.send('win', 'ready'),
  onMini: cb => ipcRenderer.on('mini', (e, on) => cb(!!on)),
  onShown: cb => ipcRenderer.on('shown', (e, on) => cb(!!on)),   // false in the tray or minimized: no drawing then
});
contextBridge.exposeInMainWorld('phoneDisplay', {
  set:   on => ipcRenderer.send('remote-set', !!on),
  get:   () => ipcRenderer.send('remote-get'),
  frame: f  => ipcRenderer.send('remote-frame', f),
  on:    cb => ipcRenderer.on('remote-state', (e, st) => cb(st)),
});
contextBridge.exposeInMainWorld('trackLog', {
  add:     e => ipcRenderer.send('tl-add', e),
  list:    () => ipcRenderer.invoke('tl-list'),
  clear:   () => ipcRenderer.invoke('tl-clear'),
  saveCsv: (text, name) => ipcRenderer.invoke('tl-save-csv', String(text), String(name)),
});
contextBridge.exposeInMainWorld('appUpdate', {
  on:      cb => ipcRenderer.on('update', (e, st) => cb(st)),
  get:     () => ipcRenderer.send('upd-get'),
  install: () => ipcRenderer.send('upd-install'),
  open:    () => ipcRenderer.send('upd-open'),
  check:   () => ipcRenderer.send('upd-check'),
});
// the tray's "Acerca de Deck 90" opens the about window
contextBridge.exposeInMainWorld('appAbout', {
  onOpen: cb => ipcRenderer.on('about', () => cb()),
  info:   () => ipcRenderer.invoke('about-info'),            // { version, notes }
});
// the weather for the header display: find a place by name, and its weather now
contextBridge.exposeInMainWorld('weather', {
  find: q => ipcRenderer.invoke('weather-find', String(q).slice(0, 80)),
  now:  (lat, lon) => ipcRenderer.invoke('weather-now', Number(lat), Number(lon)),
});
contextBridge.exposeInMainWorld('appLog', msg => ipcRenderer.send('app-log', String(msg).slice(0, 800)));
