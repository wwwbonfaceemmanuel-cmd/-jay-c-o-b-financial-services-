/* Header and footer are one colour.
   -----------------------------------------------------------------------
   The brief: the whole header should be exactly the colour of the footer.
   "Exactly" is enforced rather than eyeballed — both rules paint the same
   token, --emerald-chrome, so they cannot drift apart. The suite also
   checks everything that has to change when a header goes dark: the nav
   text, the active item, the Apply menu, the controls, the mobile drawer,
   the lockup on every page, and the dashboard's app bar that follows.

   Contrast is measured against all three stops of the gradient, not just
   the middle one.
   ========================================================================= */
"use strict";

const fs = require("fs");
const path = require("path");
const { ROOT, reporter } = require("./lib");

const t = reporter("[header — the footer's emerald]");

const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const site = read("assets/css/styles.css");
const admin = read("admin.html");

/* ---- a small CSS reader ----
   @media blocks are stripped: the mobile drawer and the print sheet both
   restate these selectors on purpose, and neither is the desktop header. */
function stripAtBlocks(css) {
  let out = "";
  for (let i = 0; i < css.length; ) {
    const at = css.indexOf("@media", i);
    if (at < 0) { out += css.slice(i); break; }
    out += css.slice(i, at);
    let depth = 0;
    let j = at;
    for (; j < css.length; j += 1) {
      if (css[j] === "{") depth += 1;
      else if (css[j] === "}") { depth -= 1; if (depth === 0) { j += 1; break; } }
    }
    i = j;
  }
  return out;
}

function rules(css) {
  const clean = stripAtBlocks(css.replace(/\/\*[\s\S]*?\*\//g, ""));
  const out = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(clean))) {
    out.push({ selectors: m[1].split(",").map((s) => s.trim()).filter(Boolean), body: m[2], index: m.index });
  }
  return out;
}

const siteRules = rules(site);

/* last declaration of a property for an exact selector */
function lastDecl(list, selector, prop) {
  let found = null;
  list.forEach((r) => {
    if (r.selectors.indexOf(selector) < 0) return;
    const m = new RegExp("(?:^|;)\\s*" + prop + "\\s*:\\s*([^;]+)", "i").exec(r.body);
    if (m) found = m[1].trim();
  });
  return found;
}

/* the whole rule body for an exact selector, latest wins */
function lastBody(list, selector) {
  let body = "";
  list.forEach((r) => {
    if (r.selectors.indexOf(selector) >= 0) body = r.body;
  });
  return body;
}

function token(name) {
  const m = new RegExp(name.replace(/-/g, "\\-") + "\\s*:\\s*([^;]+);").exec(site);
  return m ? m[1].trim() : null;
}

/* ---- 1. one token, two surfaces ---- */
const chrome = token("--emerald-chrome");
t.ok("the emerald chrome token exists", !!chrome && /linear-gradient/.test(chrome));
t.ok("the token is the footer's gradient",
  !!chrome && /#06302c/.test(chrome) && /#04211f/.test(chrome) && /#041716/.test(chrome), chrome || "");
t.eq("the footer paints with it", lastDecl(siteRules, ".site-footer", "background"), "var(--emerald-chrome)");
t.eq("the header paints with it", lastDecl(siteRules, ".site-header", "background"), "var(--emerald-chrome)");
t.eq("the scrolled header keeps it", lastDecl(siteRules, ".site-header.is-scrolled", "background"), "var(--emerald-chrome)");
t.eq("the dashboard app bar paints with it", lastDecl(siteRules, ".app-topbar", "background"), "var(--emerald-chrome)");

const headerBody = lastBody(siteRules, ".site-header");
t.ok("the old translucent header is gone", !/rgba\(2\d\d,\s*2\d\d,\s*2\d\d/.test(headerBody), headerBody.slice(0, 80));
t.ok("no backdrop blur is left on it", !/backdrop-filter:\s*(saturate|blur)/.test(headerBody));

/* the announcement strip is part of the same block of colour */
t.eq("the topline is transparent, not a second colour", lastDecl(siteRules, ".header-topline", "background"), "transparent");
t.ok("the topline is ruled in gold", /var\(--chrome-rule\)/.test(lastBody(siteRules, ".header-topline")));

/* ---- 2. the trim ---- */
t.ok("a gold rail runs along the header's bottom edge",
  /var\(--gold-edge\)|rgba\(201, 162, 39/.test(lastBody(siteRules, ".site-header::before")));
t.ok("a gold rail runs along the footer's top edge",
  /rgba\(201, 162, 39/.test(read("assets/css/styles.css").slice(read("assets/css/styles.css").indexOf(".site-footer {"))));

/* ---- 3. everything on the bar reads on emerald ---- */
function lum(hex) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
  const f = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrast(a, b) {
  const la = lum(a);
  const lb = lum(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
const stops = ["#06302c", "#04211f", "#041716"];
const text = {
  "nav link": token("--chrome-text"),
  "nav hover": token("--chrome-text-strong"),
  "topline": token("--chrome-muted-text"),
  "active item": "#f2e3b6"
};
Object.keys(text).forEach((name) => {
  const colour = text[name];
  const worst = Math.min.apply(null, stops.map((s) => contrast(colour, s)));
  t.ok(name + " is readable on the emerald", worst >= 4.5, (colour || "?") + " at " + worst.toFixed(2) + ":1");
});

t.ok("nav links use the chrome text", /color:\s*var\(--chrome-text\)/.test(lastBody(siteRules, ".nav-link")));
t.ok("the active item is gold", /var\(--gold-200\)/.test(lastBody(siteRules, ".nav-link.is-active")));
t.ok("nav hover lifts to near-white", /var\(--chrome-text-strong\)/.test(lastBody(siteRules, ".nav-link:hover")));

/* the Apply menu is an emerald panel with the gold hairline */
const dd = lastBody(siteRules, ".nav-dd-menu");
t.ok("the Apply menu is emerald", /linear-gradient\(168deg, #072d28/.test(dd));
t.ok("the Apply menu carries the gold edge", /var\(--gold-edge\) border-box/.test(dd));
t.ok("the Apply menu's links are light", /color:\s*var\(--chrome-text\)/.test(lastBody(siteRules, ".nav-dd-menu a")));

/* the controls on the bar */
[".site-header .btn--ghost", ".site-header .btn--line-gold", ".nav-toggle", ".nav-toggle span", ".header-nav a"]
  .forEach((sel) => {
    const body = lastBody(siteRules, sel);
    t.ok(sel + " is restated for the dark bar", !!body && /255, 255, 255|chrome|246, 236, 196/.test(body), body.slice(0, 60));
  });

/* the mobile drawer continues the same colour */
t.ok("the mobile drawer uses the chrome token", /@media \(max-width: 960px\)[\s\S]{0,400}background:\s*var\(--emerald-chrome\)/.test(site));

/* ---- 4. the lockup on every page ---- */
const pages = fs.readdirSync(ROOT).filter((f) => f.endsWith(".html"));
const withHeader = pages.filter((f) => /<header class="site-header">/.test(read(f)));
t.ok("every page with a site header was found", withHeader.length >= 38, withHeader.length + " pages");

const darkLogo = withHeader.filter((f) => {
  const s = read(f);
  const m = /<header class="site-header">[\s\S]*?<\/header>/.exec(s);
  return m && /assets\/img\/logo-full\.svg/.test(m[0]);
});
t.eq("no page keeps the dark lockup in the header", darkLogo.join(", "), "");

const noLogo = withHeader.filter((f) => {
  const m = /<header class="site-header">[\s\S]*?<\/header>/.exec(read(f));
  return !m || !/logo-full-light\.svg/.test(m[0]);
});
t.eq("every header uses the light lockup", noLogo.join(", "), "");

/* ---- 5. the console's bar is the console's footer ---- */
const adminCss = admin.slice(admin.indexOf("<style>"), admin.indexOf("</style>"));
const adminRules = rules(adminCss);
t.eq("console top bar paints with --chrome", lastDecl(adminRules, ".topbar", "background"), "var(--chrome)");
t.eq("console footer paints with --chrome", lastDecl(adminRules, ".foot", "background"), "var(--chrome)");
t.ok("console top bar text is the chrome text", /color:var\(--chrome-txt\)/.test(lastBody(adminRules, ".topbar")));
t.ok("the console header uses the light lockup",
  /class="brand-logo" src="assets\/img\/logo-full-light\.svg"/.test(admin));
t.ok("the console search field is glass on emerald",
  /\.topsearch\{[^}]*rgba\(255,255,255,\.10\)/.test(adminCss));
t.ok("the console's buttons are light on the bar",
  /\.topbar \.btn\{[^}]*rgba\(255,255,255,\.08\)/.test(adminCss));

/* ---- 6. the dashboard's account chip sits on the same bar ---- */
const chip = lastBody(siteRules, ".app-topbar .profile-btn");
const chipName = lastBody(siteRules, ".app-topbar .profile-btn .profile-name");
const chipMail = lastBody(siteRules, ".app-topbar .profile-btn .profile-name small");
t.ok("the dashboard account chip is glass on emerald",
  /background:\s*rgba\(255,\s*255,\s*255,\s*0?\.1\)/.test(chip));
t.ok("the dashboard account chip's name reads light",
  /color:\s*var\(--chrome-text-strong\)/.test(chipName));
t.ok("the dashboard account chip's caption is muted chrome",
  /color:\s*var\(--chrome-muted-text\)/.test(chipMail));

/* ---- 7. the bar's small controls follow the bar ---- */
const search = lastBody(siteRules, ".app-search input");
const iconBtn = lastBody(siteRules, ".app-topbar .icon-btn-lg");
const sync = lastBody(siteRules, ".app-topbar .app-sync");
const bell = lastBody(siteRules, ".app-topbar .bell-dot");
t.ok("the dashboard search is glass on emerald",
  /background:\s*rgba\(255,\s*255,\s*255,\s*0?\.1\)/.test(search) &&
  /color:\s*var\(--chrome-text-strong\)/.test(search));
t.ok("the top bar's icon buttons read light",
  /color:\s*var\(--chrome-text-strong\)/.test(iconBtn));
t.ok("the sync chip is glass, not a white label",
  /background:\s*rgba\(255,\s*255,\s*255,\s*0?\.1\)/.test(sync));
t.ok("the notification dot is ringed in the emerald, not white",
  /border-color:\s*#04211f/.test(bell));

/* =====================================================================
   8. every inner page opens on the same band — page heroes, receipts,
      statements, the auth cards and every downloaded document
   ===================================================================== */
const ui = read("assets/js/ui.js");
const allPages = fs.readdirSync(ROOT).filter((f) => f.endsWith(".html"));

t.eq("the page band paints with the same emerald token",
  lastDecl(siteRules, ".page-hero", "background"), "var(--emerald-chrome)");
t.ok("the page band carries the gold rail",
  /linear-gradient\(90deg/.test(lastBody(siteRules, ".page-hero::after")));
t.ok("the page band's kicker is gold",
  /color:\s*var\(--gold-200\)/.test(lastBody(siteRules, ".page-hero .eyebrow")));
t.ok("the page band's headings are near-white",
  /color:\s*var\(--chrome-text-strong\)/.test(lastBody(siteRules, ".page-hero h1,.page-hero h2") ||
    lastBody(siteRules, ".page-hero h1, .page-hero h2") ||
    lastBody(siteRules, ".page-hero h1") + lastBody(siteRules, ".page-hero h2")));

t.eq("the receipt and document band paints with the same emerald token",
  lastDecl(siteRules, ".doc-head", "background"), "var(--emerald-chrome)");
t.ok("the document band prints in colour",
  /print-color-adjust:\s*exact/.test(lastBody(siteRules, ".doc-head")));
t.ok("the document band's kicker is gold",
  /color:\s*var\(--gold-200\)/.test(lastBody(siteRules, ".doc-head__kicker")));
t.ok("the document band's title is near-white",
  /color:\s*var\(--chrome-text-strong\)/.test(lastBody(siteRules, ".doc-head__title")));
t.ok("the auth card joins the band without a white shoulder",
  /border-top-left-radius:\s*0/.test(lastBody(siteRules, ".doc-head + .auth-card")));
t.ok("print keeps the band coloured",
  /@media print[\s\S]{0,400}background:\s*var\(--emerald-chrome\) !important/.test(site));

/* the insight article's band */
t.eq("the article band paints the emerald token",
  lastDecl(siteRules, ".article-hero", "background"), "transparent");
t.ok("the article band is painted full width",
  /width:\s*100vw/.test(lastBody(siteRules, ".article-hero::before")));
t.ok("the article band carries the gold rail",
  /linear-gradient\(90deg/.test(lastBody(siteRules, ".article-hero::after")));
t.ok("the article title reads near-white",
  /color:\s*var\(--chrome-text-strong\)/.test(lastBody(siteRules, ".article-hero h1")));
t.ok("the article standfirst reads on the band",
  /color:\s*var\(--chrome-text\)/.test(lastBody(siteRules, ".article-hero .article-dek")));

/* Every page opens on a coloured band. The exceptions are the surfaces that
   are not pages in that sense: the home hero (its own composition), the two
   dashboards, the two redirect stubs, the diagnostic page and the 404. */
const NO_BAND = ["index.html", "admin.html", "dashboard.html", "portal.html",
  "products.html", "system-check.html", "404.html"];
const noBand = allPages.filter((f) => {
  if (NO_BAND.indexOf(f) > -1) return false;
  const body = read(f);
  return !/class="[^"]*\bpage-hero\b/.test(body) &&
    !/class="[^"]*\bdoc-head\b/.test(body) &&
    !/class="[^"]*\barticle-hero\b/.test(body);
});
t.eq("every content page opens on a coloured band", noBand.join(", "), "");

/* the auth pages put the platform lockup on that band */
const authPages = ["login.html", "register.html", "verify.html", "forgot-password.html", "reset-password.html"];
const badAuth = authPages.filter((f) => {
  const body = read(f);
  return !/doc-head--compact/.test(body) ||
    !/doc-head[\s\S]{0,400}logo-full-light\.svg/.test(body);
});
t.eq("all five auth pages carry the light lockup on the band", badAuth.join(", "), "");

/* the shared document header cannot drift from the stylesheet */
t.ok("the shared document header emits the band class", /'<div class="doc-head'/.test(ui));
t.ok("the shared document header carries the light lockup",
  /logo-full-light\.svg/.test(ui) && /inlineLockup\(/.test(ui));
t.ok("downloaded documents carry the emerald band",
  /linear-gradient\(165deg,#06302c 0%,#04211f 62%,#041716 100%\)/.test(ui));
t.ok("downloaded documents print their band",
  /print-color-adjust:exact/.test(ui));
t.ok("downloaded documents carry the gold rail",
  /#f6ecc4 50%/.test(ui));

/* ---- 9. print keeps the page readable ---- */
t.ok("print strips the header colour", /@media print\{\s*\.site-header, \.app-topbar \{ background: #fff/.test(site.replace(/\n\s*/g, " ")) ||
  /\.site-header, \.app-topbar \{ background: #fff/.test(site));

process.exit(t.done() ? 0 : 1);
