#!/bin/sh
# Push src/ to Apps Script AND move the versioned deployment to it. The time-driven trigger and the web app run the
# deployed VERSION, not HEAD, so a plain `clasp push` changes nothing for them (found 2026-11-16).
set -e
cd "$(dirname "$0")/.."
clasp push -f
id=$(clasp list-deployments | grep -v '@HEAD' | grep -o 'AKfycb[A-Za-z0-9_-]*' | head -1)
[ -n "$id" ] || { echo "no versioned deployment found"; exit 1; }
clasp deploy -i "$id" -d "${1:-FlyBy $(date +%Y-%m-%d_%H:%M)}"
