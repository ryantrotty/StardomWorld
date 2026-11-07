#!/usr/bin/env python3
"""App-sized copies of the private wrestler photos (2.35.1).

Every place the private build shows a wrestler photo (wrestler pages, tag teams, My Favorites, the menu's Wrestlers
spotlight) reads branding-private/res/drawable-nodpi/wspot_<slug>.jpg (480 x 720, JPEG quality 75).

Originals (any size, .jpg or .png, named <slug> or wrestler_<slug>, e.g. momo_watanabe.jpg) are read from
    branding-private/wrestler-photos/          kept outside res/, so they are not packed into the app
    branding-private/res/drawable-nodpi/       wrestler_<slug>.* still there from before
A copy is made again when its original is newer or the copy is a different size.

    python3 scripts/make_wrestler_spots.py                    make or refresh the copies
    python3 scripts/make_wrestler_spots.py --move-originals   also move res/drawable-nodpi/wrestler_* into
                                                              branding-private/wrestler-photos/ (nothing is deleted)
Uses macOS `sips`.
"""
import pathlib, shutil, subprocess, sys

W, H, Q = 480, 720, '75'
ROOT = pathlib.Path(__file__).resolve().parent.parent
RES = ROOT / 'branding-private/res/drawable-nodpi'
ORIG = ROOT / 'branding-private/wrestler-photos'

if not RES.exists():
    sys.exit('No branding-private/res/drawable-nodpi folder: nothing to do (public build).')

if '--move-originals' in sys.argv:
    ORIG.mkdir(exist_ok=True)
    moved = 0
    for p in sorted(RES.glob('wrestler_*')):
        dest = ORIG / p.name
        if dest.exists():
            sys.exit('Not moving %s: %s already exists.' % (p.name, dest))
        shutil.move(str(p), str(dest))
        moved += 1
    print('moved %d originals to %s' % (moved, ORIG.relative_to(ROOT)))

def slug_of(p):
    s = p.stem.lower()
    return s[len('wrestler_'):] if s.startswith('wrestler_') else s

def size_of(p):
    out = subprocess.run(['sips', '-g', 'pixelWidth', '-g', 'pixelHeight', str(p)], capture_output=True, text=True).stdout
    vals = [int(l.split(':')[1]) for l in out.splitlines() if 'pixel' in l]
    return tuple(vals) if len(vals) == 2 else None

sources = {}
for folder in (RES, ORIG):
    if not folder.exists():
        continue
    for p in sorted(folder.iterdir()):
        if p.suffix.lower() not in ('.jpg', '.jpeg', '.png'):
            continue
        if folder == RES and not p.name.startswith('wrestler_'):
            continue
        sources[slug_of(p)] = p      # the separate originals folder wins over res/

made = kept = 0
for slug, src in sorted(sources.items()):
    out = RES / ('wspot_' + slug + '.jpg')
    if out.exists() and out.stat().st_mtime >= src.stat().st_mtime and size_of(out) == (W, H):
        kept += 1
        continue
    tmp = RES / ('wspot_' + slug + '.tmp.jpg')
    # Fill 480 x 720: scale so both sides cover it, then crop from the middle (the photos are 2:3 already).
    sw, sh = size_of(src) or (W, H)
    scale = max(W / sw, H / sh)
    subprocess.run(['sips', '-z', str(round(sh * scale)), str(round(sw * scale)), '-s', 'format', 'jpeg',
                    '-s', 'formatOptions', Q, str(src), '--out', str(tmp)], check=True, capture_output=True)
    subprocess.run(['sips', '-c', str(H), str(W), str(tmp), '--out', str(out)], check=True, capture_output=True)
    tmp.unlink()
    made += 1

orphans = sorted(p.name for p in RES.glob('wspot_*.jpg') if p.stem[len('wspot_'):] not in sources)
total = sum(p.stat().st_size for p in RES.glob('wspot_*.jpg'))
print('made %d, up to date %d, copies %.1f MB' % (made, kept, total / 1e6))
if orphans:
    print('copies with no original (left as they are): ' + ', '.join(orphans))
left = sorted(p.name for p in RES.glob('wrestler_*'))
if left:
    print('%d originals are still in res/drawable-nodpi and get packed into the app (%.1f MB); '
          'run with --move-originals to move them out' % (len(left), sum(p.stat().st_size for p in RES.glob('wrestler_*')) / 1e6))
