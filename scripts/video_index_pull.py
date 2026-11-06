#!/usr/bin/env python3
"""Pulls every row of the private video index log (docs/VIDEO_INDEX_LOG.md) and prints a short summary.
With --teams it pulls the tag team match lists instead (docs/TEAM_MATCH_LISTS.md).

Reads the log address and key from branding-private/video_index.properties and writes the rows to
branding-private/video_index_export.json (both git-ignored). The key is never printed.
Usage: python3 scripts/video_index_pull.py [--teams] [--out FILE]
"""
import argparse, collections, json, pathlib, sys, urllib.request

root = pathlib.Path(__file__).resolve().parent.parent
props_file = root / 'branding-private' / 'video_index.properties'


def props():
    out = {}
    if not props_file.exists():
        sys.exit('No %s: see docs/VIDEO_INDEX_LOG.md' % props_file.relative_to(root))
    for line in props_file.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, v = line.split('=', 1)
            out[k.strip()] = v.strip()
    if not out.get('url') or not out.get('key'):
        sys.exit('video_index.properties needs url= and key=')
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--teams', action='store_true', help='pull the tag team match lists')
    ap.add_argument('--out', default=None)
    a = ap.parse_args()
    if not a.out:
        a.out = str(root / 'branding-private' / ('team_matches_export.json' if a.teams else 'video_index_export.json'))
    p = props()
    body = json.dumps({'key': p['key'], 'action': 'tm_export' if a.teams else 'export'}).encode()
    req = urllib.request.Request(p['url'], data=body, headers={'Content-Type': 'text/plain; charset=utf-8'})
    with urllib.request.urlopen(req, timeout=60) as r:   # Apps Script answers with a redirect; urllib follows it with GET
        reply = json.loads(r.read().decode('utf-8'))
    if not reply.get('ok'):
        sys.exit('Log refused the export: %s' % reply.get('error'))
    rows = reply.get('rows', [])
    pathlib.Path(a.out).write_text(json.dumps(rows, ensure_ascii=False, indent=1))
    if a.teams:
        print('%d teams -> %s' % (len(rows), a.out))
        for r in sorted(rows, key=lambda r: -int(r.get('count') or 0)):
            nx = r.get('next') or {}
            print('  %-40s %3s matches  %s' % (r.get('team'), r.get('count'), 'all pages searched' if nx.get('done') else 'next: search %s page %s' % (nx.get('qi', 0), nx.get('page', 1))))
        return
    print('%d videos -> %s' % (len(rows), a.out))
    if not rows:
        return
    filled = collections.Counter()
    for r in rows:
        for c in ('date', 'no', 'title_en', 'title_ja', 'show', 'venue'):
            if r.get(c) not in (None, ''):
                filled[c] += 1
        for c in ('sides_en', 'sides_ja', 'lines'):
            if r.get(c):
                filled[c] += 1
    print('filled in: ' + ', '.join('%s %d' % (c, filled[c]) for c in ('date', 'no', 'title_en', 'title_ja', 'sides_en', 'sides_ja', 'show', 'venue', 'lines')))
    years = collections.Counter(str(r.get('date') or '')[:4] or '?' for r in rows)
    print('by year: ' + ', '.join('%s %d' % (y, n) for y, n in sorted(years.items())))


if __name__ == '__main__':
    main()
