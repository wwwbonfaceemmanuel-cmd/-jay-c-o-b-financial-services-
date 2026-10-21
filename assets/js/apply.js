/* =====================================================================
   Loan application — shared by the public apply page and the dashboard.
   Five steps: loan → personal/employment → business & bank → documents
   → review & submit. Creates a reference, notification and receipt.
   ===================================================================== */
(function () {
  "use strict";

  var UI = window.JCOB_UI;
  var DATA = window.JCOB_DATA;
  var F = window.JCOB_FINANCE;
  if (!UI || !DATA || !F) return;

  var PRODUCTS = {
    "Personal Loan": { min: 100000, max: 15000000, rate: 24, term: [6, 48], fee: 2 },
    "Business Loan": { min: 500000, max: 50000000, rate: 22, term: [12, 60], fee: 2.5 },
    "Emergency Loan": { min: 50000, max: 2000000, rate: 28, term: [3, 12], fee: 2 },
    "Salary-based Loan": { min: 100000, max: 10000000, rate: 23, term: [6, 36], fee: 2 },
    "Employee Loan": { min: 100000, max: 8000000, rate: 21, term: [6, 36], fee: 1.5 },
    "Small-business Loan": { min: 250000, max: 20000000, rate: 23, term: [6, 48], fee: 2 },
    "Agricultural Loan": { min: 200000, max: 25000000, rate: 20, term: [6, 36], fee: 2 },
    "Short-term Loan": { min: 50000, max: 3000000, rate: 29, term: [1, 6], fee: 3 },
    "Long-term Loan": { min: 1000000, max: 60000000, rate: 21, term: [24, 84], fee: 2.5 },
    "Secured Loan": { min: 500000, max: 80000000, rate: 18, term: [12, 84], fee: 1.5 },
    "Unsecured Loan": { min: 100000, max: 10000000, rate: 26, term: [6, 36], fee: 2.5 }
  };

  var DOCS = [
    { id: "id", name: "National ID or passport", required: true, hint: "Both sides, PDF or image" },
    { id: "income", name: "Proof of income", required: true, hint: "Payslip or 3 months of takings" },
    { id: "residence", name: "Proof of residence", required: true, hint: "Utility bill or tenancy agreement" },
    { id: "bank", name: "Bank or mobile money statement", required: false, hint: "3–6 months, if available" },
    { id: "business", name: "Business registration / tax certificate", required: false, hint: "Business applicants only" }
  ];

  var state = {
    step: 1,
    product: "Personal Loan",
    amount: 5000000,
    term: 24,
    docs: {},
    draftId: null,
    submitted: null,
    scope: "public"
  };

  function $(id) { return document.getElementById(id); }
  function esc(v) {
    return String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function mwk(v) { return F.formatMWK(v); }
  function profile() { return DATA.get().profile; }

  /* ---------------- Markup ---------------- */
  function stepper() {
    var labels = ["Loan", "Personal", "Business & bank", "Documents", "Review"];
    return '<ol class="app-stepper">' + labels.map(function (l, i) {
      var cls = i + 1 === state.step ? "is-current" : i + 1 < state.step ? "is-done" : "";
      return '<li class="' + cls + '">' + l + "</li>";
    }).join("") + "</ol>";
  }

  function summaryBox() {
    var p = PRODUCTS[state.product];
    var calc = F.amortize({
      principal: state.amount, rate: p.rate, termMonths: state.term,
      method: "reducing", frequency: "monthly", processingFeePct: p.fee
    });
    return '<div class="calc-result" style="margin-top:1rem;">' +
      '<p class="hero-label">Estimated monthly instalment</p>' +
      '<p class="hero-figure">' + mwk(calc.payment) + "</p>" +
      '<div class="row"><span>Product</span><strong>' + esc(state.product) + "</strong></div>" +
      '<div class="row"><span>Amount requested</span><strong>' + mwk(state.amount) + "</strong></div>" +
      '<div class="row"><span>Term</span><strong>' + state.term + " months</strong></div>" +
      '<div class="row"><span>Indicative rate</span><strong>' + p.rate + "% p.a. (reducing)</strong></div>" +
      '<div class="row"><span>Processing fee</span><strong>' + mwk(calc.processingFee) + "</strong></div>" +
      '<div class="row"><span>Total repayment</span><strong>' + mwk(calc.totalCost) + "</strong></div>" +
      '<p class="result-note" style="font-size:.7rem;color:#9db3a4;margin-top:.8rem;">Estimates only. Final terms are confirmed after credit and affordability assessment.</p></div>';
  }

  function stepOne() {
    var p = PRODUCTS[state.product];
    return '<div class="app-step" data-step="1">' +
      "<h3>Loan details</h3><p class=\"step-intro\">Choose a product and tell us how much you need. Limits shown are indicative.</p>" +
      '<div class="form-grid">' +
        '<div class="field field--full"><label for="ap-product">Loan product</label><select id="ap-product">' +
          Object.keys(PRODUCTS).map(function (k) { return '<option' + (k === state.product ? " selected" : "") + ">" + k + "</option>"; }).join("") +
        "</select></div>" +
        '<div class="field"><label for="ap-amount">Requested amount (MWK)</label><input id="ap-amount" type="number" min="' + p.min + '" max="' + p.max + '" step="50000" value="' + state.amount + '">' +
          '<span class="hint" id="ap-limits">Limits ' + mwk(p.min) + " – " + mwk(p.max) + " · rate from " + p.rate + "% p.a.</span></div>" +
        '<div class="field"><label for="ap-term">Repayment period (months)</label><input id="ap-term" type="number" min="' + p.term[0] + '" max="' + p.term[1] + '" value="' + state.term + '">' +
          '<span class="hint">Allowed: ' + p.term[0] + "–" + p.term[1] + " months</span></div>" +
        '<div class="field field--full"><label for="ap-purpose">Loan purpose</label><select id="ap-purpose">' +
          ["Working capital", "Stock or inventory", "Equipment", "School fees", "Medical expenses", "Home improvements", "Agriculture inputs", "Debt consolidation", "Other"].map(function (x) {
            return "<option>" + x + "</option>";
          }).join("") + "</select></div>" +
        '<div class="field field--full"><label for="ap-purpose-note">Describe the purpose</label><textarea id="ap-purpose-note" placeholder="A sentence or two is enough."></textarea></div>' +
      "</div>" +
      '<div id="ap-summary">' + summaryBox() + "</div>" +
      "</div>";
  }

  function stepTwo() {
    var p = profile();
    return '<div class="app-step" data-step="2" hidden>' +
      "<h3>Personal & employment details</h3><p class=\"step-intro\">Prefilled from your profile where available. All fields marked * are required.</p>" +
      '<div class="fieldset-title">Personal information</div>' +
      '<div class="form-grid">' +
        '<div class="field"><label for="ap-first">First name *</label><input id="ap-first" value="' + esc(p.firstName) + '"><span class="error-msg">Required</span></div>' +
        '<div class="field"><label for="ap-last">Surname *</label><input id="ap-last" value="' + esc(p.lastName) + '"><span class="error-msg">Required</span></div>' +
        '<div class="field"><label for="ap-dob">Date of birth *</label><input id="ap-dob" type="date" value="' + esc(p.dob) + '"><span class="error-msg">You must be at least 18</span></div>' +
        '<div class="field"><label for="ap-gender">Gender</label><select id="ap-gender">' +
          ["Female", "Male", "Prefer not to say"].map(function (g) { return "<option" + (p.gender === g ? " selected" : "") + ">" + g + "</option>"; }).join("") + "</select></div>" +
        '<div class="field"><label for="ap-nid">National ID number *</label><input id="ap-nid" value="' + esc(p.nid) + '" class="masked"><span class="hint">Masked after submission</span><span class="error-msg">Required</span></div>' +
        '<div class="field"><label for="ap-phone">Phone number *</label><input id="ap-phone" type="tel" value="' + esc(p.phone) + '"><span class="error-msg">Required</span></div>' +
        '<div class="field"><label for="ap-email">Email address *</label><input id="ap-email" type="email" value="' + esc(p.email) + '"><span class="error-msg">Required</span></div>' +
        '<div class="field"><label for="ap-marital">Marital status</label><select id="ap-marital"><option>Single</option><option selected>Married</option><option>Divorced</option><option>Widowed</option></select></div>' +
        '<div class="field field--full"><label for="ap-address">Residential address *</label><input id="ap-address" value="' + esc(p.address) + '"><span class="error-msg">Required</span></div>' +
        '<div class="field"><label for="ap-district">District</label><input id="ap-district" value="' + esc(p.district) + '"></div>' +
      "</div>" +
      '<div class="fieldset-title">Employment & income</div>' +
      '<div class="form-grid">' +
        '<div class="field"><label for="ap-employment">Employment status *</label><select id="ap-employment">' +
          ["Self-employed", "Employed — private sector", "Employed — public sector", "Business owner", "Contractor", "Unemployed"].map(function (e) {
            return "<option" + (e === "Business owner" ? " selected" : "") + ">" + e + "</option>";
          }).join("") + "</select></div>" +
        '<div class="field"><label for="ap-occupation">Occupation</label><input id="ap-occupation" value="' + esc(p.occupation) + '"></div>' +
        '<div class="field"><label for="ap-employer">Employer / business name</label><input id="ap-employer" value="' + esc(p.employer) + '"></div>' +
        '<div class="field"><label for="ap-employer-phone">Employer phone</label><input id="ap-employer-phone" placeholder="+265 …"></div>' +
        '<div class="field"><label for="ap-income">Monthly income (MWK) *</label><input id="ap-income" type="number" value="' + p.monthlyIncome + '"><span class="error-msg">Required</span></div>' +
        '<div class="field"><label for="ap-expenses">Monthly expenses (MWK) *</label><input id="ap-expenses" type="number" value="' + p.monthlyExpenses + '"><span class="error-msg">Required</span></div>' +
        '<div class="field"><label for="ap-debts">Existing monthly debt obligations (MWK)</label><input id="ap-debts" type="number" value="265000"></div>' +
        '<div class="field"><label for="ap-dependants">Number of dependants</label><input id="ap-dependants" type="number" value="3" min="0"></div>' +
      "</div>" +
      '<div class="fieldset-title">Next of kin</div>' +
      '<div class="form-grid form-grid--3">' +
        '<div class="field"><label for="ap-nok-name">Full name *</label><input id="ap-nok-name" value="' + esc(p.nextOfKin.name) + '"><span class="error-msg">Required</span></div>' +
        '<div class="field"><label for="ap-nok-rel">Relationship</label><input id="ap-nok-rel" value="' + esc(p.nextOfKin.relationship) + '"></div>' +
        '<div class="field"><label for="ap-nok-phone">Phone *</label><input id="ap-nok-phone" value="' + esc(p.nextOfKin.phone) + '"><span class="error-msg">Required</span></div>' +
      "</div>" +
      "</div>";
  }

  function stepThree() {
    return '<div class="app-step" data-step="3" hidden>' +
      "<h3>Business & payment details</h3><p class=\"step-intro\">Business information applies to business applicants. Bank or mobile money details are used for disbursement and repayments.</p>" +
      '<div class="fieldset-title">Business information</div>' +
      '<div class="form-grid">' +
        '<div class="field"><label for="ap-biz-name">Registered business name</label><input id="ap-biz-name" placeholder="Tembo Traders"></div>' +
        '<div class="field"><label for="ap-biz-reg">Business registration number</label><input id="ap-biz-reg" placeholder="MW-2019-44821"></div>' +
        '<div class="field"><label for="ap-biz-tin">Tax identification number (TIN)</label><input id="ap-biz-tin" placeholder="12345678"></div>' +
        '<div class="field"><label for="ap-biz-years">Years in operation</label><input id="ap-biz-years" type="number" min="0" value="7"></div>' +
        '<div class="field"><label for="ap-biz-turnover">Monthly turnover (MWK)</label><input id="ap-biz-turnover" type="number" value="3200000"></div>' +
        '<div class="field"><label for="ap-biz-costs">Monthly business costs (MWK)</label><input id="ap-biz-costs" type="number" value="1850000"></div>' +
        '<div class="field field--full"><label for="ap-biz-address">Business address</label><input id="ap-biz-address" value="Area 47, Sector 3, Lilongwe"></div>' +
      "</div>" +
      '<div class="fieldset-title">Bank or mobile money details</div>' +
      '<div class="form-grid">' +
        '<div class="field"><label for="ap-bank-name">Bank / provider</label><select id="ap-bank-name">' +
          ["National Bank of Malawi", "Standard Bank", "FDH Bank", "Centenary Bank", "Airtel Money", "TNM Mpamba", "Other"].map(function (b) { return "<option>" + b + "</option>"; }).join("") + "</select></div>" +
        '<div class="field"><label for="ap-bank-account">Account or wallet number</label><input id="ap-bank-account" value="•••• •••• 4821" readonly></div>' +
        '<div class="field"><label for="ap-bank-branch">Branch</label><input id="ap-bank-branch" value="City Centre, Lilongwe"></div>' +
      "</div>" +
      '<div class="fieldset-title">Guarantor (if required)</div>' +
      '<div class="form-grid">' +
        '<div class="field"><label for="ap-g-name">Guarantor name</label><input id="ap-g-name" value="Grace Tembo"></div>' +
        '<div class="field"><label for="ap-g-phone">Guarantor phone</label><input id="ap-g-phone" value="+265 888 456 789"></div>' +
        '<div class="field"><label for="ap-g-rel">Relationship</label><input id="ap-g-rel" value="Sister"></div>' +
        '<div class="field"><label for="ap-g-id">Guarantor ID number</label><input id="ap-g-id" class="masked" value="MWI-••••-2210"></div>' +
      "</div>" +
      '<div class="notice notice--info" style="margin-top:1rem;">' + UI.ICONS.info + "<div>For secured loans, collateral details and a valuation are requested after initial review.</div></div>" +
      "</div>";
  }

  function stepFour() {
    return '<div class="app-step" data-step="4" hidden>' +
      "<h3>Upload documents</h3><p class=\"step-intro\">PDF, JPG or PNG up to 5 MB each. Required documents are marked with *.</p>" +
      '<div class="doc-list" style="gap:.55rem;">' + DOCS.map(function (d) {
        var done = !!state.docs[d.id];
        return '<label class="dz' + (done ? " is-done" : "") + '" data-dz="' + d.id + '" style="cursor:pointer;">' +
          '<span class="dz-icon">' + (done ? UI.ICONS.success : UI.ICONS.upload) + "</span>" +
          "<div style=\"flex:1;\"><strong>" + esc(d.name) + (d.required ? " *" : "") + "</strong>" +
          "<span>" + (done ? esc(state.docs[d.id]) : esc(d.hint)) + "</span></div>" +
          '<span class="pill ' + (done ? "pill--ok" : "pill--neutral") + '">' + (done ? "Uploaded" : "Choose file") + "</span>" +
          '<input type="file" data-doc-input="' + d.id + '" accept=".pdf,.jpg,.jpeg,.png" hidden></label>';
      }).join("") + "</div>" +
      '<div class="notice notice--warn" style="margin-top:1rem;">' + UI.ICONS.info + "<div><strong>Missing documents delay decisions</strong>You can submit now and supply anything outstanding within 48 hours from your dashboard.</div></div>" +
      "</div>";
  }

  function stepFive() {
    var p = PRODUCTS[state.product];
    var calc = F.amortize({ principal: state.amount, rate: p.rate, termMonths: state.term, method: "reducing", frequency: "monthly", processingFeePct: p.fee });
    function v(id, fallback) {
      var el = $(id);
      return el ? el.value : fallback;
    }
    return '<div class="app-step" data-step="5" hidden>' +
      "<h3>Review & submit</h3><p class=\"step-intro\">Check everything carefully. You can go back to correct any step.</p>" +
      '<div class="review-grid">' +
        '<div class="review-item"><dt>Product</dt><dd>' + esc(state.product) + "</dd></div>" +
        '<div class="review-item"><dt>Amount requested</dt><dd>' + mwk(state.amount) + "</dd></div>" +
        '<div class="review-item"><dt>Term</dt><dd>' + state.term + " months</dd></div>" +
        '<div class="review-item"><dt>Purpose</dt><dd>' + esc(v("ap-purpose", "—")) + "</dd></div>" +
        '<div class="review-item"><dt>Full name</dt><dd>' + esc(v("ap-first", "") + " " + v("ap-last", "")) + "</dd></div>" +
        '<div class="review-item"><dt>National ID</dt><dd class="masked">' + esc(F.mask(v("ap-nid", ""), 4)) + "</dd></div>" +
        '<div class="review-item"><dt>Phone</dt><dd>' + esc(v("ap-phone", "")) + "</dd></div>" +
        '<div class="review-item"><dt>Email</dt><dd>' + esc(v("ap-email", "")) + "</dd></div>" +
        '<div class="review-item"><dt>Monthly income</dt><dd>' + mwk(Number(v("ap-income", 0))) + "</dd></div>" +
        '<div class="review-item"><dt>Monthly expenses</dt><dd>' + mwk(Number(v("ap-expenses", 0))) + "</dd></div>" +
        '<div class="review-item"><dt>Existing obligations</dt><dd>' + mwk(Number(v("ap-debts", 0))) + "</dd></div>" +
        '<div class="review-item"><dt>Documents uploaded</dt><dd>' + (Object.keys(state.docs).length || 0) + " of " + DOCS.length + "</dd></div>" +
      "</div>" +
      '<div class="calc-result" style="margin-top:1rem;">' +
        '<div class="row"><span>Estimated instalment</span><strong>' + mwk(calc.payment) + "</strong></div>" +
        '<div class="row"><span>Indicative rate</span><strong>' + p.rate + "% p.a. reducing balance</strong></div>" +
        '<div class="row"><span>Processing fee</span><strong>' + mwk(calc.processingFee) + "</strong></div>" +
        '<div class="row"><span>Total cost of credit</span><strong>' + mwk(calc.totalCost) + "</strong></div>" +
      "</div>" +
      '<div class="stack" style="margin-top:1rem;display:grid;gap:.6rem;">' +
        '<label class="check-row"><input type="checkbox" id="ap-consent-data"><span>I consent to my personal data being processed for this application, in line with the Privacy Policy and Data Protection Policy. *</span></label>' +
        '<label class="check-row"><input type="checkbox" id="ap-consent-credit"><span>I authorise JAY C O B Financial Services to conduct credit and affordability checks, including with credit reference bureaus. *</span></label>' +
        '<label class="check-row"><input type="checkbox" id="ap-declare"><span>I declare that the information provided is true and complete, and I understand that false information may lead to refusal or withdrawal of credit. *</span></label>' +
      "</div>" +
      '<p class="form-status" id="ap-status"></p>' +
      "</div>";
  }

  function confirmation(app) {
    return '<div class="card confirm-card" style="max-width:34rem;margin-inline:auto;">' +
      '<div class="confirm-tick">' + UI.ICONS.success + "</div>" +
      "<h2 style=\"font-size:1.45rem;\">Application submitted</h2>" +
      "<p class=\"text-small text-muted mt-1\">Thank you, " + esc(profile().firstName) + ". Your application is in the queue for verification.</p>" +
      '<p class="ref-pill">' + esc(app.ref) + "</p>" +
      '<div class="review-grid" style="text-align:left;margin-top:1.4rem;">' +
        '<div class="review-item"><dt>Product</dt><dd>' + esc(app.product) + "</dd></div>" +
        '<div class="review-item"><dt>Amount</dt><dd>' + mwk(app.amount) + "</dd></div>" +
        '<div class="review-item"><dt>Term</dt><dd>' + app.term + " months</dd></div>" +
        '<div class="review-item"><dt>Status</dt><dd>' + UI.statusPill("pending") + "</dd></div>" +
      "</div>" +
      '<div class="notice notice--info" style="margin-top:1rem;text-align:left;">' + UI.ICONS.info +
        "<div><strong>What happens next</strong>1. You receive a confirmation by email and SMS. 2. Documents are verified within one working day. 3. Credit and affordability assessment takes 1–3 working days. 4. You are notified of the decision and, if approved, invited to accept the agreement.</div></div>" +
      '<div class="flex flex-wrap gap-1" style="margin-top:1.2rem;justify-content:center;">' +
        '<a class="btn btn--gold" href="dashboard.html#applications">Track application</a>' +
        '<button class="btn btn--ghost" type="button" data-app-new>Start another</button>' +
        '<a class="btn btn--ghost" href="dashboard.html">Dashboard</a>' +
      "</div></div>";
  }

  /* ---------------- Shells ---------------- */
  function publicShell() {
    if (state.submitted) {
      return '<div class="container" style="max-width:62rem;">' + confirmation(state.submitted) + "</div>";
    }
    return '<div class="container" style="max-width:74rem;">' +
      '<div class="dash-grid" style="grid-template-columns:1.6fr .9fr;align-items:start;">' +
        '<div class="calc-panel">' + stepper() +
          '<form id="apply-form" novalidate>' + stepOne() + stepTwo() + stepThree() + stepFour() + stepFive() +
            '<div class="flex flex-wrap items-center gap-1" style="margin-top:1.2rem;">' +
              '<button class="btn btn--ghost" type="button" data-step-prev hidden>← Back</button>' +
              '<button class="btn btn--gold" type="button" data-step-next>Continue →</button>' +
              '<button class="btn btn--gold" type="submit" data-step-submit hidden>Submit application</button>' +
              '<button class="btn btn--ghost" type="button" data-save-draft style="margin-left:auto;">Save draft</button>' +
            "</div>" +
          "</form>" +
        "</div>" +
        '<aside>' + summaryBox() +
          '<div class="card" style="margin-top:1rem;">' +
            '<h3 style="font-size:.98rem;">Documents you will need</h3>' +
            '<ul class="card-list">' + DOCS.map(function (d) { return "<li>" + esc(d.name) + (d.required ? " (required)" : " (if available)") + "</li>"; }).join("") + "</ul>" +
          "</div>" +
          '<div class="notice notice--warn" style="margin-top:1rem;">' + UI.ICONS.info + "<div><strong>Before you apply</strong>You must be 18+, a Malawian resident, and able to show affordable repayment capacity.</div></div>" +
        "</aside>" +
      "</div></div>";
  }

  function dashboardShell() {
    if (state.submitted) return confirmation(state.submitted);
    return '<div class="app-page-head"><div><h1>Apply for a loan</h1><p>Complete the five steps below. Your progress is saved in this browser.</p></div>' +
      '<div class="head-actions"><a class="btn btn--ghost btn--sm" href="#applications">My applications</a></div></div>' +
      '<div class="dash-grid" style="grid-template-columns:1.55fr 1fr;align-items:start;">' +
        '<div class="calc-panel" style="background:#fff;">' + stepper() +
          '<form id="apply-form" novalidate>' + stepOne() + stepTwo() + stepThree() + stepFour() + stepFive() +
            '<div class="flex flex-wrap items-center gap-1" style="margin-top:1.2rem;">' +
              '<button class="btn btn--ghost" type="button" data-step-prev hidden>← Back</button>' +
              '<button class="btn btn--gold" type="button" data-step-next>Continue →</button>' +
              '<button class="btn btn--gold" type="submit" data-step-submit hidden>Submit application</button>' +
              '<button class="btn btn--ghost" type="button" data-save-draft style="margin-left:auto;">Save draft</button>' +
            "</div>" +
          "</form>" +
        "</div>" +
        "<aside>" + summaryBox() +
          '<div class="app-panel" style="margin-top:1rem;"><div class="app-panel-head"><h2>Affordability check</h2></div>' +
            '<div class="app-panel-body" id="ap-affordability">' + affordabilityBlock() + "</div></div>" +
        "</aside>" +
      "</div>";
  }

  function affordabilityBlock() {
    var p = PRODUCTS[state.product];
    var calc = F.amortize({ principal: state.amount, rate: p.rate, termMonths: state.term, method: "reducing", frequency: "monthly", processingFeePct: p.fee });
    var pr = profile();
    var a = F.eligibilityAffordability(pr.monthlyIncome, pr.monthlyExpenses, 265000, calc.payment);
    var tone = a.verdict === "strong" ? "ok" : a.verdict === "fair" ? "warn" : "danger";
    return '<div class="form-grid">' +
      '<div class="review-item"><dt>Monthly income</dt><dd>' + mwk(pr.monthlyIncome) + "</dd></div>" +
      '<div class="review-item"><dt>Estimated instalment</dt><dd>' + mwk(calc.payment) + "</dd></div>" +
      '<div class="review-item"><dt>Share of income</dt><dd>' + (a.ratio * 100).toFixed(1) + "%</dd></div>" +
      '<div class="review-item"><dt>Debt-to-income</dt><dd>' + (a.dti * 100).toFixed(1) + "%</dd></div></div>" +
      '<div class="progress" style="margin-top:.7rem;"><span style="width:' + Math.min(a.ratio * 100, 100) + '%"></span></div>' +
      '<p class="text-tiny" style="margin-top:.5rem;color:var(--muted);">Affordability: <span class="pill pill--' + tone + '">' + a.verdict + "</span> · keep instalments under 30% of income for the best approval odds.</p>";
  }

  /* ---------------- Behaviour ---------------- */
  function refreshSummary() {
    var html = summaryBox();
    var target = $("ap-summary");
    if (target) target.innerHTML = html;
    var aff = $("ap-affordability");
    if (aff) aff.innerHTML = affordabilityBlock();
  }

  function validateStep(step) {
    var ok = true;
    function req(id, msg, test) {
      var el = $(id);
      if (!el) return;
      var field = el.closest(".field");
      if (field) field.classList.remove("has-error");
      var value = el.value.trim();
      var valid = test ? test(value) : !!value;
      if (!valid) {
        ok = false;
        if (field) {
          field.classList.add("has-error");
          var m = field.querySelector(".error-msg");
          if (m) m.textContent = msg;
        }
      }
    }
    if (step === 1) {
      req("ap-amount", "Enter an amount within the product limits", function (v) {
        var p = PRODUCTS[state.product];
        return Number(v) >= p.min && Number(v) <= p.max;
      });
      req("ap-term", "Enter a term within the allowed range", function (v) {
        var p = PRODUCTS[state.product];
        return Number(v) >= p.term[0] && Number(v) <= p.term[1];
      });
    }
    if (step === 2) {
      req("ap-first", "Enter your first name");
      req("ap-last", "Enter your surname");
      req("ap-dob", "Enter your date of birth", function (v) {
        return v && (Date.now() - new Date(v).getTime()) / (365.25 * 864e5) >= 18;
      });
      req("ap-nid", "Enter your national ID");
      req("ap-phone", "Enter a valid phone number", function (v) { return v.replace(/\D/g, "").length >= 9; });
      req("ap-email", "Enter a valid email", function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); });
      req("ap-address", "Enter your residential address");
      req("ap-income", "Enter your monthly income", function (v) { return Number(v) > 0; });
      req("ap-expenses", "Enter your monthly expenses", function (v) { return Number(v) >= 0 && v !== ""; });
      req("ap-nok-name", "Enter next of kin");
      req("ap-nok-phone", "Enter next of kin phone");
    }
    if (step === 5) {
      ["ap-consent-data", "ap-consent-credit", "ap-declare"].forEach(function (id) {
        var el = $(id);
        if (el && !el.checked) {
          ok = false;
          var row = el.closest(".check-row");
          if (row) row.style.color = "var(--danger)";
        }
      });
    }
    return ok;
  }

  function go(step) {
    if (step > state.step && !validateStep(state.step)) {
      UI.toast({ title: "Check the form", message: "Some required fields need attention.", type: "danger" });
      return;
    }
    state.step = Math.max(1, Math.min(step, 5));
    document.querySelectorAll(".app-step").forEach(function (el) {
      el.hidden = Number(el.getAttribute("data-step")) !== state.step;
    });
    var stepperEl = document.querySelector(".app-stepper");
    if (stepperEl) stepperEl.outerHTML = stepper();
    var prev = document.querySelector("[data-step-prev]");
    var next = document.querySelector("[data-step-next]");
    var submit = document.querySelector("[data-step-submit]");
    if (prev) prev.hidden = state.step === 1;
    if (next) next.hidden = state.step === 5;
    if (submit) submit.hidden = state.step !== 5;
    if (state.step === 5) refreshSummary();
    var panel = document.querySelector(".calc-panel");
    if (panel && panel.scrollIntoView) panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function collect() {
    function v(id) { var el = $(id); return el ? el.value.trim() : ""; }
    return {
      product: state.product,
      amount: state.amount,
      term: state.term,
      purpose: v("ap-purpose") + (v("ap-purpose-note") ? " — " + v("ap-purpose-note") : ""),
      applicant: {
        name: v("ap-first") + " " + v("ap-last"), dob: v("ap-dob"), gender: v("ap-gender"),
        nid: v("ap-nid"), phone: v("ap-phone"), email: v("ap-email"), address: v("ap-address"),
        district: v("ap-district"), employment: v("ap-employment"), occupation: v("ap-occupation"),
        employer: v("ap-employer"), income: Number(v("ap-income")), expenses: Number(v("ap-expenses")),
        debts: Number(v("ap-debts")), nextOfKin: { name: v("ap-nok-name"), relationship: v("ap-nok-rel"), phone: v("ap-nok-phone") }
      },
      business: {
        name: v("ap-biz-name"), registration: v("ap-biz-reg"), tin: v("ap-biz-tin"),
        years: v("ap-biz-years"), turnover: Number(v("ap-biz-turnover")), costs: Number(v("ap-biz-costs"))
      },
      bank: { provider: v("ap-bank-name"), branch: v("ap-bank-branch") },
      guarantor: { name: v("ap-g-name"), phone: v("ap-g-phone"), relationship: v("ap-g-rel") },
      documents: Object.keys(state.docs)
    };
  }

  function submitApplication() {
    if (!validateStep(5)) {
      UI.toast({ title: "Consent required", message: "Accept all three declarations before submitting.", type: "danger" });
      return;
    }
    var draft = collect();
    var ref = DATA.reference("APP");
    var app = {
      ref: ref, product: draft.product, amount: draft.amount, term: draft.term,
      purpose: draft.purpose, submitted: new Date().toISOString(),
      status: "pending", stage: 1,
      documents: Object.keys(state.docs).map(function (k) {
        return DOCS.filter(function (d) { return d.id === k; })[0].name;
      }),
      applicant: draft.applicant, business: draft.business, bank: draft.bank, guarantor: draft.guarantor
    };
    DATA.get().applications.unshift(app);
    DATA.save();
    DATA.notify("Application submission", "Application " + ref + " received",
      "Your " + app.product + " application for " + mwk(app.amount) + " was submitted. We will verify your documents within one working day.", "In-app + Email + SMS");
    state.submitted = app;
    render();
    if (window.JCOB_DASH) window.JCOB_DASH.render(false);
    UI.toast({ title: "Application submitted", message: "Reference " + ref + ". Track it under My applications.", type: "success" });
  }

  function bind() {
    var form = $("apply-form");
    if (!form) {
      var again = document.querySelector("[data-app-new]");
      if (again) again.addEventListener("click", function () {
        state.submitted = null;
        state.step = 1;
        state.docs = {};
        render();
        if (window.JCOB_DASH) window.JCOB_DASH.render(false);
      });
      return;
    }

    var product = $("ap-product");
    product.addEventListener("change", function () {
      state.product = product.value;
      var p = PRODUCTS[state.product];
      state.amount = Math.min(Math.max(state.amount, p.min), p.max);
      state.term = Math.min(Math.max(state.term, p.term[0]), p.term[1]);
      $("ap-amount").value = state.amount;
      $("ap-amount").min = p.min;
      $("ap-amount").max = p.max;
      $("ap-term").value = state.term;
      $("ap-term").min = p.term[0];
      $("ap-term").max = p.term[1];
      $("ap-limits").textContent = "Limits " + mwk(p.min) + " – " + mwk(p.max) + " · rate from " + p.rate + "% p.a.";
      refreshSummary();
    });
    $("ap-amount").addEventListener("input", function () {
      state.amount = Number($("ap-amount").value) || 0;
      refreshSummary();
    });
    $("ap-term").addEventListener("input", function () {
      state.term = Number($("ap-term").value) || 1;
      refreshSummary();
    });

    form.querySelectorAll("[data-doc-input]").forEach(function (input) {
      input.addEventListener("change", function () {
        var file = input.files && input.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
          UI.toast({ title: "File too large", message: "Maximum 5 MB per document.", type: "danger" });
          input.value = "";
          return;
        }
        if (!/\.(pdf|jpe?g|png)$/i.test(file.name)) {
          UI.toast({ title: "Unsupported file", message: "Use PDF, JPG or PNG.", type: "danger" });
          input.value = "";
          return;
        }
        state.docs[input.getAttribute("data-doc-input")] = file.name;
        var label = input.closest(".dz");
        label.classList.add("is-done");
        label.querySelector("span.dz-icon").innerHTML = UI.ICONS.success;
        label.querySelector("div span").textContent = file.name;
        var pill = label.querySelector(".pill");
        pill.className = "pill pill--ok";
        pill.textContent = "Uploaded";
        UI.toast({ title: "Document added", message: file.name, type: "success" });
      });
    });

    document.querySelector("[data-step-next]").addEventListener("click", function () { go(state.step + 1); });
    document.querySelector("[data-step-prev]").addEventListener("click", function () { go(state.step - 1); });

    var saveDraft = document.querySelector("[data-save-draft]");
    if (saveDraft) {
      saveDraft.addEventListener("click", function () {
        var draft = collect();
        var id = state.draftId || DATA.uid("DRF");
        state.draftId = id;
        var d = DATA.get();
        d.drafts = d.drafts || [];
        d.drafts = d.drafts.filter(function (x) { return x.id !== id; });
        d.drafts.unshift({ id: id, saved: new Date().toISOString(), step: state.step, data: draft });
        DATA.save();
        UI.toast({ title: "Draft saved", message: "Resume any time from this browser. Ref " + id, type: "success" });
      });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      submitApplication();
    });
  }

  function render() {
    var html = state.scope === "dashboard" ? dashboardShell() : publicShell();
    if (state.scope === "dashboard") {
      var host = document.getElementById("app-content");
      if (host) host.innerHTML = html;
    } else {
      var target = document.getElementById("apply-host");
      if (target) target.innerHTML = html;
    }
    bind();
  }

  window.JCOB_APPLY = {
    PRODUCTS: PRODUCTS,
    panel: function () { state.scope = "dashboard"; return dashboardShell(); },
    mount: function () {
      state.scope = "dashboard";
      state.submitted = null;
      bind();
    },
    initPublic: function () {
      state.scope = "public";
      var host = document.getElementById("apply-host");
      if (!host) return;
      var params = new URLSearchParams(location.search);
      var wanted = (params.get("product") || "").toLowerCase();
      Object.keys(PRODUCTS).forEach(function (k) {
        if (k.toLowerCase() === wanted) {
          state.product = k;
          state.term = PRODUCTS[k].term[0];
        }
      });
      if (params.get("amount")) state.amount = Math.max(Number(params.get("amount")) || 0, 0);
      if (params.get("term")) state.term = Number(params.get("term")) || state.term;
      var p = PRODUCTS[state.product];
      state.amount = Math.min(Math.max(state.amount, p.min), p.max);
      state.term = Math.min(Math.max(state.term, p.term[0]), p.term[1]);
      render();
    }
  };

  document.addEventListener("DOMContentLoaded", function () {
    if (document.body.getAttribute("data-page") === "apply") window.JCOB_APPLY.initPublic();
  });
})();
