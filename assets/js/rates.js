/* =====================================================================
   Rates & fees page — worked examples and method comparison, computed
   with the shared finance engine so figures always match the calculator.
   ===================================================================== */
(function () {
  "use strict";

  var F = window.JCOB_FINANCE;
  if (!F) return;
  var body = document.getElementById("method-body");
  var examples = document.getElementById("rate-examples");
  if (!body && !examples) return;

  function mwk(v) { return F.formatMWK(v); }

  if (body) {
    var base = { principal: 2000000, rate: 24, termMonths: 12, frequency: "monthly", processingFeePct: 2 };
    var reducing = F.amortize(Object.assign({}, base, { method: "reducing" }));
    var flat = F.amortize(Object.assign({}, base, { method: "flat" }));
    var diff = flat.totalCost - reducing.totalCost;
    body.innerHTML = [
      ["Reducing balance", reducing, "Cheaper overall"],
      ["Flat rate", flat, "+ " + mwk(diff) + " more"]
    ].map(function (row) {
      var c = row[1];
      return "<tr><th scope=\"row\">" + row[0] + "</th>" +
        '<td class="num">' + mwk(c.payment) + "</td>" +
        '<td class="num">' + mwk(c.totalInterest) + "</td>" +
        '<td class="num">' + mwk(c.processingFee) + "</td>" +
        '<td class="num"><strong>' + mwk(c.totalCost) + "</strong></td>" +
        '<td class="num">' + row[2] + "</td></tr>";
    }).join("");
  }

  /* Worked examples come from the published catalogue, computed by the same
     engine as the calculator, so a rate change in the console moves these
     figures too. */
  var CASES = [
    { id: "personal", amount: 2000000, term: 12, note: "School fees, repaid over one year" },
    { id: "business", amount: 8000000, term: 36, note: "Working capital for a retail business" },
    { id: "secured", amount: 25000000, term: 60, note: "Vehicle finance with collateral" }
  ];

  function catalogue() {
    var store = window.JCOB_SITE;
    return store && store.products && store.products.length ? store.products : null;
  }

  /* Seeded figures — used until the store answers, then replaced. */
  var FALLBACK = {
    personal: { name: "Personal loan", rate: 24, rateBasis: "annual", method: "reducing", min: 100000, max: 15000000, minTerm: 6, maxTerm: 48, fee: 2 },
    business: { name: "Business loan", rate: 22, rateBasis: "annual", method: "reducing", min: 500000, max: 50000000, minTerm: 12, maxTerm: 60, fee: 2.5 },
    secured: { name: "Secured loan", rate: 18, rateBasis: "annual", method: "reducing", min: 500000, max: 80000000, minTerm: 12, maxTerm: 84, fee: 1.5 }
  };

  function productFor(id) {
    var list = catalogue();
    var p = list && list.filter(function (x) { return x.id === id; })[0];
    return p || FALLBACK[id];
  }

  /* The published rate schedule is written from the same catalogue: the
     "rate from", the interest method and the term range. The upper "rate up
     to" and the APR band stay policy figures, which the engine cannot derive
     from a single product record. */
  var table = document.querySelector("[data-rate-table]");
  if (table) {
    [].slice.call(table.querySelectorAll("tbody tr")).forEach(function (row) {
      var name = row.querySelector("th").textContent.trim();
      var key = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      var p = productFor(key) || (catalogue() || []).filter(function (x) {
        return String(x.name).toLowerCase().indexOf(name.toLowerCase()) === 0;
      })[0];
      if (!p) return;
      var cells = row.querySelectorAll("td");
      if (cells.length < 6) return;
      cells[0].textContent = (Math.round(Number(p.rate) * 100) / 100) + "%";
      cells[3].textContent = p.method === "flat" ? "Flat rate" : "Reducing balance";
      cells[4].textContent = p.minTerm + "–" + p.maxTerm + " months";
    });
  }

  if (examples) {
    examples.innerHTML = CASES.map(function (k) {
      var p = productFor(k.id);
      var c = F.productQuote(p, { amount: k.amount, termMonths: k.term });
      var t = c.terms;
      return '<div class="card">' +
        "<h3>" + p.name + "</h3>" +
        '<p class="text-tiny text-muted">' + k.note + "</p>" +
        '<div class="review-grid" style="margin-top:.9rem;grid-template-columns:1fr;">' +
        '<div class="review-item"><dt>Amount · term</dt><dd>' + mwk(t.amount) + " · " + t.termMonths + " months</dd></div>" +
        '<div class="review-item"><dt>Rate</dt><dd>' + F.ratePhrase(t) + "</dd></div>" +
        '<div class="review-item"><dt>Monthly instalment</dt><dd>' + mwk(c.payment) + "</dd></div>" +
        '<div class="review-item"><dt>Total interest</dt><dd>' + mwk(c.totalInterest) + "</dd></div>" +
        '<div class="review-item"><dt>Processing fee</dt><dd>' + mwk(c.processingFee) + "</dd></div>" +
        '<div class="review-item"><dt>Total repayment</dt><dd>' + mwk(c.totalCost) + "</dd></div>" +
        '<div class="review-item"><dt>Indicative APR</dt><dd>' + c.apr.toFixed(1) + "%</dd></div>" +
        "</div>" +
        '<p class="text-tiny text-muted" style="margin-top:.6rem;">' + F.formulaPhrase(c) + ".</p>" +
        '<a class="btn btn--ghost btn--sm" style="margin-top:.8rem;" href="apply.html?product=' +
          encodeURIComponent(p.name) + "&amount=" + Math.round(t.amount) + "&term=" + t.termMonths + '">Apply for this loan</a>' +
        "</div>";
    }).join("");
  }
})();
