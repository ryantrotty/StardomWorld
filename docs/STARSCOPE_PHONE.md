# StarScope on the phone (private builds, 2.68.0)

Log the match the TV is playing from an iPhone, while you watch on the TV. The page is served by the sheet's own Apps Script, so there is nothing to host or install.

## Setup (once)

1. In the sheet's Apps Script, paste the whole of `scripts/video_index_log.gs` over `Code.gs` as usual.
2. **+ > HTML**, name it `phone` (Apps Script adds `.html`), and paste the whole of `scripts/starscope_phone.html` into it.
3. **Deploy > Manage deployments > Edit > Version: New version.** The address stays the same. The deployment must stay "Execute as: Me" and "Who has access: Anyone" (as it already is for the TV).
4. On the iPhone, open in Safari: the web app address (the `url` in `branding-private/video_index.properties`, ending `/exec`) followed by `?p=phone&k=` and the key from the same file. Then **Share > Add to Home Screen**.

The link carries the key, so keep it to yourself. Without the right key the address answers "POST only", as before.

## Home screen icon (2.68.2)

Apps Script pages can't set the iPhone's home screen icon, so a launcher page carries it: `starscope/index.html` on the `gh-pages` branch, served by GitHub Pages.

1. Once: GitHub > the repo > **Settings > Pages > Build and deployment**: Source "Deploy from a branch", branch `gh-pages`, folder `/ (root)`, Save.
2. On the iPhone in Safari: `https://ryantrotty.github.io/StardomWorld/starscope/`. Paste the phone link, Save and open.
3. Go back to the launcher page (Back), then **Share > Add to Home Screen**. The telescope is the icon.

The launcher keeps the link in the phone's own storage (it is never in the page or the repo) and opens it straight away from then on. Add `?reset` to the launcher address to paste a new link. The page asks search engines not to list it.

## How Bell and Finish work

- The TV (private build, `assets/scopelink.js`) sends `pb_put` notes to the `playback` tab whenever playback changes: `open` (the page has read its video), `play`, `pause`, `seek` (seeks and skips), `buffer` / `resume`, `rate`, `end`, `stop` (leaving the page), and `sync` when the player is more than 2 s from where the notes say it should be (at most every 10 s). Notes within 1.5 s go as one send. Nothing is sent while the video just plays on.
- Each note has the TV's clock time (`ts`, ms), the position (`pos`, s), whether it was playing and the speed.
- A tap on the phone keeps the phone's clock time. About 3.5 s later the page reads the notes again and takes the last note before the tap: `pos + (time since) × speed` if it was playing, `pos` if not. Both clocks are set from the internet, so the answer is within about a second; −1 s / +1 s nudge it.
- A tap during another video, or before the TV has sent anything, is refused with a message.
- The tab keeps only the current video and the one before it (at most 400 notes), so a late Finish on the last match still works.

## The page

- Polls `phoneNow` every 6 s while it is on screen (not when the phone is locked or the page is in the background).
- Opens the TV's video by itself, unless you have unsaved changes; then a banner offers **Load it**. After a save it follows the TV.
- Edits competitors, match number, title, competition, round, block, stipulation, result (hidden until Show result) and the star rating. Finish, moments, the fall, teams, factions, entry and elimination order saved on the TV are sent back unchanged.
- Saves with `viSave`, the same as the TV's logger. Proposals (names, list options) are the owner's, so they go straight into the library.
- The rating is saved under the TV's device name (from the notes), so the phone and that TV share one rating.

## Calls

All need the key the page was opened with: `phoneNow`, `phoneLib`, `phoneGet(video, show)`, `phoneSave(body)`, `phonePropose(body)`. The TV's `pb_put` goes through the app (`AndroidHost.scopeLink`), which adds the key, like the other sheet calls.
