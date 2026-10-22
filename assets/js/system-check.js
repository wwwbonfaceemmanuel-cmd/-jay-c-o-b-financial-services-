/* =====================================================================
   JAY C O B FINANCIAL SERVICES — connection check
   ---------------------------------------------------------------------
   Opens on system-check.html. Talks straight to Supabase with the public
   anon key and reports, one line at a time, whether the project is ready:

     • which configuration is in use (Railway env or config.js)
     • whether the API answers at all
     • which tables exist and whether RLS lets the anon role read them
     • whether the first website documents have been published
     • whether email/password sign-in works, and what role the account has
     • an optional write test performed as a signed-in administrator

   Nothing here is required for the site to run — it is a diagnostic that
   turns "it does not work" into a specific instruction.
   ===================================================================== */
(function () {
  "use strict";

  var CLOUD = window.JCOB_CLOUD;
  var CFG = window.JCOB_CONFIG || {};
  var ENV = window.__JCOB_ENV__ || {};

  var rows = [];
  var summary = document.getElementById("check-summary");
  var body = document.getElementById("check-rows");
  var detail = document.getElementById("check-detail");

  function $(id) { return document.getElementById(id); }

  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function add(name, state, note, fix) {
    rows.push({ name: name, state: state, note: note || "", fix: fix || "" });
    paint();
  }

  function icon(state) {
    if (state === "ok") return "✓";
    if (state === "warn") return "!";
    if (state === "fail") return "✕";
    return "…";
  }

  function paint() {
    if (!body) return;
    body.innerHTML = rows.map(function (r) {
      return '<tr class="is-' + r.state + '">' +
        '<td class="check-icon">' + icon(r.state) + "</td>" +
        "<td><strong>" + esc(r.name) + "</strong>" +
        (r.note ? '<div class="check-note">' + r.note + "</div>" : "") +
        (r.fix ? '<div class="check-fix">' + esc(r.fix) + "</div>" : "") +
        "</td></tr>";
    }).join("");

    var fails = rows.filter(function (r) { return r.state === "fail"; }).length;
    var warns = rows.filter(function (r) { return r.state === "warn"; }).length;
    if (!summary) return;
    if (!rows.length) return;
    summary.className = "check-summary" + (fails ? " is-fail" : warns ? " is-warn" : " is-ok");
    summary.innerHTML = fails
      ? "<strong>" + fails + " thing" + (fails > 1 ? "s" : "") + " need" + (fails > 1 ? "" : "s") +
        " fixing before the site can save to Supabase.</strong> Follow the instruction under each red line."
      : warns
        ? "<strong>Connected, with " + warns + " thing" + (warns > 1 ? "s" : "") + " worth checking.</strong> The site and portal can save to Supabase."
        : "<strong>Everything checks out.</strong> The website and the admin console are saving to Supabase.";
  }

  /* ---------------- individual checks ---------------- */

  function checkConfig() {
    var url = CLOUD && CLOUD.url;
    var key = CLOUD && CLOUD.key;
    var fromEnv = !!(ENV.supabaseUrl && ENV.supabaseUrl === url);
    if (!url || !key) {
      add("Runtime configuration", "fail",
        "No Supabase URL or anon key was found, so the site is staying in demo mode.",
        "Set SUPABASE_URL and SUPABASE_ANON_KEY in Railway, or paste them into assets/js/config.js.");
      return;
    }
    add("Runtime configuration", "ok",
      "Project <code>" + esc(url.replace(/^https?:\/\//, "")) + "</code> · key ends <code>…" +
      esc(String(key).slice(-6)) + "</code> · source: " + (fromEnv ? "Railway environment" : "assets/js/config.js"));
  }

  function checkAuthSettings() {
    if (!CLOUD || !CLOUD.enabled) return Promise.resolve();
    return window.fetch(CLOUD.url + "/auth/v1/settings", {
      headers: { apikey: CLOUD.key, Authorization: "Bearer " + CLOUD.key },
      cache: "no-store"
    }).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    }).then(function (json) {
      var confirm = json.mailer_autoconfirm === true;
      add("Authentication service", "ok",
        "Email sign-in is available · email confirmation is " +
        (confirm ? "<strong>off</strong> (sign-up signs in immediately)" : "<strong>on</strong> (users must click the link first)"));
      var providers = Object.keys(json.external || {}).filter(function (k) { return json.external[k]; });
      if (providers.length) {
        add("External providers", "warn",
          "Also enabled: " + esc(providers.join(", ")) + " — not used by this site yet.", "");
      }
    }).catch(function (err) {
      add("Authentication service", "fail",
        "Could not read the auth settings (" + esc(err.message) + ").",
        "Check the project URL; a paused project returns errors too.");
    });
  }

  function checkTable(label, table, expectRows) {
    if (!CLOUD || !CLOUD.enabled) return Promise.resolve();
    var url = CLOUD.url + "/rest/v1/" + table + "?select=*&limit=1";
    return window.fetch(url, {
      headers: {
        apikey: CLOUD.key,
        Authorization: "Bearer " + CLOUD.key,
        Prefer: "count=exact"
      },
      cache: "no-store"
    }).then(function (res) {
      return res.text().then(function (text) {
        if (res.status === 404) {
          add(label, "fail",
            "Table <code>" + esc(table) + "</code> does not exist.",
            "Run supabase/schema.sql in the Supabase SQL editor.");
          return;
        }
        if (res.status === 401 || res.status === 403 || res.status === 406) {
          add(label, "warn",
            "<code>" + esc(table) + "</code> exists but the public key may not read it (HTTP " + res.status + "). This is expected for staff-only tables.",
            "");
          return;
        }
        if (!res.ok) {
          add(label, "fail", "HTTP " + res.status + " from <code>" + esc(table) + "</code>: " + esc(text.slice(0, 160)),
            "Check the RLS policies for this table.");
          return;
        }
        var parsed = [];
        try { parsed = JSON.parse(text || "[]"); } catch (e) {}
        var count = parsed.length;
        if (expectRows && count === 0) {
          add(label, "warn",
            "<code>" + esc(table) + "</code> is reachable but empty.",
            "Open the admin console, change something and save it.");
        } else {
          add(label, "ok",
            "<code>" + esc(table) + "</code> reachable" + (count ? " · 1 row sampled" : " · empty"));
        }
      });
    }).catch(function (err) {
      add(label, "fail", "Network error reaching Supabase: " + esc(err.message),
        "Check that the project is running and the URL has no trailing slash.");
    });
  }

  function checkDocuments() {
    if (!CLOUD || !CLOUD.enabled) return Promise.resolve();
    return window.fetch(CLOUD.url + "/rest/v1/site_docs?select=id&order=id", {
      headers: { apikey: CLOUD.key, Authorization: "Bearer " + CLOUD.key },
      cache: "no-store"
    }).then(function (res) { return res.ok ? res.json() : []; })
      .then(function (rowsOut) {
        var have = (rowsOut || []).map(function (r) { return r.id; });
        var need = ["settings", "products", "content", "sections", "live_posts"];
        var missing = need.filter(function (id) { return have.indexOf(id) < 0; });
        if (!missing.length) {
          add("Website documents", "ok", "settings · products · content · sections · live_posts all published");
        } else {
          add("Website documents", "warn",
            "Missing: " + esc(missing.join(", ")) + ". The site falls back to its built-in defaults until the console publishes them.",
            "Sign in to the admin console once and save Website Settings, or change the catalogue.");
        }
      }).catch(function () {
        add("Website documents", "fail", "Could not list the website documents.",
          "Run supabase/schema.sql, then reload this page.");
      });
  }

  function checkStorage() {
    if (!CLOUD || !CLOUD.enabled) return Promise.resolve();
    var probe = CLOUD.url + "/storage/v1/object/public/site-media/.probe";
    return window.fetch(probe, { method: "GET", cache: "no-store" })
      .then(function (res) {
        /* 400/404 both mean "bucket answers"; a missing bucket returns 404
           with a "Bucket not found" body, so read the body too. */
        return res.text().then(function (text) {
          if (/bucket not found/i.test(text)) {
            add("Media storage", "fail", "The <code>site-media</code> bucket is missing.",
              "Re-run the storage section of supabase/schema.sql, or create the bucket in Dashboard → Storage.");
          } else {
            add("Media storage", "ok", "Public <code>site-media</code> bucket answers (live-feed photos can upload)");
          }
        });
      })
      .catch(function (err) {
        add("Media storage", "warn", "Could not probe the media bucket: " + esc(err.message), "");
      });
  }

  /* ---------------- sign-in + staff checks ---------------- */

  function wireSignIn() {
    var form = $("check-form");
    if (!form) return;
    if (!CLOUD || !CLOUD.enabled) {
      form.querySelector("button").disabled = true;
      return;
    }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = $("check-email").value.trim();
      var password = $("check-password").value;
      var status = $("check-status");
      if (!email || !password) return;
      status.className = "form-status is-visible";
      status.textContent = "Signing in…";
      CLOUD.auth.signIn(email, password).then(function (res) {
        var profile = res.profile || CLOUD.auth.profile();
        var role = (profile && profile.role) || "unknown";
        status.className = "form-status is-visible";
        status.textContent = "Signed in as " + (profile && profile.full_name || email) + " · role: " + role;
        add("Account sign-in", "ok", "Signed in · role <code>" + esc(role) + "</code>" +
          (profile && profile.account_no ? " · account <code>" + esc(profile.account_no) + "</code>" : ""));
        if (CLOUD.auth.isStaff(profile)) {
          add("Administrator role", "ok", "This account can open the admin console.");
          runWriteTest();
        } else {
          add("Administrator role", "warn",
            "This is a customer account, so admin.html will refuse it — by design.",
            "Promote it: select public.promote_staff('" + esc(email) + "');");
        }
      }).catch(function (err) {
        var message = String((err && err.message) || "Sign-in failed");
        status.className = "form-status is-visible form-status--error";
        status.textContent = message;
        add("Account sign-in", "fail", "Sign-in failed: " + esc(message),
          "Create the user in Authentication → Users, then promote it with promote_staff().");
      });
    });
  }

  function runWriteTest() {
    if (!CLOUD || !CLOUD.enabled) return;
    CLOUD.docs.put("site", "diag_probe", { at: new Date().toISOString(), by: "system-check" })
      .then(function () {
        add("Write test (admin)", "ok", "A probe document was written to <code>site_docs</code> — RLS accepts this account.");
      })
      .catch(function (err) {
        add("Write test (admin)", "fail", "The write was refused: " + esc((err && err.message) || "unknown error"),
          "The account is signed in but not recognised as staff by the policies.");
      });
  }

  /* ---------------- boot ---------------- */

  function run() {
    if (!CLOUD) {
      add("Cloud client", "fail", "assets/js/cloud.js did not load.", "Check the script tags at the bottom of this page.");
      return;
    }
    if (detail) {
      detail.textContent = CLOUD.enabled
        ? "Live checks against " + CLOUD.url.replace(/^https?:\/\//, "") + " — refreshed each time you open this page."
        : "No credentials found: the site is in demo mode.";
    }
    checkConfig();
    if (!CLOUD.enabled) {
      paint();
      return;
    }
    add("Cloud client", "ok", "assets/js/cloud.js loaded and cloud mode is on.");
    checkAuthSettings();
    checkTable("Profiles table", "profiles", true);
    checkTable("Website documents table", "site_docs", true);
    checkTable("Portal database table", "portal_docs", false);
    checkTable("Customer documents table", "customer_docs", false);
    checkTable("Enquiries table", "enquiries", false);
    checkDocuments();
    checkStorage();
    wireSignIn();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})();
