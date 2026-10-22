#!/usr/bin/env python3
"""Re-theme the site from gold to an emerald + blue liquid-crystal palette.

Warm hues (gold, amber, brown, cream) are rotated to crystal blue; green hues are
pulled slightly toward emerald-teal so the brand keeps its emerald base while the
accent becomes blue. Reds, blues and neutrals are left alone.

    python3 tools/retheme_v4.py --dry     # report what would change
    python3 tools/retheme_v4.py           # rewrite files in place
"""
import colorsys
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

TARGETS = (
    list(ROOT.glob("*.html"))
    + list(ROOT.glob("assets/css/*.css"))
    + list(ROOT.glob("assets/js/*.js"))
    + list(ROOT.glob("assets/img/*.svg"))
    + list((ROOT / "tools").glob("*.py"))
    + list((ROOT / "tools" / "pages").glob("*.html"))
)

SKIP_NAMES = {"retheme_v4.py", "build_single.py", "retheme_legacy.py"}
SKIP_DIRS = {"single"}

BLUE_HUE = 208.0 / 360.0
EMERALD_HUE = 168.0 / 360.0


def shift(h, s, l, alpha=None):
    """Return (r, g, b) with hue remapped for warm/green colours."""
    if s < 0.02:  # greys stay grey
        return None
    warm = 0.045 <= h <= 0.20          # gold / amber / brown / cream
    green = 0.20 < h <= 0.49          # emerald / olive greens
    if warm:
        new_h = BLUE_HUE if l < 0.72 else 214.0 / 360.0
        new_s = min(max(s * (0.85 if l > 0.8 else 1.0), 0.22), 0.95)
    elif green:
        new_h = EMERALD_HUE
        new_s = max(min(s * 0.95, 0.9), 0.15)
    else:
        return None
    r, g, b = colorsys.hls_to_rgb(new_h, l, new_s)
    return int(round(r * 255)), int(round(g * 255)), int(round(b * 255)), alpha


def hex_repl(m):
    hexval = m.group(1)
    if len(hexval) == 3:
        hexval = "".join(c * 2 for c in hexval)
    r, g, b = (int(hexval[i:i + 2], 16) / 255.0 for i in (0, 2, 4))
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    out = shift(h, s, l)
    if not out:
        return m.group(0)
    nr, ng, nb, _ = out
    return "#%02x%02x%02x" % (nr, ng, nb)


def rgb_repl(m):
    fn, body = m.group(1), m.group(2)
    parts = [p.strip() for p in body.split(",")]
    if len(parts) not in (3, 4):
        return m.group(0)
    try:
        vals = [float(p) for p in parts]
    except ValueError:
        return m.group(0)
    r, g, b = (v / 255.0 for v in vals[:3])
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    out = shift(h, s, l)
    if not out:
        return m.group(0)
    nr, ng, nb, _ = out
    alpha = ""
    if len(vals) == 4:
        alpha = ", " + (("%g" % vals[3]) if vals[3] != int(vals[3]) else "%d" % int(vals[3]))
    return "%s(%d, %d, %d%s)" % (fn, nr, ng, nb, alpha)


def retheme(text: str) -> str:
    text = re.sub(r"#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b", hex_repl, text)
    text = re.sub(r"\b(rgba?)\(([^()]*)\)", rgb_repl, text)
    return text


def main(dry: bool) -> int:
    changed = 0
    for path in sorted(set(TARGETS)):
        if path.name in SKIP_NAMES:
            continue
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        if not path.is_file():
            continue
        try:
            original = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        updated = retheme(original)
        if updated == original:
            continue
        changed += 1
        if dry:
            before = len(re.findall(r"#[0-9a-fA-F]{6}", original))
            print("  %-46s %d colour tokens" % (path.relative_to(ROOT), before))
        else:
            path.write_text(updated, encoding="utf-8")
    print(("would update" if dry else "updated") + " %d files" % changed)
    return 0


if __name__ == "__main__":
    sys.exit(main("--dry" in sys.argv))
