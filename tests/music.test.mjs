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
// a click on the DM-90's plate (above its display) gives it the keyboard
const use = async () => { const b = await d.win.locator('#jbPanel').boundingBox(); await d.win.mouse.click(b.x + b.width / 2, b.y + 4); await d.wait(100); };

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
  assert.equal(v.kind, 'artists'); assert.equal(v.count, 31, 'both music libraries'); assert.match(v.list.header, /^ARTISTS · 31$/);
  assert.ok(!jf.log.some(l => /a1b2c3d4000000000000000000000003/.test(l)), 'never the movies');
  const file = path.join(await d.app.evaluate(({ app }) => app.getPath('userData')), 'jellyfin.json');
  const saved = fs.readFileSync(file, 'utf8');
  assert.match(saved, /tok-123/); assert.doesNotMatch(saved, /secreto/);
});

test('letters jump, ENTER opens an artist and an album; its songs say their length and quality', async () => {
  await use();
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
  await use();
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
  assert.equal((await modes())[2], '{"repeat":"off","shuffle":false,"library":""}');
});

test('SEARCH finds as you type, any words in any field; ESC keeps the results, BACK returns to them', async () => {
  await d.click(K('search'), 1500);                                // the first time it reads the whole library
  await use();
  await d.win.keyboard.type('pampa'); await d.wait(400);
  let v = await view();
  assert.equal(v.list.header, 'SEARCH: pampa_'); assert.equal(v.list.right, '1 ARTIST · 3 ALBUMS · 24 SONGS');
  assert.equal(v.count, 28 + 3, 'in three groups, each under its title');
  assert.deepEqual(v.list.rows.slice(0, 2).map(r => r.text), ['── ARTISTS · 1 ──', 'Pampa Seca']); assert.equal(v.list.rows[2].text, '── ALBUMS · 3 ──');
  assert.equal(v.marked, 'Pampa Seca', 'the first found is marked, not the title');
  await d.win.keyboard.type(' vivo h'); await d.wait(400);          // words from the album and the song, accents aside
  v = await view();
  assert.equal(v.count, 2); assert.equal(v.list.rows[1].text, 'Canción H de Pampa Seca'); assert.equal(v.list.right, '1 SONG');
  await press('Escape');
  v = await view();
  assert.equal(v.list.header, 'SEARCH “pampa vivo h” · 1');
  await d.click(K('search'), 300); await use();
  for (let i = 0; i < 7; i++) await press('Backspace', 30);
  await d.wait(300); await press('Enter', 1000);                    // the artist, opened from the results
  assert.equal((await view()).kind, 'artist');
  await d.click(K('back'), 300);
  assert.equal((await view()).list.header, 'SEARCH “pampa” · 28');
});

test('SONGS lists every song, and its scroll bar drags through them', async () => {
  await d.click(K('songs'), 1500);
  assert.equal((await view()).count, 723);
  const bar = await d.win.locator('#jukebox [data-role="scrollbar"]').boundingBox();
  await d.win.mouse.move(bar.x + bar.width / 2, bar.y + 3); await d.win.mouse.down();
  await d.win.mouse.move(bar.x + bar.width / 2, bar.y + bar.height / 2, { steps: 5 }); await d.wait(100);
  const mid = (await view()).list.top;
  await d.win.mouse.move(bar.x + bar.width / 2, bar.y + bar.height + 20, { steps: 5 }); await d.win.mouse.up(); await d.wait(100);
  const end = (await view()).list.top;
  assert.ok(mid > 250 && mid < 470, 'half way: ' + mid); assert.equal(end, 713, 'the end');
  await d.win.mouse.click(bar.x + bar.width / 2, bar.y + 2); await d.wait(100);
  assert.equal((await view()).list.top, 0, 'a click at the top jumps there');
});

test('COLOR changes the displays of the whole rack and the header, DIMMER their brightness, both remembered', async () => {
  const hdr = () => d.win.evaluate(() => [getComputedStyle(document.getElementById('npTitle')).color, HC_ON, document.documentElement.classList.contains('hdr-dim-low')]);
  assert.deepEqual((await hdr()).slice(1), ['#80ffe5', false]);
  const vfd = () => d.win.evaluate(() => ['tunerPanel', 'cdPanel', 'jbPanel'].map(id => getComputedStyle(document.getElementById(id)).getPropertyValue('--vfd').trim()));
  assert.deepEqual(await vfd(), ['#80ffe5', '#80ffe5', '#80ffe5']);
  await d.click(K('color'), 200);
  assert.deepEqual(await vfd(), ['#ffb84a', '#ffb84a', '#ffb84a'], 'amber on the tuner, the CD and the DM-90');
  const h = await hdr();
  assert.equal(h[1], '#ffb84a', 'the clock in amber too');
  assert.match(h[0], /^rgb\(255, 19\d, 9\d\)$/, 'and the song in the header: ' + h[0]);
  await d.hold(K('color'));
  assert.deepEqual(await vfd(), ['#80ffe5', '#80ffe5', '#80ffe5'], 'held: the one before');
  await d.click(K('color'), 200);
  const dim = () => d.win.evaluate(() => [jbCfg.dim, jb._display.getAttribute('opacity'), jb._display.getAttribute('filter')]);
  assert.match((await dim())[2], /vfd-glow-hi/, 'bright, with a halo');
  await d.click(K('dimmer'), 200); assert.equal((await dim())[0], 1);
  await d.click(K('dimmer'), 200); assert.deepEqual((await dim()).slice(0, 2), [2, '.6']);
  assert.deepEqual(await d.win.evaluate(() => ['tunerPanel', 'cdPanel'].map(id => getComputedStyle(document.querySelector('#' + id + ' [data-role="display"]')).opacity)), ['0.55', '0.55'], 'the tuner and the CD dim too');
  assert.equal((await hdr())[2], true, 'and the header');
  await d.click(K('dimmer'), 200);
  assert.deepEqual(await d.win.evaluate(() => { const p = JSON.parse(localStorage.getItem('deck90-prefs')).jukebox; return [p.color, p.dim]; }), ['amber', 0]);
});

test('SHUFFLE ALL plays the whole library at random', async () => {
  await d.click(K('all'), 1500);
  const s = await d.win.evaluate(() => ({ q: musicQueue.length, shuffle: musicModes.shuffle, playing: musicPlaying(), kind: jbView.kind }));
  assert.deepEqual(s, { q: 723, shuffle: true, playing: true, kind: 'list' });
  await d.click(K('shuffle'), 200);
});

test('the header shows what the DM-90 plays; the stereo has it as SERVER, and gives it back to the rack', async () => {
  const now = await d.win.evaluate(() => musicNow().name);
  await d.wait(1200);
  assert.equal(await d.win.textContent('#npTitle'), now);
  assert.equal(await d.win.evaluate(() => np && np.app), 'Deck 90 · DM-90');
  assert.equal(await d.win.evaluate(() => jbPanel.classList.contains('kbd')), true, 'the DM-90 has the keyboard, and shows it');
  await d.win.keyboard.press('e'); await d.wait(1500);            // E is still the stereo's (7.10.6)
  assert.equal(await d.win.evaluate(() => stereoCfg.mode), 'music', 'the stereo opens on the music playing');
  assert.equal(await d.win.evaluate(() => stereoDisplay.state.track.title), now);
  const pos = await d.win.evaluate(() => musicPos);
  await d.win.click('.st-hot[data-st="next"]'); await d.wait(1200);
  const next = await d.win.evaluate(() => musicNow().name);
  assert.equal(await d.win.evaluate(() => musicPos), pos + 1, 'TRACK ▶▶ on the stereo: the next one');
  assert.equal(await d.win.evaluate(() => stereoDisplay.state.track.title), next);
  await d.win.keyboard.press('e'); await d.wait(1200);
  assert.deepEqual(await d.win.evaluate(() => [musicPlaying(), jbPower]), [true, true], 'the DM-90 goes on');
  // 7.10.7: the cassette decks keys drive the DM-90 while it plays, not the PC
  await d.cmds();
  const at = await d.win.evaluate(() => musicPos);
  await d.win.evaluate(() => deckCmd('next')); await d.wait(1200);
  assert.equal(await d.win.evaluate(() => musicPos), at + 1);
  await d.win.evaluate(() => deckCmd('toggle')); await d.wait(800);
  assert.equal(await d.win.evaluate(() => musicPaused() && np.status), 'Paused');
  await d.win.evaluate(() => deckCmd('play')); await d.wait(800);
  assert.equal(await d.win.evaluate(() => musicPlaying()), true);
  assert.ok(!(await d.cmds()).some(c => /^(play|pause|toggle|next|prev)$/.test(c)), 'the PC player is left alone');
  await d.click(K('stop'), 1500);
  assert.notEqual(await d.win.evaluate(() => np && np.app), 'Deck 90 · DM-90', 'stopped, the header lets it go');
});

test('SETUP held picks the library: one of them, then the other, then all', async () => {
  const head = () => d.win.evaluate(() => jb.getState().list.header);
  await d.click(K('artists'), 1500);
  assert.match(await head(), /^ARTISTS · 31$/);
  await d.hold(K('setup')); await d.wait(1500);
  assert.match(await head(), /^ARTISTS · 30 · MÚSICA$/);
  await d.hold(K('setup')); await d.wait(1500);
  assert.match(await head(), /^ARTISTS · 1 · MÁS MÚSICA$/);
  assert.equal(await d.win.evaluate(() => jbView.items[0].name), 'Otra Biblioteca');
  await d.hold(K('setup')); await d.wait(1500);
  assert.match(await head(), /^ARTISTS · 31$/);
  // the SETUP dialog has them in a list
  await d.click(K('setup'), 800);
  assert.deepEqual(await d.win.evaluate(() => [...document.querySelectorAll('#jbLibrary option')].map(o => o.textContent)), ['Todas (Música + Más música)', 'Música', 'Más música']);
  await d.win.press('#jbServer', 'Escape'); await d.wait(300);
  assert.equal(await d.win.evaluate(() => JSON.parse(localStorage.getItem('deck90-music')).library), '');
});

test('Last.fm: the DM-90 song as now playing, and a scrobble once heard long enough', async () => {
  await d.app.evaluate(({ ipcMain }) => {
    global.lfm = [];
    for (const ch of ['lfm-status', 'lfm-now', 'lfm-scrobble']) ipcMain.removeHandler(ch);
    ipcMain.handle('lfm-status', () => ({ hasKey: true, signedIn: true, user: 'damian', sent: 0, queued: 0 }));
    ipcMain.handle('lfm-now', (e, t) => { global.lfm.push(['now', t.artist, t.title]); });
    ipcMain.handle('lfm-scrobble', (e, t) => { global.lfm.push(['scrobble', t.artist, t.title, t.at > 0]); });
  });
  await d.win.evaluate(() => lfmStatus()); await d.wait(300);
  assert.equal(await d.win.textContent('#lfmBtn'), 'DAMIAN');
  await d.click(K('play'), 800);
  if (!(await d.win.evaluate(() => musicPlaying()))) { await d.click(K('play'), 800); }
  // the first song told as now playing (a 6 s test tone may already have given way to the next one)
  let now = [];
  for (const t0 = Date.now(); Date.now() - t0 < 12000 && !now.length; await d.wait(300)) now = await d.app.evaluate(() => global.lfm.filter(x => x[0] === 'now'));
  const song = await d.win.evaluate(() => ({ title: lfmCur.title, artist: lfmCur.artist }));
  assert.ok(now.some(x => x[1] === song.artist && x[2] === song.title), JSON.stringify(now));
  await d.win.evaluate(() => { lfmCur.heard = 400; lfmCur.dur = 300; });   // as if a long song heard for minutes
  await d.click(K('next'), 300);
  let sent = [];
  for (const t0 = Date.now(); Date.now() - t0 < 10000 && !sent.length; await d.wait(300)) sent = await d.app.evaluate(() => global.lfm.filter(x => x[0] === 'scrobble'));
  assert.deepEqual(sent[0], ['scrobble', song.artist, song.title, true]);
  await d.click(K('stop'), 800);
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

test('the keys letters are bigger and fit their keys; accented capitals keep their full height', async () => {
  const keys = await d.win.evaluate(() => [...document.querySelectorAll('#jukebox g[data-key] text, #tuner g[data-key] text, #cdUnit g[data-key] text')].map(t => {
    const k = t.closest('g[data-key]').querySelector('rect:nth-of-type(2)') || t.closest('g[data-key]').querySelector('rect');
    return { k: t.closest('g[data-key]').dataset.key, size: +t.getAttribute('font-size'), w: t.getBBox().width, kw: +k.getAttribute('width') };
  }));
  assert.ok(keys.length > 20, keys.length);
  for (const k of keys) assert.ok(k.w <= k.kw - 4, `${k.k}: ${k.w.toFixed(1)} in ${k.kw}`);
  assert.ok(keys.filter(k => k.size >= 10).length > keys.length / 2, 'most at 10 or more');
  // Í on the tuner's display: the I's full height (7 rows of dots), its accent in a dot above (one more row)
  const rows = t => d.win.evaluate(t => new Set([...tuner._dots(t, 0, 0, 1).children].map(c => c.getAttribute('cy'))).size, t);
  assert.equal(await rows('I'), 7); assert.equal(await rows('Í'), 8);
});
