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
- `no` is the running order, 1 to N.

## What card check does with it (2.117.0)

1. Reads the year's file once while it's open.
2. Finds the show by date. When two shows share the date, it goes by the venue, then the name, then wrestlers in common.
3. The **Reference card** button opens it as an AI answer, already read. That covers order, missing line-ups, new names and the venue.
4. One more tick passes each paired match's type, title, tournament, round and block to the logger's suggestions.
