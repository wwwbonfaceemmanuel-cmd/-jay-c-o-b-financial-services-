/* =====================================================================
   Verify supabase/seed.sql against the site's own defaults
   ---------------------------------------------------------------------
   The seed is generated, so a quoting mistake (an apostrophe in a post
   body, a stray backslash) would only surface when the SQL is pasted into
   Supabase. This checks the file offline instead:

     • every document parse back to the same JSON the code ships
     • the catalogue, settings and posts match assets/js byte for byte
     • no unescaped single quotes

     node tools/db/verify-seed.js
   ===================================================================== */
"use strict";

const fs = require("fs");
const path = require("path");
const { JSDOM, VirtualConsole } = require("jsdom");

const ROOT = path.resolve(__dirname, "../..");
const SEED = fs.readFileSync(path.join(ROOT, "supabase", "seed.sql"), "utf8");

/* ---------- a minimal parser for "'...'" SQL strings ---------- */
function parseValueList(sql) {
  const start = sql.indexOf("values");
  const end = sql.indexOf("on conflict");
  if (start < 0 || end < 0) throw new Error("Unexpected seed.sql shape");
  const body = sql.slice(start + "values".length, end);
  const docs = {};
  let i = 0;

  function readString() {
    while (body[i] !== "'") i += 1;
    i += 1;
    let out = "";
    while (i < body.length) {
      const ch = body[i];
      if (ch === "'") {
        if (body[i + 1] === "'") { out += "'"; i += 2; continue; }
        i += 1;
        return out;
      }
      out += ch;
      i += 1;
    }
    throw new Error("Unterminated string");
  }

  while (i < body.length) {
    const open = body.indexOf("(", i);
    if (open < 0) break;
    i = open + 1;
    const id = readString();
    while (body[i] !== "'") i += 1;
    const json = readString();
    while (body[i] !== ")" && i < body.length) i += 1;
    i += 1;
    docs[id] = JSON.parse(json);
  }
  return docs;
}

/* ---------- the code's own defaults ---------- */
function codeDefaults() {
  const vc = new VirtualConsole();
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/", runScripts: "outside-only", virtualConsole: vc
  });
  dom.window.eval(fs.readFileSync(path.join(ROOT, "assets/js/site-store.js"), "utf8"));
  const store = dom.window.JCOB_SITE.DEFAULTS;
  dom.window.close();

  const live = fs.readFileSync(path.join(ROOT, "assets/js/live.js"), "utf8");
  const from = live.indexOf("var DEFAULTS = [");
  const to = live.indexOf("\n  ];", from);
  const posts = new Function("return " + live.slice(from + "var DEFAULTS = ".length, to + 4))();

  return { store, posts };
}

const docs = parseValueList(SEED);
const { store, posts } = codeDefaults();

let pass = 0;
let fail = 0;
function check(name, cond, extra) {
  if (cond) { pass += 1; console.log("  ✓ " + name); }
  else { fail += 1; console.log("  ✗ " + name + (extra ? " — " + extra : "")); }
}

console.log("\n[seed.sql]");
check("five documents", Object.keys(docs).length === 5, Object.keys(docs).join(","));
check("settings match the code", JSON.stringify(docs.settings) === JSON.stringify(store.settings));
check("catalogue matches the code", JSON.stringify(docs.products) === JSON.stringify(store.products));
check("live posts match the code", JSON.stringify(docs.live_posts) === JSON.stringify(posts));
check("content starts empty", Object.keys(docs.content).length === 0);
check("sections start empty", Object.keys(docs.sections).length === 0);

check("eleven products", docs.products.length === 11, String(docs.products.length));
check("reference rates intact", docs.products.find((p) => p.id === "personal").rate === 24);
check("amount limits intact", docs.products.find((p) => p.id === "secured").max === 80000000);
check("ten live posts", docs.live_posts.length === 10, String(docs.live_posts.length));
check("brand intact", docs.settings.brand === "JAY C O B FINANCIAL SERVICES", docs.settings.brand);
check("policy intact", docs.settings.policy.maxDTI === 40);
check("calculator defaults intact", docs.settings.calc.rateBasis === "annual");

/* Quoting is proven by the round-trip above: the parser only unescapes a
   doubled quote, so byte-identical JSON means every apostrophe in the
   content was doubled. This check proves the file is also deterministic,
   so regenerating can never silently drift. */
const { execFileSync } = require("child_process");
const before = fs.readFileSync(path.join(ROOT, "supabase", "seed.sql"), "utf8");
execFileSync(process.execPath, [path.join(__dirname, "generate-seed.js")], { cwd: ROOT, stdio: "ignore" });
const after = fs.readFileSync(path.join(ROOT, "supabase", "seed.sql"), "utf8");
check("generation is deterministic", before === after);

/* Apostrophes in the content must appear doubled inside the SQL strings. */
const apostrophes = (JSON.stringify(Object.values(docs))).split("'").length - 1;
const doubled = SEED.split("''").length - 1;
check("apostrophes are escaped", apostrophes > 0 ? doubled >= apostrophes : doubled >= 0,
  apostrophes + " in content, " + doubled + " doubled in file");

const install = fs.readFileSync(path.join(ROOT, "supabase", "install.sql"), "utf8");
check("install.sql contains the schema", /create table if not exists public\.customer_docs/.test(install));
check("install.sql contains the seed", /insert into public\.site_docs/.test(install));
check("schema runs before the seed",
  install.indexOf("enable row level security") < install.indexOf("insert into public.site_docs"));

/* rebuild.sql: the repair script must carry the whole schema, the profile
   backfill, the content and the verification report — in that order. */
const rebuild = fs.readFileSync(path.join(ROOT, "supabase", "rebuild.sql"), "utf8");
const at = (needle) => rebuild.indexOf(needle);
check("rebuild.sql has a pre-flight report", rebuild.includes("-- 1. PRE-FLIGHT"));
check("rebuild.sql carries every table",
  ["profiles", "site_docs", "portal_docs", "customer_docs", "enquiries", "audit_log"]
    .every((t) => rebuild.includes("create table if not exists public." + t)));
check("rebuild.sql creates both buckets",
  rebuild.includes("('site-media', 'site-media', true)") &&
  rebuild.includes("('kyc-documents', 'kyc-documents', false)"));
check("rebuild.sql backfills existing logins",
  rebuild.includes("where not exists (select 1 from public.profiles p where p.id = u.id)"));
check("rebuild.sql keeps the seed", /insert into public\.site_docs/.test(rebuild));
check("rebuild.sql order: schema → backfill → content → verify",
  at("create table if not exists public.customer_docs") < at("-- 3. BACKFILL") &&
  at("-- 3. BACKFILL") < at("insert into public.site_docs") &&
  at("insert into public.site_docs") < at("-- 5. VERIFY"));
check("rebuild.sql hard reset is commented out",
  !/^drop table if exists public\.profiles/m.test(rebuild));

/* retire-legacy-tables.sql: the guarded cleanup of a foreign scaffold. */
const retire = fs.readFileSync(path.join(ROOT, "supabase", "retire-legacy-tables.sql"), "utf8");
const LEGACY = ["announcements", "app_settings", "audit_logs", "business_details",
  "chat_messages", "chats", "contact_enquiries", "employment_details", "followups",
  "guarantors", "kyc_documents", "loan_applications", "loan_products",
  "loan_schedules", "loans", "notifications", "properties", "repayments", "transactions"];
check("retire script lists all 19 legacy tables",
  LEGACY.every((t) => retire.includes("'" + t + "'")), LEGACY.filter((t) => !retire.includes("'" + t + "'")).join(","));
check("retire script defaults to keeping data", /allow_data_loss boolean := false;/.test(retire));
check("retire script deletes only what it counted",
  /select count\(\*\) from public\.%I/.test(retire) &&
  /raise exception 'Stopped: these legacy tables still hold data/.test(retire));
check("retire script never names our tables as targets",
  !/drop table if exists public\.(profiles|site_docs|portal_docs|customer_docs|enquiries|audit_log)\b/.test(retire));
check("retire script locks API access without deleting",
  /revoke all on public\.%I from anon, authenticated/.test(retire));

console.log("\nRESULT " + pass + "/" + (pass + fail));
process.exit(fail ? 1 : 0);
