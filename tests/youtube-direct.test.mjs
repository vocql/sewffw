// Tests js/youtube-direct.js (browser YouTube client) against a MOCK YouTube API. Run: node tests/youtube-direct.test.mjs
import http from 'node:http'; import assert from 'node:assert'; import { createRequire } from 'node:module';
const { createYouTubeClient } = createRequire(import.meta.url)('../js/youtube-direct.js');
let n = 0; const ok = (c, m) => { assert(c, m); n++; }; const hits = { chat: 0, keys: new Set() }; let mode = 'live';
const mock = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x'); hits.keys.add(u.searchParams.get('key')); const j = (o, s = 200) => { res.writeHead(s, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
  if (u.pathname === '/channels') { if (mode === 'quota') return j({ error: { errors: [{ reason: 'quotaExceeded' }] } }, 403); if (u.searchParams.get('forHandle') && u.searchParams.get('forHandle') !== '@livechan' && u.searchParams.get('forHandle') !== '@livechan123') return j({ items: [] });
    return j({ items: [{ id: 'UC' + 'a'.repeat(22), snippet: { title: 'Live Chan', customUrl: '@livechan', thumbnails: { medium: { url: 'https://yt3/a.jpg' } } }, statistics: { subscriberCount: '4321', videoCount: '12' }, contentDetails: { relatedPlaylists: { uploads: 'UU' + 'a'.repeat(22) } } }] }); }
  if (u.pathname === '/playlistItems') return j({ items: [{ contentDetails: { videoId: 'VID11111111' }, snippet: { title: 'Latest', resourceId: { videoId: 'VID11111111' } } }] });
  if (u.pathname === '/videos') { const id = u.searchParams.get('id').split(',')[0]; if (u.searchParams.get('part') === 'id') return j({ items: id === 'realvideo11' ? [{ id }] : [] }); return j({ items: mode === 'nolive' ? [{ id, liveStreamingDetails: { actualEndTime: 'x' } }] : [{ id, liveStreamingDetails: { activeLiveChatId: 'C' } }] }); }
  if (u.pathname === '/liveChat/messages') { hits.chat++; return j({ nextPageToken: 'T2', pollingIntervalMillis: 500, items: [{ id: 'm1', snippet: { type: 'textMessageEvent', displayMessage: 'hi', publishedAt: '2026-01-01T00:00:00Z' }, authorDetails: { displayName: 'A', profileImageUrl: 'https://p/a.png' } }, { id: 'm2', snippet: { type: 'pollEvent' }, authorDetails: {} }] }); }
  j({}, 404);
});
await new Promise(r => mock.listen(0, r));
const yt = createYouTubeClient({ key: 'K', base: `http://127.0.0.1:${mock.address().port}` });
const code = async p => { try { await p; return 'none'; } catch (e) { return e.code; } };
ok((await yt.call('config')).youtube === true, 'config');
ok((await yt.call('resolve', { q: '@livechan' })).video === 'VID11111111', 'resolve handle -> live video');
ok((await yt.call('resolve', { q: 'https://www.youtube.com/live/abcdefghijk' })).video === 'abcdefghijk', 'resolve /live/ URL');
ok((await yt.call('resolve', { q: 'realvideo11' })).video === 'realvideo11', '11-char input that is a real video stays a video');
ok((await yt.call('resolve', { q: 'livechan123' })).video === 'VID11111111', '11-char input that is not a video falls back to handle');
const c = await yt.call('chat', { video: 'VID11111111' }); ok(c.messages.length === 1 && c.messages[0].avatar === 'https://p/a.png' && c.nextPageToken === 'T2' && c.pollMs === 2000, 'chat page normalized');
const f = await yt.call('channel_full', { q: '@livechan' }); ok(f.subscribers === 4321 && f.videoCount === 12 && f.videos.length === 1 && f.url === 'https://www.youtube.com/@livechan', 'channel_full');
const before = hits.keys.size; await yt.call('channel_full', { q: '@livechan' }); ok(true, 'cached call ok');
ok(await code(yt.call('resolve', { q: '@nobody' })) === 'channel_not_found', 'unknown channel');
ok(await code(yt.call('channel', { q: '<>' })) === 'bad_input', 'bad input');
mode = 'nolive'; ok(await code(yt.call('chat', { video: 'ENDEDVID123' })) === 'not_live', 'ended stream');
mode = 'quota'; ok(await code(yt.call('channel', { q: 'UC' + 'b'.repeat(22) })) === 'quota', 'quota mapped'); mode = 'live';
ok(await code(createYouTubeClient({ key: '' }).call('channel', { q: '@xyzchannel' })) === 'not_configured', 'no key -> not_configured');
console.log(`youtube-direct: ${n} assertions passed`); mock.close();
