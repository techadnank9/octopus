#!/bin/sh
# Build-machine runner: releases customer-app features built by Capy, and runs the phone app on Revyl when the dashboard asks.
# For each request Capy has finished: find its pull request, check it touches only the customer app page
# and that the page still parses, merge it, deploy to Convex, and tell the owner. A failed check leaves
# the customer app untouched and says why. Run from the repository root; needs gh, node and the Convex CLI.
set -u
REPO=techadnank9/octopus
REVYL_APP=f5c287d9-a1fb-48df-b3f2-c12c09e74ae6
SHOP_APP=a03a0ca7-fe63-4d30-98a7-f0baac8e83cd
# Exact builds to open, so an older build finishing late on Revyl can never take their place.
OWNER_BUILD=a0d40b76-5244-4a09-a709-a8c8c5aaf972
SHOP_BUILD=71d3ae06-bd47-4bc7-9fc7-f37f34436c17
PATH="$HOME/.revyl/bin:$PATH"
cd "$(dirname "$0")/.."

check_page() {
  node -e '
    const s = require("fs").readFileSync("convex/storefront.ts", "utf8");
    const m = s.match(/String\.raw`([\s\S]*)`;\s*$/);
    if (!m) throw new Error("page template not found");
    if (m[1].includes("`") || m[1].includes("${")) throw new Error("backtick or ${ inside the page template");
    const js = m[1].match(/<script>([\s\S]*?)<\/script>/g).pop().replace(/<\/?script>/g, "");
    new Function(js);'
}

finish() { # id ok detail
  npx convex run features:finish "{\"id\":\"$1\",\"ok\":$2,\"detail\":\"$3\"}" >/dev/null 2>&1
}

release() { # feature id
  id=$1
  pr=$(gh pr list --repo "$REPO" --state open --json number,headRefName,createdAt \
        --jq '[.[] | select(.headRefName | startswith("capy/"))] | sort_by(.createdAt) | last | .number // empty')
  if [ -z "$pr" ]; then finish "$id" false "The coding agent finished without opening a pull request."; return; fi

  files=$(gh pr view "$pr" --repo "$REPO" --json files --jq '[.files[].path] | join(",")')
  if [ "$files" != "convex/storefront.ts" ]; then
    gh pr close "$pr" --repo "$REPO" >/dev/null 2>&1
    finish "$id" false "The change touched more than the customer app page, so it was rejected."; return
  fi

  branch=$(gh pr view "$pr" --repo "$REPO" --json headRefName --jq .headRefName)
  git fetch -q origin "$branch" && git checkout -q "origin/$branch" -- convex/storefront.ts
  if ! check_page 2>/tmp/octopus-release.err; then
    git checkout -q HEAD -- convex/storefront.ts
    finish "$id" false "The page did not pass its check."; return
  fi
  if ! npx convex dev --once </dev/null >/tmp/octopus-release.log 2>&1; then
    git checkout -q HEAD -- convex/storefront.ts
    npx convex dev --once </dev/null >/dev/null 2>&1
    finish "$id" false "The deploy failed, so the previous version was restored."; return
  fi
  git checkout -q HEAD -- convex/storefront.ts
  gh pr merge "$pr" --repo "$REPO" --squash >/dev/null 2>&1 && git pull -q --ff-only origin "$(git branch --show-current)"
  finish "$id" true "Pull request #$pr."
  echo "released feature $id via PR #$pr"
}

viewer_of() { node -e 'let t = ""; process.stdin.on("data", (d) => (t += d)).on("end", () => { const m = t.match(new RegExp("\"" + process.argv[1] + "\":\\s*\"([^\"]+)\"")); console.log(m ? m[1] : ""); });' "$1"; }

run_phone() { # id kind name target
  st=failed; url=""
  if [ "$2" = "device" ]; then
    # Owner app: a cloud iPhone with the Octopus app installed and launched.
    url=$(cd ios && revyl device start --app-id "$REVYL_APP" --build-version-id "$OWNER_BUILD" --app-link "$4" --json </dev/null 2>/dev/null | viewer_of viewer_url)
    [ -n "$url" ] && st=open
  elif [ "$2" = "store" ]; then
    # Customer app: the native app opened straight into this shop. Until a native build exists, the shop's page in Safari.
    out=$(cd shop-ios && revyl device start --app-id "$SHOP_APP" --build-version-id "$SHOP_BUILD" --app-link "$4" --json </dev/null 2>/dev/null)
    url=$(printf '%s' "$out" | viewer_of viewer_url)
    if [ -n "$url" ]; then
      st=open
    else
      out=$(cd ios && revyl device start --platform ios --json </dev/null 2>/dev/null)
      sid=$(printf '%s' "$out" | viewer_of session_id)
      url=$(printf '%s' "$out" | viewer_of viewer_url)
      web="https://hushed-dove-252.convex.site/shop?id=${4##*/}"
      if [ -n "$sid" ] && (cd ios && revyl device navigate --url "$web" --session-id "$sid" </dev/null >/dev/null 2>&1); then st=open; fi
    fi
  else
    out=$(cd ios && revyl test run "$3" --json </dev/null 2>&1)
    url=$(printf '%s' "$out" | viewer_of report_link)
    if printf '%s' "$out" | grep -q '"success": true'; then st=passed; fi
  fi
  npx convex run phone:finish "{\"id\":\"$1\",\"status\":\"$st\"${url:+,\"url\":\"$url\"}}" >/dev/null 2>&1
  echo "phone run $3: $st $url"
}

next_phone() {
  npx convex run phone:claim 2>/dev/null | node -e '
    let t = ""; process.stdin.on("data", (d) => (t += d)).on("end", () => { try { const r = JSON.parse(t); if (r) console.log([r.id, r.kind, r.name, r.target].join("|")); } catch {} });'
}

echo "watching for finished features and phone runs (ctrl-c to stop)"
while :; do
  live=$(cd ios && revyl device list --json </dev/null 2>/dev/null | node -e 'let t = ""; process.stdin.on("data", (d) => (t += d)).on("end", () => console.log(JSON.stringify([...t.matchAll(/"session_id":\s*"([^"]+)"/g)].map((m) => m[1]))));')
  npx convex run phone:reconcile "{\"live\":${live:-[]}}" >/dev/null 2>&1
  job=$(next_phone)
  if [ -n "$job" ]; then
    (run_phone "$(echo "$job" | cut -d"|" -f1)" "$(echo "$job" | cut -d"|" -f2)" "$(echo "$job" | cut -d"|" -f3)" "$(echo "$job" | cut -d"|" -f4)") &
  fi
  for id in $(npx convex run features:awaitingRelease 2>/dev/null | node -e '
      let t = ""; process.stdin.on("data", (d) => (t += d)).on("end", () => { try { JSON.parse(t).forEach((f) => console.log(f.id)); } catch {} });'); do
    release "$id"
  done
  sleep 15
done
