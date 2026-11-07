#!/usr/bin/env python3
"""Fetch credits for the three ID views listed in content/species_views.toml.

Usage:
  python3 scripts/species_views.py

Input:  content/species_views.toml (top / underside / base photo ids per species)
Output: data/species_views.json (read by scripts/build_site.py)

Stops when a photo is no longer CC (ND refused), the observation's taxon no longer matches,
or a species-level identification is no longer research grade.
"""

import datetime as dt
import json
import sys
import tomllib
from zoneinfo import ZoneInfo

import inat_fetch
import seasonal_edibles as se

SRC = se.ROOT / "content" / "species_views.toml"
OUT = se.ROOT / "data" / "species_views.json"
LICENSES = set(se.CC_LICENSES.split(","))
SPECIES_RANKS = {"species", "hybrid", "subspecies", "variety", "form"}
VIEWS = ("top", "underside", "base")


def load():
    _, by_name, _, _ = se.load_content()
    rows = tomllib.loads(SRC.read_text()).get("species", [])
    seen_species, seen_photos = set(), set()
    for row in rows:
        where = f"species {row.get('species')}"
        name = row.get("species")
        if not name or name not in by_name:
            sys.exit(f"{where}: unknown species")
        if name in seen_species:
            sys.exit(f"{where}: listed twice")
        seen_species.add(name)
        for key in VIEWS:
            if key not in row:
                sys.exit(f"{where}: missing {key}")
            view = row[key]
            for field in ("id", "obs", "taxon", "note"):
                if field not in view:
                    sys.exit(f"{where}.{key}: missing {field}")
            if not view["note"]:
                sys.exit(f"{where}.{key}: empty note")
            if view["id"] in seen_photos:
                sys.exit(f"{where}.{key}: photo {view['id']} reused")
            seen_photos.add(view["id"])
    return rows, by_name


def fetch_observations(ids):
    found = {}
    ids = sorted(set(ids))
    for start in range(0, len(ids), 100):
        chunk = ids[start:start + 100]
        page = inat_fetch.get(inat_fetch.API_V1, "observations", id=",".join(map(str, chunk)), per_page=len(chunk))
        found.update({obs["id"]: obs for obs in page["results"]})
    return found


def resolve_photo(where, view, observations):
    obs = observations.get(view["obs"])
    if obs is None:
        return None, f"{where}: observation not found"
    photo = next((x for x in obs.get("photos", []) if x["id"] == view["id"]), None)
    taxon = obs.get("taxon") or {}
    errors = []
    if photo is None:
        errors.append(f"{where}: photo is not in this observation")
        return None, "\n".join(errors)
    if photo.get("license_code") not in LICENSES:
        errors.append(f"{where}: licence {photo.get('license_code')} is not allowed")
    if taxon.get("name") != view["taxon"]:
        errors.append(f"{where}: taxon is now {taxon.get('name')}, toml says {view['taxon']}")
    if taxon.get("rank") in SPECIES_RANKS and obs.get("quality_grade") != "research":
        errors.append(f"{where}: {obs.get('quality_grade')}, not research grade")
    dims = photo.get("original_dimensions") or {}
    if not dims.get("width") or not dims.get("height"):
        errors.append(f"{where}: no image size")
    if errors:
        return None, "\n".join(errors)
    user = obs.get("user") or {}
    attribution = photo["attribution"]
    if photo["license_code"] == "cc0":
        attribution = f"{user.get('name') or user.get('login')}, no rights reserved (CC0)"
    return {
        "id": view["id"],
        "url": photo["url"].replace("/square.", "/small."),
        "w": dims["width"],
        "h": dims["height"],
        "license": photo["license_code"],
        "attribution": attribution,
        "observation": f"https://www.inaturalist.org/observations/{view['obs']}",
        "taxon": view["taxon"],
        "note": view["note"],
    }, None


def main():
    rows, _ = load()
    observations = fetch_observations(v["obs"] for row in rows for v in (row[k] for k in VIEWS))
    out, errors = [], []
    for row in rows:
        entry = {"species": row["species"], "views": {}}
        for key in VIEWS:
            photo, err = resolve_photo(f"{row['species']}.{key}", row[key], observations)
            if err:
                errors.append(err)
            else:
                entry["views"][key] = photo
        if len(entry["views"]) == len(VIEWS):
            out.append(entry)
    if errors:
        sys.exit("\n".join(errors))
    generated_at = dt.datetime.now(ZoneInfo("Europe/Paris")).strftime("%Y-%m-%d %H:%M（巴黎时间）")
    OUT.write_text(json.dumps({"generated_at": generated_at, "species": out}, ensure_ascii=False, indent=1) + "\n")
    print(f"wrote {OUT.relative_to(se.ROOT)} ({len(out)} species, {len(out) * 3} views)", file=sys.stderr)


if __name__ == "__main__":
    main()
