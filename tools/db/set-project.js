#!/usr/bin/env node
/* =====================================================================
   Point the site and the console at a Supabase project
   ---------------------------------------------------------------------
   Writes the project URL and the PUBLIC anon key into assets/js/config.js
   — the one place both the website and the admin console read them from.

     node tools/db/set-project.js https://<ref>.supabase.co <anon-key>

   Checks before writing:
     • the URL is a *.supabase.co project URL and yields the project ref
     • the key is a JWT whose "ref" claim is that same project
     • the key's role claim is "anon" — a service_role key is refused,
       because it must never be shipped to a browser
     • the key has not expired

   After writing it prints the Railway variables and, when the project ref
   differs from the previous one, the SQL that has to be run in the new
   project before anything can work.
   ===================================================================== */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const CONFIG = path.join(ROOT, "assets/js/config.js");

function die(message) {
  console.error("\n✗ " + message + "\n");
  process.exit(1);
}

function decodeJwt(token) {
  const parts = String(token).split(".");
  if (parts.length !== 3) die("That does not look like a Supabase key (expected three dot-separated parts).");
  let payload;
  try {
    payload = JSON.parse(Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
  } catch (e) {
    die("The key's payload could not be decoded — copy the whole key.");
  }
  return payload;
}

function projectRef(url) {
  const m = /^https:\/\/([a-z0-9]{8,})\.supabase\.co\/?$/.exec(String(url).trim());
  if (!m) die("The URL must look like https://<project-ref>.supabase.co (copy it from Settings → API).");
  return m[1];
}

const [, , rawUrl, rawKey] = process.argv;
if (!rawUrl || !rawKey) {
  console.log("Usage: node tools/db/set-project.js https://<ref>.supabase.co <anon-key>");
  process.exit(1);
}

const url = rawUrl.trim().replace(/\/+$/, "");
const key = rawKey.trim();
const ref = projectRef(url);
const claims = decodeJwt(key);

if (claims.role === "service_role") {
  die("That is the service_role (secret) key. It must never be shipped to a browser.\n" +
      "  Copy the `anon` / `public` key from Settings → API instead.");
}
if (claims.role !== "anon") {
  die("That key's role is \"" + claims.role + "\", not \"anon\". Copy the anon / public key.");
}
if (claims.ref && claims.ref !== ref) {
  die("The key belongs to project \"" + claims.ref + "\" but the URL points at \"" + ref + "\". " +
      "Copy both values from the same project.");
}
if (claims.exp && claims.exp * 1000 < Date.now()) {
  die("That key has expired. Copy a current anon key from Settings → API.");
}

const source = fs.readFileSync(CONFIG, "utf8");
const previousUrl = (/"https:\/\/([a-z0-9]{8,})\.supabase\.co"/.exec(source) || [])[1] || null;

const urlPattern = /supabaseUrl: "https:\/\/[a-z0-9]+\.supabase\.co"/;
const keyPattern = /supabaseAnonKey: "[^"]*"/;
if (!urlPattern.test(source) || !keyPattern.test(source)) {
  die("assets/js/config.js no longer has the expected supabaseUrl / supabaseAnonKey lines.");
}

let next = source
  .replace(urlPattern, 'supabaseUrl: "' + url + '"')
  .replace(keyPattern, 'supabaseAnonKey: "' + key + '"')
  .replace(/\/\* Cloud \(Supabase\) — project: [a-z0-9]+ \*\//,
           "/* Cloud (Supabase) — project: " + ref + " */");

fs.writeFileSync(CONFIG, next);
console.log("\n✓ assets/js/config.js now points at " + ref);
if (previousUrl && previousUrl !== ref) {
  console.log("  (previous project was " + previousUrl + ")");
}

console.log("\nRailway → your service → Variables:");
console.log("  SUPABASE_URL      = " + url);
console.log("  SUPABASE_ANON_KEY = " + key);
console.log("\nThen redeploy. server.js serves those values at /env.js, which");
console.log("overrides config.js in production.");

if (previousUrl !== ref) {
  console.log("\nThis is a different project, so it needs the database before anything works:");
  console.log("  1. SQL Editor → paste all of supabase/install.sql → Run");
  console.log("  2. Authentication → Users → add your own admin account (or sign up on the site)");
  console.log("  3. SQL Editor → paste supabase/promote-admin.sql, set target_email to that address → Run");
  console.log("  4. Open system-check.html on the deployed site and confirm every row is green");
} else {
  console.log("\nSame project — no schema work needed. Check system-check.html after deploying.");
}
