#!/usr/bin/env python3
"""Build the static site from web/ and data/seasonal_edibles.json.

Usage:
  python3 scripts/build_site.py

Output: site/ (index.html, style.css, data.js and the page scripts); deploy the directory as-is.
Asset URLs carry a content hash (?v=...) so browsers drop stale copies after a deploy.
Run after scripts/seasonal_edibles.py whenever the data changes.
"""

import hashlib
import json
import shutil
import sys

import seasonal_edibles as se

WEB = se.ROOT / "web"
OUT = se.ROOT / "site"
ASSETS = ["style.css", "glossary.js", "deck.js", "quiz.js", "app.js"]


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
    data_js = "window.DATA = " + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n"

    template = (WEB / "index.html").read_text()
    for name in ["data.js", *ASSETS]:
        if f"{name}?v=__V__" not in template:
            sys.exit(f"web/index.html does not load {name}?v=__V__")
    digest = hashlib.sha256(template.encode() + data_js.encode())
    for name in ASSETS:
        digest.update((WEB / name).read_bytes())
    version = digest.hexdigest()[:10]

    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir()
    for name in ASSETS:
        shutil.copyfile(WEB / name, OUT / name)
    (OUT / "data.js").write_text(data_js)
    (OUT / "index.html").write_text(template.replace("__V__", version))
    size = sum(p.stat().st_size for p in OUT.iterdir()) // 1024
    print(f"wrote {OUT.relative_to(se.ROOT)}/ ({size} KB, version {version})", file=sys.stderr)


if __name__ == "__main__":
    main()
