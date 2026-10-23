-- =====================================================================
-- JAY C O B FINANCIAL SERVICES — retire an old lending scaffold
-- ---------------------------------------------------------------------
-- The project used to hold a second, unrelated lending schema:
--
--   announcements      app_settings       audit_logs
--   business_details   chat_messages      chats
--   contact_enquiries  employment_details followups
--   guarantors         kyc_documents      loan_applications
--   loan_products      loan_schedules     loans
--   notifications      properties         repayments
--   transactions
--
-- The website and the console do NOT use any of them. All customer and
-- console data lives in customer_docs / portal_docs / site_docs, and the
-- only other tables the app touches are profiles, enquiries and
-- audit_log (singular — different from audit_logs above).
--
-- Two reasons to deal with them:
--   1. Confusion — loans/repayments/transactions here are empty shells
--      that look like the real books but are never written by the app.
--   2. Exposure — if the old scaffold granted them to anon/authenticated,
--      anything inside is reachable through the REST API.
--
-- Run the steps IN ORDER. Step 1 only reads. Step 2 is safe and
-- reversible. Step 3 deletes, and refuses to run while any of those
-- tables still holds rows.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. WHAT IS INSIDE THEM? (read only)
--    Look at row_count. Anything above 0 is data somebody may still
--    need: export it first (Dashboard → Table editor → Export CSV).
-- ---------------------------------------------------------------------
select t.table_name,
       (xpath('/row/c/text()',
              query_to_xml(format('select count(*) as c from public.%I', t.table_name),
                           false, true, '')))[1]::text::bigint as row_count,
       (select count(*) from information_schema.columns c
         where c.table_schema = 'public' and c.table_name = t.table_name) as columns,
       coalesce((select string_agg(distinct g.grantee, ', ')
                   from information_schema.role_table_grants g
                  where g.table_schema = 'public'
                    and g.table_name = t.table_name
                    and g.grantee in ('anon', 'authenticated')), '(no API grants)') as api_grants
  from information_schema.tables t
 where t.table_schema = 'public'
   and t.table_type = 'BASE TABLE'
   and t.table_name in (
     'announcements', 'app_settings', 'audit_logs', 'business_details',
     'chat_messages', 'chats', 'contact_enquiries', 'employment_details',
     'followups', 'guarantors', 'kyc_documents', 'loan_applications',
     'loan_products', 'loan_schedules', 'loans', 'notifications',
     'properties', 'repayments', 'transactions'
   )
 order by t.table_name;


-- ---------------------------------------------------------------------
-- 2. LOCK THEM DOWN (safe, reversible, deletes nothing)
--    Cut API access to the old scaffold while you decide what to do with
--    the data. RLS with no policy means "no rows visible" even if a
--    grant is left behind. This cannot affect our own tables.
-- ---------------------------------------------------------------------
do $$
declare
  t text;
  legacy text[] := array[
    'announcements', 'app_settings', 'audit_logs', 'business_details',
    'chat_messages', 'chats', 'contact_enquiries', 'employment_details',
    'followups', 'guarantors', 'kyc_documents', 'loan_applications',
    'loan_products', 'loan_schedules', 'loans', 'notifications',
    'properties', 'repayments', 'transactions'
  ];
begin
  foreach t in array legacy loop
    if to_regclass('public.' || t) is null then continue; end if;
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
  raise notice 'Legacy scaffold locked: RLS on, API grants removed. Nothing was deleted.';
end;
$$;


-- ---------------------------------------------------------------------
-- 3. DELETE THEM (destructive — read the guard)
--    The block below counts rows first. If ANY of the legacy tables still
--    holds data it stops with a message naming that table and changes
--    nothing. Only after you have exported what you need, set
--        allow_data_loss := true;
--    and run it again.
--
--    Our six tables (profiles, site_docs, portal_docs, customer_docs,
--    enquiries, audit_log) can never be listed here.
-- ---------------------------------------------------------------------
do $$
declare
  allow_data_loss boolean := false;   -- set to true only after exporting
  t text;
  n bigint;
  dirty text[] := array[]::text[];
  legacy text[] := array[
    'announcements', 'app_settings', 'audit_logs', 'business_details',
    'chat_messages', 'chats', 'contact_enquiries', 'employment_details',
    'followups', 'guarantors', 'kyc_documents', 'loan_applications',
    'loan_products', 'loan_schedules', 'loans', 'notifications',
    'properties', 'repayments', 'transactions'
  ];
begin
  -- protect our own tables, whatever else happens
  if legacy && array['profiles', 'site_docs', 'portal_docs', 'customer_docs', 'enquiries', 'audit_log'] then
    raise exception 'This list must never contain an application table. Nothing was dropped.';
  end if;

  foreach t in array legacy loop
    if to_regclass('public.' || t) is null then continue; end if;
    execute format('select count(*) from public.%I', t) into n;
    if n > 0 then
      dirty := dirty || (t || ' (' || n || ' rows)');
    end if;
  end loop;

  if array_length(dirty, 1) is not null and not allow_data_loss then
    raise exception 'Stopped: these legacy tables still hold data — %. Export them first (Table editor → Export CSV), then set allow_data_loss := true and run again. Nothing was deleted.',
      array_to_string(dirty, ', ');
  end if;

  foreach t in array legacy loop
    if to_regclass('public.' || t) is null then continue; end if;
    execute format('drop table if exists public.%I cascade', t);
    raise notice 'Dropped public.%', t;
  end loop;

  raise notice 'Legacy scaffold removed. The application tables were untouched.';
end;
$$;

-- Ask PostgREST to forget the deleted tables immediately.
notify pgrst, 'reload schema';


-- ---------------------------------------------------------------------
-- 4. CONFIRM
--    Expect: our_tables = 6, legacy_tables_left = 0, and nothing else.
-- ---------------------------------------------------------------------
select 'our_tables' as check_name,
       (select count(*) from information_schema.tables
         where table_schema = 'public' and table_type = 'BASE TABLE'
           and table_name in ('profiles', 'site_docs', 'portal_docs',
                              'customer_docs', 'enquiries', 'audit_log'))::text || ' / 6' as value
union all
select 'legacy_tables_left',
       (select count(*) from information_schema.tables
         where table_schema = 'public' and table_type = 'BASE TABLE'
           and table_name in (
             'announcements', 'app_settings', 'audit_logs', 'business_details',
             'chat_messages', 'chats', 'contact_enquiries', 'employment_details',
             'followups', 'guarantors', 'kyc_documents', 'loan_applications',
             'loan_products', 'loan_schedules', 'loans', 'notifications',
             'properties', 'repayments', 'transactions'))::text
union all
select 'website_documents',
       (select count(*) from public.site_docs)::text || ' (expect 5)'
union all
select 'live_posts',
       coalesce((select jsonb_array_length(data) from public.site_docs where id = 'live_posts')::text, '0')
union all
select 'catalogue_products',
       coalesce((select jsonb_array_length(data) from public.site_docs where id = 'products')::text, '0')
union all
select 'staff_accounts',
       (select count(*) from public.profiles where role in ('admin', 'staff', 'officer', 'credit'))::text
union all
select 'storage_buckets',
       (select count(*) from storage.buckets where id in ('site-media', 'kyc-documents'))::text || ' / 2';
