// Who shares what among the page's classic scripts (they share their top-level names, see CLAUDE.md): which
// names a file declares, which other files' names it reads and changes, and its typeof checks on names of
// files loaded after it. `node scripts/globals.mjs` prints the names one file sets in another file, and the
// checks; `--json` writes everything to globals.json, to plan the move to ES modules.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const acorn = createRequire(path.join(here, '..', 'package.json'))('acorn');
const ROOT = path.join(here, '..', 'src');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const files = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]).filter(f => !f.startsWith('vendor/'));
const declOf = {}, info = {};
function declNames(node, out) {
  if (!node) return;
  if (node.type === 'Identifier') out.push(node.name);
  else if (node.type === 'ObjectPattern') node.properties.forEach(p => declNames(p.type === 'RestElement' ? p.argument : p.value, out));
  else if (node.type === 'ArrayPattern') node.elements.forEach(e => declNames(e, out));
  else if (node.type === 'AssignmentPattern') declNames(node.left, out);
  else if (node.type === 'RestElement') declNames(node.argument, out);
}
for (const f of files) {
  const code = fs.readFileSync(path.join(ROOT, f), 'utf8');
  const ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'script', locations: true });
  info[f] = { ast, decl: new Set(), reads: {}, writes: {}, guards: {} };
  for (const st of ast.body) {
    if (st.type === 'VariableDeclaration') st.declarations.forEach(d => { const o = []; declNames(d.id, o); o.forEach(n => info[f].decl.add(n)); });
    else if ((st.type === 'FunctionDeclaration' || st.type === 'ClassDeclaration') && st.id) info[f].decl.add(st.id.name);
  }
  for (const n of info[f].decl) if (!(n in declOf)) declOf[n] = f;
}
// walk with scopes
function walk(f) {
  const I = info[f];
  const scopes = [new Set()];   // top-level scope = file's own decls are "global" (shared), treat as not local
  const isLocal = n => scopes.slice(1).some(s => s.has(n));
  const hoist = (body, scope) => {
    for (const st of body) {
      if (st.type === 'FunctionDeclaration' && st.id) scope.add(st.id.name);
      if (st.type === 'ClassDeclaration' && st.id) scope.add(st.id.name);
      if (st.type === 'VariableDeclaration') st.declarations.forEach(d => { const o = []; declNames(d.id, o); o.forEach(n => scope.add(n)); });
    }
  };
  const varsIn = (node, scope) => {   // var declarations anywhere inside a function body (not nested functions)
    (function v(n) {
      if (!n || typeof n !== 'object') return;
      if (Array.isArray(n)) return n.forEach(v);
      if (/Function/.test(n.type)) return;
      if (n.type === 'VariableDeclaration' && n.kind === 'var') n.declarations.forEach(d => { const o = []; declNames(d.id, o); o.forEach(x => scope.add(x)); });
      for (const k in n) if (k !== 'type' && n[k] && typeof n[k] === 'object') v(n[k]);
    })(node);
  };
  const note = (kind, name, node) => {
    if (isLocal(name) || !(name in declOf) || I.decl.has(name)) return;
    (I[kind][name] = I[kind][name] || []).push(node.loc.start.line);
  };
  function visit(n, parent, key) {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) return n.forEach(c => visit(c, parent, key));
    switch (n.type) {
      case 'FunctionDeclaration': case 'FunctionExpression': case 'ArrowFunctionExpression': {
        const s = new Set(); if (n.type === 'FunctionExpression' && n.id) s.add(n.id.name);
        n.params.forEach(p => { const o = []; declNames(p, o); o.forEach(x => s.add(x)); });
        if (n.body.type === 'BlockStatement') { hoist(n.body.body, s); varsIn(n.body.body, s); }
        scopes.push(s); n.params.forEach(p => visit(p.type === 'AssignmentPattern' ? p.right : null)); visit(n.body); scopes.pop(); return;
      }
      case 'BlockStatement': case 'Program': case 'StaticBlock': {
        if (n.type === 'Program') { n.body.forEach(c => visit(c, n)); return; }
        const s = new Set(); hoist(n.body, s); scopes.push(s); n.body.forEach(c => visit(c, n)); scopes.pop(); return;
      }
      case 'ForStatement': case 'ForInStatement': case 'ForOfStatement': {
        const s = new Set(); const init = n.init || n.left;
        if (init && init.type === 'VariableDeclaration') init.declarations.forEach(d => { const o = []; declNames(d.id, o); o.forEach(x => s.add(x)); });
        scopes.push(s); for (const k of ['init', 'test', 'update', 'left', 'right', 'body']) visit(n[k], n, k); scopes.pop(); return;
      }
      case 'CatchClause': { const s = new Set(); const o = []; declNames(n.param, o); o.forEach(x => s.add(x)); scopes.push(s); visit(n.body); scopes.pop(); return; }
      case 'ClassDeclaration': case 'ClassExpression': visit(n.superClass); visit(n.body); return;
      case 'VariableDeclarator': visit(n.init); { const pats = []; (function p(x) { if (!x) return; if (x.type === 'AssignmentPattern') { visit(x.right); p(x.left); } else if (x.type === 'ObjectPattern') x.properties.forEach(q => { if (q.computed) visit(q.key); p(q.value || q.argument); }); else if (x.type === 'ArrayPattern') x.elements.forEach(p); })(n.id); } return;
      case 'MemberExpression': visit(n.object); if (n.computed) visit(n.property); return;
      case 'Property': if (n.computed) visit(n.key); if (n.shorthand && n.value.type === 'Identifier') { note('reads', n.value.name, n.value); return; } visit(n.value); return;
      case 'MethodDefinition': case 'PropertyDefinition': if (n.computed) visit(n.key); visit(n.value); return;
      case 'LabeledStatement': visit(n.body); return;
      case 'BreakStatement': case 'ContinueStatement': return;
      case 'AssignmentExpression':
        if (n.left.type === 'Identifier') { note('writes', n.left.name, n.left); if (n.operator !== '=') note('reads', n.left.name, n.left); }
        else visit(n.left);
        visit(n.right); return;
      case 'UpdateExpression':
        if (n.argument.type === 'Identifier') { note('writes', n.argument.name, n.argument); note('reads', n.argument.name, n.argument); } else visit(n.argument); return;
      case 'UnaryExpression':
        if (n.operator === 'typeof' && n.argument.type === 'Identifier') { note('guards', n.argument.name, n.argument); note('reads', n.argument.name, n.argument); return; }
        visit(n.argument); return;
      case 'Identifier': note('reads', n.name, n); return;
    }
    for (const k in n) if (!['type', 'loc', 'start', 'end'].includes(k) && n[k] && typeof n[k] === 'object') visit(n[k], n, k);
  }
  visit(I.ast);
}
files.forEach(walk);
const out = { files, declOf, perFile: {} };
for (const f of files) out.perFile[f] = { decl: [...info[f].decl], reads: info[f].reads, writes: info[f].writes, guards: info[f].guards };
if (process.argv.includes('--json')) fs.writeFileSync('globals.json', JSON.stringify(out, null, 1));
// summary
const written = {};
for (const f of files) for (const n in info[f].writes) (written[n] = written[n] || []).push(f.replace(/^ui\//, ''));
console.log('cross-file writes:', Object.keys(written).length);
for (const n of Object.keys(written).sort()) console.log('  ' + n + ' (' + declOf[n].replace(/^ui\//, '') + ') ← ' + written[n].join(', '));
let g = 0; const gl = {};
for (const f of files) for (const n in info[f].guards) { g += info[f].guards[n].length; (gl[f] = gl[f] || []).push(n + '@' + declOf[n].replace(/^ui\//, '') + (files.indexOf(declOf[n]) > files.indexOf(f) ? '(later)' : '')); }
console.log('typeof guards on other files\' names:', g);
for (const f in gl) console.log('  ' + f + ': ' + gl[f].join(' '));
