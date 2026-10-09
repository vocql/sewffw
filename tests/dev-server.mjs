// Local preview + test server. Run: node tests/dev-server.mjs   then open http://127.0.0.1:8124
//  :8124  behaves like GitHub Pages: static files, /bio/name -> bio/name.html, unknown paths -> 404.html (HTTP 404)
//  :8126  MOCK YouTube Data API used by the browser tests (set REAL_CONFIG=1 to serve your real config.js instead)
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), PAGES = 8124, YT = 8126, SITE = `http://127.0.0.1:${PAGES}`;

http.createServer((req, res) => {
  const cors = { 'access-control-allow-origin': '*' };
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  const u = new URL(req.url, 'http://x'), j = (o, s = 200) => { res.writeHead(s, { 'content-type': 'application/json', ...cors }); res.end(JSON.stringify(o)); };
  if (u.searchParams.get('key') !== 'mock-key') return j({ error: { errors: [{ reason: 'keyInvalid' }] } }, 400);
  const CH = { id: 'UC' + 'a'.repeat(22), snippet: { title: 'Mock Channel', customUrl: '@mockchannel', description: 'Mock channel description', thumbnails: { medium: { url: `${SITE}/assets/favicon.png` } } }, statistics: { subscriberCount: '5000', videoCount: '42' }, contentDetails: { relatedPlaylists: { uploads: 'UU' + 'a'.repeat(22) } } };
  if (u.pathname === '/channels') return j({ items: u.searchParams.get('forHandle') === '@missing' ? [] : [CH] });
  if (u.pathname === '/playlistItems') return j({ items: [1, 2, 3].map(i => ({ contentDetails: { videoId: 'VID1111111' + i }, snippet: { title: 'Mock video ' + i, publishedAt: new Date().toISOString(), resourceId: { videoId: 'VID1111111' + i }, thumbnails: { medium: { url: `${SITE}/assets/logo.png` } } } })) });
  if (u.pathname === '/videos') return j({ items: u.searchParams.get('part') === 'id' ? [] : [{ id: 'VID11111111', liveStreamingDetails: { activeLiveChatId: 'C1' } }] });
  if (u.pathname === '/liveChat/messages') return j({ nextPageToken: 'n' + Date.now(), pollingIntervalMillis: 2000, items: [
    { id: 'y1', snippet: { type: 'textMessageEvent', displayMessage: 'hello from youtube', publishedAt: new Date().toISOString() }, authorDetails: { displayName: 'YtAlice', profileImageUrl: `${SITE}/assets/favicon.png` } },
    { id: 'y2', snippet: { type: 'superChatEvent', publishedAt: new Date().toISOString(), superChatDetails: { amountDisplayString: '$5.00', userComment: 'big donation' } }, authorDetails: { displayName: 'YtBob' } }] });
  j({}, 404);
}).listen(YT, '127.0.0.1');

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.md': 'text/markdown' };
const file = p => { const f = path.normalize(path.join(ROOT, p)); return f.startsWith(ROOT + path.sep) && !f.includes(`${path.sep}tests${path.sep}`) && fs.existsSync(f) && fs.statSync(f).isFile() ? f : null; };
http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/config.js' && process.env.REAL_CONFIG !== '1') { res.writeHead(200, { 'content-type': 'text/javascript' }); return res.end(`window.VOQCL_CONFIG={siteOrigin:'https://voqcl.com',youtubeApiKey:'mock-key',youtubeApiBase:'http://127.0.0.1:${YT}'};`); }
  if (p.endsWith('/')) p += 'index.html';
  const f = file(p) || (!path.extname(p) && file(p + '.html'));   // GitHub Pages serves /bio/name from bio/name.html
  if (f) { res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); return res.end(fs.readFileSync(f)); }
  res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' }); res.end(fs.readFileSync(path.join(ROOT, '404.html')));
}).listen(PAGES, '127.0.0.1', () => console.log(`ready: ${SITE}`));
