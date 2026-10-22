/* Local (no backend) behaviour: the site must work with browser storage. */
"use strict";

const { reporter, makeDom, ready, sleep } = require("./lib");

const siteDb = () => ({
  profile: {
    fullName: "Memory Tembo", email: "demo@jaycobfinancial.mw", phone: "+265 999 123 456",
    nid: "MWI-8842-1130", district: "Lilongwe", kyc: "Verified", memberSince: "2019-03-11",
    accountNumber: "JC-ACC-100412", accountStatus: "Active", verification: "Verified",
    monthlyIncome: 1450000, monthlyExpenses: 620000, avatar: "MT"
  },
  applications: [{
    ref: "APP-2026-0412", product: "Personal Loan", amount: 5000000, term: 24,
    purpose: "Shop expansion", submitted: "2026-09-01T09:00:00.000Z",
    status: "approved", stage: 7, reviewer: "Approved at 24% p.a., 24 months.", documents: []
  }],
  loans: [], tickets: [], notifications: [], transactions: [], deposits: [], withdrawals: [],
  transfers: [], savings: [], documents: [], statements: [], drafts: [], sessions: [], logins: []
});

(async () => {
  const t = reporter("[demo mode — public site]");
  {
    const { dom, errors } = makeDom("index.html", { local: true });
    await ready(dom, 600);
    const w = dom.window;
    t.eq("cloud disabled in local mode", w.JCOB_CLOUD.enabled, false);
    t.eq("store reports local", w.JCOB_SITE.remote.state, "local");
    t.eq("seeded catalogue", w.JCOB_SITE.products.length, 11);
    t.ok("hero renders", /JAY C O B/.test(w.document.body.textContent));
    t.eq("no script errors", errors.length, 0, errors.slice(0, 2).join(" | "));
    w.close();
  }

  console.log("\n[demo mode — calculator]");
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

  console.log("\n[demo mode — admin console]");
  {
    const { dom, errors } = makeDom("admin.html", { local: true });
    await ready(dom);
    const w = dom.window;
    const gate = w.document.getElementById("admin-gate");
    t.ok("gate locked", gate.hidden === false);
    w.document.getElementById("admin-password").value = "admin2026";
    w.document.getElementById("admin-gate-form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
    await sleep(400);
    t.ok("published password unlocks the console", gate.hidden === true);

    const body = w.document.body.textContent;
    t.ok("WEBSITE module present", /WEBSITE/.test(body));
    t.ok("sync badge", /WEBSITE CONNECTED/i.test(body));
    const navBtn = [...w.document.querySelectorAll("[data-nav]")].find((b) => /settings/i.test(b.getAttribute("data-nav")));
    if (navBtn) { navBtn.click(); await sleep(400); }
    t.ok("website connection panel on System Settings", /Website connection/i.test(w.document.body.textContent));
    t.ok("connection check linked", !!w.document.querySelector('a[href="system-check.html"]'));

    w.JCOB_SITE.product("Personal Loan").rate = 27;
    w.JCOB_SITE.save();
    await sleep(200);
    const saved = JSON.parse(w.localStorage.getItem("jcob_site_v1"));
    t.eq("catalogue saved locally", saved.products.find((p) => p.id === "personal").rate, 27);
    t.eq("no script errors", errors.length, 0, errors.slice(0, 2).join(" | "));
    w.close();
  }

  console.log("\n[demo mode — website ↔ console bridge]");
  {
    const db = siteDb();
    db.applications.push({
      ref: "APP-DEMO-9001", product: "Personal Loan", amount: 850000, term: 9,
      purpose: "Bridge demo", submitted: new Date().toISOString(), status: "pending", stage: 1, documents: []
    });
    db.tickets.push({
      ref: "TKT-DEMO-9001", category: "Repayment", subject: "Allocation question",
      status: "Open", created: new Date().toISOString(), updated: new Date().toISOString(),
      messages: [{ from: "Memory Tembo", text: "How is my payment allocated?", at: new Date().toISOString() }]
    });

    const { dom, errors } = makeDom("admin.html", { local: true, seed: { jcob_app_v1: JSON.stringify(db) } });
    await ready(dom);
    const w = dom.window;
    w.document.getElementById("admin-password").value = "admin2026";
    w.document.getElementById("admin-gate-form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
    await sleep(500);

    w.JCOB_ADMIN_SITE.importSiteData();
    await sleep(200);
    const portal = w.JCOB_PORTAL.db();
    t.ok("website application imported", portal.applications.some((a) => a.siteRef === "APP-DEMO-9001"));
    t.ok("website ticket imported", portal.tickets.some((x) => x.siteRef === "TKT-DEMO-9001"));

    const app = portal.applications.find((a) => a.siteRef === "APP-DEMO-9001");
    app.status = "Approved";
    app.rate = 24;
    app.term = 9;
    w.JCOB_ADMIN_SITE.syncBackToSite();
    await sleep(300);

    const site = JSON.parse(w.localStorage.getItem("jcob_app_v1"));
    const updated = site.applications.find((a) => a.ref === "APP-DEMO-9001");
    t.eq("decision written back", updated.status, "approved");
    t.ok("reviewer note recorded", /Approved at 24/.test(updated.reviewer || ""));
    t.ok("customer notified", (site.notifications || []).some((n) => /APP-DEMO-9001/.test(n.title || "")));
    t.eq("no script errors", errors.length, 0, errors.slice(0, 2).join(" | "));
    w.close();
  }

  console.log("\n[demo mode — dashboard, live feed, bundle]");
  {
    const { dom, errors } = makeDom("dashboard.html", {
      local: true,
      hash: "#applications",
      seed: {
        jcob_app_v1: JSON.stringify(siteDb()),
        jcob_session_v1: JSON.stringify({ authenticated: true, name: "Memory Tembo", email: "demo@jaycobfinancial.mw" })
      }
    });
    await ready(dom, 700);
    const w = dom.window;
    t.ok("application listed", /APP-2026-0412/.test(w.document.body.textContent));
    t.ok("status shown", /Approved/i.test(w.document.body.textContent));
    t.eq("no script errors", errors.length, 0, errors.slice(0, 2).join(" | "));
    w.close();
  }
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
