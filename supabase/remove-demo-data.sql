-- =====================================================================
-- JAY C O B FINANCIAL SERVICES — remove demonstration data
-- ---------------------------------------------------------------------
-- The console used to publish its whole in-browser demonstration book to
-- portal_docs/main the first time an administrator signed in. That means
-- your live project can still hold twelve invented customers, ten invented
-- loans, the invented staff list and the invented ledger.
--
-- Run this once, in Supabase → SQL Editor, after deploying the version of
-- the site that starts empty. Until it runs, the console will keep loading
-- those records back from the database.
--
-- Safety: step 1 only reads. Step 2 removes the console document (the
-- console recreates its configuration the next time you open it). Step 3
-- removes customer documents that belong to the demonstration identity.
-- Step 4 removes a demonstration enquiry. Step 5 is optional and deletes
-- the demonstration login from Authentication.
-- =====================================================================

-- 1. What is in there? -------------------------------------------------
select 'portal console document' as where_it_is,
       id,
       updated_at,
       jsonb_array_length(coalesce(data -> 'customers', '[]'::jsonb)) as customers,
       jsonb_array_length(coalesce(data -> 'loans', '[]'::jsonb))     as loans,
       jsonb_array_length(coalesce(data -> 'admins', '[]'::jsonb))    as staff,
       coalesce(data -> 'customers' -> 0 ->> 'name', '—')             as first_customer
  from public.portal_docs
 where id = 'main'

union all
select 'customer documents',
       owner::text,
       updated_at,
       null, null, null,
       coalesce(data -> 'profile' ->> 'fullName', '—')
  from public.customer_docs
 where data -> 'profile' ->> 'email' = 'demo@jaycobfinancial.mw'
    or data -> 'profile' ->> 'fullName' = 'Memory Tembo'
    or data -> 'profile' ->> 'accountNumber' = 'JC-ACC-100412';

-- 2. Clear the console book -------------------------------------------
delete from public.portal_docs where id = 'main';

-- 3. Clear demonstration customer documents ---------------------------
delete from public.customer_docs
 where data -> 'profile' ->> 'email' = 'demo@jaycobfinancial.mw'
    or data -> 'profile' ->> 'fullName' = 'Memory Tembo'
    or data -> 'profile' ->> 'accountNumber' = 'JC-ACC-100412';

-- 4. Clear demonstration enquiries ------------------------------------
delete from public.enquiries
 where lower(coalesce(email, '')) = 'demo@jaycobfinancial.mw'
    or lower(coalesce(name, '')) = 'memory tembo';

-- 5. Optional — remove the demonstration login ------------------------
--    Only run this if Authentication → Users lists a demo account.
--    Nothing in the current build creates one, but an earlier build or a
--    manual test could have left it behind.
--
-- delete from auth.users where lower(email) = 'demo@jaycobfinancial.mw';

-- 6. Confirm ----------------------------------------------------------
select 'portal_docs rows left'  as check_name, count(*)::text as value from public.portal_docs
union all
select 'demo customer documents left', count(*)::text from public.customer_docs
 where data -> 'profile' ->> 'email' = 'demo@jaycobfinancial.mw'
    or data -> 'profile' ->> 'fullName' = 'Memory Tembo'
union all
select 'demo enquiries left', count(*)::text from public.enquiries
 where lower(coalesce(email, '')) = 'demo@jaycobfinancial.mw'
union all
select 'real customer documents', count(*)::text from public.customer_docs
union all
select 'staff accounts', count(*)::text from public.profiles where role in ('admin','staff','officer','credit')
union all
select 'real website documents', count(*)::text from public.site_docs;
