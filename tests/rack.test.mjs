// The tuner and the CD as two units of one rack: both stay on, one sounds at a time, the other waits dimmer.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, disc } from './lib/app.mjs';
import { startStation } from './lib/station.mjs';

let station, d;
const both = () => d.win.evaluate(() => ({
  cd: { power: cdUnitPower, state: cdState.state, idle: cdUnitPanel.classList.contains('idle') },
  radio: { power: tunerPower, playing: radioPlaying(), idle: tunerPanel.classList.contains('idle'), text: tuner.getState().radio.text },
}));

before(async () => { station = await startStation(); d = await launch({ station, drive: disc(10, 180) }); });
after(async () => { await d?.close(); await station?.close(); });

test('the radio taking the sound pauses the CD, which stays on', async () => {
  await d.win.evaluate(() => cdUnitKey('power')); await d.wait(1500);
  await d.win.evaluate(() => tunerKey('power')); await d.wait(2500);
  const s = await both();
  assert.equal(s.radio.playing, true);
  assert.deepEqual(s.cd, { power: true, state: 'paused', idle: true });
});

test('PLAY on the CD silences the radio, which stays on showing it waits', async () => {
  await d.win.evaluate(() => cdUnitKey('play')); await d.wait(1500);
  const s = await both();
  assert.equal(s.cd.state, 'playing'); assert.equal(s.cd.idle, false);
  assert.deepEqual(s.radio, { power: true, playing: false, idle: true, text: 'EN ESPERA · SUENA EL CD' });
});

test('a memory or a band key brings the radio back, the CD pauses again', async () => {
  for (const k of ['m2', 'band-fm2']) {
    await d.win.evaluate(() => cdUnitKey('play')); await d.wait(1200);
    await d.win.evaluate(k => tunerKey(k), k); await d.wait(2500);
    const s = await both();
    assert.equal(s.radio.playing, true, k); assert.equal(s.cd.state, 'paused', k); assert.equal(s.cd.power, true, k);
  }
});

test('each goes off only with its own POWER', async () => {
  await d.win.evaluate(() => cdUnitKey('power')); await d.wait(800);
  let s = await both();
  assert.equal(s.cd.power, false); assert.equal(s.radio.playing, true);
  await d.win.evaluate(() => tunerKey('power')); await d.wait(800);
  s = await both();
  assert.equal(s.radio.power, false); assert.equal(s.radio.text, 'STANDBY');
  assert.deepEqual(d.errors(), []);
});
