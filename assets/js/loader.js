/* =====================================================================
   JAY C O B FINANCIAL SERVICES — loading system
   ---------------------------------------------------------------------
   One small, dependency-free module that paints the brand loading
   animation on every surface of the platform:

     • while a page is being fetched, refreshed or restored
     • while somebody signs in or signs out
     • while a form is being submitted (the button itself turns busy)
     • while a dashboard re-reads its records after a refresh
     • while the console opens a module

   It injects its own CSS and markup, so it works on the public pages,
   the customer dashboard and the admin console alike, and it degrades
   silently when JavaScript is off.

   PUBLIC API  (window.JCOB_LOADER)
     show(message, options)     paint the overlay
     hide()                     remove it
     message(text)              change the caption in place
     wrap(promise, message)     show while a promise settles
     busy(button, promise)      turn a button into a spinner
     refresh(options)           the full "refresh this page" animation
     attach(button, handler)    wire a refresh button
   ===================================================================== */
(function () {
  "use strict";

  if (window.JCOB_LOADER) return;

  /* The single-file edition inlines every image; a hosted page loads the
     bundled SVG. Either way the emblem on the loader is the brand mark. */
  var LOGO = (window.JCOB_INLINE_LOGOS && window.JCOB_INLINE_LOGOS["logo-mark.svg"]) || "assets/img/logo-mark.svg";
  var BRAND = "JAY C O B FINANCIAL SERVICES";
  var shown = 0;
  var overlay = null;
  var caption = null;
  var bar = null;
  var timer = null;
  var watchdog = null;
  var reduced = false;
  try {
    reduced = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  } catch (e) {}

  /* ---------------- styles ---------------- */
  var CSS = [
    ".jl{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;",
    "background:radial-gradient(900px 520px at 82% -12%,rgba(212,166,58,.18),transparent 62%),",
    "radial-gradient(820px 480px at 6% 108%,rgba(10,63,107,.45),transparent 64%),",
    "linear-gradient(165deg,#061329 0%,#04101f 52%,#020817 100%);",
    "opacity:0;visibility:hidden;transition:opacity .22s ease,visibility .22s ease}",
    ".jl.is-on{opacity:1;visibility:visible}",
    ".jl__card{display:flex;flex-direction:column;align-items:center;gap:14px;padding:26px 30px;text-align:center;max-width:min(92vw,420px)}",
    ".jl__ring{position:relative;width:104px;height:104px;display:grid;place-items:center}",
    ".jl__ring::before,.jl__ring::after{content:'';position:absolute;inset:0;border-radius:50%;",
    "border:2px solid transparent}",
    ".jl__ring::before{border-top-color:#ffd166;border-right-color:rgba(212,166,58,.45);",
    "animation:jlspin 1.05s linear infinite;filter:drop-shadow(0 0 10px rgba(212,166,58,.55))}",
    ".jl__ring::after{inset:11px;border-bottom-color:rgba(56,189,248,.75);border-left-color:rgba(56,189,248,.25);",
    "animation:jlspin 1.6s linear infinite reverse}",
    ".jl__logo{width:58px;height:58px;object-fit:contain;animation:jlpulse 1.9s ease-in-out infinite;",
    "filter:drop-shadow(0 6px 16px rgba(0,0,0,.55))}",
    ".jl__brand{font:800 11px/1.2 Inter,'Segoe UI',system-ui,sans-serif;letter-spacing:.26em;",
    "color:#ffd166;text-transform:uppercase;margin:0}",
    ".jl__msg{margin:0;font:500 13px/1.5 Inter,'Segoe UI',system-ui,sans-serif;color:#cbd5e1;min-height:1.4em}",
    ".jl__bar{position:relative;width:172px;height:3px;border-radius:999px;background:rgba(148,163,184,.22);overflow:hidden}",
    ".jl__bar i{position:absolute;left:-40%;top:0;bottom:0;width:40%;border-radius:999px;",
    "background:linear-gradient(90deg,transparent,#d4a63a,#ffe7a8,#d4a63a,transparent);animation:jlslide 1.25s ease-in-out infinite}",
    ".jl__note{margin:0;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:#94a3b8}",
    "@keyframes jlspin{to{transform:rotate(360deg)}}",
    "@keyframes jlpulse{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}",
    "@keyframes jlslide{0%{left:-42%}100%{left:102%}}",
    "body.jl-locked{overflow:hidden}",
    /* a button that is working */
    ".is-busy{position:relative;pointer-events:none;opacity:.9}",
    ".is-busy::after{content:'';width:13px;height:13px;margin-left:8px;display:inline-block;vertical-align:-2px;",
    "border-radius:50%;border:2px solid currentColor;border-top-color:transparent;animation:jlspin .7s linear infinite}",
    ".is-busy>*{visibility:visible}",
    /* inline spinner used by dashboards while a module re-reads its data */
    ".jl-inline{display:inline-flex;align-items:center;gap:8px;color:#cbd5e1;font-size:12.5px}",
    ".jl-inline::before{content:'';width:14px;height:14px;border-radius:50%;border:2px solid rgba(212,166,58,.45);",
    "border-top-color:#ffd166;animation:jlspin .7s linear infinite}",
    ".jl-fade{animation:jlfade .26s ease}",
    "@keyframes jlfade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}",
    "@media (prefers-reduced-motion: reduce){.jl__ring::before,.jl__ring::after,.jl__logo,.jl__bar i,.is-busy::after,.jl-inline::before{animation:none}",
    ".jl__bar i{left:0;width:100%;opacity:.7}}"
  ].join("");

  function style() {
    if (document.getElementById("jl-style")) return;
    var el = document.createElement("style");
    el.id = "jl-style";
    el.textContent = CSS;
    (document.head || document.documentElement).appendChild(el);
  }

  function mark() {
    return '<span class="jl__ring"><img class="jl__logo" src="' + LOGO +
      '" alt="" width="58" height="58" onerror="this.style.display=\'none\'"></span>';
  }

  function build() {
    if (overlay) return overlay;
    style();
    overlay = document.createElement("div");
    overlay.className = "jl";
    overlay.id = "jcob-loader";
    overlay.setAttribute("role", "status");
    overlay.setAttribute("aria-live", "polite");
    overlay.setAttribute("aria-label", "Loading");
    overlay.innerHTML =
      '<div class="jl__card">' + mark() +
        '<p class="jl__brand">' + BRAND + '</p>' +
        '<p class="jl__msg">&nbsp;</p>' +
        '<div class="jl__bar"><i></i></div>' +
        '<p class="jl__note">Your financial partner</p>' +
      '</div>';
    document.body.appendChild(overlay);
    caption = overlay.querySelector(".jl__msg");
    bar = overlay.querySelector(".jl__bar");
    return overlay;
  }

  function paint(message) {
    build();
    if (message != null && caption) caption.textContent = String(message);
    overlay.classList.add("is-on");
    overlay.hidden = false;
    document.body.classList.add("jl-locked");
  }

  /* ---------------- public API ---------------- */

  function show(message, options) {
    options = options || {};
    if (!document.body) {
      document.addEventListener("DOMContentLoaded", function () { show(message, options); }, { once: true });
      return;
    }
    shown = Date.now();
    paint(message || "Loading…");
    clearTimeout(watchdog);
    if (options.watchdog !== false) {
      /* Never trap the page behind the overlay: if whatever was loading
         never calls hide(), lift it after a few seconds. */
      watchdog = setTimeout(hide, options.after || 12000);
    }
    return overlay;
  }

  function hide() {
    clearTimeout(watchdog);
    if (!overlay) return;
    var min = 320;
    var wait = Math.max(0, min - (Date.now() - shown));
    setTimeout(function () {
      if (!overlay) return;
      overlay.classList.remove("is-on");
      document.body.classList.remove("jl-locked");
      setTimeout(function () {
        if (overlay && !overlay.classList.contains("is-on")) overlay.hidden = true;
      }, 240);
    }, wait);
  }

  function message(text) {
    if (caption) caption.textContent = String(text || "");
  }

  function wrap(promise, text) {
    show(text);
    return Promise.resolve(promise).then(function (value) {
      hide();
      return value;
    }, function (err) {
      hide();
      throw err;
    });
  }

  function busy(button, promise) {
    if (!button) return promise;
    button.classList.add("is-busy");
    var label = button.textContent;
    button.setAttribute("aria-busy", "true");
    var done = function () {
      button.classList.remove("is-busy");
      button.removeAttribute("aria-busy");
      if (label) button.textContent = label;
    };
    return Promise.resolve(promise).then(function (v) { done(); return v; },
      function (e) { done(); throw e; });
  }

  /* ---------------- refresh ---------------- */

  function refresh(options) {
    options = options || {};
    var text = options.message || "Refreshing…";
    show(text, { after: 15000 });
    /* Re-read the page from the network without touching history, then
       re-render in place. Bypasses the bfcache so the figures are live. */
    return new Promise(function (resolve) {
      var finish = function () {
        if (typeof options.then === "function") {
          try { options.then(); } catch (e) {}
        }
        hide();
        resolve(true);
      };
      if (/^https?:/.test(location.href)) {
        fetch(location.href, { cache: "reload", credentials: "same-origin" })
          .then(function (r) { return r.ok ? r.text() : null; })
          .then(function () { setTimeout(finish, 260); })
          .catch(function () { setTimeout(finish, 260); });
      } else {
        setTimeout(finish, 320);
      }
    });
  }

  function attach(button, handler) {
    if (!button) return;
    button.addEventListener("click", function (e) {
      e.preventDefault();
      var run = handler || function () { return refresh(); };
      button.classList.add("is-busy");
      var result = run();
      Promise.resolve(result).then(function () {
        button.classList.remove("is-busy");
        button.title = "Refreshed " + new Date().toLocaleTimeString("en-GB");
      }, function () { button.classList.remove("is-busy"); });
    });
  }

  /* ---------------- automatic behaviour ---------------- */

  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else fn();
  }

  var LOADED = false;

  ready(function () {
    /* 1. the first paint: a brand splash while the page settles */
    if (!document.body.hasAttribute("data-no-splash")) {
      show("Loading " + (document.title ? document.title.split("·")[0].trim() : "your page") + "…",
        { watchdog: false });
      timer = setTimeout(function () {
        if (!LOADED) hide();
      }, 5000);
    }

    /* 2. any link to another page on this site */
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest("a[href]");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
      var href = a.getAttribute("href") || "";
      if (!href || href.charAt(0) === "#" || /^(mailto|tel|javascript|wa\.me|https?:)/i.test(href)) return;
      if (!/\.html?(\?|#|$)/i.test(href) && !/^\//.test(href)) return;
      show("Opening…", { watchdog: false });
    }, true);

    /* 3. forms: the button always becomes a spinner. The full overlay is
          reserved for the forms that hand over to the account service
          (sign in, sign up, verification, password reset), where the wait
          is a network round-trip rather than an instant redraw. */
    var OVERLAY_FORM = /^(login|register|verify|forgot|reset|admin-gate)-form$/;
    document.addEventListener("submit", function (e) {
      var form = e.target;
      if (!form || e.defaultPrevented || form.hasAttribute("data-no-overlay")) return;
      var btn = form.querySelector('[type="submit"], button:not([type])');
      if (btn) {
        btn.classList.add("is-busy");
        btn.setAttribute("aria-busy", "true");
        setTimeout(function () {
          btn.classList.remove("is-busy");
          btn.removeAttribute("aria-busy");
        }, 12000);
      }
      var id = String(form.id || form.getAttribute("data-form") || "");
      var authForm = OVERLAY_FORM.test(id) || form.hasAttribute("data-loading");
      if (!authForm) return;
      var label = (btn && (btn.dataset.loading || btn.textContent)) || "Submitting";
      show(String(label).trim().replace(/[.…]+$/, "") + "…", { after: 15000 });
    }, false);

    /* 4. a refresh or a navigation away */
    window.addEventListener("beforeunload", function () {
      if (!overlay) return;
      paint("Refreshing…");
      overlay.querySelector(".jl__note").textContent = "One moment";
    });

    /* 5. coming back through the cache */
    window.addEventListener("pageshow", function (e) {
      if (e.persisted) hide();
    });

    window.addEventListener("load", function () {
      LOADED = true;
      clearTimeout(timer);
      hide();
    });

    window.addEventListener("error", function () {
      hide();
    });
  });

  window.JCOB_LOADER = {
    show: show,
    hide: hide,
    message: message,
    wrap: wrap,
    busy: busy,
    refresh: refresh,
    attach: attach,
    get visible() { return !!(overlay && overlay.classList.contains("is-on")); }
  };
})();
