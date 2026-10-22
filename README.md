# TV Viewer for Stardom (Android TV / Google TV)

An **unofficial, fan-made** Android TV / Google TV app that opens [stardom-world.com](https://www.stardom-world.com)
full-screen in a WebView and reshapes the site so it works well with a TV remote.

> **Not affiliated with Stardom.** You need your own paid account and sign in on the site itself.
> The app never stores your username or password; it only keeps the normal site session cookie.
> Stardom's name, logos and artwork are not part of this project (the app ships generic placeholder artwork).

## Features

- **Remote-friendly browsing**: D-pad navigation across a home page grid and the sub-pages
  (favorites, categories, search results, video pages) with a gold focus ring around the whole video card.
- **Rotating hero banner** built from the site's own featured slides (Left/Right flips slides).
- **Video pages**: the player autoplays and goes full screen after 5 seconds, the D-pad can move through the
  player's buttons and back out to the cards below, and the **next video plays automatically** when one ends.
  At the end of the list it leaves full screen.
- **English by default** with a language toggle in the header, and the Google translate widget hidden.
- **Consistent desktop-style layout** (1440 px wide): four cards across, even margins, clean titles.
- Launch splash screen, header that scrolls with the page, return-to-top button, favorites shortcut.

## Remote control

| Button | Action |
| --- | --- |
| D-pad arrows | Move between cards, header items and rows |
| OK / Select | Open the focused card or press the focused button |
| Down (in the player) | Leave the player and jump to the cards below |
| Left / Right (in the player) | Move between the player's buttons |
| Menu / Info / Yellow | Add or remove the focused card from favorites |
| Back | Leave full screen, then go back a page, then exit |
| Play / Pause, Rewind, Fast-forward | Control the video |

## Install (no coding needed)

1. Download `app-debug.apk` from the [latest release](../../releases/latest).
2. Copy it to your TV, for example with a file manager such as **X-plore** (its WiFi file sharing works from a
   computer's web browser) or a USB drive.
3. On the TV, allow installs from that file manager when prompted, then open the APK to install it.
4. Open **TV Viewer** from your apps row and sign in to your own account.

If Android says the package is invalid, the file was probably cut short during transfer. Compare the file size on
the TV with the original and copy it again.

## Build it yourself

Requires [Android Studio](https://developer.android.com/studio) (JDK 17 or newer).

1. Open this folder in Android Studio and let Gradle sync.
2. **Build > Generate App Bundles or APKs > Generate APKs**.
3. The file is `app/build/outputs/apk/debug/app-debug.apk`.

Pull requests and pushes are also built automatically by GitHub Actions, and tagged versions (`v1.3.12` and so on)
publish an APK on the Releases page.

### Customizing Artwork & Logos

The repository ships with generic artwork ("TV VIEWER" gold star). If you build the app yourself and want to use custom logos, app icon, or title, add them to `branding-private/` (which is git-ignored):

- **`branding-private/res/drawable-nodpi/ic_launcher.png`** (App Icon, 512 × 512 px)
- **`branding-private/res/drawable-nodpi/banner.png`** (TV Banner, 1000 × 562 px)
- **`branding-private/res/drawable-nodpi/header_logo.png`** (Header Logo, 1100 × 200 px transparent)
- **`branding-private/res/drawable-nodpi/splash_logo.png`** (Splash Screen Logo, 1100 × 271 px)
- **`branding-private/res/values/strings.xml`** (`<string name="app_name">Your App Name</string>`)

For full setup instructions and image specifications, see [docs/PRIVATE_BRANDING.md](docs/PRIVATE_BRANDING.md).

## How it works

Everything is in `app/src/main/java/com/example/tvhub/MainActivity.kt`: a WebView plus injected CSS and JavaScript
that restyle the pages, rebuild the home grid, drive the focus ring and handle the player and remote keys. The site
can change at any time, so things may break; please open an issue when they do.

## Contributing

Ideas, bug reports and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) and the
[changelog](CHANGELOG.md).

## License

Code: [MIT](LICENSE). The license does not cover any third-party names, logos or artwork.
