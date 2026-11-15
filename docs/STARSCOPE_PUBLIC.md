# Publishing StarScope (2.76.0)

Your build reads StarScope from your sheet. Every other build reads one published file, `starscope.json`, which the
sheet's script writes to a GitHub repository once a day. Public builds show StarScope only when that file says
`"public": true`, so publishing can start long before the 3.0 release.

## What is in the file

The same cards your build gets (who is in each logged video and on which side, the event, round, match number, show,
venue, bell and end times, your average rating) and the Wrestlers list with current, past or guest. Never a result.
Nothing from your watch history, favorites, playback notes, proposals or devices. `vi_public` returns the file without
publishing it, so you can check it.

## Setting it up (once)

1. **Repository.** On GitHub, create a public repository named `starscope-data` with a README (so it has a `main`
   branch). The app reads `https://raw.githubusercontent.com/ryantrotty/starscope-data/main/starscope.json`
   (change it with the `tvhub.starscopeUrl` Gradle property).
2. **Token.** GitHub > Settings > Developer settings > Personal access tokens > Fine-grained tokens > Generate new
   token. Repository access: **Only select repositories** > `starscope-data`. Permissions: **Contents: Read and write**,
   nothing else. Copy the token. It can't touch the app's code.
3. **Script properties.** In the sheet's Apps Script, Project Settings > Script properties, add:
   - `GH_TOKEN`: the token
   - `GH_REPO`: `ryantrotty/starscope-data`
   - `STARSCOPE_PUBLIC`: `false` for now
4. **Script.** Paste `scripts/video_index_log.gs` over `Code.gs` and publish a new version as usual.
5. **First run.** In the editor, choose `publishStarscope` and press Run. Allow the new permission it asks for
   (connecting to an outside service: GitHub). The log shows "published N videos", and the file appears in the repo.
6. **Daily.** Choose `setupPublishTrigger` and press Run once. From then on it publishes every day between 4 and 5 am,
   and only when something changed.

## Switching it on for public builds

Set `STARSCOPE_PUBLIC` to `true` and run `publishStarscope` (or wait for the next day). Public builds pick the file up
at their next schedule check (when the app comes to the front, at most every six hours). Set it back to `false` to hide
StarScope again.

## The three switches in the app

| Switch | What it covers | Who has it |
| --- | --- | --- |
| Reading (`scopeReadOn`) | StarScope button and results, video cards, Shows, the player's fight card, card rail and Skip Entrances, Wrestlers Current / Past / Guests | Your build (sheet); other builds once the file is public |
| Logging (`scopeLogOn`) | The logger panel, the phone link, Log next | Your build |
| Private sync (`sheetOn`) | Favorites sync, team match lists, Recently Watched, the video log | Your build, always |
