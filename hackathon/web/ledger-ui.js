"use strict";

(function () {
  let rows = Ledger.load();
  let filter = "Brouillon";

  const tbody = document.getElementById("rows");
  const totalsEl = document.getElementById("totals");
  const hint = document.getElementById("filter-hint");
  const form = document.getElementById("entry-form");

  function eurosToCents(value) {
    const normalized = String(value).trim().replace(/\s/g, "").replace(",", ".");
    const n = Number(normalized);
    if (!Number.isFinite(n)) return null;
    return Math.round(n * 100);
  }

  function visibleRows() {
    if (filter === "all") return rows;
    return rows.filter((row) => row.status === filter);
  }

  function render() {
    const vis = visibleRows();
    tbody.textContent = "";
    vis.forEach((row) => {
      const tr = document.createElement("tr");
      tr.dataset.id = row.id;
      if (row.invoiceId) tr.dataset.invoiceId = row.invoiceId;
      const cells = [
        Verify.formatDateFR(row.date),
        row.vendor,
        row.category,
        Verify.formatEUR(row.ht),
        Verify.formatEUR(row.tva),
        Verify.formatEUR(row.ttc),
      ];
      cells.forEach((text, i) => {
        const td = document.createElement("td");
        if (i >= 3) td.className = "num";
        td.textContent = text;
        tr.appendChild(td);
      });
      const st = document.createElement("td");
      const badge = document.createElement("span");
      badge.className = "status " + (row.status === "Comptabilisée" ? "posted" : "draft");
      badge.textContent = row.status;
      st.appendChild(badge);
      tr.appendChild(st);
      tbody.appendChild(tr);
    });
    const t = Verify.draftTotals(vis);
    totalsEl.innerHTML = "";
    [["HT", t.ht], ["TVA", t.tva], ["TTC", t.ttc]].forEach(([label, cents]) => {
      const wrap = document.createElement("span");
      wrap.appendChild(document.createTextNode(label + " "));
      const strong = document.createElement("strong");
      strong.textContent = Verify.formatEUR(cents);
      wrap.appendChild(strong);
      totalsEl.appendChild(wrap);
    });
  }

  function setFilter(next) {
    filter = next;
    const map = {
      Brouillon: ["tab-drafts", "Pièces en brouillon — non transmises à la comptabilité."],
      Comptabilisée: ["tab-posted", "Écritures déjà comptabilisées. Ne pas modifier."],
      all: ["tab-all", "Journal complet de l'exercice."],
    };
    ["tab-drafts", "tab-posted", "tab-all"].forEach((id) => {
      document.getElementById(id).setAttribute("aria-selected", "false");
    });
    const spec = map[next];
    document.getElementById(spec[0]).setAttribute("aria-selected", "true");
    hint.textContent = spec[1];
    render();
  }

  function flash(id) {
    const tr = tbody.querySelector(`[data-id="${id}"]`);
    if (!tr) return;
    tr.classList.add("flash");
    setTimeout(() => tr.classList.remove("flash"), 1200);
  }

  function amountToCents(value, alreadyCents) {
    if (alreadyCents) {
      const n = Number(value);
      return Number.isInteger(n) ? n : null;
    }
    return eurosToCents(value);
  }

  function upsertFromForm(fields, alreadyCents) {
    const ht = amountToCents(fields.ht, alreadyCents);
    const tva = amountToCents(fields.tva, alreadyCents);
    const ttc = amountToCents(fields.ttc, alreadyCents);
    if (ht == null || tva == null || ttc == null) throw new Error("Montants invalides");
    const invoiceId = fields.invoiceId ? String(fields.invoiceId).trim() : "";
    const next = {
      id: fields.id || Ledger.uid(),
      date: fields.date,
      vendor: String(fields.vendor).trim(),
      category: fields.category,
      ht,
      tva,
      ttc,
      status: fields.status || "Brouillon",
      invoiceId: invoiceId || null,
      source: fields.source || "manual",
    };
    const idx = invoiceId
      ? rows.findIndex((row) => row.invoiceId === invoiceId)
      : rows.findIndex((row) => row.id === next.id);
    if (idx >= 0) {
      next.id = rows[idx].id;
      rows[idx] = next;
    } else {
      rows.push(next);
    }
    Ledger.save(rows);
    render();
    flash(next.id);
    return next;
  }

  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    upsertFromForm({
      date: document.getElementById("f-date").value,
      vendor: document.getElementById("f-vendor").value,
      category: document.getElementById("f-category").value,
      status: document.getElementById("f-status").value,
      ht: document.getElementById("f-ht").value,
      tva: document.getElementById("f-tva").value,
      ttc: document.getElementById("f-ttc").value,
      invoiceId: document.getElementById("f-invoice").value,
      source: document.getElementById("f-source").value || "form",
    }, false);
    form.reset();
    document.getElementById("f-status").value = "Brouillon";
  });

  document.getElementById("f-reset").addEventListener("click", () => {
    rows = Ledger.reset();
    render();
  });

  document.getElementById("tab-drafts").addEventListener("click", () => setFilter("Brouillon"));
  document.getElementById("tab-posted").addEventListener("click", () => setFilter("Comptabilisée"));
  document.getElementById("tab-all").addEventListener("click", () => setFilter("all"));

  window.LedgerUI = {
    snapshot() {
      return rows.map((row) => Object.assign({}, row));
    },
    drafts() {
      return rows.filter((row) => row.status === "Brouillon").map((row) => Object.assign({}, row));
    },
    reset() {
      rows = Ledger.reset();
      setFilter("Brouillon");
      return rows.map((row) => Object.assign({}, row));
    },
    fill(fields) {
      document.getElementById("f-date").value = fields.date;
      document.getElementById("f-vendor").value = fields.vendor;
      document.getElementById("f-category").value = fields.category;
      document.getElementById("f-status").value = fields.status || "Brouillon";
      document.getElementById("f-ht").value = (fields.ht / 100).toFixed(2);
      document.getElementById("f-tva").value = (fields.tva / 100).toFixed(2);
      document.getElementById("f-ttc").value = (fields.ttc / 100).toFixed(2);
      document.getElementById("f-invoice").value = fields.invoiceId || "";
      document.getElementById("f-source").value = fields.source || "form";
    },
    saveFilled() {
      document.getElementById("f-save").click();
    },
    upsert(fields) {
      const saved = upsertFromForm(fields, true);
      setFilter("Brouillon");
      return saved;
    },
    showDrafts() {
      setFilter("Brouillon");
    },
  };

  render();
})();
