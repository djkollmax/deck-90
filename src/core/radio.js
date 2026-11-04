'use strict';
// ═══════════════════════════════════════════════════════════
//  THE RADIO (core: no screen). The bands' memories (FM1 FM2 FM3 FM4 AM, six each, saved), the stations they
//  come with, and one <audio> that plays a station through the program's proxy (electron/radioproxy.js), which
//  reads its song and bitrate. The screens (the car stereo, the rack's DT-90, the phone) drive it with
//  radioTune / radioMemory / radioStep / radioStop and hear back through the hub (core/events.js):
//    'radio'          something changed: the station, playing or not, its song or quality
//    'radio-on-air'   a station started sounding     'radio-off'   stopped for good (not just silenced)
//    'notice'         a line for the person (a toast)
// ═══════════════════════════════════════════════════════════
const RADIO_KEY = 'deck90-radio';
// FM1 comes with Buenos Aires stations and 80s80s (Hamburg, internet only: no dial, the display shows its name);
// each is looked up by name in Radio Browser when first tuned (cc: the country, '' for anywhere)
const RADIO_DEFAULTS = [
  { name: 'Aspen', freq: '102.3', q: 'Aspen', cc: 'AR' }, { name: '80s80s', freq: '', q: '80s80s', cc: 'DE' },
  { name: 'Metro', freq: '95.1', q: 'Metro 95', cc: 'AR' }, { name: 'Rock & Pop', freq: '95.9', q: 'Rock & Pop', cc: 'AR' },
  { name: 'La 100', freq: '99.9', q: 'La 100', cc: 'AR' }, { name: 'Vorterix', freq: '92.1', q: 'Vorterix', cc: 'AR' },
];
// FM2 (7.8.4): Buenos Aires by genre: Con Vos, classical, jazz, electronic, the 80s, rock
const RADIO_FM2 = [
  { name: 'Con Vos', freq: '89.9', q: 'Con Vos', cc: 'AR' }, { name: 'Clásica', freq: '96.7', q: 'Nacional Clasica', cc: 'AR' },
  { name: 'Blackie', freq: '89.1', q: 'Blackie', cc: 'AR' }, { name: 'Delta', freq: '90.3', q: 'Delta 90.3', cc: 'AR' },
  { name: 'Blue', freq: '100.7', q: 'Blue 100.7', cc: 'AR' }, { name: 'Nac Rock', freq: '93.7', q: 'Nacional Rock', cc: 'AR' },
];
// FM3 (7.8.4): the same genres from the world, internet only: classical, jazz, electronic, the 80s, chill, eclectic
const RADIO_FM3 = [
  { name: 'SwissClassic', freq: '', q: 'Radio Swiss Classic', cc: 'CH' }, { name: 'Swiss Jazz', freq: '', q: 'Radio Swiss Jazz', cc: 'CH' },
  { name: 'Ibiza Global', freq: '', q: 'Ibiza Global Radio', cc: 'ES' }, { name: 'Heart 80s', freq: '', q: 'Heart 80s', cc: 'GB' },
  { name: 'Groove Salad', freq: '', q: 'Groove Salad', cc: 'US' }, { name: 'Paradise', freq: '', q: 'Radio Paradise', cc: 'US' },
];
// AM (7.8): the Buenos Aires AM stations, over the internet too
const RADIO_AM = [
  { name: 'Mitre', freq: '790', q: 'Radio Mitre', cc: 'AR' }, { name: 'Radio 10', freq: '710', q: 'Radio 10', cc: 'AR' },
  { name: 'Continental', freq: '590', q: 'Radio Continental', cc: 'AR' }, { name: 'Rivadavia', freq: '630', q: 'Rivadavia', cc: 'AR' },
  { name: 'Radio Nacional', freq: '870', q: 'Radio Nacional', cc: 'AR' }, { name: 'La Red', freq: '910', q: 'La Red', cc: 'AR' },
];
// FM4 (7.9.2): hi-fi stations, internet only: FIP and FIP Jazz (Paris, AAC 192), KEXP (Seattle), Linn's three (320)
const RADIO_FM4 = [
  { name: 'FIP', freq: '', q: 'FIP', cc: 'FR', url: 'https://icecast.radiofrance.fr/fip-hifi.aac' },
  { name: 'FIP Jazz', freq: '', q: 'FIP Jazz', cc: 'FR', url: 'https://icecast.radiofrance.fr/fipjazz-hifi.aac' },
  { name: 'KEXP', freq: '', q: 'KEXP', cc: 'US', url: 'https://kexp.streamguys1.com/kexp160.aac' },
  { name: 'Linn Jazz', freq: '', q: 'Linn Jazz', cc: 'GB', url: 'http://radio.linn.co.uk:8000/autodj' },
  { name: 'Linn Classic', freq: '', q: 'Linn Classical', cc: 'GB', url: 'http://radio.linn.co.uk:8004/autodj' },
  { name: 'Linn Radio', freq: '', q: 'Linn Radio', cc: 'GB', url: 'http://radio.linn.co.uk:8003/autodj' },
];
// HIFI (7.10.7): lossless and the best streams, internet only: Radio Paradise's four mixes in FLAC (CD quality),
// Intense Radio and Hi On Line in FLAC. A saved address that stops answering is looked up again by name
const RADIO_HIFI = [
  { name: 'Paradise', freq: '', q: 'Radio Paradise Main Mix FLAC', cc: 'US', url: 'http://stream.radioparadise.com/flac' },
  { name: 'RP Mellow', freq: '', q: 'Radio Paradise Mellow Mix FLAC', cc: 'US', url: 'http://stream.radioparadise.com/mellow-flac' },
  { name: 'RP Rock', freq: '', q: 'Radio Paradise Rock Mix FLAC', cc: 'US', url: 'http://stream.radioparadise.com/rock-flac' },
  { name: 'RP Global', freq: '', q: 'Radio Paradise Global Mix FLAC', cc: 'US', url: 'http://stream.radioparadise.com/global-flac' },
  { name: 'Intense', freq: '', q: 'Intense Radio', cc: 'NL', url: 'http://secure.live-streams.nl/flac.flac' },
  { name: 'Hi On Line', freq: '', q: 'Hi On Line Radio', cc: 'NL', url: 'http://mscp2.live-streams.nl:8100/flac.flac' },
];
// FM5 (7.10.11): Mother Earth (Hamburg; four channels in FLAC from vinyl and hi-res, up to 24/192), Naim Radio and
// Jazz24. Addresses that stop answering are looked up again by name
const RADIO_FM5 = [
  { name: 'Mother Earth', freq: '', q: 'Mother Earth Radio', cc: 'DE', url: 'https://motherearth.streamserver24.com/listen/motherearth/motherearth' },
  { name: 'ME Jazz', freq: '', q: 'Mother Earth Jazz', cc: 'DE', url: 'https://motherearth.streamserver24.com/listen/motherearth_jazz/motherearth.jazz' },
  { name: 'ME Klassik', freq: '', q: 'Mother Earth Klassik', cc: 'DE', url: 'http://server9.streamserver24.com:18910/motherearth.klassik' },
  { name: 'ME Instrum.', freq: '', q: 'Mother Earth Instrumental', cc: 'DE', url: 'https://motherearth.streamserver24.com:18920/motherearth.instrumental' },
  { name: 'Naim Radio', freq: '', q: 'Naim Radio', cc: 'GB' },
  { name: 'Jazz24', freq: '', q: 'Jazz24', cc: 'US' },
];
const RADIO_BANDS = ['FM1', 'FM2', 'FM3', 'FM4', 'FM5', 'HIFI', 'AM'];
// where a station is (7.9.21, under the memory on the DT-90; 7.9.23: in English, as the displays): the city of the ones that come with Deck 90, the
// country of any other (Radio Browser's code). short: as it fits there; long: for MODE's line
const RADIO_CITY = { Aspen: 'BS AS', Metro: 'BS AS', 'Rock & Pop': 'BS AS', 'La 100': 'BS AS', Vorterix: 'BS AS', 'Con Vos': 'BS AS',
  'Clásica': 'BS AS', Blackie: 'BS AS', Delta: 'BS AS', Blue: 'BS AS', 'Nac Rock': 'BS AS', Mitre: 'BS AS', 'Radio 10': 'BS AS',
  Continental: 'BS AS', Rivadavia: 'BS AS', 'Radio Nacional': 'BS AS', 'La Red': 'BS AS', 'Ibiza Global': 'IBIZA',
  'Heart 80s': 'LONDON', 'Groove Salad': 'S. FRANCISCO', FIP: 'PARIS', 'FIP Jazz': 'PARIS', KEXP: 'SEATTLE',
  'Mother Earth': 'HAMBURG', 'ME Jazz': 'HAMBURG', 'ME Klassik': 'HAMBURG', 'ME Instrum.': 'HAMBURG', 'Jazz24': 'SEATTLE' };
const RADIO_LONG = { 'BS AS': 'BUENOS AIRES', 'S. FRANCISCO': 'SAN FRANCISCO' };
const RADIO_COUNTRY = { AR: 'ARGENTINA', UY: 'URUGUAY', CL: 'CHILE', BR: 'BRAZIL', PY: 'PARAGUAY', BO: 'BOLIVIA', PE: 'PERU',
  CO: 'COLOMBIA', VE: 'VENEZUELA', EC: 'ECUADOR', MX: 'MEXICO', CU: 'CUBA', US: 'USA', CA: 'CANADA', ES: 'SPAIN',
  PT: 'PORTUGAL', FR: 'FRANCE', IT: 'ITALY', DE: 'GERMANY', AT: 'AUSTRIA', CH: 'SWITZERLAND', GB: 'UK', IE: 'IRELAND',
  NL: 'NETHERLANDS', BE: 'BELGIUM', DK: 'DENMARK', SE: 'SWEDEN', NO: 'NORWAY', FI: 'FINLAND', PL: 'POLAND', GR: 'GREECE',
  RU: 'RUSSIA', JP: 'JAPAN', AU: 'AUSTRALIA', NZ: 'NEW ZEALAND' };
function radioPlace(st, long) {
  if (!st) return '';
  const known = RADIO_CITY[st.name], country = RADIO_COUNTRY[st.cc] || st.cc || '';
  // the Linn stations are Scottish
  const city = known || (/^Linn /.test(st.name) && st.cc === 'GB' ? 'SCOTLAND' : '');
  if (!long) return city || country;
  return [RADIO_LONG[city] || city, city === 'SCOTLAND' ? 'UK' : country].filter((x, i, a) => x && a.indexOf(x) === i).join(', ');
}
// the memories: { FM1: [6 × station|null], FM2, FM3 }, the band and slot in use
// 7.10.12: twelve memories a band (1–6, and 7–12 held), the last six empty to begin with
const RADIO_SLOTS = 12, radioSlots = a => Array.from({ length: RADIO_SLOTS }, (_, i) => a[i] || null);
let radioMem = { v: 2, even: true, band: 'FM1', slot: 1, FM1: radioSlots(RADIO_DEFAULTS), FM2: radioSlots(RADIO_FM2), FM3: radioSlots(RADIO_FM3), FM4: radioSlots(RADIO_FM4), FM5: radioSlots(RADIO_FM5), HIFI: radioSlots(RADIO_HIFI), AM: radioSlots(RADIO_AM) };
try {
  const r = store.read(RADIO_KEY);
  if (r && typeof r === 'object') for (const b of RADIO_BANDS) {
    if (Array.isArray(r[b])) radioMem[b] = Array.from({ length: RADIO_SLOTS }, (_, i) => r[b][i] && r[b][i].name ? { name: String(r[b][i].name).slice(0, 80), freq: String(r[b][i].freq || '').slice(0, 8), q: String(r[b][i].q || r[b][i].name).slice(0, 60), cc: /^[A-Z]{2}$/.test(r[b][i].cc || '') ? r[b][i].cc : '', url: /^https?:\/\//.test(r[b][i].url || '') ? r[b][i].url : '', codec: /^[A-Z0-9+]{2,8}$/.test(r[b][i].codec || '') ? r[b][i].codec : '', kbps: r[b][i].kbps > 0 && r[b][i].kbps <= 1500 ? r[b][i].kbps | 0 : 0,
      hq: r[b][i].hq === 1 ? 1 : 0, gain: r[b][i].gain > 0 && r[b][i].gain <= 1 ? Math.round(r[b][i].gain * 1000) / 1000 : 0 } : null);   // 7.10.7
    if (RADIO_BANDS.includes(r.band)) radioMem.band = r.band;
    if (r.slot >= 0 && r.slot <= RADIO_SLOTS) radioMem.slot = r.slot | 0;
    if (typeof r.even === 'boolean') radioMem.even = r.even;
  }
  // 7.8: FM1-6 is Vorterix 92.1 instead of Los 40 (kept if it was stored there by hand)
  if (radioMem.FM1[5] && radioMem.FM1[5].name === 'Los 40' && radioMem.FM1[5].q === 'Los 40') radioMem.FM1[5] = Object.assign({}, RADIO_DEFAULTS[5]);
  // 7.8.4: FM2 and FM3 come filled; their empty memories take the new stations once (one stored by hand stays)
  if (r && typeof r === 'object' && !(r.v >= 2)) {
    for (const [b, def] of [['FM2', RADIO_FM2], ['FM3', RADIO_FM3]]) radioMem[b] = radioMem[b].map((st, i) => st || (def[i] ? Object.assign({}, def[i]) : null));
    radioMem.v = 2;
  }
} catch (_) {}
const saveRadio = () => store.write(RADIO_KEY, radioMem);

// ── the radio itself: one <audio> playing the station's stream (Deck 90 hears it like any other sound) ──
const radioAudio = new Audio();
radioAudio.preload = 'none';
let radioNow = null, radioTop = null, radioTopAt = -1, radioScan = 0, radioTry = 0;
const radioPlaying = () => !radioAudio.paused && !!radioNow;
// 7.10.13: the radio busy with the sound: playing, being tuned, reconnecting or scanning (another unit taking the
// sound stops all of it, not only what's playing)
let radioTuning = 0;
const radioActive = () => !!radioNow && (radioPlaying() || radioTuning === radioTry || radioTrouble === 'retry' || !!radioScan);
const shortName = n => String(n || '').replace(/\b(fm|radio|am)\b/gi, '').replace(/\s+/g, ' ').trim().slice(0, 12) || 'RADIO';
// what the radio does goes to media.log (a station that won't start says why there)
const radioLog = m => { try { if (window.appLog) window.appLog('radio: ' + m); } catch (_) {} };
// Windows lists Deck 90 itself as a player while the radio sounds: it shows the station there (and the bridge leaves
// Deck 90's own session out of "what plays on the PC")
function radioSession(st) {
  try { if ('mediaSession' in navigator) navigator.mediaSession.metadata = st ? new MediaMetadata({ title: st.name, artist: 'Deck 90 · radio' + (st.freq ? ' ' + st.freq : ''), album: radioMem.band }) : null; } catch (_) {}
}
// 7.10.7: the best stream of a station. Radio Browser's answers for the same station (its name without the
// quality words) go best first: FLAC, then Opus, AAC and Ogg (worth more than their bitrate), then MP3, each by
// bitrate. A station saved before is checked once (hq) for a better address of itself
const RADIO_WORTH = { FLAC: 20, OPUS: 1.7, 'AAC+': 1.6, AAC: 1.5, OGG: 1.3, MP3: 1 };
const radioScore = (codec, kbps) => (kbps || 64) * (RADIO_WORTH[String(codec || '').toUpperCase()] || 1);
const radioBase = n => String(n || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/\b(\d+\s*k(bps)?|aac\+?|mp3|flac|ogg|opus|hq|hd|hi-?fi|lossless|stream|low|high|quality)\b/g, '').replace(/[^a-z0-9]+/g, '');
function radioBest(found) {
  if (!found.length) return found;
  const same = f => radioBase(f.name) === radioBase(found[0].name);
  const group = found.filter(same).sort((a, b) => radioScore(b.codec, b.bitrate) - radioScore(a.codec, a.bitrate));
  return [...group, ...found.filter(f => !same(f))];
}
async function radioResolve(st, failed) {
  if (failed && st.url && window.radio) {                          // 7.10.13: the saved address failed: the others
    const found = await window.radio.find(st.q || st.name, st.cc === undefined ? 'AR' : st.cc).catch(() => null);
    if (!found) return null;
    radioFound = {}; found.forEach(f => { radioFound[f.url] = f; });
    return radioBest(found).map(f => f.url).filter(u => u !== st.url);
  }
  if (st.url && (st.hq || !window.radio)) return [st.url];
  if (!window.radio) return null;
  const found = await window.radio.find(st.q || st.name, st.cc === undefined ? 'AR' : st.cc);
  if (!found) return st.url ? [st.url] : null;
  radioFound = {}; found.forEach(f => { radioFound[f.url] = f; });   // Radio Browser's format and bitrate, for each address
  const best = radioBest(found).map(f => f.url);
  if (!st.url) return best;
  // checked once: a better address of the same station first, the saved one right after
  const top = found.find(f => f.url === best[0]);
  // only over a saved stream whose quality is known (an unknown one may well be the better), and clearly better
  if (top && top.url !== st.url && st.kbps && radioScore(top.codec, top.bitrate) > 1.2 * radioScore(st.codec, st.kbps)) {
    radioLog(st.name + ': a better stream, ' + (top.codec || '?') + ' ' + (top.bitrate || '?') + ' (was ' + (st.codec || '?') + ' ' + (st.kbps || '?') + ')');
    return [top.url, st.url];
  }
  st.hq = 1; saveRadio();
  return [st.url];
}
// What the station says (7.9.3): its format and bitrate, and the song it's playing. They come from the local
// proxy the radio plays through (electron/radioproxy.js), tagged with the tune they belong to; a station that
// plays directly keeps what Radio Browser said about it.
let radioMeta = { id: -1, codec: '', kbps: 0, title: '' }, radioFound = {};
const radioQuality = st => {
  const codec = radioMeta.id === radioTry && radioMeta.codec || (st && st.codec) || '';
  const kbps = radioMeta.id === radioTry && radioMeta.kbps || (st && st.kbps) || 0;
  return (codec + (kbps ? ' ' + kbps : '')).trim();
};
const radioSong = () => radioMeta.id === radioTry && radioPlaying() ? radioMeta.title : '';
if (window.radio && window.radio.onMeta) window.radio.onMeta(m => {
  if (!m || String(m.id) !== String(radioTry)) return;           // an earlier station's
  if (m.codec) radioMeta.codec = m.codec;
  if (typeof m.ahead === 'number') { radioMeta.ahead = m.ahead; return; }   // 7.10.7: every second, for SIGNAL
  if (m.bridged) { radioStallAt = Date.now(); radioLog((radioNow ? radioNow.name : '') + ': the stream broke, the proxy bridged it (' + m.bridged + ')'); }
  if (m.kbps && !(m.measured && radioMeta.kbps)) radioMeta.kbps = m.kbps;
  if (typeof m.title === 'string') {
    // "Artist - Song" as the station writes it; an ad or the station's own name says nothing
    const t = m.title.trim(), st = radioNow;
    radioMeta.title = !t || (st && t.toLowerCase().replace(/\W/g, '') === st.name.toLowerCase().replace(/\W/g, '')) ? '' : t;
    if (radioMeta.title) radioLog('song ' + (st ? st.name : '') + ': ' + radioMeta.title.slice(0, 120));
  }
  const st = radioNow;
  if (st && (radioMeta.codec || radioMeta.kbps)) { st.codec = radioMeta.codec || st.codec || ''; st.kbps = radioMeta.kbps || st.kbps || 0; }
  deck.emit('radio');
});
// again (7.9.21): the station's sound dropped and it's being tuned again (radioTrouble 'retry', no notice)
async function radioTune(st, label, retry, again) {
  if (!st) return;
  const t = ++radioTry;
  radioAired = 0; radioTuning = t; clearTimeout(radioWaitTimer); clearTimeout(radioRetryTimer);
  if (!again) {
    radioRetries = 0; radioTrouble = ''; radioStallAt = 0;
    // 7.10.13: the station before goes quiet now, not when the new one's address arrives (a lookup takes seconds)
    if (radioAudio.getAttribute('src')) { radioAudio.pause(); radioAudio.removeAttribute('src'); radioAudio.load(); }
  }
  radioNow = st; deck.emit('radio');
  if (!again) deck.notice('RADIO · <span>' + (st.freq ? st.freq + ' ' : '') + st.name.replace(/[<>&]/g, '') + '</span>' + (label ? ' · ' + label : ''), 1800);
  const urls = await radioResolve(st, retry);
  if (t !== radioTry) return;                                  // another station was chosen meanwhile
  if (!urls) { radioLog('no lookup for ' + st.name); return radioFailed(st, t, again, '⚠ No pude buscar la radio: ¿hay internet?'); }
  if (!urls.length) { radioLog('not found: ' + st.name); return radioFailed(st, t, again, '⚠ No encontré <span>' + st.name.replace(/[<>&]/g, '') + '</span> en Radio Browser'); }
  radioMeta = { id: t, codec: '', kbps: 0, title: '' };
  for (const u of urls) {
    // through the local proxy first (the station's song and bitrate), straight when that can't play it
    const proxied = !/\.m3u8?(\?|$)/i.test(u) && window.radio && window.radio.proxy ? await window.radio.proxy(u, t).catch(() => null) : null;
    if (t !== radioTry) return;
    for (const src of proxied ? [proxied, u] : [u]) {
    try {
      radioLog('tuning ' + st.name + ' · ' + u.slice(0, 120) + (src === proxied ? ' (proxy)' : ''));
      radioAudio.src = src;
      let late = 0;
      try { await Promise.race([radioAudio.play(), new Promise((_, no) => { late = setTimeout(() => no(new Error('no answer in 12 s')), 12000); })]); }
      finally { clearTimeout(late); }
      if (t !== radioTry) return;
      const rb = radioFound[u];
      if (rb && !radioMeta.codec) { st.codec = rb.codec || st.codec || ''; }
      if (rb && !radioMeta.kbps && rb.bitrate) { st.kbps = rb.bitrate; }
      radioLog('playing ' + st.name + ' · ' + u.slice(0, 120));
      radioSession(st);
      radioAired = t; radioTuning = 0; radioRetries = 0; radioTrouble = '';
      if (st.url !== u || !st.hq) { st.url = u; st.hq = 1; saveRadio(); }   // 7.10.7: the address that played, checked
      deck.emit('radio-on-air');                                  // (the meters follow it through the PC's sound)
      deck.emit('radio'); return;
    } catch (err) {
      radioLog(st.name + ' failed at ' + u.slice(0, 120) + (src === proxied ? ' (proxy)' : '') + ': ' + (err && (err.name + ' ' + err.message)));
      if (t !== radioTry) return;
      radioAudio.pause();                                       // 7.10.13: a late answer doesn't start it behind our back
    }
    }
  }
  // 7.10.13: the address saved didn't answer: other streams of the station are looked up once (the saved one is kept;
  // a reconnect after a break doesn't look up, it tries again later)
  if (st.url && !retry && !again) { radioLog(st.name + ': saved address failed, looking for another stream of it'); return radioTune(st, label, true, again); }
  radioAudio.removeAttribute('src'); radioAudio.load();
  radioFailed(st, t, again, '⚠ <span>' + st.name.replace(/[<>&]/g, '') + '</span> no responde ahora');
}
// 7.9.21: what's wrong with the station, for the displays: 'lost' (it doesn't answer, or there's no internet: SIN
// SEÑAL) or 'retry' (its sound dropped while playing and it's being tuned again: RECONECTANDO, every 10 s for a minute)
let radioTrouble = '', radioAired = 0, radioRetries = 0, radioRetryTimer = 0, radioWaitTimer = 0;
function radioFailed(st, t, again, notice) {
  if (t === radioTry) radioTuning = 0;
  if (again && ++radioRetries < 6) {
    radioTrouble = 'retry'; deck.emit('radio');
    radioRetryTimer = setTimeout(() => { if (t === radioTry && radioNow === st) radioTune(st, '', false, true); }, 10000);
    return;
  }
  radioTrouble = 'lost'; deck.emit('radio');
  deck.notice(notice, 3200);
}
// the sound of a station that was on the air stopped by itself (the stream ended or broke, or it waited 10 s for data)
function radioDropped(why) {
  if (!radioAired || radioAired !== radioTry || !radioNow) return;
  radioLog(radioNow.name + ' dropped (' + why + '): tuning it again');
  radioRetries = 0; radioTrouble = 'retry';
  radioTune(radioNow, '', false, true);
}
radioAudio.addEventListener('error', () => radioDropped('error'));
radioAudio.addEventListener('ended', () => radioDropped('ended'));
radioAudio.addEventListener('waiting', () => { clearTimeout(radioWaitTimer); radioWaitTimer = setTimeout(() => radioDropped('no data for 10 s'), 10000); });
radioAudio.addEventListener('playing', () => clearTimeout(radioWaitTimer));
radioAudio.addEventListener('pause', () => clearTimeout(radioWaitTimer));   // 7.10.13: paused isn't stalled
// 7.10.7: SIGNAL on the DT-90, from how the stream is doing: the seconds of sound the player has ahead, as the
// proxy counts them (radioproxy.js keeps a cushion; 6 s or more, five bars; under 1 s, one; three while it's not
// known yet or the station plays straight), one bar less for a minute after the sound stalled or the stream broke
let radioStallAt = 0;
radioAudio.addEventListener('waiting', () => { if (radioAired === radioTry) radioStallAt = Date.now(); });
function radioSignal() {
  if (!radioPlaying()) return 0;
  const a = radioMeta.id === radioTry && radioMeta.ahead !== undefined ? radioMeta.ahead : 3;
  const bars = a >= 6 ? 5 : a >= 4 ? 4 : a >= 2.5 ? 3 : a >= 1 ? 2 : 1;
  return Math.max(1, bars - (radioStallAt && Date.now() - radioStallAt < 60000 ? 1 : 0));
}
// 7.10.7: EVEN LEVEL. Stations go out at very different loudness (most AM/FM streams very loud, the hi-fi ones
// with room): the radio's own volume brings each one down to about −16 LUFS, never up, so changing stations
// doesn't jump. What Deck 90 hears is the station times that volume; the station's own loudness is what's heard
// over the volume, followed slowly (half a minute) so songs and talk keep their differences. Each station keeps its
// level (gain), so it starts right the next time. MODE held turns it off and on (radioMem.even)
const RADIO_TARGET = -16;
let radioLevel = { id: -1, full: NaN, n: 0, saved: 0 };
function radioEvenTick() {
  const st = radioNow;
  if (!radioMem.even) { if (radioAudio.volume !== 1) radioAudio.volume = 1; return; }
  if (!st || !radioPlaying() || radioAired !== radioTry) return;
  if (radioLevel.id !== radioTry) {                               // a station just came on: its known level first
    radioLevel = { id: radioTry, full: NaN, n: 0, saved: Date.now() };
    radioAudio.volume = st.gain > 0 ? st.gain : 1;
  }
  // only while the radio is the sound Deck 90 hears (nothing else playing), and there is sound
  if (typeof capture === 'undefined' || !capture.running || typeof lufsHist === 'undefined' || !lufsHist.length) return;
  if ((typeof cdPlaying === 'function' && cdPlaying()) || (typeof musicPlaying === 'function' && musicPlaying())) return;
  const recent = lufsHist.slice(-5).filter(l => l > -50);       // the last half second, the silences left out
  if (!recent.length) return;
  const heard = 10 * Math.log10(recent.reduce((a, l) => a + Math.pow(10, l / 10), 0) / recent.length);
  const full = heard - 20 * Math.log10(Math.max(0.01, radioAudio.volume));
  radioLevel.n++;
  const k = radioLevel.n < 20 ? 1 / radioLevel.n : 0.5 / 30;    // the first 10 s averaged, then a half-minute follow
  radioLevel.full = isFinite(radioLevel.full) ? radioLevel.full + k * (full - radioLevel.full) : full;
  if (radioLevel.n < 6) return;                                    // 3 s before touching it
  const goal = Math.min(1, Math.pow(10, (RADIO_TARGET - radioLevel.full) / 20));
  const now = 20 * Math.log10(Math.max(0.01, radioAudio.volume)), want = 20 * Math.log10(goal);
  const step = radioLevel.n < 30 ? 2 : 0.5;                        // dB a tick: quick at first, then gently
  const next = Math.abs(want - now) <= step ? want : now + Math.sign(want - now) * step;
  radioAudio.volume = Math.max(0.05, Math.min(1, Math.pow(10, next / 20)));
  if (radioLevel.n >= 30 && Date.now() - radioLevel.saved > 30000) {
    radioLevel.saved = Date.now(); st.gain = Math.round(radioAudio.volume * 1000) / 1000; saveRadio();
  }
}
setInterval(radioEvenTick, 500);
function radioEvenSet(on) {
  radioMem.even = !!on; saveRadio();
  if (!on) radioAudio.volume = 1; else radioLevel.id = -1;
  deck.emit('radio');
}
// keepOn (7.9.15): the CD took the sound; the rack's tuner stays on, showing its station, just silent
function radioStop(keepOn) {
  radioTry++; radioScan = 0; radioTrouble = ''; radioAired = 0; radioTuning = 0; clearTimeout(radioWaitTimer); clearTimeout(radioRetryTimer); radioAudio.pause(); radioAudio.removeAttribute('src'); radioAudio.load(); deck.emit('radio'); radioSession(null);
  if (!keepOn) deck.emit('radio-off');                       // (the rack's tuner shows it off too)
}
radioAudio.addEventListener('pause', () => deck.emit('radio'));
radioAudio.addEventListener('playing', () => deck.emit('radio'));
async function radioStep(d) {                                  // TUNE: the most heard stations in Argentina
  if (!radioTop) { radioTop = window.radio ? await window.radio.top() : null; if (!radioTop || !radioTop.length) { radioTop = null; deck.notice('⚠ No pude traer la lista de radios', 3000); return; } }
  radioTopAt = (radioTopAt + d + radioTop.length) % radioTop.length;
  const r = radioTop[radioTopAt];
  radioMem.slot = 0;                                           // a tuned station, not a memory
  radioTune({ name: r.name, freq: '', q: r.name, cc: 'AR', url: r.url }, (radioTopAt + 1) + '/' + radioTop.length);
}
setInterval(() => { if (radioScan && radioScan++ % 8 === 0) radioStep(1); }, 1000);   // SCAN: 8 s of each (a stop ends it)
// SCAN on or off (a station chosen by hand also turns it off)
function radioScanSet(on) { radioScan = on ? 1 : 0; deck.emit('radio'); }
// n: 1–12 (7.10.12: 7–12 are 1–6 held); store: keep the station playing there (MEMO and the number)
function radioMemory(n, store) {
  const list = radioMem[radioMem.band];
  if (store) {
    if (!radioNow) { deck.notice('Primero sintonizá una radio (TUNE ◀ ▶) y después MEMO y el número', 3000); return; }
    list[n - 1] = { name: radioNow.name, freq: radioNow.freq || '', q: radioNow.q || radioNow.name, cc: radioNow.cc || '', url: radioNow.url || '', codec: radioNow.codec || '', kbps: radioNow.kbps || 0, hq: radioNow.hq ? 1 : 0, gain: radioNow.gain || 0 };
    radioMem.slot = n; saveRadio(); deck.emit('radio');
    deck.notice('Guardada en <span>' + radioMem.band + '-' + n + '</span> · ' + radioNow.name.replace(/[<>&]/g, ''), 2200);
    return;
  }
  const st = list[n - 1];
  if (!st) { deck.notice(radioMem.band + '-' + n + ' está vacía: sintonizá con <span>TUNE ◀ ▶</span> y guardala con <span>MEMO</span> y el ' + (n > 6 ? (n - 6) + ' apretado' : n), 3200); return; }
  radioMem.slot = n; saveRadio(); radioScan = 0;
  radioTune(st, radioMem.band + '-' + n);
}
