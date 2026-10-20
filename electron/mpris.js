// Linux "now playing": MPRIS over D-Bus, read with gdbus (part of GLib, present on any desktop).
// Emits the same shape as the Windows bridge: { app, title, artist, album, status, pos, dur, at, cover }.
const { execFile } = require('child_process');

function gdbus(args) {
  return new Promise(resolve => {
    execFile('gdbus', ['call', '--session', ...args], { timeout: 1500 }, (err, out) => resolve(err ? null : out));
  });
}

// GVariant text helpers: strings come as '...' or "..." (when they contain a quote)
const STR = `(?:'((?:\\\\.|[^'\\\\])*)'|"((?:\\\\.|[^"\\\\])*)")`;
function unq(m) { return m ? (m[1] !== undefined ? m[1] : m[2] || '').replace(/\\(.)/g, '$1') : ''; }
function field(text, key) { return unq(new RegExp(`'${key}': <${STR}>`).exec(text)); }
function firstOfList(text, key) { return unq(new RegExp(`'${key}': <\\[${STR}`).exec(text)); }
function num(text, key) { const m = new RegExp(`'${key}': <(?:u?int64 |uint64 |int32 )?(-?\\d+)>`).exec(text); return m ? Number(m[1]) : NaN; }

const OBJ = '/org/mpris/MediaPlayer2';
const IFACE = 'org.mpris.MediaPlayer2.Player';

function createMpris(onInfo, log) {
  let player = null, lastKey = '', lastArt = '', lastList = 0, timer = null, stopped = false;

  async function pickPlayer() {
    const out = await gdbus(['--dest', 'org.freedesktop.DBus', '--object-path', '/org/freedesktop/DBus', '--method', 'org.freedesktop.DBus.ListNames']);
    if (!out) return null;
    const names = (out.match(/'org\.mpris\.MediaPlayer2\.[^']+'/g) || []).map(s => s.slice(1, -1));
    const spot = names.find(n => /spotless/i.test(n));
    if (spot || names.length < 2) return spot || names[0] || null;
    for (const n of names) {                         // no Spotless: take whichever player is playing
      const st = await gdbus(['--dest', n, '--object-path', OBJ, '--method', 'org.freedesktop.DBus.Properties.Get', IFACE, 'PlaybackStatus']);
      if (st && /Playing/.test(st)) return n;
    }
    return names[0];
  }

  async function poll() {
    if (stopped) return;
    try {
      if (!player || Date.now() - lastList > 5000) { player = await pickPlayer(); lastList = Date.now(); }
      if (!player) {
        if (lastKey !== 'none') { onInfo({ none: true }); lastKey = 'none'; }
      } else {
        const get = prop => gdbus(['--dest', player, '--object-path', OBJ, '--method', 'org.freedesktop.DBus.Properties.Get', IFACE, prop]);
        const [meta, status, posOut] = await Promise.all([get('Metadata'), get('PlaybackStatus'), get('Position')]);
        if (!meta) { player = null; }
        else {
          const st = unq(new RegExp(`<${STR}>`).exec(status || '')) || 'Stopped';
          const pos = Number((/(-?\d+)>/.exec(posOut || '') || [])[1]) / 1e6;
          const info = {
            app: player.replace('org.mpris.MediaPlayer2.', ''),
            title: field(meta, 'xesam:title'),
            artist: firstOfList(meta, 'xesam:artist'),
            album: field(meta, 'xesam:album'),
            status: st,
            pos: isFinite(pos) ? Math.round(pos * 10) / 10 : 0,
            dur: Math.round(num(meta, 'mpris:length') / 1e5) / 10 || 0,
            at: Date.now(),
          };
          const art = field(meta, 'mpris:artUrl');
          const key = [info.app, info.title, info.artist, info.album, info.status].join('|');
          // Send the art with every new track (the page clears the old cover then) and whenever it changes:
          // players often publish the art a moment after the title.
          const newTrack = key.split('|').slice(0, 3).join('|') !== lastKey.split('|').slice(0, 3).join('|');
          if (art && (newTrack || art !== lastArt)) { info.cover = art; lastArt = art; }
          if (key !== lastKey || (poll.n = (poll.n || 0) + 1) % 5 === 0) { onInfo(info); lastKey = key; }
        }
      }
    } catch (e) { log && log('mpris: ' + e.message); }
    timer = setTimeout(poll, 600);
  }

  const METHODS = { toggle: 'PlayPause', play: 'Play', pause: 'Pause', stop: 'Stop', next: 'Next', prev: 'Previous' };
  return {
    start() { onInfo({ ready: true }); poll(); },
    stop() { stopped = true; clearTimeout(timer); },
    command(cmd) {
      if (!player || !METHODS[cmd]) return;
      gdbus(['--dest', player, '--object-path', OBJ, '--method', IFACE + '.' + METHODS[cmd]]).then(() => setTimeout(() => { lastKey = ''; }, 50));
    },
  };
}

module.exports = { createMpris, _parse: { field, firstOfList, num, unq, STR } };
