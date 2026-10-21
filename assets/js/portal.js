/* =====================================================================
   Client portal demo — sign in, tabs and local CSV downloads
   Demo credentials: demo@jaycobfinancial.mw / demo1234
   ===================================================================== */
(function () {
  "use strict";

  var DEMO_EMAIL = "demo@jaycobfinancial.mw";
  var DEMO_PASSWORD = "demo1234";
  var STORE_KEY = "jcob_portal_session";

  var authView = document.getElementById("portal-auth");
  var dashView = document.getElementById("portal-dash");
  if (!authView || !dashView) return;

  var loginForm = document.getElementById("login-form");
  var loginStatus = document.getElementById("login-status");
  var emailInput = document.getElementById("login-email");
  var passwordInput = document.getElementById("login-password");
  var rememberInput = document.getElementById("login-remember");

  /* Pre-fill the demo credentials so the portal can be explored instantly. */
  if (emailInput && !emailInput.value) emailInput.value = DEMO_EMAIL;
  if (passwordInput && !passwordInput.value) passwordInput.value = DEMO_PASSWORD;

  function readSession() {
    try {
      return (
        JSON.parse(window.localStorage.getItem(STORE_KEY) || "null") ||
        JSON.parse(window.sessionStorage.getItem(STORE_KEY) || "null")
      );
    } catch (e) {
      return null;
    }
  }

  function saveSession(session) {
    var store = rememberInput && rememberInput.checked ? window.localStorage : window.sessionStorage;
    try {
      store.setItem(STORE_KEY, JSON.stringify(session));
    } catch (e) {}
  }

  function clearSession() {
    try {
      window.localStorage.removeItem(STORE_KEY);
      window.sessionStorage.removeItem(STORE_KEY);
    } catch (e) {}
  }

  function nameFromEmail(email) {
    var part = (email || "").split("@")[0].replace(/[._-]+/g, " ").trim();
    if (!part) return "Client";
    return part.replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  function showDashboard(session) {
    authView.hidden = true;
    dashView.hidden = false;

    var fullName = session.name || "Memory Tembo";
    var parts = fullName.split(" ");
    var initials = (parts[0][0] + (parts[1] ? parts[1][0] : "")).toUpperCase();

    var nameEl = document.getElementById("dash-name");
    var firstEl = document.getElementById("dash-first-name");
    var emailEl = document.getElementById("dash-email");
    var avatarEl = document.getElementById("dash-avatar");
    if (nameEl) nameEl.textContent = fullName;
    if (firstEl) firstEl.textContent = parts[0];
    if (emailEl) emailEl.textContent = session.email;
    if (avatarEl) avatarEl.textContent = initials;

    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function showAuth() {
    dashView.hidden = true;
    authView.hidden = false;
    if (loginStatus) {
      loginStatus.className = "form-status";
      loginStatus.textContent = "";
    }
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  /* ---------------- Sign in ---------------- */
  if (loginForm) {
    loginForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = (emailInput.value || "").trim().toLowerCase();
      var password = passwordInput.value || "";
      var emailField = emailInput.closest(".field");
      var passField = passwordInput.closest(".field");

      emailField.classList.remove("has-error");
      passField.classList.remove("has-error");

      var valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
      if (!valid) {
        emailField.classList.add("has-error");
        emailField.querySelector(".error-msg").textContent = "Enter a valid email address.";
      }
      if (!password) {
        passField.classList.add("has-error");
        passField.querySelector(".error-msg").textContent = "Enter your password.";
      }
      if (!valid || !password) return;

      if (email !== DEMO_EMAIL || password !== DEMO_PASSWORD) {
        loginStatus.className = "form-status is-visible form-status--error";
        loginStatus.textContent =
          "Those details do not match our records. Use the demo credentials shown below.";
        return;
      }

      loginStatus.className = "form-status is-visible";
      loginStatus.textContent = "Signing you in…";

      var session = { email: email, name: "Memory Tembo", at: new Date().toISOString() };
      setTimeout(function () {
        saveSession(session);
        showDashboard(session);
      }, 450);
    });
  }

  /* ---------------- Sign out ---------------- */
  var logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      clearSession();
      showAuth();
    });
  }

  /* ---------------- Section tabs ---------------- */
  var navButtons = document.querySelectorAll(".dash-nav button");
  navButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var target = btn.getAttribute("data-panel");
      navButtons.forEach(function (b) {
        b.classList.remove("is-active");
        b.removeAttribute("aria-current");
      });
      btn.classList.add("is-active");
      btn.setAttribute("aria-current", "true");
      document.querySelectorAll(".panel-tab").forEach(function (panel) {
        panel.hidden = panel.id !== "panel-" + target;
      });
    });
  });

  /* ---------------- CSV helpers ---------------- */
  function download(filename, content, type) {
    var blob = new Blob([content], { type: type || "text/csv;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1200);
  }

  var STATEMENTS = {
    "2026-09": {
      period: "September 2026",
      opening: 4512800,
      rows: [
        ["01 Sep 2026", "Opening balance", "", 4512800],
        ["02 Sep 2026", "Loan instalment", -118000, 4394800],
        ["05 Sep 2026", "Salary credit", 720000, 5114800],
        ["08 Sep 2026", "Transfer to buffer", -150000, 4964800],
        ["14 Sep 2026", "School fees", -350000, 4614800],
        ["20 Sep 2026", "Treasury bill interest", 126400, 4741200],
        ["28 Sep 2026", "Advisory fee — Q3", -60, 4741140]
      ],
      closing: 4841200
    },
    "2026-08": {
      period: "August 2026",
      opening: 4190500,
      rows: [
        ["01 Aug 2026", "Opening balance", "", 4190500],
        ["02 Aug 2026", "Loan instalment", -118000, 4072500],
        ["05 Aug 2026", "Salary credit", 720000, 4792500],
        ["09 Aug 2026", "Transfer to buffer", -150000, 4642500],
        ["16 Aug 2026", "Household expenses", -280000, 4362500],
        ["22 Aug 2026", "Unit trust top-up", -100000, 4262500],
        ["31 Aug 2026", "Interest credit", 250300, 4512800]
      ],
      closing: 4512800
    },
    "2026-07": {
      period: "July 2026",
      opening: 3908400,
      rows: [
        ["01 Jul 2026", "Opening balance", "", 3908400],
        ["02 Jul 2026", "Loan instalment", -118000, 3790400],
        ["05 Jul 2026", "Salary credit", 720000, 4510400],
        ["11 Jul 2026", "Transfer to buffer", -150000, 4360400],
        ["19 Jul 2026", "Medical expenses", -190000, 4170400],
        ["26 Jul 2026", "Treasury bill purchase", -300000, 3870400],
        ["31 Jul 2026", "Interest credit", 320100, 4190500]
      ],
      closing: 4190500
    },
    "2026-06": {
      period: "June 2026",
      opening: 3608500,
      rows: [
        ["01 Jun 2026", "Opening balance", "", 3608500],
        ["02 Jun 2026", "Loan instalment", -118000, 3490500],
        ["05 Jun 2026", "Salary credit", 720000, 4210500],
        ["10 Jun 2026", "Transfer to buffer", -150000, 4060500],
        ["18 Jun 2026", "School fees", -350000, 3710500],
        ["27 Jun 2026", "Insurance premium", -95000, 3615500],
        ["30 Jun 2026", "Interest credit", 293000, 3908500]
      ],
      closing: 3908500
    }
  };

  function statementCSV(key) {
    var s = STATEMENTS[key];
    if (!s) return "";
    var lines = [
      "Jay C.O.B Financial Services - Client Statement",
      "Client reference,JC-2019-0412",
      "Period," + s.period,
      "Currency,MWK",
      "",
      "Date,Description,Amount,Balance"
    ];
    s.rows.forEach(function (r) {
      lines.push([r[0], '"' + r[1] + '"', r[2] === "" ? "" : r[2], r[3]].join(","));
    });
    lines.push("", "Closing balance," + s.closing);
    lines.push("Note,Illustrative demonstration data only");
    return lines.join("\n");
  }

  document.querySelectorAll("[data-statement]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var key = btn.getAttribute("data-statement");
      if (!STATEMENTS[key]) return;
      download("JC-statement-" + key + ".csv", statementCSV(key));
    });
  });

  var allBtn = document.getElementById("download-all");
  if (allBtn) {
    allBtn.addEventListener("click", function () {
      var keys = Object.keys(STATEMENTS);
      var combined = keys
        .map(function (k) { return statementCSV(k); })
        .join("\n\n----------------------------------------\n\n");
      download("JC-statements-all.csv", combined);
    });
  }

  /* ---------------- Document downloads ---------------- */
  var DOCS = {
    plan: {
      title: "Household Financial Plan 2026",
      body: [
        "HOUSEHOLD FINANCIAL PLAN 2026",
        "Client: Memory Tembo",
        "Reference: JC-2019-0412",
        "Prepared by: Jay C.O.B Financial Services, Lilongwe",
        "",
        "1. POSITION SUMMARY",
        "Total savings and investments: MWK 4,860,000",
        "Loan outstanding: MWK 2,340,000",
        "Net position: MWK 2,520,000",
        "",
        "2. GOALS",
        "- Home deposit: MWK 5,000,000 by December 2027 (78% funded)",
        "- School fees buffer: MWK 2,000,000 by January 2028 (45% funded)",
        "- Emergency fund: MWK 2,000,000 (92% funded)",
        "",
        "3. PRIORITY ACTIONS",
        "1. Complete the emergency fund, then redirect the monthly surplus.",
        "2. Keep loan instalments below 30% of net income.",
        "3. Review insurance cover at the October renewal.",
        "",
        "4. NEXT REVIEW",
        "4 November 2026, 10:00, Area 47 office.",
        "",
        "This is illustrative demonstration content and not a binding financial plan."
      ].join("\n")
    },
    engagement: {
      title: "Engagement letter (signed)",
      body: [
        "ENGAGEMENT LETTER",
        "Between Jay C.O.B Financial Services and Memory Tembo",
        "Date: 14 January 2026",
        "",
        "SCOPE",
        "Household Financial Plan, including annual review and quarterly advisory meetings.",
        "",
        "FEE",
        "MWK 180,000 per annum, invoiced annually in advance.",
        "",
        "TERM",
        "12 months from the date of signature, renewable by agreement.",
        "",
        "CONFIDENTIALITY",
        "Client information is held securely and retained for seven years.",
        "",
        "This is illustrative demonstration content."
      ].join("\n")
    },
    review: {
      title: "Q3 2026 review notes",
      body: [
        "Q3 2026 REVIEW NOTES",
        "Client: Memory Tembo | 12 October 2026",
        "",
        "PROGRESS",
        "- Plan completion moved from 59% to 68%.",
        "- Savings increased by MWK 310,000 during the quarter.",
        "- Loan is 62% repaid with 22 instalments remaining.",
        "",
        "DISCUSSION",
        "School fees buffer is now roughly three months ahead of schedule.",
        "Surplus of MWK 150,000 per month available from November.",
        "",
        "DECISIONS",
        "1. Hold two months of buffer before increasing home deposit funding.",
        "2. Re-quote insurance at renewal and compare three providers.",
        "",
        "This is illustrative demonstration content."
      ].join("\n")
    },
    insurance: {
      title: "Insurance schedule",
      body: [
        "INSURANCE SCHEDULE",
        "Client: Memory Tembo | Prepared 18 September 2026",
        "",
        "LIFE COVER      MWK 15,000,000   Partner insurer A",
        "FUNERAL COVER   MWK 1,500,000    Partner insurer A",
        "HOUSEHOLD GOODS MWK 3,000,000    Partner insurer B",
        "MOTOR           MWK 6,500,000    Partner insurer B",
        "",
        "REVIEW NOTES",
        "- Life cover is approximately 3.4x annual income; target is 5x.",
        "- Household goods cover excludes items kept outside the main dwelling.",
        "- Renewal date: 30 October 2026.",
        "",
        "This is illustrative demonstration content."
      ].join("\n")
    }
  };

  document.querySelectorAll("[data-doc]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var key = btn.getAttribute("data-doc");
      var doc = DOCS[key];
      if (!doc) return;
      download(doc.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() + ".txt", doc.body, "text/plain;charset=utf-8;");
      btn.textContent = "Saved";
      setTimeout(function () { btn.textContent = "Download"; }, 1500);
    });
  });

  /* ---------------- Upload + message demos ---------------- */
  var uploadBtn = document.getElementById("upload-btn");
  var uploadStatus = document.getElementById("upload-status");
  var uploadNote = document.getElementById("upload-note");
  if (uploadBtn) {
    uploadBtn.addEventListener("click", function () {
      var input = document.createElement("input");
      input.type = "file";
      input.accept = ".pdf,.csv,.png,.jpg,.jpeg,.xlsx,.doc,.docx";
      input.addEventListener("change", function () {
        var file = input.files && input.files[0];
        if (!file) return;
        var label = uploadNote && uploadNote.value ? " (" + uploadNote.value + ")" : "";
        uploadStatus.className = "form-status is-visible";
        uploadStatus.textContent =
          "Demo mode: “" + file.name + "” would be uploaded and linked to JC-2019-0412" + label + ".";
      });
      input.click();
    });
  }

  var messageForm = document.getElementById("message-form");
  if (messageForm) {
    messageForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var field = document.getElementById("message-text");
      var status = document.getElementById("message-status");
      var value = (field.value || "").trim();
      if (value.length < 2) {
        field.focus();
        return;
      }
      var bubble = document.createElement("div");
      bubble.style.cssText =
        "background:var(--navy-800); color:#e8eef3; border-radius:12px; padding:.9rem 1rem; max-width:85%; margin-left:auto;";
      var stamp = new Date().toLocaleString("en-GB", {
        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
      });
      bubble.innerHTML =
        '<p class="text-tiny" style="color:#9db1c2; margin-bottom:.25rem;">You · ' +
        stamp.replace(/,/g, "") +
        "</p><p class=\"text-small\" style=\"margin:0;\"></p>";
      bubble.querySelector("p.text-small").textContent = value;
      messageForm.previousElementSibling.appendChild(bubble);
      status.className = "form-status is-visible";
      status.textContent = "Message recorded locally. In production this would notify your advisor.";
      field.value = "";
    });
  }

  /* ---------------- Restore session ---------------- */
  var session = readSession();
  if (session && session.email) {
    showDashboard(session);
  } else {
    showAuth();
  }
})();
