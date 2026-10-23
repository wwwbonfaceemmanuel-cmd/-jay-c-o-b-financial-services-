/* =====================================================================
   JAY C O B FINANCIAL SERVICES — loan product quotes
   ---------------------------------------------------------------------
   Every loan product on the site is quoted here, by the same engine the
   calculator uses (JCOB_FINANCE.amortize). No figure on a product card is
   hand-written any more.

   The rate is applied in the unit the product is published in:
     annual  → the figure is per year; 24% p.a. is 2% a month on the
               falling balance
     monthly → the figure is per month, used exactly as published
     flat    → principal × rate × months, exactly as published

   The card's rate line, limits, term, processing fee and the worked
   example all come from the catalogue (Supabase site_docs → JCOB_SITE),
   so the products page, the application flow and the calculator cannot
   quote different numbers for the same product.

   Markup hooks
     [data-product-quote]      a card that gets the full worked example
     [data-product]            the catalogue id, if it differs from the id
     [data-pq]                 where to mount the example (optional)
     [data-pq-rate]            the rate headline, filled from the catalogue
     [data-pq-limits]          amount range
     [data-pq-term]            term range
     [data-pq-fee]             processing fee
   ===================================================================== */
(function () {
  "use strict";

  var F = window.JCOB_FINANCE;
  if (!F) return;

  /* Seeded catalogue — mirrors assets/js/site-store.js so the page still
     quotes correctly on a cold start. The live store always wins. */
  var FALLBACK = [
    { id: "personal", name: "Personal Loan", rate: 2, rateBasis: "monthly", method: "reducing", min: 100000, max: 15000000, minTerm: 1, maxTerm: 48, defaultTerm: 1, fee: 2 },
    { id: "business", name: "Business Loan", rate: 22, rateBasis: "annual", method: "reducing", min: 500000, max: 50000000, minTerm: 12, maxTerm: 60, fee: 2.5 },
    { id: "emergency", name: "Emergency Loan", rate: 28, rateBasis: "annual", method: "reducing", min: 50000, max: 2000000, minTerm: 3, maxTerm: 12, fee: 2 },
    { id: "salary", name: "Salary-based Loan", rate: 23, rateBasis: "annual", method: "reducing", min: 100000, max: 10000000, minTerm: 6, maxTerm: 36, fee: 2 },
    { id: "employee", name: "Employee Loan", rate: 21, rateBasis: "annual", method: "reducing", min: 100000, max: 8000000, minTerm: 6, maxTerm: 36, fee: 1.5 },
    { id: "small-business", name: "Small-business Loan", rate: 23, rateBasis: "annual", method: "reducing", min: 250000, max: 20000000, minTerm: 6, maxTerm: 48, fee: 2 },
    { id: "agricultural", name: "Agricultural Loan", rate: 20, rateBasis: "annual", method: "reducing", min: 200000, max: 25000000, minTerm: 6, maxTerm: 36, fee: 2 },
    { id: "short-term", name: "Short-term Loan", rate: 29, rateBasis: "annual", method: "reducing", min: 50000, max: 3000000, minTerm: 1, maxTerm: 6, fee: 3 },
    { id: "long-term", name: "Long-term Loan", rate: 21, rateBasis: "annual", method: "reducing", min: 1000000, max: 60000000, minTerm: 24, maxTerm: 84, fee: 2.5 },
    { id: "secured", name: "Secured Loan", rate: 18, rateBasis: "annual", method: "reducing", min: 500000, max: 80000000, minTerm: 12, maxTerm: 84, fee: 1.5 },
    { id: "unsecured", name: "Unsecured Loan", rate: 26, rateBasis: "annual", method: "reducing", min: 100000, max: 10000000, minTerm: 6, maxTerm: 36, fee: 2.5 }
  ];

  function catalogue() {
    var store = window.JCOB_SITE;
    var list = store && store.products && store.products.length ? store.products : FALLBACK;
    return list.filter(function (p) { return p && p.active !== false; });
  }

  function slug(value) {
    return String(value == null ? "" : value)
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function findProduct(box) {
    var list = catalogue();
    var key = box.getAttribute("data-product") || box.id || "";
    var want = slug(key);
    var hit = null;
    if (want) {
      hit = list.filter(function (p) {
        return slug(p.id) === want || slug(p.name) === want;
      })[0] || null;
    }
    if (hit) return hit;
    var heading = box.querySelector("h2, h3");
    var name = slug(heading ? heading.textContent : "");
    if (!name) return null;
    return list.filter(function (p) { return slug(p.name) === name; })[0] || null;
  }

  function mwk(v) { return F.formatMWK(v); }
  function trim(n) {
    var s = (Number(n) || 0).toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
    return s;
  }

  /* A round, sensible example amount: about eight minimum loans, capped at
     MWK 10,000,000 so the example stays readable for the large products. */
  function exampleAmount(p) {
    var target = Math.max(p.min * 8, p.min);
    var step = target >= 10000000 ? 1000000 : target >= 1000000 ? 500000 : target >= 100000 ? 50000 : 10000;
    var rounded = Math.round(target / step) * step;
    return Math.min(Math.max(rounded, p.min), Math.min(p.max, 10000000));
  }

  /* A product can publish the term its example should open on. The personal
     loan is quoted monthly and opens on one month, so the card shows a
     one-month cost as the default reading. */
  function exampleTerm(p) {
    var want = Number(p.defaultTerm) > 0 ? Number(p.defaultTerm) : 12;
    return Math.min(Math.max(want, p.minTerm), p.maxTerm);
  }

  function quote(p, amount, termMonths) {
    return F.productQuote(p, { amount: amount, termMonths: termMonths });
  }

  function fillStatic(box, p, c) {
    var rate = box.querySelector("[data-pq-rate]");
    if (rate) {
      rate.innerHTML = trim(c.rateInput) + "% <small>" +
        (c.rateBasis === "monthly" ? "per month" : "p.a.") + " " +
        (c.method === "flat" ? "flat" : "reducing") + "</small>";
    }
    var limits = box.querySelector("[data-pq-limits]");
    if (limits) limits.textContent = mwk(p.min) + " – " + mwk(p.max).replace(/^MWK\s/, "");
    var term = box.querySelector("[data-pq-term]");
    if (term) term.textContent = p.minTerm + " – " + p.maxTerm + " months · monthly";
    var fee = box.querySelector("[data-pq-fee]");
    if (fee) fee.textContent = trim(p.fee) + "% of principal";
  }

  /* The comparison table is a summary of the same catalogue: its limits,
     term, rate and fee are written from the catalogue, never typed in. */
  function compact(v) {
    if (v >= 1000000) {
      var m = v / 1000000;
      return (Math.round(m * 10) / 10).toString().replace(/\.0$/, "") + "m";
    }
    if (v >= 1000) return Math.round(v / 1000) + "k";
    return String(v);
  }

  function fillTable() {
    var table = document.querySelector("[data-pq-table]") ||
      document.querySelector(".compare-table");
    if (!table) return;
    [].slice.call(table.querySelectorAll("tbody tr")).forEach(function (row) {
      var link = row.querySelector("th a[href^='#']");
      if (!link) return;
      var id = link.getAttribute("href").slice(1);
      var p = catalogue().filter(function (x) { return slug(x.id) === slug(id); })[0];
      if (!p) return;
      var cells = row.querySelectorAll("td");
      if (cells.length < 4) return;
      cells[0].textContent = compact(p.min) + " – " + compact(p.max);
      cells[1].textContent = p.minTerm + "–" + p.maxTerm + " mo";
      cells[2].textContent = trim(p.rate) + "% " + (p.rateBasis === "monthly" ? "/mo" : "p.a.");
      cells[3].textContent = trim(p.fee) + "%";
    });
  }

  function widgetHTML() {
    return '<div class="pq">' +
        '<div class="pq-head">' +
          '<span class="pq-tag">Worked example</span>' +
          '<span class="pq-quote" data-pq-quote></span>' +
        '</div>' +
        '<div class="pq-fields">' +
          '<label class="pq-f"><span>Amount (MWK)</span>' +
            '<input type="number" data-pq-amount inputmode="numeric" min="0" step="1000" aria-label="Example loan amount in MWK"></label>' +
          '<label class="pq-f"><span>Term (months)</span>' +
            '<input type="number" data-pq-term-input inputmode="numeric" min="1" step="1" aria-label="Example term in months"></label>' +
        '</div>' +
        '<div class="pq-body">' +
          '<div class="pq-figure">' +
            '<span class="pq-label">Instalment</span>' +
            '<strong data-pq-payment></strong>' +
            '<small data-pq-per></small>' +
          '</div>' +
          '<dl class="pq-rows">' +
            '<div><dt>Total interest</dt><dd data-pq-interest></dd></div>' +
            '<div><dt>Processing fee</dt><dd data-pq-fee-out></dd></div>' +
            '<div><dt>Total repayment</dt><dd data-pq-total></dd></div>' +
            '<div><dt>Total including fees</dt><dd data-pq-cost></dd></div>' +
            '<div><dt>Indicative APR</dt><dd data-pq-apr></dd></div>' +
          '</dl>' +
        '</div>' +
        '<p class="pq-formula" data-pq-formula></p>' +
        '<p class="pq-links">' +
          '<a class="pq-link pq-link--solid" data-pq-apply>Apply with these figures</a>' +
          '<a class="pq-link" data-pq-calc>Open in the calculator</a>' +
        '</p>' +
      '</div>';
  }

  function wire(box, p) {
    var mount = box.querySelector("[data-pq]");
    if (!mount) {
      mount = document.createElement("div");
      mount.setAttribute("data-pq", "");
      box.appendChild(mount);
    }
    mount.innerHTML = widgetHTML();

    var amountEl = mount.querySelector("[data-pq-amount]");
    var termEl = mount.querySelector("[data-pq-term-input]");
    var start = { amount: exampleAmount(p), term: exampleTerm(p) };
    amountEl.value = String(start.amount);
    termEl.value = String(start.term);
    amountEl.min = String(p.min);
    amountEl.max = String(p.max);
    termEl.min = String(p.minTerm);
    termEl.max = String(p.maxTerm);

    function update() {
      var c = quote(p, Number(amountEl.value) || start.amount, Number(termEl.value) || start.term);
      var t = c.terms;
      /* keep the fields honest: show the clamped figures the engine used */
      start.amount = t.amount;
      start.term = t.termMonths;

      var payment = mount.querySelector("[data-pq-payment]");
      payment.textContent = mwk(c.payment);
      var per = mount.querySelector("[data-pq-per]");
      per.textContent = "per " + (c.frequency === "fortnightly" ? "fortnight" : "month") +
        " · " + c.periods + (c.periods === 1 ? " instalment" : " instalments") +
        " · " + (t.method === "flat" ? "flat rate" : "reducing balance");
      mount.querySelector("[data-pq-interest]").textContent = mwk(c.totalInterest);
      mount.querySelector("[data-pq-fee-out]").textContent = mwk(c.processingFee);
      mount.querySelector("[data-pq-total]").textContent = mwk(c.totalRepayment);
      mount.querySelector("[data-pq-cost]").textContent = mwk(c.totalCost);
      mount.querySelector("[data-pq-apr]").textContent = c.apr.toFixed(1) + "%";
      mount.querySelector("[data-pq-quote]").textContent = t.rateBasis === "monthly"
        ? "= " + trim(c.rate) + "% p.a. equivalent"
        : "= " + trim(c.monthlyRate) + "% per month";
      mount.querySelector("[data-pq-formula]").textContent = F.formulaPhrase(c);

      var applyLink = mount.querySelector("[data-pq-apply]");
      applyLink.href = "apply.html?product=" + encodeURIComponent(p.name) +
        "&amount=" + Math.round(t.amount) + "&term=" + t.termMonths;
      var calcLink = mount.querySelector("[data-pq-calc]");
      calcLink.href = "calculator.html?product=" + encodeURIComponent(p.name) +
        "&amount=" + Math.round(t.amount) + "&term=" + t.termMonths +
        "&fee=" + encodeURIComponent(t.fee);
    }

    function commit() {
      var c = quote(p, Number(amountEl.value) || start.amount, Number(termEl.value) || start.term);
      amountEl.value = String(c.terms.amount);
      termEl.value = String(c.terms.termMonths);
      update();
    }

    ["input", "change"].forEach(function (ev) {
      amountEl.addEventListener(ev, update);
      termEl.addEventListener(ev, update);
    });
    amountEl.addEventListener("blur", commit);
    termEl.addEventListener("blur", commit);

    update();
    return mount;
  }

  function mini(p) {
    var c = quote(p, exampleAmount(p), exampleTerm(p));
    var t = c.terms;
    return '<p class="pq-mini">Example: ' + mwk(t.amount) + " over " + t.termMonths +
      " months → <b>" + mwk(c.payment) + "</b> a month</p>";
  }

  /* A card is rebuilt only when its catalogue terms actually change, so a
     late catalogue load (Supabase answering after first paint) never wipes
     figures the customer is already adjusting. */
  function termsKey(p) {
    return [p.id, p.rate, p.rateBasis, p.method, p.min, p.max, p.minTerm, p.maxTerm, p.fee].join("|");
  }

  function init() {
    fillTable();
    var cards = [].slice.call(document.querySelectorAll("[data-product-quote]"));
    cards.forEach(function (box) {
      var p = findProduct(box);
      if (!p) return;
      var key = termsKey(p);
      if (box.getAttribute("data-pq-built") === key) return;
      box.setAttribute("data-pq-built", key);
      var c = quote(p, exampleAmount(p), exampleTerm(p));
      fillStatic(box, p, c);
      if (box.hasAttribute("data-product-mini")) {
        var existing = box.querySelector(".pq-mini");
        if (existing) {
          existing.outerHTML = mini(p);
        } else {
          var line = document.createElement("div");
          line.innerHTML = mini(p);
          if (line.firstChild) box.appendChild(line.firstChild);
        }
        return;
      }
      wire(box, p);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
  /* the catalogue may arrive from Supabase after first paint — and it may
     arrive after this script has already run, so subscribe as well as
     listen for the event */
  document.addEventListener("jcob:site-updated", init);
  document.addEventListener("jcob:products-updated", init);
  if (window.JCOB_SITE) {
    if (window.JCOB_SITE.subscribe) window.JCOB_SITE.subscribe(init);
    if (window.JCOB_SITE.ready && window.JCOB_SITE.ready.then) window.JCOB_SITE.ready.then(init).catch(function () {});
  }

  window.JCOB_PRODUCT_QUOTES = {
    catalogue: catalogue,
    quote: quote,
    exampleAmount: exampleAmount,
    exampleTerm: exampleTerm,
    refresh: init
  };
})();
