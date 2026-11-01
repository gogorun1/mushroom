#!/usr/bin/env python3
"""Check the Sketchfab models listed in content/models_3d.toml and fetch their credits.

Usage:
  python3 scripts/models_3d.py

Input:  content/models_3d.toml (at most one 3D scan per species page)
Output: data/models_3d.json (read by scripts/build_site.py)

Stops with an error when a model is gone, age restricted or no longer embeddable, or when it is
listed for a species that has no page.
"""

import datetime as dt
import json
import re
import sys
import tomllib
from zoneinfo import ZoneInfo

import inat_fetch
import seasonal_edibles as se

SRC = se.ROOT / "content" / "models_3d.toml"
OUT = se.ROOT / "data" / "models_3d.json"
API = "https://api.sketchfab.com/v3"
# Poster shown before the viewer loads; 720 px covers a phone-width column at 2x.
POSTER_WIDTH = 720


def load(species):
    models = tomllib.loads(SRC.read_text())["model"]
    seen = set()
    for m in models:
        where = f"model {m.get('species')}"
        for key in ("species", "uid", "mb", "note"):
            if not m.get(key):
                sys.exit(f"{where}: missing {key}")
        if m["species"] not in species:
            sys.exit(f"{where}: no species page with this name")
        if m["species"] in seen:
            sys.exit(f"{where}: listed twice")
        seen.add(m["species"])
        if not re.fullmatch(r"[0-9a-f]{32}", m["uid"]):
            sys.exit(f"{where}: {m['uid']!r} is not a Sketchfab model id")
        if not isinstance(m["mb"], (int, float)) or m["mb"] <= 0:
            sys.exit(f"{where}: mb must be a positive number")
    return models


def poster(info):
    images = (info.get("thumbnails") or {}).get("images") or []
    wide = [i for i in images if i["width"] >= POSTER_WIDTH]
    if wide:
        return min(wide, key=lambda i: i["width"])
    return max(images, key=lambda i: i["width"], default=None)


def main():
    species = json.loads(se.OUT_JSON.read_text())["species"]
    out, errors = [], []
    for m in load(species):
        where = f"model {m['species']} ({m['uid']})"
        try:
            info = inat_fetch.get(API, f"models/{m['uid']}")
            embed = inat_fetch.get("https://sketchfab.com", "oembed", url=info["viewerUrl"])
        except RuntimeError as exc:
            errors.append(f"{where}: {exc}")
            continue
        if info.get("isAgeRestricted"):
            errors.append(f"{where}: age restricted")
        if "<iframe" not in (embed.get("html") or ""):
            errors.append(f"{where}: the author no longer allows embedding")
        image = poster(info)
        if image is None:
            errors.append(f"{where}: no thumbnail")
            continue
        user = info["user"]
        out.append({
            "species": m["species"],
            "uid": m["uid"],
            "name": info["name"],
            "author": user.get("displayName") or user["username"],
            "author_url": user["profileUrl"],
            "url": info["viewerUrl"],
            "poster": image["url"],
            "mb": m["mb"],
            "note": m["note"],
        })
    if errors:
        sys.exit("\n".join(errors))
    generated_at = dt.datetime.now(ZoneInfo("Europe/Paris")).strftime("%Y-%m-%d %H:%M（巴黎时间）")
    OUT.write_text(json.dumps({"generated_at": generated_at, "models": out}, ensure_ascii=False, indent=1) + "\n")
    print(f"wrote {OUT.relative_to(se.ROOT)} ({len(out)} models)", file=sys.stderr)


if __name__ == "__main__":
    main()
