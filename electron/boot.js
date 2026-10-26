// Deck 90 starts here. This file stays small and needs nothing else from the program, so that if an
// update brings a main process that doesn't even load (a missing file, a mistake that throws at start),
// it can still put the previous version back from resources\app-anterior and restart into it.
// Everything else lives in main.js.
'use strict';
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

try {
  require('./main.js');
} catch (err) {
  if (!rescue(err)) throw err;          // nothing to go back to: Electron shows the error as usual
}

function rescue(err) {
  try {
    if (!app.isPackaged) return false;
    const appDir = app.getAppPath(), res = path.dirname(appDir);
    const marker = path.join(res, 'deck90-update.json'), backup = path.join(res, 'app-anterior');
    let mk; try { mk = JSON.parse(fs.readFileSync(marker, 'utf8')); } catch (_) { return false; }
    if (!mk || !fs.existsSync(path.join(backup, 'package.json'))) return false;
    if ((mk.rescues || 0) >= 2) return false;                         // tried twice already: stop restarting
    fs.writeFileSync(marker, JSON.stringify(Object.assign({}, mk, { rescues: (mk.rescues || 0) + 1 })));
    fs.cpSync(backup, appDir, { recursive: true, force: true });
    const ud = app.getPath('userData');
    try { fs.mkdirSync(ud, { recursive: true }); } catch (_) {}
    try {
      fs.appendFileSync(path.join(ud, 'media.log'), new Date().toISOString() + ' update: ' + mk.to + ' did not load (' +
        String(err && err.stack || err).split('\n').slice(0, 2).join(' ') + '), restored ' + mk.from + '\n');
    } catch (_) {}
    const nf = path.join(ud, 'update.json');
    let n = {}; try { n = JSON.parse(fs.readFileSync(nf, 'utf8')) || {}; } catch (_) {}
    n.skip = Array.isArray(n.skip) ? n.skip : [];
    if (mk.to && !n.skip.includes(mk.to)) n.skip.push(mk.to);
    n.note = { failed: mk.to, back: mk.from, why: 'no llegó a arrancar', incomplete: false };
    try { fs.writeFileSync(nf, JSON.stringify(n)); } catch (_) {}
    fs.rmSync(marker, { force: true });
    app.relaunch(); app.exit(0);
    return true;
  } catch (_) { return false; }
}
