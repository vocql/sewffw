/* ===== Utilities: QR Code Generator, Discord Timestamps, Image Converter, Palette Extractor, Title & Limit Checker ===== */

/* ---------- QR code generator ---------- */
const lum = hex => { const n = parseInt(hex.slice(1), 16), f = c => { c /= 255; return c <= .03928 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; }; return .2126 * f(n >> 16 & 255) + .7152 * f(n >> 8 & 255) + .0722 * f(n & 255); };
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };

function qrToCanvas(cv, qr, px, margin, fg, bg) {
  const n = qr.size + 2 * margin, mp = Math.max(1, Math.floor(px / n)), S = n * mp;
  cv.width = cv.height = S;
  const x = cv.getContext('2d');
  x.clearRect(0, 0, S, S);
  if (bg) { x.fillStyle = bg; x.fillRect(0, 0, S, S); }
  x.fillStyle = fg;
  for (let r = 0; r < qr.size; r++) for (let c = 0; c < qr.size; c++) if (qr.modules[r][c]) x.fillRect((c + margin) * mp, (r + margin) * mp, mp, mp);
  return S;
}
function qrToSvg(qr, margin, fg, bg) {
  const n = qr.size + 2 * margin; let d = '';
  for (let r = 0; r < qr.size; r++) { let c = 0; while (c < qr.size) { if (!qr.modules[r][c]) { c++; continue; } let e = c; while (e < qr.size && qr.modules[r][e]) e++; d += `M${c + margin} ${r + margin}h${e - c}v1h${-(e - c)}z`; c = e; } }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges">${bg ? `<rect width="${n}" height="${n}" fill="${bg}"/>` : ''}<path d="${d}" fill="${fg}"/></svg>`;
}

add('qr', 'util', '▦', 'QR code generator', 'Make scannable QR codes for links or text and download them as PNG or SVG.', el => {
  el.innerHTML = page('QR code generator', 'Type a link or text to get a QR code you can download. Everything is generated in your browser.', `<div class="two"><div class="panel">
  <label for="qt">Link or text</label><textarea id="qt" rows="4" placeholder="https://voqcl.com" spellcheck="false">https://voqcl.com</textarea>
  <div class="row"><div style="flex:1"><label for="qe">Error correction</label><select id="qe"><option value="L">Low (7%)</option><option value="M" selected>Medium (15%)</option><option value="Q">Quartile (25%)</option><option value="H">High (30%)</option></select></div>
  <div style="flex:1"><label for="qs">PNG size (px)</label><input id="qs" type="number" min="128" max="2048" step="32" value="512"></div></div>
  <div class="row"><div style="flex:1"><label for="qf">Code colour</label><input id="qf" type="color" value="#000000"></div><div style="flex:1"><label for="qb">Background</label><input id="qb" type="color" value="#ffffff"></div><div style="flex:1"><label for="qm">Quiet zone (modules)</label><input id="qm" type="number" min="0" max="12" value="4"></div></div>
  <label class="sw">Transparent background<input type="checkbox" id="qx"></label>
  <div id="qw" class="note" style="display:none"></div><div id="qerr" class="err" style="margin-top:8px;min-height:20px"></div></div>
  <div><div class="panel" style="text-align:center"><canvas id="qc" style="image-rendering:pixelated;max-width:360px;width:100%;background:repeating-conic-gradient(#ddd 0 25%,#fff 0 50%) 0 0/16px 16px"></canvas><div id="qi" style="color:var(--mu);margin-top:8px;font-size:12px"></div><div id="qv" style="margin-top:4px;font-size:12px"></div>
  <div class="row" style="justify-content:center"><button class="pri" id="qp">Download PNG</button><button id="qsv">Download SVG</button></div></div></div></div>`);
  const cv = $('#qc'); let cur = null;
  const draw = async () => {
    const t = $('#qt').value, err = $('#qerr'), warn = $('#qw'); err.textContent = ''; warn.style.display = 'none'; $('#qv').textContent = '';
    const dis = v => { $('#qp').disabled = $('#qsv').disabled = v; };
    const w = [];
    if (!t.trim()) { cur = null; cv.width = cv.height = 0; $('#qi').textContent = ''; err.textContent = 'Enter a link or some text to encode.'; dis(true); return; }
    const size = Math.min(2048, Math.max(128, +$('#qs').value || 512)), margin = Math.min(12, Math.max(0, +$('#qm').value || 0));
    try { cur = QR.encode(t, $('#qe').value); } catch (e) { cur = null; cv.width = cv.height = 0; $('#qi').textContent = ''; err.textContent = e.message; dis(true); return; }
    const fg = $('#qf').value, bg = $('#qx').checked ? null : $('#qb').value;
    qrToCanvas(cv, cur, size, margin, fg, bg); dis(false);
    $('#qi').textContent = `Version ${cur.version} · ${cur.size}×${cur.size} modules · ${cur.bytes} bytes`;
    if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(t.trim()) && !/^[a-z]+:/i.test(t)) w.push('This looks like a web address without <b>https://</b>. Phones may treat it as plain text. <button id="qh" style="padding:2px 8px">Add https://</button>');
    else if (/^https?:\/\//i.test(t.trim())) { try { new URL(t.trim()); } catch { w.push('This starts like a link but is not a valid URL.'); } }
    const c = contrast(fg, bg || '#ffffff');
    if (c < 3) w.push(`Low contrast (${c.toFixed(1)}:1). The code may not scan. Aim for 3:1 or higher.`);
    if (lum(fg) > lum(bg || '#ffffff')) w.push('Light code on a dark background (inverted) does not scan in every reader.');
    if (margin < 4) w.push('A quiet zone under 4 modules can make scanning unreliable.');
    if (w.length) { warn.innerHTML = w.join('<br>'); warn.style.display = 'block'; const h = $('#qh'); if (h) h.onclick = () => { $('#qt').value = 'https://' + t.trim(); draw(); }; }
    /* verify by decoding the rendered canvas, when the browser supports it */
    if ('BarcodeDetector' in window) {
      try {
        const formats = await BarcodeDetector.getSupportedFormats();
        if (formats.includes('qr_code')) {
          const tmp = document.createElement('canvas'); qrToCanvas(tmp, cur, Math.max(size, 300), Math.max(margin, 4), '#000', '#fff');
          const res = await new BarcodeDetector({ formats: ['qr_code'] }).detect(tmp);
          const ok = res[0] && res[0].rawValue === t;
          $('#qv').innerHTML = ok ? '<span class="ok">Verified: decodes back to your exact text ✓</span>' : '<span class="err">Could not verify this code by decoding it.</span>';
        }
      } catch {}
    }
  };
  $$('#qt,#qe,#qs,#qf,#qb,#qm,#qx', el).forEach(i => i.addEventListener('input', draw));
  $('#qp').onclick = () => { if (cur) cv.toBlob(b => dl('voqcl-qr.png', b)); };
  $('#qsv').onclick = () => { if (cur) dl('voqcl-qr.svg', qrToSvg(cur, Math.min(12, Math.max(0, +$('#qm').value || 0)), $('#qf').value, $('#qx').checked ? null : $('#qb').value), 'image/svg+xml'); };
  draw();
});

/* ---------- Discord timestamps ---------- */
add('timestamps', 'util', '🕒', 'Discord timestamps', 'Generate Discord timestamp codes that show in every viewer\'s own time zone.', el => {
  const pad2 = n => String(n).padStart(2, '0'), now = new Date(Date.now() + 3600e3);
  const local = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  el.innerHTML = page('Discord timestamps', 'Pick a date and time. Paste a code into Discord and everyone sees it in their own time zone.', `<div class="panel"><label for="dt">Date and time (your time zone: ${esc(Intl.DateTimeFormat().resolvedOptions().timeZone)})</label><input id="dt" type="datetime-local" value="${local(now)}"><div class="row"><button id="dn">Now</button><button id="d1">+1 hour</button><button id="dd">Tomorrow, same time</button></div><div id="de" class="err" style="min-height:18px;margin-top:6px"></div></div><div class="grid" id="dl" style="margin-top:12px"></div>`);
  const styles = [['t', 'Short time', { timeStyle: 'short' }], ['T', 'Long time', { timeStyle: 'medium' }], ['d', 'Short date', { dateStyle: 'short' }], ['D', 'Long date', { dateStyle: 'long' }], ['f', 'Short date/time', { dateStyle: 'long', timeStyle: 'short' }], ['F', 'Long date/time', { dateStyle: 'full', timeStyle: 'short' }], ['R', 'Relative', null]];
  const rel = ms => { const s = Math.round(ms / 1000), a = Math.abs(s), f = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }); for (const [u, n] of [['year', 31536000], ['month', 2592000], ['day', 86400], ['hour', 3600], ['minute', 60]]) if (a >= n) return f.format(Math.round(s / n), u); return f.format(s, 'second'); };
  const draw = () => {
    const v = $('#dt').value, d = new Date(v), box = $('#dl');
    if (!v || isNaN(d)) { $('#de').textContent = 'Pick a valid date and time.'; box.innerHTML = ''; return; }
    $('#de').textContent = ''; const u = Math.floor(d / 1000);
    box.innerHTML = styles.map(([k, n, o]) => `<div class="panel"><b>${n}</b><div style="color:var(--mu);margin:4px 0">${esc(o ? new Intl.DateTimeFormat(undefined, o).format(d) : rel(d - Date.now()))}</div><div class="row" style="margin-top:6px"><code style="flex:1">&lt;t:${u}:${k}&gt;</code><button data-c="&lt;t:${u}:${k}&gt;">Copy</button></div></div>`).join('');
    $$('[data-c]', box).forEach(b => b.onclick = () => copy(b.dataset.c.replace(/&lt;/g, '<').replace(/&gt;/g, '>'), b));
  };
  $('#dt').oninput = draw; $('#dn').onclick = () => { $('#dt').value = local(new Date()); draw(); };
  $('#d1').onclick = () => { $('#dt').value = local(new Date(Date.now() + 3600e3)); draw(); };
  $('#dd').onclick = () => { const d = new Date($('#dt').value || Date.now()); d.setDate(d.getDate() + 1); $('#dt').value = local(d); draw(); };
  draw(); tm(() => { if ($('#dl')) draw(); }, 30000);
});

/* ---------- Image converter / resizer ---------- */
add('imgconv', 'util', '⇄', 'Image converter', 'Convert images between PNG, JPEG and WebP and resize them.', el => {
  el.innerHTML = page('Image converter', 'Convert and resize images in your browser. Nothing is uploaded.', `<div class="two"><div class="panel"><label for="if">Image</label><input id="if" type="file" accept="image/*">
  <div class="row"><div style="flex:1"><label for="iw">Width (px)</label><input id="iw" type="number" min="1" max="8192"></div><div style="flex:1"><label for="ih">Height (px)</label><input id="ih" type="number" min="1" max="8192"></div></div>
  <label class="sw">Keep aspect ratio<input type="checkbox" id="il" checked></label>
  <label for="ifm">Format</label><select id="ifm"><option value="image/png">PNG</option><option value="image/jpeg">JPEG</option><option value="image/webp">WebP</option></select>
  <div id="iqw"><label for="iq">Quality: <span id="iqv">90</span>%</label><input id="iq" type="range" min="10" max="100" value="90"></div>
  <div id="ibw" style="display:none"><label for="ib">Background for transparent areas (JPEG)</label><input id="ib" type="color" value="#ffffff"></div>
  <div class="row"><button class="pri" id="id" disabled>Download</button></div><div id="im" class="note">Choose an image to begin.</div></div>
  <div class="panel checker"><canvas id="ic" width="10" height="10"></canvas></div></div>`);
  let img = null, ratio = 1, blob = null;
  const cv = $('#ic'), x = cv.getContext('2d');
  const ext = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
  const render = () => {
    if (!img) return;
    const w = Math.min(8192, Math.max(1, Math.round(+$('#iw').value || img.width))), h = Math.min(8192, Math.max(1, Math.round(+$('#ih').value || img.height))), type = $('#ifm').value;
    cv.width = w; cv.height = h; x.clearRect(0, 0, w, h);
    if (type === 'image/jpeg') { x.fillStyle = $('#ib').value; x.fillRect(0, 0, w, h); }
    x.imageSmoothingQuality = 'high'; x.drawImage(img, 0, 0, w, h);
    $('#iqw').style.display = type === 'image/png' ? 'none' : ''; $('#ibw').style.display = type === 'image/jpeg' ? '' : 'none';
    cv.toBlob(b => {
      if (!b) { $('#im').innerHTML = '<span class="err">Your browser could not encode that format. Try PNG or JPEG.</span>'; $('#id').disabled = true; return; }
      if (b.type !== type) { $('#im').innerHTML = `<span class="err">This browser can't export ${type.split('/')[1].toUpperCase()}; it produced ${esc(b.type)} instead.</span>`; }
      else $('#im').innerHTML = `Output: <b>${w}×${h}</b> · <b>${(b.size / 1024).toFixed(1)} KB</b> (original ${(img._size / 1024).toFixed(1)} KB)`;
      blob = b; $('#id').disabled = false;
    }, type, +$('#iq').value / 100);
  };
  $('#if').onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    loadImg(f, i => { i._size = f.size; img = i; ratio = i.width / i.height; $('#iw').value = i.width; $('#ih').value = i.height; render(); }, m => { $('#im').innerHTML = `<span class="err">${esc(m)}</span>`; });
  };
  $('#iw').oninput = () => { if ($('#il').checked && ratio) $('#ih').value = Math.max(1, Math.round($('#iw').value / ratio)); render(); };
  $('#ih').oninput = () => { if ($('#il').checked && ratio) $('#iw').value = Math.max(1, Math.round($('#ih').value * ratio)); render(); };
  $('#iq').oninput = () => { $('#iqv').textContent = $('#iq').value; render(); };
  $('#ifm').onchange = $('#ib').oninput = render;
  $('#id').onclick = () => blob && dl('voqcl-image.' + (ext[blob.type] || 'png'), blob);
});

/* ---------- Palette extractor ---------- */
function medianCut(px, n) {
  let boxes = [px];
  while (boxes.length < n) {
    boxes.sort((a, b) => b.length - a.length);
    const b = boxes.shift();
    if (b.length < 2) { boxes.push(b); break; }
    let ch = 0, best = -1;
    for (let c = 0; c < 3; c++) { let mn = 255, mx = 0; for (const p of b) { if (p[c] < mn) mn = p[c]; if (p[c] > mx) mx = p[c]; } if (mx - mn > best) { best = mx - mn; ch = c; } }
    b.sort((p, q) => p[ch] - q[ch]);
    const m = b.length >> 1; boxes.push(b.slice(0, m), b.slice(m));
  }
  return boxes.filter(b => b.length).map(b => { const s = [0, 0, 0]; for (const p of b) { s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; } return { rgb: s.map(v => Math.round(v / b.length)), n: b.length }; }).sort((a, b) => b.n - a.n);
}
const toHex = rgb => '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join('');
add('palette', 'util', '🎨', 'Palette extractor', 'Pull the main colours out of any image, with contrast ratings.', el => {
  el.innerHTML = page('Palette extractor', 'Upload an image to get its dominant colours as HEX codes, ready for overlays and branding.', `<div class="two"><div class="panel"><label for="pf">Image</label><input id="pf" type="file" accept="image/*"><label for="pn">Colours: <span id="pnv">6</span></label><input id="pn" type="range" min="2" max="12" value="6"><div class="row"><button id="pa" disabled>Copy as CSS variables</button></div><div id="pm" class="note">Choose an image to begin.</div></div><div><div class="panel checker" style="text-align:center"><canvas id="pc" width="10" height="10" style="max-height:260px"></canvas></div><div class="grid" id="ps" style="margin-top:12px"></div></div></div>`);
  let data = null, cols = [];
  const cv = $('#pc'), x = cv.getContext('2d', { willReadFrequently: true });
  const run = () => {
    if (!data) return;
    cols = medianCut(data.slice(), +$('#pn').value); $('#pnv').textContent = $('#pn').value;
    $('#ps').innerHTML = cols.map(c => { const h = toHex(c.rgb); return `<div class="panel" style="padding:0;overflow:hidden"><div style="height:64px;background:${h}"></div><div style="padding:10px"><code>${h}</code> <button data-h="${h}" style="float:right;padding:2px 8px">Copy</button><div style="color:var(--mu);font-size:12px;margin-top:6px">White text ${contrast(h, '#ffffff').toFixed(1)}:1 · Black text ${contrast(h, '#000000').toFixed(1)}:1</div></div></div>`; }).join('');
    $$('[data-h]', el).forEach(b => b.onclick = () => copy(b.dataset.h, b)); $('#pa').disabled = false;
  };
  $('#pf').onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    loadImg(f, i => {
      const r = Math.min(1, 120 / Math.max(i.width, i.height)), w = Math.max(1, Math.round(i.width * r)), h = Math.max(1, Math.round(i.height * r));
      cv.width = w; cv.height = h; x.clearRect(0, 0, w, h); x.drawImage(i, 0, 0, w, h);
      const d = x.getImageData(0, 0, w, h).data; data = [];
      for (let k = 0; k < d.length; k += 4) if (d[k + 3] > 128) data.push([d[k], d[k + 1], d[k + 2]]);
      if (!data.length) { $('#pm').innerHTML = '<span class="err">That image is fully transparent.</span>'; data = null; return; }
      $('#pm').textContent = `Analysed ${data.length.toLocaleString()} pixels.`; run();
    }, m => { $('#pm').innerHTML = `<span class="err">${esc(m)}</span>`; });
  };
  $('#pn').oninput = run;
  $('#pa').onclick = e => copy(':root{\n' + cols.map((c, i) => `  --color-${i + 1}: ${toHex(c.rgb)};`).join('\n') + '\n}', e.target);
});

/* ---------- Title & limit checker ---------- */
add('limits', 'util', '✎', 'Title & limit checker', 'Check text against Twitch, YouTube, X, Discord and Instagram length limits.', el => {
  const LIM = [['Twitch stream title', 140], ['YouTube video title', 100], ['YouTube description', 5000], ['YouTube tags (all)', 500], ['X / Twitter post', 280], ['Discord message', 2000], ['Instagram caption', 2200]];
  el.innerHTML = page('Title & limit checker', 'Paste your title, description or post to see how it fits each platform\'s limit.', `<div class="panel"><textarea id="lt" rows="7" placeholder="Type or paste text…"></textarea><div id="ls" style="color:var(--mu);margin-top:8px"></div></div><div class="grid" id="lg" style="margin-top:12px"></div>`);
  const seg = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
  const len = s => seg ? [...seg.segment(s)].length : Array.from(s).length;
  const draw = () => {
    const t = $('#lt').value, n = len(t), words = (t.match(/\S+/g) || []).length, lines = t ? t.split('\n').length : 0;
    $('#ls').textContent = `${n} characters · ${words} words · ${lines} line${lines === 1 ? '' : 's'}`;
    $('#lg').innerHTML = LIM.map(([name, max]) => {
      const over = n > max, pct = Math.min(100, n / max * 100);
      const bad = /YouTube (video title|description)/.test(name) && /[<>]/.test(t) ? '<div class="err" style="font-size:12px;margin-top:4px">YouTube does not allow &lt; or &gt; here.</div>' : '';
      return `<div class="panel"><b>${name}</b><div style="margin:6px 0;color:${over ? '#ff8a8a' : 'var(--tx)'}">${n} / ${max}${over ? ` · ${n - max} over` : ` · ${max - n} left`}</div><div style="height:6px;background:#222;border-radius:4px;overflow:hidden"><i style="display:block;height:100%;width:${pct}%;background:${over ? '#ff6b6b' : '#fff'}"></i></div>${bad}</div>`;
    }).join('');
  };
  $('#lt').oninput = draw; draw();
});
