// The DM-90 in the rack with a pretend Jellyfin server: signing in (the password isn't kept), the music library
// only, artists → albums → songs with their quality, playing an album, Q, REPEAT and SHUFFLE, the search, every
// song, and the radio taking the sound.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { launch } from './lib/app.mjs';
import { startJellyfin } from './lib/jellyfin.mjs';
import { startStation } from './lib/station.mjs';

let d, jf, station;
const K = k => `#jukebox g[data-key="${k}"]`;
const view = () => d.win.evaluate(() => ({ kind: jbView.kind, title: jbView.title, count: jbView.items.length, cursor: jbView.cursor,
  marked: (jbView.items[jbView.cursor] || {}).name, list: jb.getState().list, now: jb.getState().now }));
const press = async (k, ms = 300) => { await d.win.keyboard.press(k); await d.wait(ms); };

before(async () => {
  jf = await startJellyfin(); station = await startStation();
  d = await launch({ station, size: [1300, 1300] });
});
after(async () => { await d?.close(); await jf?.close(); await station?.close(); });

test('J shows the DM-90; POWER asks for the server; a wrong password says so', async () => {
  await d.win.keyboard.press('j'); await d.wait(600);
  assert.equal(await d.win.evaluate(() => getComputedStyle(jbPanel).display), 'block');
  await d.click(K('power'), 1000);
  assert.equal(await d.win.evaluate(() => document.getElementById('jbSetup').classList.contains('show')), true);
  await d.win.fill('#jbServer', jf.base); await d.win.fill('#jbUser', 'damian'); await d.win.fill('#jbPass', 'otra');
  await d.win.click('#jbGo'); await d.wait(1200);
  assert.match(await d.win.textContent('#jbSetupMsg'), /contraseña incorrectos/);
});

test('signed in, ARTISTS lists the music library only, and the password is not kept', async () => {
  await d.win.fill('#jbPass', 'secreto'); await d.win.click('#jbGo'); await d.wait(2000);
  assert.equal(await d.win.evaluate(() => document.getElementById('jbSetup').classList.contains('show')), false);
  const v = await view();
  assert.equal(v.kind, 'artists'); assert.equal(v.count, 30); assert.match(v.list.header, /^ARTISTS · 30$/);
  assert.ok(!jf.log.some(l => /lib-movies/.test(l)), 'never the movies');
  const file = path.join(await d.app.evaluate(({ app }) => app.getPath('userData')), 'jellyfin.json');
  const saved = fs.readFileSync(file, 'utf8');
  assert.match(saved, /tok-123/); assert.doesNotMatch(saved, /secreto/);
});

test('letters jump, ENTER opens an artist and an album; its songs say their length and quality', async () => {
  await d.win.hover('#jbPanel');
  await press('b'); await press('a');
  assert.equal((await view()).marked, 'Banda Inventada');
  await press('Enter', 1000);
  let v = await view();
  assert.equal(v.kind, 'artist'); assert.equal(v.count, 3); assert.match(v.title, /^Banda Inventada › ALBUMS/);
  await press('ArrowDown'); await press('Enter', 1000);
  v = await view();
  assert.equal(v.kind, 'album'); assert.equal(v.count, 8);
  assert.deepEqual(v.list.rows.slice(0, 2).map(r => [r.text, r.end]), [['01 Canción A de Banda Inventada', '2:30 FLAC 24/96'], ['02 Canción B de Banda Inventada', '2:50 MP3 320']]);
  await press('Backspace'); assert.equal((await view()).kind, 'artist');
  await press('Enter', 1000);
});

test('ENTER on a song plays the album from it, its name, artist and quality spelled out', async () => {
  await press('ArrowDown'); await press('ArrowDown'); await press('Enter', 2000);
  const v = await view(), s = await d.win.evaluate(() => ({ q: musicQueue.length, pos: musicPos, playing: musicPlaying(), src: musicAudio.src }));
  assert.deepEqual([s.q, s.pos, s.playing], [8, 2, true]);
  assert.match(s.src, /\/Audio\/c[0-9a-f]+\/stream\?static=true&api_key=tok-123$/);
  assert.equal(v.now.title, 'Canción C de Banda Inventada');
  assert.equal(v.now.artist, 'Banda Inventada · En Vivo En Ningún Lado (1984)');
  assert.equal(v.now.quality, 'FLAC LOSSLESS · 24 BIT / 96 KHZ · 4608 KBPS · STEREO');
  assert.equal(v.now.index, 3); assert.equal(v.now.total, 8);
});

test('Q puts the marked songs next, in the order chosen', async () => {
  await d.click(K('artists'), 800);
  await d.win.hover('#jbPanel');
  await press('z'); await press('Enter', 900); await press('Enter', 900);         // Zona Sur › Primer Disco
  await press('q'); await press('q');                                             // A, then B (Q moves to the next)
  const order = await d.win.evaluate(() => musicQueue.slice(musicPos, musicPos + 3).map(s => s.name));
  assert.deepEqual(order, ['Canción C de Banda Inventada', 'Canción A de Zona Sur', 'Canción B de Zona Sur']);
  await d.click(K('next'), 1200);
  assert.equal((await view()).now.title, 'Canción A de Zona Sur');
  await d.click(K('list'), 400);
  const v = await view();
  assert.equal(v.kind, 'list'); assert.equal(v.count, 10); assert.match(v.list.right, /^QUEUE 4\/10$/);
});

test('REPEAT all, one, off and SHUFFLE, remembered', async () => {
  const modes = () => d.win.evaluate(() => [musicModes.repeat, musicModes.shuffle, localStorage.getItem('deck90-music')]);
  await d.click(K('repeat'), 200); assert.equal((await modes())[0], 'all');
  await d.click(K('repeat'), 200); assert.equal((await modes())[0], 'one');
  await d.click(K('repeat'), 200); assert.equal((await modes())[0], 'off');
  await d.click(K('shuffle'), 200); assert.equal((await modes())[1], true);
  await d.click(K('shuffle'), 200);
  assert.equal((await modes())[2], '{"repeat":"off","shuffle":false}');
});

test('BUSCAR finds artists, albums and songs; TEMAS lists every song', async () => {
  await d.click(K('search'), 300);
  await d.win.hover('#jbPanel');
  await d.win.keyboard.type('pampa'); assert.equal((await view()).list.header, 'SEARCH: pampa_');
  await press('Enter', 1500);
  const v = await view();
  assert.equal(v.kind, 'search'); assert.equal(v.count, 1 + 24, 'the artist and its 24 songs');
  assert.deepEqual(v.list.rows[0], { text: 'Pampa Seca', sub: 'ARTIST', end: '', playing: false, dim: false });
  await d.click(K('songs'), 1500);
  assert.equal((await view()).count, 720);
});

test('the radio taking the sound pauses the music', async () => {
  await d.click(K('play'), 800);
  assert.equal(await d.win.evaluate(() => musicPlaying()), true);
  await d.win.evaluate(() => { tunerShow(true, true); tunerKey('m1'); }); await d.wait(3000);
  assert.deepEqual(await d.win.evaluate(() => [radioPlaying(), musicPlaying(), musicPaused()]), [true, false, true]);
  await d.click(K('play'), 1200);
  assert.deepEqual(await d.win.evaluate(() => [radioPlaying(), musicPlaying()]), [false, true], 'and PLAY takes it back');
  await d.click(K('power'), 600);
  assert.equal(await d.win.evaluate(() => musicPlaying()), false);
  assert.deepEqual(d.errors(), []);
});
