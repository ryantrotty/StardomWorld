# Era page link checks (for the daily job)

The Eras page (Years > Era Test) links tiles to searches on the site. Some searches have no videos (the site has no Year-End Climax 2016, for example). The daily job can check them once a day so the app never links an empty search.

## What the job does

Each key is checked once, ever. Once a key has a number in `eras.counts` it is never fetched again.

1. Run `python3 scripts/era_link_keys.py`. It prints every search as `{key, url, kind}`; wider searches also carry `parent` (the tile search they widen). 90 keys: 60 tile searches plus 30 wider ones.
2. Drop every key that already has a count in `daily.json` under `eras.counts`. Also drop every key that has a `parent` unless the parent's count is 0 (a wider search is only needed when the tile search found nothing). Take the first 15 of what is left, in the order printed (tile searches come first).
3. For each of the 15, open the `url` and count the video cards on page 1 (0 when the page says "No search results found."). One request per key, 8 to 15 seconds apart. If a request is blocked, slow or errors, stop for the night: write the counts already gathered and leave the rest for tomorrow.
3b. While the page is open, also note for each checked key whether page 1 is full (there is a next page) and the newest and oldest upload dates shown on its cards (leave the dates out if the cards show none). No extra requests.
4. Merge the new counts into the existing `eras.counts` (never rewrite or remove old ones), set `eras.checked` to today and `eras.pending` to the number of keys still needed (tile searches without a count, plus wider searches whose parent is 0 and that have no count):

```json
"eras": { "checked": "2026-11-03", "pending": 75, "counts": { "Io Shirai Mayu Iwatani": 12, "Climax 2016/": 0, "Kairi": 40 }, "info": { "Io Shirai Mayu Iwatani": { "full": false, "newest": "2018-05-20", "oldest": "2016-12-18" } } }
```

`key` must be copied exactly as printed (the words, plus a space and the year with a trailing slash for show searches). When `pending` reaches 0 the job has nothing more to do on Eras.

## What the app does with it

A count of 0 never removes a tile. The tile stays and its search is widened:

- Wrestler: searches the first word of the name only ("Kairi Hojo" becomes "Kairi").
- Rivalry: searches the first wrestler alone.
- Show: searches the same words without the year (the tile says "all years"); if that is empty too, it opens that year's page and says "year page".
- Rivalry tiles add "12 videos · 2016–2018" (a + after the number when page 1 is full) under the search words, from `counts` and `info`.
- A key with no count (not checked yet, or the check failed): the tile links as normal.
- Nothing is requested by the app for any of this; the numbers come with the daily file.

`"dead": true` on an entry in eras.json does the same thing by hand, for searches known to be empty before the job has run.
