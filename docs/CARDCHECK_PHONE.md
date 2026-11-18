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

`CARDCHECK_KEY` in the script properties. It allows only `vi_lib`, `vi_get`, `vi_save`, `vi_propose`, `vi_cards`, `vi_suggest`, `vi_thumbs`, `vi_translate` and `vi_show_venue`: no exports, favorites, watch history, playback notes or debug. The phone keeps it in Safari's storage for stardom-world.com (entered once: the web app address, where the phone logger's link works as it is, and the key; ⚙ changes them); change it in the script properties at any time.

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
