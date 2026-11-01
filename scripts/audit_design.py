#!/usr/bin/env python3
"""Design audit: compares the app's injected CSS/JS against docs/DESIGN.md.

Report only. It never edits files. Run:  python3 scripts/audit_design.py [--strict] [--all]

Checks (all read from MainActivity.kt and app/src/main/assets/*.js):
  colour     hex colours that are not design tokens
  font       font-family values other than Arial / Roboto / inherit
  size       font-size px values outside the documented scale
  radius     border-radius px values outside the documented set
  focus      the global *:focus fallback rule, and focus rules that set both an
             outline/border change and a box-shadow (double-highlight risk)

--strict exits 1 when anything is found (for a future CI step).
--all lists every occurrence instead of the first few per item.
"""
import re
import sys
import glob
from collections import defaultdict

ROOT = __file__.rsplit("/scripts/", 1)[0]
FILES = [ROOT + "/app/src/main/java/com/example/tvhub/MainActivity.kt"] + sorted(
    glob.glob(ROOT + "/app/src/main/assets/*.js")
)

# Keep in step with docs/DESIGN.md.
TOKENS = {
    "#f4c242", "#ffb347", "#ffd700", "#f7d117",          # golds (to be reduced)
    "#1a1a1a", "#111111", "#111",                         # ink on accent
    "#000000", "#000", "#0b1118", "#0f151c", "#121922", "#161f2a", "#141a22",
    "#172029", "#2a323c", "#3b4656", "#222b36", "#0f1620", "#11171e",
    "#ffffff", "#fff", "#c9d2dc", "#9aa6b4", "#ff7a66",
    "#d62839", "#e8374a", "#ff6b78", "#7b5cff", "#b6a4ff", "#2e9e5b",
}
SIZES = {11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 28, 30, 54}
RADII = {4, 5, 6, 8, 10, 12, 14, 16, 20, 36, 50}
FONTS_OK = re.compile(r"arial|roboto|inherit|helvetica|sans-serif|ui-monospace", re.I)

hits = defaultdict(lambda: defaultdict(list))  # kind -> item -> [(file, line)]


def add(kind, item, path, ln):
    hits[kind][item].append((path.replace(ROOT + "/", ""), ln))


for path in FILES:
    try:
        lines = open(path, encoding="utf-8").read().split("\n")
    except OSError:
        continue
    for i, line in enumerate(lines, 1):
        if line.lstrip().startswith(("//", "*", "/*")):
            continue
        for m in re.finditer(r"#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b", line):
            h = m.group(0).lower()
            # skip things that look like ids or anchors (#tv-foo handled by the hex pattern needing hex digits only)
            if re.match(r"#[0-9a-f]{3}$", h) and re.match(r"#[0-9a-f]{3}[a-z\-_]", line[m.start():m.start() + 5].lower()):
                continue
            if h not in TOKENS:
                add("colour", h, path, i)
        for m in re.finditer(r"font-family:\s*([^;'\"}]+)", line):
            fam = m.group(1).strip()
            if not FONTS_OK.search(fam):
                add("font", fam[:50], path, i)
        for m in re.finditer(r"font-size:\s*(\d+(?:\.\d+)?)px", line):
            v = float(m.group(1))
            if v != int(v) or int(v) not in SIZES:
                add("size", "%gpx" % v, path, i)
        for m in re.finditer(r"border-radius:\s*(\d+(?:\.\d+)?)px", line):
            v = float(m.group(1))
            if v != int(v) or int(v) not in RADII:
                add("radius", "%gpx" % v, path, i)
        if re.search(r"(^|['\"{},\s])\*:focus\s*\{[^}]*outline:\s*[1-9][^}]*box-shadow", line):
            add("focus", "global *:focus fallback (outline + halo)", path, i)
        for m in re.finditer(r"([^{},']*:focus[^{]*)\{([^}]*)\}", line):
            decl = dict(
                (k.strip(), v.strip())
                for k, _, v in (d.partition(":") for d in m.group(2).split(";"))
                if k.strip()
            )
            sh = decl.get("box-shadow", "none").replace("!important", "").strip()
            ol = decl.get("outline", "none").replace("!important", "").strip()
            bd = decl.get("border", decl.get("border-color", "")).replace("!important", "").strip()
            has_shadow = bool(sh) and not sh.startswith("none")
            has_edge = (bool(ol) and not ol.startswith(("none", "0"))) or (bd and not bd.startswith(("none", "0", "transparent")))
            look_c = "#ffd700" in ol.lower() and "255, 215, 0" in sh.replace("255,215,0", "255, 215, 0")
            if has_shadow and has_edge and not look_c:
                add("focus", "edge plus box-shadow on focus (check for a double highlight)", path, i)

strict = "--strict" in sys.argv
show_all = "--all" in sys.argv
total = 0
print("Design audit against docs/DESIGN.md\n")
for kind in ("colour", "font", "size", "radius", "focus"):
    items = hits.get(kind, {})
    n = sum(len(v) for v in items.values())
    total += n
    print("== %s: %d occurrence(s), %d distinct" % (kind, n, len(items)))
    for item, locs in sorted(items.items(), key=lambda kv: -len(kv[1])):
        shown = locs if show_all else locs[:3]
        where = ", ".join("%s:%d" % (f.rsplit("/", 1)[-1], l) for f, l in shown)
        more = "" if show_all or len(locs) <= 3 else " (+%d more)" % (len(locs) - 3)
        print("   %-44s x%-3d %s%s" % (item, len(locs), where, more))
    print()
print("Total findings: %d" % total)
sys.exit(1 if (strict and total) else 0)
