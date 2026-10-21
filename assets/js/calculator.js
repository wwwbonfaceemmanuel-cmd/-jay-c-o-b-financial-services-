/* =====================================================================
   Loan calculator — MWK
   • Monthly or annual calculation basis
   • Flat-rate or reducing-balance formula
   • Dated monthly repayment schedule, CSV export and print plan
   ===================================================================== */
(function () {
  "use strict";

  var form = document.getElementById("calc-form");
  if (!form) return;

  var $ = function (id) { return document.getElementById(id); };

  var basisEl = $("calc-basis");
  var amountEl = $("calc-amount");
  var rateEl = $("calc-rate");
  var periodEl = $("calc-period");
  var periodUnit = $("period-unit");
  var startEl = $("calc-start");
  var feeEl = $("calc-fee");
  var formulaEls = document.querySelectorAll('input[name="formula"]');
  var formulaNote = $("formula-note");
  var basisHint = $("basis-hint");

  var MAX_ROWS = 360;
  var showAll = true;
  var scheduleRows = [];

  /* ---------------- Helpers ---------------- */
  function money(value, decimals) {
    var digits = decimals || 0;
    return "MWK " + Number(value).toLocaleString("en-US", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    });
  }

  function num(el, fallback) {
    var v = parseFloat(el.value);
    return isFinite(v) ? v : fallback;
  }

  function formula() {
    var checked = document.querySelector('input[name="formula"]:checked');
    return checked ? checked.value : "reducing";
  }

  function addMonths(date, months) {
    var d = new Date(date.getTime());
    var day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + months);
    var daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(day, daysInMonth));
    return d;
  }

  function shortDate(date) {
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }

  function startDate() {
    if (startEl.value) {
      var parsed = new Date(startEl.value + "T00:00:00");
      if (!isNaN(parsed)) return parsed;
    }
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }

  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
  }

  /* ---------------- Basis handling ---------------- */
  function applyBasis() {
    var annual = basisEl.value === "annual";
    periodUnit.textContent = annual ? "year" : "month";
    periodEl.max = annual ? "30" : "360";
    periodEl.value = "1"; // defaults: 1 month / 1 year
    basisHint.textContent = annual
      ? "Default: 1 year. Repayments are still scheduled monthly."
      : "Default: 1 month. Repayments are scheduled monthly.";
    recalc();
  }

  /* ---------------- Formula copy ---------------- */
  function updateFormulaNote() {
    if (formula() === "flat") {
      formulaNote.textContent =
        "Flat rate charges interest on the original principal for the whole term, even as the balance falls. Simpler, but usually more expensive overall.";
    } else {
      formulaNote.textContent =
        "Reducing balance charges interest on the outstanding balance each month, so the interest portion falls over time. Usually the cheaper method.";
    }
  }

  /* ---------------- Core calculation ---------------- */
  function recalc() {
    var principal = Math.max(num(amountEl, 5000000), 0);
    var annualRate = Math.max(Math.min(num(rateEl, 24), 100), 0);
    var basis = basisEl.value;
    var period = Math.max(Math.round(num(periodEl, 1)), 1);
    var feePct = Math.max(Math.min(num(feeEl, 0), 100), 0) / 100;

    var months = basis === "annual" ? period * 12 : period;
    months = Math.min(Math.max(months, 1), MAX_ROWS);

    var monthlyRate = annualRate / 100 / 12;
    var useFlat = formula() === "flat";

    /* Reducing-balance instalment */
    var reducingPayment;
    if (monthlyRate === 0) {
      reducingPayment = principal / months;
    } else {
      var factor = Math.pow(1 + monthlyRate, months);
      reducingPayment = (principal * monthlyRate * factor) / (factor - 1);
    }
    var reducingInterest = reducingPayment * months - principal;

    /* Flat-rate instalment */
    var flatInterest = principal * (annualRate / 100) * (months / 12);
    var flatPayment = (principal + flatInterest) / months;

    var interest = useFlat ? flatInterest : reducingInterest;
    var monthlyPayment = useFlat ? flatPayment : reducingPayment;
    var fee = principal * feePct;
    var totalRepayment = principal + interest;
    var totalAmount = totalRepayment + fee;

    /* ---------------- Schedule rows ---------------- */
    scheduleRows = [];
    var balance = principal;
    var first = startDate();

    for (var i = 1; i <= months; i++) {
      var opening = balance;
      var rowInterest, rowPrincipal, rowPayment;

      if (useFlat) {
        rowInterest = flatInterest / months;
        rowPrincipal = principal / months;
        rowPayment = flatPayment;
      } else {
        rowInterest = opening * monthlyRate;
        rowPrincipal = reducingPayment - rowInterest;
        rowPayment = reducingPayment;
      }

      /* Final row settles any rounding drift exactly */
      if (i === months) {
        rowPrincipal = opening;
        rowPayment = rowPrincipal + rowInterest;
      }

      balance = Math.max(opening - rowPrincipal, 0);

      scheduleRows.push({
        n: i,
        date: addMonths(first, i - 1),
        opening: opening,
        payment: rowPayment,
        interest: rowInterest,
        principal: rowPrincipal,
        closing: balance
      });
    }

    renderSummary({
      principal: principal,
      interest: interest,
      fee: fee,
      totalRepayment: totalRepayment,
      totalAmount: totalAmount,
      monthlyPayment: monthlyPayment,
      months: months,
      period: period,
      basis: basis,
      annualRate: annualRate,
      useFlat: useFlat,
      flatInterest: flatInterest,
      reducingInterest: reducingInterest
    });

    renderSchedule(months);
  }

  /* ---------------- Summary rendering ---------------- */
  function renderSummary(d) {
    $("res-total").textContent = money(d.totalAmount);
    $("res-principal").textContent = money(d.principal);
    $("res-interest").textContent = money(d.interest);
    $("res-monthly").textContent = money(d.monthlyPayment);
    $("res-repayment").textContent = money(d.totalRepayment);
    $("res-fee").textContent = money(d.fee);
    $("res-fee-row").hidden = d.fee <= 0;

    var duration;
    if (d.basis === "annual") {
      duration = d.period + (d.period === 1 ? " year" : " years") +
        " (" + d.months + " months)";
    } else {
      duration = d.months + (d.months === 1 ? " month" : " months");
      if (d.months % 12 === 0) duration += " (" + d.months / 12 + (d.months === 12 ? " year" : " years") + ")";
    }
    $("res-duration").textContent = duration;
    $("res-basis").textContent = d.basis === "annual" ? "Annual" : "Monthly";
    $("res-formula").textContent = d.useFlat ? "Flat rate" : "Reducing balance";
    $("res-rate").textContent = (Number.isInteger(d.annualRate) ? d.annualRate : d.annualRate.toFixed(2)) + "% p.a.";

    var principalShare = d.totalAmount > 0 ? (d.principal / d.totalAmount) * 100 : 100;
    $("bar-principal").style.width = principalShare.toFixed(2) + "%";
    $("bar-interest").style.width = Math.max(100 - principalShare, 0).toFixed(2) + "%";

    var diff = Math.abs(d.flatInterest - d.reducingInterest);
    var compare;
    if (diff < 1) {
      compare = "Both formulas produce the same interest at a 0% rate.";
    } else if (d.useFlat) {
      compare = "Reducing balance would charge " + money(d.reducingInterest) +
        " interest — " + money(diff) + " less than this flat-rate plan.";
    } else {
      compare = "A flat rate would charge " + money(d.flatInterest) +
        " interest — " + money(diff) + " more than this reducing-balance plan.";
    }
    $("res-note").textContent = compare + " Figures are indicative; lenders may add insurance, processing fees and different rounding.";

    var first = startDate();
    var last = addMonths(first, d.months - 1);
    $("schedule-summary").textContent =
      d.months + " monthly payment" + (d.months === 1 ? "" : "s") +
      " from " + shortDate(first) + " to " + shortDate(last) +
      " · " + (d.useFlat ? "flat rate" : "reducing balance") + " · MWK";
  }

  /* ---------------- Schedule rendering ---------------- */
  function renderSchedule(months) {
    var body = $("schedule-body");
    var rows = showAll ? scheduleRows : scheduleRows.slice(0, 12);

    body.innerHTML = rows.map(function (r) {
      return "<tr>" +
        "<td>" + r.n + "</td>" +
        "<td>" + shortDate(r.date) + "</td>" +
        '<td class="num">' + money(r.opening) + "</td>" +
        '<td class="num"><strong>' + money(r.payment) + "</strong></td>" +
        '<td class="num">' + money(r.interest) + "</td>" +
        '<td class="num">' + money(r.principal) + "</td>" +
        '<td class="num">' + money(r.closing) + "</td>" +
        "</tr>";
    }).join("");

    var totals = scheduleRows.reduce(function (acc, r) {
      acc.payment += r.payment;
      acc.interest += r.interest;
      acc.principal += r.principal;
      return acc;
    }, { payment: 0, interest: 0, principal: 0 });

    $("foot-opening").textContent = money(scheduleRows.length ? scheduleRows[0].opening : 0);
    $("foot-payment").textContent = money(totals.payment);
    $("foot-interest").textContent = money(totals.interest);
    $("foot-principal").textContent = money(totals.principal);
    $("foot-closing").textContent = money(0);

    var toggle = $("toggle-rows");
    if (months <= 12) {
      toggle.hidden = true;
    } else {
      toggle.hidden = false;
      toggle.textContent = showAll ? "Show first 12 rows" : "Show all " + months + " rows";
    }
  }

  /* ---------------- Export ---------------- */
  function scheduleCSV() {
    var lines = [
      "Jay C.O.B Financial Services - Loan Repayment Schedule",
      "Currency,MWK",
      "Basis," + basisEl.value,
      "Formula," + (formula() === "flat" ? "Flat rate" : "Reducing balance"),
      "Principal," + num(amountEl, 0),
      "Annual interest rate," + num(rateEl, 0) + "%",
      "Term (months)," + (basisEl.value === "annual" ? num(periodEl, 1) * 12 : num(periodEl, 1)),
      "Arrangement fee," + num(feeEl, 0) + "%",
      "",
      "No,Due date,Opening balance,Payment,Interest,Principal,Closing balance"
    ];
    scheduleRows.forEach(function (r) {
      lines.push([
        r.n,
        r.date.toISOString().slice(0, 10),
        r.opening.toFixed(2),
        r.payment.toFixed(2),
        r.interest.toFixed(2),
        r.principal.toFixed(2),
        r.closing.toFixed(2)
      ].join(","));
    });
    var totals = scheduleRows.reduce(function (acc, r) {
      acc.payment += r.payment;
      acc.interest += r.interest;
      acc.principal += r.principal;
      return acc;
    }, { payment: 0, interest: 0, principal: 0 });
    lines.push("", "TOTALS,,," + totals.payment.toFixed(2) + "," +
      totals.interest.toFixed(2) + "," + totals.principal.toFixed(2) + ",0.00");
    lines.push("", "Generated " + new Date().toISOString().slice(0, 10), "Illustration only - not a binding offer");
    return lines.join("\n");
  }

  function downloadCSV() {
    var blob = new Blob([scheduleCSV()], { type: "text/csv;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "JC-loan-schedule-MWK.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1200);
  }

  /* ---------------- Events ---------------- */
  basisEl.addEventListener("change", applyBasis);
  formulaEls.forEach(function (radio) {
    radio.addEventListener("change", function () {
      updateFormulaNote();
      recalc();
    });
  });

  [amountEl, rateEl, periodEl, feeEl, startEl].forEach(function (el) {
    el.addEventListener("input", recalc);
    el.addEventListener("change", recalc);
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    recalc();
    if (window.innerWidth < 960) {
      $("schedule-card").scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  $("calc-reset").addEventListener("click", function () {
    basisEl.value = "monthly";
    amountEl.value = 5000000;
    rateEl.value = 24;
    feeEl.value = 0;
    document.getElementById("formula-reducing").checked = true;
    startEl.value = todayISO();
    showAll = true;
    applyBasis();
    updateFormulaNote();
  });

  $("toggle-rows").addEventListener("click", function () {
    showAll = !showAll;
    renderSchedule(basisEl.value === "annual" ? num(periodEl, 1) * 12 : num(periodEl, 1));
  });

  $("download-schedule").addEventListener("click", downloadCSV);
  $("download-schedule-2").addEventListener("click", downloadCSV);
  $("print-plan").addEventListener("click", function () {
    document.body.classList.remove("print-receipt");
    window.print();
  });

  /* ---------------- Init ---------------- */
  startEl.value = todayISO();
  updateFormulaNote();
  recalc();
})();
