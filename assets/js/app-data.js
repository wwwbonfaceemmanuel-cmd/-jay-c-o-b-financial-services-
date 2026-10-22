/* =====================================================================
   JAY C O B Financial Services — demo data store
   Everything lives in localStorage today. Every read/write goes through
   this module so Supabase can replace the storage layer in one place.
   ===================================================================== */
(function () {
  "use strict";

  var KEY = "jcob_app_v1";
  var F = window.JCOB_FINANCE;

  function iso(daysAgo, hour) {
    var d = new Date();
    d.setDate(d.getDate() - (daysAgo || 0));
    if (hour !== undefined) d.setHours(hour, 15, 0, 0);
    return d.toISOString();
  }

  function dateOnly(daysFromNow) {
    var d = new Date();
    d.setDate(d.getDate() + (daysFromNow || 0));
    return d.toISOString().slice(0, 10);
  }

  function seed() {
    var loanA = F.amortize({
      principal: 5000000, rate: 24, termMonths: 24, method: "reducing",
      frequency: "monthly", processingFeePct: 2, adminFee: 25000,
      startDate: new Date(2026, 1, 5)
    });
    var loanB = F.amortize({
      principal: 1500000, rate: 26, termMonths: 12, method: "flat",
      frequency: "monthly", processingFeePct: 2, adminFee: 15000,
      startDate: new Date(2026, 5, 12)
    });

    var rowsA = loanA.rows.map(function (r, i) {
      var status = i < 8 ? "paid" : i === 8 ? "due" : "upcoming";
      return {
        n: r.n, date: r.date.toISOString(), payment: r.payment, interest: r.interest,
        principal: r.principal, closing: r.closing, fees: 0, paid: status === "paid" ? r.payment : 0,
        status: status
      };
    });
    var rowsB = loanB.rows.map(function (r, i) {
      var status = i < 3 ? "paid" : i === 3 ? "overdue" : "upcoming";
      return {
        n: r.n, date: r.date.toISOString(), payment: r.payment, interest: r.interest,
        principal: r.principal, closing: r.closing, fees: 0, paid: status === "paid" ? r.payment : 0,
        status: status
      };
    });

    return {
      profile: {
        firstName: "Memory",
        lastName: "Tembo",
        fullName: "Memory Tembo",
        dob: "1991-04-18",
        gender: "Female",
        nid: "MWI-8842-1130",
        phone: "+265 999 123 456",
        email: "demo@jaycobfinancial.mw",
        address: "Plot 47/3, Area 47, Sector 3, Lilongwe",
        district: "Lilongwe",
        occupation: "Retail business owner",
        employer: "Tembo Traders",
        monthlyIncome: 1450000,
        monthlyExpenses: 620000,
        nextOfKin: { name: "Grace Tembo", relationship: "Sister", phone: "+265 888 456 789" },
        contactPreference: "WhatsApp",
        accountNumber: "JC-ACC-100412",
        accountStatus: "Active",
        verification: "Verified",
        kyc: "Verified",
        avatar: "MT",
        memberSince: "2019-03-11"
      },
      applications: [
        {
          ref: "APP-2026-0412", product: "Personal Loan", amount: 5000000, term: 24,
          purpose: "Working capital for shop expansion", submitted: iso(42),
          status: "approved", stage: 7, reviewer: "Approved at 24% p.a., 24 months.",
          documents: ["National ID", "Proof of income", "Proof of residence", "Bank statement"]
        },
        {
          ref: "APP-2026-0587", product: "Business Loan", amount: 3500000, term: 18,
          purpose: "Purchase of delivery vehicle", submitted: iso(9),
          status: "info_required", stage: 4,
          reviewer: "Please upload the 2025 tax clearance certificate and a six-month bank statement for the business account.",
          missing: ["Tax clearance certificate", "Business bank statement (6 months)"],
          documents: ["National ID", "Business registration", "Proof of income"]
        },
        {
          ref: "APP-2026-0611", product: "Emergency Loan", amount: 450000, term: 6,
          purpose: "Medical expenses", submitted: iso(2), status: "under_review", stage: 6,
          documents: ["National ID", "Proof of income"]
        },
        {
          ref: "APP-2026-0201", product: "Salary-based Loan", amount: 1200000, term: 12,
          purpose: "School fees", submitted: iso(120), status: "rejected", stage: 7,
          reviewer: "Affordability below policy minimum at the requested amount. You may reapply from 01 December 2026."
        }
      ],
      loans: [
        {
          id: "LN-2026-0412", product: "Personal Loan", principal: 5000000,
          approved: 5000000, disbursed: 4900000, rate: 24, method: "reducing",
          frequency: "monthly", startDate: loanA.rows[0].date.toISOString(),
          maturity: loanA.rows[loanA.rows.length - 1].date.toISOString(),
          totalRepayment: loanA.totalRepayment, fees: loanA.fees,
          paid: loanA.payment * 8, outstandingPrincipal: loanA.rows[7].closing,
          outstandingInterest: loanA.totalInterest - loanA.rows.slice(0, 8).reduce(function (s, r) { return s + r.interest; }, 0),
          outstandingFees: 0, nextAmount: loanA.payment, nextDue: loanA.rows[8].date.toISOString(),
          status: "Active", progress: 62, rows: rowsA, payment: loanA.payment,
          guarantor: { name: "Grace Tembo", phone: "+265 888 456 789", relationship: "Sister" },
          statusHistory: [
            { status: "Application submitted", date: iso(42) },
            { status: "Approved", date: iso(38) },
            { status: "Agreement signed", date: iso(36) },
            { status: "Disbursed", date: iso(35) },
            { status: "Active", date: iso(35) }
          ]
        },
        {
          id: "LN-2026-0588", product: "Emergency Loan", principal: 1500000,
          approved: 1500000, disbursed: 1470000, rate: 26, method: "flat",
          frequency: "monthly", startDate: loanB.rows[0].date.toISOString(),
          maturity: loanB.rows[loanB.rows.length - 1].date.toISOString(),
          totalRepayment: loanB.totalRepayment, fees: loanB.fees,
          paid: loanB.payment * 3, outstandingPrincipal: loanB.rows[2].closing,
          outstandingInterest: loanB.totalInterest - loanB.rows.slice(0, 3).reduce(function (s, r) { return s + r.interest; }, 0),
          outstandingFees: 0, nextAmount: loanB.payment, nextDue: loanB.rows[3].date.toISOString(),
          status: "In arrears", progress: 25, rows: rowsB, payment: loanB.payment,
          guarantor: null,
          statusHistory: [
            { status: "Application submitted", date: iso(150) },
            { status: "Approved", date: iso(148) },
            { status: "Disbursed", date: iso(146) },
            { status: "Active", date: iso(146) },
            { status: "In arrears", date: iso(4) }
          ]
        }
      ],
      transactions: [
        { ref: "TX-90211", date: iso(1, 10), type: "Repayment", description: "Loan repayment — LN-2026-0412", amount: loanA.payment, direction: "debit", status: "Completed", method: "Airtel Money", balance: 0 },
        { ref: "TX-90188", date: iso(3, 15), type: "Deposit", description: "Mobile money deposit", amount: 250000, direction: "credit", status: "Completed", method: "TNM Mpamba", balance: 250000 },
        { ref: "TX-90142", date: iso(9, 9), type: "Fee", description: "Processing fee — LN-2026-0588", amount: 30000, direction: "debit", status: "Completed", method: "Internal", balance: 0 },
        { ref: "TX-90120", date: iso(12, 11), type: "Disbursement", description: "Loan disbursement — LN-2026-0588", amount: 1470000, direction: "credit", status: "Completed", method: "Bank transfer", balance: 0 },
        { ref: "TX-90054", date: iso(21, 16), type: "Repayment", description: "Loan repayment — LN-2026-0588", amount: loanB.payment, direction: "debit", status: "Failed", method: "Airtel Money", balance: 0 },
        { ref: "TX-89903", date: iso(30, 10), type: "Transfer", description: "Transfer to savings goal", amount: 150000, direction: "debit", status: "Completed", method: "Internal", balance: 0 },
        { ref: "TX-89711", date: iso(38, 14), type: "Repayment", description: "Loan repayment — LN-2026-0412", amount: loanA.payment, direction: "debit", status: "Completed", method: "Bank transfer", balance: 0 },
        { ref: "TX-88620", date: iso(64, 9), type: "Interest", description: "Interest earned — savings", amount: 24800, direction: "credit", status: "Completed", method: "Internal", balance: 0 }
      ],
      deposits: [
        { ref: "DEP-2026-0031", date: iso(3), amount: 250000, method: "TNM Mpamba", status: "Approved", proof: true },
        { ref: "DEP-2026-0029", date: iso(17), amount: 400000, method: "Bank transfer", status: "Pending", proof: false },
        { ref: "DEP-2026-0018", date: iso(46), amount: 120000, method: "Airtel Money", status: "Rejected", note: "Reference did not match the deposit instruction." }
      ],
      withdrawals: [
        { ref: "WDR-2026-0014", date: iso(6), amount: 180000, destination: "Airtel Money •••• 3456", status: "Completed", fee: 1500 },
        { ref: "WDR-2026-0016", date: iso(2), amount: 300000, destination: "Bank •••• 4821", status: "Pending", fee: 2500 }
      ],
      transfers: [
        { ref: "TRF-2026-0102", date: iso(30), from: "Wallet", to: "Savings goal — Home deposit", amount: 150000, status: "Completed", fee: 0 },
        { ref: "TRF-2026-0119", date: iso(4), from: "Wallet", to: "JC-ACC-100887 (G. Tembo)", amount: 50000, status: "Completed", fee: 500 }
      ],
      savings: {
        accountNumber: "JC-SAV-100412",
        balance: 1936000,
        interestEarned: 148200,
        rate: 12.5,
        status: "Active",
        opened: "2021-07-02",
        goals: [
          { name: "Home deposit", target: 5000000, saved: 3900000, due: "2027-12-01" },
          { name: "School fees buffer", target: 2000000, saved: 900000, due: "2028-01-05" },
          { name: "Emergency fund", target: 2000000, saved: 1840000, due: "2026-12-31" }
        ]
      },
      notifications: [
        { id: "N-101", type: "Repayment reminder", title: "Repayment due in 5 days", body: "MWK 265,000 is due on loan LN-2026-0412 on the 5th. Pay early to avoid charges.", date: iso(0, 8), read: false, channel: "In-app + SMS" },
        { id: "N-102", type: "Missing documents", title: "Additional documents required", body: "Application APP-2026-0587 needs a tax clearance certificate and six months of business bank statements.", date: iso(1, 11), read: false, channel: "In-app + Email" },
        { id: "N-103", type: "Application update", title: "Application under review", body: "APP-2026-0611 (Emergency Loan) has moved to credit assessment.", date: iso(2, 9), read: false, channel: "In-app" },
        { id: "N-104", type: "Payment confirmation", title: "Payment received", body: "MWK 265,000 was received for LN-2026-0412. Receipt TX-90211 is available.", date: iso(1, 10), read: true, channel: "In-app + SMS" },
        { id: "N-105", type: "Security alert", title: "New sign-in to your account", body: "A new sign-in was detected from Chrome on Windows in Lilongwe. If this was not you, secure your account.", date: iso(3, 20), read: true, channel: "In-app + Email" },
        { id: "N-106", type: "Overdue alert", title: "Loan LN-2026-0588 is overdue", body: "One instalment of MWK 145,050 is overdue. A late payment charge may apply.", date: iso(4, 7), read: true, channel: "In-app + SMS" },
        { id: "N-107", type: "Statement", title: "September statement available", body: "Your September 2026 account statement is ready to download.", date: iso(12, 8), read: true, channel: "In-app" },
        { id: "N-108", type: "Registration", title: "Welcome to JAY C O B", body: "Your customer account was created. Verify your email and phone to unlock applications.", date: iso(120, 9), read: true, channel: "In-app + Email" },
        { id: "N-109", type: "Verification", title: "Account verified", body: "Your email and phone number were verified successfully. Your KYC record is now active.", date: iso(119, 10), read: true, channel: "In-app + SMS" },
        { id: "N-110", type: "Application submitted", title: "Application APP-2026-0611 submitted", body: "We received your Emergency Loan application for MWK 1,500,000. Reference APP-2026-0611.", date: iso(2, 10), read: true, channel: "In-app + Email + SMS" },
        { id: "N-111", type: "Approval", title: "Loan LN-2026-0412 approved", body: "Your Personal Loan of MWK 5,000,000 was approved at 24% p.a. reducing over 24 months.", date: iso(64, 12), read: true, channel: "In-app + SMS" },
        { id: "N-112", type: "Agreement", title: "Agreement ready to sign", body: "Your loan agreement for LN-2026-0412 is available in Documents. Review and sign to proceed.", date: iso(63, 9), read: true, channel: "In-app + Email" },
        { id: "N-113", type: "Disbursement", title: "Funds disbursed", body: "MWK 4,900,000 was disbursed to your Airtel Money wallet after a MWK 100,000 processing fee.", date: iso(62, 14), read: true, channel: "In-app + SMS" }
      ],
      tickets: [
        {
          ref: "TKT-2026-0042", category: "Missing payment", subject: "Repayment not reflected",
          status: "In progress", created: iso(2), updated: iso(1),
          messages: [
            { from: "You", text: "I paid MWK 145,050 on 3 October via Airtel Money but the balance has not changed.", date: iso(2, 9) },
            { from: "Support — Chikondi", text: "Thank you. We have located the payment reference and escalated it to reconciliation. Please allow up to 24 hours.", date: iso(1, 10) }
          ]
        },
        {
          ref: "TKT-2026-0038", category: "KYC and documents", subject: "ID document rejected",
          status: "Resolved", created: iso(14), updated: iso(12),
          messages: [
            { from: "You", text: "My national ID upload was rejected, but the image is clear.", date: iso(14, 8) },
            { from: "Support — Grace", text: "The back of the ID was missing from the upload. Please resubmit both sides; we have reopened the KYC slot for you.", date: iso(13, 9) },
            { from: "You", text: "Uploaded both sides. Thank you.", date: iso(12, 11) }
          ]
        }
      ],
      documents: [
        { id: "DOC-001", name: "National ID", category: "Identity", status: "Approved", uploaded: iso(60), expiry: "2031-04-18", note: "Both sides verified.", required: true },
        { id: "DOC-002", name: "Proof of residence", category: "Address", status: "Approved", uploaded: iso(60), expiry: "2027-02-01", note: "Utility bill, Area 47.", required: true },
        { id: "DOC-003", name: "Proof of income", category: "Income", status: "Approved", uploaded: iso(40), expiry: "2027-01-31", note: "Three months of business takings.", required: true },
        { id: "DOC-004", name: "Business registration", category: "Business", status: "Pending", uploaded: iso(9), expiry: "2028-06-30", note: "Awaiting verification.", required: false },
        { id: "DOC-005", name: "Tax clearance certificate", category: "Business", status: "Rejected", uploaded: iso(8), expiry: "2026-12-31", note: "Certificate expired — upload the 2026 certificate.", required: false },
        { id: "DOC-006", name: "Bank statement (6 months)", category: "Financial", status: "Pending", uploaded: iso(8), expiry: "2027-04-30", note: "Requested by credit assessment.", required: true }
      ],
      sessions: [
        { device: "Chrome on Windows", location: "Lilongwe, MW", ip: "102.68.14.22", lastActive: iso(0, 9), current: true },
        { device: "Safari on iPhone", location: "Lilongwe, MW", ip: "102.68.14.91", lastActive: iso(2, 19), current: false },
        { device: "Chrome on Android", location: "Blantyre, MW", ip: "41.87.62.10", lastActive: iso(21, 7), current: false }
      ],
      logins: [
        { date: iso(0, 9), device: "Chrome on Windows", location: "Lilongwe, MW", status: "Success" },
        { date: iso(2, 19), device: "Safari on iPhone", location: "Lilongwe, MW", status: "Success" },
        { date: iso(3, 20), device: "Unknown device", location: "Blantyre, MW", status: "Failed password" },
        { date: iso(21, 7), device: "Chrome on Android", location: "Blantyre, MW", status: "Success" }
      ],
      security: {
        mfa: false,
        passwordChanged: iso(74),
        failedAttempts: 0,
        locked: false,
        lastLogin: iso(0, 9),
        recoveryEmail: "memory.tembo@example.com",
        recoveryPhone: "+265 999 123 456"
      },
      settings: {
        language: "en",
        currency: "MWK",
        notifications: { email: true, sms: true, inApp: true, repaymentReminders: true, marketing: false, security: true },
        privacy: { shareWithAdvisors: true, analytics: false },
        accessibility: { largeText: false, reduceMotion: false, highContrast: false }
      },
      statements: [
        { ref: "STM-2026-09", period: "September 2026", from: "2026-09-01", to: "2026-09-30", opening: 4200000, closing: 4841200, generated: iso(12), status: "Available" },
        { ref: "STM-2026-08", period: "August 2026", from: "2026-08-01", to: "2026-08-31", opening: 3900000, closing: 4200000, generated: iso(42), status: "Available" },
        { ref: "STM-2026-07", period: "July 2026", from: "2026-07-01", to: "2026-07-31", opening: 3600000, closing: 3900000, generated: iso(73), status: "Available" }
      ],
      drafts: []
    };
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

  /* Empty but valid document for a brand-new cloud account. */
  function blank(meta) {
    var shape = seed();
    var profile = Object.assign({}, shape.profile, meta || {});
    return {
      profile: profile,
      applications: [], loans: [], transactions: [], deposits: [], withdrawals: [],
      transfers: [], savings: [], notifications: [], tickets: [], documents: [],
      sessions: shape.sessions || [], logins: [],
      security: shape.security, settings: shape.settings,
      statements: [], drafts: [], wallet: shape.wallet || {}
    };
  }

  /* Fill in any keys an older cloud document may not have yet. */
  function normalise(data) {
    var shape = seed();
    var out = Object.assign({}, data);
    ["applications", "loans", "transactions", "deposits", "withdrawals", "transfers",
      "savings", "notifications", "tickets", "documents", "statements", "drafts",
      "sessions", "logins"].forEach(function (k) {
      if (!Array.isArray(out[k])) out[k] = [];
    });
    if (!out.profile) out.profile = shape.profile;
    if (!out.security) out.security = shape.security;
    if (!out.settings) out.settings = shape.settings;
    if (!out.wallet) out.wallet = shape.wallet || {};
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
