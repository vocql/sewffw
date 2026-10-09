/* ===== /bio/<username> when no page file exists (GitHub Pages serves 404.html) ===== */
function bioNotFound(title, msg) {
  document.title = title + ' · VOQCL';
  $$('link[rel=stylesheet]').forEach(l => l.remove());
  const st = document.createElement('style');
  st.textContent = 'body{margin:0;background:#000;color:#fff;font-family:Inter,system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;text-align:center;padding:20px}p{color:#8a8a90}a{color:#fff}';
  document.head.append(st);
  document.body.className = ''; document.body.innerHTML = `<div><h1>${esc(title)}</h1><p>${esc(msg)}</p><p><a href="${esc(BASE)}">VOQCL TOOLS</a> · <a href="${esc(BASE)}#/tool/linkbio">Make your own page</a></p></div>`;
}
function renderBioPage(name) {
  name = String(name || '').replace(/\.html$/i, '');
  if (/^[A-Za-z0-9_]{3,24}$/.test(name) && name !== name.toLowerCase()) { location.replace(BASE + 'bio/' + name.toLowerCase()); return; }
  if (!/^[a-z0-9_]{3,24}$/.test(name)) return bioNotFound('Page not found', 'That is not a valid username.');
  bioNotFound('Page not found', `There's no page for @${name} yet.`);
}
