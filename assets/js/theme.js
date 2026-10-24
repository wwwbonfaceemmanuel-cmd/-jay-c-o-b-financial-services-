/* =====================================================================
   JAY C O B FINANCIAL SERVICES — theme engine
   ---------------------------------------------------------------------
   The administrator picks a theme in the console (Website Settings →
   Theme generator). The choice is stored in Supabase (site_docs/settings →
   settings.theme) and this file applies it to whichever surface is open:

     theme.site       → the public website
     theme.dashboard  → the customer dashboard and the admin console

   A theme is a set of CSS custom properties written onto <html>, so every
   page, receipt band and console panel changes together. The house theme
   (id "emerald", the midnight navy and gold palette) is the published
   default and writes nothing, which keeps the stylesheet's own values
   authoritative for the untouched design.

   PUBLIC API (window.JCOB_THEME)
     list()                 → [{ id, name, note, swatch }]
     current(kind)          → the theme id in force for "site" | "dashboard"
     apply(kind, id)        → paint immediately (does not save)
     refresh()              → re-read the saved choice and paint
     DEFAULT                → "emerald"
   ===================================================================== */
(function () {
  "use strict";

  var DEFAULT = "emerald";

  /* ---------------------------------------------------------------------
     Every published theme is a navy-or-black bank with a metal accent:
     the grounds stay dark so white type keeps its contrast, and the
     accent only ever touches trim, figures and the active state. The
     house theme is the stylesheet's own palette, so it writes nothing.

     Each theme paints:
       --emerald-chrome  the header, footer, page bands and receipt bands
       --ng-*            the surfaces, text and accent the v10 layer uses
       --navy-*          the legacy names the older rules still speak
       --gold-*          the trim ramp (lintels, focus rings, figures)
     --------------------------------------------------------------------- */
  var THEMES = {
    emerald: {
      name: "Midnight navy & gold",
      note: "The published house style — #020817 navy, metallic gold trim, white type.",
      swatch: ["#020817", "#0b1d35", "#ffd166"],
      tokens: {}
    },

    royal: {
      name: "Navy & sapphire",
      note: "Navy grounds with a sapphire accent and pale-gold trim.",
      swatch: ["#020b1c", "#0a2246", "#ffd166"],
      tokens: {
        "--emerald-chrome": "radial-gradient(900px 420px at 88% -20%, rgba(56, 132, 255, 0.18), transparent 62%), linear-gradient(165deg, #061631 0%, #030c1e 62%, #01060f 100%)",
        "--chrome-text": "#cbd5e1",
        "--chrome-text-strong": "#ffffff",
        "--chrome-muted-text": "#94a3b8",
        "--chrome-rule": "rgba(184, 138, 43, 0.28)",
        "--ng-bg": "#020b1c",
        "--ng-bg-2": "#061631",
        "--ng-sidebar": "#030d20",
        "--ng-card": "#0a2246",
        "--ng-panel": "#0d2a52",
        "--ng-raise": "#12325e",
        "--ng-sunken": "#01081a",
        "--ng-gold-text": "#e7c36b",
        "--navy-900": "#020b1c",
        "--navy-800": "#061631",
        "--navy-700": "#0a2246",
        "--navy-600": "#0d2a52",
        "--navy-500": "#12325e",
        "--crystal-900": "#0b3c6d",
        "--crystal-700": "#1a63b8",
        "--crystal-500": "#3884ff",
        "--crystal-300": "#7fb0ff",
        "--crystal-200": "#b9d4ff",
        "--crystal-100": "#e2eeff",
        "--emerald-liquid": "linear-gradient(150deg, #0a2246 0%, #061631 55%, #020b1c 100%)",
        "--emerald-blue": "linear-gradient(135deg, #030c1e 0%, #0a2246 45%, #12325e 100%)"
      }
    },

    midnight: {
      name: "Black & champagne",
      note: "Near-black grounds with champagne-gold trim — the quietest of the five.",
      swatch: ["#050608", "#14161b", "#e8d59c"],
      tokens: {
        "--emerald-chrome": "radial-gradient(900px 420px at 88% -20%, rgba(232, 213, 156, 0.14), transparent 62%), linear-gradient(165deg, #14161b 0%, #0a0b0e 62%, #050608 100%)",
        "--chrome-text": "#cbd5e1",
        "--chrome-text-strong": "#fbf8f1",
        "--chrome-muted-text": "#94a3b8",
        "--chrome-rule": "rgba(232, 213, 156, 0.24)",
        "--ng-bg": "#050608",
        "--ng-bg-2": "#0c0d11",
        "--ng-sidebar": "#040507",
        "--ng-card": "#14161b",
        "--ng-panel": "#1a1d23",
        "--ng-raise": "#22262d",
        "--ng-sunken": "#030406",
        "--ng-gold": "#d9bd72",
        "--ng-gold-bright": "#f0e0ac",
        "--ng-gold-deep": "#a98d45",
        "--ng-gold-text": "#e8d59c",
        "--ng-gold-line": "rgba(217, 189, 114, 0.36)",
        "--ng-gold-line-soft": "rgba(217, 189, 114, 0.2)",
        "--navy-900": "#050608",
        "--navy-800": "#0c0d11",
        "--navy-700": "#14161b",
        "--navy-600": "#1a1d23",
        "--navy-500": "#22262d",
        "--gold-500": "#d9bd72",
        "--gold-400": "#f0e0ac",
        "--gold-200": "#f6ecd2",
        "--gold-100": "#fbf5e6",
        "--gold-edge": "linear-gradient(135deg, #a98d45 0%, #d9bd72 26%, #f6ecd2 48%, #d9bd72 70%, #a98d45 100%)",
        "--gold-liquid": "linear-gradient(115deg, #a98d45 0%, #f0e0ac 22%, #d9bd72 46%, #fbf5e6 62%, #c2a558 82%, #f0e0ac 100%)",
        "--emerald-liquid": "linear-gradient(150deg, #14161b 0%, #0c0d11 55%, #050608 100%)",
        "--emerald-blue": "linear-gradient(135deg, #0c0d11 0%, #14161b 55%, #22262d 100%)"
      }
    },

    copper: {
      name: "Navy & copper",
      note: "Navy grounds with a burnished copper accent and warm trim.",
      swatch: ["#04101f", "#12304f", "#d59a63"],
      tokens: {
        "--emerald-chrome": "radial-gradient(900px 420px at 88% -20%, rgba(214, 140, 80, 0.18), transparent 62%), linear-gradient(165deg, #06182c 0%, #030d1c 62%, #01060f 100%)",
        "--chrome-text": "#e2e8f0",
        "--chrome-text-strong": "#fdf3ea",
        "--chrome-muted-text": "#a8b6c6",
        "--chrome-rule": "rgba(213, 154, 99, 0.26)",
        "--ng-bg": "#04101f",
        "--ng-bg-2": "#071a2e",
        "--ng-sidebar": "#030b17",
        "--ng-card": "#0b2138",
        "--ng-panel": "#102a45",
        "--ng-raise": "#15334f",
        "--ng-sunken": "#020a14",
        "--ng-gold": "#d59a63",
        "--ng-gold-bright": "#f0c295",
        "--ng-gold-deep": "#a2622a",
        "--ng-gold-text": "#e9b98a",
        "--ng-gold-line": "rgba(213, 154, 99, 0.36)",
        "--ng-gold-line-soft": "rgba(213, 154, 99, 0.2)",
        "--navy-900": "#04101f",
        "--navy-800": "#071a2e",
        "--navy-700": "#0b2138",
        "--navy-600": "#102a45",
        "--navy-500": "#15334f",
        "--gold-700": "#8a5322",
        "--gold-600": "#b87333",
        "--gold-500": "#d59a63",
        "--gold-400": "#f0c295",
        "--gold-200": "#f8e6d5",
        "--gold-100": "#fdf2e8",
        "--gold-edge": "linear-gradient(135deg, #8a5322 0%, #d59a63 26%, #f6e2c8 48%, #b87333 70%, #8a5322 100%)",
        "--gold-liquid": "linear-gradient(115deg, #a2622a 0%, #f0c295 22%, #d59a63 46%, #fdf2e8 62%, #c07f45 82%, #f0c295 100%)",
        "--emerald-liquid": "linear-gradient(150deg, #0b2138 0%, #071a2e 55%, #04101f 100%)",
        "--emerald-blue": "linear-gradient(135deg, #030b17 0%, #0b2138 45%, #15334f 100%)"
      }
    },

    forest: {
      name: "Navy & emerald",
      note: "Navy grounds with an emerald accent — the brand's green, kept as trim.",
      swatch: ["#020d18", "#0a2334", "#4ade80"],
      tokens: {
        "--emerald-chrome": "radial-gradient(900px 420px at 88% -20%, rgba(74, 222, 128, 0.12), transparent 62%), linear-gradient(165deg, #061a24 0%, #030f18 62%, #01070c 100%)",
        "--chrome-text": "#d3e7e1",
        "--chrome-text-strong": "#ffffff",
        "--chrome-muted-text": "#9fbcb4",
        "--chrome-rule": "rgba(184, 138, 43, 0.26)",
        "--ng-bg": "#020d18",
        "--ng-bg-2": "#061a24",
        "--ng-sidebar": "#02101a",
        "--ng-card": "#0a2334",
        "--ng-panel": "#0d2c40",
        "--ng-raise": "#12364d",
        "--ng-sunken": "#01080f",
        "--ng-gold-text": "#e7c36b",
        "--navy-900": "#020d18",
        "--navy-800": "#061a24",
        "--navy-700": "#0a2334",
        "--navy-600": "#0d2c40",
        "--navy-500": "#12364d",
        "--gold-500": "#d4a63a",
        "--gold-400": "#ffd166",
        "--gold-200": "#ffe7a8",
        "--gold-100": "#fff3d0",
        "--emerald-liquid": "linear-gradient(150deg, #0a2334 0%, #061a24 55%, #020d18 100%)",
        "--emerald-blue": "linear-gradient(135deg, #02101a 0%, #0a2334 45%, #12364d 100%)"
      }
    }
  };

  var WRITTEN = [];

  function isDashboard() {
    var body = document.body;
    if (!body) return false;
    if (body.classList.contains("app-body")) return true;
    if (body.getAttribute("data-page") === "dashboard") return true;
    /* the console marks itself by its sidebar */
    return !!document.getElementById("sidebar");
  }

  function websiteKind() { return isDashboard() ? "dashboard" : "site"; }

  function themeId(id) {
    var key = String(id || "").toLowerCase();
    return THEMES[key] ? key : DEFAULT;
  }

  function tokensFor(id) {
    var t = THEMES[themeId(id)];
    return (t && t.tokens) || {};
  }

  /* Paint one surface. `dashboard` also drives the console's own --chrome
     aliases, so the admin bar follows the same choice. */
  function apply(kind, id) {
    var root = document.documentElement;
    var target = themeId(id);

    WRITTEN.forEach(function (prop) { root.style.removeProperty(prop); });
    WRITTEN = [];

    var tokens = tokensFor(target);
    Object.keys(tokens).forEach(function (prop) {
      root.style.setProperty(prop, tokens[prop]);
      WRITTEN.push(prop);
    });

    /* The console's own aliases follow the choice. On the house theme there
       is nothing to follow: admin.html already declares them, so leave the
       stylesheet's values in charge rather than writing a near-miss copy. */
    if (kind === "dashboard" && tokens["--emerald-chrome"]) {
      root.style.setProperty("--chrome", tokens["--emerald-chrome"]);
      WRITTEN.push("--chrome");
    }
    if (kind === "dashboard" && tokens["--chrome-text"]) {
      root.style.setProperty("--chrome-txt", tokens["--chrome-text"]);
      WRITTEN.push("--chrome-txt");
    }

    root.setAttribute("data-theme-" + (kind === "dashboard" ? "dashboard" : "site"), target);
    if (kind === websiteKind()) root.setAttribute("data-theme", target);

    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", (swatchOf(target)[0] || "#020817"));
    return target;
  }

  function swatchOf(id) {
    var t = THEMES[themeId(id)];
    return (t && t.swatch) || ["#020817"];
  }

  function savedTheme() {
    var site = window.JCOB_SITE;
    var t = site && site.settings && site.settings.theme;
    return t && typeof t === "object" ? t : {};
  }

  function paint() {
    var theme = savedTheme();
    var kind = websiteKind();
    return apply(kind, theme[kind] || theme.site || DEFAULT);
  }

  /* The public site hydrates settings asynchronously, so repaint when the
     published documents arrive. */
  function watch() {
    document.addEventListener("jcob:site-updated", function () { paint(); });
    var site = window.JCOB_SITE;
    if (site && site.ready && site.ready.then) site.ready.then(paint).catch(function () {});
    if (site && site.subscribe) site.subscribe(function () { paint(); });
  }

  /* Pages without site-store (the customer dashboard) read the same
     document straight from Supabase. */
  function fetchSaved() {
    var cloud = window.JCOB_CLOUD;
    if (!cloud || !cloud.enabled || !cloud.docs || !cloud.docs.get) return;
    if (window.JCOB_SITE && window.JCOB_SITE.settings) return;
    cloud.docs.get("site", "settings").then(function (row) {
      var t = row && row.data && row.data.theme;
      if (!t) return;
      var kind = websiteKind();
      apply(kind, t[kind] || t.site || DEFAULT);
    }).catch(function () {});
  }

  function list() {
    return Object.keys(THEMES).map(function (id) {
      return { id: id, name: THEMES[id].name, note: THEMES[id].note, swatch: THEMES[id].swatch };
    });
  }

  window.JCOB_THEME = {
    DEFAULT: DEFAULT,
    list: list,
    apply: apply,
    paint: paint,
    refresh: paint,
    current: function (kind) {
      var theme = savedTheme();
      return themeId(theme[kind || websiteKind()] || theme.site || DEFAULT);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { paint(); watch(); fetchSaved(); });
  } else {
    paint(); watch(); fetchSaved();
  }
})();
