"use strict";
// Checks the glossary, deck and quiz logic of the static site against the built data.
//   python3 scripts/build_site.py && node tests/site_test.js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.join(__dirname, "..");
const SCRIPTS = ["glossary.js", "deck.js", "quiz.js"];

for (const f of [...SCRIPTS, "app.js", "style.css"]) {
  const built = path.join(ROOT, "site", f);
  assert.ok(fs.existsSync(built), `site/${f} is missing; run python3 scripts/build_site.py`);
  assert.equal(fs.readFileSync(built, "utf8"), fs.readFileSync(path.join(ROOT, "web", f), "utf8"),
    `site/${f} is stale; run python3 scripts/build_site.py`);
}

const ctx = { console };
ctx.window = ctx;
vm.createContext(ctx);
for (const f of ["data.js", ...SCRIPTS]) vm.runInContext(fs.readFileSync(path.join(ROOT, "site", f), "utf8"), ctx, { filename: f });
const D = ctx.DATA, G = ctx.Glossary, Quiz = ctx.Quiz;
const K = ctx.Deck.create(D);
const S = D.species;
G.protect(Object.keys(S).flatMap(K.fragments));
const quiz = (seed) => Quiz.create(D, K, G, { rng: Quiz.rngFrom(seed) });

let checks = 0;
function test(name, fn) {
  try {
    fn();
    checks++;
  } catch (e) {
    console.error(`FAIL ${name}`);
    throw e;
  }
}

const ZONES = ["idf", ...Object.keys(D.zones)];
const HABITATS = ["", ...D.meta.habitat_types];
const COMBOS = [];
for (let month = 1; month <= 12; month++) for (const zone of ZONES) for (const habitat of HABITATS) COMBOS.push({ month, zone, habitat });

// ---- glossary ----

test("terms have unique ids, known groups and text", () => {
  const ids = new Set();
  for (const t of G.TERMS) {
    assert.ok(!ids.has(t.id), `duplicate term id ${t.id}`);
    ids.add(t.id);
    assert.ok(G.GROUPS.includes(t.group), `${t.id}: unknown group ${t.group}`);
    assert.ok(t.name && t.short && t.long && t.aliases.length, `${t.id}: missing text`);
  }
  for (const g of G.GROUPS) assert.ok(G.TERMS.some((t) => t.group === g), `group ${g} is empty`);
});

test("each alias points to one term", () => {
  const seen = {};
  for (const t of G.TERMS) for (const a of t.aliases) {
    assert.ok(!seen[a], `alias ${a} used by ${seen[a]} and ${t.id}`);
    seen[a] = t.id;
  }
});

test("diagrams label every part and highlight what the terms ask for", () => {
  for (const [id, d] of Object.entries(G.DIAGRAMS)) {
    const full = G.svg(id);
    assert.equal((full.match(/<g\b/g) || []).length, (full.match(/<\/g>/g) || []).length, `${id}: unbalanced <g>`);
    for (const part of d.parts) {
      assert.ok(full.includes(`data-part="${part}"`), `${id}: no part ${part}`);
      assert.ok(full.includes(`data-label="${part}"`), `${id}: no label for ${part}`);
    }
    const bare = G.svg(id, { labels: false });
    assert.ok(!bare.includes("data-label"), `${id}: labels left in unlabelled diagram`);
    assert.ok(!bare.includes(d.title), `${id}: title leaks into unlabelled diagram`);
  }
  for (const t of G.TERMS.filter((x) => x.diagram)) {
    const d = G.DIAGRAMS[t.diagram];
    assert.ok(d, `${t.id}: unknown diagram ${t.diagram}`);
    assert.ok(d.parts.includes(t.part), `${t.id}: ${t.diagram} has no part ${t.part}`);
    assert.ok(G.svg(t.diagram, { highlight: t.part }).includes(`data-part="${t.part}" class="hl"`), `${t.id}: no highlight`);
  }
});

test("linkify escapes text and links each term once", () => {
  const html = G.linkify('<b>菌管</b>和菌管 & "x"');
  assert.ok(html.startsWith("&lt;b&gt;"), html);
  assert.ok(html.includes("&amp; &quot;x&quot;"), html);
  assert.equal((html.match(/<button/g) || []).length, 1, html);
  assert.ok(html.includes('data-term="tubes"'), html);
  assert.ok(!G.linkify("菌管", "tubes").includes("<button"), "skip id still linked");
  assert.ok(G.linkify("菌盖下面").includes('data-term="cap"'));
});

test("species names are not split into terms", () => {
  for (const n of Object.keys(S)) {
    for (const f of K.fragments(n)) assert.ok(!G.linkify(f).includes("<button"), `${n}: ${f} links a term`);
  }
  assert.ok(!G.linkify("在老橡树基部").includes('data-term="base"'), "tree base linked as stem base");
});

test("every term definition renders", () => {
  for (const t of G.TERMS) assert.ok(G.linkify(t.long, t.id).length >= t.long.length);
});

// ---- term photos ----

const PHOTOS = D.term_photos;
const inEllipse = ([cx, cy, rx, ry], x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
const overlap = (a, b) => inEllipse(a, b[0], b[1]) || inEllipse(b, a[0], a[1]);

test("term photos are CC licensed, credited and circle known terms inside the frame", () => {
  assert.ok(PHOTOS.length > 0, "no term photos");
  const ids = new Set();
  for (const p of PHOTOS) {
    const where = `photo ${p.id}`;
    assert.ok(!ids.has(p.id), `${where} listed twice`);
    ids.add(p.id);
    assert.ok(["cc0", "cc-by", "cc-by-sa", "cc-by-nc", "cc-by-nc-sa"].includes(p.license), `${where}: licence ${p.license}`);
    assert.ok(p.attribution && p.zh && p.taxon && p.w > 0 && p.h > 0, `${where}: missing credit or size`);
    assert.match(p.observation, /^https:\/\/www\.inaturalist\.org\/observations\/\d+$/, where);
    assert.match(p.url, /^https:\/\/[^/]+\/photos\/\d+\/small\.(jpe?g|png)$/i, where);
    for (const m of p.marks) {
      const w = `${where} ${m.term}`;
      assert.ok(G.BY_ID[m.term], `${w}: unknown term`);
      assert.ok(m.note, `${w}: no note`);
      const [cx, cy, rx, ry] = m.at;
      const [l, t, r, b] = m.view || [0, 0, 1, 1];
      assert.ok(0 <= l && l < r && r <= 1 && 0 <= t && t < b && b <= 1, `${w}: bad view ${m.view}`);
      assert.ok(rx > 0 && ry > 0 && cx - rx >= l && cx + rx <= r && cy - ry >= t && cy + ry <= b, `${w}: circle leaves the picture`);
    }
  }
});

test("photo marks render as a cropped, dimmed photo with the spot circled", () => {
  const p = PHOTOS.find((x) => x.marks.some((m) => m.view));
  const m = p.marks.find((x) => x.view);
  const svg = G.photoSvg(p, m, { src: "a.jpg?x=1&y=2", view: m.view, label: "<b>" });
  const H = Math.round((1000 * p.h) / p.w);
  const box = svg.match(/viewBox="([^"]+)"/)[1].split(" ").map(Number);
  const want = [m.view[0] * 1000, m.view[1] * H, (m.view[2] - m.view[0]) * 1000, (m.view[3] - m.view[1]) * H];
  box.forEach((v, i) => assert.ok(Math.abs(v - want[i]) < 0.6, `viewBox ${box} != ${want}`));
  assert.ok(Math.abs(G.viewRatio(p, m.view) - box[2] / box[3]) < 0.01, "ratio does not match the crop");
  assert.ok(svg.includes('aria-label="&lt;b&gt;"') && svg.includes('href="a.jpg?x=1&amp;y=2"'), "attributes not escaped");
  assert.equal((svg.match(/<ellipse/g) || []).length, 2);
  assert.equal(G.photoIndex(PHOTOS)[m.term].filter((x) => x.mark === m).length, 1);
});

test("every common tree has a photo, and tree photos are not quiz material", () => {
  const byTerm = G.photoIndex(PHOTOS);
  const trees = G.TERMS.filter((t) => t.group === "常见的树");
  assert.ok(trees.length >= 20, `only ${trees.length} trees in the glossary`);
  for (const t of trees) {
    assert.ok(byTerm[t.id]?.length, `tree ${t.id} has no photo`);
    for (const { mark } of byTerm[t.id]) {
      assert.ok(!mark.others, `tree photo mark ${t.id} should not set others`);
    }
  }
});

// ---- 3D models ----

test("3D models are credited Sketchfab scans on species pages, small enough to load on a phone", () => {
  assert.ok(D.models_3d.length > 0, "no 3D models");
  const seen = new Set();
  for (const m of D.models_3d) {
    const where = `3D model for ${m.species}`;
    assert.ok(S[m.species], `${where}: no species page`);
    assert.ok(!seen.has(m.species), `${where}: listed twice`);
    seen.add(m.species);
    assert.match(m.uid, /^[0-9a-f]{32}$/, where);
    assert.ok(m.url.startsWith("https://sketchfab.com/3d-models/") && m.url.endsWith(m.uid), `${where}: page ${m.url}`);
    assert.ok(m.poster.startsWith(`https://media.sketchfab.com/models/${m.uid}/thumbnails/`), `${where}: poster ${m.poster}`);
    assert.ok(m.name && m.author && m.author_url && m.note, `${where}: missing credit or note`);
    assert.ok(m.mb > 0 && m.mb <= 25, `${where}: ${m.mb} MB`);
  }
});

// ---- deck ----

test("decks follow plan §5.1", () => {
  for (const { month, zone, habitat } of COMBOS) {
    const dk = K.buildDeck(month, zone, habitat);
    const where = `${month}/${zone}/${habitat || "all"}`;
    assert.equal(new Set(dk.names).size, dk.names.length, `${where}: duplicate species`);
    assert.ok(dk.edibles.length <= K.DECK_EDIBLES, where);
    for (const e of dk.edibles) {
      assert.ok(K.EDIBLE.has(S[e.name].edibility), `${where}: ${e.name} is not edible`);
      if (habitat) assert.ok(S[e.name].habitat_types.includes(habitat), `${where}: ${e.name} habitat`);
      for (const l of S[e.name].lookalikes || []) assert.ok(dk.names.includes(l), `${where}: lookalike ${l} of ${e.name} missing`);
    }
    for (let i = 1; i < dk.dangers.length; i++) {
      const a = K.SEVERITY[S[dk.dangers[i - 1].name].edibility], b = K.SEVERITY[S[dk.dangers[i].name].edibility];
      assert.ok(a <= b, `${where}: dangers not sorted by severity`);
    }
  }
});

// ---- quiz rounds ----

const clauses = (lines) => lines.flatMap((l) => l.split(/[，、；：（）]/)).map((c) => c.trim()).filter((c) => c.length >= 3);

function checkQuestion(Q, q, where) {
  const keys = q.options.map((o) => o.key), labels = q.options.map((o) => o.label);
  assert.equal(new Set(keys).size, keys.length, `${where}: duplicate option keys`);
  assert.equal(new Set(labels).size, labels.length, `${where}: duplicate option labels ${labels}`);
  assert.ok(keys.includes(q.answer), `${where}: answer ${q.answer} not offered`);
  assert.ok(q.prompt, `${where}: no prompt`);
  if (q.kind === "term") {
    assert.ok(G.BY_ID[q.target], `${where}: unknown term ${q.target}`);
    assert.ok(!G.NO_QUIZ.has(G.BY_ID[q.target].group), `${where}: tree names are not quizzed`);
    if (q.type === "part") {
      assert.ok(!q.svg.includes(q.answer), `${where}: diagram shows the answer ${q.answer}`);
      assert.ok(q.svg.includes('class="hl"'), `${where}: nothing highlighted`);
    } else {
      assert.equal(q.answer, q.target);
      for (const k of keys) assert.ok(G.BY_ID[k], `${where}: option ${k} is not a term`);
    }
    if (q.type === "photopart") {
      const { photo, mark } = q.mark;
      assert.ok(photo.marks.includes(mark) && mark.term === q.target, `${where}: photo does not circle ${q.target}`);
      assert.ok(keys.length >= 3, `${where}: too few options`);
      for (const k of keys) assert.ok(k === q.answer || mark.others.includes(k), `${where}: ${k} is not a listed wrong answer`);
    }
    return;
  }
  const t = q.target;
  assert.ok(S[t], `${where}: unknown species ${t}`);
  const photosOf = (n) => new Set((S[n].photos || []).map((p) => p.url));
  if (q.photo) assert.ok(photosOf(t).has(q.photo.url), `${where}: photo is not of ${t}`);
  const species = q.options.filter((o) => o.species).map((o) => o.species);
  for (const m of species) if (m !== t) assert.ok(!Q.clash(t, m), `${where}: ${m} too close to ${t}`);
  if (q.type === "name2photo") {
    const urls = q.options.filter((o) => o.photo).map((o) => o.photo.url);
    assert.equal(urls.length, 4, `${where}: needs four photos`);
    assert.equal(new Set(urls).size, 4, `${where}: repeated photo`);
    for (const o of q.options.filter((x) => x.photo)) assert.ok(photosOf(o.species).has(o.photo.url), `${where}: photo of wrong species`);
  }
  if (["photo2name", "pair", "edibility"].includes(q.type)) assert.ok(q.photo, `${where}: no photo`);
  if (["photo2name", "pair", "name2photo", "text2name"].includes(q.type)) {
    assert.equal(keys[keys.length - 1], "unknown", `${where}: 看不出来 should be last`);
  }
  if (q.type === "edibility") {
    assert.deepEqual([...keys], ["eat", "toxic", "unsure"]);
    assert.equal(q.answer, Quiz.EDIBILITY_ANSWER[S[t].edibility]);
  }
  if (q.type === "pair") assert.ok(Q.lookalikes(t).has(species.find((m) => m !== t)), `${where}: pair is not a lookalike`);
  if (q.type === "text2name") {
    assert.ok(q.lines.length >= 2, `${where}: too few clues`);
    for (const l of q.lines) assert.ok(!Q.mentionsName(l), `${where}: clue names a species: ${l}`);
    const clues = clauses(q.lines);
    for (const m of species.filter((x) => x !== t)) {
      const own = clauses(S[m].features);
      assert.ok(!clues.some((c) => own.some((o) => o.includes(c) || c.includes(o))), `${where}: ${m} also fits ${q.lines}`);
    }
  }
  if (q.type === "season") {
    const here = K.counts(q.month, q.zone);
    assert.ok(here[t] > 0, `${where}: ${t} not seen here`);
    const near = [((q.month + 10) % 12) + 1, q.month, (q.month % 12) + 1];
    for (const m of species.filter((x) => x !== t)) {
      assert.ok(!(here[m] > 0), `${where}: ${m} is seen here too`);
      for (const x of near) assert.equal(K.profile(m)[x], 0, `${where}: ${m} recorded in month ${x}`);
    }
  }
  if (q.type === "habitat") {
    const text = q.lines[0];
    assert.ok(!/[A-Za-z]/.test(text) && !Q.mentionsName(text), `${where}: habitat text gives the answer: ${text}`);
    for (const m of species.filter((x) => x !== t)) {
      assert.ok(!S[m].habitat_types.some((h) => S[t].habitat_types.includes(h)), `${where}: ${m} shares a habitat with ${t}`);
    }
  }
}

const typeCount = {};
test("every place, month and habitat gives a full mixed round", () => {
  COMBOS.forEach(({ month, zone, habitat }, i) => {
    const Q = quiz(1000 + i);
    const dk = K.buildDeck(month, zone, habitat);
    const where = `${month}/${zone}/${habitat || "all"}`;
    assert.ok(Q.speciesPool(dk).length >= 10, `${where}: pool too small`);
    const rd = Q.makeRound({ deck: dk, mode: "mix" });
    assert.equal(rd.questions.length, Q.ROUND_SIZE, `${where}: ${rd.questions.length} questions`);
    rd.questions.forEach((q, j) => {
      checkQuestion(Q, q, `${where} #${j + 1} ${q.type}`);
      typeCount[q.type] = (typeCount[q.type] || 0) + 1;
      if (j) assert.notEqual(q.target, rd.questions[j - 1].target, `${where}: same target twice in a row`);
    });
    const types = rd.questions.map((q) => q.type);
    assert.ok(types.filter((x) => x === "edibility").length >= 2, `${where}: fewer than two edibility questions`);
    assert.ok(types.some((x) => x === "photo2name"), `${where}: no photo question`);
    assert.ok(rd.questions.some((q) => q.kind === "term"), `${where}: no term question`);
  });
  for (const type of ["photo2name", "name2photo", "pair", "edibility", "text2name", "season", "habitat"]) {
    assert.ok(typeCount[type] > 0, `no ${type} questions in any round`);
  }
});

test("photos inside one round are not reused", () => {
  COMBOS.forEach(({ month, zone, habitat }, i) => {
    const rd = quiz(5000 + i).makeRound({ deck: K.buildDeck(month, zone, habitat), mode: "mix" });
    const urls = rd.questions.flatMap((q) => [q.photo, ...q.options.map((o) => o.photo)]).filter(Boolean).map((p) => p.url);
    const counts = {};
    for (const u of urls) counts[u] = (counts[u] || 0) + 1;
    // Species with fewer photos than questions may repeat; most rounds should not.
    const repeats = Object.values(counts).filter((c) => c > 1).length;
    assert.ok(repeats <= 1, `${month}/${zone}/${habitat}: ${repeats} photos repeated`);
  });
});

test("drilling one species asks five questions about it", () => {
  const dk = K.buildDeck(10, "idf", "");
  Object.keys(S).forEach((n, i) => {
    const Q = quiz(9000 + i);
    const rd = Q.makeRound({ deck: dk, mode: "species", focus: n });
    assert.equal(rd.questions.length, 5, `${n}: ${rd.questions.length} questions`);
    rd.questions.forEach((q, j) => {
      assert.equal(q.target, n);
      checkQuestion(Q, q, `${n} drill #${j + 1} ${q.type}`);
    });
  });
});

test("term rounds cover different terms", () => {
  const types = {};
  for (let seed = 0; seed < 50; seed++) {
    const Q = quiz(seed);
    const rd = Q.makeRound({ deck: K.buildDeck(11, "idf", ""), mode: "terms" });
    assert.equal(rd.questions.length, 10);
    assert.equal(new Set(rd.questions.map((q) => q.target)).size, 10, "repeated term");
    rd.questions.forEach((q, j) => {
      checkQuestion(Q, q, `terms seed ${seed} #${j + 1} ${q.type}`);
      types[q.type] = (types[q.type] || 0) + 1;
    });
  }
  for (const type of ["part", "photopart", "term2def", "def2term"]) assert.ok(types[type] > 0, `no ${type} questions`);
});

test("every part question can be asked without giving the answer away", () => {
  for (const spec of quiz(1).PART_QUESTIONS) {
    assert.ok(G.DIAGRAMS[spec.diagram].parts.includes(spec.part), `${spec.diagram}: no part ${spec.part}`);
    assert.ok(G.BY_ID[spec.term], `unknown term ${spec.term}`);
    assert.ok(!spec.others.includes(spec.answer), `${spec.answer} listed as its own distractor`);
    assert.ok(!G.svg(spec.diagram, { labels: false, highlight: spec.part }).includes(spec.answer), `${spec.diagram}/${spec.part} shows ${spec.answer}`);
  }
});

test("photo questions only offer words that are clearly wrong on that photo", () => {
  const Q = quiz(7);
  const related = {};
  for (const group of Quiz.RELATED_TERMS) for (const id of group) related[id] = group;
  let asked = 0;
  for (const p of PHOTOS) {
    const marks = p.marks.filter((m) => m.others);
    for (const m of marks) {
      const where = `photo ${p.id} ${m.term}`;
      assert.ok(!G.NO_QUIZ.has(G.BY_ID[m.term].group), `${where}: term is not quizzed`);
      assert.ok(m.others.length >= 2, `${where}: too few wrong answers`);
      for (const o of m.others) {
        assert.ok(G.BY_ID[o] && !G.NO_QUIZ.has(G.BY_ID[o].group), `${where}: ${o} is not a quiz term`);
        assert.ok(o !== m.term && !(related[m.term] || []).includes(o), `${where}: ${o} means nearly the same`);
        for (const x of p.marks) if (x.term === o) assert.ok(!overlap(m.at, x.at), `${where}: ${o} is circled at the same spot`);
      }
      for (const x of marks) if (x !== m) assert.ok(!overlap(m.at, x.at), `${where}: ${x.term} is asked at the same spot`);
      checkQuestion(Q, Q.photoPartQuestion({ photo: p, mark: m }), where);
      asked++;
    }
  }
  assert.ok(asked >= 20, `only ${asked} photo questions`);
  assert.equal(Object.values(Q.PHOTO_MARKS).flat().length, asked);
});

// ---- scoring (plan §6.2) ----

const byClass = (cls) => Object.keys(S).find((n) => S[n].edibility === cls);
const speciesQ = (type, scoring, target, others) => ({
  type, kind: "species", scoring, target, answer: target,
  options: [target, ...others].map((n) => ({ key: n, label: S[n].zh, species: n })).concat([{ key: "unknown", label: "看不出来" }]),
});

test("edibility answers score asymmetrically", () => {
  const Q = quiz(1);
  for (const cls of Object.keys(Quiz.EDIBILITY_POINTS)) {
    const n = byClass(cls);
    assert.ok(n, `no ${cls} species`);
    const q = { type: "edibility", kind: "species", scoring: "edibility", target: n, answer: Quiz.EDIBILITY_ANSWER[cls],
      options: ["eat", "toxic", "unsure"].map((key) => ({ key, label: key })) };
    for (const key of ["eat", "toxic", "unsure"]) {
      const r = Q.grade(q, key);
      assert.equal(r.points, Quiz.EDIBILITY_POINTS[cls][key], `${cls}/${key}`);
      assert.equal(r.danger, key === "eat" && (cls === "toxic" || cls === "deadly"), `${cls}/${key} danger`);
      assert.equal(r.fatal, key === "eat" && cls === "deadly", `${cls}/${key} fatal`);
    }
  }
  const t = Quiz.EDIBILITY_POINTS;
  assert.equal(t.deadly.eat, -20);
  assert.equal(t.toxic.eat, -5);
  assert.equal(t.deadly.unsure, 0.5);
  assert.equal(t.expert.unsure, 1);
  assert.equal(t.edible.unsure, 0);
});

test("recognition errors cost more when a poisonous species is taken for an edible one", () => {
  const Q = quiz(1);
  const deadly = "Amanita phalloides", edible = "Macrolepiota procera", toxic = byClass("toxic");
  assert.equal(S[deadly].edibility, "deadly");
  assert.equal(S[edible].edibility, "edible");
  let q = speciesQ("photo2name", "recognition", deadly, [edible]);
  assert.equal(Q.grade(q, deadly).points, 1);
  assert.deepEqual({ ...Q.grade(q, edible) }, { key: edible, correct: false, unsure: false, points: -20, danger: true, fatal: true });
  assert.equal(Q.grade(q, "unknown").points, 0);
  assert.equal(Q.grade(q, "unknown").unsure, true);
  q = speciesQ("photo2name", "recognition", toxic, [edible]);
  assert.equal(Q.grade(q, edible).points, -5);
  assert.equal(Q.grade(q, edible).fatal, false);
  q = speciesQ("photo2name", "recognition", edible, [deadly]);
  assert.equal(Q.grade(q, deadly).points, -1, "calling an edible deadly is a plain error");
  const galerina = "Galerina marginata", kuehneromyces = "Kuehneromyces mutabilis";
  assert.equal(S[kuehneromyces].edibility, "expert");
  q = speciesQ("pair", "recognition", galerina, [kuehneromyces]);
  assert.equal(Q.grade(q, kuehneromyces).points, -20, "an expert-only edible is still something people eat");
  q = speciesQ("photo2name", "recognition", deadly, [byClass("avoid")]);
  assert.equal(Q.grade(q, byClass("avoid")).points, -1, "nobody eats a species marked 不推荐");
  // Which photo is the edible one? Picking the deadly photo means eating it.
  q = speciesQ("name2photo", "name2photo", edible, [deadly]);
  assert.equal(Q.grade(q, deadly).points, -20);
  q = speciesQ("name2photo", "name2photo", deadly, [edible]);
  assert.equal(Q.grade(q, edible).points, -1);
  q = speciesQ("season", "knowledge", edible, [deadly]);
  assert.equal(Q.grade(q, deadly).points, 0);
  assert.throws(() => Q.grade(q, "nope"));
});

test("stats keep the latest misses for the mistakes round", () => {
  const Q = quiz(3);
  const stats = {};
  const edible = "Macrolepiota procera", deadly = "Amanita phalloides";
  const q1 = speciesQ("photo2name", "recognition", deadly, [edible]);
  const q2 = speciesQ("photo2name", "recognition", edible, [deadly]);
  Q.record(stats, q1, Q.grade(q1, edible), 1);
  Q.record(stats, q2, Q.grade(q2, "unknown"), 2);
  Q.record(stats, q1, Q.grade(q1, deadly), 3);
  const tq = { type: "term2def", kind: "term", scoring: "knowledge", target: "tubes", answer: "tubes",
    options: [{ key: "tubes", label: "a" }, { key: "gills", label: "b" }] };
  Q.record(stats, tq, Q.grade(tq, "gills"), 4);
  assert.equal(stats.total.answered, 4);
  assert.equal(stats.total.correct, 1);
  assert.equal(stats.total.points, -19);
  assert.equal(stats.total.fatal, 1);
  assert.equal(stats.species[deadly].right, 1);
  assert.equal(stats.species[deadly].danger, 1);
  const ms = Q.mistakes(stats);
  assert.deepEqual([...ms.species], [edible], "answered right later, so no longer a mistake");
  assert.deepEqual([...ms.terms], ["tubes"]);
  const rd = Q.makeRound({ deck: K.buildDeck(10, "idf", ""), mode: "mistakes", stats });
  assert.ok(rd.questions.length >= 2, `${rd.questions.length} questions`);
  for (const q of rd.questions) assert.ok(q.target === edible || q.target === "tubes", `unexpected ${q.target}`);
  const s = Q.summarize([Q.grade(q1, edible), Q.grade(q2, edible), Q.grade(q2, "unknown"), null]);
  assert.deepEqual({ ...s }, { points: -19, correct: 1, unsure: 1, wrong: 1, danger: 1, fatal: 1 });
});

console.log(`ok: ${checks} checks; question types over ${COMBOS.length} rounds:`,
  Object.entries(typeCount).map(([k, v]) => `${k} ${v}`).join(", "));
