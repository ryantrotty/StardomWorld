# New Japan title checks (for the daily job)

The app has two New Japan titles with lineage pages: IWGP Women's (`iwgp`) and STRONG Women's (`strong`). Their history is built into the app (`app/src/main/assets/lineage/iwgp.json` and `strong.json`). The daily job keeps them current the same way it keeps the Stardom titles: it writes the whole title to `daily.json` under `lineage.titles.<id>`, and the app uses that copy when it is complete and has at least as many reigns as the built-in one.

## Sources

| Title | Reign list (main source) | Cross-check |
| --- | --- | --- |
| IWGP Women's (`iwgp`) | https://en.wikipedia.org/w/index.php?title=IWGP_Women%27s_Championship&action=raw | https://www.cagematch.net/?id=5&nr=5691&page=4&year=YYYY (title matches for that year) |
| STRONG Women's (`strong`) | https://en.wikipedia.org/w/index.php?title=Strong_Women%27s_Championship&action=raw | https://www.cagematch.net/?id=5&nr=6019&page=4&year=YYYY |

The Wikipedia address returns the page source. Each reign is a `{{PWtitlereign ...}}` block with `number`, `champion`, `date`, `location`, `event` and `defenses` (a count). Cagematch lists each title match with its date, the result ("X (c) defeats Y"; "TITLE CHANGE" when the title changed hands), the event and the venue. Cagematch often answers automated requests with HTTP 307 and an empty page. When that happens, use Wikipedia alone and say so in the status note. One request per page, 8 to 15 seconds apart, as for the other titles.

## What the job does, for each of the two titles

1. Start from yesterday's copy in `daily.json` (`lineage.titles.<id>`), or the built-in file on `main` when there is none.
2. Read the Wikipedia reign list. Compare it with the baseline:
   - **New reign** (a higher `number`): close the previous reign (`end` = the new reign's date, `endType` "lost", or "vacated" when the page says so) and add the new reign with `n`, `champ`, `won`, `vs` (who she beat, from the notes, the event or Cagematch), `venue`, `end: null`, `endType: ""` and `defences: []`.
   - **More defences** for the current reign (the `defenses` count went up): add each new defence to `defences` as `{"d", "opp", "venue", "note"}` (date, opponent, venue, event name), taken from the current year's Cagematch title matches. If a defence's details can't be found, set `defCount` on the reign to Wikipedia's number and keep the defences already listed. The app shows `defCount` when it is set.
3. Never remove or rewrite a reign or a defence that is already there. Keep every other field of the file (`title`, `ja`, `promo`, `search`, `titlePatterns`, `alias`) as it is in the baseline.
4. Write the whole title object to `daily.json` under `lineage.titles.iwgp` and `lineage.titles.strong`, the same way as the Stardom titles. In `status.lineage.titles.<id>` record `read`, `changed` and a short note (for example "Reign 6 (Syuri) and all 5 defences confirmed against Wikipedia; Cagematch 307, not used").

Names: write wrestlers as they appear in the baseline (for example "Mercedes Moné", "Kairi", "Syuri"). A new name with other spellings can go in `alias`.
