#!/usr/bin/env python3
"""Build the static site: inline data/seasonal_edibles.json into web/index.html.

Usage:
  python3 scripts/build_site.py

Output: site/index.html (self-contained; deploy the site/ directory as-is).
Run after scripts/seasonal_edibles.py whenever the data changes.
"""

import json
import sys

import seasonal_edibles as se

TEMPLATE = se.ROOT / "web" / "index.html"
OUT = se.ROOT / "site" / "index.html"


def main():
    data = json.loads(se.OUT_JSON.read_text())
    if "species" not in data:
        sys.exit("data/seasonal_edibles.json has no species section; rerun scripts/seasonal_edibles.py")
    data["meta"] = {
        "seasons": [{"key": key, "label": label, "months": list(months)} for key, label, months in se.SEASONS],
        "edibility_label": se.EDIBILITY_LABEL,
        "edible": sorted(se.EDIBLE),
        "danger": sorted(se.DANGER),
        "habitat_types": se.HABITAT_TYPES,
    }
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    template = TEMPLATE.read_text()
    if template.count("__DATA__") != 1:
        sys.exit(f"{TEMPLATE} must contain exactly one __DATA__ placeholder")
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(template.replace("__DATA__", payload))
    print(f"wrote {OUT.relative_to(se.ROOT)} ({OUT.stat().st_size // 1024} KB)", file=sys.stderr)


if __name__ == "__main__":
    main()
