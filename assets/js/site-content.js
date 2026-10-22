/* =====================================================================
   JAY C O B FINANCIAL SERVICES — website content runtime
   ---------------------------------------------------------------------
   Runs on every public page. Reads the shared store (assets/js/site-store.js)
   and applies whatever the admin console has published:

     1. page text / link / section-visibility overrides
     2. brand + contact details across the whole page (footer, contact
        blocks, legal pages, tel: and mailto: links)
     3. the live lending catalogue (rates, limits, fees) for anything that
        reads window.JCOB_SITE.products

   Nothing here is required for the site to work — with an empty store the
   pages render exactly as authored.
   ===================================================================== */
(function () {
  "use strict";

  var S = window.JCOB_SITE;
  if (!S) return;

  var DEFAULTS = S.DEFAULTS.settings;

  function textNodes(root, visit) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        var parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (/^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA|OPTION)$/.test(parent.tagName)) return NodeFilter.FILTER_REJECT;
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var node;
    while ((node = walker.nextNode())) visit(node);
  }

  /* Replace the seeded default strings with anything the admin changed. */
  function applyContactDetails() {
    var s = S.settings;
    var pairs = [
      [DEFAULTS.phone, s.phone],
      [DEFAULTS.phoneAlt, s.phoneAlt],
      [DEFAULTS.emergency, s.emergency],
      [DEFAULTS.email, s.email],
      [DEFAULTS.supportEmail, s.supportEmail],
      [DEFAULTS.address, s.address],
      [DEFAULTS.hours, s.hours],
      [DEFAULTS.licence, s.licence],
      [DEFAULTS.registration, s.registration]
    ].filter(function (p) { return p[1] && p[1] !== p[0]; });

    if (pairs.length) {
      textNodes(document.body, function (node) {
        var text = node.nodeValue;
        var next = text;
        pairs.forEach(function (p) { next = next.split(p[0]).join(p[1]); });
        if (next !== text) node.nodeValue = next;
      });
    }

    var telTargets = [DEFAULTS.phone, DEFAULTS.phoneAlt, DEFAULTS.emergency];
    document.querySelectorAll('a[href^="tel:"]').forEach(function (a) {
      var digits = a.getAttribute("href").replace(/[^\d+]/g, "");
      var index = telTargets.findIndex(function (t) { return t.replace(/[^\d]/g, "") === digits.replace(/[^\d]/g, ""); });
      if (index === 0) a.setAttribute("href", "tel:" + s.phone.replace(/[^\d+]/g, ""));
      if (index === 1) a.setAttribute("href", "tel:" + s.phoneAlt.replace(/[^\d+]/g, ""));
      if (index === 2) a.setAttribute("href", "tel:" + s.emergency.replace(/[^\d+]/g, ""));
      if (a.textContent.trim() === "" || /\+265/.test(a.textContent)) {
        if (index === 0) a.textContent = s.phone;
        if (index === 1) a.textContent = s.phoneAlt;
        if (index === 2) a.textContent = s.emergency;
      }
    });

    document.querySelectorAll('a[href^="mailto:"]').forEach(function (a) {
      var address = a.getAttribute("href").replace("mailto:", "").split("?")[0];
      if (address === DEFAULTS.email) { a.setAttribute("href", "mailto:" + s.email); a.textContent = s.email; }
      if (address === DEFAULTS.supportEmail) { a.setAttribute("href", "mailto:" + s.supportEmail); a.textContent = s.supportEmail; }
    });

    /* social links */
    var social = s.social || {};
    var map = { facebook: "facebook", linkedin: "linkedin", whatsapp: "whatsapp", x: "x" };
    document.querySelectorAll("a[href]").forEach(function (a) {
      var href = a.getAttribute("href") || "";
      Object.keys(map).forEach(function (key) {
        if (social[key] && href.indexOf(DEFAULTS.social[key]) === 0) a.setAttribute("href", social[key]);
      });
    });
  }

  function applyBrand() {
    var s = S.settings;
    if (s.shortBrand && s.shortBrand !== DEFAULTS.shortBrand) {
      textNodes(document.body, function (node) {
        if (node.nodeValue.trim() === DEFAULTS.shortBrand) node.nodeValue = s.shortBrand;
      });
    }
    document.querySelectorAll('img[alt="JAY C O B FINANCIAL SERVICES"]').forEach(function (img) {
      if (s.brand) img.setAttribute("alt", s.brand);
    });
  }

  function run() {
    /* the single-file export is a frozen snapshot — no per-page overrides */
    if (document.body && document.body.dataset && document.body.dataset.single === "true") return;
    try { S.apply(document); } catch (e) {}
    try { applyContactDetails(); } catch (e) {}
    try { applyBrand(); } catch (e) {}

    /* let late listeners (calculator, apply flow) pick up the catalogue */
    try {
      document.dispatchEvent(new CustomEvent("jcob:site-ready", { detail: S.get() }));
    } catch (e) {}
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }

  /* Cloud mode fills the store a moment after first paint — re-apply the
     published content as soon as it lands. */
  try { S.subscribe(function () { run(); }); } catch (e) {}
})();
