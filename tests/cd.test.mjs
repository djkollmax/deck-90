// The DC-90 in the rack on a pretend drive: every key, the disc's names, the tray, quick skips, the time left,
// REPEAT and SHUFFLE, a disc of MP3s, no disc and no drive.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, disc } from './lib/app.mjs';

const TONE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'tone.mp3');
const FLAC = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'tone-24-96.flac');
const NAMES = { album: 'Canción Animal', artist: 'Soda Stereo', year: '1990', release: '0b9b1a4c-3f0e-4d6a-9a52-6a1f2e3d4c5b',
  tracks: Object.fromEntries(Array.from({ length: 10 }, (_, i) => [i + 1, { title: 'Tema ' + (i + 1), artist: 'Soda Stereo' }])) };
let d;
const K = k => `#cdUnit g[data-key="${k}"]`;
const cd = () => d.win.evaluate(() => {
  const t = cdUnit.getState();
  return { power: cdUnitPower, state: cdState.state, track: t.track.track, total: t.track.totalTracks, title: t.track.title, artist: t.track.artist,
    playing: t.track.playing, paused: t.track.paused, open: t.drawerOpen, quality: t.track.quality };
});

before(async () => {
  d = await launch({ size: [1300, 1100], drive: disc(10, 180), names: NAMES });
  await d.app.evaluate(() => { global.cdCover = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='; });   // the Cover Art Archive's answer
});
after(async () => { await d?.close(); });

test('POWER plays the disc with its names', async () => {
  await d.cmds();
  await d.click(K('power'), 1500);
  const c = await cd();
  assert.equal(c.power, true); assert.equal(c.state, 'playing'); assert.equal(c.track, 1); assert.equal(c.total, 10);
  assert.equal(c.title, 'Tema 1'); assert.equal(c.artist, 'Soda Stereo · Canción Animal (1990)');
  assert.deepEqual((await d.cmds()).filter(x => x.startsWith('cd-')), ['cd-info', 'cd-play 1']);
  // 7.10.17: the disc's cover in the header, from the release MusicBrainz named
  await d.wait(1500);
  assert.deepEqual(await d.app.evaluate(() => global.coversAsked), [NAMES.release]);
  assert.deepEqual(await d.win.evaluate(() => [np && np.app, el('npCover').classList.contains('on'), el('npCover').src.startsWith('data:image/png')]), ['Deck 90 · CD', true, true]);
});

test('▶▶ and |◀◀ change songs; PAUSE, PLAY and STOP', async () => {
  await d.click(K('next')); assert.equal((await cd()).track, 2);
  await d.click(K('next')); assert.equal((await cd()).track, 3);
  await d.click(K('prev')); assert.equal((await cd()).track, 2);
  await d.cmds();
  await d.click(K('pause')); assert.equal((await cd()).state, 'paused', 'Windows says stopped: after a pause it is paused');
  const lamp = w => d.win.evaluate(w => cdUnit._indicators[w].children[0].getAttribute('fill') === cdUnit._indicators.disc.children[0].getAttribute('fill'), w);
  assert.equal(await lamp('pause'), true, 'PAUSE lights'); assert.equal(await lamp('play'), false);
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

test('the quality under the track count, and a long artist line scrolls', async () => {
  assert.equal((await cd()).quality, 'CD 16/44');
  await d.win.evaluate(() => { cdNames.album = 'Un Álbum Con Un Nombre Larguísimo Que No Entra En El Display'; cdUnitSync(); });
  const at = () => d.win.evaluate(() => cdUnit._artist.getAttribute('transform'));
  const a = await at(); await d.wait(2500); const b = await at();
  assert.match(a, /^translate\(391(\.000)? 92\)$/); assert.notEqual(b, a, 'it moves');
  await d.win.evaluate(names => { cdNames.album = names.album; cdUnitSync(); }, NAMES);
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
  assert.deepEqual(await d.win.evaluate(() => [cdUnit._cache.track, cdUnit._cache.total]), ['--', ''], 'no track while the tray is open');
  await d.click(K('eject'), 4500);
  c = await cd(); assert.equal(c.open, false); assert.equal(c.state, 'playing'); assert.equal(c.track, 1);
  assert.deepEqual((await d.cmds()).filter(x => x.startsWith('cd-')), ['cd-stop', 'cd-eject', 'cd-close', 'cd-info', 'cd-play 1']);
});

test('closing the tray: the disc is read as soon as it has spun up; a disc taken out by hand is noticed', async () => {
  await d.click(K('eject'), 600);
  await d.drive({ disc: { drive: 'E:', name: 'USB DVD', present: false, tracks: [], files: [] } });   // still spinning up
  await d.cmds();
  await d.click(K('eject'), 2600);
  assert.equal((await cd()).title, 'CLOSING…', 'not NO DISC while it spins up');
  await d.drive({ disc: disc(10, 180) });
  await d.wait(2400);
  const c = await cd(); assert.equal(c.state, 'playing'); assert.equal(c.track, 1);
  const sent = (await d.cmds()).filter(x => x.startsWith('cd-'));
  assert.deepEqual(sent.filter(x => x === 'cd-info').length, 2, sent.join()); assert.equal(sent.at(-1), 'cd-play 1');
  // the drive's own button opens the tray while it plays
  await d.driveSays({ state: 'open', track: 0, pos: 0 }); await d.wait(300);
  assert.equal((await cd()).title, 'NO DISC');
  await d.click(K('play'), 900);
  assert.ok((await d.cmds()).includes('cd-info'), 'PLAY reads the drive again');
  assert.equal((await cd()).state, 'playing');
});

test('a drive that doesn\'t answer is asked again; a second PLAY while it seeks doesn\'t seek again', async () => {
  await d.click(K('power'), 600);
  await d.drive({ deaf: true }); await d.cmds();
  await d.click(K('power'), 1000);
  assert.equal((await cd()).title, 'READING DISC…');
  await d.drive({ deaf: false });
  await d.wait(9000);
  const c = await cd(); assert.equal(c.state, 'playing', 'the second ask was answered and it plays');
  assert.equal((await d.cmds()).filter(x => x === 'cd-info').length, 2);
  await d.click(K('stop'), 400);
  await d.drive({ slow: true }); await d.cmds();
  await d.click(K('play'), 200); await d.click(K('play'), 1200);
  assert.deepEqual((await d.cmds()).filter(x => x.startsWith('cd-play')), ['cd-play 1']);
  await d.drive({ slow: false });
});

test('a disc whose names don\'t come at first gets them on the next read', async () => {
  const names8 = { album: 'Otro Disco', artist: 'Banda Inventada', year: '1993',
    tracks: Object.fromEntries(Array.from({ length: 8 }, (_, i) => [i + 1, { title: 'Canción ' + (i + 1), artist: 'Banda Inventada' }])) };
  // MusicBrainz doesn't answer the first time (the program has already asked it three times by then)
  await d.app.evaluate(({ ipcMain }, names) => { let n = 0; ipcMain.removeHandler('cd-names'); ipcMain.handle('cd-names', () => ++n === 1 ? { error: 'no answer in 30 s' } : names); }, names8);
  await d.drive({ disc: disc(8, 200) });
  await d.click(K('eject'), 900); await d.click(K('eject'), 4500);
  let c = await cd(); assert.equal(c.total, 8); assert.equal(c.title, 'AUDIO CD · TRACK 01');
  await d.click(K('eject'), 900); await d.click(K('eject'), 4500);
  c = await cd(); assert.equal(c.title, 'Canción 1'); assert.equal(c.artist, 'Banda Inventada · Otro Disco (1993)');
  await d.app.evaluate(({ ipcMain }, names) => { ipcMain.removeHandler('cd-names'); ipcMain.handle('cd-names', () => names); }, NAMES);
  await d.drive({ disc: disc(10, 180) });
});

test('the header and history follow the CD, and the cassette decks keys drive it, not the PC', async () => {
  if ((await cd()).state !== 'playing') { await d.click(K('play'), 1500); }
  await d.wait(1500);
  const head = () => d.win.evaluate(() => ({ app: np && np.app, title: el('npTitle').textContent, artist: el('npArtist').textContent, status: np && np.status }));
  let h = await head();
  assert.equal(h.app, 'Deck 90 · CD'); assert.equal(h.title, (await cd()).title, 'the song the DC-90 shows'); assert.ok(h.artist.length > 0);
  const from = (await cd()).track;
  await d.cmds();
  await d.win.evaluate(() => deckCmd('next')); await d.wait(1500);
  assert.equal((await cd()).track, from + 1);
  assert.equal((await head()).title, (await cd()).title);
  await d.win.evaluate(() => deckCmd('toggle')); await d.wait(1200);
  assert.equal((await cd()).state, 'paused'); assert.equal((await head()).status, 'Paused');
  await d.win.evaluate(() => deckCmd('play')); await d.wait(1200);
  assert.equal((await cd()).state, 'playing');
  const sent = await d.cmds();
  assert.ok(!sent.some(c => /^(play|pause|toggle|next|prev)$/.test(c)), sent.join());
  assert.ok(sent.includes('cd-play ' + (from + 1)) && sent.includes('cd-pause'), sent.join());
});

test('POWER off stops the disc', async () => {
  await d.click(K('power'), 600);
  const c = await cd(); assert.equal(c.power, false); assert.equal(c.title, 'COMPACT DISC');
});

test('a disc of MP3s plays its files', async () => {
  await d.drive({ disc: { drive: 'E:', name: 'USB DVD', present: true, tracks: [{ n: 1, audio: false, len: 0 }], files: [TONE, TONE] } });
  await d.click(K('power'), 1500);
  let c = await cd(); assert.equal(c.total, 2); assert.equal(c.track, 1); assert.equal(c.artist, 'MP3 DISC · 1 OF 2');
  assert.match(c.quality, /^MP3 \d{2,3}$/, 'its average kbps');
  await d.click(K('next'), 900); assert.equal((await cd()).track, 2);
  assert.equal(await d.win.evaluate(() => !cdAudio.paused), true);
  await d.click(K('pause')); assert.equal(await d.win.evaluate(() => cdAudio.paused), true);
  await d.click(K('power'), 600);
  // a disc of FLACs: their bits and kHz
  await d.drive({ disc: { drive: 'E:', name: 'USB DVD', present: true, tracks: [{ n: 1, audio: false, len: 0 }], files: [FLAC] } });
  await d.click(K('power'), 1500);
  c = await cd(); assert.equal(c.artist, 'FLAC DISC · 1 OF 1'); assert.equal(c.quality, 'FLAC 24/96');
  await d.click(K('power'), 600);
});

test('no disc, and no drive at all', async () => {
  await d.drive({ disc: { drive: 'E:', name: 'USB DVD', present: false, tracks: [], files: [] } });
  await d.click(K('power'), 1200);
  assert.equal((await cd()).title, 'NO DISC');
  await d.click(K('power'), 600);
  await d.drive({ disc: { drive: null } });
  await d.click(K('power'), 1200);
  assert.equal((await cd()).title, 'NO CD DRIVE');
  await d.win.keyboard.press('0'); await d.wait(400);
  assert.equal(await d.win.evaluate(() => getComputedStyle(cdUnitPanel).display), 'none');
  assert.deepEqual(d.errors(), []);
});
