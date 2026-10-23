/* Premium surfaces — the white-card pass.
   -----------------------------------------------------------------------
   The public site and both dashboards share assets/css/styles.css. This
   suite checks the *cascade*, not just the presence of a rule: for every
   module that used to be flat white, it walks the stylesheet in order and
   asserts the last background that applies to it is the pearl surface with
   a gold hairline. That is what stops a later rule from quietly putting a
   page back to plain #fff.
   Also checks the console (admin.html), which has its own stylesheet.
   ========================================================================= */
"use strict";

const fs = require("fs");
const path = require("path");
const { ROOT, reporter } = require("./lib");

const t = reporter("[premium surfaces — website and dashboards]");

/* Runs even if setup throws, so a broken file shows as failures, not a stack. */
let site = "";
let admin = "";
try {
  site = fs.readFileSync(path.join(ROOT, "assets/css/styles.css"), "utf8");
  admin = fs.readFileSync(path.join(ROOT, "admin.html"), "utf8");
} catch (e) {
  t.ok("stylesheets readable", false, String(e && e.message));
}

/* ---- a small CSS reader: comments out, @media blocks skipped ----
   @media is skipped on purpose: the print rules deliberately flatten the
   cards back to white, and that is correct, not a regression. */
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
    const selectors = m[1].split(",").map((s) => s.trim()).filter(Boolean);
    out.push({ selectors, body: m[2], index: m.index });
  }
  return out;
}

const siteRules = rules(site);
const adminCss = admin.slice(admin.indexOf("<style>"), admin.indexOf("</style>"));
const adminRules = rules(adminCss);

/* Last declaration of `prop` for an exact selector, in cascade order. */
function lastDecl(list, selector, prop, opts) {
  const want = opts && opts.exact === false ? null : selector;
  let found = null;
  list.forEach((r) => {
    const hit = want
      ? r.selectors.indexOf(want) >= 0
      : r.selectors.some((s) => s.indexOf(selector) >= 0);
    if (!hit) return;
    const m = new RegExp("(?:^|;)\\s*" + prop + "\\s*:\\s*([^;]+)", "i").exec(r.body);
    if (m) found = { value: m[1].trim(), index: r.index, body: r.body };
  });
  return found;
}

function hasToken(css, name) {
  return new RegExp(name.replace(/-/g, "\\-") + "\\s*:").test(css);
}

/* ---- 1. the token set ---- */
["--premium-surface", "--premium-surface-soft", "--premium-hair", "--premium-shadow", "--premium-inset", "--pearl"].forEach((tok) => {
  t.ok("site defines " + tok, hasToken(site, tok));
});

/* ---- 2. the page ground is no longer flat cream ---- */
const bodyBg = lastDecl(siteRules, "body", "background");
t.ok("body background is layered", !!bodyBg && /radial-gradient/.test(bodyBg.value) && /linear-gradient/.test(bodyBg.value),
  bodyBg ? bodyBg.value.slice(0, 60) : "missing");
t.ok("body background is not plain var(--cream)", !!bodyBg && !/^var\(--cream\)$/.test(bodyBg.value));

/* ---- 3. every module's *winning* background is the pearl surface ---- */
const modules = [
  ".card", ".product-card", ".form-card", ".auth-card", ".calc-panel", ".stat-card",
  ".loan-card", ".doc-card", ".summary-card", ".review-box", ".live-blog", ".app-panel",
  ".table-wrap", ".metric", ".schedule-card", ".modal-card", ".app-modal-card",
  ".legal-body", ".dash-nav", ".post-card", ".price-card", ".step", ".live-archive-card"
];
modules.forEach((sel) => {
  const bg = lastDecl(siteRules, sel, "background");
  t.ok(sel + " sits on the pearl surface",
    !!bg && /var\(--premium-surface\)/.test(bg.value) && /border-box/.test(bg.value),
    bg ? bg.value.slice(0, 70) : "no background rule");
  const border = lastDecl(siteRules, sel, "border");
  t.ok(sel + " has a transparent border for the gold hairline",
    !!border && /1px solid transparent/.test(border.value), border ? border.value : "missing");
});

const softModules = [
  ".contact-item", ".help-tile", ".support-option", ".quick-action", ".doc-item",
  ".admin-item", ".bell-panel", ".profile-panel", ".toast", ".segmented", ".onb-method"
];
softModules.forEach((sel) => {
  const bg = lastDecl(siteRules, sel, "background");
  t.ok(sel + " gets the quieter premium surface",
    !!bg && /var\(--premium-surface-soft\)/.test(bg.value), bg ? bg.value.slice(0, 60) : "missing");
});

/* ---- 4. the premium layer really is the last word ---- */
const premiumAt = site.indexOf("THEME v6");
t.ok("the premium layer exists", premiumAt > 0);
const flatWhiteLeft = siteRules.filter((r) => r.index > premiumAt &&
  r.selectors.length === 1 && modules.indexOf(r.selectors[0]) >= 0 &&
  /background\s*:\s*(#fff|#ffffff|white|var\(--paper\))/i.test(r.body));
t.eq("nothing after the premium layer re-flattens a module", flatWhiteLeft.map((r) => r.selectors[0]).join(", "), "");

/* ---- 4d. severity stripes are not flattened by the surface rule ---- */
[["--success", ".toast--success"], ["--danger", ".toast--danger"]].forEach(([tok, sel]) => {
  const r = lastDecl(siteRules, sel, "border-left-color");
  t.ok(sel + " keeps its severity stripe", !!r && r.value.indexOf("var(" + tok + ")") >= 0,
    r ? r.value : "missing");
});

/* ---- 5. dark variants survive the sweep ---- */
const darks = {
  ".card--dark": "#0a373a",
  ".card--feature": "#0a373a",
  ".price-card--featured": "#06262a",
  ".product-card--featured": "#0b3c32",
  ".stat-card--accent": "#0f4e42"
};
Object.keys(darks).forEach((sel) => {
  const bg = lastDecl(siteRules, sel, "background");
  t.ok(sel + " stays dark", !!bg && bg.value.indexOf(darks[sel]) >= 0 && /var\(--gold-edge\)/.test(bg.value),
    bg ? bg.value.slice(0, 70) : "missing");
});

/* ---- 6. inputs sit inside the surface ---- */
[".field input", ".field select", ".field textarea"].forEach((sel) => {
  const bg = lastDecl(siteRules, sel, "background");
  t.ok(sel + " is a pearl control", !!bg && /linear-gradient/.test(bg.value), bg ? bg.value.slice(0, 50) : "missing");
});

/* ---- 7. dashboards: shell and tables ---- */
t.ok("dashboard top bar is the app chrome", (() => {
  const bg = lastDecl(siteRules, ".app-topbar", "background");
  return !!bg && /var\(--emerald-chrome\)/.test(bg.value);
})());
t.ok("panel heads carry a gold rule", (() => {
  const r = lastDecl(siteRules, ".app-panel .app-panel-head", "border-bottom", { exact: false });
  return !!r && /rgba\(166,\s*124,\s*26/.test(r.value);
})());
t.ok("table heads carry a gold rule", (() => {
  const r = lastDecl(siteRules, ".table-wrap thead th", "border-bottom", { exact: false });
  return !!r && /rgba\(166,\s*124,\s*26/.test(r.value);
})());
t.ok("table rows keep a soft stripe", /\.table-wrap tbody tr:nth-child\(even\)\s*\{[^}]*background/.test(site));

/* ---- 8. the console wears the same pearl ---- */
["--premium-surface", "--premium-shadow", "--premium-inset"].forEach((tok) => {
  t.ok("console defines " + tok, hasToken(adminCss, tok));
});
[".panel", ".stat", ".rpt-card", ".modal", ".drop"].forEach((sel) => {
  const bg = lastDecl(adminRules, sel, "background");
  t.ok("console " + sel + " sits on the pearl surface",
    !!bg && /var\(--premium-surface\)/.test(bg.value) && /var\(--gold-edge\)/.test(bg.value),
    bg ? bg.value.slice(0, 70) : "missing");
});
const gate = lastDecl(adminRules, "#admin-gate .gate-card", "background");
t.ok("console gate card sits on the pearl surface", !!gate && /var\(--premium-surface\)/.test(gate.value));

/* ---- 9. contrast on the deepest pearl stop ---- */
function lum(hex) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
  const f = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrast(a, b) {
  const la = lum(a), lb = lum(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
const token = (name) => {
  const m = new RegExp(name.replace(/-/g, "\\-") + "\\s*:\\s*(#[0-9a-fA-F]{3,6})").exec(site);
  return m ? m[1].toLowerCase() : null;
};
const deepestPearl = "#f1f8fc";
[["--ink", "ink"], ["--body", "body"], ["--muted", "muted"]].forEach(([tok, label]) => {
  const c = token(tok);
  const ratio = c ? contrast(c, deepestPearl) : 0;
  t.ok(label + " text reads on the deepest pearl (AA)", ratio >= 4.5, ratio.toFixed(2) + ":1");
});

process.exit(t.done() ? 0 : 1);
