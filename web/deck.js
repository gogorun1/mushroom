"use strict";
// Seasonal deck (plan §5.1): the most common edibles for a place and season, their dangerous lookalikes,
// and the most common dangerous species there.
(function () {
  const DECK_EDIBLES = 8, DECK_DANGERS = 4, PREVIEW_MIN_TOTAL = 5;
  const SEVERITY = { deadly: 0, toxic: 1, avoid: 2, expert: 3, cook: 4, edible: 5 };

  function create(D) {
    const S = D.species, M = D.meta;
    const EDIBLE = new Set(M.edible), DANGER = new Set(M.danger);
    const SEASON_OF = {};
    for (const s of M.seasons) for (const m of s.months) SEASON_OF[m] = s;

    const monthly = {};
    for (let m = 1; m <= 12; m++) {
      for (const [n, c] of Object.entries(D.months[m] || {})) (monthly[n] ||= Array(13).fill(0))[m] = c;
    }
    const profile = (n) => monthly[n] || Array(13).fill(0);
    const isPeak = (n, m) => {
      const p = profile(n), top = Math.max(...p);
      return top > 0 && p[m] >= 0.5 * top;
    };

    const lookalikeOf = {};
    for (const [n, s] of Object.entries(S)) for (const l of s.lookalikes || []) (lookalikeOf[l] ||= []).push(n);

    function pool(month, zone) {
      if (zone === "idf") return { counts: D.months[month] || {}, min: D.thresholds.idf };
      const z = D.zones[zone].seasons[SEASON_OF[month].key];
      const counts = {};
      for (const r of [...z.edible, ...z.danger]) counts[r.name] = r.observer_days;
      return { counts, min: D.thresholds.zone, total: z.total_observer_days };
    }

    function ranked(counts, min, classes) {
      return Object.entries(counts)
        .filter(([n, c]) => c >= min && S[n] && classes.has(S[n].edibility))
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    }

    function buildDeck(month, zone, habitat) {
      const here = pool(month, zone);
      const idf = pool(month, "idf");
      const habOk = (n) => !habitat || S[n].habitat_types.includes(habitat);

      const edibles = ranked(here.counts, here.min, EDIBLE).filter(([n]) => habOk(n)).slice(0, DECK_EDIBLES)
        .map(([n, c]) => ({ name: n, count: c, filled: false }));
      if (zone !== "idf") {
        for (const [n, c] of ranked(idf.counts, idf.min, EDIBLE)) {
          if (edibles.length >= DECK_EDIBLES) break;
          if (habOk(n) && !edibles.some((e) => e.name === n)) edibles.push({ name: n, count: c, filled: true });
        }
      }
      const inDeck = new Set(edibles.map((e) => e.name));

      const dangers = new Map();
      const addDanger = (n, reason) => {
        if (inDeck.has(n)) return;
        if (!dangers.has(n)) dangers.set(n, { name: n, count: here.counts[n] || 0, reasons: [] });
        dangers.get(n).reasons.push(reason);
      };
      for (const e of edibles) for (const l of S[e.name].lookalikes || []) addDanger(l, "lookalike");
      for (const [n] of ranked(here.counts, here.min, DANGER).slice(0, DECK_DANGERS)) addDanger(n, "common");
      const dangerList = [...dangers.values()].sort((a, b) =>
        SEVERITY[S[a.name].edibility] - SEVERITY[S[b.name].edibility] || b.count - a.count || a.name.localeCompare(b.name));
      for (const d of dangerList) inDeck.add(d.name);

      const next = (month % 12) + 1;
      const preview = Object.keys(S)
        .filter((n) => EDIBLE.has(S[n].edibility) && !inDeck.has(n) && habOk(n))
        .filter((n) => isPeak(n, next) && !isPeak(n, month) && profile(n).reduce((a, b) => a + b, 0) >= PREVIEW_MIN_TOTAL)
        .map((n) => ({ name: n, count: idf.counts[n] || 0 }));

      return { month, zone, habitat, edibles, dangers: dangerList, preview, total: here.total, next,
        names: [...edibles, ...dangerList].map((e) => e.name) };
    }

    const zh = (n) => S[n].zh + (S[n].zh_check ? " †" : "");
    const zoneLabel = (zone) => (zone === "idf" ? "法兰西岛全境（不含巴黎市内）" : D.zones[zone].label);
    const zoneShort = (zone) => (zone === "idf" ? "全境" : D.zones[zone].label.split("（")[0]);
    const total = (n) => profile(n).reduce((a, b) => a + b, 0);

    // Name pieces that may appear in running text: 鸡油菌属（其他种） gives 鸡油菌属 and 鸡油菌;
    // descriptive notes in brackets such as （含毒蕈碱） are not names.
    function fragments(n) {
      const [main, paren] = S[n].zh.split(/[（）]/);
      const out = [main, main.replace(/[属类]$/, "")];
      if (paren && !/[含，种]/.test(paren)) out.push(...paren.split("、").map((p) => p.replace(/等$/, "")));
      return [...new Set(out.filter((f) => f.length >= 2))];
    }

    return { S, M, EDIBLE, DANGER, SEVERITY, SEASON_OF, profile, isPeak, total, lookalikeOf, buildDeck,
      counts: (month, zone) => pool(month, zone).counts, zh, zoneLabel, zoneShort, fragments, DECK_EDIBLES };
  }

  window.Deck = { create };
})();
