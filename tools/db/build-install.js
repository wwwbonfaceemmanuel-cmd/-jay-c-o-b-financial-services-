/* =====================================================================
   Build the SQL handover files from one source of truth
   ---------------------------------------------------------------------
     node tools/db/generate-seed.js     # refresh the seed content first
     node tools/db/build-install.js

   Emits:
     supabase/install.sql  schema + seed — the normal one-paste installer
     supabase/rebuild.sql  pre-flight + schema + profile backfill +
                           seed + verification — use this when a project
                           is partly built or has drifted from the code

   Both are generated from supabase/schema.sql and supabase/seed.sql, so
   the tables, policies, triggers and buckets can never fall behind the
   website and the console.
   ===================================================================== */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const schema = read("supabase/schema.sql");
const seed = read("supabase/seed.sql");

const section = (name, sql) =>
  "\n\n-- #####################################################################\n" +
  "-- # " + name + "\n" +
  "-- #####################################################################\n\n" +
  sql;

/* ------------------------------------------------------------------ */
/* install.sql — the normal installer                                   */
/* ------------------------------------------------------------------ */
const installHeader = `-- =====================================================================
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

fs.writeFileSync(path.join(ROOT, "supabase/install.sql"),
  installHeader + section("SCHEMA", schema) + section("SEED", seed), "utf8");

/* ------------------------------------------------------------------ */
/* rebuild.sql — pre-flight, repair, verify                             */
/* ------------------------------------------------------------------ */
const rebuildHeader = `-- =====================================================================
-- JAY C O B FINANCIAL SERVICES — rebuild the database to match the code
-- ---------------------------------------------------------------------
-- GENERATED FILE — do not edit by hand.
--   node tools/db/generate-seed.js && node tools/db/build-install.js
--
-- Use this when a project is half-built (some tables missing), when a
-- table was created by an older version, or when the website and the
-- console do not agree with what the code expects.
--
-- What this file does, in order:
--   1. PRE-FLIGHT   — reports what exists now (read only)
--   2. SCHEMA       — creates every table, column, index, function,
--                     policy, trigger and storage bucket the website,
--                     the customer dashboard and the console need
--   3. BACKFILL     — gives every existing login a profile row, so an
--                     administrator created before the schema still
--                     works
--   4. CONTENT      — publishes settings, the 11-product catalogue and
--                     the live feed into site_docs (only where empty)
--   5. VERIFY       — prints a table-by-table report
--
-- It does NOT delete anything: no existing customer, application, loan,
-- payment, document, enquiry or account is touched. Running it twice is
-- harmless. To start from an empty database instead, use the HARD RESET
-- block at the very end of this file.
--
-- Paste this WHOLE file into Supabase -> SQL Editor -> New query -> Run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. PRE-FLIGHT — what is there now?
-- ---------------------------------------------------------------------
select 'public tables' as item,
       coalesce(string_agg(table_name, ', ' order by table_name), '(none)') as detail
  from information_schema.tables
 where table_schema = 'public'
   and table_type = 'BASE TABLE';

select 'storage buckets' as item,
       coalesce(string_agg(id, ', ' order by id), '(none)') as detail
  from storage.buckets;

select 'login accounts' as item, count(*)::text as detail from auth.users;

select 'profile rows' as item,
       case when to_regclass('public.profiles') is null then '(no profiles table)'
            else (select count(*)::text from public.profiles) end as detail;
`;

const rebuildBackfill = `
-- ---------------------------------------------------------------------
-- 3. BACKFILL — every login gets a profile row
--    Accounts created before the schema existed, or while the
--    handle_new_user trigger was missing, otherwise have no role row and
--    are refused by the console. This creates the missing rows only.
-- ---------------------------------------------------------------------
insert into public.profiles (id, full_name, email, phone, account_no, role)
select u.id,
       coalesce(u.raw_user_meta_data ->> 'full_name', ''),
       u.email,
       coalesce(u.raw_user_meta_data ->> 'phone', ''),
       coalesce(u.raw_user_meta_data ->> 'account_no',
                'JC-ACC-' || upper(substr(u.id::text, 1, 6))),
       'customer'
  from auth.users u
 where not exists (select 1 from public.profiles p where p.id = u.id);

-- Keep the address, phone and name on the profile in step with the login.
update public.profiles p
   set email = coalesce(u.email, p.email),
       full_name = case when coalesce(p.full_name, '') = ''
                        then coalesce(u.raw_user_meta_data ->> 'full_name', '') else p.full_name end
  from auth.users u
 where u.id = p.id
   and (p.email is distinct from u.email
        or (coalesce(p.full_name, '') = '' and coalesce(u.raw_user_meta_data ->> 'full_name', '') <> ''));

`;

const rebuildVerify = `
-- ---------------------------------------------------------------------
-- 5. VERIFY — the report to expect after a successful run
--    Every row should look healthy: the six tables present, both buckets
--    listed, the five website documents published, RLS on every table.
-- ---------------------------------------------------------------------
select 'tables' as check_name,
       (select count(*) from information_schema.tables
         where table_schema = 'public' and table_type = 'BASE TABLE')::text || ' / 6' as value
union all
select 'row level security on',
       (select count(*) from pg_class c
          join pg_namespace n on n.oid = c.relnamespace
         where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity)::text || ' tables'
union all
select 'policies',
       (select count(*) from pg_policies where schemaname = 'public')::text || ' in public'
union all
select 'storage buckets',
       (select count(*) from storage.buckets where id in ('site-media', 'kyc-documents'))::text || ' / 2'
union all
select 'website documents',
       (select count(*) from public.site_docs)::text || ' (settings, products, content, sections, live_posts)'
union all
select 'catalogue products',
       coalesce((select jsonb_array_length(data) from public.site_docs where id = 'products')::text, '0')
union all
select 'live posts',
       coalesce((select jsonb_array_length(data) from public.site_docs where id = 'live_posts')::text, '0')
union all
select 'login accounts',
       (select count(*) from auth.users)::text
union all
select 'profile rows',
       (select count(*) from public.profiles)::text
union all
select 'staff accounts',
       (select count(*) from public.profiles where role in ('admin', 'staff', 'officer', 'credit'))::text
union all
select 'customer documents',
       (select count(*) from public.customer_docs)::text
union all
select 'console documents',
       (select count(*) from public.portal_docs)::text
union all
select 'enquiries',
       (select count(*) from public.enquiries)::text;

-- ---------------------------------------------------------------------
-- Next: make yourself an administrator (only needed once)
--   Authentication -> Users -> Add user, then:
--     select public.promote_staff('your@email.com');
--   or, with exactly one account in the project:
--     select public.promote_staff((select email from auth.users limit 1));
-- Then open system-check.html on the deployed site.
-- ---------------------------------------------------------------------

`;

const hardReset = `
-- =====================================================================
-- HARD RESET — optional, destructive. Read before uncommenting.
-- ---------------------------------------------------------------------
-- Deletes every customer document, application, loan, repayment,
-- document record, enquiry, console record and staff profile in THIS
-- project. Login accounts in auth.users are kept; run the file from the
-- top afterwards and step 3 recreates their profiles.
--
-- drop trigger if exists on_auth_user_created on auth.users;
-- drop table if exists public.audit_log   cascade;
-- drop table if exists public.enquiries   cascade;
-- drop table if exists public.customer_docs cascade;
-- drop table if exists public.portal_docs cascade;
-- drop table if exists public.site_docs   cascade;
-- drop table if exists public.profiles    cascade;
-- drop function if exists public.log_doc_change()  cascade;
-- drop function if exists public.guard_profile_role() cascade;
-- drop function if exists public.handle_new_user() cascade;
-- drop function if exists public.touch_updated_at() cascade;
-- drop function if exists public.is_staff()       cascade;
-- drop function if exists public.is_admin()       cascade;
-- drop function if exists public.promote_staff(text) cascade;
-- delete from storage.objects where bucket_id in ('site-media', 'kyc-documents');
-- delete from storage.buckets where id in ('site-media', 'kyc-documents');
-- =====================================================================
`;

const rebuildBody =
  section("2. SCHEMA — tables, columns, policies, triggers, buckets", schema) +
  rebuildBackfill +
  section("4. CONTENT — website settings, catalogue, live feed\n-- (only fills documents that are still empty)", seed) +
  rebuildVerify +
  hardReset;

fs.writeFileSync(path.join(ROOT, "supabase/rebuild.sql"),
  rebuildHeader + rebuildBody, "utf8");

for (const name of ["install.sql", "rebuild.sql"]) {
  const file = path.join(ROOT, "supabase", name);
  console.log("Wrote supabase/" + name + " (" + (fs.statSync(file).size / 1024).toFixed(1) + " KB)");
}
