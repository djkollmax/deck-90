// Window buttons for the frameless rack (minimise / maximise / close).
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('nowPlaying', {
  on:  cb => ipcRenderer.on('media', (e, info) => cb(info)),
  cmd: c  => ipcRenderer.send('media-cmd', c),
  // Spotless' volume and levelling, read from its settings ({ volume, levelling, gainDb } or null)
  onPlayer: cb => ipcRenderer.on('spotless', (e, s) => cb(s)),
  // 7.9.21: Windows' volume after the stereo's VOL keys ({ vol: 0-100 or -1 when unknown, mute })
  onVolume: cb => ipcRenderer.on('volume', (e, v) => cb(v)),
});
contextBridge.exposeInMainWorld('winCtl', {
  min:   () => ipcRenderer.send('win', 'min'),
  max:   () => ipcRenderer.send('win', 'max'),
  close: () => ipcRenderer.send('win', 'close'),
  fs:    () => ipcRenderer.send('win', 'fs'),
  mini:  () => ipcRenderer.send('win', 'mini'),
  stereo: () => ipcRenderer.send('win', 'stereo'),
  quit:  () => ipcRenderer.send('win', 'quit'),
  ready: () => ipcRenderer.send('win', 'ready'),
  onMini: cb => ipcRenderer.on('mini', (e, on, style) => cb(!!on, style === 'stereo' ? 'stereo' : 'strip')),
  onShown: cb => ipcRenderer.on('shown', (e, on) => cb(!!on)),   // false in the tray or minimized: no drawing then
});
contextBridge.exposeInMainWorld('phoneDisplay', {
  set:   on => ipcRenderer.send('remote-set', !!on),
  get:   () => ipcRenderer.send('remote-get'),
  frame: f  => ipcRenderer.send('remote-frame', f),
  on:    cb => ipcRenderer.on('remote-state', (e, st) => cb(st)),
  onStereoKey: cb => ipcRenderer.on('phone-stereo-key', (e, k, hold) => cb(String(k), !!hold)),   // 7.9.4: the stereo on the phone
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
// a copy of the settings in a file (a save and an open dialog in the program)
contextBridge.exposeInMainWorld('appSettings', {
  save: text => ipcRenderer.invoke('settings-save', String(text)),
  open: () => ipcRenderer.invoke('settings-open'),
  reload: () => ipcRenderer.send('settings-reload'),
});
// the weather for the header display: find a place by name, and its weather now
contextBridge.exposeInMainWorld('weather', {
  find: q => ipcRenderer.invoke('weather-find', String(q).slice(0, 80)),
  now:  (lat, lon) => ipcRenderer.invoke('weather-now', Number(lat), Number(lon)),
});
// the stereo's CD drive (Windows): commands to the bridge, and what it says back
// 7.10.0: the DM-90's Jellyfin server (electron/jellyfin.js)
contextBridge.exposeInMainWorld('jellyfin', {
  status: () => ipcRenderer.invoke('jf-status'),
  signIn: (server, user, pw) => ipcRenderer.invoke('jf-sign-in', String(server || ''), String(user || ''), String(pw || '')),
  signOut: () => ipcRenderer.invoke('jf-sign-out'),
  read: (kind, id, query) => ipcRenderer.invoke('jf-read', String(kind), id == null ? '' : String(id), query || {}),
  stream: (id, playable) => ipcRenderer.invoke('jf-stream', String(id), !!playable),
  cover: (id, albumId) => ipcRenderer.invoke('jf-cover', String(id || ''), String(albumId || '')),   // 7.10.17: the header's cover
});
// 7.10.10: Last.fm for the radio, the CD and the DM-90 (electron/lastfm.js)
contextBridge.exposeInMainWorld('lastfm', {
  status: () => ipcRenderer.invoke('lfm-status'),
  begin: (key, secret) => ipcRenderer.invoke('lfm-begin', String(key || ''), String(secret || '')),
  finish: () => ipcRenderer.invoke('lfm-finish'),
  signOut: () => ipcRenderer.invoke('lfm-sign-out'),
  nowPlaying: t => ipcRenderer.invoke('lfm-now', t),
  scrobble: t => ipcRenderer.invoke('lfm-scrobble', t),
});
contextBridge.exposeInMainWorld('cdrom', {
  cmd: c => ipcRenderer.send('media-cmd', String(c).slice(0, 20)),
  on:  cb => ipcRenderer.on('cd', (e, s) => cb(s)),
  names: info => ipcRenderer.invoke('cd-names', info),   // 7.9.5: the disc's album and songs (MusicBrainz)
  cover: release => ipcRenderer.invoke('cd-cover', String(release || '')),   // 7.10.17: its front cover
  fileInfo: f => ipcRenderer.invoke('cd-file-info', String(f).slice(0, 1024)),   // 7.9.22: a file's size, rate and bits
});
// the stereo's internet radio: stations by name, and the most heard in Argentina
contextBridge.exposeInMainWorld('radio', {
  find: (q, cc) => ipcRenderer.invoke('radio-find', String(q).slice(0, 60), String(cc || '').slice(0, 2)),
  top:  () => ipcRenderer.invoke('radio-top'),
  search: (q, cc) => ipcRenderer.invoke('radio-search', String(q || '').slice(0, 60), String(cc || '').slice(0, 2)),   // 7.10.10: the world
  // 7.9.3: the stream through Deck 90's local proxy, and what the station says (song, format, bitrate)
  proxy: (u, id) => ipcRenderer.invoke('radio-proxy', String(u).slice(0, 1200), String(id).slice(0, 20)),
  onMeta: cb => ipcRenderer.on('radio-meta', (e, m) => cb(m)),
});
contextBridge.exposeInMainWorld('appLog', msg => ipcRenderer.send('app-log', String(msg).slice(0, 800)));
