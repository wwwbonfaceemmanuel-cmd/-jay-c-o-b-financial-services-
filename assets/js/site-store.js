/* =====================================================================
   JAY C O B FINANCIAL SERVICES — shared website store
   ---------------------------------------------------------------------
   One data layer used by BOTH the public website and the admin portal.

   Holds:
     settings  — brand, contact details, hours, licensing, calculator
                 defaults and lending policy numbers
     products  — the lending catalogue shown on the website
     content   — per-page text / link overrides keyed by a CSS path that
                 the CMS computes from the live page markup
     sections  — per-page section visibility

   Everything is kept in Supabase (site_docs); every read/write
   goes through this module, so Supabase can replace read()/write() with
   table calls later without touching the pages or the admin console.

   Public API (window.JCOB_SITE):
     get()                      → the whole store
     save()
     reset()                    → back to seeded defaults
     settings                   → shortcut to the settings object
     products                   → shortcut to the product array
     pageName()                 → current page filename
     collect(doc)               → editable blocks found on a page
     sections(doc)              → sections found on a page
     apply(doc)                 → apply saved overrides to a document
     setField(page, key, value) → save one text/link override
     clearField(page, key)
     setSection(page, key, hidden)
     product(name)              → product by name
     subscribe(fn)              → storage + same-tab changes
   ===================================================================== */
(function () {
  "use strict";

  var KEY = "jcob_site_v1";
  var VERSION = 1;

  /* ------------------------------------------------------------------
     Seeded defaults — these mirror the published website.
     ------------------------------------------------------------------ */
  var SETTINGS = {
    brand: "JAY C O B FINANCIAL SERVICES",
    shortBrand: "JAY C O B",
    tagline: "Licensed money lender · Lilongwe, Malawi",
    phone: "+265 999 123 456",
    phoneAlt: "+265 888 456 789",
    emergency: "+265 999 000 111",
    email: "hello@jaycobfinancial.mw",
    supportEmail: "support@jaycobfinancial.mw",
    address: "Plot 47/3, Area 47, Sector 3, Lilongwe, Malawi",
    hours: "Monday to Friday 08:00–17:00 · Saturday 08:00–12:00",
    currency: "MWK",
    registration: "MBRS-2024-11882",
    licence: "Money Lending Licence ML-2024-0118 — Reserve Bank of Malawi",
    social: {
      facebook: "https://facebook.com/jaycobfinancial",
      linkedin: "https://linkedin.com/company/jaycobfinancial",
      whatsapp: "https://wa.me/265999123456",
      x: "https://x.com/jaycobfinancial"
    },
    calc: {
      amount: 5000000,
      rate: 24,
      rateBasis: "annual",
      basis: "monthly",
      term: 1,
      method: "reducing",
      frequency: "monthly",
      fee: 2,
      adminFee: 0
    },
    policy: {
      graceDays: 5,
      penaltyPct: 2,
      maxDTI: 40,
      maxInstalmentShare: 30,
      minAge: 18,
      maxAge: 65
    }
  };

  var PRODUCTS = [
    { id: "personal", name: "Personal Loan", rate: 24, rateBasis: "annual", method: "reducing", min: 100000, max: 15000000, minTerm: 6, maxTerm: 48, fee: 2, active: true,
      summary: "Unsecured cash for school fees, home improvement and personal plans.",
      eligibility: ["Age 18+ with a valid national ID", "Resident in Malawi", "Net income from MWK 120,000 per month", "No current arrears with other lenders"] },
    { id: "business", name: "Business Loan", rate: 22, rateBasis: "annual", method: "reducing", min: 500000, max: 50000000, minTerm: 12, maxTerm: 60, fee: 2.5, active: true,
      summary: "Working capital, stock and expansion finance for registered businesses.",
      eligibility: ["Registered business or trading licence", "Six months of trading records", "Business bank or mobile money account"] },
    { id: "emergency", name: "Emergency Loan", rate: 28, rateBasis: "annual", method: "reducing", min: 50000, max: 2000000, minTerm: 3, maxTerm: 12, fee: 2, active: true,
      summary: "Fast-tracked small amounts for urgent medical, funeral or travel costs.",
      eligibility: ["Decision within one working day", "Valid national ID", "Verifiable income or guarantor"] },
    { id: "salary", name: "Salary-based Loan", rate: 23, rateBasis: "annual", method: "reducing", min: 100000, max: 10000000, minTerm: 6, maxTerm: 36, fee: 2, active: true,
      summary: "Repaid by employer payroll deduction, with a fixed monthly instalment.",
      eligibility: ["Permanent or long-term contract employee", "Employer willing to confirm employment", "Net salary of MWK 150,000+ per month", "Instalment within 40% of net salary"] },
    { id: "employee", name: "Employee Loan", rate: 21, rateBasis: "annual", method: "reducing", min: 100000, max: 8000000, minTerm: 6, maxTerm: 36, fee: 1.5, active: true,
      summary: "Preferential pricing for staff of partner employers and institutions.",
      eligibility: ["Employer on our approved list", "Six months in post", "Payroll deduction mandate signed"] },
    { id: "small-business", name: "Small-business Loan", rate: 23, rateBasis: "annual", method: "reducing", min: 250000, max: 20000000, minTerm: 6, maxTerm: 48, fee: 2, active: true,
      summary: "For market traders, salons, shops and other micro-enterprises.",
      eligibility: ["Trading for at least six months", "Business records or mobile money history", "Proof of business address"] },
    { id: "agricultural", name: "Agricultural Loan", rate: 20, rateBasis: "annual", method: "reducing", min: 200000, max: 25000000, minTerm: 6, maxTerm: 36, fee: 2, active: true,
      summary: "Seasonal input finance aligned to the harvest calendar.",
      eligibility: ["Land rights, tenancy or cooperative membership", "Seasonal repayment plan", "Proof of input supplier"] },
    { id: "short-term", name: "Short-term Loan", rate: 29, rateBasis: "annual", method: "reducing", min: 50000, max: 3000000, minTerm: 1, maxTerm: 6, fee: 3, active: true,
      summary: "One to six months, for short gaps in cash flow.",
      eligibility: ["Valid national ID", "Verifiable weekly or monthly income", "Repayment within six months"] },
    { id: "long-term", name: "Long-term Loan", rate: 21, rateBasis: "annual", method: "reducing", min: 1000000, max: 60000000, minTerm: 24, maxTerm: 84, fee: 2.5, active: true,
      summary: "Larger projects spread over two to seven years.",
      eligibility: ["Proven income over at least 12 months", "Security or guarantor for amounts above MWK 20,000,000", "Affordability assessment passed"] },
    { id: "secured", name: "Secured Loan", rate: 18, rateBasis: "annual", method: "reducing", min: 500000, max: 80000000, minTerm: 12, maxTerm: 84, fee: 1.5, active: true,
      summary: "Backed by a vehicle, title deed or fixed deposit — our lowest rate.",
      eligibility: ["Registered collateral in your name", "Independent valuation", "Comprehensive insurance where required"] },
    { id: "unsecured", name: "Unsecured Loan", rate: 26, rateBasis: "annual", method: "reducing", min: 100000, max: 10000000, minTerm: 6, maxTerm: 36, fee: 2.5, active: true,
      summary: "No collateral, assessed on income and credit record.",
      eligibility: ["Clean repayment record", "Verified income", "Debt-to-income within policy"] }
  ];

  var DEFAULTS = { version: VERSION, settings: SETTINGS, products: PRODUCTS, content: {}, sections: {}, updated: null };

  function clone(value) { return JSON.parse(JSON.stringify(value)); }

  /* The published documents live in site_docs. The constants above are the
     fallback used to draw a page before the database answers (and on a
     deployment with no database at all) — they are never treated as edits. */
  var data = clone(DEFAULTS);
  var listeners = [];

  function notify() {
    listeners.forEach(function (fn) { try { fn(data); } catch (e) {} });
  }

  function write(scope) {
    data.updated = new Date().toISOString();
    notify();
    try { document.dispatchEvent(new CustomEvent("jcob:site-updated", { detail: data })); } catch (e) {}
    var pending = push(scope || ["settings", "products"]);
    pending.catch(function () {});
    return true;
  }

  function reset() {
    data = clone(DEFAULTS);
    write(["settings", "products", "content", "sections"]);
    return data;
  }

  /* ---------------- CMS: selector + collection ---------------- */

  /* Zones that JavaScript rewrites at runtime — never edit these as content. */
  var SKIP = [
    "script", "style", "noscript", "svg", "iframe", "canvas",
    "[data-live-stream]", ".live-strip", ".live-blog", ".live-feed", ".live-stream",
    ".ticker", "#amort-body", "#amort-table", ".calc-result", "#results-sheet",
    "#calc-print-area", "[data-cms-skip]", ".modal", ".no-cms", "header.site-header",
    "footer.site-footer", "select", "option", "input", "textarea"
  ].join(",");

  function inSkipZone(el) {
    var node = el;
    while (node && node.nodeType === 1) {
      if (node.matches && node.matches(SKIP)) return true;
      node = node.parentElement;
    }
    return false;
  }

  function rootOf(doc) {
    return doc.querySelector("main#main") || doc.querySelector("main") || doc.body;
  }

  /* Stable CSS path from the page root — identical on both sides because
     the website is static and the console parses the very same file. */
  function selectorFor(el, doc) {
    var root = rootOf(doc);
    var parts = [];
    var node = el;
    while (node && node.nodeType === 1) {
      if (node === root) {
        parts.unshift(node.id ? node.tagName.toLowerCase() + "#" + node.id : node.tagName.toLowerCase());
        break;
      }
      if (node.id) {
        parts.unshift(node.tagName.toLowerCase() + "#" + node.id);
        break;
      }
      var index = 1;
      var sibling = node;
      while ((sibling = sibling.previousElementSibling)) {
        if (sibling.tagName === node.tagName) index += 1;
      }
      parts.unshift(node.tagName.toLowerCase() + ":nth-of-type(" + index + ")");
      node = node.parentElement;
    }
    return parts.join(" > ");
  }

  function hasBlockingChildren(el) {
    var kids = el.children;
    for (var i = 0; i < kids.length; i += 1) {
      var tag = kids[i].tagName.toLowerCase();
      if (["a", "img", "button", "input", "select", "textarea", "svg", "iframe", "video", "audio", "picture", "canvas"].indexOf(tag) >= 0) return true;
    }
    return false;
  }

  function textOf(el) {
    return (el.textContent || "").replace(/\s+/g, " ").trim();
  }

  function sectionFor(el, doc) {
    var node = el.closest ? el.closest("section") : null;
    if (!node) return { key: "", label: "Page header", id: "" };
    var heading = node.querySelector("h1, h2, h3");
    var label = heading ? textOf(heading) : "";
    if (!label) label = node.id || node.className.split(" ")[0] || "Section";
    return { key: selectorFor(node, doc), label: label.slice(0, 90), id: node.id || "" };
  }

  /* Collect every editable block on a parsed page. */
  function collect(doc) {
    var root = rootOf(doc);
    if (!root) return { sections: [], fields: [] };
    var fields = [];
    var sections = [];
    var seen = {};

    root.querySelectorAll("section").forEach(function (sec) {
      var heading = sec.querySelector("h1, h2, h3");
      sections.push({
        key: selectorFor(sec, doc),
        label: (heading ? textOf(heading) : sec.id || "Section").slice(0, 90),
        id: sec.id || "",
        fields: 0
      });
    });

    var candidates = root.querySelectorAll("h1, h2, h3, h4, p, a.btn, button.btn, .card-list > li, .faq-q, .chip, .eyebrow");
    candidates.forEach(function (el) {
      if (inSkipZone(el) || hasBlockingChildren(el)) return;
      var text = textOf(el);
      if (text.length < 4) return;
      var key = selectorFor(el, doc);
      if (!key || seen[key]) return;
      var tag = el.tagName.toLowerCase();
      var kind = /^h[1-4]$/.test(tag) ? "heading"
        : (tag === "a" || tag === "button") ? "button"
          : tag === "li" ? "card"
            : "text";
      if (el.classList.contains("lead")) kind = "lead";
      if (el.classList.contains("eyebrow") || el.classList.contains("brand-chip")) kind = "label";
      var section = sectionFor(el, doc);
      seen[key] = true;
      fields.push({
        key: key,
        sectionKey: section.key,
        sectionLabel: section.label,
        sectionId: section.id,
        kind: kind,
        tag: tag,
        text: text,
        href: tag === "a" ? (el.getAttribute("href") || "") : ""
      });
      sections.forEach(function (s) { if (s.key === section.key) s.fields += 1; });
    });

    return { sections: sections, fields: fields };
  }

  function pageName(doc) {
    var loc = (doc && doc.location) || window.location;
    var file = (loc.pathname || "").split("/").pop() || "index.html";
    if (!/\.html?$/.test(file)) file = "index.html";
    return file;
  }

  /* Apply saved overrides to a document (called by site-content.js). */
  function apply(doc, page) {
    var name = page || pageName(doc);
    var fields = data.content[name] || {};
    var hidden = data.sections[name] || {};
    var applied = 0;

    Object.keys(fields).forEach(function (sel) {
      var el;
      try { el = doc.querySelector(sel); } catch (e) { el = null; }
      if (!el) return;
      var saved = fields[sel] || {};
      if (typeof saved.v === "string" && saved.v.trim() !== "") {
        el.textContent = saved.v;
        applied += 1;
      }
      if (saved.h && el.tagName === "A") el.setAttribute("href", saved.h);
      if (saved.s && el.tagName === "IMG") el.setAttribute("src", saved.s);
      if (saved.alt && el.tagName === "IMG") el.setAttribute("alt", saved.alt);
    });

    Object.keys(hidden).forEach(function (sel) {
      if (!hidden[sel] || !hidden[sel].hidden) return;
      var el;
      try { el = doc.querySelector(sel); } catch (e) { el = null; }
      if (el) { el.style.display = "none"; applied += 1; }
    });

    return applied;
  }

  function setField(page, key, value) {
    data.content[page] = data.content[page] || {};
    var current = data.content[page][key] || {};
    Object.keys(value || {}).forEach(function (k) {
      if (value[k] === "" || value[k] === null || value[k] === undefined) delete current[k];
      else current[k] = value[k];
    });
    if (!Object.keys(current).length) delete data.content[page][key];
    else data.content[page][key] = current;
    write(["content"]);
  }

  function clearField(page, key) {
    if (data.content[page]) {
      delete data.content[page][key];
      if (!Object.keys(data.content[page]).length) delete data.content[page];
      write(["content"]);
    }
  }

  function clearPage(page) {
    delete data.content[page];
    delete data.sections[page];
    write(["content", "sections"]);
  }

  function setSection(page, key, isHidden) {
    data.sections[page] = data.sections[page] || {};
    if (isHidden) data.sections[page][key] = { hidden: true };
    else delete data.sections[page][key];
    if (!Object.keys(data.sections[page]).length) delete data.sections[page];
    write(["sections"]);
  }

  function editCount(page) {
    var c = data.content[page] ? Object.keys(data.content[page]).length : 0;
    var s = data.sections[page] ? Object.keys(data.sections[page]).length : 0;
    return c + s;
  }

  function product(name) {
    var q = String(name || "").toLowerCase().trim();
    return data.products.filter(function (p) {
      return String(p.name).toLowerCase() === q || String(p.id).toLowerCase() === q;
    })[0] || null;
  }

  function subscribe(fn) {
    listeners.push(fn);
  }

  /* ------------------------------------------------------------------
     CLOUD (Supabase) — the same four documents, kept in site_docs.
     Reads happen once at boot; every local write is pushed in the
     background so the website and the console share one source of truth.
     ------------------------------------------------------------------ */
  var CLOUD = window.JCOB_CLOUD;
  var remote = {
    enabled: !!(CLOUD && CLOUD.enabled),
    state: CLOUD && CLOUD.enabled ? "connecting" : "local",
    at: null,
    error: null
  };

  function cloudOn() { return !!(CLOUD && CLOUD.enabled); }

  function isStaff() {
    return !!(CLOUD && CLOUD.auth && CLOUD.auth.isStaff && CLOUD.auth.isStaff());
  }

  function payloadFor(kind) {
    if (kind === "settings") return data.settings;
    if (kind === "products") return data.products;
    if (kind === "content") return data.content;
    return data.sections;
  }

  function push(scope) {
    if (!cloudOn()) return Promise.resolve(null);
    /* Public visitors read these documents but never write them. */
    if (!CLOUD.auth || !CLOUD.auth.isSignedIn()) {
      remote.state = "synced";
      return Promise.resolve(null);
    }
    var kinds = (scope || []).filter(function (k, i, a) { return a.indexOf(k) === i; });
    if (!kinds.length) return Promise.resolve(null);
    remote.state = "saving";
    return Promise.all(kinds.map(function (kind) {
      return CLOUD.docs.put("site", kind, payloadFor(kind));
    })).then(function (rows) {
      remote.state = "synced";
      remote.at = new Date().toISOString();
      remote.error = null;
      return rows;
    }).catch(function (err) {
      remote.state = "error";
      remote.error = String((err && err.message) || err);
      return null;
    });
  }

  function mergeSettings(saved) {
    var base = clone(SETTINGS);
    var out = Object.assign(base, saved || {});
    out.social = Object.assign(clone(SETTINGS).social, (saved || {}).social || {});
    out.calc = Object.assign(clone(SETTINGS).calc, (saved || {}).calc || {});
    out.policy = Object.assign(clone(SETTINGS).policy, (saved || {}).policy || {});
    return out;
  }

  /* Pull the published documents and apply them over the local cache. */
  function hydrate() {
    if (!cloudOn()) return Promise.resolve(false);
    return Promise.all([
      CLOUD.docs.get("site", "settings"),
      CLOUD.docs.get("site", "products"),
      CLOUD.docs.get("site", "content"),
      CLOUD.docs.get("site", "sections")
    ]).then(function (rows) {
      var remoteSettings = rows[0];
      var remoteProducts = rows[1];
      var remoteContent = rows[2];
      var remoteSections = rows[3];
      var changed = false;
      var seed = [];

      if (remoteSettings && remoteSettings.data) {
        data.settings = mergeSettings(remoteSettings.data);
        changed = true;
      } else if (isStaff()) seed.push("settings");

      if (remoteProducts && Array.isArray(remoteProducts.data) && remoteProducts.data.length) {
        data.products = remoteProducts.data;
        changed = true;
      } else if (isStaff()) seed.push("products");

      if (remoteContent && remoteContent.data && typeof remoteContent.data === "object") {
        data.content = remoteContent.data;
        changed = true;
      } else if (isStaff()) seed.push("content");

      if (remoteSections && remoteSections.data && typeof remoteSections.data === "object") {
        data.sections = remoteSections.data;
        changed = true;
      } else if (isStaff()) seed.push("sections");

      if (changed) {
        data.updated = new Date().toISOString();
        notify();
        try { document.dispatchEvent(new CustomEvent("jcob:site-updated", { detail: data })); } catch (e) {}
      }

      remote.state = "synced";
      remote.at = new Date().toISOString();
      remote.error = null;
      /* Publish this browser's edits only when an administrator is signed in. */
      if (seed.length && CLOUD.auth && CLOUD.auth.isStaff()) push(seed);
      return changed;
    }).catch(function (err) {
      remote.state = "offline";
      remote.error = String((err && err.message) || err);
      return false;
    });
  }

  var ready = hydrate();

  window.JCOB_SITE = {
    KEY: KEY,
    VERSION: VERSION,
    DEFAULTS: clone(DEFAULTS),
    get: function () { return data; },
    get settings() { return data.settings; },
    get products() { return data.products; },
    save: write,
    reset: reset,
    pageName: pageName,
    collect: collect,
    selectorFor: selectorFor,
    apply: apply,
    setField: setField,
    clearField: clearField,
    clearPage: clearPage,
    setSection: setSection,
    editCount: editCount,
    product: product,
    subscribe: subscribe,
    hydrate: hydrate,
    ready: ready,
    remote: remote,
    push: push
  };
})();
