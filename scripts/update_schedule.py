#!/usr/bin/env python3
"""Builds schedule.json from wwr-stardom.com (run once a day by .github/workflows/schedule.yml).

Reads this month's and next month's schedule pages (2 requests), then each upcoming event page that does not
yet have a start time (or all of them with --full). Pay-per-view shows (sold and streamed by Stagecrowd) are found
from Stardom's own PPV news category: each new post names its show, price, sale dates, replay end and the overseas
(Stagecrowd) purchase link. Requests are spaced 1.5 s apart. Times on the site are Japan
time (+09:00). Anything the page doesn't give is kept from the previous file, so a layout change can only stop
updates, never wipe the list. Exits with an error (so the job turns red) when the month pages show no events.
"""
import argparse, datetime, html, json, re, sys, time, urllib.parse, urllib.request

BASE = "https://wwr-stardom.com"
UA = "StardomWorldTVApp-schedule/1.0 (unofficial fan app; once a day; contact via GitHub ryantrotty/StardomWorld)"
JST = datetime.timezone(datetime.timedelta(hours=9))
_last = [0.0]


def get(url):
    wait = 1.5 - (time.time() - _last[0])
    if wait > 0:
        time.sleep(wait)
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "en"})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = r.read().decode("utf-8", "replace")
    _last[0] = time.time()
    return data


def text_of(page):
    page = re.sub(r"(?is)<(script|style).*?</\1>", " ", page)
    page = re.sub(r"(?s)<[^>]+>", " ", page)
    return re.sub(r"\s+", " ", html.unescape(page)).strip()


def event_links(month_html):
    seen, out = set(), []
    for m in re.finditer(r'href="(?:https://wwr-stardom\.com)?/en/schedule/(\d{8}-[A-Za-z0-9_-]+)/?"', month_html):
        if m.group(1) not in seen:
            seen.add(m.group(1))
            out.append(m.group(1))
    return out


def hm(txt, label):
    m = re.search(label + r"[^0-9]{0,40}?(\d{1,2}):(\d{2})", txt, re.I)
    return (int(m.group(1)), int(m.group(2))) if m else None


def iso(day, t):
    if not t:
        return None
    return "%sT%02d:%02d:00+09:00" % (day, t[0], t[1])


def parse_event(eid, page):
    day = "%s-%s-%s" % (eid[0:4], eid[4:6], eid[6:8])
    txt = text_of(page)
    title = None
    for pat in (r"(?is)<h2[^>]*>(.*?)</h2>", r'(?is)<meta property="og:title" content="([^"]+)"', r"(?is)<title>(.*?)</title>"):
        m = re.search(pat, page)
        if m:
            t = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", m.group(1)))).strip()
            t = re.sub(r"\s*\|.*$", "", t)
            t = re.sub(r"\s*Ticket Information.*$", "", t)
            if t and t.lower() not in ("ticket details", "tickets"):
                title = t
                break
    start = hm(txt, r"(?:main event start|match start|start)")
    doors = hm(txt, r"(?:venue opens|doors open|doors)")
    fc = hm(txt, r"priority entry")
    poster = None
    for m in re.finditer(r"https?://wwr-stardom\.com/wp/wp-content/uploads/[^\"' )<>]+\.(?:jpg|jpeg|png|webp)", page, re.I):
        if "sns" not in m.group(0).lower():
            poster = m.group(0)
            break
    venue = None
    m = re.search(r"(?<!\w)Venue(?! opens)\s*[:\uff1a]\s*(.{3,70}?)(?:\s+(?:Address|Tel|Access|Doors|Ticket)\b|$)", txt)
    if m:
        venue = m.group(1).strip()
    mm = re.search(r'href="(?:https://wwr-stardom\.com)?(/en/event/[A-Za-z0-9_/-]+?)/?"', page)
    matchurl = (BASE + mm.group(1) + "/") if mm else None
    other = bool(re.search(r"other (?:organization|group|promotion)", txt[:400], re.I))
    return {"day": day, "title": title, "start": iso(day, start), "doors": iso(day, doors), "fc": iso(day, fc),
            "poster": poster, "venue": venue, "other": other, "matchurl": matchurl}


def _clean(x):
    x = html.unescape(re.sub(r"<[^>]+>", " ", x))
    x = re.sub("[\u200b\u200c\u200d\ufeff]", "", x)
    return re.sub(r"\s+", " ", x).strip()


def _tidy(name):
    """Roster names sometimes repeat a word or SHOUT a surname: 'HANAKO HANAKO' -> 'HANAKO', 'SAYA KAMITANI' -> 'Saya Kamitani'."""
    w = name.split()
    w = [x for i, x in enumerate(w) if i == 0 or x.lower() != w[i - 1].lower()]
    if len(w) > 1:
        w = [x.title() if x.isupper() and len(x) > 1 else x for x in w]
    return " ".join(w)


def parse_roster(page):
    """English fighters page -> {slug: name}. The match card shows machine-romanised names; the fighter list has the real ones."""
    out = {}
    for m in re.finditer(r'(?is)<a[^>]+href="[^"]*/fighters/([^/"]+)/?"[^>]*>(.*?)</a>', page):
        slug = urllib.parse.unquote(m.group(1))
        nm = _clean(m.group(2)) or _clean(" ".join(re.findall(r'(?i)alt="([^"]*)"', m.group(2))))
        if nm and slug not in out:
            out[slug] = _tidy(nm)
    return out


def _side_names(seg, roster=None):
    """One side of a match -> "A & B". One name per list item; real names come from the roster by link, else the shown text."""
    items = re.findall(r"(?is)<li[^>]*>(.*?)</li>", seg) or re.findall(r"(?is)<a[^>]*>.*?</a>", seg)
    names = []
    for it in items:
        nm = _clean(it)
        mm = re.search(r'href="[^"]*/fighters/([^/"]+)/?"', it)
        if roster and mm:
            nm = roster.get(urllib.parse.unquote(mm.group(1)), nm)
        nm = re.sub(r"\s*\((?:WIN|LOSE|win|lose)\)", "", nm).strip(" ,&")
        if nm:
            names.append(nm)
    if not names:
        names = [re.sub(r"\s*\((?:WIN|LOSE|win|lose)\)", "", _clean(seg)).strip(" ,&")]
    return " & ".join(n for n in names if n)[:160]


def parse_matches(page, roster=None):
    """Match card page -> [{"type": "Tag Match", "sides": ["A & B", "C & D"]}]. Text only (no photos).
    Layout on the site: a heading with the match type, then one list of names per side with a "VS" between them.
    The sides are split at the VS marker in the HTML so that team mates stay together."""
    out = []
    for chunk in re.split(r"(?i)<h[23][ >]", page)[1:]:
        parts = re.split(r"(?i)</h[1-6]>", chunk, maxsplit=1)
        if len(parts) < 2:
            continue
        head = _clean(parts[0].split(">", 1)[-1] if parts[0].lstrip().startswith(("class", "id", "style")) else parts[0])
        body = re.split(r"(?i)<footer|view all|<h[1-6][ >]", parts[1])[0]
        segs = re.split(r"(?i)(?<=>)\s*vs\.?\s*(?=<)", body)
        if len(segs) < 2:
            segs = re.split(r"(?i)\s+vs\.?\s+", body)
        if not head or len(segs) < 2:
            continue
        sides = [_side_names(x, roster) for x in segs]
        sides = [x for x in sides if x]
        if len(sides) >= 2:
            out.append({"type": head[:80], "sides": sides[:4]})
    return out[:14]


_roster = None


def matches_for(url):
    """English card with real names, plus the Japanese card (kanji names and headings) when it can be read."""
    global _roster
    if _roster is None:
        try:
            _roster = parse_roster(get(BASE + "/en/fighters/"))
        except Exception as ex:
            print("no roster", ex)
            _roster = {}
    ms = parse_matches(get(url), _roster)
    if ms:
        # Japanese page: no /en/, and only the first dash (after the date) becomes an underscore:
        # /en/event/20261101-korakuen/ -> /event/20261101_korakuen/, /en/event/20261111-korakuen-2/ -> /event/20261111_korakuen-2/
        slug = url.rstrip("/").rsplit("/", 1)[-1]
        cands = [slug.replace("-", "_", 1)]
        for sl in cands:
            try:
                jm = parse_matches(get(BASE + "/event/" + sl + "/"))
            except Exception as ex:
                print("no Japanese card at", sl, ex)
                continue
            # The Japanese page can list fewer matches than the English one, so pair them in order and only
            # use a Japanese entry where the number of sides agrees.
            used = 0
            for a, b in zip(ms, jm):
                if len(a["sides"]) == len(b["sides"]):
                    a["type_ja"] = b["type"]
                    a["sides_ja"] = b["sides"]
                    used += 1
            if used:
                break
    return ms


MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"]
_MON = r"(january|february|march|april|may|june|july|august|september|october|november|december)"


def _clock(h, m, ap):
    h, m = int(h), int(m)
    if ap:
        ap = ap.lower()
        if ap == "pm" and h < 12:
            h += 12
        if ap == "am" and h == 12:
            h = 0
    return h, m


def _when(window, year):
    """First "Month D ... hh:mm" found in the text window -> (month, day, hour, minute), or None."""
    d = re.search(_MON + r"\s+(\d{1,2})", window, re.I)
    if not d:
        return None
    return int(MONTHS.index(d.group(1).lower()) + 1), int(d.group(2))


def _times(window):
    return [_clock(m.group(1), m.group(2), m.group(3)) for m in re.finditer(r"(\d{1,2}):(\d{2})\s*([AaPp][Mm])?", window)]


def parse_ppv_post(page):
    """A Stardom PPV news post -> (event id, ppv fields found). Everything is optional; anything not found is simply
    left out, so a post worded differently can only add less, never something wrong.
    Seen wordings: 'from 12:00 on October 26 to 19:00 on November 15, 2026' and 'October 26, 2026 at 12:00 PM
    through November 15, 2026 at 7:00 PM'; 'available until 23:59 on November 15, 2026'."""
    txt = text_of(page)
    m = re.search(r"/en/schedule/(\d{8}-[A-Za-z0-9_-]+)/?", page)
    eid = m.group(1) if m else None
    out = {}
    if not eid:
        return None, out
    year, evm = int(eid[:4]), int(eid[4:6])

    def stamp(month, day, tm):
        y = year - 1 if month > evm + 6 else year + 1 if month < evm - 6 else year   # a Dec show's replay can end in Jan
        return "%04d-%02d-%02dT%02d:%02d:00+09:00" % (y, month, day, tm[0], tm[1])

    pm = re.search(r"(\d[\d,]*)\s*yen\s*\(?\s*(?:including\s+)?tax", txt, re.I)
    fm = re.search(r"(\d[\d,]*)\s*yen\s*(?:system|service|handling)\s*fee", txt, re.I)
    if pm:
        out["price"] = int(pm.group(1).replace(",", ""))
        if fm:
            out["total"] = out["price"] + int(fm.group(1).replace(",", ""))
    sm = re.search(r"(?:sales? (?:period|schedule)|on sale|sales)\b", txt, re.I)
    for sm in re.finditer(r"(?:sales? (?:period|schedule)|on sale|sales)\b", txt, re.I):
        win = txt[sm.start():sm.start() + 260]
        dates = [(MONTHS.index(a.group(1).lower()) + 1, int(a.group(2))) for a in re.finditer(_MON + r"\s+(\d{1,2})", win, re.I)]
        times = _times(win)
        if len(dates) >= 2 and len(times) >= 2:
            out["sale_start"] = stamp(dates[0][0], dates[0][1], times[0])
            out["sale_end"] = stamp(dates[1][0], dates[1][1], times[1])
            break
    am = re.search(r"(?:archive|replay)[^.]{0,80}?(?:until|through|till)\s+(.{0,80})", txt, re.I)
    if am:
        win = am.group(1)
        d = _when(win, year)
        t = _times(win)
        if d and t:
            out["replay_end"] = stamp(d[0], d[1], t[0])
    um = re.search(r'https://intl\.stagecrowd\.live/[0-9A-Za-z_/-]+', page)
    if um:
        out["url"] = um.group(0)
    return eid, out


def discover_ppv(events, seen):
    """Reads the newest posts of Stardom's PPV news category (1 request, plus one per post not read before) and
    adds a "ppv" entry to the matching show. Fields already set (for example by hand) are never overwritten."""
    try:
        listing = get(BASE + "/en/news/news_ppv/")
    except Exception as ex:
        print("ppv news list not read:", ex)
        return 0
    links = []
    for m in re.finditer(r'href="(https://wwr-stardom\.com/en/news/[A-Za-z0-9_-]+/)"', listing):
        u = m.group(1)
        if "news_ppv" in u or "news-ppv" in u or u in links:
            continue
        links.append(u)
    n = 0
    for u in links[:10]:
        if u in seen:
            continue
        try:
            eid, f = parse_ppv_post(get(u))
        except Exception as ex:
            print("ppv post not read", u, ex)
            continue
        if not eid:
            continue
        seen[u] = eid
        e = events.get(eid)
        if not e or not f:
            print("ppv post", u, "->", eid, "(not in the list)" if not e else "(nothing found)")
            continue
        cur = e.setdefault("ppv", {})
        for k, v in f.items():
            if not cur.get(k):
                cur[k] = v
        # the post's date fields were read with the event's own year: fix a sale that began in the previous year
        print("ppv:", eid, json.dumps(f))
        n += 1
    return n


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--prev", default=None, help="previous schedule.json (kept values)")
    ap.add_argument("--out", default="schedule.json")
    ap.add_argument("--full", action="store_true", help="re-read every upcoming event page")
    a = ap.parse_args()
    try:
        prev = json.load(open(a.prev, encoding="utf-8")) if a.prev else {"events": [], "posters": {}}
    except Exception:
        prev = {"events": [], "posters": {}}
    events = {e["id"]: e for e in prev.get("events", [])}
    posters = dict(prev.get("posters", {}))

    now = datetime.datetime.now(JST)
    months = [(now.year, now.month)]
    months.append((now.year + (now.month == 12), 1 if now.month == 12 else now.month + 1))
    ids = []
    for y, mo in months:
        page = get("%s/en/schedule/?ym=%04d%02d" % (BASE, y, mo))
        found = event_links(page)
        print("month %04d%02d: %d events" % (y, mo, len(found)))
        ids += found
    if not ids:
        sys.exit("No events found on the month pages: the page layout may have changed.")

    today = now.strftime("%Y%m%d")
    changed = 0
    for eid in ids:
        if eid[:8] < today:
            continue
        old = events.get(eid)
        soon = (datetime.datetime.strptime(eid[:8], "%Y%m%d").date() - now.date()).days <= 7
        # Posters are kept per show; an event still carrying only the month's poster is read once more to pick its own up.
        if old and old.get("start") and not a.full and not soon and old.get("poster") == eid:
            continue
        try:
            info = parse_event(eid, get("%s/en/schedule/%s/" % (BASE, eid)))
        except Exception as ex:
            print("skip", eid, ex)
            continue
        e = dict(old or {"id": eid, "own": True})
        e["url"] = "%s/en/schedule/%s/" % (BASE, eid)
        e["poster"] = eid[:6]   # the month's poster, until this show's own poster is found below
        if info["title"]:
            e["title"] = info["title"]
            e.setdefault("short", info["title"])
        for k in ("start", "doors", "fc"):
            if info[k]:
                e[k] = info[k]
        if info["venue"]:
            e.setdefault("venue", info["venue"])
        if info["other"]:
            e["own"] = False
        if info["poster"]:
            posters[eid] = info["poster"]       # this show's own poster (the first picture under its title)
            e["poster"] = eid
            posters.setdefault(eid[:6], info["poster"])   # month fallback for older app versions
        if info.get("matchurl") and (soon or not e.get("matches")):
            try:
                ms = matches_for(info["matchurl"])
                if ms:
                    e["matches"] = ms
            except Exception as ex:
                print("no match card for", eid, ex)
        if e.get("start") and e.get("title"):
            events[eid] = e
            changed += 1
    seen = dict(prev.get("ppv_seen", {}))
    try:
        changed += discover_ppv(events, seen)
    except Exception as ex:
        print("ppv discovery skipped:", ex)   # never lets this block the schedule itself
    keep = [e for e in events.values() if e.get("start")]
    keep.sort(key=lambda e: e["start"])
    used = set(e.get("poster") for e in keep) | set(e["id"][:6] for e in keep)
    posters = {k: v for k, v in posters.items() if k in used}   # nothing kept for shows that are gone
    out = {"updated": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
           "note": "Times are Japan time (+09:00). own = a Stardom show.", "posters": posters, "ppv_seen": seen, "events": keep}
    old_json = json.dumps({k: prev.get(k) for k in ("posters", "events", "ppv_seen")}, sort_keys=True)
    new_json = json.dumps({k: out[k] for k in ("posters", "events", "ppv_seen")}, sort_keys=True)
    if old_json == new_json:
        print("no changes")
        out["updated"] = prev.get("updated", out["updated"])   # an unchanged list stays byte-identical (no daily commit)
    json.dump(out, open(a.out, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    print("wrote %s: %d events (%d read)" % (a.out, len(keep), changed))


if __name__ == "__main__":
    main()
