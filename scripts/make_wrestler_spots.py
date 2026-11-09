#!/usr/bin/env python3
"""App-sized copies of the private wrestler photos (2.35.2).

Every place the private build shows a wrestler photo (wrestler pages, tag teams, My Favorites, the menu's Wrestlers
spotlight) reads branding-private/res/drawable-nodpi/wspot_<slug>.jpg: 480 x 720, JPEG, with the photo's white
backdrop replaced by a dark fade (#2A323C at the top to #0F151C at the bottom), so the photos sit in the dark app.

Originals (any size, .jpg or .png, named <slug> or wrestler_<slug>, e.g. momo_watanabe.jpg) are read from
    branding-private/wrestler-photos/          kept outside res/, so they are not packed into the app
    branding-private/res/drawable-nodpi/       wrestler_<slug>.* still there from before
A copy is made again when its original is newer, it is a different size, or the backdrop below has changed
(the last backdrop used is kept in branding-private/wrestler-photos/.spots.json).

The backdrop is cut away with the macOS subject cut-out (scripts/wrestler_cutout.js, macOS 14 or later). When it
finds no subject, the copy keeps the original backdrop and the script says so.

    python3 scripts/make_wrestler_spots.py                    make or refresh the copies
    python3 scripts/make_wrestler_spots.py --all              make every copy again
    python3 scripts/make_wrestler_spots.py --move-originals   also move res/drawable-nodpi/wrestler_* into
                                                              branding-private/wrestler-photos/ (nothing is deleted)
"""
import json, pathlib, shutil, subprocess, sys

W, H, QUALITY = 480, 720, 0.8
FADE_TOP, FADE_BOTTOM = '2A323C', '0F151C'      # border / track grey to panel near-black (docs/DESIGN.md)
STYLE = 'fade:%s-%s:%dx%d:q%s' % (FADE_TOP, FADE_BOTTOM, W, H, QUALITY)

ROOT = pathlib.Path(__file__).resolve().parent.parent
RES = ROOT / 'branding-private/res/drawable-nodpi'
ORIG = ROOT / 'branding-private/wrestler-photos'
CUT = pathlib.Path(__file__).resolve().parent / 'wrestler_cutout.js'
MARK = ORIG / '.spots.json'

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


def plain_copy(src, out):
    """The photo as it is, filled to W x H: used when the cut-out finds no subject."""
    tmp = out.with_suffix('.tmp.jpg')
    sw, sh = size_of(src) or (W, H)
    scale = max(W / sw, H / sh)
    subprocess.run(['sips', '-z', str(round(sh * scale)), str(round(sw * scale)), '-s', 'format', 'jpeg',
                    '-s', 'formatOptions', str(int(QUALITY * 100)), str(src), '--out', str(tmp)], check=True, capture_output=True)
    subprocess.run(['sips', '-c', str(H), str(W), str(tmp), '--out', str(out)], check=True, capture_output=True)
    tmp.unlink()


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

ORIG.mkdir(exist_ok=True)
try:
    marks = json.loads(MARK.read_text())
except Exception:
    marks = {}

made = kept = 0
plain = []
for slug, src in sorted(sources.items()):
    out = RES / ('wspot_' + slug + '.jpg')
    if ('--all' not in sys.argv and out.exists() and out.stat().st_mtime >= src.stat().st_mtime
            and marks.get(slug) == STYLE and size_of(out) == (W, H)):
        kept += 1
        continue
    r = subprocess.run(['osascript', '-l', 'JavaScript', str(CUT), str(src.resolve()), str(out.resolve()),
                        str(W), str(H), FADE_TOP, FADE_BOTTOM, str(QUALITY)], capture_output=True, text=True)
    said = (r.stdout.strip().splitlines() or [''])[-1]
    if said == 'ok':
        marks[slug] = STYLE
    else:
        plain_copy(src, out)
        marks[slug] = 'plain'
        plain.append('%s (%s)' % (slug, said or r.stderr.strip()[-80:]))
    made += 1

# Transparent cut-outs for the star spotlight (2.46.0): wcut_<name>.png, same size and framing as the copies above.
CUT_STYLE = 'cut:%dx%d' % (W, H)
cut_made = 0
no_cut = []
for slug, src in sorted(sources.items()):
    out = RES / ('wcut_' + slug + '.png')
    key = 'cut/' + slug
    if '--all' not in sys.argv and out.exists() and out.stat().st_mtime >= src.stat().st_mtime and marks.get(key) == CUT_STYLE:
        continue
    r = subprocess.run(['osascript', '-l', 'JavaScript', str(CUT), str(src.resolve()), str(out.resolve()),
                        str(W), str(H), 'none', 'none', str(QUALITY)], capture_output=True, text=True)
    said = (r.stdout.strip().splitlines() or [''])[-1]
    if said == 'ok':
        marks[key] = CUT_STYLE
        cut_made += 1
    else:
        out.unlink(missing_ok=True)
        no_cut.append('%s (%s)' % (slug, said or r.stderr.strip()[-80:]))

MARK.write_text(json.dumps(marks, indent=1, sort_keys=True))

orphans = sorted(p.name for p in RES.glob('wspot_*.jpg') if p.stem[len('wspot_'):] not in sources)
total = sum(p.stat().st_size for p in RES.glob('wspot_*.jpg'))
print('made %d, up to date %d, copies %.1f MB' % (made, kept, total / 1e6))
print('cut-outs made %d, all cut-outs %.1f MB' % (cut_made, sum(p.stat().st_size for p in RES.glob('wcut_*.png')) / 1e6))
if no_cut:
    print('no transparent cut-out (the spotlight uses the dark-backdrop copy): ' + ', '.join(no_cut))
if plain:
    print('kept the original backdrop (cut-out found no subject): ' + ', '.join(plain))
if orphans:
    print('copies with no original (left as they are): ' + ', '.join(orphans))
left = sorted(p.name for p in RES.glob('wrestler_*'))
if left:
    print('%d originals are still in res/drawable-nodpi and get packed into the app (%.1f MB); '
          'run with --move-originals to move them out' % (len(left), sum(p.stat().st_size for p in RES.glob('wrestler_*')) / 1e6))
