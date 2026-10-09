/* ===== Overlay tools (URL generator UI) and overlay runtime (what OBS loads) ===== */
const FONTSTACK = {
  sans: 'Inter,"Helvetica Neue",Arial,system-ui,sans-serif', serif: 'Georgia,"Times New Roman",serif', mono: 'ui-monospace,Menlo,Consolas,monospace',
  rounded: 'ui-rounded,"Arial Rounded MT Bold","Trebuchet MS",system-ui,sans-serif', display: '"Arial Black",Impact,"Helvetica Neue",sans-serif',
};
const OV_SIZES = { chat: '400 × 600', emote: '1920 × 1080', followtracker: '600 × 300', countdown: '900 × 260', goal: '700 × 140', ticker: '1920 × 90', scene: '1920 × 1080' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const isHttp = () => /^https?:$/.test(location.protocol);
const hexA = (hex, pct) => { const n = parseInt(hex, 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${(pct / 100).toFixed(2)})`; };

let _cfg;
const siteConfig = () => (_cfg ||= ytApi('config'));

/* ---------- URL generator panel ---------- */
function ovUrlPanel(host, type, getValues) {
  const O = OVC.OVERLAYS[type];
  host.innerHTML = `<b class="sec">OBS Browser Source URL</b>
  <div class="row"><div style="flex:1;min-width:150px"><label>Site domain</label><input data-d value="${esc(LS.g('ov.domain', SITE))}" spellcheck="false"></div>
  <div style="width:150px"><label>Overlay channel</label><input data-c value="${esc(LS.g('ov.channel', OVC.BRAND.channel))}" spellcheck="false"></div></div>
  <div class="row"><code data-u style="flex:1;min-width:200px;padding:10px;display:block"></code></div>
  <div class="err" data-e style="min-height:18px"></div>
  <div class="row" style="margin-top:0"><button class="pri" data-cp>Copy URL</button><a class="btn" data-op target="_blank" rel="noopener">Open in new tab</a><button data-loc>Use this site's address</button></div>
  <div class="note">In OBS: <b>Sources → Browser</b>, paste the URL, set width × height to <b>${OV_SIZES[type]}</b> (or your layout), and leave Custom CSS empty. The overlay background is transparent.</div>`;
  const $d = $('[data-d]', host), $c = $('[data-c]', host), $u = $('[data-u]', host), $e = $('[data-e]', host);
  let url = '';
  const upd = () => {
    try {
      url = OVC.buildUrl(type, getValues(), { domain: $d.value.trim(), channel: $c.value.trim().toLowerCase() });
      $e.textContent = ''; $u.textContent = url; $('[data-cp]', host).disabled = false;
      LS.s('ov.domain', $d.value.trim()); LS.s('ov.channel', $c.value.trim().toLowerCase());
    } catch (e) { url = ''; $e.textContent = e.message; $u.textContent = ''; $('[data-cp]', host).disabled = true; }
    const op = $('[data-op]', host); op.href = url || '#';
    return url;
  };
  $d.oninput = $c.oninput = upd;
  $('[data-cp]', host).onclick = e => url && copy(url, e.target);
  $('[data-loc]', host).onclick = () => { if (isHttp()) { $d.value = HERE; upd(); } else $e.textContent = 'Open the site over http(s) first (see README).'; };
  upd();
  return upd;
}

/* ---------- generic overlay tool: settings form + live preview + URL ---------- */
function ovTool(type, title, desc, extraHtml = '', after) {
  const O = OVC.OVERLAYS[type];
  return el => {
    const V = { ...OVC.defaults(type), ...LS.g('ov.' + type, {}) };
    el.innerHTML = page(title, desc, `<div class="two ovtwo"><div class="panel ovform" data-f></div><div><div class="panel checker" style="padding:0;overflow:hidden"><iframe data-p title="Overlay preview" style="width:100%;height:${type === 'chat' ? 440 : type === 'scene' ? 300 : 240}px;border:0;display:block;background:transparent"></iframe></div><div class="panel" data-u style="margin-top:10px"></div>${extraHtml}</div></div>`);
    const form = $('[data-f]', el), prev = $('[data-p]', el);
    const rows = {};
    for (const f of O.fields) {
      const w = document.createElement('div'); rows[f.k] = w;
      if (f.type === 'text' || f.hint) w.className = 'full';
      if (f.type === 'bool') w.className = 'tog';   /* toggles grouped after the other settings */
      let inp;
      if (f.type === 'bool') { w.innerHTML = `<label class="sw">${esc(f.label)}<input type="checkbox"></label>`; inp = $('input', w); inp.checked = !!V[f.k]; inp.onchange = () => { V[f.k] = inp.checked; change(); }; }
      else {
        w.innerHTML = `<label>${esc(f.label)}</label>`;
        if (f.type === 'select') { inp = document.createElement('select'); inp.innerHTML = Object.entries(f.opts).map(([k, n]) => `<option value="${k}">${esc(n)}</option>`).join(''); inp.value = V[f.k]; inp.onchange = () => { V[f.k] = inp.value; change(); }; }
        else if (f.type === 'color') { inp = document.createElement('input'); inp.type = 'color'; inp.value = '#' + V[f.k]; inp.oninput = () => { V[f.k] = inp.value.slice(1); change(); }; }
        else if (f.type === 'number') { inp = document.createElement('input'); inp.type = 'number'; inp.min = f.min; inp.max = f.max; inp.step = f.max <= 10 ? 0.1 : 1; inp.value = V[f.k]; inp.oninput = () => { if (inp.value !== '') { V[f.k] = Number(inp.value); change(); } }; }
        else { inp = document.createElement('input'); inp.type = 'text'; inp.value = V[f.k]; inp.spellcheck = false; inp.oninput = () => { V[f.k] = inp.value; change(); }; }
        w.append(inp);
        if (f.hint) { const s = document.createElement('small'); s.style.cssText = 'color:var(--mu);display:block;margin-top:3px'; s.textContent = f.hint; w.append(s); }
      }
      form.append(w);
    }
    const reset = document.createElement('button'); reset.textContent = 'Reset to defaults'; reset.style.marginTop = '12px'; reset.className = 'full';
    reset.onclick = () => { LS.s('ov.' + type, {}); rerun(el); }; form.append(reset);
    const showIf = () => { for (const f of O.fields) if (f.showIf) rows[f.k].style.display = Object.entries(f.showIf).every(([k, v]) => V[k] === v) ? '' : 'none'; };
    const upd = ovUrlPanel($('[data-u]', el), type, () => V);
    let t;
    const preview = () => {
      if (!isHttp()) { prev.srcdoc = '<body style="font:13px system-ui;color:#999;padding:16px">Preview needs the site served over http(s). See README.</body>'; return; }
      try { prev.src = OVC.buildUrl(type, V, { domain: HERE, channel: $('[data-c]', el).value.trim().toLowerCase() || OVC.BRAND.channel }); } catch {}
    };
    const change = () => { showIf(); LS.s('ov.' + type, V); upd(); clearTimeout(t); t = setTimeout(preview, 350); };
    showIf(); preview();
    after && after(el, V);
  };
}

/* ---------- registrations ---------- */
add('chat', 'obs', '💬', 'Chat overlay', 'Twitch and YouTube live chat for OBS, with emotes and YouTube profile pictures.',
  ovTool('chat', 'Chat overlay', 'Live Twitch or YouTube chat as a transparent OBS Browser Source. Pick a platform, style it, copy the URL.',
    `<div class="panel" style="margin-top:10px" data-cs><b class="sec">Platform status</b><div data-st style="margin-top:6px;color:var(--mu)">Checking…</div></div>
     <div class="note"><b>Twitch</b> connects straight from the overlay to Twitch chat as a read-only guest, no login needed (Twitch doesn't send profile pictures in chat, so Twitch messages show a coloured initial). <b>YouTube</b> uses the API key in config.js and works while the stream is live. If you enter a channel, it finds the current live stream automatically.</div>`,
    async el => {
      const c = await siteConfig(), s = $('[data-st]', el);
      if (!s) return;
      s.innerHTML = `Twitch chat: <span class="ok">ready</span><br>YouTube chat: ${c.youtube ? '<span class="ok">enabled</span>' : `<span class="err">not available — ${esc(c.why)}</span>`}`;
    }));
add('countdown', 'obs', '⏱', 'Countdown', 'Countdown to a time, or for a set duration.', ovTool('countdown', 'Countdown overlay', 'A big countdown for starting-soon screens or events. Choose a duration or a fixed date/time.'));
add('goal', 'obs', '🎯', 'Goal bar', 'Progress bar for follower or subscriber goals.', ovTool('goal', 'Goal bar overlay', 'Show progress towards a goal. Use a manual number, or track live Twitch followers / YouTube subscribers.'));
add('ticker', 'obs', '⇄', 'Text ticker', 'Scrolling announcement bar.', ovTool('ticker', 'Text ticker overlay', 'A smooth scrolling bar for announcements, socials or sponsor messages.'));
add('scene', 'obs', '▣', 'Scene screen', 'Starting soon / BRB / ending screen.', ovTool('scene', 'Scene screen overlay', 'A full-screen title card with an optional countdown. Use it for Starting Soon, BRB or Ending scenes.'));

/* ---------- runtime ---------- */
function renderOverlay(app, p) {
  const box = app.appendChild(Object.assign(document.createElement('div'), { id: 'ovr' }));
  document.title = `${p.type} overlay · VOQCL`;
  const fn = { chat: ovChat, emote: ovEmote, followtracker: ovFollow, countdown: ovCountdown, goal: ovGoal, ticker: ovTicker, scene: ovScene }[p.type];
  fn(box, p.values, p);
}
function ovError(box, msg) { box.innerHTML = `<div class="ove">${esc(msg)}</div>`; }

/* ---- chat ---- */
function ovChat(box, v) {
  const fontCss = FONTSTACK[v.font];
  box.innerHTML = `<div class="ovc" style="font:600 ${v.size}px/1.25 ${fontCss};color:#${v.color};--bga:${(v.bg / 100).toFixed(2)}"><div class="ovc-l"></div></div><div class="ovst"></div>`;
  const list = $('.ovc-l', box), stEl = $('.ovst', box);
  const hide = CHATLIB.hideSet(v.bots), tmap = new Map();
  let stopped = false; CLEAN.push(() => { stopped = true; });
  const status = (m, bad) => { if (!v.status && !bad) return; stEl.textContent = m || ''; stEl.classList.toggle('bad', !!bad); stEl.hidden = !m; };
  const fmt = ts => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const initial = (name, color) => { const d = document.createElement('div'); d.className = 'av'; d.textContent = (name[0] || '?').toUpperCase(); if (color) d.style.background = color; return d; };
  function avatarEl(m) {
    if (m.avatar) { const i = new Image(); i.className = 'av'; i.alt = ''; i.referrerPolicy = 'no-referrer'; i.src = m.avatar; i.onerror = () => i.replaceWith(initial(m.name, m.color)); return i; }
    const d = initial(m.name, m.color);
    return d;
  }
  function add1(m) {
    if (hide.has((m.login || m.name || '').toLowerCase()) || hide.has((m.name || '').toLowerCase())) return;
    const row = document.createElement('div');
    row.className = `msg ${m.platform}${m.kind === 'super' ? ' super' : ''}${v.anim ? ' in' : ''}`;
    if (v.avatars) row.append(avatarEl(m));
    const body = document.createElement('div'); body.className = 'bd';
    const head = document.createElement('div'); head.className = 'hd';
    if (v.tag) { const t = document.createElement('span'); t.className = 'ptag'; t.title = m.platform; head.append(t); }
    const nm = document.createElement('span'); nm.className = 'nm2' + (m.owner ? ' owner' : m.mod ? ' mod' : m.member ? ' mem' : ''); nm.textContent = m.name;
    if (m.color) nm.style.color = m.color; head.append(nm);
    if (m.extra) { const x = document.createElement('span'); x.className = 'amt'; x.textContent = m.extra; head.append(x); }
    if (v.time) { const t = document.createElement('span'); t.className = 'tm'; t.textContent = fmt(m.ts); head.append(t); }
    const tx = document.createElement('div'); tx.className = 'tx' + (m.action ? ' act' : '');
    const parts = m.parts || [{ t: 'text', v: m.text }];
    for (const pt of parts) {
      if (pt.t === 'emote' && /^https:\/\//.test(pt.url)) { const i = new Image(); i.className = 'emo'; i.alt = pt.name; i.title = pt.name; i.src = pt.url; tx.append(i); }
      else tx.append(document.createTextNode(pt.v ?? pt.name ?? ''));
    }
    if (m.kind === 'member' && !m.text) tx.textContent = 'became a member';
    body.append(head, tx); row.append(body); list.append(row);
    while (list.children.length > v.max) list.firstChild.remove();
    if (v.fade > 0) setTimeout(() => { row.classList.add('out'); setTimeout(() => row.remove(), 600); }, v.fade * 1000);
  }

  if (v.platform === 'twitch') {
    const chan = String(v.user).trim().replace(/^@/, '').toLowerCase();
    if (!/^\w{3,25}$/.test(chan)) return status('Invalid Twitch channel name (3-25 letters, numbers or underscores).', true);
    let tries = 0, ws, roomLoaded = false;
    const loadExt = async roomId => {
      if (!v.ext || roomLoaded) return; roomLoaded = true;
      const get = u => fetch(u).then(r => r.ok ? r.json() : null).catch(() => null);
      const [g7, c7, gb, cb] = await Promise.all([get('https://7tv.io/v3/emote-sets/global'), get('https://7tv.io/v3/users/twitch/' + roomId), get('https://api.betterttv.net/3/cached/emotes/global'), get('https://api.betterttv.net/3/cached/users/twitch/' + roomId)]);
      const seven = set => (set?.emotes || []).forEach(e => { const h = e.data?.host?.url; if (h && e.name) tmap.set(e.name, 'https:' + h + '/2x.webp'); });
      (cb?.channelEmotes || []).concat(cb?.sharedEmotes || [], Array.isArray(gb) ? gb : []).forEach(e => e.id && e.code && tmap.set(e.code, `https://cdn.betterttv.net/emote/${e.id}/2x.webp`));
      seven(g7); seven(c7?.emote_set);
    };
    const connect = () => {
      if (stopped) return;
      status('Connecting to Twitch chat…');
      ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');
      CLEAN.push(() => { try { ws.close(); } catch {} });
      ws.onopen = () => { ws.send('CAP REQ :twitch.tv/tags twitch.tv/commands'); ws.send('PASS SCHMOOPIIE'); ws.send('NICK justinfan' + (10000 + Math.floor(Math.random() * 80000))); ws.send('JOIN #' + chan); };
      ws.onmessage = e => {
        for (const line of String(e.data).split('\r\n')) {
          if (!line) continue;
          const irc = CHATLIB.parseIrc(line);
          if (irc.cmd === 'PING') ws.send('PONG :' + (irc.trailing || 'tmi.twitch.tv'));
          else if (irc.cmd === 'JOIN') { tries = 0; status('Connected to #' + chan); setTimeout(() => { if (stEl.textContent.startsWith('Connected')) status(''); }, 2500); }
          else if (irc.cmd === 'ROOMSTATE' && irc.tags['room-id']) loadExt(irc.tags['room-id']);
          else if (irc.cmd === 'NOTICE') status('Twitch: ' + (irc.trailing || 'notice'), /login|invalid|suspend|ban/i.test(irc.trailing || ''));
          else if (irc.cmd === 'RECONNECT') ws.close();
          else if (irc.cmd === 'PRIVMSG') { const m = CHATLIB.twitchMessage(irc); if (m) { m.parts = CHATLIB.messageParts(m.text, m.emotes, tmap); add1(m); } }
        }
      };
      ws.onclose = () => { if (stopped) return; tries++; status('Disconnected from Twitch. Reconnecting…', true); setTimeout(connect, Math.min(30000, 1000 * 2 ** Math.min(tries, 5))); };
    };
    /* check the channel exists (DecAPI), purely to give a helpful error; ignore if the check service is down */
    decTxt('avatar/' + chan).then(t => { if (/user not found|not found|no user/i.test(t)) status(`Twitch channel "${chan}" was not found.`, true); }).catch(() => {});
    connect();
  } else {
    const input = String(v.user).trim();
    (async () => {
      const c = await siteConfig();
      if (!c.youtube) return status(c.why, true);
      let video = '', token = '', first = true;
      const seen = new Set();
      while (!stopped) {
        try {
          if (!video) { status('Looking for a live YouTube stream…'); video = (await ytApi('resolve', { q: input })).video; token = ''; first = true; status('Connected to YouTube chat'); setTimeout(() => { if (stEl.textContent.startsWith('Connected')) status(''); }, 2500); }
          const r = await ytApi('chat', { video, pageToken: token });
          token = r.nextPageToken || token;
          const fresh = r.messages.filter(m => !seen.has(m.id)); fresh.forEach(m => seen.add(m.id));
          if (seen.size > 2000) { seen.clear(); fresh.forEach(m => seen.add(m.id)); }
          (first ? fresh.slice(-8) : fresh).forEach(m => add1({ ...m, platform: 'youtube', login: m.name }));
          first = false;
          await sleep(Math.min(15000, Math.max(2000, r.pollMs || 5000)));
        } catch (e) {
          if (['not_configured', 'bad_input', 'bad_key'].includes(e.code)) { status(e.message, true); return; }
          if (e.code === 'quota') { status(e.message, true); await sleep(60000); }
          else if (['not_live', 'chat_ended', 'not_found', 'chat_disabled', 'video_not_found', 'channel_not_found', 'forbidden'].includes(e.code)) { video = ''; status(e.message + ' Retrying…', true); await sleep(30000); }
          else { status('Connection problem. Retrying…', true); await sleep(10000); }
        }
      }
    })();
  }
}

/* ---- emote ---- */
function ovEmote(box, v) {
  const items = String(v.e).split(/\s+/).filter(Boolean);
  if (!items.length) return ovError(box, 'No emotes set.');
  box.innerHTML = '<div class="ove-st"></div>';
  const st = box.firstChild;
  const burst = () => {
    for (let i = 0; i < v.n; i++) {
      const it = items[i % items.length], s = document.createElement('span');
      s.className = 'em'; s.style.left = Math.random() * 90 + '%'; s.style.animationDelay = Math.random() * .6 + 's'; s.style.fontSize = v.size + 'px';
      if (/^https:\/\/\S+$/.test(it)) { const im = new Image(); im.src = it; im.alt = ''; im.style.height = v.size + 'px'; s.append(im); } else s.textContent = it;
      st.append(s); setTimeout(() => s.remove(), 3400);
    }
  };
  burst(); tm(burst, v.every * 1000);
}

/* ---- follower tracker ---- */
function ovFollow(box, v, p) {
  const ch = v.platform === 'twitch' ? String(v.user).trim().replace(/^@/, '') : String(v.user).trim();
  if (v.platform === 'twitch' && !/^\w{3,25}$/.test(ch)) return ovError(box, 'Invalid Twitch channel name.');
  box.style.cssText = 'min-height:100vh;display:grid;place-items:center;padding:20px';
  liveView(box, v.platform === 'twitch' ? ch.toLowerCase() : ch, !v.chart, v.platform, { avatar: v.avatar, size: v.size });
}

/* ---- countdown ---- */
const fmtDur = (ms, days) => {
  let s = Math.max(0, Math.ceil(ms / 1000)), d = days ? Math.floor(s / 86400) : 0; s -= d * 86400;
  const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60, P = n => String(n).padStart(2, '0');
  return (d ? d + 'd ' : '') + (h || d ? P(h) + ':' : '') + P(m) + ':' + P(x);
};
function ovCountdown(box, v) {
  let end;
  if (v.mode === 'until') { end = Date.parse(v.until); if (!Number.isFinite(end)) return ovError(box, 'Countdown target is not a valid date. Use e.g. 2026-12-31T20:00:00Z'); }
  else end = Date.now() + v.minutes * 60000;
  box.innerHTML = `<div class="ovcd" style="color:#${v.color}"><div class="cdl">${esc(v.label)}</div><div class="cdt" style="font-size:${v.size}px"></div></div>`;
  const t = $('.cdt', box), tick = () => { const ms = end - Date.now(); t.textContent = ms <= 0 ? v.end : fmtDur(ms, v.days); };
  tick(); tm(tick, 250);
}

/* ---- goal ---- */
function ovGoal(box, v) {
  box.innerHTML = `<div class="ovg" style="width:${v.width}px;color:#fff"><div class="gh"><span class="gl">${esc(v.label)}</span><span class="gn"></span></div><div class="gb"><i style="background:#${v.color}"></i></div><div class="ge err"></div></div>`;
  let cur = v.source === 'manual' ? v.current : null;
  const paint = err => {
    const bar = $('.gb i', box); if (!bar) return;
    const pct = cur == null ? 0 : Math.min(100, cur / v.goal * 100);
    bar.style.width = pct + '%';
    $('.gn', box).textContent = cur == null ? '… / ' + v.goal.toLocaleString() : `${Math.round(cur).toLocaleString()} / ${v.goal.toLocaleString()} (${Math.floor(pct)}%)`;
    $('.ge', box).textContent = err || '';
  };
  paint();
  if (v.source === 'manual') return;
  const ch = v.source === 'twitch' ? String(v.user).trim().replace(/^@/, '') : String(v.user).trim();
  const poll = async () => {
    try {
      if (v.source === 'twitch') { const t = await decTxt('followcount/' + ch.toLowerCase()); if (!/^\d+$/.test(t)) throw new Error(/not found|no user/i.test(t) ? 'Channel not found' : 'Unexpected response'); cur = +t; }
      else { const r = await ytApi('channel', { q: ch }); if (r.subscribers == null) throw new Error('This channel hides its subscriber count'); cur = r.subscribers; }
      paint();
    } catch (e) { paint(e.message === 'Failed to fetch' ? 'Could not reach the data service' : e.message); }
  };
  poll(); tm(poll, v.source === 'twitch' ? 20000 : 60000);
}

/* ---- ticker ---- */
function ovTicker(box, v) {
  const msgs = String(v.text).split('|').map(s => s.trim()).filter(Boolean);
  if (!msgs.length) return ovError(box, 'No ticker text set.');
  box.innerHTML = `<div class="ovt" style="background:${hexA(v.bgc, v.bg)};color:#${v.color};font-size:${v.size}px"><div class="tin"></div></div>`;
  const inn = $('.tin', box), unit = msgs.map(m => `<span>${esc(m)}</span><span class="sp">${esc(v.sep)}</span>`).join('');
  const mk = () => { const g = document.createElement('div'); g.className = 'tg'; g.innerHTML = unit; return g; };
  let g = mk(); inn.append(g);
  let guard = 0; while (g.scrollWidth < innerWidth && guard++ < 30) g.innerHTML += unit;
  const w = g.scrollWidth; inn.append(mk());
  const a = inn.animate([{ transform: 'translateX(0)' }, { transform: `translateX(-${w}px)` }], { duration: w / v.speed * 1000, iterations: Infinity });
  CLEAN.push(() => a.cancel());
}

/* ---- scene ---- */
function ovScene(box, v) {
  box.innerHTML = `<div class="ovs" style="background:${hexA(v.bgc, v.bg)};color:#${v.accent};font-family:${FONTSTACK[v.font]}"><div class="st">${esc(v.title)}</div>${v.sub ? `<div class="ss">${esc(v.sub)}</div>` : ''}${v.minutes > 0 ? '<div class="sc"></div>' : ''}</div>`;
  if (v.minutes > 0) { const end = Date.now() + v.minutes * 60000, c = $('.sc', box), tick = () => { c.textContent = fmtDur(end - Date.now()); }; tick(); tm(tick, 250); }
}

/* ---- retained Emote tool: keep the original UI, add the hosted-URL generator ---- */
(() => {
  const t = T.find(x => x.id === 'emote'); if (!t) return;
  t.desc = 'Floating emote bursts for your stream, as a live overlay URL.';
  const orig = t.fn;
  t.fn = el => {
    orig(el);
    const note = $('.note', el); if (note && /static files/.test(note.textContent)) note.innerHTML = '<b>Overlay URL:</b> use the generated URL below in an OBS Browser Source. It fires bursts on a timer. Uploaded images can\'t be put in a URL, so for those use <b>Download OBS overlay</b> instead.';
    const right = $('.two > div:last-child', el), host = document.createElement('div'); host.className = 'panel'; host.style.marginTop = '10px'; right.prepend(host);
    const vals = () => ({ e: $('#a', el).value.trim() || '🔥', n: Math.min(40, Math.max(1, +$('#n', el).value || 6)), every: Math.min(600, Math.max(1, +$('#s', el).value || 8)), user: OVC.BRAND.channel });
    const upd = ovUrlPanel(host, 'emote', vals);
    ['a', 'n', 's'].forEach(i => $('#' + i, el).addEventListener('input', upd));
  };
})();
