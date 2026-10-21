/* =====================================================================
   Client portal demo
   • Sign in with email OR phone number (password reveal toggle)
   • Forgot password and account recovery flows
   • Overview, accounts, statements with printable receipts, documents
   Demo credentials: demo@jaycobfinancial.mw  |  +265 999 123 456
   Password: demo1234
   ===================================================================== */
(function () {
  "use strict";

  var DEMO_EMAIL = "demo@jaycobfinancial.mw";
  var DEMO_PHONE = "265999123456";
  var DEMO_PASSWORD = "demo1234";
  var STORE_KEY = "jcob_portal_session";

  var authView = document.getElementById("portal-auth");
  var dashView = document.getElementById("portal-dash");
  if (!authView || !dashView) return;

  var loginForm = document.getElementById("login-form");
  var loginStatus = document.getElementById("login-status");
  var idInput = document.getElementById("login-id");
  var passwordInput = document.getElementById("login-password");
  var rememberInput = document.getElementById("login-remember");

  var $ = function (id) { return document.getElementById(id); };

  /* Pre-fill demo phone number so the flow can be explored instantly. */
  if (idInput && !idInput.value) idInput.value = DEMO_EMAIL;
  if (passwordInput && !passwordInput.value) passwordInput.value = DEMO_PASSWORD;

  /* ---------------- Validation helpers ---------------- */
  function isEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
  }

  function digits(value) {
    return (value || "").replace(/[^\d]/g, "");
  }

  function isPhone(value) {
    var d = digits(value);
    return d.length >= 9 && d.length <= 15;
  }

  function isIdentifier(value) {
    return isEmail(value) || isPhone(value);
  }

  function matchesDemo(value) {
    var v = value.trim().toLowerCase();
    if (v === DEMO_EMAIL) return true;
    var d = digits(v);
    return d === DEMO_PHONE || d === "0999123456" || d === "999123456";
  }

  function setFieldError(field, message) {
    if (!field) return;
    field.classList.add("has-error");
    var msg = field.querySelector(".error-msg");
    if (msg) msg.textContent = message;
  }

  function clearFieldError(field) {
    if (field) field.classList.remove("has-error");
  }

  /* ---------------- Sessions ---------------- */
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
    try {
      var store = rememberInput && rememberInput.checked ? window.localStorage : window.sessionStorage;
      store.setItem(STORE_KEY, JSON.stringify(session));
    } catch (e) {
      /* Storage can be blocked in private browsing; the session still works in memory. */
    }
  }

  function clearSession() {
    try {
      window.localStorage.removeItem(STORE_KEY);
      window.sessionStorage.removeItem(STORE_KEY);
    } catch (e) {}
  }

  function initials(name) {
    return name.split(" ").map(function (p) { return p.charAt(0); }).join("").slice(0, 2).toUpperCase();
  }

  function showDashboard(session) {
    authView.hidden = true;
    dashView.hidden = false;

    var fullName = session.name || "Memory Tembo";
    var parts = fullName.split(" ");
    if ($("dash-name")) $("dash-name").textContent = fullName;
    if ($("dash-first-name")) $("dash-first-name").textContent = parts[0];
    if ($("dash-email")) $("dash-email").textContent = session.identifier || session.email;
    if ($("dash-avatar")) $("dash-avatar").textContent = initials(fullName);

    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function showAuth() {
    dashView.hidden = true;
    authView.hidden = false;
    if (loginStatus) {
      loginStatus.className = "form-status";
      loginStatus.textContent = "";
    }
    switchPanel("signin");
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  /* ---------------- Auth panels ---------------- */
  function switchPanel(name) {
    document.querySelectorAll(".auth-panel").forEach(function (panel) {
      panel.hidden = panel.id !== "panel-" + name;
    });
    var heading = document.querySelector(".auth-panel:not([hidden]) input");
    if (heading) heading.focus({ preventScroll: true });
  }

  document.querySelectorAll("[data-auth-target]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      switchPanel(btn.getAttribute("data-auth-target"));
    });
  });

  /* ---------------- Sign in ---------------- */
  if (loginForm) {
    loginForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var identifier = idInput.value.trim();
      var password = passwordInput.value;
      var idField = idInput.closest(".field");
      var pwField = passwordInput.closest(".field");

      clearFieldError(idField);
      clearFieldError(pwField);

      var valid = true;
      if (!isIdentifier(identifier)) {
        valid = false;
        setFieldError(idField, "Enter a valid email address or phone number.");
      }
      if (!password) {
        valid = false;
        setFieldError(pwField, "Enter your password.");
      }
      if (!valid) return;

      var accepted = (matchesDemo(identifier) && password === DEMO_PASSWORD);
      if (!accepted) {
        loginStatus.className = "form-status is-visible form-status--error";
        loginStatus.textContent =
          "We could not match that email/phone and password. Use the demo credentials below, or reset your password.";
        return;
      }

      loginStatus.className = "form-status is-visible";
      loginStatus.textContent = "Signing you in…";

      var session = {
        identifier: identifier,
        email: isEmail(identifier) ? identifier : DEMO_EMAIL,
        name: "Memory Tembo",
        at: new Date().toISOString()
      };
      setTimeout(function () {
        saveSession(session);
        showDashboard(session);
      }, 450);
    });
  }

  /* ---------------- Forgot password ---------------- */
  var forgotForm = $("forgot-form");
  if (forgotForm) {
    forgotForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var input = $("forgot-id");
      var field = input.closest(".field");
      var status = $("forgot-status");
      clearFieldError(field);

      if (!isIdentifier(input.value.trim())) {
        setFieldError(field, "Enter a valid email address or phone number.");
        return;
      }

      status.className = "form-status is-visible";
      status.textContent = "Sending…";
      setTimeout(function () {
        status.className = "form-status is-visible";
        status.textContent =
          "If an account matches " + input.value.trim() +
          ", a single-use reset link is on its way. It expires in 30 minutes. Check your spam folder if it does not arrive.";
      }, 600);
    });
  }

  /* ---------------- Recover account ---------------- */
  var recoverForm = $("recover-form");
  if (recoverForm) {
    recoverForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var input = $("recover-id");
      var ref = $("recover-ref");
      var idField = input.closest(".field");
      var refField = ref.closest(".field");
      var status = $("recover-status");
      var valid = true;

      clearFieldError(idField);
      clearFieldError(refField);

      if (!isIdentifier(input.value.trim())) {
        valid = false;
        setFieldError(idField, "Enter a valid email address or phone number.");
      }
      if (!/^JC-\d{4}-\d{4}$/i.test(ref.value.trim())) {
        valid = false;
        setFieldError(refField, "Use the format JC-2019-0412.");
      }
      if (!valid) return;

      status.className = "form-status is-visible";
      status.textContent = "Submitting recovery request…";
      setTimeout(function () {
        status.className = "form-status is-visible";
        status.textContent =
          "Recovery request logged for " + ref.value.trim().toUpperCase() +
          ". Our team will verify your identity and contact you within one working day. For urgent access, call +265 999 123 456.";
      }, 650);
    });
  }

  /* ---------------- Sign out ---------------- */
  var logoutBtn = $("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      clearSession();
      showAuth();
    });
  }

  /* ---------------- Dashboard tabs ---------------- */
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

  /* ---------------- Download helpers ---------------- */
  function money(value) {
    return "MWK " + Math.round(value).toLocaleString("en-US");
  }

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
      reference: "JC-STM-0926",
      opening: 4512800,
      rows: [
        ["01 Sep 2026", "Opening balance", "", 4512800],
        ["02 Sep 2026", "Loan instalment", -118000, 4394800],
        ["05 Sep 2026", "Salary credit", 720000, 5114800],
        ["08 Sep 2026", "Transfer to buffer", -150000, 4964800],
        ["14 Sep 2026", "School fees", -350000, 4614800],
        ["20 Sep 2026", "Treasury bill interest", 126400, 4741200],
        ["28 Sep 2026", "Advisory fee — Q3", -60000, 4681200],
        ["30 Sep 2026", "Interest credit", 160000, 4841200]
      ],
      closing: 4841200
    },
    "2026-08": {
      period: "August 2026",
      reference: "JC-STM-0826",
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
      reference: "JC-STM-0726",
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
      reference: "JC-STM-0626",
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
      "Statement reference," + s.reference,
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

  var allBtn = $("download-all");
  if (allBtn) {
    allBtn.addEventListener("click", function () {
      var combined = Object.keys(STATEMENTS)
        .map(function (k) { return statementCSV(k); })
        .join("\n\n----------------------------------------\n\n");
      download("JC-statements-all.csv", combined);
    });
  }

  /* ---------------- Printable receipts ---------------- */
  var modal = $("receipt-modal");
  var lastReceiptKey = null;

  function openReceipt(key) {
    var s = STATEMENTS[key];
    if (!s || !modal) return;
    lastReceiptKey = key;

    var meta = $("receipt-meta");
    meta.innerHTML = [
      ["Client", "Memory Tembo"],
      ["Client reference", "JC-2019-0412"],
      ["Statement reference", s.reference],
      ["Period", s.period],
      ["Currency", "MWK"],
      ["Issued", new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })]
    ].map(function (pair) {
      return "<dt>" + pair[0] + "</dt><dd>" + pair[1] + "</dd>";
    }).join("");

    $("receipt-rows").innerHTML = s.rows.map(function (r) {
      var amount = r[2] === "" ? "—" : (r[2] < 0 ? "− " : "") + Math.abs(r[2]).toLocaleString("en-US");
      return "<tr><td>" + r[0] + "</td><td>" + r[1] + "</td>" +
        '<td class="num">' + amount + "</td>" +
        '<td class="num">' + Number(r[3]).toLocaleString("en-US") + "</td></tr>";
    }).join("");

    $("receipt-total").textContent = money(s.closing);

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    var closeBtn = modal.querySelector(".modal-close");
    if (closeBtn) closeBtn.focus({ preventScroll: true });
  }

  function closeReceipt() {
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.removeProperty("overflow");
    document.body.classList.remove("print-receipt");
  }

  document.querySelectorAll("[data-receipt]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      openReceipt(btn.getAttribute("data-receipt"));
    });
  });

  if (modal) {
    modal.querySelectorAll("[data-receipt-close]").forEach(function (btn) {
      btn.addEventListener("click", closeReceipt);
    });
    modal.addEventListener("click", function (e) {
      if (e.target === modal) closeReceipt();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && modal.classList.contains("is-open")) closeReceipt();
    });
  }

  var printReceipt = $("print-receipt");
  if (printReceipt) {
    printReceipt.addEventListener("click", function () {
      document.body.classList.add("print-receipt");
      window.print();
      window.addEventListener("afterprint", function () {
        document.body.classList.remove("print-receipt");
      }, { once: true });
      setTimeout(function () { document.body.classList.remove("print-receipt"); }, 4000);
    });
  }

  var downloadReceipt = $("download-receipt");
  if (downloadReceipt) {
    downloadReceipt.addEventListener("click", function () {
      if (!lastReceiptKey) return;
      download("JC-receipt-" + lastReceiptKey + ".csv", statementCSV(lastReceiptKey));
    });
  }

  /* ---------------- Document downloads ---------------- */
  var DOCS = {
    plan: {
      title: "Household Financial Plan 2026",
      body: [
        "JAY C.O.B FINANCIAL SERVICES",
        "Plot 47/3, Area 47, Sector 3, Lilongwe · hello@jaycobfinancial.mw",
        "",
        "HOUSEHOLD FINANCIAL PLAN 2026",
        "Client: Memory Tembo",
        "Reference: JC-2019-0412",
        "Currency: MWK",
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
        "JAY C.O.B FINANCIAL SERVICES",
        "",
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
        "JAY C.O.B FINANCIAL SERVICES — Q3 2026 REVIEW NOTES",
        "Client: Memory Tembo | 12 October 2026 | MWK",
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
        "JAY C.O.B FINANCIAL SERVICES — INSURANCE SCHEDULE",
        "Client: Memory Tembo | Prepared 18 September 2026 | MWK",
        "",
        "LIFE COVER        MWK 15,000,000   Partner insurer A",
        "FUNERAL COVER     MWK 1,500,000    Partner insurer A",
        "HOUSEHOLD GOODS   MWK 3,000,000    Partner insurer B",
        "MOTOR             MWK 6,500,000    Partner insurer B",
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
      var doc = DOCS[btn.getAttribute("data-doc")];
      if (!doc) return;
      download(doc.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() + ".txt", doc.body, "text/plain;charset=utf-8;");
      btn.textContent = "Saved";
      setTimeout(function () { btn.textContent = "Download"; }, 1500);
    });
  });

  /* ---------------- Upload + message demos ---------------- */
  var uploadBtn = $("upload-btn");
  var uploadStatus = $("upload-status");
  var uploadNote = $("upload-note");
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

  var messageForm = $("message-form");
  if (messageForm) {
    messageForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var field = $("message-text");
      var status = $("message-status");
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
        '</p><p class="text-small" style="margin:0;"></p>';
      bubble.querySelector("p.text-small").textContent = value;
      messageForm.previousElementSibling.appendChild(bubble);
      status.className = "form-status is-visible";
      status.textContent = "Message recorded locally. In production this would notify your advisor.";
      field.value = "";
    });
  }

  /* ---------------- Restore session ---------------- */
  var session = readSession();
  if (session && session.identifier) {
    showDashboard(session);
  } else if (session && session.email) {
    showDashboard(session);
  } else {
    showAuth();
  }
})();
