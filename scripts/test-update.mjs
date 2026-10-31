// Update tests on a built Deck 90. CI runs them on Windows, where files really get replaced while the
// program runs. A made-up next version is handed to the updater in place of GitHub's answer, and each
// case then checks what's on disk and in the log:
//   ok         installs, restarts into the new version, which confirms it started
//   mainthrow  the new main process throws at start: boot.js puts the old version back
//   syntax     a damaged .js in the package: refused before anything is written
//   engine     the package needs another Electron: offered as a full download, nothing installed
// usage:  PW_DIR=<folder with node_modules/playwright-core>  node scripts/test-update.mjs "<built app folder>" [case …]
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const built = path.resolve(process.argv[2] || '.');
if (!fs.existsSync(path.join(built, 'resources', 'app', 'package.json'))) {
  console.error('usage: node scripts/test-update.mjs <built app folder> [ok|mainthrow|syntax|engine …]'); process.exit(2);
}
const cases = process.argv.length > 3 ? process.argv.slice(3) : ['ok', 'mainthrow', 'syntax', 'engine'];
const { _electron: electron } = await import(pathToFileURL(path.join(process.env.PW_DIR || '.', 'node_modules', 'playwright-core', 'index.mjs')).href);
const win32 = process.platform === 'win32';
const exeName = win32 ? 'Deck 90.exe' : 'deck-90';
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'deck90-upd-'));
const wait = ms => new Promise(r => setTimeout(r, ms));
async function until(what, fn, ms) {
  const end = Date.now() + ms;
  for (;;) { const v = await fn(); if (v) return v; if (Date.now() > end) throw new Error('timed out waiting for ' + what); await wait(500); }
}
function killAll(dir) {
  try {
    if (win32) execSync(`taskkill /F /T /IM "${exeName}"`, { stdio: 'ignore' });
    else execSync(`pkill -f "${dir}/[d]eck-90"`, { stdio: 'ignore' });
  } catch (_) {}
}

async function run(name) {
  const D = path.join(work, 'app-' + name), UD = path.join(work, 'data-' + name), A = path.join(D, 'resources', 'app');
  fs.cpSync(built, D, { recursive: true });
  const marker = path.join(D, 'resources', 'deck90-update.json');
  const onDisk = () => JSON.parse(fs.readFileSync(path.join(A, 'package.json'), 'utf8')).version;
  const log = () => { try { return fs.readFileSync(path.join(UD, 'media.log'), 'utf8'); } catch (_) { return ''; } };
  const from = onDisk(), to = from.replace(/(\d+)$/, n => String(+n + 1));

  // The next version and GitHub's answers are ready before the program starts: its first look at GitHub
  // comes 8 s after it starts, and making the package on a slow machine took longer than that (the check
  // then went to the real GitHub, found nothing newer and the offer never came).
  const engine = fs.readFileSync(path.join(D, 'version'), 'utf8').trim();
  // the next version, made from the installed files
  const files = {};
  (function walk(rel) {
    for (const d of fs.readdirSync(path.join(A, rel), { withFileTypes: true })) {
      const r = rel ? rel + '/' + d.name : d.name;
      if (d.isDirectory()) walk(r); else files[r] = fs.readFileSync(path.join(A, r));
    }
  })('');
  files['package.json'] = Buffer.from(String(files['package.json']).replace(`"version": "${from}"`, `"version": "${to}"`));
  files['src/js/update.js'] = Buffer.from(String(files['src/js/update.js']) + `\n// test build ${to}\n`);
  if (name === 'mainthrow') files['electron/main.js'] = Buffer.from(`throw new Error('broken ${to}');\n` + files['electron/main.js']);
  if (name === 'syntax') files['src/js/core.js'] = Buffer.from(String(files['src/js/core.js']) + '\nfunction (');
  const b64 = {}; for (const k in files) b64[k] = files[k].toString('base64');
  const bundle = zlib.gzipSync(JSON.stringify({ format: 1, name: 'deck-90', version: to, electron: name === 'engine' ? '1.0.0' : engine, files: b64 }));
  const sha = crypto.createHash('sha256').update(bundle).digest('hex');

  const app = await electron.launch({ executablePath: path.join(D, exeName), args: [...(win32 ? [] : ['--no-sandbox']), '--user-data-dir=' + UD], timeout: 90000 });
  let closed = false; app.on('close', () => { closed = true; });
  try {
    // GitHub's answers, from here, before the page has even loaded
    await app.evaluate(({ net }, [b, sha, to]) => {
      const body = Buffer.from(b, 'base64'), asset = `Deck-90-${to}-app.bundle`;
      net.fetch = async url => {
        url = String(url);
        if (url.endsWith('/releases/latest')) return new Response(JSON.stringify({ tag_name: 'v' + to, assets: [{ name: asset, size: body.length, digest: 'sha256:' + sha, browser_download_url: `https://github.com/djkollmax/deck-90/releases/download/v${to}/${asset}` }] }));
        if (url.endsWith(asset)) return new Response(body);
        return new Response('no', { status: 404 });
      };
    }, [bundle.toString('base64'), sha, to]);
    const page = await app.firstWindow();
    if (engine !== await app.evaluate(() => process.versions.electron)) throw new Error('the version file is not this Electron');

    const bar = () => page.evaluate(() => ({ show: document.getElementById('updBar').classList.contains('show'), text: document.getElementById('updText').innerText, go: document.getElementById('updGo').textContent }));
    const offer = await until('the offer of ' + to, async () => { const b = await bar(); return b.show && b.go === 'INSTALAR' ? b : null; }, 45000);
    console.log(`  offered: ${offer.text}`);
    await page.click('#updGo');

    if (name === 'engine' || name === 'syntax') {
      const want = name === 'engine' ? /motor/ : /dañado/;
      const b = await until('the message', async () => { const b = await bar(); return want.test(b.text) ? b : null; }, 30000);
      console.log(`  says: ${b.text}`);
      if (closed) throw new Error('it restarted');
      if (onDisk() !== from) throw new Error('version on disk changed to ' + onDisk());
      if (fs.existsSync(marker)) throw new Error('an update marker was left behind');
      if (name === 'engine' && !log().includes(`${to} needs Electron 1.0.0`)) throw new Error('no "needs Electron" line in the log');
      return;
    }
    await until('the restart', async () => closed, 30000);
    if (name === 'ok') {
      await until('the new version to confirm its start', async () => log().includes(`update: ${to} started fine`), 90000);
      if (onDisk() !== to) throw new Error('version on disk is ' + onDisk());
      if (!fs.readFileSync(path.join(A, 'src', 'js', 'update.js'), 'utf8').includes(`test build ${to}`)) throw new Error('the new files are not there');
    } else {
      await until('the old version to be put back', async () => log().includes(`${to} did not load`), 90000);
      await until('the old version on disk', async () => onDisk() === from, 30000);
      const notes = JSON.parse(fs.readFileSync(path.join(UD, 'update.json'), 'utf8'));
      if (!(notes.skip || []).includes(to)) throw new Error(to + ' is not marked to skip');
    }
    await until('the update marker to go', async () => !fs.existsSync(marker), 30000);
  } finally {
    console.log('  log: ' + log().split('\n').filter(l => /update/.test(l)).join('\n       '));
    await Promise.race([app.close().catch(() => {}), wait(5000)]);
    killAll(D);
    await wait(1500);
  }
}

let failed = 0;
for (const name of cases) {
  console.log(`— ${name}`);
  try { await run(name); console.log(`ok   ${name}`); }
  catch (e) { failed++; console.log(`FAIL ${name}: ${e.message}`); }
}
try { fs.rmSync(work, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 }); } catch (_) {}
console.log(failed ? `${failed} update case(s) failed` : 'update: all cases passed');
process.exit(failed ? 1 : 0);
