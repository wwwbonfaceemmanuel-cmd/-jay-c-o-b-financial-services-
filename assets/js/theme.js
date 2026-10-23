/* =====================================================================
   JAY C O B FINANCIAL SERVICES — theme engine
   ---------------------------------------------------------------------
   The administrator picks a theme in the console (Website Settings →
   Theme generator). The choice is stored in Supabase (site_docs/settings →
   settings.theme) and this file applies it to whichever surface is open:

     theme.site       → the public website
     theme.dashboard  → the customer dashboard and the admin console

   A theme is a set of CSS custom properties written onto <html>, so every
   page, receipt band and console panel changes together. The emerald
   theme is the published default and writes nothing, which keeps the
   stylesheet's own values authoritative for the untouched design.

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

  /* Each entry paints: the chrome (header, footer, page bands, receipts),
     its type, the app surfaces and the accent ramp. Grounds stay light so
     body text keeps its contrast. */
  var THEMES = {
    emerald: {
      name: "Emerald & liquid gold",
      note: "The published house style — deep emerald chrome with gold trim.",
      swatch: ["#06302c", "#0a3f6b", "#f2e3b6"],
      tokens: {}
    },
    royal: {
      name: "Royal blue & crystal",
      note: "Royal-blue chrome, ice-crystal accents, cooler grounds.",
      swatch: ["#0b2b4d", "#1f83c9", "#c4e2fb"],
      tokens: {
        "--emerald-chrome": "radial-gradient(900px 420px at 88% -20%, rgba(168, 216, 251, 0.26), transparent 62%), linear-gradient(165deg, #0b2b4d 0%, #081f39 62%, #061527 100%)",
        "--chrome-text": "#dbe9f7",
        "--chrome-text-strong": "#f6fbff",
        "--chrome-muted-text": "#b3c8dd",
        "--chrome-rule": "rgba(196, 226, 251, 0.24)",
        "--emerald-liquid": "linear-gradient(150deg, #0b2b4d 0%, #081f39 55%, #061527 100%)",
        "--emerald-blue": "linear-gradient(135deg, #081f39 0%, #0d3f66 45%, #12588a 100%)",
        "--navy-900": "#061527",
        "--navy-800": "#081f39",
        "--navy-700": "#0b2b4d",
        "--navy-600": "#114272",
        "--navy-500": "#155289",
        "--crystal-900": "#0a3f6b",
        "--crystal-700": "#0d5c96",
        "--crystal-500": "#1f83c9",
        "--crystal-300": "#7bb8e8",
        "--crystal-200": "#a8d8fb",
        "--crystal-100": "#dff1ff",
        "--cream": "#edf2fa",
        "--cream-dark": "#dbe6f4",
        "--gold-liquid": "linear-gradient(115deg, #a8d8fb 0%, #dff1ff 22%, #8ec7f0 46%, #c8e8ff 62%, #7bb8e8 82%, #e8f6ff 100%)"
      }
    },
    midnight: {
      name: "Midnight & champagne",
      note: "Near-black chrome with champagne trim and a neutral ground.",
      swatch: ["#181c22", "#101318", "#e8d59c"],
      tokens: {
        "--emerald-chrome": "radial-gradient(900px 420px at 88% -20%, rgba(232, 213, 156, 0.16), transparent 62%), linear-gradient(165deg, #1b2028 0%, #101318 62%, #080a0d 100%)",
        "--chrome-text": "#e6e2d8",
        "--chrome-text-strong": "#fbf8f1",
        "--chrome-muted-text": "#bdb8ab",
        "--chrome-rule": "rgba(232, 213, 156, 0.22)",
        "--emerald-liquid": "linear-gradient(150deg, #1b2028 0%, #101318 55%, #080a0d 100%)",
        "--emerald-blue": "linear-gradient(135deg, #101318 0%, #1b2028 55%, #262c35 100%)",
        "--navy-900": "#080a0d",
        "--navy-800": "#101318",
        "--navy-700": "#1b2028",
        "--navy-600": "#262c35",
        "--navy-500": "#343b46",
        "--cream": "#f1f2f4",
        "--cream-dark": "#e2e4e8",
        "--gold-700": "#7d5f0e",
        "--gold-500": "#c9a227",
        "--gold-400": "#dcbb5a",
        "--gold-200": "#f2e3b6",
        "--gold-100": "#fbf3dc",
        "--gold-edge": "linear-gradient(135deg, #7d5f0e 0%, #d8b554 26%, #f6ecc4 48%, #c9a227 70%, #7d5f0e 100%)"
      }
    },
    copper: {
      name: "Copper & ivory",
      note: "Espresso chrome, copper accents, warm ivory grounds.",
      swatch: ["#3a2118", "#8a5322", "#f0d6bb"],
      tokens: {
        "--emerald-chrome": "radial-gradient(900px 420px at 88% -20%, rgba(214, 140, 80, 0.24), transparent 62%), linear-gradient(165deg, #3a2118 0%, #271610 62%, #180d09 100%)",
        "--chrome-text": "#f1dfd1",
        "--chrome-text-strong": "#fdf3ea",
        "--chrome-muted-text": "#d3b9a6",
        "--chrome-rule": "rgba(240, 214, 187, 0.24)",
        "--emerald-liquid": "linear-gradient(150deg, #3a2118 0%, #271610 55%, #180d09 100%)",
        "--emerald-blue": "linear-gradient(135deg, #271610 0%, #4a2c1c 55%, #6b3f22 100%)",
        "--navy-900": "#180d09",
        "--navy-800": "#271610",
        "--navy-700": "#3a2118",
        "--navy-600": "#4a2c1c",
        "--navy-500": "#5c3a24",
        "--cream": "#f7f1ec",
        "--cream-dark": "#efe3d9",
        "--gold-900": "#4a2a10",
        "--gold-700": "#8a5322",
        "--gold-600": "#a2622a",
        "--gold-500": "#b87333",
        "--gold-400": "#d59a63",
        "--gold-200": "#f0d6bb",
        "--gold-100": "#f8ebdd",
        "--gold-edge": "linear-gradient(135deg, #8a5322 0%, #d59a63 26%, #f6e2c8 48%, #b87333 70%, #8a5322 100%)",
        "--gold-edge-soft": "rgba(138, 83, 34, 0.34)",
        "--gold-edge-strong": "rgba(138, 83, 34, 0.62)",
        "--gold-liquid": "linear-gradient(115deg, #d59a63 0%, #f8ebdd 22%, #e2b48a 46%, #f6e2c8 62%, #cf9a6a 82%, #fbf0e4 100%)"
      }
    },
    forest: {
      name: "Forest & brass",
      note: "Deep forest chrome, brass trim, moss-tinted grounds.",
      swatch: ["#0d3324", "#b08d57", "#dfeae3"],
      tokens: {
        "--emerald-chrome": "radial-gradient(900px 420px at 88% -20%, rgba(120, 200, 150, 0.2), transparent 62%), linear-gradient(165deg, #0d3324 0%, #082418 62%, #051510 100%)",
        "--chrome-text": "#d8e8dd",
        "--chrome-text-strong": "#f4fbf6",
        "--chrome-muted-text": "#b5cdbd",
        "--chrome-rule": "rgba(213, 232, 220, 0.22)",
        "--emerald-liquid": "linear-gradient(150deg, #0d3324 0%, #082418 55%, #051510 100%)",
        "--emerald-blue": "linear-gradient(135deg, #082418 0%, #124a30 55%, #1a5c3c 100%)",
        "--navy-900": "#051510",
        "--navy-800": "#082418",
        "--navy-700": "#0d3324",
        "--navy-600": "#124a30",
        "--navy-500": "#1a5c3c",
        "--cream": "#eef4f0",
        "--cream-dark": "#dfeae3",
        "--gold-900": "#3f3218",
        "--gold-700": "#6d5a2c",
        "--gold-600": "#8a7038",
        "--gold-500": "#b08d57",
        "--gold-400": "#c8a877",
        "--gold-200": "#eadcc2",
        "--gold-100": "#f5eedd",
        "--gold-edge": "linear-gradient(135deg, #6d5a2c 0%, #c8a877 26%, #f2e6cd 48%, #b08d57 70%, #6d5a2c 100%)",
        "--gold-edge-soft": "rgba(109, 90, 44, 0.34)",
        "--gold-edge-strong": "rgba(109, 90, 44, 0.62)",
        "--gold-liquid": "linear-gradient(115deg, #c8a877 0%, #f5eedd 22%, #dcc9a3 46%, #f2e6cd 62%, #c0a377 82%, #f8f2e6 100%)"
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
    if (meta) meta.setAttribute("content", (swatchOf(target)[0] || "#06262a"));
    return target;
  }

  function swatchOf(id) {
    var t = THEMES[themeId(id)];
    return (t && t.swatch) || ["#06262a"];
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
