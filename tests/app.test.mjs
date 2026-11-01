// The program as a whole: it starts clean, the views and modes switch, the demo moves the meters, and the car
// stereo plays the CD with quick skips.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, disc } from './lib/app.mjs';

let d;
const bounds = () => d.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].getContentBounds());
const modes = () => d.win.evaluate(() => ({ mini: miniMode, stereo: stereoMode }));

before(async () => {
  // a disc of five songs and a data track, on a drive that seeks slowly (as a USB one does)
  d = await launch({ drive: disc(5, 200, { tracks: [1, 2, 3, 4, 5].map(n => ({ n, audio: true, len: 200 })).concat([{ n: 6, audio: false, len: 300 }]) }) });
  await d.drive({ slow: true });
});
after(async () => { await d.close(); });

test('starts with no errors and every module drawn', async () => {
  for (const sel of ['#tuner svg', '#cdUnit svg', '#np', '#hcDigits']) assert.ok(await d.win.locator(sel).count(), sel);
  assert.deepEqual(d.errors(), []);
});

test('the demo moves the VU and lights PEAK on its loudest moments only', async () => {
  await d.win.keyboard.press('d'); await d.wait(3000);
  const r = await d.win.evaluate(() => new Promise(ok => { let lit = 0, n = 0, top = -99;
    const t = setInterval(() => { n++; if (vu.L.peakLamp) lit++; top = Math.max(top, vu.L.lvl); if (n >= 80) { clearInterval(t); ok({ lit, n, top }); } }, 50); }));
  assert.ok(r.top > 0.3, 'the needle moves: ' + r.top);
  assert.ok(r.lit < r.n * 0.5, `PEAK lit ${r.lit} of ${r.n}`);
  await d.win.keyboard.press('d'); await d.wait(500);
});

test('F1–F5 change the view; mini, stereo and back keep the window size', async () => {
  for (const k of ['F1', 'F2', 'F3', 'F4', 'F5', 'F1']) { await d.win.keyboard.press(k); await d.wait(400); }
  const normal = await bounds();
  await d.win.keyboard.press('p'); await d.wait(1200);
  assert.deepEqual(await modes(), { mini: true, stereo: false });
  assert.ok((await bounds()).height < normal.height / 2, 'mini is a strip');
  await d.win.keyboard.press('e'); await d.wait(1200);
  assert.deepEqual(await modes(), { mini: true, stereo: true });
  await d.win.keyboard.press('e'); await d.wait(1200);
  assert.deepEqual(await modes(), { mini: false, stereo: false });
  assert.deepEqual(await bounds(), normal);
  for (const k of ['v', 't', 'r', 'r', 'i', 'Escape', 'l', 'Escape']) { await d.win.keyboard.press(k); await d.wait(250); }
  assert.deepEqual(d.errors(), []);
});

test('the car stereo plays the CD: quick skips add up, data tracks are skipped, the ends wrap', async () => {
  const tr = () => d.win.evaluate(() => [cdState.state, cdState.track]);
  const press = async (k, ms) => { await d.win.click(`.st-hot[data-st="${k}"]`); await d.wait(ms); };
  await d.win.keyboard.press('e'); await d.wait(1200);
  await press('slot', 1200);
  assert.equal((await tr())[1], 1);
  await d.cmds();
  for (let i = 0; i < 3; i++) await press('next', 60);
  assert.equal((await tr())[1], 4, 'the jump shows at once');
  await d.wait(1200);
  assert.deepEqual(await tr(), ['playing', 4]);
  await press('next', 1000); assert.equal((await tr())[1], 5);
  await press('next', 1000); assert.equal((await tr())[1], 1, '6 is data: back to 1');
  await press('prev', 1000); assert.equal((await tr())[1], 5, 'from 1 back to 5');
  await d.win.evaluate(() => { cdState.pos = 30; cdState.at = performance.now(); });
  await press('prev', 1000); assert.equal((await tr())[1], 5, 'later in a song |◀◀ starts it over');
  await d.win.keyboard.press('e'); await d.wait(1200);
  assert.deepEqual(d.errors(), []);
});
