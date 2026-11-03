#!/usr/bin/env python3
"""Lists every search the Eras page can run, as JSON: [{"key": ..., "url": ..., "kind": ...}].

key is exactly the string the app looks up in daily.json under eras.counts (see docs/ERA_LINK_CHECKS.md).
Usage: python3 scripts/era_link_keys.py > era_keys.json
"""
import json, sys, urllib.parse, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
d = json.load(open(root / 'app/src/main/assets/eras.json'))
seen, out = set(), []

def add(words, year, kind, parent=None):
    key = (words + (' %s/' % year if year else '')).strip()
    if not key or key in seen:
        return
    seen.add(key)
    url = 'https://www.stardom-world.com/contents/search?q%5Bkeyword%5D=' + urllib.parse.quote(key, safe='') + '&activetab=contents&page=1'
    item = {'key': key, 'url': url, 'kind': kind}
    if parent:
        item['parent'] = parent   # check this key only when the parent key has a count of 0
    out.append(item)

for e in d['eras']:
    for w in (e.get('wrestlers') or []) + (e.get('rising') or []):
        q = w.get('search') or w['name']
        add(q, '', 'wrestler')
        if ' ' in q:
            add(q.split()[0], '', 'wrestler-fallback', q)   # broader search used when the full name has no videos
    for r in e.get('rivalries') or []:
        add(r['words'], '', 'rivalry')
        add(r['a'], '', 'rivalry-fallback', r['words'])
    for s in e.get('shows') or []:
        add(s['search'], s.get('year', ''), 'show')
        if s.get('year'):
            add(s['search'], '', 'show-fallback', (s['search'] + ' %s/' % s['year']).strip())       # broader search (no year) used when the year search is empty
json.dump(out, sys.stdout, ensure_ascii=False, indent=1)
