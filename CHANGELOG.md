# Changelog

All notable changes to this project. Versions match `versionName` in `app/build.gradle.kts`.

## Unreleased
- Repository cleanup for sharing: generic placeholder artwork, optional private branding folder, README,
  license, contributing guide, issue/PR templates and automatic APK builds.

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
