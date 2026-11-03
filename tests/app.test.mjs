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
after(async () => { await d?.close(); });

test('starts with no errors and every module drawn', async () => {
  for (const sel of ['#tuner svg', '#cdUnit svg', '#np', '#hcDigits']) assert.ok(await d.win.locator(sel).count(), sel);
  assert.deepEqual(d.errors(), []);
});

test('the demo moves the VU and lights PEAK on its loudest moments only', async () => {
  await d.win.keyboard.press('d');
  await d.win.waitForFunction(() => vu.L.lvl > 0.3, null, { timeout: 15000 });   // the demo is up
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
  await d.drive({ t0: Date.now() - 30000 });                   // the drive 30 s into the song (its next report says so too)
  await d.win.evaluate(() => { cdState.pos = 30; cdState.at = performance.now(); });
  await press('prev', 1000); assert.equal((await tr())[1], 5, 'later in a song |◀◀ starts it over');
  assert.deepEqual(d.errors(), []);
});

test('the stereo\'s display: the song\'s number, the time left and CD 16/44; DISP; the volume big', async () => {
  const press = async (k, ms) => { await d.win.click(`.st-hot[data-st="${k}"]`); await d.wait(ms); };
  const texts = () => d.win.evaluate(() => [...document.querySelectorAll('#stDisplay text')].map(t => t.textContent));
  const title = () => d.win.evaluate(() => stereoDisplay.state.track.title);
  const n = await d.win.evaluate(() => cdState.track);
  let t = await texts();
  assert.ok(t.includes('CD 16/44') && t.includes(String(n)), t.join());
  assert.ok(t.some(x => /^-0[23]:\d\d$/.test(x)), 'the time left: ' + t.join());
  const disps = [];
  for (let i = 0; i < 5; i++) { await press('disp', 300); disps.push(await d.win.evaluate(() => stereoCfg.disp)); }
  assert.deepEqual(disps, ['clock', 'temp', 'clocktemp', 'time', 'song'], 'BPM and LOUDNESS are gone');
  await press('disp', 300); await press('disp', 300); await press('disp', 300); await press('disp', 300);   // TIEMPO
  const a = await title(); await d.wait(2200); const b = await title();
  assert.match(a, new RegExp('^0' + n + '  -[23]:\\d\\d$')); assert.notEqual(a, b, 'it counts down');
  await press('disp', 300);
  await press('volup', 40); assert.equal(await title(), 'VOL +');
  await d.wait(400); assert.equal(await title(), 'VOL 52', 'Windows\' own number');
  await press('voldown', 400); assert.equal(await title(), 'VOL 46');
  await press('att', 400); assert.equal(await title(), 'ATT');
  await press('att', 400); assert.equal(await title(), 'VOL 46');
  await d.wait(2300); assert.notEqual(await title(), 'VOL 46', 'and then the song again');
  // SDM held goes back one: the last three looks change the whole front (TITANIO, ESTUDIO, TOKIO), then the glass alone
  const front = () => d.win.evaluate(() => [document.querySelector('#stereo .st-face').dataset.face, getComputedStyle(document.querySelector('#stereo .st-photo')).filter]);
  await d.win.evaluate(() => { stereoCfg.color = 1; stereoPaint(); });
  const faces = [];
  for (let i = 0; i < 4; i++) { await d.hold('.st-hot[data-st="sdm"]'); faces.push(await front()); }
  assert.deepEqual(faces.map(f => f[0]), ['titan', 'pro', 'tokio', '']);
  assert.match(faces[0][1], /grayscale/); assert.equal(faces[3][1], 'none');
  await d.win.evaluate(() => { stereoCfg.color = 1; stereoPaint(); });
  assert.deepEqual(await front(), ['', 'none']);
  await d.win.keyboard.press('e'); await d.wait(1200);
  assert.deepEqual(d.errors(), []);
});
