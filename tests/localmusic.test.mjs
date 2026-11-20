// The DM-90's PC and USB sources (7.10.24): the tags of every format read from the files' headers; SOURCE going
// SERVER → PC → USB; SETUP's PC tab adding a folder; the library made of its tags (and of its folders when there are
// none); a song played from the PC at its own quality; a pendrive plugged in taking over the quiet DM-90, and taken
// out while it plays; a song added to a folder showing up by itself; the queue kept when the program opens again.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { launch } from './lib/app.mjs';
import { mp3, flac, plain, fixture } from './lib/musicfiles.mjs';
const require = createRequire(import.meta.url);
const { readTags } = require('../electron/tags.js');

const top = fs.mkdtempSync(path.join(os.tmpdir(), 'deck90-music-'));
const pc = path.join(top, 'Música'), usb = path.join(top, 'PENDRIVE');
let d;
const K = k => `#jukebox g[data-key="${k}"]`;
const view = () => d.win.evaluate(() => ({ kind: jbView.kind, title: jbView.title, count: jbView.items.length, marked: (jbView.items[jbView.cursor] || {}).name,
  list: jb.getState().list, now: jb.getState().now, source: jb.getState().source, mode: musicModes.source }));
const press = async (k, ms = 300) => { await d.win.keyboard.press(k); await d.wait(ms); };
const use = async () => { const b = await d.win.locator('#jbPanel').boundingBox(); await d.win.mouse.click(b.x + b.width / 2, b.y + 4); await d.wait(100); };
const until = async (fn, ms = 15000) => { const t = Date.now(); for (;;) { const v = await fn(); if (v) return v; if (Date.now() - t > ms) return v; await d.wait(200); } };

before(async () => {
  for (let i = 1; i <= 3; i++) flac(path.join(pc, 'Zona Inventada', 'Primer Viaje (1991)', '0' + i + '.flac'), { title: 'Tramo ' + i, artist: 'Zona Inventada', album: 'Primer Viaje', track: i, year: 1991 });
  mp3(path.join(pc, 'Banda de Prueba', 'Lado B', 'a.mp3'), { title: 'Canción del Lado B', artist: 'Banda de Prueba', albumArtist: 'Banda de Prueba', album: 'Lado B', track: '1/2', year: 2003 });
  mp3(path.join(pc, 'Banda de Prueba', 'Lado B', 'b.mp3'), { title: 'Con Invitada', artist: 'Banda de Prueba feat. Otra', albumArtist: 'Banda de Prueba', album: 'Lado B', track: '2/2', year: 2003 });
  fs.copyFileSync(fixture('cover.jpg'), path.join(pc, 'Zona Inventada', 'Primer Viaje (1991)', 'cover.jpg'));   // a made-up cover, in the folder
  plain(path.join(pc, 'Sin Tags', 'Disco Casero', 'CD1', '01 - Arranque.mp3'));
  plain(path.join(pc, 'Sin Tags', 'Disco Casero', 'CD2', '01 - Final.mp3'));
  fs.copyFileSync(fixture('alac.m4a'), path.join(pc, 'Sin Tags', 'alac.m4a'));            // Chromium can't play ALAC: counted, not listed
  mp3(path.join(usb, 'Viajero', 'Ruta', '01.mp3'), { title: 'Por la Ruta', artist: 'Viajero', album: 'Ruta', track: 1 });
  mp3(path.join(usb, 'Viajero', 'Ruta', '02.mp3'), { title: 'Peaje', artist: 'Viajero', album: 'Ruta', track: 2 });
  d = await launch({ size: [1300, 1300] });
  // the folder chooser answers with the pretend library (a person would pick it in Windows' dialog)
  await d.app.evaluate(({ ipcMain }, dir) => { ipcMain.removeHandler('lm-pick'); ipcMain.handle('lm-pick', () => [dir]); }, pc);
});
after(async () => { await d?.close(); fs.rmSync(top, { recursive: true, force: true }); });

test('every format says its tags, length and quality from its headers; ALAC is not playable here', async () => {
  const t = async f => readTags(fixture(f));
  const mp = await t('tagged-cover.mp3');
  assert.deepEqual([mp.title, mp.artist, mp.album, mp.n, mp.disc, mp.year, mp.codec, mp.rate, mp.playable], ['Tema_Uno', 'Banda_Falsa', 'Disco_Falso', 3, 1, 1987, 'mp3', 44100, true]);
  assert.ok(mp.pic && mp.pic.mime === 'image/png' && mp.pic.len === 96, 'the cover inside it, found without reading it');
  assert.ok(Math.abs(mp.len - 1.54) < .05);
  const fl = await t('tagged-cover.flac');
  assert.deepEqual([fl.codec, fl.bits, fl.rate, fl.album, fl.pic && fl.pic.len], ['flac', 24, 44100, 'Disco_Falso', 96]);
  const m4 = await t('tagged.m4a');
  assert.deepEqual([m4.codec, m4.title, m4.n, m4.year, m4.playable, m4.pic && m4.pic.mime], ['aac', 'Tema_Uno', 3, 1987, true, 'image/png']);
  const al = await t('alac.m4a');
  assert.deepEqual([al.codec, al.playable], ['alac', false]);
  const og = await t('tagged.ogg'), op = await t('tagged.opus'), wv = await t('tagged.wav');
  assert.deepEqual([og.codec, og.title, Math.round(og.len * 10)], ['vorbis', 'Tema_Uno', 15]);
  assert.deepEqual([op.codec, op.rate, op.artist, Math.round(op.len * 10)], ['opus', 48000, 'Banda_Falsa', 15]);
  assert.deepEqual([wv.codec, wv.bits, wv.rate, wv.title, wv.len], ['pcm_s16le', 16, 22050, 'Tema_Uno', .5]);
});

test('SOURCE goes SERVER → PC; with no folders the PC tab of SETUP opens, and adding one reads it', async () => {
  await d.win.keyboard.press('j'); await d.wait(600);
  await d.click(K('power'), 900);
  assert.equal(await d.win.evaluate(() => document.querySelector('#jbSetup .jb-tab.on').dataset.tab), 'server', 'SERVER: the server tab');
  await d.win.click('#jbClose'); await d.wait(200);
  await d.click(K('source'), 800);
  let v = await view();
  assert.deepEqual([v.mode, v.source], ['pc', 'pc']);
  assert.equal(await d.win.evaluate(() => document.querySelector('#jbSetup .jb-tab.on').dataset.tab), 'pc');
  assert.match(await d.win.textContent('#jbFolders'), /Todavía no hay carpetas/);
  await d.win.click('#jbAddFolder');
  await until(() => d.win.evaluate(() => /temas · /.test(document.getElementById('jbPcStats').textContent)));
  assert.match(await d.win.textContent('#jbFolders'), /Música.*7 temas/);
  assert.match(await d.win.textContent('#jbPcStats'), /^7 temas · 3 álbumes · 3 artistas · 1 en formatos que no se pueden tocar/);
  await d.win.click('#jbClose'); await d.wait(800);
  v = await view();
  assert.equal(v.kind, 'artists'); assert.match(v.list.header, /^PC · ARTISTS · 3$/);
  assert.deepEqual(v.list.rows.map(r => r.text), ['Banda de Prueba', 'Sin Tags', 'Zona Inventada']);
});

test('the albums and songs come from the tags, or from the folders (CD1, CD2: one album)', async () => {
  await use();
  await press('s'); await press('Enter', 800);                    // Sin Tags: no tags at all, its folders name it
  let v = await view();
  assert.equal(v.kind, 'artist'); assert.equal(v.count, 1); assert.equal(v.marked, 'Disco Casero');
  await press('Enter', 800);
  v = await view();
  assert.deepEqual(v.list.rows.map(r => r.text), ['01 Arranque', '01 Final'], 'the number and name from the file, the two discs in order');
  await press('Backspace'); await press('Backspace');
  await press('z'); await press('Enter', 800); await press('Enter', 800);   // Zona Inventada › Primer Viaje
  v = await view();
  assert.match(v.title, /^Primer Viaje \(1991\)/);
  assert.deepEqual(v.list.rows.map(r => [r.text, r.end]), [['01 Tramo 1', '1:00 FLAC 24/96'], ['02 Tramo 2', '1:00 FLAC 24/96'], ['03 Tramo 3', '1:00 FLAC 24/96']]);
});

test('a song from the PC plays at its own quality, from the program itself; the stereo says PC', async () => {
  await press('ArrowDown'); await press('Enter', 2000);
  const s = await d.win.evaluate(() => ({ playing: musicPlaying(), src: musicAudio.src, q: musicQueue.length, from: musicNow().src }));
  assert.equal(s.playing, true); assert.equal(s.q, 3); assert.equal(s.from, 'pc');
  assert.match(s.src, /^http:\/\/127\.0\.0\.1:\d+\/[0-9a-f]{32}\/pc\/[0-9a-f]{32}\.flac$/);
  const v = await view();
  assert.equal(v.now.title, 'Tramo 2'); assert.equal(v.now.artist, 'Zona Inventada · Primer Viaje (1991)');
  assert.equal(v.now.quality, 'FLAC LOSSLESS · 24 BIT / 96 KHZ · 2 KBPS · STEREO');
  assert.equal(await d.win.evaluate(() => { const m = stereoCfg.mode; stereoCfg.mode = 'music'; const i = stereoInfo(); stereoCfg.mode = m; return i.source; }), 'PC');
  // another address in the program's server answers nothing
  const bad = await d.app.evaluate((_, u) => fetch(u.replace(/\/pc\/[0-9a-f]{32}/, '/pc/' + '0'.repeat(32))).then(r => r.status), s.src);
  assert.equal(bad, 404);
});

test('the cover: as tall as the header display, big with the mouse on it, and in dots on the DM-90 beside the title', async () => {
  const c = await until(() => d.win.evaluate(() => el('npCover').classList.contains('on') && el('npCover').getBoundingClientRect().height));
  assert.equal(c, 44, 'it was a 32 px thumbnail');
  await d.win.hover('#npCover'); await d.wait(500);
  const big = await d.win.evaluate(() => ({ on: el('npBig').classList.contains('on'), w: el('npBigImg').getBoundingClientRect().width,
    t: [el('npBigTitle').textContent, el('npBigArtist').textContent, el('npBigAlbum').textContent, el('npBigQuality').textContent] }));
  assert.deepEqual(big, { on: true, w: 280, t: ['Tramo 2', 'Zona Inventada', 'Primer Viaje · 1991', 'FLAC LOSSLESS · 24 BIT / 96 KHZ · 2 KBPS · STEREO'] });
  await d.win.mouse.move(600, 900); await d.wait(300);
  assert.equal(await d.win.evaluate(() => el('npBig').classList.contains('on')), false, 'the mouse away, it goes');
  await d.win.click('#npCover'); await d.wait(300);
  assert.equal(await d.win.evaluate(() => el('npBig').classList.contains('pinned')), true, 'touched, it stays');
  await d.win.keyboard.press('Escape'); await d.wait(200);
  assert.equal(await d.win.evaluate(() => el('npBig').classList.contains('on')), false);
  const dots = await until(() => d.win.evaluate(() => jb._coverDots.map(p => (p.getAttribute('d') || '').split('M').length - 1).reduce((a, b) => a + b, 0) > 100 && { x: jb._tx, clip: +jb.svg.querySelector('#' + jb.prefix + '-title-clip rect').getAttribute('x') }));
  assert.deepEqual(dots, { x: 487, clip: 486 }, 'the title moves right of the cover');
  // 7.10.26: a dark cover (its darkest dot just below zero after rounding) drew a solid bright triangle
  const lit = await d.win.evaluate(() => new Promise(done => {
    const c = document.createElement('canvas'); c.width = c.height = 240; const g = c.getContext('2d');
    g.fillStyle = 'rgb(7,7,13)'; g.fillRect(0, 0, 240, 240); g.fillStyle = 'rgb(240,200,40)'; g.fillRect(90, 70, 60, 110);
    const keep = window.jbSync; window.jbSync = () => {};
    jb.setCover(c.toDataURL('image/png'));
    setTimeout(() => { const n = jb._coverDots.map(p => (p.getAttribute('d') || '').split('M').length - 1); window.jbSync = keep; done(n); }, 600);
  }));
  assert.ok(lit[2] < 120 && lit[2] > 20, 'only the bright square is bright: ' + lit);
  await use();
});

test('a pendrive plugged in with the DM-90 quiet: it goes to USB by itself; taken out while playing, the music stops', async () => {
  await d.click(K('stop'), 400);
  await d.app.evaluate((_, p) => global.localMusic.pretendDrives([{ path: p, name: 'PENDRIVE' }]), usb);
  const v = await until(async () => { const x = await view(); return x.mode === 'usb' && x.kind === 'artists' && x.count === 1 && x; });
  assert.ok(v, 'USB with its artist'); assert.match(v.list.header, /^USB · ARTISTS · 1$/);
  assert.ok(d.toasts().some(t => /USB · PENDRIVE enchufado/.test(t)));
  await use(); await press('Enter', 800); await press('Enter', 800); await press('Enter', 1500);
  assert.equal(await d.win.evaluate(() => musicPlaying() && musicNow().src), 'usb');
  await d.app.evaluate(() => global.localMusic.pretendDrives([]));
  await until(() => d.win.evaluate(() => !musicPlaying()));
  assert.equal(await d.win.evaluate(() => musicPlaying()), false);
  assert.ok(d.toasts().some(t => /el pendrive se sacó/.test(t)));
  assert.match((await view()).now.title, /^NO USB$/);
  await d.click(K('source'), 800);                                // USB → SERVER again
  assert.equal((await view()).mode, 'server');
  await d.win.click('#jbClose');
});

test('a song added to a folder shows up by itself', async () => {
  await d.click(K('source'), 800);                                // SERVER → PC
  mp3(path.join(pc, 'Banda Nueva', 'Recién', '01.mp3'), { title: 'Recién Llegada', artist: 'Banda Nueva', album: 'Recién' });
  const n = await until(() => d.win.evaluate(() => musicLocal.pc.songs === 8 && jbView.kind === 'artists' && jbView.items.length), 20000);
  assert.equal(n, 4, 'its artist in the list');
});

test('closed and opened again, the queue is there, at the same song', async () => {
  await use(); await press('z'); await press('Enter', 800); await press('Enter', 800); await press('ArrowDown'); await press('ArrowDown'); await press('Enter', 2500);
  const before = await d.win.evaluate(() => ({ name: musicNow().name, q: musicQueue.length, pos: musicPos }));
  assert.deepEqual(before, { name: 'Tramo 3', q: 3, pos: 2 });
  await d.wait(1200);
  await d.win.reload();
  await d.win.waitForFunction(() => typeof jbKey === 'function' && typeof musicQueue !== 'undefined', null, { timeout: 20000 });
  await d.wait(1500);
  const after = await d.win.evaluate(() => ({ name: musicNow() && musicNow().name, q: musicQueue.length, pos: musicPos, src: musicNow() && musicNow().src, mode: musicModes.source }));
  assert.deepEqual(after, { name: 'Tramo 3', q: 3, pos: 2, src: 'pc', mode: 'pc' });
  await d.click(K('power'), 1000);
  assert.equal((await view()).now.title, 'Tramo 3', 'on, the display has it ready');
  await d.click(K('play'), 2000);
  assert.equal(await d.win.evaluate(() => musicPlaying() && musicNow().name), 'Tramo 3', 'PLAY goes on with it');
  assert.deepEqual(d.errors(), []);
});
