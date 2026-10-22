/* =====================================================================
   Home page quick calculator — live MWK estimate with method/frequency
   ===================================================================== */
(function () {
  "use strict";

  var F = window.JCOB_FINANCE;
  if (!F) return;

  var root = document.getElementById("quick-calc");
  if (!root) return;

  var $ = function (id) { return document.getElementById(id); };
  var amountEl = $("qc-amount");
  var termEl = $("qc-term");
  var methodEl = $("qc-method");
  var freqEl = $("qc-frequency");
  var basisEl = $("qc-basis");
  var rateBasisEl = $("qc-rate-basis");
  var rateEl = $("qc-rate");

  function trimPct(n) {
    var s = (Number(n) || 0).toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
    return s + "%";
  }

  function clampAmount(v) {
    var n = Number(v) || 0;
    if (n < 50000) n = 50000;
    if (n > 80000000) n = 80000000;
    return n;
  }

  function update() {
    var amount = clampAmount(amountEl.value);
    var term = Number(termEl.value) || 12;
    var rateBasis = rateBasisEl ? rateBasisEl.value : "annual";
    /* the quote is used in its own unit: % per month or % per year */
    var rateCeiling = rateBasis === "monthly" ? 60 : 720;
    var rate = Math.max(0, Math.min(rateCeiling, Number(rateEl.value) || 0));
    var method = methodEl.value;
    var frequency = freqEl.value;

    var c = F.amortize({
      principal: amount, rate: rate, rateBasis: rateBasis, termMonths: term,
      method: method, frequency: frequency,
      processingFeePct: 2
    });

    $("qc-payment").textContent = F.formatMWK(c.payment);
    var basis = basisEl ? basisEl.value : "monthly";
    $("qc-per").textContent = (frequency === "monthly" ? "per month" : "per fortnight") +
      " · " + c.periods + " instalments · " + (basis === "annual" ? "annual basis" : "monthly basis");
    $("qc-principal").textContent = F.formatMWK(c.principal);
    $("qc-interest").textContent = F.formatMWK(c.totalInterest + c.fees);
    $("qc-total").textContent = F.formatMWK(c.totalCost);
    $("qc-method-out").textContent = method === "flat" ? "Flat rate" : "Reducing balance";
    var rateLabel = $("qc-rate-label");
    if (rateLabel) rateLabel.textContent = rateBasis === "monthly" ? "Monthly interest rate (%)" : "Annual interest rate (%)";
    if ($("qc-rate-out")) {
      $("qc-rate-out").textContent = rateBasis === "monthly"
        ? trimPct(c.monthlyRate) + " per month"
        : trimPct(c.rate) + " p.a.";
    }
    var perYear = frequency === "fortnightly" ? 26 : 12;
    if ($("qc-annual")) $("qc-annual").textContent = F.formatMWK(c.payment * perYear);

    var principalShare = c.totalCost > 0 ? (c.principal / c.totalCost) * 100 : 100;
    $("qc-bar-p").style.width = principalShare.toFixed(1) + "%";
    $("qc-bar-i").style.width = Math.max(100 - principalShare, 0).toFixed(1) + "%";

    var apply = $("qc-apply");
    if (apply) {
      apply.href = "apply.html?amount=" + Math.round(amount) + "&term=" + term;
    }
  }

  if (basisEl) {
    basisEl.addEventListener("change", function () {
      termEl.value = basisEl.value === "annual" ? "12" : "1";
      update();
    });
  }

  if (rateBasisEl) {
    rateBasisEl.addEventListener("change", function () {
      /* re-quote the same cost in the new unit */
      var current = Math.max(Number(rateEl.value) || 0, 0);
      var converted = rateBasisEl.value === "monthly" ? current / 12 : current * 12;
      rateEl.value = String(Math.round(converted * 100) / 100);
      update();
    });
  }

  [amountEl, termEl, methodEl, freqEl, rateEl].forEach(function (el) {
    if (!el) return;
    el.addEventListener("input", update);
    el.addEventListener("change", update);
  });

  update();
})();
