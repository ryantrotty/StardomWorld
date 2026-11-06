# Team match lists (private builds)

Private builds that have the video index log set up (docs/VIDEO_INDEX_LOG.md) keep each tag team's 2-on-2 matches in the same Google Sheet, in a `teammatches` tab. The aim is fewer searches on Stardom World: a team's page reads its saved list instead of searching the site again, on any of your TVs. The public build doesn't use it and searches as described in docs/DESIGN.md (one page at a time).

## How a team page uses it

1. When the Tag Matches section comes on screen, the page asks the sheet for that team's saved list.
2. **Saved list found:** it is shown straight away and the site is not searched. "More tag matches" carries on from where the last search stopped (the sheet remembers which search and page).
3. **No saved list yet:** the page searches the site's first results page as usual, and what it keeps is saved to the sheet.
4. **Every search page** (first view or More) adds its 2-on-2 matches to the team's row. Nothing already there is removed.
5. **A list older than 14 days** gets its newest results page searched once more when the page opens; new matches go to the front.
6. Searches use the filter bar's words ("A Tag Team B"). When a row was saved with other search words, its matches stay and the new words are searched from page 1 once.
7. Saved matches go through the same rules as fresh ones: the 2-on-2 title rule, and the video index side check (where they were opponents, the match is left out).
8. The lines under the grid say where each match came from ("saved list from your sheet", "saved to your sheet: 7 new").

If the sheet can't be reached, the page searches as the public build does. Reading never waits for the sheet's lock. If a save finds the sheet busy (another write held its lock for 25 s), the matches are kept on that TV (`tvTeamPendV1`), shown on the next visit and sent with the next read.

## The sheet

One row per team: `team` (the team page's id), `count`, `items` (the matches, newest first, at most 150: video id, title, thumbnail), `next` (which search and page to continue from, and whether all pages have been searched), `searched` (when the deeper search last moved on), `refreshed` (when the row last changed), `device` and `queries` (the search words used).

## Setting it up

Paste the updated `scripts/video_index_log.gs` into Apps Script and publish it with **Deploy > Manage deployments > Edit > Version: New version > Deploy**. The address and key stay the same. An out-of-date script answers "bad action", and the page then searches the site as before.

## Reading it (for analysis)

`python3 scripts/video_index_pull.py --teams` downloads every team's row to `branding-private/team_matches_export.json` and lists how many matches each team has and where its search got to.
