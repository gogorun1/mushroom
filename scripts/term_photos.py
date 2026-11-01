#!/usr/bin/env python3
"""Fetch credits and sizes for the glossary photos listed in content/term_photos.toml.

Usage:
  python3 scripts/term_photos.py

Input:  content/term_photos.toml (iNat photo ids and the marks drawn on them)
Output: data/term_photos.json (read by scripts/build_site.py)

Stops with an error when a photo is no longer CC licensed (ND licences are refused because the
page draws on and crops the photos), when the observation's taxon no longer matches, or when a
species-level identification is no longer research grade.
"""

import datetime as dt
import json
import sys
import tomllib
from zoneinfo import ZoneInfo

import inat_fetch
import seasonal_edibles as se

SRC = se.ROOT / "content" / "term_photos.toml"
OUT = se.ROOT / "data" / "term_photos.json"
LICENSES = set(se.CC_LICENSES.split(","))
SPECIES_RANKS = {"species", "hybrid", "subspecies", "variety", "form"}


def check_box(where, values, size):
    if not (isinstance(values, list) and len(values) == size and all(isinstance(v, (int, float)) for v in values)):
        sys.exit(f"{where}: expected {size} numbers, got {values!r}")


def load():
    photos = tomllib.loads(SRC.read_text())["photo"]
    seen = set()
    for p in photos:
        where = f"photo {p.get('id')}"
        for key in ("id", "obs", "taxon", "zh", "mark"):
            if key not in p:
                sys.exit(f"{where}: missing {key}")
        if p["id"] in seen:
            sys.exit(f"{where}: listed twice")
        seen.add(p["id"])
        for term, mark in p["mark"].items():
            check_box(f"{where} {term}.at", mark.get("at"), 4)
            if "view" in mark:
                check_box(f"{where} {term}.view", mark["view"], 4)
            if not mark.get("note"):
                sys.exit(f"{where} {term}: missing note")
            others = mark.get("others", [])
            if not (isinstance(others, list) and all(isinstance(o, str) and o for o in others)):
                sys.exit(f"{where} {term}.others: expected a list of term ids, got {others!r}")
            if term in others or len(set(others)) != len(others):
                sys.exit(f"{where} {term}.others: lists the term itself or repeats an id")
    return photos


def fetch_observations(ids):
    found = {}
    ids = sorted(set(ids))
    for start in range(0, len(ids), 100):
        chunk = ids[start:start + 100]
        page = inat_fetch.get(inat_fetch.API_V1, "observations", id=",".join(map(str, chunk)), per_page=len(chunk))
        found.update({obs["id"]: obs for obs in page["results"]})
    return found


def main():
    photos = load()
    observations = fetch_observations(p["obs"] for p in photos)
    out, errors = [], []
    for p in photos:
        where = f"photo {p['id']} (obs {p['obs']})"
        obs = observations.get(p["obs"])
        if obs is None:
            errors.append(f"{where}: observation not found")
            continue
        photo = next((x for x in obs.get("photos", []) if x["id"] == p["id"]), None)
        taxon = obs.get("taxon") or {}
        if photo is None:
            errors.append(f"{where}: photo is not in this observation")
            continue
        if photo.get("license_code") not in LICENSES:
            errors.append(f"{where}: licence {photo.get('license_code')} is not allowed")
        if taxon.get("name") != p["taxon"]:
            errors.append(f"{where}: taxon is now {taxon.get('name')}, toml says {p['taxon']}")
        if taxon.get("rank") in SPECIES_RANKS and obs.get("quality_grade") != "research":
            errors.append(f"{where}: {obs.get('quality_grade')}, not research grade")
        dims = photo.get("original_dimensions") or {}
        if not dims.get("width") or not dims.get("height"):
            errors.append(f"{where}: no image size")
            continue
        user = obs.get("user") or {}
        attribution = photo["attribution"]
        if photo["license_code"] == "cc0":
            attribution = f"{user.get('name') or user.get('login')}, no rights reserved (CC0)"
        out.append({
            "id": p["id"],
            "url": photo["url"].replace("/square.", "/small."),
            "w": dims["width"],
            "h": dims["height"],
            "license": photo["license_code"],
            "attribution": attribution,
            "observation": f"https://www.inaturalist.org/observations/{p['obs']}",
            "taxon": p["taxon"],
            "zh": p["zh"],
            "marks": [{"term": term, **mark} for term, mark in p["mark"].items()],
        })
    if errors:
        sys.exit("\n".join(errors))
    generated_at = dt.datetime.now(ZoneInfo("Europe/Paris")).strftime("%Y-%m-%d %H:%M（巴黎时间）")
    OUT.write_text(json.dumps({"generated_at": generated_at, "photos": out}, ensure_ascii=False, indent=1) + "\n")
    marks = sum(len(p["marks"]) for p in out)
    print(f"wrote {OUT.relative_to(se.ROOT)} ({len(out)} photos, {marks} marks)", file=sys.stderr)


if __name__ == "__main__":
    main()
