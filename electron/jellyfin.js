// The DM-90's music from a Jellyfin server (7.10.0): sign-in, the music library's artists, albums and songs, a
// song's quality, and the address its sound streams from. Music only: the libraries Jellyfin calls "music".
//
// The person types the server, user and password in the program; Jellyfin answers the sign-in with an access
// token, which is what's kept (userData/jellyfin.json), never the password. The page asks through IPC (main.js);
// only the reads listed in READS reach the server.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function createJellyfin({ net, dir, log, version }) {
  const FILE = path.join(dir, 'jellyfin.json');
  let cfg = {};
  try { cfg = JSON.parse(fs.readFileSync(FILE, 'utf8')) || {}; } catch (_) {}
  if (!cfg.device) { cfg.device = 'deck90-' + crypto.randomBytes(6).toString('hex'); save(); }
  function save() { try { fs.writeFileSync(FILE, JSON.stringify(cfg)); } catch (e) { log('jellyfin: ' + e.message); } }

  const auth = token => 'MediaBrowser Client="Deck 90", Device="Deck 90", DeviceId="' + cfg.device + '", Version="' + version + '"' + (token ? ', Token="' + token + '"' : '');
  async function call(method, p, query, body, token = cfg.token, wait = 20000) {
    const u = new URL(cfg.server.replace(/\/+$/, '') + p);
    for (const [k, v] of Object.entries(query || {})) if (v !== undefined && v !== null && v !== '') u.searchParams.set(k, String(v));
    const ac = new AbortController(), t = setTimeout(() => ac.abort(), wait);
    try {
      const r = await net.fetch(u.href, { method, signal: ac.signal, body: body ? JSON.stringify(body) : undefined,
        headers: { Authorization: auth(token), 'X-Emby-Authorization': auth(token), Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) } });
      if (r.status === 401) { const e = new Error('unauthorized'); e.code = 401; throw e; }
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.status === 204 ? null : await r.json();
    } finally { clearTimeout(t); }
  }
  const clean = s => /^https?:\/\/[^\s/?#]+(:\d+)?(\/[^\s?#]*)?$/i.test(String(s || '').trim()) ? String(s).trim().replace(/\/+$/, '') : '';

  // the music libraries (CollectionType "music"); 7.10.4: all of them are browsed together
  async function libraries() {
    const v = await call('GET', '/Users/' + cfg.user + '/Views');
    return (v && v.Items || []).filter(i => i.CollectionType === 'music').map(i => ({ id: i.Id, name: i.Name }));
  }

  const ID = /^[0-9a-f-]{1,64}$/i;
  // what the page may read: [path, the query keys it may set]
  const READS = {
    artists: ['/Artists/AlbumArtists', ['ParentId', 'SearchTerm', 'StartIndex', 'Limit', 'NameStartsWith']],
    items: ['/Users/{user}/Items', ['ParentId', 'IncludeItemTypes', 'Recursive', 'SortBy', 'SortOrder', 'SearchTerm', 'StartIndex', 'Limit',
      'AlbumArtistIds', 'ArtistIds', 'Fields', 'NameStartsWith', 'Ids']],
    item: ['/Users/{user}/Items/{id}', []],
  };

  return {
    status() { return { server: cfg.server || '', name: cfg.name || '', signedIn: !!(cfg.token && cfg.user), library: cfg.library || '' }; },
    async signIn(server, user, pw) {
      const s = clean(server);
      if (!s) return { error: 'La dirección tiene que empezar con http:// o https://' };
      const was = cfg.server; cfg.server = s;
      try {
        const r = await call('POST', '/Users/AuthenticateByName', null, { Username: String(user || '').slice(0, 128), Pw: String(pw || '').slice(0, 256) }, '');
        if (!r || !r.AccessToken || !r.User) throw new Error('no token');
        Object.assign(cfg, { token: r.AccessToken, user: r.User.Id, name: r.User.Name || String(user) });
        const libs = await libraries();
        cfg.library = libs[0] ? libs[0].id : ''; cfg.libraries = libs.map(l => l.id);
        save(); log('jellyfin: signed in to ' + s + ' as ' + cfg.name + ', ' + libs.length + ' music librar' + (libs.length === 1 ? 'y' : 'ies'));
        return { ok: true, name: cfg.name, library: cfg.library, libraries: libs.length };
      } catch (e) {
        cfg.server = was || s;
        log('jellyfin: sign-in to ' + s + ' failed: ' + e.message);
        return { error: e.code === 401 ? 'Usuario o contraseña incorrectos' : 'No contesta el servidor (' + e.message + ')' };
      }
    },
    signOut() { delete cfg.token; delete cfg.user; delete cfg.library; delete cfg.libraries; save(); return { ok: true }; },
    async read(kind, id, query) {
      // 7.10.10: the music libraries by name, for the DM-90's choice of one of them (or all)
      if (kind === 'libraries' && cfg.token) {
        try { const libs = await libraries(); cfg.libraries = libs.map(l => l.id); save(); return { Items: libs }; }
        catch (e) { log('jellyfin: libraries failed: ' + e.message); return { error: e.code === 401 ? 'signed out' : e.message }; }
      }
      if (!cfg.token || !READS[kind]) return { error: 'signed out' };
      const only = query && ID.test(String(query.Library || '')) ? String(query.Library) : '';   // 7.10.10: one library
      const [p, keys] = READS[kind];
      if (p.includes('{id}') && !ID.test(String(id || ''))) return { error: 'bad id' };
      const q = {};
      for (const k of keys) if (query && query[k] !== undefined) q[k] = String(query[k]).slice(0, 200);
      if (kind === 'artists') q.UserId = cfg.user;
      const path_ = p.replace('{user}', cfg.user).replace('{id}', String(id));
      try {
        if (kind === 'item' || q.ParentId || q.Ids) return await call('GET', path_, q);
        // 7.10.4: every music library (music only), each read in pages of 2,000 with no images or user data, so
        // a big library (1,400 albums, 15,000 songs) comes whole instead of timing out in one huge answer
        if (!cfg.libraries) { cfg.libraries = (await libraries()).map(l => l.id); save(); }
        const want = Number(q.Limit) || 100000, out = [];
        for (const lib of only && cfg.libraries.includes(only) ? [only] : cfg.libraries.length ? cfg.libraries : [cfg.library]) {
          for (let start = 0; out.length < want;) {
            const page = Math.min(2000, want - out.length);
            const r = await call('GET', path_, Object.assign({}, q, { ParentId: lib, StartIndex: start, Limit: page, EnableImages: 'false', EnableUserData: 'false', ImageTypeLimit: 0 }), null, cfg.token, 60000);
            const items = r && r.Items || [];
            out.push(...items); start += items.length;
            if (items.length < page || start >= (r.TotalRecordCount || 0)) break;
          }
        }
        const seen = new Set();                                    // an artist in two libraries once
        return { Items: out.filter(i => !i.Id || (seen.has(i.Id) ? false : seen.add(i.Id))), TotalRecordCount: out.length };
      } catch (e) { log('jellyfin: ' + kind + ' failed: ' + e.message); return { error: e.code === 401 ? 'signed out' : e.message }; }
    },
    // where a song's sound comes from: the file as it is (static) when Chromium plays its codec, or made FLAC
    // by the server when it doesn't (ALAC, WMA, APE, DSD…)
    stream(id, playable) {
      if (!cfg.token || !ID.test(String(id || ''))) return '';
      const base = cfg.server + '/Audio/' + id;
      return playable ? base + '/stream?static=true&api_key=' + cfg.token
        : base + '/stream.flac?AudioCodec=flac&api_key=' + cfg.token;
    },
  };
}

module.exports = { createJellyfin };
