// Last.fm (7.10.10): what Deck 90's own sources play (the radio, the CD, the DM-90) on the person's Last.fm
// profile: "now playing" while a song plays, and a scrobble once it was heard long enough (the page decides when).
//
// Last.fm wants an API account of the person's own (an API key and its secret, free at last.fm/api/account/create):
// they type both in the program, and they're kept here (userData/lastfm.json), never in the code. Signing in is
// Last.fm's desktop flow: a token, the person allows Deck 90 on last.fm in the browser, and the session key that
// follows is what's kept; no Last.fm password ever passes through Deck 90. Scrobbles that can't be sent (no
// internet) wait in the same file and go with the next one.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { readJson, writeJson } = require('./jsonfile');

const API = 'https://ws.audioscrobbler.com/2.0/';
const HEX32 = /^[0-9a-f]{32}$/i;

function createLastfm({ net, dir, log, open }) {
  const FILE = path.join(dir, 'lastfm.json');
  const cfg = readJson(FILE, log);                                // 7.10.16: written whole or not at all (jsonfile.js)
  if (!Array.isArray(cfg.queue)) cfg.queue = [];
  const save = () => { try { writeJson(FILE, cfg); } catch (e) { log('lastfm: ' + e.message); } };

  // a call: the parameters signed with the secret (md5 of name+value in order, then the secret), as Last.fm asks
  async function call(method, params, post) {
    const p = Object.assign({ method, api_key: cfg.key }, params);
    for (const k of Object.keys(p)) if (p[k] === undefined || p[k] === null || p[k] === '') delete p[k];
    p.api_sig = crypto.createHash('md5').update(Object.keys(p).sort().map(k => k + p[k]).join('') + cfg.secret, 'utf8').digest('hex');
    p.format = 'json';
    const body = new URLSearchParams(p).toString();
    const ac = new AbortController(), t = setTimeout(() => ac.abort(), 15000);
    try {
      const r = await net.fetch(post ? API : API + '?' + body, { method: post ? 'POST' : 'GET', signal: ac.signal,
        headers: post ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}, body: post ? body : undefined });
      const j = await r.json().catch(() => ({}));
      if (j.error) { const e = new Error(j.message || 'error ' + j.error); e.code = j.error; throw e; }
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return j;
    } finally { clearTimeout(t); }
  }
  const status = () => ({ hasKey: !!(cfg.key && cfg.secret), signedIn: !!cfg.session, user: cfg.user || '', waiting: !!cfg.token,
    sent: cfg.sent || 0, queued: cfg.queue.length });
  const lost = e => { if (e.code === 9 || e.code === 4 || e.code === 10 || e.code === 26) { delete cfg.session; save(); log('lastfm: signed out by Last.fm (' + e.message + ')'); } };
  const track = t => ({ artist: String(t.artist || '').slice(0, 200), track: String(t.title || '').slice(0, 200), album: String(t.album || '').slice(0, 200) || undefined,
    duration: t.dur > 0 && t.dur < 36000 ? Math.round(t.dur) : undefined });

  // 7.10.16: one send at a time (a song ending mid-send waits for it instead of sending the same batch again), and
  // what was sent is taken out of the queue by itself, not as "the first n" (the queue may have moved meanwhile)
  let flushing = null;
  function flush() {
    if (flushing) return flushing.then(() => flush());
    flushing = flushOnce().finally(() => { flushing = null; });
    return flushing;
  }
  async function flushOnce() {
    while (cfg.session && cfg.queue.length) {
      const batch = cfg.queue.slice(0, 50), p = { sk: cfg.session };
      batch.forEach((s, i) => { for (const [k, v] of Object.entries(s)) if (v !== undefined) p[k + '[' + i + ']'] = v; });
      try { await call('track.scrobble', p, true); }
      catch (e) { lost(e); log('lastfm: scrobble failed (' + e.message + '), ' + cfg.queue.length + ' waiting'); return; }
      const sent = new Set(batch);
      cfg.queue = cfg.queue.filter(s => !sent.has(s)); cfg.sent = (cfg.sent || 0) + batch.length; save();
      log('lastfm: scrobbled ' + batch.length + (cfg.queue.length ? ', ' + cfg.queue.length + ' waiting' : ''));
    }
  }

  return {
    status,
    // the person's API key and secret: kept, then a token and Last.fm's page to allow Deck 90
    async begin(key, secret) {
      key = String(key || '').trim(); secret = String(secret || '').trim();
      if (key || secret) {
        if (!HEX32.test(key) || !HEX32.test(secret)) return { error: 'La API key y el secret son de 32 letras y números (los da Last.fm al crear la cuenta de API)' };
        if (key !== cfg.key || secret !== cfg.secret) { cfg.key = key; cfg.secret = secret; delete cfg.session; delete cfg.user; }
      }
      if (!cfg.key || !cfg.secret) return { error: 'Falta la API key y el secret' };
      try {
        const r = await call('auth.getToken', {});
        cfg.token = r.token; save();
        open('https://www.last.fm/api/auth/?api_key=' + encodeURIComponent(cfg.key) + '&token=' + encodeURIComponent(cfg.token));
        return { ok: true };
      } catch (e) { log('lastfm: token failed: ' + e.message); return { error: e.code === 10 || e.code === 26 ? 'Last.fm no reconoce esa API key' : 'No contesta Last.fm (' + e.message + ')' }; }
    },
    // after the person allowed Deck 90 on last.fm: the session
    async finish() {
      if (!cfg.token) return { error: 'Primero CONECTAR' };
      try {
        const r = await call('auth.getSession', { token: cfg.token });
        cfg.session = r.session.key; cfg.user = r.session.name; delete cfg.token; save();
        log('lastfm: signed in as ' + cfg.user);
        flush();
        return { ok: true, user: cfg.user };
      } catch (e) { log('lastfm: session failed: ' + e.message); return { error: e.code === 14 ? 'Todavía no autorizaste a Deck 90 en la página de Last.fm' : e.message }; }
    },
    signOut() { delete cfg.session; delete cfg.user; delete cfg.token; save(); return { ok: true }; },
    async nowPlaying(t) {
      if (!cfg.session || !t || !t.artist || !t.title) return;
      try { await call('track.updateNowPlaying', Object.assign({ sk: cfg.session }, track(t)), true); }
      catch (e) { lost(e); log('lastfm: now playing failed: ' + e.message); }
    },
    async scrobble(t) {
      if (!cfg.session || !t || !t.artist || !t.title || !(t.at > 0)) return;
      cfg.queue.push(Object.assign(track(t), { timestamp: Math.round(t.at) }));
      if (cfg.queue.length > 1000) cfg.queue.splice(0, cfg.queue.length - 1000);
      save(); await flush();
    },
  };
}

module.exports = { createLastfm };
