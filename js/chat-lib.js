/* Pure chat helpers (no DOM) so they can be unit-tested in Node. */
(function (root) {
  const unescapeTag = s => String(s).replace(/\\(.)/g, (_, c) => ({ s: ' ', n: '\n', r: '\r', ':': ';', '\\': '\\' }[c] ?? c));

  /* @tags :prefix COMMAND params :trailing */
  function parseIrc(line) {
    let l = String(line), tags = {}, prefix = '';
    if (l[0] === '@') {
      const i = l.indexOf(' ');
      for (const p of l.slice(1, i).split(';')) { const j = p.indexOf('='); if (j > 0) tags[p.slice(0, j)] = unescapeTag(p.slice(j + 1)); }
      l = l.slice(i + 1);
    }
    if (l[0] === ':') { const i = l.indexOf(' '); prefix = l.slice(1, i); l = l.slice(i + 1); }
    let trailing = null;
    const ci = l.indexOf(' :');
    if (ci >= 0) { trailing = l.slice(ci + 2); l = l.slice(0, ci); }
    const [cmd, ...params] = l.split(' ');
    return { tags, prefix, cmd, params, trailing };
  }

  /* Split message text into parts using Twitch's emotes tag ("25:0-4,12-16/1902:6-10", codepoint indexes)
     and an optional map of third-party emotes (name -> https url). Returns [{t:'text',v}|{t:'emote',url,name}] */
  function messageParts(text, emotesTag, ext) {
    const chars = Array.from(text), ranges = [];
    if (emotesTag) for (const grp of String(emotesTag).split('/')) {
      const [id, pos] = grp.split(':');
      if (!id || !pos || !/^[\w-]+$/.test(id)) continue;
      for (const r of pos.split(',')) { const [a, b] = r.split('-').map(Number); if (Number.isInteger(a) && Number.isInteger(b) && a <= b && b < chars.length) ranges.push({ a, b, id }); }
    }
    ranges.sort((x, y) => x.a - y.a);
    const parts = [];
    const pushText = s => {
      if (!s) return;
      if (!ext || !ext.size) { parts.push({ t: 'text', v: s }); return; }
      let buf = '';
      for (const tok of s.split(/(\s+)/)) {
        const url = ext.get(tok);
        if (url) { if (buf) parts.push({ t: 'text', v: buf }); buf = ''; parts.push({ t: 'emote', url, name: tok }); }
        else buf += tok;
      }
      if (buf) parts.push({ t: 'text', v: buf });
    };
    let cur = 0;
    for (const r of ranges) {
      if (r.a < cur) continue;
      pushText(chars.slice(cur, r.a).join(''));
      parts.push({ t: 'emote', url: `https://static-cdn.jtvnw.net/emoticons/v2/${r.id}/default/dark/2.0`, name: chars.slice(r.a, r.b + 1).join('') });
      cur = r.b + 1;
    }
    pushText(chars.slice(cur).join(''));
    return parts;
  }

  /* privmsg -> normalized message or null */
  function twitchMessage(irc) {
    if (irc.cmd !== 'PRIVMSG' || irc.trailing == null) return null;
    let text = irc.trailing, action = false;
    const m = text.match(/^\u0001ACTION (.*?)\u0001?$/s);
    if (m) { text = m[1]; action = true; }
    const login = (irc.prefix.split('!')[0] || '').toLowerCase();
    const t = irc.tags;
    const badges = String(t.badges || '').split(',').map(b => b.split('/')[0]).filter(Boolean);
    return {
      id: t.id || login + ':' + (t['tmi-sent-ts'] || Math.random()), platform: 'twitch', login,
      name: t['display-name'] || login, color: /^#[0-9a-f]{6}$/i.test(t.color || '') ? t.color : '',
      text, emotes: t.emotes || '', action, ts: Number(t['tmi-sent-ts']) || Date.now(),
      owner: badges.includes('broadcaster'), mod: badges.includes('moderator'), member: badges.includes('subscriber') || badges.includes('founder'),
      roomId: t['room-id'] || '',
    };
  }

  const hideSet = csv => new Set(String(csv || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean));
  const api = { parseIrc, messageParts, twitchMessage, hideSet };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.CHATLIB = api;
})(typeof window !== 'undefined' ? window : globalThis);
