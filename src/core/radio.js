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
const RADIO_BANDS = ['FM1', 'FM2', 'FM3', 'FM4', 'AM'];
// the memories: { FM1: [6 × station|null], FM2, FM3 }, the band and slot in use
let radioMem = { v: 2, band: 'FM1', slot: 1, FM1: RADIO_DEFAULTS.slice(), FM2: RADIO_FM2.slice(), FM3: RADIO_FM3.slice(), FM4: RADIO_FM4.slice(), AM: RADIO_AM.slice() };
try {
  const r = store.read(RADIO_KEY);
  if (r && typeof r === 'object') for (const b of RADIO_BANDS) {
    if (Array.isArray(r[b])) radioMem[b] = Array.from({ length: 6 }, (_, i) => r[b][i] && r[b][i].name ? { name: String(r[b][i].name).slice(0, 80), freq: String(r[b][i].freq || '').slice(0, 8), q: String(r[b][i].q || r[b][i].name).slice(0, 60), cc: /^[A-Z]{2}$/.test(r[b][i].cc || '') ? r[b][i].cc : '', url: /^https?:\/\//.test(r[b][i].url || '') ? r[b][i].url : '', codec: /^[A-Z0-9+]{2,8}$/.test(r[b][i].codec || '') ? r[b][i].codec : '', kbps: r[b][i].kbps > 0 && r[b][i].kbps <= 1500 ? r[b][i].kbps | 0 : 0 } : null);
    if (RADIO_BANDS.includes(r.band)) radioMem.band = r.band;
    if (r.slot >= 0 && r.slot <= 6) radioMem.slot = r.slot | 0;
  }
  // 7.8: FM1-6 is Vorterix 92.1 instead of Los 40 (kept if it was stored there by hand)
  if (radioMem.FM1[5] && radioMem.FM1[5].name === 'Los 40' && radioMem.FM1[5].q === 'Los 40') radioMem.FM1[5] = Object.assign({}, RADIO_DEFAULTS[5]);
  // 7.8.4: FM2 and FM3 come filled; their empty memories take the new stations once (one stored by hand stays)
  if (r && typeof r === 'object' && !(r.v >= 2)) {
    for (const [b, def] of [['FM2', RADIO_FM2], ['FM3', RADIO_FM3]]) radioMem[b] = radioMem[b].map((st, i) => st || Object.assign({}, def[i]));
    radioMem.v = 2;
  }
} catch (_) {}
const saveRadio = () => store.write(RADIO_KEY, radioMem);

// ── the radio itself: one <audio> playing the station's stream (Deck 90 hears it like any other sound) ──
const radioAudio = new Audio();
radioAudio.preload = 'none';
let radioNow = null, radioTop = null, radioTopAt = -1, radioScan = 0, radioTry = 0;
const radioPlaying = () => !radioAudio.paused && !!radioNow;
const shortName = n => String(n || '').replace(/\b(fm|radio|am)\b/gi, '').replace(/\s+/g, ' ').trim().slice(0, 12) || 'RADIO';
// what the radio does goes to media.log (a station that won't start says why there)
const radioLog = m => { try { if (window.appLog) window.appLog('radio: ' + m); } catch (_) {} };
// Windows lists Deck 90 itself as a player while the radio sounds: it shows the station there (and the bridge leaves
// Deck 90's own session out of "what plays on the PC")
function radioSession(st) {
  try { if ('mediaSession' in navigator) navigator.mediaSession.metadata = st ? new MediaMetadata({ title: st.name, artist: 'Deck 90 · radio' + (st.freq ? ' ' + st.freq : ''), album: radioMem.band }) : null; } catch (_) {}
}
async function radioResolve(st) {
  if (st.url) return [st.url];
  if (!window.radio) return null;
  const found = await window.radio.find(st.q || st.name, st.cc === undefined ? 'AR' : st.cc);
  if (!found) return null;
  radioFound = {}; found.forEach(f => { radioFound[f.url] = f; });   // Radio Browser's format and bitrate, for each address
  return found.map(f => f.url);
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
async function radioTune(st, label, retry) {
  if (!st) return;
  const t = ++radioTry;
  radioNow = st; deck.emit('radio');
  deck.notice('RADIO · <span>' + (st.freq ? st.freq + ' ' : '') + st.name.replace(/[<>&]/g, '') + '</span>' + (label ? ' · ' + label : ''), 1800);
  const urls = await radioResolve(st);
  if (t !== radioTry) return;                                  // another station was chosen meanwhile
  if (!urls) { radioLog('no lookup for ' + st.name); deck.notice('⚠ No pude buscar la radio: ¿hay internet?', 3200); return; }
  if (!urls.length) { radioLog('not found: ' + st.name); deck.notice('⚠ No encontré <span>' + st.name.replace(/[<>&]/g, '') + '</span> en Radio Browser', 3200); return; }
  radioMeta = { id: t, codec: '', kbps: 0, title: '' };
  for (const u of urls) {
    // through the local proxy first (the station's song and bitrate), straight when that can't play it
    const proxied = !/\.m3u8?(\?|$)/i.test(u) && window.radio && window.radio.proxy ? await window.radio.proxy(u, t).catch(() => null) : null;
    if (t !== radioTry) return;
    for (const src of proxied ? [proxied, u] : [u]) {
    try {
      radioLog('tuning ' + st.name + ' · ' + u.slice(0, 120) + (src === proxied ? ' (proxy)' : ''));
      radioAudio.src = src;
      await Promise.race([radioAudio.play(), new Promise((_, no) => setTimeout(() => no(new Error('no answer in 12 s')), 12000))]);
      if (t !== radioTry) return;
      const rb = radioFound[u];
      if (rb && !radioMeta.codec) { st.codec = rb.codec || st.codec || ''; }
      if (rb && !radioMeta.kbps && rb.bitrate) { st.kbps = rb.bitrate; }
      radioLog('playing ' + st.name + ' · ' + u.slice(0, 120));
      radioSession(st);
      if (!st.url) { st.url = u; saveRadio(); }
      deck.emit('radio-on-air');                                  // (the meters follow it through the PC's sound)
      deck.emit('radio'); return;
    } catch (err) { radioLog(st.name + ' failed at ' + u.slice(0, 120) + (src === proxied ? ' (proxy)' : '') + ': ' + (err && (err.name + ' ' + err.message))); if (t !== radioTry) return; }
    }
  }
  if (st.url) {                                                 // an old address: look the station up again, once
    st.url = ''; saveRadio();
    if (!retry) { radioLog(st.name + ': saved address failed, looking it up again'); return radioTune(st, label, true); }
  }
  deck.notice('⚠ <span>' + st.name.replace(/[<>&]/g, '') + '</span> no responde ahora', 3200);
}
// keepOn (7.9.15): the CD took the sound; the rack's tuner stays on, showing its station, just silent
function radioStop(keepOn) {
  radioTry++; radioScan = 0; radioAudio.pause(); radioAudio.removeAttribute('src'); radioAudio.load(); deck.emit('radio'); radioSession(null);
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
function radioMemory(n, hold) {
  const list = radioMem[radioMem.band];
  if (hold) {
    if (!radioNow) { deck.notice('Primero sintonizá una radio (TUNE ◀ ▶) y después mantené apretado el número', 3000); return; }
    list[n - 1] = { name: radioNow.name, freq: radioNow.freq || '', q: radioNow.q || radioNow.name, cc: radioNow.cc || '', url: radioNow.url || '', codec: radioNow.codec || '', kbps: radioNow.kbps || 0 };
    radioMem.slot = n; saveRadio(); deck.emit('radio');
    deck.notice('Guardada en <span>' + radioMem.band + '-' + n + '</span> · ' + radioNow.name.replace(/[<>&]/g, ''), 2200);
    return;
  }
  const st = list[n - 1];
  if (!st) { deck.notice(radioMem.band + '-' + n + ' está vacía: sintonizá con <span>TUNE ◀ ▶</span> y mantené apretado el ' + n, 3200); return; }
  radioMem.slot = n; saveRadio(); radioScan = 0;
  radioTune(st, radioMem.band + '-' + n);
}
