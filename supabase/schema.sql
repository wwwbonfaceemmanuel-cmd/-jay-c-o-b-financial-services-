-- =====================================================================
-- JAY C O B Financial Services — Supabase schema (starter)
-- Run in the Supabase SQL editor when you connect the backend.
-- All monetary columns are Malawian Kwacha (MWK), stored as numeric(14,2).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. LIVE UPDATES
--    Powers the live feed, carousel animations and corner notifications.
--    The front end already posts/selects these exact field names —
--    see assets/js/live.js and assets/js/config.js.
-- ---------------------------------------------------------------------
create table if not exists public.live_posts (
  id          uuid primary key default gen_random_uuid(),
  type        text        not null default 'announcement'
              check (type in ('announcement', 'card', 'image')),
  title       text        not null,
  body        text        not null,
  link        text,
  link_label  text        default 'Read more',
  image       text,
  animation   text        not null default 'slide'
              check (animation in ('slide', 'flap', 'swipe', 'rotate', 'spin')),
  pinned      boolean     not null default false,
  published   boolean     not null default true,
  date        timestamptz not null default now(),
  created_by  uuid        references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists live_posts_feed_idx
  on public.live_posts (published, pinned desc, date desc);

alter table public.live_posts enable row level security;

-- Anyone may read published updates.
create policy "live posts are publicly readable"
  on public.live_posts for select
  using (published = true);

-- Only signed-in administrators may write.
create policy "admins insert live posts"
  on public.live_posts for insert to authenticated
  with check ((auth.jwt() ->> 'role') = 'admin');

create policy "admins update live posts"
  on public.live_posts for update to authenticated
  using ((auth.jwt() ->> 'role') = 'admin');

create policy "admins delete live posts"
  on public.live_posts for delete to authenticated
  using ((auth.jwt() ->> 'role') = 'admin');

-- ---------------------------------------------------------------------
-- 2. ENQUIRIES
--    Backs the contact form (assets/js/main.js, contact.html).
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

-- Anonymous visitors may submit an enquiry, but never read them back.
create policy "anyone can submit an enquiry"
  on public.enquiries for insert to anon
  with check (consent = true);

create policy "admins read enquiries"
  on public.enquiries for select to authenticated
  using ((auth.jwt() ->> 'role') = 'admin');

-- ---------------------------------------------------------------------
-- 3. CLIENT PORTAL (starter)
--    Profiles are keyed to Supabase Auth users. Document storage and
--    statement generation should happen server-side (Edge Function) —
--    the current portal is a browser-only demonstration.
-- ---------------------------------------------------------------------
create table if not exists public.clients (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users (id) on delete cascade,
  reference   text unique not null,          -- e.g. JC-2019-0412
  full_name   text not null,
  phone       text,
  plan        text default 'Household Financial Plan',
  created_at  timestamptz not null default now()
);

alter table public.clients enable row level security;

create policy "clients read their own profile"
  on public.clients for select to authenticated
  using (user_id = auth.uid());

create policy "admins read all clients"
  on public.clients for select to authenticated
  using ((auth.jwt() ->> 'role') = 'admin');

create table if not exists public.statements (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients (id) on delete cascade,
  period      text not null,
  reference   text not null,
  currency    text not null default 'MWK',
  opening     numeric(14,2) not null default 0,
  closing     numeric(14,2) not null default 0,
  rows        jsonb not null default '[]'::jsonb,
  issued_at   timestamptz not null default now()
);

alter table public.statements enable row level security;

create policy "clients read their own statements"
  on public.statements for select to authenticated
  using (client_id in (select id from public.clients where user_id = auth.uid()));

-- ---------------------------------------------------------------------
-- 4. NOTES
--    • Administrator accounts: create an app_metadata role of 'admin'
--      in Supabase Auth, and the JWT policies above will apply.
--    • After running this, set useSupabase, supabaseUrl and
--      supabaseAnonKey in assets/js/config.js.
--    • Never expose the service-role key in the browser bundle.
-- ---------------------------------------------------------------------
