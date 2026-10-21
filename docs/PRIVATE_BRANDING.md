# Using your own artwork (kept out of git)

The public repository ships **generic placeholder** images (a gold star and the words "TV VIEWER").
If you want your own icon, banner or logos in *your* builds, put them in a folder that git ignores:

```
branding-private/
  res/
    drawable-nodpi/
      ic_launcher.png   app icon (512 x 512)
      banner.png        Android TV home-screen banner (about 1000 x 562)
      header_logo.png   logo injected into the site header (about 1100 x 200, transparent)
      splash_logo.png   launch splash image (about 1100 x 271, black background)
```

```
branding-private/
  res/
    values/
      strings.xml       optional: your own app name (see below)
```

- Use the **same file names** as in `app/src/main/res/drawable-nodpi/`. Any file you provide
  replaces the generic one; any you leave out falls back to the generic one.
- `branding-private/` is listed in `.gitignore`, so it is never committed or pushed.
- The folder sits at the top level of the project, next to `app/` and `gradle/`.
- After adding or changing files, run **Build > Clean Project**, then build as usual.
- Please only use artwork you have the right to use, and don't publish it.

## Your own app name

The generic build is called "TV Viewer". To label your own build differently, create
`branding-private/res/values/strings.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">Your App Name</string>
</resources>
```
