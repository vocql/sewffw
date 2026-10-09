/* Overlay registry + URL builder/parser. Loaded in the browser AND required by tests/overlay-urls.test.js.
   Overlay URL shape:   <domain>/#/live/<channel>/overlay/<type>?user=<platform user>&<settings>   */
(function (root) {
  const BRAND = { domain: 'https://voqcl.com', channel: 'voqcl' };
  const FONTS = { sans: 'Sans', serif: 'Serif', mono: 'Mono', rounded: 'Rounded', display: 'Display' };

  const userField = { k: 'user', label: 'Channel / user', type: 'text', def: 'voqcl', hint: 'Twitch channel, or for YouTube an @handle, channel ID (UC…) or live video URL/ID.' };

  const OVERLAYS = {
    chat: {
      label: 'Chat', tool: 'chat', desc: 'Twitch or YouTube live chat',
      fields: [
        { k: 'platform', label: 'Platform', type: 'select', def: 'twitch', opts: { twitch: 'Twitch', youtube: 'YouTube' } },
        userField,
        { k: 'size', label: 'Text size (px)', type: 'number', def: 20, min: 12, max: 56 },
        { k: 'font', label: 'Font', type: 'select', def: 'sans', opts: FONTS },
        { k: 'color', label: 'Text colour', type: 'color', def: 'ffffff' },
        { k: 'bg', label: 'Message background (0-100%)', type: 'number', def: 35, min: 0, max: 100 },
        { k: 'avatars', label: 'Profile pictures', type: 'bool', def: true },
        { k: 'time', label: 'Timestamps', type: 'bool', def: false },
        { k: 'tag', label: 'Platform tag', type: 'bool', def: true },
        { k: 'ext', label: '7TV + BTTV emotes (Twitch)', type: 'bool', def: true },
        { k: 'anim', label: 'Slide-in animation', type: 'bool', def: true },
        { k: 'max', label: 'Messages on screen', type: 'number', def: 30, min: 3, max: 100 },
        { k: 'fade', label: 'Fade out after (seconds, 0 = never)', type: 'number', def: 0, min: 0, max: 600 },
        { k: 'bots', label: 'Hide these accounts (comma separated)', type: 'text', def: 'nightbot,streamelements,streamlabs,moobot' },
        { k: 'status', label: 'Show connection status', type: 'bool', def: true },
      ],
    },
    emote: {
      label: 'Emote', tool: 'emote', desc: 'Floating emote bursts',
      fields: [
        userField,
        { k: 'e', label: 'Emotes (emoji, or https image URLs, space separated)', type: 'text', def: '🔥 💜 😂 🎉 ⭐' },
        { k: 'n', label: 'Emotes per burst', type: 'number', def: 6, min: 1, max: 40 },
        { k: 'every', label: 'Burst every (seconds)', type: 'number', def: 8, min: 1, max: 600 },
        { k: 'size', label: 'Emote size (px)', type: 'number', def: 48, min: 16, max: 160 },
      ],
    },
    followtracker: {
      label: 'Follower tracker', tool: 'followlive', desc: 'Live follower / subscriber count',
      fields: [
        { k: 'platform', label: 'Platform', type: 'select', def: 'twitch', opts: { twitch: 'Twitch followers', youtube: 'YouTube subscribers' } },
        userField,
        { k: 'chart', label: 'Show history chart', type: 'bool', def: false },
        { k: 'avatar', label: 'Show profile picture', type: 'bool', def: true },
        { k: 'size', label: 'Count size scale (%)', type: 'number', def: 100, min: 40, max: 200 },
      ],
    },
    countdown: {
      label: 'Countdown', tool: 'countdown', desc: 'Countdown to a date/time or for a duration',
      fields: [
        userField,
        { k: 'mode', label: 'Mode', type: 'select', def: 'duration', opts: { duration: 'Duration (starts when overlay loads)', until: 'Until a date/time' } },
        { k: 'minutes', label: 'Duration (minutes)', type: 'number', def: 5, min: 0.1, max: 10080, showIf: { mode: 'duration' } },
        { k: 'until', label: 'Target (UTC, ISO e.g. 2026-12-31T20:00:00Z)', type: 'text', def: '', showIf: { mode: 'until' } },
        { k: 'label', label: 'Label', type: 'text', def: 'Starting soon' },
        { k: 'end', label: 'Text when finished', type: 'text', def: "Let's go!" },
        { k: 'size', label: 'Size (px)', type: 'number', def: 96, min: 24, max: 300 },
        { k: 'color', label: 'Colour', type: 'color', def: 'ffffff' },
        { k: 'days', label: 'Show days when needed', type: 'bool', def: true },
      ],
    },
    goal: {
      label: 'Goal bar', tool: 'goal', desc: 'Progress bar towards a goal, live or manual',
      fields: [
        { k: 'source', label: 'Progress source', type: 'select', def: 'manual', opts: { manual: 'Manual number', twitch: 'Twitch followers (live)', youtube: 'YouTube subscribers (live)' } },
        userField,
        { k: 'label', label: 'Label', type: 'text', def: 'Follower goal' },
        { k: 'current', label: 'Current (manual only)', type: 'number', def: 0, min: 0, max: 1e9, showIf: { source: 'manual' } },
        { k: 'goal', label: 'Goal', type: 'number', def: 100, min: 1, max: 1e9 },
        { k: 'color', label: 'Bar colour', type: 'color', def: 'ffffff' },
        { k: 'width', label: 'Width (px)', type: 'number', def: 600, min: 200, max: 1800 },
      ],
    },
    ticker: {
      label: 'Text ticker', tool: 'ticker', desc: 'Scrolling announcement bar',
      fields: [
        userField,
        { k: 'text', label: 'Messages (separate with |)', type: 'text', def: 'Thanks for watching | Follow for more streams' },
        { k: 'speed', label: 'Speed (px per second)', type: 'number', def: 90, min: 20, max: 600 },
        { k: 'size', label: 'Text size (px)', type: 'number', def: 32, min: 12, max: 120 },
        { k: 'color', label: 'Text colour', type: 'color', def: 'ffffff' },
        { k: 'bgc', label: 'Bar colour', type: 'color', def: '000000' },
        { k: 'bg', label: 'Bar opacity (0-100%)', type: 'number', def: 60, min: 0, max: 100 },
        { k: 'sep', label: 'Separator', type: 'text', def: '•' },
      ],
    },
    scene: {
      label: 'Scene screen', tool: 'scene', desc: 'Starting soon / BRB / ending screen',
      fields: [
        userField,
        { k: 'title', label: 'Title', type: 'text', def: 'Starting soon' },
        { k: 'sub', label: 'Subtitle', type: 'text', def: '' },
        { k: 'minutes', label: 'Countdown (minutes, 0 = none)', type: 'number', def: 0, min: 0, max: 1440 },
        { k: 'accent', label: 'Accent colour', type: 'color', def: 'ffffff' },
        { k: 'bgc', label: 'Background colour', type: 'color', def: '000000' },
        { k: 'bg', label: 'Background opacity (0-100%)', type: 'number', def: 100, min: 0, max: 100 },
        { k: 'font', label: 'Font', type: 'select', def: 'display', opts: FONTS },
      ],
    },
  };

  const CHANNEL_RE = /^\w{3,25}$/;

  function defaults(type) {
    const o = {};
    for (const f of OVERLAYS[type].fields) o[f.k] = f.def;
    return o;
  }

  /* Turn a raw string (from a URL) into a validated typed value; returns {v, bad} */
  function coerce(f, raw) {
    if (raw === undefined || raw === null) return { v: f.def };
    if (f.type === 'bool') { if (raw === '1' || raw === 'true') return { v: true }; if (raw === '0' || raw === 'false') return { v: false }; return { v: f.def, bad: true }; }
    if (f.type === 'number') { const n = Number(raw); if (raw === '' || !Number.isFinite(n)) return { v: f.def, bad: true }; return { v: Math.min(f.max, Math.max(f.min, n)), bad: n < f.min || n > f.max }; }
    if (f.type === 'select') return f.opts[raw] ? { v: raw } : { v: f.def, bad: true };
    if (f.type === 'color') { const c = String(raw).replace(/^#/, ''); return /^[0-9a-f]{6}$/i.test(c) ? { v: c.toLowerCase() } : { v: f.def, bad: true }; }
    return { v: String(raw).slice(0, 2000) };
  }

  function sanitize(type, raw) {
    const out = {}, bad = [];
    for (const f of OVERLAYS[type].fields) {
      const r = coerce(f, raw[f.k]);
      out[f.k] = r.v;
      if (r.bad) bad.push(f.k);
    }
    return { values: out, bad };
  }

  function buildUrl(type, values, opt = {}) {
    const ov = OVERLAYS[type];
    if (!ov) throw new Error('Unknown overlay type: ' + type);
    const domain = String(opt.domain || BRAND.domain).replace(/\/+$/, '');
    const channel = opt.channel || BRAND.channel;
    if (!/^https?:\/\/[^\s/?#]+(\/[^\s?#]*)?$/.test(domain)) throw new Error('Domain must look like https://voqcl.com');
    if (!CHANNEL_RE.test(channel)) throw new Error('Overlay channel must be 3-25 letters, numbers or underscores.');
    const p = new URLSearchParams();
    for (const f of ov.fields) {
      const r = sanitize(type, { [f.k]: values[f.k] === undefined ? undefined : typeof values[f.k] === 'boolean' ? (values[f.k] ? '1' : '0') : String(values[f.k]) });
      const v = r.values[f.k];
      if (f.k === 'user') { p.set('user', String(values.user ?? f.def).trim() || f.def); continue; }
      if (v !== f.def) p.set(f.k, typeof v === 'boolean' ? (v ? '1' : '0') : String(v));
    }
    return `${domain}/#/live/${channel}/overlay/${type}?${p.toString()}`;
  }

  /* hash like '#/live/voqcl/overlay/chat?user=voqcl' -> {ok, channel, type, values, bad} */
  function parseHash(hash) {
    let h = String(hash || '').replace(/^#/, '');
    const qi = h.indexOf('?');
    const query = qi >= 0 ? h.slice(qi + 1) : '';
    if (qi >= 0) h = h.slice(0, qi);
    const parts = h.split('/').filter(Boolean);
    if (parts[0] !== 'live' || !CHANNEL_RE.test(parts[1] || '')) return { ok: false, error: 'Invalid overlay address.' };
    const channel = parts[1].toLowerCase();
    if (parts.length === 2) return { ok: false, error: 'Invalid overlay address.' };
    if (parts[2] !== 'overlay') return { ok: false, error: 'Invalid overlay address.' };
    const type = parts[3] || 'followtracker';
    if (parts.length > 4 || !OVERLAYS[type]) return { ok: false, error: `Unknown overlay "${parts[3] || ''}".` };
    const raw = {};
    for (const [k, v] of new URLSearchParams(query)) if (!(k in raw)) raw[k] = v;
    if (raw.user === undefined || raw.user === '') raw.user = channel;
    const { values, bad } = sanitize(type, raw);
    return { ok: true, channel, type, values, bad };
  }

  const api = { BRAND, OVERLAYS, FONTS, CHANNEL_RE, defaults, sanitize, buildUrl, parseHash };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.OVC = api;
})(typeof window !== 'undefined' ? window : globalThis);
