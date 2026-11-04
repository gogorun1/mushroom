"use strict";

(function () {
  const frame = document.getElementById("ledger-frame");
  const logEl = document.getElementById("log");
  const cardsEl = document.getElementById("cards");
  const summaryEl = document.getElementById("summary");
  const correctionEl = document.getElementById("correction");
  const runBtn = document.getElementById("run");
  const correctBtn = document.getElementById("apply-correction");
  const resetBtn = document.getElementById("reset");

  let drafts = [];
  let busy = false;

  function log(line) {
    logEl.textContent += (logEl.textContent ? "\n" : "") + line;
    logEl.scrollTop = logEl.scrollHeight;
  }

  function ui() {
    return frame.contentWindow && frame.contentWindow.LedgerUI;
  }

  function waitForLedger() {
    return new Promise((resolve, reject) => {
      const t0 = Date.now();
      (function poll() {
        if (ui()) return resolve(ui());
        if (Date.now() - t0 > 8000) return reject(new Error("ledger failed to load"));
        setTimeout(poll, 50);
      })();
    });
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function money(field) {
    if (typeof field.ledger === "number") return Verify.formatEUR(field.ledger);
    return String(field.ledger);
  }

  function renderCards(report) {
    cardsEl.textContent = "";
    report.forEach((card) => {
      const el = document.createElement("article");
      el.className = "card " + card.overall;
      const h = document.createElement("h3");
      h.appendChild(document.createTextNode(card.vendor + " · " + card.number));
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = card.overall;
      h.appendChild(badge);
      el.appendChild(h);
      const dl = document.createElement("dl");
      dl.className = "fields";
      ["date", "category", "ttc", "status"].forEach((key) => {
        const f = card.fields[key];
        const dt = document.createElement("dt");
        dt.textContent = key;
        const dd = document.createElement("dd");
        let shown = key === "date" ? Verify.formatDateFR(f.ledger) : key === "ttc" ? money(f) : String(f.ledger);
        if (f.verdict !== "match") {
          const expect = Array.isArray(f.expected)
            ? f.expected.map(Verify.formatDateFR).join(" or ")
            : key === "ttc"
              ? Verify.formatEUR(f.expected)
              : String(f.expected);
          shown += " → " + f.verdict + " (want " + expect + ")";
        }
        dd.textContent = shown;
        dl.appendChild(dt);
        dl.appendChild(dd);
      });
      el.appendChild(dl);
      cardsEl.appendChild(el);
    });
  }

  function renderSummary() {
    const invoices = Invoices.list;
    const ok = drafts.length === 3 && Verify.totalsMatch(drafts, invoices);
    const tDraft = Verify.draftTotals(drafts);
    const tInv = Verify.invoiceTotals(invoices);
    const report = drafts.length ? Verify.witness(drafts, invoices) : [];
    const blocked = report.some((c) => c.overall !== "match");
    summaryEl.className = "summary " + (ok && !blocked ? "ok" : "no");
    summaryEl.textContent = ok && !blocked
      ? "Draft TTC " + Verify.formatEUR(tDraft.ttc) + " matches the three invoices. Nothing posted."
      : "Draft TTC " + Verify.formatEUR(tDraft.ttc) + " vs invoices " + Verify.formatEUR(tInv.ttc) +
        (blocked ? ". Independent read still has a mismatch or an ambiguous date." : ".");
    correctBtn.disabled = !drafts.length || busy;
  }

  async function enterNaiveDrafts() {
    const ledger = await waitForLedger();
    ledger.reset();
    logEl.textContent = "";
    log("Goal: enter the three invoices as drafts. Do not post.");
    const planned = Verify.naiveDrafts(Invoices.list);
    for (const row of planned) {
      log("Actor: " + row.vendor + " / " + Verify.formatDateFR(row.date) + " / " + row.category + " / " + Verify.formatEUR(row.ttc));
      ledger.fill(row);
      await sleep(280);
      ledger.saveFilled();
      await sleep(220);
    }
    ledger.showDrafts();
    drafts = ledger.drafts();
    const report = Verify.witness(drafts, Invoices.list);
    renderCards(report);
    const flagged = report.filter((c) => c.overall !== "match");
    flagged.forEach((c) => log("Witness: " + c.vendor + " is " + c.overall));
    renderSummary();
    correctionEl.value = "第三张是房租，入账日期用十月三十一日。";
    correctionEl.focus();
  }

  async function applyCorrection() {
    if (!drafts.length) return;
    const patch = Verify.parseCorrection(correctionEl.value);
    if (!Object.keys(patch).length) {
      log("Correction not understood. Name a category or a date.");
      return;
    }
    const ledger = await waitForLedger();
    const before = drafts.find((row) => row.invoiceId === "sci");
    const patched = Verify.applyCorrection(drafts, "sci", patch);
    const after = Object.assign({}, patched.find((row) => row.invoiceId === "sci"), { source: "corrected" });
    log("Correct only SCI: " + JSON.stringify(patch));
    ledger.fill(after);
    await sleep(200);
    ledger.saveFilled();
    ledger.showDrafts();
    drafts = ledger.drafts();
    const unchanged = drafts.filter((row) => row.invoiceId !== "sci");
    if (unchanged.length !== 2) throw new Error("other drafts lost");
    const sciNow = drafts.find((row) => row.invoiceId === "sci");
    if (before && sciNow && before.ttc !== sciNow.ttc) throw new Error("amount should stay");
    renderCards(Verify.witness(drafts, Invoices.list));
    renderSummary();
  }

  runBtn.addEventListener("click", async () => {
    if (busy) return;
    busy = true;
    runBtn.disabled = true;
    try {
      await enterNaiveDrafts();
    } catch (err) {
      log(String(err.message || err));
    } finally {
      busy = false;
      runBtn.disabled = false;
      renderSummary();
    }
  });

  correctBtn.addEventListener("click", async () => {
    if (busy) return;
    busy = true;
    try {
      await applyCorrection();
    } catch (err) {
      log(String(err.message || err));
    } finally {
      busy = false;
      renderSummary();
    }
  });

  resetBtn.addEventListener("click", async () => {
    const ledger = await waitForLedger();
    ledger.reset();
    drafts = [];
    logEl.textContent = "Ledger reset to the two posted seed rows.";
    cardsEl.textContent = "";
    correctionEl.value = "";
    renderSummary();
  });

  frame.addEventListener("load", () => {
    log("Ledger session is open as Marie Chen. Seed rows stay posted.");
    renderSummary();
  });
})();
