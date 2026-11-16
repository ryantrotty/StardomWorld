# League points (for the daily job)

The Tag League page shows each team's total points, highest first in each block, with "Points as of <date>" under the list. The numbers come with the daily file, the same way as the schedule, so the app asks no site for them.

## What the job does

Only while a Tag League is running (the newest year in the roster file's `tagLeague`, from its first show to the final), once a day after that day's show has finished in Japan. Outside those dates, leave `league` as it is.

1. Read the results of every Tag League match so far. Use the official STARDOM results pages on wwr-stardom.com (Japanese pages, as for the schedule) first. If the newest show's results are not up yet, use SoloWrestling's results article for that night (it lists the standings under the results).
2. Work out each team's **total points** only (no wins, losses or draws): a win is 2, a loss 0, a time-limit draw or a double count-out 1 to each team, a forfeit 2 to the team that did not forfeit. If a page shows official standings, use those numbers.
3. Name each team by its two wrestlers **copied exactly** from the roster file's `tagLeague.<year>.blocks[].teams` (for 2026: `"Sakura Aya"`, `"Fuwa Chan"`, `"Hanako"`). Match by the wrestlers, never by team name.
4. Check before writing: all 18 teams (every pair in the blocks) are there, each block's total is even, and no team has fewer points than it had in the existing file. If a check fails, or there are no new results, leave `league` as it is and say why in `status.league`.
5. Write `league.tag.<year>` whole, and a line in the status report:

```json
"league": { "tag": { "2026": { "updated": "2026-11-15", "source": "official", "points": [
  { "team": ["Suzu Suzuki", "Rina Yamashita"], "pts": 5 },
  { "team": ["Hazuki", "Koguma"], "pts": 7 }
] } } }
```

```json
"status": { "league": { "ok": true, "updated": "2026-11-15", "source": "official", "note": "" } }
```

`updated` is the date (Japan time) of the last show counted. `source` is `official` or `solowrestling`. The order of `points` doesn't matter; the app sorts.

## What the app does with it

- The app has the same block built in (`assets/tag_teams.json`, `leaguePoints`). The daily file's year replaces it when its `updated` date is the same or newer, so an app update never goes back to older numbers.
- A team missing from the list shows "–" and goes to the bottom of its block. A year with no points shows the page as before, with no numbers.

## 5★STAR Grand Prix (later)

Same shape under `league.gp.<year>`, with `"wrestler": "Name"` in place of `team`, once the app's Grand Prix page exists.
