#!/bin/sh
# Build the files attached to every GitHub Release, for users who install without Node or clasp (KB §2):
#   flyby-extension.zip  the built Chrome extension, same for everyone (URL + token are entered on its Options page)
#   Code.gs              all of src/*.js in one file, to paste into a new Apps Script project
#   appsscript.json      the manifest
set -e
cd "$(dirname "$0")/.."
rm -rf release && mkdir release
(cd extension && npm run build >/dev/null && cd dist && zip -qr ../../release/flyby-extension.zip .)
for f in src/*.js; do printf '// ==== %s ====\n' "$f"; cat "$f"; echo; done > release/Code.gs
cp src/appsscript.json release/
ls -l release
