// The DT-90 in the rack: every key and the knob, as a person clicks them.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch } from './lib/app.mjs';
import { startStation } from './lib/station.mjs';

let station, d;
const K = k => `#tuner g[data-key="${k}"]`;
const radio = () => d.win.evaluate(() => {
  const r = tuner.getState().radio;
  return { power: tunerPower, playing: radioPlaying(), band: radioMem.band, shown: r.band, freq: r.frequency, label: r.label,
    preset: r.preset, name: r.name, text: r.text, stereo: r.stereo, mono: r.mono, scan: r.scan, memo: r.memo, slot: radioMem.slot };
});

before(async () => { station = await startStation(); d = await launch({ station, size: [1300, 1100] }); });
after(async () => { await d?.close(); await station?.close(); });

test('POWER turns the radio on with its memory and pauses the PC', async () => {
  await d.win.evaluate(() => { np = Object.assign(np || {}, { status: 'Playing', title: 'Tema', artist: 'Banda' }); });
  await d.cmds();
  await d.click(K('power'), 2000);
  const r = await radio();
  assert.equal(r.power, true); assert.equal(r.playing, true);
  assert.equal(r.band, 'FM1'); assert.equal(r.preset, 1);
  assert.ok((await d.cmds()).includes('pause'), 'the PC player is paused');
});

test('memory keys tune their station', async () => {
  for (const m of [3, 6, 1]) {
    await d.click(K('m' + m), 1200);
    const r = await radio();
    assert.equal(r.preset, m); assert.equal(r.playing, true);
  }
});

test('band keys FM1 FM2 FM3 FM4 AM, STEREO on FM, MONO on AM', async () => {
  for (const b of ['FM2', 'FM3', 'FM4', 'AM', 'FM1']) {
    await d.click(K('band-' + b.toLowerCase()), 1500);
    const r = await radio();
    assert.equal(r.band, b, 'band ' + b);
    assert.equal(r.playing, true, b + ' plays');
    assert.equal(r.stereo, b !== 'AM'); assert.equal(r.mono, b === 'AM');
  }
});

test('a station only on the internet shows its name big and no needle', async () => {
  await d.click(K('band-fm3'), 1500);
  const r = await radio();
  assert.equal(r.freq, null); assert.ok(r.label.length > 0);
  assert.equal(await d.win.evaluate(() => tuner.svg.querySelector('[data-role="needle"]').getAttribute('opacity')), '0');
  await d.click(K('band-fm1'), 1500);
});

test('the needle points at the frequency on the dial', async () => {
  for (const [band, slot] of [['FM2', 1], ['FM2', 5], ['AM', 1], ['AM', 6]]) {
    await d.win.evaluate(([b, s]) => { tunerBand(b); radioMemory(s); }, [band, slot]);
    await d.wait(1500);
    const [want, read] = await d.win.evaluate(() => {
      const r = tuner.getState().radio, n = tuner.svg.querySelector('[data-role="needle"]');
      const x = Number(/translate\(([\d.]+)/.exec(n.getAttribute('transform'))[1]);
      return [r.frequency, r.band === 'AM' ? 530 + (x - 65) / 789 * 1180 : 87.5 + (x - 65) / 789 * 20.5];
    });
    if (want !== null) assert.ok(Math.abs(read - want) < (band === 'AM' ? 3 : 0.06), `${band}-${slot}: ${want} read ${read}`);
  }
  await d.win.evaluate(() => { tunerBand('FM1'); radioMemory(1); }); await d.wait(1200);
});

test('◀ ▶ and the knob step through the most heard stations', async () => {
  await d.click(K('tune-up'), 1500);
  let r = await radio();
  assert.equal(r.preset, 0); assert.match(r.name, /La 100|Radio 10|Cadena 3/);
  const first = r.name;
  await d.click(K('tune-up'), 1500);
  assert.notEqual((await radio()).name, first);
  await d.click(K('tune-down'), 1500);
  assert.equal((await radio()).name, first);
  const b = await d.win.locator('#tuner [data-role="tuning-knob"]').boundingBox();
  await d.win.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await d.win.mouse.wheel(0, -100); await d.wait(1200);
  assert.notEqual((await radio()).name, first);
});

test('holding a memory key stores the station; MEMO then a number does too', async () => {
  await d.hold(K('m5'));
  let r = await radio();
  assert.equal(r.preset, 5);
  const name = r.name;
  assert.equal(await d.win.evaluate(() => radioMem.FM1[4].name), name);
  await d.click(K('memo'), 300);
  assert.equal((await radio()).memo, true);
  await d.click(K('m4'));
  r = await radio();
  assert.equal(r.memo, false); assert.equal(r.preset, 4);
  assert.equal(await d.win.evaluate(() => radioMem.FM1[3].name), name);
});

test('SCAN moves on by itself and SCAN again stays', async () => {
  await d.click(K('m1'), 1200);
  await d.click(K('scan'), 300);
  assert.equal((await radio()).scan, true);
  const was = (await radio()).name;
  await d.wait(9000);
  assert.notEqual((await radio()).name, was, 'SCAN moved on');
  await d.click(K('scan'), 300);
  assert.equal((await radio()).scan, false);
});

test('MODE picks the line under the name; DISP the clock and the weather', async () => {
  await d.click(K('m1'), 1500);
  const lines = [];
  for (let i = 0; i < 3; i++) { await d.click(K('mode'), 300); lines.push((await radio()).text); }
  assert.match(lines[0], /FM1 .*MHZ/); assert.match(lines[1], /KBPS|CALIDAD/);
  await d.click(K('disp'), 300); assert.match((await radio()).name, /^\d\d:\d\d$/);
  await d.click(K('disp'), 300); assert.equal((await radio()).name, 'SIN CLIMA');
  await d.click(K('disp'), 300); assert.notEqual((await radio()).name, 'SIN CLIMA');
  assert.equal(await d.win.evaluate(() => tuner.svg.querySelector('[data-key="mode"] rect:last-child').getAttribute('opacity')), '.22', 'MODE has no lamp');
});

test('POWER off silences it and gives the PC back; a memory or band key wakes it', async () => {
  await d.cmds();
  await d.click(K('power'), 800);
  let r = await radio();
  assert.equal(r.power, false); assert.equal(r.playing, false); assert.equal(r.text, 'STANDBY');
  assert.ok((await d.cmds()).includes('play'), 'the PC player goes on');
  await d.click(K('m2'), 1500);
  r = await radio(); assert.equal(r.power, true); assert.equal(r.playing, true); assert.equal(r.preset, 2);
  await d.click(K('power'), 800);
  await d.click(K('band-fm3'), 1500);
  r = await radio(); assert.equal(r.power, true); assert.equal(r.band, 'FM3');
  await d.click(K('power'), 800);
});

test('9 hides the tuner and the RADIO button shows it again', async () => {
  await d.win.keyboard.press('9'); await d.wait(500);
  assert.equal(await d.win.evaluate(() => getComputedStyle(tunerPanel).display), 'none');
  await d.win.evaluate(() => tunerShow(true, true)); await d.wait(500);
  assert.equal(await d.win.evaluate(() => getComputedStyle(tunerPanel).display), 'block');
  assert.deepEqual(d.errors(), []);
});
