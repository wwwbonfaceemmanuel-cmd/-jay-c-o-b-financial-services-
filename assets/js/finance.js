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
     rate        number  — interest rate, percent, in the unit given by rateBasis
     rateBasis   string  — 'annual' (default) | 'monthly'  ← quoted per year or per month
     termMonths  number  — term in months
     method      string  — 'reducing' | 'flat'
     frequency   string  — 'monthly' | 'fortnightly'
     processingFeePct / adminFee — fees in percent / MWK
     startDate   Date|null — disbursement date; the first instalment falls one
                             period after it

     The quoted rate is always applied in the unit the customer selected:
       • monthly basis → the figure is a percentage per month
         (25% per month on MWK 100,000 for 1 month = MWK 25,000 interest)
       • annual basis  → the figure is a percentage per year
         (25% per year on MWK 100,000 for 12 months = MWK 25,000 interest)
     No cap and no silent re-quoting: the chosen function is the function used.
     ------------------------------------------------------------------ */
  function amortize(opts) {
    var principal = Math.max(Number(opts.principal) || 0, 0);
    var rateBasis = opts.rateBasis === "monthly" ? "monthly" : "annual";
    var rateInput = Math.max(Number(opts.rate) || 0, 0);
    /* Resolve the quote to a monthly rate, then to an annual equivalent. */
    var monthlyRate = rateBasis === "monthly" ? rateInput : rateInput / 12;
    var rate = monthlyRate * 12;
    var termMonths = Math.max(Math.round(Number(opts.termMonths) || 1), 1);
    var method = opts.method === "flat" ? "flat" : "reducing";
    var freqKey = FREQUENCIES[opts.frequency] ? opts.frequency : "monthly";
    var freq = FREQUENCIES[freqKey];
    var processingFeePct = Math.max(Number(opts.processingFeePct) || 0, 0) / 100;
    var adminFee = Math.max(Number(opts.adminFee) || 0, 0);
    var start = opts.startDate ? new Date(opts.startDate) : new Date();

    var periods = Math.max(Math.round((termMonths / 12) * freq.perYear), 1);
    /* rate for one instalment period, in decimal (monthly quote ⇒ 25% = 0.25) */
    var ratePerPeriod = (monthlyRate / 100) * (12 / freq.perYear);

    var payment, totalInterest;
    if (method === "flat") {
      /* Flat: interest is charged on the full principal for every month of
         the term, using the monthly rate exactly as quoted. */
      totalInterest = principal * (monthlyRate / 100) * termMonths;
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
        /* first instalment falls one full period after disbursement */
        date: freqKey === "fortnightly" ? addFortnights(start, i) : addMonths(start, i),
        opening: opening,
        payment: rowPayment,
        interest: rowInterest,
        principal: rowPrincipal,
        closing: balance
      });
    }

    /* Totals are taken from the schedule itself, so the sheet, the table and
       the CSV can never disagree by a rounding unit — the final instalment
       absorbs any residual balance. */
    var scheduledTotal = 0;
    var scheduledInterest = 0;
    for (var r = 0; r < rows.length; r += 1) {
      scheduledTotal += rows[r].payment;
      scheduledInterest += rows[r].interest;
    }
    var totalRepayment = scheduledTotal;
    totalInterest = scheduledInterest;
    var totalCost = totalRepayment + fees;

    var apr = aprEstimate(Math.max(principal - fees, 1), payment, periods, freq.perYear);

    return {
      principal: principal,
      rate: rate,                 /* annual equivalent actually used */
      rateInput: rateInput,       /* figure the customer typed */
      rateBasis: rateBasis,       /* 'annual' | 'monthly' */
      monthlyRate: monthlyRate,   /* rate per month in percent */
      ratePerPeriod: ratePerPeriod * 100,
      periodsPerYear: freq.perYear,
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

  /* ------------------------------------------------------------------
     productTerms() / productQuote()
     ------------------------------------------------------------------
     Every surface that quotes a loan product goes through here: the
     product pages, the application flow, the calculator presets and the
     rates page. One resolver, one arithmetic, so two pages can never
     disagree about what a product costs.

     The catalogue stores the quote as it is published:
       rate      the figure the customer is shown
       rateBasis 'annual' (p.a.) or 'monthly' (% per month)
       method    'reducing' or 'flat'

     The rate is applied in the unit the product is quoted in. Nothing is
     silently re-quoted: a product quoting 24% p.a. is charged 2% a month
     on the falling balance; a product quoting 5% a month flat is charged
     principal × 5% × months, exactly as the calculator does it.
     ------------------------------------------------------------------ */
  function num(value, fallback) {
    var n = Number(value);
    return isFinite(n) ? n : fallback;
  }

  function productTerms(product, opts) {
    opts = opts || {};
    var p = product || {};
    var legacyTerm = Array.isArray(p.term) ? p.term : null;
    var minTerm = Math.max(Math.round(num(opts.minTerm, num(p.minTerm, legacyTerm ? legacyTerm[0] : 1))), 1);
    var maxTerm = Math.max(Math.round(num(opts.maxTerm, num(p.maxTerm, legacyTerm ? legacyTerm[1] : 84))), minTerm);
    var min = Math.max(num(opts.min, num(p.min, 0)), 0);
    var max = Math.max(num(opts.max, num(p.max, 0)), min);
    var basis = opts.rateBasis || p.rateBasis;
    var method = opts.method || p.method;

    var amount = num(opts.amount, num(opts.principal, (min + max) / 2));
    if (min > 0) amount = Math.max(amount, min);
    if (max > 0) amount = Math.min(amount, max);

    var termMonths = Math.round(num(opts.termMonths, num(opts.term, minTerm)));
    termMonths = Math.min(Math.max(termMonths, minTerm), maxTerm);

    return {
      id: p.id || "",
      name: p.name || opts.name || "Loan",
      rate: Math.max(num(p.rate, num(opts.rate, 0)), 0),
      rateBasis: basis === "monthly" ? "monthly" : "annual",
      method: method === "flat" ? "flat" : "reducing",
      fee: Math.max(num(opts.fee, num(p.fee, 0)), 0),
      min: min,
      max: max,
      minTerm: minTerm,
      maxTerm: maxTerm,
      amount: amount,
      termMonths: termMonths,
      frequency: opts.frequency === "fortnightly" ? "fortnightly" : "monthly",
      startDate: opts.startDate || null
    };
  }

  function productQuote(product, opts) {
    var t = productTerms(product, opts);
    var c = amortize({
      principal: t.amount, rate: t.rate, rateBasis: t.rateBasis,
      termMonths: t.termMonths, method: t.method, frequency: t.frequency,
      processingFeePct: t.fee, adminFee: opts && opts.adminFee,
      startDate: t.startDate
    });
    c.terms = t;
    return c;
  }

  /* How the rate is spoken about on screen — "24% p.a. reducing balance",
     "25% per month flat rate". Used by the product pages, the application
     flow and the calculator so the wording matches the arithmetic. */
  function ratePhrase(terms) {
    if (!terms) return "";
    var r = Number(terms.rate) || 0;
    var figure = String(Math.round(r * 100) / 100) + "%";
    if (terms.rateBasis === "monthly") {
      return figure + " per month " + (terms.method === "flat" ? "flat rate" : "on the falling balance");
    }
    return figure + " p.a. " + (terms.method === "flat" ? "flat rate" : "reducing");
  }

  /* The arithmetic, written out — the same sentence the calculator prints. */
  function formulaPhrase(c) {
    if (!c) return "";
    var mwk = formatMWK;
    if (c.method === "flat") {
      var perMonth = c.rateBasis === "monthly" ? c.rateInput : c.monthlyRate;
      return mwk(c.principal) + " × " + (Math.round(perMonth * 100) / 100) + "% per month × " +
        c.termMonths + (c.termMonths === 1 ? " month" : " months") + " = " + mwk(c.totalInterest) + " interest";
    }
    return (Math.round(c.ratePerPeriod * 100) / 100) + "% per " +
      (c.frequency === "fortnightly" ? "fortnight" : "month") + " on the falling balance over " +
      c.periods + (c.periods === 1 ? " instalment" : " instalments") + " = " + mwk(c.totalInterest) + " interest";
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
    productTerms: productTerms,
    productQuote: productQuote,
    ratePhrase: ratePhrase,
    formulaPhrase: formulaPhrase,
    aprEstimate: aprEstimate,
    eligibilityAffordability: eligibilityAffordability,
    mask: mask
  };
})();
