# Stardom TV app: design spec

Master reference for how the app looks. Written from the code at 2.11.5 and not yet checked on a TV. Edit this file to change a convention, then bring the code into line. `scripts/audit_design.py` compares the code to the token lists below, so keep the two in step.

Visual versions: the published style guide page and the "Stardom TV App — Design System" doc (ask for the links).

## Rules that hold everywhere

- One focus highlight per element. Never a double outline.
- Everything works with arrows, OK and Back.
- Debug output stays on screen.
- English and Japanese are both first class.
- Site layout: 1440 px wide, 24 px side padding.

## Colour tokens

| Token | Hex | Use |
| --- | --- | --- |
| Gold | #F4C242 | Borders, rings and glows, text (dates, headings, selected) |
| Orange | #FFB347 | Fills: button focus, progress, guide pill, login button focus |
| Ink on accent | #1A1A1A, #111 | Text on any gold or orange fill |
| Black / navy | #000, #0B1118 | Login and splash; details and QR |
| Menu / panel | #0F151C, #121922 | Menu; shelf and drop-down |
| Card / focused row | #161F2A, #141A22, #172029 | Rows, steps; focused fill |
| Border / track | #2A323C, #3B4656 | Lines; progress track |
| Text | #FFFFFF, #C9D2DC, #9AA6B4 | Title, description, fine print |
| Error | #FF7A66 | Login failures |
| Live red | #D62839 (hover #E8374A, text #FF6B78) | Live only |
| PPV purple | #7B5CFF (text #B6A4FF) | PPV only |
| Done green | #2E9E5B | Completed step |
| Tinted fills | #2A2410, #2A2210, #2A1C10, #1C1740 | Login focus, favorites, PPV tile gradient |
| Paper ticket | #F3E2B8 (paper), #2A1C10 (text), #6B4A26 (small text) | My Favorites reminder tickets |

Two accent colours: gold for lines and text, orange for fills. Open decision: five focus looks, aim to reduce to three.

Fallback for anything not covered above: a single 3 px #F4C242 outline, 2 px offset, no halo.

## Type

Arial for everything the app draws; Roboto on login and in native views. Scale (px): 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 28 30 40 54. Weight carries hierarchy: 600 items, 700 buttons and titles, 800 to 900 emphasis. Labels are uppercase with 1 px spacing.

| Role | Size / weight |
| --- | --- |
| Display (JP login title) | 54 / 900 gold |
| Page title | 26 to 30 / 700 to 900 |
| Row heading | 22 / 700 |
| Nav item / sub-item | 25 / 600; 23 / 500 |
| Thumbnail card title | 15 / 700, max 4 lines |
| Show tile title | 19 / 700, max 2 lines |
| Button | 15 to 21 / 600 to 700 |
| Description | 14 to 18 |
| Label / eyebrow | 11 to 13 / 700 to 800 |
| Faction band name | 40 / 900 (1 faction), 30 (2), 22 (3 to 6) |
| Ticket date or days number | 40 / 900 on the stub; title 23 / 800 |

## Shape

Radius (px): 4 tags, 8 small buttons and list items, 10 player and filter buttons, 12 to 14 panels and tiles, 16 login fields, 20 chips, 36 guide pill.

## Focus looks

| Look | Where | Spec |
| --- | --- | --- |
| A Border | Menus, shelf, drop-down items, details buttons | Border to #F4C242, fill #172029 |
| B Fill | Player bar, filters, chips | Fill and border #FFB347, text #1A1A1A |
| C Ring | Video cards, hero, home tiles, My Favorites faction bands and reminder tickets | 3 px #F4C242 outline, 2 px offset, glow, 1.03 lift |
| D Form | Login | Input 6 px gold border; button orange fill, white border, no halo |
| E Gold frame | Wrestler cards (My Favorites) | Dark frame at rest; whole frame turns solid #F4C242, lifts 1.06, glows |

## Exceptions (do not "fix" these without deciding)

- PPV purple for the PPV tag, tile border and step badges; status tag gold, red when live.
- Live red for the live tile border, Watch button, LIVE tag.
- Done green for a completed step badge.
- PPV tile with poster is half width with a 21 px title.
- Live and PPV tiles show the gold ring on focus with no lift; the related-videos row has no lift; the hero is never dimmed.
- Wrestler cards use look E (the old rainbow border hid the gold focus).
- My Favorites top: "My Faction" shows one to six faction bands on white logo tiles (1 faction full width, 2 half, 3 to 6 a third each, two rows at most; the Open pill is shown for 1 and 2). "My Reminders" shows two paper tickets: a stub (purple PPV days left, red for the last 24 hours or live, gold for a show date) beside cream paper with the time in local time. An owned PPV comes first, then reminders; one ticket is topped up with the next show that has no reminder. A PPV counts as owned once the app has seen its replay play for 5 seconds on this TV.
- Shelf Left/Right goes straight across a row first, then falls back to the nearest item.
- Account menu has an Instructions link that reopens the first-run guide (buttons read Close and Done).
- Details buttons change border only on focus; the selected state is a gold fill.
- Login and guide use Roboto and thick borders.
- PPV player bar: no Quality button, caption slot is the language button, scaled by width / 1440, auto full screen after 8 s.
- Native overlay and guide use Android sp and the system font.
- Scrollbars are hidden on the menu, shelf and drop-downs.
- Menu spacing (2.30.1), so every entry fits a 720-high screen without scrolling: items 44 high with 1 px between them (sub-items 42), text sizes unchanged (25/600, sub-items 23/500); logo row 48 high with the logo at most 36 high; account divider 4 px above and below; language toggle 40 high with 17/700 labels; panel padding 18 px top and bottom. From 2.30.2 any spare height is shared evenly above, between and below the entries (logo row included), so a tall screen gets even gaps rather than space around the logo; a short screen scrolls from the top as before.

## Checking the code

Run `python3 scripts/audit_design.py` for the report (add `--all` for every occurrence, `--strict` to fail on findings).

## Championship lineage page

`/mypage?tvch=<id>` (assets/lineage.js). Page title 30/900 with a 10 x 36 gold bar. Section headers use the My Favorites header style (15/800, .14em, gold). The lineage strip is a chip row: a focused or chosen reign uses focus look B (orange fill, dark text). Video cards are the My Favorites video card (look C ring), with a gold date badge top-right and a TITLE WIN (orange) or PPV (purple) tag top-left. The matching debug block uses 13px Arial in a #0F151C panel with a 2px #2A323C border and stays on screen. The menu shelf World of Stardom card uses the shelf item focus (look A).

Reign detail (2.13.4): the title win and defences are fact rows (#161F2A, radius 8, 15px, not focusable). The videos are one horizontal row like the home and related rows: heading 22/700 with the 8 x 26 gold bar, gap 24, four cards across (25% minus 18 px), sideways scroll, video card #1a1a1a radius 8, title 15/700 (4-line clamp), gold date badge top-right, orange THIS REIGN tag top-left, focus look C.

Strip order (2.13.5): newest reign on the left, current champion focused on open. Right moves to an older reign. Videos for a reign other than the current one load on OK.

Tag and trios titles (2.14.2): the champion box shows the team name, a middle dot and the members; the strip chips show the team name (when it fits). No new colours or focus looks.

Championships submenu (2.15.0): two columns, width 1000. Column 1 is Stardom lineage cards (110 x 60 belt, 17/700 title, 14/600 champion, 12/700 gold day count); column 2 is New Japan then Other Promotions as plain items. Cards use the shelf A Border focus look; no new colours.

Championships submenu (2.15.1): Stardom cards in a 2 x 4 grid; New Japan (1 column) and Other Promotions (2 columns) in a row below. Replaces the two-column layout from 2.15.0.

Faction home (2.16.0): a Faction home row heads the member list. The home screen has the logo (max 300 x 190), name 44/800, FOUNDED / CAPTAIN / MEMBERS labels (13/700 grey over 22/700 white), TITLES HELD cards (belt 120 x 66, 19/700, 15/600, 13/700 gold; two columns) and a three-column FACTION MATCHES grid. Factions submenu: cards in the Championships card style (17/700 name, 13/600 captain line, 13/700 gold titles line). Single gold focus look throughout.

Factions submenu (2.16.1): header CURRENT FACTIONS; card = optional logo (64 x 48) at the left, name 17/700 with the favourite star on its line, 13/600 captain line, 13/700 gold Titles held line. Faction home video cards use the thumbnail card title rule (15/700, max 4 lines).

Faction matches (2.16.2): no layout change. Data rules only: faction search words are ANDed, extra searches ('alts') load on reaching the end, 'exclude' hides cards by title.

Factions submenu logo (2.16.4): logo area 80 x 58 (was 64 x 48).

Eras page (2.19.0): `/contents/search?...&tvera=<n>` (assets/eras.json). Same page frame as the lineage page: title 30/900 with a 10 x 36 gold bar, instructional line right-aligned at the top (15/600 #9AA6B4), section headers in the My Favorites style (15/800, .14em, gold, 8 x 26 gold bar). Era chips: selected = look B fill; the focus ring on a chip is a 3 px gold border (selected chip keeps its fill). Tiles, cards and links use look A (gold border, #172029 fill). Faction and belt pictures come from the private branding folder; public builds show a dashed monogram or a drawn belt. No new colours or focus looks.

All Years & Eras (2.21.0): page `tvera=0`, bands #121922 with a 2px #2A323C border, 64 x 64 kanji box, ERA n OF 5 label (12/800 gold), era name 21/900, year tiles 108 wide (22/900 year, 12/600 grey line, shelf A Border focus), gold 15/800 Open era page tile on the right. Years menu: five columns in the 1000 wide shelf, era header card (26/900 gold kanji, 14/800 name, 12/600 years) over 17/700 year items; gold 19/800 All Years & Eras bar on top. Eras page timeline runs newest on the left. No new colours.

Wrestlers menu switch (2.21.5): Current / Past sit in one rounded track (#0F151C, 2px #2A323C border, 20px radius); the chosen one is filled #FFB347 with dark text (focus look B), the other is grey 17/700; focus is the gold border. Faction logos with white artwork use `plate: dark` (#0F151C) in My Favorites.

Matches (menu group, replaces Match Types): the shelf is 994 wide with all 18 match types in three columns (Singles & tags, 3-Way, 4-Way | 5-Way & 6-Way, Multi-person | Special rules), each in a keyline item (#161F2A, 2px #2A323C border, radius 8, 56 x 40 dot icon, 17/600 name, look A focus). Below it a compact TOP RATED block: Overall and By match type bars, then one era card per era (26/900 gold kanji, 14/800 name, 12/600 count). Match type icons use one dot per wrestler and one colour per side from the design colours only (gold, white, orange, grey, hollow gold, hollow white); fixed shapes mark cage, ladder, High Speed, gauntlet, rumble and battle royal.

Top Rated Matches page (`/mypage?tvtop=overall|era|type`, assets/toprated.js, data assets/top_matches.json): title 30/900 with a 10 x 36 gold bar, scope chips (chosen = look B). Rows are #161F2A, radius 8, 66 high, look A focus, with rank, star meter, type icon, title, optional orange tag (stipulation or team size) and score. A match with a confirmed video address (`u`) is a link: the whole row is the focus target (look A), OK plays the video, and an orange WATCH button (#FFB347, dark text, 15/800, radius 8, 40 high, play triangle) sits before the score. There are no thumbnails. A match without an address has no button and is not focusable or clickable. Up and Down move between linked rows and scroll over text-only rows. No new colours.

Eras page, Top rated matches section (between Dominant title reigns and Defining rivalries): standard section header, then the five best-rated matches of that era using the Top Rated page rows unchanged (shared code in toprated.js), then an "All N matches in this era" row (same row look, look A focus, no button) linking to `/mypage?tvtop=era&e=N`. Text-only rows are not focusable. No new colours.

Timeline direction (rule): anything laid out by time (eras, reigns, a strip of years or era tiles) runs newest on the left and older to the right, so Right goes back in time. This matches the Eras page, the championship reign strip and the Years & Eras menu. It applies to the Top Rated by era tiles and any future timeline.

Menu group title (2.22.6): the global menu row is "Years" (年別). The shelf heading and the All Years & Eras page keep the longer name.

Match types (2.23.4): Multi-person adds 10-person, 12-person and 14-person; Special rules adds Handicap. Their icons follow the dot rule (one dot per wrestler, gold side and white side; Handicap is three small gold dots against one large white dot). On the Top Rated by-type page the Special rules chips now run to a second line.

Eras page spacing (2.23.4): each section (Dominant title reigns, Top rated matches, Defining rivalries and the rest) has 16 px above its header on top of the page's 12 px gap. Dominant title reigns cards (2.23.5): the grey card has 8 px padding; inside it the link is a #0F151C box, radius 10, 12/14 px padding, with the belt picture (no box behind it, 106 x 57, 10% larger) above the title, holder and stats. Its inner row uses the class tv-rrow, not row (the site's own .row style has negative side margins and wraps). Focus is the gold border only: the app-wide card outline, glow and lift are turned off here.

New Japan titles (2.24.0): IWGP Women's and STRONG Women's have lineage pages (`/mypage?tvch=iwgp`, `/mypage?tvch=strong`, assets/lineage/iwgp.json and strong.json) built exactly like the Stardom ones. The info line under the strip names the promotion from the file's `promo` field ("New Japan"; Stardom when missing). In the Championships shelf the New Japan block shows them as the same lineage cards as the Stardom grid (belt, title, holder and reign, day count and defences; look A focus). The row under the Stardom grid uses the grid's two columns (2.24.1): New Japan cards stacked in the left column at the same width as the Stardom cards, the text-only Other Promotions list (two columns) under the right column. Belt pictures for private builds: branding-private/res/raw/belt_iwgp.png and belt_strong.png (transparent background).

Video index dry run (2.25.0, private builds only): on a video page a debug panel sits right after the match description (above the footer if that spot is hidden). It uses the debug panel style: #0F151C, 2px #2A323C border, radius 12, 13px Arial, gold 13/800 label with .14em spacing, grey #9AA6B4 keys, white values, missing values in error red #FF7A66, the raw record in 12px monospace. It is not focusable, stays on screen and is excluded from page translation.

Video index log (2.26.0): with a log address the panel heading reads VIDEO INDEX · LOG and the status after it is white 800 (red #FF7A66 when not sent); without one it reads DRY RUN. Same panel otherwise.

Video index panel removed (2.26.1): video pages no longer show the dry-run / log panel; the index still reads and sends in the background.

Favorites sync status (2.27.0, private builds): on the My Favorites page a 13/700 line sits after the title, grey #9AA6B4 ("Synced 2 min ago"), error red #FF7A66 when not synced. The Account menu gains "Send this TV's favorites to sync" in the standard shelf item style; the first OK changes its text to a confirmation, the second sends.

Tag Teams (2.28.0, assets/teams.js, settings assets/tag_teams.json): a menu group after Factions.
- Shelf (concept A): the "All Tag Teams" bar (tv-shl-all) on top, then five era columns newest on the left. Each column has an era header card (as in the Years shelf, with the team count), up to five team items (16/700 name, 12/600 grey members or faction line, look A focus) and a gold "+N more" item that opens All Tag Teams for that era.
- All Tag Teams page (`/mypage?tvteams=1[&era=n|&belt=goddess|newblood]`): the Top Rated page frame. Filter chips (2.28.1: 44 high, radius 10, 2 px border, 17/700; chosen = look B, focus = gold border) run All (with the count), then the eras newest first with short names (kanji plus "New Horizons", "Draft Years", "Threedom", "Genesis") so they fit on one line, then Goddess and NEW BLOOD, which carry a small drawn belt (30 x 16, gold line, ink on the chosen chip) and sit 14 px further along so they read apart from the eras. A grey count line sits under the grid. Team rows sit in three columns: #161F2A with no visible border at rest, radius 8, 66 high, look A focus, 17/700 name, 13/600 grey line, and tags (CHAMPIONS gold fill with ink text; GODDESS gold outline with ×n; NEW BLOOD grey outline).
- Team page (`/mypage?tvteam=<id>`): the Faction home layout.
  - Header: two 140 px member circles (the private build's wrestler photos, else initials on a dashed circle, marked notranslate so the page translator leaves them alone), MEMBERS / FACTION / FIRST TITLE / REIGNS / DEFENCES facts (13/700 grey over 22/700), and member and faction buttons (look A).
  - TITLES HELD: two-column belt cards (120 x 66 belt, 19/700, 15/600, 13/700 gold), opening that reign on the lineage page.
  - TAG MATCHES: four-across video cards (look C ring). A gold date badge sits top right, and an orange TEAMMATES tag top left when the video index confirms the two were on the same side. A "More tag matches" tile loads further pages; it stays in place (with focus) while the next page loads. With nothing to show yet, a plain grey line (16 px #9AA6B4, the same as the championship pages' "Press OK on this reign" note) sits above the More tile, and the header reads "looking for videos" or "none found yet".
  - The search lines stay on screen at the bottom (debug panel style).
- Arrow keys move to the nearest item in that direction; Left at the left edge opens the menu.
- Menu shelves (2.30.3): Up and Down treat a bar wider than 60% of the shelf as straight above or below when it spans the starting point, so All Tag Teams goes Down to My Tag Teams, not the first era.

Tag team page (2.28.2): no Title Matches section; Titles Held is followed by Tag Matches.

Tag team favorites (2.30.0, kept in tvFavV1 as `t`, newest first, no limit):
- The Menu button adds or removes a team on its Tag Teams shelf row, its All Tag Teams tile, or the top of its team page (the video cards keep their own Menu pop-up). A toast confirms, as for wrestlers.
- Team page: a "☆ Add to My Favorites" button after the member and faction buttons (look A). Once added it reads "★ In My Favorites" with gold text on a dark gold tint (#2A2410); focus is still only the gold border.
- Favorites are marked with a gold ★ before the name: Tag Teams shelf rows and All Tag Teams tiles. The shelf's top row adds a "★ My Tag Teams" bar (tv-shl-all) with the count, 10 px under All Tag Teams (2.30.3); it opens `/mypage?tvfav=teams`. The shelf hint reads "Menu button on a team adds or removes a favorite."
- My Favorites page: FAVORITE TAG TEAMS row under Favorite Wrestlers, up to 8 then a View All tile. Pair card (look E, gold frame): 324 wide, a 3:2 picture split into two member halves (photos in private builds, else 54px initials on the wrestler cards' colour wash), no belt tag (removed in 2.30.1), team name 20/900 and members 13/600 over the dark fade. `/mypage?tvfav=teams` shows them three across. Menu on a card removes it.
- My Favorites menu: a "Tag Teams" row under Wrestlers in COLLECTIONS, with the newest team's two mini avatars and the count.

Team page searches (2.28.4, words from 2.29.3): the words are the filter bar's "A Tag Team B" with the Wrestler filter's names (a title history name not on the roster goes through the history's "alias" spellings); one search page when the Tag Matches section comes on screen, one more per press of "More tag matches"; other spellings only when a search finds nothing; 3 s minimum between searches; results kept 7 days.

Wrestler pages (2.31.0, assets/wrestler.js): a wrestler's search page (the Wrestlers menu link, or a filtered search whose Wrestler filter is that wrestler; any roster or past wrestler) gets a header above the filter bar in the tag team page style.
- Header: one 140 px circle (the private build's photo, else initials on a dashed circle, notranslate), FACTION (current) / FIRST TITLE / REIGNS / DEFENCES facts (13/700 grey over 22/700) counted over every title history (World, Wonder, Goddess, Artist, High Speed, Future, NEW BLOOD, IWGP Women's, STRONG, Kawaii), and buttons (look A): "☆ Add to My Favorites" / "★ In My Favorites" (gold text on #2A2410 once added), then one button per faction that lists them, current first, past ones with a grey 13/600 "past".
- TITLES HELD: two per row, newest first, the team page's belt card (120 x 66 belt, 19/700 title and reign, 15/600 dates plus "with" partners, 13/700 gold days and defences), opening that reign on its title page.
- MATCHES: a section header, then the filter bar, chips and the site's results as before.
- The header is marked notranslate (it writes its own English or Japanese), and its focus rules name #tv-wr with !important: the site's search page puts it inside an article, where the app's card rule removes borders from anything focused (2.31.1).
- The page title is the wrestler's name on every wrestler page, filtered or not (2.31.2), as on tag team pages.
- Remote: arrows move to the nearest header item; Left at the left edge opens the menu (2.31.2); Down past the header goes to the filter bar and Up from the filter bar comes back. The Menu button anywhere in the header adds or removes the favorite. The page starts on the favorites button.

Menu order (2.31.0, signed in): … Years, then a divider, Community, My Favorites and the account name last.

## Set order card (2.32.0; all builds since 2.34.0)

Shown over the inline player (bottom left, 16 px in) on the first video after a set page, during the countdown to full screen. Panel #0F151C, 2 px #2A323C border, radius 12, 420 wide. Header 12/800 gold with 1 px spacing. Rows: a tag (12/800, radius 4; NOW is an orange fill with #1A1A1A text, LAST a #3B4656 outline with #9AA6B4 text) and the title on one line (15/700 white; the last match 15/600 #C9D2DC). Two buttons, 17/700, radius 10, #161F2A with a 2 px #2A323C border, focus look B (orange fill, dark text) and nothing else. Progress track #3B4656 with an orange fill, countdown line 13 px #9AA6B4, and a 12 px #9AA6B4 line saying how the order was decided. Labels are notranslate and written in English or Japanese; the match titles are left to the page translator. The full-screen countdown is 8 s while the card is up (5 s otherwise).

Set order card (2.32.1): one button, Reverse Order (17/700, at least 200 wide, same look and focus). Tags read FIRST (orange fill) and LAST (outline), at least 52 wide. Full-screen countdown 12 s while the card is up.

Set order controls (2.33.0): the card holds focus until a key is pressed (the player bar's focus calls wait for it); Down from the card goes to the player bar and Up from the bar returns to it while it is up. The set's video row starts with a Reverse Order tile in the View All tile style (#11171E, 2 px #2A323C border, radius 8, quarter width): a 34 px gold ⇅, 24/700 label and a 14 px #9AA6B4 "Starts with" line; video card focus (look C).

## Wrestlers spotlight (2.35.0, private builds)

Menu Wrestlers shelf: width 1000 (capped by the screen), names in three columns (CURRENT and PAST), and a 300 wide spotlight column 24 px to their right. Photo 300 x 450, radius 12, 2 px #2A323C border, #161F2A behind, cover from the top; no photo: initials 54/900 #C9D2DC. Below it: name 22/900 white (a gold ★ first when in My Favorites), faction 15/600 #C9D2DC ("Past wrestler" for past ones), then 13/700 gold lines for the title held now and reigns and defences. The spotlight is not focusable; focus stays on the names (shelf look). Public builds: unchanged four columns, 860 wide.

