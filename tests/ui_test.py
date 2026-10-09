# Browser tests (Chromium via Playwright) against tests/dev-server.mjs (GitHub Pages behaviour + mock YouTube).
#   node tests/dev-server.mjs &   then   python3 tests/ui_test.py
import re, sys, os, io
from playwright.sync_api import sync_playwright
import cv2

BASE = 'http://127.0.0.1:8124'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BIOFILE = os.path.join(ROOT, 'bio', 'uitester.html')
if os.path.exists(BIOFILE): os.remove(BIOFILE)
from PIL import Image
def img_bytes(w, h, fmt, color):
    b = io.BytesIO(); Image.new('RGB', (w, h), color).save(b, fmt); return b.getvalue()
PNG = bytes.fromhex('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63fcffff3f0300090301ff4e5b3b6a0000000049454e44ae426082')
results, fails, errors = [], [], []
def check(name, cond, info=''):
    results.append(bool(cond))
    if not cond: fails.append(f'{name}  [{info}]')
    print(('PASS ' if cond else 'FAIL ') + name + (f'  [{info}]' if (info and not cond) else ''))

with sync_playwright() as pw:
    b = pw.chromium.launch()
    ctx = b.new_context(viewport={'width': 1280, 'height': 900}, permissions=['clipboard-read', 'clipboard-write'], accept_downloads=True)
    ctx.add_init_script("window.addEventListener('error',e=>console.error('ERR_STACK '+(e.error&&e.error.stack)))")
    def wire(page):
        page.on('pageerror', lambda e: errors.append('pageerror: ' + str(e)))
        page.on('console', lambda m: m.type == 'error' and not m.text.startswith('Failed to load resource: the server responded with a status of 4') and errors.append('console: ' + m.text))
        page.route(re.compile(r'(7tv\.io|betterttv\.net)'), lambda r: r.fulfill(status=200, content_type='application/json', body='{}'))
        page.route(re.compile(r'decapi\.me/twitch/followcount/'), lambda r: r.fulfill(status=200, body='1234'))
        page.route(re.compile(r'decapi\.me/twitch/avatar/'), lambda r: r.fulfill(status=200, body=BASE + '/assets/favicon.png'))
        page.route(re.compile(r'static-cdn\.jtvnw\.net'), lambda r: r.fulfill(status=200, content_type='image/png', body=PNG))
        def irc(ws):
            def on(m):
                if 'JOIN #' in m:
                    for l in [':tmi.twitch.tv 001 justinfan1 :Welcome', ':justinfan1!justinfan1@justinfan1.tmi.twitch.tv JOIN #voqcl', '@room-id=12345 :tmi.twitch.tv ROOMSTATE #voqcl',
                              '@badges=moderator/1;color=#1E90FF;display-name=TwitchAlice;emotes=25:6-10;id=m1;tmi-sent-ts=1700000000000 :twitchalice!twitchalice@x.tmi.twitch.tv PRIVMSG #voqcl :hello Kappa world',
                              '@display-name=Nightbot;id=m2;tmi-sent-ts=1700000000001 :nightbot!nightbot@x.tmi.twitch.tv PRIVMSG #voqcl :I am a hidden bot', 'PING :tmi.twitch.tv']:
                        ws.send(l + '\r\n')
            ws.on_message(on)
        page.route_web_socket(re.compile(r'irc-ws\.chat\.twitch\.tv'), irc)
        return page
    page = wire(ctx.new_page())

    # ---------- site structure ----------
    page.goto(BASE + '/'); page.wait_for_selector('.h-row')
    check('home: 7 overlays + 8 utilities + featured Multiview', page.locator('.h-cols > div:nth-child(1) .h-row').count() == 7 and page.locator('.h-cols > div:nth-child(2) .h-row').count() == 8 and page.locator('.h-feat').count() == 1)
    check('home: no CS2 / ChatIS anywhere', not re.search(r'CS2|ChatIS|chatis', page.content()))
    check('home: no sign-in / account UI', page.locator('text=Sign in').count() == 0 and page.locator('.acct-slot').count() == 0)
    check('logo + favicon load (relative paths)', page.evaluate("() => { const i=document.querySelector('.h-logo'); return i.complete && i.naturalWidth>0 }") and page.evaluate("() => document.querySelector('link[rel=icon]').href") == BASE + '/assets/favicon.png')
    page.goto(BASE + '/#/tools'); page.wait_for_selector('.card'); names = page.locator('.card b').all_inner_texts()
    check('tools page: exactly 16 tools', len(names) == 16, str(names))
    for gone in ['cs2', 'chatis', 'follow', 'discord', 'json', 'ytthumb', 'pomo', 'calc', 'color', 'regex', 'stopwatch', 'sched']:
        page.goto(BASE + f'/#/tool/{gone}'); page.wait_for_selector('h1'); check(f'removed tool "{gone}" -> not found', 'Tool not found' in page.inner_text('#app'))
    page.goto(BASE + '/#/tools'); page.fill('#q', 'qr'); check('search filters', page.locator('.card').count() == 1)
    page.goto(BASE + '/#/c/obs'); page.wait_for_selector('.card'); check('Overlays category: 7', page.locator('.card').count() == 7)
    page.goto(BASE + '/#/c/util'); page.wait_for_selector('.card'); check('Utilities category: 9', page.locator('.card').count() == 9)
    for t in ['multiview', 'mask', 'bgr']:
        page.goto(BASE + f'/#/tool/{t}'); page.wait_for_selector('h1'); check(f'kept tool {t} loads', 'went wrong' not in page.inner_text('#app') and 'not found' not in page.inner_text('h1').lower())
    r = page.goto(BASE + '/some/unknown/page'); page.wait_for_selector('h1'); check('unknown path -> styled 404 page', r.status == 404 and 'Page not found' in page.inner_text('h1'))

    # ---------- overlay URL generators ----------
    for t, tool in [('chat','chat'),('emote','emote'),('followtracker','followlive'),('countdown','countdown'),('goal','goal'),('ticker','ticker'),('scene','scene')]:
        page.goto(BASE + f'/#/tool/{tool}')
        if tool == 'followlive': page.wait_for_selector('#go'); page.fill('#c', 'voqcl'); page.click('#go')
        page.wait_for_selector('code[data-u]'); url = page.locator('code[data-u]').first.inner_text()
        check(f'generator {t}: https://voqcl.com/#/live/voqcl/overlay/{t}?user=voqcl', url.startswith(f'https://voqcl.com/#/live/voqcl/overlay/{t}?') and 'user=voqcl' in url, url)
        page.locator('[data-cp]').first.click(); check(f'generator {t}: copy = full URL', page.evaluate('navigator.clipboard.readText()') == url)
    page.goto(BASE + '/#/tool/chat'); page.wait_for_selector('[data-f]')
    page.select_option('[data-f] select >> nth=0', 'youtube'); page.fill('[data-f] input[type=text] >> nth=0', '@some channel&x'); page.wait_for_timeout(100)
    u = page.locator('code[data-u]').inner_text(); check('chat URL encodes user + keeps platform', 'platform=youtube' in u and 'user=%40some+channel%26x' in u, u)
    page.wait_for_function("() => document.querySelector('[data-st]')?.textContent.includes('YouTube chat: enabled')"); check('chat tool shows YouTube enabled (key in config.js)', True)
    page.reload(); page.wait_for_selector('[data-f]'); check('generator settings persist after reload', page.locator('[data-f] select >> nth=0').input_value() == 'youtube')
    page.fill('[data-d]', 'ftp://bad'); check('bad domain -> error + copy disabled', page.locator('[data-e]').inner_text() != '' and page.locator('[data-cp]').is_disabled())
    page.click('[data-loc]'); check('"Use this site\'s address" fills current origin', page.locator('[data-d]').input_value() == BASE)
    page.fill('[data-d]', 'https://voqcl.com'); page.click('[data-f] button:has-text("Reset")'); page.wait_for_selector('[data-f]')

    # ---------- overlays load independently (OBS) ----------
    ov = wire(ctx.new_page())
    def load(h, sel): ov.goto(BASE + h); ov.reload(); ov.wait_for_selector(sel, timeout=10000)
    load('/#/live/voqcl/overlay/chat?user=voqcl', '.msg'); tx = ov.locator('.msg').all_inner_texts()
    check('Twitch chat: message, emote, bot hidden, avatar + tag', any('TwitchAlice' in t and 'world' in t for t in tx) and ov.locator('img.emo').count() == 1 and not any('hidden bot' in t for t in tx) and ov.locator('.msg .av').count() == 1)
    check('overlay: transparent background, no site header', ov.evaluate("getComputedStyle(document.body).backgroundColor") in ('rgba(0, 0, 0, 0)', 'transparent') and not ov.locator('header').is_visible())
    load('/#/live/voqcl/overlay/chat?user=@mockchannel&platform=youtube', '.msg.youtube'); tx = ov.locator('.msg.youtube').all_inner_texts()
    check('YouTube chat (browser key): messages + super chat', any('YtAlice' in t and 'hello from youtube' in t for t in tx) and any('$5.00' in t for t in tx), str(tx))
    ov.wait_for_timeout(2600); check('YouTube chat: repeated polls do not duplicate messages', ov.locator('.msg.youtube').count() == 2)
    check('YouTube chat: profile picture loads', ov.evaluate("() => { const i=document.querySelector('.msg.youtube img.av'); return !!i && i.complete && i.naturalWidth>0 }"))
    load('/#/live/voqcl/overlay/chat?user=a', '.ovst'); check('invalid Twitch name -> error', 'Invalid Twitch channel' in ov.inner_text('.ovst'))
    load('/#/live/voqcl/overlay/countdown?user=voqcl&minutes=5&label=Soon', '.cdt'); check('countdown ~05:00', re.match(r'0[45]:\d\d', ov.inner_text('.cdt')))
    load('/#/live/voqcl/overlay/goal?user=voqcl&current=50&goal=200', '.gn'); check('goal manual 25%', '50 / 200 (25%)' in ov.inner_text('.gn'))
    load('/#/live/voqcl/overlay/goal?user=@mockchannel&source=youtube&goal=10000', '.gn'); ov.wait_for_function("() => document.querySelector('.gn').textContent.includes('5,000')"); check('goal YouTube subs', True)
    load('/#/live/voqcl/overlay/ticker?user=voqcl&text=Hello%20world|Two', '.tin'); x1 = ov.evaluate("document.querySelector('.tin').getBoundingClientRect().x"); ov.wait_for_timeout(400); check('ticker scrolls', ov.evaluate("document.querySelector('.tin').getBoundingClientRect().x") < x1)
    load('/#/live/voqcl/overlay/scene?user=voqcl&title=BRB&minutes=2', '.ovs'); check('scene title + timer', 'BRB' in ov.inner_text('.st') and ov.locator('.sc').count() == 1)
    load('/#/live/voqcl/overlay/emote?user=voqcl&n=4&every=1', '.em'); check('emote bursts', ov.locator('.em').count() >= 4)
    load('/#/live/voqcl/overlay/followtracker?user=voqcl', '.cnt'); ov.wait_for_function("() => document.querySelector('.cnt').textContent.includes('1,234')"); check('follow tracker Twitch', True)
    load('/#/live/voqcl/overlay/followtracker?user=@mockchannel&platform=youtube', '.cnt'); ov.wait_for_function("() => document.querySelector('.cnt').textContent.includes('5,000')"); check('follow tracker YouTube', 'Subscribers' in ov.inner_text('.lb'))
    load('/#/live/voqcl/overlay', '.cnt'); check('base URL /#/live/voqcl/overlay loads (follower tracker)', True)
    for bad in ['cs2', 'chatis']: load(f'/#/live/voqcl/overlay/{bad}', '.ove'); check(f'overlay "{bad}" rejected', 'Unknown overlay' in ov.inner_text('.ove'))
    ov.close()

    # ---------- QR ----------
    page.goto(BASE + '/#/tool/qr'); page.wait_for_selector('#qc'); page.fill('#qt', 'https://voqcl.com/bio/voqcl'); page.wait_for_timeout(200)
    with page.expect_download() as d: page.click('#qp')
    d.value.save_as('/tmp/qr.png'); txt, _, _ = cv2.QRCodeDetector().detectAndDecode(cv2.imread('/tmp/qr.png', cv2.IMREAD_GRAYSCALE))
    check('QR PNG decodes to input (OpenCV)', txt == 'https://voqcl.com/bio/voqcl', repr(txt))
    page.fill('#qt', ''); page.wait_for_timeout(100); check('QR empty -> error', 'Enter a link' in page.inner_text('#qerr') and page.locator('#qp').is_disabled())

    # ---------- Link in Bio (no accounts) ----------
    page.goto(BASE + '/#/tool/linkbio'); page.wait_for_selector('#lun')
    check('Link in Bio: no sign-in required', 'Sign in' not in page.inner_text('#app'))
    page.fill('#lun', 'UI Tester!'); check('username sanitised + shows voqcl.com/bio/uitester', page.input_value('#lun') == 'uitester' and 'https://voqcl.com/bio/uitester' in page.inner_text('#lune'))
    page.fill('[data-p=displayName]', 'UI Tester'); page.fill('[data-p=bio]', 'Hello <b>bio</b>')
    page.set_input_files('#lav', {'name': 'a.png', 'mimeType': 'image/png', 'buffer': img_bytes(900, 900, 'PNG', (200, 30, 30))}); page.wait_for_selector('.lb-av img')
    src = page.get_attribute('.lb-av img', 'src'); dims = page.evaluate("() => { const i=document.querySelector('.lb-av img'); return [i.naturalWidth, i.naturalHeight] }")
    check('avatar embedded + resized (no upload server)', src.startswith('data:image/') and max(dims) <= 320, str(dims))
    page.set_input_files('#lbn', {'name': 'b.jpg', 'mimeType': 'image/jpeg', 'buffer': img_bytes(3000, 1000, 'JPEG', (30, 30, 200))}); page.wait_for_selector('.lb-bn')
    page.set_input_files('#lav', {'name': 'x.txt', 'mimeType': 'text/plain', 'buffer': b'hello'}); page.wait_for_function("() => document.getElementById('lae').textContent.length>0"); check('non-image rejected', 'PNG, JPEG' in page.inner_text('#lae'))
    page.click('[data-t=links]'); page.click('#lad'); page.fill('[data-l=title] >> nth=0', 'My Site'); page.fill('[data-l=url] >> nth=0', 'https://example.com')
    page.click('#lad'); page.fill('[data-l=title] >> nth=1', 'Second'); page.fill('[data-l=url] >> nth=1', 'javascript:alert(1)'); check('bad link URL flagged', 'https://' in page.locator('[data-le] >> nth=1').inner_text())
    page.fill('[data-l=url] >> nth=1', 'second.example'); page.click('[data-dn] >> nth=0')
    check('reorder', page.locator('[data-l=title]').evaluate_all('e => e.map(x => x.value)') == ['Second', 'My Site'])
    page.click('#lsa'); page.select_option('[data-s=type]', 'youtube'); page.fill('[data-s=url]', 'https://youtube.com/@voqcl')
    page.click('[data-t=youtube]'); page.fill('#lyq', '@missing'); page.click('#lyl'); page.wait_for_selector('#lbb .err'); check('YouTube lookup: unknown channel error', 'not found' in page.inner_text('#lbb .err').lower())
    page.fill('#lyq', '@mockchannel'); page.click('#lyl'); page.wait_for_selector('#lbb b:has-text("Mock Channel")')
    check('YouTube lookup: name, subs, videos', '5,000 subscribers' in page.inner_text('#lbb') and '42 videos' in page.inner_text('#lbb'))
    page.click('[data-t=design]'); page.click('[data-pr=sunset]'); page.wait_for_function("() => document.getElementById('lbp').srcdoc.includes('Mock video 1')")
    pv = page.evaluate("document.getElementById('lbp').srcdoc")
    check('live preview: name, links, socials, banner, YouTube, theme, escaping', all(x in pv for x in ['UI Tester', 'My Site', 'Second', 'YouTube', 'class="bn"', 'Mock Channel', '#ff7a59']) and '<b>bio</b>' not in pv)
    page.reload(); page.wait_for_selector('#lun'); check('work auto-saves in the browser (survives reload)', page.input_value('#lun') == 'uitester' and page.input_value('[data-p=displayName]') == 'UI Tester')
    page.click('[data-t=publish]'); check('page address https://voqcl.com/bio/uitester', page.inner_text('#lpu') == 'https://voqcl.com/bio/uitester')
    page.click('#lcp'); check('copy link', page.evaluate('navigator.clipboard.readText()') == 'https://voqcl.com/bio/uitester')
    with page.expect_download() as d: page.click('#ldl')
    check('download file named uitester.html', d.value.suggested_filename == 'uitester.html'); d.value.save_as(BIOFILE)
    html = open(BIOFILE, encoding='utf-8').read(); check('page file is self-contained (no backend), size reasonable', 'data:image/' in html and len(html) < 600_000, f'{len(html)} bytes')

    # ---------- the published page (file in bio/) ----------
    pub = wire(ctx.new_page()); resp = pub.goto(BASE + '/bio/uitester'); pub.wait_for_selector('.links a')
    check('/bio/uitester served as a real page (HTTP 200)', resp.status == 200 and pub.title().startswith('UI Tester'))
    check('page: links in order, social, avatar, banner', pub.locator('.links a span').all_inner_texts() == ['Second', 'My Site'] and pub.locator('.soc a').count() == 1 and pub.locator('img.av').count() == 1 and pub.locator('.bn').count() == 1)
    check('page: link previews tags (og:title, canonical)', pub.locator('meta[property="og:title"]').get_attribute('content') == 'UI Tester' and pub.locator('link[rel=canonical]').get_attribute('href') == 'https://voqcl.com/bio/uitester')
    pub.wait_for_selector('.yt-v a'); check('page: YouTube channel + videos (live refresh)', 'Mock Channel' in pub.inner_text('#yt') and pub.locator('.yt-v a').count() == 3 and '5K subscribers' in pub.inner_text('#yt'))
    pub.click('#ytr'); pub.wait_for_selector('.yt-v a'); check('page: YouTube refresh button', pub.locator('.yt-v a').count() == 3)
    pub.set_viewport_size({'width': 375, 'height': 740}); check('page: mobile, no horizontal scroll', pub.evaluate("document.documentElement.scrollWidth <= innerWidth"))
    resp = pub.goto(BASE + '/bio/uitester.html'); check('.html address also works', resp.status == 200)
    pub.goto(BASE + '/bio/UITester'); pub.wait_for_selector('.links a'); check('capital letters redirect to the page', pub.url.endswith('/bio/uitester'))
    pub.goto(BASE + '/bio/nobody_here'); pub.wait_for_selector('h1'); check('missing page -> friendly not found', 'no page for @nobody_here' in pub.inner_text('body'))
    pub.goto(BASE + '/bio/x!'); pub.wait_for_selector('h1'); check('invalid name -> not found', 'not a valid username' in pub.inner_text('body'))
    nojs = b.new_context(java_script_enabled=False); pj = nojs.new_page(); pj.goto(BASE + '/bio/uitester')
    check('page works even with JavaScript off (links + YouTube snapshot)', pj.locator('.links a').count() == 2 and 'Mock Channel' in pj.inner_text('#yt')); nojs.close()

    # ---------- editing later / on another device ----------
    c2 = b.new_context(); p2 = wire(c2.new_page()); p2.goto(BASE + '/#/tool/linkbio'); p2.wait_for_selector('#lun')
    check('fresh browser starts blank', p2.input_value('#lun') == '')
    p2.fill('#lun', 'uitester'); p2.click('[data-t=publish]'); p2.click('#lld'); p2.wait_for_function("() => document.getElementById('lpm')?.textContent.includes('Loaded')")
    p2.click('[data-t=profile]'); check('"Load my live page" restores the page for editing', p2.input_value('[data-p=displayName]') == 'UI Tester')
    p2.click('[data-t=links]'); check('... including links in order', p2.locator('[data-l=title]').evaluate_all('e => e.map(x => x.value)') == ['Second', 'My Site'])
    p2.click('[data-t=publish]'); p2.once('dialog', lambda dg: dg.accept()); p2.click('#lnew'); p2.wait_for_selector('#lun'); check('"Start a new page" clears everything', p2.input_value('#lun') == '' and p2.input_value('[data-p=displayName]') == '')
    p2.click('[data-t=publish]'); p2.set_input_files('#lim', BIOFILE); p2.wait_for_function("() => document.getElementById('lpm')?.textContent.includes('Loaded')")
    p2.click('[data-t=profile]'); check('"Open a page file" imports a downloaded page', p2.input_value('#lun') == 'uitester' and p2.input_value('[data-p=displayName]') == 'UI Tester')
    p2.click('[data-t=publish]'); p2.set_input_files('#lim', {'name': 'evil.html', 'mimeType': 'text/html', 'buffer': b'<html><script>alert(1)</script></html>'}); p2.wait_for_function("() => document.getElementById('lpe').textContent.length>0")
    check('non-VOQCL files rejected on import', 'not a VOQCL' in p2.inner_text('#lpe')); c2.close()

    # ---------- no YouTube key configured ----------
    c4 = b.new_context(); p4 = wire(c4.new_page()); p4.route('**/config.js', lambda r: r.fulfill(status=200, content_type='text/javascript', body="window.VOQCL_CONFIG={siteOrigin:'https://voqcl.com'};"))
    p4.goto(BASE + '/#/live/voqcl/overlay/chat?user=voqcl'); p4.wait_for_selector('.msg'); check('no key: Twitch chat still works', True)
    p4.goto(BASE + '/#/live/voqcl/overlay/chat?user=@x&platform=youtube'); p4.reload(); p4.wait_for_function("() => document.querySelector('.ovst')?.textContent.length > 0"); check('no key: YouTube overlay explains what to add', 'config.js' in p4.inner_text('.ovst'))
    c4.close()

    check('no JavaScript errors during the whole run', not errors, '\n'.join(errors[:6]))
    b.close()
if os.path.exists(BIOFILE): os.remove(BIOFILE)
print(f'\n{sum(results)}/{len(results)} UI checks passed')
if fails: print('FAILED:\n' + '\n'.join(fails)); sys.exit(1)
