-- =====================================================================
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


-- #####################################################################
-- # SCHEMA
-- #####################################################################

-- =====================================================================
-- JAY C O B FINANCIAL SERVICES — Supabase schema
-- ---------------------------------------------------------------------
-- Run this whole file once in the Supabase SQL editor
-- (Dashboard → SQL Editor → New query → paste → Run).
-- Safe to run again: every statement is idempotent.
--
-- All money is Malawian Kwacha (MWK) and is stored inside the JSON
-- documents as numbers, so nothing is rounded on the way in or out.
--
-- Layout
--   1. helpers            is_staff(), is_admin(), touch()
--   2. profiles           one row per Supabase Auth user (carries role)
--   3. site_docs          public website content (catalogue, settings,
--                         page overrides, live feed)
--   4. portal_docs        the admin console database (staff only)
--   5. customer_docs      one dashboard document per customer
--   6. enquiries          contact-form submissions
--   7. audit_log          append-only staff activity trail
--   8. storage            site-media (public) + kyc-documents (private)
--   9. staff helpers      make someone an administrator
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. HELPERS
-- ---------------------------------------------------------------------
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
     where id = auth.uid()
       and role in ('admin', 'staff', 'officer', 'credit')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
     where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. PROFILES
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '',
  email       text,
  phone       text,
  account_no  text,
  role        text not null default 'customer'
              check (role in ('customer', 'officer', 'credit', 'staff', 'admin')),
  status      text not null default 'active'
              check (status in ('active', 'suspended', 'closed')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index if not exists profiles_account_no_idx
  on public.profiles (account_no) where account_no is not null;

alter table public.profiles enable row level security;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select to authenticated
  using (id = auth.uid());

drop policy if exists "staff read profiles" on public.profiles;
create policy "staff read profiles" on public.profiles
  for select to authenticated
  using (public.is_staff());

drop policy if exists "create own profile" on public.profiles;
create policy "create own profile" on public.profiles
  for insert to authenticated
  with check (id = auth.uid() and role = 'customer');

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_staff())
  with check (id = auth.uid() or public.is_staff());

grant select, insert, update on public.profiles to authenticated;

-- Nobody can promote themselves through the API.
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_staff() then
    raise exception 'Only administrators can change a role';
  end if;
  if new.status is distinct from old.status and not public.is_staff() then
    raise exception 'Only administrators can change an account status';
  end if;
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_guard_role on public.profiles;
create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function public.guard_profile_role();

-- Every new auth user gets a customer profile automatically.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, phone, account_no, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(new.raw_user_meta_data ->> 'account_no', 'JC-ACC-' || upper(substr(new.id::text, 1, 6))),
    'customer'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 3. SITE DOCUMENTS — the public website
--    ids: settings | products | content | sections | live_posts
-- ---------------------------------------------------------------------
create table if not exists public.site_docs (
  id          text primary key,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users (id) on delete set null
);

alter table public.site_docs enable row level security;

drop policy if exists "site documents are public" on public.site_docs;
create policy "site documents are public" on public.site_docs
  for select to anon, authenticated
  using (true);

drop policy if exists "staff write site documents" on public.site_docs;
create policy "staff write site documents" on public.site_docs
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop trigger if exists site_docs_touch on public.site_docs;
create trigger site_docs_touch
  before update on public.site_docs
  for each row execute function public.touch_updated_at();

grant select on public.site_docs to anon, authenticated;
grant insert, update, delete on public.site_docs to authenticated;

-- ---------------------------------------------------------------------
-- 4. PORTAL DOCUMENT — the admin console database (staff only)
-- ---------------------------------------------------------------------
create table if not exists public.portal_docs (
  id          text primary key,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users (id) on delete set null
);

alter table public.portal_docs enable row level security;

drop policy if exists "staff use the portal document" on public.portal_docs;
create policy "staff use the portal document" on public.portal_docs
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop trigger if exists portal_docs_touch on public.portal_docs;
create trigger portal_docs_touch
  before update on public.portal_docs
  for each row execute function public.touch_updated_at();

grant select, insert, update, delete on public.portal_docs to authenticated;

-- ---------------------------------------------------------------------
-- 5. CUSTOMER DOCUMENTS — one dashboard record per customer
-- ---------------------------------------------------------------------
create table if not exists public.customer_docs (
  owner       uuid primary key references auth.users (id) on delete cascade,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

alter table public.customer_docs enable row level security;

drop policy if exists "own customer document" on public.customer_docs;
create policy "own customer document" on public.customer_docs
  for all to authenticated
  using (owner = auth.uid())
  with check (owner = auth.uid());

drop policy if exists "staff read customer documents" on public.customer_docs;
create policy "staff read customer documents" on public.customer_docs
  for select to authenticated
  using (public.is_staff());

drop policy if exists "staff write customer documents" on public.customer_docs;
create policy "staff write customer documents" on public.customer_docs
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists "staff insert customer documents" on public.customer_docs;
create policy "staff insert customer documents" on public.customer_docs
  for insert to authenticated
  with check (public.is_staff());

drop trigger if exists customer_docs_touch on public.customer_docs;
create trigger customer_docs_touch
  before update on public.customer_docs
  for each row execute function public.touch_updated_at();

grant select, insert, update, delete on public.customer_docs to authenticated;

create index if not exists customer_docs_updated_idx
  on public.customer_docs (updated_at desc);

-- ---------------------------------------------------------------------
-- 6. ENQUIRIES — contact form
-- ---------------------------------------------------------------------
create table if not exists public.enquiries (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  phone       text,
  service     text,
  location    text,
  preference  text,
  message     text not null,
  consent     boolean not null default false,
  status      text not null default 'new'
              check (status in ('new', 'contacted', 'qualified', 'closed')),
  created_at  timestamptz not null default now()
);

alter table public.enquiries enable row level security;

drop policy if exists "anyone can submit an enquiry" on public.enquiries;
create policy "anyone can submit an enquiry" on public.enquiries
  for insert to anon, authenticated
  with check (consent = true);

drop policy if exists "staff read enquiries" on public.enquiries;
create policy "staff read enquiries" on public.enquiries
  for select to authenticated
  using (public.is_staff());

drop policy if exists "staff update enquiries" on public.enquiries;
create policy "staff update enquiries" on public.enquiries
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

grant insert on public.enquiries to anon, authenticated;
grant select, update, delete on public.enquiries to authenticated;

-- ---------------------------------------------------------------------
-- 7. AUDIT LOG — append-only trail of staff activity
-- ---------------------------------------------------------------------
create table if not exists public.audit_log (
  id          bigserial primary key,
  actor       uuid references auth.users (id) on delete set null,
  action      text not null,
  target      text,
  detail      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

alter table public.audit_log enable row level security;

drop policy if exists "staff read audit" on public.audit_log;
create policy "staff read audit" on public.audit_log
  for select to authenticated
  using (public.is_staff());

drop policy if exists "staff write audit" on public.audit_log;
create policy "staff write audit" on public.audit_log
  for insert to authenticated
  with check (public.is_staff());

grant select, insert on public.audit_log to authenticated;

create index if not exists audit_log_created_idx
  on public.audit_log (created_at desc);

-- Record document changes automatically (who touched what, when).
create or replace function public.log_doc_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  doc_id text;
begin
  doc_id := coalesce((to_jsonb(new) ->> 'id'), (to_jsonb(new) ->> 'owner'));
  insert into public.audit_log (actor, action, target, detail)
  values (
    auth.uid(),
    lower(tg_op) || ' ' || tg_table_name,
    doc_id,
    jsonb_build_object('table', tg_table_name, 'at', now())
  );
  return new;
end;
$$;

drop trigger if exists site_docs_audit on public.site_docs;
create trigger site_docs_audit
  after insert or update or delete on public.site_docs
  for each row execute function public.log_doc_change();

drop trigger if exists portal_docs_audit on public.portal_docs;
create trigger portal_docs_audit
  after insert or update or delete on public.portal_docs
  for each row execute function public.log_doc_change();

-- ---------------------------------------------------------------------
-- 8. STORAGE
--    site-media     public read (live-feed photos)
--    kyc-documents  private, owner + staff only
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('site-media', 'site-media', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('kyc-documents', 'kyc-documents', false)
on conflict (id) do nothing;

-- Storage policies. Created through dynamic SQL so that a project where the
-- SQL editor cannot modify storage.objects still completes every other step.
-- If a notice is raised, add the same policies in Dashboard -> Storage ->
-- Policies (the names are listed in the notice).
do $storage$
declare
  stmt text;
  policy_rows text[][] := array[
    array['site media is public', 'select', 'anon, authenticated',
          'bucket_id = ''site-media''', null],
    array['staff upload site media', 'insert', 'authenticated',
          null, 'bucket_id = ''site-media'' and public.is_staff()'],
    array['staff update site media', 'update', 'authenticated',
          'bucket_id = ''site-media'' and public.is_staff()', null],
    array['staff delete site media', 'delete', 'authenticated',
          'bucket_id = ''site-media'' and public.is_staff()', null],
    array['own kyc documents', 'all', 'authenticated',
          'bucket_id = ''kyc-documents'' and (storage.foldername(name))[1] = auth.uid()::text',
          'bucket_id = ''kyc-documents'' and (storage.foldername(name))[1] = auth.uid()::text'],
    array['staff read kyc documents', 'select', 'authenticated',
          'bucket_id = ''kyc-documents'' and public.is_staff()', null]
  ];
  item text[];
  policy_name text;
begin
  foreach item slice 1 in array policy_rows loop
    policy_name := item[1];
    begin
      execute format('drop policy if exists %I on storage.objects', policy_name);
      stmt := format('create policy %I on storage.objects for %s to %s', policy_name, item[2], item[3]);
      if item[4] is not null then stmt := stmt || format(' using (%s)', item[4]); end if;
      if item[5] is not null then stmt := stmt || format(' with check (%s)', item[5]); end if;
      execute stmt;
    exception when insufficient_privilege or undefined_table or undefined_object then
      raise notice 'Could not create storage policy %. Add it in Dashboard -> Storage -> Policies.', policy_name;
    end;
  end loop;
end;
$storage$;

-- ---------------------------------------------------------------------
-- 9. STAFF HELPERS
--    After creating the administrator in Authentication → Users, run:
--      select public.promote_staff('you@jaycobfinancial.mw');
-- ---------------------------------------------------------------------
create or replace function public.promote_staff(staff_email text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  updated int;
begin
  update public.profiles
     set role = 'admin'
   where lower(email) = lower(staff_email)
     and role <> 'admin';
  get diagnostics updated = row_count;
  if updated = 0 then
    return 'No profile matched ' || staff_email || '. Create the user in Authentication first.';
  end if;
  return staff_email || ' is now an administrator.';
end;
$$;

revoke all on function public.promote_staff(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 10. OPTIONAL: realtime for live updates and staff dashboards
-- ---------------------------------------------------------------------
do $$
begin
  begin
    alter publication supabase_realtime add table public.site_docs;
  exception when duplicate_object or undefined_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.customer_docs;
  exception when duplicate_object or undefined_object then null;
  end;
end;
$$;

-- ---------------------------------------------------------------------
-- NOTES
--  • Never expose the service-role key in the browser bundle. The anon
--    key is safe because every table above is guarded by RLS.
--  • Supabase → Authentication → Providers → Email: turn "Confirm email"
--    off while testing, on for production.
--  • Sign-in attempts, lockouts and OTP delivery are handled by Supabase
--    Auth settings (Authentication → Rate limits / Email templates).
-- ---------------------------------------------------------------------


-- #####################################################################
-- # SEED
-- #####################################################################

-- =====================================================================
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
  ('settings', '{"brand":"JAY C O B FINANCIAL SERVICES","shortBrand":"JAY C O B","tagline":"Licensed money lender · Lilongwe, Malawi","phone":"+265 999 123 456","phoneAlt":"+265 888 456 789","emergency":"+265 999 000 111","email":"hello@jaycobfinancial.mw","supportEmail":"support@jaycobfinancial.mw","address":"Plot 47/3, Area 47, Sector 3, Lilongwe, Malawi","hours":"Monday to Friday 08:00–17:00 · Saturday 08:00–12:00","currency":"MWK","registration":"MBRS-2024-11882","licence":"Money Lending Licence ML-2024-0118 — Reserve Bank of Malawi","social":{"facebook":"https://facebook.com/jaycobfinancial","linkedin":"https://linkedin.com/company/jaycobfinancial","whatsapp":"https://wa.me/265999123456","x":"https://x.com/jaycobfinancial"},"calc":{"amount":5000000,"rate":24,"rateBasis":"annual","basis":"monthly","term":1,"method":"reducing","frequency":"monthly","fee":2,"adminFee":0},"policy":{"graceDays":5,"penaltyPct":2,"maxDTI":40,"maxInstalmentShare":30,"minAge":18,"maxAge":65}}'::jsonb),
  ('products', '[{"id":"personal","name":"Personal Loan","rate":24,"rateBasis":"annual","method":"reducing","min":100000,"max":15000000,"minTerm":6,"maxTerm":48,"fee":2,"active":true,"summary":"Unsecured cash for school fees, home improvement and personal plans.","eligibility":["Age 18+ with a valid national ID","Resident in Malawi","Net income from MWK 120,000 per month","No current arrears with other lenders"]},{"id":"business","name":"Business Loan","rate":22,"rateBasis":"annual","method":"reducing","min":500000,"max":50000000,"minTerm":12,"maxTerm":60,"fee":2.5,"active":true,"summary":"Working capital, stock and expansion finance for registered businesses.","eligibility":["Registered business or trading licence","Six months of trading records","Business bank or mobile money account"]},{"id":"emergency","name":"Emergency Loan","rate":28,"rateBasis":"annual","method":"reducing","min":50000,"max":2000000,"minTerm":3,"maxTerm":12,"fee":2,"active":true,"summary":"Fast-tracked small amounts for urgent medical, funeral or travel costs.","eligibility":["Decision within one working day","Valid national ID","Verifiable income or guarantor"]},{"id":"salary","name":"Salary-based Loan","rate":23,"rateBasis":"annual","method":"reducing","min":100000,"max":10000000,"minTerm":6,"maxTerm":36,"fee":2,"active":true,"summary":"Repaid by employer payroll deduction, with a fixed monthly instalment.","eligibility":["Permanent or long-term contract employee","Employer willing to confirm employment","Net salary of MWK 150,000+ per month","Instalment within 40% of net salary"]},{"id":"employee","name":"Employee Loan","rate":21,"rateBasis":"annual","method":"reducing","min":100000,"max":8000000,"minTerm":6,"maxTerm":36,"fee":1.5,"active":true,"summary":"Preferential pricing for staff of partner employers and institutions.","eligibility":["Employer on our approved list","Six months in post","Payroll deduction mandate signed"]},{"id":"small-business","name":"Small-business Loan","rate":23,"rateBasis":"annual","method":"reducing","min":250000,"max":20000000,"minTerm":6,"maxTerm":48,"fee":2,"active":true,"summary":"For market traders, salons, shops and other micro-enterprises.","eligibility":["Trading for at least six months","Business records or mobile money history","Proof of business address"]},{"id":"agricultural","name":"Agricultural Loan","rate":20,"rateBasis":"annual","method":"reducing","min":200000,"max":25000000,"minTerm":6,"maxTerm":36,"fee":2,"active":true,"summary":"Seasonal input finance aligned to the harvest calendar.","eligibility":["Land rights, tenancy or cooperative membership","Seasonal repayment plan","Proof of input supplier"]},{"id":"short-term","name":"Short-term Loan","rate":29,"rateBasis":"annual","method":"reducing","min":50000,"max":3000000,"minTerm":1,"maxTerm":6,"fee":3,"active":true,"summary":"One to six months, for short gaps in cash flow.","eligibility":["Valid national ID","Verifiable weekly or monthly income","Repayment within six months"]},{"id":"long-term","name":"Long-term Loan","rate":21,"rateBasis":"annual","method":"reducing","min":1000000,"max":60000000,"minTerm":24,"maxTerm":84,"fee":2.5,"active":true,"summary":"Larger projects spread over two to seven years.","eligibility":["Proven income over at least 12 months","Security or guarantor for amounts above MWK 20,000,000","Affordability assessment passed"]},{"id":"secured","name":"Secured Loan","rate":18,"rateBasis":"annual","method":"reducing","min":500000,"max":80000000,"minTerm":12,"maxTerm":84,"fee":1.5,"active":true,"summary":"Backed by a vehicle, title deed or fixed deposit — our lowest rate.","eligibility":["Registered collateral in your name","Independent valuation","Comprehensive insurance where required"]},{"id":"unsecured","name":"Unsecured Loan","rate":26,"rateBasis":"annual","method":"reducing","min":100000,"max":10000000,"minTerm":6,"maxTerm":36,"fee":2.5,"active":true,"summary":"No collateral, assessed on income and credit record.","eligibility":["Clean repayment record","Verified income","Debt-to-income within policy"]}]'::jsonb),
  ('content', '{}'::jsonb),
  ('sections', '{}'::jsonb),
  ('live_posts', '[{"id":"lv-101","type":"announcement","title":"October intake is open","body":"Free 30-minute discovery calls are available from 28 October, in Lilongwe and by phone. Four slots remain this month.","link":"contact.html","linkLabel":"Book a slot","image":"","animation":"slide","pinned":true,"published":true,"date":"2026-10-20T08:30:00"},{"id":"lv-102","type":"card","title":"New: flat vs reducing calculator","body":"Compare both interest methods, see a dated monthly schedule and download the repayment plan as a CSV file.","link":"calculator.html","linkLabel":"Open calculator","image":"","animation":"flap","pinned":false,"published":true,"date":"2026-10-18T13:00:00"},{"id":"lv-103","type":"image","title":"Outreach clinic: Kasungu","body":"First Tuesday of every month at the community hall. Appointments only — bring three months of bank or mobile-money statements.","link":"contact.html","linkLabel":"Request an appointment","image":"assets/img/insight-business.jpg","animation":"swipe","pinned":false,"published":true,"date":"2026-10-12T09:15:00"},{"id":"lv-104","type":"announcement","title":"Policy renewal reminder","body":"Customers with cover renewing in November have been contacted. Check your documents in the customer dashboard.","link":"login.html?next=dashboard.html","linkLabel":"Open dashboard","image":"","animation":"rotate","pinned":false,"published":true,"date":"2026-10-04T16:45:00"},{"id":"lv-105","type":"blog","title":"How we price a loan in Malawi","body":"Every quote is built from four parts: the principal, the annual rate, the processing fee and the term. We publish all four before you sign, and the calculator on this site uses the same arithmetic as our credit team. Reducing balance means interest is charged on the balance that is still outstanding, so it falls as you repay; flat rate charges interest on the original amount for the whole term.","link":"interest-rates-fees.html","linkLabel":"Read the rate guide","image":"assets/img/insight-budget.jpg","animation":"swap","pinned":false,"published":true,"date":"2026-10-01T10:00:00"},{"id":"lv-106","type":"card","title":"Agricultural season loans — planting to harvest","body":"Repayments aligned to harvest cash-flow, with a grace period on principal until the first sale. Applications close 30 November.","link":"loan-products.html#agricultural","linkLabel":"See the product","image":"","animation":"endless","pinned":true,"published":true,"date":"2026-09-28T07:45:00"},{"id":"lv-107","type":"image","title":"New branch desk in Blantyre","body":"Walk-in support is now available at the Limbe office, Monday to Friday 08:00–17:00. No appointment needed for document drop-off.","link":"contact.html","linkLabel":"Find us","image":"assets/img/hero-consultation.jpg","animation":"spin","pinned":false,"published":true,"date":"2026-09-22T11:20:00"},{"id":"lv-108","type":"announcement","title":"Security notice: we never ask for your PIN","body":"Staff will never request your mobile-money PIN, password or one-time code. Report anything suspicious to security@jaycobfinancial.mw immediately.","link":"privacy.html","linkLabel":"How we protect you","image":"","animation":"endless","pinned":false,"published":true,"date":"2026-09-15T09:05:00"},{"id":"lv-109","type":"blog","title":"Five questions to ask before you borrow","body":"What is the total cost of credit? What happens if a payment is late? Can the term be shortened without a penalty? Is the rate fixed? And what does the schedule look like month by month? If a lender cannot answer all five in writing, keep walking.","link":"responsible-lending.html","linkLabel":"Responsible lending","image":"assets/img/about-team.jpg","animation":"slide","pinned":false,"published":true,"date":"2026-09-08T14:30:00"},{"id":"lv-110","type":"card","title":"Pay by Airtel Money or TNM Mpamba","body":"Repay from your phone in under a minute. Enter your loan reference, confirm the amount and keep the receipt in your dashboard.","link":"support.html","linkLabel":"How to pay","image":"","animation":"swap","pinned":false,"published":true,"date":"2026-09-01T08:00:00"}]'::jsonb)
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
