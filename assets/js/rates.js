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

  if (examples) {
    var cases = [
      { label: "Personal loan", rate: 24, amount: 2000000, term: 12, note: "School fees, repaid over one year" },
      { label: "Business loan", rate: 22, amount: 8000000, term: 36, note: "Working capital for a retail business" },
      { label: "Secured loan", rate: 18, amount: 25000000, term: 60, note: "Vehicle finance with collateral" }
    ];
    examples.innerHTML = cases.map(function (k) {
      var c = F.amortize({
        principal: k.amount, rate: k.rate, termMonths: k.term,
        method: "reducing", frequency: "monthly", processingFeePct: 2
      });
      return '<div class="card">' +
        "<h3>" + k.label + "</h3>" +
        '<p class="text-tiny text-muted">' + k.note + "</p>" +
        '<div class="review-grid" style="margin-top:.9rem;grid-template-columns:1fr;">' +
        '<div class="review-item"><dt>Amount · term</dt><dd>' + mwk(k.amount) + " · " + k.term + " months</dd></div>" +
        '<div class="review-item"><dt>Rate</dt><dd>' + k.rate + "% p.a. reducing</dd></div>" +
        '<div class="review-item"><dt>Monthly instalment</dt><dd>' + mwk(c.payment) + "</dd></div>" +
        '<div class="review-item"><dt>Total interest</dt><dd>' + mwk(c.totalInterest) + "</dd></div>" +
        '<div class="review-item"><dt>Processing fee</dt><dd>' + mwk(c.processingFee) + "</dd></div>" +
        '<div class="review-item"><dt>Total repayment</dt><dd>' + mwk(c.totalCost) + "</dd></div>" +
        '<div class="review-item"><dt>Indicative APR</dt><dd>' + c.apr.toFixed(1) + "%</dd></div>" +
        "</div>" +
        '<a class="btn btn--ghost btn--sm" style="margin-top:.8rem;" href="apply.html?amount=' + k.amount + "&term=" + k.term + '">Apply for this loan</a>' +
        "</div>";
    }).join("");
  }
})();
