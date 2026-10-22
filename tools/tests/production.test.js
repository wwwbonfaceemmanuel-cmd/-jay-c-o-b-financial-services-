/* Production behaviour: an installation with no demonstration data.
   The suites in demo.test.js run with ?demo=1; this one does not. */
"use strict";

const { reporter, makeDom, ready, sleep } = require("./lib");

const session = () => JSON.stringify({
  authenticated: true, name: "Test Customer",
  email: "test@example.com", identifier: "test@example.com"
});

(async () => {
  const t = reporter("[production mode — empty by default]");

  /* ---- the public site still works ---------------------------------- */
  {
    const { dom, errors } = makeDom("index.html", { local: true, demo: false });
    await ready(dom, 600);
    const w = dom.window;
    t.eq("demonstration mode off", w.JCOB_DEMO.on(), false);
    t.eq("no demo customer loaded", typeof w.JCOB_DEMO_CUSTOMER, "function");
    t.eq("catalogue still published", w.JCOB_SITE.products.length, 11);
    t.eq("no page-text overrides invented", Object.keys(w.JCOB_SITE.get().content || {}).length, 0);
    t.ok("hero renders", /JAY C O B/.test(w.document.body.textContent));
    t.eq("no script errors", errors.length, 0, errors.slice(0, 2).join(" | "));
    w.close();
  }

  /* ---- a brand-new customer has nothing ----------------------------- */
  {
    const { dom, errors } = makeDom("dashboard.html", {
      local: true, demo: false, hash: "#applications",
      seed: { jcob_session_v1: session() }
    });
    await ready(dom, 900);
    const w = dom.window;
    const db = w.JCOB_DATA.get();
    t.eq("no applications", db.applications.length, 0);
    t.eq("no loans", db.loans.length, 0);
    t.eq("no transactions", db.transactions.length, 0);
    t.eq("no notifications", db.notifications.length, 0);
    t.eq("no documents", db.documents.length, 0);
    t.eq("no borrowed identity", db.profile.fullName, "");
    t.eq("no invented account number", db.profile.accountNumber, "");
    t.eq("savings is an account, not a list", typeof db.savings, "object");
    t.eq("savings balance is zero", db.savings.balance, 0);
    t.ok("empty state explained", /no (loan )?applications|no applications yet/i.test(w.document.body.textContent));
    t.eq("no script errors", errors.length, 0, errors.slice(0, 2).join(" | "));
    w.close();
  }

  /* ---- every dashboard area survives an empty account --------------- */
  {
    const { dom, errors } = makeDom("dashboard.html", {
      local: true, demo: false,
      seed: { jcob_session_v1: session() }
    });
    await ready(dom, 900);
    const w = dom.window;
    const routes = [...new Set([...w.document.querySelectorAll("#app-nav a[data-route]")]
      .map((a) => a.getAttribute("data-route")))];
    let blank = 0;
    for (const route of routes) {
      w.location.hash = "#" + route;
      await sleep(90);
      if (!w.document.getElementById("app-content").innerHTML.length) blank += 1;
    }
    t.eq("every dashboard route renders", blank, 0);
    t.eq("no script errors while walking routes", errors.length, 0, errors.slice(0, 2).join(" | "));
    w.close();
  }

  /* ---- the console opens with an empty book -------------------------
     Local mode keeps the shared mock project out of this check: what is
     being tested is that the console invents nothing on its own. */
  {
    const { dom, errors } = makeDom("admin.html", { local: true, demo: false });
    await ready(dom, 1200);
    const w = dom.window;
    const db = w.JCOB_PORTAL.db();
    t.eq("no customers", db.customers.length, 0);
    t.eq("no loans", db.loans.length, 0);
    t.eq("no applications", db.applications.length, 0);
    t.eq("no staff accounts", db.admins.length, 0);
    t.eq("no repayments", db.repayments.length, 0);
    t.eq("roles kept as configuration", db.roles.length, 5);
    t.eq("settings kept as configuration", db.settings.currency, "MWK");
    t.eq("no script errors", errors.length, 0, errors.slice(0, 2).join(" | "));
    w.close();
  }

  /* ---- the published demo password is refused ---------------------- */
  {
    const { dom, errors } = makeDom("login.html", { local: true, demo: false });
    await ready(dom, 500);
    const w = dom.window;
    w.document.getElementById("login-id").value = "demo@jaycobfinancial.mw";
    w.document.getElementById("login-password").value = "demo1234";
    w.document.getElementById("login-form").dispatchEvent(new w.Event("submit", { bubbles: true }));
    await sleep(400);
    const status = w.document.getElementById("login-status").textContent;
    t.ok("demo credentials refused", !w.localStorage.getItem("jcob_session_v1"));
    t.ok("reason explained", /unavailable|not connected/i.test(status), status);
    t.eq("no script errors", errors.length, 0, errors.slice(0, 2).join(" | "));
    w.close();
  }

  /* ---- the same build returns the demo set on request --------------- */
  {
    const { dom } = makeDom("dashboard.html", {
      local: true, demo: true,
      seed: { jcob_session_v1: session() }
    });
    await ready(dom, 900);
    const w = dom.window;
    t.eq("demonstration mode on", w.JCOB_DEMO.on(), true);
    t.ok("demonstration records available", w.JCOB_DATA.get().applications.length > 0);
    w.close();
  }

  process.exit(t.done() ? 0 : 1);
})();
