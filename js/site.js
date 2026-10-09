/* ===== Site settings + YouTube access (no backend: the site is plain files on GitHub Pages) ===== */
const CFG = Object.assign({ siteOrigin: 'https://voqcl.com', youtubeApiKey: '' }, window.VOQCL_CONFIG || {});
const SITE = String(CFG.siteOrigin || 'https://voqcl.com').replace(/\/+$/, '');
const BASE = window.VOQCL_BASE || '/';
const HERE = (location.origin + BASE).replace(/\/+$/, '');   // where this copy of the site is running
const bioUrl = u => `${SITE}/bio/${u}`;
const YTD = CFG.youtubeApiKey ? createYouTubeClient({ key: CFG.youtubeApiKey, base: CFG.youtubeApiBase || undefined, storage: (() => { try { return localStorage; } catch { return null; } })() }) : null;
/* actions: config | resolve | chat | channel | channel_full  (see js/youtube-direct.js) */
async function ytApi(action, params = {}) {
  if (!YTD) { if (action === 'config') return { youtube: false, twitchAvatars: false, why: 'Add your YouTube API key to config.js (youtubeApiKey).' }; throw Object.assign(new Error('YouTube needs an API key in config.js (youtubeApiKey).'), { code: 'not_configured' }); }
  return YTD.call(action, params);
}
