# Era page link checks (for the daily job)

The Eras page (Years > Era Test) links tiles to searches on the site. Some searches have no videos (the site has no Year-End Climax 2016, for example). The daily job can check them once a day so the app never links an empty search.

## What the job does

1. Run `python3 scripts/era_link_keys.py` (or read `app/src/main/assets/eras.json` and build the same list). It prints every search as `{key, url, kind}`.
2. For each `url`, open the search page and count the video cards on page 1 (0 when the page says "No search results found."). One request per key, with the usual pause between requests.
3. Write the counts into `daily.json`, next to `schedule` and `lineage`:

```json
"eras": { "checked": "2026-11-03", "counts": { "Io Shirai Mayu Iwatani": 12, "Climax 2016/": 0, "Kairi": 40 } }
```

`key` must be copied exactly as printed (it is the words, plus a space and the year with a trailing slash for show searches).

## What the app does with it

- A count of 0 for a rivalry: the tile opens the first wrestler's own search instead.
- A count of 0 for a show: the tile opens that year's page (always has videos) and says "year page".
- A count of 0 for a wrestler tile: the tile is greyed out and not selectable.
- A key with no count (job not run yet, or the check failed): the tile links as normal.
- Nothing is requested by the app for any of this; the numbers come with the daily file.

`"dead": true` on an entry in eras.json does the same thing by hand, for searches known to be empty before the job has run.
