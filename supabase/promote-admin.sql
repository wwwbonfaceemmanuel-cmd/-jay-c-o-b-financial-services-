-- =====================================================================
-- JAY C O B FINANCIAL SERVICES — make an account a Super Admin
-- ---------------------------------------------------------------------
-- Run in Supabase -> SQL Editor after the account exists in
-- Authentication -> Users.
--
--   * role 'admin' is the Super Admin: the highest role in the system.
--     It can open the admin console, change the website, publish the live
--     feed, approve applications and read every customer document.
--   * 'staff', 'officer' and 'credit' are ordinary staff roles: they can
--     use the console, but the app treats 'admin' as the owner role.
--
-- Behaviour
--   • Leave target_email as null and, when the project has exactly one
--     account, that account is promoted — no editing needed.
--   • With several accounts it stops and lists them, so nothing is
--     promoted by accident; set target_email and run it again.
--   • It repairs a missing profile row (an account created before the
--     schema was installed), then promotes it.
-- Safe to re-run.
-- =====================================================================

-- 1. Which accounts exist? ---------------------------------------------
select u.id,
       u.email,
       u.email_confirmed_at is not null as confirmed,
       p.role,
       p.status,
       u.created_at
  from auth.users u
  left join public.profiles p on p.id = u.id
 order by u.created_at desc;

-- 2. Promote -----------------------------------------------------------
do $$
declare
  target_email text := null;      -- e.g. 'owner@jaycobfinancial.mw'; null = auto
  target_id    uuid;
  total        int;
  candidates   text;
  promoted     text;
begin
  if target_email is not null and trim(target_email) <> '' then
    select id into target_id
      from auth.users
     where lower(email) = lower(trim(target_email))
     limit 1;
    if target_id is null then
      raise exception 'No account found for %. Run step 1 to see the addresses that exist.', target_email;
    end if;
  else
    select count(*) into total from auth.users;
    if total = 0 then
      raise exception 'No accounts yet. Create one in Authentication -> Users first.';
    elsif total > 1 then
      select string_agg(email, ', ' order by created_at)
        into candidates
        from auth.users;
      raise exception 'This project has % accounts (%). Set target_email at the top of this block to the one you want.',
        total, candidates;
    else
      select id into target_id from auth.users limit 1;
    end if;
  end if;

  -- Create the profile if the signup trigger missed it, otherwise promote.
  insert into public.profiles (id, full_name, email, phone, account_no, role, status)
  select u.id,
         coalesce(nullif(u.raw_user_meta_data ->> 'full_name', ''), split_part(u.email, '@', 1)),
         u.email,
         coalesce(u.raw_user_meta_data ->> 'phone', ''),
         'JC-ACC-' || upper(substr(u.id::text, 1, 6)),
         'admin',
         'active'
    from auth.users u
   where u.id = target_id
  on conflict (id) do update
     set role       = 'admin',
         status     = 'active',
         email      = excluded.email,
         updated_at = now();

  select email into promoted from auth.users where id = target_id;
  raise notice '% is now a Super Admin (role: admin).', promoted;
end
$$;

-- 3. Confirm ------------------------------------------------------------
select p.email,
       p.role,
       p.status,
       p.account_no,
       p.updated_at,
       case when p.role = 'admin' then 'Super Admin — full console access'
            when p.role in ('staff', 'officer', 'credit') then 'Staff — console access'
            else 'Customer — dashboard only'
       end as access
  from public.profiles p
 order by (p.role = 'admin') desc, p.email;

-- ---------------------------------------------------------------------
-- Shortcut once the profile row exists (does not repair a missing row):
--
--   select public.promote_staff('another.admin@jaycobfinancial.mw');
--
-- Demote back to a customer:
--
--   update public.profiles
--      set role = 'customer'
--    where lower(email) = lower('someone@example.com');
--
-- Then open system-check.html and sign in: "Administrator role" and
-- "Write test (admin)" must both be green.
-- ---------------------------------------------------------------------
