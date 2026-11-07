# Usage metrics (PostHog)

The app can send anonymous usage events to [PostHog](https://posthog.com) so its **Web analytics** dashboard shows
unique visitors, page views, time on page, entry and exit pages, and session length. The code is
`app/src/main/java/com/example/tvhub/Metrics.kt`; there is no extra library.

Metrics are **off** until a PostHog project key is set, so a build without a key sends nothing.

## Turning it on

1. Make a free PostHog Cloud account and a project. Copy the project key (starts with `phc_`) from
   Project settings → General. Note whether the project is in the US or EU region.
2. Put the key in one of these places:
   - **Your own builds only:** `branding-private/posthog.properties` (git-ignored):
     ```
     key=phc_yourkey
     host=https://us.i.posthog.com
     ```
     Use `host=https://eu.i.posthog.com` for an EU project. `host` can be left out for US.
   - **Every build, including the GitHub test builds and community builds:** add
     `tvhub.posthogKey=phc_yourkey` (and `tvhub.posthogHost=…` for EU) to `gradle.properties`.
     A PostHog project key can only send events, not read them, so it is meant to sit inside apps,
     but anyone could copy it from the public repo and send junk events to your project.
3. Build and open a few pages. Events show up under **Activity** within a minute, and in **Web analytics**
   (pick the `stardom-world.com` domain if asked).

## What is sent

Only to the PostHog host. Never to stardom-world.com or Stagecrowd, and no extra page loads.

| Event | When |
| --- | --- |
| `$pageview` | The WebView moves to a new address (a reload of the same page is not counted again). |
| `$pageleave` | The app goes to the background (Home, TV off, another app). |

Each event carries:

- `distinct_id`: a random id made on first launch, so one visitor = one TV or Firestick install. No account,
  email or sign-in data. Person profiles are not created (`$process_person_profile` is false).
- `$session_id`: a new session after 30 minutes with no page change or key press, or after 30 minutes away.
- `$pathname`, `$current_url`, `$host`: a readable page name (below). Query strings are dropped.
- `$prev_pageview_pathname`, `$prev_pageview_duration`: the page before and how many seconds it was on screen.
  This is where **time on page** comes from. Time in the background is not counted.
- `page_section` (home, video, faction, era, …), `search_term` on search pages, `build_type` (private or public),
  `device_kind` (Fire TV or Google TV), `app_language` (the app's EN / JA switch), app version, Android version
  and TV model.

## Error tracking

Errors go to PostHog's **Error tracking** as `$exception` events, with the same anonymous id, page name, build type,
TV model and app version as the page views. Free tier: 100,000 exceptions a month.

- **App crashes:** the error and its stack trace are saved on the TV the moment the app crashes and sent the next
  time it opens (`$exception_level` fatal). Frames in the app's own code are marked as app frames.
- **Page script errors:** a small hook in every page (`errorHookJs` in MainActivity) passes script errors and
  unhandled promise rejections to `AndroidHost.reportJsError`. Only errors from the app's own injected scripts are
  sent: they run without a web address (`<anonymous>` in the stack). The site's and Stagecrowd's own script errors
  are left out. Each distinct error is sent once per app run, at most 20 a run (10 per page).
- Errors are only collected when a PostHog key is set.

## Page names

The app's own pages ride on site addresses with `tv…` markers; they get `/app/…` names:

| Address | Page name |
| --- | --- |
| `/mypage?tvfav=1` / `?tvfav=wrestlers` | `/app/my-favorites` / `/app/my-favorites/wrestlers` |
| `/mypage?tvrecent=1` | `/app/recently-watched` |
| `/mypage?tvteams=1` / `?tvteam=<id>` | `/app/tag-teams` / `/app/tag-team/<id>` |
| `/mypage?tvtop=<kind>[&e=<era>]` | `/app/top-rated/<kind>[/<era>]` |
| `?tvch=<belt>` / `&tvrn=` / `&tvb=` | `/app/championship/<belt>` / `…/reign` / `/app/championship-videos/<belt>` |
| `&tvfaction=<name>` | `/app/faction/<name>` |
| `&tvera=0` / `&tvera=<era>` | `/app/years-and-eras` / `/app/era/<era>` |
| `&tvcomm=1[&tvcw=<w>]` / `&tvcomm=coll` | `/app/community[/<w>]` / `/app/community/collections` |
| `&tvev=1[&tvsh=<show>]` | `/app/events` / `/app/show/<show>` |
| `&tvmt=<type>` | `/app/match-type/<type>` |
| `/contents/search?q[keyword]=…` | `/search` (the words go in `search_term`) |
| Stagecrowd (PPV) pages | `/ppv/<path>` on host `stagecrowd.live`, path only |
| Any other site page | its path, e.g. `/contents/12345` for a video |

When a new app page is added with a new `tv…` marker, add it to `appPage()` in `Metrics.kt` and to this table.

## Sending

Events wait in memory and go out together in one request: 30 seconds after the last page change, at 20 events,
and when the app goes to the background. If the network is down they are kept (newest 300) and sent next time.
PostHog's free tier is 1 million events a month; a page change is one event.
