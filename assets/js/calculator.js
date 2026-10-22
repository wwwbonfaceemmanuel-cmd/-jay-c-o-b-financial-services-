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

  var state = {
    preset: "personal", amount: 5000000, rate: 24,
    term: 1, termMonths: 1, basis: "monthly",
    method: "reducing", frequency: "monthly",
    fee: 2, adminFee: 0, showAll: false
  };

  function $(id) { return document.getElementById(id); }
  function mwk(v) { return F.formatMWK(v); }

  /* Radial/segmented selector for flat vs reducing */
  function methodValue() {
    var picked = document.querySelector('input[name="calc-method"]:checked');
    return picked ? picked.value : state.method;
  }
  function setMethod(value) {
    var input = document.querySelector('input[name="calc-method"][value="' + value + '"]');
    if (input) input.checked = true;
    state.method = value;
  }

  /* Monthly / annual basis changes the unit of the term field */
  function termMonths() {
    return state.basis === "annual" ? state.term * 12 : state.term;
  }
  function syncTermField(keepValue) {
    var p = PRESETS[state.preset];
    var termEl = $("calc-term");
    var label = $("calc-term-label");
    var hint = $("calc-term-hint");
    var basisHint = $("calc-basis-hint");
    if (!termEl) return;
    if (state.basis === "annual") {
      if (label) label.textContent = "Repayment period (years)";
      termEl.min = "1";
      termEl.max = String(Math.max(1, Math.ceil(p.maxTerm / 12)));
      termEl.step = "1";
      if (!keepValue) termEl.value = "1";
      if (basisHint) basisHint.textContent = "Annual quotation: 1 year to start (12 instalments)";
    } else {
      if (label) label.textContent = "Repayment period (months)";
      termEl.min = "1";
      termEl.max = String(p.maxTerm);
      termEl.step = "1";
      if (!keepValue) termEl.value = "1";
      if (basisHint) basisHint.textContent = "Monthly quotation: 1 month to start";
    }
    if (keepValue) {
      var current = Math.max(Math.round(Number(termEl.value) || 1), 1);
      var max = Number(termEl.max) || 84;
      termEl.value = String(Math.min(current, max));
    }
    state.term = Math.max(Math.round(Number(termEl.value) || 1), 1);
    if (hint) {
      hint.textContent = state.basis === "annual"
        ? "= " + (state.term * 12) + " monthly instalments"
        : state.term + (state.term === 1 ? " monthly instalment" : " monthly instalments");
    }
  }

  function readInputs() {
    state.amount = Math.max(Number($("calc-amount").value) || 0, 0);
    state.rate = Math.max(Number($("calc-rate").value) || 0, 0);
    state.basis = $("calc-basis") ? $("calc-basis").value : "monthly";
    state.term = Math.max(Math.round(Number($("calc-term").value) || 1), 1);
    state.termMonths = termMonths();
    state.method = methodValue();
    state.frequency = $("calc-frequency").value;
    state.fee = Math.max(Number($("calc-fee").value) || 0, 0);
    state.adminFee = Math.max(Number($("calc-admin").value) || 0, 0);
  }

  function compute() {
    return F.amortize({
      principal: state.amount, rate: state.rate, termMonths: state.termMonths,
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
    var perYear = state.frequency === "fortnightly" ? 26 : 12;
    var annual = c.payment * perYear;
    if ($("res-annual")) $("res-annual").textContent = mwk(annual);
    if ($("res-basis")) {
      $("res-basis").textContent = state.basis === "annual"
        ? "Annually · " + state.term + (state.term === 1 ? " year" : " years") + " (" + c.periods + " instalments)"
        : "Monthly · " + state.term + (state.term === 1 ? " month" : " months");
    }
    $("res-method").textContent = state.method === "flat" ? "Flat rate" : "Reducing balance";
    $("res-frequency").textContent = c.frequencyLabel;
    $("res-first").textContent = F.shortDate(c.firstDue);
    $("res-last").textContent = F.shortDate(c.lastDue);

    var pct = c.totalCost > 0 ? (c.principal / c.totalCost) * 100 : 100;
    $("bar-principal").style.width = pct.toFixed(1) + "%";
    $("bar-interest").style.width = Math.max(100 - pct, 0).toFixed(1) + "%";

    var other = F.amortize({
      principal: state.amount, rate: state.rate, termMonths: state.termMonths,
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
    $("apply-link").href = "apply.html?product=" + encodeURIComponent(p.label) + "&amount=" + state.amount + "&term=" + state.termMonths;
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
    state.amount = Math.min(Math.max(state.amount, p.min), p.max);
    $("calc-amount").value = state.amount;
    $("calc-amount").min = p.min;
    $("calc-amount").max = p.max;
    $("calc-rate").value = p.rate;
    $("calc-fee").value = p.fee;
    syncTermField(true);
    state.termMonths = termMonths();
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
    if ($("calc-basis")) $("calc-basis").value = "monthly";
    state.basis = "monthly";
    applyPreset("personal");
    $("calc-amount").value = 5000000;
    setMethod("reducing");
    $("calc-frequency").value = "monthly";
    $("calc-admin").value = 0;
    readInputs();
    render();
    UI.toast({ title: "Calculator reset", message: "Monthly basis, 1 month, reducing balance restored.", type: "info" });
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll('input[name="calc-preset"]').forEach(function (radio) {
      radio.addEventListener("change", function () { applyPreset(radio.value); });
    });
    ["calc-amount", "calc-rate", "calc-term", "calc-frequency", "calc-fee", "calc-admin"].forEach(function (id) {
      var el = $(id);
      if (!el) return;
      el.addEventListener("input", function () { readInputs(); render(); });
      el.addEventListener("change", function () { readInputs(); render(); });
    });

    if ($("calc-basis")) {
      $("calc-basis").addEventListener("change", function () {
        state.basis = $("calc-basis").value;
        syncTermField(false);
        readInputs();
        render();
        UI.toast({
          title: state.basis === "annual" ? "Annual basis" : "Monthly basis",
          message: state.basis === "annual" ? "Repayment period is now in years — 1 year (12 instalments)." : "Repayment period is now in months — 1 month.",
          type: "info"
        });
      });
    }

    document.querySelectorAll('input[name="calc-method"]').forEach(function (radio) {
      radio.addEventListener("change", function () {
        state.method = radio.value;
        readInputs();
        render();
      });
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
    if (params.get("basis") === "annual" && $("calc-basis")) {
      $("calc-basis").value = "annual";
      state.basis = "annual";
      syncTermField(true);
    }
    state.term = Math.max(Math.round(Number($("calc-term").value) || 1), 1);
    if ($("calc-term-hint")) {
      $("calc-term-hint").textContent = state.basis === "annual"
        ? "= " + (state.term * 12) + " monthly instalments"
        : state.term + (state.term === 1 ? " monthly instalment" : " monthly instalments");
    }
    readInputs();
    render();
  });
})();
