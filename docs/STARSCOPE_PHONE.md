# StarScope on the phone (private builds, 2.68.0)

Log the match the TV is playing from an iPhone, while you watch on the TV. The page is served by the sheet's own Apps Script, so there is nothing to host or install.

## Setup (once)

1. In the sheet's Apps Script, paste the whole of `scripts/video_index_log.gs` over `Code.gs` as usual.
2. **+ > HTML**, name it `phone` (Apps Script adds `.html`), and paste the whole of `scripts/starscope_phone.html` into it.
3. **Deploy > Manage deployments > Edit > Version: New version.** The address stays the same. The deployment must stay "Execute as: Me" and "Who has access: Anyone" (as it already is for the TV).
4. On the iPhone, open in Safari: the web app address (the `url` in `branding-private/video_index.properties`, ending `/exec`) followed by `?p=phone&k=` and the key from the same file. Then **Share > Add to Home Screen**.

The link carries the key, so keep it to yourself. Without the right key the address answers "POST only", as before.

## On the home screen (2.68.4)

The logger also lives on GitHub Pages: `starscope/index.html` on the `gh-pages` branch is a copy of `scripts/starscope_phone.html`, with `icon-180.png` (home screen) and `icon-32.png` (tab) beside it. Copy the file over when it changes. On Pages it calls the script with POSTs (`pb_now`, `vi_lib`, `vi_get`, `vi_save`, `vi_propose`), like the TV, with no cookies, so Google's "Sorry, unable to open the file at this time" page (a sign-in cookie problem with Apps Script pages on iPhones) never comes up. Opened from the home screen it runs full screen.

1. Pages: Settings > Pages, "Deploy from a branch", `gh-pages`, `/ (root)`.
2. On the iPhone in Safari: `https://ryantrotty.github.io/StardomWorld/starscope/`, then **Share > Add to Home Screen**.
3. Open the icon and paste the phone link once. It is kept in the phone's own storage for that icon (never in the page or the repo). Add `?reset` to the address to paste a new link.

## How Bell and Finish work

- The TV (private build, `assets/scopelink.js`) sends `pb_put` notes to the `playback` tab whenever playback changes: `open` (the page has read its video), `play`, `pause`, `seek` (seeks and skips), `buffer` / `resume`, `rate`, `end`, `stop` (leaving the page), and `sync` when the player is more than 2 s from where the notes say it should be (at most every 10 s). Notes within 1.5 s go as one send. Nothing is sent while the video just plays on.
- Each note has the TV's clock time (`ts`, ms), the position (`pos`, s), whether it was playing and the speed.
- A tap on the phone keeps the phone's clock time. About 3.5 s later the page reads the notes again and takes the last note before the tap: `pos + (time since) × speed` if it was playing, `pos` if not. Both clocks are set from the internet, so the answer is within about a second; −1 s / +1 s nudge it.
- A tap during another video, or before the TV has sent anything, is refused with a message.
- The tab keeps only the current video and the one before it (at most 400 notes), so a late Finish on the last match still works.

## The page

- Polls `phoneNow` every 6 s while it is on screen (not when the phone is locked or the page is in the background).
- Opens the TV's video by itself, unless you have unsaved changes; then a banner offers **Load it**. After a save it follows the TV.
- Edits everything the TV's logger does (2.68.6): competitors (pick, propose, move between sides, remove), each side's team and faction, entry and elimination order, venue, date, match number, title, competition, round, block, stipulation, the result by name, how it ended, who got the fall, moments and the star rating. Not on the phone: Preview, Confirm and Save and next match.
- Saves with `viSave`, the same as the TV's logger. Proposals (names, list options) are the owner's, so they go straight into the library.
- The rating is saved under the TV's device name (from the notes), so the phone and that TV share one rating.

## Calls

All need the key the page was opened with: `phoneNow`, `phoneLib`, `phoneGet(video, show)`, `phoneSave(body)`, `phonePropose(body)`. The TV's `pb_put` goes through the app (`AndroidHost.scopeLink`), which adds the key, like the other sheet calls.
