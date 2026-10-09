/* YouTube Data API called straight from the browser with the key in config.js (owner's choice; no server needed).
   Actions: config, resolve (find a live stream), chat, channel, channel_full.
   Tip: in Google Cloud restrict the key to "YouTube Data API v3" and to websites https://voqcl.com/* */
(function (root) {
  function createYouTubeClient({ key, base = 'https://www.googleapis.com/youtube/v3', storage = null }) {
    base = base.replace(/\/$/, '');
    const err = (status, code, message) => Object.assign(new Error(message), { status, code });

    /* memory cache + optional localStorage cache (survives reloads; shared across tabs of the same viewer) */
    const mem = new Map();
    const cget = k => {
      const e = mem.get(k); if (e && e.exp > Date.now()) return e.v;
      if (storage) { try { const s = JSON.parse(storage.getItem('ytc:' + k)); if (s && s.exp > Date.now()) { mem.set(k, s); return s.v; } } catch {} }
      return undefined;
    };
    const cset = (k, v, ms, persist) => {
      const e = { v, exp: Date.now() + ms }; if (mem.size > 1000) mem.clear(); mem.set(k, e);
      if (persist && storage) { try { storage.setItem('ytc:' + k, JSON.stringify(e)); } catch {} }
      return v;
    };

    async function ytGet(path, params) {
      if (!key) throw err(501, 'not_configured', 'YouTube is not configured (no API key).');
      const u = new URL(base + path);
      for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') u.searchParams.set(k, String(v));
      u.searchParams.set('key', key);
      let r;
      try { r = await fetch(u, { signal: AbortSignal.timeout(10000) }); }
      catch { throw err(502, 'upstream_unreachable', 'Could not reach YouTube.'); }
      let j = null; try { j = await r.json(); } catch {}
      if (!r.ok) {
        const reason = j?.error?.errors?.[0]?.reason || '';
        if (reason === 'quotaExceeded' || reason === 'rateLimitExceeded' || reason === 'dailyLimitExceeded') throw err(429, 'quota', 'YouTube API quota exceeded. Try again later.');
        if (reason === 'liveChatEnded') throw err(410, 'chat_ended', 'This live chat has ended.');
        if (reason === 'liveChatDisabled') throw err(403, 'chat_disabled', 'Chat is disabled for this stream.');
        if (reason === 'liveChatNotFound' || r.status === 404) throw err(404, 'not_found', 'Live chat not found.');
        if (reason === 'keyInvalid' || (reason === 'badRequest' && /API key/i.test(JSON.stringify(j)))) throw err(502, 'bad_key', 'The YouTube API key was rejected. Check youtubeApiKey in config.js.');
        if (reason === 'ipRefererBlocked' || reason === 'forbidden' || r.status === 403) throw err(403, 'forbidden', 'YouTube refused the request (check the API key\'s website restrictions, or the chat may be private/members-only).');
        throw err(502, 'upstream_error', `YouTube returned ${r.status}.`);
      }
      return j;
    }

    function parse(q) {
      q = String(q || '').trim(); if (!q) return null; let m;
      if (/^[\w-]{11}$/.test(q) && !/^UC/.test(q)) return { video: q, handle: /^[\w.\-]{3,30}$/.test(q) ? '@' + q : undefined, ambiguous: true };
      if ((m = q.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|live\/|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/i))) return { video: m[1] };
      if ((m = q.match(/youtube\.com\/channel\/(UC[\w-]{22})/i))) return { channelId: m[1] };
      if ((m = q.match(/youtube\.com\/(@[\w.\-]{3,30})/i))) return { handle: m[1] };
      if ((m = q.match(/youtube\.com\/(?:c|user)\/([\w.\-]{2,60})/i))) return { legacy: m[1] };
      if (/^UC[\w-]{22}$/.test(q)) return { channelId: q };
      if (/^@?[\w.\-]{3,30}$/.test(q)) return { handle: q.startsWith('@') ? q : '@' + q };
      return null;
    }
    async function channelIdFor(inp) {
      if (inp.channelId) return inp.channelId;
      const k = 'h:' + (inp.handle || inp.legacy).toLowerCase(), hit = cget(k); if (hit) return hit;
      const j = await ytGet('/channels', inp.handle ? { part: 'id', forHandle: inp.handle } : { part: 'id', forUsername: inp.legacy });
      const id = j.items?.[0]?.id; if (!id) throw err(404, 'channel_not_found', 'YouTube channel not found.');
      return cset(k, id, 7 * 864e5, true);
    }
    async function liveVideoForChannel(channelId) {
      const k = 'live:' + channelId, hit = cget(k);
      if (hit !== undefined) { if (hit) return hit; throw err(404, 'not_live', 'That channel is not live right now.'); }
      const pl = await ytGet('/playlistItems', { part: 'contentDetails', playlistId: 'UU' + channelId.slice(2), maxResults: 6 });
      const ids = (pl.items || []).map(i => i.contentDetails?.videoId).filter(Boolean); let found = '';
      if (ids.length) { const v = await ytGet('/videos', { part: 'liveStreamingDetails', id: ids.join(',') }); for (const it of v.items || []) { const d = it.liveStreamingDetails; if (d?.activeLiveChatId && !d.actualEndTime) { found = it.id; break; } } }
      cset(k, found, found ? 120e3 : 45e3);
      if (!found) throw err(404, 'not_live', 'That channel is not live right now.');
      return found;
    }
    async function resolve(q) {
      const inp = parse(q); if (!inp) throw err(400, 'bad_input', 'Enter a YouTube @handle, channel URL/ID (UC…), or a live video URL/ID.');
      if (inp.video && !inp.ambiguous) return inp.video;
      if (inp.ambiguous) { const v = await ytGet('/videos', { part: 'id', id: inp.video }); if (v.items?.length) return inp.video; }
      return liveVideoForChannel(await channelIdFor({ handle: inp.handle, channelId: inp.channelId, legacy: inp.legacy }));
    }
    async function chatId(video) {
      const k = 'chat:' + video, hit = cget(k); if (hit) return hit;
      const j = await ytGet('/videos', { part: 'liveStreamingDetails', id: video }), it = j.items?.[0];
      if (!it) throw err(404, 'video_not_found', 'Video not found (or it is private).');
      const d = it.liveStreamingDetails;
      if (!d || !d.activeLiveChatId) throw err(404, 'not_live', d?.actualEndTime ? 'That stream has ended.' : 'That video has no active live chat.');
      return cset(k, d.activeLiveChatId, 5 * 60e3);
    }
    function norm(it) {
      const s = it.snippet || {}, a = it.authorDetails || {}; let text = s.displayMessage || s.textMessageDetails?.messageText || '', kind = 'text', extra = '';
      if (s.type === 'superChatEvent') { kind = 'super'; extra = s.superChatDetails?.amountDisplayString || ''; text = s.superChatDetails?.userComment || ''; }
      else if (s.type === 'superStickerEvent') { kind = 'super'; extra = s.superStickerDetails?.amountDisplayString || ''; text = ''; }
      else if (s.type === 'newSponsorEvent') { kind = 'member'; text = text || 'became a member'; }
      else if (s.type !== 'textMessageEvent') return null;
      return { id: it.id, name: a.displayName || 'Unknown', avatar: a.profileImageUrl || '', text, ts: Date.parse(s.publishedAt) || Date.now(), kind, extra, owner: !!a.isChatOwner, mod: !!a.isChatModerator, member: !!a.isChatSponsor };
    }
    async function chat(video, pageToken) {
      if (!/^[\w-]{11}$/.test(video)) throw err(400, 'bad_input', 'Invalid video id.');
      const liveChatId = await chatId(video);
      const j = await ytGet('/liveChat/messages', { part: 'snippet,authorDetails', liveChatId, pageToken, maxResults: 200 });
      return { messages: (j.items || []).map(norm).filter(Boolean), nextPageToken: j.nextPageToken || pageToken || '', pollMs: Math.max(2000, Math.min(15000, Number(j.pollingIntervalMillis) || 5000)) };
    }
    async function channel(q, full, force) {
      const inp = parse(q); if (!inp || (inp.video && !inp.ambiguous)) throw err(400, 'bad_input', 'Enter a YouTube @handle, channel URL, or channel ID (UC…).');
      const id = await channelIdFor({ handle: inp.handle, channelId: inp.channelId, legacy: inp.legacy });
      const k = (full ? 'chf:' : 'ch:') + id, hit = force ? undefined : cget(k); if (hit) return hit;
      const j = await ytGet('/channels', { part: full ? 'snippet,statistics,contentDetails' : 'snippet,statistics', id }), it = j.items?.[0];
      if (!it) throw err(404, 'channel_not_found', 'YouTube channel not found.');
      const st = it.statistics || {}, sn = it.snippet || {};
      const r = { id, title: sn.title || '', avatar: sn.thumbnails?.medium?.url || sn.thumbnails?.default?.url || '', subscribers: st.hiddenSubscriberCount || st.subscriberCount === undefined ? null : Number(st.subscriberCount), hidden: !!st.hiddenSubscriberCount, url: sn.customUrl ? 'https://www.youtube.com/' + sn.customUrl : 'https://www.youtube.com/channel/' + id };
      if (full) {
        r.description = (sn.description || '').slice(0, 1000); r.videoCount = st.videoCount === undefined ? null : Number(st.videoCount);
        let videos = [];
        try {
          const pl = await ytGet('/playlistItems', { part: 'snippet', playlistId: it.contentDetails?.relatedPlaylists?.uploads || 'UU' + id.slice(2), maxResults: 6 });
          videos = (pl.items || []).map(v => ({ id: v.snippet?.resourceId?.videoId, title: v.snippet?.title || '', published: v.snippet?.publishedAt || '', thumb: v.snippet?.thumbnails?.medium?.url || v.snippet?.thumbnails?.default?.url || '' })).filter(v => v.id && v.title !== 'Private video' && v.title !== 'Deleted video');
        } catch (e) { if (e.code === 'quota') throw e; }
        r.videos = videos; r.fetchedAt = new Date().toISOString();
      }
      return cset(k, r, full ? 10 * 60e3 : 60e3, full);
    }

    async function call(action, p = {}) {
      switch (action) {
        case 'config': return { youtube: !!key, twitchAvatars: false };
        case 'resolve': return { video: await resolve(p.q) };
        case 'chat': return chat(String(p.video || ''), p.pageToken || '');
        case 'channel': return channel(p.q, false, !!p.t);
        case 'channel_full': return channel(p.q, true, !!p.t);
        default: throw err(400, 'bad_action', 'Unknown action.');
      }
    }
    return { call, parse };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { createYouTubeClient }; else root.createYouTubeClient = createYouTubeClient;
})(typeof window !== 'undefined' ? window : globalThis);
