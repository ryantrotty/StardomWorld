# Roster file (no new APK needed)

Tag teams, factions, faction members (and so Current Wrestlers) and past wrestlers can be changed without a new app build. The app reads `roster.json` from the **roster-data** branch:

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
  },
  "factions": {
    "remove": ["club-venus"],
    "set": [
      { "id": "new-faction", "name": "New Faction", "founded": "2026", "captain": "Wrestler A", "search": "New Faction",
        "members": [{ "name": "Wrestler A", "search": "Wrestler A", "ja": "..." }] }
    ],
    "members": {
      "stars": { "add": [{ "name": "Wrestler B", "search": "Wrestler B", "ja": "..." }], "remove": ["Wrestler C"] }
    }
  },
  "past": {
    "add": [{ "name": "Wrestler C", "search": "Wrestler C", "ja": "..." }],
    "remove": ["Wrestler D"]
  }
}
```

Every section is optional; leave out what you are not changing.

## Match types (private builds' categories)

```json
"matchTypes": { "stargp": { "search": "STARS", "alts": ["5★STAR"] }, "champ": { "none": ["挑戦者決定|next\\s*challenger"] } }
```

Each key is a match type id from `assets/match_types.json`; its fields replace the bundled ones (search, alts, all, none, factionSearch, tagBelt). Patterns are regular expressions, ignoring case.

## Tag League

```json
"tagLeague": {
  "2026": {
    "name": "16th Goddesses of Stardom Tag League", "ja": "第16回 ゴッデス・オブ・スターダム〜タッグリーグ戦〜",
    "dates": "1 to 29 Nov 2026",
    "winners": "2025 winners: Sakurara", "winnersJa": "2025年優勝: さくらら",
    "prevWinners": { "year": 2025, "team": ["Sakura Aya", "Sayaka Kurara"] },
    "winnerTeam": null,
    "blocks": [
      { "id": "blue", "name": "BLUE GODDESSES", "ja": "ブルーゴッデス", "teams": [["Suzu Suzuki", "Rina Yamashita"], ...] },
      { "id": "red", "name": "RED GODDESSES", "ja": "レッドゴッデス", "teams": [["Sakura Aya", "Sayaka Kurara"], ...] }
    ]
  }
}
```

- One entry per year; a year in the roster file replaces that year whole. The newest year drives the shelf bar, the Tag League chip and the wings on the shelf.
- Teams are pairs of names, matched to tag teams on the two members (use the same spellings as the team, e.g. Sakura Aya). A pair that isn't a team yet becomes one; give it a name with `tagTeams.add` if it has one.
- `winnerTeam`: set it when the final is decided; that team gets a WINNERS tag on the Tag League page. `prevWinners` tags last year's winners.

- **add**: same fields as `extra` in `assets/tag_teams.json`. `name` can be `null` for a pair with no team name (shown as the two names). `since` decides the era. `faction` is optional. `aka` is a note of other billings and is not shown. A pair already in the built-in list is replaced by the roster entry, so a pair never appears twice.
- **remove**: pairs to hide, as "A & B" in either order. This also hides a pair that comes from the title histories.
- **spell**, **factionNames**: added to the built-in ones.
- **factions.remove**: faction ids (as in `assets/factions.json`) to take out.
- **factions.set**: whole faction entries with the same fields as `assets/factions.json` (see its `_note`). One with an id that already exists replaces it where it is; a new current faction goes before the former ones, a new former faction (`"former": true`) at the end. Use this to edit a faction's name, captain, search words, or to mark it former. Logos still come from the private branding folder by id, so a new faction is text-only until its logo is added there.
- **factions.members**: per faction id, `add` members (`name`, `search` = the spelling the video site uses, default the name; optional `ja`) and `remove` them by name. Adding a name already in that faction replaces it. These apply after `set`.
- **Current Wrestlers** has no section of its own: it is everyone in the current factions, Unaffiliated included. To move a wrestler, remove her from one faction and add her to another; when she leaves Stardom, remove her and add her to `past`.
- **past.add** / **past.remove**: the past wrestlers list (`name`, `search`, `ja`), by name.
- Use the app's spellings (`assets/factions.json`), e.g. Sakura Aya, Hanako, Waka Tsukiyama, Fuwa Chan. Teams match on their two members, ignoring case and order.

The All Tag Teams page shows which roster file the TV is using, under the team count.
