"use strict";
// Deterministic checks for Témoin: naive first pass, independent witness, field correction, totals.
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const web = path.join(__dirname, "..", "web");
const Invoices = require(path.join(web, "invoices.js"));
const Verify = require(path.join(web, "verify.js"));

let checks = 0;
function test(name, fn) {
  fn();
  checks += 1;
}

test("invoice pack is three documents and 1430.20 TTC", () => {
  assert.equal(Invoices.list.length, 3);
  assert.equal(Invoices.totals().ttc, 143020);
  assert.equal(Invoices.totals().ht, 119183);
  assert.equal(Invoices.totals().tva, 23837);
  assert.equal(Invoices.byId.sci.dates.length, 2);
});

test("formatEUR uses French grouping", () => {
  assert.equal(Verify.formatEUR(143020), "1\u00a0430,20\u00a0€");
  assert.equal(Verify.formatEUR(8740), "87,40\u00a0€");
});

test("naive actor misreads SCI date and category, keeps amounts", () => {
  const drafts = Verify.naiveDrafts(Invoices.list);
  const sci = drafts.find((row) => row.invoiceId === "sci");
  assert.equal(sci.date, "2026-11-05");
  assert.equal(sci.category, "Charges");
  assert.equal(sci.ttc, 120000);
  assert.equal(sci.status, "Brouillon");
  assert.equal(drafts.find((row) => row.invoiceId === "edf").category, "Énergie");
});

test("witness flags SCI date as uncertain and category as mismatch", () => {
  const drafts = Verify.naiveDrafts(Invoices.list);
  const report = Verify.witness(drafts, Invoices.list);
  const sci = report.find((card) => card.invoiceId === "sci");
  const edf = report.find((card) => card.invoiceId === "edf");
  assert.equal(edf.overall, "match");
  assert.equal(sci.fields.date.verdict, "uncertain");
  assert.equal(sci.fields.category.verdict, "mismatch");
  assert.equal(sci.fields.ttc.verdict, "match");
  assert.equal(sci.overall, "mismatch");
});

test("spoken correction updates only SCI", () => {
  const patch = Verify.parseCorrection("第三张是房租，入账日期用十月三十一日。");
  assert.equal(patch.category, "Loyer");
  assert.equal(patch.date, "2026-10-31");
  const before = Verify.naiveDrafts(Invoices.list);
  const after = Verify.applyCorrection(before, "sci", patch);
  assert.equal(after.find((row) => row.invoiceId === "edf").category, before[0].category);
  assert.equal(after.find((row) => row.invoiceId === "moulin").ttc, 14280);
  const sci = after.find((row) => row.invoiceId === "sci");
  assert.equal(sci.category, "Loyer");
  assert.equal(sci.date, "2026-10-31");
  assert.equal(sci.ttc, 120000);
});

test("after correction, witness is clean and totals match", () => {
  const patch = Verify.parseCorrection("c'est le loyer, date au 31 octobre");
  const drafts = Verify.applyCorrection(Verify.naiveDrafts(Invoices.list), "sci", patch);
  const report = Verify.witness(drafts, Invoices.list);
  assert.ok(report.every((card) => card.overall === "match"));
  assert.equal(Verify.totalsMatch(drafts, Invoices.list), true);
  assert.equal(Verify.draftTotals(drafts).ttc, 143020);
});

test("French due-date phrasing is a different patch", () => {
  const patch = Verify.parseCorrection("garde l'échéance du 5 novembre");
  assert.equal(patch.date, "2026-11-05");
});

test("seed posted vendors are still the expected two", () => {
  const seed = [
    { vendor: "Meunerie Dupont", status: "Comptabilisée" },
    { vendor: "Orange", status: "Comptabilisée" },
  ];
  assert.equal(Verify.postedUntouched(seed, ["Meunerie Dupont", "Orange"]), true);
  assert.equal(Verify.postedUntouched(seed, ["Meunerie Dupont"]), false);
});

test("operator pages are same-origin files the actor can drive", () => {
  const fs = require("node:fs");
  ["index.html", "ledger.html", "invoices.html", "operator.js", "ledger-ui.js"].forEach((name) => {
    const p = path.join(web, name);
    assert.ok(fs.existsSync(p), name);
    assert.ok(fs.statSync(p).size > 200, name + " too small");
  });
  assert.match(String(pathToFileURL(path.join(web, "index.html"))), /^file:/);
});

console.log(`${checks} checks passed`);
