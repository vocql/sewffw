/* ===== Link in Bio editor (no accounts, no backend).
   You design the page here, click "Download page file", and upload <username>.html into the repo's bio/ folder.
   GitHub Pages then serves it at voqcl.com/bio/<username>. Only people who can upload to the repo can publish. ===== */
add('linkbio', 'util', '🔗', 'Link in Bio', 'Your own page at voqcl.com/bio/username with links, socials and your YouTube channel.', el => lbInit(el));

/* resize an image file to a compact data: URL so the page file is self-contained */
function imgToDataUrl(file, maxW, maxH) {
  return new Promise((resolve, reject) => {
    if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) return reject(new Error('Choose a PNG, JPEG, WebP or GIF image.'));
    if (file.size > 15 * 1024 * 1024) return reject(new Error('That image is over 15 MB. Pick a smaller one.'));
    loadImg(file, img => {
      const r = Math.min(1, maxW / img.width, maxH / img.height), w = Math.max(1, Math.round(img.width * r)), h = Math.max(1, Math.round(img.height * r));
      const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(img, 0, 0, w, h);
      let out = c.toDataURL('image/webp', 0.86);
      if (!out.startsWith('data:image/webp')) out = file.type === 'image/png' ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.86);
      resolve(out);
    }, m => reject(new Error(m)));
  });
}

function lbInit(el) {
  const rid = () => Math.random().toString(36).slice(2, 10);
  const baseDesign = () => ({ ...BIO.PRESETS.midnight, preset: 'midnight', bgImage: '' });
  const blank = () => ({ displayName: '', bio: '', avatar: '', banner: '', links: [], socials: [], youtube: { q: '', id: '', show: true }, design: baseDesign() });
  const fromSaved = d => { const n = BIO.normalize(d); return { ...blank(), ...n, design: { ...baseDesign(), ...n.design } }; };
  const draft = LS.g('lb.draft2', null);
  const S = { username: draft?.username || '', data: draft?.data ? fromSaved(draft.data) : blank(), tab: 'profile', yt: draft?.yt || null, ytState: draft?.yt ? 'ok' : 'idle', ytMsg: '' };
  S.data.links.forEach(l => l.id ||= rid());
  const D = () => S.data, DS = () => S.data.design;
  const validU = u => /^[a-z0-9_]{3,24}$/.test(u);
  const setS = m => { const e = $('#lbs'); if (e) e.textContent = m; };

  el.innerHTML = page('Link in Bio', 'Design your page and preview it live. When it looks right, download the page file and upload it to your site. It then lives at voqcl.com/bio/your-name.', `
  <div class="lb"><div class="panel lb-ed"><div class="tabs" id="lt" role="tablist">${['profile:Profile', 'links:Links', 'youtube:YouTube', 'design:Design', 'publish:Publish'].map(t => { const [k, n] = t.split(':'); return `<span class="chip" role="tab" tabindex="0" data-t="${k}">${n}</span>`; }).join('')}</div><div id="lbb"></div></div>
  <div class="lb-pv"><div class="phone"><iframe id="lbp" title="Page preview" sandbox="allow-popups"></iframe></div><div class="row" style="justify-content:center"><span id="lbs" style="color:var(--mu);font-size:12px" role="status"></span></div></div></div>`);

  let pt;
  const preview = () => { clearTimeout(pt); pt = setTimeout(() => { const f = $('#lbp'); if (f) f.srcdoc = BIO.renderProfile(S.data, { username: S.username || 'username', preview: true, yt: S.yt, ytState: S.ytState === 'error' ? 'error' : 'loading', ytMsg: S.ytState === 'idle' ? 'Look up your channel in the YouTube tab.' : S.ytMsg }); }, 120); };
  const save = () => { LS.s('lb.draft2', { username: S.username, data: S.data, yt: S.yt }); };
  const touch = () => { save(); preview(); setS('Saved in this browser'); };

  const f = (label, html) => `<label>${label}</label>${html}`;
  const colorRow = (key, label) => `<div style="flex:1">${f(label, `<input type="color" data-k="${key}" value="${DS()[key]}">`)}</div>`;
  const fmtN = n => n == null ? '—' : Number(n).toLocaleString();

  async function lookupYt(force) {
    const q = String(D().youtube.q || '').trim();
    if (!q) { S.yt = null; S.ytState = 'idle'; S.ytMsg = ''; show(); touch(); return; }
    S.ytState = 'loading'; S.ytMsg = ''; if (S.tab === 'youtube') show();
    try { S.yt = await ytApi('channel_full', { q, ...(force ? { t: Date.now() } : {}) }); S.ytState = 'ok'; D().youtube.id = S.yt.id; }
    catch (e) { S.yt = null; S.ytState = 'error'; S.ytMsg = e.code === 'quota' ? 'YouTube quota reached for today. Try again later.' : e.message; }
    if (el.isConnected) { if (S.tab === 'youtube') show(); touch(); }
  }
  function loadSaved(j, how) {
    S.username = j.username; S.data = fromSaved(j.data); S.data.links.forEach(l => l.id ||= rid());
    S.yt = j.yt || null; S.ytState = S.yt ? 'ok' : 'idle'; touch(); show(); setS(how);
  }

  const bodies = {
    profile() {
      return `${f('Username — your page will be voqcl.com/bio/&lt;username&gt;', `<input id="lun" value="${esc(S.username)}" maxlength="24" spellcheck="false" placeholder="e.g. voqcl" autocomplete="off"><small id="lune" style="display:block;min-height:16px;color:var(--mu)">${S.username ? (validU(S.username) ? esc(bioUrl(S.username)) : '<span class="err">At least 3 characters</span>') : '3-24 lowercase letters, numbers or underscores'}</small>`)}
      ${f('Profile picture', `<div class="row" style="margin:0"><div class="lb-av">${D().avatar ? `<img src="${esc(D().avatar)}" alt="">` : esc((D().displayName || S.username || '?')[0].toUpperCase())}</div><input type="file" id="lav" accept="image/png,image/jpeg,image/webp,image/gif" style="flex:1" aria-label="Upload profile picture"><button id="lavx" ${D().avatar ? '' : 'disabled'}>Remove</button></div><div class="err" id="lae" style="min-height:18px"></div>`)}
      ${f('Banner (wide image, about 3:1)', `<div class="row" style="margin:0">${D().banner ? `<div class="lb-bn" style="background-image:url('${esc(D().banner)}')"></div>` : ''}<input type="file" id="lbn" accept="image/png,image/jpeg,image/webp,image/gif" style="flex:1" aria-label="Upload banner"><button id="lbnx" ${D().banner ? '' : 'disabled'}>Remove</button></div><div class="err" id="lbne" style="min-height:18px"></div>`)}
      ${f('Display name', `<input data-p="displayName" maxlength="60" value="${esc(D().displayName)}">`)}
      ${f('Bio', `<textarea data-p="bio" rows="4" maxlength="300" style="font-family:inherit">${esc(D().bio)}</textarea><small style="color:var(--mu)"><span id="lbc">${D().bio.length}</span>/300</small>`)}`;
    },
    links() {
      const L = D().links.map((l, i) => `<div class="lb-link" draggable="true" data-i="${i}"><div class="row" style="margin:0;flex-wrap:nowrap"><span class="grab" title="Drag to reorder" aria-hidden="true">⠿</span><select data-l="icon" style="width:96px" aria-label="Icon">${BIO.ICON_NAMES.map(n => `<option ${n === l.icon ? 'selected' : ''}>${n}</option>`).join('')}</select><input data-l="title" placeholder="Title" maxlength="80" value="${esc(l.title)}" style="flex:1;min-width:0" aria-label="Link title"></div><div class="row" style="margin:6px 0 0;flex-wrap:nowrap"><input data-l="url" placeholder="https://…" value="${esc(l.url)}" style="flex:1;min-width:0" aria-label="Link URL"><button data-up title="Move up" aria-label="Move up">↑</button><button data-dn title="Move down" aria-label="Move down">↓</button><button data-del title="Delete" aria-label="Delete link">✕</button></div><div class="err" data-le style="font-size:12px"></div></div>`).join('');
      const S2 = D().socials.map((s, i) => `<div class="row" style="flex-wrap:nowrap" data-si="${i}"><select data-s="type" style="width:110px" aria-label="Platform">${Object.entries(BIO.SOCIALS).map(([k, n]) => `<option value="${k}" ${k === s.type ? 'selected' : ''}>${n}</option>`).join('')}</select><input data-s="url" value="${esc(s.url)}" placeholder="https://…" style="flex:1;min-width:0" aria-label="Profile URL"><button data-sdel aria-label="Remove">✕</button></div>`).join('');
      return `<div id="lll">${L || '<p class="d">No links yet. Add your first one.</p>'}</div><div class="row"><button class="pri" id="lad">+ Add link</button></div><h2>Social links</h2>${S2 || '<p class="d" style="margin:0">Twitch, YouTube, Kick, X, Instagram, TikTok, Discord…</p>'}<div class="row"><button id="lsa" ${D().socials.length >= 20 ? 'disabled' : ''}>+ Add social</button></div>`;
    },
    youtube() {
      const y = D().youtube, c = S.yt;
      const card = S.ytState === 'loading' ? '<p class="d">Looking up channel…</p>'
        : S.ytState === 'error' ? `<p class="err">${esc(S.ytMsg)}</p>`
        : c ? `<div class="panel" style="margin-top:10px;display:flex;gap:12px;align-items:center">${c.avatar ? `<img src="${esc(c.avatar)}" alt="" referrerpolicy="no-referrer" style="width:52px;height:52px;border-radius:50%">` : ''}<div style="min-width:0"><b>${esc(c.title)}</b><div style="color:var(--mu);font-size:12px">${c.subscribers != null ? fmtN(c.subscribers) + ' subscribers' : 'Subscriber count hidden'} · ${fmtN(c.videoCount)} videos · ${(c.videos || []).length} recent shown</div></div></div>` : '';
      return `<p class="d" style="margin:0 0 6px">Show your YouTube channel and latest videos on your page. Your live page refreshes this automatically.</p>
      ${f('Channel (@handle, channel URL or channel ID)', `<div class="row" style="margin:0;flex-wrap:nowrap"><input id="lyq" value="${esc(y.q)}" placeholder="@voqcl" spellcheck="false" style="flex:1;min-width:0"><button class="pri" id="lyl">Look up</button></div>`)}
      <label class="sw">Show on my page<input type="checkbox" id="lys" ${y.show !== false ? 'checked' : ''}></label>
      ${card}<div class="row"><button id="lyr" ${y.q ? '' : 'disabled'}>Refresh data</button><button id="lyx" ${y.q ? '' : 'disabled'}>Remove channel</button></div>`;
    },
    design() {
      const d = DS();
      return `<label>Presets</label><div class="row" style="margin:0" id="lpr">${Object.keys(BIO.PRESETS).map(k => { const p = BIO.PRESETS[k]; return `<button data-pr="${k}" style="background:linear-gradient(135deg,${p.bg1},${p.bg2});color:${p.textColor};text-transform:capitalize;min-width:84px">${k}</button>`; }).join('')}</div>
      <div class="row"><button id="lrs">Reset design</button></div>
      ${f('Background', `<select data-k="bgType"><option value="color" ${d.bgType === 'color' ? 'selected' : ''}>Solid colour</option><option value="gradient" ${d.bgType === 'gradient' ? 'selected' : ''}>Gradient</option><option value="image" ${d.bgType === 'image' ? 'selected' : ''}>Image</option></select>`)}
      <div class="row">${colorRow('bg1', 'Colour 1')}${d.bgType === 'gradient' ? colorRow('bg2', 'Colour 2') : ''}</div>
      ${d.bgType === 'gradient' ? f(`Angle: ${d.angle}°`, `<input type="range" min="0" max="360" data-k="angle" value="${d.angle}">`) : ''}
      ${d.bgType === 'image' ? f('Background image', `<input type="file" id="lbg" accept="image/png,image/jpeg,image/webp,image/gif"><div class="err" id="lbe" style="min-height:18px"></div>`) : ''}
      ${f('Font', `<select data-k="font">${Object.keys(BIO.FONTS).map(n => `<option ${n === d.font ? 'selected' : ''}>${n}</option>`).join('')}</select>`)}
      <div class="row">${colorRow('textColor', 'Text')}${colorRow('btnColor', 'Buttons')}${colorRow('btnText', 'Button text')}</div>
      <div class="row"><div style="flex:1">${f('Button shape', `<select data-k="btnShape">${['pill', 'round', 'square'].map(n => `<option ${n === d.btnShape ? 'selected' : ''}>${n}</option>`).join('')}</select>`)}</div><div style="flex:1">${f('Button style', `<select data-k="btnStyle">${['fill', 'outline', 'shadow'].map(n => `<option ${n === d.btnStyle ? 'selected' : ''}>${n}</option>`).join('')}</select>`)}</div></div>
      ${f(`Spacing: ${d.spacing}px`, `<input type="range" min="4" max="28" data-k="spacing" value="${d.spacing}">`)}
      ${f('Layout', `<select data-k="layout"><option value="stack" ${d.layout === 'stack' ? 'selected' : ''}>Single column</option><option value="grid" ${d.layout === 'grid' ? 'selected' : ''}>Grid</option></select>`)}`;
    },
    publish() {
      const u = S.username, ok = validU(u);
      return `${ok ? `<label>Your page address</label><div class="row" style="margin:0"><code style="flex:1;min-width:200px;padding:10px" id="lpu">${esc(bioUrl(u))}</code><button id="lcp">Copy link</button></div>`
                   : '<p class="err">Set a username on the Profile tab first (3-24 lowercase letters, numbers or underscores).</p>'}
      <div class="row"><button class="pri" id="ldl" ${ok ? '' : 'disabled'}>Download page file${ok ? ` (${esc(u)}.html)` : ''}</button><a class="btn" id="lop" target="_blank" rel="noopener" ${ok ? `href="${esc(HERE + '/bio/' + u)}"` : 'hidden'}>Open live page</a></div>
      <div class="note"><b>To publish or update your page:</b><br>1. Click <b>Download page file</b>.<br>2. On GitHub, open your site's repo → the <b>bio</b> folder → <b>Add file → Upload files</b>.<br>3. Drop in <b>${esc(ok ? u : 'username')}.html</b> (it replaces the old one if you're updating) → <b>Commit changes</b>.<br>4. Wait about a minute. Your page is live at <b>${esc(ok ? bioUrl(u) : SITE + '/bio/username')}</b>.</div>
      <h2>Edit an existing page</h2>
      <div class="row"><button id="lld" ${ok ? '' : 'disabled'}>Load my live page</button><label class="btn" style="margin:0;color:var(--tx);font-size:14px">Open a page file…<input type="file" id="lim" accept=".html,text/html" hidden></label><button id="lnew">Start a new page</button></div>
      <div class="err" id="lpe" style="min-height:20px;margin-top:8px" role="alert"></div><div class="ok" id="lpm" role="status"></div>
      <p class="d" style="font-size:12.5px">Your work saves automatically in this browser. To edit on another device, use <b>Load my live page</b> there.</p>`;
    },
  };

  function bind() {
    const b = $('#lbb');
    const un = $('#lun', b);
    if (un) un.oninput = () => { un.value = un.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24); S.username = un.value; $('#lune').innerHTML = !S.username ? '3-24 lowercase letters, numbers or underscores' : validU(S.username) ? esc(bioUrl(S.username)) : '<span class="err">At least 3 characters</span>'; const av = $('.lb-av', b); if (av && !D().avatar && !D().displayName) av.textContent = (S.username[0] || '?').toUpperCase(); touch(); };
    $$('[data-p]', b).forEach(i => i.oninput = () => { D()[i.dataset.p] = i.value; if (i.dataset.p === 'bio') $('#lbc').textContent = i.value.length; if (i.dataset.p === 'displayName') { const av = $('.lb-av', b); if (av && !D().avatar) av.textContent = (i.value[0] || S.username[0] || '?').toUpperCase(); } touch(); });
    const img = (inputId, errId, key, clearId, mw, mh) => {
      const inp = $('#' + inputId, b); if (!inp) return;
      inp.onchange = async () => { const fl = inp.files[0]; if (!fl) return; $('#' + errId).textContent = ''; try { D()[key] = await imgToDataUrl(fl, mw, mh); touch(); show(); } catch (e) { $('#' + errId).textContent = e.message; } };
      $('#' + clearId, b).onclick = () => { D()[key] = ''; touch(); show(); };
    };
    img('lav', 'lae', 'avatar', 'lavx', 320, 320); img('lbn', 'lbne', 'banner', 'lbnx', 1500, 500);
    /* links */
    $$('.lb-link', b).forEach(row => {
      const i = +row.dataset.i, L = D().links[i];
      $$('[data-l]', row).forEach(inp => inp.oninput = inp.onchange = () => { L[inp.dataset.l] = inp.value; touch(); if (inp.dataset.l === 'url') $('[data-le]', row).textContent = !inp.value || BIO.safeUrl(inp.value) ? '' : 'Enter a full link starting with https://'; });
      $('[data-del]', row).onclick = () => { D().links.splice(i, 1); touch(); show(); };
      $('[data-up]', row).onclick = () => { if (i > 0) { [D().links[i - 1], D().links[i]] = [D().links[i], D().links[i - 1]]; touch(); show(); } };
      $('[data-dn]', row).onclick = () => { if (i < D().links.length - 1) { [D().links[i + 1], D().links[i]] = [D().links[i], D().links[i + 1]]; touch(); show(); } };
      row.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', String(i)); e.dataTransfer.effectAllowed = 'move'; row.classList.add('drag'); });
      row.addEventListener('dragend', () => row.classList.remove('drag'));
      row.addEventListener('dragover', e => { e.preventDefault(); row.classList.add('over'); });
      row.addEventListener('dragleave', () => row.classList.remove('over'));
      row.addEventListener('drop', e => { e.preventDefault(); const from = +e.dataTransfer.getData('text/plain'); if (Number.isInteger(from) && from !== i) { const [m] = D().links.splice(from, 1); D().links.splice(i, 0, m); touch(); show(); } });
    });
    const ad = $('#lad', b); if (ad) ad.onclick = () => { D().links.push({ id: rid(), title: '', url: '', icon: 'link' }); touch(); show(); const t = $$('[data-l=title]', b).pop(); t && t.focus(); };
    const sa = $('#lsa', b); if (sa) sa.onclick = () => { D().socials.push({ type: 'twitch', url: '' }); touch(); show(); };
    $$('[data-si]', b).forEach(row => { const s = D().socials[+row.dataset.si]; $$('[data-s]', row).forEach(inp => inp.oninput = inp.onchange = () => { s[inp.dataset.s] = inp.value; touch(); }); $('[data-sdel]', row).onclick = () => { D().socials.splice(+row.dataset.si, 1); touch(); show(); }; });
    /* youtube */
    const yl = $('#lyl', b);
    if (yl) {
      const go = () => { const nq = $('#lyq').value.trim(); if (nq !== D().youtube.q) D().youtube.id = ''; D().youtube.q = nq; lookupYt(); };
      yl.onclick = go; $('#lyq').addEventListener('keydown', e => e.key === 'Enter' && go());
      $('#lys').onchange = () => { D().youtube.show = $('#lys').checked; touch(); };
      $('#lyr').onclick = () => lookupYt(true);
      $('#lyx').onclick = () => { D().youtube = { q: '', id: '', show: true }; S.yt = null; S.ytState = 'idle'; touch(); show(); };
    }
    /* design */
    $$('[data-k]', b).forEach(inp => inp.oninput = inp.onchange = () => { const k = inp.dataset.k; DS()[k] = inp.type === 'range' ? Number(inp.value) : inp.value; DS().preset = 'custom'; touch(); if (k === 'bgType') show(); else if (inp.type === 'range') inp.previousElementSibling.textContent = k === 'angle' ? `Angle: ${inp.value}°` : `Spacing: ${inp.value}px`; });
    $$('[data-pr]', b).forEach(btn => btn.onclick = () => { const keepImg = DS().bgImage; S.data.design = { ...BIO.PRESETS[btn.dataset.pr], preset: btn.dataset.pr, bgImage: keepImg }; touch(); show(); });
    const rs = $('#lrs', b); if (rs) rs.onclick = () => { S.data.design = baseDesign(); touch(); show(); };
    const bg = $('#lbg', b); if (bg) bg.onchange = async () => { const fl = bg.files[0]; if (!fl) return; try { DS().bgImage = await imgToDataUrl(fl, 1600, 1600); DS().preset = 'custom'; touch(); $('#lbe').innerHTML = '<span class="ok">Image added.</span>'; } catch (e) { $('#lbe').textContent = e.message; } };
    /* publish */
    const flash = (m, bad) => { const e = $('#lpe'), o = $('#lpm'); if (e) e.textContent = bad ? m : ''; if (o) o.textContent = bad ? '' : m; };
    const cp = $('#lcp', b); if (cp) cp.onclick = () => copy(bioUrl(S.username), cp);
    const dlb = $('#ldl', b); if (dlb) dlb.onclick = () => {
      const html = BIO.exportBioHtml(S.data, { username: S.username, siteOrigin: SITE, yt: D().youtube.show ? S.yt : null });
      dl(`${S.username}.html`, html, 'text/html');
      flash(`Downloaded ${S.username}.html (${Math.max(1, Math.round(html.length / 1024))} KB). Now upload it to the bio folder on GitHub.`);
    };
    const ld = $('#lld', b); if (ld) ld.onclick = async () => {
      flash(''); ld.disabled = true;
      try {
        const r = await fetch(`${HERE}/bio/${S.username}.html`, { cache: 'no-store' });
        const j = r.ok ? BIO.parseBioHtml(await r.text()) : null;
        if (!j) throw new Error(`No published page found for ${S.username} yet.`);
        loadSaved(j, 'Loaded your live page'); flash('Loaded your live page. Edit it, then download and upload again.');
      } catch (e) { flash(e.message === 'Failed to fetch' ? 'Could not reach the site.' : e.message, true); }
      if (ld.isConnected) ld.disabled = false;
    };
    const im = $('#lim', b); if (im) im.onchange = async () => {
      const fl = im.files[0]; if (!fl) return;
      const j = BIO.parseBioHtml(await fl.text());
      if (!j) return flash('That file is not a VOQCL bio page.', true);
      loadSaved(j, 'Loaded from file'); flash(`Loaded ${fl.name}.`);
    };
    const nw = $('#lnew', b); if (nw) nw.onclick = () => { if (!confirm('Start over with a blank page? Your current design in this browser will be cleared.')) return; S.username = ''; S.data = blank(); S.yt = null; S.ytState = 'idle'; touch(); S.tab = 'profile'; show(); };
  }
  function show() {
    $$('#lt .chip').forEach(c => c.classList.toggle('on', c.dataset.t === S.tab));
    const box = $('#lbb'); if (!box) return;
    const y = box.scrollTop; box.innerHTML = bodies[S.tab](); bind(); box.scrollTop = y;
  }
  $$('#lt .chip').forEach(c => { c.onclick = () => { S.tab = c.dataset.t; show(); }; c.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); c.click(); } }; });
  show(); preview();
  if (draft) setS('Restored from this browser');
  if (D().youtube.q && YTD) lookupYt();
}
