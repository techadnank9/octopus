#!/bin/sh
# Release step for customer-app features built by Capy.
# For each request Capy has finished: find its pull request, check it touches only the customer app page
# and that the page still parses, merge it, deploy to Convex, and tell the owner. A failed check leaves
# the customer app untouched and says why. Run from the repository root; needs gh, node and the Convex CLI.
set -u
REPO=techadnank9/octopus
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

echo "watching for finished features (ctrl-c to stop)"
while :; do
  for id in $(npx convex run features:awaitingRelease 2>/dev/null | node -e '
      let t = ""; process.stdin.on("data", (d) => (t += d)).on("end", () => { try { JSON.parse(t).forEach((f) => console.log(f.id)); } catch {} });'); do
    release "$id"
  done
  sleep 15
done
