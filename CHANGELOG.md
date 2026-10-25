# Changelog

All notable changes to this project. Versions match `versionName` in `app/build.gradle.kts`.

## 1.3.70
- Undid the image swap (ring = icon, wide 星 HOSHI★ = banner) and registered the app as a TV-only launcher (no phone LAUNCHER entry) so Fire TV uses the wide banner for its home tile instead of squeezing the icon into a square.

## 1.3.69
- App icon is the square ring logo everywhere; the wide 星 HOSHI★ image is used only as the TV banner (tray tile).

## 1.3.70
- Undid the image swap (ring = icon, wide 星 HOSHI★ = banner) and registered the app as a TV-only launcher (no phone LAUNCHER entry) so Fire TV uses the wide banner for its home tile instead of squeezing the icon into a square.

## 1.3.69
- Swapped the two image files: icon and banner artwork now appear in each other's places.

## 1.3.68
- Manifest: the main activity icon is the square ring logo again (app-info lists), while the application icon and TV banner stay the wide 星 HOSHI★ tile.

## 1.3.67
- Home-screen tray tile: 星 + HOSHI★ wordmark only (second line removed). The square ring logo stays as the standalone app icon.

## 1.3.66
- HOSHI wordmark now ends with a white star everywhere. The home-screen tile shows the gold 星 on its own followed by the HOSHI★ wordmark on pure black, and the banner is also set as the application icon so Fire TV picks it up.

## 1.3.65
- Header logo is now as tall as the search box, with a larger HOSHI name and more space after the emblem. The home-screen tile uses the full black banner as the activity icon, so Fire TV no longer shows grey bars.

## 1.3.64
- New generic branding: "HOSHI 星" logo (ring seen from above) for the app icon, TV home banner, splash screen and header, replacing the gold star / "TV VIEWER" art. App name is now "Hoshi". The TV banner and icon are also set on the main activity so the home-screen tile uses the full banner. Private branding overrides work as before.

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
