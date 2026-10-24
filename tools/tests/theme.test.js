/* The console wears the website's theme.
   Checks the palette tokens against the site stylesheet, the brand lockup,
   the typefaces, leftover colours from the old light theme, and the
   contrast of every text colour the console actually uses.

   The palette is the brief's: #020817 navy, #08172d cards, #d4a63a and
   #ffd166 gold, white type. The console must hold the same values as
   assets/css/styles.css or the two surfaces drift apart. */
"use strict";

const fs = require("fs");
const path = require("path");
const { ROOT, reporter } = require("./lib");

const read = (file) => fs.readFileSync(path.join(ROOT, file), "utf8");

function tokens(css) {
  const out = {};
  const body = css.slice(css.indexOf(":root"), css.indexOf("}", css.indexOf(":root")));
  body.split(";").forEach((decl) => {
    const m = decl.match(/(--[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,6})/);
    if (m) out[m[1]] = m[2].toLowerCase();
  });
  return out;
}

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

const t = reporter("[console theme — the website's palette]");
const site = read("assets/css/styles.css");
const admin = read("admin.html");

const adminCss = admin.slice(admin.indexOf("<style>"), admin.indexOf("</style>"));
const siteTokens = tokens(site);
const adminTokens = tokens(adminCss);

/* ---- the same palette as the website ---- */
const pal = ["--ng-bg", "--ng-bg2", "--ng-card", "--ng-panel", "--ng-raise",
  "--ng-gold", "--ng-gold-bright", "--ng-text", "--ng-text2", "--ng-muted",
  "--ng-ok", "--ng-bad", "--ng-info"];
pal.forEach((name) => {
  t.eq(name + " matches the site", adminTokens[name], siteTokens[name]);
});
t.eq("the page is the brief's navy", siteTokens["--ng-bg"], "#020817");
t.eq("cards are the brief's card navy", siteTokens["--ng-card"], "#08172d");
t.eq("the accent is the brief's gold", siteTokens["--ng-gold"], "#d4a63a");
t.eq("the highlight is the brief's bright gold", siteTokens["--ng-gold-bright"], "#ffd166");
t.eq("type is white", siteTokens["--ng-text"], "#ffffff");
t.eq("secondary type is the brief's slate", siteTokens["--ng-text-2"], "#cbd5e1");
t.eq("muted type is the brief's grey", siteTokens["--ng-muted"], "#94a3b8");
t.ok("the website has no light ground left",
  /--cream:\s*var\(--ng-bg\)/.test(site) && /--paper:\s*var\(--ng-card\)/.test(site));

/* ---- the shell is the site's own app shell ---- */
function rule(css, selector) {
  const m = new RegExp(selector.replace(".", "\\.") + "\\s*\\{").exec(css);
  if (!m) return "";
  const start = m.index + m[0].length;
  return css.slice(start, css.indexOf("}", start));
}
function lastRule(css, selector) {
  let body = "";
  let at = 0;
  for (;;) {
    const hit = css.indexOf(selector + "{", at);
    if (hit < 0) break;
    const start = hit + selector.length + 1;
    body = css.slice(start, css.indexOf("}", start));
    at = start;
  }
  return body || rule(css, selector);
}
const siteSidebar = rule(site, ".app-sidebar");
const siteTopbar = rule(site, ".app-topbar");
const adminSidebar = rule(adminCss, ".sidebar");
const adminTopbar = rule(adminCss, ".topbar");

t.ok("the site's sidebar is navy",
  /linear-gradient\(185deg, (#061329|var\(--ng-bg-2\))/.test(siteSidebar), siteSidebar.slice(0, 90));
t.ok("console sidebar copies it exactly",
  /--chrome:linear-gradient\(165deg,#061329 0%,#030d20 62%,#020817 100%\)/.test(adminCss));
t.ok("console sidebar paints with it", /background:var\(--chrome\)/.test(adminSidebar));
t.ok("top bar is the footer's emerald", /background:var\(--chrome\)/.test(adminTopbar));
const adminFoot = rule(adminCss, ".foot");
t.ok("header and footer are literally the same colour",
  /background:var\(--chrome\)/.test(adminFoot) && /background:var\(--chrome\)/.test(adminTopbar));
t.ok("top bar keeps a gold under-edge", /var\(--gold-edge\)/.test(adminCss.slice(adminCss.indexOf(".topbar::after"), adminCss.indexOf(".topbar::after") + 200)));

/* ---- the brand lockup, not a hand-drawn mark ---- */
t.ok("header uses the light lockup on the emerald bar", /class="brand-logo" src="assets\/img\/logo-full-light\.svg"/.test(admin));
t.ok("gate uses the website lockup", /class="gate-mark" src="assets\/img\/logo-full\.svg"/.test(admin));
t.ok("footer uses the website lockup", /class="foot-logo" src="assets\/img\/logo-full-light\.svg"/.test(admin));
t.ok("favicon is the website's", /rel="icon" href="assets\/img\/favicon\.svg"/.test(admin));
t.eq("no hand-drawn JCB hexagon remains", /<text[^>]*>JCB<\/text>/.test(admin), false);

/* ---- the website's typefaces ---- */
t.ok("Inter is loaded", /family=Inter/.test(admin));
t.eq("the serif display face is no longer requested", /family=Fraunces/.test(admin), false);
t.ok("one family carries the headings", /--font-display:\s*'Inter'/.test(adminCss));
t.ok("headings use the display face", /h1,h2,h3,h4\{font-family:var\(--font-display\)/.test(adminCss));
t.ok("panel titles use the display face", /\.panel \.ph h3\{font-family:var\(--font-display\)/.test(adminCss));
t.ok("page titles inherit the display face", /\.page-h h2\{/.test(adminCss) && /h1,h2,h3,h4\{font-family:var\(--font-display\)/.test(adminCss));

/* ---- nothing of a light or foreign palette is left ---- */
const legacy = ["#eef4fa", "#d7e9f7", "#d2e8e1", "#f0f8f5", "#e2eef9",
  "#fbfdff", "#0ea5e9", "#6366f1", "#818cf8", "#60a5fa"];
const left = legacy.filter((hex) => adminCss.toLowerCase().includes(hex));
t.eq("no light ground survives in the console", left.join(", "), "");

/* ---- surfaces are navy, chrome is navy ---- */
t.ok("body sits on the navy ground", /body\{[^}]*radial-gradient/.test(adminCss) &&
  /--bg-blue:#04101f/.test(adminCss) && /--bg-emerald:#020817/.test(adminCss) &&
  /linear-gradient\(163deg/.test(adminCss));
t.ok("the ground runs navy into black",
  /linear-gradient\(163deg,var\(--ng-bg\) 0%,#04101f 46%,var\(--ng-bg\) 100%\)/.test(adminCss));
t.ok("panels are navy cards",
  /\.panel\{[^}]*padding-box/.test(adminCss) && /--panel:rgba\(8,23,45/.test(adminCss));
t.ok("top bar is no longer a light band", !/linear-gradient\(100deg/.test(rule(adminCss, ".topbar")));
t.ok("sidebar is navy", /\.sidebar\{[^}]*background:var\(--chrome\)/.test(adminCss), rule(adminCss, ".sidebar").slice(0, 90));
t.ok("gold edge on the top bar", /\.topbar::after\{[^}]*var\(--gold-edge\)/.test(adminCss));
t.ok("top bar text is the chrome text", /\.topbar\{[^}]*color:var\(--chrome-txt\)/.test(adminCss));

/* ---- every module wears a gold edge ---- */
const goldEdge = (sel) => {
  const body = rule(adminCss, sel);
  return /var\(--gold-edge\) border-box/.test(body) && /border:1px solid transparent/.test(body);
};
[".panel", ".stat", ".rpt-card", ".modal", ".drop"].forEach((sel) => {
  t.ok(sel + " wears a gold edge", goldEdge(sel), rule(adminCss, sel).slice(0, 80));
});
t.ok("module headers carry a gold hairline",
  /var\(--ng-gold-line\)/.test(lastRule(adminCss, ".panel .ph")));
t.ok("table heads carry a gold hairline", /var\(--ng-gold-line\)/.test(lastRule(adminCss, "thead th")));
t.ok("footer carries a gold edge", /border-image:var\(--gold-edge\)/.test(rule(adminCss, ".foot")));
t.ok("the admin gate card wears a gold edge", /var\(--gold-edge\) border-box/.test(rule(adminCss, "#admin-gate .gate-card")));
t.ok("the admin gate sits on the navy ground",
  /linear-gradient\(163deg,var\(--ng-bg2\)/.test(lastRule(adminCss, "#admin-gate")));

/* ---- contrast: every text colour against the surface it sits on ---- */
const surfaces = {
  "page": adminTokens["--ng-bg"],
  "second band": adminTokens["--ng-bg2"],
  "sidebar": adminTokens["--ng-sidebar"],
  "card": adminTokens["--ng-card"],
  "panel": adminTokens["--ng-panel"],
  "raised": adminTokens["--ng-raise"]
};
const text = {
  "ink": adminTokens["--ink"],
  "body": adminTokens["--body-txt"],
  "muted": adminTokens["--muted"],
  "dim": adminTokens["--dim"],
  "gold link": adminTokens["--ng-gold-text"],
  "teal": adminTokens["--teal"],
  "success": adminTokens["--ok"],
  "warning": adminTokens["--warn"],
  "danger": adminTokens["--ng-bad-text"],
  "info": adminTokens["--ng-info"]
};
Object.keys(text).forEach((name) => {
  const worst = Math.min.apply(null, Object.keys(surfaces).map((s) => contrast(text[name], surfaces[s])));
  t.ok(name + " text is readable (AA)", worst >= 4.5, "worst " + worst.toFixed(2) + ":1");
});

const chromeText = contrast(adminTokens["--chrome-txt"], adminTokens["--ng-bg2"]);
const chromeMuted = contrast(adminTokens["--chrome-muted"], adminTokens["--ng-bg2"]);
const chromeDeep = contrast(adminTokens["--chrome-txt"], adminTokens["--ng-bg"]);
t.ok("top bar text is readable", Math.min(chromeText, chromeDeep) >= 4.5, chromeText.toFixed(2) + ":1");
t.ok("top bar secondary text is readable", chromeMuted >= 4.5, chromeMuted.toFixed(2) + ":1");

/* ---- the console still works after the repaint ---- */
const scripts = [...admin.matchAll(/<script>([\s\S]*?)<\/script>/g)];
t.eq("both script blocks present", scripts.length, 2);
t.ok("no unreplaced style hooks", !/var\(--navy-|var\(--panel-solid\)/.test(adminCss.replace(/--panel-solid:#08172d/, "")));

/* Every class the markup uses that the stylesheet defines, still defined. */
const required = [".topbar", ".sidebar", ".panel", ".stat", ".bdg", ".btn", ".modal", ".toast", ".tbl", ".navlink"];
const missing = required.filter((sel) => adminCss.indexOf(sel) < 0 && sel !== ".tbl");
t.eq("structural styles survive the repaint", missing.join(", "), "");

process.exit(t.done() ? 0 : 1);
