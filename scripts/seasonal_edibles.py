#!/usr/bin/env python3
"""Rank the most commonly observed edible mushrooms in Île-de-France by season,
habitat and forest zone, and render a training sheet.

Commonness is measured in observer-days: several observations of the same taxon
by the same person on the same day count once, which damps prolific observers.

Usage:
  python3 scripts/seasonal_edibles.py [--refresh] [--no-photos] [--month N]

Inputs:  content/species.toml, content/zones.toml, iNat (cached in data/cache/)
Outputs: data/seasonal_edibles.json, docs/seasonal-edibles.md
"""

import argparse
import collections
import datetime as dt
import json
import sys
import tomllib
from pathlib import Path
from zoneinfo import ZoneInfo

import inat_fetch

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "data" / "cache"
OUT_JSON = ROOT / "data" / "seasonal_edibles.json"
OUT_MD = ROOT / "docs" / "seasonal-edibles.md"

SEASONS = [
    ("spring", "春（3–5 月）", (3, 4, 5)),
    ("summer", "夏（6–8 月）", (6, 7, 8)),
    ("early_autumn", "初秋（9 月）", (9,)),
    ("mid_autumn", "仲秋（10 月）", (10,)),
    ("late_autumn", "晚秋（11 月）", (11,)),
    ("winter", "冬（12–2 月）", (12, 1, 2)),
]
SEASON_OF_MONTH = {m: key for key, _, months in SEASONS for m in months}
SEASON_LABEL = {key: label for key, label, _ in SEASONS}

EDIBILITY_LABEL = {
    "edible": "可食",
    "cook": "需煮熟",
    "expert": "新手不吃",
    "avoid": "不推荐",
    "toxic": "有毒",
    "deadly": "致命",
}
EDIBLE = {"edible", "cook", "expert"}
DANGER = {"toxic", "deadly"}
HABITAT_TYPES = ["阔叶林", "针叶林", "草地林缘", "树木腐木"]

CC_LICENSES = "cc0,cc-by,cc-by-sa,cc-by-nc,cc-by-nc-sa"
PLACE_FR = 6753

MIN_IDF = 3
MIN_ZONE = 2
PHOTOS_PER_SPECIES = 6
REPORT_PHOTOS = 3


def load_content():
    species = tomllib.loads((ROOT / "content" / "species.toml").read_text())["species"]
    zone_cfg = tomllib.loads((ROOT / "content" / "zones.toml").read_text())
    zones, excluded = zone_cfg["zones"], set(zone_cfg.get("exclude_places", []))
    by_name = {s["name"]: s for s in species}
    for s in species:
        for name in s.get("lookalikes", []):
            if name not in by_name:
                sys.exit(f"{s['name']}: lookalike {name} has no entry in species.toml")
    return species, by_name, zones, excluded


def zone_of(obs, zones):
    if obs.get("obscured") or not obs.get("location"):
        return None
    lat, lng = map(float, obs["location"].split(","))
    place_ids = set(obs.get("place_ids") or [])
    for zone in zones:
        if place_ids & set(zone["places"]):
            return zone["id"]
        for south, north, west, east in zone["boxes"]:
            if south <= lat <= north and west <= lng <= east:
                return zone["id"]
    return None


def classify(observations, species, zones, excluded):
    taxa = inat_fetch.resolve_taxa([s["name"] for s in species], CACHE / "taxa.json")
    entry_by_taxon = {}
    for s in species:
        t = taxa.get(s["name"])
        if t is None:
            print(f"warning: {s['name']} not resolved, skipped", file=sys.stderr)
            continue
        s["taxon_id"] = t["id"]
        s["inat_name"] = t["name"]
        entry_by_taxon[t["id"]] = s["name"]

    agg = {
        "idf_season": collections.defaultdict(lambda: collections.defaultdict(set)),
        "idf_month": collections.defaultdict(lambda: collections.defaultdict(set)),
        "forest_month": collections.defaultdict(lambda: collections.defaultdict(set)),
        "zone_season": collections.defaultdict(
            lambda: collections.defaultdict(lambda: collections.defaultdict(set))
        ),
        "idf_season_total": collections.defaultdict(set),
        "zone_season_total": collections.defaultdict(lambda: collections.defaultdict(set)),
    }
    for obs in observations:
        observed_on = obs.get("observed_on")
        if not observed_on or not obs.get("taxon") or excluded & set(obs.get("place_ids") or []):
            continue
        month = int(observed_on[5:7])
        season = SEASON_OF_MONTH[month]
        observer_day = (obs["user"]["id"], observed_on)
        zone = zone_of(obs, zones)

        agg["idf_season_total"][season].add(observer_day)
        if zone:
            agg["zone_season_total"][zone][season].add(observer_day)

        ancestors = obs["taxon"].get("ancestor_ids") or [obs["taxon"]["id"]]
        entry = next((entry_by_taxon[a] for a in reversed(ancestors) if a in entry_by_taxon), None)
        if entry is None:
            continue
        agg["idf_season"][season][entry].add(observer_day)
        agg["idf_month"][month][entry].add(observer_day)
        if zone:
            agg["zone_season"][zone][season][entry].add(observer_day)
            agg["forest_month"][month][entry].add(observer_day)
    return agg


def ranked(counter_sets, by_name, classes, minimum, limit=None):
    rows = [
        (name, len(keys))
        for name, keys in counter_sets.items()
        if by_name[name]["edibility"] in classes and len(keys) >= minimum
    ]
    rows.sort(key=lambda r: (-r[1], r[0]))
    return rows[:limit] if limit else rows


def fetch_photos(species_names, by_name):
    """One photo per observation, top-voted French research-grade observations first."""
    cache_path = CACHE / "photos.json"
    cache = json.loads(cache_path.read_text()) if cache_path.exists() else {}
    for name in species_names:
        cached = cache.get(name)
        if isinstance(cached, dict) and cached.get("requested") == PHOTOS_PER_SPECIES:
            continue
        if "taxon_id" not in by_name[name]:
            continue
        results = inat_fetch.get(
            inat_fetch.API_V1,
            "observations",
            taxon_id=by_name[name]["taxon_id"],
            place_id=PLACE_FR,
            quality_grade="research",
            photos="true",
            photo_license=CC_LICENSES,
            order_by="votes",
            per_page=PHOTOS_PER_SPECIES,
        )["results"]
        photos = []
        for obs in results:
            photo = next((p for p in obs.get("photos", []) if p.get("license_code")), None)
            if photo:
                photos.append(
                    {
                        "url": photo["url"].replace("/square.", "/small."),
                        "attribution": photo["attribution"],
                        "observation": f"https://www.inaturalist.org/observations/{obs['id']}",
                    }
                )
        cache[name] = {"requested": PHOTOS_PER_SPECIES, "photos": photos}
        print(f"photos: {name} ({len(photos)})", file=sys.stderr)
    CACHE.mkdir(parents=True, exist_ok=True)
    cache_path.write_text(json.dumps(cache, ensure_ascii=False, indent=1))
    return {name: entry["photos"] for name, entry in cache.items() if isinstance(entry, dict)}


def zh(entry):
    return entry["zh"] + (" †" if entry.get("zh_check") else "")


def label(entry):
    return EDIBILITY_LABEL[entry["edibility"]]


def lookalike_text(entry, by_name):
    items = [f"{zh(by_name[n])}（{label(by_name[n])}）" for n in entry.get("lookalikes", [])]
    return "、".join(items) if items else "—"


def month_profile(name, agg):
    return {m: len(agg["idf_month"][m].get(name, ())) for m in range(1, 13)}


def peak_months(profile):
    top = max(profile.values())
    if top == 0:
        return "—"
    months = [m for m, c in profile.items() if c >= 0.5 * top]
    return "、".join(f"{m} 月" for m in months)


def render(agg, by_name, zones, photos, month, generated_at, n_obs):
    lines = []
    w = lines.append
    next_month = month % 12 + 1

    w("# 法兰西岛当季常见可食蘑菇（按季节 × 地点 × 生境）")
    w("")
    w(
        f"> 由 [`scripts/seasonal_edibles.py`](../scripts/seasonal_edibles.py) 自动生成，不要手改。"
        f"数据：iNaturalist 法兰西岛研究级真菌观察 {n_obs} 条，拉取于 {generated_at}。"
        "物种档案见 [`content/species.toml`](../content/species.toml)，片区见 [`content/zones.toml`](../content/zones.toml)。"
    )
    w(">")
    w("> **可食性只是训练标签，不是食用许可。** 任何要下锅的蘑菇都要先当面鉴定（SMF 周一 14:30–19:00，或药剂师）。")
    w("")
    w("## 怎么读")
    w("")
    w("- **人日**：同一个人同一天对同一个种的多条观察只算一次，用来压低个别高产观察者的影响。")
    w("- **全境**：法兰西岛，不含巴黎市内（公园和布洛涅林、万森林都不能采）。**森林片区**：第三节列出的几片 ONF 森林合计，更接近实际采集地；全境多、片区少的种，主要长在城镇草地和行道树上。")
    w("- **可食性**：可食 / 需煮熟（生食有毒）/ 新手不吃（可食，但有致命或危险的易混种）。新手不吃的种也列出来，因为在林子里一定会碰到，必须认得。")
    w("- **偏差**：iNat 反映的是\"人们拍到了什么\"，不是产量。显眼的大型种偏多，小型、难鉴定的种（如纹缘盔孢伞、小型环柄菇）偏少。")
    w("- 中文名后带 † 的待核对。")
    w("")

    w(f"## 现在：{month} 月和 {next_month} 月")
    w("")
    for m in (month, next_month):
        rows = ranked(agg["idf_month"][m], by_name, EDIBLE, MIN_IDF, 12)
        danger = ranked(agg["idf_month"][m], by_name, DANGER, MIN_IDF, 8)
        w(f"### {m} 月")
        w("")
        w("| # | 可食种 | 可食性 | 全境人日 | 森林片区人日 | 生境 | 危险易混种 |")
        w("|---|---|---|---:|---:|---|---|")
        for i, (name, n) in enumerate(rows, 1):
            e = by_name[name]
            forest = len(agg["forest_month"][m].get(name, ()))
            w(f"| {i} | {zh(e)} *{e['name']}* | {label(e)} | {n} | {forest} | {'、'.join(e['habitat_types'])} | {lookalike_text(e, by_name)} |")
        w("")
        if danger:
            w("同月最常见的危险种：" + "、".join(f"{zh(by_name[n])}（{label(by_name[n])}，{c}）" for n, c in danger) + "。")
            w("")

    w("## 一、按季节（法兰西岛全境，不含巴黎市内）")
    w("")
    for key, season_label, _ in SEASONS:
        total = len(agg["idf_season_total"][key])
        rows = ranked(agg["idf_season"][key], by_name, EDIBLE, MIN_IDF, 15)
        danger = ranked(agg["idf_season"][key], by_name, DANGER, MIN_IDF, 6)
        w(f"### {season_label}")
        w("")
        w(f"当季全部真菌观察 {total} 人日。")
        w("")
        if not rows:
            w("没有达到门槛（≥ 3 人日）的可食种。")
            w("")
            continue
        w("| # | 可食种 | 可食性 | 人日 | 占当季 | 生境 |")
        w("|---|---|---|---:|---:|---|")
        for i, (name, n) in enumerate(rows, 1):
            e = by_name[name]
            w(f"| {i} | {zh(e)} *{e['name']}* | {label(e)} | {n} | {n / total:.1%} | {'、'.join(e['habitat_types'])} |")
        w("")
        if danger:
            w("同季最常见的危险种：" + "、".join(f"{zh(by_name[n])}（{label(by_name[n])}）" for n, _ in danger) + "。")
            w("")

    w("## 二、按生境 × 季节（法兰西岛全境，不含巴黎市内）")
    w("")
    w("每格列该生境当季最常见的可食种（≥ 3 人日，最多 5 个），下一行是同生境同季最常见的危险种。")
    w("")
    w("| 生境 | " + " | ".join(lbl for _, lbl, _ in SEASONS) + " |")
    w("|---|" + "---|" * len(SEASONS))
    for habitat in HABITAT_TYPES:
        cells_edible, cells_danger = [], []
        for key, _, _ in SEASONS:
            pool = {n: k for n, k in agg["idf_season"][key].items() if habitat in by_name[n]["habitat_types"]}
            ed = ranked(pool, by_name, EDIBLE, MIN_IDF, 5)
            dg = ranked(pool, by_name, DANGER, MIN_IDF, 3)
            cells_edible.append("、".join(zh(by_name[n]) for n, _ in ed) or "—")
            cells_danger.append("、".join(zh(by_name[n]) for n, _ in dg) or "—")
        w(f"| **{habitat}** 可食 | " + " | ".join(cells_edible) + " |")
        w(f"| {habitat} ⚠ 危险 | " + " | ".join(cells_danger) + " |")
    w("")

    w("## 三、按森林片区 × 季节")
    w("")
    w("片区是近似边界框，含周边城镇；样本小的格子只能当参考。≥ 2 人日才列出，括号里是人日。")
    w("")
    for zone in zones:
        zid = zone["id"]
        w(f"### {zone['zh']}")
        w("")
        w("| 季节 | 样本（人日） | 最常见可食种 | 最常见危险种 |")
        w("|---|---:|---|---|")
        for key, season_label, _ in SEASONS:
            total = len(agg["zone_season_total"][zid][key])
            ed = ranked(agg["zone_season"][zid][key], by_name, EDIBLE, MIN_ZONE, 6)
            dg = ranked(agg["zone_season"][zid][key], by_name, DANGER, MIN_ZONE, 4)
            ed_text = "、".join(f"{zh(by_name[n])}（{c}）" for n, c in ed) or "—"
            dg_text = "、".join(f"{zh(by_name[n])}（{c}）" for n, c in dg) or "—"
            w(f"| {season_label} | {total} | {ed_text} | {dg_text} |")
        w("")

    edible_names = [
        n for n, _ in sorted(
            ((n, sum(month_profile(n, agg).values())) for n, e in by_name.items() if e["edibility"] in EDIBLE),
            key=lambda r: -r[1],
        )
        if sum(month_profile(n, agg).values()) > 0
    ]

    w("## 四、月历（法兰西岛全境，不含巴黎市内）")
    w("")
    w("● = 达到该种全年最多月份的一半以上，◐ = 20–50%，· = 有记录但更少。")
    w("")
    w("| 可食种 | 可食性 | " + " | ".join(f"{m}" for m in range(1, 13)) + " | 合计 |")
    w("|---|---|" + "---|" * 12 + "---:|")
    for name in edible_names:
        profile = month_profile(name, agg)
        top = max(profile.values())
        cells = []
        for m in range(1, 13):
            c = profile[m]
            cells.append("●" if c >= 0.5 * top else "◐" if c >= 0.2 * top else "·" if c else "")
        e = by_name[name]
        w(f"| {zh(e)} | {label(e)} | " + " | ".join(cells) + f" | {sum(profile.values())} |")
    w("")

    w("## 五、可食种档案（训练用）")
    w("")
    w("按全年人日从多到少排列。照片来自 iNaturalist 全法国研究级观察，按社区投票数取前 3 张，均为 CC 授权；点图片打开原观察。")
    w("")
    for name in edible_names:
        e = by_name[name]
        profile = month_profile(name, agg)
        w(f"### {zh(e)} · *{e['name']}* · {e['fr']} · {e['en']}")
        w("")
        w(f"**{label(e)}** · 法兰西岛 {sum(profile.values())} 人日 · 高峰 {peak_months(profile)} · 生境类型：{'、'.join(e['habitat_types'])}")
        w("")
        w(f"- **环境**：{e['habitat']}")
        w(f"- **宿主 / 基物**：{'、'.join(e['hosts'])}")
        w("- **细节（按可靠程度排序）**：")
        for i, feature in enumerate(e["features"], 1):
            w(f"  {i}. {feature}")
        w(f"- **危险易混种**：{lookalike_text(e, by_name)}")
        if e.get("notes"):
            w(f"- **注意**：{e['notes']}")
        pics = photos.get(name, [])[:REPORT_PHOTOS]
        if pics:
            w("")
            w(" ".join(f"[![{e['zh']}]({p['url']})]({p['observation']})" for p in pics))
            w("")
            w("<sub>" + "；".join(p["attribution"] for p in pics) + "</sub>")
        if "taxon_id" in e:
            w("")
            w(
                f"[在 iNat 上看法兰西岛的全部研究级照片](https://www.inaturalist.org/observations?place_id={inat_fetch.PLACE_IDF}"
                f"&taxon_id={e['taxon_id']}&quality_grade=research&photos=true)"
            )
        w("")
    return "\n".join(lines) + "\n"


SPECIES_FIELDS = ("zh", "zh_check", "fr", "en", "edibility", "habitat", "habitat_types", "hosts",
                  "features", "lookalikes", "notes", "taxon_id", "inat_name")


def to_json(agg, by_name, zones, photos, generated_at, n_obs):
    def table(sets, classes, minimum):
        return [{"name": n, "zh": by_name[n]["zh"], "edibility": by_name[n]["edibility"], "observer_days": c}
                for n, c in ranked(sets, by_name, classes, minimum)]

    return {
        "generated_at": generated_at,
        "observations": n_obs,
        "metric": "observer_days",
        "thresholds": {"idf": MIN_IDF, "zone": MIN_ZONE},
        "species": {
            name: {**{k: e[k] for k in SPECIES_FIELDS if k in e}, "photos": photos.get(name, [])}
            for name, e in by_name.items()
        },
        "seasons": {
            key: {
                "label": lbl,
                "total_observer_days": len(agg["idf_season_total"][key]),
                "edible": table(agg["idf_season"][key], EDIBLE, MIN_IDF),
                "danger": table(agg["idf_season"][key], DANGER, MIN_IDF),
            }
            for key, lbl, _ in SEASONS
        },
        "months": {
            m: {n: len(k) for n, k in agg["idf_month"][m].items()} for m in range(1, 13)
        },
        "zones": {
            z["id"]: {
                "label": z["zh"],
                "seasons": {
                    key: {
                        "total_observer_days": len(agg["zone_season_total"][z["id"]][key]),
                        "edible": table(agg["zone_season"][z["id"]][key], EDIBLE, MIN_ZONE),
                        "danger": table(agg["zone_season"][z["id"]][key], DANGER, MIN_ZONE),
                    }
                    for key, _, _ in SEASONS
                },
            }
            for z in zones
        },
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--refresh", action="store_true", help="re-download observations from iNat")
    parser.add_argument("--no-photos", action="store_true", help="skip photo lookup")
    parser.add_argument("--month", type=int, default=dt.datetime.now(ZoneInfo("Europe/Paris")).month,
                        help="month to treat as 'now'")
    args = parser.parse_args()

    species, by_name, zones, excluded = load_content()
    cache_file = CACHE / "idf_fungi_obs.jsonl.gz"
    observations = inat_fetch.fetch_observations(cache_file, refresh=args.refresh)
    fetched = dt.datetime.fromtimestamp(cache_file.stat().st_mtime, ZoneInfo("Europe/Paris"))
    generated_at = fetched.strftime("%Y-%m-%d %H:%M（巴黎时间）")

    agg = classify(observations, species, zones, excluded)
    photos = {} if args.no_photos else fetch_photos([s["name"] for s in species], by_name)

    OUT_JSON.write_text(json.dumps(to_json(agg, by_name, zones, photos, generated_at, len(observations)),
                                   ensure_ascii=False, indent=1) + "\n")
    OUT_MD.write_text(render(agg, by_name, zones, photos, args.month, generated_at, len(observations)))
    print(f"wrote {OUT_JSON.relative_to(ROOT)} and {OUT_MD.relative_to(ROOT)}", file=sys.stderr)


if __name__ == "__main__":
    main()
