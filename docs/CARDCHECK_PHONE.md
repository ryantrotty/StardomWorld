# Card check on the iPhone (2.91.0, private)

StarScope card check in Safari on the iPhone: log shows from their thumbnails and line-ups with your thumb, without the TV. A bookmark on any stardom-world.com page loads `cardcheck/cc.js` from GitHub Pages; it opens over the page as its own full-screen app and moves between shows by itself. The site's show and match pages are read from the phone (the site blocks Google's servers), one at a time, at least 2 s apart, and only for the cards you scroll to.

Setup steps for the phone are on the page itself: `https://ryantrotty.github.io/StardomWorld/cardcheck/`.

## What runs where

| Part | Where |
| --- | --- |
| `cc.js` | `web/cardcheck/cc.js`: the phone screens (Started, years, a show's card, Venue line, fix a name, Confirm all, Next) and a stand-in for the TV app's bridge (`AndroidHost`) |
| Match page reader, library, name and venue matching, faction pre-fill, the save | The TV's own scripts, copied beside it: `videoindex.js`, `indexpanel.js` (its quick save, without its screen), `shownames.js`, `setorder.js` |
| Factions, match types (years), show names | `factions.json` and `match_types.json` beside it, with the roster file (`roster-data/roster.json`) merged on top, as the TV app does |
| Sheet | Straight to the web app with `CARDCHECK_KEY` |

## The card check key

`CARDCHECK_KEY` in the script properties. It allows only `vi_lib`, `vi_get`, `vi_save`, `vi_propose`, `vi_cards`, `vi_suggest`, `vi_thumbs`, `vi_translate`, `vi_show_venue` and `cc_later` (Watch Later only, 2.114.0): no exports, favorites, watch history, playback notes or debug. The phone keeps it in Safari's storage for stardom-world.com (entered once: the web app address, where the phone logger's link works as it is, and the key; ⚙ changes them); change it in the script properties at any time.

## Publishing

`scripts/publish_cardcheck.sh <gh-pages checkout>` copies `web/cardcheck` and the TV scripts into `cardcheck/`, then commit and push `gh-pages`. Publish again whenever any of the copied TV scripts changes. The bookmark adds `?v=<time>` so a new copy is picked up at once.

## On the phone

- **Log a show:** Started (shows with some matches logged, newest first, not finished) or a year (the site's list, a page at a time; **Load more shows** reads the next page, never by itself).
- **A show:** the Venue line (Translate & add, Pick from list, Change; saved once for the whole show), then each match: thumbnail, title, people with ✓ or ?, match type, suggested titles and tournaments, Confirm, Watch.
- **Fix a name (?):** search the library and pick the wrestler (the site's spelling becomes her alias, so it's known from then on), or add her as a new wrestler.
- **End of the card:** each match's state and **Confirm all (N)**, then **Next:** the next show in the list you came from.
- Not on the phone (yet): titles, rounds, stipulations, results and ratings; use the TV or the phone logger for those.
- Watch opens the site's own page. Tapping the bookmark again brings card check back where you were.

## Help from an AI (2.92.0)

At the top of a show: its name (English and as the site writes it), date, and three buttons.

- **Copy AI prompt:** the show's name, date, venue and card in order, with every name the library doesn't know marked `?`, asking for the card from reliable sources as one JSON block (match place, type, title / tournament / round, every wrestler's English and Japanese name, the venue in both languages; `null` when unsure). Paste it into Gemini, Google's AI mode or any chatbot.
- **Paste AI answer:** paste the reply; card check reads the JSON block out of it.
- **Ask Gemini:** the same prompt, sent by the sheet script to the Gemini API with Google Search grounding (`vi_ai`); the answer and its sources come back to the same screen. Needs `GEMINI_API_KEY` (from Google AI Studio) in the script properties; `GEMINI_MODEL` optionally picks the model (default `gemini-3.5-flash`, falling back to `gemini-2.5-flash`). The key never reaches the phone.

Either way, the answer only makes suggestions, each with a box to untick:
- an unknown name paired with a wrestler in the library: the site's spelling becomes her alias (both languages);
- an unknown name the library doesn't have: a new wrestler under the answer's English name, with the site's spellings and the Japanese name as aliases;
- the venue, when the show has none: the library's venue, or a new one (English name, Japanese kept), set once for the whole show.

People are paired by match (the most wrestlers in common, else the same place on the card) and by side (the same), then by spelling, else in order. Nothing is saved until **Apply**; a date that differs from the site's is pointed out.

## Saving and the card at the top (2.94.0)

- **One request per card.** Confirm and Confirm all build each match's save on the phone, with the TV's logger in its collect mode (no read of the sheet first; the show's venue comes from the Venue line), and send the card as one `vi_save_many`. The phone shows "Saving to the sheet…" and you can move on at once, to the next show too. A match the sheet turns down shows why; a name or side problem marks it to look at, anything else can be confirmed again. A busy sheet is tried again up to three times.
- **Already logged:** a collected save carries `keep`: when the video turns out to be another version of a match already logged, the sheet only links it (match_videos, its show page) and leaves the match's people, results and tags as they are. A logged match whose number changed (card order) is still re-saved the old way, reading it first.
- **The sheet reads each tab once per request** (and keeps the copy in step with what it writes), so single saves are quicker too, on the TV as well.
- **The card at the top:** the venue (with its editing when it isn't set), then each match with its state, Confirm all and Next. Cards show only for matches that need a look; tap a row to open its card, or Show all cards. When everything is ready no card, and no picture, is shown.

## Gaps (2.125.0)

The **Gaps** tab (after Started) checks the site's whole list of shows against StarScope. It finds shows that have nothing logged, including ones no year tab offered because the site left them out of its year categories.

- **Source:** `/user_api/contents?size=20&search[type]=set&sort=di_s&order=d&page=N`. This is the year tabs' list with no category, read one page at a time and at least 2 s apart. **Read the whole list** runs to the end, or until **Stop**. The total comes from the site's `x-total-count`.
- **Kept on the phone:** the list (`ccPhoneGaps1`) for a week, and what you've hidden (`ccPhoneGapHide`). Nothing is written to the sheet.
- **What counts as in StarScope:** any video of the set in the StarScope list (`vi_cards`), or a saved blank segment from it.
- **Order:** grouped by year, by the show's date read from its name, else the upload date the site gives. Each row says whether the show was in a year list read on this phone, and gives its set number.
- **Next show** from a show opened here goes to the next one on the Gaps list that isn't hidden.
- **Copy list for Claude** (2.126.0) copies the list as tab-separated text: set, date, date_from, year_list, hidden, name.
- **Same date as a logged show** (2.127.0): sets whose date has a logged show, usually English or older uploads whose videos are linked to that show. Kept apart from Not in StarScope, with the logged show's name beside each.
- **Updates** (2.127.1): tapping the bookmark loads the newest `cc.js` and replaces an older copy already open on the page (`CODE` in cc.js, compared on each tap).
