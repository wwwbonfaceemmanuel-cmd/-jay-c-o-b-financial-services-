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

  /* The admin console publishes the catalogue (rate, limits, fee, terms).
     Re-point the presets at it so the calculator always quotes the site. */
  function syncCatalogue() {
    var store = window.JCOB_SITE;
    if (!store || !store.products) return;
    Object.keys(PRESETS).forEach(function (key) {
      var p = store.product(PRESETS[key].label);
      if (!p) return;
      if (isFinite(p.rate) && p.rate > 0) PRESETS[key].rate = Number(p.rate);
      if (isFinite(p.min) && p.min > 0) PRESETS[key].min = Number(p.min);
      if (isFinite(p.max) && p.max > 0) PRESETS[key].max = Number(p.max);
      if (isFinite(p.fee) && p.fee >= 0) PRESETS[key].fee = Number(p.fee);
      if (isFinite(p.maxTerm) && p.maxTerm > 0) PRESETS[key].maxTerm = Number(p.maxTerm);
    });
  }

  var state = {
    preset: "personal", amount: 5000000, rate: 24,
    term: 1, termMonths: 1, basis: "monthly",
    rateBasis: "annual",
    method: "reducing", frequency: "monthly",
    fee: 2, adminFee: 0, showAll: false,
    startDate: null
  };

  function $(id) { return document.getElementById(id); }
  function mwk(v) { return F.formatMWK(v); }
  function round2(n) { return Math.round(n * 100) / 100; }
  /* Percent, trimmed: 25 → "25%", 24.5 → "24.5%", 2.0833 → "2.08%" */
  function pct(n, maxDp) {
    var dp = maxDp === undefined ? 2 : maxDp;
    var v = Number(n) || 0;
    var s = v.toFixed(dp);
    if (s.indexOf(".") > -1) s = s.replace(/0+$/, "").replace(/\.$/, "");
    return s + "%";
  }
  /* Convert a rate quoted per year into whatever basis the customer picked */
  function rateForBasis(annualRate) {
    return state.rateBasis === "monthly" ? round2(annualRate / 12) : round2(annualRate);
  }
  function isoDate(date) {
    var d = new Date(date);
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
  }
  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
  }

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
    if ($("calc-start")) {
      state.startDate = $("calc-start").value ? new Date($("calc-start").value + "T00:00:00") : null;
    }
  }

  function compute() {
    return F.amortize({
      principal: state.amount, rate: state.rate, rateBasis: state.rateBasis,
      termMonths: state.termMonths,
      method: state.method, frequency: state.frequency,
      processingFeePct: state.fee, adminFee: state.adminFee,
      startDate: state.startDate
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
      if (basisHint) basisHint.textContent = "Quoted as a percentage per month — used exactly as entered";
    } else {
      if (label) label.textContent = "Annual interest rate (%)";
      el.max = "720";
      if (basisHint) basisHint.textContent = "Quoted as a percentage per year (p.a.) — used exactly as entered";
    }
    var annual = state.rateBasis === "monthly" ? state.rate * 12 : state.rate;
    var monthly = annual / 12;
    if (hint) {
      hint.textContent = state.rateBasis === "monthly"
        ? "= " + pct(annual, 1) + " p.a. equivalent · " + (state.method === "flat" ? "flat rate" : "reducing balance")
        : "= " + pct(monthly) + " per month equivalent · " + (state.method === "flat" ? "flat rate" : "reducing balance");
    }
  }

  function render() {
    var c = compute();
    var p = PRESETS[state.preset];

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
    var basisWord = annualBasis ? "annual basis" : "monthly basis";
    var quoted = state.rateBasis === "monthly"
      ? pct(c.monthlyRate) + " per month"
      : pct(c.rate, 1) + " p.a.";
    var equivalent = state.rateBasis === "monthly"
      ? pct(c.rate, 1) + " p.a. equivalent"
      : pct(c.monthlyRate) + " per month equivalent";

    $("res-total-amount").textContent = mwk(c.totalCost);
    $("res-total-amount-note").textContent = "principal + interest" +
      (c.fees > 0 ? " + fees " + mwk(c.fees) : "") + " · " + basisWord;

    $("res-principal").textContent = mwk(c.principal);

    $("res-rate").textContent = quoted;
    $("res-rate-note").textContent = (c.method === "flat" ? "flat rate" : "reducing balance") + " · " + equivalent;

    $("res-interest").textContent = mwk(c.totalInterest);
    $("res-interest-note").textContent = c.method === "flat"
      ? mwk(c.principal) + " × " + pct(c.monthlyRate) + " × " +
        c.termMonths + (c.termMonths === 1 ? " month" : " months")
      : "reducing balance over " + c.periods + (c.periods === 1 ? " instalment" : " instalments");

    $("res-duration").textContent = annualBasis
      ? state.term + (state.term === 1 ? " year" : " years") + " · " + c.periods + " months"
      : state.term + (state.term === 1 ? " month" : " months") + " · " + c.periods +
        (c.periods === 1 ? " instalment" : " instalments");
    $("res-instalments").textContent = c.periods + " × " + mwk(c.payment) + " per " + unitLabel;

    $("res-schedule-range").textContent = F.shortDate(c.firstDue) + " → " + F.shortDate(c.lastDue);
    $("res-schedule-note").textContent = c.periods + (c.periods === 1 ? " instalment" : " instalments") + ", " +
      c.frequencyLabel.toLowerCase() + ", first due " + F.shortDate(c.firstDue) + " (one " + unitLabel + " after disbursement)";

    $("res-total").textContent = mwk(c.totalRepayment);
    $("res-total-note").textContent = "sum of all scheduled instalments" + (c.fees > 0 ? " · fees of " + mwk(c.fees) + " charged separately" : "");

    if ($("res-formula")) {
      $("res-formula").textContent = c.method === "flat"
        ? "Flat rate: " + mwk(c.principal) + " × " + (state.rateBasis === "monthly"
            ? pct(c.monthlyRate) + " per month × " + c.termMonths + (c.termMonths === 1 ? " month" : " months")
            : pct(c.rate, 1) + " p.a. × " + (c.termMonths / 12) + ((c.termMonths === 12) ? " year" : " years")) +
          " = " + mwk(c.totalInterest) + " interest · " + c.periods + " × " + mwk(c.payment) + " = " + mwk(c.totalRepayment) + " total repayment."
        : "Reducing balance: " + pct(c.ratePerPeriod) + " per " + unitLabel + " on the falling balance over " +
          c.periods + (c.periods === 1 ? " instalment" : " instalments") + " = " + mwk(c.totalInterest) + " interest · total repayment " + mwk(c.totalRepayment) + ".";
    }

    $("res-fees").textContent = mwk(c.fees);
    $("res-apr").textContent = c.apr.toFixed(1) + "%";
    $("res-frequency").textContent = c.frequencyLabel;
    if ($("res-method")) $("res-method").textContent = c.method === "flat" ? "Flat rate" : "Reducing balance";
    $("res-first").textContent = F.shortDate(c.firstDue);
    $("res-last").textContent = F.shortDate(c.lastDue);

    syncRateField();

    var principalShare = c.totalCost > 0 ? (c.principal / c.totalCost) * 100 : 100;
    $("bar-principal").style.width = principalShare.toFixed(1) + "%";
    $("bar-interest").style.width = Math.max(100 - principalShare, 0).toFixed(1) + "%";

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
    $("amort-total").textContent = mwk(c.totalRepayment);
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
    var shownRate = rateForBasis(p.rate);
    state.rate = shownRate;
    $("calc-rate").value = shownRate;
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
      "Rate quoted," + pct(c.rateInput) + (c.rateBasis === "monthly" ? " per month" : " per year (p.a.)"),
      "Annual equivalent," + c.rate.toFixed(2) + "%",
      "Term (months)," + c.termMonths,
      "Method," + (c.method === "flat" ? "Flat rate" : "Reducing balance"),
      "Frequency," + c.frequencyLabel,
      "Instalment," + c.payment.toFixed(2),
      "Total interest," + c.totalInterest.toFixed(2),
      "Fees," + c.fees.toFixed(2),
      "Total repayment," + c.totalRepayment.toFixed(2),
      "Total including fees," + c.totalCost.toFixed(2),
      "",
      UI.tableCSV(["#", "Due date", "Instalment", "Principal", "Interest", "Balance"],
        c.rows.map(function (r) {
          return [r.n, isoDate(r.date), r.payment.toFixed(2), r.principal.toFixed(2), r.interest.toFixed(2), r.closing.toFixed(2)];
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
    if ($("calc-start")) $("calc-start").value = todayISO();
    state.startDate = new Date(todayISO() + "T00:00:00");
    readInputs();
    render();
    syncRateField();
    UI.toast({ title: "Calculator reset", message: "Monthly basis, 1 month, annual rate and reducing balance restored.", type: "info" });
  }

  /* Defaults published in the admin console (size, term, fee, method). */
  function applyAdminDefaults() {
    var defaults = (window.JCOB_SITE && window.JCOB_SITE.settings.calc) || null;
    if (!defaults) return;
    if (defaults.rateBasis && $("calc-rate-basis")) { $("calc-rate-basis").value = defaults.rateBasis; state.rateBasis = defaults.rateBasis; }
    if (defaults.basis && $("calc-basis")) { $("calc-basis").value = defaults.basis; state.basis = defaults.basis; }
    if (defaults.amount) $("calc-amount").value = defaults.amount;
    if (defaults.term) $("calc-term").value = defaults.term;
    if (defaults.fee !== undefined) $("calc-fee").value = defaults.fee;
    if (defaults.adminFee !== undefined) $("calc-admin").value = defaults.adminFee;
    if (defaults.method) setMethod(defaults.method);
    state.rate = Number($("calc-rate").value) || 24;
  }

  document.addEventListener("DOMContentLoaded", function () {
    syncCatalogue();
    /* catalogue rate first, then the admin's default size / term / fee */
    applyPreset(state.preset);
    applyAdminDefaults();
    document.querySelectorAll('input[name="calc-preset"]').forEach(function (radio) {
      radio.addEventListener("change", function () { applyPreset(radio.value); });
    });
    ["calc-amount", "calc-rate", "calc-term", "calc-frequency", "calc-fee", "calc-admin", "calc-start"].forEach(function (id) {
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

    document.addEventListener("jcob:site-updated", function () {
    if (!$("calc-rate")) return;
    syncCatalogue();
    applyPreset(state.preset);
    applyAdminDefaults();
    readInputs();
    render();
  });

  if ($("calc-rate-basis")) {
      $("calc-rate-basis").addEventListener("change", function () {
        state.rateBasis = $("calc-rate-basis").value;
        /* re-quote the same cost in the new unit so nothing changes silently */
        var current = Math.max(Number($("calc-rate").value) || 0, 0);
        var converted = state.rateBasis === "monthly" ? round2(current / 12) : round2(current * 12);
        $("calc-rate").value = converted;
        state.rate = converted;
        syncRateField();
        readInputs();
        render();
        UI.toast({
          title: state.rateBasis === "monthly" ? "Monthly rate basis" : "Annual rate basis",
          message: state.rateBasis === "monthly"
            ? "The rate is now a percentage per month. " + pct(current) + " p.a. is quoted as " + pct(converted) + " per month, and the calculation uses that monthly figure directly."
            : "The rate is now a percentage per year. " + pct(current) + " per month is quoted as " + pct(converted) + " p.a.",
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

    if ($("calc-start") && !$("calc-start").value) {
      $("calc-start").value = todayISO();
    }
    state.startDate = $("calc-start") && $("calc-start").value
      ? new Date($("calc-start").value + "T00:00:00")
      : new Date(todayISO() + "T00:00:00");

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
      /* the preset figure is annual — re-quote it per month for this view */
      $("calc-rate-basis").value = "monthly";
      state.rateBasis = "monthly";
      $("calc-rate").value = round2((Number($("calc-rate").value) || 0) / 12);
      state.rate = Number($("calc-rate").value);
    }
    if (params.get("rate")) {
      $("calc-rate").value = Number(params.get("rate"));
      state.rate = Number($("calc-rate").value);
    }
    if (params.get("method") === "flat") setMethod("flat");
    if (params.get("fee") !== null && params.get("fee") !== "") {
      $("calc-fee").value = Math.max(Number(params.get("fee")) || 0, 0);
    }
    if (params.get("start") && $("calc-start")) {
      $("calc-start").value = params.get("start");
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
