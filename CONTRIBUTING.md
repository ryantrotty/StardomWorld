# Contributing

Thanks for helping! This is a small hobby project, so keep things simple.

## Report a problem
Open an issue using the **Bug report** template. The most useful details are the app version
(Settings > Apps on the TV, or the release name), your TV model, and which page you were on.
A photo or screenshot helps a lot. **Never post your password, cookies or account details.**

## Suggest a feature
Open an issue using the **Feature request** template and describe what you'd like to do with the remote.

## Send a change
1. Fork the repository and create a branch with a descriptive name, for example `fix-favorites-focus-ring`.
2. Make a focused change. One feature or fix per pull request is much easier to review.
3. Build it in Android Studio (Build > Generate App Bundles or APKs > Generate APKs) and try it on an emulator
   or a TV.
4. Bump `versionCode` and `versionName` in `app/build.gradle.kts` and add a line to `CHANGELOG.md`.
5. Open a pull request and fill in the template. GitHub Actions will check that it builds.

## Tips for working on the code
- Most of the app is JavaScript and CSS stored as Kotlin raw strings (`"""..."""`) in `MainActivity.kt`.
  Do **not** use a `$` followed by a letter or `{` inside them, because Kotlin treats that as a template.
- The site's markup changes occasionally, so prefer broad selectors with fallbacks over very specific ones.
- Do not add artwork you do not have the rights to use. Personal artwork goes in `branding-private/`
  (see `docs/PRIVATE_BRANDING.md`) and is never committed.
- Do not add anything that stores or sends account credentials.
