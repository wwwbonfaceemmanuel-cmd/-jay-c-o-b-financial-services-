-- =====================================================================
-- JAY C O B FINANCIAL SERVICES — database health check
-- ---------------------------------------------------------------------
-- READ ONLY. Every statement here is a SELECT; nothing is created,
-- changed or deleted, and it is safe to run on the live project at any
-- time. Run the whole file in Supabase → SQL Editor, or run one block
-- at a time.
--
-- The platform is designed on SIX tables. This file tells you, in order:
--
--   1. Which tables exist  (the six, and nothing else)
--   2. How many rows each one holds
--   3. That row-level security is on and how many policies each carries
--   4. That the triggers which stamp updated_at are in place
--   5. That the two storage buckets exist with the right visibility
--   6. That the rows the code expects are actually there
--   7. That customers have signatures on file, and what staff roles exist
--
-- Expected shape of a correct project:
--
--   profiles        one row per account (any number; customers + staff)
--   site_docs       5 rows  content, live_posts, products, sections, settings
--   portal_docs     1 row   main
--   customer_docs   one row per customer (any number)
--   enquiries       any number (each contact-form submission)
--   audit_log       any number (append-only staff trail)
--
--   buckets         kyc-documents (private), site-media (public)
-- =====================================================================


-- 1. WHICH TABLES EXIST, AND ARE THEY PART OF THE DESIGN? ---------------
--    Anything marked "NOT part of the design" is a leftover scaffold:
--    it is not written by the website, the customer portal or the
--    console, and should be dropped with retire-legacy-tables.sql.
select t.table_name,
       case when t.table_name in
                 ('profiles', 'site_docs', 'portal_docs',
                  'customer_docs', 'enquiries', 'audit_log')
            then 'expected'
            else 'NOT part of the design' end as verdict
  from information_schema.tables t
 where t.table_schema = 'public'
   and t.table_type = 'BASE TABLE'
 order by 2, 1;


-- 2. HOW MANY ROWS EACH TABLE HOLDS ------------------------------------
--    query_to_xml() counts without the script needing to know the
--    columns of each table, and without creating a function.
select t.table_name,
       (xpath('/row/c/text()',
              query_to_xml(format('select count(*) as c from public.%I', t.table_name),
                           false, true, '')))[1]::text::int as rows
  from information_schema.tables t
 where t.table_schema = 'public'
   and t.table_type = 'BASE TABLE'
 order by 1;


-- 3. ROW-LEVEL SECURITY AND POLICIES -----------------------------------
--    Every table must show rls_on = true. A table with 0 policies and
--    RLS on is closed to everyone, which is safe but broken.
select c.relname                        as table_name,
       c.relrowsecurity                 as rls_on,
       (select count(*)
          from pg_policies p
         where p.schemaname = 'public'
           and p.tablename  = c.relname) as policies,
       (select string_agg(p.cmd, ', ' order by p.cmd)
          from pg_policies p
         where p.schemaname = 'public'
           and p.tablename  = c.relname) as commands
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public'
   and c.relkind = 'r'
 order by 1;


-- 4. THE updated_at TRIGGERS -------------------------------------------
--    site_docs and portal_docs must both carry *_touch; without it a
--    document's updated_at never moves and the conflict check in the
--    console stops working.
select event_object_table as table_name,
       trigger_name,
       event_manipulation
  from information_schema.triggers
 where trigger_schema = 'public'
 order by 1, 2;


-- 5. THE STORAGE BUCKETS ------------------------------------------------
--    site-media   public  = true   (website photos, live feed)
--    kyc-documents public = false  (customer ID documents and files)
select id, name, public, created_at
  from storage.buckets
 where id in ('site-media', 'kyc-documents')
 order by id;


-- 6. THE ROWS THE CODE EXPECTS ------------------------------------------
--    site_docs carries exactly five documents. A missing one is not
--    fatal — the site falls back to its built-in copy — but the console
--    cannot edit what is not there.
select id,
       updated_at,
       pg_column_size(data) as bytes,
       jsonb_typeof(data)   as shape
  from public.site_docs
 order by id;

--    The console's own book: exactly one row, id 'main'.
select id, updated_at, pg_column_size(data) as bytes
  from public.portal_docs
 order by id;


-- 7. CUSTOMERS, SIGNATURES AND STAFF ------------------------------------
--    The signature is not a table of its own: it lives at
--    data.profile.signature inside the customer's document. Both
--    counters below should match once every customer has signed.
select count(*)                                                       as customers,
       count(*) filter (where data -> 'profile' -> 'signature' is not null) as with_signature,
       count(*) filter (where jsonb_typeof(data -> 'profile' -> 'signature' -> 'strokes') = 'array'
                          and jsonb_array_length(data -> 'profile' -> 'signature' -> 'strokes') > 0)
                                                                      as with_strokes,
       count(*) filter (where jsonb_typeof(data -> 'applications') = 'array'
                          and jsonb_array_length(data -> 'applications') > 0)
                                                                      as with_applications,
       max(updated_at)                                                as last_write
  from public.customer_docs;

--    Who can use the console. Only officer, credit, staff and admin
--    may pass the gate; customer rows never can.
select role, status, count(*) as accounts
  from public.profiles
 group by role, status
 order by role, status;

--    Contact-form traffic, and the staff trail.
select status, count(*) as enquiries, max(created_at) as latest
  from public.enquiries
 group by status
 order by status;

select count(*) as audit_entries, max(created_at) as latest
  from public.audit_log;
