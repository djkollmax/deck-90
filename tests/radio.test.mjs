// The radio through the program's own proxy: the song the station sends and its quality reach the tuner, the
// car stereo and the phone; the phone's keys work the PC.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch } from './lib/app.mjs';
import { startStation, SONGS } from './lib/station.mjs';

let station, d;
const tunerText = () => d.win.evaluate(() => tuner.getState().radio.text);

before(async () => {
  station = await startStation(); d = await launch({ station });
  await d.win.evaluate(base => {
    radioMem.FM1[0] = { name: 'Test FM', freq: '99.1', q: 'Test FM', cc: 'AR', url: base + '/s' };
    radioMem.FM1[1] = { name: 'Sin BR', freq: '', q: 'Sin BR', cc: 'AR', url: base + '/nobr' };
    radioMem.band = 'FM1'; radioMem.slot = 1;
  }, station.base);
});
after(async () => { await d.close(); await station.close(); });

test('the song and the quality the station sends show on the tuner', async () => {
  await d.win.evaluate(() => tunerKey('power')); await d.wait(4000);
  assert.ok(await d.win.evaluate(() => radioAudio.src.startsWith('http://127.0.0.1:') && !radioAudio.src.includes(':9')), 'through the proxy');
  const text = await tunerText();
  assert.ok(SONGS.some(s => text.startsWith(s)), text);
  assert.match(text, /· MP3 128$/);
});

test('a station without its rate gets it measured', async () => {
  await d.win.evaluate(() => tunerKey('m2')); await d.wait(14000);
  assert.match(await tunerText(), /MP3 1[0-9]{2}$/);
});

test('the car stereo opens on the radio, on its band and dial', async () => {
  await d.win.evaluate(() => tunerKey('m1')); await d.wait(2500);
  await d.win.evaluate(() => toggleStereo()); await d.wait(2000);
  const label = await d.win.evaluate(() => document.querySelector('#stDisplay svg').getAttribute('aria-label'));
  assert.equal(await d.win.evaluate(() => stereoCfg.mode), 'radio');
  assert.match(label, /Radio FM1 99\.1/);
  await d.win.evaluate(() => toggleStereo()); await d.wait(1200);
});

test('the phone shows the stereo and its keys work the PC', async () => {
  const { chromium } = await import('./lib/app.mjs').then(m => m.playwrightModule());
  const st = await d.win.evaluate(() => new Promise(ok => { window.phoneDisplay.on(s => { if (s.on && s.urls.length) ok(s); }); window.phoneDisplay.set(true); }));
  const url = st.urls[0].replace(/http:\/\/[^:]+:/, 'http://127.0.0.1:');
  const br = await chromium.launch();
  try {
    const ph = await (await br.newContext({ viewport: { width: 915, height: 412 }, hasTouch: true })).newPage();
    const errs = []; ph.on('pageerror', e => errs.push(e.message));
    await ph.goto(url); await ph.waitForTimeout(1500);
    await ph.evaluate(() => setView(VIEWS.indexOf('view-stereo'))); await ph.waitForTimeout(1500);
    const tap = async k => { const b = await ph.locator(`.st-hot[data-st="${k}"]`).boundingBox(); await ph.mouse.click(b.x + b.width / 2, b.y + b.height / 2); };
    await tap('m3'); await ph.waitForTimeout(3000);
    assert.equal(await d.win.evaluate(() => radioMem.slot), 3);
    const band = await d.win.evaluate(() => radioMem.band);
    await tap('band'); await ph.waitForTimeout(3000);
    assert.notEqual(await d.win.evaluate(() => radioMem.band), band);
    assert.match(await ph.evaluate(() => document.querySelector('#stDisplay svg').getAttribute('aria-label')), /\S/);
    assert.deepEqual(errs, []);
  } finally { await br.close(); await d.win.evaluate(() => window.phoneDisplay.set(false)); }
  assert.deepEqual(d.errors(), []);
});
