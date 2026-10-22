/* =====================================================================
   JAY C O B FINANCIAL SERVICES — admin ↔ website connector
   ---------------------------------------------------------------------
   Loaded AFTER the console's main script. It extends the existing portal
   without touching its behaviour:

     • adds a WEBSITE navigation group
     • Website Pages  — scans the live pages and edits any heading,
                        paragraph, card line or button, and hides sections
     • Live Feed      — publishes the animated feed used across the site
     • Site Catalogue — the eleven lending products the website quotes
     • Website Settings — brand, contact, hours, socials, calculator
                          defaults and lending policy numbers

     • bridges website submissions into the console:
         applications (apply.html) → Loan Applications
         tickets (support.html)    → Customer Support
       and writes decisions back so the customer dashboard updates.
   ===================================================================== */
(function () {
  "use strict";

  var S = window.JCOB_SITE;
  var L = window.JCOB_LIVE;
  if (!S) return;
  if (typeof NAV === "undefined" || typeof VIEWS === "undefined") return;

  var SITE_KEY = "jcob_app_v1";

  /* ------------------------------------------------------------------
     PAGE INDEX — every public page, grouped the way the site is built.
     ------------------------------------------------------------------ */
  var PAGES = [
    { group: "Core pages", items: [
      ["index.html", "Home"],
      ["about.html", "About"],
      ["loan-products.html", "Loan products"],
      ["apply.html", "Loan application"],
      ["calculator.html", "Loan calculator"],
      ["eligibility.html", "Eligibility check"],
      ["how-it-works.html", "How it works"],
      ["interest-rates-fees.html", "Interest rates & fees"],
      ["support.html", "Support"],
      ["contact.html", "Contact"],
      ["live.html", "Live desk"],
      ["services.html", "Services"],
      ["insights.html", "Insights"]
    ]},
    { group: "Customer account", items: [
      ["login.html", "Login"],
      ["register.html", "Register"],
      ["verify.html", "Verify account"],
      ["forgot-password.html", "Forgot password"],
      ["reset-password.html", "Reset password"],
      ["dashboard.html", "Customer dashboard"]
    ]},
    { group: "Insight articles", items: [
      ["insight-agri-finance.html", "Agricultural finance"],
      ["insight-sme-credit.html", "SME credit"],
      ["insight-building-budget.html", "Building a budget"]
    ]},
    { group: "Legal & policy", items: [
      ["privacy.html", "Privacy policy"],
      ["terms.html", "Terms of use"],
      ["loan-agreement-terms.html", "Loan agreement terms"],
      ["cookies.html", "Cookies"],
      ["responsible-lending.html", "Responsible lending"],
      ["complaints.html", "Complaints & disputes"],
      ["data-protection.html", "Data protection"],
      ["kyc.html", "KYC & identification"],
      ["aml.html", "Anti-money laundering"],
      ["credit-reporting.html", "Credit reporting"],
      ["fees-disclosure.html", "Fees disclosure"],
      ["customer-rights.html", "Customer rights"],
      ["consent-retention.html", "Consent & retention"],
      ["licensing.html", "Licensing"]
    ]}
  ];

  var PAGE_TITLES = {};
  PAGES.forEach(function (g) { g.items.forEach(function (i) { PAGE_TITLES[i[0]] = i[1]; }); });

  /* ------------------------------------------------------------------
     BRIDGE — website submissions ↔ console records
     ------------------------------------------------------------------ */
  var CLOUD = window.JCOB_CLOUD;
  function cloudOn() { return !!(CLOUD && CLOUD.enabled); }

  function siteData() {
    try { return JSON.parse(window.localStorage.getItem(SITE_KEY) || "null"); } catch (e) { return null; }
  }

  /* In cloud mode every customer document in Supabase is a website record;
     in demo mode there is a single local document. */
  var siteDocs = null;
  var docsAt = 0;
  var loading = false;

  function loadSiteDocs(force) {
    if (!cloudOn()) return Promise.resolve([{ owner: null, data: siteData() }].filter(function (d) { return d.data; }));
    if (loading) return Promise.resolve(siteDocs || []);
    if (!force && siteDocs && Date.now() - docsAt < 8000) return Promise.resolve(siteDocs);
    loading = true;
    return CLOUD.customer.all().then(function (rows) {
      siteDocs = rows
        .filter(function (r) { return r.data && r.data.profile; })
        .map(function (r) { return { owner: r.owner, data: r.data }; });
      docsAt = Date.now();
      loading = false;
      return siteDocs;
    }).catch(function () { loading = false; return siteDocs || []; });
  }

  function allDocs() {
    if (cloudOn()) return siteDocs || [];
    var single = siteData();
    return single ? [{ owner: null, data: single }] : [];
  }

  var STATUS_FROM_SITE = {
    approved: "Approved", rejected: "Rejected", under_review: "Under Review",
    info_required: "Info Required", pending: "Pending", withdrawn: "Withdrawn"
  };
  var STATUS_TO_SITE = {
    Approved: "approved", Rejected: "rejected", "Under Review": "under_review",
    "Info Required": "info_required", Pending: "pending", Disbursed: "approved"
  };

  function customerIdFor(doc, index) {
    if (doc.owner) return "CUS-WEB-" + String(doc.owner).slice(0, 4).toUpperCase();
    return "CUS-WEB" + (index ? index + 1 : "1");
  }

  function importSiteData() {
    var docs = allDocs();
    if (!docs.length) return;
    var changed = false;

    docs.forEach(function (doc, index) {
      var site = doc.data || {};
      var profile = site.profile || {};
      var id = customerIdFor(doc, index);
      var existingCustomer = db.customers.filter(function (c) {
        return (doc.owner && c.siteUid === doc.owner) || (!doc.owner && c.origin === "website" && c.name === profile.fullName);
      })[0];

      if (profile.fullName && !existingCustomer && !db.customers.some(function (c) { return c.name === profile.fullName && c.origin === "website"; })) {
        db.customers.unshift({
          id: id, siteUid: doc.owner || null,
          name: profile.fullName, phone: profile.phone || "—",
          email: profile.email || "—", nid: profile.nid || "NID-PENDING",
          district: profile.district || "Lilongwe", status: "Active",
          kyc: profile.kyc === "Verified" ? "Verified" : "Pending",
          balance: 0, savings: 0, employer: profile.employer || "—",
          occupation: profile.occupation || "—", income: profile.monthlyIncome || 0,
          kin: { name: (profile.nextOfKin || {}).name || "—", phone: (profile.nextOfKin || {}).phone || "—", rel: (profile.nextOfKin || {}).relationship || "—" },
          joined: profile.memberSince || new Date().toISOString(),
          origin: "website"
        });
        changed = true;
      }

      (site.applications || []).forEach(function (a) {
        var existing = db.applications.filter(function (x) { return x.siteRef === a.ref; })[0];
        if (existing) {
          var mapped = STATUS_FROM_SITE[a.status] || existing.status;
          if (existing.status !== mapped) { existing.status = mapped; changed = true; }
          return;
        }
        db.applications.unshift({
          id: a.ref, siteRef: a.ref, siteUid: doc.owner || null,
          cust: profile.fullName || "Website applicant",
          product: a.product, amount: a.amount, term: a.term,
          date: a.submitted || new Date().toISOString(),
          status: STATUS_FROM_SITE[a.status] || "Pending",
          officer: "Unassigned", score: 70, purpose: a.purpose || "—",
          origin: "website"
        });
        changed = true;
      });

      (site.tickets || []).forEach(function (t) {
        if (db.tickets.some(function (x) { return x.siteRef === t.ref; })) return;
        var first = (t.messages || [])[0] || {};
        db.tickets.unshift({
          id: t.ref, siteRef: t.ref, siteUid: doc.owner || null,
          cust: profile.fullName || first.from || "Website visitor",
          subject: t.subject, cat: t.category || "General",
          pri: /complaint|dispute/i.test(t.category || "") ? "High" : "Normal",
          status: t.status === "Resolved" ? "Resolved" : t.status === "Open" ? "Open" : "In Progress",
          agent: "Unassigned", date: t.created || new Date().toISOString(),
          origin: "website", body: first.text || ""
        });
        changed = true;
      });
    });

    if (changed) save();
  }

  function syncBackToSite() {
    var docs = allDocs();
    if (!docs.length) return;
    var dirty = [];

    docs.forEach(function (doc) {
      var site = doc.data || {};
      var touched = false;

      (db.applications || []).forEach(function (a) {
        if (!a.siteRef) return;
        if (doc.owner && a.siteUid && a.siteUid !== doc.owner) return;
        var target = (site.applications || []).filter(function (x) { return x.ref === a.siteRef; })[0];
        if (!target) return;
        var next = STATUS_TO_SITE[a.status];
        if (next && target.status !== next) {
          target.status = next;
          target.reviewer = a.status === "Rejected"
            ? (a.reason || "Declined after affordability and document review.")
            : a.status === "Info Required"
              ? (a.reason || "Additional information required — see your dashboard.")
              : "Approved at " + (a.rate || "the agreed") + (a.term ? " over " + a.term + " months." : ".");
          site.notifications = site.notifications || [];
          site.notifications.unshift({
            id: "N-ADM" + Date.now().toString(36).toUpperCase(),
            type: "Application " + a.status.toLowerCase(),
            title: "Application " + a.siteRef + " — " + a.status,
            body: "Your " + a.product + " application " + a.siteRef + " is now " + a.status.toLowerCase() + ".",
            date: new Date().toISOString(), read: false, channel: "In-app + SMS"
          });
          touched = true;
        }
      });

      (db.tickets || []).forEach(function (t) {
        if (!t.siteRef) return;
        if (doc.owner && t.siteUid && t.siteUid !== doc.owner) return;
        var target = (site.tickets || []).filter(function (x) { return x.ref === t.siteRef; })[0];
        if (!target) return;
        var next = t.status === "Resolved" ? "Resolved" : t.status === "Open" ? "Open" : "In Progress";
        if (target.status !== next) { target.status = next; target.updated = new Date().toISOString(); touched = true; }
      });

      if (touched) dirty.push(doc);
    });

    if (!dirty.length) return;

    if (cloudOn()) {
      dirty.forEach(function (doc) {
        if (!doc.owner) return;
        CLOUD.customer.saveFor(doc.owner, doc.data);
      });
    } else {
      try { window.localStorage.setItem(SITE_KEY, JSON.stringify(dirty[0].data)); } catch (e) {}
    }
  }

  /* Pull customer documents once the console signs in, then bridge them. */
  function refreshCloud() {
    if (!cloudOn()) return Promise.resolve(false);
    return loadSiteDocs(true).then(function (docs) {
      importSiteData();
      if (typeof window.render === "function") window.render(false);
      return docs.length > 0;
    }).catch(function () { return false; });
  }

  /* run the bridge on every console render (decisions land immediately) */
  try {
    var _render = window.render;
    window.render = function (full) {
      try { syncBackToSite(); } catch (e) {}
      return _render(full);
    };
  } catch (e) {}
  setInterval(function () { try { syncBackToSite(); } catch (e) {} }, 2500);
  if (cloudOn()) {
    setTimeout(function () { refreshCloud(); }, 800);
    setInterval(function () { loadSiteDocs().then(function () { importSiteData(); }); }, 30000);
  }

  /* settings mirror */
  try {
    var st = S.settings;
    if (st.brand && db.settings.biz !== st.brand) {
      db.settings.biz = st.brand;
      db.settings.hotline = st.phone;
      db.settings.reg = st.registration;
      db.settings.currency = st.currency;
      save();
    }
  } catch (e) {}

  try { importSiteData(); } catch (e) {}

  /* ------------------------------------------------------------------
     SMALL HELPERS
     ------------------------------------------------------------------ */
  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function pageTitle(file) { return PAGE_TITLES[file] || file; }
  function chip(label, tone) { return '<span class="bdg ' + (tone || "b") + '">' + esc(label) + "</span>"; }

  function pageSelect(current) {
    return PAGES.map(function (g) {
      return '<optgroup label="' + esc(g.group) + '">' + g.items.map(function (i) {
        return '<option value="' + i[0] + '"' + (i[0] === current ? " selected" : "") + ">" + esc(i[1]) + "</option>";
      }).join("") + "</optgroup>";
    }).join("");
  }

  /* ------------------------------------------------------------------
     VIEW — WEBSITE PAGES (content manager)
     ------------------------------------------------------------------ */
  var cmsCache = {};
  var cmsState = { page: "index.html", query: "", loading: false, error: "" };

  function vWebsite() {
    var counts = PAGES.reduce(function (sum, g) { return sum + g.items.length; }, 0);
    var edits = Object.keys(S.get().content || {}).length;
    var html = pageHead(
      "Website Pages & Sections",
      "Every heading, paragraph, card line, button label and section on the public site — edit here and the page updates on the next load.",
      '<a class="btn ghost" href="' + cmsState.page + '" target="_blank" rel="noopener">Open page ↗</a>' +
      '<button class="btn primary" data-act="cmsReload">Rescan page</button>'
    );

    html += '<div class="stats">' +
      miniStat("Pages managed", counts, "Public site · portal · legal", "rgba(56,189,248,.14)") +
      miniStat("Pages with edits", edits, "Live overrides published", "rgba(167,139,250,.14)") +
      miniStat("Catalogue products", S.products.length, "Rates & limits on the site", "rgba(52,211,153,.14)") +
      miniStat("Live feed posts", (L ? L.getPosts().length : 0), "Animated updates", "rgba(251,191,36,.14)") +
      "</div>";

    html += '<div class="panel"><div class="ph"><h3>Choose a page</h3><span class="tsub">' + esc(cmsState.page) + "</span></div><div class=\"pb\">" +
      '<div class="frow" style="align-items:end">' +
      '<div class="fld" style="margin:0"><label>Page</label><select id="cmsPage">' + pageSelect(cmsState.page) + "</select></div>" +
      '<div class="fld" style="margin:0"><label>Filter fields</label><input id="cmsSearch" placeholder="Search text, card, section…" value="' + esc(cmsState.query) + '"></div>' +
      "</div></div></div>";

    html += '<div id="cms-body"><div class="panel"><div class="pb empty">Scanning ' + esc(cmsState.page) + "…</div></div></div>";
    return html;
  }

  function cmsAfter() {
    var sel = document.getElementById("cmsPage");
    if (sel) sel.addEventListener("change", function () {
      cmsState.page = sel.value; cmsState.query = "";
      location.hash = "#/website"; render(false); loadPage(cmsState.page);
    });
    var q = document.getElementById("cmsSearch");
    if (q) q.addEventListener("input", function () { cmsState.query = q.value; paintCms(); });
    loadPage(cmsState.page);
  }

  /* fetch() where available, XMLHttpRequest everywhere else */
  function getText(url) {
    if (typeof window.fetch === "function") {
      return window.fetch(url, { cache: "no-store" }).then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.text();
      });
    }
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", url + "?t=" + Date.now(), true);
      xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.responseText);
        else reject(new Error("HTTP " + xhr.status));
      };
      xhr.onerror = function () { reject(new Error("network error")); };
      xhr.send();
    });
  }

  function loadPage(page) {
    if (cmsCache[page] && !cmsState.loading) { paintCms(); return; }
    cmsState.loading = true;
    cmsState.error = "";
    getText(page)
      .then(function (text) {
        var doc = new DOMParser().parseFromString(text, "text/html");
        cmsCache[page] = S.collect(doc);
        cmsState.loading = false;
        paintCms();
      })
      .catch(function (err) {
        cmsState.loading = false;
        cmsState.error = "Could not read " + page + " (" + err.message + "). Open the portal over http:// or https://, not as a file.";
        paintCms();
      });
  }

  function paintCms() {
    var host = document.getElementById("cms-body");
    if (!host) return;
    if (cmsState.loading) { host.innerHTML = '<div class="panel"><div class="pb empty">Scanning the page…</div></div>'; return; }
    if (cmsState.error) { host.innerHTML = '<div class="panel"><div class="pb"><div class="notice">' + esc(cmsState.error) + "</div></div></div>"; return; }

    var data = cmsCache[cmsState.page] || { sections: [], fields: [] };
    var saved = (S.get().content || {})[cmsState.page] || {};
    var hidden = (S.get().sections || {})[cmsState.page] || {};
    var q = cmsState.query.toLowerCase();
    var fields = data.fields.filter(function (f) {
      if (!q) return true;
      return (f.text + " " + f.sectionLabel + " " + f.kind).toLowerCase().indexOf(q) >= 0;
    });

    if (!fields.length) {
      host.innerHTML = '<div class="panel"><div class="pb empty">No editable text matched. Try another page or clear the filter.</div></div>';
      return;
    }

    var bySection = {};
    fields.forEach(function (f) {
      var k = f.sectionKey || "page";
      bySection[k] = bySection[k] || { label: f.sectionLabel, key: f.sectionKey, fields: [] };
      bySection[k].fields.push(f);
    });

    var rows = Object.keys(bySection).map(function (k) {
      var sec = bySection[k];
      var isHidden = !!(hidden[sec.key] && hidden[sec.key].hidden);
      var body = sec.fields.map(function (f) {
        var override = saved[f.key] || {};
        var value = override.v !== undefined ? override.v : f.text;
        var edited = override.v !== undefined;
        return '<div class="cms-row" data-key="' + esc(f.key) + '" data-kind="' + f.kind + '" style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:end;padding:10px 0;border-top:1px dashed var(--line)">' +
          '<div class="fld" style="margin:0"><label style="display:flex;gap:8px;align-items:center">' +
          '<span class="bdg ' + (f.kind === "heading" ? "b" : f.kind === "button" ? "y" : "g") + '">' + esc(f.kind) + "</span>" +
          '<span class="tsub" style="text-transform:none;letter-spacing:0">' + esc(f.kind === "heading" ? "Heading" : f.tag) + "</span>" +
          (edited ? '<span class="bdg g">edited</span>' : "") + "</label>" +
          (f.text.length > 90
            ? '<textarea data-cms-text rows="3">' + esc(value) + "</textarea>"
            : '<input data-cms-text value="' + esc(value) + '">') +
          (f.href ? '<input data-cms-href value="' + esc(override.h !== undefined ? override.h : f.href) + '" placeholder="link (href)">' : "") +
          "</div>" +
          '<div style="display:flex;gap:6px;padding-bottom:4px">' +
          '<button class="btn sm ok" data-act="cmsSave">Save</button>' +
          '<button class="btn sm ghost" data-act="cmsReset">Reset</button>' +
          "</div></div>";
      }).join("");

      return '<div class="panel"><div class="ph"><h3>' + esc(sec.label || "Page header") +
        (isHidden ? ' <span class="bdg r">hidden on site</span>' : "") +
        '</h3><div style="display:flex;gap:6px">' +
        '<button class="btn sm ' + (isHidden ? "ok" : "ghost") + '" data-act="cmsSection" data-key="' + esc(sec.key) + '" data-hide="' + (isHidden ? "0" : "1") + '">' +
        (isHidden ? "Show section" : "Hide section") + "</button></div></div><div class=\"pb\">" + body + "</div></div>";
    }).join("");

    host.innerHTML = rows +
      '<div class="panel"><div class="pb" style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center">' +
      '<span class="tsub">' + fields.length + " editable blocks on " + esc(cmsState.page) + " · overrides apply to every visitor of this page.</span>" +
      '<button class="btn sm danger" data-act="cmsPageReset">Reset this page</button></div></div>';
  }

  /* ------------------------------------------------------------------
     VIEW — LIVE FEED
     ------------------------------------------------------------------ */
  function vLiveFeed() {
    var posts = L ? L.getPosts() : [];
    var published = posts.filter(function (p) { return p.published !== false; }).length;
    var html = pageHead(
      "Live Feed",
      "The animated updates shown on the home page, the live desk and the section strips. Slides, cards, photo posts and announcements.",
      '<a class="btn ghost" href="live.html" target="_blank" rel="noopener">View live desk ↗</a>' +
      '<button class="btn ghost" data-act="liveAbout">+ About Us cards</button>' +
      '<button class="btn ghost" data-act="liveRestore">Restore demo posts</button>' +
      '<button class="btn primary" data-act="liveNew">+ New update</button>'
    );
    html += '<div class="stats">' +
      miniStat("Total updates", posts.length, "All time", "rgba(56,189,248,.14)") +
      miniStat("Published", published, "Visible to visitors", "rgba(52,211,153,.14)") +
      miniStat("Pinned", posts.filter(function (p) { return p.pinned; }).length, "Held at the top", "rgba(251,191,36,.14)") +
      miniStat("Drafts", posts.length - published, "Not yet live", "rgba(248,113,113,.14)") +
      "</div>";
    html += '<div class="panel flush"><div class="ph"><h3>Feed items</h3><span class="tsub">Newest first</span></div>' +
      '<div class="lst flush">' + (posts.length ? posts.map(function (p) {
        return '<div class="li"><span class="ic" style="background:rgba(56,189,248,.13)">' +
          (p.type === "image" ? "🖼️" : p.type === "blog" ? "📝" : p.type === "card" ? "🗂️" : "📣") + "</span>" +
          '<div><b>' + esc(p.title) + "</b><small>" + esc((L.typeLabels[p.type] || p.type)) +
          (p.topic ? " · " + esc(p.topic) : "") + " · " + (p.published === false ? "Draft" : "Published") +
          (p.pinned ? " · pinned" : "") + "</small></div>" +
          '<div style="margin-left:auto;display:flex;gap:6px;flex-wrap:wrap">' +
          '<button class="btn sm ghost" data-act="liveToggle" data-id="' + esc(p.id) + '">' + (p.published === false ? "Publish" : "Unpublish") + "</button>" +
          '<button class="btn sm ghost" data-act="liveEdit" data-id="' + esc(p.id) + '">Edit</button>' +
          '<button class="btn sm danger" data-act="liveDelete" data-id="' + esc(p.id) + '">Delete</button>' +
          "</div></div>";
      }).join("") : '<div class="pb empty">No updates yet — publish the first one.</div>') + "</div></div>";
    return html;
  }

  function liveFields(p) {
    p = p || { type: "announcement", topic: "", title: "", body: "", link: "", linkLabel: "", image: "", animation: "slide", pinned: false, published: true };
    var types = Object.keys(L.typeLabels).filter(function (t) { return t !== "about"; });
    var topics = [["", "General feed (all pages)"], ["security", "Security & trust"], ["why-us", "Why choose us"], ["stories", "Customer stories"], ["eligibility", "Eligibility"], ["products", "Loan products"]];
    return fld("Type", sel("lvType", types, p.type)) +
      fld("Section", '<select id="lvTopic">' + topics.map(function (t) {
        return '<option value="' + t[0] + '"' + (t[0] === (p.topic || "") ? " selected" : "") + ">" + t[1] + "</option>";
      }).join("") + "</select>", "Choose where this update appears on the site.") +
      fld("Headline", inp("lvTitle", p.title)) +
      fld("Body", '<textarea id="lvBody" rows="4">' + esc(p.body) + "</textarea>") +
      '<div class="frow">' + fld("Link (optional)", inp("lvLink", p.link)) + fld("Link label", inp("lvLinkLabel", p.linkLabel || "Read more")) + "</div>" +
      fld("Image URL (optional)", inp("lvImage", p.image || ""), "Leave blank for a text card. Use a path such as assets/img/hero-consultation.jpg or an https:// URL.") +
      fld("…or upload a photo", '<input type="file" id="lvFile" accept="image/*"><div id="lvPreview" style="margin-top:8px"></div>') +
      fld("Animation", '<select id="lvAnim">' + L.animations.map(function (a) {
        return '<option value="' + a + '"' + (a === p.animation ? " selected" : "") + ">" + L.animationLabels[a] + "</option>";
      }).join("") + "</select>") +
      '<div class="frow"><label class="check-row" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="lvPinned"' + (p.pinned ? " checked" : "") + '><span>Pin to the top</span></label>' +
      '<label class="check-row" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="lvPublished"' + (p.published !== false ? " checked" : "") + '><span>Published</span></label></div>';
  }

  function openLive(id) {
    var posts = L.getPosts();
    var post = id ? posts.filter(function (p) { return p.id === id; })[0] : null;
    openModal({
      title: post ? "Edit live update" : "Publish a live update",
      size: "lg",
      body: liveFields(post),
      foot: '<button class="btn ghost" data-mclose>Cancel</button><button class="btn primary" data-mact="liveSave">' + (post ? "Save changes" : "Publish update") + "</button>"
    });
    setTimeout(function () {
      var fileEl = document.getElementById("lvFile");
      if (!fileEl) return;
      fileEl.addEventListener("change", function () {
        var file = fileEl.files && fileEl.files[0];
        if (!file) return;
        if (!/^image\//.test(file.type)) return toast("err", "Not an image", "Choose a JPG, PNG or WebP file.");
        var reader = new FileReader();
        reader.onload = function () {
          var src = String(reader.result || "");
          var img = new Image();
          img.onload = function () {
            var canvas = null;
            try {
              var max = 1200;
              var scale = Math.min(1, max / Math.max(img.width, img.height));
              canvas = document.createElement("canvas");
              canvas.width = Math.round(img.width * scale);
              canvas.height = Math.round(img.height * scale);
              var ctx = canvas.getContext && canvas.getContext("2d");
              if (ctx) { ctx.drawImage(img, 0, 0, canvas.width, canvas.height); src = canvas.toDataURL("image/jpeg", 0.82); }
              else canvas = null;
            } catch (e) { canvas = null; }

            function apply(value) {
              var field = document.getElementById("lvImage");
              if (field) field.value = value;
              var prev = document.getElementById("lvPreview");
              if (prev) prev.innerHTML = '<img src="' + value + '" alt="Preview" style="max-height:120px;border-radius:10px;border:1px solid var(--line2)">';
            }

            /* Cloud mode stores the photo in Supabase Storage, so pages stay
               small and the image is shared with every visitor. */
            var bucket = (window.JCOB_CONFIG && window.JCOB_CONFIG.buckets && window.JCOB_CONFIG.buckets.media) || "site-media";
            if (cloudOn() && CLOUD.storage && canvas && canvas.toBlob) {
              apply(src);
              canvas.toBlob(function (blob) {
                if (!blob) return;
                var path = "live/" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6) + ".jpg";
                CLOUD.storage.upload(bucket, path, blob).then(function (res) {
                  apply(res.publicUrl);
                  toast("ok", "Photo uploaded", "Stored in the site media bucket.");
                }).catch(function () { /* keep the embedded copy */ });
              }, "image/jpeg", 0.82);
              return;
            }
            apply(src);
          };
          img.onerror = function () {
            var field = document.getElementById("lvImage");
            if (field) field.value = src;
          };
          img.src = src;
        };
        reader.readAsDataURL(file);
      });
    }, 60);

    modalActs.liveSave = function () {
      var title = val("lvTitle").trim();
      var body = val("lvBody").trim();
      if (!title || !body) return toast("err", "Missing content", "A headline and body are required.");
      var next = {
        id: post ? post.id : "lv-" + Date.now().toString(36),
        type: val("lvType"), topic: val("lvTopic"), title: title, body: body,
        link: val("lvLink").trim(), linkLabel: val("lvLinkLabel").trim() || "Read more",
        image: val("lvImage").trim(), animation: val("lvAnim"),
        pinned: document.getElementById("lvPinned").checked,
        published: document.getElementById("lvPublished").checked,
        date: post ? post.date : new Date().toISOString()
      };
      var all = post ? posts.map(function (p) { return p.id === post.id ? next : p; }) : [next].concat(posts);
      L.savePosts(all);
      closeModal();
      render(false);
      toast("ok", post ? "Update saved" : "Update published", next.title);
    };
  }

  /* ------------------------------------------------------------------
     VIEW — SITE CATALOGUE (products quoted on the website)
     ------------------------------------------------------------------ */
  function vCatalogue() {
    var products = S.products;
    var html = pageHead(
      "Site Catalogue",
      "The eleven loan products quoted on the website. Rates here are annual (p.a.) and feed the calculator, product pages and rates tables.",
      '<a class="btn ghost" href="loan-products.html" target="_blank" rel="noopener">View products page ↗</a>'
    );
    html += '<div class="panel flush"><div class="ph"><h3>Products on the website</h3><span class="tsub">' + products.length + " products</span></div>" +
      '<div class="tblwrap"><table class="tbl"><thead><tr><th>Product</th><th>Rate</th><th>Amount range</th><th>Term</th><th>Fee</th><th>Status</th><th></th></tr></thead><tbody>' +
      products.map(function (p) {
        return "<tr><td><b>" + esc(p.name) + '</b><div class="tsub">' + esc(p.summary || "") + "</div></td>" +
          '<td><span class="tamt" style="color:var(--teal)">' + p.rate + "% p.a.</span></td>" +
          "<td>" + num(p.min) + " — " + num(p.max) + "</td>" +
          "<td>" + p.minTerm + "–" + p.maxTerm + " mo</td>" +
          "<td>" + p.fee + "%</td>" +
          "<td>" + badge(p.active === false ? "Inactive" : "Active") + "</td>" +
          '<td><button class="btn sm ghost" data-act="catEdit" data-id="' + esc(p.id) + '">Edit</button></td></tr>';
      }).join("") + "</tbody></table></div></div>";
    html += '<div class="panel"><div class="pb"><p class="tsub" style="margin:0">The console\'s own <b>Loan Products</b> module (under LOANS) configures the internal lending book and monthly lending rates. This module is what customers see and what the calculator quotes. Keep the names aligned so applications match the right product.</p></div></div>';
    return html;
  }

  function openCatalogue(id) {
    var p = S.products.filter(function (x) { return x.id === id; })[0];
    if (!p) return;
    openModal({
      title: "Edit — " + p.name,
      size: "lg",
      body: fld("Product name", inp("ctName", p.name)) +
        fld("Summary shown on the site", '<textarea id="ctSummary" rows="2">' + esc(p.summary || "") + "</textarea>") +
        '<div class="frow3">' + fld("Rate % p.a.", inp("ctRate", p.rate, 'type="number" step="0.1"')) +
        fld("Processing fee %", inp("ctFee", p.fee, 'type="number" step="0.1"')) +
        fld("Status", sel("ctActive", ["Active", "Inactive"], p.active === false ? "Inactive" : "Active")) + "</div>" +
        '<div class="frow">' + fld("Minimum (MWK)", inp("ctMin", p.min, 'type="number"')) + fld("Maximum (MWK)", inp("ctMax", p.max, 'type="number"')) + "</div>" +
        '<div class="frow">' + fld("Minimum term (months)", inp("ctMinTerm", p.minTerm, 'type="number"')) + fld("Maximum term (months)", inp("ctMaxTerm", p.maxTerm, 'type="number"')) + "</div>",
      foot: '<button class="btn ghost" data-mclose>Cancel</button><button class="btn primary" data-mact="catSave">Save product</button>'
    });
    modalActs.catSave = function () {
      var min = +val("ctMin"), max = +val("ctMax"), minTerm = +val("ctMinTerm"), maxTerm = +val("ctMaxTerm");
      if (!(min > 0) || !(max > min)) return toast("err", "Check the limits", "The maximum must be greater than the minimum.");
      if (!(minTerm >= 1) || !(maxTerm >= minTerm)) return toast("err", "Check the terms", "The maximum term must be at least the minimum term.");
      Object.assign(p, {
        name: val("ctName").trim() || p.name,
        summary: val("ctSummary").trim(),
        rate: +val("ctRate"), fee: +val("ctFee"),
        min: min, max: max, minTerm: minTerm, maxTerm: maxTerm,
        active: val("ctActive") === "Active"
      });
      S.save();
      closeModal(); render(false);
      toast("ok", "Catalogue updated", p.name + " now quotes " + p.rate + "% p.a.");
    };
  }

  /* ------------------------------------------------------------------
     VIEW — WEBSITE SETTINGS
     ------------------------------------------------------------------ */
  function vSiteSettings() {
    var s = S.settings;
    var c = s.calc;
    return pageHead(
      "Website Settings",
      "Brand, contact details, opening hours, licensing, calculator defaults and lending policy. These values publish straight to every page.",
      '<a class="btn ghost" href="index.html" target="_blank" rel="noopener">Open website ↗</a><button class="btn primary" data-act="siteSettingsSave">Save settings</button>'
    ) +
      '<div class="grid2"><div>' +
      '<div class="panel"><div class="ph"><h3>Business identity</h3></div><div class="pb">' +
      fld("Brand name", inp("ssBrand", s.brand)) +
      '<div class="frow">' + fld("Short name", inp("ssShort", s.shortBrand)) + fld("Tagline", inp("ssTagline", s.tagline)) + "</div>" +
      '<div class="frow">' + fld("Registration number", inp("ssReg", s.registration)) + fld("Currency", sel("ssCurrency", ["MWK", "USD", "ZAR"], s.currency)) + "</div>" +
      fld("Licence", inp("ssLicence", s.licence)) +
      "</div></div>" +
      '<div class="panel"><div class="ph"><h3>Contact & support</h3></div><div class="pb">' +
      '<div class="frow">' + fld("Primary phone", inp("ssPhone", s.phone)) + fld("Second phone", inp("ssPhoneAlt", s.phoneAlt)) + "</div>" +
      '<div class="frow">' + fld("Emergency line", inp("ssEmergency", s.emergency)) + fld("General email", inp("ssEmail", s.email)) + "</div>" +
      fld("Support email", inp("ssSupportEmail", s.supportEmail)) +
      fld("Office address", inp("ssAddress", s.address)) +
      fld("Opening hours", inp("ssHours", s.hours)) +
      "</div></div></div><div>" +
      '<div class="panel"><div class="ph"><h3>Social links</h3></div><div class="pb">' +
      fld("Facebook", inp("ssFb", s.social.facebook)) +
      fld("LinkedIn", inp("ssLi", s.social.linkedin)) +
      fld("WhatsApp", inp("ssWa", s.social.whatsapp)) +
      fld("X / Twitter", inp("ssX", s.social.x)) +
      "</div></div>" +
      '<div class="panel"><div class="ph"><h3>Calculator defaults</h3></div><div class="pb">' +
      fld("Default amount (MWK)", inp("ssCalcAmount", c.amount, 'type="number" step="50000"'), "Rates come from the Site Catalogue so the calculator always quotes the published product rate.") +
      '<div class="frow">' + fld("Rate basis", sel("ssCalcBasis", ["annual", "monthly"], c.rateBasis)) + fld("Calculation basis", sel("ssCalcCalc", ["monthly", "annual"], c.basis)) + "</div>" +
      '<div class="frow">' + fld("Default term", inp("ssCalcTerm", c.term, 'type="number"')) + fld("Interest method", sel("ssCalcMethod", ["reducing", "flat"], c.method)) + "</div>" +
      '<div class="frow">' + fld("Processing fee %", inp("ssCalcFee", c.fee, 'type="number" step="0.1"')) + fld("Admin fee (MWK)", inp("ssCalcAdmin", c.adminFee, 'type="number"')) + "</div>" +
      "</div></div>" +
      '<div class="panel"><div class="ph"><h3>Lending policy published</h3></div><div class="pb">' +
      '<div class="frow3">' + fld("Grace days", inp("ssGrace", s.policy.graceDays, 'type="number"')) +
      fld("Penalty % /mo", inp("ssPenalty", s.policy.penaltyPct, 'type="number" step="0.1"')) +
      fld("Max DTI %", inp("ssDti", s.policy.maxDTI, 'type="number"')) + "</div>" +
      '<div class="frow">' + fld("Minimum age", inp("ssMinAge", s.policy.minAge, 'type="number"')) + fld("Maximum age", inp("ssMaxAge", s.policy.maxAge, 'type="number"')) + "</div>" +
      "</div></div></div></div>";
  }

  function num(v) { return (Math.round(Number(v) || 0)).toLocaleString("en-GB"); }

  /* ------------------------------------------------------------------
     ACTIONS
     ------------------------------------------------------------------ */
  Object.assign(customActs, {
    cmsReload: function () { delete cmsCache[cmsState.page]; loadPage(cmsState.page); },
    cmsSave: function (btn) {
      var row = btn.closest(".cms-row");
      if (!row) return;
      var text = row.querySelector("[data-cms-text]").value;
      var hrefEl = row.querySelector("[data-cms-href]");
      var value = { v: text };
      if (hrefEl) value.h = hrefEl.value.trim();
      S.setField(cmsState.page, row.dataset.key, value);
      toast("ok", "Saved", "The page will show this on the next load.");
      paintCms();
    },
    cmsReset: function (btn) {
      var row = btn.closest(".cms-row");
      if (!row) return;
      S.clearField(cmsState.page, row.dataset.key);
      toast("info", "Reset", "Original text restored for this block.");
      paintCms();
    },
    cmsSection: function (btn) {
      var hide = btn.dataset.hide === "1";
      S.setSection(cmsState.page, btn.dataset.key, hide);
      toast("ok", hide ? "Section hidden" : "Section shown", pageTitle(cmsState.page));
      paintCms();
    },
    cmsPageReset: function () {
      confirmAct("Reset this page", "Remove all edits and restore every section on <b>" + esc(cmsState.page) + "</b>?", "Reset page", function () {
        S.clearPage(cmsState.page);
        paintCms();
        toast("ok", "Page reset", pageTitle(cmsState.page) + " is back to its original content.");
      }, "warn");
    },
    liveNew: function () { openLive(null); },
    liveEdit: function (btn) { openLive(btn.dataset.id); },
    liveToggle: function (btn) {
      var posts = L.getPosts().map(function (p) {
        if (p.id !== btn.dataset.id) return p;
        p.published = p.published === false;
        return p;
      });
      L.savePosts(posts); render(false);
      toast("ok", "Feed updated", "Publish state changed.");
    },
    liveDelete: function (btn) {
      var post = L.getPosts().filter(function (p) { return p.id === btn.dataset.id; })[0];
      if (!post) return;
      confirmAct("Delete update", "Delete <b>" + esc(post.title) + "</b>? This cannot be undone.", "Delete", function () {
        L.savePosts(L.getPosts().filter(function (p) { return p.id !== post.id; }));
        render(false);
        toast("err", "Deleted", post.title);
      }, "danger");
    },
    liveRestore: function () {
      confirmAct("Restore demo posts", "Replace the current feed with the demo set? Anything you published yourself is removed.", "Restore", function () {
        L.savePosts(L.DEFAULTS.slice());
        render(false);
        toast("ok", "Feed restored", "The demo updates are back.");
      }, "warn");
    },
    liveAbout: function () {
      var posts = L.getPosts();
      var have = {};
      posts.forEach(function (p) { have[p.id] = true; });
      var extra = (L.aboutCards || []).concat(L.topicPosts || []).filter(function (p) { return !have[p.id]; });
      if (!extra.length) return toast("info", "Nothing to add", "All About Us and section cards are already in the feed.");
      L.savePosts(posts.concat(extra));
      render(false);
      toast("ok", "Cards added", extra.length + " About Us / section cards added.");
    },
    catEdit: function (btn) { openCatalogue(btn.dataset.id); },
    siteSettingsSave: function () {
      var s = S.settings;
      s.brand = val("ssBrand").trim();
      s.shortBrand = val("ssShort").trim();
      s.tagline = val("ssTagline").trim();
      s.registration = val("ssReg").trim();
      s.currency = val("ssCurrency");
      s.licence = val("ssLicence").trim();
      s.phone = val("ssPhone").trim();
      s.phoneAlt = val("ssPhoneAlt").trim();
      s.emergency = val("ssEmergency").trim();
      s.email = val("ssEmail").trim();
      s.supportEmail = val("ssSupportEmail").trim();
      s.address = val("ssAddress").trim();
      s.hours = val("ssHours").trim();
      s.social.facebook = val("ssFb").trim();
      s.social.linkedin = val("ssLi").trim();
      s.social.whatsapp = val("ssWa").trim();
      s.social.x = val("ssX").trim();
      s.calc.amount = +val("ssCalcAmount") || 0;
      s.calc.rateBasis = val("ssCalcBasis");
      s.calc.basis = val("ssCalcCalc");
      s.calc.term = +val("ssCalcTerm") || 1;
      s.calc.method = val("ssCalcMethod");
      s.calc.fee = +val("ssCalcFee") || 0;
      s.calc.adminFee = +val("ssCalcAdmin") || 0;
      s.policy.graceDays = +val("ssGrace") || 0;
      s.policy.penaltyPct = +val("ssPenalty") || 0;
      s.policy.maxDTI = +val("ssDti") || 0;
      s.policy.minAge = +val("ssMinAge") || 18;
      s.policy.maxAge = +val("ssMaxAge") || 65;
      S.save();
      db.settings.biz = s.brand; db.settings.hotline = s.phone; db.settings.reg = s.registration; db.settings.currency = s.currency;
      save();
      render(false);
      toast("ok", "Website settings saved", "Contact details and calculator defaults published.");
    }
  });

  /* ------------------------------------------------------------------
     REGISTER NAV + VIEWS
     ------------------------------------------------------------------ */
  var existing = {};
  NAV.forEach(function (g) { g.items.forEach(function (i) { existing[i[0]] = true; }); });
  if (!existing.website) {
    NAV.splice(1, 0, {
      g: "WEBSITE",
      items: [
        ["website", "Website Pages", "file"],
        ["liveFeed", "Live Feed", "bell"],
        ["catalogue", "Site Catalogue", "box"],
        ["siteSettings", "Website Settings", "gear"]
      ]
    });
  }

  /* append a website card to the console's own System Settings view */
  if (VIEWS.settings && typeof VIEWS.settings.r === "function") {
    var _vSettings = VIEWS.settings.r;
    VIEWS.settings.r = function () {
      var edits = Object.keys(S.get().content || {}).length;
      var hiddenSections = Object.keys(S.get().sections || {}).reduce(function (n, k) {
        return n + Object.keys(S.get().sections[k] || {}).length;
      }, 0);
      var cloudState = (window.JCOB_PORTAL && window.JCOB_PORTAL.cloud) || { on: false, state: "local" };
      var cloudLabel = cloudState.on
        ? (cloudState.state === "error" ? "Cloud error" : cloudState.state === "saving" ? "Saving to cloud…" : "Supabase connected")
        : "Local demo data";
      var cloudTone = cloudState.on ? (cloudState.state === "error" ? "r" : "g") : "n";
      var panel = '<div class="panel"><div class="ph"><h3>Website connection</h3><span class="bdg ' + cloudTone + '">' + cloudLabel + '</span></div><div class="pb">' +
        '<p class="tsub" style="margin:0 0 12px;line-height:1.7">Brand, contact details, hours, socials, calculator defaults and lending policy are published to the public website from <b>Website Settings</b>. Page text, cards and section visibility live under <b>Website Pages</b>. ' +
        (cloudState.on ? "Everything on this screen is stored in Supabase and shared with every visitor." : "Supabase keys are not configured yet, so edits stay in this browser.") + '</p>' +
        '<div class="calc-res" style="grid-template-columns:repeat(4,1fr);margin-bottom:12px">' +
        '<div class="cr"><span>Pages edited</span><b>' + edits + '</b></div>' +
        '<div class="cr"><span>Sections hidden</span><b>' + hiddenSections + '</b></div>' +
        '<div class="cr"><span>Catalogue products</span><b>' + S.products.length + '</b></div>' +
        '<div class="cr"><span>Live updates</span><b>' + (L ? L.getPosts().length : 0) + '</b></div></div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
        '<button class="btn primary" data-nav="siteSettings">Open Website Settings</button>' +
        '<button class="btn ghost" data-nav="website">Manage pages</button>' +
        '<button class="btn ghost" data-nav="catalogue">Products &amp; rates</button>' +
        '<a class="btn ghost" href="index.html" target="_blank" rel="noopener">View website ↗</a>' +
        '<a class="btn ghost" href="system-check.html" target="_blank" rel="noopener">Connection check ↗</a>' +
        '</div></div></div>';
      return _vSettings() + panel;
    };
  }

  VIEWS.website = { t: "Website Pages", r: vWebsite, after: function () { cmsAfter(); } };
  VIEWS.liveFeed = { t: "Live Feed", r: vLiveFeed };
  VIEWS.catalogue = { t: "Site Catalogue", r: vCatalogue };
  VIEWS.siteSettings = { t: "Website Settings", r: vSiteSettings };

  try {
    buildNav();
    if (["website", "liveFeed", "catalogue", "siteSettings"].indexOf(route) >= 0) render(true);
  } catch (e) {}

  window.JCOB_ADMIN_SITE = {
    importSiteData: importSiteData,
    syncBackToSite: syncBackToSite,
    refreshCloud: refreshCloud,
    loadSiteDocs: loadSiteDocs,
    cloud: cloudOn,
    pages: PAGES,
    state: cmsState,
    loadPage: loadPage
  };
})();
