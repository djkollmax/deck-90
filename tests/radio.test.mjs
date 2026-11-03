// The radio through the program's own proxy: the song the station sends and its quality reach the tuner, the
// car stereo and the phone; the phone's keys work the PC.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch } from './lib/app.mjs';
import { startStation, SONGS } from './lib/station.mjs';

let station, d;
const tunerShows = () => d.win.evaluate(() => { const r = tuner.getState().radio; return { name: r.name, text: r.text, quality: r.quality }; });

before(async () => {
  station = await startStation(); d = await launch({ station });
  await d.win.evaluate(base => {
    radioMem.FM1[0] = { name: 'Test FM', freq: '99.1', q: 'Test FM', cc: 'AR', url: base + '/s' };
    radioMem.FM1[1] = { name: 'Sin BR', freq: '', q: 'Sin BR', cc: 'AR', url: base + '/nobr' };
    radioMem.band = 'FM1'; radioMem.slot = 1;
  }, station.base);
});
after(async () => { await d?.close(); await station?.close(); });

test('the song and the quality the station sends show on the tuner', async () => {
  await d.win.evaluate(() => tunerKey('power')); await d.wait(4000);
  assert.ok(await d.win.evaluate(() => radioAudio.src.startsWith('http://127.0.0.1:') && !radioAudio.src.includes(':9')), 'through the proxy');
  const { name, quality } = await tunerShows();
  assert.ok(SONGS.some(s => name === 'Test FM · ' + s), name);
  assert.equal(quality, 'MP3 128');
});

test('a station without its rate gets it measured', async () => {
  await d.win.evaluate(() => tunerKey('m2')); await d.wait(14000);
  assert.match((await tunerShows()).quality, /^MP3 1[0-9]{2}$/);
});

test('a break in the stream is bridged: the sound goes on, nothing to reconnect', async () => {
  await d.win.evaluate(() => tunerKey('m1')); await d.wait(4000);
  await station.drop();
  for (const t0 = Date.now(); Date.now() - t0 < 6000;) {
    assert.equal(await d.win.evaluate(() => radioTrouble), '', 'no RECONNECTING');
    await d.wait(200);
  }
  assert.equal(await d.win.evaluate(() => radioPlaying()), true);
  assert.ok(await d.win.evaluate(() => Date.now() - radioStallAt < 10000), 'the break is noted (SIGNAL one bar less)');
});

test('a station that goes off the air is tuned again by itself (RECONECTANDO), then plays on', async () => {
  await d.win.evaluate(() => tunerKey('m1')); await d.wait(3000);
  const seen = new Set();
  station.down(9000); await station.drop();
  for (const t0 = Date.now(); Date.now() - t0 < 40000;) {
    const s = await d.win.evaluate(() => ({ trouble: radioTrouble, text: tuner.getState().radio.text, playing: radioPlaying() }));
    if (s.trouble) seen.add(s.text);
    if (seen.size && !s.trouble && s.playing) break;
    await d.wait(100);
  }
  assert.ok(seen.has('RECONNECTING…'), [...seen].join());
  assert.equal(await d.win.evaluate(() => radioPlaying() && !radioTrouble), true, 'back on the air');
});

test('the best stream of a station plays: FLAC over AAC over MP3; a saved one is checked once', async () => {
  await d.app.evaluate(() => { global.findAnswer = (q, base) => [
    { name: q + ' 64k', url: base + '/s?aac64', codec: 'AAC', bitrate: 64 },
    { name: q, url: base + '/s?mp3', codec: 'MP3', bitrate: 128 },
    { name: 'Otra Radio', url: base + '/s?otra', codec: 'FLAC', bitrate: 900 },
    { name: q + ' FLAC', url: base + '/s?flac', codec: 'FLAC', bitrate: 0 },
    { name: q + ' HQ', url: base + '/s?aac', codec: 'AAC', bitrate: 192 }]; });
  await d.win.evaluate(() => { radioMem.FM1[2] = { name: 'Nueva', freq: '', q: 'Nueva', cc: 'AR', url: '' }; tunerKey('m3'); });
  await d.wait(4000);
  assert.match(await d.win.evaluate(() => radioMem.FM1[2].url), /\?flac$/);
  // saved before, an MP3 64: a better address of the same station takes its place, once
  await d.app.evaluate(() => { global.finds = []; });
  await d.win.evaluate(base => { radioMem.FM1[3] = { name: 'Vieja', freq: '', q: 'Vieja', cc: 'AR', url: base + '/s?old', codec: 'MP3', kbps: 64 }; tunerKey('m4'); }, station.base);
  await d.wait(4000);
  assert.match(await d.win.evaluate(() => radioMem.FM1[3].url), /\?flac$/);
  assert.equal(await d.win.evaluate(() => radioMem.FM1[3].hq), 1);
  await d.win.evaluate(() => tunerKey('m1')); await d.wait(2500);
  await d.win.evaluate(() => tunerKey('m4')); await d.wait(2500);
  assert.deepEqual(await d.app.evaluate(() => global.finds), ['Vieja'], 'looked up once');
  await d.app.evaluate(() => { global.findAnswer = null; });
  await d.win.evaluate(() => tunerKey('m1')); await d.wait(2500);
});

test('radio songs go to the header and the history; the deck keys go through the memories', async () => {
  await d.win.evaluate(() => tunerKey('m1')); await d.wait(4500);
  const head = await d.win.evaluate(() => ({ title: el('npTitle').textContent, artist: el('npArtist').textContent, app: np && np.app }));
  assert.equal(head.app, 'Deck 90 · Radio');
  assert.ok(SONGS.some(s => s === head.artist.split(' · ')[0] + ' - ' + head.title), JSON.stringify(head));
  assert.match(head.artist, /Test FM 99\.1/);
  // ▶▶ on the deck: the next memory of the band, ❚❚ stops it waiting, ▶ puts it back
  await d.win.evaluate(() => npSourceNow.cmd('next')); await d.wait(3000);
  assert.equal(await d.win.evaluate(() => radioMem.slot), 2);
  await d.win.evaluate(() => npSourceNow.cmd('toggle')); await d.wait(1500);
  assert.equal(await d.win.evaluate(() => radioPlaying()), false);
  assert.equal(await d.win.evaluate(() => np && np.status), 'Paused');
  await d.win.evaluate(() => npSourceNow.cmd('play')); await d.wait(3000);
  assert.equal(await d.win.evaluate(() => radioPlaying() && radioMem.slot), 2);
  assert.ok(!(await d.cmds()).some(c => /^(play|pause|toggle|next|prev)$/.test(c)), 'the PC player is left alone');
});

test('a station that can\'t be found says NO SIGNAL', async () => {
  await d.app.evaluate(({ ipcMain }) => { ipcMain.removeHandler('radio-find'); ipcMain.handle('radio-find', () => []); });
  await d.win.evaluate(() => { radioMem.FM1[2] = { name: 'Muda', freq: '', q: 'Muda', cc: 'AR', url: '' }; tunerKey('m3'); });
  await d.wait(1500);
  assert.equal((await tunerShows()).text, 'NO SIGNAL');
  await d.win.evaluate(() => tunerKey('m1')); await d.wait(2500);
});

test('the car stereo opens on the radio, on its band and dial', async () => {
  await d.win.evaluate(() => tunerKey('m1')); await d.wait(2500);
  await d.win.evaluate(() => toggleStereo()); await d.wait(2000);
  const label = await d.win.evaluate(() => document.querySelector('#stDisplay svg').getAttribute('aria-label'));
  assert.equal(await d.win.evaluate(() => stereoCfg.mode), 'radio');
  assert.match(label, /Radio FM1 99\.1/);
  // 7.9.21: the quality at the bottom, LOCAL in red
  const foot = await d.win.evaluate(() => [...document.querySelectorAll('#stDisplay text')].map(t => t.textContent + '=' + t.getAttribute('fill')));
  assert.ok(foot.includes('MP3 128=#ffdd50'), foot.join()); assert.ok(foot.includes('LOCAL=#ff1e1e'), foot.join());
  await d.win.evaluate(() => toggleStereo()); await d.wait(1200);
});

test('the stereo window keeps its face shape at any size: no black round it', async () => {
  await d.win.evaluate(() => toggleStereo()); await d.wait(2000);
  const ratio = 2001 / 539;
  const look = () => d.win.evaluate(() => { const f = document.querySelector('.st-face').getBoundingClientRect(); return { w: innerWidth, h: innerHeight, fw: f.width, fh: f.height }; });
  for (const [w, h] of [[1200, 270], [700, 300], [400, 100], [1500, 600]]) {
    await d.app.evaluate(({ BrowserWindow }, [w, h]) => BrowserWindow.getAllWindows()[0].setContentSize(w, h), [w, h]);
    await d.wait(900);
    const s = await look();
    assert.ok(Math.abs(s.h - s.w / ratio) <= 1.5, `${w}×${h} asked, ${s.w}×${s.h} kept`);
    assert.ok(s.w >= 480, 'never narrower than 480');
    assert.ok(Math.abs(s.fw - s.w) <= 1 && Math.abs(s.fh - s.h) <= 2, `the face fills it: ${JSON.stringify(s)}`);
  }
  await d.win.evaluate(() => toggleStereo()); await d.wait(1500);
  assert.ok((await look()).h >= 600, 'the rack comes back at its own size');
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
