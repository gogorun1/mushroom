"use strict";
// Quiz rounds built from the current deck. Species questions use the asymmetric scores of plan §6.2:
// taking a toxic species for an edible one costs 5 points, a deadly one 20.
(function () {
  // Species someone would eat once they believe they have it. Expert-only edibles count: their deadly
  // lookalikes (纹缘盔孢伞 for 毛柄库恩菇) are why they carry that label.
  const EAT = new Set(["edible", "cook", "expert"]);
  const DANGER = new Set(["toxic", "deadly"]);
  const EDIBILITY_POINTS = {
    edible: { eat: 1, toxic: -1, unsure: 0 },
    cook: { eat: 1, toxic: -1, unsure: 0 },
    expert: { eat: 0, toxic: 0, unsure: 1 },
    avoid: { eat: 0, toxic: 0, unsure: 1 },
    toxic: { eat: -5, toxic: 1, unsure: 0.5 },
    deadly: { eat: -20, toxic: 1, unsure: 0.5 },
  };
  const EDIBILITY_ANSWER = { edible: "eat", cook: "eat", expert: "unsure", avoid: "unsure", toxic: "toxic", deadly: "toxic" };
  const EDIBILITY_OPTIONS = [
    { key: "eat", label: "可食" },
    { key: "toxic", label: "有毒" },
    { key: "unsure", label: "不确定·不吃" },
  ];
  const UNKNOWN = { key: "unknown", label: "看不出来" };

  // Constrained types come first so they get the first pick of targets; the round is shuffled afterwards.
  const MIX = ["pair", "text2name", "where", "name2photo", "edibility", "edibility", "photo2name", "photo2name", "photo2name"];
  const DRILL = ["photo2name", "pair", "edibility", "name2photo", "text2name"];
  const ROUND_SIZE = 10, MIN_POOL = 10;

  // Species that photos cannot tell apart reliably; never offered against each other.
  const CONFUSABLE = [
    ["Boletus edulis", "Boletus reticulatus", "Boletus aereus", "Boletus pinophilus"],
    ["Agaricus campestris", "Agaricus arvensis"],
    ["Amanita phalloides", "Amanita verna", "Amanita virosa"],
  ];
  const GENUS_ALIAS = { Inosperma: "Inocybe" };
  // Rough body plan, so that distractors look plausible. Anything not listed is a gilled mushroom.
  const SHAPES = {
    bolete: ["Boletus edulis", "Boletus reticulatus", "Boletus aereus", "Boletus pinophilus", "Imleria badia",
      "Neoboletus erythropus", "Leccinum", "Suillus", "Xerocomellus chrysenteron", "Tylopilus felleus", "Rubroboletus satanas"],
    chanterelle: ["Cantharellus cibarius", "Cantharellus", "Craterellus cornucopioides", "Craterellus tubaeformis", "Hydnum",
      "Hygrophoropsis aurantiaca", "Omphalotus olearius"],
    wood: ["Armillaria", "Pleurotus ostreatus", "Flammulina", "Kuehneromyces mutabilis", "Galerina marginata",
      "Hypholoma fasciculare", "Laetiporus sulphureus", "Fistulina hepatica", "Sparassis crispa", "Grifola frondosa",
      "Auricularia auricula-judae", "Cerioporus squamosus", "Hericium erinaceus"],
    ball: ["Calvatia gigantea", "Lycoperdon perlatum", "Scleroderma citrinum"],
    morel: ["Morchella", "Gyromitra esculenta"],
  };

  // Terms whose definitions overlap too much to be each other's wrong answers.
  const RELATED_TERMS = [
    ["volva", "sac-volva", "base"], ["veil", "ring", "cortina"], ["spores", "spore-print"], ["section", "egg"],
    ["pores", "tubes"], ["habitat", "host"],
  ];
  // Diagram questions: highlight one part with labels hidden and ask for its name.
  const PART_QUESTIONS = [
    { diagram: "anatomy", part: "cap", term: "cap", answer: "菌盖", others: ["菌褶", "菌环", "菌托", "菌柄"] },
    { diagram: "anatomy", part: "warts", term: "warts", answer: "疣", others: ["菌环", "菌托", "菌褶", "菌柄"] },
    { diagram: "anatomy", part: "gills", term: "gills", answer: "菌褶", others: ["管孔", "菌环", "菌托", "菌柄"] },
    { diagram: "anatomy", part: "ring", term: "ring", answer: "菌环", others: ["菌托", "菌褶", "菌柄", "疣"] },
    { diagram: "anatomy", part: "stem", term: "stem", answer: "菌柄", others: ["菌环", "菌托", "菌褶", "菌盖"] },
    { diagram: "anatomy", part: "volva", term: "volva", answer: "菌托", others: ["菌环", "菌柄", "菌褶", "疣"] },
    { diagram: "anatomy-bolete", part: "tubes", term: "tubes", answer: "菌管", others: ["菌褶", "网纹", "菌环"] },
    { diagram: "anatomy-bolete", part: "net", term: "reticulation", answer: "网纹", others: ["菌管", "菌环", "鳞片"] },
    { diagram: "underside", part: "gills", term: "gills", answer: "菌褶", others: ["褶棱", "管孔", "肉刺"] },
    { diagram: "underside", part: "ridges", term: "ridges", answer: "褶棱", others: ["菌褶", "管孔", "肉刺"] },
    { diagram: "underside", part: "pores", term: "pores", answer: "管孔", others: ["菌褶", "褶棱", "肉刺"] },
    { diagram: "underside", part: "spines", term: "spines", answer: "肉刺", others: ["菌褶", "褶棱", "管孔"] },
    { diagram: "attachment", part: "free", term: "free", answer: "离生", others: ["直生", "延生"] },
    { diagram: "attachment", part: "adnate", term: "adnate", answer: "直生", others: ["离生", "延生"] },
    { diagram: "attachment", part: "decurrent", term: "decurrent", answer: "延生", others: ["离生", "直生"] },
    { diagram: "sections", part: "egg", term: "egg", answer: "鹅膏卵", others: ["马勃", "硬皮马勃"] },
    { diagram: "sections", part: "puffball", term: "section", answer: "马勃", others: ["鹅膏卵", "硬皮马勃"] },
    { diagram: "sections", part: "earthball", term: "section", answer: "硬皮马勃", others: ["鹅膏卵", "马勃"] },
    { diagram: "veils", part: "cortina", term: "cortina", answer: "蛛网状菌幕", others: ["菌环", "菌托", "疣"] },
    { diagram: "veils", part: "ring", term: "ring", answer: "菌环", others: ["蛛网状菌幕", "菌托", "疣"] },
  ];
  const PART_PROMPT = {
    anatomy: "图里高亮的部分叫什么？",
    "anatomy-bolete": "这是一朵切开的牛肝菌。图里高亮的部分叫什么？",
    underside: "翻过来看菌盖下面。高亮的这种结构叫什么？",
    attachment: "这是纵切的一半。高亮的这种菌褶连接方式叫什么？",
    sections: "竖着切开。高亮的这个切面是哪一种？",
    veils: "图里高亮的部分叫什么？",
  };

  // Small seeded generator (mulberry32) so tests can replay rounds.
  function rngFrom(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function create(D, K, G, { rng = Math.random } = {}) {
    const S = D.species;
    const NAMES = Object.keys(S);
    const pick = (list) => list[Math.floor(rng() * list.length)];
    const shuffle = (list) => {
      const a = [...list];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };
    // Weighted random order (Efraimidis–Spirakis): heavier items tend to come first.
    const weightedOrder = (items, weight) => items
      .map((x) => ({ x, k: -Math.log(1 - rng()) / Math.max(weight(x), 1e-6) }))
      .sort((a, b) => a.k - b.k)
      .map((e) => e.x);

    const shapeOf = {};
    for (const [shape, list] of Object.entries(SHAPES)) for (const n of list) shapeOf[n] = shape;
    const shape = (n) => shapeOf[n] || "gilled";
    const confusable = {};
    for (const group of CONFUSABLE) for (const n of group) confusable[n] = new Set(group.filter((m) => m !== n));
    const genus = (n) => { const g = n.split(" ")[0]; return GENUS_ALIAS[g] || g; };
    const lookalikes = (n) => new Set([...(S[n].lookalikes || []), ...(K.lookalikeOf[n] || [])].filter((m) => S[m]));

    // True when two species are too alike to be fair options in one question, unless they are a curated lookalike pair.
    function clash(a, b) {
      if (a === b) return true;
      if (lookalikes(a).has(b)) return false;
      if (confusable[a] && confusable[a].has(b)) return true;
      return genus(a) === genus(b) && (!a.includes(" ") || !b.includes(" "));
    }

    const FRAGMENTS = [...new Set(NAMES.flatMap(K.fragments))];
    const mentionsName = (text) => FRAGMENTS.some((f) => text.includes(f));
    const hasPhotos = (n) => (S[n].photos || []).length > 0;

    function takePhoto(n, ctx) {
      const photos = S[n].photos || [];
      if (!photos.length) return null;
      const fresh = photos.filter((p) => !ctx.usedPhotos.has(p.url));
      const p = pick(fresh.length ? fresh : photos);
      ctx.usedPhotos.add(p.url);
      return p;
    }

    // Up to maxLookalikes curated lookalikes first, then species of the same body plan, preferring the deck.
    function distractors(target, ctx, { k = 3, maxLookalikes = 2, filter = () => true } = {}) {
      const out = [];
      const ok = (n) => S[n] && !out.includes(n) && !clash(target, n) && hasPhotos(n) && filter(n)
        && !out.some((m) => S[m].zh === S[n].zh);
      const take = (list, limit = k) => {
        let added = 0;
        for (const n of shuffle(list)) {
          if (out.length >= k || added >= limit) break;
          if (ok(n)) { out.push(n); added++; }
        }
      };
      const sameShape = (n) => shape(n) === shape(target);
      take([...lookalikes(target)], maxLookalikes);
      take(ctx.pool.filter(sameShape));
      take(NAMES.filter(sameShape));
      take(ctx.pool);
      take(NAMES);
      return out.length === k ? out : null;
    }

    const speciesOption = (n) => ({ key: n, label: S[n].zh, species: n });
    const withUnknown = (names) => [...shuffle(names).map(speciesOption), UNKNOWN];

    function photo2name(n, ctx) {
      const ds = distractors(n, ctx);
      const photo = ds && takePhoto(n, ctx);
      if (!photo) return null;
      return { type: "photo2name", kind: "species", target: n, prompt: "这是哪一种？", photo,
        options: withUnknown([n, ...ds]), answer: n, scoring: "recognition" };
    }

    function name2photo(n, ctx) {
      const ds = distractors(n, ctx);
      if (!ds || !hasPhotos(n)) return null;
      const options = shuffle([n, ...ds]).map((m) => ({ ...speciesOption(m), photo: takePhoto(m, ctx) }));
      return { type: "name2photo", kind: "species", target: n, prompt: `哪一张是「${S[n].zh}」？`,
        options: [...options, UNKNOWN], answer: n, scoring: "name2photo" };
    }

    function pair(n, ctx) {
      const others = [...lookalikes(n)].filter(hasPhotos);
      if (!others.length || !hasPhotos(n)) return null;
      const other = pick(others);
      return { type: "pair", kind: "species", target: n, prompt: "易混种二选一：这是哪一个？", photo: takePhoto(n, ctx),
        options: withUnknown([n, other]), answer: n, scoring: "recognition" };
    }

    function edibility(n, ctx) {
      const photo = takePhoto(n, ctx);
      if (!photo) return null;
      return { type: "edibility", kind: "species", target: n, prompt: "在林子里碰到这个，能吃吗？", photo,
        options: EDIBILITY_OPTIONS.map((o) => ({ ...o })), answer: EDIBILITY_ANSWER[S[n].edibility], scoring: "edibility" };
    }

    // A wrong option must not list any of the clue phrases itself, e.g. 管孔黄色 for two boletes.
    const clauses = (lines) => lines.flatMap((l) => l.split(/[，、；：（）]/)).map((c) => c.trim()).filter((c) => c.length >= 3);
    function text2name(n, ctx) {
      const lines = S[n].features.filter((f) => !mentionsName(f)).slice(0, 3);
      if (lines.length < 2) return null;
      const clues = clauses(lines);
      const fits = (m) => { const own = clauses(S[m].features); return clues.some((c) => own.some((o) => o.includes(c) || c.includes(o))); };
      const ds = distractors(n, ctx, { filter: (m) => !fits(m) });
      if (!ds) return null;
      return { type: "text2name", kind: "species", target: n, prompt: "哪一种有这些特征？", lines,
        options: withUnknown([n, ...ds]), answer: n, scoring: "recognition" };
    }

    function season(n, ctx) {
      const { month, zone } = ctx.deck;
      const here = K.counts(month, zone);
      if (!(here[n] > 0)) return null;
      const near = [((month + 10) % 12) + 1, month, (month % 12) + 1];
      const absent = (m) => !(here[m] > 0) && near.every((x) => K.profile(m)[x] === 0);
      const ds = distractors(n, ctx, { maxLookalikes: 0, filter: (m) => absent(m) && K.total(m) >= 5 })
        || distractors(n, ctx, { maxLookalikes: 0, filter: absent });
      if (!ds) return null;
      const place = zone === "idf" ? "在法兰西岛" : `去${K.zoneShort(zone)}`;
      return { type: "season", kind: "species", target: n, prompt: `${month} 月${place}，最可能碰到哪一种？`,
        options: shuffle([n, ...ds]).map(speciesOption), answer: n, scoring: "knowledge", month, zone, count: here[n] };
    }

    function habitat(n, ctx) {
      const text = S[n].habitat || "";
      if (text.length < 6 || /[A-Za-z]/.test(text) || mentionsName(text)) return null;
      const types = new Set(S[n].habitat_types);
      const ds = distractors(n, ctx, { maxLookalikes: 0, filter: (m) => !S[m].habitat_types.some((t) => types.has(t)) });
      if (!ds) return null;
      return { type: "habitat", kind: "species", target: n, prompt: "哪一种通常长在这样的地方？", lines: [text],
        options: shuffle([n, ...ds]).map(speciesOption), answer: n, scoring: "knowledge" };
    }

    const BUILDERS = { photo2name, name2photo, pair, edibility, text2name, season, habitat };
    function build(type, n, ctx) {
      if (type !== "where") return BUILDERS[type](n, ctx);
      return rng() < 0.5 ? season(n, ctx) || habitat(n, ctx) : habitat(n, ctx) || season(n, ctx);
    }

    const QUIZ_TERMS = G.TERMS.filter((t) => !G.NO_QUIZ.has(t.group));
    const related = {};
    for (const group of RELATED_TERMS) for (const id of group) related[id] = new Set(group);
    const PARTS_BY_TERM = {};
    for (const spec of PART_QUESTIONS) (PARTS_BY_TERM[spec.term] ||= []).push(spec);

    function partQuestion(spec) {
      return { type: "part", kind: "term", target: spec.term, prompt: PART_PROMPT[spec.diagram],
        svg: G.svg(spec.diagram, { labels: false, highlight: spec.part }), diagram: spec.diagram, part: spec.part,
        options: shuffle([spec.answer, ...spec.others]).map((label) => ({ key: label, label })), answer: spec.answer,
        scoring: "knowledge" };
    }

    function defQuestion(t) {
      const ok = (u) => u.id !== t.id && !(related[t.id] && related[t.id].has(u.id));
      const others = [...shuffle(QUIZ_TERMS.filter((u) => ok(u) && u.group === t.group)),
        ...shuffle(QUIZ_TERMS.filter((u) => ok(u) && u.group !== t.group))].slice(0, 3);
      const forward = rng() < 0.5;
      return { type: forward ? "term2def" : "def2term", kind: "term", target: t.id,
        prompt: forward ? `「${t.name}」是什么意思？` : `哪个词的意思是：${t.short}？`,
        options: shuffle([t, ...others]).map((u) => ({ key: u.id, label: forward ? u.short : u.name })),
        answer: t.id, scoring: "knowledge" };
    }

    function termQuestion(id) {
      const parts = PARTS_BY_TERM[id];
      if (parts && rng() < 0.6) return partQuestion(pick(parts));
      return G.BY_ID[id] && !G.NO_QUIZ.has(G.BY_ID[id].group) ? defQuestion(G.BY_ID[id]) : null;
    }

    const weakness = (st) => 0.5 + 2 * (st ? (st.wrong + 0.5 * st.unsure + 1) / (st.right + st.wrong + st.unsure + 2) : 0.5);

    function termQuestions(count, stats) {
      const ids = weightedOrder(QUIZ_TERMS.map((t) => t.id), (id) => weakness((stats.terms || {})[id]) * (PARTS_BY_TERM[id] ? 1.5 : 1));
      return ids.slice(0, count).map(termQuestion).filter(Boolean);
    }

    // The deck plus, when it is small, nearby decks: no habitat filter, the whole region, neighbouring months.
    function speciesPool(deck) {
      const names = [...deck.names];
      const add = (list) => {
        for (const n of list) {
          if (names.length >= MIN_POOL) return;
          if (S[n] && !names.includes(n)) names.push(n);
        }
      };
      add(deck.preview.map((p) => p.name));
      if (deck.habitat) add(K.buildDeck(deck.month, deck.zone, "").names);
      if (deck.zone !== "idf") add(K.buildDeck(deck.month, "idf", "").names);
      add(K.buildDeck(((deck.month + 10) % 12) + 1, "idf", "").names);
      add(K.buildDeck((deck.month % 12) + 1, "idf", "").names);
      add([...NAMES].sort((a, b) => K.total(b) - K.total(a)));
      return names;
    }

    function fill(plan, order, ctx) {
      const questions = [], used = new Set();
      for (const type of plan) {
        const tries = [...order.filter((n) => !used.has(n)), ...order.filter((n) => used.has(n))];
        let q = null;
        for (const n of tries) if ((q = build(type, n, ctx))) break;
        if (!q) for (const n of tries) if ((q = build("photo2name", n, ctx))) break;
        if (q) { questions.push(q); used.add(q.target); }
      }
      return questions;
    }

    // Shuffle, then move questions so the same species or term is not asked twice in a row.
    function arrange(questions) {
      const out = shuffle(questions);
      for (let i = 1; i < out.length; i++) {
        if (out[i].target !== out[i - 1].target) continue;
        const j = out.findIndex((q, k) => k > i && q.target !== out[i - 1].target && (!out[k - 1] || out[k - 1].target !== out[i].target));
        if (j > 0) [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    }

    function mistakes(stats) {
      const recent = (bucket, exists) => Object.entries(bucket || {}).filter(([id, s]) => s.miss && exists(id))
        .sort((a, b) => (b[1].t || 0) - (a[1].t || 0)).map(([id]) => id);
      return { species: recent(stats.species, (n) => S[n]), terms: recent(stats.terms, (id) => G.BY_ID[id]) };
    }

    // mode: "mix" (deck round), "species" (drill one species), "mistakes", "terms".
    function makeRound({ deck, mode = "mix", focus = null, stats = {} }) {
      const pool = speciesPool(deck);
      const ctx = { deck, pool, usedPhotos: new Set() };
      if (mode === "terms") return { mode, questions: arrange(termQuestions(ROUND_SIZE, stats)) };
      if (mode === "species") {
        const questions = DRILL.map((type) => build(type, focus, ctx) || build("photo2name", focus, ctx)).filter(Boolean);
        return { mode, focus, questions };
      }
      if (mode === "mistakes") {
        const { species, terms } = mistakes(stats);
        const termSlots = Math.min(terms.length, species.length ? 3 : ROUND_SIZE);
        const speciesSlots = Math.min(ROUND_SIZE - termSlots, Math.max(species.length, Math.min(6, species.length * DRILL.length)));
        const questions = [];
        for (let i = 0; species.length && questions.length < speciesSlots && i < speciesSlots * 3; i++) {
          const n = species[i % species.length];
          const type = DRILL[(i + Math.floor(i / species.length)) % DRILL.length];
          const q = build(type, n, ctx) || build("photo2name", n, ctx);
          if (q) questions.push(q);
        }
        for (const id of terms.slice(0, termSlots)) {
          const q = termQuestion(id);
          if (q) questions.push(q);
        }
        return { mode, questions: arrange(questions) };
      }
      const core = new Set(deck.names);
      const weight = (n) => ({ deadly: 2, toxic: 1.5 }[S[n].edibility] || 1) * weakness((stats.species || {})[n]) * (core.has(n) ? 2 : 1);
      const questions = fill(MIX, weightedOrder(pool, weight), ctx);
      questions.push(...termQuestions(ROUND_SIZE - questions.length, stats));
      return { mode, questions: arrange(questions), extended: pool.length > deck.names.length };
    }

    function grade(q, key) {
      const opt = q.options.find((o) => o.key === key);
      if (!opt) throw new Error(`no option ${key}`);
      const r = { key, correct: key === q.answer, unsure: false, points: 0, danger: false, fatal: false };
      if (q.scoring === "edibility") {
        const cls = S[q.target].edibility;
        r.points = EDIBILITY_POINTS[cls][key];
        r.unsure = key === "unsure" && !r.correct;
        r.danger = key === "eat" && DANGER.has(cls);
        r.fatal = r.danger && cls === "deadly";
        return r;
      }
      if (key === "unknown") { r.unsure = true; return r; }
      if (r.correct) { r.points = 1; return r; }
      if (q.scoring === "knowledge") return r;
      // For "which photo is X", the photo picked is what you would eat, believing it is X.
      const actual = q.scoring === "name2photo" ? opt.species : q.target;
      const believed = q.scoring === "name2photo" ? q.target : opt.species;
      r.danger = DANGER.has(S[actual].edibility) && EAT.has(S[believed].edibility);
      r.fatal = r.danger && S[actual].edibility === "deadly";
      r.points = r.fatal ? -20 : r.danger ? -5 : -1;
      return r;
    }

    function record(stats, q, r, now = Date.now()) {
      const bucket = q.kind === "term" ? (stats.terms ||= {}) : (stats.species ||= {});
      const s = (bucket[q.target] ||= { right: 0, wrong: 0, unsure: 0, danger: 0 });
      if (r.correct) s.right++; else if (r.unsure) s.unsure++; else s.wrong++;
      if (r.danger) s.danger++;
      s.miss = !r.correct;
      s.t = now;
      const total = (stats.total ||= { answered: 0, correct: 0, points: 0, danger: 0, fatal: 0 });
      total.answered++;
      if (r.correct) total.correct++;
      total.points += r.points;
      if (r.danger) total.danger++;
      if (r.fatal) total.fatal++;
      return stats;
    }

    function summarize(results) {
      const s = { points: 0, correct: 0, unsure: 0, wrong: 0, danger: 0, fatal: 0 };
      for (const r of results) {
        if (!r) continue;
        s.points += r.points;
        if (r.correct) s.correct++; else if (r.unsure) s.unsure++; else s.wrong++;
        if (r.danger) s.danger++;
        if (r.fatal) s.fatal++;
      }
      return s;
    }

    return { makeRound, grade, record, summarize, mistakes, speciesPool, clash, lookalikes, shape, mentionsName,
      PART_QUESTIONS, QUIZ_TERMS, ROUND_SIZE };
  }

  window.Quiz = { create, rngFrom, EDIBILITY_POINTS, EDIBILITY_ANSWER, SHAPES, CONFUSABLE };
})();
