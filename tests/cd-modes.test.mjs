// REPEAT and SHUFFLE on a drive that plays the disc straight through, as Windows' CD audio does: the program
// jumps near a song's end only where the modes say, never where the disc goes by itself.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, disc } from './lib/app.mjs';

let d;
// plays from `from` with these modes for `secs`, and says what the drive did: "3j" a jump to 3, "4n" the disc
// going on to 4 by itself, END the disc's end, STOP a stop from the program
async function play(modes, from, secs) {
  await d.win.evaluate(([m, n]) => { Object.assign(cdModes, m); cdState.track = n; if (m.shuffle) cdShuffleStart(); }, [modes, from]);
  await d.heard();
  await d.win.evaluate(() => cdUnitKey('play'));
  await d.wait(secs * 1000);
  const h = await d.heard();
  await d.win.evaluate(() => cdUnitKey('stop')); await d.wait(300);
  return h.split(' ').filter(Boolean);
}

before(async () => {
  d = await launch({ drive: disc(4, 4) });                    // four songs of 4 s
  await d.win.evaluate(() => cdUnitKey('power')); await d.wait(1500);
  await d.win.evaluate(() => cdUnitKey('stop')); await d.wait(300);
});
after(async () => { await d.close(); });

test('no modes: the disc plays through and ends', async () => {
  assert.deepEqual(await play({ repeat: 'off', shuffle: false }, 1, 18), ['1j', '2n', '3n', '4n', 'END']);
});

test('REPEAT all: from the last song back to the first', async () => {
  assert.deepEqual((await play({ repeat: 'all', shuffle: false }, 3, 13)).slice(0, 4), ['3j', '4n', '1j', '2n']);
});

test('REPEAT one: the same song again and again', async () => {
  assert.deepEqual((await play({ repeat: 'one', shuffle: false }, 2, 13)).slice(0, 4), ['2j', '2j', '2j', '2j']);
});

test('SHUFFLE: each song once, then it stops', async () => {
  const h = await play({ repeat: 'off', shuffle: true }, 1, 19);
  const songs = h.filter(x => /^\d/.test(x)).map(x => parseInt(x));
  assert.deepEqual([...songs].sort(), [1, 2, 3, 4]); assert.equal(h.at(-1), 'STOP');
});

test('SHUFFLE and REPEAT: a new draw after the four', async () => {
  const songs = (await play({ repeat: 'all', shuffle: true }, 2, 22)).filter(x => /^\d/.test(x)).map(x => parseInt(x));
  assert.ok(songs.length >= 5, songs.join());
  assert.deepEqual(songs.slice(0, 4).sort(), [1, 2, 3, 4]);
  assert.deepEqual(d.errors(), []);
});
