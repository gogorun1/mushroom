"use strict";
// Deterministic money, naive drafts, independent witness, field-level correction.
// The actor may be a script or Holo. This module never trusts the actor's self-report.

const Verify = (function (Invoices) {
  const CATEGORIES = ["Énergie", "Fournitures", "Loyer", "Charges", "Télécom"];

  function formatEUR(cents) {
    const neg = cents < 0;
    const abs = Math.abs(cents);
    const whole = String(Math.floor(abs / 100));
    const frac = String(abs % 100).padStart(2, "0");
    const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
    return `${neg ? "−" : ""}${grouped},${frac}\u00a0€`;
  }

  function formatDateFR(iso) {
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  }

  function parseDateFR(value) {
    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (iso) return value;
    const fr = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/.exec(value);
    if (!fr) return null;
    return `${fr[3]}-${fr[2].padStart(2, "0")}-${fr[1].padStart(2, "0")}`;
  }

  function sumField(rows, field) {
    return rows.reduce((n, row) => n + (row[field] || 0), 0);
  }

  // Intentional mistakes the first pass is allowed to make:
  // SCI date = payment due (05/11), category = Charges (from "appel de fonds").
  function naiveDrafts(invoices) {
    return invoices.map((inv) => {
      const isSci = inv.id === "sci";
      return {
        invoiceId: inv.id,
        vendor: inv.vendor,
        date: isSci ? inv.dueDate : inv.issueDate,
        category: isSci ? "Charges" : inv.category,
        ht: inv.ht,
        tva: inv.tva,
        ttc: inv.ttc,
        status: "Brouillon",
        source: "actor",
      };
    });
  }

  function fieldVerdict(opts) {
    const { ledger, expected, candidates, kind, confirmed } = opts;
    if (kind === "date" && candidates && candidates.length > 1 && !confirmed) {
      if (candidates.includes(ledger)) {
        return { verdict: "uncertain", ledger, expected: candidates, note: "invoice has two dates" };
      }
      return { verdict: "mismatch", ledger, expected: candidates, note: "date not on the invoice" };
    }
    if (kind === "date" && candidates && candidates.length > 1 && confirmed) {
      if (candidates.includes(ledger)) return { verdict: "match", ledger, expected: ledger };
      return { verdict: "mismatch", ledger, expected: candidates, note: "date not on the invoice" };
    }
    if (ledger === expected) return { verdict: "match", ledger, expected };
    return { verdict: "mismatch", ledger, expected };
  }

  function witness(drafts, invoices) {
    const byId = Object.fromEntries(invoices.map((inv) => [inv.id, inv]));
    return drafts.map((row) => {
      const inv = byId[row.invoiceId];
      if (!inv) {
        return {
          invoiceId: row.invoiceId,
          vendor: row.vendor,
          overall: "mismatch",
          fields: {},
          note: "row does not match an invoice",
        };
      }
      const fields = {
        vendor: fieldVerdict({ ledger: row.vendor, expected: inv.vendor, kind: "text" }),
        date: fieldVerdict({
          ledger: row.date,
          expected: inv.periodEnd || inv.issueDate,
          candidates: inv.dates,
          kind: "date",
          confirmed: row.source === "corrected",
        }),
        category: fieldVerdict({ ledger: row.category, expected: inv.category, kind: "text" }),
        ht: fieldVerdict({ ledger: row.ht, expected: inv.ht, kind: "money" }),
        tva: fieldVerdict({ ledger: row.tva, expected: inv.tva, kind: "money" }),
        ttc: fieldVerdict({ ledger: row.ttc, expected: inv.ttc, kind: "money" }),
        status: fieldVerdict({ ledger: row.status, expected: inv.statusExpected, kind: "text" }),
      };
      const values = Object.values(fields);
      let overall = "match";
      if (values.some((f) => f.verdict === "mismatch")) overall = "mismatch";
      else if (values.some((f) => f.verdict === "uncertain")) overall = "uncertain";
      return { invoiceId: inv.id, vendor: inv.vendor, number: inv.number, overall, fields };
    });
  }

  function parseCorrection(text) {
    const t = String(text || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const patch = {};
    if (/(loyer|rent|房租|租金)/.test(t)) patch.category = "Loyer";
    if (/(energie|electric|edf|电)/.test(t)) patch.category = "Énergie";
    if (/(fourniture|farine|flour|物料)/.test(t)) patch.category = "Fournitures";
    if (/(charge)/.test(t) && !patch.category) patch.category = "Charges";

    if (/(31\s*oct|31\/10|10-31|十月三十一|月末|fin de periode|period end)/.test(t)) {
      patch.date = "2026-10-31";
    } else if (/(5\s*nov|05\/11|11-05|到期|echeance)/.test(t)) {
      patch.date = "2026-11-05";
    }

    const fr = t.match(/(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})/);
    if (fr) patch.date = `${fr[3]}-${fr[2].padStart(2, "0")}-${fr[1].padStart(2, "0")}`;
    return patch;
  }

  function applyCorrection(drafts, invoiceId, patch) {
    return drafts.map((row) => {
      if (row.invoiceId !== invoiceId) return row;
      return Object.assign({}, row, patch, { source: "corrected" });
    });
  }

  function invoiceTotals(invoices) {
    return invoices.reduce(
      (acc, inv) => {
        acc.ht += inv.ht;
        acc.tva += inv.tva;
        acc.ttc += inv.ttc;
        return acc;
      },
      { ht: 0, tva: 0, ttc: 0 }
    );
  }

  function draftTotals(drafts) {
    return {
      ht: sumField(drafts, "ht"),
      tva: sumField(drafts, "tva"),
      ttc: sumField(drafts, "ttc"),
    };
  }

  function totalsMatch(drafts, invoices) {
    const a = draftTotals(drafts);
    const b = invoiceTotals(invoices);
    return a.ht === b.ht && a.tva === b.tva && a.ttc === b.ttc;
  }

  function postedUntouched(allRows, seedVendors) {
    const posted = allRows.filter((row) => row.status === "Comptabilisée");
    if (posted.length !== seedVendors.length) return false;
    return seedVendors.every((vendor) => posted.some((row) => row.vendor === vendor));
  }

  return {
    CATEGORIES,
    formatEUR,
    formatDateFR,
    parseDateFR,
    sumField,
    naiveDrafts,
    witness,
    parseCorrection,
    applyCorrection,
    invoiceTotals,
    draftTotals,
    totalsMatch,
    postedUntouched,
  };
})(typeof Invoices !== "undefined" ? Invoices : typeof module !== "undefined" ? require("./invoices.js") : null);

if (typeof module !== "undefined") module.exports = Verify;
