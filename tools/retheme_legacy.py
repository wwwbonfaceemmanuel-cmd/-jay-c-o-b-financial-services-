#!/usr/bin/env python3
"""Re-skin the legacy v1/v2 pages with the v3 header, footer and brand name.

The pages keep their own <main> content (services, insights, contact, live,
admin, 404); only the shared chrome and naming are replaced. Safe to re-run:
pages that already carry the v3 header are skipped.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import build  # noqa: E402

LEGACY = [
    "services.html",
    "insights.html",
    "insight-agri-finance.html",
    "insight-building-budget.html",
    "insight-sme-credit.html",
    "contact.html",
    "live.html",
    "admin.html",
    "404.html",
]

HEADER_RE = re.compile(r'<header class="site-header">.*?</header>', re.S)
FOOTER_RE = re.compile(r'<footer class="site-footer">.*?</footer>', re.S)


def main() -> int:
    changed = 0
    for name in LEGACY:
        path = build.ROOT / name
        if not path.exists():
            print("skip (missing) %s" % name)
            continue
        html = path.read_text(encoding="utf-8")
        original = html

        html = html.replace("JAY C O B Financial Services", build.BRAND)
        html = html.replace('content="#071828"', 'content="#03170f"')
        html = html.replace('<meta name="theme-color" content="#071828">',
                            '<meta name="theme-color" content="#03170f">')

        if "header-topline" not in html:
            if HEADER_RE.search(html):
                html = HEADER_RE.sub(lambda _m: build.header_html(name), html, count=1)
            else:
                print("warn: no header in %s" % name)

        if "footer-about" not in html:
            if FOOTER_RE.search(html):
                html = FOOTER_RE.sub(lambda _m: build.footer_html(), html, count=1)
            else:
                print("warn: no footer in %s" % name)

        if html != original:
            path.write_text(html, encoding="utf-8")
            changed += 1
            print("updated %s" % name)

    print("Retheme complete — %d file(s) updated." % changed)
    return 0


if __name__ == "__main__":
    sys.exit(main())
