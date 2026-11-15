# Octopus: rules for coding agents

Octopus runs a small shop by text. Backend is Convex (`convex/`), the owner app is SwiftUI (`ios/`), and each shop's customer app is one HTML page served by Convex.

## Customer app feature requests

Shop owners ask for customer-app features by message. Those requests arrive here as tasks.

- Edit **only** `convex/storefront.ts`. It exports `STOREFRONT`, a `String.raw` template holding the whole page.
- Inside that template there must be **no backticks and no `${`**. Use string concatenation in the page's JavaScript.
- Keep every existing feature and element id working: menu, search, cart, checkout sheet, live order status, chat, Book and Review tabs.
- The page talks to the backend only through the existing `call(path, body)` helper and the existing `/public/*` endpoints. Do not add endpoints or change other files. Features that need new stored data must keep it in `localStorage`, keyed by shop id.
- Match the page's look: the CSS variables already defined, rounded cards, sentence case, no emoji, buttons at least 44px tall, labels on inputs, visible focus.
- No dead code. Keep the change as small as the feature allows.

## Before opening the pull request

Run this and make sure it prints `ok`:

```sh
node -e '
const s=require("fs").readFileSync("convex/storefront.ts","utf8");
const m=s.match(/String\.raw`([\s\S]*)`;\s*$/); if(!m) throw new Error("template not found");
if(m[1].includes("`")||m[1].includes("${")) throw new Error("backtick or ${ inside template");
const js=m[1].match(/<script>([\s\S]*?)<\/script>/g).pop().replace(/<\/?script>/g,"");
new Function(js); console.log("ok");'
```

Then open one pull request against the default branch with a one-line title describing the feature.
