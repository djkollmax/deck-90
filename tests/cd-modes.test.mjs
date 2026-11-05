// REPEAT and SHUFFLE on a drive that plays the disc straight through, as Windows' CD audio does: the program
// jumps near a song's end only where the modes say, never where the disc goes by itself.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, disc } from './lib/app.mjs';

let d;
// plays from `from` with these modes until `done(heard)` says enough (or 45 s), and says what the drive did:
// "3j" a jump to 3, "4n" the disc going on to 4 by itself, END the disc's end, STOP a stop from the program
async function play(modes, from, done) {
  await d.win.evaluate(([m, n]) => { Object.assign(cdModes, m); cdState.track = n; if (m.shuffle) cdShuffleStart(); }, [modes, from]);
  await d.heard();
  await d.win.evaluate(() => cdUnitKey('play'));
  const h = [];
  for (const t0 = Date.now(); Date.now() - t0 < 45000 && !done(h);) { await d.wait(500); h.push(...(await d.heard()).split(' ').filter(Boolean)); }
  await d.win.evaluate(() => cdUnitKey('stop')); await d.wait(300); await d.heard();
  return h;
}
const ends = h => h.includes('END') || h.includes('STOP');
const songs = n => h => h.filter(x => /^\d/.test(x)).length >= n;

before(async () => {
  d = await launch({ drive: disc(4, 4) });                    // four songs of 4 s
  await d.win.evaluate(() => cdUnitKey('power')); await d.wait(1500);
  await d.win.evaluate(() => cdUnitKey('stop')); await d.wait(300);
});
after(async () => { await d?.close(); });

test('no modes: the disc plays through and ends', async () => {
  assert.deepEqual(await play({ repeat: 'off', shuffle: false }, 1, ends), ['1j', '2n', '3n', '4n', 'END']);
});

test('REPEAT all: from the last song back to the first', async () => {
  assert.deepEqual((await play({ repeat: 'all', shuffle: false }, 3, songs(4))).slice(0, 4), ['3j', '4n', '1j', '2n']);
});

test('REPEAT one: the same song again and again', async () => {
  assert.deepEqual((await play({ repeat: 'one', shuffle: false }, 2, songs(4))).slice(0, 4), ['2j', '2j', '2j', '2j']);
});

test('SHUFFLE: each song once, then it stops', async () => {
  const h = await play({ repeat: 'off', shuffle: true }, 1, ends);
  const songs = h.filter(x => /^\d/.test(x)).map(x => parseInt(x));
  assert.deepEqual([...songs].sort(), [1, 2, 3, 4]);
  // the program stops the drive after the last one drawn, unless that is the disc's last song: then the disc ends by itself
  assert.equal(h.at(-1), songs.at(-1) === 4 ? 'END' : 'STOP');
});

// 7.10.14: the drive's report of the disc's end can come before the program's jump near the last song's end
const atTheEnd = () => d.win.evaluate(() => { cdState = { state: 'playing', track: 4, pos: 3.9, at: performance.now() }; cdEndDone = '4'; });
test('the drive ending the disc first: REPEAT all still goes back to the first song', async () => {
  await d.win.evaluate(() => Object.assign(cdModes, { repeat: 'all', shuffle: false }));
  await d.cmds(); await atTheEnd();
  await d.driveSays({ state: 'stopped', track: 4, pos: 0 }); await d.wait(400);
  assert.ok((await d.cmds()).includes('cd-play 1'));
  await d.win.evaluate(() => cdUnitKey('stop')); await d.wait(300);
});

test('without modes the disc is over: back at the first song, and PLAY starts there', async () => {
  await d.win.evaluate(() => Object.assign(cdModes, { repeat: 'off', shuffle: false }));
  await d.cmds(); await atTheEnd();
  await d.driveSays({ state: 'stopped', track: 4, pos: 0 }); await d.wait(300);
  assert.deepEqual(await d.win.evaluate(() => [cdState.state, cdState.track]), ['stopped', 1]);
  assert.deepEqual((await d.cmds()).filter(x => x.startsWith('cd-')), [], 'nothing sent: it stopped by itself');
  await d.win.evaluate(() => cdUnitKey('play')); await d.wait(400);
  assert.deepEqual((await d.cmds()).filter(x => x.startsWith('cd-')), ['cd-play 1']);
  await d.win.evaluate(() => cdUnitKey('stop')); await d.wait(300);
});

test('a skip on its way is dropped by STOP; POWER off while seeking stops the drive', async () => {
  await d.win.evaluate(() => cdUnitKey('play')); await d.wait(1000); await d.cmds();
  await d.win.evaluate(() => cdUnitKey('next')); await d.wait(300);   // goes at once; the next one, quick after it, waits
  await d.win.evaluate(() => { cdUnitKey('next'); cdUnitKey('stop'); }); await d.wait(800);
  const sent = (await d.cmds()).filter(x => x.startsWith('cd-'));
  assert.equal(sent.at(-1), 'cd-stop', sent.join());
  assert.equal(await d.win.evaluate(() => cdState.state), 'stopped');
  await d.win.evaluate(() => { cdGo(3); cdUnitKey('power'); }); await d.wait(400);
  assert.equal((await d.cmds()).filter(x => x.startsWith('cd-')).at(-1), 'cd-stop', 'stopped while seeking');
  await d.win.evaluate(() => cdUnitKey('power')); await d.wait(1500);
  await d.win.evaluate(() => cdUnitKey('stop')); await d.wait(300);
});

test('SHUFFLE and REPEAT: a new draw after the four', async () => {
  const got = (await play({ repeat: 'all', shuffle: true }, 2, songs(5))).filter(x => /^\d/.test(x)).map(x => parseInt(x));
  assert.ok(got.length >= 5, got.join());
  assert.deepEqual(got.slice(0, 4).sort(), [1, 2, 3, 4]);
  assert.deepEqual(d.errors(), []);
});
