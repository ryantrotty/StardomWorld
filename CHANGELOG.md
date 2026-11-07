# Changelog

All notable changes to this project. Versions match `versionName` in `app/build.gradle.kts`.

## 2.40.3

- Team pages: a second search for Tag League matches. The first search ("A Tag Team B") never returns Tag League official matches, because their videos don't say "Tag Team" (Trouble Friends: 6 videos, all 6- and 8-person tags, while the filter bar's Starlight Kid with Maki Itoh shows the 11/03 Red Goddess Official Match). After the first search's pages run out, the page searches "A Goddess B" and keeps its 2-on-2 matches the same way. It runs straight away when nothing was kept yet, otherwise More carries on into it. One page at a time, 3 seconds apart, only while the team page is open. The debug panel shows "next: Tag League search …".
- Match rule version raised to 3, so saved team lists are searched again from page 1 once per team on each TV and pick up the Tag League search.

## 2.40.2

- Team pages: a match list saved to your sheet under the old 2-on-2 rule is searched again from page 1, once per team on each TV. Before, a team whose Tag League matches had been thrown away (Trouble Friends: "saved list from your sheet: 0 matches") kept showing that saved list and was not searched again for 14 days. Saved matches stay; new ones are added without repeats, and More carries on page by page as usual. One search per team, only when its page is opened.
- The rule has a version number (`TM_RULE` in `teams.js`, now 2) to raise whenever the tag team title rule starts keeping more titles; each TV remembers per team which version it last searched with (`tvTeamRuleV1`).

## 2.40.1

- Tag League matches count as tag team matches. Goddesses of Stardom Tag League official matches are titled "Red Goddess Official Match" / "Blue Goddess Official Match" (レッド/ブルーゴッデス公式戦) with no "tag" in the title, so the 2-on-2 title rule left them out: team pages showed 0 tag matches (Trouble Friends: 6 found, 0 kept) and the filter bar's Match type: Tag team hid them. The tag team rule in `match_types.json` (and the built-in copy in `teams.js`) now also accepts "Goddess Official" / ゴッデス公式. No extra searches: the same results are kept instead of thrown away.

## 2.40.0

- Roster file now covers factions, faction members and past wrestlers as well as tag teams, so all of them can change without a new APK (same download, same `roster-data` branch). See `docs/ROSTER.md`.
  - `factions.remove` (faction ids), `factions.set` (whole faction entries: replaces one with the same id in place; a new current faction goes before the former ones) and `factions.members` (per faction id: `add` and `remove` members).
  - Current Wrestlers is still everyone in the current factions, Unaffiliated included, so a member change shows up in the menu, the filter bar's wrestler lists and the wrestler pages. Moving someone is a remove in one faction and an add in another.
  - `past.add` and `past.remove` change the past wrestlers list (menu PAST tab and the filter bar).
- The menu's PAST tab now reads `past_wrestlers.json` (with the roster changes) instead of its own copy in the code; the copy stays as a fallback. A member's `ja` name in either file is used for the Japanese menu.
- The roster line on All Tag Teams now also counts faction, member and past wrestler changes.

## 2.39.0

- Roster file: tag teams can now be added or hidden without a new APK. The app downloads `roster.json` from the new `roster-data` branch at its schedule check (at most every six hours, one small GitHub request with an ETag; never the Stardom sites) and merges it with `assets/tag_teams.json`: `add` (new teams, the roster's entry wins for a pair already listed), `remove` (pairs to hide, either order), `spell` and `factionNames`. The last good copy stays if a download fails. See `docs/ROSTER.md`.
- All Tag Teams: a grey line under the team count says which roster file the TV is using (date, how many added and removed), or that it is still on the built-in list. The page note now says the list includes other current teams.
- Build workflow: the `roster-data` branch is skipped like `schedule-data`, so editing the roster never starts an APK build.
- First roster file: the 2026 Goddesses of Stardom Tag League teams not already in the app (15 teams; FWC, BMI2000 and Sakurara were already there from the title histories).

## 2.38.0

- Usage stats and error reports in every build: the PostHog key is now in `gradle.properties`, so the GitHub test builds and community builds report too (before, only builds with `branding-private/posthog.properties`).
- Account menu: new entry **Anonymous usage stats: On / Off** (OK switches it in place; remembered on that TV). Off stops page views and error reports and drops anything still waiting to be sent. Only shown in builds with a PostHog key.
- README: new Privacy section saying what is sent (pages and time on them, app version, TV model, language, crashes and app script errors), what isn't (account, email, sign-in, payment), and how to switch it off.
- docs/USAGE_METRICS.md: switching it off, and leaving your own builds out of the numbers.

## 2.37.0

- Error tracking with PostHog (free tier): app crashes are saved the moment they happen and sent the next time the app opens, and errors in the app's own page scripts (menus, factions, eras, player controls and the rest) are sent as they happen. Each comes with its stack trace, the page it happened on, build type, TV model and app version, and shows up in PostHog's Error tracking. The site's own script errors are left out. Each distinct error is sent once per run, at most 20 a run. Only when a PostHog key is set; see `docs/USAGE_METRICS.md`.
- New past wrestler: Takumi Iroha (彩羽匠), in the menu's past wrestlers and the filter bar's wrestler lists.
- New tag team: Spark Rush (Takumi Iroha & Sareee), in the New Horizons era. Its matches are searched by the two names ("Takumi Iroha Tag Team Sareee"), not the team name.

## 2.36.0

- Usage metrics with PostHog (free tier): unique visitors, every page viewed, time on each page, entry and exit pages and session length, shown in PostHog's Web analytics dashboard. Off until a PostHog project key is set in `branding-private/posthog.properties` (your builds only) or `tvhub.posthogKey` in `gradle.properties` (every build); see `docs/USAGE_METRICS.md`.
- Anonymous: a random id per install, no account or sign-in data, no person profiles. Talks only to PostHog, never to stardom-world.com or Stagecrowd. Events are sent together (every 30 seconds, at 20 events, and when the app goes to the background).
- The app's own pages get readable names (`/app/faction/<name>`, `/app/era/<era>`, `/app/my-favorites`, …); query strings are dropped, and Stagecrowd pages keep only their path.
- New file `Metrics.kt` (no extra library); MainActivity reports each address change, key presses (to keep a session alive), and the app going to the background and coming back.

## 2.35.2

Private builds only.

- Wrestler photos no longer have a white backdrop: every copy shows the wrestler on a dark fade, #2A323C at the top to #0F151C at the bottom, everywhere a photo appears (wrestler pages, tag teams, My Favorites, the menu spotlight). The white was too bright on a TV next to the dark app.
- `scripts/make_wrestler_spots.py` cuts the wrestler out with the macOS subject cut-out (new `scripts/wrestler_cutout.js`, the same one Photos uses to lift a subject; macOS 14 or later), lays her over the fade and saves the 480 × 720 JPEG. It keeps sheer and white parts of outfits that a simple remove-the-white approach cut away. A photo where it finds no subject keeps its original backdrop and the script names it. It remembers the fade it last used and remakes the copies when it changes; `--all` remakes every copy. All 47 took 12 seconds; the copies are 4.2 MB.

## 2.35.1

Private builds only.

- Every wrestler photo in the app (wrestler pages, tag team pages and cards, My Favorites, the menu spotlight) now comes from the small copies (`wspot_<name>.jpg`), falling back to an original `wrestler_<name>` file only when there is no copy. The originals no longer need to be in the app.
- The copies are 480 × 720 (were 360 × 540), so the 300 × 450 spotlight stays sharp on a 1080p TV; all 47 are 3.4 MB.
- `scripts/make_wrestler_spots.py` reads originals from `branding-private/wrestler-photos/` (outside `res/`, not packed into the app) as well as `res/drawable-nodpi/`, accepts names with or without `wrestler_`, remakes a copy when its original is newer or it is the wrong size, and `--move-originals` moves the old files out of `res/` (nothing is deleted).

## 2.35.0

Private builds only (public builds keep the four text columns).

- Menu Wrestlers shelf: the names sit in three columns and a spotlight on the right follows focus: the wrestler's photo (300 × 450), name (★ when in My Favorites), current faction, and in gold the title they hold now and their reigns and defences across every title history. Past wrestlers (no photos) show initials and "Past wrestler". The shelf is 1000 wide and about 650 tall, so all 47 current names fit without scrolling.
- The spotlight uses small copies of the photos (360 × 540, 2 MB for all 47 instead of 26 MB), made by the new `scripts/make_wrestler_spots.py` into the private folder (`wspot_<name>.jpg`); without a copy it falls back to the full photo. New bridge call `AndroidHost.wrestlerSpot(name)`, new asset `wrspot.js`.
- The picture waits 120 ms after focus lands, so holding an arrow down doesn't load every photo on the way.

## 2.34.0

- Set order for everyone: the whole-list order rule, the set order card (FIRST / LAST, Reverse Order, 12 s countdown) and the Reverse Order tile in a set's video row, private-only since 2.32.0, are now in public builds too. The old first-and-last-title rule from 2.8.5 is gone.

## 2.33.0

Private builds only, as 2.32.0.

- Set order card keeps focus: the player bar's Play/Pause button took focus when the bar was built and again after the autoplay retry, so the card's button could not be reached. Until you press a key, focus stays on Reverse Order. Autoplay itself is unchanged; only the focus move waits.
- From the card, Down goes to the player bar, and Up from the player bar goes back to the card while it is on screen.
- Reverse Order tile: on a set's video pages, the set's video row starts with a Reverse Order tile (⇅, "Starts with: <match>"), so the order can be turned around after the card has gone. It restarts the set from the other end and is remembered for that set, like the card's button.
- The card's progress track uses the 4 px corner from the design scale (it was 2 px).

## 2.32.1

Private builds only, as 2.32.0.

- Set order card: one button, **Reverse Order** (it was Play other way and Stay here). The top match is tagged FIRST and the second LAST (it was NOW 1/N). The countdown to full screen is 12 seconds while the card shows (it was 8).

## 2.32.0

Private builds only for now (builds with the `branding-private` folder); public builds keep the 2.8.5 rule and have no card.

- Sets start at the opening match more reliably. Before, the app judged a set's order from its first and last titles only, so a set like 3・15 CINDERELLA TOURNAMENT (a tag match at the top, a semifinal at the bottom) started with the main event. Now every match counts: title matches, tournament finals, semifinals and earlier rounds weigh toward the main event, 【ダイゼロタイム】 / 第0試合 toward the opener, and the half of the list with the bigger matches is the end of the show. When nothing tells them apart (house shows, league nights), the lowest video number is taken as the opener. Checked against 35 sets on the site.
- Set order card: after a set page opens its first match, a card at the bottom left of the player shows the match now playing (1 of N), the one the set ends on, and how the order was decided (match titles, video numbers as a guess, or your choice). It stays up during the countdown to full screen, which is 8 seconds instead of 5 while the card shows.
  - **Play other way** (focused) starts the set from the other end. The choice is kept for that set on this TV.
  - **Stay here** cancels full screen and keeps the player inline.
  - Up goes to the player, Down to the video row; the card goes away when full screen starts.
- New file assets/setcard.js; assets/setorder.js gains the new rule.

## 2.31.2

- Wrestler pages: Left at the left edge of the header opens the menu, as it does from the video grid.
- Wrestler pages: the page title is the wrestler's name on every wrestler page, as on tag team pages. Before, it read "Search: …" unless the address exactly matched a menu link (for example, after choosing filters or arriving from a faction page).

## 2.31.1

- Wrestler pages: the gold focus border now shows and stays on the header's buttons and belt cards. The site puts the header inside its article, where the app's card style removed the border from anything focused, so focus flashed grey and vanished.
- Wrestler pages: the page translator no longer works on the header (it writes its own English or Japanese), so its grey highlight no longer covers TITLES HELD on load.

## 2.31.0

- Wrestler pages get a header like the tag team pages, above the filter bar (new assets/wrestler.js):
  - **Picture:** a photo in private builds, initials in public ones.
  - **Facts:** current faction, first title year, and total reigns and defences across every title history (Stardom titles plus IWGP Women's and STRONG).
  - **Buttons:** Add to My Favorites / In My Favorites, then their current faction and any past factions, each opening that faction's page.
  - **TITLES HELD:** two per row, newest first, with partners for tag and trios reigns; each opens that reign on its title page.
  - **MATCHES:** the filter bar and the search results, as before.
  - Shown for any wrestler on the roster or the past wrestlers list, including when filters are applied. The Menu button on the header adds or removes the favorite.
- Menu: the last three entries are now Community, My Favorites, then your account name, with the divider above Community.

## 2.30.3

- Tag Teams menu: Down from All Tag Teams now goes to My Tag Teams (it skipped to New Horizons), and Up from the era headers comes back through My Tag Teams. Menu shelves now treat a wide bar above or below as straight up or down when it spans the item you're on; other shelves move as before.
- Tag Teams menu: a 10 px gap between the All Tag Teams and My Tag Teams bars, so their outlines no longer touch.

## 2.30.2

- Menu: spare height is now spread evenly between all the entries (and above the logo and below Community), instead of collecting around the logo. If the entries don't fit, the menu still scrolls from the top.

## 2.30.1

- My Favorites: the Goddess / NEW BLOOD tag is removed from the tag team cards.
- Menu: every entry, down to Community and the language toggle, now fits on screen without scrolling (checked at 1280 x 720 when signed in). Items are 44 high (were 54) with less space between them; the text size is unchanged. The logo is 18% smaller (36 high, was 44), the language toggle is 17% shorter (40 high, was 48) with 17px labels (were 20px), and the divider and panel padding are trimmed.

## 2.30.0

- Tag teams can be added to My Favorites, the same way as wrestlers.
  - The Menu button adds or removes a team on its Tag Teams menu row, its All Tag Teams tile, or the top of its team page. Team pages also have an "Add to My Favorites" button, which reads "In My Favorites" once the team is added.
  - Favorite teams get a gold ★ in the Tag Teams menu and on All Tag Teams. The Tag Teams menu has a new "My Tag Teams" bar.
  - My Favorites has a new FAVORITE TAG TEAMS row under Favorite Wrestlers, with pair cards: both members' photos (initials in public builds), the team name and members. Past 8 teams a View All tile opens the full list (`/mypage?tvfav=teams`). Menu on a card removes it.
  - The My Favorites menu has a Tag Teams row under Wrestlers.
- Favorites sync (private builds) carries tag teams too. Paste scripts/video_index_log.gs into Apps Script and deploy a new version; until then, the sheet skips team favorites and everything else syncs as before.

## 2.29.6

- Filter bar, Match type: cards that slipped past the match-type filter are now filtered too. On "Momo Watanabe, Tag team, With Utami Hayashishita" this left 6-person tag matches and whole shows on screen.
  - A card whose title hadn't been filled in yet was kept and never checked again. It is now checked once its title is there.
  - Cards that progressive loading adds as bare `<article>` cards (as the team pages already read them) are checked as well. Their empty column is removed too.

## 2.29.5

- Sheet script: reads (tm_get, tm_export, fav_since) no longer wait for the sheet's lock, so a team page can read its list while something else is writing. Writes wait up to 25 s and then answer "busy", instead of failing with Apps Script's "Lock timeout" error. Paste scripts/video_index_log.gs into Apps Script and deploy a new version.
- Team pages: matches the sheet couldn't take are kept on the TV for that team, shown on the next visit, and sent with the next sheet read. The lines under the grid say "sheet busy, kept on this TV" and later "sent N matches kept on this TV".

## 2.29.4

- Team pages: a member whose title history name isn't on the roster now uses the roster name of one of the history's other spellings ("alias" in the lineage files). Rice or Bread now searches "Hanako Tag Team Waka Tsukiyama" (it searched "Wakana Tsukiyama" and found no videos). Its member button opens the Waka Tsukiyama search too.
- The video index side check also accepts those other spellings.

## 2.29.3

- Team pages search the same words as the filter bar's "Wrestler: A, Match type: Tag team, Competitors: B" (for example "Natsuko Tora Tag Team Ruaka"), using the Wrestler filter's names from factions.json. Before, BMI2000 searched "Natsuko Toura Ruaka Tag Team", a spelling the site's search doesn't match well, so most of its tag matches were missed. The "Natsuko Toura" spelling is removed from tag_teams.json; other spellings there are tried second.
- The member buttons on a team page open the same search as the Wrestler filter.
- Team match lists: the sheet now returns each row's search words (tm_get). A team saved with other words keeps its saved matches and searches page 1 of the new words once. Paste scripts/video_index_log.gs into Apps Script and deploy a new version; with the old script, saved places are used as before.

## 2.29.2

- Team pages: with no tag matches to show yet, the Tag Matches section works like a championship reign. A plain grey line says what to do ("Press OK on More tag matches to search the next page"), "Looking for tag matches..." while the first search runs, or "No 2-on-2 tag matches were found" once every page is searched. The dashed box is gone. The header reads "looking for videos" or "none found yet" in place of "0 tag matches".

## 2.29.1

- Team pages: member initials are no longer translated by the page translator ("NT" became "Windows NT" on the BMI2000 page). The circles also clip any text that is too long.
- Team pages: when a search page keeps no 2-on-2 matches, the More tag matches tile now shows, instead of a "Searching…" box that never finished. The tile stays in place, and keeps focus, while the next page loads.
- Team match lists: a saved row with no matches yet, whose search has moved past page 1, is read from the sheet instead of searching page 1 again.

## 2.29.0

- Team match lists (private builds with the log set up): each tag team's 2-on-2 matches are saved to a new `teammatches` tab in the private Google Sheet (docs/TEAM_MATCH_LISTS.md).
  - A team page reads its saved list first and shows it straight away, so a team already searched on any of your TVs needs no site search. "More tag matches" carries on from where the last search stopped.
  - Every searched page adds its matches to the team's row. A list older than 14 days gets its newest page searched once more, with new matches going first.
  - Saved matches go through the same 2-on-2 rule and video index side check as fresh ones.
  - Public builds search as in 2.28.4.
- The sheet's script has three new actions (tm_get, tm_put, tm_export): paste scripts/video_index_log.gs into Apps Script and deploy a new version.
- `python3 scripts/video_index_pull.py --teams` downloads every team's list for analysis.
- Favorites sync and team lists now share one request helper in the app (no change in behaviour).

## 2.28.4

- Team pages make far fewer site searches. The first search runs only when the Tag Matches section is on screen, and fetches one page; each press of "More tag matches" fetches one more. The other spelling and the team name are searched only when a search finds no videos at all. Searches are at least 3 seconds apart, and results are kept for 7 days. Opening a team page now makes 1 search, where BMI2000 made 8 before.
- Tag match rule: a title must also say tag ("Tag Team", "タッグ"), so videos such as "English" or a show's anniversary set no longer get through. Full-width letters and digits are read as plain ones, so "４ＷＡＹタッグ" counts as a 4-Way and is left out. The same applies to the filter bar's "Tag team" match type.

## 2.28.3

- Team pages: the header facts (MEMBERS, FACTION, FIRST TITLE, REIGNS, DEFENCES) have their sizes and spacing back; 2.28.2 dropped their styles by mistake when removing Title Matches.

## 2.28.2

- All Tag Teams page: the Goddess and NEW BLOOD filter chips have a small belt icon and a little more space before them, so they read as championship filters rather than eras.
- Team pages: the Title Matches section is removed; Titles Held is followed by the tag matches.

## 2.28.1

- Tag Teams fix: the section couldn't read the eras, factions, match types or its own settings on the TV (it called those app functions with an extra argument, which Android refuses). So the menu shelf had no era columns, the All Tag Teams page had no era chips, and team pages didn't narrow their matches to 2-on-2. All three work now. As a safeguard, team pages also carry their own copy of the 2-on-2 rule.
- All Tag Teams page matches the concept: one row of square-cornered chips (All with its count, the eras by short name, Goddess, NEW BLOOD), borderless team rows, and a team count under the list.

## 2.28.0

- Tag Teams: a new menu group after Factions.
  - Its shelf has "All Tag Teams" on top, then one column per era, newest on the left, each with its newest champion teams and "+N more".
  - The teams are the 39 pairs that have held the Goddess of Stardom or NEW BLOOD Tag Team belts, built from the title histories, so a new champion team appears by itself.
  - A pair known only by its faction shows the two names with the faction underneath.
- All Tag Teams page: every team A to Z in three columns, with filter chips (All, each era, Goddess, NEW BLOOD) and CHAMPIONS / GODDESS ×n / NEW BLOOD tags.
- Team page:
  - The members, their faction, first title, reigns and defences, and member and faction buttons.
  - Titles held: each belt, with dates, days held and defences, opening that reign's lineage page.
  - Title matches: every title win, defence and loss.
  - Tag matches: found by searching both members' names with "Tag Team" (the site's spelling first, then the title-history spelling and the team name if needed). Only 2-on-2 matches are kept (the 2.27.2 title rule). Where the video index has the match, only those with the two on the same side are kept, marked TEAMMATES. The searches and counts stay on screen below the grid.
- assets/tag_teams.json holds the era dates, faction-only pair names, the site's spellings (for example "Natsuko Toura") and any extra teams.

## 2.27.2

- Match type "Tag team" now means 2-on-2 only. The site's search for "Tag Team" also returns 6-, 8-, 10-, 12- and 14-person tag matches, 3-Way tag battles and trios, because their titles contain the same words; those are now taken out of the results by their titles (English and Japanese), including pages loaded later by scrolling. Plain "Tag Team Match" titles and tag title matches (for example NEW BLOOD Tag Team Championship Match) stay. The bigger matches are still under their own match types (6-person, 8-person and so on).

## 2.27.1

- Favorites sync: PPVs the app has seen play (its own "owned" setting) are now shared too, alongside the ones marked bought by hand. Each PPV counts only until its replay window ends, as on My Favorites: an expired PPV isn't sent, and once one expires it's marked removed in the sheet and cleared from every TV.
- The sheet's script accepts the new item kind: paste scripts/video_index_log.gs into Apps Script and deploy a new version.

## 2.27.0

- Favorites sync (private builds with the log set up): favorites, show reminders and owned PPVs are shared between TVs through a new `favorites` tab in the same Google Sheet (docs/FAVORITES_SYNC.md). The main TV sends its set once from the Account menu ("Send this TV's favorites to sync", OK twice); other TVs take that copy on their first start, then every change is sent within a few seconds and picked up by the others when the app starts and every minute. One row per item, the newest change wins, removals are kept so they don't come back, and offline changes wait until the TV is back online.
- My Favorites page: a small status line next to the title ("Synced 2 min ago", "Sync waiting: …", or "Not synced: …" in red).
- The sheet's script (scripts/video_index_log.gs) has three new actions; paste it into Apps Script and deploy a new version.

## 2.26.1

- Video index: the on-screen panel on video pages is removed. The app still reads each video page, keeps a copy on the TV and sends it to the private log in the background; the last send result is kept on the TV (localStorage tvVideoIndexLast).
- Video index: when the log answers with a web page instead of its usual reply, the result keeps only the page's text (for example "Script function not found: doPost").

## 2.26.0

- Video index, step 2 (private builds only): with a log address in branding-private/video_index.properties, the app sends each video page's record to a private Google Sheet (scripts/video_index_log.gs, set up as in docs/VIDEO_INDEX_LOG.md). The app sends it, not the page, so the address and key never appear in the page or the public repo. A video is sent again only when what was read has changed (or after 30 days), at most 300 a day, and only public page facts are sent.
- The panel heading reads VIDEO INDEX · LOG with the result ("sent: added to the log", "sent: row updated", "already in the log", or "not sent: …" in red). Without a log address it stays a dry run and nothing leaves the TV.
- The sheet keeps one row per video (newest copy, first and last seen, times seen) and checks the key and the record's shape before writing. scripts/video_index_pull.py downloads every row for analysis.

## 2.25.1

- Video index dry run (private builds): the reader now follows the page's own layout (a Japanese block, then an English block, each a title line and its line-up) instead of guessing by language, so these formats read correctly:
  - line-ups split over two lines ("Momo Watanabe & Saya Kamitani" / "vs Rina Yamashita & Akira Kurogane");
  - dates at the start of titles (2026/10/04 and 6.14.2015) and on their own line (2026年10月4日);
  - a mark before the title (◆);
  - Japanese titles written only in Latin letters ("3、COSMIC ANGELS vs DDM");
  - brackets: one after a side is its team ("[COSMIC ANGELS]"), one after a wrestler is a note ("Tam Nakano: free agent");
  - full-width digits and letters.
- Show names like "10・4『STARDOM in SHIZUOKA 2026 Oct.』静岡・ツインメッセ静岡" give the date (year from the name or the title), the show and the venue.
- The panel shows a single Date row (from the title, a date line or the show) and a Notes row; title-only pages show their panel after about 3 seconds.

## 2.25.0

- Video index, step 1 (private builds only, nothing is sent): on every video page the app reads the page's own facts (no extra request) and shows them in a debug panel under the match description: video and set number, match number or the date in older titles, English and Japanese titles, both line-ups split into sides, the show and its date (from the set the video belongs to), tags, access and the thumbnail address. Missing values show in red. The latest copy per video is kept on the TV (up to 3,000 videos) for a later step; no account, cookie or viewer details are read.

## 2.24.1

- Championships menu: the IWGP Women's and STRONG Women's cards are now the same width as the Stardom cards (the row under the Stardom grid uses the same two columns), and the text-only Other Promotions list sits under the right column.
- Daily job: docs/NJPW_LINEAGE_CHECKS.md says how to keep the two New Japan lineages current from Wikipedia, with Cagematch for defence details, written to daily.json like the Stardom titles.

## 2.24.0

- Championships: IWGP Women's and STRONG Women's now get the full Stardom treatment. Each has its own lineage page (reign strip newest on the left, current champion, every reign's title win and defences with date, opponent, venue and event, and the reign's videos), and the menu's New Japan block shows them as lineage cards with the belt, the champion, the reign number, days held and defences.
- Lineage data: IWGP Women's (6 reigns, 20 defences, since 20 Nov 2022) and STRONG Women's (8 reigns, 22 defences, since 21 May 2023), from Wikipedia's reign lists with every defence from Cagematch; the counts agree.
- Lineage page: the line under the strip names the promotion ("New Japan" for these two; "Stardom" for the rest).
- Private builds: belt pictures for both titles (the STRONG picture's white background was made transparent).

## 2.23.7

- Schedule refresh: the first time a new version of the app runs, it fetches the schedule straight away instead of waiting up to six hours, so a new build shows the latest schedule on its first start.
- Schedule refresh: the check also runs when you come back to the app (it used to run only on a full start, which Google TV rarely does). It still downloads at most once every six hours.
- Schedule refresh: both the daily file (Muse) and the schedule file (GitHub schedule job) are read each time, and the one updated most recently is used. Before, the GitHub schedule was only read when the daily file failed, so a fix made by the GitHub job did not reach the app until Muse had run too. PPV shows from the app's own list are still added to whichever schedule is used.

## 2.23.6

- Schedule: only Stardom's own shows are listed. The daily schedule update now reads each show's colour box on the official calendar (purple "game", blue "other teams join", green "event") and marks only "game" shows as Stardom's; the app already hides the rest. Before, it only looked for the words "other organization" on the show's page, so shows like GXW DOJO and the Maid Cafe event got through.
- Schedule: match cards are read again. The official card pages changed layout around 3 November (each wrestler's name became its own heading), so no card was found for any show after that. The update reads the new layout (the old one still works) and skips placeholder matches where every name is "X". Names from the fighter list no longer pick up the "VIEW DETAIL" hover text.
- Schedule: a Stardom show within three weeks that has no card yet is checked every day until its card appears (it was only checked in the last 7 days). Other promotions' shows are not checked for a card. The log warns when a card page is read but no matches are found.
## 2.23.5

- Eras page, Dominant title reigns: the space is now inside the black box, so the belt and text no longer touch its edge; the black box is wider (less grey around it) and has rounded corners. The site's own row style was pulling the text out to the edge; the card no longer uses it.
- Eras page, Dominant title reigns: a focused card shows only the gold border (the extra outline, glow and lift from the app-wide card style are off here).

## 2.23.4

- Matches: Multi-person now also lists 10-person, 12-person and 14-person, and Special rules lists Handicap, in the menu shelf, the filter bar's Match type drop-down and the Top Rated by match type page. Each has its own dot icon. The 32-person handicap gauntlet in Top Rated is now filed under Handicap.
- Top Rated Matches: rank numbers and scores are kept out of the page translation, so ranks such as 21 to 25 and 123 show as numbers instead of words. The same fix applies to the Eras page's Top rated rows.
- Eras page: more space between sections.
- Eras page, Dominant title reigns: more space inside each card so the text no longer runs to the edge; the belt picture has no box behind it and is 10% larger.

## 2.23.1

- Eras page: the "All N matches in this era" row no longer has an OPEN button (the whole row is the link).

## 2.23.0

- Eras page: new "Top rated matches" section between Dominant title reigns and Defining rivalries. It shows that era's five best-rated matches (same rows as the Top Rated page: WATCH button and whole-row link when a video exists, text only when not) and a final "All N matches in this era" row that opens the Top Rated page for that era. All five eras; local data, no requests.
- toprated.js now loads before the Eras page script and exposes shared row code and styles (`__tvTopRows`, `__tvTopRow`) used by both pages.

## 2.22.6

- Menu: the group title is "Years" (was "Years & Eras"). The shelf heading and the All Years & Eras page keep their names.

## 2.22.5

- Top Rated Matches: a match with a video is a link in full (the whole row is the focus target and OK plays it) and shows an orange WATCH button; no thumbnails. A match without a video has no button and cannot be focused or clicked. Up and Down skip text-only rows and scroll over them.
- The page lists every match (it stopped at 25 before).

## 2.22.4

- Top Rated Matches: 72 of the 128 matches now have a confirmed video address, so those rows are links (thumbnail area with WATCH NOW, OK plays the video). The other 56 stay text only. Thumbnails are still the dark placeholder until picture addresses are added ("th" in assets/top_matches.json).

## 2.22.3

- Top Rated Matches: the fine print under the title reads "Fan voted ratings from Cagematch.net, as of November 2026".

## 2.22.2

- Top Rated Matches: Up and Down move through the match rows one at a time (Left and Right were moving between rows). Left on a row opens the menu; Right on a row does nothing.

## 2.22.1

- Top Rated by era: the era tiles run newest on the left, like the Eras page and the championship strip. DESIGN.md now states the rule for any timeline.

## 2.22.0

- Matches: the menu group is "Matches" (was Match Types). Its shelf shows all match types in three keylined columns (4-Way now sits before 5-Way & 6-Way) with a compact Top Rated block below: Overall, By match type and one card per era.
- Top Rated Matches page (`/mypage?tvtop=overall|era|type`): 128 Stardom matches rated 8.50+ with 25+ Cagematch votes, from assets/top_matches.json. A match with a video address ("u") shows a thumbnail and a WATCH NOW strip and plays on OK; the rest stay text only. Match type icons use only the design colours.

## 2.21.7

- Filter bar: the Location drop-down is full width again (it was squeezed to a narrow strip at the right, breaking venue names mid-word) and scrolls if it is taller than the screen.

## 2.21.6

- Faction home: a watchdog retries a first load that never finished and moves on to the next spelling if the grid is still short (Itoh Respect Gundan sometimes stayed empty on the first visit). It stops after about 20 seconds or when a screen is filled.

## 2.21.5

- My Favorites: the Itoh Respect Gundan logo shows (white artwork sat on a white tile). factions.json has a new optional "plate": "dark" for a faction like this.
- Faction home: when a faction's first search has few or no videos, it now goes on to the next spelling by itself until about a screen is filled. Itoh Respect Gundan runs two names, then the next pair, then the third pair, so FACTION MATCHES is no longer empty.
- Wrestlers menu: Current and Past are a segmented switch (one rounded track, the chosen one filled orange, focus is the gold border).

## 2.21.4

- Years menu: the five era header cards are all the same height (76px). The menu group title reads Years & Eras.

## 2.21.3

- Eras page: rivalry tiles show how many videos the search found and the years they cover, from the daily file (eras.info). Nothing shows until Muse has checked the search.

## 2.21.2

- era_link_keys.py: wider searches carry a `parent`. Muse checks a wider search only when the tile search came back 0 (about 60 checks plus a few, four nights at 15 a night).

## 2.21.1

- Eras link checks: an empty search never removes a tile any more. Wrestler tiles widen to the first name, shows widen to all years (then the year page), rivalries to the first wrestler. Greyed-out tiles are gone.
- era_link_keys.py also lists the wider searches (90 keys). The Muse job checks each key once, 15 a night, never again.

## 2.21.0

- Eras page: the whole timeline is flipped. Newest era is on the left (era chips, timeline bar, year chips), "now" is at the left end and 2011 at the right.
- New All Years & Eras page (page A): five bands, newest era first, each with its years and an Open era page tile.
- Years menu (sub nav B): five era columns, each headed by the era (OK opens its page) and listing its years newest first, with an All Years & Eras bar on top. Replaces the Era Test row.

## 2.20.1

- Eras page: opens on Era 1 (was Era 2). Descriptor text no longer wraps early (the width cap is gone). Eras 1, 3, 4 and 5 have their own emblems. Faction logos sit on the tile with no box and are larger. The High Speed card is titled "High Speed Championship" and is excluded from page translation. Year chips under the timeline run newest first.

## 2.20.0

- Eras 1, 3, 4 and 5 are built (header, title reigns with deep links, rivalries, top wrestlers, rising stars, factions, shows). Reign numbers, days and defences come from the lineage files. Era 1's three factions have no faction page, so their tiles run a plain search.

## 2.19.3

- Eras page: faction logos now show. The site-header logo swap matched any class containing "logo" and replaced the faction images with the STARDOM mark; the tile class is renamed.

## 2.19.2

- Champions (lineage) page: the MATCHING DEBUG block and the SEARCH summary line are hidden (one switch, SHOW_DEBUG in lineage.js, brings them back).
- Eras page: faction logos sit on a dark tile (several are white artwork and were invisible on white).

## 2.19.1

- Eras page: compact layout so Defining rivalries fits on screen (descriptor text 20% smaller, smaller emblem and chips, shorter belt cards and rivalry thumbnails). The year chips moved out of the era box and sit under the timeline, between the era's dates.
- Era chip numerals no longer get translated to "one, two, three" (marked do-not-translate).
- Title reign cards and the other-champion chips now open that reign (the lineage page accepts "tvrn=<reign number>" and loads its videos), not the current champion.
- Rivalry tiles search the two names only (the year made the searches come back empty).
- Arrow keys: Up and Down now go to the nearest tile straight above or below before looking sideways.
- Empty searches can be unlinked: the daily file may carry eras.counts (see docs/ERA_LINK_CHECKS.md); an empty show falls back to its year page, an empty rivalry to the first wrestler's search, an empty wrestler is greyed out. Year-End Climax 2016 is marked as empty by hand.

## 2.19.0

- New Eras page, first cut: Years menu > Era Test (a full-width row above the year list). It shows the five eras as a chip row with a timeline underneath, and Era 2 (Threedom & the Golden Rebuild) is filled in. Left and Right on the chips change era; the other four say "not built yet".
- Era 2 sections, top to bottom: era box (with the year chips for 2015 to 2018 inside it), Dominant title reigns (World and Wonder cards, open the lineage page), Defining rivalries (3 tiles, one search each: two names plus a year), Top wrestlers (4) and Rising stars (4), Impactful factions (open the faction pages, logos in private builds), Must-see shows (4, one search each: show plus year).
- Content is in the new assets/eras.json and is hand-written from the era notes (shows and rivalries for all five eras, rising stars for all five; only Era 2 is drawn so far), not checked against the site. Era 2 has 3 shows and 3 rivalries as listed in the notes. Nothing loads when the page opens.

## 2.18.5

- Wrestler / Competitors tabs: tighter lines (15px text, 6px padding, as the old columns had) so the lists are about 480px tall at 1280x720 and stop short of the bottom of the screen; the flyout is also capped to the space below the filter bar and scrolls if it ever needs more.
- Side-nav Wrestlers menu matches: CURRENT and PAST tabs (47 and 34 names), tighter 15px lines, 4 and 3 columns, shelf 860px wide. Down from a tab enters the list; Up from the top of a list returns to the open tab.

## 2.18.4

- Filter bar Competitors / Wrestler drop-downs: CURRENT and PAST are now two tabs under the All / Any row (CURRENT opens first, or PAST when the chosen wrestler is a past one). Focusing a tab shows its list; Down from the All row lands on the open tab; Up from the top of a list returns to it. The lists run in more columns (5 and 4), so the flyout is about 590px tall instead of 730px and nothing is cut off.

## 2.18.3

- Wrestlers menu: the PAST column now also lists members of former factions who are not current wrestlers (same list as the filter bar), in two columns; the shelf is wider.

## 2.18.2

- Filter bar Competitors / Wrestler drop-downs: back to two alphabetical lists like the Wrestlers menu: CURRENT (members of current factions, 3 columns) and PAST (the past-wrestlers list plus members of former factions who are not current, 2 columns). The faction columns, which made it too wide, are gone.
- Championship pages: when a team's search finds nothing, each member is now searched alone, then their other spellings (NEW BLOOD: "Furusawa Kian" added for Kikyo Furusawa), one search at a time.

## 2.18.1

- Former faction match searches: Oedo Tai "Oedo", Queen's Quest "Quest", Tokyo Cyber Squad "TCS", Donna Del Mondo "DDM" first and then "Donna" once the DDM results run out.

## 2.18.0

- The app now downloads the daily file (daily.json on the daily-data branch, published once a day by the Muse job) at most every six hours and uses its schedule and its championship lineages. The schedule-only download is the fallback if the daily file cannot be read, and the lists built into the app are the last fallback.
- A lineage from the daily file is used only when it is complete and has at least as many reigns as the one built into the app, so a newer app is never set back by an older file. The newest schedule wins as before; PPV shows still come from the built-in list.
- Faction logos (private build) show on the current and former faction menu cards and on the faction pages.

## 2.17.3

- Former faction cards in the Factions menu show the faction logo (private build with the logo file) in the same place as the current ones; without a logo file the card keeps its blank space so the heights match.

## 2.17.2

- Factions use "Captain"/"Captains" everywhere (menu and faction pages); "Past leaders" is gone. Former faction menu cards follow the current ones: name, "Captains: ... · N members", and the years as the last line in the Titles held size. All faction cards are now as tall as the tallest, so the two columns line up.

## 2.17.1

- Former factions: every past leader is now also in the clickable member list (Jungle Kyona was missing from J.A.N., and leaders were missing on six others). Former faction menu cards are the same height as the current ones and show a "Past leaders" line. J.A.N. matches now search "Jungle".

## 2.17.0

- Past factions: Oedo Tai, Queen's Quest, Tokyo Cyber Squad, Donna Del Mondo, Club Venus, Empress Nexus Venus and J.A.N. have pages. The Factions menu shows them in a Former factions list beside the current ones (years, notable members; no logos). Their pages show formed and disbanded years, Past Leaders and notable members; no titles held. Former factions' members are not added to Current Wrestlers.
- Faction match searches for the former factions: "(Oedo Tai)", "(Queen's Quest)", "Donna", "Club", "(E neXus V)"; Tokyo Cyber Squad and J.A.N. return no results on the site and may show an empty list.

## 2.16.6

- NEW BLOOD lineage: new champions Meni☆Mani (Kikyo Furusawa & Rian) won on Oct 20, 2026 at Korakuen Hall, Tokyo, beating Sakurara (Sakura Aya & Sayaka Kurara) in 16:32; Sakurara's reign ended at two defences. Reign 6 starts with no defences listed.

## 2.16.5

- Faction matches search the faction name in brackets, which is how the site's video descriptions list it: (STARS), (Cosmic Angels), (God's Eye), (H.A.T.E.), (NEO GENESIS). This leaves out the 5 Star Grand Prix, so the STARS exclusion list is gone. Mi Vida Loca searches "loca". Itoh Respect Gundan keeps its member searches.

## 2.16.4

- Factions submenu: the logo area on each card is larger (80 x 58, was 64 x 48) so tall logos such as Mi Vida Loca show bigger. It fits inside the height the three text lines already need, so cards without a Titles held line grow only slightly.

## 2.16.3

- Faction matches showed old results (STARS with 5 Star Grand Prix, H.A.T.E. with one video): the TV keeps each faction's first page for 12 hours, and the copy saved by the earlier version had been cut down by the old title rule. The saved copy now has a new name, so the old one is ignored, and the STARS exclusions also apply to any saved copy.

## 2.16.2

- Faction matches now trust the site's own search, which also reads video descriptions (that is why God's Eye matches have generic titles). The title-must-contain-the-name rule is gone.
- STARS: cards whose title has 5★STAR, RED STARS, BLUE STARS, STAR GP or Grand Prix are left out (the 5 Star Grand Prix blocks).
- Itoh Respect Gundan: searches Maki Itoh + Kikyo Furusawa, then Maki Itoh + Rian, then Kikyo Furusawa + Rian, each only when you reach the end of the one before (the site has no OR). Mi Vida Loca adds Suzu Suzuki + Rina Yamashita the same way. The Japanese extra spellings are removed.

## 2.16.1

- Factions submenu: header reads "Current factions"; the private build shows each faction's logo at the left of its card; the line reads "Titles held: ..."; the favourite star now sits on the faction name's line; Unaffiliated is no longer listed (its page still works from My Favorites).
- Faction home video cards follow the thumbnail card rule (15/700, up to 4 lines) so the third and fourth lines are no longer cut off. This also applies to a member's video grid.
- Faction matches: a name counts only as a whole word, with an exclude list, so STARS no longer picks up 5STARS Grand Prix. Other spellings (for example the Japanese name) are searched only when you scroll to the end of the main results; nothing extra loads on page open.
- `factions.json` gains `exclude` and `alts`.

## 2.16.0

- Faction pages have a home screen. A new "Faction home" row tops the member list (also where the page opens). It shows a larger logo, founded year, captain, member count, the titles the faction holds now (belt, holder, reign, day count and defences; each opens that title's lineage page) and a grid of faction matches: videos with the faction name in the title. Choosing a member shows their videos as before; "Faction home" returns.
- The Factions menu entry now opens the faction's own search instead of its first member's, so the home grid uses the page that has just loaded: no extra request. A later page loads only when you scroll down.
- Unaffiliated has no home page, only its member list.
- The Factions submenu shows each faction as a card: name, captain, member count and titles held.
- `factions.json` gains `founded`, `captain`, `search`, `match` and `home` per faction. Titles held come from the lineage files, not the site.

## 2.15.2

- Championships submenu: Down from "All championship matches" goes to the first card (World of Stardom) instead of jumping to AEW; Right does nothing there and Left closes the shelf.
- Submenu items no longer dim when the pointer rests over them. The leading suspect for the long-standing dimmed row is a stale pointer position hovering one item while the site's own hover styling dims it. The menu and shelf now ignore hover dimming and tap highlights.

## 2.15.1

- Championships submenu fits the screen without scrolling. The eight Stardom cards are now two columns of four. Below them, New Japan sits on the left and Other Promotions on the right in two columns.

## 2.15.0

- Championships submenu is now two columns. Column 1 lists the eight Stardom titles with lineage pages (World, Wonder, Goddess, Artist, Future, High Speed, NEW BLOOD, Kawaii) as compact cards: belt, title, current champion or team, reign number, day count and defences. A vacant title shows "Vacant" and the last champion. Column 2 lists New Japan above Other Promotions as plain items (no lineage treatment yet). "All championship matches" stays on top.

## 2.14.5

- NEW BLOOD Tag lineage page: videos were all skipped because the Japanese titles read "NEW BLOODタッグ選手権試合" with no space. The title words now include that spelling.

## 2.14.4

- Kawaii of Kawaii page: Maki Itoh, one defence on record (vs Aya Sakura, Jul 2, 2026). A reign with no known title win shows its first recorded match instead, and the LINEAGE line reads "1 reign" with no years until a full year has passed.

## 2.14.3

- Lineage page searches now use the same words as the filter bar: High Speed searches "High-Speed Championship", and a title with other names in championships.json (alts) searches each of them too.

## 2.14.2

- Lineage pages for the tag and trios titles: Goddess of Stardom (37 reigns), Artist of Stardom (37 reigns) and NEW BLOOD Tag Team (5 reigns, defence counts only). A team shows its team name with its members, the strip is labelled with team names, and the video search tries every member of the team first and then the first member alone.

## 2.14.1

- Lineage pages for Future of Stardom (14 reigns) and High Speed (28 reigns, from the 2009 NEO era), with every title win and defence. The Championships menu opens them.

## 2.14.0

- Wonder of Stardom lineage page: all 26 reigns with every title win and defence, same layout as World of Stardom. Championships menu entries open a lineage page for any title that has a lineage file.

## 2.13.7

- Lineage page: about 20% more space above and below the lineage strip, its year labels and the video row heading.

## 2.13.6

- Lineage page made more compact so the whole video row fits on screen: the line above the champion box and the summary line below it are gone, and that information now sits on the LINEAGE header ("Stardom · Singles · Since Jul 24, 2011 · 22 reigns · 15 years · longest reign 602 days (Nanae Takahashi)"). The REIGN line above the video row is removed. The navigation hint lives in the top right and shows from the moment the page opens (also on the all-matches button). Spacing is tighter and the belt is a little smaller.

## 2.13.5

- Lineage page: the champion box at the top follows the reign chosen on the strip (name, days, defences, win, and how it ended: lost to whom, or vacated).
- The strip now runs newest to oldest, current champion first and focused; Right goes back in time, Left goes forward (Left on the current reign still opens the menu). Year ticks are reversed to match.
- The reign's match facts (win and defences) moved below the video row, under "Matches in this reign".
- The all-videos button reads "All World of Stardom Championship matches" and is as wide as the champion box.
- Fewer site requests: the per-year searches are gone (they found nothing the plain search missed), so a reign costs one search of up to three pages. Videos load by themselves only for the current champion and for reigns already saved on the device; for any other reign press OK to load them. Moving along the strip makes no requests.

## 2.13.4

- Lineage page redesigned around what the site actually has. The win and each defence are now plain fact rows (date, opponent, venue, PPV), not video cards. Below them is one video row, built like the app's other video rows (22/700 heading with gold bar, four cards across, scrolls sideways): every World of Stardom championship match the search finds for that champion.
- Videos dated inside the reign come first and carry a THIS REIGN tag; the rest follow, newest first. Cards show the gold date badge (a "~" before the date means it was estimated from the video number). No more per-match pairing, so nothing depends on opponent names.
- Debug block lists every video in the row with its date and where the date came from, plus what was skipped and why.

## 2.13.3

- Lineage page: each reign is searched once per year it covers, the same way the filter bar does it ("Suzu Suzuki World of Stardom 2026/"), then once with the champion's name alone for anything still missing. Videos appear as each search comes back instead of after all of them.
- Videos whose title has no date (for example "【English Commentary】World of Stardom Championship Match") are placed by their video number, which grows with time, between dated videos. They only appear under "More from this reign", marked "About <date>", and never take a title-win or defence slot.
- Debug block lists every search made and, for cards it cannot place, their video number.

## 2.13.2

- Lineage page video matching rewritten after TV testing: the search results were right but every card was rejected because titles do not contain the champion's name. A video now belongs to a reign when it is for the championship (English or Japanese title) and its date falls inside the reign. The date is read from the title, e.g. "(2026/06/20)" or "2026/06/30 ...", falling back to the upload date.
- A video dated the same day as the title win or a defence fills that card; every other video inside the reign is listed under "More from this reign" with its date.
- Search stops paging once a whole page is older than the reign. The search summary and debug block now say why each card was skipped (wrong championship, outside the reign, no date).

## 2.13.1

- Lineage page: Down now scrolls the page when nothing focusable is below, so the debug block can be reached. A search summary (the search used, cards read, cards with the champion, matches, and the first titles on the page) now sits right under the video cards.
- Video matching is looser: a name matches when all its words appear in any order; a search with no results is retried with the champion's name alone; a video that names the champion and challenger but not the championship counts if it was uploaded within 90 days after the match.

## 2.13.0

- New World of Stardom lineage page (Championships menu, World of Stardom card). Shows the current champion, a strip of all 22 reigns (width = days held) and, for the reign you pick, the title win and each defence as video cards. Left and Right move between reigns; Down opens the videos.
- Videos are found with one keyword search per reign (champion plus title name), kept on the device, and matched to the title win and defences by the challenger's name. Matches that cannot be tied to a listed fight appear under "More from this reign". A matching debug block at the bottom of the page lists what was searched and matched.
- The Championships menu shelf now has a World of Stardom card with the current champion and the reign day count, and each group lists its titles in two columns. The belt picture is shown only in builds with the private branding folder (res/raw/belt_world).
- Lineage data (22 reigns, 105 defences) is bundled in assets/lineage/world.json; opening the page makes no request.

## 2.12.0

- My Favorites: "My Faction" is now a row of faction bands with the logo on a white tile. One faction fills the width, two take half each, three to six take a third each (two rows). You can keep up to six favorite factions (Menu button on a faction in the Factions list adds or removes it); an existing single favorite carries over.
- My Favorites: "My Reminders" now shows paper tickets with a stub. A PPV you have watched on this TV appears first, with the days left and the replay end time in your local time (red in the last 24 hours); then your show reminders. If there is only one, the next show without a reminder fills the second place. OK opens the show's page.
- The app now remembers which PPV replays have played here (it records a replay that has run for 5 seconds), and keeps the replay address it played for shows that had none.

## 2.11.10

- Stagecrowd video page: it no longer leaves full screen by itself after about 25 seconds. The app's "video never started" watchdog could not read Stagecrowd's player, took a playing show for a stuck one, and closed full screen. It is now skipped on Stagecrowd pages, and on any page that cannot report its play state.
- Auto full screen is more reliable: if the first try after 8 seconds is refused it tries again (up to three times, 3.5 seconds apart), waits a little longer before sending the OK press, and never toggles full screen back out.

## 2.11.9

- Favorites: wrestler cards now have a plain dark frame. When focused, the whole frame turns solid gold, lifts slightly and glows, so the selected card is easy to see.
- Shows menu: Left and Right now go straight across a row (the featured shows' Remind me and Details buttons) before looking above or below, so they no longer jump down to the next show's bell.
- Account menu: new "Instructions" link opens the first-run guide again from the language choice. Its last button reads "Done" and "Close" instead of heading to the login page, and it returns to the page you were on.

## 2.11.8

- Colour tidy-up: 18 near-duplicate greys and navies (for example #222, #333333, #0B0F14, #121A24) now use the app's standard greys and navies. Differences are a few shades at most. Warm tinted fills (login focus, favorites, PPV tile) are kept and recorded in the design spec.

## 2.11.7

- Colour: two accents instead of four. Gold #F4C242 for borders, rings, glows and text; orange #FFB347 for fills. The video-card ring and the login and first-run yellow are now gold, and the first-run pill, its pictures and the focused login button are orange. The login button no longer has a halo in its second code path either.

## 2.11.6

- Focus: one highlight everywhere. The catch-all focus rule is now a single gold outline (it was an orange outline plus a red halo), the login buttons lose their gold halo (fill and white border stay), and the faction cards use a gold border without the soft glow.

## 2.11.5

- Schedule: added STARDOM NEW YEAR DREAM 2027 (Jan 3, Yokohama Budokan) with doors and start times.

## 2.11.4

- Schedule: added STARDOM DREAM QUEENDOM 2026 (Dec 29, Ryogoku Kokugikan) with its poster (private builds only).
- Daily schedule job now also reads Stardom's PPV news category, so a new PPV show gets its price, sale dates, archive end and purchase link filled in automatically. Not yet run against the live site.
- A downloaded schedule that has a PPV show but lacks some of its details now gets the missing ones from the bundled copy.

## 2.11.3

- Stagecrowd video page: the language button now reads "Language: English" or "Language: 日本語" (it showed "CC: Off" because the page's flag for the app was sent as a number, which the app does not read as true). Pressing it switches the commentary and the label follows. Until you pick one it shows Japanese, which is what their page starts on.

## 2.11.2

- Stagecrowd video page: sizes now follow the app's other video pages. Their page is laid out narrower than the 1440 px the app uses elsewhere, which made the bar and its buttons look too big; the bar's text, buttons and spacing are now scaled to match, and the picture is 60% of the screen width, starting about 7% down.

## 2.11.1

- Stagecrowd video page: their page can come up in Japanese (英語実況 / 日本語実況 for the commentary, シアターモード for theater mode). The language button, the theater toggle and the dark/light switch are now found in either language, and the info column is found from its tab bar, so it hides either way.

## 2.11.0

- Stagecrowd video page now uses the same control bar as the app's other video pages, under the picture: time, progress, play, skip back / forward (Up / Down on them picks the skip size), mute, speed, language and full screen. Their own control bar is hidden and nothing else on the page can take focus, so the D-pad cannot wander into their controls. Full screen has focus first, the 8 second auto full screen is kept, and leaving full screen puts focus back on it. The three buttons above the player are gone.
- The language button (English / 日本語) stands in for the captions button, in this bar and in the full screen overlay on these pages, since their player has no captions to offer. The full screen overlay itself is unchanged and still shows in full screen.
- The picture is about two thirds of the screen width, centred, as large as fits above the bar, like the app's other video pages.

## 2.10.25

- Stagecrowd video page: Full screen, English and 日本語 are back above the player (Down goes to the player, Up from the player or its control bar returns to them). Still 30% smaller, and auto full screen is unchanged.

## 2.10.24

- PPV details page: once the show is over the "Your time" column and the "Show over" line are gone (the venue time stays). The heading is now the purple PPV chip with the status chip beside it. The step number sits on the same line as the step title. The match card now lists the participants for each match (from the official card, English names; subject to change).
- Stagecrowd video page: buttons are about 30% smaller and sit below the player (Up goes to the player, Down comes back to the buttons). After 8 seconds on the replay or live page it goes to full screen by itself, once; because browsers only allow that after a key press, the app sends an OK key press while Full screen has focus if the direct request is refused (new bridge call ppvPressOk).

## 2.10.23

- Stagecrowd video page: removed the yellow key-debug line.
- Home page, step 4: the pay-per-view show gets its own tile next to the next-live tile. It reads PPV · ON SALE SOON, PPV · ON SALE (price and sale end), PPV · LIVE NOW (red border, "Watch live"), or PPV · REPLAY ("Watch until Nov 15"), and disappears when the replay ends. Pressing it opens the show's details page, where the four steps and the Watch button are. The next-live tile now skips pay-per-view shows, so it keeps showing the next regular show.

## 2.10.22

- Stagecrowd video page: found why the commentary buttons could not be reached. The page script was being loaded twice, so there were two overlapping button rows, and the D-pad code was walking the hidden one. The whole script now runs only once per page.

## 2.10.21

- Stagecrowd video page: fixed a stray `+ +` in the button styles (introduced in 2.10.20) that dropped all of them, so the row showed as plain pink text. A small yellow line at the bottom left shows the last key pressed and what had focus, to find why the commentary buttons were not reachable.

## 2.10.20

- Shows menu: removed the temporary PPV playback-test link from the bottom of the list (the test is still step 1 on the details page).
- Stagecrowd video page: Full screen, English and 日本語 now sit in one row above the player, centred. Left/Right walk the row, Down goes to the player, Up from the player or its control bar returns to the row. The row takes focus first, and again when leaving full screen. Their logo header is hidden and the player is centred.

## 2.10.19

- Stagecrowd video page: the English / 日本語 buttons are now created once and kept. Their page re-draws its own controls often, and the old code rebuilt ours each time, which dropped the D-pad focus and made them unreachable. Their theater icon is hidden along with its label.

## 2.10.18

- Shows menu: tiles shrink to fit their content (no empty gap above the buttons), so more of the Past shows list is on screen.
- Stagecrowd video page: the commentary choice is limited to one English and one 日本語 button. Before, every element on the page that mentioned "commentary" got its own button, which produced the garbled strip.

## 2.10.17

- Stagecrowd video page: now uses their real markup. The light/dark switch is hidden by its own class, and their information tab bar is recognised under either name (Streaming or Distribution information) so the right-hand column hides reliably.

## 2.10.16

- Shows menu: show titles are cut to two lines so the Upcoming and Past tiles stay the same size with no big gap.
- Stagecrowd video page: their right-hand column, the theater toggle, the light/dark switch and the clickable logo are hidden. One column of buttons on the right in the app's style: Full screen (main action) and the commentary choice (English / 日本語). Up/Down walk the column, Left returns to the player, Up from the player's control bar or Right from the player goes to Full screen. Everything else on the page is made unfocusable so no hidden control can take focus.

## 2.10.15

- Show details page: step 3 is one Buy button that opens the phone QR screen. Buttons now have a single gold outline when focused (no double ring).
- Shows menu: the Upcoming and Past tiles are the same height, with buttons along the bottom.
- Stagecrowd video page: Full screen and Theater mode buttons restyled (dark, single gold focus), test report only on the test page, cookie banner and language chip hidden on every Stagecrowd page.

## 2.10.14

- Stagecrowd "Login is required" page (when Watch is pressed while signed out): dark look, gold Log in button, form-order focus and no test report, like the sign-in pages. Any Stagecrowd page using the same simple layout gets the same treatment.

## 2.10.13

- Stagecrowd player: the app's own full screen controls (play, skip, mute, speed, captions) now drive their video, and show its time and state. Before, only Exit full screen worked.
- Their player's control bar no longer traps the D-pad: Up from a bar button moves to our Full screen button, Down goes back to the video.
- Test report and the Full screen / Exit theater buttons only show on the player and test pages, not on their show page or cart pages.
- Back from a Stagecrowd page (or from the Buy on your phone code) now returns to the show's details page, not the page underneath. Back on the code closes the code first.
- Sign-in: the login page's D-pad order now reaches the register button (a hidden duplicate was taking its place), and the error line no longer overlaps the password label. If "Return to the original page" does nothing, the page goes where it would have gone by itself.

## 2.10.12

- PPV, step 3: Buy opens Stagecrowd's show page on the Purchase tab with the precautions tick box selected, then the cart, card and confirmation pages get the same dark look, gold action button and form-order D-pad focus as sign-in. The test report is hidden on all of them.
- New "Buy on your phone" button next to Buy: a full-screen QR code of their show page, with three short steps. Back closes it. (QR code library: qrcode-generator by Kazuhiko Arase, MIT license, bundled as assets/qrcode.js.)
- Watch now opens the replay's own address when the replay is up, and their Viewing page tab otherwise.
- Safety: while you are in a Stagecrowd session, a page on any other site (a bank's card-security check) gets no certificate leniency and none of the Stardom World scripts, and the top bar shows its padlock and address. The session ends when a Stardom World page opens.
- Forgot-password link on their login page shows one line of text instead of two overlapping.

## 2.10.11

- Stagecrowd: after signing in, their "Login is complete" page presses "Return to the original page" by itself, so you land back on the show page. That page also gets the dark look and no test report.

## 2.10.10

- The tag line on schedule cards and the details page (the purple PPV tag and its state, and the "NEXT LIVE" tag) was hidden by the site-wide rule that hides anything with "tag" in its class name. Renamed so it shows.
- PPV cards no longer show Remind me once the show is live, on replay or ended.

## 2.10.9

- Stagecrowd registration: their "Back to top" button after the email is sent now says "Back to the show" and returns to the show instead of their home page.

## 2.10.8

- Stagecrowd sign-in and registration: styled with their real page classes (buttons, titles, labels, links), a gold Log in / Send button, and the two "register" links on the login page now count as one stop in the D-pad order.

## 2.10.7

- Stagecrowd sign-in, registration and password pages: dark look to match the app, a gold main button, and a D-pad order that follows the form (fields, tick boxes, then the button) instead of jumping to the cookie banner and language chip. Up and Down step through the form, OK ticks a box, and focus starts on the first field. Their cookie banner is answered once with Reject All and then stays hidden; their language chip is hidden on these pages.

## 2.10.6

- Stagecrowd pages: the gold focus ring is now drawn on the visible button, link or checkbox label that holds the focus, also where their own styling hid it.

## 2.10.5

- Stagecrowd sign-in and registration pages: the on-screen test report is hidden there so it no longer covers the form and cookie banner.

## 2.10.4

- PPV steps go to the right place on Stagecrowd: Sign in opens their login page (which links to registration, and returns to the show page); Buy opens the show page on its "Purchase tickets" tab; Watch opens it on the "Viewing page" tab.

## 2.10.3

- PPV details page: one button per step (Run the test, Sign up / sign in, Buy, Watch); the "I've bought it" switch is gone. The buttons on this page now have a single gold focus outline instead of two.

## 2.10.2

- PPV: the Crimson Nightmare show was not appearing because the downloaded schedule (which has no PPV shows) replaced the bundled one. PPV shows from the bundled file are now added to the downloaded schedule.

## 2.10.1

- PPV, step 2: pay-per-view shows (sold and streamed by Stagecrowd) appear in the schedule with a PPV tag and a state taken from the dates alone: not on sale yet, on sale, live, replay, replay ended. The Shows menu shows a PPV card (with Watch replay while the replay is up) as the first box of Past shows, and the show details page gets a four step row: test playback, sign up or sign in, buy, watch. "I've bought it" is a switch you set yourself.
- The first PPV show (Crimson Nightmare, Oct 29) is in the bundled schedule. Its poster ships inside the app (private builds only).
- Stagecrowd pages: Back always returns to the show; a Full screen button and an Exit theatre button appear once a video is on the page; the test report shrinks to the corner.

## 2.10.0

- PPV, step 1 (private builds): Shows menu, Past shows column, "PPV TEST (TEMPORARY)": opens Stagecrowd's free playback test page inside the app. Stagecrowd pages run without any of the Stardom World scripts, with a thin bar on top (what Back does, and the padlock and address of the page), a visible D-pad focus ring, and a test report that stays on screen (page, video state, Widevine and codec support, errors).
- Stagecrowd pages never get past certificate errors, and only get protected-media (DRM) permission, not camera or microphone.

## 2.9.13

- Captions: the CC button always looks for captions first, also on a show that was live and is now on demand (it still uses the live-style player address, which 2.9.9 wrongly treated as "still live"). If the video has none, it says "Closed captions not available for this video".

## 2.9.12

- Live shows: the live player sends no end event when a broadcast stops (confirmed on a real show). While the live show's video page is open, the app now treats 90 seconds with no playback-time updates (and not paused) as the broadcast being over, and clears the LIVE states. If the time starts moving again it undoes that. The 3-hour limit still applies when the page isn't open.

## 2.9.11

- Schedule panel (Shows menu): while the first show is live its card gets a red pulsing LIVE NOW badge and a red "Watch live" button that opens the show's video page (the LIVE list if the page isn't known yet). Remind me and Details stay.

## 2.9.10

- Live shows: the Shows menu chip, the schedule panel card, the show details page and the "up next" transition screen all switch to a red LIVE NOW while the show is on (from the listed start, up to 3 hours).
- The show counts as over when the player reports it finished (20+ minutes after it was seen playing); otherwise it ends 3 hours after the start. The next show then takes over everywhere.
- Show details: shows with no match card yet say "Match card not announced yet".

## 2.9.9

- Captions: the CC button explained that live streams have no captions (replaced in 2.9.13 by a check for captions on every video).

## 2.9.8

- Live card: the tile is only redrawn when its text changes (about once a minute) instead of every 1.5 seconds, which also stops the poster being re-decoded each time.

## 2.9.7

- Live card: the status line (Next live / Stream is up / Started 12 min ago) moved from over the artwork to a dark label beside the LIVE chip at the top, so it is always readable.

## 2.9.6

- Live card: if the stream is already playing a few minutes before the listed start time, the tile says LIVE NOW straight away instead of "Starts in 1M".

## 2.9.5

- Live card: the grey testing line is gone.
- Each show now gets its own poster (the one under its title on the official schedule page) instead of one poster per month. The daily schedule update picks them up, the app downloads each once (small, kept on the device, removed when the show is over), and the poster appears wherever the app shows one. Until a show's own poster has downloaded, the month's poster is used.

## 2.9.4

- Schedule: the Tag League in Takasaki (Nov 8) now shows its match card on the show page. Other shows will get theirs as the official site posts them.

## 2.9.3

- Video pages: the focus outline on the first card of a related row is no longer cut off on its left. The page's own container clipped it, so the rows now sit a few pixels inside it (heading and cards stay aligned).

## 2.9.2

- Live tile: one gold outline when focused instead of two (the tile's own border is hidden while the focus outline shows).
- Video pages: cards in the related rows no longer grow on focus, so the first card's left edge isn't clipped by the row.

## 2.9.1

- Fixed the left edge being cut off: the video page's carousel was left in the site's own centred layout (huge cards) when a set didn't need reversing, so it is now always laid out like the others; the wide live tile no longer grows on focus, which clipped its left side.
- Fixed the View All tile in the New row being the wrong size while the live tile is shown.

## 2.9.0

- Live card: from 60 minutes before a show until 3 hours after it starts, the home page's "Next live" tile and the site's own stream card become one 16:9 tile (stream thumbnail, poster inset, title, time, venue). It shows STARTS IN (before), STARTING, then LIVE (red, pulsing) once the player reports play, or 15 minutes after the start. OK opens the player. Afterwards the normal cards come back.
- A card counts as the live show only if it is tagged [LIVE] and matches the scheduled show by name or Japan date. If the site's card isn't posted yet, the plain Next live tile stays.
- Testing aid: a small grey line on the tile shows state, card id, whether the player confirmed, and minutes to/from start.

## 2.8.5

- Sets now play in show order whichever way the site lists them. Nighter-style sets (listed in show order) start at the top match and play down the card; PPV-style sets (main event listed first, opener last, 【ダイゼロタイム】 matches at the bottom) start at the opener and play up. The direction is read from the match titles, not the video IDs, which run either way.

## 2.8.4

- Community: video titles are left to the page's English translation (they were shown in the site's Japanese), and the translated titles are kept for the Favorites pop-up and the menu's Top 5. The menu's Top 5 shows the site's own wording until the Community page has been opened once.

## 2.8.3

- Community menu shelf follows the other shelves: "Open Community" is the first link, the columns line up at the top, and the Top 10 became a Top 5 (large #1, then #2 to #5 on two lines each) ending in a "View all Top 10" link.
- Showing chips on a chart now have an x (subject and month/year); OK on one removes it. Clear all is still there.
- Pick a year no longer loads a chart: it shows the year strip with nothing selected (no request), and the chart opens when you choose a year. "More years..." in the menu does the same.

## 2.8.2

- Community, This month: searches the date as it is written at the start of match titles (2026/10), instead of 2026.10.

## 2.8.1

- Community menu shelf: the Top 10 now has its own styling on every page (ranks beside the titles on one line each, large #1 picture), instead of only on the Community page.

## 2.8.0

- Community is now a page: Most watched / Most favorited, This month / This year / All time / Pick a year (with a year strip, 2026 back to 2011), a large #1 with #2 to #4 beside it and #5 to #10 below (the large layout needs at least 3 results; fewer show as a plain row).
- Each chart is one search address (the site's own sort by plays or favorites plus a keyword) and opens with one request; nothing else is fetched. No play or favorite counts are shown.
- "This month" searches for the show's date at the start of the title (written 2026.10 by default). The page prints the words it searched for; if the site writes dates another way, change MONTH_FMT at the top of assets/community.js.
- Collections at the bottom of the page and on their own "See all" page: Places (venues), Shows and Titles & match types, from the lists the filter bars already use. OK opens the most watched; the Menu button opens the most favorited.
- A "Showing" row (place, metric, window) with Clear all appears when a collection is open; the year strip sits below it.
- Rank movement (up, down, new) since your last visit, kept on the device.
- Menu button on a chart video offers Favorites / Watch Later, like everywhere else.
- Community menu shelf: Top 10 most watched of all time on the left (large #1, then #2 to #10; kept from the last visit and refreshed at most once a day), with the page, windows, years, collections and Build a chart on the right.
- "Build a chart" opens the site's most-played list with the usual filter bar (Sort, Match type, Championship, Competitors, Show, Location, Year).

## 2.7.1

- My Favorites rows: the first tile is no longer clipped on the left.
- Pressing Right on the last tile of a row wraps round to the first tile.

## 2.7.0
- Home page: the site's "My Favorites" row under Recently Watched is replaced by your Watch Later row (the same list as on the My Favorites page; View All opens it). The app no longer loads the site's favorites page in the background when the home page opens.
- My Favorites overview: "My Faction" and "My Reminders" headings above the sticker and the tickets.
- Highlighted video tiles on the My Favorites pages and Recently Watched use the same gold outline and glow as the home page.
- Menu panel: Recently Watched shows a count once the My Favorites overview has read your history (Favorite Videos has none, because the count would need a request to the site).

## 2.6.1
- My Favorites menu panel: "Open My Favorites" only shows the gold highlight when it is the highlighted row, and rows that were opened before (such as Wrestlers) are no longer drawn dim. Visited links on the My Favorites pages are kept at full brightness too.

## 2.6.0
- Playlists can be named: "+ New playlist" (from a video's Add to a Playlist list) asks for a name with a text box that opens the TV keyboard, suggesting "Playlist 1, 2, ..." which you can keep. Press OK on the box to type; Enter saves once you have typed, or move Down to Save.
- Rename a playlist: Menu button on its tile on the My Favorites page opens Rename playlist and Remove playlist.

## 2.5.0
- My Favorites menu panel redesigned: "Open My Favorites" on top, then Collections (Wrestlers with photos in private builds, My Faction with its logo, Matches, Shows, each with a count), Lists (Watch Later, Recently Watched, Playlists, Favorite Videos, then your playlists by name) and your next three reminders (OK opens the event page).
- My Favorites pages: the Menu button on a video (Watch Later, Matches, Shows, or inside a playlist) now opens the same choices as anywhere else: add it to the other lists or remove it from this one. Wrestlers, factions, reminders and whole playlists still remove straight away.
- The first tile on the sub pages is no longer dimmed (the app's general highlight rule was fading it).
- The overview shows "+N more" beside the two reminder tickets when more are set.

## 2.4.2
- My Favorites and Recently Watched pages: the highlighted tile has a single gold border. The app's general focus ring (an outline plus glow) was drawing a second one on top.

## 2.4.1
- Menu: My Favorites sits under the account name and shows only when signed in.
- My Favorites page: the bottom hint bar is gone (the hint is at the top right), so the last row is no longer covered, and there is more room below it.
- Recently Watched page: tiles now use the home page card style (size, font, four-line titles) and are no longer cut off at the bottom.
- Focus: one gold ring around a highlighted tile (the second, glowing ring is gone).

## 2.4.0
- My Favorites: video tiles now match the home page (same size, font and four-line titles), and the last row is no longer cut off at the bottom of the overview and sub pages.
- Factions menu: just the faction names in one short list (no scrolling). Menu button on a name picks your one favorite faction; wrestlers are added from the Wrestlers list.
- New rows and pages: Playlists, Favorite Matches and Favorite Shows (View All opens the full page). The Menu button on a video now offers Add to Favorites, Add to Watch Later, Add to Favorite Matches (or Favorite Shows for a show / video set) and Add to a Playlist (pick one or start a new one, named Playlist 1, 2, ...). It also works while watching a video.
- On the My Favorites page the Menu button removes the highlighted item, including a whole playlist or a video inside one.

## 2.3.0
- New "My Favorites" section in the menu (replaces My Videos): Overview, Favorite Wrestlers, Watch Later, Recently Watched and the site's Favorite Videos.
- My Favorites page: your one favorite faction as a round sticker, your reminders as tickets, favorite wrestlers as cards, then Watch Later and Recently Watched in the same rows as the home page (four across, View All at the end). Private builds show wrestler photos (res/drawable-nodpi/wrestler_<name>.jpg or .png in the private branding folder) and faction logos; other builds show initials and the faction name.
- Menu button in the Wrestlers and Factions lists: on a wrestler it adds or removes a favorite; on a faction name it picks your one favorite faction (choosing another replaces it). A toast confirms each change, and favorites show a star.
- Menu button on a video card now shows a small choice: Add to Favorites (the site's list, as before) or Add to Watch Later.
- On the My Favorites page the Menu button removes the highlighted wrestler, faction, Watch Later video or reminder.

## 2.2.7
- Shows menu: the Remind me and Details buttons (and the show rows and bells) get the gold focus outline again.

## 2.2.6
- Event page: the match card has no title and sits higher, with slightly tighter boxes, so the last row is no longer cut off.

## 2.2.5
- Match card: the Japanese card is read from the Japanese page (no /en/, underscore after the date, e.g. /event/20261101_korakuen/; only the first dash changes, so korakuen-2 stays as it is). Where that page lists fewer matches, the rest show in English. The Nov 1 card now has its Japanese names bundled.

## 2.2.4
- Event page: the menu now opens over the show page and Back closes only the menu, so you stay on the show.
- Match card: wrestler names come from the site's English fighter list (the card itself shows machine-romanised names), and the daily job also reads the Japanese card for kanji names and match types, used when the app is in Japanese.
- Match card (private build only): one line break per match, after the first "vs".

## 2.2.3
- Event page: an "UPCOMING SHOW" header, the title now wraps on whole words, and the menu tab shows on the left like other pages.
- Event page: the match card is two columns so it fits without scrolling. The first show (Nov 1) has its card bundled with the app; the daily job reads the rest from each show's Matchups page and keeps team mates together.

## 2.2.2
- Home: the Next Live tile is now a wide card with the poster at the left and the details beside it (private builds). Public builds show a normal tile with a countdown instead of artwork.
- Shows menu: Upcoming Shows is wider and show names are kept on whole words.
- Gold show times now include the time zone, for example "10:30 PM EDT".
- Past wrestlers: Saki Kashima added.

## 2.2.1
- Event page: Back now closes it (it no longer leaves the app), and Left from the first button opens the global menu.
- Event page: a text match card (match type and who faces whom, no photos) appears once the site lists it. The daily job reads it for shows within 7 days.
- Shows menu: the Past Shows side is wider so show names stay on whole words; the Upcoming side is a little narrower.

## 2.2.0
- Schedule: the Shows menu now has two sides. Upcoming Shows (left) has a Next Live tile and the four shows after it, each with a bell; Past Shows (right) has All Shows and the shows list in two columns. A gold "NEXT 1D 3H" pill sits next to Shows in the main menu.
- Times are shown in your device's time zone, with the Japan time (JST) beside them.
- Event page: opens from a tile or row. Pick a reminder (15 minutes before, at start, 1 hour before, day before); press the same one again to clear it.
- Reminders show as a toast at the top right while the app is open.
- Home page: the Next Live tile is the first card of the first row.
- Loading screen between pages: an "Up next" line along the bottom when the next show is within 7 days (not on the launch splash).
- Poster art is only fetched and shown in builds that have the private branding folder; public builds show text only.
- The list comes from assets/schedule.json and is refreshed at most every six hours from the schedule-data branch, which a daily GitHub job (scripts/update_schedule.py) keeps up to date.

## 2.1.5
- Menu is in alphabetical order: Championships, Factions, Match Types, Shows, Wrestlers, Years. A divider then sets the account link apart as the last item, with a gold person icon.
- My Videos and Community now sit below the account name (still their own menu items). When signed out, the menu shows only "Log in" and neither appears.

## 2.1.4
- Special rules match type: Rumble added (list sorted A to Z).
- Menu: the Shows list now starts with "All Shows", shown above the columns. "All championship matches" also sits above the columns, and "Other title matches" is no longer listed in the menu (it is still in the filter bar).

## 2.1.3
- Championships are grouped, in the menu and in the Championship filter: Stardom (IWGP Women's removed, Kawaii of Kawaii added, with Cutest of Cute results included), New Japan (IWGP Women's, STRONG Women's) and Other Promotions (AEW, CMLL, POP, Regina di WAVE, ROH, RPW, Sendai Girls).
- For the short promotion names (AEW, CMLL, POP, ROH, RPW) the app removes search results whose title does not contain the name as a word. Other names for the same title are searched once and added to the list.

## 2.1.2
- Brings together 2.1.0 (menu lists A to Z, faction names open their faction pages, version number under the language toggle) and 2.1.1 (match types).
- Menu: no more red glow above and below the gold outline on the highlighted item.
- Menu: "Current Wrestlers" is now "Wrestlers", with a Past column next to the current ones, and the separate "Past Wrestlers" entry is gone, so the menu is one row shorter.
- Filter bar: past wrestlers have their own column in the Wrestler and Competitors lists.

## 2.1.1
- More specific match types, in the Match type filter and in a new Match Types entry in the menu, both laid out as a shelf with headings: Singles & tags, 3-Way, 4-Way, 5-Way & 6-Way, Multi-person and Special rules.
- 3-Way and 4-Way are split into Battle, Tag Battle (Tag Team matches included) and Trios, and each shows only its own videos. The site's search finds the shared words, so the app takes out titles that do not belong, including pages added as you scroll.
- New: 5-Way (5Way and Five Way included), 6-Way, Ladder, Gauntlet and High Speed. 8-person now includes 8-man videos.
- Other spellings (5Way, Five Way, 6Way, Six Way, 8-man) are searched once each, one after the other (1.3 s apart), and added to the list.
- Choosing a filter from a page opened by the menu no longer repeats the menu's own search word in the keyword.

## 2.1.0
- Menu, Shows: listed A to Z like the Show filter's drop-down (All tournaments stays on top), reading down each column.
- Menu, Championships: same order as the Championship filter (Any championship match, then A to Z, Other title matches last).
- Menu, Factions: each faction's name is now a link to its faction page.
- Faction pages: if the filter bar is ever missing above the video grid, it is put back.
- A small grey version number sits under the language toggle in the menu, in the space that was already there.

## 2.0.9
- Same as 2.0.7 (video starts quickly, keeps your place, video row on set pages, focus recovery) with the temporary on-screen player line turned off.

## 2.0.7
- When the player has to be loaded again, it now keeps your place: the video that had resumed where you left off (for example at 5:00) used to jump back to 0:00 after the reload. The app reads the position first, then starts the new load at that time.

## 2.0.5
- First video of a page sat on the spinner for about 15 seconds: in the recording the picture only appeared after the player was loaded again. The app now loads the player again after 5 seconds if it is still at 0:00 (Play is still requested at 1.5 s), and once more at 16 seconds if needed. A video that has played, or that you paused, is left alone.

## 2.0.4
- Videos now get a Play request straight away (1.5 s and 4 s after the page opens, if still at 0:00) instead of waiting about 8 seconds; the player reload follows at 14 s. A video that has played, or that you paused, is left alone.
- Pages of a video inside a set (the address contains /set/...) now get the same video row as the main page: same cards, one-by-one Left/Right, a View All tile at the end, and Up to the player. They were showing the site's own row before.

## 2.0.3
- On some video pages the remote could not get back up to the player buttons because keyboard focus had landed on a plain page block. An arrow key now treats that as lost focus: Up/Left/Right go to the player bar, Down goes to the first video in the row.

## 2.0.2
- A video that never starts on a page (spinner forever, before full screen): after 8 seconds the app asks the player to play, after 18 seconds it loads the player again (once), after 40 seconds it asks once more. Videos that have played, or that you paused, are left alone.
- Down from the player bar now finds the video row on set pages too (it only looked for one kind of card before), and ignores anything above the bar.

## 2.0.1
- Video that never starts: the automatic switch to full screen now waits until the picture is really moving (a bare "play" signal can arrive while the video is still loading). If a video still sits at 0:00 in full screen, the app asks it to play after 10 seconds, and after 25 seconds leaves full screen and loads the player again (once).
- After leaving full screen the remote could stop reaching the related videos (arrow keys only scrolled the page). The app now takes keyboard focus back to the page, and if focus is ever nowhere the arrow keys put it back: Down goes to the first related video, the others to the player's button bar.
- Temporary: a small black line at the bottom-left of the screen shows the player's state (full screen, focus, last player signal, time) so a photo shows what happened if it goes wrong again. It stays on screen, including in full screen.

## 2.0.0
- Release 2.0.0: Redesigned TV navigation with slide-out side menu, Factions and roster explorer, advanced match/event filters, universal TV player control bar with quality selector and 30s/60s seeking, poster-style onboarding guide, and restyled TV login page.

## 1.3.135
- Cookie card: the grey "Choose one to continue" line (which showed with a light highlight) is gone, and text on the card can no longer be selected.
- After the cookie banner is answered, anything of it still stuck to the bottom edge of the screen (an empty strip or bar) is put away.

## 1.3.134
- Cookie banner: when the site shows its cookie banner (found by its Allow / Deny buttons, on any page), a large card in the new look appears above it with the same two choices, Deny and Allow all, with Deny selected. Left/Right switches, OK answers. Pressing a button presses the site's own button, so the answer is the site's real answer. If no banner appears, nothing is shown.
- Log in page: the logo drawn over the top is gone, and so is the grey status line at the bottom.

## 1.3.133
- Log in page: everything now fits on screen. The empty space at the top is gone, and the heading, fields, buttons and the two links are a little smaller and closer together.
- The Japanese heading "ログイン。" is marked as not to be translated, so it no longer turns into "Log in." in English.

## 1.3.132
- Log in page: the site's top bar holds its own small login form, and the styling was being applied to that one instead of the real form. It now picks the real form (the password field outside the top bar), and the top bar stays hidden. The top bar's "New registration" link is no longer brought back.

## 1.3.131
- Fixed: the login page styling in 1.3.130 also ran on the Home page (which has a hidden login form), bringing the site's old header back and adding the sparkles and status line. It now only runs on the login page.

## 1.3.130
- Log in page: the look is now also set directly on each element, because the site's own rules were out-ranking the style sheet. It re-applies as the page settles and when the focus moves. The site's top bar (categories, search, log in, language) is hidden on this page, and boxes around the form lose their frames. The two helper links stay. The grey status line at the bottom now also shows the scale values.

## 1.3.129
- Favorite guide picture: the toast with the heart now pops up over the video grid, not over a full-screen video.
- Guide captions are always one line (the text shrinks to fit), so the full-screen text no longer changes between one and two lines, in English or Japanese.

## 1.3.128
- First-run guide pictures are animated, like the pointer screen: Move around (the red focus box travels over the cards), Menu (the menu slides out, then the sub-menu flies out of it), Favorite (a toast pops up with the heart in it, replacing the heart over the video), Full screen (the video control bar slides up) and Language (the switch slides to the other side).
- Full screen text is now "Down for controls. Left/Right skips. Back exits."
- Log in page: the styling is applied even if the form appears late or sits at another address (it now finds the page by its password field and retries for about ten seconds). The site's two links under the form ("If you are unable to log in", "Register here") are kept. A small grey status line at the bottom of the login page shows what ran, so a photo can show what happened.

## 1.3.127
- First-run guide: the language-switch screen now comes right after the menu screen (4 of 7), with the text "Language switch at bottom of the menu." The full-screen screen is last and reads "In full screen press down for controls." then "Left/Right to skip. Back to exit." on two lines (the caption box is a little wider so the text stays full size).
- Log in page: closer to the mock-up using styling only, no change to the form itself: dotted background, sparkles, bilingual field labels (EMAIL ・ メール, PASSWORD ・ パスワード), a yellow glow around the selected Log in button, and the site's own boxes made transparent.

## 1.3.126
- First-run guide redesigned in a bold poster style: black background, a Japanese headline with a short English line, one yellow caption, and a TV and remote drawn in a yellow frame (a wrestling match on the TV where it fits). Order is unchanged: language screen first, then seven guide screens.
- Buttons are pills in the existing order, Skip to log in, Back, Next, with Next selected by default (yellow). The welcome screen has Skip to log in and Next; the last screen has Back and Log in. The splash logo stays where it is on the language and welcome screens.
- The pointer screen is now an animated demonstration: the app's own wand pointer moves to a "verify you are human" box while OK is held, and the box gets ticked. The pictures are small web pages in assets/guide.
- Log in page restyled to match: a yellow Japanese heading, white-outlined fields and pill buttons (Log in is yellow when selected). The explanatory line is hidden.
- Not built on a device yet: please check text sizes and the pictures on the TV.

## 1.3.125
- Slide-out menu: Left on a top-level menu row (with no list or drop-down open) now closes the menu, like Right and Back. Inside a list beside the menu, Left steps back to the menu row first.
- First-run guide: the menu screen now explains the lists that open beside the menu, that Left steps back and closes the menu, and the current section names (Home, Factions, Wrestlers). Its picture shows a list opened beside the menu. English and Japanese.

## 1.3.124
- Home list: any row name still in Japanese after the known names are applied is now translated to English once (one short translation request per new name, then remembered), so new or unusual rows no longer stay Japanese. The first time a new row appears it may take a few seconds to turn English.

## 1.3.123
- Language switch menu reopening made sturdier: it keeps trying for a few seconds, covers a page that reloads or rebuilds itself while translating, and stops once the menu is closed.

## 1.3.122
- Switching language from the slide-out menu: the menu now comes straight back (with the language switch selected) as soon as the reloaded page appears, instead of leaving you on the bare page. The page reloads and translates behind it.

## 1.3.121
- Home list: championship rows (IWGP Women's, World of Stardom, Wonder of Stardom, High Speed) and decade rows like "2020s" now show English names. The Home flyout is slightly wider so long titles fit.

## 1.3.120
- The shelf menu is now the only slide-out menu; the Left-key switch to the classic menu is gone.
- Home list now shows English names (it was showing the Japanese names the home page uses). The app learns both names for each row as the home page loads.
- Current and Past Wrestlers flyouts are wider so long names like Utami Hayashishita stay on one line.

## 1.3.119
- Home in the slide-out menu now opens a list instead of going straight to the main page, in both menu styles. The list starts with "Main page", then the categories the main page features.
- Shelf menu: every section now opens as a flyout. Added Home, Championships, Factions (columns of members per faction), My Videos, Community and the account menu. Current Wrestlers is now plain alphabetical columns with no factions, like Past Wrestlers.

## 1.3.118
- Trial: shelf menu. In the slide-out menu, Shows, Years, Current Wrestlers and Past Wrestlers now open as a panel to the right of the menu instead of an inline list. Right or OK opens it, arrows move between entries, OK goes there, Left from the first column or Back returns to the menu row. Current Wrestlers is a column per faction; Past Wrestlers is alphabetical columns. Home, Championships, Factions, My Videos and Community stay inline.
- Press Left on any top-level menu row to switch between the shelf menu and the classic inline menu; a short note at the bottom says which one is showing. The choice is remembered, so the two can be compared side by side before one is picked.

## 1.3.117
- Slide-out menu: the house icon and logo row at the top is now also a drop-down. OK still opens the main page; Right opens or closes a list under it of the rows the home page itself shows (New, Big Match and so on). The app notes those rows each time the home page loads (no extra request) and keeps the last list, so it follows whatever the site features; until the first visit it shows the five known ones.
- Shows now means the big shows only: "All tournaments", then the same list as the Show filter. Each opens a search for that show with the Show chip set and the tournament bar on top. Big Match, English Commentary, LIVE & On-demand and the 5★STAR GP special feature live under Home.

## 1.3.116
- Year pages (2011–2026) now use the match filter bar with the year already set as a chip, instead of the tournament bar.
- Show and Location drop-downs added to the match filter bar (search results, championship pages, year pages), same lists as the tournament bar. These add the show or venue name to the keyword search, so combined with a wrestler or match type they only find videos whose title or description names that show or venue.
- Faction pages: once a member is chosen, a filter bar (Sort, Match type, Championship, Competitors, Show, Location, Year) sits above their videos. Picking a filter opens a search for that member with the filter applied and the member as the first chip. Left from the first pill goes back to the member list; Up from the first row of videos goes to the bar.

## 1.3.115
- The in-page control bar (play, -/+, mute, quality, speed, full screen) is now also built on event (set) pages that have a player, not only on single-video pages. It still only appears when the page has the player.

## 1.3.114
- The championships added to the side menu now open with the championship as the removable chip and the wrestler pill left on "Wrestler" (any wrestler), instead of treating the championship as the search subject.
- The four older championship pages (IWGP Women's, World of Stardom, Wonder of Stardom, High Speed) now show the same filter bar as the search pages (Wrestler, Sort, Match type, Championship, Competitors, Year) with their championship chip already set. Changing anything there opens a keyword search for that championship.
- Removed the Probe (the menu entry and all its code).

## 1.3.113
- Side menu, Championships: the four site pages stay, and the filter bar's other championships are added under them (Artist, Future, Goddess of Stardom, NEW BLOOD Tag Team, Any championship match, Other title matches). These open a keyword search with the filter bar on top.

## 1.3.112
- Show list: added All Star Grand Queendom, New Year Dream, Spring Vacation, Supreme Fight, The Conversion and To the World (found with the Big Match probe); Dream Queendom now searches "DREAM QUEENDOM" so it no longer also catches All Star Grand Queendom.

## 1.3.111
- Probe on a category page (Big Match, English Commentary, LIVE & On-demand, 5★STAR GP special): reads that category's pages one at a time, 1.2 s apart (at most 12), and lists the show names found in quotes in the titles with how many times each appears, so more shows can be added to the Show list. Run it from the menu's Probe entry while on the Big Match page.
- The Tournament Archives bar (Sort, Location, Show, Year) now also appears on category pages such as Big Match, English Commentary, LIVE & On-demand and the 5★STAR GP feature, replacing the site's sort row there. The four championship pages keep the site's own layout.
- The Show drop-down is now a three-column shelf, so a long list no longer runs off the bottom of the screen.

## 1.3.110
- Filter bars (wrestler search pages and Tournament Archives): the drop-down row and the "Showing" chip row now line up with the left edge of the first video thumbnail.
- 5★STAR GP show now searches "5★STAR".
- Location names are marked as not to be auto-translated (a prefecture was showing up as "Clean"/"Cleaner" on one TV).

## 1.3.109
- Tournament Archives bar: the page's sort row is now a Sort drop-down (Newest, Oldest, Most played, Most favorited) like the wrestler filter bar, and the old row is hidden.
- City and Venue are merged into one Location drop-down shelf: prefectures as gold headings with their venues underneath, in columns. Picking a prefecture searches the prefecture name; picking a venue searches the venue.
- Show: 5★STAR GP now searches "GP" (the old "STAR GP" matched poorly). Added NEW BLOOD and Queens Dynasty; added Toyohashi and Toyota Gosei venues under Aichi.

## 1.3.108
- Tournament Archives gets a filter bar: City, Venue, Show and Year. Each is a fixed list (kept in assets/event_filters.json, edit freely: the name you see and the word searched for), so opening one loads nothing; picking one adds the word to the site's keyword search and opens the results (one request), with a "Showing" row of removable chips and "Clear all". Clearing everything returns to the plain archive page.
- Year on its own searches for the year, which also finds match clips from that year, not only events; picking a city, venue or show with it narrows it to events.
- Probe: on the Tournament Archives page (or its filtered results) it now runs nine one-off test searches to check how events are titled and what a year search returns.

## 1.3.107
- The first pill in the filter bar is now the page's main subject: "Wrestler: Syuri". It opens the faction shelf; picking another wrestler switches the whole page to them and keeps any match type, championship, competitor and year already set. "Any wrestler" clears the subject. On a keyword search that is not a known wrestler it reads "Search: ..." and works the same way.
- The "Showing" row starts with the subject as a highlighted chip (no x on it), followed by the removable filter chips.

## 1.3.106
- Filter bar: the sort now says "Newest" (the site's own order) instead of "Default", and the Default row is gone. Newest no longer adds any sort setting to the address, so clearing every filter gives the plain search page.
- A "Showing" row of chips appears under the drop-downs for each filter in use (press OK on a chip to remove it), with "Clear all" at the end. Down from the bar goes to the chips, then the videos; Up from the first row of videos goes back to the chips.
- Competitors shelf: names no longer wrap onto two lines; factions run alphabetically left to right and wrestlers alphabetically within each faction.
- Championship list is alphabetical (Any championship match first), and the last row is now "Other title matches".

## 1.3.105
- Search pages (wrestler pages and keyword searches) get a filter bar in place of the sort row: Sort, Match type, Championship, Competitors and Year. Every list is fixed, so opening one loads nothing; each choice adds words to the search and opens that result page (one request, like any list), and more results load as you scroll as before.
- Match type: Single match, Tag team, 3-way, 6-person, 8-person, 8-man, Battle royal, Cage match.
- Championship: any championship match, the individual titles as written in the video titles, and an "Other" row for the older "Title Match" wording.
- Competitors: a shelf with a column per faction (same list as the Factions pages).
- Year: 2026 back to 2011. Finds titles that start with the date, so a few older clips without a date in the title are not found.
- "Clear filters" appears when any filter is set. Up from the first row of videos returns to the bar; Down from the bar goes to the videos. Back closes an open drop-down.

## 1.3.104
- Probe, round 3: on a search or category page it lists the page's own search form fields and runs nine one-off test searches, 1.2 seconds apart (year, a third word, venue, search inside a category), to see which filters can be done through the web address alone.

## 1.3.103
- Probe, round 2: on a search page it now only runs the follow-up tests (which list-data address filters by keyword, whether match videos carry a description in the list data, and how the search treats two names, "Cage", "Battle Royal", "Singles" and "Title Match") and shows the results compactly.

## 1.3.102
- Probe: also reads the site's list data on every page, lists links to sets (events), and on a search page tries three test searches (two names, "Tag Team", "Steel Cage").

## 1.3.101
- The Probe button is now in every build (including the public test build), not just your own, while the data is being checked.

## 1.3.100
- A "Probe" button next to the language switch in the side menu. It lists, on screen, everything the current video page or list page and the site's data address say about the videos (tags, categories, descriptions, data fields), paged with Left and Right, to find out what could be filtered on. Back closes it.

## 1.3.99
- Menu: a little less space around the logo at the top, so the whole list fits above the language switch without scrolling.
- Menu: Current Wrestlers now lists everyone in the factions list, alphabetically (Japanese names are kept where the app already had them).
- Home page: the Most Watched and Most Favorited rows are removed (the Community menu entries stay).
- Recently Watched (menu entry and the row's new View All tile) now opens a video grid page like My Favorites, built from the viewing history already on the My page, with no extra request. The My page link in the account section is unchanged.

## 1.3.98
- Faction pages: fixed the faction logo showing the Stardom header logo instead (the app's header-logo swap was catching it).

## 1.3.97
- Faction pages now open with no wrestler selected: the right side shows the faction name and a prompt to choose a wrestler. Videos are requested only when you pick a member. The results of the page the app just opened are kept quietly, so the first member in the list loads instantly if chosen.
- Faction logos now come from the private branding folder (res/drawable-nodpi/faction_logo_<name>.png) instead of the wrestling site, so nothing is fetched from their site. Builds without those files show text.

## 1.3.96
- Menu: Factions now sits above Current Wrestlers.
- Faction pages: faction names no longer break in the middle of a word, the member count is gone, and in builds that show logos the logo is centered at the top of the left side with the faction name below it (laid out the same as in public builds).

## 1.3.95
- New Factions entry in the side menu, listing STARS, COSMIC ANGELS, God's Eye, NEO GENESIS, HATE, Mi Vida Loca, Itoh Respect Gundan and Unaffiliated. A faction page keeps its members in a list on the left; pressing OK or Right on a member loads that member's videos into a grid on the right, loading more pages as you move down. Left from the grid returns to the member list, and Left from the list opens the main menu.
- Only one request is made at a time, a second apart, and each member's first page is remembered on the TV for 12 hours so reopening one costs nothing. If the site asks for slower access, loading pauses for ten minutes.
- The faction names live in app/src/main/assets/factions.json (edit it when members change). Faction logos show only in builds with the private branding folder; other builds show text.

## 1.3.94
- Full screen: Left and Right now skip 30 seconds per press (60 seconds while held or with the fast-forward / rewind keys), instead of 10 and 30.

## 1.3.93
- Skip size: the -/+ buttons (in full screen and under the picture) now skip 30 seconds by default. Press Up or Down while one of them is selected to choose 10s, 30s, 1m, 5m, 10m or 30m (a small list shows the choice and both buttons change their label); OK then skips by that amount. Nothing needs to be held down.

## 1.3.92
- Full screen: the button bar is now the same compact one-row design as the bar under the picture (time, slim progress bar, smaller buttons), so it covers less of the picture.
- The bar under the picture no longer shows the captions button; captions (EN / 日本語) are only offered in full screen, where they are drawn.

## 1.3.91
- Video pages: closed the gap between the picture and the control bar, removed the thin grey outlines around the player and the bar, and asked the player to hide its own control bar (controls=0) since the page's bar replaces it. If the player ignores that for live events, its bar will still show.

## 1.3.90
- Video pages: fixed the new control bar being cut off (it now sits just above the related videos instead of inside the player's clipping box), and focusing the bar (on load, after full screen, or coming up from the row) now scrolls to the top of the page so the title and the top of the picture are never cut off.

## 1.3.89
- Video pages: a compact control bar under the picture (time, progress, then Pause, -10s, +10s, Mute, CC, quality, speed, Full screen), styled like the full screen bar. Keyboard focus now lives on these buttons instead of inside the player frame: Left/Right stop at the ends (Left before Pause opens the menu), Down goes to the first related video, Up from the first related row comes back to the bar. This fixes getting stuck or lost in the player's own controls. The progress bar is display only; skip with -10s / +10s.
- The bar and the full screen bar share one button list, one set of labels and one set of actions, so changing a control changes both. After leaving full screen, focus returns to the Full screen button.
- Captions: the CC button cycles Off / EN / 日本語 as in full screen; the app's own captions are drawn in full screen.

## 1.3.88
- Video pages: the related-videos rows are now built exactly like the main page rows (same cards, sizes and View All tile) and use the main page's navigation: Right/Left move one video at a time and focus follows the row, Up/Down move between rows and to the player. The site's own carousel stays in the page hidden because play-next reads it. This replaces the 1.3.87 tile.
- Leaving full screen now re-lays out the player so the picture no longer sits shifted down and right with its edges cut off.
- Pressing Left at the player's Play button stops there instead of jumping to hidden controls in the top corner of the player.

## 1.3.87
- Video pages: the related-videos row now ends with a "View All" tile (same look as the main page rows) and the small "View all" text link above the row is hidden. The tile is skipped by auto-play-next.
- Includes everything in 1.3.86, 1.3.85 and 1.3.84.

## 1.3.86
- Video pages: the player now sits lower, under a title bar with the video's name (gold marker, large white text). The menu stays on the side tab: press Left on the first related video to open it (Left inside the player still rewinds). The edge tab is shown on video pages again.
- Up from the player no longer sends focus to the hidden old header (which lost focus); with nothing above the player it now stays put. Down only leaves the player when there is a video to land on.
- Up from the first row of related videos now goes straight to the player.
- Includes everything in 1.3.85 and 1.3.84.

## 1.3.85
- Intro screens: a new "The menu" screen after "Moving around" explains how to open the menu (Left on the first video of a row or list), how to close it (Right or Back) and what is inside, with a small drawing. The language screen now points to the menu's language switch instead of the old header button. (New installs only; no "what's new" logic for people who already saw the intro.)
- Includes everything in 1.3.84 (the left slide-out menu).

## 1.3.84
- New left slide-out menu replaces the site's top header on every page. Press Left on the first card of any row or list to open it, Right (or Back) to close it. It holds: search, Home with the logo, Shows, Championships, Years (current year back to 2011), Wrestlers (opens the search box), My Videos (Recently Watched, My Favorites; signed in only), Community (Most Watched, Most Favorited), then your account (or Log in) and the EN / 日本語 switch at the bottom. Groups open one at a time.
- A slim arrow tab on the left edge shows the menu is there, and "Press Left for the menu" appears on the first three launches of the home page (it stops once the menu has been opened).
- Left on the home banner opens the menu (Right still changes slides). Long titles in the menu wrap at spaces, never inside a word.
- The account is now a drop-down in the list like the others (My page, Log out, ...), the language switch is a full-width pill at the very bottom (reached with Down), and Wrestlers is split into Current Wrestlers and Past Wrestlers, each name opening a search for that wrestler.
- Menu search: OK on the search box now opens the on-screen keyboard, and a blue microphone at the right end of the box starts voice search (press Right from the box to reach it).
- Menu: more room around the logo, slightly larger text, and the list sits centred in the space so it spreads evenly if items are added.
- Every destination page (shows, championships, years, wrestlers, My Videos, Community, search results) now starts with a title in the home-row style: gold bar and large white text, lined up with the first video card.
- Menu in Japanese mode: Shows, Championships, My Videos, Community and wrestler names now show in Japanese (the site's own category names), and the page titles follow. The 2020 entry in Years now opens the site's correct page.
- The blue microphone beside the menu's search box stays as an icon only: it is not selectable and does nothing (the keyboard's own microphone key does the job).
- Account name and links in the menu now get translated (they come from the hidden header, which the translator skips) and the English is remembered so the next opening shows it at once.
- Menu search: uses the site's own search box (and the page's tidy-up that hides stray search boxes now leaves the menu alone) (the one the old header had, which opens the keyboard properly), moved into the menu while it is open; the blue microphone beside it starts voice search. The logo sits evenly between the search box and the first item. "New" is the first entry in Shows (it opens whatever the home page's New row sends its View All tile to).
- Sort bar on listing pages (Registration date / Number of plays / Number of favorites / Price): larger text, centred, evenly spaced, with one arrow after each label that no longer overlaps the text.
- The home page content now starts higher, since the header is gone.

## 1.3.83
- Home page: a new "Most Favorited" row (the site's most-favorited videos, first 12, then a "View All" tile for the full list sorted by favorites) is added as the last of the new rows.
- The "Favorites" row is now titled "My Favorites" (English).
- Row order under "NEW" is now: Recently Watched, Most Watched, Favorites, Most Favorited. Each row lands in its correct place whichever finishes loading first.

## 1.3.82
- Home page: a new "Most Watched" row (the site's most-played videos, first 12) sits below Favorites and above Tournament Archives, followed by a "View All" tile that opens the full list sorted by plays. It is shown to everyone, signed in or not. It loads with one small request (no hidden page) shortly after the page appears, and its last-known contents are saved so it is in place from the first paint on later visits.

## 1.3.81
- Home page, signed in: "Recently Watched" is now row 2 and "Favorites" row 3, directly under "NEW". Their last-known contents are saved on the device and drawn with the page, then refreshed in the background, so they are in place from the first paint after the first visit. If a row arrives late, the highlighted card stays where it is on screen.
- Signing out clears the saved copies.

## 1.3.80
- Home page, signed in: a "Favorites" row below "Recently Watched" shows the first 12 favorites, followed by a "Show All" tile that opens the Favorites page when there are more.
- "Recently Watched" is left out entirely when the viewing history is empty, without the background page load used before.

## 1.3.79
- Home page: signed-in viewers get a "Recently Watched" row as the last row (above Return to Top), built from the Viewing history on the site's My Page. It looks like the other rows. Signed-out viewers, or an empty history, show nothing extra.

## 1.3.78
- Home page: the banner and rows no longer shift while the page loads or when you come back to it from another page. The site's own banner and rows are hidden from the first paint, and the grid is held at a fixed distance from the top every frame while the header settles.
- The Categories box shows the same gold focus ring as the other highlighted items instead of a red one.

## 1.3.70
- Video listing pages: Up/Down now moves one video at a time and scrolls it into view (a card is a single stop, so it no longer takes several presses).
- Adding a video to favourites outside the Favorites page now only shows the toast; the card and thumbnail are left untouched. The Favorites page keeps its dimming and toast on removal.
- The large advanced-search block at the bottom of video listing pages is hidden, so it no longer flashes up while more videos load. The header is unchanged.

## 1.3.69
- Under the hood: Added groundwork for translated closed captions. The feature is off in public builds for now, so the CC button behaves as before.

## 1.3.64
- Full-screen player bar: new quality button (cycles Auto and the available resolutions, e.g. 1080p / 720p) and a shorter speed button that just shows the rate (1.0x).

## 1.3.66
- Home row titles are bold.

## 1.3.65
- Home video rows: row titles use the site's header style (gold bar, white Arial text) instead of gold lettering, and each row ends with a "View All" box that opens that row's full list.

## 1.3.68
- Caption debug panel: also handles live-event embeds (vimeo.com/event/...) by reading the embed page for the video's config link.

## 1.3.67
- Full-screen player: pressing the CC button now also shows a caption debug panel (the player's caption tracks, how many caption lines it reports, and whether the player's caption files can be read). It hides after a few seconds or when another button is pressed.

## Unreleased
- Repository cleanup for sharing: generic placeholder artwork, optional private branding folder, README,
  license, contributing guide, issue/PR templates and automatic APK builds.

## 1.3.63
- Hero banner: 5% smaller (95% width) instead of 10%; its focus glow now matches the video thumbnails (same ring and glow size).

## 1.3.62
- Home hero banner: 10% smaller and centred instead of full width, with rounded corners; the gold focus ring now wraps the rounded edge. Banner images still come from the live site as before.

## 1.3.61
- Header: Favorites stays on one line; the category box is now the same width as the search box, reads CATEGORIES (カテゴリー) and has its arrow in a box on the right, like the search button. Removed the temporary position note.

## 1.3.60
- Header cleanup: logo moved to half its previous distance from the left edge; search and category boxes share the same top and height; Favorites, the account name and the language switch are centred vertically on them; account names longer than 8 characters before "-san" are shortened with an ellipsis.

## 1.3.59
- Account menu: fixed the account name disappearing from the header (the whole account block was being hidden instead of just its panel), and removed the false "menu not found" note when signed out.

## 1.3.58
- Account menu: the account name (a plain label on the site, not a link) is now made focusable and is what opens the menu list; Left from the language switch lands back on it.

## 1.3.57
- Account menu: hide the site's whole dropdown panel (not just the list inside it), using the markup of the site's account menu.

## 1.3.56
- Account menu: more flexible detection of the site's menu. Temporary: if it still cannot be found while signed in, a short note lists what the header contains.

## 1.3.55
- Account menu: it no longer drops down by itself. Press OK on your account name to open the menu as a list in the middle of the screen (same as the category list), move with Up/Down, OK to choose, Back to close.

## 1.3.54
- Header: Right from the account menu now reaches the language switch (it was stuck inside the account menu), and Left from the switch goes back to the account.

## 1.3.53
- Language switch: smaller text and box; grey outline when idle and gold with a glow when focused (previously the other way round).
- The page no longer scrolls sideways when focus reaches the far right of the header, which exposed the right edge of the hero banner after switching language.

## 1.3.52
- Header language button is now a two-position switch (EN | 日本語) in the same gold style as the language screen, with the active language filled in gold.

## 1.3.51
- Fire TV: the header's category list now opens as an app list with a clearly lighter highlight on the focused row and no radio buttons, matching the Sony TV. Other devices are unchanged.

## 1.3.50
- Sign-in check: starts as soon as the page begins loading and checks every second for up to 10 seconds. If it still cannot tell, the app loads the main page instead of the guide.

## 1.3.49
- Signed-in launches no longer open the guide by mistake on slow devices: the sign-in check now starts as soon as the page is mostly drawn and is given 25 seconds before the app gives up.

## 1.3.48
- Language screen: the buttons were being squeezed off the bottom of the screen, so the prompt is now a single line.

## 1.3.47
- Language: the guide now starts with a choice of English or 日本語 (your device language is pre-selected). The choice is saved and used everywhere: the guide, the login page, the site, the language button and the full screen controls. Until a choice is made the app follows the device language.

## 1.3.46
- Japanese: when the TV is set to Japanese, the guide slides and buttons, the restyled login page, the full screen control bar and on-screen messages appear in Japanese. Other languages stay English.

## 1.3.45
- Log in from the guide: the guide now fades straight onto the login page in whatever state it is in (no waiting for a ready signal, no timed fallback, no timing note).

## 1.3.44
- Log in from the guide: shows "Opening log in..." while the login page finishes, no longer waits a fixed 7 seconds if the page's own ready signal is missed, and shows a temporary timing note to find where the time goes.

## 1.3.43
- New start sequence: splash logo alone, sign-in check, then either the loading bar under the logo and the main page (signed in) or the guide with the logo in the same place (signed out). The login page loads quietly behind the guide so "Log in" opens it without a wait. After signing in: transition screen, then the main page (no second splash). Backing out goes through the transition screen to the signed-out main page.

## 1.3.42
- Start: the splash logo is always on screen first. When signed out, the guide takes over from the splash with the logo in exactly the same place.
- Login: the site's own login page, restyled to match the guide (colours, fonts, sizes, gold focus highlight, Down/Up between email, password, Log in and Continue without logging in). The earlier built-in login screen is gone, so the site's own checks, errors and retries apply. Back leaves to the normal signed-out start.

## 1.3.41
- Signed-out experience now shows every time the app starts signed out (not just once), and a signed-in person who was signed in last time goes straight to the splash.
- The login is now part of the guide: a native screen in the same colours and fonts with large fields, a clear gold highlight, Down/Up through email, password and Log in, and the on-screen keyboard's Enter moves on or submits. Sign-in is carried out on the site's own login form in the background, so the site's error messages are shown and you can retry. If the site asks for a human check, its own login page opens instead.
- Back from the login screen (or "Continue without logging in") goes to the normal signed-out main page.

## 1.3.40
- Start: until the guide has been seen, the app shows a plain black screen while it checks whether you are signed in (up to 8 seconds), then shows the guide (signed out) or the splash (signed in).
- The guide's "seen" flag was reset so everyone who tried the earlier test builds sees it again.

## 1.3.39
- First-run guide now opens straight away (no splash first) for anyone who is not signed in, with the site loading quietly behind it; signed-in people skip it.
- Login page restyled for the TV: no header, larger gold-and-black fields, first field focused, Down/Up move between the fields and the button, Enter submits. Failed attempts and retries still work as on the site.
- More reliable sign-in detection on slower devices (Fire TV).

## 1.3.38
- First-run guide for people who are not signed in: six short slides (moving around, favorites, cursor mode, full screen and autoplay, language) with a Skip button, shown once. It leads to the login page; after signing in the splash plays and the signed-in home page loads.

## 1.3.37
- Full screen started from the player's own full-screen button: its controls now fade after 8 seconds (the countdown starts and the player gives up keyboard focus).

## 1.3.36
- Full screen on every device: Down opens the on-screen button bar, Up/Down no longer reach the player (they could leave its controls stuck on screen).

## 1.3.35
- Clean-up: removed the unused Fire TV experiments (page-stretch full screen, diagnostics). Fire TV keeps: no forced hardware layer, page kept laid out behind the full-screen video, layer size fix, and the on-screen button bar. Nothing here changes other devices.

## 1.3.34
- The Fire TV full-screen size nudges no longer run on other devices, so the Sony TV behaves exactly as before.

## 1.3.33
- The full-screen button bar is shown on Fire TV only; other devices keep the player's own controls.

## 1.3.32
- Full screen: Down opens the app's own button bar (play/pause, -10s, +10s, mute, captions, speed, exit) with time and progress; Left/Right move, OK presses, Up or Back closes it.

## 1.3.31
- Full screen player buttons: no more flicker, and focus now moves through every button instead of bouncing between the first two.

## 1.3.30
- Full screen: press Down to reach the player buttons (Left/Right move between them, OK presses, Up or Back returns to skipping). Removed the Fire TV size message.

## 1.3.29
- Fire TV: keep the page at full size behind the full-screen video so the video is laid out for the whole screen.

## 1.3.28
- Fire TV: back to the system full screen, no forced hardware layer on the page, and the full-screen video is forced to fill the screen. Shows the app version on launch.

## 1.3.27
- Fire TV: no automatic full screen for now (it showed the video small, then black); the video stays in the page.
  Shows a one-time message with the screen and WebView details so full screen can be fixed properly.

## 1.3.26
- Fire TV page full screen: sized from the visible window in pixels, no frame background, page overflow left alone.
  Shows a short "FS ..." debug message when entering full screen (temporary, for diagnosing a black picture).

## 1.3.25
- Fire TV: video "full screen" now stretches the player over the whole page instead of using the system full-screen
  mode, which left the picture in the top-left corner. Remote keys, controls and Back work the same.

## 1.3.24
- Fire TV: full screen video now fills the screen instead of sitting in the top-left corner (the player is nudged to
  re-measure itself after entering full screen).

## 1.3.23
- Page transition overlay: displays a black background with a looping wand cursor animation (4s) ending in a sparkle burst, shown for 5 seconds on every page load to seamlessly mask CSS/layout rendering in the background.

## 1.3.22
- Launch splash shows a gold progress bar under the logo with the wand riding its tip. When the page is ready the
  bar fills, bursts into sparkles, and only then does the splash fade out.

## 1.3.21
- Home hero banner is no longer dimmed when focused; focus is shown by the outline only.

## 1.3.20
- Video player controls automatically hide after 8 seconds without input, or immediately when focus or cursor moves off the player.
- Fullscreen player handles Left/Right (seek 10 s, 30 s held), OK/Media Play-Pause (toggle play/pause) directly and auto-fades controls after 8 seconds.

## 1.3.18
- User account names in the header display on a single line without wrapping.
- Language toggle button is right-justified to accommodate longer user account names.

## 1.3.17
- Header fits on a single row (logo, search, category menu, account buttons). The Favorites button only
  shows when you are signed in.

## 1.3.16
- Hold OK for about half a second to turn the on-screen cursor on or off, so human-verification boxes
  and other mouse-only controls can be clicked. A quick press still works as a normal OK.

## 1.3.15
- Restored remote Options button (`Menu`, `Info`, `Yellow`) to add or remove focused video cards to/from Favorites with Toast confirmation.
- Removed version number and branch badge from the launch splash screen.
- Added clear custom artwork branding specifications to documentation.

## 1.3.12
- Card titles wrap at word boundaries instead of splitting words.

## 1.3.11
- Sub-pages use the same four-column card grid and gaps as the home page.

## 1.3.10
- Sub-pages use the same 1440 px width and 24 px side margins as the home page.

## 1.3.9
- Next video plays automatically when one ends; full screen exits at the end of the list.

## 1.3.8
- D-pad can navigate the video player's buttons and move out of the player.

## 1.3.7
- Gold focus ring around the whole video card on sub-pages, matching the home page.

## 1.3.5
- Rotating hero banner built from the site's live slides.

## Earlier
- Fixed 1440 px desktop layout, English by default, splash screen, header and cursor tweaks, https login fix,
  Stardom-style launcher banner and icon.
