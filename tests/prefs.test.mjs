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
    tunerKey('mode'); tunerKey('disp');                                    // line: station, display: the song alone
    cdUnitKey('repeat'); cdUnitKey('shuffle');                             // REPEAT all, SHUFFLE
    cdUnitCfg.remain = true; stereoCfg.color = 9; stereoCfg.dim = 2; savePrefs();
    radioMem.FM2[5] = { name: 'Guardada', freq: '104.3', q: 'Guardada', cc: 'AR', url: '', codec: '', kbps: 0 }; radioMem.band = 'AM'; saveRadio();
  });
  await reload();
  assert.deepEqual(await d.win.evaluate(() => ({ line: tunerCfg.line, disp: tunerCfg.disp, modes: { ...cdModes }, remain: cdUnitCfg.remain,
    color: stereoCfg.color, dim: stereoCfg.dim, saved: radioMem.FM2[5] && radioMem.FM2[5].name, band: radioMem.band })),
    { line: 'station', disp: 'song', modes: { repeat: 'all', shuffle: true }, remain: true, color: 9, dim: 2, saved: 'Guardada', band: 'AM' });
  assert.equal(await d.win.evaluate(() => cdUnit._remain), true, 'the DC-90 counts down again');
});

test('damaged settings give the defaults and no errors', async () => {
  await d.win.evaluate(() => { for (const k of ['deck90-prefs', 'deck90-radio', 'deck90-cdmodes', 'deck90-clock']) localStorage.setItem(k, '{broken'); });
  await reload();
  assert.deepEqual(await d.win.evaluate(() => ({ line: tunerCfg.line, modes: { ...cdModes }, band: radioMem.band, fm1: radioMem.FM1[0].name, mode: stereoCfg.mode })),
    { line: 'song', modes: { repeat: 'off', shuffle: false }, band: 'FM1', fm1: 'Aspen', mode: 'pc' });
  assert.deepEqual(d.errors(), []);
});

// 7.10.16
test('a held key acts once (a module key held toggles it once, not at key-repeat speed)', async () => {
  const vu = () => d.win.evaluate(() => mods.vu);
  const was = await vu();
  await d.win.evaluate(() => {
    const k = (key, repeat) => document.dispatchEvent(new KeyboardEvent('keydown', { key, repeat, bubbles: true }));
    k('1', false); for (let i = 0; i < 9; i++) k('1', true);       // 1 held: ten keydowns, nine of them repeats
  });
  await d.wait(300);
  assert.equal(await vu(), !was, 'toggled once, not ten times');
  await d.win.evaluate(() => toggleModule('vu')); await d.wait(200);
});

test('Z, then a module by hand: TAPE ONLY ends (its button, Z and a look saved see what is on screen)', async () => {
  await d.win.keyboard.press('z'); await d.wait(400);
  assert.equal(await d.win.evaluate(() => !!modsBeforeTape), true);
  await d.win.keyboard.press('1'); await d.wait(400);
  assert.deepEqual(await d.win.evaluate(() => [!!modsBeforeTape, mods.vu, mods.tape, document.querySelector('#console button[data-v="tapeonly"]').classList.contains('on')]),
    [false, true, true, false]);
  assert.deepEqual(await d.win.evaluate(() => presetSnapshot().mods.spectrum), false, 'a look saved now has only what shows');
  await d.win.keyboard.press('z'); await d.wait(300);                 // Z again: tape only once more, not the set from before
  assert.equal(await d.win.evaluate(() => Object.entries(mods).filter(([, v]) => v).map(([k]) => k).join()), 'tape');
  await d.win.keyboard.press('z'); await d.wait(300);
});

test('the settings copy carries the saved songs, the equalizer and the CD and DM-90 modes', async () => {
  await d.win.evaluate(() => { store.write('deck90-saved', [{ title: 'Uno', artist: 'Alguien', at: 1 }]); eqPreset('ROCK'); cdModesSave(); });
  const data = await d.win.evaluate(() => JSON.parse(backupText()).data);
  for (const k of ['deck90-saved', 'deck90-eq', 'deck90-cdmodes', 'deck90-prefs']) assert.ok(k in data, k);
  assert.equal(data['deck90-saved'][0].title, 'Uno');
  assert.deepEqual(Object.keys(await d.win.evaluate(t => backupRead(t), await d.win.evaluate(() => backupText()))).includes('deck90-saved'), true);
  assert.deepEqual(d.errors(), []);
});

test('the history window: its rows stay put while it is open (a tooltip or a selection no longer vanishes)', async () => {
  await d.win.evaluate(async () => {
    for (let i = 0; i < 3; i++) await histStore.add({ id: 'test' + i, at: Date.now() - i * 60000, title: 'Tema ' + i, artist: 'Alguien', album: '', app: 'Spotless', dur: 200, i: -9, lra: 5, tp: -1, pk: -1, bpm: 120, spot: -5 });
    showHistory(true);
  });
  await d.wait(700);
  await d.win.evaluate(() => { window.__row = document.querySelector('#histBody tr:not(.live)'); });
  assert.equal(await d.win.evaluate(() => document.querySelectorAll('#histBody tr').length), 3);
  await d.wait(2200);
  assert.equal(await d.win.evaluate(() => !!window.__row && window.__row.isConnected), true, 'the same row, not made again');
  await d.win.evaluate(() => showHistory(false));
  assert.deepEqual(d.errors(), []);
});
