#!/usr/bin/env python3
"""Small copies of the private wrestler photos for the menu's Wrestlers spotlight (2.35.0).

Reads  branding-private/res/drawable-nodpi/wrestler_<slug>.(jpg|png)   (800 x 1200 portraits)
Writes branding-private/res/drawable-nodpi/wspot_<slug>.jpg            (360 x 540, JPEG quality 72)

Run it again after adding or replacing photos; copies that are newer than their photo are skipped.
Uses macOS `sips`. The app falls back to the full photo when a copy is missing.
"""
import pathlib, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
DIR = ROOT / 'branding-private/res/drawable-nodpi'

if not DIR.exists():
    sys.exit('No branding-private/res/drawable-nodpi folder: nothing to do (public build).')

made = skipped = 0
for src in sorted(DIR.glob('wrestler_*')):
    if src.suffix.lower() not in ('.jpg', '.jpeg', '.png'):
        continue
    out = DIR / ('wspot_' + src.stem[len('wrestler_'):] + '.jpg')
    if out.exists() and out.stat().st_mtime >= src.stat().st_mtime:
        skipped += 1
        continue
    subprocess.run(['sips', '-Z', '540', '-s', 'format', 'jpeg', '-s', 'formatOptions', '72',
                    str(src), '--out', str(out)], check=True, capture_output=True)
    made += 1

total = sum(p.stat().st_size for p in DIR.glob('wspot_*.jpg'))
print('made %d, up to date %d, spotlight copies %.1f MB' % (made, skipped, total / 1e6))
