/* Where things sit, and whether you can hit them.
   -----------------------------------------------------------------------
   Three fixes with one shared question: is the thing in the right place,
   at the right size, on the ground it belongs to?

     1. Customer care used to be the fifth column of the footer grid. On a
        phone the late grid definition beat every media query, so the
        column was squeezed past the right edge of the footer and pushed
        the page wider than the screen. It is now a band of its own inside
        the footer, under the link columns.

     2. The buttons that open the navigation drawer were 38-44px with
        1.6px bars — under the 48px touch target, and hard to see.

     3. The live blog appears on more than the home page, and the strips
        cap at the number of columns they actually have so no card is left
        alone on a second row.

   The footer checks are DOM checks (jsdom), because "inside the footer but
   not inside the grid" is a structural fact, not a string.
   ========================================================================= */
"use strict";

const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");
const { ROOT, reporter } = require("./lib");

const t = reporter("[layout — care band, menu buttons, live blog]");

const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const site = read("assets/css/styles.css");
const admin = read("admin.html");
const pages = fs.readdirSync(ROOT).filter((f) => f.endsWith(".html"));

/* ---------- 1. the customer care band ---------- */

/* system-check.html is the deployment diagnostic: its footer is a single
   line by design and never carried a customer care column. */
const NO_CARE_BAND = ["system-check.html"];
const withFooter = pages.filter((f) => /class="[^"]*\bsite-footer\b/.test(read(f)) &&
  NO_CARE_BAND.indexOf(f) < 0);
t.ok("the site footer is on most pages", withFooter.length > 30, withFooter.length + " pages");

const missingBand = [];
const insideGrid = [];
const lostContact = [];
const emptyBand = [];

withFooter.forEach((file) => {
  const dom = new JSDOM(read(file));
  const doc = dom.window.document;
  const footer = doc.querySelector("footer.site-footer");
  const band = footer.querySelector(".footer-care");
  if (!band) { missingBand.push(file); return; }
  if (footer.querySelector(".footer-top .footer-care")) insideGrid.push(file);

  /* everything the column used to say is still said */
  const text = band.textContent.replace(/\s+/g, " ");
  const tels = band.querySelectorAll('a[href^="tel:"]');
  const mails = band.querySelectorAll('a[href^="mailto:"]');
  if (!tels.length || !mails.length) lostContact.push(file);
  if (!/Mon|Sat|hours|08:00/i.test(text)) emptyBand.push(file);

  /* the band is a child of the container, not of the grid */
  if (band.parentElement.classList.contains("footer-top")) insideGrid.push(file);
});

t.eq("every footer carries the customer care band", missingBand.join(", "), "");
t.eq("no page leaves the band inside the footer grid", insideGrid.join(", "), "");
t.eq("the band still carries a phone number and an email", lostContact.join(", "), "");
t.eq("the band still says when we are open", emptyBand.join(", "), "");

/* the grid it sits under: four columns at most, never five */
const gridKids = [];
withFooter.forEach((file) => {
  const doc = new JSDOM(read(file)).window.document;
  const top = doc.querySelector(".footer-top");
  if (top && top.children.length > 4) gridKids.push(file + ":" + top.children.length);
});
t.eq("the footer grid holds at most four columns", gridKids.join(", "), "");

t.ok("the footer grid can shrink below its content",
  /\.footer-top \{\s*grid-template-columns: minmax\(0, 1\.7fr\) repeat\(3, minmax\(0, 1fr\)\)/.test(site));
t.ok("the older three-column footer keeps its own shape",
  /\.footer-top--three \{ grid-template-columns: minmax\(0, 1\.7fr\) repeat\(2, minmax\(0, 1fr\)\)/.test(site));
t.ok("the band is its own row inside the footer",
  /\.footer-care \{[\s\S]{0,400}?grid-template-columns: minmax\(0, 1fr\) minmax\(0, 1\.55fr\) minmax\(0, auto\)/.test(site));
t.ok("long emails and addresses wrap instead of pushing the page wide",
  /\.footer-care \.footer-contact a,\s*\.footer-care \.footer-contact span \{ overflow-wrap: anywhere; \}/.test(site));
t.ok("on a phone the footer is two columns, not five",
  /@media \(max-width: 720px\) \{[\s\S]{0,220}\.footer-top,\s*\.footer-top--three \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/.test(site));
t.ok("the band stacks on a phone",
  /@media \(max-width: 720px\) \{[\s\S]{0,400}\.footer-care \{ grid-template-columns: 1fr;/.test(site));
t.ok("a small phone gets one column and full-width buttons",
  /@media \(max-width: 480px\) \{[\s\S]{0,300}\.footer-care-actions \.btn \{ width: 100%; \}/.test(site));

/* no page may ask for a sideways scroll */
const wide = withFooter.filter((f) => /overflow-x:\s*visible/.test(read(f)));
t.eq("nothing turns horizontal overflow back on", wide.join(", "), "");

/* ---------- 2. the menu buttons ---------- */

/* the last rule that names the button may be a media-query override, so
   read every rule and take the widest — that is the button you see. */
function widest(css, selector) {
  const sizes = [];
  css.replace(new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\{([^}]*)\\}", "g"), (m, body) => {
    const w = /(?:^|;)\s*width:\s*(\d+)px/.exec(body);
    if (w) sizes.push(Number(w[1]));
    return m;
  });
  return sizes.length ? Math.max.apply(null, sizes) : 0;
}

t.ok("the site's drawer button is 52px", widest(site, ".nav-toggle") === 52, String(widest(site, ".nav-toggle")));
t.ok("its bars are thick enough to see", /width: 23px;\s*height: 2\.4px/.test(site));
t.ok("the dashboard's drawer button is 50px", widest(site, ".app-menu-btn") === 50, String(widest(site, ".app-menu-btn")));
t.ok("the dashboard's bars are thick too", /\.app-menu-btn span \{ width: 22px; height: 2\.4px/.test(site));
t.ok("the console's drawer button is 48px", /width:48px;height:48px/.test(admin));

/* 48px is the smallest comfortable touch target */
function widestFlat(css, selector) {
  const sizes = [];
  css.replace(new RegExp(selector + "\\{([^}]*)\\}", "g"), (m, body) => {
    const w = /width:\s*(\d+)px/.exec(body);
    if (w) sizes.push(Number(w[1]));
    return m;
  });
  return sizes.length ? Math.max.apply(null, sizes) : 0;
}

const sizes = [
  ["nav-toggle", widest(site, ".nav-toggle")],
  ["app-menu-btn", widest(site, ".app-menu-btn")],
  ["#menuBtn", widestFlat(admin, "#menuBtn")]
];
sizes.forEach(([name, size]) => {
  t.ok(name + " is at least a 48px touch target", size >= 48, String(size));
});

t.ok("each button opens and closes with its state announced",
  /aria-expanded/.test(read("assets/js/ui.js")) && /aria-expanded/.test(admin));
t.ok("the console's button says which panel it controls",
  /id="menuBtn"[^>]*aria-controls="sidebar"/.test(admin));

/* ---------- 3. the live blog, on more pages ---------- */

const livePages = pages.filter((f) => /data-live-(stream|feed)/.test(read(f)));
t.ok("the live blog appears on at least nine pages", livePages.length >= 9, livePages.join(", "));

const noScript = livePages.filter((f) => !/assets\/js\/live\.js/.test(read(f)));
t.eq("every page with a live block loads the live script", noScript.join(", "), "");

const newPages = ["about.html", "services.html", "how-it-works.html", "support.html", "contact.html", "interest-rates-fees.html"];
const missingLive = newPages.filter((f) => !/data-live-stream/.test(read(f)));
t.eq("the six newly covered pages each carry a live strip", missingLive.join(", "), "");

const stripHeads = newPages.filter((f) => !/data-live-stream[^>]*data-limit="3"/.test(read(f)));
t.eq("a three-column strip asks for three posts", stripHeads.join(", "), "");

t.ok("the home page's live blog runs longer", /data-live-stream data-limit="6"/.test(read("index.html")));
t.ok("the insights feed runs longer", /data-live-feed data-limit="6"/.test(read("insights.html")));
t.ok("a strip is three columns, so a fourth card would sit alone",
  /\.live-strip \{\s*display: grid;\s*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/.test(site));

/* every new strip has its own heading id, and no duplicate ids on a page */
const dupes = [];
newPages.forEach((file) => {
  const dom = new JSDOM(read(file)).window.document;
  const ids = [...dom.querySelectorAll("[id]")].map((el) => el.id);
  const seen = new Set();
  ids.forEach((id) => { if (seen.has(id)) dupes.push(file + "#" + id); seen.add(id); });
});
t.eq("no page has a duplicate id", [...new Set(dupes)].join(", "), "");

process.exit(t.done() ? 0 : 1);
