#!/usr/bin/env python3
"""Pull iNaturalist occurrence stats for the candidate species.

For every taxon in SPECIES this records:
  - research-grade observation counts in Île-de-France and in France
  - how many French research-grade observations carry a reusable CC photo
    (ND licenses excluded: training images get cropped), plus the same count
    for Europe when France alone cannot fill a train + held-out test pool
  - the Île-de-France month-of-year histogram (falls back to France when thin)

Usage: python3 scripts/inat_stats.py > data/inat_stats.json
Stdlib only. Sleeps between calls to respect iNat's ~1 req/s guideline.
"""

import json
import sys
import time
import urllib.parse
import urllib.request

API = "https://api.inaturalist.org/v1"
PLACE_IDF = 10577
PLACE_FR = 6753
PLACE_EU = 97391
CC_LICENSES = "cc0,cc-by,cc-by-sa,cc-by-nc,cc-by-nc-sa"
THIN_IDF_THRESHOLD = 30
MIN_PHOTO_OBS = 20  # 12 training + 8 held-out test observations per species

# (query name, rank)
SPECIES = [
    ("Macrolepiota procera", "species"),
    ("Amanita phalloides", "species"),
    ("Lepiota brunneoincarnata", "species"),
    ("Russula virescens", "species"),
    ("Volvopluteus gloiocephalus", "species"),
    ("Amanita verna", "species"),
    ("Amanita virosa", "species"),
    ("Armillaria mellea", "species"),
    ("Galerina marginata", "species"),
    ("Kuehneromyces mutabilis", "species"),
    ("Amanita rubescens", "species"),
    ("Amanita pantherina", "species"),
    ("Agaricus campestris", "species"),
    ("Agaricus arvensis", "species"),
    ("Agaricus xanthodermus", "species"),
    ("Boletus edulis", "species"),
    ("Rubroboletus satanas", "species"),
    ("Neoboletus erythropus", "species"),
    ("Suillellus luridus", "species"),
    ("Amanita caesarea", "species"),
    ("Amanita muscaria", "species"),
    ("Clitocybe nebularis", "species"),
    ("Entoloma sinuatum", "species"),
    ("Lepista nuda", "species"),
    ("Cortinarius", "genus"),
    ("Cortinarius rubellus", "species"),
    ("Cortinarius orellanus", "species"),
    ("Cantharellus cibarius", "species"),
    ("Omphalotus olearius", "species"),
    ("Hygrophoropsis aurantiaca", "species"),
    ("Morchella", "genus"),
    ("Gyromitra esculenta", "species"),
]


def get(path, **params):
    url = f"{API}/{path}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"User-Agent": "mushroom-trainer/0.1 (personal study tool)"})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.load(resp)
            time.sleep(1.1)
            return data
        except Exception as exc:  # noqa: BLE001
            wait = 4 * 2**attempt
            print(f"retry {url} in {wait}s: {exc}", file=sys.stderr)
            time.sleep(wait)
    raise RuntimeError(f"failed: {url}")


def resolve(name, rank):
    res = get("taxa", q=name, rank=rank, iconic_taxa="Fungi", per_page=10)["results"]
    for t in res:
        if t.get("matched_term", "").lower() == name.lower() or t["name"].lower() == name.lower():
            return t
    return res[0] if res else None


def count(taxon_id, place_id, **extra):
    return get(
        "observations",
        taxon_id=taxon_id,
        place_id=place_id,
        quality_grade="research",
        per_page=0,
        **extra,
    )["total_results"]


def month_hist(taxon_id, place_id):
    data = get(
        "observations/histogram",
        taxon_id=taxon_id,
        place_id=place_id,
        quality_grade="research",
        date_field="observed",
        interval="month_of_year",
    )
    return {int(k): v for k, v in data["results"]["month_of_year"].items()}


def main():
    out = {
        "generated_at_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "places": {"idf": PLACE_IDF, "france": PLACE_FR, "europe": PLACE_EU},
        "cc_licenses": CC_LICENSES,
        "min_photo_obs": MIN_PHOTO_OBS,
        "taxa": [],
    }
    for name, rank in SPECIES:
        taxon = resolve(name, rank)
        if taxon is None:
            out["taxa"].append({"query": name, "error": "not found"})
            continue
        tid = taxon["id"]
        idf = count(tid, PLACE_IDF)
        fr = count(tid, PLACE_FR)
        fr_cc = count(tid, PLACE_FR, photo_license=CC_LICENSES)
        eu_cc = count(tid, PLACE_EU, photo_license=CC_LICENSES) if fr_cc < MIN_PHOTO_OBS else None
        hist_place = PLACE_IDF if idf >= THIN_IDF_THRESHOLD else PLACE_FR
        hist = month_hist(tid, hist_place)
        peak = max(hist, key=hist.get) if any(hist.values()) else None
        row = {
            "query": name,
            "inat_name": taxon["name"],
            "taxon_id": tid,
            "rank": taxon["rank"],
            "idf_research_obs": idf,
            "fr_research_obs": fr,
            "fr_research_obs_with_cc_photo": fr_cc,
            "fr_cc_share": round(fr_cc / fr, 2) if fr else None,
            "eu_research_obs_with_cc_photo": eu_cc,
            "photo_pool": "france" if fr_cc >= MIN_PHOTO_OBS else ("europe" if (eu_cc or 0) >= MIN_PHOTO_OBS else "insufficient"),
            "month_hist_place": "idf" if hist_place == PLACE_IDF else "france",
            "month_hist": hist,
            "peak_month": peak,
        }
        print(json.dumps(row, ensure_ascii=False), file=sys.stderr)
        out["taxa"].append(row)
    json.dump(out, sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
