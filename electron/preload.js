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
  onMini: cb => ipcRenderer.on('mini', (e, on) => cb(!!on)),
});
contextBridge.exposeInMainWorld('phoneDisplay', {
  set:   on => ipcRenderer.send('remote-set', !!on),
  get:   () => ipcRenderer.send('remote-get'),
  frame: f  => ipcRenderer.send('remote-frame', f),
  on:    cb => ipcRenderer.on('remote-state', (e, st) => cb(st)),
});
contextBridge.exposeInMainWorld('appLog', msg => ipcRenderer.send('app-log', String(msg).slice(0, 800)));
