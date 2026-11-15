"""Writes the landing page and the customer app as static files in docs/, pointed at the Convex backend."""
import pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
API = "https://hushed-dove-252.convex.site"
PAGES = {"convex/landing.ts": "docs/index.html", "convex/storefront.ts": "docs/shop/index.html"}

for source, target in PAGES.items():
    text = (ROOT / source).read_text()
    html = re.search(r"String\.raw`(.*)`;\s*$", text, re.S).group(1)
    html = html.replace("<head>", f'<head>\n<script>window.OCTOPUS_API = "{API}";</script>', 1)
    out = ROOT / target
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html)
    print("wrote", target, len(html))
