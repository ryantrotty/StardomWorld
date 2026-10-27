# Changelog

All notable changes to this project. Versions match `versionName` in `app/build.gradle.kts`.

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
