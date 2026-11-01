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

Two accent colours: gold for lines and text, orange for fills. Open decision: five focus looks, aim to reduce to three.

Fallback for anything not covered above: a single 3 px #F4C242 outline, 2 px offset, no halo.

## Type

Arial for everything the app draws; Roboto on login and in native views. Scale (px): 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 28 30 54. Weight carries hierarchy: 600 items, 700 buttons and titles, 800 to 900 emphasis. Labels are uppercase with 1 px spacing.

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

## Shape

Radius (px): 4 tags, 8 small buttons and list items, 10 player and filter buttons, 12 to 14 panels and tiles, 16 login fields, 20 chips, 36 guide pill.

## Focus looks

| Look | Where | Spec |
| --- | --- | --- |
| A Border | Menus, shelf, drop-down items, details buttons | Border to #F4C242, fill #172029 |
| B Fill | Player bar, filters, chips | Fill and border #FFB347, text #1A1A1A |
| C Ring | Video cards, hero, home tiles | 3 px #F4C242 outline, 2 px offset, glow, 1.03 lift |
| D Form | Login | Input 6 px gold border; button orange fill, white border, no halo |
| E Gold frame | Wrestler cards (My Favorites) | Dark frame at rest; whole frame turns solid #F4C242, lifts 1.06, glows |

## Exceptions (do not "fix" these without deciding)

- PPV purple for the PPV tag, tile border and step badges; status tag gold, red when live.
- Live red for the live tile border, Watch button, LIVE tag.
- Done green for a completed step badge.
- PPV tile with poster is half width with a 21 px title.
- Live and PPV tiles show the gold ring on focus with no lift; the related-videos row has no lift; the hero is never dimmed.
- Wrestler cards use look E (the old rainbow border hid the gold focus).
- Shelf Left/Right goes straight across a row first, then falls back to the nearest item.
- Account menu has an Instructions link that reopens the first-run guide (buttons read Close and Done).
- Details buttons change border only on focus; the selected state is a gold fill.
- Login and guide use Roboto and thick borders.
- PPV player bar: no Quality button, caption slot is the language button, scaled by width / 1440, auto full screen after 8 s.
- Native overlay and guide use Android sp and the system font.
- Scrollbars are hidden on the menu, shelf and drop-downs.

## Checking the code

Run `python3 scripts/audit_design.py` for the report (add `--all` for every occurrence, `--strict` to fail on findings).
