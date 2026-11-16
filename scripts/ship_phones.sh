#!/bin/sh
# Builds the two iPhone apps on this Mac, uploads them to Revyl, and pins the dashboard's phone buttons to
# exactly those builds. Usage: scripts/ship_phones.sh [owner|shop|both]   (default both)
# Restart scripts/release_features.sh afterwards so it picks up the new pins.
set -eu
PATH="$HOME/.revyl/bin:$PATH"
cd "$(dirname "$0")/.."
OWNER_APP=f5c287d9-a1fb-48df-b3f2-c12c09e74ae6
SHOP_APP=a03a0ca7-fe63-4d30-98a7-f0baac8e83cd
what=${1:-both}

newest() { # app id -> id of the most recently uploaded build
  revyl build list --app "$1" --json | node -e 'let t = ""; process.stdin.on("data", (d) => (t += d)).on("end", () => console.log(JSON.parse(t).versions.sort((a, b) => a.uploaded_at.localeCompare(b.uploaded_at)).pop().id));'
}

ship() { # folder, app id, variable name in the runner
  (cd "$1" && revyl build --profile preview --platform ios --local --json </dev/null >/dev/null)
  id=$(cd "$1" && newest "$2")
  sed -i '' "s/^$3=.*/$3=$id/" scripts/release_features.sh
  echo "$3 pinned to $id"
}

[ "$what" = shop ] || ship ios "$OWNER_APP" OWNER_BUILD
[ "$what" = owner ] || ship shop-ios "$SHOP_APP" SHOP_BUILD
