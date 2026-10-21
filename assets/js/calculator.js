/* =====================================================================
   Loan repayment & savings projection calculator
   ===================================================================== */
(function () {
  "use strict";

  var mwk = function (value) {
    var rounded = Math.round(value);
    return "MWK " + rounded.toLocaleString("en-US");
  };

  var el = function (id) { return document.getElementById(id); };

  /* ---------------- Tabs ---------------- */
  var tabs = document.querySelectorAll(".tab");
  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      tabs.forEach(function (t) {
        t.setAttribute("aria-selected", "false");
        var panel = document.getElementById(t.getAttribute("aria-controls"));
        if (panel) panel.hidden = true;
      });
      tab.setAttribute("aria-selected", "true");
      var target = document.getElementById(tab.getAttribute("aria-controls"));
      if (target) target.hidden = false;

      var isLoan = tab.id === "tab-loan";
      if (el("result-loan")) el("result-loan").hidden = !isLoan;
      if (el("result-savings")) el("result-savings").hidden = isLoan;
    });
  });

  /* ---------------- Loan ---------------- */
  var loanIds = ["loan-amount", "loan-term", "loan-rate", "loan-fee"];
  var loanInputs = loanIds.map(el).filter(Boolean);

  function calcLoan() {
    var principal = Number(el("loan-amount").value);
    var months = Number(el("loan-term").value);
    var apr = Number(el("loan-rate").value) / 100;
    var feePct = Number(el("loan-fee").value) / 100;

    var monthlyRate = apr / 12;
    var payment;
    if (monthlyRate === 0) {
      payment = principal / months;
    } else {
      var factor = Math.pow(1 + monthlyRate, months);
      payment = (principal * monthlyRate * factor) / (factor - 1);
    }

    var fee = principal * feePct;
    var totalInterest = payment * months - principal;
    var totalCost = principal + totalInterest + fee;

    el("out-amount").textContent = mwk(principal);
    el("out-term").textContent = months + " months";
    el("out-rate").textContent = (apr * 100).toFixed(apr * 100 % 1 === 0 ? 0 : 1) + "%";
    var feeLabel = (feePct * 100).toFixed(2).replace(/\.?0+$/, "");
    el("out-fee").textContent = (feeLabel === "" ? "0" : feeLabel) + "%";

    el("res-monthly").innerHTML = mwk(payment) + ' <small>/ month</small>';
    el("res-principal").textContent = mwk(principal);
    el("res-interest").textContent = mwk(totalInterest);
    el("res-fee").textContent = mwk(fee);
    el("res-total").textContent = mwk(totalCost);

    var principalShare = (principal / totalCost) * 100;
    el("bar-principal").style.width = principalShare.toFixed(1) + "%";
    el("bar-interest").style.width = (100 - principalShare).toFixed(1) + "%";

    /* Affordability */
    var income = Number(el("loan-income").value);
    var affordRow = el("row-afford");
    if (income > 0) {
      var share = (payment / income) * 100;
      var label = share.toFixed(0) + "% of net income";
      var note;
      if (share <= 30) {
        note = "Within a comfortable range for most lenders.";
      } else if (share <= 40) {
        note = "Manageable, but leaves limited room for shocks.";
      } else if (share <= 55) {
        note = "Stretched. Expect closer scrutiny from a lender.";
      } else {
        note = "High risk. This instalment would likely be unaffordable.";
      }
      el("res-afford").textContent = label;
      el("res-afford").style.color = share <= 40 ? "#7fd3b0" : share <= 55 ? "#ecd7a6" : "#f0a3a3";
      el("res-note").textContent = note + " Illustration only; lenders apply their own affordability tests, insurance requirements and fees.";
      affordRow.hidden = false;
    } else {
      affordRow.hidden = true;
      el("res-note").textContent =
        "Illustration only. Actual repayments depend on the lender's method, insurance requirements, processing fees and the date of disbursement.";
    }
  }

  loanInputs.forEach(function (input) {
    input.addEventListener("input", calcLoan);
    input.addEventListener("change", calcLoan);
  });
  var incomeInput = el("loan-income");
  if (incomeInput) incomeInput.addEventListener("input", calcLoan);

  /* ---------------- Savings ---------------- */
  var savIds = ["sav-start", "sav-monthly", "sav-years", "sav-rate", "sav-inflation"];
  var savInputs = savIds.map(el).filter(Boolean);

  function calcSavings() {
    var start = Number(el("sav-start").value);
    var monthly = Number(el("sav-monthly").value);
    var years = Number(el("sav-years").value);
    var rate = Number(el("sav-rate").value) / 100;
    var inflation = Number(el("sav-inflation").value) / 100;

    var months = years * 12;
    var monthlyRate = rate / 12;
    var factor = Math.pow(1 + monthlyRate, months);
    var future;
    if (monthlyRate === 0) {
      future = start + monthly * months;
    } else {
      future = start * factor + monthly * ((factor - 1) / monthlyRate);
    }

    var contributed = start + monthly * months;
    var growth = future - contributed;
    var real = future / Math.pow(1 + inflation, years);
    var drawdown = (future * 0.04) / 12;

    el("out-start").textContent = mwk(start);
    el("out-monthly").textContent = mwk(monthly);
    el("out-years").textContent = years + (years === 1 ? " year" : " years");
    el("out-sav-rate").textContent = rate * 100 + "%";
    el("out-inflation").textContent = inflation * 100 + "%";

    el("sav-future").innerHTML =
      mwk(future) + " <small>in " + years + (years === 1 ? " year" : " years") + "</small>";
    el("sav-contrib").textContent = mwk(contributed);
    el("sav-growth").textContent = mwk(growth);
    el("sav-real").textContent = mwk(real);
    el("sav-income").textContent = mwk(drawdown);
  }

  savInputs.forEach(function (input) {
    input.addEventListener("input", calcSavings);
    input.addEventListener("change", calcSavings);
  });

  /* ---------------- Init ---------------- */
  if (el("panel-loan")) calcLoan();
  if (el("panel-savings")) calcSavings();
})();
