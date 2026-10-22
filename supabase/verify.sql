-- =====================================================================
-- JAY C O B FINANCIAL SERVICES — installation report
-- ---------------------------------------------------------------------
-- Paste into Supabase -> SQL Editor -> Run. One table comes back: every
-- item the website, the admin console and the customer dashboard need,
-- with PASS / MISSING and the value found.
--
-- Anything marked MISSING names the file that fixes it:
--   tables, policies, functions, buckets  -> supabase/schema.sql
--   website documents, catalogue          -> supabase/seed.sql
--   administrator                         -> supabase/promote-admin.sql
-- =====================================================================

with checks as (

  /* ---- tables ---------------------------------------------------- */
  select 'Table · profiles' as item,
         case when to_regclass('public.profiles') is not null then 'PASS' else 'MISSING' end as status,
         'one row per account, carries the role' as detail
  union all select 'Table · site_docs',
         case when to_regclass('public.site_docs') is not null then 'PASS' else 'MISSING' end,
         'website settings, catalogue, page content, live feed'
  union all select 'Table · portal_docs',
         case when to_regclass('public.portal_docs') is not null then 'PASS' else 'MISSING' end,
         'the admin console database'
  union all select 'Table · customer_docs',
         case when to_regclass('public.customer_docs') is not null then 'PASS' else 'MISSING' end,
         'one dashboard document per customer'
  union all select 'Table · enquiries',
         case when to_regclass('public.enquiries') is not null then 'PASS' else 'MISSING' end,
         'contact-form submissions'
  union all select 'Table · audit_log',
         case when to_regclass('public.audit_log') is not null then 'PASS' else 'MISSING' end,
         'who changed what, when'

  /* ---- row level security ---------------------------------------- */
  union all select 'Row level security',
         case when (select bool_and(rowsecurity) from pg_tables
                     where schemaname = 'public'
                       and tablename in ('profiles','site_docs','portal_docs','customer_docs','enquiries','audit_log'))
              then 'PASS' else 'MISSING' end,
         (select count(*)::text || ' of 6 tables protected' from pg_tables
           where schemaname = 'public' and rowsecurity
             and tablename in ('profiles','site_docs','portal_docs','customer_docs','enquiries','audit_log'))

  union all select 'Policies',
         case when (select count(*) from pg_policies where schemaname = 'public') >= 14 then 'PASS' else 'MISSING' end,
         (select count(*)::text || ' policies installed' from pg_policies where schemaname = 'public')

  /* ---- functions ------------------------------------------------- */
  union all select 'Function · is_staff()',
         case when to_regprocedure('public.is_staff()') is not null then 'PASS' else 'MISSING' end,
         'role check used by every policy'
  union all select 'Function · promote_staff(text)',
         case when to_regprocedure('public.promote_staff(text)') is not null then 'PASS' else 'MISSING' end,
         'promote an account to admin'
  union all select 'Trigger · new user profile',
         case when exists (select 1 from pg_trigger where tgname = 'on_auth_user_created') then 'PASS' else 'MISSING' end,
         'creates a profile row automatically on signup'
  union all select 'Trigger · role guard',
         case when exists (select 1 from pg_trigger where tgname = 'profiles_guard_role') then 'PASS' else 'MISSING' end,
         'stops an account promoting itself through the API'
  union all select 'Trigger · audit',
         case when exists (select 1 from pg_trigger where tgname = 'site_docs_audit') then 'PASS' else 'MISSING' end,
         'logs every document change'

  /* ---- storage --------------------------------------------------- */
  union all select 'Bucket · site-media',
         case when exists (select 1 from storage.buckets where id = 'site-media' and public) then 'PASS' else 'MISSING' end,
         'public read, staff write — live-feed photos'
  union all select 'Bucket · kyc-documents',
         case when exists (select 1 from storage.buckets where id = 'kyc-documents' and not public) then 'PASS' else 'MISSING' end,
         'private — owner and staff only'
  union all select 'Storage policies',
         case when (select count(*) from pg_policies where schemaname = 'storage' and tablename = 'objects') >= 6 then 'PASS' else 'MISSING' end,
         (select count(*)::text || ' policies on storage.objects' from pg_policies
           where schemaname = 'storage' and tablename = 'objects')

  /* ---- seeded content -------------------------------------------- */
  union all select 'Document · settings',
         case when exists (select 1 from public.site_docs where id = 'settings') then 'PASS' else 'MISSING' end,
         coalesce((select (data ->> 'brand') || ' · ' || (data ->> 'phone')
                     from public.site_docs where id = 'settings'), 'run supabase/seed.sql')
  union all select 'Document · products',
         case when (select jsonb_array_length(data) from public.site_docs where id = 'products') = 11 then 'PASS' else 'MISSING' end,
         coalesce((select jsonb_array_length(data)::text || ' loan products'
                     from public.site_docs where id = 'products'), 'run supabase/seed.sql')
  union all select 'Document · live_posts',
         case when (select jsonb_array_length(data) from public.site_docs where id = 'live_posts') > 0 then 'PASS' else 'MISSING' end,
         coalesce((select jsonb_array_length(data)::text || ' live updates'
                     from public.site_docs where id = 'live_posts'), 'run supabase/seed.sql')
  union all select 'Document · content',
         case when exists (select 1 from public.site_docs where id = 'content') then 'PASS' else 'MISSING' end,
         'per-page text overrides (empty until edited in the console)'
  union all select 'Document · sections',
         case when exists (select 1 from public.site_docs where id = 'sections') then 'PASS' else 'MISSING' end,
         'per-page section visibility'

  /* ---- accounts -------------------------------------------------- */
  union all select 'Administrator',
         case when (select count(*) from public.profiles where role = 'admin') > 0 then 'PASS' else 'MISSING' end,
         coalesce((select string_agg(email, ', ') from public.profiles where role = 'admin'),
                  'run supabase/promote-admin.sql')
  union all select 'Profile coverage',
         case when (select count(*) from auth.users) = (select count(*) from public.profiles)
              then 'PASS' else 'MISSING' end,
         (select count(*)::text || ' auth users · ' || (select count(*) from public.profiles)::text || ' profiles'
            from auth.users)

  /* ---- activity -------------------------------------------------- */
  union all select 'Console database',
         case when exists (select 1 from public.portal_docs where id = 'main') then 'PASS' else 'INFO' end,
         case when exists (select 1 from public.portal_docs where id = 'main')
              then 'saved by the admin console'
              else 'created on the first admin sign-in' end
  union all select 'Audit trail',
         case when (select count(*) from public.audit_log) > 0 then 'PASS' else 'INFO' end,
         (select count(*)::text || ' entries recorded' from public.audit_log)
)
select item, status, detail
  from checks
 order by case status when 'MISSING' then 0 when 'INFO' then 1 else 2 end, item;
