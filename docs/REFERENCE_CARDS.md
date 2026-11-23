# Reference cards (Muse, 2021 and earlier)

Muse researches each older year's STARDOM shows from outside sources and publishes one file per year on the **`cards-data`** branch. iPhone card check reads it to pre-fill shows, and you confirm everything as usual. The full workflow (sources, no-guess rules, checks, sign-off) is in the Project doc "Muse reference cards workflow (2021 and earlier)".

## Files (cards-data branch)

- `cards/<year>.json`: the year's shows.
- `cards/<year>.status.json`: counts, gaps, and any sites that blocked requests.
- `cards/index.json`: `{ "2021": { "generated": "…", "signed_off": false } }`. Only Ryan sets `signed_off`, and Muse never overwrites a signed-off year.

## `cards/<year>.json`

```json
{ "year": 2021, "generated": "2026-11-23", "shows": [ {
  "date": "2021-03-03", "name_ja": "…", "name_en": "…",
  "venue": { "en": "", "ja": "", "country": "JP", "prefecture": "", "prefecture_ja": "", "city": "", "city_ja": "" },
  "sources": ["https://…"],
  "matches": [ { "no": 1, "kind": "match", "type": "Singles Match", "stipulation": null, "titles": [], "tournament": null,
                 "round": null, "block": null, "sides": [[{ "en": "", "ja": "" }], [{ "en": "", "ja": "" }]], "source": null } ],
  "gaps": [] } ] }
```

- Anything a source doesn't state is `null`. An unknown wrestler is `null` in their slot, never `""`.
- `kind` is `match` or `segment`. Card check uses only matches for line-ups.
- `no` is the running order, 1 to N. Muse works from the official results, not the site's videos, so its segments (when it lists any) won't always match the videos: a greeting may have no video, and a video may cover something the results don't list. Card check doesn't rely on them. It uses only the matches, sorted by `no`, and sets segment videos aside on its own side (see below).

## What card check does with it (2.117.0)

1. Reads the year's file once while it's open.
2. Finds the show by date. When two shows share the date, it goes by the venue, then the name, then wrestlers in common.
3. The **Reference card** button opens it as an AI answer, already read. That covers order, missing line-ups, new names and the venue.
4. One more tick passes each paired match's type, title, tournament, round and block to the logger's suggestions.

## Segments and the running order (2.119.0)

Before 2.119.0 a match the site gave no line-up for took the reference match with the same number. Muse's 2019–2021 files list no segments, so a speech or greeting video ahead of the matches shifted every match after it by one (2020-09-28 Korakuen: Itsuki Hoshino's speech at 2 put Bea Priestley vs Saya Kamitani on the speech video, and so on down the card).

- Card check now lines the reference card's matches up with the show's **match videos** only. A video counts as a segment when it is marked or saved as one, or when its title says so (挨拶, スピーチ, セレモニー, Speech, Greeting, Ceremony, Comment and similar) and the site gives no line-up of two sides.
- When the reference card's match count still differs from the site's match videos, **nothing is filled by place**. The Reference card button shows "⚠ 6 v 7", and the sheet says so. Only matches whose wrestlers the site names are paired. Mark the segment (Segment…) and open the reference card again, or fill the rest by hand.
- **Check logged shows against the reference cards** (year list, under "Reference cards: N shows") compares what's saved with the card, from the StarScope list already on the phone (no site calls). It lists matches whose saved wrestlers belong to another place on the card, matches with no one from the card, and shows whose match counts differ. Tap a show to open it.
- To fix a shifted match: open the show, tap **Edit line-up** on the match (Show all cards if it's hidden), remove the wrong wrestlers and add the right ones, then **Confirm**. A match logged from a thumbnail is saved again over the old line-up. Matches logged while watching can't be changed from card check. On a match not saved yet, **Clear line-up** empties it, so the reference card can fill it again.
