/* The palette, applied — a cascade audit.
   -----------------------------------------------------------------------
   The brief: a midnight-navy bank with gold trim, white type, and no light
   slab left anywhere. A stylesheet can be read and quoted, but that does
   not prove the *winning* rule for an element is the dark one: a later
   layer, a more specific selector or an inline style can quietly put the
   white card back.

   So this suite does not read declarations. For every element on every
   page it resolves the cascade the way a browser would — match, weigh
   specificity, take the last winner — and then asks three questions:

     1. Is the winning background on this element dark or gold?
     2. Is any text colour that wins on it dark-on-dark?
     3. Does every page still carry the shared theme, the gold trim and
        the brand tagline?

   It resolves var() one hop, so a token that points at a light colour is
   caught even when the rule merely says var(--something).
   ========================================================================= */
"use strict";

const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");
const { ROOT, reporter } = require("./lib");

const t = reporter("[palette — midnight navy and gold, everywhere]");

const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

/* ---------------- colour maths ---------------- */
function parseHex(hex) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
}
function lum(hex) {
  const [r, g, b] = parseHex(hex).map((v) => v / 255);
  const f = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrast(a, b) {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/* the palette's own idea of "light" */
const PAPER = 0.55;          // anything brighter than this is a white slab
const isLight = (hex) => lum(hex) > PAPER;
/* gold trim, from the deep bar metal to the #ffe7a8 hairline highlight */
const isGold = (hex) => {
  const [r, g, b] = parseHex(hex);
  return r > g && g > b && r - b > 30 && lum(hex) > 0.10 && lum(hex) < 0.95;
};

/* ---------------- the stylesheet, as data ---------------- */
function stripComments(css) { return css.replace(/\/\*[\s\S]*?\*\//g, ""); }

function parseRules(css, sink, media) {
  css = stripComments(css);
  let i = 0;
  while (i < css.length) {
    const brace = css.indexOf("{", i);
    if (brace < 0) break;
    const head = css.slice(i, brace).trim();
    if (head.startsWith("@")) {
      // @media / @supports blocks: parse the inside, remembering the query
      let depth = 0;
      let j = brace;
      for (; j < css.length; j += 1) {
        if (css[j] === "{") depth += 1;
        else if (css[j] === "}") { depth -= 1; if (depth === 0) break; }
      }
      const inner = css.slice(brace + 1, j);
      if (/^@media/.test(head)) parseRules(inner, sink, head.slice(6).trim());
      i = j + 1;
    } else {
      const close = css.indexOf("}", brace);
      sink.push({ selector: head, body: css.slice(brace + 1, close), media: media || null });
      i = close + 1;
    }
  }
}

function declarations(body) {
  const out = {};
  body.split(";").forEach((decl) => {
    const m = /^\s*([a-zA-Z-]+)\s*:\s*([\s\S]+?)\s*$/.exec(decl);
    if (m) out[m[1].toLowerCase()] = m[2];
  });
  return out;
}

function specificity(selector) {
  const ids = (selector.match(/#[\w-]+/g) || []).length;
  const classes = (selector.match(/\.[\w-]+|\[[^\]]+\]|:[\w-]+(?:\([^)]*\))?/g) || [])
    .filter((s) => !/^::/.test(s)).length;
  const elements = (selector.replace(/[#.][\w-]+|\[[^\]]+\]|::?[\w-]+(\([^)]*\))?/g, " ")
    .match(/[a-zA-Z][\w-]*/g) || []).length;
  return ids * 10000 + classes * 100 + elements;
}

const TOKENS = (() => {
  const css = read("assets/css/styles.css");
  const out = {};
  const re = /(--[a-z0-9-]+)\s*:\s*([^;]+);/gi;
  let m;
  while ((m = re.exec(css))) if (!(m[1] in out)) out[m[1]] = m[2].trim();
  return out;
})();

function resolveVar(value) {
  return value.replace(/var\((--[a-z0-9-]+)\)/gi, (_, name) => TOKENS[name] || _);
}

/* every colour in a value, hexes and rgb()s alike.
   A translucent wash (alpha < 0.35) is a highlight, not a surface: the navy
   underneath still shows through, so it is not counted as a slab. */
function coloursIn(value) {
  const out = [];
  (value.match(/#[0-9a-f]{6}\b|#[0-9a-f]{3}\b/gi) || []).forEach((h) => out.push(h.toLowerCase()));
  (value.match(/rgba?\([^)]*\)/gi) || []).forEach((rgb) => {
    const n = rgb.replace(/[^\d.,]/g, "").split(",").map(Number);
    const alpha = n.length > 3 ? n[3] : 1;
    if (alpha < 0.35) return;
    if (n.length >= 3) out.push("#" + n.slice(0, 3).map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join(""));
  });
  return out;
}

/* a white glyph — the hamburger bars, a chevron, a dot — is a stroke, not a
   surface. Only elements that carry their own words count as a slab. */
function carriesText(el) {
  const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0);
  return own;
}

/* ---------------- the winner of a property on an element ---------------- */
function winner(el, rules, prop) {
  let best = null;
  rules.forEach((rule) => {
    if (rule.media && !/min-width|prefers|hover|pointer|max-width/.test(rule.media)) return;
    if (!rule.body.includes(prop + ":")) return;
    rule.selector.split(",").forEach((sel) => {
      sel = sel.trim();
      if (!sel || /::?(before|after|selection|placeholder|marker|first-line)/.test(sel)) return;
      let match = false;
      try { match = el.matches(sel); } catch (e) { match = false; }
      if (!match) return;
      const spec = specificity(sel);
      const decl = declarations(rule.body)[prop];
      if (!decl) return;
      const important = /!important/.test(decl);
      const score = (important ? 1e9 : 0) + spec * 1000 + rule.order;
      if (!best || score >= best.score) best = { score, value: decl.replace(/!important/, "").trim() };
    });
  });
  return best ? best.value : null;
}

/* ---------------- the pages ---------------- */
const PAGES = fs.readdirSync(ROOT).filter((f) => f.endsWith(".html"));

const siteRules = [];
parseRules(read("assets/css/styles.css"), siteRules);
siteRules.forEach((r, i) => { r.order = i; });

const docPreview = /(receipt-modal|print-only|tplPreview|report)/;

let lightSurvivors = [];
let darkOnDark = [];
let noTheme = [];
let scanned = 0;

PAGES.forEach((page) => {
  const dom = new JSDOM(read(page), { url: "http://localhost/" + page });
  const doc = dom.window.document;

  if (!/assets\/css\/styles\.css/.test(read(page)) && page !== "admin.html") noTheme.push(page);

  const rules = siteRules.slice();
  /* the page's own <style> blocks win after the shared sheet */
  doc.querySelectorAll("style").forEach((style) => {
    const local = [];
    parseRules(style.textContent, local);
    local.forEach((r) => { r.order = rules.length; rules.push(r); });
  });
  /* inline style attributes are the last word, as in a browser */
  doc.querySelectorAll("[style]").forEach((el) => {
    const body = el.getAttribute("style");
    const decl = declarations(body);
    const key = {};
    if (decl.background || decl["background-color"]) key.background = decl.background || decl["background-color"];
    if (decl.color) key.color = decl.color;
    if (Object.keys(key).length) el.__inline = key;
  });

  doc.querySelectorAll("body, body *").forEach((el) => {
    if (el.closest("script, style, template, .print-only")) return;
    scanned += 1;
    const tag = el.tagName.toLowerCase();
    if (tag === "meta" || tag === "link" || tag === "br") return;

    const bg = (el.__inline && el.__inline.background) || winner(el, rules, "background") ||
      winner(el, rules, "background-color");
    if (!bg) return;
    const resolved = resolveVar(bg);
    if (/^(none|transparent|inherit|initial)$/i.test(resolved)) return;

    const colours = coloursIn(resolved);
    const light = colours.filter(isLight);
    /* A gold that is only a *metallic highlight* — the #fff3d0 stop in the
       gold rail — is allowed inside a gradient that also carries a solid
       bar-gold stop. Cream, pearl and plain white are never allowed. */
    const barGold = colours.some((c) => {
      const [r, , b] = parseHex(c);
      return r - b > 100;
    });
    const slab = light.filter((c) => {
      if (!isGold(c)) return true;
      const [r, , b] = parseHex(c);
      if (r - b > 55) return false;          // unmistakably gold
      return !(barGold && lum(c) > 0.80);    // a highlight stop inside the rail
    });
    /* A gradient that runs light-to-light is a white slab. A gold wash is
       fine. A document preview is paper on purpose. */
    if (slab.length && (carriesText(el) || /^(div|section|main|article|aside|header|footer|ul|ol|table|form)$/.test(tag))) {
      const classes = el.className && typeof el.className === "string" ? "." + el.className.split(/\s+/).join(".") : "";
      const label = tag + classes;
      if (!docPreview.test(label) && !lightSurvivors.some((x) => x.page === page && x.label === label)) {
        lightSurvivors.push({ page, label, value: resolved.slice(0, 70) });
      }
    }

    /* dark ink on a dark ground */
    const fgRaw = (el.__inline && el.__inline.color) || winner(el, rules, "color");
    if (!fgRaw) return;
    const fg = coloursIn(resolveVar(fgRaw))[0];
    if (!fg) return;
    const own = colours.find((c) => !isGold(c)) || null;
    if (own && !isLight(own) && lum(fg) < 0.5 && contrast(fg, own) < 3 && fg !== own) {
      const label = tag + (el.className && typeof el.className === "string" ? "." + el.className.split(/\s+/).join(".") : "");
      if (!darkOnDark.some((x) => x.page === page && x.label === label)) {
        darkOnDark.push({ page, label, fg, bg: own });
      }
    }
  });

  dom.window.close();
});

t.ok("every page was scanned", scanned > 4000, scanned + " elements");

t.eq("no white slab survives the cascade",
  lightSurvivors.slice(0, 8).map((x) => x.page + " " + x.label).join(" | "), "",
  lightSurvivors.slice(0, 8).map((x) => x.label + " → " + x.value).join(" ; "));

t.eq("no dark ink is left on a dark ground",
  darkOnDark.slice(0, 8).map((x) => x.page + " " + x.label).join(" | "), "",
  darkOnDark.slice(0, 8).map((x) => x.label + " " + x.fg + " on " + x.bg).join(" ; "));

t.eq("every page loads the shared theme", noTheme.join(", "), "");

/* ---------------- the brief, spelled out ---------------- */
const site = read("assets/css/styles.css");
const admin = read("admin.html");
const brand = read("assets/js/theme.js");
const page = read("index.html");

t.ok("the page ground is #020817", /--ng-bg:\s*#020817/i.test(site));
t.ok("the console ground is the same navy", /--ng-bg:#020817/i.test(admin));
t.ok("cards are #08172d", /--ng-card:\s*#08172d/i.test(site) && /--ng-card:#08172d/i.test(admin));
t.ok("the sidebar is #030d20", /--ng-sidebar:\s*#030d20/i.test(site));
t.ok("gold is #d4a63a", /--ng-gold:\s*#d4a63a/i.test(site) && /--ng-gold:#d4a63a/i.test(admin));
t.ok("bright gold is #ffd166", /--ng-gold-bright:\s*#ffd166/i.test(site));
t.ok("type is white, secondary slate, muted grey",
  /--ng-text:\s*#ffffff/i.test(site) && /--ng-text-2:\s*#cbd5e1/i.test(site) && /--ng-muted:\s*#94a3b8/i.test(site));
t.ok("status colours are the brief's green, red and blue",
  /--ng-ok:\s*#22c55e/i.test(site) && /--ng-bad:\s*#ef4444/i.test(site) && /--ng-info:\s*#38bdf8/i.test(site));

/* the header: navy, gold rule, tagline, logo */
t.ok("the header is navy with a gold bottom rule",
  /\.site-header,\s*\.site-header\.is-scrolled\s*\{[^}]*background:\s*var\(--emerald-chrome\)[^}]*border-bottom:\s*1px solid var\(--ng-gold-line\)/i.test(site));
const pagesWithHeader = PAGES.filter((f) => /<header class="site-header">/.test(read(f)));
t.ok("the header carries the tagline's styling hook",
  /\.brand-tag\s*\{[^}]*color:\s*var\(--ng-gold-text\)/i.test(site));
const untagged = pagesWithHeader.filter((f) => !/class="brand-tag">Your Growth, Our Priority</.test(read(f)));
t.eq("every header names the tagline", untagged.join(", "), "");
const footerTagged = PAGES.filter((f) => /class="site-footer"/.test(read(f)) &&
  !/class="brand-tag">Your Growth, Our Priority</.test(read(f)));
t.eq("every footer names the tagline", footerTagged.join(", "), "");
t.eq("the tagline is the brand's", /Your Growth, Our Priority/.test(site), false);

/* buttons */
t.ok("the primary button is the gold gradient with navy type",
  /\.btn--gold\s*\{[^}]*--btn-bg:\s*linear-gradient\(135deg,\s*#d4a63a 0%,\s*#ffd166 100%\)[^}]*--btn-fg:\s*#08131f/i.test(site));
t.ok("the console's primary button is the same gradient",
  /\.btn\.primary\{(background:linear-gradient\(135deg,#d4a63a 0%,#ffd166 100%\)|.*#d4a63a 0%,#ffd166 100%)/.test(admin));
t.ok("the secondary button is gold-bordered",
  /\.btn--ghost,\s*\.btn--line-gold\s*\{[^}]*border:\s*1px solid var\(--ng-gold-line\)/i.test(site));

/* the ground: emerald and liquid crystal in the background only */
t.ok("the emerald and the crystal are declared",
  /--liquid-emerald:\s*#07332f/.test(site) && /--liquid-crystal:\s*#0a3f6b/.test(site));
t.ok("the page ground starts in emerald",
  /linear-gradient\(166deg,\s*#073430 0%,\s*#062b31 30%,\s*#04212f 56%,\s*#03182a 80%,\s*#020817 100%\)/.test(site));
t.ok("the ground is warmed by an emerald glow and cooled by a crystal one",
  /rgba\(16, 185, 129, 0\.20\)/.test(site) && /rgba\(56, 189, 248, 0\.16\)/.test(site));
t.ok("the section bands carry it too",
  /\.section--paper\s*\{[^}]*#07332f/.test(site) && /\.section--cream-dark\s*\{[^}]*#04283b/.test(site));
t.ok("the cards above it are still navy",
  /\.card,[\s\S]{0,600}var\(--premium-surface\)/.test(site));

/* type: one family, asked for once */
t.ok("the site asks for Inter", /family=Inter:wght@400;500;600;700;800/.test(page));
t.eq("the site no longer downloads a second family", /family=Fraunces/.test(page), false);
t.ok("the display token is Inter with a system fallback",
  /--font-display:\s*"Inter",[^;]*system-ui[^;]*sans-serif/.test(site));
t.ok("headings resolve through the display token",
  /h1,\s*h2,\s*h3,\s*h4,\s*\.display\s*\{[^}]*font-family:\s*var\(--font-display\)/.test(site));
t.ok("the console heads with the same family", /--font-display:\s*'Inter'/.test(admin));

/* the theme registry starts at the house palette */
t.ok("the house theme is the navy and gold palette",
  /name:\s*"Midnight navy & gold"/.test(brand) && /swatch:\s*\["#020817",\s*"#0b1d35",\s*"#ffd166"\]/.test(brand));

process.exit(t.done() ? 0 : 1);
