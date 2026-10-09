/* ===== Router + home page ===== */
const CATS = { obs: 'OBS Overlays', util: 'Utilities' };
const card = t => `<a class="card" href="#/tool/${t.id}"><div class="ic">${t.ic}</div><div><b>${t.name}</b><small>${t.desc}</small></div><span class="ar">→</span></a>`;
const svgI = p => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const IC = {
  grid: svgI('<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>'),
  chat: svgI('<path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 9h8M8 13h5"/>'),
  smile: svgI('<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01M15 9h.01"/>'),
  user: svgI('<circle cx="9" cy="8" r="4"/><path d="M2 21v-1a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v1"/><path d="M19 8v6M16 11h6"/>'),
  clock: svgI('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  target: svgI('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>'),
  ticker: svgI('<rect x="2" y="8" width="20" height="8" rx="2"/><path d="M6 12h6M15 12h3"/>'),
  scene: svgI('<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>'),
  cam: svgI('<path d="M3 8a2 2 0 0 1 2-2h2l1.5-2h7L17 6h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="3.5"/>'),
  img: svgI('<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="1.5"/><path d="m21 15-5-5L5 21"/>'),
  qr: svgI('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v.01M14 21h3M21 17v4"/>'),
  link: svgI('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1-1"/>'),
  stamp: svgI('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 11h18"/>'),
  conv: svgI('<path d="M4 8h13l-3-3M20 16H7l3 3"/>'),
  pal: svgI('<path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 1.5-2.2-.5-1.3.3-2.3 1.7-2.3H17a4 4 0 0 0 4-4c0-5-4-9.5-9-9.5z"/><path d="M7.5 11h.01M10 7.5h.01M14.5 7.5h.01"/>'),
  text: svgI('<path d="M4 6h16M4 12h10M4 18h13"/>'),
  chev: svgI('<path d="m9 6 6 6-6 6"/>'),
};
const hrow = ([id, ic, n, d]) => `<a class="h-row" href="#/tool/${id}"><span class="h-ic">${IC[ic]}</span><span class="h-tx"><b>${n}</b><small>${d}</small></span><span class="h-ch">${IC.chev}</span></a>`;
const HOME_OBS = [['chat', 'chat', 'Chat overlay', 'Twitch and YouTube chat for OBS, with emotes.'], ['emote', 'smile', 'Emote overlay', 'Emotes that float up your screen in bursts.'], ['followlive', 'user', 'Follower tracker', 'A live follower count with a gain and loss chart.'], ['countdown', 'clock', 'Countdown', 'A big timer for starting-soon screens and events.'], ['goal', 'target', 'Goal bar', 'Live progress towards a follower or sub goal.'], ['ticker', 'ticker', 'Text ticker', 'A scrolling bar for announcements and socials.'], ['scene', 'scene', 'Scene screen', 'Starting soon, BRB and ending cards.']];
const HOME_UTL = [['mask', 'cam', 'Mask generator', 'Round, squircle or star shapes for your webcam.'], ['bgr', 'img', 'Background remover', 'Cut out a background. Runs in your browser.'], ['qr', 'qr', 'QR code generator', 'Scannable codes for links, as PNG or SVG.'], ['linkbio', 'link', 'Link in Bio', 'Your page at voqcl.com/bio/username.'], ['timestamps', 'stamp', 'Discord timestamps', 'Codes that show in everyone\'s own time zone.'], ['imgconv', 'conv', 'Image converter', 'Convert and resize PNG, JPEG and WebP.'], ['palette', 'pal', 'Palette extractor', 'Pull the main colours out of an image.'], ['limits', 'text', 'Title & limit checker', 'Check text against platform length limits.']];

function renderHome(app) {
  document.body.classList.add('home');
  app.innerHTML = `<div class="h-top"><img class="h-logo" src="assets/logo.png" alt="VOQCL"><span class="h-name"><b>VOQCL</b><span>tools</span></span></div>
 <p class="h-sub">Stream tools that run from this site. Free to use.</p>
 <a class="h-feat" href="#/tool/multiview"><span class="h-ic">${IC.grid}</span><span class="h-tx"><b>Multiview</b><small>Watch several streams side by side, with chat.</small></span><span class="btn pri h-btn">Open multiview</span></a>
 <div class="h-cols"><div><div class="h-sec">OBS Overlays</div><div class="h-list">${HOME_OBS.map(hrow).join('')}</div></div>
 <div><div class="h-sec">Utilities</div><div class="h-list">${HOME_UTL.map(hrow).join('')}</div></div></div>
 <p class="h-more"><a href="#/tools">Browse all ${T.length} tools →</a></p>`;
}

function render() {
  runClean();
  document.body.classList.remove('bare', 'ov', 'home');
  const app = $('#app'), h = (location.hash || '#/').slice(1), path = h.split('?')[0], [, r, a] = path.split('/');
  window.scrollTo(0, 0); document.title = 'VOQCL TOOLS';
  $$('#nav a').forEach(x => x.classList.toggle('on', x.getAttribute('href') === '#' + path || (path === '/tools' && x.getAttribute('href') === '#/tools')));

  if (r === 'live') {
    document.body.classList.add('bare', 'ov');
    const p = OVC.parseHash(location.hash);
    if (!p.ok) { app.innerHTML = `<div class="ove">${esc(p.error)}</div>`; return; }
    app.innerHTML = ''; renderOverlay(app, p); return;
  }
  if (r === 'bio' && a) { location.replace(BASE + 'bio/' + encodeURIComponent(a)); return; }
  if (r === 'tool') {
    const t = T.find(x => x.id === a);
    if (!t) { app.innerHTML = page('Tool not found', 'That tool does not exist.', '<a class="btn pri" href="#/tools">Browse tools</a>'); return; }
    app.innerHTML = '<div id="tp"><p class="d">Loading…</p></div>'; $('#tp').dataset.tool = t.id; document.title = t.name + ' · VOQCL TOOLS';
    try { t.fn($('#tp')); app.insertAdjacentHTML('afterbegin', '<p><a href="#/tools" style="color:var(--mu)">← All tools</a></p>'); }
    catch (e) { console.error(e); app.innerHTML = page('Something went wrong', 'This tool failed to load.', `<p class="err">${esc(e.message)}</p><a class="btn" href="#/tools">Back</a>`); }
    return;
  }
  if (r === 'c' && CATS[a]) { app.innerHTML = page(CATS[a], 'Tools in this category.', `<div class="grid">${T.filter(t => t.cat === a).map(card).join('')}</div>`); return; }
  if (r === 'tools') {
    let q = '', c = '';
    const draw = () => { const L = T.filter(t => (!c || t.cat === c) && (t.name + t.desc).toLowerCase().includes(q.toLowerCase())); $('#gl').innerHTML = L.length ? L.map(card).join('') : '<p class="d">No tools match your search.</p>'; };
    app.innerHTML = page('Tools', 'Everything runs in your browser or on this site\'s server. Free to use.', `<input id="q" placeholder="Search tools…  (press /)" autocomplete="off" style="max-width:420px"><div class="row" id="ch"><span class="chip on" data-c="">All</span>${Object.entries(CATS).map(([k, v]) => `<span class="chip" data-c="${k}">${v}</span>`).join('')}</div><h2 style="margin-top:20px">Results</h2><div class="grid" id="gl"></div>`);
    $('#q').oninput = e => { q = e.target.value; draw(); };
    $('#ch').onclick = e => { const s = e.target.closest('.chip'); if (!s) return; c = s.dataset.c; $$('.chip').forEach(x => x.classList.toggle('on', x === s)); draw(); };
    draw(); return;
  }
  renderHome(app);
}

function toast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
  document.body.append(t); setTimeout(() => t.remove(), 6000);
}

/* ---- boot ---- */
const BIO_PATH = location.pathname.slice(BASE.length).match(/^bio\/([^/?#]+)\/?$/);
if (BIO_PATH) renderBioPage(decodeURIComponent(BIO_PATH[1]));
else if (window.VOQCL_404) $('#app').innerHTML = page('Page not found', 'That page does not exist.', `<a class="btn pri" href="${esc(BASE)}">Go to VOQCL TOOLS</a>`);
else { addEventListener('hashchange', render); render(); }
addEventListener('keydown', e => {
  if (BIO_PATH) return;
  const t = e.target, typing = !!(t.matches && t.matches('input,textarea,select,[contenteditable]'));
  if ((e.key.toLowerCase() === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey)) {
    if (/^#\/live\//.test(location.hash)) return;
    e.preventDefault(); if ($('#q')) $('#q').focus(); else { location.hash = '#/tools'; setTimeout(() => $('#q') && $('#q').focus(), 60); }
  } else if (e.key === 'Escape' && typing) t.blur();
});
