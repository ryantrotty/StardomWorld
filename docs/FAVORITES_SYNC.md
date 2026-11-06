# Favorites sync (private builds)

Private builds that have the video index log set up (docs/VIDEO_INDEX_LOG.md) also share one set of favorites between TVs, through a `favorites` tab in the same Google Sheet. It uses the same script, address and key.

## What is shared

- **Favorites (`tvFavV1`):** wrestlers, factions (the first is My Faction), Watch Later, saved matches and shows, and playlists with their videos.
- **Show reminders (`tvSchedRemV1`).**
- **Owned PPVs:** the ones the app has seen play for more than 5 seconds (kept in the app's own settings, not the web page), and the ones marked bought by hand on a show's details page (`tvPpvBoughtV1`). Each counts only until its replay window ends (the schedule's replay end, else 14 days after the show), the same rule My Favorites uses. An expired PPV isn't sent; once one expires it's marked removed in the sheet and cleared from every TV.

Things that only make sense on one TV stay local, such as the recently watched count or the last live card.

## Starting

1. **Update the script:** paste the new `scripts/video_index_log.gs` into Apps Script, then use **Deploy > Manage deployments > Edit > Version: New version > Deploy**. The address stays the same. An out-of-date script answers "bad action".
2. **On the main TV:** in the Account menu, choose **Send this TV's favorites to sync** and press OK twice (the first press asks you to confirm). This replaces the sheet's favorites with that TV's set.
3. **On other TVs:** the first time the app starts, a TV takes the sheet's copy in place of its own favorites. Nothing is merged at the start. Until the main TV has sent, other TVs wait and change nothing.

Sending again from a TV later replaces the sheet's set once more, and every other TV takes the new set on its next sync.

## From then on

- **One row per item:** each favorite is one row in the sheet: a wrestler, a faction, a video, a playlist, one video in a playlist, a reminder or an owned PPV. A removal is kept as a row marked removed, so a favorite deleted on one TV doesn't come back from another.
- **Sending changes:** a TV notices a change within 3 seconds and sends it about 3 seconds later.
- **Picking up changes:** when the app starts, and every minute while it's open, each TV asks the sheet for changes since its last sync. The sheet keeps a counter for this, so TV clocks don't need to agree.
- **Newest change wins:** if two TVs change the same item, the later change is kept.
- **Offline:** changes made without a connection wait on the TV and are sent when it's back online, at the latest when the app next starts.
- **Status:** the My Favorites page shows a small line next to its title: "Synced 2 min ago", "Sync waiting: …", or "Not synced: …" in red.

The key is added by the app's own code, never by the web page.
