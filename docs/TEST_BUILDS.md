# Test builds

Every push to any branch builds the app on GitHub and updates one rolling download:

    https://github.com/ryantrotty/StardomWorld/releases/download/test-build/app-debug.apk

The release page says which branch and commit the file came from.

## Installing on a Fire TV / Google TV

1. Install the **Downloader** app (free) from the app store.
2. Allow it to install unknown apps when asked.
3. Open Downloader, enter the link above, then Install.

Test builds from GitHub are signed with a fixed public debug key, so each new test build installs over the
previous one. The first time, uninstall any copy that was built on your own computer (different key).
