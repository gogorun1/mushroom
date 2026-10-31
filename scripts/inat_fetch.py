#!/usr/bin/env python3
"""Shared iNaturalist helpers: polite HTTP, taxon lookup, bulk observation pull.

Stdlib only. Sleeps ~1 s between calls to respect iNat's rate guideline.
"""

import gzip
import json
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

API_V1 = "https://api.inaturalist.org/v1"
API_V2 = "https://api.inaturalist.org/v2"
USER_AGENT = "mushroom-trainer/0.1 (personal study tool)"
PLACE_IDF = 10577
TAXON_FUNGI = 47170

OBS_FIELDS = "id,observed_on,location,obscured,place_ids,user.id,taxon.id,taxon.name,taxon.rank,taxon.ancestor_ids"


def get(url_base, path, **params):
    url = f"{url_base}/{path}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                data = json.load(resp)
            time.sleep(1.1)
            return data
        except Exception as exc:  # noqa: BLE001
            wait = 4 * 2**attempt
            print(f"retry {url} in {wait}s: {exc}", file=sys.stderr)
            time.sleep(wait)
    raise RuntimeError(f"failed: {url}")


def fetch_observations(cache_path, place_id=PLACE_IDF, taxon_id=TAXON_FUNGI, refresh=False):
    """Pull every research-grade observation, paging by id to get past the 10k window."""
    cache_path = Path(cache_path)
    if cache_path.exists() and not refresh:
        with gzip.open(cache_path, "rt", encoding="utf-8") as fh:
            return [json.loads(line) for line in fh]

    observations = []
    id_above = 0
    while True:
        page = get(
            API_V2,
            "observations",
            place_id=place_id,
            taxon_id=taxon_id,
            quality_grade="research",
            order_by="id",
            order="asc",
            id_above=id_above,
            per_page=200,
            fields=OBS_FIELDS,
        )
        batch = page["results"]
        if not batch:
            break
        observations.extend(batch)
        id_above = batch[-1]["id"]
        print(f"fetched {len(observations)}/{page['total_results']}", file=sys.stderr)

    cache_path.parent.mkdir(parents=True, exist_ok=True)
    with gzip.open(cache_path, "wt", encoding="utf-8") as fh:
        for obs in observations:
            fh.write(json.dumps(obs, ensure_ascii=False) + "\n")
    return observations


def resolve_taxa(names, cache_path):
    """Map scientific names to iNat taxon ids, caching results on disk."""
    cache_path = Path(cache_path)
    cache = json.loads(cache_path.read_text()) if cache_path.exists() else {}
    for name in names:
        if name in cache:
            continue
        results = get(API_V1, "taxa", q=name, iconic_taxa="Fungi", per_page=10)["results"]
        match = next(
            (t for t in results if name.lower() in (t["name"].lower(), t.get("matched_term", "").lower())),
            None,
        )
        cache[name] = None if match is None else {"id": match["id"], "name": match["name"], "rank": match["rank"]}
        if match is None:
            print(f"taxon not found: {name}", file=sys.stderr)
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    cache_path.write_text(json.dumps(cache, ensure_ascii=False, indent=1))
    return cache
