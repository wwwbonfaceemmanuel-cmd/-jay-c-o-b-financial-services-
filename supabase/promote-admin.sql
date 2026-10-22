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
--     use the console but the app treats 'admin' as the owner role.
--
-- The script is safe to re-run, and it repairs the profile row if the
-- signup trigger did not create one (for example when the account was
-- added before the schema was installed).
-- =====================================================================

-- 1. Which accounts exist? (copy the exact email into step 2)
select u.id,
       u.email,
       u.email_confirmed_at is not null as confirmed,
       p.role,
       p.status,
       u.created_at
  from auth.users u
  left join public.profiles p on p.id = u.id
 order by u.created_at desc;

-- 2. Promote -----------------------------------------------------------------
--    Change the address below, then run the whole DO block.
do $$
declare
  target_email text := 'you@jaycobfinancial.mw';   -- <-- EDIT THIS
  target_id uuid;
begin
  select id into target_id
    from auth.users
   where lower(email) = lower(trim(target_email))
   limit 1;

  if target_id is null then
    raise exception 'No account found for %. Create it in Authentication -> Users first.', target_email;
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

  raise notice '% is now a Super Admin (role: admin).', target_email;
end
$$;

-- 3. Confirm ----------------------------------------------------------------
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
-- Shortcut for later: the same promotion in one line (does not repair a
-- missing profile row, so prefer step 2 if this returns "No profile matched").
--
--   select public.promote_staff('another.admin@jaycobfinancial.mw');
--
-- To demote someone back to a customer:
--
--   update public.profiles set role = 'customer' where lower(email) = lower('someone@example.com');
--
-- To check what the website itself sees, open system-check.html and sign in
-- with the account: the "Administrator role" and "Write test" lines must be
-- green.
-- ---------------------------------------------------------------------
