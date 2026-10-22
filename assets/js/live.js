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


  /* About Us cards — published straight into the live blog by the administrators.
     Each card carries a different motion action. */
  var ABOUT_CARDS = [
    {
      id: "lv-ab-01",
      type: "about",
      title: "Our mission",
      body: "To provide transparent, affordable credit and practical financial support to Malawian households and businesses, so that borrowing builds opportunity rather than trapping people in debt.",
      link: "about.html",
      linkLabel: "Read our story",
      image: "assets/img/about-team.jpg",
      animation: "slide",
      pinned: false,
      published: true,
      date: "2026-10-19T09:00:00"
    },
    {
      id: "lv-ab-02",
      type: "about",
      title: "Our vision",
      body: "To be the most trusted non-bank lender in Malawi — known for fair pricing, human assessment and technology that makes credit easier to understand and manage.",
      link: "about.html#team",
      linkLabel: "Meet the team",
      image: "",
      animation: "swap",
      pinned: false,
      published: true,
      date: "2026-10-16T11:30:00"
    },
    {
      id: "lv-ab-03",
      type: "about",
      title: "What we stand for",
      body: "Transparency: published rates, itemised fees and a total cost figure before you sign. Responsibility: we decline loans we believe are unaffordable. Respect: no pressure and no humiliation in recovery. Local roots: Malawian staff and Malawian decision-makers.",
      link: "about.html",
      linkLabel: "Our values",
      image: "",
      animation: "flap",
      pinned: false,
      published: true,
      date: "2026-10-10T14:15:00"
    },
    {
      id: "lv-ab-04",
      type: "about",
      title: "Ten years of steady growth",
      body: "Founded in Lilongwe in 2016 with a single office and salary-based lending. Business lending followed in 2018, the customer portal in 2020, agricultural finance in 2022, secured lending and regional reach in 2024, and a digital-first rebuild in 2026.",
      link: "about.html",
      linkLabel: "See our history",
      image: "assets/img/hero-consultation.jpg",
      animation: "rotate",
      pinned: false,
      published: true,
      date: "2026-10-02T08:45:00"
    },
    {
      id: "lv-ab-05",
      type: "about",
      title: "Registered, licensed and regulated",
      body: "JAY C O B FINANCIAL SERVICES is a licensed money lender in Malawi, registered with the Registrar of Financial Institutions and operating under the Money Lenders Act. Our registration, licence and complaint route are published in full.",
      link: "licensing.html",
      linkLabel: "Licensing & regulation",
      image: "",
      animation: "spin",
      pinned: false,
      published: true,
      date: "2026-09-26T10:20:00"
    },
    {
      id: "lv-ab-06",
      type: "about",
      title: "Corporate social responsibility",
      body: "We reinvest a share of our margin into financial literacy and enterprise support in the communities we lend to — including school fee workshops, market-vendor bookkeeping clinics and cooperative governance training.",
      link: "about.html",
      linkLabel: "Community work",
      image: "assets/img/insight-agri.jpg",
      animation: "swipe",
      pinned: false,
      published: true,
      date: "2026-09-18T13:10:00"
    },
    {
      id: "lv-ab-07",
      type: "about",
      title: "Talk to a person, not a chatbot",
      body: "Head office: Plot 47/3, Area 47, Sector 3, Lilongwe. Call +265 999 123 456, Monday to Friday 08:00–17:00 and Saturday 09:00–12:00, or email hello@jaycobfinancial.mw.",
      link: "contact.html",
      linkLabel: "Contact us",
      image: "",
      animation: "endless",
      pinned: false,
      published: true,
      date: "2026-09-11T16:00:00"
    }
  ];


  /* Topic posts — each one is published into a live-blog strip inside the
     section or page it belongs to (security, why choose us, customer
     stories, eligibility, loan products). */
  var TOPIC_POSTS = [
    /* ---- Security & trust ---- */
    {
      id: "lv-se-01", topic: "security", type: "announcement",
      title: "We never ask for your PIN or your one-time code",
      body: "Staff will never request your mobile-money PIN, password or OTP — not by phone, WhatsApp or SMS. If someone does, stop the call and report it to security@jaycobfinancial.mw.",
      link: "privacy.html", linkLabel: "How we protect you", image: "",
      animation: "endless", pinned: false, published: true, date: "2026-10-21T07:45:00"
    },
    {
      id: "lv-se-02", topic: "security", type: "blog",
      title: "Spotting a fake loan offer",
      body: "Real lenders publish a physical address, a licence number and a complaints route. They never ask for an up-front 'release fee' before disbursement, never message from a personal number, and never ask you to send a photo of your bank card. Check the licence, call the published number back, and walk away from anyone who pressures you to decide in minutes.",
      link: "aml.html", linkLabel: "Fraud guidance", image: "assets/img/hero-consultation.jpg",
      animation: "slide", pinned: false, published: true, date: "2026-10-17T10:20:00"
    },
    {
      id: "lv-se-03", topic: "security", type: "card",
      title: "Review every device that has opened your account",
      body: "Account security lists each session with device, location and last activity. Sign out anything you do not recognise, then change your password — it takes about a minute.",
      link: "login.html?next=dashboard.html", linkLabel: "Open account security", image: "",
      animation: "rotate", pinned: false, published: true, date: "2026-10-08T15:10:00"
    },

    /* ---- Why choose us ---- */
    {
      id: "lv-wh-01", topic: "why-us", type: "card",
      title: "Every number is published before you sign",
      body: "Rate, processing fee, total cost of credit and the late-payment charge appear in writing on the agreement — the same figures the calculator gives you. If it is not disclosed, it is not payable.",
      link: "fees-disclosure.html", linkLabel: "See the fee disclosure", image: "",
      animation: "flap", pinned: false, published: true, date: "2026-10-19T11:05:00"
    },
    {
      id: "lv-wh-02", topic: "why-us", type: "blog",
      title: "Human credit decisions, not just a score",
      body: "A market vendor with six months of M-Pesa records, or a farmer with one harvest a year, does not fit a template. Our credit team reads the context: seasonal income, trading history, existing obligations and what the money is for. That is why we can say yes to people a formula would decline — and why we sometimes say no to a strong score.",
      link: "about.html", linkLabel: "How we assess", image: "assets/img/insight-business.jpg",
      animation: "swap", pinned: false, published: true, date: "2026-10-14T09:40:00"
    },
    {
      id: "lv-wh-03", topic: "why-us", type: "announcement",
      title: "Local support, six days a week",
      body: "Call +265 999 123 456 Monday to Friday 08:00–17:00 and Saturday 09:00–12:00, or visit the Lilongwe office. No offshore call centre, no script — the person who answers can see your file.",
      link: "contact.html", linkLabel: "Contact the team", image: "",
      animation: "swipe", pinned: false, published: true, date: "2026-10-05T08:15:00"
    },

    /* ---- Customer stories ---- */
    {
      id: "lv-st-01", topic: "stories", type: "blog",
      title: "Memory: the calculator matched the agreement",
      body: "Memory borrowed MWK 5,000,000 over 24 months to consolidate two smaller loans. She used the calculator first, kept the printed schedule, and checks the balance in her dashboard after every payment. 'The instalment never changed, so I could plan around it,' she says.",
      link: "calculator.html", linkLabel: "Run the same estimate", image: "assets/img/insight-business.jpg",
      animation: "slide", pinned: false, published: true, date: "2026-10-18T12:00:00"
    },
    {
      id: "lv-st-02", topic: "stories", type: "card",
      title: "Chikondi: restocked before the rains",
      body: "A Blantyre shop owner took a small-business loan and chose fortnightly repayment to match market days. Stock arrived before the rainy season and the loan cleared in eight months.",
      link: "loan-products.html#small-business", linkLabel: "Small-business loans", image: "",
      animation: "swap", pinned: false, published: true, date: "2026-10-09T14:30:00"
    },
    {
      id: "lv-st-03", topic: "stories", type: "blog",
      title: "Grace: restructured, not defaulted",
      body: "When Grace's contract ended she called before missing a payment. We extended the term and lowered the instalment rather than letting arrears build. She finished the loan four months later with no default on her record — and a written record of every change in her dashboard.",
      link: "responsible-lending.html", linkLabel: "Responsible lending", image: "assets/img/insight-agri.jpg",
      animation: "rotate", pinned: false, published: true, date: "2026-09-30T16:45:00"
    },

    /* ---- Eligibility ---- */
    {
      id: "lv-el-01", topic: "eligibility", type: "announcement",
      title: "The check takes two minutes and does not affect your record",
      body: "The preliminary eligibility check is an estimate, not an application. Nothing is submitted, no credit bureau is queried, and your answers stay in your browser until you choose to apply.",
      link: "eligibility.html", linkLabel: "Start the check", image: "",
      animation: "flap", pinned: false, published: true, date: "2026-10-20T09:30:00"
    },
    {
      id: "lv-el-02", topic: "eligibility", type: "card",
      title: "Three documents that speed up a decision",
      body: "National ID, three months of bank or mobile-money statements, and proof of residence. Complete, legible copies are the difference between a same-week decision and a week of back-and-forth.",
      link: "kyc.html", linkLabel: "Document checklist", image: "",
      animation: "slide", pinned: false, published: true, date: "2026-10-11T10:10:00"
    },
    {
      id: "lv-el-03", topic: "eligibility", type: "blog",
      title: "Why we sometimes decline a strong score",
      body: "The score is a screening tool, not a decision. A high score still fails if verified income cannot carry the instalment after essential expenses, if documents cannot be verified, or if existing obligations already take more than 40% of net income. We would rather decline now than repossess later — and we will tell you exactly which criterion failed.",
      link: "responsible-lending.html", linkLabel: "Read the policy", image: "assets/img/about-team.jpg",
      animation: "spin", pinned: false, published: true, date: "2026-10-01T11:25:00"
    },

    /* ---- Loan products ---- */
    {
      id: "lv-pr-01", topic: "products", type: "card",
      title: "Agricultural loans aligned to harvest",
      body: "Seasonal lending with a grace period on principal until the first sale, then repayment across the harvest window. Applications for the 2026/27 season close on 30 November.",
      link: "loan-products.html#agricultural", linkLabel: "Agricultural product", image: "",
      animation: "swipe", pinned: false, published: true, date: "2026-10-16T08:35:00"
    },
    {
      id: "lv-pr-02", topic: "products", type: "blog",
      title: "Salary-based loans, deducted at source",
      body: "For public-sector and formally employed customers, repayment can be arranged through employer deduction, which usually earns a lower rate. Limits run from MWK 100,000 to MWK 10,000,000 over 6 to 36 months, with the same instalment every month.",
      link: "loan-products.html#salary", linkLabel: "Salary-based product", image: "assets/img/hero-consultation.jpg",
      animation: "slide", pinned: false, published: true, date: "2026-10-06T13:15:00"
    },
    {
      id: "lv-pr-03", topic: "products", type: "announcement",
      title: "Secured lending from 18% against a vehicle or title deed",
      body: "Put up a registered vehicle, title deed or fixed deposit and the rate drops to 18% with limits up to MWK 80,000,000 over 84 months. Valuation and perfection costs are disclosed before you commit.",
      link: "loan-products.html#secured", linkLabel: "Secured product", image: "",
      animation: "rotate", pinned: false, published: true, date: "2026-09-24T09:50:00"
    }
  ];

  var TOPIC_LABELS = {
    security: "Security &amp; trust",
    "why-us": "Why choose us",
    stories: "Customer stories",
    eligibility: "Eligibility",
    products: "Loan products"
  };

  /* ---------------- Data layer ---------------- */
  function withAboutCards(posts) {
    var have = {};
    posts.forEach(function (p) { have[p.id] = true; });
    var extra = ABOUT_CARDS.concat(TOPIC_POSTS).filter(function (p) { return !have[p.id]; });
    return extra.length ? posts.concat(extra) : posts;
  }

  function read() {
    try {
      var raw = window.localStorage.getItem(KEY);
      if (!raw) return withAboutCards(DEFAULTS.slice());
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || !parsed.length) return withAboutCards(DEFAULTS.slice());
      return withAboutCards(parsed);
    } catch (e) {
      return withAboutCards(DEFAULTS.slice());
    }
  }

  function write(posts) {
    var ok = true;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(posts));
    } catch (e) {
      ok = false;
    }
    pushRemote(posts);
    return ok;
  }

  /* ---------------- Cloud (Supabase) ---------------- */
  var CLOUD = window.JCOB_CLOUD;
  var remote = {
    enabled: !!(CLOUD && CLOUD.enabled),
    state: CLOUD && CLOUD.enabled ? "connecting" : "local",
    error: null
  };

  function pushRemote(posts) {
    if (!CLOUD || !CLOUD.enabled) return;
    if (!CLOUD.auth || !CLOUD.auth.isSignedIn()) return;
    remote.state = "saving";
    CLOUD.docs.put("site", "live_posts", posts).then(function () {
      remote.state = "synced";
      remote.error = null;
    }).catch(function (err) {
      remote.state = "error";
      remote.error = String((err && err.message) || err);
    });
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
  var TYPE_LABELS = {
    announcement: "Announcement",
    card: "Card",
    image: "Photo update",
    blog: "Live blog",
    about: "About us"
  };

  window.JCOB_LIVE = {
    KEY: KEY,
    DEFAULTS: DEFAULTS,
    getPosts: read,
    savePosts: write,
    remote: remote,
    hydrate: hydrateRemote,
    published: published,
    escapeHtml: escapeHtml,
    animations: ANIMATIONS,
    aboutCards: ABOUT_CARDS,
    topicPosts: TOPIC_POSTS,
    topicLabels: TOPIC_LABELS,
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
    } else if (type === "about") {
      inner =
        '<div class="live-card live-card--about">' +
        '<span class="live-tag live-tag--about">About JAY C O B</span>' +
        "<h3>" + escapeHtml(post.title) + "</h3>" +
        "<p>" + escapeHtml(post.body) + "</p>" +
        link +
        "</div>";
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
    var topic = root.getAttribute("data-topic");
    if (topic) {
      var picked = posts.filter(function (p) { return p.topic === topic; });
      if (picked.length) posts = picked;
    }
    var limit = parseInt(root.getAttribute("data-limit") || "0", 10);
    if (limit > 0) posts = posts.slice(0, limit);
    if (!posts.length) {
      root.innerHTML = '<p class="text-small text-muted">No updates published yet.</p>';
      var section = root.closest(".live-section");
      if (topic && section) section.hidden = true;
      return;
    }
    root.classList.add("live-stream");
    root.classList.toggle("live-strip", root.hasAttribute("data-strip") || root.classList.contains("live-strip"));
    root.innerHTML = posts.map(function (post, i) {
      var type = post.type || "announcement";
      var anim = ANIMATIONS.indexOf(post.animation) >= 0 ? post.animation : "slide";
      var media = post.image
        ? '<div class="live-blog-media" style="background-image:url(&quot;' + escapeHtml(post.image) + '&quot;)" role="img" aria-label="' + escapeHtml(post.title) + '"></div>'
        : '<div class="live-blog-media live-blog-media--none">' + escapeHtml(TYPE_LABELS[type] || "Update") + "</div>";
      var href = safeHref(post.link);
      return '<article class="live-blog' + (type === "about" ? " live-blog--about" : "") +
        ' anim-' + anim + '" data-anim="' + anim + '" data-type="' + escapeHtml(type) +
        '" data-post="' + escapeHtml(post.id) + '">' +
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

  /* ---------------- Cloud loader ---------------- */
  function hydrateRemote() {
    if (!CLOUD || !CLOUD.enabled) return Promise.resolve(false);
    return CLOUD.docs.get("site", "live_posts").then(function (row) {
      var posts = row && Array.isArray(row.data) ? row.data : null;
      if (posts && posts.length) {
        try { window.localStorage.setItem(KEY, JSON.stringify(posts)); } catch (e) {}
        remote.state = "synced";
        remote.error = null;
        initFeeds();
        return true;
      }
      /* first run against an empty cloud: publish whatever this browser has */
      var local = read();
      if (local.length) pushRemote(local);
      return false;
    }).catch(function (err) {
      remote.state = "offline";
      remote.error = String((err && err.message) || err);
      return false;
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", hydrateRemote);
  } else {
    hydrateRemote();
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
