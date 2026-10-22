/* =====================================================================
   JAY C O B Financial Services — customer document store
   ---------------------------------------------------------------------
   One document per customer. Every read and write goes through this
   module, so the dashboard never needs to know where it is stored:

     • Cloud mode  — one row per signed-in customer in Supabase
                     (customer_docs), mirrored to localStorage as an
                     offline cache.
     • Demo mode   — one browser-local document, and only when
                     demonstration mode has been asked for (?demo=1).
                     assets/js/demo-customer.js supplies that document.

   A new account starts empty: no loans, no applications, no balances and
   no borrowed identity. Demonstration data is never mixed into it.
   ===================================================================== */
(function () {
  "use strict";

  var KEY = "jcob_app_v2";        /* v2: production documents (v1 held demo data) */
  var DEMO_KEY = "jcob_app_v1";   /* demonstration documents stay on the old key */
  var F = window.JCOB_FINANCE;
  var DEMO = window.JCOB_DEMO;

  function demoOn() { return !!(DEMO && DEMO.on()); }
  function today() { return new Date().toISOString().slice(0, 10); }

  /* ---------------- shape of an account that has never borrowed ------- */
  function blankProfile() {
    return {
      firstName: "", lastName: "", fullName: "", dob: "", gender: "",
      nid: "", phone: "", email: "", address: "", district: "",
      occupation: "", employer: "", monthlyIncome: 0, monthlyExpenses: 0,
      nextOfKin: { name: "", relationship: "", phone: "" },
      contactPreference: "SMS",
      accountNumber: "", accountStatus: "Active",
      verification: "Not verified", kyc: "Not submitted",
      avatar: "", memberSince: today()
    };
  }

  function defaultSecurity() {
    return {
      mfa: false, passwordChanged: null, failedAttempts: 0, locked: false,
      lastLogin: null, recoveryEmail: "", recoveryPhone: ""
    };
  }

  function defaultSettings() {
    return {
      language: "en",
      currency: "MWK",
      notifications: { email: true, sms: true, inApp: true, repaymentReminders: true, marketing: false, security: true },
      privacy: { shareWithAdvisors: true, analytics: false },
      accessibility: { largeText: false, reduceMotion: false, highContrast: false }
    };
  }

  function blankSavings() {
    return { accountNumber: "", balance: 0, interestEarned: 0, rate: 0, status: "Not opened", opened: "", goals: [] };
  }

  /* An account with nothing in it yet. Used for every new sign-up and as
     the fallback when a stored document is missing or unreadable. */
  function empty() {
    return {
      profile: blankProfile(),
      applications: [], loans: [], transactions: [], deposits: [],
      withdrawals: [], transfers: [], savings: blankSavings(),
      notifications: [], tickets: [], documents: [],
      sessions: [], logins: [],
      security: defaultSecurity(),
      settings: defaultSettings(),
      statements: [], drafts: [], wallet: {}
    };
  }

  /* Demonstration document (only reachable through ?demo=1). */
  function seed() {
    if (demoOn() && window.JCOB_DEMO_CUSTOMER) return window.JCOB_DEMO_CUSTOMER();
    return empty();
  }



  /* ---------------- Storage ----------------
     Demo mode keeps one document in localStorage.
     Cloud mode keeps one document per signed-in customer in Supabase
     (customer_docs) and mirrors it to localStorage as an offline cache.
     Every function in the dashboard goes through persist(), so nothing
     else in the project needs to know which mode is active.
     ------------------------------------------------------------------ */
  var CLOUD = window.JCOB_CLOUD;
  var remote = {
    enabled: !!(CLOUD && CLOUD.enabled),
    state: CLOUD && CLOUD.enabled ? "connecting" : "local",
    at: null,
    error: null
  };
  var hydrating = !!(CLOUD && CLOUD.enabled);
  var pushTimer = null;

  function cloudOn() { return !!(CLOUD && CLOUD.enabled); }
  function uid() {
    var user = CLOUD && CLOUD.auth && CLOUD.auth.user();
    return user && user.id ? user.id : null;
  }
  function cacheKey() {
    /* Demonstration documents keep their old key, so a browser that once
       used demo mode can never show that data in the live system. */
    if (demoOn()) return DEMO_KEY;
    var id = cloudOn() ? uid() : null;
    return id ? KEY + ":" + id : KEY;
  }

  function read() {
    try {
      var raw = window.localStorage.getItem(cacheKey());
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      /* A document written by an earlier version (or a partial cloud record)
         must not leave the dashboard without settings/security blocks. */
      return parsed && parsed.profile ? normalise(parsed) : null;
    } catch (e) {
      return null;
    }
  }

  var db = read() || seed();

  function saveCache() {
    try {
      window.localStorage.setItem(cacheKey(), JSON.stringify(db));
      return true;
    } catch (e) {
      return false;
    }
  }

  function pushCloud() {
    if (!cloudOn() || !uid()) return Promise.resolve(null);
    remote.state = "saving";
    return CLOUD.customer.save(db).then(function (row) {
      remote.state = "synced";
      remote.at = new Date().toISOString();
      remote.error = null;
      return row;
    }).catch(function (err) {
      remote.state = "error";
      remote.error = String((err && err.message) || err);
      return null;
    });
  }

  function persist() {
    var ok = saveCache();
    if (cloudOn() && !hydrating) {
      if (pushTimer) clearTimeout(pushTimer);
      pushTimer = setTimeout(function () { pushTimer = null; pushCloud(); }, 400);
    }
    return ok;
  }

  function get() { return db; }
  function save() { return persist(); }
  function reset() {
    db = seed();
    persist();
    return db;
  }

  /* Empty but valid document for a brand-new cloud account. Only the
     details the person gave us at sign-up are copied in — never a
     demonstration profile. */
  function blank(meta) {
    var doc = empty();
    var key;
    for (key in (meta || {})) {
      if (Object.prototype.hasOwnProperty.call(meta, key) && meta[key] !== undefined && meta[key] !== null) {
        doc.profile[key] = meta[key];
      }
    }
    return doc;
  }

  /* Fill in any keys an older cloud document may not have yet. */
  function normalise(data) {
    var shape = empty();
    var out = Object.assign({}, data);
    ["applications", "loans", "transactions", "deposits", "withdrawals", "transfers",
      "notifications", "tickets", "documents", "statements", "drafts",
      "sessions", "logins"].forEach(function (k) {
      if (!Array.isArray(out[k])) out[k] = [];
    });
    if (!out.savings || typeof out.savings !== "object" || Array.isArray(out.savings)) out.savings = blankSavings();
    if (!Array.isArray(out.savings.goals)) out.savings.goals = [];
    if (!out.profile) out.profile = shape.profile;
    if (!out.security) out.security = shape.security;
    if (!out.settings) out.settings = shape.settings;
    if (!out.wallet || typeof out.wallet !== "object") out.wallet = {};
    return out;
  }

  function hydrate() {
    if (!cloudOn() || !uid()) return Promise.resolve(false);
    hydrating = true;
    return CLOUD.customer.load().then(function (row) {
      if (row && row.data && row.data.profile) {
        db = normalise(row.data);
        saveCache();
        remote.state = "synced";
        remote.at = row.updated_at || new Date().toISOString();
        remote.error = null;
      } else {
        var user = CLOUD.auth.user() || {};
        var meta = user.user_metadata || {};
        db = blank({
          fullName: meta.full_name || (CLOUD.auth.profile() || {}).full_name || "",
          phone: meta.phone || "",
          email: user.email || "",
          nid: meta.nid || "",
          dob: meta.dob || "",
          gender: meta.gender || "",
          accountNumber: (CLOUD.auth.profile() || {}).account_no || ""
        });
        db.profile.avatar = (db.profile.fullName || "?").split(" ").map(function (w) { return w.charAt(0); }).join("").slice(0, 2).toUpperCase();
        saveCache();
        hydrating = false;
        return pushCloud().then(function () { return true; });
      }
      hydrating = false;
      try { document.dispatchEvent(new CustomEvent("jcob:data-ready", { detail: db })); } catch (e) {}
      return true;
    }).catch(function (err) {
      hydrating = false;
      remote.state = "offline";
      remote.error = String((err && err.message) || err);
      return false;
    });
  }

  /* ---------------- Helpers ---------------- */
  function uid(prefix) {
    return (prefix || "ID") + "-" + Date.now().toString(36).toUpperCase().slice(-6);
  }

  function reference(prefix) {
    var year = new Date().getFullYear();
    var n = Math.floor(1000 + Math.random() * 9000);
    return prefix + "-" + year + "-" + n;
  }

  function notify(type, title, body, channel) {
    var item = {
      id: "N-" + Date.now().toString(36).toUpperCase(),
      type: type, title: title, body: body,
      date: new Date().toISOString(),
      read: false,
      channel: channel || "In-app"
    };
    db.notifications.unshift(item);
    persist();
    if (window.JCOB_UI && window.JCOB_UI.toast) {
      window.JCOB_UI.toast({ title: title, message: body, type: "info" });
    }
    if (window.JCOB_UI && window.JCOB_UI.updateBell) window.JCOB_UI.updateBell();
    return item;
  }

  function unreadCount() {
    return db.notifications.filter(function (n) { return !n.read; }).length;
  }

  function activeLoans() {
    return db.loans.filter(function (l) {
      return l.status === "Active" || l.status === "In arrears";
    });
  }

  function totals() {
    var loans = activeLoans();
    var outstanding = loans.reduce(function (s, l) {
      return s + l.outstandingPrincipal + l.outstandingInterest + (l.outstandingFees || 0);
    }, 0);
    var borrowed = db.loans.reduce(function (s, l) { return s + l.principal; }, 0);
    var repaid = db.loans.reduce(function (s, l) { return s + l.paid; }, 0);
    var next = loans.slice().sort(function (a, b) {
      return new Date(a.nextDue) - new Date(b.nextDue);
    })[0];
    return {
      activeCount: loans.length,
      outstanding: outstanding,
      borrowed: borrowed,
      repaid: repaid,
      nextAmount: next ? next.nextAmount : 0,
      nextDue: next ? next.nextDue : null,
      nextLoan: next ? next.id : null,
      pendingApplications: db.applications.filter(function (a) {
        return ["pending", "under_review", "info_required"].indexOf(a.status) >= 0;
      }).length,
      approvedApplications: db.applications.filter(function (a) { return a.status === "approved"; }).length
    };
  }

  function addTransaction(tx) {
    var item = Object.assign({
      ref: "TX-" + Math.floor(90000 + Math.random() * 9000),
      date: new Date().toISOString(),
      status: "Completed",
      direction: "debit",
      method: "Internal",
      balance: 0
    }, tx);
    db.transactions.unshift(item);
    persist();
    return item;
  }

  function findLoan(id) {
    return db.loans.filter(function (l) { return l.id === id; })[0] || null;
  }

  function findApplication(ref) {
    return db.applications.filter(function (a) { return a.ref === ref; })[0] || null;
  }

  function removeDraft(id) {
    db.drafts = db.drafts.filter(function (d) { return d.id !== id; });
    persist();
  }

  window.JCOB_DATA = {
    KEY: KEY,
    get: get,
    save: save,
    reset: reset,
    seed: seed,
    uid: uid,
    reference: reference,
    notify: notify,
    unreadCount: unreadCount,
    activeLoans: activeLoans,
    totals: totals,
    addTransaction: addTransaction,
    findLoan: findLoan,
    findApplication: findApplication,
    removeDraft: removeDraft,
    hydrate: hydrate,
    remote: remote,
    cloud: cloudOn,
    cacheKey: cacheKey
  };

  /* Demo mode: seed on first visit so every panel has content to show.
     Cloud mode: pull this customer's document first — never publish a
     seed over a real record. */
  if (cloudOn()) {
    hydrate();
    document.addEventListener("jcob:auth", function () { hydrate(); });
  } else if (!read()) {
    persist();
  }
})();
