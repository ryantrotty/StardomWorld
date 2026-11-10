# Match index (private builds)

The curated index behind the Index panel. It lives in the same Google Sheet as the video log (`docs/VIDEO_INDEX_LOG.md`).

## After updating the script

Paste the whole of `scripts/video_index_log.gs` into the sheet's Apps Script, then **Deploy > Manage deployments > Edit > Version: New version**. The address stays the same. Until then the panel shows "bad action".

## Tabs

- `videos`: raw page captures. Written by the app only.
- `matches`, `match_videos`, `participants`, `match_tags`: reviewed data. One match can have many videos.
- `talent`, `teams`, `factions`, `shows`, `venues`, `aliases`, `lists`: the approved library.
- `proposals`: suggested additions. `changes`: edit history.

## Rules

- Everyone on the same `side_no` is a partner; a different `side_no` is an opponent. Any number of sides.
- Match type is worked out from the sides, never typed.
- Ids are permanent. To retire a duplicate set `merged_into` to the id it became, or `active` to FALSE. Never delete a row.
- `level`: 1 people and sides, 2 titles and competition, 3 finish, moments and timestamps.
- `match_tags.source`: `auto` was pre-picked from the title and not looked at, `panel` was confirmed. `lists.match_keywords` holds the patterns used to pre-pick.

## Adding names

On the panel, OK on a red name offers **Pick the right name** or **Propose new**. Picking saves that spelling as an alias straight away. A proposal waits in `proposals`: set its status to `approved`, and it joins the library the next time a TV loads the library (at most an hour's cache).

From the private build (2.57.0) there is no approval step: the app marks its requests as the owner's, the script applies the addition at once, and the panel fills it in where it was asked for. The row still appears in `proposals` as applied, note "owner build". Anything else sent to the script without that mark, as the public build will be, waits for approval as before.

On the Match, Finish and Moments tabs and in the pickers, **+ Propose new** opens a text box. The proposal's `entity_id` names the list it belongs to.

## Keys and calls

The panel only runs when opened and only talks to the sheet, never to the video site. The key stays in the app. `vi_export` returns the compiled index: ids and tags, with results in a separate block so nothing spoils by accident, ready for public builds later.
