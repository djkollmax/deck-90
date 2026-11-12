'use strict';
// A settings file of the main process (lastfm.json, jellyfin.json, cd-names.json), read and written safely
// (7.10.16): written to a .tmp beside it and renamed over it, so a crash or a power cut mid-write never leaves half a
// file; one that can't be read is kept as <name>.bad (and logged) instead of being written over with nothing.
//
// 7.10.18: the secrets in it (Last.fm's key, secret and session, Jellyfin's token) are kept sealed: `lock` is
// { keys: [...], seal: { close(text) → base64, open(base64) → text } } (main.js gives Electron's safeStorage: DPAPI
// on Windows, the keyring on Linux). They're written in "sealed" and opened on reading; a file from before is sealed
// the first time it's written. With no seal (encryption not available) a sealed value is kept as it is, unread.
const fs = require('fs');

function readJson(file, log, lock) {
  let text, v;
  try { text = fs.readFileSync(file, 'utf8'); } catch (_) { return {}; }   // not there yet
  try { v = JSON.parse(text); if (!v || typeof v !== 'object') v = {}; }
  catch (e) {
    try { fs.renameSync(file, file + '.bad'); } catch (_) {}
    if (log) log(require('path').basename(file) + ': unreadable, kept as .bad (' + e.message + ')');
    return {};
  }
  // written before 7.10.18 (or without a seal then): the secrets are in the open; `plain` says so, to seal them now
  const plain = !!(lock && lock.seal) && lock.keys.some(k => typeof v[k] === 'string' && v[k]);
  if (lock && lock.seal && v.sealed && typeof v.sealed === 'object') {
    for (const [k, b] of Object.entries(v.sealed)) {
      if (!lock.keys.includes(k)) continue;
      try { v[k] = lock.seal.open(String(b)); }
      catch (e) { if (log) log(require('path').basename(file) + ': ' + k + ' could not be opened (another user or PC?)'); }
    }
    delete v.sealed;
  }
  if (lock) Object.defineProperty(v, 'plain', { value: plain, enumerable: false });
  return v;
}
// what goes to the file: the secrets sealed, if there's a seal
function sealed(value, lock) {
  if (!lock || !lock.seal) return value;
  const out = Object.assign({}, value), s = Object.assign({}, value.sealed || {});
  for (const k of lock.keys) if (typeof out[k] === 'string' && out[k]) { s[k] = lock.seal.close(out[k]); delete out[k]; } else if (!(k in out)) delete s[k];
  delete out.sealed;
  if (Object.keys(s).length) out.sealed = s;
  return out;
}
// Windows: an antivirus can hold the file for a moment; a few quick tries
function writeJson(file, value, lock) {
  const tmp = file + '.tmp', text = JSON.stringify(sealed(value, lock));
  for (let i = 0; ; i++) {
    try { fs.writeFileSync(tmp, text); fs.renameSync(tmp, file); return; }
    catch (e) { if (i >= 3 || !['EPERM', 'EBUSY', 'EACCES'].includes(e.code)) throw e; const t = Date.now() + 40 * (i + 1); while (Date.now() < t) {} }
  }
}
module.exports = { readJson, writeJson };
