# Custom Artwork & Private Branding Guide

The public repository ships with **generic placeholder artwork** (a gold star and the name "TV VIEWER").
If you build the app yourself and want to use your own private logos, app icon, home-screen banner, and app title, you can add them to a local `branding-private/` directory. 

Because `branding-private/` is listed in `.gitignore`, your custom images remain private on your computer and will **never** be committed or pushed to Git.

---

## Folder Structure

Create a directory named `branding-private` at the root of the project (next to `app/` and `gradle/`):

```text
stardom-tv/
└── branding-private/
    └── res/
        ├── drawable-nodpi/
        │   ├── ic_launcher.png
        │   ├── banner.png
        │   ├── header_logo.png
        │   └── splash_logo.png
        └── values/
            └── strings.xml
```

---

## Image Specifications & File Names

Place your custom PNG images into `branding-private/res/drawable-nodpi/` using these exact file names and recommended specs:

| File Name | Description | Recommended Specs & Dimensions |
| :--- | :--- | :--- |
| **`ic_launcher.png`** | App Grid Icon | **512 × 512 px** (PNG, square icon for Android TV app grid) |
| **`banner.png`** | Android TV Home Banner | **1000 × 562 px** or **1280 × 720 px** (16:9 aspect ratio PNG) |
| **`header_logo.png`** | Site Header Logo | **1100 × 200 px** (Transparent PNG, placed top-left in web header) |
| **`splash_logo.png`** | Launch Splash Screen Logo | **1100 × 271 px** (PNG on black background, centered on app start) |

| **`wspot_<name>.jpg`** | Wrestler photo, used everywhere the app shows one (wrestler pages, tag teams, My Favorites, the menu's Wrestlers spotlight) | **480 × 720 px**, made by `python3 scripts/make_wrestler_spots.py`; `<name>` is lower case with anything that is not a letter or digit written as `_` (e.g. `wspot_momo_watanabe.jpg`) |

*Wrestler photo originals* (any size, .jpg or .png, named `momo_watanabe.jpg` or `wrestler_momo_watanabe.jpg`) go in `branding-private/wrestler-photos/`, outside `res/`, so they are not packed into the app. Run the script after adding or replacing one; it remakes only the copies that changed. `--move-originals` moves any `wrestler_*` files still in `res/drawable-nodpi/` into that folder. The app still reads a `wrestler_<name>` file left in `res/drawable-nodpi/` when there is no copy.

*Note: Any image file you provide in `branding-private/` overrides the generic version. Any file you omit automatically falls back to the generic build artwork.*

---

## Custom App Name Label

By default, the generic build app name is **"TV Viewer"**. To customize the app title on your TV home screen, create `branding-private/res/values/strings.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">Stardom</string>
</resources>
```

---

## How to Build with Your Private Branding

1. Add your files to `branding-private/res/drawable-nodpi/` and `branding-private/res/values/strings.xml`.
2. Open Android Studio and click **Build** ➔ **Clean Project**.
3. Click **Build** ➔ **Generate App Bundles or APKs** ➔ **Build APK(s)** (or click the green **Run** button).
4. Gradle will automatically detect `branding-private/res` and compile the APK with your custom logos and app title!
