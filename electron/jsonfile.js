'use strict';
// A settings file of the main process (lastfm.json, jellyfin.json, cd-names.json), read and written safely
// (7.10.16): written to a .tmp beside it and renamed over it, so a crash or a power cut mid-write never leaves half a
// file; one that can't be read is kept as <name>.bad (and logged) instead of being written over with nothing.
const fs = require('fs');

function readJson(file, log) {
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch (_) { return {}; }   // not there yet
  try { const v = JSON.parse(text); return v && typeof v === 'object' ? v : {}; }
  catch (e) {
    try { fs.renameSync(file, file + '.bad'); } catch (_) {}
    if (log) log(require('path').basename(file) + ': unreadable, kept as .bad (' + e.message + ')');
    return {};
  }
}
// Windows: an antivirus can hold the file for a moment; a few quick tries
function writeJson(file, value) {
  const tmp = file + '.tmp', text = JSON.stringify(value);
  for (let i = 0; ; i++) {
    try { fs.writeFileSync(tmp, text); fs.renameSync(tmp, file); return; }
    catch (e) { if (i >= 3 || !['EPERM', 'EBUSY', 'EACCES'].includes(e.code)) throw e; const t = Date.now() + 40 * (i + 1); while (Date.now() < t) {} }
  }
}
module.exports = { readJson, writeJson };
