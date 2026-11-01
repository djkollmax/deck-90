// The DC-90 in the rack on a pretend drive: every key, the disc's names, the tray, quick skips, the time left,
// REPEAT and SHUFFLE, a disc of MP3s, no disc and no drive.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, disc } from './lib/app.mjs';

const TONE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'tone.mp3');
const NAMES = { album: 'Canción Animal', artist: 'Soda Stereo', year: '1990',
  tracks: Object.fromEntries(Array.from({ length: 10 }, (_, i) => [i + 1, { title: 'Tema ' + (i + 1), artist: 'Soda Stereo' }])) };
let d;
const K = k => `#cdUnit g[data-key="${k}"]`;
const cd = () => d.win.evaluate(() => {
  const t = cdUnit.getState();
  return { power: cdUnitPower, state: cdState.state, track: t.track.track, total: t.track.totalTracks, title: t.track.title, artist: t.track.artist,
    playing: t.track.playing, paused: t.track.paused, open: t.drawerOpen };
});

before(async () => { d = await launch({ size: [1300, 1100], drive: disc(10, 180), names: NAMES }); });
after(async () => { await d?.close(); });

test('POWER plays the disc with its names', async () => {
  await d.cmds();
  await d.click(K('power'), 1500);
  const c = await cd();
  assert.equal(c.power, true); assert.equal(c.state, 'playing'); assert.equal(c.track, 1); assert.equal(c.total, 10);
  assert.equal(c.title, 'Tema 1'); assert.equal(c.artist, 'Soda Stereo · Canción Animal (1990)');
  assert.deepEqual((await d.cmds()).filter(x => x.startsWith('cd-')), ['cd-info', 'cd-play 1']);
});

test('▶▶ and |◀◀ change songs; PAUSE, PLAY and STOP', async () => {
  await d.click(K('next')); assert.equal((await cd()).track, 2);
  await d.click(K('next')); assert.equal((await cd()).track, 3);
  await d.click(K('prev')); assert.equal((await cd()).track, 2);
  await d.cmds();
  await d.click(K('pause')); assert.equal((await cd()).state, 'paused');
  await d.click(K('play')); assert.equal((await cd()).state, 'playing');
  await d.click(K('stop')); assert.equal((await cd()).state, 'stopped');
  await d.click(K('play'), 1000); assert.equal((await cd()).state, 'playing');
  assert.deepEqual(await d.cmds(), ['cd-pause', 'cd-resume', 'cd-stop', 'cd-play 2']);
});

test('quick presses on a slow drive send only the last jump', async () => {
  await d.drive({ slow: true }); await d.cmds();
  for (let i = 0; i < 3; i++) { await d.click(K('next'), 60); }
  assert.equal((await cd()).track, 5, 'shows the jump at once');
  await d.wait(1500);
  const c = await cd();
  assert.equal(c.track, 5); assert.equal(c.state, 'playing');
  const sent = (await d.cmds()).filter(x => x.startsWith('cd-play'));
  assert.ok(sent.length <= 2 && sent.at(-1) === 'cd-play 5', 'sent ' + sent);
  await d.drive({ slow: false });
});

test('touching the time shows the time left, and back', async () => {
  const minus = () => d.win.evaluate(() => cdUnit.svg.querySelector('[data-role="remain"]').getAttribute('fill'));
  await d.click('#cdUnit [data-role="time-key"]', 300);
  assert.match(await minus(), /--vfd,/); assert.equal(await d.win.evaluate(() => JSON.parse(localStorage.getItem('deck90-prefs')).cdunit.remain), true);
  await d.click('#cdUnit [data-role="time-key"]', 300);
  assert.match(await minus(), /--vfd-dim/);
});

test('REPEAT cycles all, one, off and SHUFFLE toggles, with their lamps, remembered', async () => {
  const modes = () => d.win.evaluate(() => [cdModes.repeat, cdModes.shuffle, localStorage.getItem('deck90-cdmodes')]);
  const lit = k => d.win.evaluate(k => !cdUnit._modeLamps[k].children[0].getAttribute('fill').includes('dim'), k);
  await d.click(K('repeat'), 200); assert.deepEqual((await modes()).slice(0, 2), ['all', false]); assert.equal(await lit('repeat'), true); assert.equal(await lit('one'), false);
  await d.click(K('repeat'), 200); assert.equal((await modes())[0], 'one'); assert.equal(await lit('one'), true);
  await d.click(K('repeat'), 200); assert.equal((await modes())[0], 'off'); assert.equal(await lit('repeat'), false);
  await d.click(K('shuffle'), 200); assert.equal((await modes())[1], true); assert.equal(await lit('shuffle'), true);
  await d.click(K('shuffle'), 200); assert.equal((await modes())[1], false);
  assert.equal((await modes())[2], '{"repeat":"off","shuffle":false}');
});

test('OPEN/CLOSE: the tray opens, closes and the disc plays again', async () => {
  await d.cmds();
  await d.click(K('eject'), 900);
  let c = await cd(); assert.equal(c.open, true);
  await d.click(K('eject'), 4500);
  c = await cd(); assert.equal(c.open, false); assert.equal(c.state, 'playing'); assert.equal(c.track, 1);
  assert.deepEqual((await d.cmds()).filter(x => x.startsWith('cd-')), ['cd-stop', 'cd-eject', 'cd-close', 'cd-info', 'cd-play 1']);
});

test('POWER off stops the disc', async () => {
  await d.click(K('power'), 600);
  const c = await cd(); assert.equal(c.power, false); assert.equal(c.title, 'COMPACT DISC');
});

test('a disc of MP3s plays its files', async () => {
  await d.drive({ disc: { drive: 'E:', name: 'USB DVD', present: true, tracks: [{ n: 1, audio: false, len: 0 }], files: [TONE, TONE] } });
  await d.click(K('power'), 1500);
  let c = await cd(); assert.equal(c.total, 2); assert.equal(c.track, 1); assert.equal(c.artist, 'DISCO MP3 · 1 DE 2');
  await d.click(K('next'), 900); assert.equal((await cd()).track, 2);
  assert.equal(await d.win.evaluate(() => !cdAudio.paused), true);
  await d.click(K('pause')); assert.equal(await d.win.evaluate(() => cdAudio.paused), true);
  await d.click(K('power'), 600);
});

test('no disc, and no drive at all', async () => {
  await d.drive({ disc: { drive: 'E:', name: 'USB DVD', present: false, tracks: [], files: [] } });
  await d.click(K('power'), 1200);
  assert.equal((await cd()).title, 'SIN DISCO');
  await d.click(K('power'), 600);
  await d.drive({ disc: { drive: null } });
  await d.click(K('power'), 1200);
  assert.equal((await cd()).title, 'NO HAY LECTORA DE CD');
  await d.win.keyboard.press('0'); await d.wait(400);
  assert.equal(await d.win.evaluate(() => getComputedStyle(cdUnitPanel).display), 'none');
  assert.deepEqual(d.errors(), []);
});
