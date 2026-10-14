# Stardom (Google TV / Android TV app)

A small personal app that opens stardom-world.com full-screen on your Google TV,
with its own icon in the apps row.

It does not store your username or password. Sign in once on the site itself;
the app keeps the session cookie between launches.

## 1. Build the APK

1. Install Android Studio and open this folder.
2. Let Gradle sync (accept any "upgrade plugin" prompts).
3. Build > Build Bundle(s) / APK(s) > Build APK(s).
4. The file is at `app/build/outputs/apk/debug/app-debug.apk`.

## 2. Install it on the TV

1. On the TV: Settings > System > About, press OK on "Android TV OS build" seven times.
2. Settings > System > Developer options: turn on **USB debugging** and
   **Wireless debugging** (or "ADB debugging").
3. Find the TV's IP address (Settings > Network).
4. On your computer (with Android platform-tools installed):

       adb connect <tv-ip>:5555
       adb install app-debug.apk

   Accept the prompt on the TV the first time.
5. Open **Stardom** from the apps row (it may be under "All apps").

No computer handy? Copy the APK to a USB drive and install it with a file
manager app such as "Send Files to TV" or "X-plore".

## Remote control

- Arrows / OK: the WebView's built-in directional navigation moves between
  links and buttons.
- Back: leaves fullscreen video, then goes back a page, then closes the app.
- Play/Pause, Rewind, Fast-forward: control the first video on the page
  (rewind and fast-forward jump 10 seconds).

## Changing the start page

`gradle.properties` holds `tvhub.startUrl`. Change it and rebuild to open a
different address.

## Limits

- A WebView has no built-in "translate page" feature. If you need English,
  open the site in a TV browser with page translation instead, or add a
  translation script to the app later.
- Sites that require DRM-protected playback may not play in a plain WebView.
- The icon and banner use Stardom artwork, so keep this app for your own
  sideloaded use rather than publishing it.
