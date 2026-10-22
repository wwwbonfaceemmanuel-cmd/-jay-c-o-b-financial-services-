/* =====================================================================
   Generate supabase/seed.sql from the site's own defaults
   ---------------------------------------------------------------------
   The website ships with seeded settings, eleven loan products and a set
   of live-feed posts. Without a seed those live only in the browser and
   every visitor starts from the built-in copy; with this file the database
   is the source of truth from the first load.

   Values are read straight out of assets/js/site-store.js and
   assets/js/live.js, so the database can never drift from the code.

     node tools/db/generate-seed.js
   ===================================================================== */
"use strict";

const fs = require("fs");
const path = require("path");
const { JSDOM, VirtualConsole } = require("jsdom");

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "supabase", "seed.sql");

function loadStore() {
  const vc = new VirtualConsole();
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/",
    runScripts: "outside-only",
    virtualConsole: vc,
    pretendToBeVisual: true
  });
  const script = fs.readFileSync(path.join(ROOT, "assets/js/site-store.js"), "utf8");
  dom.window.eval(script);
  const defaults = dom.window.JCOB_SITE.DEFAULTS;
  dom.window.close();
  return defaults;
}

function loadLivePosts() {
  const source = fs.readFileSync(path.join(ROOT, "assets/js/live.js"), "utf8");
  const start = source.indexOf("var DEFAULTS = [");
  if (start < 0) throw new Error("Could not find var DEFAULTS in live.js");
  const end = source.indexOf("\n  ];", start);
  if (end < 0) throw new Error("Could not find the end of the DEFAULTS array");
  const literal = source.slice(start + "var DEFAULTS = ".length, end + 4);
  /* The array literal is plain data — evaluate it in isolation. */
  return new Function("return " + literal)();
}

function sqlValue(value) {
  if (value === null || value === undefined) return "null";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "object") return sqlValue(JSON.stringify(value)) + "::jsonb";
  return "'" + String(value).replace(/'/g, "''") + "'";
}

function docRow(id, data) {
  /* sqlValue already appends ::jsonb for objects, so no extra cast here. */
  return "  (" + sqlValue(id) + ", " + sqlValue(data) + ")";
}

const store = loadStore();
const posts = loadLivePosts();

const rows = [
  docRow("settings", store.settings),
  docRow("products", store.products),
  docRow("content", store.content || {}),
  docRow("sections", store.sections || {}),
  docRow("live_posts", posts)
];

const sql = `-- =====================================================================
-- JAY C O B FINANCIAL SERVICES — initial content
-- ---------------------------------------------------------------------
-- GENERATED FILE — do not edit by hand.
--   node tools/db/generate-seed.js
--
-- Run AFTER supabase/schema.sql (or simply run this one file twice).
-- It publishes the website's own defaults into site_docs, so the database
-- is the source of truth from the first page load:
--   settings   brand, contacts, calculator defaults, lending policy
--   products   the eleven-product lending catalogue
--   content    per-page text overrides (empty to begin with)
--   sections   per-page section visibility (empty to begin with)
--   live_posts the seeded live-feed posts
--
-- Safe to re-run: existing rows are only replaced when they are empty,
-- so real edits made in the admin console are never overwritten.
-- =====================================================================

insert into public.site_docs (id, data)
values
${rows.join(",\n")}
on conflict (id) do update
  set data = excluded.data
  where site_docs.data is null
     or site_docs.data = '{}'::jsonb
     or site_docs.data = '[]'::jsonb;

-- Report what the site will now read.
select id,
       case jsonb_typeof(data)
         when 'array' then jsonb_array_length(data)::text || ' items'
         when 'object' then (select count(*)::text from jsonb_object_keys(data)) || ' keys'
         else jsonb_typeof(data)
       end as contents,
       updated_at
  from public.site_docs
 order by id;
`;

fs.writeFileSync(OUT, sql, "utf8");
console.log("Wrote " + path.relative(ROOT, OUT) +
  " (" + (sql.length / 1024).toFixed(1) + " KB, " + rows.length + " documents)");
console.log("  products: " + store.products.length +
  " · settings keys: " + Object.keys(store.settings).length +
  " · live posts: " + posts.length);
