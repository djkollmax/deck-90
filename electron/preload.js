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
});
contextBridge.exposeInMainWorld('appLog', msg => ipcRenderer.send('app-log', String(msg).slice(0, 800)));
