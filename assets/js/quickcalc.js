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
  var rateEl = $("qc-rate");

  function clampAmount(v) {
    var n = Number(v) || 0;
    if (n < 50000) n = 50000;
    if (n > 80000000) n = 80000000;
    return n;
  }

  function update() {
    var amount = clampAmount(amountEl.value);
    var term = Number(termEl.value) || 12;
    var rate = Math.max(1, Math.min(60, Number(rateEl.value) || 24));
    var method = methodEl.value;
    var frequency = freqEl.value;

    var c = F.amortize({
      principal: amount, rate: rate, termMonths: term,
      method: method, frequency: frequency,
      processingFeePct: 2
    });

    $("qc-payment").textContent = F.formatMWK(c.payment);
    $("qc-per").textContent = (frequency === "monthly" ? "per month" : "per fortnight") +
      " · " + c.periods + " instalments";
    $("qc-principal").textContent = F.formatMWK(c.principal);
    $("qc-interest").textContent = F.formatMWK(c.totalInterest + c.fees);
    $("qc-total").textContent = F.formatMWK(c.totalCost);
    $("qc-method-out").textContent = method === "flat" ? "Flat rate" : "Reducing balance";

    var principalShare = c.totalCost > 0 ? (c.principal / c.totalCost) * 100 : 100;
    $("qc-bar-p").style.width = principalShare.toFixed(1) + "%";
    $("qc-bar-i").style.width = Math.max(100 - principalShare, 0).toFixed(1) + "%";

    var apply = $("qc-apply");
    if (apply) {
      apply.href = "apply.html?amount=" + Math.round(amount) + "&term=" + term;
    }
  }

  [amountEl, termEl, methodEl, freqEl, rateEl].forEach(function (el) {
    if (!el) return;
    el.addEventListener("input", update);
    el.addEventListener("change", update);
  });

  update();
})();
