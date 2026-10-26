// Before a release: every script of the program must at least compile (electron/ as CommonJS modules,
// src/ as the page's classic scripts), and package.json's entry point must exist.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
let bad = 0, n = 0;
function walk(dir) {
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) walk(p);
    else if (p.endsWith('.js')) {
      n++;
      const rel = path.relative(root, p).split(path.sep).join('/'), code = fs.readFileSync(p, 'utf8');
      try {
        if (rel.startsWith('electron/')) new vm.Script('(function (exports, require, module, __filename, __dirname) {' + code + '\n})', { filename: rel });
        else new vm.Script(code, { filename: rel });
      } catch (e) { bad++; console.error('✗ ' + rel + ': ' + e.message); }
    }
  }
}
walk(path.join(root, 'electron'));
walk(path.join(root, 'src'));
if (!fs.existsSync(path.join(root, pkg.main))) { bad++; console.error('✗ package.json main not found: ' + pkg.main); }
console.log(n + ' scripts, ' + (bad ? bad + ' with errors' : 'all compile') + ' · entry ' + pkg.main);
process.exit(bad ? 1 : 0);
