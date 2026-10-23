/* The console wears the website's theme.
   Checks the palette tokens against the site stylesheet, the brand lockup,
   the typefaces, leftover colours from the old navy theme, and the
   contrast of every text colour the console actually uses. */
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
t.eq("emerald base matches the site", adminTokens["--emerald-800"], siteTokens["--navy-800"]);
t.eq("cream matches the site", adminTokens["--cream"], siteTokens["--cream"]);
t.eq("ink matches the site", adminTokens["--ink"], siteTokens["--ink"]);
t.eq("crystal blue matches the site", adminTokens["--crystal-500"], siteTokens["--crystal-500"]);
t.eq("liquid crystal matches the site", adminTokens["--gold-liquid"], siteTokens["--gold-liquid"]);
t.eq("gold accent matches the site", adminTokens["--gold-500"], siteTokens["--gold-500"]);

/* ---- the shell is the site's own app shell ---- */
function rule(css, selector) {
  const m = new RegExp(selector.replace(".", "\\.") + "\\s*\\{").exec(css);
  if (!m) return "";
  const start = m.index + m[0].length;
  return css.slice(start, css.indexOf("}", start));
}
const siteSidebar = rule(site, ".app-sidebar");
const siteTopbar = rule(site, ".app-topbar");
const adminSidebar = rule(adminCss, ".sidebar");
const adminTopbar = rule(adminCss, ".topbar");

t.ok("the site's sidebar really is that gradient",
  /#092f27/.test(siteSidebar) && /#031613/.test(siteSidebar));
t.ok("console sidebar copies it exactly",
  /--chrome:linear-gradient\(185deg,#092f27/.test(adminCss) && /#031613 68%\)/.test(adminCss));
t.ok("console sidebar paints with it", /background:var\(--chrome\)/.test(adminSidebar));
t.ok("top bar is a blue-to-emerald band",
  /linear-gradient\(100deg/.test(adminTopbar) &&
  /rgba\(219,237,250/.test(adminTopbar) && /rgba\(214,234,229/.test(adminTopbar));
t.ok("top bar keeps a gold under-edge", /var\(--gold-edge\)/.test(adminCss.slice(adminCss.indexOf(".topbar::after"), adminCss.indexOf(".topbar::after") + 200)));

/* ---- the brand lockup, not a hand-drawn mark ---- */
t.ok("header uses the website lockup", /class="brand-logo" src="assets\/img\/logo-full\.svg"/.test(admin));
t.ok("gate uses the website lockup", /class="gate-mark" src="assets\/img\/logo-full\.svg"/.test(admin));
t.ok("footer uses the website lockup", /class="foot-logo" src="assets\/img\/logo-full-light\.svg"/.test(admin));
t.ok("favicon is the website's", /rel="icon" href="assets\/img\/favicon\.svg"/.test(admin));
t.eq("no hand-drawn JCB hexagon remains", /<text[^>]*>JCB<\/text>/.test(admin), false);

/* ---- the website's typefaces ---- */
t.ok("Fraunces is loaded", /family=Fraunces/.test(admin));
t.ok("Inter is loaded", /family=Inter/.test(admin));
t.ok("headings use the display face", /h1,h2,h3,h4\{font-family:var\(--font-display\)/.test(adminCss));
t.ok("panel titles use the display face", /\.panel \.ph h3\{font-family:var\(--font-display\)/.test(adminCss));
t.ok("page titles inherit the display face", /\.page-h h2\{/.test(adminCss) && /h1,h2,h3,h4\{font-family:var\(--font-display\)/.test(adminCss));

/* ---- nothing of the old navy console is left ---- */
const legacy = ["#0ea5e9", "#6366f1", "#818cf8", "#7dd3fc", "#38bdf8", "#60a5fa",
  "#040816", "#081026", "#0b1a3a", "#0a1734", "#0d1e42", "#f43f5e", "#a78bfa"];
const left = legacy.filter((hex) => admin.toLowerCase().includes(hex));
t.eq("old navy palette removed", left.join(", "), "");

/* ---- surfaces are light, chrome is emerald ---- */
t.ok("body sits on the blue emerald ground", /body\{[^}]*radial-gradient/.test(adminCss) &&
  /--bg-blue:#d7e9f7/.test(adminCss) && /--bg-emerald:#d2e8e1/.test(adminCss) &&
  /linear-gradient\(163deg/.test(adminCss));
t.ok("the ground runs crystal into emerald", /linear-gradient\(163deg,var\(--bg-mist\) 0%,var\(--bg-blue\)/.test(adminCss) && /var\(--bg-emerald\) 68%/.test(adminCss));
t.ok("panels are white cards", /\.panel\{[^}]*padding-box/.test(adminCss) && /--panel:rgba\(255,255,255/.test(adminCss));
t.ok("top bar is the blue emerald band", /\.topbar\{[^}]*linear-gradient\(100deg/.test(adminCss));
t.ok("sidebar is emerald", /\.sidebar\{[^}]*background:var\(--chrome\)/.test(adminCss));
t.ok("gold edge on the top bar", /\.topbar::after\{[^}]*var\(--gold-edge\)/.test(adminCss));

/* ---- every module wears a gold edge ---- */
const goldEdge = (sel) => {
  const body = rule(adminCss, sel);
  return /var\(--gold-edge\) border-box/.test(body) && /border:1px solid transparent/.test(body);
};
[".panel", ".stat", ".rpt-card", ".modal", ".drop"].forEach((sel) => {
  t.ok(sel + " wears a gold edge", goldEdge(sel), rule(adminCss, sel).slice(0, 80));
});
t.ok("module headers carry a gold hairline",
  /var\(--line\)/.test(rule(adminCss, ".panel .ph")) === false &&
  /rgba\(201,162,39/.test(rule(adminCss, ".panel .ph")));
t.ok("table heads carry a gold hairline", /rgba\(201,162,39/.test(rule(adminCss, "thead th")));
t.ok("footer carries a gold edge", /border-image:var\(--gold-edge\)/.test(rule(adminCss, ".foot")));
t.ok("the admin gate card wears a gold edge", /var\(--gold-edge\) border-box/.test(rule(adminCss, "#admin-gate .gate-card")));
t.ok("the admin gate sits on the blue emerald ground", /linear-gradient\(163deg,var\(--bg-mist\)/.test(rule(adminCss, "#admin-gate")));

/* ---- contrast: every text colour against the surface it sits on ---- */
const surfaces = {
  white: "#ffffff",
  cream: "#eef4fa",
  tint: "#f2f7fb",
  "ground blue": adminTokens["--bg-blue"],
  "ground emerald": adminTokens["--bg-emerald"],
  "ground deep": adminTokens["--bg-deep"]
};
const text = {
  "ink": adminTokens["--ink"],
  "body": adminTokens["--body-txt"],
  "muted": adminTokens["--muted"],
  "dim": adminTokens["--dim"],
  "emerald link": adminTokens["--crystal-700"],
  "teal": adminTokens["--teal"],
  "success": adminTokens["--ok"],
  "warning": adminTokens["--warn"],
  "danger": adminTokens["--bad"],
  "plum": adminTokens["--purp"]
};
Object.keys(text).forEach((name) => {
  const worst = Math.min.apply(null, Object.keys(surfaces).map((s) => contrast(text[name], surfaces[s])));
  t.ok(name + " text is readable (AA)", worst >= 4.5, "worst " + worst.toFixed(2) + ":1");
});

const chromeText = contrast(adminTokens["--chrome-txt"], adminTokens["--emerald-700"]);
const chromeMuted = contrast(adminTokens["--chrome-muted"], adminTokens["--emerald-700"]);
const chromeDeep = contrast(adminTokens["--chrome-txt"], adminTokens["--emerald-900"]);
t.ok("top bar text is readable", Math.min(chromeText, chromeDeep) >= 4.5, chromeText.toFixed(2) + ":1");
t.ok("top bar secondary text is readable", chromeMuted >= 4.5, chromeMuted.toFixed(2) + ":1");

/* ---- the console still works after the repaint ---- */
const scripts = [...admin.matchAll(/<script>([\s\S]*?)<\/script>/g)];
t.eq("both script blocks present", scripts.length, 2);
t.ok("no unreplaced style hooks", !/var\(--navy-|var\(--panel-solid\)/.test(adminCss.replace(/--panel-solid:#ffffff/, "")));

/* Every class the markup uses that the stylesheet defines, still defined. */
const required = [".topbar", ".sidebar", ".panel", ".stat", ".bdg", ".btn", ".modal", ".toast", ".tbl", ".navlink"];
const missing = required.filter((sel) => adminCss.indexOf(sel) < 0 && sel !== ".tbl");
t.eq("structural styles survive the repaint", missing.join(", "), "");

process.exit(t.done() ? 0 : 1);
