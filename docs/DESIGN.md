# Stardom TV app: design spec

Master reference for how the app looks. Written from the code at 2.11.5 and not yet checked on a TV. Edit this file to change a convention, then bring the code into line. `scripts/audit_design.py` compares the code to the token lists below, so keep the two in step.

Visual versions: the published style guide page and the "Stardom TV App — Design System" doc (ask for the links).

## Rules that hold everywhere

- One focus highlight per element. Never a double outline.
- Everything works with arrows, OK and Back.
- Debug output stays on screen.
- English and Japanese are both first class.
- Site layout: 1440 px wide, 24 px side padding.

## Colour tokens

| Token | Hex | Use |
| --- | --- | --- |
| Gold | #F4C242 | Borders, rings and glows, text (dates, headings, selected) |
| Orange | #FFB347 | Fills: button focus, progress, guide pill, login button focus |
| Ink on accent | #1A1A1A, #111 | Text on any gold or orange fill |
| Black / navy | #000, #0B1118 | Login and splash; details and QR |
| Menu / panel | #0F151C, #121922 | Menu; shelf and drop-down |
| Card / focused row | #161F2A, #141A22, #172029 | Rows, steps; focused fill |
| Border / track | #2A323C, #3B4656 | Lines; progress track |
| Text | #FFFFFF, #C9D2DC, #9AA6B4 | Title, description, fine print |
| Error | #FF7A66 | Login failures |
| Live red | #D62839 (hover #E8374A, text #FF6B78) | Live only |
| PPV purple | #7B5CFF (text #B6A4FF) | PPV only |
| Done green | #2E9E5B | Completed step |
| Tinted fills | #2A2410, #2A2210, #2A1C10, #1C1740 | Login focus, favorites, PPV tile gradient |
| Paper ticket | #F3E2B8 (paper), #2A1C10 (text), #6B4A26 (small text) | My Favorites reminder tickets |

Two accent colours: gold for lines and text, orange for fills. Open decision: five focus looks, aim to reduce to three.

Fallback for anything not covered above: a single 3 px #F4C242 outline, 2 px offset, no halo.

## Type

Arial for everything the app draws; Roboto on login and in native views. Scale (px): 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 28 30 40 54. Weight carries hierarchy: 600 items, 700 buttons and titles, 800 to 900 emphasis. Labels are uppercase with 1 px spacing.

| Role | Size / weight |
| --- | --- |
| Display (JP login title) | 54 / 900 gold |
| Page title | 26 to 30 / 700 to 900 |
| Row heading | 22 / 700 |
| Nav item / sub-item | 25 / 600; 23 / 500 |
| Thumbnail card title | 15 / 700, max 4 lines |
| Show tile title | 19 / 700, max 2 lines |
| Button | 15 to 21 / 600 to 700 |
| Description | 14 to 18 |
| Label / eyebrow | 11 to 13 / 700 to 800 |
| Faction band name | 40 / 900 (1 faction), 30 (2), 22 (3 to 6) |
| Ticket date or days number | 40 / 900 on the stub; title 23 / 800 |

## Shape

Radius (px): 4 tags, 8 small buttons and list items, 10 player and filter buttons, 12 to 14 panels and tiles, 16 login fields, 20 chips, 36 guide pill.

## Focus looks

| Look | Where | Spec |
| --- | --- | --- |
| A Border | Menus, shelf, drop-down items, details buttons | Border to #F4C242, fill #172029 |
| B Fill | Player bar, filters, chips | Fill and border #FFB347, text #1A1A1A |
| C Ring | Video cards, hero, home tiles, My Favorites faction bands and reminder tickets | 3 px #F4C242 outline, 2 px offset, glow, 1.03 lift |
| D Form | Login | Input 6 px gold border; button orange fill, white border, no halo |
| E Gold frame | Wrestler cards (My Favorites) | Dark frame at rest; whole frame turns solid #F4C242, lifts 1.06, glows |

## Exceptions (do not "fix" these without deciding)

- PPV purple for the PPV tag, tile border and step badges; status tag gold, red when live.
- Live red for the live tile border, Watch button, LIVE tag.
- Done green for a completed step badge.
- PPV tile with poster is half width with a 21 px title.
- Live and PPV tiles show the gold ring on focus with no lift; the related-videos row has no lift; the hero is never dimmed.
- Wrestler cards use look E (the old rainbow border hid the gold focus).
- My Favorites top: "My Faction" shows one to six faction bands on white logo tiles (1 faction full width, 2 half, 3 to 6 a third each, two rows at most; the Open pill is shown for 1 and 2). "My Reminders" shows two paper tickets: a stub (purple PPV days left, red for the last 24 hours or live, gold for a show date) beside cream paper with the time in local time. An owned PPV comes first, then reminders; one ticket is topped up with the next show that has no reminder. A PPV counts as owned once the app has seen its replay play for 5 seconds on this TV.
- Shelf Left/Right goes straight across a row first, then falls back to the nearest item.
- Account menu has an Instructions link that reopens the first-run guide (buttons read Close and Done).
- Details buttons change border only on focus; the selected state is a gold fill.
- Login and guide use Roboto and thick borders.
- PPV player bar: no Quality button, caption slot is the language button, scaled by width / 1440, auto full screen after 8 s.
- Native overlay and guide use Android sp and the system font.
- Scrollbars are hidden on the menu, shelf and drop-downs.

## Checking the code

Run `python3 scripts/audit_design.py` for the report (add `--all` for every occurrence, `--strict` to fail on findings).

## Championship lineage page

`/mypage?tvch=<id>` (assets/lineage.js). Page title 30/900 with a 10 x 36 gold bar. Section headers use the My Favorites header style (15/800, .14em, gold). The lineage strip is a chip row: a focused or chosen reign uses focus look B (orange fill, dark text). Video cards are the My Favorites video card (look C ring), with a gold date badge top-right and a TITLE WIN (orange) or PPV (purple) tag top-left. The matching debug block uses 13px Arial in a #0F151C panel with a 2px #2A323C border and stays on screen. The menu shelf World of Stardom card uses the shelf item focus (look A).

Reign detail (2.13.4): the title win and defences are fact rows (#161F2A, radius 8, 15px, not focusable). The videos are one horizontal row like the home and related rows: heading 22/700 with the 8 x 26 gold bar, gap 24, four cards across (25% minus 18 px), sideways scroll, video card #1a1a1a radius 8, title 15/700 (4-line clamp), gold date badge top-right, orange THIS REIGN tag top-left, focus look C.

Strip order (2.13.5): newest reign on the left, current champion focused on open. Right moves to an older reign. Videos for a reign other than the current one load on OK.

Tag and trios titles (2.14.2): the champion box shows the team name, a middle dot and the members; the strip chips show the team name (when it fits). No new colours or focus looks.

Championships submenu (2.15.0): two columns, width 1000. Column 1 is Stardom lineage cards (110 x 60 belt, 17/700 title, 14/600 champion, 12/700 gold day count); column 2 is New Japan then Other Promotions as plain items. Cards use the shelf A Border focus look; no new colours.

Championships submenu (2.15.1): Stardom cards in a 2 x 4 grid; New Japan (1 column) and Other Promotions (2 columns) in a row below. Replaces the two-column layout from 2.15.0.

Faction home (2.16.0): a Faction home row heads the member list. The home screen has the logo (max 300 x 190), name 44/800, FOUNDED / CAPTAIN / MEMBERS labels (13/700 grey over 22/700 white), TITLES HELD cards (belt 120 x 66, 19/700, 15/600, 13/700 gold; two columns) and a three-column FACTION MATCHES grid. Factions submenu: cards in the Championships card style (17/700 name, 13/600 captain line, 13/700 gold titles line). Single gold focus look throughout.
