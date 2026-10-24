// Builds a portable Deck 90 for Windows or Linux (x64) from the official Electron release:
//   node scripts/package.mjs win32     → dist/Deck 90-win32-x64/ + .zip
//   node scripts/package.mjs linux     → dist/Deck 90-linux-x64/ + .zip
//   node scripts/package.mjs bundle    → dist/Deck-90-<version>-app.bundle (what the program's
//                                        "update" downloads: its own files as gzipped JSON)
// The Electron zip is checked against Electron's published SHA-256 before use.
// Needs `unzip` and `zip` (Linux/macOS) or the `tar` that ships with Windows 10+.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const platform = process.argv[2] || process.platform;
if (!['win32', 'linux', 'bundle'].includes(platform)) { console.error('usage: node scripts/package.mjs win32|linux|bundle'); process.exit(1); }
const version = pkg.devDependencies.electron.replace(/^[^\d]*/, '');
// keep only what the app needs in its package.json
const appPkg = { name: pkg.name, productName: pkg.productName, version: pkg.version, description: pkg.description, main: pkg.main, license: pkg.license, author: pkg.author };
const APP_ITEMS = ['package.json', 'LICENSE', 'electron', 'src', 'assets'];

if (platform === 'bundle') {
  const files = {};
  const walk = rel => {
    const abs = path.join(root, rel);
    if (fs.statSync(abs).isDirectory()) { for (const n of fs.readdirSync(abs).sort()) walk(rel + '/' + n); return; }
    files[rel] = (rel === 'package.json' ? Buffer.from(JSON.stringify(appPkg, null, 2) + '\n') : fs.readFileSync(abs)).toString('base64');
  };
  for (const item of APP_ITEMS) walk(item);
  const bundle = { format: 1, name: 'deck-90', version: pkg.version, electron: version, files };
  const out = path.join(root, 'dist', `${pkg.productName.replace(/ /g, '-')}-${pkg.version}-app.bundle`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, zlib.gzipSync(JSON.stringify(bundle), { level: 9 }));
  console.log('built', path.relative(root, out), Object.keys(files).length, 'files', fs.statSync(out).size, 'bytes');
  process.exit(0);
}
const zipName = `electron-v${version}-${platform}-x64.zip`;
const base = `https://github.com/electron/electron/releases/download/v${version}/`;
const cache = path.join(root, '.cache');
const outDir = path.join(root, 'dist', `${pkg.productName}-${platform}-x64`);
fs.mkdirSync(cache, { recursive: true });

async function download(url, file) {
  if (fs.existsSync(file)) return;
  console.log('downloading', url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
}

const zip = path.join(cache, zipName);
await download(base + 'SHASUMS256.txt', path.join(cache, `SHASUMS256-${version}.txt`));
await download(base + zipName, zip);
const sums = fs.readFileSync(path.join(cache, `SHASUMS256-${version}.txt`), 'utf8');
const expected = (sums.split('\n').find(l => l.endsWith('*' + zipName)) || '').split(' ')[0];
const actual = crypto.createHash('sha256').update(fs.readFileSync(zip)).digest('hex');
if (!expected || expected !== actual) { fs.rmSync(zip, { force: true }); throw new Error(`checksum mismatch for ${zipName} (cached copy deleted, run again)`); }
console.log('checksum ok', actual.slice(0, 16) + '…');

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
if (process.platform === 'win32') execFileSync('tar', ['-xf', zip, '-C', outDir]);
else execFileSync('unzip', ['-q', zip, '-d', outDir]);

// the app replaces Electron's default one
fs.rmSync(path.join(outDir, 'resources', 'default_app.asar'), { force: true });
const exe = platform === 'win32' ? ['electron.exe', `${pkg.productName}.exe`] : ['electron', 'deck-90'];
fs.renameSync(path.join(outDir, exe[0]), path.join(outDir, exe[1]));

const appDir = path.join(outDir, 'resources', 'app');
for (const item of APP_ITEMS) {
  fs.cpSync(path.join(root, item), path.join(appDir, item), { recursive: true });
}
fs.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify(appPkg, null, 2) + '\n');

const zipOut = path.join(root, 'dist', `${pkg.productName.replace(/ /g, '-')}-${pkg.version}-${platform}-x64.zip`);
fs.rmSync(zipOut, { force: true });
if (process.platform === 'win32') execFileSync('tar', ['-a', '-c', '-f', zipOut, '-C', path.dirname(outDir), path.basename(outDir)]);
else execFileSync('zip', ['-qr', zipOut, path.basename(outDir)], { cwd: path.dirname(outDir) });
console.log('built', path.relative(root, outDir), '→', path.relative(root, zipOut));
