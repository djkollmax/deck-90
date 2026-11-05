// The DV-90 in the rack: the computer's volume shown and set from its knob, keys and wheel, MUTE, and the volume
// changed elsewhere (the keyboard's keys, Windows' slider) followed on its display.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch } from './lib/app.mjs';

let d;
const K = k => `#volume g[data-key="${k}"]`;
const shown = () => d.win.evaluate(() => dv.getState());
const pc = () => d.app.evaluate(() => global.volume || null);

before(async () => { d = await launch({ size: [1300, 1100] }); });
after(async () => { await d?.close(); });

test('U shows the DV-90, reading the computer volume', async () => {
  assert.equal(await d.win.evaluate(() => getComputedStyle(volPanel).display), 'none', 'hidden at first');
  await d.win.keyboard.press('u'); await d.wait(800);
  assert.equal(await d.win.evaluate(() => getComputedStyle(volPanel).display), 'block');
  assert.deepEqual(await d.vols(), ['vol-get']);
  const s = await shown();
  assert.equal(s.vol, 50); assert.equal(s.mute, false);
  assert.equal(await d.win.evaluate(() => document.querySelector('#console button[data-v="volume"]').classList.contains('on')), true);
});

test('+ and − step 2, the numbered keys set it, the wheel steps too', async () => {
  await d.click(K('up'), 600);
  assert.equal((await shown()).vol, 52); assert.equal((await pc()).vol, 52);
  await d.click(K('down'), 300); await d.click(K('down'), 600);
  assert.equal((await pc()).vol, 48);
  await d.click(K('p30'), 600);
  assert.equal((await shown()).vol, 30); assert.equal((await pc()).vol, 30);
  const b = await d.win.locator('#volume svg').boundingBox();
  await d.win.mouse.move(b.x + b.width * .5, b.y + b.height * .5);
  await d.win.mouse.wheel(0, -100); await d.wait(600);
  assert.equal((await pc()).vol, 32, 'a notch up');
});

test('the knob: dragged to the top it is 50, to the right end 100', async () => {
  const b = await d.win.locator('#volume [data-role="volume-knob"]').boundingBox();
  const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
  await d.win.mouse.move(cx, cy - 5); await d.win.mouse.down(); await d.win.mouse.move(cx, cy - b.height * .45, { steps: 4 }); await d.win.mouse.up(); await d.wait(600);
  assert.ok(Math.abs((await pc()).vol - 50) <= 2, 'top: ' + (await pc()).vol);
  await d.win.mouse.move(cx, cy - 5); await d.win.mouse.down(); await d.win.mouse.move(cx + b.width * .3, cy + b.height * .6, { steps: 4 }); await d.win.mouse.up(); await d.wait(600);
  assert.equal((await pc()).vol, 100);
});

test('MUTE silences it and back, its lamp lit', async () => {
  await d.click(K('mute'), 600);
  assert.equal((await pc()).mute, true); assert.equal((await shown()).mute, true);
  assert.equal(await d.win.evaluate(() => dv._buttons.mute.led.getAttribute('fill')), '#ff5f4f');
  await d.click(K('mute'), 600);
  assert.equal((await pc()).mute, false);
});

test('a volume changed elsewhere shows; COLOR and DIMMER reach it; remembered', async () => {
  await d.wait(1600);
  await d.app.evaluate(({ BrowserWindow }) => { global.volume = { vol: 17, mute: false }; BrowserWindow.getAllWindows()[0].webContents.send('volume', { vol: 17, mute: false }); });
  await d.wait(400);
  assert.equal((await shown()).vol, 17);
  await d.win.evaluate(() => { jbCfg.color = 'amber'; unitColorApply(); });
  assert.equal(await d.win.evaluate(() => getComputedStyle(volPanel).getPropertyValue('--vfd').trim()), '#ffb84a');
  assert.equal(await d.win.evaluate(() => JSON.parse(localStorage.getItem('deck90-prefs')).volume.show), true);
});

// 7.10.15: COLOR and DIMMER on the DV-90 too (they were only on the DM-90), and ⚙ PANTALLA's swatches and BRILLO
test('COLOR and DIMMER on the DV-90 work the whole rack, with no DM-90', async () => {
  const vfd = () => d.win.evaluate(() => ['tunerPanel', 'cdPanel', 'volPanel'].map(id => getComputedStyle(document.getElementById(id)).getPropertyValue('--vfd').trim()));
  assert.equal(await d.win.evaluate(() => jb), null, 'the DM-90 was never shown');
  await d.click(K('color'), 300);                                  // amber → green
  assert.deepEqual(await vfd(), ['#8cff5a', '#8cff5a', '#8cff5a']);
  assert.equal(await d.win.evaluate(() => HC_ON), '#8cff5a', 'the clock too');
  await d.hold(K('color'), 900);
  assert.equal(await d.win.evaluate(() => jbCfg.color), 'amber', 'held: the one before');
  await d.click(K('dimmer'), 300);
  assert.equal(await d.win.evaluate(() => [jbCfg.dim, volPanel.classList.contains('dim-max')].join()), '1,true');
  await d.click(K('dimmer'), 300); await d.click(K('dimmer'), 300);
  assert.equal(await d.win.evaluate(() => jbCfg.dim), 0);
});

test('⚙ PANTALLA: a swatch per colour and BRILLO, lit as the keys leave them', async () => {
  await d.win.evaluate(() => setDrawer(true)); await d.wait(500);
  const sw = '#console .seg[data-group="vfd"] button';
  assert.equal(await d.win.locator(sw).count(), await d.win.evaluate(() => UNIT_COLORS.length));
  assert.ok(await d.win.evaluate(() => UNIT_COLORS.length) >= 24, 'ten more colours');
  assert.equal(await d.win.getAttribute(sw + '.on', 'data-v'), 'amber');
  await d.click(sw + '[data-v="magenta"]', 300);
  assert.equal(await d.win.evaluate(() => [jbCfg.color, getComputedStyle(eqPanel).getPropertyValue('--vfd').trim()].join()), 'magenta,#ff4fdc');
  assert.equal(await d.win.getAttribute(sw + '.on', 'data-v'), 'magenta');
  await d.click('#console .seg[data-group="vfddim"] button[data-v="2"]', 300);
  assert.equal(await d.win.evaluate(() => [jbCfg.dim, volPanel.classList.contains('dim-low')].join()), '2,true');
  await d.win.evaluate(() => setDrawer(false)); await d.wait(400);
  await d.click(K('dimmer'), 300);                                 // the key moves the drawer's light too
  assert.equal(await d.win.getAttribute('#console .seg[data-group="vfddim"] button.on', 'data-v'), '0');
  assert.deepEqual(await d.win.evaluate(() => { const p = JSON.parse(localStorage.getItem('deck90-prefs')).jukebox; return [p.color, p.dim]; }), ['magenta', 0]);
});

test('the DE-90 sits above the DV-90; U hides it, no errors', async () => {
  await d.win.keyboard.press('w'); await d.wait(600);
  const [e, v] = await d.win.evaluate(() => [eqPanel.getBoundingClientRect().top, volPanel.getBoundingClientRect().top]);
  assert.ok(e < v, `equalizer ${e} above volume ${v}`);
  await d.win.keyboard.press('u'); await d.wait(500);
  assert.equal(await d.win.evaluate(() => getComputedStyle(volPanel).display), 'none');
  assert.deepEqual(d.errors(), []);
});
