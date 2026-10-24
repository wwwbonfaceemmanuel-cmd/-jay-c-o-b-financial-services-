/* =====================================================================
   Shared UI utilities: toasts, modals, session, notification bell,
   table helpers, CSV/print export.
   ===================================================================== */
(function () {
  "use strict";

  var SESSION_KEY = "jcob_session_v1";
  var ATTEMPTS_KEY = "jcob_login_attempts";
  var F = window.JCOB_FINANCE;

  var ICONS = {
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    danger: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3 2 21h20L12 3Z"/><path d="M12 10v4M12 18h.01"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>'
  };

  /* ---------------- Toasts ---------------- */
  function stack() {
    var el = document.querySelector(".toast-stack");
    if (!el) {
      el = document.createElement("div");
      el.className = "toast-stack";
      el.setAttribute("role", "status");
      el.setAttribute("aria-live", "polite");
      document.body.appendChild(el);
    }
    return el;
  }

  function toast(opts) {
    var o = typeof opts === "string" ? { title: opts } : (opts || {});
    var type = o.type || "info";
    var el = document.createElement("div");
    el.className = "toast toast--" + type;
    el.innerHTML =
      '<span class="toast-icon">' + (ICONS[type] || ICONS.info) + "</span>" +
      "<div><strong></strong><span></span></div>" +
      '<button class="toast-x" type="button" aria-label="Dismiss">×</button>';
    el.querySelector("strong").textContent = o.title || "Update";
    el.querySelector("span").textContent = o.message || "";
    stack().appendChild(el);
    requestAnimationFrame(function () { el.classList.add("is-in"); });
    var timer = setTimeout(close, o.duration || 6000);
    function close() {
      clearTimeout(timer);
      el.classList.remove("is-in");
      setTimeout(function () { el.remove(); }, 320);
    }
    el.querySelector(".toast-x").addEventListener("click", close);
    return el;
  }

  /* ---------------- Modal ---------------- */
  function modal(opts) {
    var o = opts || {};
    var existing = document.getElementById("ui-modal");
    if (existing) existing.remove();

    var wrap = document.createElement("div");
    wrap.className = "app-modal";
    wrap.id = "ui-modal";
    wrap.innerHTML =
      '<div class="app-modal-card" role="dialog" aria-modal="true" aria-labelledby="ui-modal-title">' +
      '<div class="app-modal-head"><div><h2 id="ui-modal-title"></h2><p></p></div>' +
      '<button class="modal-x" type="button" aria-label="Close">×</button></div>' +
      '<div class="ui-modal-body"></div>' +
      '<div class="modal-actions"></div></div>';

    wrap.querySelector("h2").textContent = o.title || "";
    wrap.querySelector(".app-modal-head p").textContent = o.subtitle || "";
    var bodyEl = wrap.querySelector(".ui-modal-body");
    if (typeof o.body === "string") bodyEl.innerHTML = o.body;
    else if (o.body) bodyEl.appendChild(o.body);

    var actions = wrap.querySelector(".modal-actions");
    (o.actions || [{ label: "Close", variant: "ghost", close: true }]).forEach(function (a) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn " + (a.variant === "gold" ? "btn--gold" : a.variant === "danger" ? "btn--gold" : "btn--ghost");
      if (a.variant === "danger") btn.style.background = "var(--danger)", btn.style.color = "#fff";
      btn.textContent = a.label;
      btn.addEventListener("click", function () {
        if (a.onClick) {
          var keep = a.onClick(wrap);
          if (keep === false) return;
        }
        if (a.close !== false) closeModal(wrap);
      });
      actions.appendChild(btn);
    });

    document.body.appendChild(wrap);
    requestAnimationFrame(function () { wrap.classList.add("is-open"); });
    document.body.style.overflow = "hidden";

    wrap.querySelector(".modal-x").addEventListener("click", function () { closeModal(wrap); });
    wrap.addEventListener("click", function (e) { if (e.target === wrap) closeModal(wrap); });
    document.addEventListener("keydown", function esc(e) {
      if (e.key === "Escape") { closeModal(wrap); document.removeEventListener("keydown", esc); }
    });

    var focusable = wrap.querySelector("input, select, textarea, button.btn");
    if (focusable) focusable.focus({ preventScroll: true });
    return wrap;
  }

  function closeModal(wrap) {
    var el = wrap || document.getElementById("ui-modal");
    if (!el) return;
    el.classList.remove("is-open");
    document.body.style.removeProperty("overflow");
    setTimeout(function () { el.remove(); }, 260);
  }

  /* ---------------- Session ---------------- */
  function readJSON(store, key) {
    try { return JSON.parse(store.getItem(key) || "null"); } catch (e) { return null; }
  }

  function getSession() {
    return readJSON(window.sessionStorage, SESSION_KEY) || readJSON(window.localStorage, SESSION_KEY);
  }

  function setSession(session, remember) {
    var payload = Object.assign({ at: new Date().toISOString() }, session);
    try {
      window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
      if (remember) window.localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
    } catch (e) {}
    return payload;
  }

  function clearSession() {
    try {
      window.sessionStorage.removeItem(SESSION_KEY);
      window.localStorage.removeItem(SESSION_KEY);
      document.dispatchEvent(new CustomEvent("jcob:signout"));
    } catch (e) {}
  }

  function requireAuth(redirectTo) {
    var s = getSession();
    if (!s || !s.authenticated) {
      var target = redirectTo || "login.html";
      window.location.replace(target + "?next=" + encodeURIComponent(location.pathname.split("/").pop() + location.hash));
      return null;
    }
    return s;
  }

  function tryCount() {
    return readJSON(window.localStorage, ATTEMPTS_KEY) || { count: 0, lockedUntil: 0 };
  }

  function setTryCount(value) {
    try { window.localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(value)); } catch (e) {}
  }

  function clearTryCount() {
    try { window.localStorage.removeItem(ATTEMPTS_KEY); } catch (e) {}
  }

  /* ---------------- Notification bell ---------------- */
  function timeAgo(isoDate) {
    var diff = Date.now() - new Date(isoDate).getTime();
    var mins = Math.round(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return mins + " min ago";
    var hours = Math.round(mins / 60);
    if (hours < 24) return hours + (hours === 1 ? " hour ago" : " hours ago");
    var days = Math.round(hours / 24);
    if (days < 30) return days + (days === 1 ? " day ago" : " days ago");
    return new Date(isoDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }

  function renderBell() {
    var panel = document.getElementById("bell-list");
    if (!panel || !window.JCOB_DATA) return;
    var items = window.JCOB_DATA.get().notifications.slice(0, 6);
    if (!items.length) {
      panel.innerHTML = '<p class="bell-empty">No notifications yet.</p>';
    } else {
      panel.innerHTML = items.map(function (n) {
        return '<a class="bell-item ' + (n.read ? "read" : "unread") + '" href="dashboard.html#notifications">' +
          '<i class="dot"></i><div><strong></strong><span></span></div></a>';
      }).join("");
      panel.querySelectorAll(".bell-item").forEach(function (el, i) {
        el.querySelector("strong").textContent = items[i].title;
        el.querySelector("span").textContent = timeAgo(items[i].date) + " · " + items[i].channel;
      });
    }
    updateBell();
  }

  function updateBell() {
    if (!window.JCOB_DATA) return;
    var count = window.JCOB_DATA.unreadCount();
    document.querySelectorAll("[data-bell-count]").forEach(function (el) {
      el.textContent = count > 9 ? "9+" : String(count);
      el.hidden = count === 0;
    });
    document.querySelectorAll("[data-notif-total]").forEach(function (el) {
      el.textContent = window.JCOB_DATA.get().notifications.length;
    });
  }

  function initBell() {
    var bellBtn = document.querySelector("[data-bell]");
    var bellPanel = document.getElementById("bell-panel");
    if (bellBtn && bellPanel) {
      bellBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        bellPanel.classList.toggle("is-open");
        closeProfile();
      });
      renderBell();
    }
    var markAll = document.querySelector("[data-mark-all]");
    if (markAll) {
      markAll.addEventListener("click", function () {
        window.JCOB_DATA.get().notifications.forEach(function (n) { n.read = true; });
        window.JCOB_DATA.save();
        renderBell();
        toast({ title: "All caught up", message: "All notifications marked as read.", type: "success" });
        if (location.hash === "#notifications") location.reload();
      });
    }
  }

  function closeProfile() {
    var p = document.getElementById("profile-panel");
    if (p) p.classList.remove("is-open");
  }

  function initProfileMenu() {
    var btn = document.querySelector("[data-profile-btn]");
    var panel = document.getElementById("profile-panel");
    if (btn && panel) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        panel.classList.toggle("is-open");
        var bp = document.getElementById("bell-panel");
        if (bp) bp.classList.remove("is-open");
      });
    }
    var bellBtn = document.querySelector("[data-bell]");
    document.addEventListener("click", function (e) {
      if (panel && btn && !panel.contains(e.target) && !btn.contains(e.target)) panel.classList.remove("is-open");
      var bp = document.getElementById("bell-panel");
      if (bp && bellBtn && !bp.contains(e.target) && !bellBtn.contains(e.target)) bp.classList.remove("is-open");
    });
  }

  /* ---------------- Sidebar (mobile) ---------------- */
  function initSidebar() {
    var toggle = document.querySelector("[data-sidebar-toggle]");
    var sidebar = document.querySelector(".app-sidebar");
    var scrim = document.querySelector(".app-scrim");
    if (!toggle || !sidebar) return;
    function close() {
      sidebar.classList.remove("is-open");
      if (scrim) scrim.classList.remove("is-open");
    }
    toggle.addEventListener("click", function () {
      var open = sidebar.classList.toggle("is-open");
      if (scrim) scrim.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    toggle.setAttribute("aria-expanded", sidebar.classList.contains("is-open") ? "true" : "false");
    if (scrim) scrim.addEventListener("click", close);
    sidebar.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { if (window.innerWidth <= 1024) close(); });
    });
    window.addEventListener("resize", function () { if (window.innerWidth > 1024) close(); });
  }

  /* ---------------- Export / print ---------------- */
  function downloadCSV(filename, content) {
    var blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1200);
  }

  function tableCSV(headers, rows) {
    var lines = [headers.join(",")];
    rows.forEach(function (r) {
      lines.push(r.map(function (cell) {
        var str = String(cell == null ? "" : cell).replace(/"/g, '""');
        return /[",\n]/.test(str) ? '"' + str + '"' : str;
      }).join(","));
    });
    return lines.join("\n");
  }

  /* ---------------- Document headers ----------------
     Every receipt, statement and downloaded document opens on the same
     emerald band the site header uses, with the light platform lockup.
     The markup is shared so paper, download and screen cannot drift. */

  var DOC_ACCENT = "#d4a63a";
  var DOC_BRIGHT = "#ffd166";
  var DOC_NAVY = "#020817";
  var DOC_PANEL = "#08172d";
  var DOC_INK = "#ffffff";
  var DOC_BODY = "#cbd5e1";
  var DOC_MUTED = "#94a3b8";

  function assetBase() {
    return location.origin + location.pathname.replace(/[^/]*$/, "");
  }

  /* Absolute address of a bundled asset, so an inlined copy of the site
     (or a downloaded document opened from disk) still finds the brand. */
  function assetUrl(name) {
    var inlined = (window.JCOB_INLINE_LOGOS || {})[name];
    if (inlined) return inlined;
    try { return new URL("assets/img/" + name, location.href).href; }
    catch (e) { return "assets/img/" + name; }
  }

  /* The brand lockup used inside downloaded documents: the emblem plus the
     gold wordmark. The image is absolute, so the file still shows the
     logo when it is opened from a phone's downloads folder. */
  function inlineLockup(height) {
    var h = height || 40;
    return '<img src="' + assetUrl("logo-full-light.svg") + '" alt="JAY C O B FINANCIAL SERVICES" ' +
      'width="268" height="64" style="height:' + h + 'px;width:auto;display:block">';
  }

  /* A document header for a dashboard dialog. */
  function docHead(o) {
    o = o || {};
    var logo = o.inline
      ? inlineLockup(o.logoHeight || 40)
      : '<img class="doc-head__logo" src="assets/img/logo-full-light.svg" alt="JAY C O B FINANCIAL SERVICES" width="268" height="64">';
    return '<div class="doc-head' + (o.compact ? " doc-head--compact" : "") + '">' + logo +
      '<div class="doc-head__text">' +
        '<span class="doc-head__kicker">' + (o.kicker || "JAY C O B FINANCIAL SERVICES") + '</span>' +
        '<span class="doc-head__title">' + (o.title || "") + '</span>' +
        (o.meta ? '<p class="doc-head__meta">' + o.meta + '</p>' : "") +
      '</div></div>';
  }

  /* A complete, self-contained HTML document: emerald band, gold rail,
     logo, table styles. Used by every download so the file itself is
     branded, not just the screen it came from. */
  function documentHTML(o) {
    o = o || {};
    return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">' +
      '<title>' + (o.title || "JAY C O B document") + '</title><style>' +
      'body{margin:0;background:#020817;color:#cbd5e1;font:13px/1.6 Inter,Arial,sans-serif;padding:28px;' +
      'background-image:radial-gradient(900px 420px at 88% -20%,rgba(212,166,58,.10),transparent 62%);' +
      'background-attachment:fixed;}' +
      '.sheet{max-width:820px;margin:0 auto;background:#08172d;border-radius:16px;overflow:hidden;' +
      'box-shadow:0 24px 60px -40px rgba(0,0,0,.9);border:1px solid rgba(184,138,43,.38);}' +
      '.band{position:relative;display:flex;align-items:center;gap:16px;flex-wrap:wrap;padding:20px 24px;' +
      'background:radial-gradient(900px 420px at 88% -20%,rgba(212,166,58,.16),transparent 62%),' +
      'linear-gradient(165deg,#061329 0%,#030d20 62%,#020817 100%);color:#cbd5e1;' +
      '-webkit-print-color-adjust:exact;print-color-adjust:exact;}' +
      '.band:after{content:"";position:absolute;left:0;right:0;bottom:0;height:3px;' +
      'background:linear-gradient(90deg,transparent,' + DOC_ACCENT + ' 30%,#ffd166 50%,' + DOC_ACCENT + ' 70%,transparent);}' +
      '.band .txt{margin-left:auto;text-align:right;}' +
      '.kicker{display:block;font-size:9px;letter-spacing:2.4px;text-transform:uppercase;color:#ffd166;font-weight:700;}' +
      '.band h1{margin:4px 0 0;font:600 17px/1.2 Georgia,serif;color:#ffffff;}' +
      '.band p{margin:4px 0 0;font-size:11px;color:#94a3b8;}' +
      '.body{padding:22px 24px 26px;}' +
      '.body h2{font:600 14px Georgia,serif;margin:0 0 10px;color:#e7c36b;}' +
      'table{width:100%;border-collapse:collapse;margin-top:10px;font-size:12px;}' +
      'th,td{border-bottom:1px solid rgba(148,163,184,.16);padding:8px 10px;text-align:left;vertical-align:top;}' +
      'td{color:#cbd5e1;}' +
      'th{font-size:10px;text-transform:uppercase;letter-spacing:.8px;color:#e7c36b;background:#01060f;}' +
      'td.num{text-align:right;font-variant-numeric:tabular-nums;color:#ffffff;}' +
      '.muted{color:#94a3b8;font-size:11px;}' +
      '.kv{display:grid;grid-template-columns:170px 1fr;gap:6px 14px;margin:0;}' +
      '.kv dt{color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:.8px;}' +
      '.kv dd{margin:0;font-weight:600;color:#ffffff;}' +
      '.foot{margin-top:18px;padding-top:12px;border-top:1px dashed rgba(184,138,43,.38);color:#94a3b8;font-size:10.5px;}' +
      '@media print{body{background:#fff;color:#111;padding:0}' +
      '.sheet{background:#fff;border:0;box-shadow:none}' +
      '.body h2,.kv dd,td,td.num{color:#111}.muted,.kv dt,.foot{color:#555}' +
      'th{color:#333;background:#f2f2f2}}' +
      '</style></head><body><div class="sheet">' +
      '<div class="band">' + inlineLockup(44) +
      '<div class="txt"><span class="kicker">' + (o.kicker || "JAY C O B FINANCIAL SERVICES") + '</span>' +
      '<h1>' + (o.title || "") + '</h1>' + (o.meta ? '<p>' + o.meta + '</p>' : '') + '</div></div>' +
      '<div class="body">' + (o.body || "") +
      '<p class="foot">JAY C O B FINANCIAL SERVICES · Plot 47/3, Area 47, Sector 3, Lilongwe, Malawi · ' +
      'hello@jaycobfinancial.mw · +265 999 123 456<br>All amounts in Malawian Kwacha (MWK). ' +
      (o.note || "") + '</p></div></div></body></html>';
  }

  /* Download the branded HTML document built above. */
  function downloadDocument(filename, o) {
    var content = documentHTML(o);
    var blob = new Blob(["\ufeff", content], { type: "text/html;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1200);
  }

  function printElement(id) {
    var el = document.getElementById(id);
    if (!el) { window.print(); return; }
    var frame = document.createElement("iframe");
    frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
    document.body.appendChild(frame);
    var doc = frame.contentWindow.document;
    doc.open();
    doc.write('<!DOCTYPE html><html><head><title>JAY C O B Financial Services</title>' +
      '<style>@page{margin:14mm}body{font-family:Inter,Arial,sans-serif;color:#0b201c;padding:0;font-size:12px;margin:0;}' +
      'h1,h2,h3{font-family:Georgia,serif;margin:0 0 6px;}' +
      '.band{position:relative;display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:18px 20px;' +
      'background:radial-gradient(900px 420px at 88% -20%,rgba(212,166,58,.16),transparent 62%),' +
      'linear-gradient(165deg,#061329 0%,#030d20 62%,#020817 100%);color:#cbd5e1;' +
      '-webkit-print-color-adjust:exact;print-color-adjust:exact;}' +
      '.band:after{content:"";position:absolute;left:0;right:0;bottom:0;height:3px;' +
      'background:linear-gradient(90deg,transparent,' + DOC_ACCENT + ' 30%,#ffd166 50%,' + DOC_ACCENT + ' 70%,transparent);}' +
      '.band .txt{margin-left:auto;text-align:right;}' +
      '.kicker{display:block;font-size:9px;letter-spacing:2.4px;text-transform:uppercase;color:#ffd166;font-weight:700;}' +
      '.band strong{display:block;font-family:Georgia,serif;font-size:16px;color:#fff;margin-top:3px;}' +
      '.band .muted{color:#94a3b8;font-size:11px;}' +
      '.wrap{padding:18px 4px 0;}' +
      'table{width:100%;border-collapse:collapse;margin-top:12px;}' +
      'th,td{border-bottom:1px solid #ddd;padding:6px 8px;text-align:left;}th{font-size:10px;text-transform:uppercase;color:#658982;}' +
      '.muted{color:#658982;font-size:11px;} .totals{margin-top:12px;font-weight:700;}</style></head><body>' +
      '<div class="band">' + inlineLockup(44) +
      '<div class="txt"><span class="kicker">JAY C O B FINANCIAL SERVICES</span>' +
      '<strong>' + (el.getAttribute("data-doc-title") || "Document") + '</strong>' +
      '<span class="muted">Plot 47/3, Area 47, Sector 3, Lilongwe · MWK</span></div></div>' +
      '<div class="wrap">' + el.innerHTML + '</div></body></html>');
    doc.close();
    frame.contentWindow.focus();
    setTimeout(function () {
      frame.contentWindow.print();
      setTimeout(function () { frame.remove(); }, 1500);
    }, 250);
  }

  /* ---------------- Table helpers ---------------- */
  function paginate(rows, page, perPage) {
    var start = (page - 1) * perPage;
    return {
      rows: rows.slice(start, start + perPage),
      total: rows.length,
      pages: Math.max(Math.ceil(rows.length / perPage), 1),
      start: start
    };
  }

  function pagerHTML(current, total, key) {
    if (total <= 1) return "";
    var out = '<div class="pager" data-pager="' + (key || "default") + '">';
    out += '<button type="button" data-page="' + Math.max(current - 1, 1) + '"' + (current === 1 ? " disabled" : "") + ">‹</button>";
    for (var i = 1; i <= total; i++) {
      if (total > 7 && Math.abs(i - current) > 2 && i !== 1 && i !== total) {
        if (i === 2 || i === total - 1) out += "<span>…</span>";
        continue;
      }
      out += '<button type="button" data-page="' + i + '" class="' + (i === current ? "is-active" : "") + '">' + i + "</button>";
    }
    out += '<button type="button" data-page="' + Math.min(current + 1, total) + '"' + (current === total ? " disabled" : "") + ">›</button></div>";
    return out;
  }

  function statusPill(status) {
    var map = {
      approved: "ok", active: "ok", completed: "ok", success: "ok", verified: "ok", paid: "ok",
      available: "ok", resolved: "ok", closed: "neutral",
      pending: "warn", under_review: "warn", info_required: "warn", processing: "warn",
      "in progress": "warn", due: "warn", "in arrears": "danger", overdue: "danger",
      rejected: "danger", failed: "danger", withdrawn: "neutral", upcoming: "neutral",
      draft: "neutral", open: "info"
    };
    var key = String(status || "").toLowerCase().replace(/_/g, " ");
    var tone = map[key] || map[String(status || "").toLowerCase()] || "neutral";
    var label = String(status || "").replace(/_/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    return '<span class="pill pill--' + tone + '">' + label + "</span>";
  }

  function emptyState(title, text, cta) {
    return '<div class="empty-state"><div class="empty-icon">' + ICONS.info + "</div><h3>" + title + "</h3><p>" + text + "</p>" +
      (cta ? '<a class="btn btn--gold btn--sm" href="' + cta.href + '">' + cta.label + "</a>" : "") + "</div>";
  }

  /* ---------------- Search filter ---------------- */
  function initFilter(inputSel, rowSel, emptySel) {
    var input = document.querySelector(inputSel);
    if (!input) return;
    input.addEventListener("input", function () {
      var q = input.value.toLowerCase().trim();
      var visible = 0;
      document.querySelectorAll(rowSel).forEach(function (row) {
        var match = row.textContent.toLowerCase().indexOf(q) >= 0;
        row.hidden = !match;
        if (match) visible++;
      });
      var empty = document.querySelector(emptySel);
      if (empty) empty.hidden = visible > 0;
    });
  }


  /* ---------------- Password reveal (single delegated handler) ---------------- */
  var EYE_ON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
  var EYE_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/><path d="M3 3l18 18"/></svg>';

  function passwordInputFor(btn) {
    var id = btn.getAttribute("data-pw-toggle");
    var input = id ? document.getElementById(id) : null;
    if (input) return input;
    var wrap = btn.closest(".pw-wrap") || btn.parentNode;
    return wrap ? wrap.querySelector('input[type="password"], input[type="text"]') : null;
  }

  function initPasswordToggles() {
    if (document.documentElement.getAttribute("data-pw-bound") === "1") return;
    document.documentElement.setAttribute("data-pw-bound", "1");
    document.addEventListener("click", function (e) {
      var btn = e.target && e.target.closest ? e.target.closest("[data-pw-toggle]") : null;
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      var input = passwordInputFor(btn);
      if (!input) return;
      var showing = input.type === "text";
      input.type = showing ? "password" : "text";
      btn.setAttribute("aria-pressed", String(!showing));
      btn.setAttribute("aria-label", showing ? "Show password" : "Hide password");
      btn.setAttribute("title", showing ? "Show password" : "Hide password");
      btn.innerHTML = showing ? EYE_ON : EYE_OFF;
      try { input.focus({ preventScroll: true }); } catch (err) {}
    }, true);
  }
  initPasswordToggles();

  /* ---------------- Boot ---------------- */
  document.addEventListener("DOMContentLoaded", function () {
    initBell();
    initProfileMenu();
    initSidebar();
    initPasswordToggles();
    updateBell();
  });

  window.JCOB_UI = {
    ICONS: ICONS,
    toast: toast,
    modal: modal,
    closeModal: closeModal,
    getSession: getSession,
    setSession: setSession,
    clearSession: clearSession,
    requireAuth: requireAuth,
    tryCount: tryCount,
    setTryCount: setTryCount,
    clearTryCount: clearTryCount,
    renderBell: renderBell,
    updateBell: updateBell,
    timeAgo: timeAgo,
    downloadCSV: downloadCSV,
    tableCSV: tableCSV,
    printElement: printElement,
    docHead: docHead,
    documentHTML: documentHTML,
    downloadDocument: downloadDocument,
    inlineLockup: inlineLockup,
    paginate: paginate,
    pagerHTML: pagerHTML,
    statusPill: statusPill,
    emptyState: emptyState,
    initFilter: initFilter,
    initPasswordToggles: initPasswordToggles,
    formatMWK: F ? F.formatMWK : function (v) { return "MWK " + v; }
  };
})();
