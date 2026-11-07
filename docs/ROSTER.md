# Roster file (no new APK needed)

Tag teams can be added or hidden without a new app build. The app reads `roster.json` from the **roster-data** branch:

`https://raw.githubusercontent.com/ryantrotty/StardomWorld/roster-data/roster.json`

(Change it with the `tvhub.rosterUrl` Gradle property.) Edit the file on that branch, for example in the GitHub web editor, and every installed build picks it up at its next schedule check (when the app comes to the front, at most every six hours). It is one small request to GitHub with the last ETag, so an unchanged file costs almost nothing. It never calls stardom-world.com or wwr-stardom.com. If the download fails, the last good copy stays; with no copy at all, the app uses only the built-in `assets/tag_teams.json`.

## Format

```json
{
  "updated": "2026-11-07",
  "tagTeams": {
    "add": [
      { "name": "Black Swan", "members": ["Momo Watanabe", "Saya Kamitani"], "since": "2026-11-01", "faction": "", "aka": [] }
    ],
    "remove": ["Wrestler A & Wrestler B"],
    "spell": { "Name in a title history": "Name the site uses" },
    "factionNames": []
  }
}
```

- **add**: same fields as `extra` in `assets/tag_teams.json`. `name` can be `null` for a pair with no team name (shown as the two names). `since` decides the era. `faction` is optional. `aka` is a note of other billings and is not shown. A pair already in the built-in list is replaced by the roster entry, so a pair never appears twice.
- **remove**: pairs to hide, as "A & B" in either order. This also hides a pair that comes from the title histories.
- **spell**, **factionNames**: added to the built-in ones.
- Use the app's spellings (`assets/factions.json`), e.g. Sakura Aya, Hanako, Waka Tsukiyama, Fuwa Chan. Teams match on their two members, ignoring case and order.

The All Tag Teams page shows which roster file the TV is using, under the team count.
