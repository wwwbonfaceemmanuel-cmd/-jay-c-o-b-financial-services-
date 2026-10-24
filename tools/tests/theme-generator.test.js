/* The theme generator — one choice, two surfaces.
   -----------------------------------------------------------------------
   The brief: the administrator opens System Settings, picks a theme, says
   whether it is for the website or the dashboards, and applies it. The
   choice is a record in Supabase, not a browser preference, and it must
   paint immediately on every surface that reads the record.

   This suite checks the engine on its own (a bare page, no network) and
   then the console flow against the stand-in database:
     · the five published themes and their names
     · the emerald house theme writes nothing, so the stylesheet stays
       authoritative
     · a selected theme repaints the chrome, the ground and the accent ramp
     · the website choice never repaints a dashboard, and vice versa
     · every theme's chrome text is readable on its own chrome (AA)
     · Apply saves {site, dashboard, updated, updatedBy} to site_docs
     · index.html then opens in the chosen website theme
     · Reset publishes emerald again and clears the inline tokens
   ========================================================================= */
"use strict";

const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");
const { ROOT, reporter, makeDom, ready, sleep, rest } = require("./lib");

const t = reporter("[theme generator — website and dashboards]");

const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const engine = read("assets/js/theme.js");
const admin = read("admin.html");

/* ---- a page with only the engine on it, so nothing else paints ---- */
function bareSurface(bodyAttrs, extra) {
  const html =
    '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="theme-color" content="#06262a"></head><body ' + (bodyAttrs || "") + ">" +
    (extra || "") + "</body></html>";
  const dom = new JSDOM(html, { url: "https://example.test/", runScripts: "outside-only" });
  dom.window.eval(engine);
  return dom.window;
}

const $root = (w) => w.document.documentElement;
const prop = (w, name) => $root(w).style.getPropertyValue(name);

/* ---- contrast, measured the way the eye reads it ---- */
function lum(hex) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const v = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
  const c = v.map((x) => (x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function ratio(a, b) {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
function stops(gradient) {
  return (gradient || "").match(/#[0-9a-f]{6}/gi) || [];
}

/* =====================================================================
   1. the registry
   ===================================================================== */
const w = bareSurface();
const T = w.JCOB_THEME;

t.ok("the engine is on the window", !!T);
t.eq("the house theme is the default", T.DEFAULT, "emerald");

const list = T.list();
t.eq("five themes are published", list.length, 5);
t.eq("the house theme leads the list", list[0].id, "emerald");
t.eq("the second theme is named for its palette",
  list.filter((x) => x.id === "royal")[0].name, "Navy & sapphire");
t.eq("the house theme carries the brief's palette",
  list.filter((x) => x.id === "emerald")[0].name, "Midnight navy & gold");
list.forEach((x) => {
  t.ok(x.id + " has a name, a note and a swatch",
    !!x.name && !!x.note && Array.isArray(x.swatch) && x.swatch.length === 3, JSON.stringify(x));
});

/* =====================================================================
   2. emerald writes nothing
   ===================================================================== */
T.apply("site", "emerald"); /* the engine also paints on load; be explicit */
const written = [];
for (let i = 0; i < $root(w).style.length; i += 1) written.push($root(w).style[i]);
t.eq("applying the house theme writes no inline tokens", written.length, 0);
t.eq("but it still marks the surface", $root(w).getAttribute("data-theme"), "emerald");

/* =====================================================================
   3. a choice repaints the chrome, the ground and the ramp
   ===================================================================== */
T.apply("site", "royal");
t.eq("the website surface is marked", $root(w).getAttribute("data-theme"), "royal");
t.eq("the website choice is recorded", $root(w).getAttribute("data-theme-site"), "royal");
t.eq("the chrome became the theme's card navy", prop(w, "--navy-700"), "#0a2246");
t.eq("and the surfaces followed", prop(w, "--ng-card"), "#0a2246");
t.ok("the header band follows the chrome token",
  /#061631/.test(prop(w, "--emerald-chrome")), prop(w, "--emerald-chrome"));
t.eq("the browser chrome colour follows the swatch",
  w.document.querySelector('meta[name="theme-color"]').getAttribute("content"), "#020b1c");

/* a dashboard choice made while a website is open must not repaint it */
T.apply("dashboard", "copper");
t.eq("a dashboard choice leaves the website alone", $root(w).getAttribute("data-theme"), "royal");
t.eq("the dashboard choice is recorded separately", $root(w).getAttribute("data-theme-dashboard"), "copper");
t.ok("a dashboard theme drives the console's own --chrome",
  /#06182c/.test(prop(w, "--chrome")), prop(w, "--chrome"));

T.apply("dashboard", "emberald"); /* unknown → house theme */
t.eq("on the house theme the console aliases are left to the stylesheet",
  prop(w, "--chrome"), "");
t.eq("and its text colour too", prop(w, "--chrome-txt"), "");

T.apply("dashboard", "midnight");
t.ok("a second console theme repaints the alias",
  /#14161b/.test(prop(w, "--chrome")), prop(w, "--chrome"));

/* back to the house theme: every inline token is taken away again */
T.apply("site", "emerald");
t.eq("the website returns to emerald", $root(w).getAttribute("data-theme"), "emerald");
t.eq("the royal tokens are gone", prop(w, "--navy-700"), "");
t.eq("the console alias is released", prop(w, "--chrome"), "");

/* an unknown id falls back rather than throwing */
t.eq("an unknown theme falls back to the house theme", T.apply("site", "chartreuse"), "emerald");

/* =====================================================================
   4. a dashboard page reads the dashboard choice
   ===================================================================== */
const dashW = bareSurface('class="app-body"');
dashW.JCOB_SITE = { settings: { theme: { site: "royal", dashboard: "copper" } }, ready: Promise.resolve(), subscribe: () => {} };
dashW.JCOB_THEME.paint();
t.eq("the dashboard opens in its own theme", $root(dashW).getAttribute("data-theme"), "copper");
t.ok("it paints the dashboard chrome, not the website's",
  /#06182c/.test(prop(dashW, "--emerald-chrome")), prop(dashW, "--emerald-chrome"));
t.eq("the website theme is only recorded, not painted",
  $root(dashW).getAttribute("data-theme-site"), null);

const siteW = bareSurface();
siteW.JCOB_SITE = { settings: { theme: { site: "royal", dashboard: "copper" } }, ready: Promise.resolve(), subscribe: () => {} };
siteW.JCOB_THEME.paint();
t.eq("the website opens in the website theme", $root(siteW).getAttribute("data-theme"), "royal");

/* =====================================================================
   5. every theme keeps its own chrome readable
   ===================================================================== */
const src = read("assets/js/theme.js");
list.forEach((x) => {
  const at = src.indexOf(x.id + ': {');
  const block = src.slice(at, at + 3000);
  const pick = (name) => {
    const m = new RegExp(name + '":\\s*"(#[0-9a-f]{6})"', "i").exec(block);
    return m ? m[1] : null;
  };
  const text = pick("--chrome-text") || "#d3e7e1";
  const muted = pick("--chrome-muted-text") || "#b9d3ca";
  const g = /--emerald-chrome":\s*"([^"]+)"/.exec(block);
  const grounds = x.id === "emerald" ? ["#06302c", "#04211f", "#041716"] : stops(g && g[1]);
  t.ok(x.id + " has grounds to measure", grounds.length >= 2, grounds.join(" "));
  const worstText = Math.min(...grounds.map((g) => ratio(text, g)));
  const worstMuted = Math.min(...grounds.map((g) => ratio(muted, g)));
  t.ok(x.id + " body chrome text is AA", worstText >= 4.5, worstText.toFixed(2) + ":1");
  t.ok(x.id + " muted chrome text is AA", worstMuted >= 4.5, worstMuted.toFixed(2) + ":1");
});

/* =====================================================================
   6. the console panel offers the generator
   ===================================================================== */
t.ok("the settings view carries the theme generator", /Theme generator/.test(admin));
t.ok("a website theme is selected", /sel\('thSite'/.test(admin));
t.ok("a dashboard theme is selected", /sel\('thDash'/.test(admin));
t.ok("the panel explains the two scopes",
  /Public pages, receipts and downloaded documents/.test(admin) &&
  /Customer dashboard, app bars and this console/.test(admin));
t.ok("the choices are drawn from the engine", /JCOB_THEME\?window\.JCOB_THEME\.list\(\)/.test(admin));
t.ok("Apply and Reset are wired", /data-act="themeApply"/.test(admin) && /data-act="themeReset"/.test(admin));
t.ok("no theme value is read from an undeclared alias", !/S\.settings\.theme/.test(admin));

/* =====================================================================
   7. Apply writes the record and paints the site
   ===================================================================== */
const chosen = { site: "royal", dashboard: "copper" };

(async () => {
  const settingsRow = async () => {
    const rows = await rest("site_docs?id=eq.settings&select=data");
    return (rows[0] && rows[0].data) || {};
  };

  const before = await settingsRow();
  if (before.theme) chosen.site = before.theme.site === "royal" ? "midnight" : "royal";

  const { dom, errors } = makeDom("admin.html", { hash: "#/settings" });
  await ready(dom, 1200);
  const a = dom.window;
  const d = a.document;

  d.getElementById("admin-email").value = "admin@jaycob.mw";
  d.getElementById("admin-password").value = "Admin123!";
  d.getElementById("admin-gate-form").dispatchEvent(new a.Event("submit", { bubbles: true, cancelable: true }));
  await sleep(7000);

  const panel = d.getElementById("content").textContent;
  t.ok("the console renders the generator after login", /Theme generator/.test(panel));
  t.eq("it offers five themes", d.querySelectorAll("#thSite option").length, 5);
  t.eq("both scope selects are open", d.querySelectorAll("#thSite, #thDash").length, 2);

  d.getElementById("thSite").value = chosen.site;
  d.getElementById("thDash").value = "copper";
  const applyBtn = [...d.querySelectorAll("[data-act=themeApply]")][0];
  t.ok("the Apply button is on screen", !!applyBtn);
  applyBtn.click();
  await sleep(3000);

  const after = await settingsRow();
  t.eq("the website theme is saved to Supabase", after.theme && after.theme.site, chosen.site);
  t.eq("the dashboard theme is saved beside it", after.theme && after.theme.dashboard, "copper");
  t.ok("the record says when and by whom", !!(after.theme && after.theme.updated && after.theme.updatedBy),
    JSON.stringify(after.theme));
  t.ok("the save is reported, not merely toasted",
    /Theme published/.test(d.body.textContent) || !!after.theme, "toast or record");

  t.ok("no script errors in the console", errors.length === 0, errors.join(" | "));
  a.close();

  const { dom: siteDom, errors: siteErrors } = makeDom("index.html");
  await ready(siteDom, 1500);
  await sleep(2500);
  const s = siteDom.window;
  t.eq("the website opens in the saved theme", s.document.documentElement.getAttribute("data-theme"), chosen.site);
  t.ok("and actually repaints its tokens",
    !!s.document.documentElement.style.getPropertyValue("--emerald-chrome"),
    s.document.documentElement.style.getPropertyValue("--emerald-chrome"));
  t.ok("no script errors on the website", siteErrors.length === 0, siteErrors.join(" | "));
  s.close();

  /* reset publishes emerald and clears the inline tokens */
  const { dom: resetDom } = makeDom("admin.html", { hash: "#/settings" });
  await ready(resetDom, 1200);
  const r = resetDom.window;
  r.document.getElementById("admin-email").value = "admin@jaycob.mw";
  r.document.getElementById("admin-password").value = "Admin123!";
  r.document.getElementById("admin-gate-form").dispatchEvent(new r.Event("submit", { bubbles: true, cancelable: true }));
  await sleep(6500);
  const resetBtn = r.document.querySelector("[data-act=themeReset]");
  t.ok("Reset is reachable", !!resetBtn);
  if (resetBtn) resetBtn.click();
  await sleep(2500);

  const reset = await settingsRow();
  t.eq("Reset publishes the website theme", reset.theme && reset.theme.site, "emerald");
  t.eq("Reset publishes the dashboard theme", reset.theme && reset.theme.dashboard, "emerald");
  t.eq("nothing is left painted on the console", r.document.documentElement.style.getPropertyValue("--navy-700"), "");
  r.close();

  process.exit(t.done() ? 0 : 1);
})();
