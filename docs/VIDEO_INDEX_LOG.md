# Video index log (private builds)

The private build reads each video page it opens (`app/src/main/assets/videoindex.js`). With a log address set up, the app sends that record to a Google Sheet, so the index builds up as videos are watched and can be analysed later. The analysis is the point: which facts the site gives, in which formats, and how to index matches from them.

What is sent: only public page facts. That's the video and set numbers, the match number, titles, line-ups, teams and notes, the show, its date and venue, tags, access and the thumbnail address, plus the description lines as they appear. No account, cookie, viewing history or device details are sent. The log address and key live only in your git-ignored `branding-private` folder and inside the app's own code, never in the web page, so the public repo and test builds have neither. Without them, nothing leaves the TV.

## Setting it up (once, in your Google account)

1. Create a new Google Sheet, for example "Stardom video index". Leave it empty: the script makes a `videos` tab with the column headings.
2. In the sheet, open **Extensions > Apps Script**. Delete what is in `Code.gs` and paste the whole of `scripts/video_index_log.gs` from this repo. Save.
3. In Apps Script open **Project Settings** (the gear), scroll to **Script properties**, add a property named `KEY`, and paste the value of `key=` from `branding-private/video_index.properties` (already filled in with a random key). Save.
4. Click **Deploy > New deployment**, choose the type **Web app**, and set:
   - Execute as: **Me**
   - Who has access: **Anyone** (the app has no Google sign-in; the key is what keeps others out)

   Click **Deploy**, allow the permissions Google asks for (the script only reads and writes this sheet), and copy the **Web app URL** (it ends in `/exec`).
5. Paste that address after `url=` in `branding-private/video_index.properties`.
6. Build the private app in Android Studio as usual. Each video page you open is sent in the background; rows appear in the sheet's `videos` tab. (Up to 2.26.0 a panel on the page showed each result. It is gone since 2.26.1; the last result is kept on the TV in localStorage as `tvVideoIndexLast`.)

If you edit the script later, publish the change with **Deploy > Manage deployments > Edit > Version: New version**, so the address stays the same.

## How the app sends

- Once the page has been read, it hands the record to the app (`AndroidHost.videoIndexPut`). The app adds the key and posts it to the log in the background.
- A video is sent again only when what was read has changed, or after 30 days. There are at most 300 sends a day. A page where nothing was read is not sent.
- The sheet keeps one row per video: the newest copy, plus first seen, last seen and times seen.

## Reading the log (for analysis)

`python3 scripts/video_index_pull.py` downloads every row to `branding-private/video_index_export.json` (git-ignored) and prints how many videos have each field filled in, and how many there are per year. It uses the same key; the key is never printed.
