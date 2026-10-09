# VOQCL TOOLS

Free stream overlays and creator tools at **voqcl.com**. It's plain files on **GitHub Pages**, with no server, database or accounts.

## Put it online
1. Upload **everything inside this ZIP** to the top level of your GitHub repo. `index.html`, `404.html`, `CNAME`, `config.js` and the `js/`, `css/`, `assets/` and `bio/` folders should sit at the top, not inside another folder.
2. In the repo, go to **Settings → Pages**. Pick **Deploy from a branch**, then **main** and **/ (root)**, and save.
3. Set the custom domain to `voqcl.com` (the `CNAME` file already says this). At your domain registrar, add:
   - `A` records for `@` pointing to `185.199.108.153`, `185.199.109.153`, `185.199.110.153` and `185.199.111.153`;
   - a `CNAME` record for `www` pointing to `<your-github-username>.github.io`.

   Then tick **Enforce HTTPS**.
4. Replace `assets/logo.png` and `assets/favicon.png` with your logo. **The included ones are placeholders.**

That's it. Every tool works immediately.

## Tools (16)
**Overlays:** Chat (Twitch + YouTube), Emote, Follower tracker, Countdown, Goal bar, Text ticker, Scene screen.
**Utilities:** Multiview, Mask generator, Background remover, QR code generator, Link in Bio, Discord timestamps, Image converter, Palette extractor, Title & limit checker.

## Bio pages: voqcl.com/bio/username
There are no accounts. A bio page is just a file in the repo's `bio/` folder, so **only people who can upload to your GitHub repo can publish or change pages.** That is what keeps your page safe.

**Make or update your page:**
1. On the site, open **Link in Bio**. Set your username, picture, banner, bio, links, socials, YouTube channel and design. Your work saves automatically in your browser.
2. In the **Publish** tab, click **Download page file**. You'll get `yourname.html`.
3. On GitHub, open the repo, then the **bio** folder → **Add file → Upload files**. Drop the file in (it replaces the old one if you're updating) and click **Commit changes**.
4. About a minute later it's live at `https://voqcl.com/bio/yourname`.

**Edit later or on another computer:** open Link in Bio, type your username, then go to Publish → **Load my live page**. Or use **Open a page file** with a file you downloaded earlier.

**Pages for other creators:** they can build their page on voqcl.com and send you the downloaded file, and you upload it into `bio/`. They can't publish by themselves, because static hosting can't accept uploads.

**What's in a page file:**
- Images are built into the file, so there's nothing else to upload.
- Pages load fast, work with JavaScript off, and show proper link previews on Discord and X.
- If you added a YouTube channel, the page refreshes it live using the key in `config.js`.

## YouTube API key
It's set in `config.js` (`youtubeApiKey`) and used for YouTube chat, subscriber counts and YouTube on bio pages. Since this file is public, lock the key down in Google Cloud → Credentials → your key:
- **API restrictions:** YouTube Data API v3.
- **Website restrictions:** `https://voqcl.com/*` and `https://www.voqcl.com/*`.

If YouTube features ever say the key was rejected, create a new key and paste it into `config.js`.

**Quota:** the default is 10,000 units per day.
- **Bio page visit:** about 3 units, cached for 10 minutes per visitor.
- **YouTube chat overlay:** about 5 units every few seconds while it's open, so roughly 40,000–85,000 units per day if streaming nonstop. For long YouTube streams, request a quota increase (Google Cloud → Quotas → YouTube Data API v3).

Twitch chat needs no key.

## Overlay URLs
Format: `https://voqcl.com/#/live/voqcl/overlay/<type>?user=<username>&<settings>`

| Overlay | Example |
|---|---|
| Follower tracker (default) | `https://voqcl.com/#/live/voqcl/overlay` |
| Chat | `https://voqcl.com/#/live/voqcl/overlay/chat?user=USERNAME` (add `&platform=youtube` for YouTube) |
| Follower tracker | `https://voqcl.com/#/live/voqcl/overlay/followtracker?user=USERNAME` |
| Emote | `…/overlay/emote?user=USERNAME&e=%F0%9F%94%A5&n=6&every=8` |
| Countdown | `…/overlay/countdown?user=USERNAME&minutes=10&label=Soon` |
| Goal bar | `…/overlay/goal?user=USERNAME&source=twitch&goal=500` |
| Ticker | `…/overlay/ticker?user=USERNAME&text=Hi%7CFollow%20me` |
| Scene | `…/overlay/scene?user=USERNAME&title=BRB&minutes=5` |

Each overlay tool builds the URL for you, with Copy and Open buttons and a live preview. In OBS, add a **Browser** source, paste the URL and set the suggested size.

## Preview locally and run tests
```bash
node tests/dev-server.mjs        # http://127.0.0.1:8124, behaves like GitHub Pages (uses a mock YouTube; REAL_CONFIG=1 uses your config.js)
npm test                         # QR (decoded with OpenCV), overlay URLs, chat parser, bio pages, YouTube client
python3 tests/ui_test.py         # 96 browser checks (pip install playwright opencv-python-headless pillow; playwright install chromium)
```

Twitch chat, 7TV/BTTV emotes, follower counts (DecAPI) and the YouTube API were tested against stand-ins, because the build machine has no internet. After going live, check once by hand: a Twitch chat overlay in OBS, a YouTube overlay while live, and your published bio page.
