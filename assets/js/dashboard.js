/* =====================================================================
   JAY C O B FINANCIAL SERVICES — customer dashboard
   Hash-routed single-page app covering every customer area:
   overview · apply · applications · loans · repayments · schedule ·
   transactions · deposits · withdrawals · transfers · savings ·
   statements · documents/KYC · notifications · support · profile ·
   security · settings
   ===================================================================== */
(function () {
  "use strict";

  var UI = window.JCOB_UI;
  var DATA = window.JCOB_DATA;
  var F = window.JCOB_FINANCE;
  if (!UI || !DATA || !F) return;

  var $ = function (id) { return document.getElementById(id); };
  var content = $("app-content");
  if (!content) return;

  /* ---------------- Session guard ---------------- */
  var params = new URLSearchParams(location.search);
  var session = UI.getSession();
  if (!session && params.get("demo") === "1") {
    session = UI.setSession({ authenticated: true, name: "Memory Tembo", email: "demo@jaycobfinancial.mw", identifier: "demo@jaycobfinancial.mw" }, true);
  }
  if (!session || !session.authenticated) {
    window.location.replace("login.html?next=dashboard.html");
    return;
  }

  var state = {
    route: "dashboard",
    pages: {},
    filters: { txType: "all", txStatus: "all", txFrom: "", txTo: "", txSort: "newest", notif: "all", app: "all" },
    docsFilter: "all",
    scheduleView: "table"
  };

  /* ---------------- Helpers ---------------- */
  function pwToggle(id) {
    return '<button type="button" class="pw-toggle" data-pw-toggle="' + id + '" aria-label="Show password" aria-pressed="false" title="Show password">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg></button>';
  }

  function esc(v) {
    return String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function mwk(v, d) { return F.formatMWK(v, d || 0); }
  function dt(iso) { return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
  function dtTime(iso) {
    return new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }
  function db() { return DATA.get(); }
  function profile() { return db().profile; }
  function walletBalance() {
    var d = db();
    if (!d.wallet) { d.wallet = { balance: 615000 }; DATA.save(); }
    return d.wallet.balance;
  }
  function setWallet(v) { var d = db(); d.wallet = { balance: v }; DATA.save(); }

  var ICON = {
    dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/></svg>',
    loan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/></svg>',
    wallet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6"/><path d="M16 14h.01"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 11h18"/></svg>',
    chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m7 15 4-5 3 3 5-7"/></svg>',
    arrowDown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v16M6 14l6 6 6-6"/></svg>',
    arrowUp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V4M6 10l6-6 6 6"/></svg>',
    transfer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h13l-3-3M20 16H7l3 3"/></svg>',
    piggy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 10c0-3.3-3.1-6-7-6S5 6.7 5 10c0 1.6.8 3.1 2 4.1V17h3v2h4v-2h2.5l1.5-2h1V11l-2-1Z"/><path d="M15 9h.01"/></svg>',
    receipt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2v20l3-2 3 2 3-2 3 2 3-2V2l-3 2-3-2-3 2-3-2Z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>',
    support: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.1A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5Z"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6h.09A1.7 1.7 0 0 0 10 3.05V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9v.09a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1Z"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
    upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5M12 3v12"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>'
  };

  function statCard(label, value, foot, icon, accent, footClass) {
    return '<div class="stat-card' + (accent ? " stat-card--accent" : "") + '">' +
      (icon ? '<span class="sc-icon">' + icon + "</span>" : "") +
      '<p class="sc-label">' + label + "</p>" +
      '<p class="sc-value">' + value + "</p>" +
      (foot ? '<p class="sc-foot ' + (footClass || "") + '">' + foot + "</p>" : "") +
      "</div>";
  }

  function pageHead(title, sub, actions) {
    return '<div class="app-page-head"><div><h1>' + title + "</h1>" + (sub ? "<p>" + sub + "</p>" : "") + "</div>" +
      (actions ? '<div class="head-actions">' + actions + "</div>" : "") + "</div>";
  }

  function panel(title, sub, body, tools, flush) {
    return '<section class="app-panel">' +
      '<div class="app-panel-head"><div><h2>' + title + "</h2>" + (sub ? "<p>" + sub + "</p>" : "") + "</div>" +
      (tools ? '<div class="head-tools">' + tools + "</div>" : "") + "</div>" +
      '<div class="app-panel-body' + (flush ? " app-panel-body--flush" : "") + '">' + body + "</div></section>";
  }

  function tableHead(cols) {
    return "<thead><tr>" + cols.map(function (c) {
      return "<th" + (c.num ? ' class="num"' : "") + ">" + c.label + "</th>";
    }).join("") + "</tr></thead>";
  }

  /* ---------------- Sidebar ---------------- */
  var NAV = [
    { group: "Overview" },
    { key: "dashboard", label: "Dashboard", icon: "dashboard" },
    { key: "apply", label: "Apply for a loan", icon: "plus" },
    { group: "My borrowing" },
    { key: "applications", label: "My loan applications", icon: "file" },
    { key: "loans", label: "My active loans", icon: "loan" },
    { key: "repayments", label: "Loan repayments", icon: "wallet" },
    { key: "schedule", label: "Repayment schedules", icon: "calendar" },
    { group: "Money" },
    { key: "transactions", label: "My transactions", icon: "chart" },
    { key: "deposits", label: "Deposits", icon: "arrowDown" },
    { key: "withdrawals", label: "Withdrawals", icon: "arrowUp" },
    { key: "transfers", label: "Transfers", icon: "transfer" },
    { key: "savings", label: "Savings", icon: "piggy" },
    { key: "statements", label: "Account statements", icon: "receipt" },
    { group: "Account" },
    { key: "documents", label: "KYC & documents", icon: "file" },
    { key: "notifications", label: "Notifications", icon: "bell" },
    { key: "support", label: "Support", icon: "support" },
    { key: "profile", label: "My profile", icon: "user" },
    { key: "security", label: "Account security", icon: "lock" },
    { key: "settings", label: "Settings", icon: "settings" }
  ];

  function renderSidebar() {
    var nav = $("app-nav");
    if (!nav) return;
    nav.innerHTML = NAV.map(function (item) {
      if (item.group) return '<p class="nav-group-label">' + item.group + "</p>";
      var badge = item.key === "notifications" ? '<span class="nav-badge" data-notif-total>0</span>' : "";
      return '<a href="#' + item.key + '" data-route="' + item.key + '">' + ICON[item.icon] + "<span>" + item.label + "</span>" + badge + "</a>";
    }).join("");
    highlightNav();
    UI.updateBell();
    var name = db().profile.fullName;
    document.querySelectorAll("[data-profile-name]").forEach(function (el) { el.textContent = name; });
    document.querySelectorAll("[data-profile-email]").forEach(function (el) { el.textContent = db().profile.email; });
    document.querySelectorAll("[data-profile-avatar]").forEach(function (el) { el.textContent = db().profile.avatar; });
  }

  function highlightNav() {
    document.querySelectorAll(".app-nav a[data-route]").forEach(function (a) {
      a.classList.toggle("is-active", a.getAttribute("data-route") === state.route);
    });
  }

  /* ==================================================================
     PANELS
     ================================================================== */

  function panelDashboard() {
    var p = profile();
    var t = DATA.totals();
    var active = DATA.activeLoans();
    var recentTx = db().transactions.slice(0, 5);
    var loan = active[0];
    var nextIsSoon = t.nextDue && (new Date(t.nextDue) - Date.now()) / 86400000 < 14;
    var kycBadge = p.kyc === "Verified" ? UI.statusPill("Verified") : UI.statusPill("Pending");

    var secAlert = db().security.failedAttempts > 0
      ? '<div class="notice notice--danger">' + ICON.shield + "<div><strong>Security alert</strong>" +
        db().security.failedAttempts + " failed sign-in attempt(s) were recorded. Review your login activity.</div></div>"
      : "";

    return pageHead("Welcome back, " + esc(p.firstName) + " 👋",
      "Here is where your borrowing stands today.",
      '<a class="btn btn--gold btn--sm" href="#apply">Apply for a loan</a>' +
      '<a class="btn btn--ghost btn--sm" href="#repayments">Make a repayment</a>') + secAlert +

      '<div class="stat-cards">' +
        statCard("Available balance", mwk(walletBalance()), "Wallet · " + esc(p.accountNumber), ICON.wallet, false) +
        statCard("Active loans", String(t.activeCount), "Outstanding " + mwk(t.outstanding), ICON.loan, true) +
        statCard("Next repayment", mwk(t.nextAmount), t.nextDue ? "Due " + dt(t.nextDue) + (nextIsSoon ? " · soon" : "") : "No payment due", ICON.calendar, false, nextIsSoon ? "down" : "") +
        statCard("Total repaid", mwk(t.repaid), "Borrowed " + mwk(t.borrowed), ICON.chart, false) +
      "</div>" +

      '<div class="dash-grid">' +
        panel("Repayment progress", "Active facilities",
          active.length ? active.map(function (l) {
            var paidPct = Math.round((l.paid / l.totalRepayment) * 100);
            return '<div style="padding:.55rem 0;">' +
              '<div class="flex items-center justify-between" style="margin-bottom:.35rem;">' +
                '<strong style="font-size:.84rem;color:var(--ink);">' + esc(l.product) + " · " + esc(l.id) + "</strong>" +
                '<span class="text-tiny text-muted">' + paidPct + "% repaid</span></div>" +
              '<div class="progress"><span style="width:' + paidPct + '%"></span></div>' +
              '<div class="flex items-center justify-between text-tiny text-muted" style="margin-top:.3rem;">' +
                "<span>Next: " + mwk(l.nextAmount) + " · " + dt(l.nextDue) + "</span>" +
                '<a href="#loan?id=' + encodeURIComponent(l.id) + '" style="font-weight:600;">Details</a></div></div>';
          }).join("") : UI.emptyState("No active loans", "You do not have any active facilities.", { href: "#apply", label: "Apply for a loan" }),
          '<a class="btn btn--ghost btn--xs" href="#loans">All loans</a>') +

        panel("Quick actions", null,
          '<div class="quick-actions">' +
            quickAction("#apply", ICON.plus, "Apply for a loan", "Start a new application") +
            quickAction("#repayments", ICON.wallet, "Make a repayment", "Pay via mobile money") +
            quickAction("#loans", ICON.loan, "View loan details", "Balances and schedules") +
            quickAction("#statements", ICON.receipt, "Download statement", "Generate a statement") +
            quickAction("#support", ICON.support, "Contact support", "Open a ticket") +
            quickAction("#transactions", ICON.chart, "View all transactions", "Search and filter") +
          "</div>") +
      "</div>" +

      '<div class="dash-grid">' +
        panel("Recent transactions", "Latest activity on your account",
          '<div class="table-wrap" style="border:0;border-radius:0;">' +
            '<table class="data"><thead><tr><th>Date</th><th>Description</th><th>Type</th><th class="num">Amount</th><th>Status</th></tr></thead><tbody>' +
            recentTx.map(function (tx) {
              return "<tr><td>" + dt(tx.date) + "</td><td>" + esc(tx.description) + "</td><td>" + esc(tx.type) + "</td>" +
                '<td class="num" style="color:' + (tx.direction === "credit" ? "var(--success)" : "var(--ink)") + '">' +
                (tx.direction === "credit" ? "+" : "−") + " " + mwk(tx.amount) + "</td>" +
                "<td>" + UI.statusPill(tx.status) + "</td></tr>";
            }).join("") + "</tbody></table></div>",
          '<a class="btn btn--ghost btn--xs" href="#transactions">View all</a>', true) +

        panel("Notifications", "Recent updates",
          '<div style="margin:-1.1rem;">' + db().notifications.slice(0, 4).map(function (n) {
            return '<a class="bell-item ' + (n.read ? "read" : "unread") + '" href="#notifications" style="text-decoration:none;">' +
              '<i class="dot"></i><div><strong>' + esc(n.title) + "</strong><span>" + UI.timeAgo(n.date) + "</span></div></a>";
          }).join("") + "</div>", '<a class="btn btn--ghost btn--xs" href="#notifications">View all</a>', true) +
      "</div>" +

      '<div class="dash-grid">' +
        panel("Account snapshot", null,
          '<div class="form-grid">' +
            '<div class="review-item"><dt>Account number</dt><dd class="masked">' + esc(p.accountNumber) + "</dd></div>" +
            '<div class="review-item"><dt>Account status</dt><dd>' + UI.statusPill(p.accountStatus) + "</dd></div>" +
            '<div class="review-item"><dt>Verification</dt><dd>' + kycBadge + "</dd></div>" +
            '<div class="review-item"><dt>Pending applications</dt><dd>' + t.pendingApplications + "</dd></div>" +
            '<div class="review-item"><dt>Approved applications</dt><dd>' + t.approvedApplications + "</dd></div>" +
            '<div class="review-item"><dt>Next due date</dt><dd>' + (t.nextDue ? dt(t.nextDue) : "—") + "</dd></div>" +
          "</div>") +
        panel("Loan status", loan ? esc(loan.product) + " · " + esc(loan.id) : "No active loan",
          loan ? '<div class="loan-card-grid">' +
            "<div>Outstanding<strong>" + mwk(loan.outstandingPrincipal + loan.outstandingInterest) + "</strong></div>" +
            "<div>Repaid<strong>" + mwk(loan.paid) + "</strong></div>" +
            "<div>Matures<strong>" + dt(loan.maturity) + "</strong></div>" +
            "<div>Rate<strong>" + loan.rate + "% p.a.</strong></div>" +
            "<div>Method<strong>" + (loan.method === "flat" ? "Flat" : "Reducing") + "</strong></div>" +
            "<div>Status<strong>" + UI.statusPill(loan.status) + "</strong></div>" +
          "</div>" : "") +
      "</div>";
  }

  function quickAction(href, icon, label, note) {
    return '<a class="quick-action" href="' + href + '">' + icon + "<strong>" + label + "</strong><span>" + note + "</span></a>";
  }

  /* ---------------- Loans ---------------- */
  function panelLoans() {
    var loans = db().loans;
    return pageHead("My active loans", "All facilities currently on your account.",
      '<a class="btn btn--gold btn--sm" href="#apply">Apply for another loan</a>') +
      (loans.length ? '<div class="product-grid product-grid--2">' + loans.map(loanCard).join("") + "</div>"
        : UI.emptyState("No loans yet", "Once an application is approved and disbursed, your facility appears here.", { href: "#apply", label: "Apply for a loan" }));
  }

  function loanCard(l) {
    var outstanding = l.outstandingPrincipal + l.outstandingInterest + (l.outstandingFees || 0);
    return '<article class="loan-card">' +
      '<div class="loan-card-head"><div><h3>' + esc(l.product) + "</h3><span>Loan ID " + esc(l.id) + " · " + esc(l.frequency) + " repayments</span></div>" +
      UI.statusPill(l.status) + "</div>" +
      '<div class="loan-card-grid">' +
        "<div>Principal<strong>" + mwk(l.principal) + "</strong></div>" +
        "<div>Outstanding<strong>" + mwk(outstanding) + "</strong></div>" +
        "<div>Next payment<strong>" + mwk(l.nextAmount) + "</strong></div>" +
        "<div>Due date<strong>" + dt(l.nextDue) + "</strong></div>" +
        "<div>Rate<strong>" + l.rate + "% p.a. · " + (l.method === "flat" ? "flat" : "reducing") + "</strong></div>" +
        "<div>Maturity<strong>" + dt(l.maturity) + "</strong></div>" +
      "</div>" +
      '<div class="progress" style="height:6px;"><span style="width:' + l.progress + '%"></span></div>' +
      '<div class="flex items-center justify-between text-tiny text-muted"><span>' + l.progress + "% repayment progress</span><span>Total " + mwk(l.totalRepayment) + "</span></div>" +
      '<div class="loan-card-foot">' +
        '<a class="btn btn--gold btn--xs" href="#repayments?loan=' + encodeURIComponent(l.id) + '">Repay</a>' +
        '<a class="btn btn--ghost btn--xs" href="#loan?id=' + encodeURIComponent(l.id) + '">Details</a>' +
        '<a class="btn btn--ghost btn--xs" href="#schedule?loan=' + encodeURIComponent(l.id) + '">Schedule</a>' +
        '<button class="btn btn--ghost btn--xs" data-payoff="' + esc(l.id) + '" type="button">Payoff quote</button>' +
      "</div></article>";
  }

  function panelLoan() {
    var id = new URLSearchParams(location.hash.split("?")[1] || "").get("id") || (DATA.activeLoans()[0] || {}).id;
    var l = DATA.findLoan(id);
    if (!l) return pageHead("Loan details", "") + UI.emptyState("Loan not found", "Choose a loan from your active loans.", { href: "#loans", label: "Back to loans" });
    var paidRows = l.rows.filter(function (r) { return r.status === "paid"; }).length;

    return pageHead("Loan " + esc(l.id), esc(l.product) + " · disbursed " + dt(l.startDate),
      '<button class="btn btn--ghost btn--sm" type="button" data-download-agreement="' + esc(l.id) + '">Loan agreement</button>' +
      '<a class="btn btn--gold btn--sm" href="#repayments?loan=' + encodeURIComponent(l.id) + '">Make a payment</a>') +

      '<div class="stat-cards">' +
        statCard("Approved amount", mwk(l.approved), "Disbursed " + mwk(l.disbursed), ICON.loan, true) +
        statCard("Outstanding", mwk(l.outstandingPrincipal + l.outstandingInterest + (l.outstandingFees || 0)), "Principal " + mwk(l.outstandingPrincipal), ICON.wallet) +
        statCard("Repaid to date", mwk(l.paid), paidRows + " instalments settled", ICON.check) +
        statCard("Next instalment", mwk(l.nextAmount), "Due " + dt(l.nextDue), ICON.calendar) +
      "</div>" +

      '<div class="dash-grid">' +
        panel("Loan terms", null,
          '<div class="form-grid">' +
            reviewItem("Loan ID", l.id) + reviewItem("Product", l.product) +
            reviewItem("Principal", mwk(l.principal)) + reviewItem("Interest rate", l.rate + "% p.a.") +
            reviewItem("Interest method", l.method === "flat" ? "Flat rate" : "Reducing balance") +
            reviewItem("Repayment frequency", l.frequency) +
            reviewItem("Start date", dt(l.startDate)) + reviewItem("Maturity", dt(l.maturity)) +
            reviewItem("Total amount payable", mwk(l.totalRepayment)) +
            reviewItem("Fees charged", mwk(l.fees)) +
            reviewItem("Outstanding principal", mwk(l.outstandingPrincipal)) +
            reviewItem("Outstanding interest", mwk(l.outstandingInterest)) +
            reviewItem("Late payment charges", mwk(0)) +
            reviewItem("Guarantor", l.guarantor ? l.guarantor.name + " · " + l.guarantor.relationship : "Not required") +
          "</div>") +
        panel("Status history", null,
          '<div class="tracker">' + l.statusHistory.map(function (s, i) {
            var current = i === l.statusHistory.length - 1;
            return '<div class="tracker-step ' + (current ? "is-current" : "is-done") + '"><span class="tracker-dot">' + (current ? "●" : "✓") + "</span>" +
              '<div class="tracker-body"><strong>' + esc(s.status) + "</strong><span>" + dtTime(s.date) + "</span></div></div>";
          }).join("") + "</div>" +
          '<div class="flex flex-wrap gap-1" style="margin-top:1rem;">' +
            '<button class="btn btn--ghost btn--xs" type="button" data-payoff="' + esc(l.id) + '">Request payoff quotation</button>' +
            '<button class="btn btn--ghost btn--xs" type="button" data-restructure="' + esc(l.id) + '">Request restructuring</button>' +
            '<button class="btn btn--ghost btn--xs" type="button" data-settlement="' + esc(l.id) + '">Request settlement</button>' +
          "</div>") +
      "</div>" +

      panel("Repayment history", "Every scheduled instalment",
        scheduleTable(l, false),
        '<button class="btn btn--ghost btn--xs" type="button" data-print-schedule="' + esc(l.id) + '">Print</button>' +
        '<button class="btn btn--ghost btn--xs" type="button" data-csv-schedule="' + esc(l.id) + '">Download schedule</button>', true);
  }

  function reviewItem(label, value) {
    return '<div class="review-item"><dt>' + label + "</dt><dd>" + value + "</dd></div>";
  }

  function scheduleTable(l, full) {
    var rows = full ? l.rows : l.rows.slice(0, 8);
    return '<div class="table-wrap" style="border:0;border-radius:0;"><table class="data">' +
      '<thead><tr><th>#</th><th>Due date</th><th class="num">Instalment</th><th class="num">Principal</th><th class="num">Interest</th><th class="num">Fees</th><th class="num">Balance</th><th>Status</th></tr></thead><tbody>' +
      rows.map(function (r) {
        return "<tr><td>" + r.n + "</td><td>" + dt(r.date) + "</td>" +
          '<td class="num">' + mwk(r.payment) + "</td>" +
          '<td class="num">' + mwk(r.principal) + "</td>" +
          '<td class="num">' + mwk(r.interest) + "</td>" +
          '<td class="num">' + mwk(r.fees || 0) + "</td>" +
          '<td class="num">' + mwk(r.closing) + "</td>" +
          "<td>" + UI.statusPill(r.status) + "</td></tr>";
      }).join("") + "</tbody></table></div>";
  }

  /* ---------------- Applications ---------------- */
  function panelApplications() {
    var list = db().applications;
    var filter = state.filters.app;
    var filtered = list.filter(function (a) { return filter === "all" || a.status === filter; });
    var rows = filtered.map(function (a) {
      return "<tr><td><strong>" + esc(a.ref) + "</strong></td><td>" + esc(a.product) + "</td>" +
        '<td class="num">' + mwk(a.amount) + "</td><td>" + a.term + " months</td>" +
        "<td>" + dt(a.submitted) + "</td><td>" + UI.statusPill(a.status) + "</td>" +
        '<td class="actions"><button class="btn btn--ghost btn--xs" type="button" data-app="' + esc(a.ref) + '">View</button> ' +
        '<button class="btn btn--ghost btn--xs" type="button" data-app-summary="' + esc(a.ref) + '">Summary</button></td></tr>';
    }).join("");

    var tabs = ["all", "pending", "under_review", "info_required", "approved", "rejected"].map(function (k) {
      return '<button type="button" class="' + (filter === k ? "is-active" : "") + '" data-app-filter="' + k + '">' +
        k.replace(/_/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); }) + "</button>";
    }).join("");

    return pageHead("My loan applications", "Track every application from submission to decision.",
      '<a class="btn btn--gold btn--sm" href="#apply">New application</a>') +
      '<div class="tabs-bar">' + tabs + "</div>" +
      panel("All applications", filtered.length + " record(s)",
        filtered.length ? '<div class="table-wrap" style="border:0;border-radius:0;"><table class="data">' +
          tableHead([{ label: "Reference" }, { label: "Product" }, { label: "Amount", num: true }, { label: "Term" }, { label: "Submitted" }, { label: "Status" }, { label: "" }]) +
          "<tbody>" + rows + "</tbody></table></div>" :
          UI.emptyState("No applications in this view", "Try another filter, or start a new application.", { href: "#apply", label: "Apply for a loan" }),
        null, true);
  }

  function openApplication(ref) {
    var a = DATA.findApplication(ref);
    if (!a) return;
    var steps = ["Submitted", "Document check", "Credit assessment", "Affordability", "Decision", "Agreement", "Disbursement"];
    var stage = a.stage || 1;
    var tracker = steps.map(function (s, i) {
      var cls = i + 1 < stage ? "is-done" : i + 1 === stage ? "is-current" : "";
      return '<div class="tracker-step ' + cls + '"><span class="tracker-dot">' + (i + 1 < stage ? "✓" : i + 1) + "</span>" +
        '<div class="tracker-body"><strong>' + s + "</strong><span>" + (i + 1 <= stage ? "Reached" : "Pending") + "</span></div></div>";
    }).join("");

    var body = '<div class="form-grid" style="margin-bottom:1rem;">' +
      reviewItem("Reference", a.ref) + reviewItem("Product", a.product) +
      reviewItem("Requested amount", mwk(a.amount)) + reviewItem("Term", a.term + " months") +
      reviewItem("Purpose", a.purpose) + reviewItem("Submitted", dt(a.submitted)) +
      reviewItem("Status", UI.statusPill(a.status)) + reviewItem("Documents supplied", (a.documents || []).join(", ")) +
      "</div>" +
      (a.missing && a.missing.length ? '<div class="notice notice--warn" style="margin-bottom:1rem;">' + ICON.info +
        "<div><strong>Additional information required</strong>" + esc(a.reviewer || "") +
        "<ul style=\"margin:.4rem 0 0;padding-left:1.1rem;\">" + a.missing.map(function (m) { return "<li>" + esc(m) + "</li>"; }).join("") + "</ul></div></div>" : "") +
      (a.status === "rejected" && a.reviewer ? '<div class="notice notice--danger" style="margin-bottom:1rem;">' + ICON.info + "<div><strong>Decision</strong>" + esc(a.reviewer) + "</div></div>" : "") +
      '<h3 style="font-size:.9rem;margin-bottom:.7rem;">Application progress</h3><div class="tracker">' + tracker + "</div>";

    var actions = [{ label: "Close", variant: "ghost" }];
    if (a.status === "info_required") {
      actions.unshift({
        label: "Upload requested documents", variant: "gold",
        onClick: function () { UI.closeModal(); location.hash = "#documents"; }
      });
    }
    if (["pending", "under_review", "info_required"].indexOf(a.status) >= 0) {
      actions.unshift({
        label: "Withdraw application", variant: "danger",
        onClick: function () {
          UI.modal({
            title: "Withdraw this application?",
            subtitle: a.ref + " · " + a.product,
            body: "<p style=\"font-size:.86rem;\">Withdrawing stops the assessment. You can reapply when you are ready.</p>",
            actions: [
              { label: "Keep application", variant: "ghost" },
              { label: "Withdraw", variant: "danger", onClick: function () {
                  a.status = "withdrawn";
                  DATA.save();
                  DATA.notify("Application update", "Application withdrawn", a.ref + " has been withdrawn at your request.", "In-app + Email");
                  UI.toast({ title: "Application withdrawn", message: a.ref + " is now closed.", type: "success" });
                  render();
                  return true;
                } }
            ]
          });
          return false;
        }
      });
    }
    if (a.status === "rejected") {
      actions.unshift({ label: "Reapply", variant: "gold", onClick: function () { UI.closeModal(); location.hash = "#apply"; } });
    }

    UI.modal({
      title: "Application " + a.ref,
      subtitle: a.product + " · " + mwk(a.amount),
      body: body,
      actions: actions
    });
  }

  /* ---------------- Repayments ---------------- */
  function panelRepayments() {
    var loans = DATA.activeLoans();
    var selectedId = new URLSearchParams(location.hash.split("?")[1] || "").get("loan") || (loans[0] || {}).id;
    var loan = DATA.findLoan(selectedId) || loans[0];
    if (!loan) return pageHead("Loan repayments", "") + UI.emptyState("No repayable loans", "You have no active facilities to repay.", { href: "#apply", label: "Apply for a loan" });

    var due = loan.nextAmount;
    var options = loans.map(function (l) {
      return '<option value="' + esc(l.id) + '"' + (l.id === loan.id ? " selected" : "") + ">" + esc(l.id) + " · " + esc(l.product) + " · " + mwk(l.nextAmount) + " due</option>";
    }).join("");

    var history = db().transactions.filter(function (t) { return t.type === "Repayment"; }).slice(0, 6);

    return pageHead("Loan repayments", "Pay by mobile money, bank transfer or from your wallet.",
      '<a class="btn btn--ghost btn--sm" href="#schedule">View schedule</a>') +

      '<div class="dash-grid">' +
        panel("Make a repayment", "All amounts in MWK",
          '<form id="repay-form" novalidate>' +
            '<div class="field"><label for="repay-loan">Loan account</label><select id="repay-loan">' + options + "</select></div>" +
            '<div class="form-grid" style="margin-top:.9rem;">' +
              '<div class="field"><label for="repay-amount">Payment amount (MWK)</label>' +
                '<input id="repay-amount" type="number" min="1000" step="500" value="' + Math.round(due) + '">' +
                '<span class="hint">Minimum ' + mwk(1000) + " · full settlement " + mwk(loan.outstandingPrincipal + loan.outstandingInterest) + "</span></div>" +
              '<div class="field"><label for="repay-method">Payment method</label><select id="repay-method">' +
                "<option value=\"Airtel Money\">Airtel Money</option>" +
                "<option value=\"TNM Mpamba\">TNM Mpamba</option>" +
                "<option value=\"Bank transfer\">Bank transfer</option>" +
                "<option value=\"Wallet\">Wallet balance (" + mwk(walletBalance()) + ")</option>" +
              "</select></div>" +
            "</div>" +
            '<div class="field" style="margin-top:.9rem;"><label for="repay-ref">Payment reference</label>' +
              '<input id="repay-ref" type="text" value="' + esc(loan.id.replace("LN", "RP")) + '" readonly></div>' +
            '<div class="notice notice--info" style="margin-top:.9rem;">' + ICON.info +
              "<div><strong>Payment instructions</strong>Airtel Money: dial *211#, choose Pay Bill, business code 5521, reference " +
              esc(loan.id.replace("LN", "RP")) + ". TNM Mpamba: *444#, business code 8801. Bank transfer details are on your statement.</div></div>" +
            '<div class="flex flex-wrap gap-1" style="margin-top:1rem;">' +
              '<button class="btn btn--gold" type="submit">Confirm payment</button>' +
              '<button class="btn btn--ghost" type="button" data-full-settlement="' + esc(loan.id) + '">Pay full settlement</button>' +
            "</div>" +
            '<p class="form-status" id="repay-status"></p>' +
          "</form>") +
        panel("Payment summary", null,
          '<div class="form-grid">' +
            reviewItem("Loan", loan.id) + reviewItem("Amount due", mwk(due)) +
            reviewItem("Next due date", dt(loan.nextDue)) + reviewItem("Outstanding", mwk(loan.outstandingPrincipal + loan.outstandingInterest)) +
            reviewItem("Repayment frequency", loan.frequency) + reviewItem("Status", UI.statusPill(loan.status)) +
          "</div>" +
          '<div class="notice notice--warn" style="margin-top:1rem;">' + ICON.info + "<div><strong>Late payments</strong>A late payment charge of 2% per month applies to overdue instalments. Paying early reduces interest on reducing-balance loans.</div></div>") +
      "</div>" +

      panel("Payment history", "Recent repayments on all loans",
        '<div class="table-wrap" style="border:0;border-radius:0;"><table class="data">' +
        tableHead([{ label: "Reference" }, { label: "Date" }, { label: "Loan" }, { label: "Method" }, { label: "Amount", num: true }, { label: "Status" }, { label: "" }]) +
        "<tbody>" + (history.length ? history.map(function (t) {
          return "<tr><td>" + esc(t.ref) + "</td><td>" + dt(t.date) + "</td><td>" + esc(t.description.replace("Loan repayment — ", "")) + "</td>" +
            "<td>" + esc(t.method) + '</td><td class="num">' + mwk(t.amount) + "</td><td>" + UI.statusPill(t.status) + "</td>" +
            '<td class="actions"><button class="btn btn--ghost btn--xs" type="button" data-receipt="' + esc(t.ref) + '">Receipt</button></td></tr>';
        }).join("") : '<tr><td colspan="7">No repayment history yet.</td></tr>') + "</tbody></table></div>",
        '<button class="btn btn--ghost btn--xs" type="button" data-report-payment="1">Report a missing payment</button>', true);
  }

  function makeRepayment(loan, amount, method, ref) {
    var remaining = amount;
    loan.rows.forEach(function (r) {
      if (remaining <= 0 || r.status === "paid") return;
      var need = r.payment - (r.paid || 0);
      var pay = Math.min(need, remaining);
      r.paid = (r.paid || 0) + pay;
      remaining -= pay;
      if (r.paid >= r.payment - 0.5) { r.status = "paid"; r.paid = r.payment; }
      else if (r.paid > 0) r.status = "partial";
    });

    var nextUnpaid = loan.rows.filter(function (r) { return r.status !== "paid"; })[0];
    loan.paid += amount;
    loan.nextAmount = nextUnpaid ? nextUnpaid.payment : 0;
    loan.nextDue = nextUnpaid ? nextUnpaid.date : loan.maturity;
    loan.outstandingPrincipal = nextUnpaid ? loan.rows[nextUnpaid.n - 2] ? loan.rows[nextUnpaid.n - 2].closing : loan.outstandingPrincipal : 0;
    loan.progress = Math.min(100, Math.round((loan.paid / loan.totalRepayment) * 100));
    if (!nextUnpaid) loan.status = "Settled";

    var tx = DATA.addTransaction({
      type: "Repayment", description: "Loan repayment — " + loan.id,
      amount: amount, direction: "debit", status: "Completed", method: method
    });
    DATA.notify("Payment confirmation", "Payment received",
      mwk(amount) + " received for " + loan.id + " via " + method + ". Receipt " + tx.ref + " is available.", "In-app + SMS");
    DATA.save();
    return tx;
  }

  /* ---------------- Schedule ---------------- */
  function panelSchedule() {
    var loans = DATA.activeLoans();
    var selectedId = new URLSearchParams(location.hash.split("?")[1] || "").get("loan") || (loans[0] || {}).id;
    var loan = DATA.findLoan(selectedId) || loans[0];
    if (!loan) return pageHead("Repayment schedules", "") + UI.emptyState("No schedules", "Schedules appear once a loan is disbursed.", { href: "#loans", label: "View loans" });

    var paid = loan.rows.filter(function (r) { return r.status === "paid"; }).length;
    var overdue = loan.rows.filter(function (r) { return r.status === "overdue"; }).length;
    var upcoming = loan.rows.filter(function (r) { return r.status === "upcoming" || r.status === "due"; }).length;
    var outstanding = loan.rows.reduce(function (s, r) { return s + (r.status === "paid" ? 0 : r.payment); }, 0);

    var cal = state.scheduleView === "calendar" ? calendarView(loan) : scheduleTable(loan, true);

    return pageHead("Repayment schedule", esc(loan.product) + " · " + esc(loan.id),
      '<button class="btn btn--ghost btn--sm" type="button" data-print-schedule="' + esc(loan.id) + '">Print</button>' +
      '<button class="btn btn--ghost btn--sm" type="button" data-csv-schedule="' + esc(loan.id) + '">Download schedule</button>') +

      '<div class="stat-cards">' +
        statCard("Instalments paid", String(paid), "of " + loan.rows.length, ICON.check) +
        statCard("Upcoming", String(upcoming), "next " + mwk(loan.nextAmount), ICON.calendar) +
        statCard("Overdue", String(overdue), overdue ? "Late charges may apply" : "None — well done", ICON.clock, false, overdue ? "down" : "") +
        statCard("Remaining to pay", mwk(outstanding), "Total " + mwk(loan.totalRepayment), ICON.wallet, true) +
      "</div>" +

      panel("Schedule", "Instalment number, due date, principal, interest, fees and status",
        cal,
        '<button class="btn btn--ghost btn--xs" type="button" data-calendar-toggle="' + (state.scheduleView === "calendar" ? "table" : "calendar") + '">' +
          (state.scheduleView === "calendar" ? "Table view" : "Calendar view") + "</button>", true);
  }

  function calendarView(loan) {
    var byMonth = {};
    loan.rows.forEach(function (r) {
      var d = new Date(r.date);
      var key = d.getFullYear() + "-" + (d.getMonth() + 1);
      byMonth[key] = byMonth[key] || [];
      byMonth[key].push(r);
    });
    return '<div class="cal-strip" style="padding:1rem;">' + Object.keys(byMonth).map(function (key) {
      var parts = key.split("-");
      var year = parseInt(parts[0], 10), month = parseInt(parts[1], 10) - 1;
      var first = new Date(year, month, 1);
      var days = new Date(year, month + 1, 0).getDate();
      var offset = (first.getDay() + 6) % 7;
      var cells = "";
      for (var i = 0; i < offset; i++) cells += '<div class="cal-day is-empty"></div>';
      for (var d = 1; d <= days; d++) {
        var entry = byMonth[key].filter(function (r) { return new Date(r.date).getDate() === d; })[0];
        var cls = entry ? (entry.status === "paid" ? "is-paid" : "has-due") : "";
        cells += '<div class="cal-day ' + cls + '">' + d +
          (entry ? '<span class="cal-amount">' + Math.round(entry.payment / 1000) + "k</span>" : "") + "</div>";
      }
      return '<div><p style="font-size:.8rem;font-weight:600;color:var(--ink);margin-bottom:.4rem;">' +
        first.toLocaleDateString("en-GB", { month: "long", year: "numeric" }) + "</p>" +
        '<div class="cal-month">' + ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(function (h) {
          return '<div class="cal-head">' + h + "</div>";
        }).join("") + cells + "</div></div>";
    }).join("") + "</div>";
  }

  /* ---------------- Transactions ---------------- */
  function panelTransactions() {
    var f = state.filters;
    var list = db().transactions.slice();
    if (f.txType !== "all") list = list.filter(function (t) { return t.type === f.txType; });
    if (f.txStatus !== "all") list = list.filter(function (t) { return t.status === f.txStatus; });
    if (f.txFrom) list = list.filter(function (t) { return t.date.slice(0, 10) >= f.txFrom; });
    if (f.txTo) list = list.filter(function (t) { return t.date.slice(0, 10) <= f.txTo; });
    list.sort(function (a, b) {
      return f.txSort === "oldest" ? new Date(a.date) - new Date(b.date) :
        f.txSort === "amount" ? b.amount - a.amount : new Date(b.date) - new Date(a.date);
    });

    var perPage = 8;
    var page = state.pages.transactions || 1;
    var pageData = UI.paginate(list, page, perPage);
    var types = ["all"].concat(Array.from(new Set(db().transactions.map(function (t) { return t.type; }))));

    var rows = pageData.rows.map(function (t) {
      return "<tr><td>" + esc(t.ref) + "</td><td>" + dtTime(t.date) + "</td><td>" + esc(t.type) + "</td><td>" + esc(t.description) + "</td>" +
        "<td>" + esc(t.method) + "</td>" +
        '<td class="num" style="color:' + (t.direction === "credit" ? "var(--success)" : "var(--ink)") + '">' +
        (t.direction === "credit" ? "+" : "−") + " " + mwk(t.amount) + "</td>" +
        "<td>" + UI.statusPill(t.status) + "</td>" +
        '<td class="actions"><button class="btn btn--ghost btn--xs" type="button" data-tx="' + esc(t.ref) + '">View</button></td></tr>';
    }).join("");

    var toolbar =
      '<div class="flex flex-wrap gap-1" style="width:100%;">' +
        '<input id="tx-search" type="search" placeholder="Search reference or description…" style="padding:.45rem .7rem;border:1px solid var(--line);border-radius:8px;font-size:.8rem;min-width:12rem;">' +
        '<select id="tx-type" style="padding:.45rem .7rem;border:1px solid var(--line);border-radius:8px;font-size:.8rem;">' +
          types.map(function (t) { return '<option value="' + t + '"' + (f.txType === t ? " selected" : "") + ">" + (t === "all" ? "All types" : t) + "</option>"; }).join("") + "</select>" +
        '<select id="tx-status" style="padding:.45rem .7rem;border:1px solid var(--line);border-radius:8px;font-size:.8rem;">' +
          ["all", "Completed", "Pending", "Failed"].map(function (s) {
            return '<option value="' + s + '"' + (f.txStatus === s ? " selected" : "") + ">" + (s === "all" ? "All statuses" : s) + "</option>";
          }).join("") + "</select>" +
        '<input id="tx-from" type="date" value="' + f.txFrom + '" aria-label="From date" style="padding:.4rem .5rem;border:1px solid var(--line);border-radius:8px;font-size:.78rem;">' +
        '<input id="tx-to" type="date" value="' + f.txTo + '" aria-label="To date" style="padding:.4rem .5rem;border:1px solid var(--line);border-radius:8px;font-size:.78rem;">' +
        '<select id="tx-sort" style="padding:.45rem .7rem;border:1px solid var(--line);border-radius:8px;font-size:.8rem;">' +
          '<option value="newest"' + (f.txSort === "newest" ? " selected" : "") + ">Newest first</option>" +
          '<option value="oldest"' + (f.txSort === "oldest" ? " selected" : "") + ">Oldest first</option>" +
          '<option value="amount"' + (f.txSort === "amount" ? " selected" : "") + ">Highest amount</option></select>" +
      "</div>";

    return pageHead("My transactions", "Every debit, credit, fee and disbursement in MWK.",
      '<button class="btn btn--ghost btn--sm" type="button" data-export-tx="1">Export CSV</button>') +
      panel("Transaction history", pageData.total + " transaction(s)", 
        '<div style="padding:.8rem 1.1rem;border-bottom:1px solid var(--line);">' + toolbar + "</div>" +
        '<div class="table-wrap" style="border:0;border-radius:0;"><table class="data" id="tx-table">' +
        tableHead([{ label: "Reference" }, { label: "Date" }, { label: "Type" }, { label: "Description" }, { label: "Method" }, { label: "Amount", num: true }, { label: "Status" }, { label: "" }]) +
        "<tbody>" + (rows || '<tr><td colspan="8">No transactions match these filters.</td></tr>') + "</tbody></table></div>" +
        '<div class="table-foot"><span>Showing ' + (list.length ? pageData.start + 1 : 0) + "–" + Math.min(pageData.start + perPage, list.length) + " of " + list.length + "</span>" +
        UI.pagerHTML(page, pageData.pages, "transactions") + "</div>", null, true);
  }

  /* ---------------- Deposits / withdrawals / transfers ---------------- */
  function panelDeposits() {
    var rows = db().deposits.map(function (d) {
      return "<tr><td><strong>" + esc(d.ref) + "</strong></td><td>" + dt(d.date) + '</td><td class="num">' + mwk(d.amount) + "</td>" +
        "<td>" + esc(d.method) + "</td><td>" + UI.statusPill(d.status) + "</td>" +
        '<td class="actions"><button class="btn btn--ghost btn--xs" type="button" data-deposit-detail="' + esc(d.ref) + '">Details</button></td></tr>';
    }).join("");

    return pageHead("Deposits", "Fund your wallet with mobile money or a bank transfer.") +
      '<div class="dash-grid">' +
        panel("Deposit funds", null,
          '<form id="deposit-form">' +
            '<div class="form-grid">' +
              '<div class="field"><label for="dep-amount">Amount (MWK)</label><input id="dep-amount" type="number" min="1000" step="500" placeholder="250000"></div>' +
              '<div class="field"><label for="dep-method">Payment method</label><select id="dep-method">' +
                "<option>Airtel Money</option><option>TNM Mpamba</option><option>Bank transfer</option></select></div>" +
            "</div>" +
            '<div class="field" style="margin-top:.9rem;"><label for="dep-ref">Payment reference</label><input id="dep-ref" readonly value="DEP-' + Date.now().toString().slice(-6) + '"></div>' +
            '<div class="notice notice--info" style="margin-top:.9rem;">' + ICON.info +
              "<div><strong>How to deposit</strong>Use the reference above so we can reconcile your payment automatically. Deposits are confirmed within 30 minutes during business hours.</div></div>" +
            '<button class="btn btn--gold" type="submit" style="margin-top:1rem;">Submit deposit request</button>' +
            '<p class="form-status" id="deposit-status"></p>' +
          "</form>") +
        panel("Deposit summary", null,
          '<div class="form-grid">' + reviewItem("Wallet balance", mwk(walletBalance())) +
          reviewItem("Pending deposits", mwk(db().deposits.filter(function (d) { return d.status === "Pending"; }).reduce(function (s, d) { return s + d.amount; }, 0))) +
          reviewItem("Approved this quarter", mwk(db().deposits.filter(function (d) { return d.status === "Approved"; }).reduce(function (s, d) { return s + d.amount; }, 0))) +
          reviewItem("Minimum deposit", mwk(1000)) + "</div>") +
      "</div>" +
      panel("Deposit history", null,
        '<div class="table-wrap" style="border:0;border-radius:0;"><table class="data">' +
        tableHead([{ label: "Reference" }, { label: "Date" }, { label: "Amount", num: true }, { label: "Method" }, { label: "Status" }, { label: "" }]) +
        "<tbody>" + rows + "</tbody></table></div>", null, true);
  }

  function panelWithdrawals() {
    var rows = db().withdrawals.map(function (w) {
      return "<tr><td><strong>" + esc(w.ref) + "</strong></td><td>" + dt(w.date) + '</td><td class="num">' + mwk(w.amount) + "</td>" +
        "<td>" + esc(w.destination) + '</td><td class="num">' + mwk(w.fee) + "</td><td>" + UI.statusPill(w.status) + "</td>" +
        '<td class="actions">' + (w.status === "Pending" ? '<button class="btn btn--ghost btn--xs" type="button" data-cancel-withdrawal="' + esc(w.ref) + '">Cancel</button>' : "") + "</td></tr>";
    }).join("");

    return pageHead("Withdrawals", "Move money from your wallet to a verified destination.") +
      '<div class="dash-grid">' +
        panel("Request a withdrawal", "Available: " + mwk(walletBalance()),
          '<form id="withdraw-form">' +
            '<div class="form-grid">' +
              '<div class="field"><label for="wd-account">Source account</label><select id="wd-account"><option>Wallet (" + mwk(walletBalance()) + ")</option><option>Savings (" + mwk(db().savings.balance) + ")</option></select></div>' +
              '<div class="field"><label for="wd-dest">Verified destination</label><select id="wd-dest">' +
                "<option>Airtel Money •••• 3456</option><option>TNM Mpamba •••• 7890</option><option>Bank •••• 4821</option></select></div>" +
              '<div class="field"><label for="wd-amount">Amount (MWK)</label><input id="wd-amount" type="number" min="5000" step="500" placeholder="150000"></div>' +
              '<div class="field"><label>Transaction fee</label><input value="MWK 1,500 (flat)" readonly></div>' +
            "</div>" +
            '<div class="field" style="margin-top:.9rem;"><label for="wd-note">Reason (optional)</label><input id="wd-note" placeholder="e.g. supplier payment"></div>' +
            '<button class="btn btn--gold" type="submit" style="margin-top:1rem;">Confirm withdrawal</button>' +
            '<p class="form-status" id="withdraw-status"></p>' +
          "</form>") +
        panel("Withdrawal rules", null,
          '<ul class="card-list"><li>Minimum withdrawal: MWK 5,000</li><li>Flat fee: MWK 1,500</li><li>Verified destinations only</li>' +
          '<li>Requests before 14:00 are processed same day</li><li>Pending requests can be cancelled</li></ul>' +
          '<div class="notice notice--warn" style="margin-top:.8rem;">' + ICON.info + "<div>Withdrawing savings may reduce interest earned for the month.</div></div>") +
      "</div>" +
      panel("Withdrawal history", null,
        '<div class="table-wrap" style="border:0;border-radius:0;"><table class="data">' +
        tableHead([{ label: "Reference" }, { label: "Date" }, { label: "Amount", num: true }, { label: "Destination" }, { label: "Fee", num: true }, { label: "Status" }, { label: "" }]) +
        "<tbody>" + rows + "</tbody></table></div>", null, true);
  }

  function panelTransfers() {
    var rows = db().transfers.map(function (t) {
      return "<tr><td><strong>" + esc(t.ref) + "</strong></td><td>" + dt(t.date) + "</td><td>" + esc(t.from) + "</td><td>" + esc(t.to) + "</td>" +
        '<td class="num">' + mwk(t.amount) + '</td><td class="num">' + mwk(t.fee) + "</td><td>" + UI.statusPill(t.status) + "</td>" +
        '<td class="actions"><button class="btn btn--ghost btn--xs" type="button" data-transfer-receipt="' + esc(t.ref) + '">Receipt</button></td></tr>';
    }).join("");

    return pageHead("Transfers", "Move money between your accounts or to another customer.") +
      '<div class="dash-grid">' +
        panel("New transfer", null,
          '<form id="transfer-form">' +
            '<div class="form-grid">' +
              '<div class="field"><label for="tr-from">From</label><select id="tr-from"><option>Wallet</option><option>Savings</option></select></div>' +
              '<div class="field"><label for="tr-kind">Transfer type</label><select id="tr-kind"><option value="own">Between my accounts</option><option value="other">To another customer</option></select></div>' +
            "</div>" +
            '<div class="field" style="margin-top:.9rem;"><label for="tr-to">Recipient</label>' +
              '<input id="tr-to" placeholder="Account number, e.g. JC-ACC-100887"></div>' +
            '<div class="field" style="margin-top:.9rem;"><label for="tr-name">Recipient name</label><input id="tr-name" placeholder="Name on account"></div>' +
            '<div class="field" style="margin-top:.9rem;"><label for="tr-amount">Amount (MWK)</label><input id="tr-amount" type="number" min="1000" step="500" placeholder="50000">' +
              '<span class="hint" id="tr-fee-hint">Fee: MWK 500 for transfers to other customers. No fee between your own accounts.</span></div>' +
            '<button class="btn btn--gold" type="submit" style="margin-top:1rem;">Review and confirm</button>' +
            '<p class="form-status" id="transfer-status"></p>' +
          "</form>") +
        panel("Transfer limits", null,
          '<div class="form-grid">' + reviewItem("Per transfer", mwk(500000)) + reviewItem("Daily limit", mwk(2000000)) +
          reviewItem("Fee (own accounts)", mwk(0)) + reviewItem("Fee (other customer)", mwk(500)) + "</div>" +
          '<div class="notice notice--info" style="margin-top:.9rem;">' + ICON.shield + "<div><strong>Verification</strong>Transfers to another customer require recipient verification before funds move.</div></div>") +
      "</div>" +
      panel("Transfer history", null,
        '<div class="table-wrap" style="border:0;border-radius:0;"><table class="data">' +
        tableHead([{ label: "Reference" }, { label: "Date" }, { label: "From" }, { label: "To" }, { label: "Amount", num: true }, { label: "Fee", num: true }, { label: "Status" }, { label: "" }]) +
        "<tbody>" + rows + "</tbody></table></div>", null, true);
  }

  /* ---------------- Savings ---------------- */
  function panelSavings() {
    var s = db().savings;
    return pageHead("Savings", "Grow your goals at " + s.rate + "% p.a.") +
      '<div class="stat-cards">' +
        statCard("Savings balance", mwk(s.balance), "Account " + s.accountNumber, ICON.piggy, true) +
        statCard("Interest earned", mwk(s.interestEarned), "Year to date", ICON.chart) +
        statCard("Goals", String(s.goals.length), "Active savings goals", ICON.check) +
        statCard("Account status", s.status, "Opened " + dt(s.opened), ICON.shield) +
      "</div>" +
      '<div class="dash-grid">' +
        panel("Savings goals", "Progress toward each target",
          s.goals.map(function (g) {
            var pct = Math.min(100, Math.round((g.saved / g.target) * 100));
            return '<div style="padding:.55rem 0;">' +
              '<div class="flex items-center justify-between" style="margin-bottom:.3rem;"><strong style="font-size:.84rem;color:var(--ink);">' + esc(g.name) + "</strong>" +
              '<span class="text-tiny text-muted">' + pct + "% · " + mwk(g.saved) + " of " + mwk(g.target) + "</span></div>" +
              '<div class="progress"><span style="width:' + pct + '%"></span></div>' +
              '<div class="text-tiny text-muted" style="margin-top:.25rem;">Target date ' + dt(g.due) + "</div></div>";
          }).join("")) +
        panel("Move money", null,
          '<form id="savings-form">' +
            '<div class="field"><label for="sv-action">Action</label><select id="sv-action"><option value="deposit">Deposit to savings</option><option value="withdraw">Withdraw from savings</option></select></div>' +
            '<div class="field" style="margin-top:.8rem;"><label for="sv-goal">Goal</label><select id="sv-goal">' +
              s.goals.map(function (g) { return "<option>" + esc(g.name) + "</option>"; }).join("") + "</select></div>" +
            '<div class="field" style="margin-top:.8rem;"><label for="sv-amount">Amount (MWK)</label><input id="sv-amount" type="number" min="1000" step="500" placeholder="50000"></div>' +
            '<button class="btn btn--gold" type="submit" style="margin-top:.9rem;">Confirm</button>' +
            '<p class="form-status" id="savings-status"></p>' +
          "</form>" +
          '<div class="notice notice--info" style="margin-top:.9rem;">' + ICON.info + "<div>Savings statements are available on the statements page. Terms apply to early withdrawals.</div></div>") +
      "</div>" +
      panel("Savings transaction history", null,
        '<div class="table-wrap" style="border:0;border-radius:0;"><table class="data">' +
        tableHead([{ label: "Reference" }, { label: "Date" }, { label: "Type" }, { label: "Amount", num: true }, { label: "Status" }]) +
        "<tbody>" + db().transactions.filter(function (t) { return t.type === "Transfer" || t.type === "Interest" || t.type === "Deposit"; }).map(function (t) {
          return "<tr><td>" + esc(t.ref) + "</td><td>" + dt(t.date) + "</td><td>" + esc(t.type) + '</td><td class="num">' + mwk(t.amount) + "</td><td>" + UI.statusPill(t.status) + "</td></tr>";
        }).join("") + "</tbody></table></div>", null, true);
  }

  /* ---------------- Statements ---------------- */
  function panelStatements() {
    var rows = db().statements.map(function (s) {
      return "<tr><td><strong>" + esc(s.ref) + "</strong></td><td>" + esc(s.period) + "</td>" +
        "<td>" + dt(s.from) + " – " + dt(s.to) + '</td><td class="num">' + mwk(s.opening) + '</td><td class="num">' + mwk(s.closing) + "</td>" +
        "<td>" + UI.statusPill(s.status) + "</td>" +
        '<td class="actions"><button class="btn btn--ghost btn--xs" type="button" data-statement="' + esc(s.ref) + '">View</button> ' +
        '<button class="btn btn--ghost btn--xs" type="button" data-statement-dl="' + esc(s.ref) + '">Download</button></td></tr>';
    }).join("");

    return pageHead("Account statements", "Generate, print and download statements in MWK.") +
      '<div class="dash-grid">' +
        panel("Generate a statement", "Choose an account and period",
          '<form id="statement-form">' +
            '<div class="form-grid">' +
              '<div class="field"><label for="st-account">Account</label><select id="st-account"><option>Wallet ' + esc(profile().accountNumber) + '</option><option>Savings ' + esc(db().savings.accountNumber) + '</option><option>Loan LN-2026-0412</option></select></div>' +
              '<div class="field"><label for="st-range">Range</label><select id="st-range"><option>Last 30 days</option><option>Last 90 days</option><option>This year</option><option>Custom</option></select></div>' +
              '<div class="field"><label for="st-from">From</label><input id="st-from" type="date" value="' + new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10) + '"></div>' +
              '<div class="field"><label for="st-to">To</label><input id="st-to" type="date" value="' + new Date().toISOString().slice(0, 10) + '"></div>' +
            "</div>" +
            '<button class="btn btn--gold" type="submit" style="margin-top:1rem;">Generate statement</button>' +
            '<p class="form-status" id="statement-status"></p>' +
          "</form>") +
        panel("Statement notes", null,
          '<ul class="card-list"><li>Statements show opening and closing balances in MWK</li><li>Includes deposits, withdrawals, disbursements and repayments</li>' +
          '<li>Fees and interest entries are itemised</li><li>Every statement carries a verification reference</li></ul>' +
          '<form id="verify-statement-form" novalidate style="margin-top:1rem;">' +
            '<div class="field"><label for="verify-statement-ref">Verify a statement</label>' +
            '<input id="verify-statement-ref" placeholder="STM-2026-…"><span class="hint">Enter the reference printed on a statement we issued</span></div>' +
            '<button class="btn btn--ghost btn--sm" type="submit" style="margin-top:.6rem;">Verify reference</button>' +
            '<p class="form-status" id="verify-statement-status" role="status" aria-live="polite"></p>' +
          "</form>") +
      "</div>" +
      panel("Statement history", null,
        '<div class="table-wrap" style="border:0;border-radius:0;"><table class="data">' +
        tableHead([{ label: "Reference" }, { label: "Period" }, { label: "Dates" }, { label: "Opening", num: true }, { label: "Closing", num: true }, { label: "Status" }, { label: "" }]) +
        "<tbody>" + rows + "</tbody></table></div>", null, true);
  }

  /* ---------------- Documents / KYC ---------------- */
  function panelDocuments() {
    var docs = db().documents;
    var filter = state.docsFilter;
    var list = docs.filter(function (d) { return filter === "all" || d.status.toLowerCase() === filter; });
    var verified = docs.filter(function (d) { return d.status === "Approved"; }).length;

    var rows = list.map(function (d) {
      return '<div class="doc-row">' +
        '<span class="doc-ico">' + ICON.file + "</span>" +
        "<div><strong>" + esc(d.name) + "</strong><span>" + esc(d.category) + " · uploaded " + dt(d.uploaded) +
        (d.expiry ? " · expires " + dt(d.expiry) : "") + "</span>" +
        (d.note ? '<span style="display:block;color:' + (d.status === "Rejected" ? "var(--danger)" : "var(--muted)") + ';margin-top:.15rem;">' + esc(d.note) + "</span>" : "") +
        "</div>" +
        "<div>" + UI.statusPill(d.status) + "</div>" +
        '<div class="doc-actions" style="display:flex;gap:.3rem;">' +
          '<button class="btn btn--ghost btn--xs" type="button" data-doc-upload="' + esc(d.id) + '">' + (d.status === "Rejected" ? "Replace" : "Upload") + "</button>" +
          '<button class="btn btn--ghost btn--xs" type="button" data-doc-view="' + esc(d.id) + '">View</button>' +
        "</div></div>";
    }).join("");

    return pageHead("KYC & documents", "Identity verification and supporting documents.",
      '<button class="btn btn--gold btn--sm" type="button" data-doc-upload="new">Upload document</button>') +
      '<div class="stat-cards">' +
        statCard("KYC status", profile().kyc, "Reviewed by compliance", ICON.shield, true) +
        statCard("Documents approved", verified + " of " + docs.length, "All required documents", ICON.check) +
        statCard("Pending review", String(docs.filter(function (d) { return d.status === "Pending"; }).length), "Usually within 24 hours", ICON.clock) +
        statCard("Action required", String(docs.filter(function (d) { return d.status === "Rejected"; }).length), "Rejected or expired", ICON.info, false, "down") +
      "</div>" +
      panel("Required documents checklist", "Upload PDF, JPG or PNG up to 5 MB each",
        '<div class="notice notice--warn" style="margin-bottom:1rem;">' + ICON.info + "<div><strong>Expired documents</strong>Replace expired documents promptly. Applications may be paused until KYC is complete.</div></div>" +
        '<div class="doc-list" style="border:1px solid var(--line);border-radius:12px;overflow:hidden;">' +
        '<div class="tabs-bar" style="margin:0;padding:.4rem .8rem 0;">' +
          ["all", "approved", "pending", "rejected"].map(function (k) {
            return '<button type="button" class="' + (filter === k ? "is-active" : "") + '" data-doc-filter="' + k + '">' +
              k.charAt(0).toUpperCase() + k.slice(1) + "</button>";
          }).join("") + "</div>" +
        (rows || '<div style="padding:1.4rem;">' + UI.emptyState("No documents in this view", "Try another filter.") + "</div>") +
        "</div>", null, true) +
      panel("Document security", null,
        '<div class="notice notice--info">' + ICON.lock + "<div><strong>How we protect your documents</strong>Documents are encrypted at rest and visible only to you and authorised compliance staff. Identification numbers are masked throughout the portal. Access is logged.</div></div>");
  }

  /* ---------------- Notifications ---------------- */
  function panelNotifications() {
    var filter = state.filters.notif;
    var list = db().notifications.filter(function (n) {
      if (filter === "unread") return !n.read;
      if (filter === "read") return n.read;
      if (filter === "security") return n.type === "Security" || n.type === "Security alert";
      return true;
    });

    var rows = list.map(function (n) {
      return '<div class="notif-item ' + (n.read ? "read" : "unread") + '">' +
        '<span class="notif-dot"></span>' +
        "<div><strong>" + esc(n.title) + "</strong><p>" + esc(n.body) + "</p>" +
        '<div class="notif-meta"><span>' + UI.timeAgo(n.date) + "</span><span>·</span><span>" + esc(n.type) + "</span><span>·</span><span>" + esc(n.channel) + "</span></div></div>" +
        '<div class="notif-actions">' +
          (!n.read ? '<button class="btn btn--ghost btn--xs" type="button" data-notif-read="' + esc(n.id) + '">Mark read</button>' : "") +
        "</div></div>";
    }).join("");

    return pageHead("Notifications", "Application updates, repayments, security alerts and statements.",
      '<button class="btn btn--ghost btn--sm" type="button" data-mark-all>Mark all as read</button>' +
      '<a class="btn btn--gold btn--sm" href="#settings">Preferences</a>') +
      '<div class="tabs-bar">' +
        [["all", "All"], ["unread", "Unread"], ["read", "Read"], ["security", "Security"]].map(function (pair) {
          return '<button type="button" class="' + (filter === pair[0] ? "is-active" : "") + '" data-notif-filter="' + pair[0] + '">' + pair[1] + "</button>";
        }).join("") +
      "</div>" +
      panel("Notification history", list.length + " item(s)",
        '<div class="notif-list" style="margin:-1.1rem;">' + (rows || '<div style="padding:1rem;">' + UI.emptyState("Nothing here", "You have no notifications in this view.") + "</div>") + "</div>", null, true) +
      panel("Notification channels", "Configured in Settings",
        '<div class="form-grid">' + reviewItem("Email", db().settings.notifications.email ? "Enabled" : "Disabled") +
        reviewItem("SMS", db().settings.notifications.sms ? "Enabled" : "Disabled") +
        reviewItem("In-app", db().settings.notifications.inApp ? "Enabled" : "Disabled") +
        reviewItem("Security alerts", "Always on (cannot be disabled)") + "</div>");
  }

  /* ---------------- Support ---------------- */
  function panelSupport() {
    var tickets = db().tickets;
    var rows = tickets.map(function (t) {
      return "<tr><td><strong>" + esc(t.ref) + "</strong></td><td>" + esc(t.category) + "</td><td>" + esc(t.subject) + "</td>" +
        "<td>" + dt(t.created) + "</td><td>" + UI.statusPill(t.status) + "</td>" +
        '<td class="actions"><button class="btn btn--ghost btn--xs" type="button" data-ticket="' + esc(t.ref) + '">Open</button></td></tr>';
    }).join("");

    return pageHead("Customer support", "Raise a ticket, track progress, or contact the team.",
      '<a class="btn btn--ghost btn--sm" href="support.html">Help centre</a>' +
      '<button class="btn btn--gold btn--sm" type="button" data-new-ticket="1">New ticket</button>') +
      '<div class="stat-cards">' +
        statCard("Open tickets", String(tickets.filter(function (t) { return t.status === "Open"; }).length), "Awaiting first reply", ICON.support) +
        statCard("In progress", String(tickets.filter(function (t) { return t.status === "In progress"; }).length), "Being handled", ICON.clock, true) +
        statCard("Resolved", String(tickets.filter(function (t) { return t.status === "Resolved" || t.status === "Closed"; }).length), "Closed this year", ICON.check) +
        statCard("Response time", "< 4 hrs", "Business hours", ICON.chat || ICON.support) +
      "</div>" +
      panel("My tickets", "Ticket reference, category, status and updates",
        '<div class="table-wrap" style="border:0;border-radius:0;"><table class="data">' +
        tableHead([{ label: "Reference" }, { label: "Category" }, { label: "Subject" }, { label: "Created" }, { label: "Status" }, { label: "" }]) +
        "<tbody>" + (rows || '<tr><td colspan="6">' + UI.emptyState("No tickets yet", "Create a ticket and we will respond within four business hours.") + "</td></tr>") + "</tbody></table></div>", null, true) +
      panel("Contact customer service", null,
        '<div class="form-grid">' + reviewItem("Phone", "+265 999 123 456") + reviewItem("Email", "support@jaycobfinancial.mw") +
        reviewItem("Hours", "Mon–Fri 08:00–17:00 · Sat 09:00–12:00") + reviewItem("Emergency (lost card / fraud)", "+265 888 456 789") + "</div>");
  }

  function openTicket(ref) {
    var t = db().tickets.filter(function (x) { return x.ref === ref; })[0];
    if (!t) return;
    var thread = t.messages.map(function (m) {
      var mine = m.from === "You";
      return '<div style="margin-bottom:.7rem;' + (mine ? "text-align:right;" : "") + '">' +
        '<div style="display:inline-block;max-width:88%;text-align:left;background:' + (mine ? "var(--navy-800);color:#e8eef3" : "var(--cream)") + ';border-radius:11px;padding:.6rem .8rem;">' +
        '<p class="text-tiny" style="margin-bottom:.2rem;color:' + (mine ? "#9db1c2" : "var(--muted)") + ';">' + esc(m.from) + " · " + dtTime(m.date) + "</p>" +
        '<p style="margin:0;font-size:.83rem;">' + esc(m.text) + "</p></div></div>";
    }).join("");

    var body = '<div class="flex flex-wrap gap-1" style="margin-bottom:.8rem;">' + UI.statusPill(t.status) +
      '<span class="pill pill--neutral">' + esc(t.category) + "</span></div>" +
      '<div style="max-height:300px;overflow:auto;padding-right:.3rem;">' + thread + "</div>" +
      '<div class="field" style="margin-top:.9rem;"><label for="ticket-reply">Reply</label><textarea id="ticket-reply" placeholder="Write a reply…"></textarea></div>';

    UI.modal({
      title: t.subject,
      subtitle: t.ref + " · created " + dt(t.created),
      body: body,
      actions: [
        { label: "Close", variant: "ghost" },
        t.status === "Closed" || t.status === "Resolved"
          ? { label: "Reopen ticket", variant: "gold", onClick: function () {
              t.status = "Open"; t.updated = new Date().toISOString(); DATA.save();
              UI.toast({ title: "Ticket reopened", message: t.ref + " is open again.", type: "success" });
              UI.closeModal(); render(); return true;
            } }
          : { label: "Send reply", variant: "gold", onClick: function () {
              var ta = document.getElementById("ticket-reply");
              var val = (ta.value || "").trim();
              if (!val) { ta.focus(); return false; }
              t.messages.push({ from: "You", text: val, date: new Date().toISOString() });
              t.status = "In progress";
              t.updated = new Date().toISOString();
              DATA.notify("Support ticket update", "Support ticket updated", "Your reply on " + t.ref + " was received. Our team will respond within four business hours.", "In-app + Email");
              DATA.save();
              UI.closeModal(); render();
              UI.toast({ title: "Reply sent", message: "We will respond within four business hours.", type: "success" });
              return true;
            } },
        t.status !== "Closed" ? { label: "Close ticket", variant: "ghost", onClick: function () {
            t.status = "Closed"; DATA.save(); UI.closeModal(); render();
            UI.toast({ title: "Ticket closed", message: t.ref + " marked as closed.", type: "success" });
            return true;
          } } : { label: "Hide", variant: "ghost" }
      ]
    });
  }

  function newTicketDialog() {
    UI.modal({
      title: "Create a support ticket",
      subtitle: "We respond within four business hours.",
      body:
        '<div class="form-grid">' +
          '<div class="field field--full"><label for="nt-subject">Subject</label><input id="nt-subject" placeholder="Short summary"></div>' +
          '<div class="field field--full"><label for="nt-category">Issue category</label><select id="nt-category">' +
            ["Loan application enquiry", "Loan repayment enquiry", "Missing payment", "Account access issue", "KYC and documents", "Transaction enquiry", "Complaint"].map(function (c) {
              return '<option>' + c + "</option>";
            }).join("") + "</select></div>" +
          '<div class="field field--full"><label for="nt-message">Message</label><textarea id="nt-message" placeholder="Describe the issue and include any reference numbers."></textarea></div>' +
        "</div>" + '<div class="field" style="margin-top:.8rem;"><label class="check-row"><input type="checkbox" id="nt-attach"><span>I have supporting documents to attach</span></label></div>',
      actions: [
        { label: "Cancel", variant: "ghost" },
        { label: "Create ticket", variant: "gold", onClick: function () {
            var subject = document.getElementById("nt-subject").value.trim();
            var msg = document.getElementById("nt-message").value.trim();
            if (!subject || !msg) { UI.toast({ title: "Missing details", message: "Add a subject and a message.", type: "danger" }); return false; }
            var ref = DATA.reference("TKT");
            db().tickets.unshift({
              ref: ref, category: document.getElementById("nt-category").value,
              subject: subject, status: "Open",
              created: new Date().toISOString(), updated: new Date().toISOString(),
              messages: [{ from: "You", text: msg, date: new Date().toISOString() }]
            });
            DATA.save();
            DATA.notify("Support ticket", "Ticket " + ref + " created", "We received your request and will respond within four business hours.", "In-app + Email");
            UI.closeModal(); render();
            UI.toast({ title: "Ticket created", message: ref + " is open. Track it under Support.", type: "success" });
            return true;
          } }
      ]
    });
  }

  /* ---------------- Profile ---------------- */
  function panelProfile() {
    var p = profile();
    return pageHead("My profile", "Your personal, contact and employment details.",
      '<a class="btn btn--ghost btn--sm" href="#security">Account security</a>') +
      '<div class="dash-grid">' +
        panel("Profile", "Fields marked with a lock require re-verification when changed",
          '<form id="profile-form">' +
            '<div class="flex items-center gap-2" style="margin-bottom:1rem;">' +
              '<span class="avatar" style="width:58px;height:58px;font-size:1.05rem;background:var(--emerald-liquid);color:var(--gold-200);">' + esc(p.avatar) + "</span>" +
              "<div><strong style=\"display:block;color:var(--ink);\">" + esc(p.fullName) + "</strong>" +
              '<span class="text-tiny text-muted">Client since ' + dt(p.memberSince) + " · " + esc(p.accountNumber) + "</span>" +
              '<div style="margin-top:.3rem;">' + UI.statusPill(p.verification) + "</div></div>" +
              '<button class="btn btn--ghost btn--xs" type="button" style="margin-left:auto;" data-avatar-upload="1">Change photo</button>' +
            "</div>" +
            '<div class="form-grid">' +
              '<div class="field"><label for="pf-first">First name</label><input id="pf-first" value="' + esc(p.firstName) + '"></div>' +
              '<div class="field"><label for="pf-last">Surname</label><input id="pf-last" value="' + esc(p.lastName) + '"></div>' +
              '<div class="field"><label for="pf-dob">Date of birth 🔒</label><input id="pf-dob" type="date" value="' + esc(p.dob) + '" readonly></div>' +
              '<div class="field"><label for="pf-gender">Gender</label><select id="pf-gender">' +
                ["Female", "Male", "Prefer not to say"].map(function (g) { return "<option" + (p.gender === g ? " selected" : "") + ">" + g + "</option>"; }).join("") + "</select></div>" +
              '<div class="field"><label for="pf-nid">National ID 🔒</label><input id="pf-nid" class="masked" value="' + esc(F.mask(p.nid, 4)) + '" readonly></div>' +
              '<div class="field"><label for="pf-phone">Phone number</label><input id="pf-phone" value="' + esc(p.phone) + '"></div>' +
              '<div class="field"><label for="pf-email">Email address</label><input id="pf-email" type="email" value="' + esc(p.email) + '"></div>' +
              '<div class="field"><label for="pf-pref">Contact preference</label><select id="pf-pref">' +
                ["WhatsApp", "Phone call", "Email", "SMS"].map(function (c) { return "<option" + (p.contactPreference === c ? " selected" : "") + ">" + c + "</option>"; }).join("") + "</select></div>" +
              '<div class="field field--full"><label for="pf-address">Residential address</label><input id="pf-address" value="' + esc(p.address) + '"></div>' +
              '<div class="field"><label for="pf-occupation">Occupation</label><input id="pf-occupation" value="' + esc(p.occupation) + '"></div>' +
              '<div class="field"><label for="pf-employer">Employer / business</label><input id="pf-employer" value="' + esc(p.employer) + '"></div>' +
              '<div class="field"><label for="pf-income">Monthly income (MWK)</label><input id="pf-income" type="number" value="' + p.monthlyIncome + '"></div>' +
              '<div class="field"><label for="pf-expenses">Monthly expenses (MWK)</label><input id="pf-expenses" type="number" value="' + p.monthlyExpenses + '"></div>' +
            "</div>" +
            '<div class="fieldset-title">Next of kin</div>' +
            '<div class="form-grid form-grid--3">' +
              '<div class="field"><label for="pf-nok-name">Full name</label><input id="pf-nok-name" value="' + esc(p.nextOfKin.name) + '"></div>' +
              '<div class="field"><label for="pf-nok-rel">Relationship</label><input id="pf-nok-rel" value="' + esc(p.nextOfKin.relationship) + '"></div>' +
              '<div class="field"><label for="pf-nok-phone">Phone</label><input id="pf-nok-phone" value="' + esc(p.nextOfKin.phone) + '"></div>' +
            "</div>" +
            '<div class="flex flex-wrap gap-1" style="margin-top:1.1rem;">' +
              '<button class="btn btn--gold" type="submit">Save profile changes</button>' +
              '<button class="btn btn--ghost" type="button" data-data-request="1">Request my data</button>' +
            "</div>" +
            '<p class="form-status" id="profile-status"></p>' +
          "</form>") +
        panel("Account summary", null,
          '<div class="form-grid">' + reviewItem("Account number", p.accountNumber) + reviewItem("Account status", UI.statusPill(p.accountStatus)) +
          reviewItem("Verification", UI.statusPill(p.verification)) + reviewItem("KYC", UI.statusPill(p.kyc)) +
          reviewItem("Member since", dt(p.memberSince)) + reviewItem("Last update", dt(db().security.passwordChanged)) + "</div>" +
          '<div class="notice notice--info" style="margin-top:1rem;">' + ICON.lock + "<div><strong>Protected fields</strong>Date of birth and national ID cannot be edited here. Contact support to change them — re-verification is required.</div></div>") +
      "</div>";
  }

  /* ---------------- Security ---------------- */
  function panelSecurity() {
    var s = db().security;
    var mfa = s.mfa;
    var sessions = db().sessions.map(function (x) {
      return '<div class="doc-row">' +
        '<span class="doc-ico">' + ICON.lock + "</span>" +
        "<div><strong>" + esc(x.device) + (x.current ? ' <span class="pill pill--ok">This device</span>' : "") + "</strong>" +
        "<span>" + esc(x.location) + " · IP " + esc(x.ip) + " · last active " + UI.timeAgo(x.lastActive) + "</span></div>" +
        "<div></div>" +
        '<div class="doc-actions">' + (!x.current ? '<button class="btn btn--ghost btn--xs" type="button" data-revoke="' + esc(x.device) + '">Sign out</button>' : "") + "</div></div>";
    }).join("");

    var logins = db().logins.map(function (l) {
      return "<tr><td>" + dtTime(l.date) + "</td><td>" + esc(l.device) + "</td><td>" + esc(l.location) + "</td><td>" +
        (l.status === "Success" ? UI.statusPill("Success") : UI.statusPill("Failed")) + "</td></tr>";
    }).join("");

    return pageHead("Account security", "Password, verification, sessions and login activity.") +
      '<div class="dash-grid">' +
        panel("Change password", "Use at least 8 characters with a number and a symbol",
          '<form id="password-form">' +
            '<div class="field"><label for="sec-current">Current password</label>' +
              '<div class="pw-wrap"><input id="sec-current" type="password" autocomplete="current-password">' +
              pwToggle("sec-current") + '</div></div>' +
            '<div class="field" style="margin-top:.8rem;"><label for="sec-new">New password</label>' +
              '<div class="pw-wrap"><input id="sec-new" type="password" autocomplete="new-password">' +
              pwToggle("sec-new") + '</div></div>' +
            '<div class="pw-meter" id="sec-meter"><i></i><i></i><i></i><i></i><i></i></div>' +
            '<p class="pw-hint" id="sec-hint">Use at least 8 characters, including a number and a symbol.</p>' +
            '<div class="field" style="margin-top:.8rem;"><label for="sec-confirm">Confirm new password</label>' +
              '<div class="pw-wrap"><input id="sec-confirm" type="password" autocomplete="new-password">' +
              pwToggle("sec-confirm") + '</div></div>' +
            '<button class="btn btn--gold" type="submit" style="margin-top:.9rem;">Update password</button>' +
            '<p class="form-status" id="security-status"></p>' +
          "</form>") +
        panel("Verification & MFA", null,
          '<div class="switch-row"><div><strong>Email verified</strong><span>' + esc(profile().email) + "</span></div>" + UI.statusPill("Verified") + "</div>" +
          '<div class="switch-row"><div><strong>Phone verified</strong><span>' + esc(profile().phone) + "</span></div>" + UI.statusPill("Verified") + "</div>" +
          '<div class="switch-row"><div><strong>Multi-factor authentication</strong><span>Require a one-time code at every sign-in</span></div>' +
            '<label class="switch"><input type="checkbox" id="mfa-toggle"' + (mfa ? " checked" : "") + '><i></i></label></div>' +
          '<div class="switch-row"><div><strong>Last password change</strong><span>' + dtTime(s.passwordChanged) + "</span></div></div>" +
          '<div class="notice notice--warn" style="margin-top:.9rem;">' + ICON.shield + "<div><strong>Lockout protection</strong>Five failed sign-in attempts lock the account for five minutes. Failed attempts are logged and trigger a security alert.</div></div>" +
          '<button class="btn btn--ghost btn--sm" type="button" data-report-suspicious="1" style="margin-top:.8rem;">Report suspicious activity</button>') +
      "</div>" +
      panel("Active sessions", "Devices currently signed in",
        '<div class="doc-list" style="border:1px solid var(--line);border-radius:12px;overflow:hidden;">' + sessions + "</div>",
        '<button class="btn btn--ghost btn--xs" type="button" data-revoke-all="1">Sign out other sessions</button>', true) +
      panel("Recent login activity", null,
        '<div class="table-wrap" style="border:0;border-radius:0;"><table class="data">' +
        tableHead([{ label: "Date & time" }, { label: "Device" }, { label: "Location" }, { label: "Result" }]) +
        "<tbody>" + logins + "</tbody></table></div>", null, true) +
      panel("Account protection", null,
        '<div class="flex flex-wrap gap-1">' +
          '<button class="btn btn--ghost btn--sm" type="button" data-restrict="1">Request account restriction</button>' +
          '<button class="btn btn--ghost btn--sm" type="button" data-close-account="1">Request account closure</button>' +
          '<button class="btn btn--ghost btn--sm" type="button" data-logout>Sign out securely</button>' +
        "</div>");
  }

  /* ---------------- Settings ---------------- */
  function panelSettings() {
    var s = db().settings;
    function row(id, title, note, checked) {
      return '<div class="switch-row"><div><strong>' + title + "</strong><span>" + note + "</span></div>" +
        '<label class="switch"><input type="checkbox" id="' + id + '"' + (checked ? " checked" : "") + "><i></i></label></div>";
    }
    return pageHead("Settings", "Preferences for language, notifications, privacy and accessibility.") +
      '<div class="dash-grid">' +
        panel("Personal preferences", null,
          '<div class="form-grid">' +
            '<div class="field"><label for="set-language">Language</label><select id="set-language">' +
              '<option value="en"' + (s.language === "en" ? " selected" : "") + ">English</option>" +
              '<option value="ny"' + (s.language === "ny" ? " selected" : "") + ">Chichewa</option></select></div>" +
            '<div class="field"><label for="set-currency">Currency</label><select id="set-currency"><option>MWK — Malawian Kwacha</option></select></div>' +
          "</div>" +
          '<div class="fieldset-title">Accessibility</div>' +
          row("set-large-text", "Larger text", "Increase base font size across the dashboard", s.accessibility.largeText) +
          row("set-reduce-motion", "Reduce motion", "Turn off non-essential animation", s.accessibility.reduceMotion) +
          row("set-high-contrast", "Higher contrast", "Strengthen text and border contrast", s.accessibility.highContrast) +
          '<button class="btn btn--gold" type="button" data-save-settings="1" style="margin-top:1rem;">Save settings</button>' +
          '<p class="form-status" id="settings-status"></p>') +
        panel("Notifications & privacy", null,
          row("set-email", "Email notifications", "Applications, statements and security", s.notifications.email) +
          row("set-sms", "SMS notifications", "Repayment reminders and alerts", s.notifications.sms) +
          row("set-inapp", "In-app notifications", "Show updates in the dashboard", s.notifications.inApp) +
          row("set-reminders", "Repayment reminders", "3 days before each instalment", s.notifications.repaymentReminders) +
          row("set-marketing", "Marketing communications", "Product news and offers", s.notifications.marketing) +
          row("set-share", "Share data with my advisor", "Advisors can view statements and KYC status", s.privacy.shareWithAdvisors) +
          row("set-analytics", "Anonymous analytics", "Help improve the portal", s.privacy.analytics)) +
      "</div>" +
      panel("Your data and policies", null,
        '<div class="flex flex-wrap gap-1">' +
          '<button class="btn btn--ghost btn--sm" type="button" data-data-request="1">Request a copy of my data</button>' +
          '<button class="btn btn--ghost btn--sm" type="button" data-data-correction="1">Request a correction</button>' +
          '<a class="btn btn--ghost btn--sm" href="privacy.html">Privacy policy</a>' +
          '<a class="btn btn--ghost btn--sm" href="terms.html">Terms & conditions</a>' +
          '<a class="btn btn--ghost btn--sm" href="data-protection.html">Data protection</a>' +
        "</div>" +
        '<div class="notice notice--info" style="margin-top:1rem;">' + ICON.info + "<div><strong>Account closure</strong>Closure requests are reviewed within five working days and require all loans to be settled. <button class=\"linkish\" type=\"button\" data-close-account=\"1\">Request closure</button></div></div>");
  }

  /* ==================================================================
     ROUTER
     ================================================================== */
  var ROUTES = {
    dashboard: panelDashboard,
    apply: null, // handled by application.js (apply panel renders a host)
    applications: panelApplications,
    loans: panelLoans,
    loan: panelLoan,
    repayments: panelRepayments,
    schedule: panelSchedule,
    transactions: panelTransactions,
    deposits: panelDeposits,
    withdrawals: panelWithdrawals,
    transfers: panelTransfers,
    savings: panelSavings,
    statements: panelStatements,
    documents: panelDocuments,
    notifications: panelNotifications,
    support: panelSupport,
    profile: panelProfile,
    security: panelSecurity,
    settings: panelSettings
  };

  function parseHash() {
    var raw = location.hash.replace(/^#/, "") || "dashboard";
    var parts = raw.split("?");
    return { route: parts[0] || "dashboard", query: new URLSearchParams(parts[1] || "") };
  }

  function render(withLoading) {
    var parsed = parseHash();
    var route = ROUTES.hasOwnProperty(parsed.route) ? parsed.route : "dashboard";
    state.route = route;
    highlightNav();

    if (withLoading !== false) {
      var loader = document.createElement("div");
      loader.className = "app-loading";
      loader.innerHTML = '<div class="spinner" role="status" aria-label="Loading"></div>';
      document.body.appendChild(loader);
      setTimeout(function () { loader.remove(); }, 170);
    }

    if (route === "apply") {
      content.innerHTML = window.JCOB_APPLY ? window.JCOB_APPLY.panel() : pageHead("Apply for a loan", "") + UI.emptyState("Application unavailable", "Reload the page to try again.");
    } else {
      try {
        content.innerHTML = ROUTES[route]();
      } catch (err) {
        content.innerHTML = pageHead("Something went wrong", "") + UI.emptyState("We could not load this section", "Refresh the page or contact support if it persists.");
        console.error(err);
      }
    }
    bind(route);
    if (window.scrollTo) { try { window.scrollTo({ top: 0, behavior: "auto" }); } catch (e) {} }

    if (route === "apply" && window.JCOB_APPLY) window.JCOB_APPLY.mount();
  }

  /* ==================================================================
     EVENT BINDING
     ================================================================== */
  function bind(route) {
    /* generic: loan modals */
    content.querySelectorAll("[data-payoff]").forEach(function (btn) {
      btn.addEventListener("click", function () { payoffDialog(btn.getAttribute("data-payoff")); });
    });
    content.querySelectorAll("[data-restructure]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        requestConfirm("restructuring", btn.getAttribute("data-restructure"));
      });
    });
    content.querySelectorAll("[data-settlement]").forEach(function (btn) {
      btn.addEventListener("click", function () { requestConfirm("settlement", btn.getAttribute("data-settlement")); });
    });
    content.querySelectorAll("[data-print-schedule]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var l = DATA.findLoan(btn.getAttribute("data-print-schedule"));
        if (l) printSchedule(l);
      });
    });
    content.querySelectorAll("[data-download-agreement]").forEach(function (btn) {
      btn.addEventListener("click", function () { downloadAgreement(btn.getAttribute("data-download-agreement")); });
    });
    content.querySelectorAll("[data-csv-schedule]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var l = DATA.findLoan(btn.getAttribute("data-csv-schedule"));
        if (!l) return;
        var csv = UI.tableCSV(["#", "Due date", "Instalment", "Principal", "Interest", "Fees", "Balance", "Status"],
          l.rows.map(function (r) {
            return [r.n, new Date(r.date).toISOString().slice(0, 10), r.payment.toFixed(2), r.principal.toFixed(2), r.interest.toFixed(2), (r.fees || 0).toFixed(2), r.closing.toFixed(2), r.status];
          }));
        UI.downloadCSV("JC-schedule-" + l.id + ".csv", "JAY C O B FINANCIAL SERVICES — repayment schedule (MWK)\n" + csv);
        UI.toast({ title: "Schedule downloaded", message: l.id + " repayment schedule (CSV).", type: "success" });
      });
    });

    /* transactions */
    var txSearch = $("tx-search");
    if (txSearch) {
      txSearch.addEventListener("input", function () {
        var q = txSearch.value.toLowerCase();
        content.querySelectorAll("#tx-table tbody tr").forEach(function (tr) {
          tr.hidden = tr.textContent.toLowerCase().indexOf(q) < 0;
        });
      });
    }
    ["tx-type", "tx-status", "tx-from", "tx-to", "tx-sort"].forEach(function (id) {
      var el = $(id);
      if (!el) return;
      el.addEventListener("change", function () {
        state.filters.txType = $("tx-type").value;
        state.filters.txStatus = $("tx-status").value;
        state.filters.txFrom = $("tx-from").value;
        state.filters.txTo = $("tx-to").value;
        state.filters.txSort = $("tx-sort").value;
        state.pages.transactions = 1;
        render(false);
      });
    });
    content.querySelectorAll("[data-pager] button[data-page]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.pages[btn.closest("[data-pager]").getAttribute("data-pager")] = parseInt(btn.getAttribute("data-page"), 10);
        render(false);
      });
    });
    content.querySelectorAll("[data-tx]").forEach(function (btn) {
      btn.addEventListener("click", function () { transactionDetail(btn.getAttribute("data-tx")); });
    });
    var exportTx = content.querySelector("[data-export-tx]");
    if (exportTx) {
      exportTx.addEventListener("click", function () {
        var csv = UI.tableCSV(["Reference", "Date", "Type", "Description", "Method", "Amount (MWK)", "Direction", "Status"],
          db().transactions.map(function (t) {
            return [t.ref, new Date(t.date).toISOString(), t.type, t.description, t.method, t.amount, t.direction, t.status];
          }));
        UI.downloadCSV("JC-transactions.csv", "JAY C O B FINANCIAL SERVICES — transactions (MWK)\n" + csv);
        UI.toast({ title: "Export ready", message: "Transaction history downloaded.", type: "success" });
      });
    }
    content.querySelectorAll("[data-receipt]").forEach(function (btn) {
      btn.addEventListener("click", function () { receiptDialog(btn.getAttribute("data-receipt")); });
    });
    content.querySelectorAll("[data-report-payment]").forEach(function (btn) {
      btn.addEventListener("click", function () { newTicketDialog(); });
    });

    /* applications */
    content.querySelectorAll("[data-app-filter]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.filters.app = btn.getAttribute("data-app-filter");
        render(false);
      });
    });
    content.querySelectorAll("[data-app]").forEach(function (btn) {
      btn.addEventListener("click", function () { openApplication(btn.getAttribute("data-app")); });
    });
    content.querySelectorAll("[data-app-summary]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var a = DATA.findApplication(btn.getAttribute("data-app-summary"));
        if (!a) return;
        var body = '<div class="form-grid">' + reviewItem("Reference", a.ref) + reviewItem("Product", a.product) +
          reviewItem("Amount", mwk(a.amount)) + reviewItem("Term", a.term + " months") +
          reviewItem("Purpose", a.purpose) + reviewItem("Status", UI.statusPill(a.status)) + "</div>";
        UI.modal({
          title: "Application summary", subtitle: a.ref,
          body: body,
          actions: [
            { label: "Close", variant: "ghost" },
            { label: "Download summary", variant: "gold", onClick: function () {
                UI.downloadCSV("JC-application-" + a.ref + ".csv",
                  UI.tableCSV(["Field", "Value"], [["Reference", a.ref], ["Product", a.product], ["Amount (MWK)", a.amount], ["Term (months)", a.term], ["Purpose", a.purpose], ["Status", a.status]]));
                return false;
              } }
          ]
        });
      });
    });

    /* repayments */
    var repayForm = $("repay-form");
    if (repayForm) {
      var loanSelect = $("repay-loan");
      loanSelect.addEventListener("change", function () {
        location.hash = "#repayments?loan=" + encodeURIComponent(loanSelect.value);
      });
      repayForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var loan = DATA.findLoan(loanSelect.value);
        var amount = Math.max(Number($("repay-amount").value) || 0, 0);
        var method = $("repay-method").value;
        var status = $("repay-status");
        if (amount < 1000) {
          status.className = "form-status is-visible form-status--error";
          status.textContent = "Enter at least MWK 1,000.";
          return;
        }
        if (method === "Wallet" && amount > walletBalance()) {
          status.className = "form-status is-visible form-status--error";
          status.textContent = "Wallet balance is " + mwk(walletBalance()) + ". Choose another method or reduce the amount.";
          return;
        }
        UI.modal({
          title: "Confirm repayment",
          subtitle: mwk(amount) + " · " + loan.id,
          body: '<div class="form-grid">' + reviewItem("Loan", loan.id) + reviewItem("Amount", mwk(amount)) +
            reviewItem("Method", method) + reviewItem("Reference", $("repay-ref").value) + "</div>" +
            '<div class="notice notice--info" style="margin-top:.9rem;">' + ICON.info + "<div>Funds are applied to the earliest unpaid instalment first. A receipt is issued immediately.</div></div>",
          actions: [
            { label: "Cancel", variant: "ghost" },
            { label: "Pay " + mwk(amount), variant: "gold", onClick: function () {
                if (method === "Wallet") setWallet(walletBalance() - amount);
                var tx = makeRepayment(loan, amount, method, $("repay-ref").value);
                UI.closeModal();
                render();
                receiptDialog(tx.ref);
                return true;
              } }
          ]
        });
      });
      var fullBtn = content.querySelector("[data-full-settlement]");
      if (fullBtn) {
        fullBtn.addEventListener("click", function () {
          var loan = DATA.findLoan(fullBtn.getAttribute("data-full-settlement"));
          $("repay-amount").value = Math.round(loan.outstandingPrincipal + loan.outstandingInterest);
        });
      }
    }

    /* schedule */
    content.querySelectorAll("[data-calendar-toggle]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.scheduleView = btn.getAttribute("data-calendar-toggle");
        render(false);
      });
    });

    /* deposits */
    var depForm = $("deposit-form");
    if (depForm) {
      depForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var amount = Number($("dep-amount").value) || 0;
        var status = $("deposit-status");
        if (amount < 1000) {
          status.className = "form-status is-visible form-status--error";
          status.textContent = "Minimum deposit is MWK 1,000.";
          return;
        }
        var ref = $("dep-ref").value;
        db().deposits.unshift({ ref: ref, date: new Date().toISOString(), amount: amount, method: $("dep-method").value, status: "Pending", proof: false });
        DATA.addTransaction({ type: "Deposit", description: "Mobile money deposit", amount: amount, direction: "credit", status: "Pending", method: $("dep-method").value });
        DATA.notify("Deposit", "Deposit received — pending confirmation", mwk(amount) + " via " + $("dep-method").value + " is awaiting reconciliation (" + ref + ").", "In-app + SMS");
        DATA.save();
        status.className = "form-status is-visible";
        status.textContent = "Deposit request " + ref + " submitted. It will be approved within 30 minutes during business hours.";
        render(false);
        UI.toast({ title: "Deposit submitted", message: ref + " · " + mwk(amount), type: "success" });
      });
    }
    content.querySelectorAll("[data-deposit-detail]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var d = db().deposits.filter(function (x) { return x.ref === btn.getAttribute("data-deposit-detail"); })[0];
        if (!d) return;
        UI.modal({
          title: "Deposit " + d.ref, subtitle: dtTime(d.date),
          body: '<div class="form-grid">' + reviewItem("Amount", mwk(d.amount)) + reviewItem("Method", d.method) +
            reviewItem("Status", UI.statusPill(d.status)) + reviewItem("Proof of payment", d.proof ? "Uploaded" : "Not provided") +
            (d.note ? reviewItem("Note", d.note) : "") + "</div>",
          actions: [
            { label: "Close", variant: "ghost" },
            { label: "Upload proof", variant: "gold", onClick: function () {
                d.proof = true; DATA.save(); UI.closeModal(); render(false);
                UI.toast({ title: "Proof attached", message: "Demo: proof of payment recorded.", type: "success" });
                return true;
              } }
          ]
        });
      });
    });

    /* withdrawals */
    var wdForm = $("withdraw-form");
    if (wdForm) {
      wdForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var amount = Number($("wd-amount").value) || 0;
        var status = $("withdraw-status");
        var source = $("wd-account").value;
        var available = source.indexOf("Savings") >= 0 ? db().savings.balance : walletBalance();
        if (source.indexOf("Savings") >= 0) available = db().savings.balance;
        if (amount < 5000) {
          status.className = "form-status is-visible form-status--error";
          status.textContent = "Minimum withdrawal is MWK 5,000.";
          return;
        }
        if (amount + 1500 > available) {
          status.className = "form-status is-visible form-status--error";
          status.textContent = "Insufficient balance. Available " + mwk(available) + " (plus MWK 1,500 fee).";
          return;
        }
        var ref = DATA.reference("WDR");
        UI.modal({
          title: "Confirm withdrawal", subtitle: ref,
          body: '<div class="form-grid">' + reviewItem("Amount", mwk(amount)) + reviewItem("Fee", mwk(1500)) +
            reviewItem("Destination", $("wd-dest").value) + reviewItem("Total debited", mwk(amount + 1500)) + "</div>",
          actions: [
            { label: "Cancel", variant: "ghost" },
            { label: "Confirm", variant: "gold", onClick: function () {
                if (source.indexOf("Savings") >= 0) db().savings.balance -= (amount + 1500);
                else setWallet(walletBalance() - amount - 1500);
                db().withdrawals.unshift({ ref: ref, date: new Date().toISOString(), amount: amount, destination: $("wd-dest").value, status: "Pending", fee: 1500 });
                DATA.addTransaction({ type: "Withdrawal", description: "Withdrawal to " + $("wd-dest").value, amount: amount, direction: "debit", status: "Pending", method: source });
                DATA.notify("Withdrawal", "Withdrawal request received", mwk(amount) + " to " + $("wd-dest").value + " (" + ref + "). Processing same day if before 14:00.", "In-app + SMS");
                DATA.save(); UI.closeModal(); render();
                UI.toast({ title: "Withdrawal submitted", message: ref + " is pending approval.", type: "success" });
                return true;
              } }
          ]
        });
      });
    }
    content.querySelectorAll("[data-cancel-withdrawal]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var ref = btn.getAttribute("data-cancel-withdrawal");
        var w = db().withdrawals.filter(function (x) { return x.ref === ref; })[0];
        if (!w) return;
        UI.modal({
          title: "Cancel withdrawal?", subtitle: ref + " · " + mwk(w.amount),
          body: "<p style=\"font-size:.86rem;\">The request will be cancelled and the amount returned to your available balance.</p>",
          actions: [
            { label: "Keep it", variant: "ghost" },
            { label: "Cancel withdrawal", variant: "danger", onClick: function () {
                w.status = "Cancelled";
                setWallet(walletBalance() + w.amount + w.fee);
                DATA.notify("Withdrawal", "Withdrawal cancelled", ref + " was cancelled and " + mwk(w.amount + w.fee) + " returned to your balance.", "In-app");
                DATA.save(); UI.closeModal(); render();
                UI.toast({ title: "Withdrawal cancelled", message: ref, type: "success" });
                return true;
              } }
          ]
        });
      });
    });

    /* transfers */
    var trForm = $("transfer-form");
    if (trForm) {
      $("tr-kind").addEventListener("change", function () {
        var other = $("tr-kind").value === "other";
        $("tr-fee-hint").textContent = other ? "Fee: MWK 500 for transfers to other customers." : "No fee between your own accounts.";
        $("tr-name").disabled = !other;
        if (!other) $("tr-name").value = "";
      });
      trForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var amount = Number($("tr-amount").value) || 0;
        var status = $("transfer-status");
        var kind = $("tr-kind").value;
        var fee = kind === "other" ? 500 : 0;
        var available = $("tr-from").value === "Savings" ? db().savings.balance : walletBalance();
        if (amount < 1000) { status.className = "form-status is-visible form-status--error"; status.textContent = "Minimum transfer is MWK 1,000."; return; }
        if (amount + fee > available) { status.className = "form-status is-visible form-status--error"; status.textContent = "Insufficient balance (" + mwk(available) + ")."; return; }
        if (kind === "other" && !$("tr-to").value.trim()) { status.className = "form-status is-visible form-status--error"; status.textContent = "Enter the recipient account number."; return; }

        UI.modal({
          title: "Confirm transfer",
          subtitle: mwk(amount) + (fee ? " + " + mwk(fee) + " fee" : ""),
          body: '<div class="form-grid">' + reviewItem("From", $("tr-from").value) +
            reviewItem("To", kind === "other" ? $("tr-to").value + " (" + $("tr-name").value + ")" : "Savings goal") +
            reviewItem("Amount", mwk(amount)) + reviewItem("Fee", mwk(fee)) + "</div>" +
            '<div class="field" style="margin-top:.9rem;"><label for="tr-otp">Authorisation code</label><input id="tr-otp" placeholder="Enter 123456 (demo)"><span class="hint">A one-time code was sent to your phone.</span></div>',
          actions: [
            { label: "Cancel", variant: "ghost" },
            { label: "Authorise transfer", variant: "gold", onClick: function () {
                var code = (document.getElementById("tr-otp").value || "").trim();
                if (code !== "123456") {
                  UI.toast({ title: "Invalid code", message: "Use 123456 in this demo.", type: "danger" });
                  return false;
                }
                var ref = DATA.reference("TRF");
                if ($("tr-from").value === "Savings") db().savings.balance -= (amount + fee);
                else setWallet(walletBalance() - amount - fee);
                db().transfers.unshift({
                  ref: ref, date: new Date().toISOString(),
                  from: $("tr-from").value,
                  to: kind === "other" ? $("tr-to").value + " (" + $("tr-name").value + ")" : "Savings goal",
                  amount: amount, status: "Completed", fee: fee
                });
                DATA.addTransaction({ type: "Transfer", description: "Transfer " + ref, amount: amount, direction: "debit", status: "Completed", method: "Internal" });
                DATA.notify("Transfer", "Transfer completed", mwk(amount) + " transferred (" + ref + ").", "In-app + SMS");
                DATA.save(); UI.closeModal(); render();
                UI.toast({ title: "Transfer complete", message: ref, type: "success" });
                return true;
              } }
          ]
        });
      });
    }
    content.querySelectorAll("[data-transfer-receipt]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var ref = btn.getAttribute("data-transfer-receipt");
        var t = db().transfers.filter(function (x) { return x.ref === ref; })[0];
        UI.modal({
          title: "Transfer receipt", subtitle: ref,
          body: '<div class="form-grid">' + reviewItem("Date", dtTime(t.date)) + reviewItem("Amount", mwk(t.amount)) +
            reviewItem("From", t.from) + reviewItem("To", t.to) + reviewItem("Fee", mwk(t.fee)) + reviewItem("Status", UI.statusPill(t.status)) + "</div>",
          actions: [{ label: "Close", variant: "ghost" }, { label: "Print", variant: "gold", onClick: function () { window.print(); return false; } }]
        });
      });
    });

    /* savings */
    var svForm = $("savings-form");
    if (svForm) {
      svForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var amount = Number($("sv-amount").value) || 0;
        var action = $("sv-action").value;
        var goalName = $("sv-goal").value;
        var status = $("savings-status");
        var goal = db().savings.goals.filter(function (g) { return g.name === goalName; })[0];
        if (amount < 1000) { status.className = "form-status is-visible form-status--error"; status.textContent = "Enter at least MWK 1,000."; return; }
        if (action === "deposit") {
          if (amount > walletBalance()) { status.className = "form-status is-visible form-status--error"; status.textContent = "Wallet balance is " + mwk(walletBalance()) + "."; return; }
          setWallet(walletBalance() - amount);
          db().savings.balance += amount;
          if (goal) goal.saved += amount;
          DATA.addTransaction({ type: "Savings deposit", description: "Savings deposit — " + goalName, amount: amount, direction: "credit", status: "Completed", method: "Internal" });
          DATA.notify("Savings", "Savings deposit received", mwk(amount) + " added to " + goalName + ".", "In-app");
        } else {
          if (amount > db().savings.balance) { status.className = "form-status is-visible form-status--error"; status.textContent = "Savings balance is " + mwk(db().savings.balance) + "."; return; }
          db().savings.balance -= amount;
          if (goal) goal.saved = Math.max(0, goal.saved - amount);
          setWallet(walletBalance() + amount);
          DATA.addTransaction({ type: "Savings withdrawal", description: "Savings withdrawal — " + goalName, amount: amount, direction: "debit", status: "Completed", method: "Internal" });
        }
        DATA.save(); render();
        UI.toast({ title: action === "deposit" ? "Deposit successful" : "Withdrawal successful", message: mwk(amount) + " · " + goalName, type: "success" });
      });
    }

    /* statements */
    var stForm = $("statement-form");
    if (stForm) {
      stForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var from = $("st-from").value;
        var to = $("st-to").value;
        if (!from || !to || from > to) {
          var status = $("statement-status");
          status.className = "form-status is-visible form-status--error";
          status.textContent = "Choose a valid date range.";
          return;
        }
        var txs = db().transactions.filter(function (t) {
          var d = t.date.slice(0, 10);
          return d >= from && d <= to;
        });
        var ref = DATA.reference("STM");
        db().statements.unshift({
          ref: ref, period: dt(from) + " – " + dt(to), from: from, to: to,
          opening: 3600000, closing: 3600000 + txs.reduce(function (s, t) { return s + (t.direction === "credit" ? t.amount : -t.amount); }, 0),
          generated: new Date().toISOString(), status: "Available", rows: txs
        });
        DATA.notify("Statement", "Statement generated", "Statement " + ref + " for " + dt(from) + " to " + dt(to) + " is ready.", "In-app");
        DATA.save(); render();
        UI.toast({ title: "Statement generated", message: ref + " is ready to download.", type: "success" });
      });
    }
    var verifyStatement = $("verify-statement-form");
    if (verifyStatement) {
      verifyStatement.addEventListener("submit", function (e) {
        e.preventDefault();
        var ref = ($("verify-statement-ref").value || "").trim().toUpperCase();
        var st = $("verify-statement-status");
        var found = db().statements.filter(function (s) { return s.ref.toUpperCase() === ref; })[0];
        st.className = "form-status is-visible" + (found ? "" : " form-status--error");
        if (!found) {
          st.textContent = ref ? "No statement matches " + ref + ". Check the reference and try again." : "Enter a statement reference.";
          return;
        }
        st.textContent = "Verified: " + found.ref + " · " + found.period + " · opening " + mwk(found.opening) +
          " · closing " + mwk(found.closing) + " · issued " + dt(found.generated || found.from) + ". This reference was issued by JAY C O B FINANCIAL SERVICES.";
        DATA.notify("Statement", "Statement verified", "Statement " + found.ref + " was verified in the dashboard.", "In-app");
        UI.toast({ title: "Statement verified", message: found.ref + " is a valid statement reference.", type: "success" });
      });
    }
    content.querySelectorAll("[data-statement]").forEach(function (btn) {
      btn.addEventListener("click", function () { statementDialog(btn.getAttribute("data-statement")); });
    });
    content.querySelectorAll("[data-statement-dl]").forEach(function (btn) {
      btn.addEventListener("click", function () { downloadStatementCSV(btn.getAttribute("data-statement-dl")); });
    });

    /* documents */
    content.querySelectorAll("[data-doc-filter]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.docsFilter = btn.getAttribute("data-doc-filter");
        render(false);
      });
    });
    content.querySelectorAll("[data-doc-upload]").forEach(function (btn) {
      btn.addEventListener("click", function () { uploadDocument(btn.getAttribute("data-doc-upload")); });
    });
    content.querySelectorAll("[data-doc-view]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var d = db().documents.filter(function (x) { return x.id === btn.getAttribute("data-doc-view"); })[0];
        if (!d) return;
        UI.modal({
          title: d.name, subtitle: d.category + " · " + dt(d.uploaded),
          body: '<div class="form-grid">' + reviewItem("Status", UI.statusPill(d.status)) + reviewItem("Expiry", d.expiry ? dt(d.expiry) : "No expiry") +
            reviewItem("Required", d.required ? "Yes" : "Optional") + reviewItem("Reviewer note", d.note || "—") + "</div>" +
            '<div class="notice notice--info" style="margin-top:.8rem;">' + ICON.lock + "<div>Secure preview. Identification numbers are masked. Downloads are logged against your account.</div></div>",
          actions: [{ label: "Close", variant: "ghost" }, { label: "Download (demo)", variant: "gold", onClick: function () {
            UI.downloadCSV("JC-document-" + d.id + ".txt", "JAY C O B FINANCIAL SERVICES\nDocument: " + d.name + "\nStatus: " + d.status + "\nDemo copy — not a real certificate.");
            return false;
          } }]
        });
      });
    });

    /* notifications */
    content.querySelectorAll("[data-notif-filter]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.filters.notif = btn.getAttribute("data-notif-filter");
        render(false);
      });
    });
    content.querySelectorAll("[data-notif-read]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-notif-read");
        db().notifications.forEach(function (n) { if (n.id === id) n.read = true; });
        DATA.save(); render(false); UI.updateBell();
      });
    });

    /* support */
    content.querySelectorAll("[data-ticket]").forEach(function (btn) {
      btn.addEventListener("click", function () { openTicket(btn.getAttribute("data-ticket")); });
    });
    content.querySelectorAll("[data-new-ticket]").forEach(function (btn) {
      btn.addEventListener("click", newTicketDialog);
    });

    /* profile */
    var pf = $("profile-form");
    if (pf) {
      pf.addEventListener("submit", function (e) {
        e.preventDefault();
        var p = profile();
        p.firstName = $("pf-first").value.trim() || p.firstName;
        p.lastName = $("pf-last").value.trim() || p.lastName;
        p.fullName = p.firstName + " " + p.lastName;
        p.avatar = (p.firstName[0] + p.lastName[0]).toUpperCase();
        p.gender = $("pf-gender").value;
        p.phone = $("pf-phone").value.trim();
        p.email = $("pf-email").value.trim();
        p.contactPreference = $("pf-pref").value;
        p.address = $("pf-address").value.trim();
        p.occupation = $("pf-occupation").value.trim();
        p.employer = $("pf-employer").value.trim();
        p.monthlyIncome = Number($("pf-income").value) || p.monthlyIncome;
        p.monthlyExpenses = Number($("pf-expenses").value) || p.monthlyExpenses;
        p.nextOfKin = { name: $("pf-nok-name").value, relationship: $("pf-nok-rel").value, phone: $("pf-nok-phone").value };
        DATA.save();
        DATA.notify("Profile", "Profile updated", "Your contact and employment details were updated successfully.", "In-app + Email");
        var status = $("profile-status");
        status.className = "form-status is-visible";
        status.textContent = "Profile saved. Contact changes may require re-verification.";
        renderSidebar();
        UI.toast({ title: "Profile updated", message: "Your details have been saved.", type: "success" });
      });
    }
    content.querySelectorAll("[data-avatar-upload]").forEach(function (btn) {
      btn.addEventListener("click", function () { uploadDocument("avatar"); });
    });

    /* security */
    var pfSec = $("password-form");
    if (pfSec) {
      var meter = $("sec-meter");
      $("sec-new").addEventListener("input", function () {
        var v = $("sec-new").value;
        var score = Math.min(5, (v.length >= 8 ? 2 : 0) + (/\d/.test(v) ? 1 : 0) + (/[A-Z]/.test(v) ? 1 : 0) + (/[^A-Za-z0-9]/.test(v) ? 1 : 0));
        meter.querySelectorAll("i").forEach(function (bar, i) {
          bar.style.background = i < score ? (score <= 2 ? "var(--danger)" : score <= 3 ? "#2a76b8" : "var(--success)") : "var(--line)";
        });
      });
      pfSec.addEventListener("submit", function (e) {
        e.preventDefault();
        var current = $("sec-current").value;
        var next = $("sec-new").value;
        var confirm = $("sec-confirm").value;
        var status = $("security-status");
        var validCurrent = current === "demo1234";
        if (!validCurrent) { status.className = "form-status is-visible form-status--error"; status.textContent = "Current password is incorrect (demo password: demo1234)."; return; }
        if (next.length < 8) { status.className = "form-status is-visible form-status--error"; status.textContent = "New password must be at least 8 characters."; return; }
        if (next !== confirm) { status.className = "form-status is-visible form-status--error"; status.textContent = "New passwords do not match."; return; }
        db().security.passwordChanged = new Date().toISOString();
        DATA.save();
        DATA.notify("Security", "Password changed", "Your password was changed. If this was not you, contact support immediately.", "In-app + Email");
        status.className = "form-status is-visible";
        status.textContent = "Password updated successfully.";
        pfSec.reset();
        meter.querySelectorAll("i").forEach(function (bar) { bar.style.background = "var(--line)"; });
        UI.toast({ title: "Password updated", message: "Use your new password next time you sign in.", type: "success" });
      });
    }
    var mfa = $("mfa-toggle");
    if (mfa) {
      mfa.addEventListener("change", function () {
        db().security.mfa = mfa.checked;
        DATA.save();
        DATA.notify("Security", mfa.checked ? "Multi-factor authentication enabled" : "Multi-factor authentication disabled",
          "A one-time code will " + (mfa.checked ? "now " : "no longer ") + "be required at sign-in.", "In-app + Email");
        UI.toast({ title: mfa.checked ? "MFA enabled" : "MFA disabled", message: mfa.checked ? "You will be asked for a code at sign-in." : "Password-only sign-in restored.", type: "success" });
      });
    }
    content.querySelectorAll("[data-revoke]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var device = btn.getAttribute("data-revoke");
        db().sessions = db().sessions.filter(function (s) { return s.device !== device; });
        DATA.save(); render(false);
        UI.toast({ title: "Session ended", message: device + " has been signed out.", type: "success" });
      });
    });
    var revokeAll = content.querySelector("[data-revoke-all]");
    if (revokeAll) {
      revokeAll.addEventListener("click", function () {
        db().sessions = db().sessions.filter(function (s) { return s.current; });
        DATA.save(); render(false);
        UI.toast({ title: "Other sessions signed out", message: "Only this device remains signed in.", type: "success" });
      });
    }
    content.querySelectorAll("[data-report-suspicious]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        DATA.notify("Security alert", "Suspicious activity reported", "Our security team is reviewing your report. You may be contacted to verify recent activity.", "In-app + Email");
        UI.toast({ title: "Report submitted", message: "Security will review and contact you within 4 hours.", type: "success" });
      });
    });
    content.querySelectorAll("[data-restrict]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        UI.modal({
          title: "Request account restriction", subtitle: "Temporarily limit activity on your account",
          body: '<p style="font-size:.86rem;">Restriction blocks new applications and outbound transfers while keeping your existing loans manageable. You can lift it at any time by contacting support.</p>',
          actions: [
            { label: "Cancel", variant: "ghost" },
            { label: "Restrict account", variant: "danger", onClick: function () {
                db().profile.accountStatus = "Restricted";
                DATA.save(); UI.closeModal(); render();
                DATA.notify("Security", "Account restricted", "Your account is now restricted at your request.", "In-app + Email");
                return true;
              } }
          ]
        });
      });
    });
    content.querySelectorAll("[data-close-account]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        UI.modal({
          title: "Request account closure", subtitle: "All loans must be settled first",
          body: '<div class="field"><label for="closure-reason">Reason (optional)</label><textarea id="closure-reason" placeholder="Help us understand why"></textarea></div>' +
            '<div class="notice notice--warn" style="margin-top:.8rem;">' + ICON.info + "<div>Closure is reviewed within five working days. Outstanding balances must be cleared, and records are retained for the period required by law.</div></div>",
          actions: [
            { label: "Cancel", variant: "ghost" },
            { label: "Submit request", variant: "danger", onClick: function () {
                var ref = DATA.reference("CLS");
                db().tickets.unshift({
                  ref: ref, category: "Complaint", subject: "Account closure request", status: "Open",
                  created: new Date().toISOString(), updated: new Date().toISOString(),
                  messages: [{ from: "You", text: "I request closure of my account. Reason: " + (document.getElementById("closure-reason").value || "Not provided"), date: new Date().toISOString() }]
                });
                DATA.notify("Account", "Closure request received", "Your closure request " + ref + " is being reviewed. We will contact you within five working days.", "In-app + Email");
                DATA.save(); UI.closeModal(); render();
                UI.toast({ title: "Request submitted", message: ref, type: "success" });
                return true;
              } }
          ]
        });
      });
    });
    content.querySelectorAll("[data-data-request]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        DATA.notify("Data request", "Data export requested", "We will email a copy of your personal data within 30 days, as required by the Data Protection Act.", "In-app + Email");
        UI.toast({ title: "Request logged", message: "We will email your data copy within 30 days.", type: "success" });
      });
    });
    content.querySelectorAll("[data-data-correction]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        DATA.notify("Data request", "Correction request logged", "You requested a correction to your personal data. Support will confirm within five working days.", "In-app + Email");
        UI.toast({ title: "Correction requested", message: "Support will confirm within five working days.", type: "success" });
      });
    });

    /* settings */
    var saveSettings = content.querySelector("[data-save-settings]");
    if (saveSettings) {
      saveSettings.addEventListener("click", function () {
        var s = db().settings;
        s.language = $("set-language").value;
        s.notifications.email = $("set-email").checked;
        s.notifications.sms = $("set-sms").checked;
        s.notifications.inApp = $("set-inapp").checked;
        s.notifications.repaymentReminders = $("set-reminders").checked;
        s.notifications.marketing = $("set-marketing").checked;
        s.privacy.shareWithAdvisors = $("set-share").checked;
        s.privacy.analytics = $("set-analytics").checked;
        s.accessibility.largeText = $("set-large-text").checked;
        s.accessibility.reduceMotion = $("set-reduce-motion").checked;
        s.accessibility.highContrast = $("set-high-contrast").checked;
        DATA.save();
        applyAccessibility();
        var st = $("settings-status");
        st.className = "form-status is-visible";
        st.textContent = "Settings saved.";
        UI.toast({ title: "Settings saved", message: "Your preferences have been applied.", type: "success" });
      });
    }
  }

  function applyAccessibility() {
    var a = db().settings.accessibility;
    document.documentElement.style.fontSize = a.largeText ? "18px" : "";
    document.body.classList.toggle("reduce-motion", !!a.reduceMotion);
    document.body.classList.toggle("high-contrast", !!a.highContrast);
  }

  /* ==================================================================
     DIALOGS
     ================================================================== */
  function payoffDialog(loanId) {
    var l = DATA.findLoan(loanId);
    if (!l) return;
    var settlement = l.outstandingPrincipal + l.outstandingInterest + 2500;
    UI.modal({
      title: "Payoff quotation",
      subtitle: l.id + " · valid for 7 days",
      body: '<div class="form-grid">' +
        reviewItem("Outstanding principal", mwk(l.outstandingPrincipal)) +
        reviewItem("Outstanding interest", mwk(l.outstandingInterest)) +
        reviewItem("Settlement fee", mwk(2500)) +
        reviewItem("Total settlement", mwk(settlement)) +
        reviewItem("Valid until", dt(new Date(Date.now() + 7 * 86400000))) + "</div>" +
        '<div class="notice notice--info" style="margin-top:.9rem;">' + ICON.info + "<div>Early settlement reduces the remaining interest on reducing-balance facilities. Paying before the next due date avoids the instalment charge.</div></div>",
      actions: [
        { label: "Close", variant: "ghost" },
        { label: "Download quotation", variant: "ghost", onClick: function () {
            UI.downloadCSV("JC-payoff-" + l.id + ".csv", UI.tableCSV(["Item", "Amount (MWK)"], [
              ["Outstanding principal", l.outstandingPrincipal], ["Outstanding interest", l.outstandingInterest],
              ["Settlement fee", 2500], ["Total settlement", settlement]
            ]));
            return false;
          } },
        { label: "Request settlement", variant: "gold", onClick: function () {
            DATA.notify("Settlement", "Settlement requested", "Your settlement request for " + l.id + " (" + mwk(settlement) + ") has been logged. Support will contact you with payment instructions.", "In-app + SMS");
            UI.closeModal(); UI.toast({ title: "Settlement requested", message: l.id + " · " + mwk(settlement), type: "success" });
            return true;
          } }
      ]
    });
  }

  function requestConfirm(kind, loanId) {
    var titles = { restructuring: "Request loan restructuring", settlement: "Request settlement" };
    UI.modal({
      title: titles[kind] || "Request",
      subtitle: loanId,
      body: '<div class="field"><label for="req-note">Tell us what you need</label><textarea id="req-note" placeholder="' +
        (kind === "restructuring" ? "e.g. extend the term by 6 months to reduce the instalment" : "e.g. settle early and close the facility") + '"></textarea></div>',
      actions: [
        { label: "Cancel", variant: "ghost" },
        { label: "Submit request", variant: "gold", onClick: function () {
            var note = document.getElementById("req-note").value.trim();
            if (!note) { document.getElementById("req-note").focus(); return false; }
            var ref = DATA.reference("REQ");
            db().tickets.unshift({
              ref: ref, category: "Loan repayment enquiry",
              subject: (kind === "restructuring" ? "Restructuring request — " : "Settlement request — ") + loanId,
              status: "Open", created: new Date().toISOString(), updated: new Date().toISOString(),
              messages: [{ from: "You", text: note, date: new Date().toISOString() }]
            });
            DATA.notify("Request", "Request received", "Your " + kind + " request for " + loanId + " was logged as " + ref + ".", "In-app + Email");
            DATA.save(); UI.closeModal(); render();
            UI.toast({ title: "Request submitted", message: ref, type: "success" });
            return true;
          } }
      ]
    });
  }

  function transactionDetail(ref) {
    var t = db().transactions.filter(function (x) { return x.ref === ref; })[0];
    if (!t) return;
    UI.modal({
      title: "Transaction " + t.ref,
      subtitle: dtTime(t.date),
      body: '<div class="form-grid">' +
        reviewItem("Type", t.type) + reviewItem("Description", t.description) +
        reviewItem("Amount", mwk(t.amount)) + reviewItem("Direction", t.direction === "credit" ? "Credit (money in)" : "Debit (money out)") +
        reviewItem("Method", t.method) + reviewItem("Status", UI.statusPill(t.status)) +
        reviewItem("Balance after", t.balance ? mwk(t.balance) : "—") + "</div>" +
        '<div class="notice notice--info" style="margin-top:.9rem;">' + ICON.lock + "<div>This is a system-generated record. Contact support if anything looks wrong.</div></div>",
      actions: [
        { label: "Close", variant: "ghost" },
        { label: "Download receipt", variant: "gold", onClick: function () { receiptDialog(ref); return false; } }
      ]
    });
  }

  function receiptDialog(ref) {
    var t = db().transactions.filter(function (x) { return x.ref === ref; })[0];
    if (!t) return;
    var body = '<div id="receipt-print">' +
      '<div style="display:flex;gap:.8rem;align-items:center;border-bottom:1px dashed var(--line-strong);padding-bottom:.8rem;">' +
        '<img src="assets/img/logo-full.svg" alt="JAY C O B FINANCIAL SERVICES" style="height:42px;">' +
        '<div style="margin-left:auto;text-align:right;"><strong style="display:block;color:var(--ink);font-size:.9rem;">Payment receipt</strong>' +
        '<span style="font-size:.72rem;color:var(--muted);">' + esc(t.ref) + "</span></div></div>" +
      '<div class="form-grid" style="margin-top:.8rem;">' + reviewItem("Date", dtTime(t.date)) + reviewItem("Amount", mwk(t.amount)) +
      reviewItem("Method", t.method) + reviewItem("Status", UI.statusPill(t.status)) +
      reviewItem("Description", t.description) + reviewItem("Client", profile().fullName) + "</div>" +
      '<p style="font-size:.68rem;color:var(--muted);margin-top:.9rem;border-top:1px dashed var(--line-strong);padding-top:.7rem;">' +
      "JAY C O B FINANCIAL SERVICES · Plot 47/3, Area 47, Sector 3, Lilongwe · hello@jaycobfinancial.mw · +265 999 123 456<br>" +
      "All amounts in Malawian Kwacha (MWK). This is an illustrative demonstration receipt.</p></div>";
    UI.modal({
      title: "Receipt", subtitle: mwk(t.amount),
      body: body,
      actions: [
        { label: "Close", variant: "ghost" },
        { label: "Print", variant: "ghost", onClick: function () { UI.printElement("receipt-print"); return false; } },
        { label: "Download", variant: "gold", onClick: function () {
            UI.downloadCSV("JC-receipt-" + t.ref + ".csv", UI.tableCSV(["Field", "Value"], [
              ["Receipt", t.ref], ["Date", new Date(t.date).toISOString()], ["Client", profile().fullName],
              ["Description", t.description], ["Amount (MWK)", t.amount], ["Method", t.method], ["Status", t.status]
            ]));
            return false;
          } }
      ]
    });
  }

  function statementDialog(ref) {
    var s = db().statements.filter(function (x) { return x.ref === ref; })[0];
    if (!s) return;
    var txs = s.rows || db().transactions.slice(0, 12);
    var rows = txs.map(function (t) {
      return "<tr><td>" + dt(t.date) + "</td><td>" + esc(t.description) + "</td><td>" + esc(t.type) + "</td>" +
        '<td class="num">' + (t.direction === "credit" ? "+" : "−") + " " + mwk(t.amount) + "</td><td>" + UI.statusPill(t.status) + "</td></tr>";
    }).join("");
    var body = '<div id="statement-print">' +
      '<div style="display:flex;gap:.8rem;align-items:center;border-bottom:1px dashed var(--line-strong);padding-bottom:.8rem;">' +
        '<img src="assets/img/logo-full.svg" alt="JAY C O B FINANCIAL SERVICES" style="height:42px;">' +
        '<div style="margin-left:auto;text-align:right;"><strong style="display:block;color:var(--ink);">Account statement</strong>' +
        '<span style="font-size:.72rem;color:var(--muted);">' + esc(s.ref) + " · " + esc(s.period) + "</span></div></div>" +
      '<div class="form-grid" style="margin-top:.8rem;">' + reviewItem("Client", profile().fullName) + reviewItem("Account", profile().accountNumber) +
      reviewItem("Opening balance", mwk(s.opening)) + reviewItem("Closing balance", mwk(s.closing)) +
      reviewItem("Currency", "MWK") + reviewItem("Verification code", "JC-" + s.ref.slice(-4) + "-VERIFIED") + "</div>" +
      '<table class="data" style="margin-top:.8rem;"><thead><tr><th>Date</th><th>Description</th><th>Type</th><th class="num">Amount</th><th>Status</th></tr></thead><tbody>' +
      (rows || '<tr><td colspan="5">No entries in this period.</td></tr>') + "</tbody></table>" +
      '<p style="font-size:.68rem;color:var(--muted);margin-top:.8rem;">JAY C O B FINANCIAL SERVICES · Lilongwe · MWK. Illustrative demonstration statement.</p></div>';
    UI.modal({
      title: "Statement " + s.ref, subtitle: s.period,
      body: body,
      actions: [
        { label: "Close", variant: "ghost" },
        { label: "Print", variant: "ghost", onClick: function () { UI.printElement("statement-print"); return false; } },
        { label: "Download CSV", variant: "gold", onClick: function () { downloadStatementCSV(ref); return false; } }
      ]
    });
  }

  function downloadStatementCSV(ref) {
    var s = db().statements.filter(function (x) { return x.ref === ref; })[0];
    if (!s) return;
    var txs = s.rows || db().transactions;
    var csv = "JAY C O B FINANCIAL SERVICES — account statement (MWK)\n" +
      "Statement," + s.ref + "\nClient," + profile().fullName + "\nPeriod," + s.period +
      "\nOpening balance," + s.opening + "\nClosing balance," + s.closing + "\n\n";
    csv += UI.tableCSV(["Date", "Description", "Type", "Amount (MWK)", "Direction", "Status"],
      txs.map(function (t) { return [t.date, t.description, t.type, t.amount, t.direction, t.status]; }));
    UI.downloadCSV("JC-statement-" + s.ref + ".csv", csv);
    UI.toast({ title: "Statement downloaded", message: s.ref, type: "success" });
  }

  function printSchedule(l) {
    var html = '<h2>' + esc(l.product) + " — repayment schedule</h2>" +
      '<p class="muted">' + esc(l.id) + " · " + l.rate + "% p.a. · " + (l.method === "flat" ? "Flat rate" : "Reducing balance") + " · " + l.frequency + "</p>" +
      "<table><thead><tr><th>#</th><th>Due date</th><th>Instalment</th><th>Principal</th><th>Interest</th><th>Balance</th><th>Status</th></tr></thead><tbody>" +
      l.rows.map(function (r) {
        return "<tr><td>" + r.n + "</td><td>" + dt(r.date) + "</td><td>" + mwk(r.payment) + "</td><td>" + mwk(r.principal) + "</td><td>" + mwk(r.interest) + "</td><td>" + mwk(r.closing) + "</td><td>" + r.status + "</td></tr>";
      }).join("") + "</tbody></table>" +
      '<p class="totals">Total repayment: ' + mwk(l.totalRepayment) + " · Total interest: " + mwk(l.totalRepayment - l.principal) + "</p>";
    var holder = document.createElement("div");
    holder.id = "print-holder";
    holder.innerHTML = html;
    holder.style.display = "none";
    document.body.appendChild(holder);
    UI.printElement("print-holder");
    setTimeout(function () { holder.remove(); }, 2000);
  }

  function downloadAgreement(loanId) {
    var l = DATA.findLoan(loanId);
    if (!l) return;
    var text = [
      "JAY C O B FINANCIAL SERVICES — LOAN AGREEMENT (DEMO)",
      "Loan ID," + l.id,
      "Borrower," + profile().fullName,
      "Client reference," + profile().accountNumber,
      "Product," + l.product,
      "Principal (MWK)," + l.principal,
      "Interest rate," + l.rate + "% per annum",
      "Interest method," + (l.method === "flat" ? "Flat rate" : "Reducing balance"),
      "Term," + (l.rows.length) + " instalments (" + l.frequency + ")",
      "Total amount payable (MWK)," + l.totalRepayment,
      "Disbursement date," + dt(l.startDate),
      "Maturity date," + dt(l.maturity),
      "Guarantor," + (l.guarantor ? l.guarantor.name : "Not required"),
      "",
      "This document is an illustrative demonstration agreement. A signed agreement is required before disbursement.",
      "Read with the Terms and Conditions, Fees and Charges Disclosure and Responsible Lending Policy."
    ].join("\n");
    UI.downloadCSV("JC-loan-agreement-" + l.id + ".txt", text);
    UI.toast({ title: "Agreement downloaded", message: l.id + " loan agreement.", type: "success" });
  }

  function uploadDocument(target) {
    var input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.jpg,.jpeg,.png";
    input.addEventListener("change", function () {
      var file = input.files && input.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        UI.toast({ title: "File too large", message: "Maximum size is 5 MB per document.", type: "danger" });
        return;
      }
      if (!/\.(pdf|jpe?g|png)$/i.test(file.name)) {
        UI.toast({ title: "Unsupported file", message: "Upload a PDF, JPG or PNG.", type: "danger" });
        return;
      }
      var doc = db().documents.filter(function (d) { return d.id === target; })[0];
      if (doc) {
        doc.status = "Pending";
        doc.uploaded = new Date().toISOString();
        doc.note = "Replacement uploaded — awaiting verification.";
      } else {
        db().documents.push({
          id: DATA.uid("DOC"), name: target === "avatar" ? "Profile photo" : file.name,
          category: target === "avatar" ? "Profile" : "Supporting",
          status: "Pending", uploaded: new Date().toISOString(),
          expiry: "", note: "Uploaded by client.", required: false
        });
      }
      DATA.save();
      DATA.notify("KYC", "Document uploaded", file.name + " was received and is awaiting verification (usually within 24 hours).", "In-app + Email");
      render(false);
      UI.toast({ title: "Document uploaded", message: file.name + " · awaiting verification.", type: "success" });
    });
    input.click();
  }

  /* ---------------- Global search ---------------- */
  function initSearch() {
    var input = $("app-search-input");
    if (!input) return;
    var items = NAV.filter(function (n) { return n.key; }).map(function (n) {
      return { label: n.label, href: "#" + n.key };
    }).concat([
      { label: "Loan calculator", href: "calculator.html" },
      { label: "Loan products", href: "loan-products.html" },
      { label: "Eligibility check", href: "eligibility.html" },
      { label: "Interest rates and fees", href: "interest-rates-fees.html" },
      { label: "Help centre", href: "support.html" },
      { label: "Privacy policy", href: "privacy.html" }
    ]);
    input.addEventListener("keydown", function (e) {
      if (e.key !== "Enter") return;
      var q = input.value.toLowerCase().trim();
      if (!q) return;
      var match = items.filter(function (i) { return i.label.toLowerCase().indexOf(q) >= 0; });
      if (match.length === 1) {
        location.href = match[0].href;
        input.value = "";
      } else if (match.length) {
        UI.modal({
          title: "Search results",
          subtitle: match.length + " matches for “" + q + "”",
          body: '<div style="display:grid;gap:.35rem;">' + match.map(function (m) {
            return '<a class="support-option" href="' + m.href + '"><span class="icon-badge">' + ICON.info + '</span><div><strong>' + m.label + '</strong></div></a>';
          }).join("") + "</div>",
          actions: [{ label: "Close", variant: "ghost" }]
        });
      } else {
        UI.toast({ title: "No matches", message: "Try “loans”, “repayments”, “documents” or “security”.", type: "info" });
      }
    });
  }

  /* ---------------- Boot ---------------- */
  function boot() {
    renderSidebar();
    initSearch();
    applyAccessibility();
    render();

    window.addEventListener("hashchange", function () { render(); });

    document.querySelectorAll("[data-logout]").forEach(function (el) {
      el.addEventListener("click", function (e) {
        e.preventDefault();
        if (window.JCOB_CLOUD && window.JCOB_CLOUD.enabled) window.JCOB_CLOUD.auth.signOut();
        UI.clearSession();
        window.location.href = "login.html";
      });
    });

    /* Cloud mode: never leave a signed-out visitor on a dashboard that is
       showing someone else's cached document. */
    if (window.JCOB_CLOUD && window.JCOB_CLOUD.enabled) {
      window.JCOB_CLOUD.ready.then(function (profile) {
        if (!profile) {
          UI.clearSession();
          window.location.replace("login.html?next=dashboard.html");
          return;
        }
        if (window.JCOB_DATA && window.JCOB_DATA.hydrate) {
          window.JCOB_DATA.hydrate().then(function () { render(); });
        }
      });
    }

    /* Re-render whenever the cloud document lands. */
    document.addEventListener("jcob:data-ready", function () {
      if (render) render();
    });

    /* session expiry: 30 minutes of inactivity */
    var last = Date.now();
    ["click", "keydown", "mousemove", "touchstart"].forEach(function (evt) {
      document.addEventListener(evt, function () { last = Date.now(); }, { passive: true });
    });
    setInterval(function () {
      if (Date.now() - last > 30 * 60 * 1000) {
        UI.clearSession();
        window.location.href = "login.html?expired=1";
      }
    }, 60000);

    /* Periodically surface a new in-app notification to demonstrate live updates */
    setInterval(UI.updateBell, 20000);
  }

  document.addEventListener("DOMContentLoaded", boot);
  window.JCOB_DASH = { render: render, applyAccessibility: applyAccessibility, state: state };
})();
