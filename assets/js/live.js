/* =====================================================================
   LIVE BLOG & NOTIFICATIONS — administrator-managed announcement feed
   Types      : announcement · card · image · blog
   Motions    : slide · flap · swipe · rotate · spin · swap · endless
   Storage    : localStorage today, Supabase later (see loadRemote below).
   ===================================================================== */
(function () {
  "use strict";

  var KEY = "jcob_live_posts_v1";
  var DISMISS_KEY = "jcob_live_dismissed";

  var DEFAULTS = [
    {
      id: "lv-101",
      type: "announcement",
      title: "October intake is open",
      body: "Free 30-minute discovery calls are available from 28 October, in Lilongwe and by phone. Four slots remain this month.",
      link: "contact.html",
      linkLabel: "Book a slot",
      image: "",
      animation: "slide",
      pinned: true,
      published: true,
      date: "2026-10-20T08:30:00"
    },
    {
      id: "lv-102",
      type: "card",
      title: "New: flat vs reducing calculator",
      body: "Compare both interest methods, see a dated monthly schedule and download the repayment plan as a CSV file.",
      link: "calculator.html",
      linkLabel: "Open calculator",
      image: "",
      animation: "flap",
      pinned: false,
      published: true,
      date: "2026-10-18T13:00:00"
    },
    {
      id: "lv-103",
      type: "image",
      title: "Outreach clinic: Kasungu",
      body: "First Tuesday of every month at the community hall. Appointments only — bring three months of bank or mobile-money statements.",
      link: "contact.html",
      linkLabel: "Request an appointment",
      image: "assets/img/insight-business.jpg",
      animation: "swipe",
      pinned: false,
      published: true,
      date: "2026-10-12T09:15:00"
    },
    {
      id: "lv-104",
      type: "announcement",
      title: "Policy renewal reminder",
      body: "Customers with cover renewing in November have been contacted. Check your documents in the customer dashboard.",
      link: "login.html?next=dashboard.html",
      linkLabel: "Open dashboard",
      image: "",
      animation: "rotate",
      pinned: false,
      published: true,
      date: "2026-10-04T16:45:00"
    },
    {
      id: "lv-105",
      type: "blog",
      title: "How we price a loan in Malawi",
      body: "Every quote is built from four parts: the principal, the annual rate, the processing fee and the term. We publish all four before you sign, and the calculator on this site uses the same arithmetic as our credit team. Reducing balance means interest is charged on the balance that is still outstanding, so it falls as you repay; flat rate charges interest on the original amount for the whole term.",
      link: "interest-rates-fees.html",
      linkLabel: "Read the rate guide",
      image: "assets/img/insight-budget.jpg",
      animation: "swap",
      pinned: false,
      published: true,
      date: "2026-10-01T10:00:00"
    },
    {
      id: "lv-106",
      type: "card",
      title: "Agricultural season loans — planting to harvest",
      body: "Repayments aligned to harvest cash-flow, with a grace period on principal until the first sale. Applications close 30 November.",
      link: "loan-products.html#agricultural",
      linkLabel: "See the product",
      image: "",
      animation: "endless",
      pinned: true,
      published: true,
      date: "2026-09-28T07:45:00"
    },
    {
      id: "lv-107",
      type: "image",
      title: "New branch desk in Blantyre",
      body: "Walk-in support is now available at the Limbe office, Monday to Friday 08:00–17:00. No appointment needed for document drop-off.",
      link: "contact.html",
      linkLabel: "Find us",
      image: "assets/img/hero-consultation.jpg",
      animation: "spin",
      pinned: false,
      published: true,
      date: "2026-09-22T11:20:00"
    },
    {
      id: "lv-108",
      type: "announcement",
      title: "Security notice: we never ask for your PIN",
      body: "Staff will never request your mobile-money PIN, password or one-time code. Report anything suspicious to security@jaycobfinancial.mw immediately.",
      link: "privacy.html",
      linkLabel: "How we protect you",
      image: "",
      animation: "endless",
      pinned: false,
      published: true,
      date: "2026-09-15T09:05:00"
    },
    {
      id: "lv-109",
      type: "blog",
      title: "Five questions to ask before you borrow",
      body: "What is the total cost of credit? What happens if a payment is late? Can the term be shortened without a penalty? Is the rate fixed? And what does the schedule look like month by month? If a lender cannot answer all five in writing, keep walking.",
      link: "responsible-lending.html",
      linkLabel: "Responsible lending",
      image: "assets/img/about-team.jpg",
      animation: "slide",
      pinned: false,
      published: true,
      date: "2026-09-08T14:30:00"
    },
    {
      id: "lv-110",
      type: "card",
      title: "Pay by Airtel Money or TNM Mpamba",
      body: "Repay from your phone in under a minute. Enter your loan reference, confirm the amount and keep the receipt in your dashboard.",
      link: "support.html",
      linkLabel: "How to pay",
      image: "",
      animation: "swap",
      pinned: false,
      published: true,
      date: "2026-09-01T08:00:00"
    }
  ];

  /* ---------------- Data layer ---------------- */
  function read() {
    try {
      var raw = window.localStorage.getItem(KEY);
      if (!raw) return DEFAULTS.slice();
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || !parsed.length) return DEFAULTS.slice();
      return parsed;
    } catch (e) {
      return DEFAULTS.slice();
    }
  }

  function write(posts) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(posts));
      return true;
    } catch (e) {
      return false;
    }
  }

  function published(posts) {
    return posts
      .filter(function (p) { return p.published !== false; })
      .sort(function (a, b) {
        if (!!b.pinned !== !!a.pinned) return b.pinned ? 1 : -1;
        return new Date(b.date) - new Date(a.date);
      });
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function safeHref(value) {
    var url = String(value || "").trim();
    if (!url) return "";
    if (/^(javascript|data|vbscript):/i.test(url)) return "";
    return escapeHtml(url);
  }

  function formatDate(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return "";
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) +
      " · " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  }

  var ANIMATIONS = ["slide", "flap", "swipe", "rotate", "spin", "swap", "endless"];
  var ANIMATION_LABELS = {
    slide: "Slide in",
    flap: "Flap (flip board)",
    swipe: "Swipe across",
    rotate: "Rotate in",
    spin: "Spin in",
    swap: "Swap (3D card turn)",
    endless: "Endless float (loops forever)"
  };
  var TYPE_LABELS = { announcement: "Announcement", card: "Card", image: "Photo update", blog: "Live blog" };

  window.JCOB_LIVE = {
    KEY: KEY,
    DEFAULTS: DEFAULTS,
    getPosts: read,
    savePosts: write,
    published: published,
    escapeHtml: escapeHtml,
    animations: ANIMATIONS,
    animationLabels: ANIMATION_LABELS,
    typeLabels: TYPE_LABELS
  };

  /* ---------------- Rendering ---------------- */
  var LOGO = '<img class="live-logo" src="assets/img/logo-full-light.svg" alt="JAY C O B FINANCIAL SERVICES" width="268" height="64" loading="lazy">';
  var MARK = '<img class="live-mark" src="assets/img/logo-mark.svg" alt="" width="18" height="18">';

  function linkMarkup(post, cls) {
    var href = safeHref(post.link);
    if (!href) return "";
    return '<a class="' + (cls || "btn btn--gold btn--sm live-link") + '" href="' + href + '">' +
      escapeHtml(post.linkLabel || "Read more") + "</a>";
  }

  function slideMarkup(post) {
    var anim = ANIMATIONS.indexOf(post.animation) >= 0 ? post.animation : "slide";
    var type = post.type || "announcement";
    var link = linkMarkup(post);

    var inner;
    if (type === "image" && post.image) {
      inner =
        '<div class="live-image" style="background-image:url(&quot;' + escapeHtml(post.image) + '&quot;)">' +
        '<div class="live-image-overlay">' +
        '<span class="live-tag">Photo update</span>' +
        "<h3>" + escapeHtml(post.title) + "</h3>" +
        "<p>" + escapeHtml(post.body) + "</p>" +
        link +
        "</div></div>";
    } else if (type === "blog") {
      inner =
        '<div class="live-card live-blog-slide">' +
        '<span class="live-tag">Live blog</span>' +
        "<h3>" + escapeHtml(post.title) + "</h3>" +
        "<p>" + escapeHtml(post.body) + "</p>" +
        link +
        "</div>";
    } else if (type === "card") {
      inner =
        '<div class="live-card">' +
        '<span class="live-tag">' + (post.pinned ? "Pinned" : "Latest") + "</span>" +
        "<h3>" + escapeHtml(post.title) + "</h3>" +
        "<p>" + escapeHtml(post.body) + "</p>" +
        link +
        "</div>";
    } else {
      inner =
        '<div class="live-announcement">' +
        '<span class="live-badge">' + MARK + "Announcement</span>" +
        "<h3>" + escapeHtml(post.title) + "</h3>" +
        "<p>" + escapeHtml(post.body) + "</p>" +
        link +
        "</div>";
    }

    return (
      '<article class="live-slide anim-' + anim + '" data-anim="' + anim + '">' +
      inner +
      '<div class="live-meta">' + MARK +
      "<span>JAY C O B FINANCIAL SERVICES</span><span class=\"live-dot-sep\"></span>" +
      '<span class="live-chip">' + escapeHtml(ANIMATION_LABELS[anim] || anim) + "</span>" +
      "<time datetime=\"" + escapeHtml(post.date) + "\">" + formatDate(post.date) + "</time>" +
      "</div></article>"
    );
  }

  function tickerMarkup(posts) {
    var items = posts.map(function (p) {
      var href = safeHref(p.link);
      var label = '<b>' + escapeHtml((TYPE_LABELS[p.type] || "Update").toUpperCase()) + "</b> ";
      return href
        ? '<a href="' + href + '">' + label + escapeHtml(p.title) + "</a>"
        : "<span>" + label + escapeHtml(p.title) + "</span>";
    }).join('<span class="live-dot-sep" aria-hidden="true"></span>');
    /* duplicated so the loop is seamless */
    return '<div class="live-ticker" aria-label="Latest announcements ticker">' +
      '<span class="live-ticker-label"><i aria-hidden="true"></i>Live</span>' +
      '<div class="live-ticker-mask"><div class="live-ticker-track" aria-hidden="false">' + items +
      '<span class="live-dot-sep" aria-hidden="true"></span>' + items + "</div></div></div>";
  }

  function initFeed(root) {
    var limit = parseInt(root.getAttribute("data-limit") || "0", 10);
    var all = published(read());
    var posts = limit > 0 ? all.slice(0, limit) : all;
    if (!posts.length) {
      root.innerHTML = '<p class="live-empty">No live updates yet.</p>';
      return;
    }

    root.classList.add("live-widget");
    root.innerHTML =
      '<div class="live-head">' +
      '<div class="live-brand">' + LOGO + "</div>" +
      '<div class="live-status"><span class="live-pulse" aria-hidden="true"></span><span>Live updates</span></div>' +
      '<div class="live-controls">' +
      '<button type="button" class="live-btn" data-live-prev aria-label="Previous update">‹</button>' +
      '<button type="button" class="live-btn live-btn--play" data-live-play aria-label="Pause live updates" aria-pressed="false">❚❚</button>' +
      '<button type="button" class="live-btn" data-live-next aria-label="Next update">›</button>' +
      "</div></div>" +
      tickerMarkup(all) +
      '<div class="live-stage" aria-live="polite"></div>' +
      '<div class="live-foot"><div class="live-dots"></div>' +
      '<a class="live-all" href="live.html">All updates →</a></div>';

    var stage = root.querySelector(".live-stage");
    var dotsWrap = root.querySelector(".live-dots");
    var playBtn = root.querySelector("[data-live-play]");
    var index = 0;
    var timer = null;
    var playing = true;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    dotsWrap.innerHTML = posts
      .map(function (p, i) {
        return '<button type="button" class="live-dot" data-goto="' + i + '" aria-label="Show update ' + (i + 1) + ": " + escapeHtml(p.title) + '"></button>';
      })
      .join("");

    function show(i) {
      index = (i + posts.length) % posts.length;
      stage.innerHTML = slideMarkup(posts[index]);
      dotsWrap.querySelectorAll(".live-dot").forEach(function (dot, di) {
        dot.classList.toggle("is-active", di === index);
        dot.setAttribute("aria-current", di === index ? "true" : "false");
      });
    }

    function next() { show(index + 1); }
    function prev() { show(index - 1); }

    function stop() {
      if (timer) clearInterval(timer);
      timer = null;
    }

    function start() {
      stop();
      if (reduce || !playing || posts.length < 2) return;
      timer = setInterval(next, 6500);
    }

    function setPlaying(value) {
      playing = value;
      playBtn.setAttribute("aria-pressed", String(!value));
      playBtn.setAttribute("aria-label", value ? "Pause live updates" : "Play live updates");
      playBtn.textContent = value ? "❚❚" : "▶";
      if (value) start(); else stop();
    }

    root.querySelector("[data-live-next]").addEventListener("click", function () { next(); start(); });
    root.querySelector("[data-live-prev]").addEventListener("click", function () { prev(); start(); });
    playBtn.addEventListener("click", function () { setPlaying(!playing); });
    dotsWrap.addEventListener("click", function (e) {
      var dot = e.target.closest("[data-goto]");
      if (!dot) return;
      show(parseInt(dot.getAttribute("data-goto"), 10));
      start();
    });
    root.addEventListener("mouseenter", stop);
    root.addEventListener("mouseleave", start);
    root.addEventListener("focusin", stop);
    root.addEventListener("focusout", start);

    show(0);
    start();
  }

  /* Full blog stream — image, text and card posts, each with its own motion */
  function renderStream(root) {
    var posts = published(read());
    var limit = parseInt(root.getAttribute("data-limit") || "0", 10);
    if (limit > 0) posts = posts.slice(0, limit);
    if (!posts.length) {
      root.innerHTML = '<p class="text-small text-muted">No updates published yet.</p>';
      return;
    }
    root.classList.add("live-stream");
    root.innerHTML = posts.map(function (post, i) {
      var type = post.type || "announcement";
      var anim = ANIMATIONS.indexOf(post.animation) >= 0 ? post.animation : "slide";
      var media = post.image
        ? '<div class="live-blog-media" style="background-image:url(&quot;' + escapeHtml(post.image) + '&quot;)" role="img" aria-label="' + escapeHtml(post.title) + '"></div>'
        : '<div class="live-blog-media live-blog-media--none">' + escapeHtml(TYPE_LABELS[type] || "Update") + "</div>";
      var href = safeHref(post.link);
      return '<article class="live-blog anim-' + anim + '" data-anim="' + anim + '" data-post="' + escapeHtml(post.id) + '">' +
        media +
        '<div class="live-blog-body">' +
        '<span class="live-chip' + (i === 0 ? " live-chip--live" : "") + '">' + escapeHtml(TYPE_LABELS[type] || "Update") + "</span> " +
        '<span class="live-chip">' + escapeHtml(ANIMATION_LABELS[anim] || anim) + "</span>" +
        "<h3>" + escapeHtml(post.title) + "</h3>" +
        "<p>" + escapeHtml(post.body) + "</p>" +
        '<div class="live-blog-meta">' + MARK +
        "<time datetime=\"" + escapeHtml(post.date) + "\">" + formatDate(post.date) + "</time>" +
        (href ? '<a class="link-arrow" href="' + href + '">' + escapeHtml(post.linkLabel || "Read more") + "</a>" : "") +
        "</div></div></article>";
    }).join("");
  }

  /* Backwards-compatible archive renderer */
  function renderArchive(root) { renderStream(root); }

  function initFeeds() {
    document.querySelectorAll("[data-live-feed]").forEach(function (root) { initFeed(root); });
    document.querySelectorAll("[data-live-stream], [data-live-archive]").forEach(function (root) { renderStream(root); });
  }

  window.JCOB_LIVE.initFeeds = initFeeds;
  window.JCOB_LIVE.renderStream = renderStream;
  window.JCOB_LIVE.renderArchive = renderArchive;

  initFeeds();

  /* ---------------- Supabase-ready loader ---------------- */
  function remoteEnabled() {
    var cfg = window.JCOB_CONFIG || {};
    return !!(cfg.supabaseUrl && cfg.supabaseAnonKey && cfg.useSupabase);
  }

  function loadRemote() {
    if (!remoteEnabled()) return;
    var cfg = window.JCOB_CONFIG;
    var url = cfg.supabaseUrl.replace(/\/$/, "") + "/rest/v1/" +
      (cfg.liveTable || "live_posts") +
      "?select=*&published=eq.true&order=pinned.desc,date.desc";
    fetch(url, {
      headers: {
        apikey: cfg.supabaseAnonKey,
        Authorization: "Bearer " + cfg.supabaseAnonKey
      }
    })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (rows) {
        if (!Array.isArray(rows) || !rows.length) return;
        var posts = rows.map(function (r) {
          return {
            id: String(r.id),
            type: r.type || "announcement",
            title: r.title || "",
            body: r.body || "",
            link: r.link || "",
            linkLabel: r.link_label || r.linkLabel || "Read more",
            image: r.image || "",
            animation: r.animation || "slide",
            pinned: !!r.pinned,
            published: r.published !== false,
            date: r.date || r.created_at || new Date().toISOString()
          };
        });
        write(posts);
        initFeeds();
      })
      .catch(function () { /* stay on local data */ });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadRemote);
  } else {
    loadRemote();
  }

  /* ---------------- Toast notification ---------------- */
  function showToast(post) {
    if (!post) return;
    var anim = ANIMATIONS.indexOf(post.animation) >= 0 ? post.animation : "slide";
    var wrap = document.createElement("div");
    wrap.className = "live-toast anim-" + anim;
    wrap.setAttribute("role", "status");
    wrap.innerHTML =
      '<div class="live-toast-head">' + MARK + "<span>Live · JAY C O B</span>" +
      '<button type="button" class="live-toast-close" aria-label="Dismiss notification">×</button></div>' +
      "<h4>" + escapeHtml(post.title) + "</h4>" +
      "<p>" + escapeHtml(post.body) + "</p>" +
      '<a class="link-arrow" href="' + (safeHref(post.link) || "live.html") + '">' +
      escapeHtml(post.linkLabel || "View update") + "</a>";

    document.body.appendChild(wrap);
    requestAnimationFrame(function () { wrap.classList.add("is-in"); });

    var closed = false;
    function close() {
      if (closed) return;
      closed = true;
      wrap.classList.remove("is-in");
      try { window.localStorage.setItem(DISMISS_KEY, post.id); } catch (e) {}
      setTimeout(function () { wrap.remove(); }, 350);
    }
    wrap.querySelector(".live-toast-close").addEventListener("click", close);
    setTimeout(close, 14000);
  }

  window.JCOB_LIVE.showToast = showToast;

  var isDashboard = document.body && (document.body.classList.contains("app-body") || document.body.classList.contains("no-live-toast"));
  if (document.body && !isDashboard) {
    var latest = published(read())[0];
    var dismissed = null;
    try { dismissed = window.localStorage.getItem(DISMISS_KEY); } catch (e) {}
    if (latest && latest.id !== dismissed) {
      setTimeout(function () { showToast(latest); }, 2200);
    }
  }
})();
