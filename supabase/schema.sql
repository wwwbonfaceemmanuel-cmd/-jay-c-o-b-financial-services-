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
