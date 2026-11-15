"""Writes the landing page and the customer app as static files in docs/, pointed at the Convex backend."""
import pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
API = "https://hushed-dove-252.convex.site"
ROOT_PATH = "/octopus/"
PAGES = {"convex/landing.ts": ["docs/index.html", "docs/dashboard/index.html"], "convex/storefront.ts": ["docs/shop/index.html"]}

for source, targets in PAGES.items():
    text = (ROOT / source).read_text()
    html = re.search(r"String\.raw`(.*)`;\s*$", text, re.S).group(1)
    html = html.replace("<head>", f'<head>\n<script>window.OCTOPUS_API = "{API}"; window.OCTOPUS_ROOT = "{ROOT_PATH}";</script>', 1)
    for target in targets:
        out = ROOT / target
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(html)
        print("wrote", target, len(html))
