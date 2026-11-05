// The DE-90 in the rack: W shows it; EQ, the presets, ◀ ▶ − +, the knob and a column touched on its display shape
// the curve; the radio's sound really passes through the ten bands (a band cut is quieter, off is as it came), the
// stations' answers allowed to; remembered after a restart.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch } from './lib/app.mjs';
import { startStation } from './lib/station.mjs';

let station, d;
const K = k => `#equalizer g[data-key="${k}"]`;
const st = () => d.win.evaluate(() => ({ on: eqState.on, preset: eqState.preset, gains: eqState.gains.slice(), band: eqCfg.band, face: de.getState() }));
// the level out of the chain, averaged over a second
const level = async () => {
  let s = 0;
  for (let i = 0; i < 10; i++) { s += Math.pow(10, (await d.win.evaluate(() => eqLevel())) / 10); await d.wait(100); }
  return 10 * Math.log10(s / 10);
};

before(async () => {
  station = await startStation(); d = await launch({ station, size: [1300, 1300] });
  await d.win.evaluate(base => { radioMem.FM1[0] = { name: 'Test FM', freq: '99.1', q: 'Test FM', cc: 'AR', url: base + '/s' }; radioMem.band = 'FM1'; radioMem.slot = 1; }, station.base);
});
after(async () => { await d?.close(); await station?.close(); });

test('W shows the DE-90, off and FLAT, the radio not touched yet', async () => {
  assert.equal(await d.win.evaluate(() => getComputedStyle(eqPanel).display), 'none', 'hidden at first');
  await d.win.keyboard.press('w'); await d.wait(700);
  assert.equal(await d.win.evaluate(() => getComputedStyle(eqPanel).display), 'block');
  assert.equal(await d.win.evaluate(() => document.querySelector('#console button[data-v="eq"]').classList.contains('on')), true);
  const s = await st();
  assert.equal(s.on, false); assert.equal(s.preset, 'FLAT'); assert.deepEqual(s.face.gains, Array(10).fill(0));
  await d.win.evaluate(() => tunerKey('power')); await d.wait(4000);
  assert.equal(await d.win.evaluate(() => radioAudio.paused), false, 'the radio plays');
  assert.equal(await d.win.evaluate(() => eqGraph), null, 'no chain while it was never on');
});

test('EQ on: the radio passes through it, a band cut is quieter and off is as it came', async () => {
  await d.click(K('power'), 1500);
  assert.equal((await st()).on, true);
  const flat = await level();
  assert.ok(flat > -45, 'the sound reaches the chain: ' + flat.toFixed(1) + ' dBFS');
  // the band where the tone is: its loudest frequency
  const band = await d.win.evaluate(() => {
    const a = new Float32Array(eqGraph.tap.frequencyBinCount); eqGraph.tap.getFloatFrequencyData(a);
    const hz = a.indexOf(Math.max(...a)) * eqGraph.ctx.sampleRate / eqGraph.tap.fftSize;
    return EQ_BANDS.reduce((b, f, i) => Math.abs(Math.log(f / hz)) < Math.abs(Math.log(EQ_BANDS[b] / hz)) ? i : b, 0);
  });
  for (let i = 0; i < 10; i++) await d.click(K('left'), 60);   // ◀ ten times: back where it was
  while ((await st()).band !== band) await d.click(K('right'), 60);
  for (let i = 0; i < 12; i++) await d.click(K('down'), 80);
  let s = await st();
  assert.equal(s.preset, 'USER'); assert.equal(s.gains[band], -12);
  await d.wait(600);
  const cut = await level();
  assert.ok(cut < flat - 6, `cut ${cut.toFixed(1)} vs flat ${flat.toFixed(1)}`);
  await d.click(K('power'), 900);
  const off = await level();
  assert.ok(Math.abs(off - flat) < 1.5, `off ${off.toFixed(1)} is flat ${flat.toFixed(1)}`);
  assert.equal(await d.win.evaluate(() => radioAudio.paused), false, 'still playing');
});

test("a station's level (EVEN LEVEL) still applies through the chain", async () => {
  await d.click(K('power'), 600);
  await d.win.evaluate(() => eqPreset('FLAT')); await d.wait(600);
  const full = await level();
  await d.win.evaluate(() => { radioAudio.volume = .25; }); await d.wait(500);
  const quiet = await level();
  await d.win.evaluate(() => { radioAudio.volume = 1; });
  assert.ok(quiet < full - 8, `volume .25: ${quiet.toFixed(1)} vs ${full.toFixed(1)}`);
});

test('the presets, the knob and a column touched on the display', async () => {
  await d.click(K('rock'), 500);
  let s = await st();
  assert.equal(s.preset, 'ROCK'); assert.deepEqual(s.gains, await d.win.evaluate(() => EQ_PRESETS.ROCK));
  assert.equal(await d.win.evaluate(() => de._buttons.rock.led.getAttribute('opacity')), '.9', 'its lamp');
  // the knob turned to its right end: +12 on the band chosen
  const b = await d.win.locator('#equalizer [data-role="level-knob"]').boundingBox();
  const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
  await d.win.mouse.move(cx, cy - 5); await d.win.mouse.down(); await d.win.mouse.move(cx + b.width * .3, cy + b.height * .6, { steps: 4 }); await d.win.mouse.up(); await d.wait(400);
  s = await st();
  assert.equal(s.gains[s.band], 12); assert.equal(s.preset, 'USER');
  // the first column (31 Hz) touched at its bottom: −12, and it becomes the band chosen
  const c = await d.win.locator('#equalizer [data-role="curve"]').boundingBox();
  await d.win.mouse.click(c.x + c.width * .05, c.y + c.height - 3); await d.wait(400);
  s = await st();
  assert.equal(s.band, 0); assert.equal(s.gains[0], -12);
  // − at the floor stays at −12
  await d.click(K('down'), 300);
  assert.equal((await st()).gains[0], -12);
  // FLAT, then USER brings back the curve made by hand
  await d.click(K('flat'), 300);
  assert.deepEqual((await st()).gains, Array(10).fill(0));
  await d.click(K('user'), 300);
  s = await st();
  assert.equal(s.gains[0], -12); assert.equal(s.face.preset, 'USER');
});

test('COLOR and DIMMER reach it, remembered after a restart, no errors', async () => {
  await d.win.evaluate(() => { jbCfg.dim = 2; unitColorApply(); });
  assert.equal(await d.win.evaluate(() => eqPanel.classList.contains('dim-low')), true);
  await d.win.evaluate(() => { jbCfg.dim = 0; unitColorApply(); });
  await d.win.evaluate(() => setChassis('BLACK'));
  assert.equal(await d.win.evaluate(() => de.getState().theme), 'black');
  await d.win.evaluate(() => setChassis('TI'));
  const before = await st();
  await d.win.reload(); await d.wait(2500);
  const s = await st();
  assert.equal(await d.win.evaluate(() => getComputedStyle(eqPanel).display), 'block');
  assert.deepEqual([s.on, s.preset, s.gains, s.band], [before.on, before.preset, before.gains, before.band]);
  assert.deepEqual(d.errors(), []);
});
