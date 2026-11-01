"use strict";
(function () {
  const D = window.DATA, G = window.Glossary;
  const K = Deck.create(D);
  const Q = Quiz.create(D, K, G);
  const S = D.species, M = D.meta;
  const esc = G.esc;
  G.protect(Object.keys(S).flatMap(K.fragments));
  const linkify = G.linkify;
  const TP = G.photoIndex(D.term_photos);
  const PHOTO_BY_ID = Object.fromEntries((D.term_photos || []).map((p) => [p.id, p]));

  const SETTINGS_KEY = "mushroom.settings.v1", STATS_KEY = "mushroom.stats.v1";
  const store = {
    get(key, fallback) {
      try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* private mode: keep in memory only */ }
    },
  };

  const parisMonth = () => Number(new Intl.DateTimeFormat("en", { timeZone: "Europe/Paris", month: "numeric" }).format(new Date()));
  const validZone = (z) => z === "idf" || Object.prototype.hasOwnProperty.call(D.zones, z);
  const saved = store.get(SETTINGS_KEY, {});
  const state = {
    month: parisMonth(),
    zone: validZone(saved.zone) ? saved.zone : "idf",
    habitat: M.habitat_types.includes(saved.habitat) ? saved.habitat : "",
    stats: store.get(STATS_KEY, {}),
    round: null,
    stack: [],
    scroll: {},
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const view = $("#view"), sheet = $("#sheet"), backdrop = $("#backdrop"), lightbox = $("#lightbox");
  const prevMonth = (m) => ((m + 10) % 12) + 1, nextMonth = (m) => (m % 12) + 1;
  const photoAt = (p, size) => p.url.replace(/\/(square|small|medium|large|original)\.(jpe?g|png)$/i, `/${size}.$2`);
  const spHref = (n) => `#/sp/${encodeURIComponent(n)}`;
  const label = (n) => M.edibility_label[S[n].edibility];
  const dangerWord = (n) => (S[n].edibility === "deadly" ? "致命" : "有毒");
  const fmtPoints = (x) => (x > 0 ? `+${x}` : x < 0 ? `−${-x}` : "0");
  const TERM_OF_CLASS = { expert: "expert", cook: "cook", avoid: "avoid" };
  const TYPE_LABEL = { photo2name: "看图认种", name2photo: "看名字找图", pair: "易混种二选一", edibility: "能不能吃",
    text2name: "按特征认种", season: "季节", habitat: "生境", part: "部位", photopart: "看照片认术语", term2def: "术语", def2term: "术语" };

  function badge(n, tappable) {
    const cls = S[n].edibility;
    return tappable && TERM_OF_CLASS[cls]
      ? `<button type="button" class="badge ${cls}" data-term="${TERM_OF_CLASS[cls]}">${esc(label(n))}</button>`
      : `<span class="badge ${cls}">${esc(label(n))}</span>`;
  }
  const termButton = (id, text) => `<button type="button" class="term" data-term="${id}">${esc(text)}</button>`;

  // ---- settings and routing ----

  const chipText = () => `${state.month} 月 · ${K.zoneShort(state.zone)}${state.habitat ? " · " + state.habitat : ""}`;
  function saveSettings() {
    store.set(SETTINGS_KEY, { zone: state.zone, habitat: state.habitat });
    $("#chip-text").textContent = chipText();
  }
  function deckHash() {
    const p = new URLSearchParams({ m: state.month, z: state.zone });
    if (state.habitat) p.set("h", state.habitat);
    return "#/deck?" + p;
  }
  function applyParams(p) {
    if (!p.has("m") && !p.has("z")) return;
    const m = Number(p.get("m"));
    if (m >= 1 && m <= 12) state.month = m;
    if (validZone(p.get("z"))) state.zone = p.get("z");
    state.habitat = M.habitat_types.includes(p.get("h")) ? p.get("h") : "";
    saveSettings();
  }

  function currentRoute() {
    const h = location.hash.replace(/^#/, "");
    if (h && !h.startsWith("/")) {
      // Links from the first version of the page: #m=11&z=fontainebleau&mode=quiz
      const p = new URLSearchParams(h);
      return { name: p.get("mode") === "quiz" ? "quiz" : "deck", params: p, legacy: true };
    }
    const [path, query = ""] = h.split("?");
    const parts = path.split("/").filter(Boolean);
    let arg;
    try { arg = parts[1] && decodeURIComponent(parts[1]); } catch (e) { arg = undefined; }
    const name = ["deck", "sp", "quiz", "terms"].includes(parts[0]) ? parts[0] : "deck";
    return { name, arg, params: new URLSearchParams(query) };
  }

  function render() {
    const r = currentRoute();
    if (r.legacy || r.name === "deck") history.replaceState(null, "", r.name === "quiz" ? "#/quiz" : deckHash());
    for (const a of document.querySelectorAll(".tabs a")) {
      const on = a.dataset.tab === (r.name === "sp" ? "deck" : r.name);
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    }
    if (r.name === "sp") renderSpecies(r.arg);
    else if (r.name === "quiz") renderQuiz();
    else if (r.name === "terms") renderTerms();
    else renderDeck();
    return r;
  }

  // Keeps a small history of routes so going back restores the previous scroll position.
  function onRoute() {
    const top = state.stack[state.stack.length - 1];
    if (top) state.scroll[top] = window.scrollY;
    closeSheet();
    closeZoom();
    const nav = currentRoute();
    if (nav.legacy || nav.name === "deck") applyParams(nav.params);
    const r = render();
    const key = r.name === "deck" ? "deck" : location.hash;
    let y = 0;
    if (state.stack.length >= 2 && state.stack[state.stack.length - 2] === key) {
      state.stack.pop();
      y = state.scroll[key] || 0;
    } else if (top !== key) {
      state.stack.push(key);
      if (state.stack.length > 50) state.stack.shift();
    }
    if (r.name === "terms" && r.arg) {
      const el = document.getElementById("t-" + r.arg);
      if (el) { el.open = true; drawTermFigure(el); el.scrollIntoView({ block: "center" }); return; }
    }
    window.scrollTo(0, y);
  }

  // ---- deck ----

  function row(n, sub, why) {
    const p = (S[n].photos || [])[0];
    return `<a class="row ${S[n].edibility}" href="${spHref(n)}">
      ${p ? `<img class="thumb" src="${esc(photoAt(p, "small"))}" alt="" loading="lazy">` : `<span class="thumb"></span>`}
      <span class="row-main">
        <span class="row-title"><span>${esc(K.zh(n))}</span>${badge(n)}</span>
        <span class="row-sub"><i>${esc(n)}</i>${sub ? " · " + esc(sub) : ""}</span>
        ${why ? `<span class="row-why">${esc(why)}</span>` : ""}
      </span>
      <span class="chev" aria-hidden="true">›</span>
    </a>`;
  }

  function dangerWhy(d, edibleNames) {
    const parts = [];
    const eds = (K.lookalikeOf[d.name] || []).filter((e) => edibleNames.has(e));
    if (d.reasons.includes("lookalike") && eds.length) parts.push("易混：" + eds.map((e) => S[e].zh).join("、"));
    if (d.reasons.includes("common")) parts.push("这里这季最常见的危险种之一");
    return parts.join("；");
  }

  function renderDeck() {
    const dk = K.buildDeck(state.month, state.zone, state.habitat);
    const idf = state.zone === "idf";
    const countLabel = idf ? `${state.month} 月全境` : "这片林子这季";
    const edibleNames = new Set(dk.edibles.map((e) => e.name));
    const when = idf ? `${state.month} 月` : K.SEASON_OF[state.month].label;
    let summary = `${K.zoneLabel(state.zone)} · ${when}${state.habitat ? " · " + state.habitat : ""}：`
      + `${dk.edibles.length} 个可食种，${dk.dangers.length} 个危险或不推荐的种`;
    if (dk.total != null) summary += `；这片林子这季共 ${dk.total} 人日的真菌记录${dk.total < 50 ? "，样本小，只当参考" : ""}`;
    const inRound = state.round && state.round.i < state.round.questions.length;

    let body;
    if (!dk.names.length) {
      body = `<div class="empty"><p>这个组合这季几乎没有记录。</p><div class="stack">
        ${state.habitat ? `<button type="button" class="btn" data-act="clear-habitat">看全部生境</button>` : ""}
        ${!idf ? `<button type="button" class="btn" data-act="zone-idf">看法兰西岛全境</button>` : ""}</div></div>`;
    } else {
      body = `
        <h2 class="sec-title">先认毒：危险种和不推荐的种（${dk.dangers.length}）</h2>
        <p class="hint">课表里可食种的易混种，以及这里这季最常见的危险种，按严重程度排。</p>
        <div class="list two">${dk.dangers.map((d) => row(d.name, d.count ? `${countLabel} ${d.count} 人日` : "", dangerWhy(d, edibleNames))).join("")}</div>
        <h2 class="sec-title">当季最常见的可食种（${dk.edibles.length}）</h2>
        <p class="hint">${linkify("按人日排，不按好不好吃排。新手不吃的种也列出来，因为在林子里一定会碰到。")}</p>
        <div class="list two">${dk.edibles.map((e) => row(e.name, e.filled ? `全境补位 · ${state.month} 月全境 ${e.count} 人日` : `${countLabel} ${e.count} 人日`)).join("")}</div>
        ${dk.preview.length ? `<h2 class="sec-title">预习：${dk.next} 月进入高峰（${dk.preview.length}）</h2>
          <p class="hint">按法兰西岛全境的月历。</p>
          <div class="list two">${dk.preview.map((p) => row(p.name, `${dk.next} 月进入高峰`)).join("")}</div>` : ""}`;
    }

    view.innerHTML = `
      <p class="warn"><strong>只是训练，不是食用许可。</strong>要下锅的蘑菇先当面鉴定（SMF 周一 14:30–19:00，或药剂师）。吃了不舒服打巴黎中毒中心 <a href="tel:+33140054848">01 40 05 48 48</a>；昏迷或呼吸困难打 15 或 112。</p>
      <p class="summary">${linkify(summary + "。")} <button type="button" class="linkish" data-act="settings">换时间地点</button></p>
      <div class="stack"><button type="button" class="btn primary big" data-act="${inRound ? "resume" : "start"}" data-mode="mix">${inRound ? "继续自测" : "用这份课表自测（10 题）"}</button></div>
      ${body}
      <footer class="foot">数据：iNaturalist 法兰西岛研究级真菌观察 ${D.observations} 条，拉取于 ${esc(D.generated_at)}；${linkify("人日")}指同一人同一天同一种只算一次。
        选全境时按月份排；选森林片区时按季节排，片区可食种不足 ${K.DECK_EDIBLES} 个时用${linkify("全境补位")}。中文名带 † 的待核对。
        照片均为 CC 授权，署名见详情页。<a href="https://github.com/gogorun1/mushroom/blob/main/docs/product-plan.md">产品 plan</a></footer>`;
  }

  // ---- species page ----

  function monthsStrip(n) {
    const p = K.profile(n), top = Math.max(...p);
    let out = "";
    for (let m = 1; m <= 12; m++) {
      const r = top ? p[m] / top : 0;
      const lv = r >= 0.5 ? 3 : r >= 0.2 ? 2 : r > 0 ? 1 : 0;
      out += `<span class="lv${lv}${m === state.month ? " now" : ""}" title="${m} 月：${p[m]} 人日">${m}</span>`;
    }
    return `<div class="months" aria-label="法兰西岛各月记录">${out}</div>`;
  }

  const creditHtml = (p, i, total) => `${total > 1 ? `${i} / ${total} · ` : ""}${esc(p.attribution)} · <a href="${esc(p.observation)}" target="_blank" rel="noopener">iNat 原观察</a>`;

  function deckReason(n) {
    const dk = K.buildDeck(state.month, state.zone, state.habitat);
    const d = dk.dangers.find((x) => x.name === n);
    if (d) return dangerWhy(d, new Set(dk.edibles.map((e) => e.name)));
    const e = dk.edibles.find((x) => x.name === n);
    if (e) return e.filled ? "当季可食种（全境补位）" : "当季最常见的可食种之一";
    return dk.preview.some((x) => x.name === n) ? `${dk.next} 月进入高峰` : "";
  }

  function renderSpecies(n) {
    const s = S[n];
    if (!s) {
      view.innerHTML = `<div class="empty"><p>没找到这个种。</p><a class="btn" href="#/deck">回课表</a></div>`;
      return;
    }
    const photos = s.photos || [];
    const slides = photos.map((p, i) => `<button type="button" class="slide" data-act="zoom" data-src="${esc(photoAt(p, "large"))}" aria-label="放大第 ${i + 1} 张">
        <img src="${esc(photoAt(p, "medium"))}" srcset="${esc(photoAt(p, "medium"))} 500w, ${esc(photoAt(p, "large"))} 1024w"
          sizes="(min-width: 760px) 720px, 100vw" alt="${esc(s.zh)}，第 ${i + 1} 张"${i ? ' loading="lazy"' : ""}></button>`).join("");
    const carousel = photos.length ? `
      <div class="carousel">
        <div class="slides" id="slides">${slides}</div>
        ${photos.length > 1 ? `<div class="dots" id="dots">${photos.map((_, i) => `<span${i ? "" : ' class="on"'}></span>`).join("")}</div>
          <button type="button" class="car-nav prev" data-act="slide" data-dir="-1" aria-label="上一张">‹</button>
          <button type="button" class="car-nav next" data-act="slide" data-dir="1" aria-label="下一张">›</button>` : ""}
      </div>
      <p class="credit" id="photo-credit">${creditHtml(photos[0], 1, photos.length)}</p>` : "";
    const reason = deckReason(n);
    const looks = (s.lookalikes || []).filter((l) => S[l]);
    const reverse = K.EDIBLE.has(s.edibility) ? [] : (K.lookalikeOf[n] || []);
    const inat = s.taxon_id ? ` · <a href="https://www.inaturalist.org/observations?place_id=10577&taxon_id=${s.taxon_id}&quality_grade=research&photos=true" target="_blank" rel="noopener">iNat 上的法兰西岛照片</a>` : "";

    view.innerHTML = `
      <article class="sp">
        <button type="button" class="back" data-act="back">‹ 返回</button>
        ${carousel}
        <header class="sp-head">
          <h1>${esc(K.zh(n))}</h1> ${badge(n, true)}
          <p class="names"><i>${esc(n)}</i> · ${esc(s.fr)} · ${esc(s.en)}</p>
          ${reason ? `<p class="reason">${esc(reason)}</p>` : ""}
        </header>
        ${s.notes ? `<p class="note"><strong>注意：</strong>${linkify(s.notes)}</p>` : ""}
        <section><h2>细节（按可靠程度排序）</h2><ol class="features">${s.features.map((f) => `<li>${linkify(f)}</li>`).join("")}</ol></section>
        <section><h2>环境</h2>
          <p>${linkify(s.habitat)}</p>
          <p class="meta">${termButton("habitat", "生境")}：${s.habitat_types.map((t) => linkify(t)).join("、")}<br>
            ${termButton("host", "宿主")}：${linkify(s.hosts.join("、"))}</p>
        </section>
        <section><h2>法兰西岛各月记录</h2>${monthsStrip(n)}<p class="hint">${linkify("颜色越深，那个月的人日越多；黑框是当前选的月份。")}</p></section>
        ${looks.length ? `<section><h2>${termButton("lookalike", "危险易混种")}</h2><div class="list">${looks.map((l) => row(l)).join("")}</div></section>` : ""}
        ${reverse.length ? `<section><h2>会被误认成</h2><div class="list">${reverse.map((l) => row(l)).join("")}</div></section>` : ""}
        <div class="stack"><button type="button" class="btn primary big" data-act="drill" data-name="${esc(n)}">练这个种（5 题）</button></div>
        <p class="credit">照片：${photos.map((p) => esc(p.attribution)).join("；")}${inat}</p>
      </article>`;

    const el = $("#slides");
    if (el && photos.length > 1) {
      let idx = 0;
      el.addEventListener("scroll", () => {
        const i = Math.min(photos.length - 1, Math.max(0, Math.round(el.scrollLeft / el.clientWidth)));
        if (i === idx) return;
        idx = i;
        document.querySelectorAll("#dots span").forEach((d, j) => d.classList.toggle("on", j === i));
        $("#photo-credit").innerHTML = creditHtml(photos[i], i + 1, photos.length);
      }, { passive: true });
    }
  }

  // ---- quiz ----

  function startRound(mode, focus) {
    const deck = K.buildDeck(state.month, state.zone, state.habitat);
    const rd = Q.makeRound({ deck, mode, focus, stats: state.stats });
    if (!rd.questions.length) return;
    state.round = { ...rd, i: 0, results: [] };
    if (location.hash === "#/quiz") { render(); window.scrollTo(0, 0); } else location.hash = "#/quiz";
  }

  function renderQuiz() {
    const rd = state.round;
    if (!rd) renderQuizStart();
    else if (rd.i >= rd.questions.length) renderSummary();
    else renderQuestion();
  }

  function renderQuizStart() {
    const dk = K.buildDeck(state.month, state.zone, state.habitat);
    const ms = Q.mistakes(state.stats);
    const nMiss = ms.species.length + ms.terms.length;
    const tot = state.stats.total;
    view.innerHTML = `
      <h1 class="page-title">自测</h1>
      <p class="lead">题目来自当前课表：${esc(chipText())}，${dk.names.length} 个种${dk.names.length < 10 ? "，不够的从全境同月和相邻月份补" : ""}。
        <button type="button" class="linkish" data-act="settings">换时间地点</button></p>
      <div class="stack">
        <button type="button" class="btn primary big" data-act="start" data-mode="mix">开始一轮（10 题）</button>
        <button type="button" class="btn" data-act="start" data-mode="mistakes"${nMiss ? "" : " disabled"}>只练错题${nMiss ? `（${nMiss}）` : "（还没有）"}</button>
        <button type="button" class="btn" data-act="start" data-mode="terms">只练术语（10 题）</button>
      </div>
      ${tot && tot.answered ? `<p class="muted">累计答了 ${tot.answered} 题，答对 ${Math.round((100 * tot.correct) / tot.answered)}%${tot.fatal ? `，致命误食 ${tot.fatal} 次` : ""}。
        <button type="button" class="linkish" data-act="reset-stats">清除记录</button></p>` : ""}
      <section class="howto">
        <h2>题型</h2>
        <ul>
          <li><b>看图认种</b>：一张照片，四个名字里选一个。</li>
          <li><b>看名字找图</b>：四张照片，找出题目说的那一种。</li>
          <li><b>易混种二选一</b>：可食种和它的危险易混种放在一起比。</li>
          <li><b>能不能吃</b>：只看照片，选可食、有毒或不确定·不吃。</li>
          <li><b>按特征认种</b>：读几条特征，选是哪一种。</li>
          <li><b>季节和生境</b>：这个月、这种地方最可能碰到哪一种。</li>
          <li><b>术语和部位</b>：示意图上高亮、或者实物照片上圈出了一处，说出它叫什么；或者选词的意思。</li>
        </ul>
        <h2>计分</h2>
        <table class="scores">
          <tr><td>答对</td><td>+1</td></tr>
          <tr><td>看不出来</td><td>0</td></tr>
          <tr><td>认错</td><td>−1</td></tr>
          <tr><td>把有毒的认成能吃的</td><td>−5</td></tr>
          <tr><td>把致命的认成能吃的</td><td>−20，记一次致命误食</td></tr>
        </table>
        <p class="muted">认种题里，把有毒的种认成新手不吃的种，也算认成能吃的。能不能吃题：有毒或致命的选"不确定·不吃"得 0.5；新手不吃和不推荐的种要选"不确定·不吃"才得分。术语、季节和生境题答错不扣分。</p>
      </section>`;
  }

  function photoFigure(p, answered) {
    const src = esc(photoAt(p, "medium"));
    return `<figure class="q-photo">
      <button type="button" class="zoom" data-act="zoom" data-src="${esc(photoAt(p, "large"))}" aria-label="放大照片" style="--photo:url('${src}')">
        <img src="${src}" alt="待认的蘑菇照片"></button>
      <figcaption>${esc(p.attribution)}${answered ? ` · <a href="${esc(p.observation)}" target="_blank" rel="noopener">iNat 原观察</a>` : ""} · 点图放大</figcaption>
    </figure>`;
  }

  function media(q, r) {
    if (q.mark) return markFigure(q.mark.photo, q.mark.mark, { reveal: !!r, height: 340 });
    if (q.photo) return photoFigure(q.photo, !!r);
    if (q.lines) return `<ul class="clues">${q.lines.map((l) => `<li>${linkify(l)}</li>`).join("")}</ul>`;
    if (q.svg) return `<figure class="fig card">${r ? G.svg(q.diagram, { highlight: q.part }) : q.svg}</figure>`;
    return "";
  }

  function optionsHtml(q, r) {
    const cls = (o) => {
      if (!r) return "";
      if (o.key === q.answer) return " is-right";
      if (o.key === r.key) return r.unsure ? " is-chosen" : " is-wrong";
      return " is-dim";
    };
    const btn = (o) => `<button type="button" class="opt${o.key === "unknown" || o.key === "unsure" ? " soft" : ""}${cls(o)}" data-key="${esc(o.key)}">${esc(o.label)}</button>`;
    if (q.type === "name2photo") {
      const tiles = q.options.filter((o) => o.photo).map((o, i) => `<button type="button" class="popt${cls(o)}" data-key="${esc(o.key)}" aria-label="第 ${i + 1} 张">
          <img src="${esc(photoAt(o.photo, "medium"))}" alt="选项照片 ${i + 1}">${r ? `<span class="cap">${esc(o.label)}</span>` : ""}</button>`).join("");
      const credits = q.options.filter((o) => o.photo).map((o) => esc(o.photo.attribution)).join("；");
      return `<div class="popts">${tiles}</div><p class="credit">照片：${credits}</p>
        <div class="options">${q.options.filter((o) => !o.photo).map(btn).join("")}</div>`;
    }
    return `<div class="options${q.type === "term2def" ? " one-col" : ""}">${q.options.map(btn).join("")}</div>`;
  }

  function verdict(q, r) {
    const p = fmtPoints(r.points) + " 分";
    if (r.fatal) return ["fatal", `致命误食 ${p}`];
    if (r.danger) return ["danger", `危险错误 ${p}`];
    if (r.correct) return ["good", `答对了 ${p}`];
    if (r.unsure) return ["unsure", `${q.scoring === "edibility" ? "不确定·不吃" : "看不出来"} ${p}`];
    return ["bad", `${q.scoring === "knowledge" ? "答错了，不扣分" : "答错了"} ${r.points ? p : ""}`.trim()];
  }

  function miniCard(n) {
    const s = S[n], p = (s.photos || [])[0];
    return `<div class="mini">
      ${p ? `<img src="${esc(photoAt(p, "small"))}" alt="">` : ""}
      <div class="mini-main">
        <p class="mini-title"><strong>${esc(s.zh)}</strong>${badge(n, true)}</p>
        <ul>${s.features.slice(0, 3).map((f) => `<li>${linkify(f)}</li>`).join("")}</ul>
        <a href="${spHref(n)}">看详情和更多照片 ›</a>
      </div>
    </div>`;
  }

  function edibilityText(n, key) {
    const s = S[n], cls = s.edibility, lab = label(n);
    if (cls === "edible" || cls === "cook") {
      if (key === "eat") return `对，这是${s.zh}，${lab}。${s.notes || ""}`;
      if (key === "unsure") return `这是${s.zh}，${lab}。不确定就不吃是对的，不扣分；认熟了再吃。`;
      return `这是${s.zh}，其实${lab}。认错了不危险，但会错过。`;
    }
    if (cls === "expert" || cls === "avoid") {
      const why = cls === "expert" ? "能吃，但有致命或危险的易混种，新手先不吃" : "不算有毒，但品质差、有争议或需要保护";
      return key === "unsure" ? `对。这是${s.zh}，属于${lab}：${why}。` : `这是${s.zh}，属于${lab}：${why}。应该选"不确定·不吃"。`;
    }
    if (key === "toxic") return `对，这是${s.zh}，${lab}。${s.notes || ""}`;
    if (key === "unsure") return `这是${s.zh}，${lab}。不确定就不吃保住了安全，得 0.5 分；下一步是一眼认出它。`;
    return `这是${s.zh}，${lab}！${s.notes || ""}`;
  }

  function explainSpecies(q, r) {
    const t = q.target;
    const opt = q.options.find((o) => o.key === r.key);
    const chosen = opt && opt.species && opt.species !== t ? opt.species : null;
    const name = (n) => `${S[n].zh}（${label(n)}）`;
    let text;
    if (q.scoring === "edibility") text = edibilityText(t, r.key);
    else if (q.type === "season") {
      const where = q.zone === "idf" ? `法兰西岛 ${q.month} 月` : `${K.zoneShort(q.zone)}这一季`;
      const others = q.options.filter((o) => o.key !== t).map((o) => S[o.key].zh).join("、");
      text = `${S[t].zh}在${where}有 ${q.count} 人日的记录；${others}在法兰西岛 ${prevMonth(q.month)}–${nextMonth(q.month)} 月都没有记录。`;
    } else if (q.type === "habitat") {
      text = `${S[t].zh}：${S[t].habitat_types.join("、")}。` + (chosen ? `${S[chosen].zh}：${S[chosen].habitat}。` : "");
    } else if (q.scoring === "name2photo") {
      text = r.correct ? `这张是${name(t)}。`
        : chosen ? `你选的那张是${name(chosen)}，不是${S[t].zh}。` + (r.danger ? `把${dangerWord(chosen)}的${S[chosen].zh}当成能吃的${S[t].zh}，吃下去就会中毒。` : "")
        : `绿框那张是${S[t].zh}。看不出来就不吃，不扣分。`;
    } else {
      text = r.correct ? `这是${name(t)}。`
        : chosen ? `这是${name(t)}，不是${name(chosen)}。` + (r.danger ? `把${dangerWord(t)}的${S[t].zh}认成能吃的${S[chosen].zh}，吃下去就会中毒。` : "")
        : `这是${name(t)}。看不出来就不吃，不扣分。`;
    }
    return `<p>${linkify(text)}</p>${miniCard(t)}${chosen ? miniCard(chosen) : ""}`;
  }

  function explainTerm(q, r) {
    const t = G.BY_ID[q.target];
    const picked = !r.correct && q.type !== "part" && G.BY_ID[r.key];
    const first = (TP[t.id] || [])[0];
    let fig = "";
    if (q.type === "term2def" || q.type === "def2term") {
      fig = first ? markFigure(first.photo, first.mark, { height: 240 })
        : t.diagram ? `<figure class="fig">${G.svg(t.diagram, { highlight: t.part })}</figure>` : "";
    }
    return `<p><b>${esc(q.type === "part" ? q.answer : t.name)}</b>：${linkify(t.long, t.id)}</p>
      ${picked ? `<p class="muted">你选的「${esc(picked.name)}」：${esc(picked.short)}。</p>` : ""}${fig}
      <p><button type="button" class="linkish" data-term="${t.id}">打开术语卡</button></p>`;
  }

  function renderQuestion() {
    const rd = state.round, q = rd.questions[rd.i], r = rd.results[rd.i];
    const points = Q.summarize(rd.results).points;
    const last = rd.i + 1 >= rd.questions.length;
    let feedback = "";
    if (r) {
      const [tone, title] = verdict(q, r);
      feedback = `<section class="feedback ${tone}" aria-live="polite"><p class="verdict">${esc(title)}</p>
          ${q.kind === "term" ? explainTerm(q, r) : explainSpecies(q, r)}</section>
        <div class="q-next"><button type="button" class="btn primary big" data-act="next">${last ? "看这一轮的结果" : "下一题"}</button></div>`;
    }
    view.innerHTML = `
      <div class="q-top"><span>第 ${rd.i + 1} / ${rd.questions.length} 题 · ${TYPE_LABEL[q.type]}</span>
        <span>得分 ${fmtPoints(points)}</span>
        <button type="button" class="linkish" data-act="quit">退出</button></div>
      <div class="progress"><span style="width:${(100 * (rd.i + (r ? 1 : 0))) / rd.questions.length}%"></span></div>
      <div class="question${r ? " answered" : ""}">
        <h2 class="q-prompt">${esc(q.prompt)}</h2>
        ${media(q, r)}
        ${optionsHtml(q, r)}
      </div>
      ${feedback}`;
    const nextQ = rd.questions[rd.i + 1];
    if (nextQ) for (const p of [nextQ.photo, ...nextQ.options.map((o) => o.photo)]) if (p) new Image().src = photoAt(p, "medium");
    if (nextQ && nextQ.mark) new Image().src = photoAt(nextQ.mark.photo, "large");
  }

  function answer(key) {
    const rd = state.round;
    if (!rd || rd.results[rd.i]) return;
    const q = rd.questions[rd.i];
    const r = Q.grade(q, key);
    rd.results[rd.i] = r;
    Q.record(state.stats, q, r);
    store.set(STATS_KEY, state.stats);
    render();
    const fb = $(".feedback");
    if (fb) fb.scrollIntoView({ behavior: "smooth", block: "nearest" });
    const next = $(".q-next .btn");
    if (next) next.focus({ preventScroll: true });
  }

  function missRow(q, r) {
    const opt = q.options.find((o) => o.key === r.key);
    const said = q.scoring === "name2photo" && opt.species ? `选了${S[opt.species].zh}的照片` : opt.label;
    if (q.kind === "term") {
      const t = G.BY_ID[q.target];
      return `<button type="button" class="row term-row" data-term="${t.id}"><span class="row-main">
        <span class="row-title">${esc(q.type === "part" ? q.answer : t.name)}</span>
        <span class="row-why">${esc(TYPE_LABEL[q.type])} · 你答了：${esc(said)}</span></span><span class="chev" aria-hidden="true">›</span></button>`;
    }
    return row(q.target, TYPE_LABEL[q.type], `你答了：${said}（${fmtPoints(r.points)}）`);
  }

  function renderSummary() {
    const rd = state.round;
    const s = Q.summarize(rd.results);
    const misses = rd.questions.map((q, i) => [q, rd.results[i]]).filter(([, r]) => r && !r.correct);
    const nMiss = (() => { const m = Q.mistakes(state.stats); return m.species.length + m.terms.length; })();
    const again = rd.mode === "species"
      ? `<button type="button" class="btn primary big" data-act="drill" data-name="${esc(rd.focus)}">再练一次这个种</button>
         <button type="button" class="btn" data-act="start" data-mode="mix">开始一轮（10 题）</button>`
      : `<button type="button" class="btn primary big" data-act="start" data-mode="${rd.mode}">再来一轮</button>`;
    view.innerHTML = `
      <h1 class="page-title">这一轮得分 ${fmtPoints(s.points)}</h1>
      <p class="lead">满分 ${rd.questions.length}。答对 ${s.correct} 题，不确定 ${s.unsure} 题，答错 ${s.wrong} 题。</p>
      ${s.danger ? `<p class="alert">把有毒或致命的种当成能吃的：${s.danger} 次${s.fatal ? `，其中致命误食 ${s.fatal} 次` : ""}。这些种请回详情页重点看。</p>`
        : `<p class="good-note">这一轮没有把有毒或致命的种当成能吃的。</p>`}
      ${misses.length ? `<h2 class="sec-title">没答对的题（${misses.length}）</h2><div class="list">${misses.map(([q, r]) => missRow(q, r)).join("")}</div>` : ""}
      <div class="stack">${again}
        ${nMiss && rd.mode !== "mistakes" ? `<button type="button" class="btn" data-act="start" data-mode="mistakes">只练错题（${nMiss}）</button>` : ""}
        <button type="button" class="btn" data-act="quiz-home">换一种练法</button>
        <a class="btn" href="#/deck">回课表</a></div>`;
  }

  // ---- term photos ----

  // The species page for a photo's taxon, or for its genus when only the genus has an entry.
  function speciesOf(p) {
    const genus = p.taxon.split(" ")[0];
    return S[p.taxon] ? p.taxon : S[genus] ? genus : null;
  }
  function photoName(p) {
    const sp = speciesOf(p);
    return `${sp ? `<a href="${spHref(sp)}">${esc(p.zh)}</a>` : esc(p.zh)} <i>${esc(p.taxon)}</i>`;
  }
  const photoCredit = (p) => `${esc(p.attribution)} · <a href="${esc(p.observation)}" target="_blank" rel="noopener">iNat 原观察</a>`;

  const markLabel = (p, m) => `${p.zh}的照片，圈出了${G.BY_ID[m.term].name}`;
  const zoomButton = (p, i, svg, { hide = false, label }) => `<button type="button" class="pm" data-act="zoom-mark" data-photo="${p.id}" data-mark="${i}"${hide ? ' data-hide="1"' : ""}
      aria-label="${esc(label)}，点开看整张">${svg}</button>`;

  // One photo with one term circled, at most `height` px tall; tapping shows the whole photo.
  // reveal = false hides what is circled, for quiz questions.
  function markFigure(p, m, { reveal = true, height = 300 } = {}) {
    const view = m.view || [0, 0, 1, 1];
    const label = reveal ? markLabel(p, m) : "照片上圈出了一处";
    return `<figure class="pm-fig" style="max-width:${Math.round(height * G.viewRatio(p, view))}px">
      ${zoomButton(p, p.marks.indexOf(m), G.photoSvg(p, m, { src: photoAt(p, "large"), view, label }), { hide: !reveal, label })}
      <figcaption>${reveal ? `<span class="pm-note">${linkify(m.note, m.term)}</span><span class="pm-name">${photoName(p)}</span>
        <span class="credit">${photoCredit(p)}</span>` : `<span class="credit">${esc(p.attribution)} · 点图看整张</span>`}</figcaption>
    </figure>`;
  }

  // Real photos of the term, then its diagram.
  function termFigures(t, { caption = false } = {}) {
    const list = TP[t.id] || [];
    const photos = list.length ? `<div class="pm-list${list.length > 1 ? " multi" : ""}">${list.map((x) => markFigure(x.photo, x.mark)).join("")}</div>` : "";
    const diagram = t.diagram ? `<figure class="fig">${G.svg(t.diagram, { highlight: t.part })}${caption ? `<figcaption>${esc(G.DIAGRAMS[t.diagram].title)}</figcaption>` : ""}</figure>` : "";
    return photos + diagram;
  }

  // A photo with several marks: chips switch which one is circled.
  function overviewBody(p, i) {
    const m = p.marks[i], label = markLabel(p, m);
    return `${zoomButton(p, i, G.photoSvg(p, m, { src: photoAt(p, "large"), label }), { label })}
      <div class="chips" role="group" aria-label="切换圈出的部位">${p.marks.map((x, j) => `<button type="button" class="chip-btn" data-act="show-mark" data-i="${j}" aria-pressed="${j === i}">${esc(G.BY_ID[x.term].name)}</button>`).join("")}</div>
      <p class="pm-note">${linkify(m.note, m.term)} <button type="button" class="linkish" data-term="${m.term}">${esc(G.BY_ID[m.term].name)}的术语卡</button></p>
      <p class="credit">${photoName(p)} · ${photoCredit(p)}</p>`;
  }
  const overviewFigure = (p) => `<figure class="fig card pm-overview" data-photo="${p.id}">${overviewBody(p, 0)}
      <figcaption>实物：${esc(p.zh)}的各个部位，点上面的词换一处</figcaption></figure>`;

  function zoomMark(id, i, hide) {
    const p = PHOTO_BY_ID[id], m = p && p.marks[Number(i)];
    if (!m) return;
    const label = hide ? "整张照片" : markLabel(p, m);
    lightbox.innerHTML = `<figure class="lb-fig"><div class="lb-photo" style="width:min(100%, calc(80vh * ${G.viewRatio(p).toFixed(3)}))">
        ${G.photoSvg(p, m, { src: photoAt(p, "large"), label })}</div>
      <figcaption>${hide ? "" : `${esc(m.note)}<br>${esc(p.zh)} <i>${esc(p.taxon)}</i> · `}${esc(p.attribution)}</figcaption></figure>
      <button type="button" class="btn small" data-act="close-zoom">关闭</button>`;
    lightbox.hidden = false;
    document.body.classList.add("no-scroll");
  }

  // ---- glossary ----

  function termItem(t) {
    const haystack = [t.name, ...t.aliases, t.short, t.long].join(" ").toLowerCase();
    return `<details class="term-item" id="t-${t.id}" data-search="${esc(haystack)}">
      <summary><span class="t-name">${esc(t.name)}${TP[t.id] ? `<span class="t-has-photo">有照片</span>` : ""}</span><span class="t-short">${esc(t.short)}</span></summary>
      <div class="t-body"><p>${linkify(t.long, t.id)}</p>${t.diagram || TP[t.id] ? `<div class="t-fig"></div>` : ""}</div>
    </details>`;
  }

  function drawTermFigure(details) {
    const slot = details.querySelector(".t-fig");
    const t = G.BY_ID[details.id.slice(2)];
    if (slot && !slot.innerHTML && t) slot.innerHTML = termFigures(t);
  }

  function renderTerms() {
    const overviews = (D.term_photos || []).filter((p) => p.marks.length >= 3).map(overviewFigure).join("");
    const figs = Object.keys(G.DIAGRAMS).map((id) => `<figure class="fig card">${G.svg(id)}<figcaption>${esc(G.DIAGRAMS[id].title)}</figcaption></figure>`
      + (id === "anatomy" ? overviews : "")).join("");
    const groups = G.GROUPS.map((g) => `<section class="term-group"><h2>${esc(g)}</h2>${G.TERMS.filter((t) => t.group === g).map(termItem).join("")}</section>`).join("");
    view.innerHTML = `
      <h1 class="page-title">术语</h1>
      <p class="lead">正文里带虚线下划线的词都能点开看解释。先看几张图，再查单个的词；标着「有照片」的词展开后有实物照片，圈出来的就是这个词说的地方，点照片看整张。</p>
      <div class="stack"><button type="button" class="btn" data-act="start" data-mode="terms">只练术语（10 题）</button></div>
      <input type="search" class="search" id="term-search" placeholder="搜索：菌管、孢子印、hêtre" aria-label="搜索术语">
      <section class="figs" id="figs"><h2>图解</h2>${figs}</section>
      <div id="term-list">${groups}</div>
      <p class="muted" id="term-empty" hidden>没有找到。</p>`;
    $("#term-list").addEventListener("toggle", (ev) => { if (ev.target.open) drawTermFigure(ev.target); }, true);
    $("#term-search").addEventListener("input", (ev) => {
      const q = ev.target.value.trim().toLowerCase();
      let any = false;
      for (const g of document.querySelectorAll(".term-group")) {
        let shown = 0;
        for (const d of g.querySelectorAll(".term-item")) {
          const hit = !q || d.dataset.search.includes(q);
          d.hidden = !hit;
          if (hit) shown++;
        }
        g.hidden = !shown;
        any = any || shown > 0;
      }
      $("#figs").hidden = !!q;
      $("#term-empty").hidden = any;
    });
  }

  // ---- sheets ----

  let lastFocus = null;
  function openSheet(html, title) {
    if (sheet.hidden) lastFocus = document.activeElement;
    sheet.innerHTML = html;
    sheet.setAttribute("aria-label", title);
    sheet.hidden = false;
    backdrop.hidden = false;
    document.body.classList.add("no-scroll");
    sheet.scrollTop = 0;
    sheet.focus({ preventScroll: true });
  }
  function closeSheet() {
    if (sheet.hidden) return;
    sheet.hidden = true;
    backdrop.hidden = true;
    document.body.classList.remove("no-scroll");
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  }

  function openTerm(id) {
    const t = G.BY_ID[id];
    if (!t) return;
    openSheet(`
      <div class="sheet-head"><div><p class="eyebrow">${esc(t.group)}</p><h2>${esc(t.name)}</h2></div>
        <button type="button" class="btn small" data-act="close-sheet">关闭</button></div>
      <p class="lead"><b>${esc(t.short)}</b></p>
      <p>${linkify(t.long, t.id)}</p>
      ${termFigures(t, { caption: true })}
      <p><a href="#/terms/${t.id}" data-act="close-sheet">在术语表里看全部</a></p>`, t.name);
  }

  function openSettings() {
    const months = Array.from({ length: 12 }, (_, i) => i + 1)
      .map((m) => `<option value="${m}"${m === state.month ? " selected" : ""}>${m} 月 · ${esc(K.SEASON_OF[m].label.split("（")[0])}</option>`).join("");
    const zones = [["idf", "法兰西岛全境"], ...Object.keys(D.zones).map((z) => [z, K.zoneShort(z)])]
      .map(([z, l]) => `<option value="${z}"${z === state.zone ? " selected" : ""}>${esc(l)}</option>`).join("");
    const habitats = [["", "全部生境"], ...M.habitat_types.map((h) => [h, h])]
      .map(([h, l]) => `<option value="${esc(h)}"${h === state.habitat ? " selected" : ""}>${esc(l)}</option>`).join("");
    openSheet(`
      <div class="sheet-head"><h2>时间和地点</h2><button type="button" class="btn small primary" data-act="close-sheet">完成</button></div>
      <label class="field"><span>月份</span><select id="set-month">${months}</select></label>
      <label class="field"><span>地点</span><select id="set-zone">${zones}</select></label>
      <p class="hint" id="zone-hint">${esc(zoneHint(state.zone))}</p>
      <label class="field"><span>生境</span><select id="set-habitat">${habitats}</select></label>
      <p class="hint">月份默认是巴黎当月；地点和生境会记在这台设备上。</p>`, "时间和地点");
  }
  const zoneHint = (z) => (z === "idf" ? "按月份统计，不含巴黎市内。" : `包括：${(D.zones[z].label.split("（")[1] || "").replace(/）$/, "")}。按季节统计。`);

  function onSettingsChange(ev) {
    const id = ev.target.id;
    if (id === "set-month") state.month = Number(ev.target.value);
    else if (id === "set-zone") { state.zone = ev.target.value; $("#zone-hint").textContent = zoneHint(state.zone); }
    else if (id === "set-habitat") state.habitat = ev.target.value;
    else return;
    saveSettings();
    render();
  }

  function zoom(src) {
    lightbox.innerHTML = `<img src="${esc(src)}" alt="放大的照片"><button type="button" class="btn small" data-act="close-zoom">关闭</button>`;
    lightbox.hidden = false;
    document.body.classList.add("no-scroll");
  }
  function closeZoom() {
    if (lightbox.hidden) return;
    lightbox.hidden = true;
    lightbox.innerHTML = "";
    if (sheet.hidden) document.body.classList.remove("no-scroll");
  }

  // ---- events ----

  document.addEventListener("click", (ev) => {
    const term = ev.target.closest("[data-term]");
    if (term) { ev.preventDefault(); openTerm(term.dataset.term); return; }
    if (ev.target === backdrop) { closeSheet(); return; }
    if (ev.target.closest("#lightbox")) { closeZoom(); return; }
    const opt = ev.target.closest("[data-key]");
    if (opt && view.contains(opt)) { answer(opt.dataset.key); return; }
    const el = ev.target.closest("[data-act]");
    if (!el) return;
    const act = el.dataset.act;
    if (act === "settings") openSettings();
    else if (act === "close-sheet") closeSheet();
    else if (act === "start") startRound(el.dataset.mode);
    else if (act === "resume") location.hash = "#/quiz";
    else if (act === "drill") startRound("species", el.dataset.name);
    else if (act === "next") { state.round.i++; render(); window.scrollTo(0, 0); view.focus({ preventScroll: true }); }
    else if (act === "quit") {
      if (confirm("退出这一轮？已经答过的题会记进统计。")) { state.round = null; render(); window.scrollTo(0, 0); }
    } else if (act === "quiz-home") { state.round = null; render(); window.scrollTo(0, 0); }
    else if (act === "reset-stats") {
      if (confirm("清除这台设备上的所有答题记录？")) { state.stats = {}; store.set(STATS_KEY, state.stats); render(); }
    } else if (act === "zoom") zoom(el.dataset.src);
    else if (act === "zoom-mark") zoomMark(el.dataset.photo, el.dataset.mark, el.dataset.hide === "1");
    else if (act === "show-mark") {
      const fig = el.closest(".pm-overview"), p = fig && PHOTO_BY_ID[fig.dataset.photo];
      if (p) {
        fig.innerHTML = overviewBody(p, Number(el.dataset.i)) + fig.querySelector("figcaption").outerHTML;
        const chip = fig.querySelector(`[data-i="${el.dataset.i}"]`);
        if (chip) chip.focus({ preventScroll: true });
      }
    } else if (act === "slide") {
      const s = $("#slides");
      if (s) s.scrollBy({ left: Number(el.dataset.dir) * s.clientWidth, behavior: "smooth" });
    } else if (act === "back") {
      if (state.stack.length >= 2) history.back(); else location.hash = "#/deck";
    } else if (act === "clear-habitat") { state.habitat = ""; saveSettings(); render(); }
    else if (act === "zone-idf") { state.zone = "idf"; saveSettings(); render(); }
  });
  document.addEventListener("change", onSettingsChange);
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") { closeZoom(); closeSheet(); }
  });
  window.addEventListener("hashchange", onRoute);

  $("#chip").addEventListener("click", openSettings);
  $("#chip-text").textContent = chipText();
  onRoute();
})();
