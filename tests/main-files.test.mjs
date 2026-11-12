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
