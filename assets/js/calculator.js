/* =====================================================================
   Public loan calculator (MWK)
   Product presets · amount · rate · term · method · frequency · fees
   Estimates monthly repayment, total interest, total repayment and a
   preview amortization schedule, with CSV/print actions.
   ===================================================================== */
(function () {
  "use strict";

  var root = document.getElementById("calc-page");
  if (!root) return;

  var UI = window.JCOB_UI;
  var DATA = window.JCOB_DATA;
  var F = window.JCOB_FINANCE;

  var PRESETS = {
    personal: { label: "Personal Loan", rate: 24, min: 100000, max: 15000000, term: 12, maxTerm: 48, fee: 2 },
    business: { label: "Business Loan", rate: 22, min: 500000, max: 50000000, term: 36, maxTerm: 60, fee: 2.5 },
    emergency: { label: "Emergency Loan", rate: 28, min: 50000, max: 2000000, term: 6, maxTerm: 12, fee: 2 },
    salary: { label: "Salary-based Loan", rate: 23, min: 100000, max: 10000000, term: 18, maxTerm: 36, fee: 2 },
    short: { label: "Short-term Loan", rate: 29, min: 50000, max: 3000000, term: 3, maxTerm: 6, fee: 3 },
    long: { label: "Long-term Loan", rate: 21, min: 1000000, max: 60000000, term: 60, maxTerm: 84, fee: 2.5 }
  };

  var state = { preset: "personal", amount: 5000000, rate: 24, term: 12, method: "reducing", frequency: "monthly", fee: 2, adminFee: 0, showAll: false };

  function $(id) { return document.getElementById(id); }
  function mwk(v) { return F.formatMWK(v); }

  function readInputs() {
    state.amount = Math.max(Number($("calc-amount").value) || 0, 0);
    state.rate = Math.max(Number($("calc-rate").value) || 0, 0);
    state.term = Math.max(Math.round(Number($("calc-term").value) || 1), 1);
    state.method = $("calc-method").value;
    state.frequency = $("calc-frequency").value;
    state.fee = Math.max(Number($("calc-fee").value) || 0, 0);
    state.adminFee = Math.max(Number($("calc-admin").value) || 0, 0);
  }

  function compute() {
    return F.amortize({
      principal: state.amount, rate: state.rate, termMonths: state.term,
      method: state.method, frequency: state.frequency,
      processingFeePct: state.fee, adminFee: state.adminFee
    });
  }

  function render() {
    var c = compute();
    var p = PRESETS[state.preset];

    $("res-payment").textContent = mwk(c.payment);
    $("res-payment-period").textContent = "per " + (state.frequency === "monthly" ? "month" : "fortnight");
    $("res-principal").textContent = mwk(c.principal);
    $("res-interest").textContent = mwk(c.totalInterest);
    $("res-fees").textContent = mwk(c.fees);
    $("res-total").textContent = mwk(c.totalCost);
    $("res-rate").textContent = c.rate + "% p.a.";
    $("res-apr").textContent = c.apr.toFixed(1) + "%";
    $("res-instalments").textContent = c.periods + " × " + mwk(c.payment);
    $("res-method").textContent = state.method === "flat" ? "Flat rate" : "Reducing balance";
    $("res-frequency").textContent = c.frequencyLabel;
    $("res-first").textContent = F.shortDate(c.firstDue);
    $("res-last").textContent = F.shortDate(c.lastDue);

    var pct = c.totalCost > 0 ? (c.principal / c.totalCost) * 100 : 100;
    $("bar-principal").style.width = pct.toFixed(1) + "%";
    $("bar-interest").style.width = Math.max(100 - pct, 0).toFixed(1) + "%";

    var other = F.amortize({
      principal: state.amount, rate: state.rate, termMonths: state.term,
      method: state.method === "flat" ? "reducing" : "flat", frequency: state.frequency,
      processingFeePct: state.fee, adminFee: state.adminFee
    });
    var diff = other.totalCost - c.totalCost;
    $("res-compare").textContent = diff > 0
      ? "The " + (state.method === "flat" ? "reducing balance" : "flat rate") + " method would cost " + mwk(Math.abs(diff)) + " less."
      : diff < 0
        ? "The " + (state.method === "flat" ? "reducing balance" : "flat rate") + " method would cost " + mwk(Math.abs(diff)) + " more."
        : "Both methods produce the same total at these inputs.";

    $("calc-limits").textContent = "Limits " + mwk(p.min) + " – " + mwk(p.max) + " · " + p.maxTerm + " months maximum";
    $("apply-link").href = "apply.html?product=" + encodeURIComponent(p.label) + "&amount=" + state.amount + "&term=" + state.term;
    $("calc-aside-note").textContent = "Indicative only — final terms follow credit and affordability assessment.";
    renderSchedule(c);
  }

  function renderSchedule(c) {
    var rows = state.showAll ? c.rows : c.rows.slice(0, 12);
    $("amort-body").innerHTML = rows.map(function (r) {
      return "<tr><td>" + r.n + "</td><td>" + F.shortDate(r.date) + "</td>" +
        '<td class="num">' + mwk(r.payment) + "</td>" +
        '<td class="num">' + mwk(r.principal) + "</td>" +
        '<td class="num">' + mwk(r.interest) + "</td>" +
        '<td class="num">' + mwk(r.closing) + "</td></tr>";
    }).join("");
    $("amort-count").textContent = state.showAll
      ? "Showing all " + c.periods + " instalments"
      : "Showing first " + Math.min(12, c.periods) + " of " + c.periods + " instalments";
    $("amort-toggle").textContent = state.showAll ? "Show first 12" : "Show all " + c.periods;
    $("amort-toggle").hidden = c.periods <= 12;
    $("amort-total").textContent = mwk(c.totalCost);
    window.__calc = c;
  }

  function applyPreset(key) {
    var p = PRESETS[key];
    state.preset = key;
    state.rate = p.rate;
    state.fee = p.fee;
    state.term = p.term;
    state.amount = Math.min(Math.max(state.amount, p.min), p.max);
    $("calc-amount").value = state.amount;
    $("calc-amount").min = p.min;
    $("calc-amount").max = p.max;
    $("calc-rate").value = p.rate;
    $("calc-term").value = state.term;
    $("calc-term").max = p.maxTerm;
    $("calc-fee").value = p.fee;
    render();
  }

  function exportCSV() {
    var c = window.__calc || compute();
    var lines = [
      "JAY C O B Financial Services — loan calculator (MWK)",
      "Product," + PRESETS[state.preset].label,
      "Principal," + c.principal,
      "Annual rate," + c.rate + "%",
      "Term (months)," + c.termMonths,
      "Method," + (state.method === "flat" ? "Flat rate" : "Reducing balance"),
      "Frequency," + c.frequencyLabel,
      "Instalment," + c.payment.toFixed(2),
      "Total interest," + c.totalInterest.toFixed(2),
      "Fees," + c.fees.toFixed(2),
      "Total repayment," + c.totalCost.toFixed(2),
      "",
      UI.tableCSV(["#", "Due date", "Instalment", "Principal", "Interest", "Balance"],
        c.rows.map(function (r) {
          return [r.n, new Date(r.date).toISOString().slice(0, 10), r.payment.toFixed(2), r.principal.toFixed(2), r.interest.toFixed(2), r.closing.toFixed(2)];
        }))
    ];
    UI.downloadCSV("JC-loan-estimate.csv", lines.join("\n"));
    UI.toast({ title: "Estimate exported", message: "Repayment schedule saved as CSV.", type: "success" });
  }

  function reset() {
    state.showAll = false;
    applyPreset("personal");
    $("calc-amount").value = 5000000;
    $("calc-method").value = "reducing";
    $("calc-frequency").value = "monthly";
    $("calc-admin").value = 0;
    readInputs();
    render();
    UI.toast({ title: "Calculator reset", message: "Default personal loan figures restored.", type: "info" });
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll('input[name="calc-preset"]').forEach(function (radio) {
      radio.addEventListener("change", function () { applyPreset(radio.value); });
    });
    ["calc-amount", "calc-rate", "calc-term", "calc-method", "calc-frequency", "calc-fee", "calc-admin"].forEach(function (id) {
      var el = $(id);
      if (!el) return;
      el.addEventListener("input", function () { readInputs(); render(); });
      el.addEventListener("change", function () { readInputs(); render(); });
    });
    $("calc-reset").addEventListener("click", reset);
    $("calc-export").addEventListener("click", exportCSV);
    $("calc-print").addEventListener("click", function () { UI.printElement("calc-print-area"); });
    $("amort-toggle").addEventListener("click", function () {
      state.showAll = !state.showAll;
      renderSchedule(window.__calc || compute());
    });

    var params = new URLSearchParams(location.search);
    if (params.get("product")) {
      var found = Object.keys(PRESETS).filter(function (k) {
        return PRESETS[k].label.toLowerCase() === params.get("product").toLowerCase();
      })[0];
      if (found) applyPreset(found);
    }
    if (params.get("amount")) $("calc-amount").value = Number(params.get("amount"));
    if (params.get("term")) $("calc-term").value = Number(params.get("term"));
    readInputs();
    render();
  });
})();
