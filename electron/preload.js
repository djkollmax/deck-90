// Window buttons for the frameless rack (minimise / maximise / close).
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('nowPlaying', {
  on:  cb => ipcRenderer.on('media', (e, info) => cb(info)),
  cmd: c  => ipcRenderer.send('media-cmd', c),
});
contextBridge.exposeInMainWorld('winCtl', {
  min:   () => ipcRenderer.send('win', 'min'),
  max:   () => ipcRenderer.send('win', 'max'),
  close: () => ipcRenderer.send('win', 'close'),
  fs:    () => ipcRenderer.send('win', 'fs'),
  mini:  () => ipcRenderer.send('win', 'mini'),
  quit:  () => ipcRenderer.send('win', 'quit'),
  onMini: cb => ipcRenderer.on('mini', (e, on) => cb(!!on)),
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
});
contextBridge.exposeInMainWorld('appLog', msg => ipcRenderer.send('app-log', String(msg).slice(0, 800)));
