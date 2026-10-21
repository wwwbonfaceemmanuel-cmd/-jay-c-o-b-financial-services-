/* =====================================================================
   LIVE updates — system-managed announcements, cards and image posts.

   Storage today : browser localStorage (demo mode)
   Storage later : Supabase (see assets/js/config.js and the loadRemote()
                   helper at the bottom of this file — no code changes
                   needed in the widgets themselves).
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
      body: "Free 30-minute discovery calls are available from 28 October. Four slots remain this month.",
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
      body: "Compare both interest methods, see dated monthly schedules and download the repayment plan as a CSV.",
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
      body: "First Tuesday of every month at the community hall. Appointments only — bring three months of statements.",
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
      body: "Clients with cover renewing in November have been contacted. Check your documents in the portal.",
      link: "portal.html",
      linkLabel: "Open portal",
      image: "",
      animation: "rotate",
      pinned: false,
      published: true,
      date: "2026-10-04T16:45:00"
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

  function formatDate(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return "";
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) +
      " · " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  }

  var ANIMATIONS = ["slide", "flap", "swipe", "rotate", "spin"];

  window.JCOB_LIVE = {
    KEY: KEY,
    DEFAULTS: DEFAULTS,
    getPosts: read,
    savePosts: write,
    published: published,
    escapeHtml: escapeHtml,
    animations: ANIMATIONS
  };

  /* ---------------- Feed rendering ---------------- */
  var LOGO = '<img class="live-logo" src="assets/img/logo-full-light.svg" alt="JAY C O B FINANCIAL SERVICES" width="268" height="64" loading="lazy">';
  var MARK = '<img class="live-mark" src="assets/img/logo-mark.svg" alt="" width="18" height="18">';

  function slideMarkup(post) {
    var anim = ANIMATIONS.indexOf(post.animation) >= 0 ? post.animation : "slide";
    var type = post.type || "announcement";
    var link = post.link
      ? '<a class="btn btn--gold btn--sm live-link" href="' + escapeHtml(post.link) + '">' +
        escapeHtml(post.linkLabel || "Read more") + "</a>"
      : "";

    var inner;
    if (type === "image" && post.image) {
      inner =
        '<div class="live-image" style="background-image:url(\'' + escapeHtml(post.image) + '\')">' +
        '<div class="live-image-overlay">' +
        '<span class="live-tag">Photo update</span>' +
        "<h3>" + escapeHtml(post.title) + "</h3>" +
        "<p>" + escapeHtml(post.body) + "</p>" +
        link +
        "</div></div>";
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
      "<time datetime=\"" + escapeHtml(post.date) + "\">" + formatDate(post.date) + "</time>" +
      "</div></article>"
    );
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
      '<div class="live-stage" aria-live="polite"></div>' +
      '<div class="live-foot"><div class="live-dots"></div><a class="live-all" href="live.html">All updates →</a></div>';

    var stage = root.querySelector(".live-stage");
    var dotsWrap = root.querySelector(".live-dots");
    var playBtn = root.querySelector("[data-live-play]");
    var index = 0;
    var timer = null;
    var playing = true;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    dotsWrap.innerHTML = posts
      .map(function (p, i) {
        return '<button type="button" class="live-dot" data-goto="' + i + '" aria-label="Show update ' + (i + 1) + '"></button>';
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

  function renderArchive(root) {
    var posts = published(read());
    if (!posts.length) {
      root.innerHTML = '<p class="text-small text-muted">No updates published yet.</p>';
      return;
    }
    root.innerHTML = posts.map(function (post) {
      var type = post.type || "announcement";
      var label = type === "image" ? "Photo" : type === "card" ? "Card" : "Notice";
      return '<article class="live-archive-card">' +
        '<div class="live-archive-top"><span class="pill pill--warn">' + label + '</span>' +
        '<time datetime="' + escapeHtml(post.date) + '">' + formatDate(post.date) + '</time></div>' +
        "<h3>" + escapeHtml(post.title) + "</h3>" +
        "<p>" + escapeHtml(post.body) + "</p>" +
        (post.link ? '<a class="link-arrow" href="' + escapeHtml(post.link) + '">' +
          escapeHtml(post.linkLabel || "Read more") + "</a>" : "") +
        "</article>";
    }).join("");
  }

  function initFeeds() {
    document.querySelectorAll("[data-live-feed]").forEach(function (root) {
      initFeed(root);
    });
    document.querySelectorAll("[data-live-archive]").forEach(renderArchive);
  }

  window.JCOB_LIVE.initFeeds = initFeeds;
  window.JCOB_LIVE.renderArchive = renderArchive;

  initFeeds();

  /* ---------------- Supabase-ready loader ----------------
     Add supabaseUrl + supabaseAnonKey in assets/js/config.js and the
     widgets switch from localStorage to the live_posts table.
     Expected columns: id, type, title, body, link, link_label,
     image, animation, pinned, published, date                    */
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
    var wrap = document.createElement("div");
    wrap.className = "live-toast";
    wrap.setAttribute("role", "status");
    wrap.innerHTML =
      '<div class="live-toast-head">' + MARK + '<span>Live · JAY C O B</span>' +
      '<button type="button" class="live-toast-close" aria-label="Dismiss notification">×</button></div>' +
      "<h4>" + escapeHtml(post.title) + "</h4>" +
      "<p>" + escapeHtml(post.body) + "</p>" +
      '<a class="link-arrow" href="' + escapeHtml(post.link || "live.html") + '">' +
      escapeHtml(post.linkLabel || "View update") + "</a>";

    document.body.appendChild(wrap);
    requestAnimationFrame(function () { wrap.classList.add("is-in"); });

    var closed = false;
    function close() {
      if (closed) return;
      closed = true;
      wrap.classList.remove("is-in");
      try {
        window.localStorage.setItem(DISMISS_KEY, post.id);
      } catch (e) {}
      setTimeout(function () { wrap.remove(); }, 350);
    }
    wrap.querySelector(".live-toast-close").addEventListener("click", close);
    setTimeout(close, 14000);
  }

  if (!document.body.classList.contains("no-live-toast")) {
    var latest = published(read())[0];
    var dismissed = null;
    try { dismissed = window.localStorage.getItem(DISMISS_KEY); } catch (e) {}
    if (latest && latest.id !== dismissed) {
      setTimeout(function () { showToast(latest); }, 2200);
    }
  }
})();
