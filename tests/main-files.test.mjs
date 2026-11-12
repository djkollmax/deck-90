// The main process's own pieces, without the program (7.10.16): settings files written whole and kept aside when
// broken, Last.fm's queue sent once even when a song ends mid-send, the phone server answering only local devices.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { readJson, writeJson } = require('../electron/jsonfile.js');
const { createLastfm } = require('../electron/lastfm.js');
const { localAddress } = require('../electron/remote.js');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'deck90-main-'));

test('a settings file: written whole, a broken one kept as .bad and read as empty', () => {
  const f = path.join(dir, 'a.json');
  assert.deepEqual(readJson(f), {}, 'not there yet');
  writeJson(f, { x: 1 });
  assert.deepEqual(readJson(f), { x: 1 });
  assert.equal(fs.existsSync(f + '.tmp'), false, 'no .tmp left');
  fs.writeFileSync(f, '{"x": 1, "que');                          // what a power cut mid-write used to leave
  const said = [];
  assert.deepEqual(readJson(f, m => said.push(m)), {});
  assert.equal(fs.existsSync(f + '.bad'), true, 'kept aside');
  assert.match(said[0], /unreadable/);
});

test('Last.fm: a song ending while the queue is being sent waits; nothing sent twice, nothing lost', async () => {
  const sent = [];
  let release;
  const net = { fetch: async (url, o) => {
    const p = new URLSearchParams(o.body || url.split('?')[1]);
    if (p.get('method') !== 'track.scrobble') return { ok: true, json: async () => ({}) };
    const tracks = [...p.keys()].filter(k => /^track\[\d+\]$/.test(k)).map(k => p.get(k));
    if (!release) await new Promise(r => { release = r; });        // the first send is slow
    sent.push(tracks);
    return { ok: true, json: async () => ({ scrobbles: {} }) };
  } };
  const d = fs.mkdtempSync(path.join(dir, 'lfm-'));
  // 60 waiting from when the network was down, and a session
  const queue = Array.from({ length: 60 }, (_, i) => ({ artist: 'A', track: 'T' + i, timestamp: 1e9 + i }));
  fs.writeFileSync(path.join(d, 'lastfm.json'), JSON.stringify({ key: 'k'.repeat(32), secret: 's'.repeat(32), session: 'x', queue }));
  const lfm = createLastfm({ net, dir: d, log: () => {}, open: () => {} });
  const one = lfm.scrobble({ artist: 'A', title: 'T60', at: 1e9 + 60 });
  await new Promise(r => setTimeout(r, 20));
  const two = lfm.scrobble({ artist: 'A', title: 'T61', at: 1e9 + 61 });   // a song ends mid-send
  await new Promise(r => setTimeout(r, 20));
  release();
  await Promise.all([one, two]);
  const all = sent.flat();
  assert.equal(all.length, 62, 'every one sent');
  assert.equal(new Set(all).size, 62, 'none twice');
  assert.equal(lfm.status().queued, 0);
  assert.equal(lfm.status().sent, 62);
});

test('the phone server answers the home network and this PC, nobody else', () => {
  for (const a of ['127.0.0.1', '::1', '::ffff:192.168.0.20', '10.1.2.3', '172.20.0.5', '169.254.3.4', '100.101.102.103', 'fd12:3456::1', 'fe80::1'])
    assert.equal(localAddress(a), true, a);
  for (const a of ['8.8.8.8', '::ffff:181.45.3.2', '172.32.0.1', '100.128.0.1', '2800:810::1', '', undefined])
    assert.equal(localAddress(a), false, String(a));
});

// 7.10.18: the secrets sealed with the system's protection (main.js gives Electron's safeStorage; here a stand-in)
const seal = { close: t => Buffer.from('S:' + t).toString('base64'), open: b => { const t = Buffer.from(b, 'base64').toString(); if (!t.startsWith('S:')) throw new Error('not ours'); return t.slice(2); } };
test('secrets: a file from before is sealed, read back open, and nothing in the open is left in it', () => {
  const f = path.join(dir, 'secrets.json'), lock = { keys: ['token', 'secret'], seal };
  fs.writeFileSync(f, JSON.stringify({ server: 'http://x', token: 'tok-123', secret: 'shh' }));   // as 7.10.17 left it
  const v = readJson(f, null, lock);
  assert.equal(v.plain, true, 'it says it was in the open');
  writeJson(f, v, lock);
  const text = fs.readFileSync(f, 'utf8');
  assert.ok(!text.includes('tok-123') && !text.includes('shh'), text);
  assert.match(text, /"sealed":/);
  const w = readJson(f, null, lock);
  assert.deepEqual([w.server, w.token, w.secret, w.plain], ['http://x', 'tok-123', 'shh', false]);
  delete w.token; writeJson(f, w, lock);                          // signed out: the sealed token goes too
  assert.equal(readJson(f, null, lock).token, undefined);
  // no seal on this PC (no keyring): the sealed value stays as it is, unread, and is written back untouched
  const x = readJson(f, null, { keys: lock.keys, seal: null });
  assert.equal(x.secret, undefined); writeJson(f, x, { keys: lock.keys, seal: null });
  assert.equal(readJson(f, null, lock).secret, 'shh');
  // sealed by another user or PC: not opened, said, and the rest still read
  fs.writeFileSync(f, JSON.stringify({ server: 'http://x', sealed: { token: Buffer.from('X:zzz').toString('base64') } }));
  const said = [], y = readJson(f, m => said.push(m), lock);
  assert.deepEqual([y.server, y.token], ['http://x', undefined]); assert.match(said[0], /could not be opened/);
});

test('Last.fm keeps its key, secret and session sealed', async () => {
  const d = fs.mkdtempSync(path.join(dir, 'lfm2-'));
  fs.writeFileSync(path.join(d, 'lastfm.json'), JSON.stringify({ key: 'k'.repeat(32), secret: 's'.repeat(32), session: 'sess-1', user: 'damian', queue: [] }));
  const lfm = createLastfm({ net: { fetch: async () => ({ ok: true, json: async () => ({}) }) }, dir: d, log: () => {}, open: () => {}, seal });
  const text = fs.readFileSync(path.join(d, 'lastfm.json'), 'utf8');
  assert.ok(!/k{32}|s{32}|sess-1/.test(text), 'sealed at once: ' + text);
  assert.deepEqual([lfm.status().hasKey, lfm.status().signedIn, lfm.status().user], [true, true, 'damian']);
});
