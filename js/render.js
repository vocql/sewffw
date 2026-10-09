/* Link in Bio renderer. Used for the editor's live preview AND the public page (voqcl.com/bio/<username>),
   so the preview is exactly what gets published. Every value is validated/escaped here (stored data is untrusted). */
(function (root) {
/* Server-side renderer for Link in Bio pages. The builder preview and the public page
   both use this, so what you preview is exactly what gets published. */

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const HEX = /^#[0-9a-f]{6}$/i;
const hex = (v, d) => (typeof v === 'string' && HEX.test(v) ? v : d);
const num = (v, lo, hi, d) => { v = Number(v); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; };
const pick = (v, list, d) => (list.includes(v) ? v : d);

const FONTS = {
  sans: 'Inter, "Helvetica Neue", Arial, system-ui, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono: 'ui-monospace, Menlo, Consolas, monospace',
  rounded: 'ui-rounded, "Arial Rounded MT Bold", "Trebuchet MS", system-ui, sans-serif',
  display: '"Arial Black", Impact, "Helvetica Neue", sans-serif',
};

const PRESETS = {
  midnight: { bgType: 'color', bg1: '#000000', bg2: '#1a1a1d', angle: 160, font: 'sans', textColor: '#ffffff', btnColor: '#ffffff', btnText: '#000000', btnShape: 'pill', btnStyle: 'fill', spacing: 12, layout: 'stack' },
  paper: { bgType: 'color', bg1: '#f4f1ea', bg2: '#e8e2d4', angle: 160, font: 'serif', textColor: '#1d1a14', btnColor: '#1d1a14', btnText: '#f4f1ea', btnShape: 'square', btnStyle: 'fill', spacing: 14, layout: 'stack' },
  sunset: { bgType: 'gradient', bg1: '#ff7a59', bg2: '#7b2ff7', angle: 160, font: 'rounded', textColor: '#ffffff', btnColor: '#ffffff', btnText: '#2a0a4a', btnShape: 'pill', btnStyle: 'fill', spacing: 12, layout: 'stack' },
  neon: { bgType: 'color', bg1: '#07060d', bg2: '#12102a', angle: 160, font: 'mono', textColor: '#e6fff5', btnColor: '#39ffb0', btnText: '#39ffb0', btnShape: 'round', btnStyle: 'outline', spacing: 12, layout: 'stack' },
  ocean: { bgType: 'gradient', bg1: '#0b3d5c', bg2: '#06151f', angle: 180, font: 'sans', textColor: '#eaf6ff', btnColor: '#3fb6ff', btnText: '#04202f', btnShape: 'round', btnStyle: 'fill', spacing: 12, layout: 'stack' },
  grid: { bgType: 'color', bg1: '#0e0e10', bg2: '#1c1c1f', angle: 160, font: 'display', textColor: '#f4f4f5', btnColor: '#f4f4f5', btnText: '#0e0e10', btnShape: 'round', btnStyle: 'shadow', spacing: 10, layout: 'grid' },
};

const ICONS = {
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1-1"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  play: '<circle cx="12" cy="12" r="9"/><path d="m10 8.5 5 3.5-5 3.5z"/>',
  music: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  game: '<rect x="2" y="7" width="20" height="11" rx="5"/><path d="M7 10v5M4.5 12.5h5M16 11h.01M18 14h.01"/>',
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.7 12.4a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L20 7H6"/>',
  camera: '<path d="M3 8a2 2 0 0 1 2-2h2l1.5-2h7L17 6h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="3.5"/>',
  chat: '<path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
};
const ICON_NAMES = Object.keys(ICONS);
const SOCIALS = { twitch: 'Twitch', youtube: 'YouTube', kick: 'Kick', x: 'X', instagram: 'Instagram', tiktok: 'TikTok', discord: 'Discord', github: 'GitHub', website: 'Website' };

const svg = name => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.link}</svg>`;

/* Only http(s)/mailto links. Uploaded images are referenced as /uploads/<id>. */
function safeUrl(u) {
  u = String(u || '').trim();
  if (!u) return '';
  if (/^mailto:[^\s<>"]+$/i.test(u)) return u;
  if (/^https?:\/\/[^\s<>"]+$/i.test(u)) return u;
  if (/^[\w.-]+\.[a-z]{2,}([/?#][^\s<>"]*)?$/i.test(u)) return 'https://' + u;
  return '';
}
const safeImg = u => { u = String(u || ''); return (/^https:\/\/[^\s<>"'()\\]+$/.test(u) || /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(u) || /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/[^\s<>"'()\\]+$/.test(u)) ? u : ''; };

function normalize(raw) {
  raw = raw && typeof raw === 'object' ? raw : {};
  const d0 = raw.design && typeof raw.design === 'object' ? raw.design : {};
  const base = PRESETS[d0.preset] || PRESETS.midnight;
  const d = { ...base, ...d0 };
  const design = {
    preset: PRESETS[d0.preset] ? d0.preset : 'midnight',
    bgType: pick(d.bgType, ['color', 'gradient', 'image'], 'color'),
    bg1: hex(d.bg1, base.bg1), bg2: hex(d.bg2, base.bg2), angle: num(d.angle, 0, 360, 160),
    bgImage: safeImg(d.bgImage), font: pick(d.font, Object.keys(FONTS), 'sans'),
    textColor: hex(d.textColor, base.textColor), btnColor: hex(d.btnColor, base.btnColor), btnText: hex(d.btnText, base.btnText),
    btnShape: pick(d.btnShape, ['pill', 'round', 'square'], 'pill'), btnStyle: pick(d.btnStyle, ['fill', 'outline', 'shadow'], 'fill'),
    spacing: num(d.spacing, 4, 28, 12), layout: pick(d.layout, ['stack', 'grid'], 'stack'),
  };
  const links = (Array.isArray(raw.links) ? raw.links : []).slice(0, 200).map(l => ({
    id: String(l?.id || '').slice(0, 40), title: String(l?.title || '').slice(0, 80),
    url: safeUrl(l?.url), icon: pick(l?.icon, ICON_NAMES, 'link'),
  })).filter(l => l.title && l.url);
  const socials = (Array.isArray(raw.socials) ? raw.socials : []).slice(0, 20).map(s => ({
    type: pick(s?.type, Object.keys(SOCIALS), 'website'), url: safeUrl(s?.url),
  })).filter(s => s.url);
  const ytq = String(raw.youtube?.q || '').trim().slice(0, 200);
  return {
    displayName: String(raw.displayName || '').slice(0, 60), bio: String(raw.bio || '').slice(0, 300),
    avatar: safeImg(raw.avatar), banner: safeImg(raw.banner), links, socials, design,
    youtube: { q: ytq, id: /^UC[\w-]{22}$/.test(raw.youtube?.id || '') ? raw.youtube.id : '', show: !!ytq && raw.youtube?.show !== false },
  };
}

const compact = n => n == null ? '' : new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

/* YouTube block. state: 'loading' | 'error' | 'ok'. c = result of the voqcl-api channel_full action. */
function renderYoutube(c, state = 'ok', msg = '') {
  if (state === 'loading') return '<div class="yt-st">Loading YouTube channel…</div>';
  if (state === 'error') return `<div class="yt-st">${esc(msg || 'YouTube channel unavailable right now.')}</div>`;
  if (!c) return '';
  const vids = (c.videos || []).slice(0, 6).filter(v => /^[\w-]{11}$/.test(v.id));
  const stats = [c.subscribers != null ? `${compact(c.subscribers)} subscribers` : (c.hidden ? 'Subscriber count hidden' : ''), c.videoCount != null ? `${compact(c.videoCount)} videos` : ''].filter(Boolean).join(' · ');
  return `<a class="yt-ch" href="${esc(safeUrl(c.url) || 'https://www.youtube.com/channel/' + encodeURIComponent(c.id || ''))}" target="_blank" rel="noopener noreferrer">${safeImg(c.avatar) ? `<img src="${esc(c.avatar)}" alt="" referrerpolicy="no-referrer">` : ''}<span><b>${esc(c.title)}</b><small>${esc(stats)}</small></span><em>YouTube</em></a>
${c.description ? `<p class="yt-d">${esc(c.description)}</p>` : ''}
${vids.length ? `<div class="yt-v">${vids.map(v => `<a href="https://www.youtube.com/watch?v=${v.id}" target="_blank" rel="noopener noreferrer">${safeImg(v.thumb) ? `<img src="${esc(v.thumb)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ''}<span>${esc(v.title)}</span></a>`).join('')}</div>` : '<div class="yt-st">No public videos yet.</div>'}`;
}

function renderParts(raw, { username = 'username', preview = false, yt = null, ytState = 'loading', ytMsg = '' } = {}) {
  const p = normalize(raw), d = p.design;
  const radius = { pill: '999px', round: '14px', square: '2px' }[d.btnShape];
  let bg = d.bg1;
  if (d.bgType === 'gradient') bg = `linear-gradient(${d.angle}deg, ${d.bg1}, ${d.bg2})`;
  const bgImg = d.bgType === 'image' && d.bgImage ? `url('${d.bgImage}') center/cover no-repeat fixed, ${d.bg1}` : '';
  const btnBase = {
    fill: `background:${d.btnColor};color:${d.btnText};border:2px solid ${d.btnColor}`,
    outline: `background:transparent;color:${d.btnColor};border:2px solid ${d.btnColor}`,
    shadow: `background:${d.btnColor};color:${d.btnText};border:2px solid ${d.btnColor};box-shadow:5px 5px 0 ${d.btnText}55`,
  }[d.btnStyle];
  const name = p.displayName || username;
  const initial = esc((name[0] || '?').toUpperCase());
  const css = `
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;min-height:100vh;background:${bgImg || bg};color:${d.textColor};font-family:${FONTS[d.font]};-webkit-font-smoothing:antialiased;padding:env(safe-area-inset-top,0) 0 env(safe-area-inset-bottom,0)}
.wrap{max-width:${d.layout === 'grid' ? 680 : 520}px;margin:0 auto;padding:${p.banner ? 20 : 44}px 20px 56px;display:flex;flex-direction:column;align-items:center}
.bn{width:100%;aspect-ratio:3/1;border-radius:18px;background:${d.textColor}22 center/cover no-repeat;margin-bottom:-52px}
.av{width:104px;height:104px;border-radius:50%;object-fit:cover;border:3px solid ${d.textColor};display:grid;place-items:center;font-size:40px;font-weight:800;background:${d.bg1};position:relative}
h1{font-size:24px;margin:14px 0 4px;text-align:center;letter-spacing:-.01em;font-weight:800}
.un{opacity:.65;font-size:14px;margin:0 0 10px}
.bio{margin:0 0 20px;text-align:center;opacity:.9;line-height:1.5;max-width:420px;white-space:pre-wrap;overflow-wrap:anywhere}
.soc{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin:0 0 22px}
.soc a{padding:6px 12px;border-radius:999px;border:1px solid ${d.textColor}55;color:${d.textColor};text-decoration:none;font-size:13px}
.soc a:hover{background:${d.textColor}22}
.links{width:100%;display:${d.layout === 'grid' ? 'grid' : 'flex'};${d.layout === 'grid' ? 'grid-template-columns:repeat(auto-fit,minmax(200px,1fr))' : 'flex-direction:column'};gap:${d.spacing}px}
.links a{display:flex;align-items:center;gap:12px;padding:15px 18px;border-radius:${radius};text-decoration:none;font-weight:600;font-size:16px;min-height:52px;transition:transform .12s,opacity .12s;${btnBase}}
.links a span{flex:1;text-align:center;overflow-wrap:anywhere}
.links a svg{flex:none}.links a:hover{transform:translateY(-2px);opacity:.92}
.empty{opacity:.6;text-align:center;padding:20px}
.yt{width:100%;margin-top:26px;border:1px solid ${d.textColor}33;border-radius:16px;padding:14px;background:${d.textColor}0d}
.yt-ch{display:flex;align-items:center;gap:12px;color:inherit;text-decoration:none}.yt-ch img{width:48px;height:48px;border-radius:50%;object-fit:cover;flex:none}
.yt-ch span{display:flex;flex-direction:column;min-width:0;flex:1}.yt-ch b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.yt-ch small{opacity:.7;font-size:13px}
.yt-ch em{font-style:normal;font-size:12px;font-weight:700;background:#ff0033;color:#fff;border-radius:6px;padding:3px 8px;flex:none}
.yt-d{font-size:13px;opacity:.8;line-height:1.45;margin:10px 0 0;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;white-space:pre-line}
.yt-v{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}.yt-v a{color:inherit;text-decoration:none;font-size:12.5px;line-height:1.3}
.yt-v img{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:10px;display:block;margin-bottom:5px;background:${d.textColor}22}
.yt-v span{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.yt-st{opacity:.7;font-size:13px;text-align:center;padding:8px}
.yt-f{display:flex;justify-content:space-between;align-items:center;margin-top:10px;font-size:11px;opacity:.6}.yt-f button{font:inherit;color:inherit;background:none;border:1px solid currentColor;border-radius:6px;padding:2px 8px;cursor:pointer}
.ft{margin-top:34px;font-size:12px;opacity:.5}.ft a{color:inherit}
@media(max-width:480px){.wrap{padding-top:${p.banner ? 12 : 32}px}.yt-v{grid-template-columns:1fr 1fr}}`;
  const socials = p.socials.length ? `<div class="soc">${p.socials.map(s => `<a href="${esc(s.url)}" rel="noopener noreferrer nofollow" target="_blank">${esc(SOCIALS[s.type])}</a>`).join('')}</div>` : '';
  const links = p.links.length
    ? `<div class="links">${p.links.map(l => `<a href="${esc(l.url)}" rel="noopener noreferrer nofollow" target="_blank">${svg(l.icon)}<span>${esc(l.title)}</span></a>`).join('')}</div>`
    : `<div class="empty">${preview ? 'Add a link to see it here.' : 'No links yet.'}</div>`;
  const avatar = p.avatar ? `<img class="av" src="${esc(p.avatar)}" alt="">` : `<div class="av">${initial}</div>`;
  const banner = p.banner ? `<div class="bn" style="background-image:url('${esc(p.banner)}')"></div>` : '';
  const yts = p.youtube.show ? `<section class="yt" id="yt" data-q="${esc(p.youtube.q)}"><div class="yt-b">${renderYoutube(yt, yt ? 'ok' : ytState, ytMsg)}</div><div class="yt-f"><span>Channel data from YouTube</span>${preview ? '' : '<button type="button" id="ytr">Refresh</button>'}</div></section>` : '';
  const body = `<div class="wrap">${banner}${avatar}<h1>${esc(name)}</h1><p class="un">@${esc(username)}</p>${p.bio ? `<p class="bio">${esc(p.bio)}</p>` : ''}${socials}${links}${yts}<div class="ft">Made with <a href="${preview ? '#' : '/'}">VOQCL TOOLS</a></div></div>`;
  return { title: name, description: p.bio.slice(0, 150), image: p.avatar, css, body, data: p };
}

function renderProfile(raw, opt = {}) {
  const r = renderParts(raw, opt);
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${esc(r.title)}</title><meta name="robots" content="noindex"><style>${r.css}</style></head><body>${r.body}</body></html>`;
}

/* Standalone page file for GitHub Pages: bio/<username>.html  ->  voqcl.com/bio/<username>
   Works with no JavaScript (YouTube snapshot baked in); scripts refresh the YouTube block live and the
   embedded JSON lets the editor load the page back for editing. */
function exportBioHtml(raw, { username, siteOrigin = 'https://voqcl.com', yt = null } = {}) {
  const r = renderParts(raw, { username, yt, ytState: 'error', ytMsg: 'YouTube channel info will appear here.' });
  const url = `${String(siteOrigin).replace(/\/+$/, '')}/bio/${username}`;
  const json = JSON.stringify({ v: 1, username, data: r.data, yt: yt || null, saved: new Date().toISOString() }).replace(/</g, '\\u003c');
  const ogImg = /^https:/.test(r.image) ? `<meta property="og:image" content="${esc(r.image)}">` : '';
  const body = r.body.replace('<a href="/">VOQCL TOOLS</a>', '<a href="../">VOQCL TOOLS</a>');
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(r.title)} (@${esc(username)})</title>
<meta name="description" content="${esc(r.description || r.title + ' on VOQCL')}">
<meta property="og:type" content="profile"><meta property="og:title" content="${esc(r.title)}"><meta property="og:description" content="${esc(r.description || '@' + username)}"><meta property="og:url" content="${esc(url)}">${ogImg}
<meta name="twitter:card" content="summary">
<link rel="canonical" href="${esc(url)}"><link rel="icon" href="../assets/favicon.png">
<style>${r.css}</style>
</head><body>${body}
<script type="application/json" id="voqcl-bio">${json}</script>
<script src="../config.js"></script><script src="../js/youtube-direct.js"></script><script src="../js/render.js"></script><script src="../js/bio-live.js"></script>
</body></html>
`;
}

/* read the embedded data back out of an exported page */
function parseBioHtml(html) {
  const m = String(html).match(/<script type="application\/json" id="voqcl-bio">([\s\S]*?)<\/script>/);
  if (!m) return null;
  try { const j = JSON.parse(m[1]); return j && j.data && /^[a-z0-9_]{3,24}$/.test(j.username) ? j : null; } catch { return null; }
}

const api = { renderProfile, renderParts, renderYoutube, exportBioHtml, parseBioHtml, normalize, PRESETS, FONTS, ICON_NAMES, SOCIALS, safeUrl, safeImg, esc };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.BIO = api;
})(typeof window !== 'undefined' ? window : globalThis);

