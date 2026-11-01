// What's saved comes back after a restart, and damaged settings fall back to the defaults without errors.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch } from './lib/app.mjs';

let d;
const reload = async () => {
  await d.win.reload();
  await d.win.waitForFunction(() => typeof tunerKey === 'function' && typeof cdUnitKey === 'function', null, { timeout: 20000 });
  await d.wait(800);
};

before(async () => { d = await launch(); });
after(async () => { await d?.close(); });

test('the tuner, the CD, the stereo and the radio memories come back after a restart', async () => {
  await d.win.evaluate(() => cdUnitKey('power')); await d.wait(800);   // (a key on a unit that's off only wakes it)
  await d.win.evaluate(() => {
    tunerKey('mode'); tunerKey('disp');                                    // line: station, display: clock
    cdUnitKey('repeat'); cdUnitKey('shuffle');                             // REPEAT all, SHUFFLE
    cdUnitCfg.remain = true; stereoCfg.color = 9; stereoCfg.dim = 2; savePrefs();
    radioMem.FM2[5] = { name: 'Guardada', freq: '104.3', q: 'Guardada', cc: 'AR', url: '', codec: '', kbps: 0 }; radioMem.band = 'AM'; saveRadio();
  });
  await reload();
  assert.deepEqual(await d.win.evaluate(() => ({ line: tunerCfg.line, disp: tunerCfg.disp, modes: { ...cdModes }, remain: cdUnitCfg.remain,
    color: stereoCfg.color, dim: stereoCfg.dim, saved: radioMem.FM2[5] && radioMem.FM2[5].name, band: radioMem.band })),
    { line: 'station', disp: 'clock', modes: { repeat: 'all', shuffle: true }, remain: true, color: 9, dim: 2, saved: 'Guardada', band: 'AM' });
  assert.equal(await d.win.evaluate(() => cdUnit._remain), true, 'the DC-90 counts down again');
});

test('damaged settings give the defaults and no errors', async () => {
  await d.win.evaluate(() => { for (const k of ['deck90-prefs', 'deck90-radio', 'deck90-cdmodes', 'deck90-clock']) localStorage.setItem(k, '{broken'); });
  await reload();
  assert.deepEqual(await d.win.evaluate(() => ({ line: tunerCfg.line, modes: { ...cdModes }, band: radioMem.band, fm1: radioMem.FM1[0].name, mode: stereoCfg.mode })),
    { line: 'song', modes: { repeat: 'off', shuffle: false }, band: 'FM1', fm1: 'Aspen', mode: 'pc' });
  assert.deepEqual(d.errors(), []);
});
