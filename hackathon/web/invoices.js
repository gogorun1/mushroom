"use strict";
// Three source invoices for the Témoin demo. Amounts are integer cents.

const Invoices = (function () {
  const list = [
    {
      id: "edf",
      number: "F-2026-10482",
      vendor: "EDF",
      title: "Facture d'électricité",
      issueDate: "2026-10-28",
      dates: ["2026-10-28"],
      category: "Énergie",
      categoryHints: ["électricité", "edf"],
      ht: 7283,
      tva: 1457,
      ttc: 8740,
      tvaRate: 20,
      statusExpected: "Brouillon",
      address: "2 boulevard de Vaugirard, 75015 Paris",
      lines: [
        { label: "Fourniture électricité — compte 524 193 882", ht: 7283 },
      ],
      notes: "Période de consommation : 01/10/2026 – 27/10/2026.",
    },
    {
      id: "moulin",
      number: "FA-4417",
      vendor: "Moulin de Seine",
      title: "Farine T55 — palette",
      issueDate: "2026-10-31",
      dates: ["2026-10-31"],
      category: "Fournitures",
      categoryHints: ["farine", "moulin"],
      ht: 11900,
      tva: 2380,
      ttc: 14280,
      tvaRate: 20,
      statusExpected: "Brouillon",
      address: "14 quai de la Loire, 93210 Saint-Denis",
      lines: [
        { label: "Farine T55 bio, 10 sacs de 25 kg", ht: 11900 },
      ],
      notes: "Livraison Atelier du Faubourg, 11 rue du Faubourg Saint-Antoine.",
    },
    {
      id: "sci",
      number: "AF-2026-11",
      vendor: "SCI du Faubourg",
      title: "Appel de fonds — occupation des locaux",
      issueDate: "2026-10-20",
      // Two plausible booking dates: payment due vs last day of the period.
      dates: ["2026-11-05", "2026-10-31"],
      dueDate: "2026-11-05",
      periodEnd: "2026-10-31",
      category: "Loyer",
      categoryHints: ["loyer", "bail", "locaux"],
      ht: 100000,
      tva: 20000,
      ttc: 120000,
      tvaRate: 20,
      statusExpected: "Brouillon",
      address: "11 rue du Faubourg Saint-Antoine, 75011 Paris",
      lines: [
        { label: "Loyer commercial — octobre 2026", ht: 100000 },
      ],
      notes:
        "Période : 1er octobre – 31 octobre 2026. Échéance de paiement : 05/11/2026. " +
        "Appel de fonds trimestriel hors provisions.",
    },
  ];

  const byId = Object.fromEntries(list.map((inv) => [inv.id, inv]));

  function totals() {
    return list.reduce(
      (acc, inv) => {
        acc.ht += inv.ht;
        acc.tva += inv.tva;
        acc.ttc += inv.ttc;
        return acc;
      },
      { ht: 0, tva: 0, ttc: 0 }
    );
  }

  return { list, byId, totals };
})();

if (typeof module !== "undefined") module.exports = Invoices;
