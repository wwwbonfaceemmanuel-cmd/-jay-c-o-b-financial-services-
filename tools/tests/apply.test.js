/* The application gate: read the terms, accept them, create the account
   (email + phone, or phone only), sign, and land in the dashboard — plus
   back navigation and the notification engine. */
"use strict";

const { reporter, makeDom, ready, sleep, rest, API } = require("./lib");

const ANON = process.env.TEST_ANON || "dev-anon";
const STAFF = { email: "admin@jaycob.mw", password: "Admin123!" };

function click(w, el) {
  el.dispatchEvent(new w.MouseEvent("click", { bubbles: true, cancelable: true }));
}

function fakeScroll(w, el, { scrollHeight = 2400, clientHeight = 500 } = {}) {
  Object.defineProperty(el, "scrollHeight", { value: scrollHeight, configurable: true });
  Object.defineProperty(el, "clientHeight", { value: clientHeight, configurable: true });
  Object.defineProperty(el, "scrollTop", { value: 0, writable: true, configurable: true });
}

function scrollTo(w, el, top) {
  el.scrollTop = top;
  el.dispatchEvent(new w.Event("scroll"));
}

function draw(w, pad, points) {
  pad.dispatchEvent(new w.MouseEvent("mousedown", { bubbles: true, clientX: 30, clientY: 40, button: 0 }));
  for (let i = 0; i < points; i++) {
    pad.dispatchEvent(new w.MouseEvent("mousemove", { bubbles: true, clientX: 30 + i * 6, clientY: 40 + (i % 7) * 5 }));
  }
  w.dispatchEvent(new w.MouseEvent("mouseup", { bubbles: true }));
}

async function sessionSeeds(creds) {
  const res = await fetch(API + "/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify(creds)
  });
  const body = await res.json();
  if (!body.access_token) return null;
  return {
    jcob_cloud_session_v1: JSON.stringify({
      access_token: body.access_token,
      refresh_token: body.refresh_token,
      expires_at: Date.now() + 3600 * 1000,
      token_type: "bearer",
      user: body.user
    })
  };
}

(async () => {
  const t = reporter("[application gate — terms, acceptance, account, signature]");

  /* ------------------------------------------------------------------ */
  {
    const { dom, errors } = makeDom("apply.html");
    await ready(dom, 900);
    const w = dom.window;
    const d = w.document;

    t.eq("gate is shown first", !!d.getElementById("onb-terms"), true);
    t.eq("application form is withheld", d.getElementById("apply-form"), null);
    t.ok("terms version shown", /2026-10-23/.test(d.getElementById("onb-terms").textContent));

    const terms = d.getElementById("onb-terms");
    const next = d.getElementById("onb-terms-next");
    fakeScroll(w, terms);

    scrollTo(w, terms, 0);
    t.eq("Continue hidden at the top", next.hidden, true);
    scrollTo(w, terms, 1200);
    t.eq("Continue still hidden halfway", next.hidden, true);
    scrollTo(w, terms, 1900);
    t.eq("Continue appears at the end", next.hidden, false);
    t.ok("note confirms the end was reached", /reached the end/i.test(d.getElementById("onb-readnote").textContent));

    click(w, next);
    await sleep(120);
    t.ok("agreement step opens", !!d.getElementById("onb-agree"));

    click(w, d.getElementById("onb-agree-next"));
    await sleep(120);
    t.eq("cannot accept without ticking", d.getElementById("onb-agree-error").hidden, false);
    t.eq("account step not reached", !!d.getElementById("onb-account"), false);

    d.getElementById("onb-agree").checked = true;
    d.getElementById("onb-truth").checked = true;
    click(w, d.getElementById("onb-agree-next"));
    await sleep(150);
    t.ok("account step opens", !!d.getElementById("onb-phone"));
    t.eq("email offered by default", d.getElementById("onb-email-field").hidden, false);

    /* No email service: the phone alone carries the account. */
    const phoneRadio = d.querySelector('input[name="onb-method"][value="phone"]');
    phoneRadio.checked = true;
    phoneRadio.dispatchEvent(new w.Event("change", { bubbles: true }));
    await sleep(60);
    t.eq("email field withdrawn", d.getElementById("onb-email-field").hidden, true);
    t.eq("password field withdrawn", d.getElementById("onb-password-fields").hidden, true);
    t.eq("explains the SMS code", d.getElementById("onb-phone-note").hidden, false);

    d.getElementById("onb-phone").value = "0999 555 123";
    click(w, d.getElementById("onb-account-next"));
    await sleep(900);
    t.ok("code step opens", !!d.getElementById("onb-otp-row"));
    t.eq("code goes to the phone", d.getElementById("onb-otp-target").textContent, "+265999555123");
    t.eq("still signed out before the code", w.JCOB_CLOUD.auth.isSignedIn(), false);

    const digits = [...d.querySelectorAll("#onb-otp-row input")];
    "123456".split("").forEach((c, i) => { digits[i].value = c; });
    click(w, d.getElementById("onb-otp-next"));
    await sleep(1400);
    t.eq("account created by SMS code", w.JCOB_CLOUD.auth.isSignedIn(), true);
    t.ok("signature step opens", !!d.getElementById("onb-sig"));

    const pad = d.getElementById("onb-sig");
    d.getElementById("onb-fullname").value = "Chisomo Banda";
    d.getElementById("onb-sig-confirm").checked = true;
    click(w, d.getElementById("onb-id-next"));
    await sleep(120);
    t.eq("blocks an empty signature", d.getElementById("onb-id-error").hidden, false);

    draw(w, pad, 20);
    click(w, d.getElementById("onb-id-next"));
    await sleep(1800);

    const doc = w.JCOB_DATA.get();
    t.ok("signature stored on the profile", !!(doc.profile.signature && doc.profile.signature.strokes.length));
    t.ok("signature has real points", doc.profile.signature.strokes.reduce((n, s) => n + s.length, 0) >= 12);
    t.eq("full name recorded", doc.profile.fullName, "Chisomo Banda");
    t.eq("terms version recorded", doc.profile.termsAccepted.version, "2026-10-23");
    t.eq("account method recorded", doc.profile.accountMethod, "phone");
    t.eq("write reached the database", w.JCOB_DATA.remote.state, "synced");
    t.eq("welcome notification raised", doc.notifications.some((n) => n.title === "Account created"), true);

    const owner = w.JCOB_CLOUD.auth.user().id;
    const rows = await rest("customer_docs?owner=eq." + owner + "&select=data");
    const saved = (rows[0] && rows[0].data) || {};
    t.ok("signature reached Supabase", !!(saved.profile && saved.profile.signature && saved.profile.signature.strokes.length));
    t.eq("acceptance reached Supabase", (saved.profile || {}).termsAccepted ? saved.profile.termsAccepted.version : null, "2026-10-23");
    t.eq("no script errors", errors.length, 0, errors.slice(0, 2).join(" | "));
    w.close();
  }

  /* ------------------------------------------------------------------ */
  console.log("\n[application gate — email account path]");
  {
    const { dom, errors } = makeDom("apply.html");
    await ready(dom, 900);
    const w = dom.window;
    const d = w.document;
    const terms = d.getElementById("onb-terms");
    fakeScroll(w, terms, { scrollHeight: 2000, clientHeight: 500 });
    scrollTo(w, terms, 1600);
    click(w, d.getElementById("onb-terms-next"));
    await sleep(100);
    d.getElementById("onb-agree").checked = true;
    d.getElementById("onb-truth").checked = true;
    click(w, d.getElementById("onb-agree-next"));
    await sleep(120);

    const email = "new" + Date.now().toString(36) + "@example.mw";
    d.getElementById("onb-email").value = email;
    d.getElementById("onb-phone").value = "+265 991 000 111";
    d.getElementById("onb-password").value = "Strongpass1";
    d.getElementById("onb-password2").value = "Strongpass1";
    click(w, d.getElementById("onb-account-next"));
    await sleep(1600);

    if (!w.JCOB_CLOUD.auth.isSignedIn()) {
      const digits = [...d.querySelectorAll("#onb-otp-row input")];
      "123456".split("").forEach((c, i) => { digits[i].value = c; });
      click(w, d.getElementById("onb-otp-next"));
      await sleep(1400);
    }
    t.eq("email account signed in", w.JCOB_CLOUD.auth.isSignedIn(), true);
    t.eq("no script errors", errors.length, 0, errors.slice(0, 2).join(" | "));
    w.close();
  }

  /* ------------------------------------------------------------------ */
  console.log("\n[customer login — reveal, recovery, phone codes]");
  {
    const { dom, errors } = makeDom("login.html");
    await ready(dom, 600);
    const w = dom.window;
    const d = w.document;

    const pw = d.getElementById("login-password");
    const toggle = d.querySelector('[data-pw-toggle="login-password"]');
    t.eq("password starts hidden", pw.type, "password");
    click(w, toggle);
    t.eq("reveal shows the password", pw.type, "text");
    click(w, toggle);
    t.eq("reveal hides it again", pw.type, "password");
    t.ok("forgot-password link present", d.querySelectorAll('a[href="forgot-password.html"]').length > 0);
    t.ok("one-time code sign-in present", !!d.getElementById("login-otp"));
    t.eq("no script errors", errors.length, 0, errors.slice(0, 2).join(" | "));
    w.close();
  }

  {
    const { dom, errors } = makeDom("forgot-password.html");
    await ready(dom, 600);
    const w = dom.window;
    const d = w.document;
    d.getElementById("forgot-id").value = "0999 777 888";
    d.getElementById("forgot-form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
    await sleep(900);
    const status = d.getElementById("forgot-status");
    t.ok("phone recovery explains the SMS code", /recovery code/i.test(status.innerHTML));
    t.ok("recovery remembered for the code page",
      /"mode":"recover"/.test(w.sessionStorage.getItem("jcob_pending_verify") || ""));
    t.eq("no script errors", errors.length, 0, errors.slice(0, 2).join(" | "));
    w.close();
  }

  /* ------------------------------------------------------------------ */
  console.log("\n[back navigation — dashboard sections]");
  {
    const seed = await sessionSeeds({ email: "customer@jaycob.mw", password: "Customer123!" });
    const { dom, errors } = makeDom("dashboard.html", { seed, hash: "#applications" });
    await ready(dom, 1500);
    const w = dom.window;
    const d = w.document;

    t.ok("section loaded", /My loan applications/i.test(d.getElementById("app-content").textContent));
    const back = d.querySelector("[data-back]");
    t.ok("section has a back control", !!back);
    click(w, back);
    await sleep(200);
    t.eq("back returns to the dashboard", w.location.hash, "#dashboard");

    const nav = d.querySelector('.app-nav a[data-route="loans"]');
    click(w, nav);
    await sleep(150);
    t.ok("another section keeps its back control", !!d.querySelector("[data-back]"));
    t.eq("no script errors", errors.length, 0, errors.slice(0, 2).join(" | "));
    w.close();
  }

  /* ------------------------------------------------------------------ */
  console.log("\n[back navigation — console modules]");
  {
    const seed = await sessionSeeds(STAFF);
    const { dom, errors } = makeDom("admin.html", { seed, hash: "#/customers" });
    await ready(dom, 1600);
    const w = dom.window;
    const d = w.document;
    if (d.getElementById("admin-gate") && d.getElementById("admin-gate").hidden === false) {
      d.getElementById("admin-email").value = STAFF.email;
      d.getElementById("admin-password").value = STAFF.password;
      d.getElementById("admin-gate-form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
      await sleep(1800);
    }
    t.ok("console module loaded", /Customer Management/i.test(d.getElementById("content").textContent));
    t.ok("module has a back control", !!d.querySelector("[data-back]"));
    t.eq("no script errors", errors.length, 0, errors.slice(0, 2).join(" | "));
    w.close();
  }

  /* ------------------------------------------------------------------ */
  console.log("\n[notification engine]");
  {
    const seed = await sessionSeeds({ email: "customer@jaycob.mw", password: "Customer123!" });
    const { dom, errors } = makeDom("dashboard.html", { seed, hash: "#notifications" });
    await ready(dom, 1500);
    const w = dom.window;
    const DATA = w.JCOB_DATA;

    const due = new Date(Date.now() + 2 * 86400000).toISOString();
    DATA.get().loans.push({
      id: "LN-ENGINE-1", principal: 500000, status: "Active", nextDue: due, nextAmount: 55000,
      outstandingPrincipal: 400000, outstandingInterest: 20000, paid: 100000
    });
    const first = DATA.runEngine();
    const second = DATA.runEngine();
    const reminders = DATA.get().notifications.filter((n) => n.type === "Repayment reminder");

    t.ok("reminder generated from the loan", back(reminders, "LN-ENGINE-1"));
    t.eq("engine reports what it added", first >= 1, true);
    t.eq("running twice adds nothing", second, 0);
    t.eq("one reminder per instalment", reminders.length, 1);
    t.ok("reminder says when it is due", /in 2 days|tomorrow|today/.test(reminders[0].body + reminders[0].title));
    t.ok("bell shows the unread count", Number(w.document.querySelector("[data-notif-total]").textContent) >= 1);
    t.eq("no script errors", errors.length, 0, errors.slice(0, 2).join(" | "));
    w.close();
  }

  t.done();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});

function back(list, id) {
  return list.some((n) => String(n.key || "").indexOf(id) >= 0);
}
