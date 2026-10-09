/* Loaded by exported bio pages (bio/<username>.html): refreshes the YouTube block with live data. */
(function () {
  const sec = document.getElementById('yt'); if (!sec || typeof BIO === 'undefined' || typeof createYouTubeClient === 'undefined') return;
  const cfg = window.VOQCL_CONFIG || {}; if (!cfg.youtubeApiKey) return;
  let saved = null; try { saved = JSON.parse(document.getElementById('voqcl-bio').textContent); } catch {}
  const q = (saved && saved.data && saved.data.youtube && (saved.data.youtube.id || saved.data.youtube.q)) || sec.dataset.q; if (!q) return;
  const yt = createYouTubeClient({ key: cfg.youtubeApiKey, base: cfg.youtubeApiBase || undefined, storage: (() => { try { return localStorage; } catch { return null; } })() });
  const box = sec.querySelector('.yt-b');
  const footer = sec.querySelector('.yt-f');
  if (footer && !document.getElementById('ytr')) { const b = document.createElement('button'); b.type = 'button'; b.id = 'ytr'; b.textContent = 'Refresh'; footer.append(b); }
  const load = async force => {
    try { const c = await yt.call('channel_full', { q, ...(force ? { t: Date.now() } : {}) }); box.innerHTML = BIO.renderYoutube(c); }
    catch (e) { if (force || !(saved && saved.yt)) box.innerHTML = BIO.renderYoutube(null, 'error', e.code === 'quota' ? 'YouTube data is unavailable right now (daily limit reached).' : 'YouTube data is unavailable right now.'); }
  };
  const btn = document.getElementById('ytr'); if (btn) btn.onclick = async () => { btn.disabled = true; await load(true); btn.disabled = false; };
  load(false);
})();
