/* Cloud behaviour: website, console, dashboard and auth against Supabase
   (the local stand-in, tools/dev/mock-cloud.js). */
"use strict";

const { reporter, makeDom, ready, sleep, rest, API } = require("./lib");

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
    t.ok("profile rendered", body.includes("Memory Tembo"));
    t.ok("application listed", body.includes("APP-CLOUD-001"));
    t.ok("document synced", w.JCOB_DATA.remote.state === "synced",
      w.JCOB_DATA.remote.state + " " + (w.JCOB_DATA.remote.error || ""));
    t.eq("no script errors", errors.length, 0, errors.slice(0, 2).join(" | "));
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
