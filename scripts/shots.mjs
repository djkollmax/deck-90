// Pictures of the program in its main states, to compare before and after a change that must not show
// (moving files, splitting the CSS): `node scripts/shots.mjs <folder>` saves them, run it on both versions and
// compare the folders (scripts/shots-compare.py). Clock, song and anything that moves are hidden in the shots.
// Needs what the tests need (ELECTRON_PATH / PW_DIR, or npm install) and a display (xvfb-run -a).
import fs from 'node:fs';
import path from 'node:path';
import { launch } from '../tests/lib/app.mjs';

const out = path.resolve(process.argv[2] || 'shots');
fs.mkdirSync(out, { recursive: true });
const d = await launch({ size: [1300, 1000] });
const still = async () => d.win.evaluate(() => {
  // what changes by itself: the clock, the weather, the song
  for (const s of ['#hcDigits', '#hcDay', '#hcDate', '#hwBox', '#npTitle', '#npArtist', '#lufsHist']) document.querySelectorAll(s).forEach(e => { e.style.visibility = 'hidden'; });
});
const shot = async (name, prep, arg) => {
  if (prep) await d.win.evaluate(prep, arg);
  await d.wait(900); await still();
  await d.win.screenshot({ path: path.join(out, name + '.png'), animations: 'disabled' });
  console.log(name);
};
await shot('rack');
for (const c of ['BLACK', 'GOLD', 'CLASSIC', 'TI']) await shot('chassis-' + c.toLowerCase(), c => setChassis(c), c);
await shot('drawer', () => { setDrawer(true); });
await shot('drawer-closed', () => { setDrawer(false); });
await shot('units-on', () => { tunerKey('power'); });
await shot('units-off', () => { tunerKey('power'); });
await d.win.keyboard.press('p'); await shot('mini');
await d.win.keyboard.press('p'); await d.wait(800);
await d.win.keyboard.press('e'); await shot('stereo');
for (const n of [3, 9, 20]) await shot('stereo-look-' + n, n => { stereoCfg.color = n; stereoPaint(); }, n);
await d.win.keyboard.press('e'); await d.wait(800);
await d.win.keyboard.press('i'); await shot('about');
await d.win.keyboard.press('Escape'); await d.win.keyboard.press('l'); await shot('history');
await d.win.keyboard.press('Escape'); await shot('welcome', () => showWelcome(true));
await d.close();
