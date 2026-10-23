-- =====================================================================
-- JAY C O B FINANCIAL SERVICES — remove the old demonstration book
-- ---------------------------------------------------------------------
-- Earlier builds shipped a console pre-filled with invented customers,
-- loans, repayments, staff and ledger entries. That book was written to
-- portal_docs/main the first time an administrator signed in, so a live
-- project can still hold it even though the current code starts empty.
--
-- Run this once, in Supabase → SQL Editor, AFTER deploying the version
-- of the site whose only store is Supabase. Until it runs, the console
-- keeps loading the old records back from portal_docs/main.
--
-- Step 1 only reads. Steps 2–4 delete demonstration rows. Step 5 is
-- optional (it removes the demonstration login). Step 6 confirms.
-- =====================================================================

-- 1. What is in the console document right now? ------------------------
select 'portal_docs/main' as where_it_is,
       id,
       updated_at,
       jsonb_array_length(coalesce(data -> 'customers', '[]'::jsonb)) as customers,
       jsonb_array_length(coalesce(data -> 'loans', '[]'::jsonb))     as loans,
       jsonb_array_length(coalesce(data -> 'admins', '[]'::jsonb))    as staff,
       coalesce(data -> 'customers' -> 0 ->> 'name', '—')             as first_customer
  from public.portal_docs
 where id = 'main';

-- 2. Delete the console book -------------------------------------------
--    The console rebuilds its configuration (products, branches, chart of
--    accounts, roles, settings) from the code the next time a staff member
--    opens it, and every record it lists after that comes from this table.
delete from public.portal_docs where id = 'main';

-- 3. Delete demonstration customer documents ---------------------------
delete from public.customer_docs
 where data -> 'profile' ->> 'email' = 'demo@jaycobfinancial.mw'
    or data -> 'profile' ->> 'fullName' = 'Memory Tembo'
    or data -> 'profile' ->> 'accountNumber' = 'JC-ACC-100412';

-- 4. Delete demonstration enquiries ------------------------------------
delete from public.enquiries
 where lower(coalesce(email, '')) = 'demo@jaycobfinancial.mw'
    or lower(coalesce(name, '')) = 'memory tembo';

-- 5. Remove the demonstration login, if one exists ---------------------
--    Matches that address only. Nothing is touched if it was never used.
delete from auth.users where lower(email) = 'demo@jaycobfinancial.mw';

-- 6. Confirm -----------------------------------------------------------
select 'portal_docs rows'              as check_name, count(*)::text as value from public.portal_docs
union all
select 'demo customer documents',      count(*)::text from public.customer_docs
 where data -> 'profile' ->> 'email' = 'demo@jaycobfinancial.mw'
    or data -> 'profile' ->> 'fullName' = 'Memory Tembo'
union all
select 'customer documents (real)',    count(*)::text from public.customer_docs
union all
select 'demo enquiries',               count(*)::text from public.enquiries
 where lower(coalesce(email, '')) = 'demo@jaycobfinancial.mw'
union all
select 'website documents',            count(*)::text from public.site_docs
union all
select 'staff accounts',               count(*)::text from public.profiles
 where role in ('admin', 'staff', 'officer', 'credit');
