/* =====================================================================
   Build supabase/install.sql — schema + seed in one paste
   ---------------------------------------------------------------------
   Supabase's SQL editor runs one script per tab. This concatenates the
   schema (tables, policies, triggers, buckets) and the seed (website
   settings, catalogue, live posts) into a single idempotent file.

     node tools/db/generate-seed.js     # refresh the seed first
     node tools/db/build-install.js
   ===================================================================== */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const parts = [
  ["schema", path.join(ROOT, "supabase", "schema.sql")],
  ["seed", path.join(ROOT, "supabase", "seed.sql")]
];

const header = `-- =====================================================================
-- JAY C O B FINANCIAL SERVICES — one-step installer
-- ---------------------------------------------------------------------
-- GENERATED FILE — do not edit by hand.
--   node tools/db/generate-seed.js && node tools/db/build-install.js
--
-- Paste this WHOLE file into Supabase -> SQL Editor -> New query -> Run.
-- It creates every table, policy, trigger and storage bucket, then
-- publishes the website's settings, catalogue and live posts.
--
-- Safe to run more than once: objects use "if not exists", policies are
-- dropped and recreated, and seed rows only fill documents that are empty.
--
-- After it finishes:
--   1. Authentication -> Users -> Add user (your administrator)
--   2. select public.promote_staff('your@email.com');
--   3. open system-check.html on the deployed site
-- =====================================================================
`;

const body = parts.map(([name, file]) => {
  const sql = fs.readFileSync(file, "utf8");
  return (
    "\n\n-- #####################################################################\n" +
    "-- # " + name.toUpperCase() + "\n" +
    "-- #####################################################################\n\n" +
    sql
  );
}).join("");

const out = path.join(ROOT, "supabase", "install.sql");
fs.writeFileSync(out, header + body, "utf8");
console.log("Wrote " + path.relative(ROOT, out) + " (" + (fs.statSync(out).size / 1024).toFixed(1) + " KB)");
