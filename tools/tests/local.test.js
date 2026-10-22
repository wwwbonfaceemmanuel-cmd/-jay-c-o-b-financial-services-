/* Local behaviour with no backend: the public site, the calculator, the
   dashboard, the live desk and the single-file bundle must all work from
   browser storage. Records used here are written by the test itself (see
   fixtures.js) — the application ships no sample data. */
"use strict";

const { reporter, makeDom, ready, sleep } = require("./lib");
const { customerDoc } = require("./fixtures");

(async () => {
  const t = reporter("[local mode — public site]");
  {
    const { dom, errors } = makeDom("index.html", { local: true });
    await ready(dom, 600);
    const w = dom.window;
    t.eq("cloud disabled in local mode", w.JCOB_CLOUD.enabled, false);
    t.eq("store reports local", w.JCOB_SITE.remote.state, "local");
    t.eq("catalogue available", w.JCOB_SITE.products.length, 11);
    t.ok("hero renders", /JAY C O B/.test(w.document.body.textContent));
    t.eq("no demo switch in the build", typeof w.JCOB_DEMO, "undefined");
    t.eq("no script errors", errors.length, 0, errors.slice(0, 2).join(" | "));
    w.close();
  }

  console.log("\n[local mode — calculator]");
  {
    const { dom, errors } = makeDom("calculator.html", { local: true });
    await ready(dom);
    const w = dom.window;
    const d = w.document;

    /* the published worked example: 100,000 at 25% per month, flat, 1 month */
    const basis = d.getElementById("calc-rate-basis");
    basis.value = "monthly";
    basis.dispatchEvent(new w.Event("change", { bubbles: true }));
    d.getElementById("calc-amount").value = "100000";
    d.getElementById("calc-rate").value = "25";
    d.getElementById("calc-term").value = "1";
    const fee = d.getElementById("calc-fee");
    if (fee) fee.value = "0";
    const flat = d.querySelector('input[name="calc-method"][value="flat"]');
    flat.checked = true;
    flat.dispatchEvent(new w.Event("change", { bubbles: true }));
    ["calc-amount", "calc-rate", "calc-term", "calc-fee"].forEach((id) => {
      d.getElementById(id).dispatchEvent(new w.Event("change", { bubbles: true }));
    });
    await sleep(350);

    const text = d.body.textContent.replace(/\s+/g, " ");
    t.ok("interest 25,000", /25,000/.test(text));
    t.ok("repayment 125,000", /125,000/.test(text));
    t.ok("dated instalment 22 Nov 2026", /22 Nov 2026/.test(text));
    t.eq("no script errors", errors.length, 0, errors.slice(0, 2).join(" | "));
    w.close();
  }

  console.log("\n[local mode — dashboard with a stored record]");
  {
    const doc = customerDoc();
    const { dom, errors } = makeDom("dashboard.html", {
      local: true,
      hash: "#applications",
      seed: {
        jcob_app_v2: JSON.stringify(doc),
        jcob_session_v1: JSON.stringify({ authenticated: true, name: doc.profile.fullName, email: doc.profile.email })
      }
    });
    await ready(dom, 700);
    const w = dom.window;
    t.ok("application listed", /APP-2026-0412/.test(w.document.body.textContent));
    t.ok("status shown", /Approved/i.test(w.document.body.textContent));
    t.ok("customer name in the header", /Test Borrower/.test(w.document.body.textContent));
    t.eq("no script errors", errors.length, 0, errors.slice(0, 2).join(" | "));
    w.close();
  }

  console.log("\n[local mode — live desk and bundle]");
  {
    const { dom } = makeDom("live.html", { local: true });
    await ready(dom, 500);
    const w = dom.window;
    t.ok("stream populated", w.document.querySelectorAll("[data-live-stream] .live-blog").length > 2);
    t.ok("about cards present", /About Us|about/i.test(w.document.body.textContent));
    w.close();
  }
  {
    const { dom, errors } = makeDom("single/index.html", { local: true });
    await ready(dom);
    const w = dom.window;
    t.ok("bundle boots", !!(w.JCOB_APP || w.JCOB_SITE));
    t.eq("bundle marked single", w.document.body.getAttribute("data-single"), "true");
    const relevant = errors.filter((e) => !/Could not load link/i.test(e));
    t.eq("no script errors", relevant.length, 0, relevant.slice(0, 2).join(" | "));
    w.close();
  }

  process.exit(t.done() ? 0 : 1);
})();
