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
    preset: r.preset, name: r.name, text: r.text, stereo: r.stereo, mono: r.mono, scan: r.scan, memo: r.memo, slot: radioMem.slot,
    quality: r.quality, place: r.place, corner: r.corner, cornerSub: r.cornerSub };
});

before(async () => { station = await startStation(); d = await launch({ station, size: [1300, 1100] }); });
after(async () => { await d?.close(); await station?.close(); });

test('POWER turns the radio on with its memory and pauses the PC', async () => {
  await d.win.evaluate(() => { npPc = { app: 'Spotless', status: 'Playing', title: 'Tema', artist: 'Banda' }; np = Object.assign(np || {}, npPc); });
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

test('band keys FM1 FM2 FM3 FM4 FM5 HI-FI AM, STEREO on FM, MONO on AM', async () => {
  for (const b of ['FM2', 'FM3', 'FM4', 'FM5', 'HIFI', 'AM', 'FM1']) {
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

test('MEMO then a number keeps the station; held, the numbers are 7–12 (MEMO and held keeps it there)', async () => {
  const name = await d.win.evaluate(() => radioNow.name);
  await d.click(K('memo'), 300);
  assert.equal((await radio()).memo, true);
  await d.click(K('m4'));
  let r = await radio();
  assert.equal(r.memo, false); assert.equal(r.preset, 4);
  assert.equal(await d.win.evaluate(() => radioMem.FM1[3].name), name);
  // MEMO, then 2 held: memory 8
  await d.click(K('memo'), 300); await d.hold(K('m2'));
  r = await radio();
  assert.equal(r.preset, 8);
  assert.equal(await d.win.evaluate(() => radioMem.FM1[7].name), name);
  // another station, then 2 held tunes memory 8 back, its lamp the 2's
  await d.click(K('m1'), 1500);
  assert.equal((await radio()).preset, 1);
  await d.hold(K('m2')); await d.wait(1500);
  r = await radio();
  assert.equal(r.preset, 8); assert.equal(await d.win.evaluate(() => radioNow.name), name);
  assert.match(await d.win.evaluate(() => document.querySelector('#tuner svg').getAttribute('aria-label')), /Memoria 8/);
  // an empty one held says how to fill it
  await d.hold(K('m6'));
  assert.equal(await d.win.evaluate(() => radioMem.slot), 8, 'memory 12 is empty: nothing changes');
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

test('one line with the station and its song, the quality after TUNED, the city under the memory', async () => {
  await d.click(K('m1'), 2500);
  const r = await radio();
  assert.match(r.name, /^Aspen · (Los Pericos|Soda Stereo|Charly García) - /); assert.equal(r.text, '');
  assert.equal(r.quality, 'MP3 128'); assert.equal(r.place, 'BS AS');
  await d.click(K('m2'), 2500);
  assert.equal((await radio()).place, 'GERMANY', 'a station from elsewhere: its country');
  await d.click(K('m1'), 2500);
});

test('MODE picks what follows the station; DISP the line; the clock top right; SLEEP and EVEN LEVEL held', async () => {
  const lines = [];
  for (let i = 0; i < 4; i++) { await d.click(K('mode'), 300); lines.push((await radio()).name); }
  assert.match(lines[0], /^Aspen · BUENOS AIRES, ARGENTINA · FM1 102\.3 MHZ$/); assert.equal(lines[1], 'Aspen · QUALITY MP3 · 128 KBPS');
  assert.match(lines[2], /^Aspen · .+ - .+ · BUENOS AIRES, ARGENTINA · FM1 102\.3 MHZ · QUALITY MP3 · 128 KBPS$/, 'all of it');
  assert.match(lines[3], /^Aspen · .+ - /);
  // the clock top right, and under it EVEN LEVEL's cut or the buffer
  let r = await radio();
  assert.match(r.corner, /^\d\d:\d\d$/); assert.match(r.cornerSub, /^(EVEN LEVEL -?\d+ DB|BUFFER \d+\.\d S)$/);
  await d.click(K('disp'), 300); r = await radio();
  assert.match(r.name, /^.+ - .+$/, 'the song alone: ' + r.name); assert.ok(!r.name.startsWith('Aspen'));
  await d.click(K('disp'), 300); assert.equal((await radio()).name, 'NO WEATHER');
  await d.click(K('disp'), 300); assert.match((await radio()).name, /^Aspen · ON THE AIR \d\d:\d\d:\d\d$/);
  await d.click(K('disp'), 300); assert.match((await radio()).name, /^Aspen · /);
  // DISP held: SLEEP 15, 30 …; off again after 90
  await d.hold(K('disp')); await d.wait(400);
  assert.equal((await radio()).cornerSub, 'SLEEP 15 MIN');
  await d.hold(K('disp')); await d.wait(400);
  assert.equal((await radio()).cornerSub, 'SLEEP 30 MIN');
  await d.win.evaluate(() => tunerSleep(0)); await d.wait(400);
  assert.ok(!/SLEEP/.test((await radio()).cornerSub));
  // the time runs out: the radio goes off
  await d.win.evaluate(() => { tunerSleep(15); clearTimeout(tunerSleepT); tunerSleepT = setTimeout(() => { tunerSleepAt = 0; tunerSleepMin = 0; tunerOn(false); }, 300); });
  await d.wait(1200);
  assert.equal(await d.win.evaluate(() => tunerPower || radioPlaying()), false);
  await d.click(K('power'), 2500);
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

test('SIGNAL shows how the stream is doing; MODE held turns EVEN LEVEL off and on', async () => {
  await d.click(K('m1'), 4000);
  const bars = await d.win.evaluate(() => tuner.getState().radio.signal);
  assert.ok(bars >= 1 && bars <= 5, 'bars ' + bars);
  // a stall a moment ago: one bar less
  const less = await d.win.evaluate(() => { const a = radioSignal(); radioStallAt = Date.now(); return [a, radioSignal()]; });
  assert.equal(less[1], Math.max(1, less[0] - 1));
  assert.equal(await d.win.evaluate(() => radioMem.even), true);
  await d.hold(K('mode'), 1300);
  assert.equal(await d.win.evaluate(() => radioMem.even && radioAudio.volume), false);
  assert.equal(await d.win.evaluate(() => radioAudio.volume), 1);
  await d.hold(K('mode'), 1300);
  assert.equal(await d.win.evaluate(() => radioMem.even), true);
  assert.deepEqual(d.errors(), []);
});

test('SCAN held searches any station in the world; one touched plays, a number keeps it', async () => {
  await d.hold(K('scan'), 1300);
  assert.equal(await d.win.evaluate(() => document.getElementById('rfFind').classList.contains('show')), true);
  await d.win.fill('#rfName', 'jazz'); await d.win.selectOption('#rfCountry', 'FR');
  await d.win.press('#rfName', 'Enter'); await d.wait(800);
  const items = await d.win.locator('#rfList .rf-item').allTextContents();
  assert.equal(items.length, 3);
  assert.match(items[0], /jazz Uno.*Île-de-France.*Francia.*MP3 128/);
  assert.match(items[1], /HI-FI · FLAC/);
  assert.deepEqual(await d.app.evaluate(() => global.searches.slice(-1)[0]), ['jazz', 'FR']);
  await d.win.locator('#rfList .rf-item').nth(1).click(); await d.wait(3000);
  const r = await d.win.evaluate(() => ({ name: radioNow.name, url: radioNow.url, slot: radioMem.slot, playing: radioPlaying() }));
  assert.equal(r.name, 'jazz Dos FLAC'); assert.match(r.url, /\?w1$/); assert.equal(r.slot, 0); assert.equal(r.playing, true);
  await d.win.click('#rfFind .rf-keep button[data-m="5"]'); await d.wait(300);
  assert.equal(await d.win.evaluate(() => radioMem[radioMem.band][4].name), 'jazz Dos FLAC');
  await d.win.press('#rfName', 'Escape'); await d.wait(200);
  assert.equal(await d.win.evaluate(() => document.getElementById('rfFind').classList.contains('show')), false);
  assert.deepEqual(d.errors(), []);
});
