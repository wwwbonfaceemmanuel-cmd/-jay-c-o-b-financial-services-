/* Protected details and change requests.
   ---------------------------------------------------------------------
   The brief: a customer must not be able to change a confidential detail
   "anyhow" — a change needs a valid reason, and staff decide. This suite
   proves both halves against the live stand-in database:

     • the dashboard shows protected details read-only, with a request flow
     • a request without a real reason is refused and writes nothing
     • a valid request is stored in Supabase (customer_docs), pending review,
       and the protected value does not move
     • the console sees the request and, on approval, writes the new value
       into the customer's document and notifies them
   ===================================================================== */
"use strict";

const { reporter, makeDom, ready, sleep, rest, API } = require("./lib");

const CUSTOMER = { email: "customer@jaycob.mw", password: "Customer123!" };
const STAFF = { email: "admin@jaycob.mw", password: "Admin123!" };

async function token(creds) {
  const res = await fetch(API + "/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: { apikey: process.env.TEST_ANON || "dev-anon", "Content-Type": "application/json" },
    body: JSON.stringify(creds)
  });
  return res.json();
}

function sessionOf(auth) {
  return {
    access_token: auth.access_token, refresh_token: auth.refresh_token,
    expires_at: Date.now() + 3600 * 1000, token_type: "bearer", user: auth.user
  };
}

function clickText(root, text) {
  return [...root.querySelectorAll("button, .btn")].filter((b) => b.textContent.trim() === text)[0] || null;
}

(async () => {
  const t = reporter("[protected details — a request, not an edit]");
  const auth = await token(CUSTOMER);
  const session = sessionOf(auth);
  const owner = auth.user.id;
  /* the value the customer asks for, unique per run so repeated runs on the
     same database still find their own record */
  const marker = "Test Name " + Date.now();

  /* ---- 1. the dashboard refuses to edit, and asks for a reason ---- */
  {
    const { dom, errors } = makeDom("dashboard.html", {
      hash: "#settings",
      seed: { jcob_cloud_session_v1: JSON.stringify(session) }
    });
    await ready(dom, 1800);
    const w = dom.window;
    const d = w.document;
    const text = d.body.textContent.replace(/\s+/g, " ");

    t.ok("settings lists the protected details", /Protected details/.test(text));
    t.ok("the policy is explained", /a change is a request, not an edit/i.test(text));
    const buttons = [...d.querySelectorAll("[data-request-change]")];
    t.eq("all five protected details offer a request", buttons.length, 5);

    const before = w.JCOB_DATA.get().profile.fullName;
    const beforeCount = (w.JCOB_DATA.get().changeRequests || []).length;

    /* A request with no reason must be refused. */
    buttons[0].click();
    await sleep(200);
    let modal = d.getElementById("ui-modal");
    t.ok("the request dialog opens", !!modal && /Request a change/.test(modal.textContent));
    modal.querySelector("#cr-value").value = marker;
    clickText(modal, "Submit request").click();
    await sleep(300);
    t.ok("a request without a reason is refused", /at least 20 characters/.test(modal.textContent));
    t.eq("nothing is stored without a reason", (w.JCOB_DATA.get().changeRequests || []).length, beforeCount);

    /* With a reason it is stored, pending review, and nothing moves. */
    modal.querySelector("#cr-reason").value = "My national ID card was reissued after marriage and I can upload the new card.";
    modal.querySelector("#cr-confirm").checked = true;
    clickText(modal, "Submit request").click();
    await sleep(1200);

    const requests = w.JCOB_DATA.get().changeRequests || [];
    const mine = requests.filter((r) => r.requested === marker)[0];
    t.ok("the request is recorded", !!mine);
    t.eq("exactly one request was filed", requests.length, beforeCount + 1);
    t.eq("it is pending review", mine && mine.status, "Pending review");
    t.eq("it names the protected field", mine && mine.field, "fullName");
    t.eq("the protected value is untouched", w.JCOB_DATA.get().profile.fullName, before);
    t.eq("the reason is kept with the record", (w.JCOB_DATA.get().profileAudit || []).length >= 1, true);

    /* The database has it too — the browser is not the store. */
    const rows = await rest("customer_docs?owner=eq." + owner + "&select=data");
    const stored = (rows[0] && rows[0].data && rows[0].data.changeRequests) || [];
    const storedMine = stored.filter((r) => r.requested === marker)[0];
    t.ok("the request reached Supabase", !!storedMine);
    t.eq("Supabase holds it pending", storedMine && storedMine.status, "Pending review");
    t.eq("Supabase still holds the old name", rows[0] && rows[0].data.profile.fullName, before);

    /* The profile form cannot type over the same details. */
    w.location.hash = "#profile";
    await sleep(600);
    const name = d.getElementById("pf-name");
    const phone = d.getElementById("pf-phone");
    t.ok("the legal name is read-only", !!name && name.readOnly);
    t.ok("the registered phone is read-only", !!phone && phone.readOnly);
    t.ok("a reason is required for ordinary edits",
      /reason/i.test(d.getElementById("profile-form").textContent));

    t.eq("no script errors in the dashboard", errors.length, 0, errors.slice(0, 2).join(" | "));
    w.close();
  }

  /* ---- 2. the console decides the request ---- */
  {
    const { dom, errors } = makeDom("admin.html", { hash: "#/changeRequests" });
    await ready(dom, 1200);
    const w = dom.window;
    const d = w.document;

    d.getElementById("admin-email").value = STAFF.email;
    d.getElementById("admin-password").value = STAFF.password;
    d.getElementById("admin-gate-form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
    await sleep(6000);

    const view = d.getElementById("content").textContent.replace(/\s+/g, " ");
    t.ok("the console has a change-request module", /Detail Change Requests/.test(view));
    t.ok("the customer's request is listed", /CHG-/.test(view));
    t.ok("it is marked pending", /Pending review/.test(view));

    const requestId = (await rest("customer_docs?owner=eq." + owner + "&select=data"))[0].data
      .changeRequests.filter((r) => r.requested === marker)[0].id;
    const row = [...d.querySelectorAll("tr")].filter((r) => r.textContent.indexOf(requestId) > -1)[0];
    const approve = row && row.querySelector("[data-act=crApprove]");
    t.ok("staff can approve it", !!approve);
    approve.click();
    await sleep(300);
    const confirm = d.querySelector("[data-mact=ok]");
    t.ok("approval asks for confirmation", !!confirm);
    confirm.click();
    await sleep(2500);

    const rows = await rest("customer_docs?owner=eq." + owner + "&select=data");
    const data = rows[0] && rows[0].data;
    const decided = data.changeRequests.filter((r) => r.id === requestId)[0];
    t.eq("approval is written to the customer's record", decided && decided.status, "Approved");
    t.eq("the approved value is applied", data.profile.fullName, marker);
    t.ok("the customer is notified",
      /Change request approved/.test((data.notifications || [])[0].title));
    t.ok("the console shows it as approved", /Approved/.test(d.getElementById("content").textContent));

    t.eq("no script errors in the console", errors.length, 0, errors.slice(0, 2).join(" | "));
    w.close();
  }

  process.exit(t.done() ? 0 : 1);
})();
