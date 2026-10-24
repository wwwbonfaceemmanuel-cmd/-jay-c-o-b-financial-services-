/* =====================================================================
   The platform layer — brand loading, refresh, officer roles, reminders
   ---------------------------------------------------------------------
   These checks pin the behaviour this release added, so a later change
   cannot quietly remove it:

     • the brand loading animation is on every page and every sign-in
     • every dashboard carries a refresh control
     • the officer catalogue ships as configuration (cashiers included)
     • a module the signed-in officer was not granted is never drawn
     • an instalment due inside the lead time raises exactly one reminder
   ===================================================================== */
"use strict";

const fs = require("fs");
const path = require("path");
const { reporter, makeDom, ready } = require("./lib");

const ROOT = path.resolve(__dirname, "../..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

(async () => {
  const t = reporter("[platform — brand loader, refresh, roles, reminders]");

  /* ---- 1. the loading animation is everywhere ---- */
  const pages = fs.readdirSync(ROOT).filter((f) => f.endsWith(".html"));
  const withoutLoader = pages.filter((f) => !/assets\/js\/loader\.js/.test(read(f)));
  t.eq("every page loads the brand loading animation", withoutLoader.join(", "), "");

  const loader = read("assets/js/loader.js");
  t.ok("the loader paints the brand emblem", /logo-mark\.svg|JCOB_INLINE_LOGOS/.test(loader));
  t.ok("the loader exposes show / hide / refresh", /show:\s*show/.test(loader) && /refresh:\s*refresh/.test(loader));
  t.ok("the loader honours reduced motion", /prefers-reduced-motion/.test(loader));
  t.ok("sign-in shows the animation", /JCOB_LOADER/.test(read("assets/js/auth.js")));
  t.ok("the console gate shows the animation", /LOAD\(\)\.show\("Signing you in/.test(read("admin.html")));

  /* ---- 2. refresh on every dashboard ---- */
  const dash = read("dashboard.html");
  t.ok("the customer dashboard carries a refresh button", /data-refresh\b/.test(dash));
  t.ok("customer pages carry a refresh control", /data-refresh-module/.test(read("assets/js/dashboard.js")));
  const admin = read("admin.html");
  t.ok("the console top bar carries a refresh button", /id="refreshBtn"/.test(admin));
  t.ok("every console module carries a refresh button", /data-act="refreshModule"/.test(admin));

  /* ---- 3. the officer catalogue is configuration ---- */
  const { dom, errors } = makeDom("admin.html", { local: true });
  await ready(dom, 900);
  const w = dom.window;
  const db = w.JCOB_PORTAL.db();
  const names = db.roles.map((r) => r.name);
  ["Super Admin", "General Manager", "Cashier", "Teller", "Collections Officer", "Credit Analyst"].forEach((role) => {
    t.ok("the catalogue carries " + role, names.indexOf(role) > -1);
  });
  t.eq("no officer accounts ship with the build", db.admins.length, 0);
  t.ok("every role carries the full permission vocabulary",
    db.roles.every((r) => ["customers", "cashier", "collections", "audit"].every((k) => r.perms[k] !== undefined)));
  t.ok("the three-day reminder lead time is configuration", db.settings.reminderDays === 3);

  /* ---- 4. a role scopes what the officer can open ---- */
  t.eq("the console starts with full authority", w.currentRole(), "Super Admin");
  db.roles.forEach((r) => { r.perms.roles = r.name === "Super Admin" ? 1 : 0; });
  db.admins.push({ id: "STAFF-1", name: "Mary Cashier", email: "mary@jaycobfinancial.mw", role: "Cashier", status: "Active" });
  w.eval("officerCache={record:db.admins.find(a=>a.name==='Mary Cashier'),at:Date.now()}");
  t.eq("the cashier is known by role", w.currentRole(), "Cashier");
  w.render(true);
  const nav = [].slice.call(w.document.querySelectorAll("#sidebar .navlink")).map((b) => b.dataset.nav);
  t.ok("the cashier sees the cash desk", ["deposits", "withdrawals", "repayments"].every((m) => nav.indexOf(m) > -1), nav.join(","));
  t.ok("the cashier cannot see roles", nav.indexOf("roles") === -1);
  t.ok("the cashier cannot see officer accounts", nav.indexOf("adminUsers") === -1);
  t.ok("the cashier cannot see settings", nav.indexOf("settings") === -1);
  t.ok("the roles screen refuses a cashier", /restricted|Not assigned/i.test(w.deniedView("roles")));
  t.ok("reaching another module by address is refused", /Not assigned to your role/.test(w.deniedView("settings")));
  w.eval("officerCache=null");

  /* ---- 5. a reminder goes out inside the lead time, once ---- */
  const due = new Date();
  due.setDate(due.getDate() + 2);
  db.loans.push({
    id: "LN-REM1", cust: "Mary Banda", product: "Personal Loan", principal: 120000, rate: 5,
    term: 6, emis: 22000, balance: 90000, paidTotal: 30000, status: "Active",
    schedule: [{ n: 3, due: due.toISOString(), amt: 22000, paid: 0, status: "Scheduled" }]
  });
  const made = w.runReminderEngine();
  t.eq("one reminder is raised for the instalment inside the window", made, 1);
  t.eq("the reminder is stored once", db.reminders.length, 1);
  t.eq("running the engine again does not repeat it", w.runReminderEngine(), 0);
  t.ok("the reminder names the customer and the amount",
    /Mary Banda/.test(db.reminders[0].cust) && /22,000/.test(db.reminders[0].body), db.reminders[0].body);
  t.ok("the customer is messaged through the messaging module",
    db.notifications.some((n) => n.type === "Repayment reminder" && n.cust === "Mary Banda"));
  const far = new Date();
  far.setDate(far.getDate() + 9);
  db.loans.push({
    id: "LN-REM2", cust: "Late Customer", product: "Business Loan", principal: 200000, rate: 5,
    term: 6, emis: 30000, balance: 200000, paidTotal: 0, status: "Active",
    schedule: [{ n: 1, due: far.toISOString(), amt: 30000, paid: 0, status: "Scheduled" }]
  });
  t.eq("a loan due outside the window is not reminded", w.runReminderEngine(), 0);

  /* ---- 6. the customers module opens every registered customer ---- */
  db.customers.push({ id: "CUS-1", name: "Web Customer", phone: "—", email: "web@example.com", nid: "NID",
    district: "Lilongwe", status: "Active", kyc: "Pending", balance: 0, savings: 0, employer: "—",
    occupation: "—", income: 0, kin: { name: "—", phone: "—", rel: "—" }, joined: new Date().toISOString(), origin: "website" });
  w.render(false);
  w.location.hash = "#/customers";
  await new Promise((r) => setTimeout(r, 80));
  w.render(true);
  const customers = w.document.getElementById("content").innerHTML;
  t.ok("the customer file lists the registered account", /Web Customer/.test(customers));
  t.ok("the module offers every record in one list", /data-all="customers"/.test(customers));

  t.eq("no script errors in the console", errors.length, 0, errors.slice(0, 2).join(" | "));
  w.close();

  /* ---- 7. the duplicate pages are gone ---- */
  t.ok("the products alias is gone", !fs.existsSync(path.join(ROOT, "products.html")));
  t.ok("the portal alias is gone", !fs.existsSync(path.join(ROOT, "portal.html")));
  t.ok("the loan-products page remains", fs.existsSync(path.join(ROOT, "loan-products.html")));

  /* ---- 8. the artwork is the supplied brand ---- */
  const mark = read("assets/img/logo-mark.svg");
  t.ok("the mark carries the supplied emblem", /data:image\/png;base64/.test(mark));
  t.ok("the mark sits on the navy tile", /#0b1d35/.test(mark) && /#020817/.test(mark));
  t.ok("the lockup carries the gold wordmark", /JAY C O B/.test(read("assets/img/logo-full-light.svg")));
  t.ok("a share card exists", fs.existsSync(path.join(ROOT, "assets/img/logo-social.jpg")));
  t.ok("downloaded documents use the brand lockup",
    /logo-full-light\.svg/.test(read("assets/js/ui.js")) && /inlineLockup\(/.test(read("assets/js/ui.js")));

  process.exit(t.done() ? 0 : 1);
})();
