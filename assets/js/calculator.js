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
    rateBasis: "annual",
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
    state.rateBasis = $("calc-rate-basis") ? $("calc-rate-basis").value : "annual";
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
      principal: state.amount, rate: state.rate, rateBasis: state.rateBasis,
      termMonths: state.termMonths,
      method: state.method, frequency: state.frequency,
      processingFeePct: state.fee, adminFee: state.adminFee
    });
  }

  /* Keep the rate field's label and hint in step with the chosen basis */
  function syncRateField() {
    var label = $("calc-rate-label");
    var hint = $("calc-rate-hint");
    var basisHint = $("calc-rate-basis-hint");
    var el = $("calc-rate");
    if (!el) return;
    if (state.rateBasis === "monthly") {
      if (label) label.textContent = "Monthly interest rate (%)";
      el.max = "60";
      if (basisHint) basisHint.textContent = "Quoted as a percentage per month";
    } else {
      if (label) label.textContent = "Annual interest rate (%)";
      el.max = "60";
      if (basisHint) basisHint.textContent = "Quoted as an annual percentage rate (p.a.)";
    }
    var annual = state.rateBasis === "monthly" ? state.rate * 12 : state.rate;
    var monthly = annual / 12;
    if (hint) {
      hint.textContent = state.rateBasis === "monthly"
        ? "= " + annual.toFixed(2) + "% per year · " + (state.method === "flat" ? "flat rate" : "reducing balance")
        : "= " + monthly.toFixed(2) + "% per month · " + (state.method === "flat" ? "flat rate" : "reducing balance");
    }
  }

  function render() {
    var c = compute();
    var p = PRESETS[state.preset];

    var perYear = state.frequency === "fortnightly" ? 26 : 12;
    var annualBasis = state.basis === "annual";
    var unitLabel = state.frequency === "fortnightly" ? "fortnight" : "month";
    var headline = annualBasis ? c.payment * 12 : c.payment;

    $("res-payment").textContent = mwk(headline);
    $("res-payment-period").textContent = annualBasis
      ? "per year · " + c.periods + " instalments of " + mwk(c.payment)
      : "per " + unitLabel + " · " + c.periods + (c.periods === 1 ? " instalment" : " instalments");
    if ($("res-headline-label")) {
      $("res-headline-label").textContent = annualBasis ? "Estimated repayment per year" : "Estimated monthly instalment";
    }
    if ($("res-basis-pill")) {
      $("res-basis-pill").textContent = annualBasis ? "Annual basis" : "Monthly basis";
    }

    /* ---- Results sheet: total amount · principal · rate · interest · duration · schedule · total repayment ---- */
    $("res-total-amount").textContent = mwk(c.totalCost);
    $("res-total-amount-note").textContent = "principal + interest + fees · " + (annualBasis ? "annual basis" : "monthly basis");

    $("res-principal").textContent = mwk(c.principal);

    $("res-rate").textContent = state.rateBasis === "monthly"
      ? c.monthlyRate.toFixed(2) + "% per month"
      : c.rate.toFixed(1) + "% p.a.";
    $("res-rate-note").textContent = (state.method === "flat" ? "flat rate" : "reducing balance") + " · " +
      (state.rateBasis === "monthly"
        ? c.rate.toFixed(2) + "% p.a. equivalent"
        : c.monthlyRate.toFixed(2) + "% per month");

    $("res-interest").textContent = mwk(c.totalInterest);
    $("res-interest-note").textContent = "charged over " + (annualBasis
      ? state.term + (state.term === 1 ? " year" : " years")
      : state.term + (state.term === 1 ? " month" : " months"));

    $("res-duration").textContent = annualBasis
      ? state.term + (state.term === 1 ? " year" : " years") + " · " + c.periods + " months"
      : state.term + (state.term === 1 ? " month" : " months") + " · " + c.periods +
        (c.periods === 1 ? " instalment" : " instalments");
    $("res-instalments").textContent = c.periods + " × " + mwk(c.payment) + " per " + unitLabel;

    $("res-schedule-range").textContent = F.shortDate(c.firstDue) + " → " + F.shortDate(c.lastDue);
    $("res-schedule-note").textContent = c.periods + " instalments, " + c.frequencyLabel.toLowerCase() +
      ", first due one " + unitLabel + " after disbursement";

    $("res-total").textContent = mwk(c.totalRepayment);
    $("res-total-note").textContent = "sum of all scheduled instalments" + (c.fees > 0 ? " · fees of " + mwk(c.fees) + " shown below" : "");

    $("res-fees").textContent = mwk(c.fees);
    $("res-apr").textContent = c.apr.toFixed(1) + "%";
    $("res-frequency").textContent = c.frequencyLabel;
    $("res-annual").textContent = mwk(c.payment * perYear);
    $("res-first").textContent = F.shortDate(c.firstDue);
    $("res-last").textContent = F.shortDate(c.lastDue);

    syncRateField();

    var pct = c.totalCost > 0 ? (c.principal / c.totalCost) * 100 : 100;
    $("bar-principal").style.width = pct.toFixed(1) + "%";
    $("bar-interest").style.width = Math.max(100 - pct, 0).toFixed(1) + "%";

    var other = F.amortize({
      principal: state.amount, rate: state.rate, rateBasis: state.rateBasis,
      termMonths: state.termMonths,
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
    if ($("calc-rate-basis")) $("calc-rate-basis").value = "annual";
    state.rateBasis = "annual";
    applyPreset("personal");
    $("calc-amount").value = 5000000;
    setMethod("reducing");
    $("calc-frequency").value = "monthly";
    $("calc-admin").value = 0;
    readInputs();
    render();
    syncRateField();
    UI.toast({ title: "Calculator reset", message: "Monthly basis, 1 month, annual rate and reducing balance restored.", type: "info" });
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

    if ($("calc-rate-basis")) {
      $("calc-rate-basis").addEventListener("change", function () {
        state.rateBasis = $("calc-rate-basis").value;
        /* convert the figure so the real cost stays the same when switching basis */
        var current = Math.max(Number($("calc-rate").value) || 0, 0);
        if (state.rateBasis === "monthly") {
          $("calc-rate").value = Math.max(Math.round((current / 12) * 100) / 100, 0.1);
        } else {
          $("calc-rate").value = Math.round(current * 12 * 100) / 100;
        }
        state.rate = Number($("calc-rate").value);
        syncRateField();
        readInputs();
        render();
        UI.toast({
          title: state.rateBasis === "monthly" ? "Monthly rate basis" : "Annual rate basis",
          message: state.rateBasis === "monthly"
            ? "Interest is now quoted per month and converted to an annual rate for the calculation."
            : "Interest is now quoted per year (p.a.).",
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
    if (params.get("rateBasis") === "monthly" && $("calc-rate-basis")) {
      $("calc-rate-basis").value = "monthly";
      state.rateBasis = "monthly";
    }
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
    syncRateField();
  });
})();
