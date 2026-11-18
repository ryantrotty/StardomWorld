#!/bin/sh
# Copies iPhone card check (web/cardcheck) and the TV scripts it runs on into a gh-pages checkout's cardcheck/ folder.
# Usage: scripts/publish_cardcheck.sh <gh-pages checkout>
# The TV scripts are copied as they are on this branch, so publish again whenever any of them changes.
set -e
dest="$1/cardcheck"
[ -n "$1" ] && [ -d "$1" ] || { echo "usage: $0 <gh-pages checkout>"; exit 1; }
here="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$dest"
cp "$here/web/cardcheck/cc.js" "$here/web/cardcheck/index.html" "$dest/"
for f in videoindex.js indexpanel.js shownames.js setorder.js factions.json match_types.json; do
  cp "$here/app/src/main/assets/$f" "$dest/"
done
echo "copied to $dest"
