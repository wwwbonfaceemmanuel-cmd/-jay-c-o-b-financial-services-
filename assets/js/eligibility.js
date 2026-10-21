/* =====================================================================
   Eligibility questionnaire — preliminary result with criteria breakdown
   ===================================================================== */
(function () {
  "use strict";

  var form = document.getElementById("elig-form");
  if (!form) return;
  var F = window.JCOB_FINANCE;

  var $ = function (id) { return document.getElementById(id); };
  var CRITERIA = [
    { key: "age", label: "Age", weight: 12 },
    { key: "residency", label: "Residency", weight: 12 },
    { key: "employment", label: "Employment or business", weight: 16 },
    { key: "income", label: "Affordable income", weight: 20 },
    { key: "business", label: "Business track record", weight: 10 },
    { key: "id", label: "Identification", weight: 10 },
    { key: "credit", label: "Credit conduct", weight: 12 },
    { key: "docs", label: "Supporting documents", weight: 8 }
  ];

  /* value -> fraction of the weight earned */
  var SCORES = {
    age: { "18-24": 0.7, "25-60": 1, "over-60": 0.6, "under-18": 0 },
    residency: { citizen: 1, permit: 0.8, nonresident: 0 },
    employment: { employed: 1, self: 0.9, farmer: 0.85, contractor: 0.8, unemployed: 0 },
    income: { "under-100": 0.15, "100-300": 0.55, "300-800": 0.85, "800-1500": 1, "1500-plus": 1 },
    business: { na: 1, "under-6": 0.25, "6-12": 0.7, "12-plus": 1 },
    id: { national: 1, passport: 1, licence: 0.75, none: 0 },
    credit: { none: 1, cleared: 0.85, "late-30": 0.45, "over-30": 0.1 },
    docs: { all: 1, two: 0.7, one: 0.4, none: 0 }
  };

  var NOTES = {
    age: "You must be 18 or older. Applicants over 60 are considered case by case with proof of retirement income.",
    residency: "You must live in Malawi and be able to show a verifiable residential address.",
    employment: "Stable income from employment, self-employment, farming or contracting is required.",
    income: "We assess disposable income after essential expenses. Higher verified income improves your result.",
    business: "Business loans generally need at least 6 months of trading, with records of sales and costs.",
    id: "A valid national ID, passport or driving licence is required. Certified copies are accepted at application.",
    credit: "Existing arrears reduce affordability. Clear arrears before applying, or tell us and we will discuss options.",
    docs: "You will need identification, proof of income and proof of residence. Bank or business records help."
  };

  function selected(name) {
    var el = form.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : "";
  }

  function evaluate() {
    var total = 0;
    var rows = CRITERIA.map(function (c) {
      var value = selected(c.key);
      var fraction = value && SCORES[c.key][value] != null ? SCORES[c.key][value] : 0;
      var points = fraction * c.weight;
      total += points;
      var state = fraction >= 0.85 ? "ok" : fraction >= 0.5 ? "warn" : "fail";
      var stateLabel = state === "ok" ? "Meets criteria" : state === "warn" ? "Considered with conditions" : "Needs attention";
      return { key: c.key, label: c.label, points: points, weight: c.weight, state: state, stateLabel: stateLabel };
    });
    return { score: Math.round(total), rows: rows };
  }

  function render(result) {
    var score = result.score;
    var verdict = score >= 75 ? "Strong" : score >= 50 ? "Possible" : "Needs work";
    var tone = verdict === "Strong" ? "ok" : verdict === "Possible" ? "warn" : "danger";
    var summary = verdict === "Strong"
      ? "You look likely to qualify. Complete the application and we will confirm with a full assessment."
      : verdict === "Possible"
        ? "You may qualify, but one or more areas need attention. Improving them before applying will strengthen your case."
        : "On these answers a loan is unlikely to be affordable right now. Address the points below, or call us to discuss alternatives.";

    $("elig-score-value").textContent = score;
    $("elig-meter").style.width = score + "%";
    var v = $("elig-verdict");
    v.textContent = verdict;
    v.className = "pill pill--" + tone;
    $("elig-summary").textContent = summary;

    $("elig-criteria").innerHTML = result.rows.map(function (r) {
      return '<li class="criteria-item criteria-item--' + r.state + '">' +
        '<span class="criteria-label">' + r.label + "</span>" +
        '<span class="pill pill--' + (r.state === "ok" ? "ok" : r.state === "warn" ? "warn" : "danger") + '">' + r.stateLabel + "</span>" +
        '<p class="criteria-note">' + NOTES[r.key] + "</p></li>";
    }).join("");

    $("elig-apply").hidden = score < 50;
    $("elig-result").classList.add("is-visible");
    var result = $("elig-result");
    if (result && result.scrollIntoView) result.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var missing = CRITERIA.filter(function (c) { return !selected(c.key); });
    var status = $("elig-status");
    if (missing.length) {
      status.className = "form-status is-visible form-status--error";
      status.textContent = "Please answer all " + CRITERIA.length + " questions. Missing: " + missing.map(function (m) { return m.label; }).join(", ") + ".";
      return;
    }
    status.className = "form-status";
    status.textContent = "";
    render(evaluate());
  });

  $("elig-reset").addEventListener("click", function () {
    form.reset();
    $("elig-result").classList.remove("is-visible");
    $("elig-score-value").textContent = "—";
    $("elig-meter").style.width = "0%";
    $("elig-verdict").textContent = "Not checked";
    $("elig-verdict").className = "pill pill--neutral";
    $("elig-summary").textContent = "Answer the questions to see a preliminary result.";
    $("elig-criteria").innerHTML = "";
    $("elig-status").className = "form-status";
    $("elig-status").textContent = "";
  });

  if (F) {
    var note = $("elig-note-limit");
    if (note) note.textContent = "Personal loans to " + F.formatMWK(15000000) + " · business loans to " + F.formatMWK(50000000);
  }
})();
