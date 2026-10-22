/* The connection-check page must diagnose a healthy project correctly. */
"use strict";

const { reporter, makeDom, ready, sleep } = require("./lib");

(async () => {
  const t = reporter("[system-check.html]");
  const { dom, errors } = makeDom("system-check.html");
  await ready(dom, 1800);
  const w = dom.window;

  const rows = () => [...w.document.querySelectorAll("#check-rows tr")];
  const row = (name) => rows().find((r) => r.textContent.includes(name));

  t.ok("checks rendered", rows().length >= 6, rows().length + " rows");

  const config = row("Runtime configuration");
  t.ok("configuration ok", config && config.className === "is-ok", config && config.textContent);
  t.ok("auth service ok", (row("Authentication service") || {}).className === "is-ok");
  ["Profiles table", "Website documents table", "Portal database table", "Customer documents table", "Enquiries table"]
    .forEach((name) => {
      const r = row(name);
      t.ok("table: " + name, !!r && /is-ok|is-warn/.test(r.className), r && r.textContent);
    });
  t.ok("documents published", (row("Website documents") || {}).className === "is-ok");
  t.ok("media bucket checked", /is-ok|is-warn/.test((row("Media storage") || {}).className || ""));
  t.ok("summary reports a healthy project",
    /checks out|worth checking/i.test(w.document.getElementById("check-summary").textContent));

  console.log("\n[system-check.html — sign-in test]");
  w.document.getElementById("check-email").value = "admin@jaycob.mw";
  w.document.getElementById("check-password").value = "Admin123!";
  w.document.getElementById("check-form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
  await sleep(1500);
  t.ok("sign-in passes", (row("Account sign-in") || {}).className === "is-ok");
  t.ok("staff role recognised", (row("Administrator role") || {}).className === "is-ok");
  t.ok("write test passes", (row("Write test (admin)") || {}).className === "is-ok");

  w.JCOB_CLOUD.auth.signOut();
  await sleep(300);
  w.document.getElementById("check-email").value = "customer@jaycob.mw";
  w.document.getElementById("check-password").value = "Customer123!";
  w.document.getElementById("check-form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
  await sleep(1500);
  const admin = rows().filter((r) => r.textContent.includes("Administrator role")).pop();
  t.ok("customer flagged as non-staff", !!admin && admin.className === "is-warn", admin && admin.textContent);
  t.ok("promotion hint shown", !!admin && /promote_staff/.test(admin.textContent));

  t.eq("no script errors", errors.length, 0, errors.slice(0, 2).join(" | "));
  process.exit(t.done() ? 0 : 1);
})();
