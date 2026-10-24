/* Cloud behaviour: website, console, dashboard and auth against Supabase
   (the local stand-in, tools/dev/mock-cloud.js). */
"use strict";

const { ROOT, reporter, makeDom, ready, sleep, rest, API } = require("./lib");

const STAFF = { email: "admin@jaycob.mw", password: "Admin123!" };
const CUSTOMER = { email: "customer@jaycob.mw", password: "Customer123!" };

async function token(creds) {
  const res = await fetch(API + "/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: { apikey: process.env.TEST_ANON || "dev-anon", "Content-Type": "application/json" },
    body: JSON.stringify(creds)
  });
  return res.json();
}

async function signInGate(w, creds) {
  w.document.getElementById("admin-email").value = creds.email;
  w.document.getElementById("admin-password").value = creds.password;
  w.document.getElementById("admin-gate-form").dispatchEvent(
    new w.Event("submit", { bubbles: true, cancelable: true })
  );
}

(async () => {
  const t = reporter("[cloud mode — public site]");
  const settingsRows = await rest("site_docs?id=eq.settings&select=data");
  const cloudPhone = settingsRows[0].data.phone;

  {
    const { dom, errors } = makeDom("index.html");
    await ready(dom, 900);
    const w = dom.window;
    t.ok("cloud client enabled", w.JCOB_CLOUD && w.JCOB_CLOUD.enabled === true);
    t.eq("visitor has no session", w.JCOB_CLOUD.auth.session(), null);
    t.eq("settings hydrated", w.JCOB_SITE.get().settings.phone, cloudPhone);
    t.eq("catalogue hydrated", w.JCOB_SITE.products.length, 1);
    t.eq("catalogue rate", w.JCOB_SITE.products[0].rate, 31);
    t.eq("store reports synced", w.JCOB_SITE.remote.state, "synced");
    t.ok("contact details published", w.document.querySelector("footer").textContent.includes(cloudPhone));
    t.eq("no script errors", errors.length, 0, errors.slice(0, 2).join(" | "));
    w.close();
  }

  console.log("\n[cloud mode — calculator and live feed]");
  {
    const { dom, errors } = makeDom("calculator.html");
    await ready(dom, 700);
    const w = dom.window;
    const d = w.document;
    t.eq("rate from catalogue", Number(d.getElementById("calc-rate").value), 31);
    t.eq("amount default from settings", Number(d.getElementById("calc-amount").value), 1000000);
    t.eq("term default from settings", Number(d.getElementById("calc-term").value), 3);
    t.eq("no script errors", errors.length, 0, errors.slice(0, 2).join(" | "));
    w.close();
  }
  {
    const { dom } = makeDom("live.html");
    await ready(dom, 900);
    const w = dom.window;
    t.ok("cloud post rendered", w.document.body.textContent.includes("Cloud launch"));
    t.eq("live feed synced", w.JCOB_LIVE.remote.state, "synced");
    w.close();
  }

  console.log("\n[cloud mode — admin console]");
  {
    const { dom, errors } = makeDom("admin.html");
    await ready(dom);
    const w = dom.window;
    t.ok("gate locked", w.document.getElementById("admin-gate").hidden === false);
    t.ok("email field shown", w.document.getElementById("admin-email").hidden === false);

    await signInGate(w, STAFF);
    await sleep(1800);
    t.ok("staff unlocked the console", w.document.getElementById("admin-gate").hidden === true);
    t.ok("session is staff", w.JCOB_CLOUD.auth.isStaff(w.JCOB_CLOUD.auth.profile()));

    const portal = await rest("portal_docs?id=eq.main&select=data");
    t.ok("console database in Supabase", !!(portal[0] && portal[0].data && portal[0].data.customers));

    await w.JCOB_ADMIN_SITE.refreshCloud();
    await sleep(600);
    t.ok("customer application imported", (w.JCOB_PORTAL.db().applications || []).some((a) => a.siteRef === "APP-CLOUD-001"));

    w.JCOB_SITE.settings.phone = "+265 111 222 333";
    w.JCOB_SITE.save();
    await sleep(900);
    const saved = await rest("site_docs?id=eq.settings&select=data");
    t.eq("website settings saved", saved[0].data.phone, "+265 111 222 333");

    /* Decision round-trip: console → the customer's own document. */
    const imported = (w.JCOB_PORTAL.db().applications || []).find((a) => a.siteRef === "APP-CLOUD-001");
    if (imported) {
      imported.status = "Approved";
      imported.rate = 24;
      imported.term = 12;
      w.JCOB_ADMIN_SITE.syncBackToSite();
      await sleep(900);
      const docs = await rest("customer_docs?select=data");
      const doc = (docs || []).map((r) => r.data).find((d) => d && (d.applications || []).some((a) => a.ref === "APP-CLOUD-001"));
      const written = doc && doc.applications.find((a) => a.ref === "APP-CLOUD-001");
      t.ok("decision written back to the customer document", !!(written && written.status === "approved"));
    }
    t.eq("no script errors", errors.length, 0, errors.slice(0, 2).join(" | "));
    w.close();
  }

  console.log("\n[cloud mode — role guard]");
  {
    const { dom } = makeDom("admin.html");
    await ready(dom);
    const w = dom.window;
    await signInGate(w, CUSTOMER);
    await sleep(1500);
    t.ok("customer refused", w.document.getElementById("admin-gate").hidden === false);
    t.ok("reason explained", /administrator access/i.test(w.document.getElementById("gate-status").textContent));
    w.close();
  }

  console.log("\n[cloud mode — console persistence]");
  {
    const first = makeDom("admin.html");
    await ready(first.dom);
    const w = first.dom.window;
    await signInGate(w, STAFF);
    await sleep(1600);
    const db = w.JCOB_PORTAL.db();
    t.ok("portal loaded", Array.isArray(db.customers));
    db.customers.push({ id: "CUS-TEST-1", name: "Persisted Customer", status: "Active", kyc: "Pending" });
    w.JCOB_PORTAL.save();
    await sleep(1200);
    w.close();

    const second = makeDom("admin.html");
    await ready(second.dom);
    const w2 = second.dom.window;
    await sleep(400);
    await w2.JCOB_PORTAL.load();
    await sleep(400);
    t.ok("edit reloaded from Supabase",
      (w2.JCOB_PORTAL.db().customers || []).some((c) => c.name === "Persisted Customer"));
    w2.close();
  }

  console.log("\n[cloud mode — every console button has a handler]");
  {
    const fs = require("fs");
    const path = require("path");
    const html = fs.readFileSync(path.join(ROOT, "admin.html"), "utf8");
    const acts = [...new Set([...html.matchAll(/data-act="([A-Za-z0-9_]+)"/g)].map((m) => m[1]))];

    const { dom } = makeDom("admin.html");
    await ready(dom);
    const w = dom.window;
    await signInGate(w, STAFF);
    await sleep(1500);

    const missing = acts.filter((a) => typeof (w.JCOB_CONSOLE_ACTIONS || {})[a] !== "function");
    t.eq("no button without a handler", missing.join(","), "");
    t.ok("no fake confirmations left", !/placeholder — not wired|not wired yet/i.test(html));
    w.close();
  }

  console.log("\n[cloud mode — console records reach Supabase]");
  {
    const { dom, errors } = makeDom("admin.html");
    await ready(dom);
    const w = dom.window;
    await signInGate(w, STAFF);
    await sleep(1600);
    const before = w.JCOB_PORTAL.db().branches.length;

    w.location.hash = "#/branches";
    await sleep(250);
    const add = w.document.querySelector('[data-act="brAdd"]');
    t.ok("add-branch button rendered", !!add);
    add.click();
    await sleep(200);
    t.ok("add form opened", !!w.document.getElementById("brName"));
    w.document.getElementById("brName").value = "Kasungu Service Point";
    w.document.getElementById("brDist").value = "Kasungu";
    w.document.querySelector('[data-mact="ok"]').click();
    await sleep(1600);

    const branch = w.JCOB_PORTAL.db().branches.find((b) => b.name === "Kasungu Service Point");
    t.ok("branch added in memory", !!branch);
    t.eq("branch count grew", w.JCOB_PORTAL.db().branches.length, before + 1);
    t.eq("console synced", w.JCOB_PORTAL.cloud.state, "synced");
    t.eq("no script errors", errors.length, 0, errors.slice(0, 2).join(" | "));

    const rows = await rest("portal_docs?id=eq.main&select=data");
    const stored = (rows[0] && rows[0].data && rows[0].data.branches) || [];
    t.ok("branch stored in portal_docs", stored.some((b) => b.name === "Kasungu Service Point"));
    w.close();

    const again = makeDom("admin.html");
    await ready(again.dom);
    const w2 = again.dom.window;
    await signInGate(w2, STAFF);
    await sleep(1600);
    t.ok("branch survives a reload",
      w2.JCOB_PORTAL.db().branches.some((b) => b.name === "Kasungu Service Point"));
    w2.close();
  }

  console.log("\n[cloud mode — two staff cannot overwrite each other]");
  {
    const a = makeDom("admin.html");
    await ready(a.dom);
    const wa = a.dom.window;
    await signInGate(wa, STAFF);
    await sleep(1600);

    const b = makeDom("admin.html");
    await ready(b.dom);
    const wb = b.dom.window;
    await signInGate(wb, STAFF);
    await sleep(1600);

    wa.JCOB_PORTAL.db().branches.push({ id: "BR-TA", name: "First Session Branch", district: "Lilongwe", manager: "", cust: 0, portfolio: 0, cash: 0 });
    wa.JCOB_PORTAL.save();
    await sleep(1500);
    t.eq("first session saved", wa.JCOB_PORTAL.cloud.state, "synced");

    wb.JCOB_PORTAL.db().branches.push({ id: "BR-TB", name: "Second Session Branch", district: "Blantyre", manager: "", cust: 0, portfolio: 0, cash: 0 });
    wb.JCOB_PORTAL.save();
    await sleep(1500);
    t.eq("second session refused", wb.JCOB_PORTAL.cloud.state, "conflict");

    const rows = await rest("portal_docs?id=eq.main&select=data");
    const stored = (rows[0] && rows[0].data && rows[0].data.branches) || [];
    t.ok("first session's work kept", stored.some((x) => x.name === "First Session Branch"));
    t.ok("second session's work not written", !stored.some((x) => x.name === "Second Session Branch"));
    wa.close();
    wb.close();
  }

  console.log("\n[cloud mode — customer dashboard]");
  {
    const auth = await token(CUSTOMER);
    const session = {
      access_token: auth.access_token, refresh_token: auth.refresh_token,
      expires_at: Date.now() + 3600 * 1000, token_type: "bearer", user: auth.user
    };
    const { dom, errors } = makeDom("dashboard.html", {
      hash: "#applications",
      seed: { jcob_cloud_session_v1: JSON.stringify(session) }
    });
    await ready(dom, 1500);
    const w = dom.window;
    const body = w.document.body.textContent.replace(/\s+/g, " ");
    t.ok("profile rendered", body.includes("Mock Cloud Customer"));
    t.ok("application listed", body.includes("APP-CLOUD-001"));
    t.ok("document synced", w.JCOB_DATA.remote.state === "synced",
      w.JCOB_DATA.remote.state + " " + (w.JCOB_DATA.remote.error || ""));
    t.eq("no script errors", errors.length, 0, errors.slice(0, 2).join(" | "));
    w.close();
  }

  console.log("\n[cloud mode — Supabase is the only store]");
  {
    /* A stale document left in this browser by an older build must be
       ignored, and a fresh browser (no local data at all) must still show
       the account exactly as it is in customer_docs. */
    const auth = await token(CUSTOMER);
    const session = {
      access_token: auth.access_token, refresh_token: auth.refresh_token,
      expires_at: Date.now() + 3600 * 1000, token_type: "bearer", user: auth.user
    };
    const uid = auth.user.id;
    const stale = {
      profile: { fullName: "Cached Customer", email: "cached@example.com", accountNumber: "JC-ACC-999999" },
      applications: [{ ref: "APP-CACHE-999", product: "Personal Loan", status: "Approved" }],
      loans: [], transactions: [], notifications: [], documents: []
    };

    const { dom } = makeDom("dashboard.html", {
      hash: "#applications",
      seed: {
        jcob_cloud_session_v1: JSON.stringify(session),
        ["jcob_app_v2:" + uid]: JSON.stringify(stale),
        jcob_app_v2: JSON.stringify(stale)
      }
    });
    await ready(dom, 1500);
    const w = dom.window;
    const html = w.document.body.innerHTML;
    t.ok("stale browser copy ignored", !/Cached Customer|APP-CACHE-999/.test(html));
    t.ok("account shown from the database", /Mock Cloud Customer/.test(w.document.body.textContent));
    t.eq("record came from customer_docs", w.JCOB_DATA.get().profile.fullName, "Mock Cloud Customer");
    t.eq("browser copy removed on load", w.localStorage.getItem("jcob_app_v2:" + uid), null);
    w.close();

    const fresh = makeDom("dashboard.html", {
      hash: "#applications",
      seed: { jcob_cloud_session_v1: JSON.stringify(session) }
    });
    await ready(fresh.dom, 1500);
    const w2 = fresh.dom.window;
    t.ok("a new browser still sees the account", /APP-CLOUD-001/.test(w2.document.body.textContent));
    t.eq("no document cached after load", w2.localStorage.getItem("jcob_app_v2:" + uid), null);
    t.eq("sync state reported", w2.JCOB_DATA.remote.state, "synced");

    /* A change must go to the database, not to the browser. */
    w2.JCOB_DATA.notify("General", "Store check", "Written to customer_docs.", "In-app");
    await sleep(1200);
    const leftovers = Object.keys(w2.localStorage).filter((k) => /^jcob_(app|site|live|admin_system)/.test(k));
    t.eq("browser keeps no records", leftovers.join(","), "");
    const rows = await rest("customer_docs?owner=eq." + uid + "&select=data");
    const stored = (rows[0] && rows[0].data && rows[0].data.notifications) || [];
    t.ok("change reached customer_docs", stored.some((n) => n.title === "Store check"));
    w2.close();
  }

  console.log("\n[cloud mode — the signature is really stored, and a refusal is reported]");
  {
    /* The signature lives in the customer's own document in customer_docs,
       at data.profile.signature. Two things have to be true: it is written
       there, and a database that refuses the write is never reported as a
       save — otherwise the screen says "saved" while nothing was kept. */
    const auth = await token(CUSTOMER);
    const session = {
      access_token: auth.access_token, refresh_token: auth.refresh_token,
      expires_at: Date.now() + 3600 * 1000, token_type: "bearer", user: auth.user
    };
    const uid = auth.user.id;
    const read = async () => (await rest("customer_docs?owner=eq." + uid + "&select=data,updated_at"))[0];

    const signature = {
      version: 1, w: 640, h: 190, signedAt: new Date().toISOString(), signerName: "Mock Cloud Customer",
      strokes: [[{ x: 12, y: 90 }, { x: 88, y: 34 }, { x: 160, y: 96 }]]
    };

    const { dom } = makeDom("dashboard.html", {
      hash: "#applications",
      seed: { jcob_cloud_session_v1: JSON.stringify(session) }
    });
    await ready(dom, 1500);
    const w = dom.window;
    w.JCOB_DATA.get().profile.signature = signature;
    await w.JCOB_DATA.saveNow();
    await sleep(600);

    const landed = (await read()).data.profile.signature;
    t.eq("the signature has a home in customer_docs", w.JCOB_DATA.remote.state, "synced");
    t.eq("the person who signed is recorded", landed && landed.signerName, "Mock Cloud Customer");
    t.eq("the moment of signing is recorded", !!(landed && landed.signedAt), true);
    t.eq("the strokes are recorded", landed && landed.strokes.length, 1);
    t.eq("the pad size is recorded", landed && landed.w + "x" + landed.h, "640x190");

    /* Now refuse the write the way a revoked key or a dropped policy would. */
    const before = (await read()).data.profile.fullName;
    w.fetch = (input, init) => {
      const method = String((init && init.method) || "GET").toUpperCase();
      if (/customer_docs/.test(String(input)) && method !== "GET" && method !== "HEAD") {
        return Promise.resolve({
          status: 403, ok: false,
          text: () => Promise.resolve('{"message":"permission denied for table customer_docs"}')
        });
      }
      return fetch(new URL(input, w.location.href), init);
    };
    w.JCOB_DATA.get().profile.fullName = "Written While Refused";
    await w.JCOB_DATA.saveNow();
    await sleep(400);

    t.eq("a refused write is reported as an error", w.JCOB_DATA.remote.state, "error");
    t.eq("the refusal is explained", /permission denied/i.test(String(w.JCOB_DATA.remote.error)), true);
    const after = (await read()).data.profile.fullName;
    t.eq("nothing was written", after, before);
    t.eq("the stored signature is untouched", (await read()).data.profile.signature.signerName, "Mock Cloud Customer");
    const chip = w.document.querySelector("[data-sync]");
    t.ok("the dashboard says it was not saved", !!chip && /not saved/i.test(chip.textContent),
      chip ? chip.textContent : "no sync chip");
    w.close();
  }

  console.log("\n[cloud mode — a read that fails never becomes a blank account]");
  {
    /* The old failure mode: a refused read looked like "no document", so the
       page created an empty one and wrote it over the customer's file — the
       signature included. A failed read must stop everything, not reset it. */
    const auth = await token(CUSTOMER);
    const session = {
      access_token: auth.access_token, refresh_token: auth.refresh_token,
      expires_at: Date.now() + 3600 * 1000, token_type: "bearer", user: auth.user
    };
    const uid = auth.user.id;
    const before = (await rest("customer_docs?owner=eq." + uid + "&select=data"))[0].data;

    const { dom } = makeDom("dashboard.html", {
      hash: "#applications",
      seed: { jcob_cloud_session_v1: JSON.stringify(session) },
      fetch: (base) => (input, init) => {
        const method = String((init && init.method) || "GET").toUpperCase();
        if (/customer_docs/.test(String(input)) && (method === "GET" || method === "HEAD")) {
          return Promise.resolve({
            status: 503, ok: false, text: () => Promise.resolve('{"message":"service unavailable"}')
          });
        }
        return base(input, init);
      }
    });
    await ready(dom, 1500);
    const w = dom.window;
    await sleep(600);

    const after = (await rest("customer_docs?owner=eq." + uid + "&select=data"))[0].data;
    t.eq("the read failure is reported", w.JCOB_DATA.remote.state, "error");
    t.eq("the account was not blanked", after.profile.fullName, before.profile.fullName);
    t.eq("the signature is still on file", after.profile.signature.signerName, before.profile.signature.signerName);
    t.eq("the application history is intact", after.applications.length, before.applications.length);
    w.close();
  }

  console.log("\n[cloud mode — auth flows]");
  {
    const { dom, errors } = makeDom("login.html");
    await ready(dom);
    const w = dom.window;
    w.document.getElementById("login-id").value = CUSTOMER.email;
    w.document.getElementById("login-password").value = CUSTOMER.password;
    w.document.getElementById("login-form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
    await sleep(1200);
    t.ok("session created", !!w.JCOB_CLOUD.auth.session());
    t.eq("role loaded", (w.JCOB_CLOUD.auth.profile() || {}).role, "customer");
    t.ok("UI session in step", !!(w.JCOB_UI.getSession() || {}).authenticated);
    t.eq("no script errors", errors.length, 0, errors.slice(0, 2).join(" | "));
    w.close();
  }
  {
    const { dom } = makeDom("login.html");
    await ready(dom);
    const w = dom.window;
    w.document.getElementById("login-id").value = CUSTOMER.email;
    w.document.getElementById("login-password").value = "WrongPassword1!";
    w.document.getElementById("login-form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
    await sleep(1000);
    t.ok("bad password refused", !w.JCOB_CLOUD.auth.session());
    t.ok("clear error", /do not match/i.test(w.document.getElementById("login-status").textContent));
    w.close();
  }
  {
    const { dom, errors } = makeDom("register.html");
    await ready(dom);
    const w = dom.window;
    const d = w.document;
    const set = (id, value) => { d.getElementById(id).value = value; };
    set("reg-first", "Chisomo");
    set("reg-last", "Banda");
    set("reg-dob", "1995-06-14");
    set("reg-nid", "MWI-7731-2200");
    set("reg-phone", "+265 888 777 666");
    set("reg-email", "chisomo." + Date.now() + "@example.mw");
    set("reg-password", "StrongPass123!");
    set("reg-confirm", "StrongPass123!");
    d.getElementById("reg-consent").checked = true;
    d.getElementById("register-form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
    await sleep(1500);
    t.ok("account created", !!w.JCOB_CLOUD.auth.session());
    t.eq("profile row created", (w.JCOB_CLOUD.auth.profile() || {}).role, "customer");
    t.eq("no script errors", errors.length, 0, errors.slice(0, 2).join(" | "));
    w.close();
  }
  {
    const { dom, errors } = makeDom("forgot-password.html");
    await ready(dom);
    const w = dom.window;
    w.document.getElementById("forgot-id").value = CUSTOMER.email;
    w.document.getElementById("forgot-form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
    await sleep(900);
    t.ok("recovery requested", /reset link/i.test(w.document.getElementById("forgot-status").textContent));
    t.eq("no script errors", errors.length, 0, errors.slice(0, 2).join(" | "));
    w.close();
  }

  console.log("\n[cloud mode — contact form and dashboard guard]");
  {
    const before = (await rest("enquiries?select=id")) || [];
    const { dom, errors } = makeDom("contact.html");
    await ready(dom);
    const w = dom.window;
    const d = w.document;
    d.getElementById("c-name").value = "Cloud Enquiry";
    d.getElementById("c-email").value = "cloud.enquiry@example.mw";
    d.getElementById("c-phone").value = "+265 999 555 444";
    d.getElementById("c-service").value = "SME finance advisory";
    d.getElementById("c-message").value = "Testing the enquiry endpoint.";
    d.getElementById("c-consent").checked = true;
    d.querySelector("form[data-validate]").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
    await sleep(1200);
    const after = (await rest("enquiries?select=id,name")) || [];
    t.ok("enquiry stored", after.some((r) => r.name === "Cloud Enquiry"));
    t.eq("row added", after.length, before.length + 1);
    t.ok("success message shown", /recorded|Thank you/i.test(d.body.textContent));
    t.eq("no script errors", errors.length, 0, errors.slice(0, 2).join(" | "));
    w.close();
  }
  {
    const { dom } = makeDom("dashboard.html");
    await ready(dom, 900);
    const w = dom.window;
    t.ok("signed-out visitor has no dashboard", !w.JCOB_UI.getSession());
    w.close();
  }

  process.exit(t.done() ? 0 : 1);
})();
