/* =====================================================================
   JAY C O B FINANCIAL SERVICES — shared finance engine (MWK)
   Used by the public calculator, the application flow and the dashboard.
   ===================================================================== */
(function () {
  "use strict";

  var FREQUENCIES = {
    monthly: { label: "Monthly", perYear: 12, unit: "month" },
    fortnightly: { label: "Fortnightly", perYear: 26, unit: "fortnight" }
  };

  function formatMWK(value, decimals) {
    if (value === null || value === undefined || isNaN(value)) return "MWK 0";
    var d = decimals === undefined ? 0 : decimals;
    return "MWK " + Number(value).toLocaleString("en-US", {
      minimumFractionDigits: d,
      maximumFractionDigits: d
    });
  }

  function compactMWK(value) {
    var v = Math.abs(value);
    if (v >= 1e9) return "MWK " + (value / 1e9).toFixed(2) + "bn";
    if (v >= 1e6) return "MWK " + (value / 1e6).toFixed(2) + "m";
    if (v >= 1e3) return "MWK " + Math.round(value / 1e3) + "k";
    return formatMWK(value);
  }

  function parseAmount(input) {
    if (typeof input === "number") return input;
    var cleaned = String(input || "").replace(/[^\d.-]/g, "");
    var n = parseFloat(cleaned);
    return isFinite(n) ? n : 0;
  }

  function addMonths(date, months) {
    var d = new Date(date.getTime());
    var day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + months);
    var dim = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(day, dim));
    return d;
  }

  function addFortnights(date, n) {
    var d = new Date(date.getTime());
    d.setDate(d.getDate() + n * 14);
    return d;
  }

  function shortDate(date) {
    return new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }

  /* ------------------------------------------------------------------
     amortize()
     principal   number  — loan amount in MWK
     rate        number  — annual interest rate, percent (e.g. 24)
     termMonths  number  — term in months
     method      string  — 'reducing' | 'flat'
     frequency   string  — 'monthly' | 'fortnightly'
     processingFeePct / adminFee — fees in percent / MWK
     startDate   Date|null
     ------------------------------------------------------------------ */
  function amortize(opts) {
    var principal = Math.max(Number(opts.principal) || 0, 0);
    var rate = Math.max(Math.min(Number(opts.rate) || 0, 100), 0);
    var termMonths = Math.max(Math.round(Number(opts.termMonths) || 1), 1);
    var method = opts.method === "flat" ? "flat" : "reducing";
    var freqKey = FREQUENCIES[opts.frequency] ? opts.frequency : "monthly";
    var freq = FREQUENCIES[freqKey];
    var processingFeePct = Math.max(Number(opts.processingFeePct) || 0, 0) / 100;
    var adminFee = Math.max(Number(opts.adminFee) || 0, 0);
    var start = opts.startDate ? new Date(opts.startDate) : new Date();

    var periods = Math.max(Math.round((termMonths / 12) * freq.perYear), 1);
    var ratePerPeriod = rate / 100 / freq.perYear;

    var payment, totalInterest;
    if (method === "flat") {
      totalInterest = principal * (rate / 100) * (termMonths / 12);
      payment = (principal + totalInterest) / periods;
    } else {
      if (ratePerPeriod === 0) {
        payment = principal / periods;
      } else {
        var factor = Math.pow(1 + ratePerPeriod, periods);
        payment = (principal * ratePerPeriod * factor) / (factor - 1);
      }
      totalInterest = payment * periods - principal;
    }

    var processingFee = principal * processingFeePct;
    var fees = processingFee + adminFee;
    var totalRepayment = principal + totalInterest;
    var totalCost = totalRepayment + fees;

    /* Schedule */
    var rows = [];
    var balance = principal;
    for (var i = 1; i <= periods; i++) {
      var opening = balance;
      var rowInterest, rowPrincipal, rowPayment;

      if (method === "flat") {
        rowInterest = totalInterest / periods;
        rowPrincipal = principal / periods;
        rowPayment = payment;
      } else {
        rowInterest = opening * ratePerPeriod;
        rowPrincipal = payment - rowInterest;
        rowPayment = payment;
      }
      if (i === periods) {
        rowPrincipal = opening;
        rowPayment = rowPrincipal + rowInterest;
      }
      balance = Math.max(opening - rowPrincipal, 0);

      rows.push({
        n: i,
        date: freqKey === "fortnightly" ? addFortnights(start, i - 1) : addMonths(start, i - 1),
        opening: opening,
        payment: rowPayment,
        interest: rowInterest,
        principal: rowPrincipal,
        closing: balance
      });
    }

    var apr = aprEstimate(Math.max(principal - fees, 1), payment, periods, freq.perYear);

    return {
      principal: principal,
      rate: rate,
      apr: apr,
      termMonths: termMonths,
      periods: periods,
      frequency: freqKey,
      frequencyLabel: freq.label,
      method: method,
      payment: payment,
      totalInterest: totalInterest,
      processingFee: processingFee,
      adminFee: adminFee,
      fees: fees,
      totalRepayment: totalRepayment,
      totalCost: totalCost,
      rows: rows,
      firstDue: rows.length ? rows[0].date : start,
      lastDue: rows.length ? rows[rows.length - 1].date : start
    };
  }

  /* Indicative APR: the annual rate that discounts the scheduled payments
     back to the net amount advanced (principal less up-front fees).
     Solved by bisection, so it reflects both interest and fees. */
  function aprEstimate(netProceeds, payment, periods, perYear) {
    if (!netProceeds || !periods || !payment) return 0;
    function presentValue(r) {
      var sum = 0;
      for (var t = 1; t <= periods; t += 1) sum += payment / Math.pow(1 + r, t);
      return sum;
    }
    if (presentValue(0) <= netProceeds) return 0;
    var low = 0;
    var high = 1;
    for (var i = 0; i < 80; i += 1) {
      var mid = (low + high) / 2;
      if (presentValue(mid) > netProceeds) low = mid; else high = mid;
    }
    var perPeriod = (low + high) / 2;
    return (Math.pow(1 + perPeriod, perYear) - 1) * 100;
  }

  function eligibilityAffordability(income, expenses, existingDebt, proposedPayment) {
    var net = Math.max(income - expenses - existingDebt, 0);
    var ratio = proposedPayment / Math.max(income, 1);
    var dti = (existingDebt + proposedPayment) / Math.max(income, 1);
    var verdict = "high";
    if (ratio <= 0.25 && dti <= 0.4) verdict = "strong";
    else if (ratio <= 0.35 && dti <= 0.5) verdict = "fair";
    else if (ratio <= 0.45 && dti <= 0.6) verdict = "tight";
    return {
      netDisposable: net,
      ratio: ratio,
      dti: dti,
      verdict: verdict,
      surplus: net - proposedPayment
    };
  }

  function mask(value, visible) {
    var str = String(value || "");
    var keep = visible || 4;
    if (str.length <= keep) return str;
    return "•••• " + str.slice(-keep);
  }

  window.JCOB_FINANCE = {
    FREQUENCIES: FREQUENCIES,
    formatMWK: formatMWK,
    compactMWK: compactMWK,
    parseAmount: parseAmount,
    addMonths: addMonths,
    addFortnights: addFortnights,
    shortDate: shortDate,
    amortize: amortize,
    aprEstimate: aprEstimate,
    eligibilityAffordability: eligibilityAffordability,
    mask: mask
  };
})();
