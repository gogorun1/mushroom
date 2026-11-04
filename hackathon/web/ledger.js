"use strict";

const Ledger = (function () {
  const KEY = "atelier-faubourg-recettes-v1";

  const SEED = [
    {
      id: "seed-meunerie",
      date: "2026-09-12",
      vendor: "Meunerie Dupont",
      category: "Fournitures",
      ht: 8000,
      tva: 1600,
      ttc: 9600,
      status: "Comptabilisée",
      invoiceId: null,
      source: "seed",
    },
    {
      id: "seed-orange",
      date: "2026-10-03",
      vendor: "Orange",
      category: "Télécom",
      ht: 2499,
      tva: 500,
      ttc: 2999,
      status: "Comptabilisée",
      invoiceId: null,
      source: "seed",
    },
  ];

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return SEED.map((row) => Object.assign({}, row));
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return SEED.map((row) => Object.assign({}, row));
      return parsed;
    } catch (err) {
      return SEED.map((row) => Object.assign({}, row));
    }
  }

  function save(rows) {
    localStorage.setItem(KEY, JSON.stringify(rows));
  }

  function reset() {
    const rows = SEED.map((row) => Object.assign({}, row));
    save(rows);
    return rows;
  }

  function uid() {
    return "row-" + Math.random().toString(36).slice(2, 9);
  }

  return { KEY, SEED, load, save, reset, uid };
})();
