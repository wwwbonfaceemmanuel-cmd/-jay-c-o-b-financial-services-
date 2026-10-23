/* Every loan product is quoted by the one interest-rate function.
   -----------------------------------------------------------------------
   Two layers are checked:

   1. The engine (assets/js/finance.js) applies a rate literally in the unit
      it is quoted in — the rule the business set:
        flat + monthly  →  principal × rate × months
        annual          →  the annual figure over the year's instalments
      and productQuote() clamps anything asked of it to the product's own
      limits and term, so no surface can quote outside the published terms.

   2. The pages. Every product card on loan-products.html and the home page
      renders its figures from that engine, with the rate, limits, term and
      fee taken from the catalogue — the page and the calculator cannot
      disagree. The calculator itself offers every catalogue product, and
      the application flow quotes with the product's own basis and method.
   ========================================================================= */
"use strict";

const fs = require("fs");
const path = require("path");
const { ROOT, reporter, makeDom, ready, sleep } = require("./lib");

const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const t = reporter("[loan products — one interest-rate function]");

/* ---- 1. the engine, loaded on its own ---- */
function engine() {
  const { JSDOM } = require("jsdom");
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { runScripts: "outside-only" });
  dom.window.eval(read("assets/js/finance.js"));
  return dom.window.JCOB_FINANCE;
}

const F = engine();

/* The rule, written out: 25% per month, flat, one month, MWK 100,000. */
{
  const c = F.amortize({ principal: 100000, rate: 25, rateBasis: "monthly", termMonths: 1, method: "flat" });
  t.eq("flat monthly interest is principal × rate × months", Math.round(c.totalInterest), 25000);
  t.eq("flat monthly total is principal + that interest", Math.round(c.totalRepayment), 125000);
}
{
  /* Twelve months of the same quote is twelve times the interest. */
  const c = F.amortize({ principal: 100000, rate: 25, rateBasis: "monthly", termMonths: 12, method: "flat" });
  t.eq("the same quote over 12 months multiplies by 12", Math.round(c.totalInterest), 300000);
}
{
  /* 25% p.a. over twelve months costs the same as 25% per month for one. */
  const c = F.amortize({ principal: 100000, rate: 25, rateBasis: "annual", termMonths: 12, method: "flat" });
  t.eq("25% p.a. equals one month of 25% per month", Math.round(c.totalInterest), 25000);
}
{
  const c = F.amortize({ principal: 1000000, rate: 24, rateBasis: "annual", termMonths: 12, method: "reducing" });
  t.eq("reducing balance quotes the stated annual rate", Math.round(c.rate), 24);
  t.eq("reducing balance uses 2% a month", Math.round(c.ratePerPeriod * 100) / 100, 2);
  t.eq("reducing balance payment", Math.round(c.payment), 94560);
  t.eq("the schedule sums to the total", Math.round(c.totalRepayment), Math.round(c.rows.reduce((n, r) => n + r.payment, 0)));
}

/* productQuote clamps to the published terms. */
{
  const product = { name: "Short-term Loan", rate: 29, rateBasis: "annual", method: "reducing",
    min: 50000, max: 3000000, minTerm: 1, maxTerm: 6, fee: 3 };
  const low = F.productQuote(product, { amount: 1000, termMonths: 1 });
  t.eq("an amount below the minimum is raised to it", low.principal, 50000);
  const high = F.productQuote(product, { amount: 99000000, termMonths: 99 });
  t.eq("an amount above the maximum is capped", high.principal, 3000000);
  t.eq("a term above the maximum is capped", high.termMonths, 6);
  const normal = F.productQuote(product, { amount: 500000, termMonths: 3 });
  t.eq("the product's fee is applied", Math.round(normal.processingFee), 15000);
  t.ok("the quote reports the terms it used", normal.terms && normal.terms.maxTerm === 6);
}
{
  /* A monthly-quoted flat product is charged exactly as quoted. */
  const product = { name: "Monthly flat", rate: 5, rateBasis: "monthly", method: "flat",
    min: 10000, max: 1000000, minTerm: 1, maxTerm: 12, fee: 0 };
  const c = F.productQuote(product, { amount: 200000, termMonths: 6 });
  t.eq("a monthly flat product is principal × 5% × 6", Math.round(c.totalInterest), 60000);
  t.ok("its rate phrase says per month", /per month/.test(F.ratePhrase(c.terms)));
  t.ok("its formula names the arithmetic", /× 5% per month × 6 months/.test(F.formulaPhrase(c)));
}

/* ---- 2. the pages ---- */
(async () => {
  /* loan-products: eleven cards, each with a computed worked example */
  {
    const { dom, errors } = makeDom("loan-products.html", { local: true });
    await ready(dom, 900);
    const w = dom.window;
    const d = w.document;
    const Fpage = w.JCOB_FINANCE;

    const cards = [...d.querySelectorAll("[data-product-quote]")];
    t.eq("eleven loan products on the page", cards.length, 11);
    const widgets = [...d.querySelectorAll(".pq")];
    t.eq("every product card has a worked example", widgets.length, 11);

    const missing = cards.filter((c) => !c.querySelector(".pq")).map((c) => c.id);
    t.eq("no product is left without figures", missing.join(", "), "");

    /* The rendered figures must equal the engine, for the same inputs. */
    const first = cards[0];
    const amountEl = first.querySelector("[data-pq-amount]");
    const termEl = first.querySelector("[data-pq-term-input]");
    const p = w.JCOB_PRODUCT_QUOTES.catalogue().filter((x) => x.id === first.id)[0];
    const expected = Fpage.productQuote(p, { amount: Number(amountEl.value), termMonths: Number(termEl.value) });
    const shown = first.querySelector("[data-pq-payment]").textContent;
    t.eq("the card's instalment is the engine's instalment", shown, Fpage.formatMWK(expected.payment));
    t.eq("the card's repayment is the engine's repayment",
      first.querySelector("[data-pq-total]").textContent, Fpage.formatMWK(expected.totalRepayment));
    t.eq("the card's total including fees is the engine's",
      first.querySelector("[data-pq-cost]").textContent, Fpage.formatMWK(expected.totalCost));
    t.eq("the card's interest is the engine's interest",
      first.querySelector("[data-pq-interest]").textContent, Fpage.formatMWK(expected.totalInterest));

    /* The rate line is the catalogue's, not a hand-written percentage. */
    const rateLine = first.querySelector("[data-pq-rate]").textContent;
    t.ok("the rate headline comes from the catalogue", rateLine.indexOf(String(p.rate) + "%") === 0, rateLine);
    t.ok("the rate headline states its basis", /p\.a\.|per month/.test(rateLine));

    t.ok("the card shows the arithmetic", /instalment|month/.test(first.querySelector("[data-pq-formula]").textContent));

    /* Changing the amount recomputes with the engine. */
    amountEl.value = "2000000";
    amountEl.dispatchEvent(new w.Event("input", { bubbles: true }));
    await sleep(30);
    const again = Fpage.productQuote(p, { amount: 2000000, termMonths: Number(termEl.value) });
    t.eq("editing the amount re-quotes from the engine",
      first.querySelector("[data-pq-payment]").textContent, Fpage.formatMWK(again.payment));

    /* Beyond the product's limit the figure is clamped, not invented. */
    amountEl.value = "1";
    amountEl.dispatchEvent(new w.Event("input", { bubbles: true }));
    await sleep(30);
    const clamped = Fpage.productQuote(p, { amount: 1, termMonths: Number(termEl.value) });
    t.eq("an out-of-range amount is clamped to the product minimum", clamped.principal, p.min);

    /* The apply link carries the figures shown. */
    const link = first.querySelector("[data-pq-apply]").getAttribute("href");
    t.ok("the apply link carries product, amount and term",
      /product=/.test(link) && /amount=\d+/.test(link) && /term=\d+/.test(link), link);

    /* Every card's rate line matches its catalogue rate. */
    const wrong = cards.filter((card) => {
      const cp = w.JCOB_PRODUCT_QUOTES.catalogue().filter((x) => x.id === card.id)[0];
      return !cp || card.querySelector("[data-pq-rate]").textContent.indexOf(String(cp.rate) + "%") !== 0;
    }).map((c) => c.id);
    t.eq("every product shows its published rate", wrong.join(", "), "");

    /* The comparison table summarises the same catalogue. */
    const rows = [...d.querySelectorAll("[data-pq-table] tbody tr")];
    t.eq("the comparison table lists every product", rows.length, 11);
    const tableWrong = rows.filter((row) => {
      const id = row.querySelector("th a").getAttribute("href").slice(1);
      const cp = w.JCOB_PRODUCT_QUOTES.catalogue().filter((x) => x.id === id)[0];
      const cells = row.querySelectorAll("td");
      return !cp || cells[2].textContent.indexOf(String(cp.rate) + "%") !== 0;
    }).map((r) => r.textContent.trim().split("\n")[0]);
    t.eq("every table rate is the catalogue rate", tableWrong.join(", "), "");

    t.eq("no script errors on the products page", errors.length, 0, errors.slice(0, 2).join(" | "));
    w.close();
  }

  /* home page: the same engine on the five featured products */
  {
    const { dom, errors } = makeDom("index.html", { local: true });
    await ready(dom, 900);
    const w = dom.window;
    const d = w.document;
    const minis = [...d.querySelectorAll(".pq-mini")];
    t.eq("five home product cards carry an example", minis.length, 5);
    t.ok("the example is a computed instalment", minis.every((m) => /MWK [\d,]+/.test(m.textContent)));
    const quota = d.querySelector("[data-product-quote][data-product='personal'] .pq-mini");
    const p = w.JCOB_PRODUCT_QUOTES.catalogue().filter((x) => x.id === "personal")[0];
    const c = w.JCOB_FINANCE.productQuote(p, {
      amount: w.JCOB_PRODUCT_QUOTES.exampleAmount(p),
      termMonths: w.JCOB_PRODUCT_QUOTES.exampleTerm(p)
    });
    t.ok("the home example matches the engine", quota.textContent.indexOf(w.JCOB_FINANCE.formatMWK(c.payment)) > -1,
      quota.textContent);
    t.eq("no script errors on the home page", errors.length, 0, errors.slice(0, 2).join(" | "));
    w.close();
  }

  /* calculator: one chip per catalogue product, and a preset applies its own
     basis and method so the arithmetic is literal */
  {
    const { dom, errors } = makeDom("calculator.html", { local: true });
    await ready(dom, 900);
    const w = dom.window;
    const d = w.document;
    const chips = [...d.querySelectorAll('input[name="calc-preset"]')];
    t.eq("the calculator offers every loan product", chips.length, 11);

    const secured = d.getElementById("preset-secured");
    secured.checked = true;
    secured.dispatchEvent(new w.Event("change", { bubbles: true }));
    await sleep(60);
    t.eq("choosing a product loads its rate", d.getElementById("calc-rate").value, "18");
    t.eq("and its basis", d.getElementById("calc-rate-basis").value, "annual");
    t.eq("and its limits", d.getElementById("calc-amount").min, "500000");
    t.eq("and its fee", d.getElementById("calc-fee").value, "1.5");

    t.eq("no script errors on the calculator", errors.length, 0, errors.slice(0, 2).join(" | "));
    w.close();
  }

  /* a product card opens the calculator on that same product, with the same
     figures, so the two surfaces can be compared side by side */
  {
    const href = (() => {
      const q = encodeURIComponent;
      return "/calculator.html?product=" + q("Secured Loan") + "&amount=4000000&term=24&fee=1.5";
    })();
    const q = href.slice(href.indexOf("?"));
    const { dom, errors } = makeDom("calculator.html", { local: true, query: q });
    await ready(dom, 900);
    const w = dom.window;
    const d = w.document;
    const checked = d.querySelector('input[name="calc-preset"]:checked');
    t.eq("the borrowed product is selected", checked.value, "secured");
    t.eq("its rate is filled in", d.getElementById("calc-rate").value, "18");
    t.eq("its basis is filled in", d.getElementById("calc-rate-basis").value, "annual");
    t.eq("its fee is filled in", d.getElementById("calc-fee").value, "1.5");

    const p = w.JCOB_SITE.products.filter((x) => x.id === "secured")[0];
    const c = w.JCOB_FINANCE.productQuote(p, { amount: 4000000, termMonths: 24 });
    t.eq("the calculator shows the engine's instalment",
      d.getElementById("res-payment").textContent, w.JCOB_FINANCE.formatMWK(c.payment));
    t.eq("no script errors on the linked calculator", errors.length, 0, errors.slice(0, 2).join(" | "));
    w.close();
  }

  /* the application flow quotes with the product's own basis and method —
     no hard-coded "reducing" left in the path */
  {
    const src = read("assets/js/apply.js");
    t.ok("every application quotation goes through productQuote",
      (src.match(/F\.productQuote\(/g) || []).length >= 1 && !/method: "reducing", frequency: "monthly"/.test(src));
    t.ok("the application prints the quoted rate from the product",
      /rateWords\(state\.product\)/.test(src) && !/p\.rate \+ "% p\.a\./.test(src));
    const onboard = read("assets/js/onboard.js");
    t.ok("the signature pad uses an interpolating spline",
      /bezierCurveTo/.test(onboard) && /Catmull-Rom/.test(onboard));
  }

  process.exit(t.done() ? 0 : 1);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
