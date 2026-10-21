/* =====================================================================
   JAY C O B FINANCIAL SERVICES — runtime configuration
   ---------------------------------------------------------------------
   The site currently runs in demo mode: the live feed, calculator and
   client portal work entirely in the browser (localStorage), so it can
   be reviewed without a backend.

   CONNECTING SUPABASE LATER
   1. Create a Supabase project and a `live_posts` table:
        id          uuid primary key default gen_random_uuid()
        type        text        -- announcement | card | image
        title       text
        body        text
        link        text
        link_label  text
        image       text
        animation   text        -- slide | flap | swipe | rotate | spin
        pinned      boolean default false
        published   boolean default true
        date        timestamptz default now()

   2. Paste the project URL and the public anon key below and set
      useSupabase to true. assets/js/live.js will then read published
      posts straight from the table over the REST API; the admin console
      sends the same fields when creating or updating rows.

   3. Row-level security: allow `select` for anon on live_posts, and
      require an authenticated admin role for insert/update/delete.

   4. Portal authentication, statements and enquiries can follow the
      same pattern — the demo implementations are isolated in
      assets/js/portal.js, assets/js/main.js and assets/js/admin.js.
   ===================================================================== */
window.JCOB_CONFIG = {
  currency: "MWK",
  locale: "en-MW",

  useSupabase: false,
  supabaseUrl: "",          // e.g. "https://xxxxxxxxxxxx.supabase.co"
  supabaseAnonKey: "",      // public anon key (never a service-role key)

  // Table names used once Supabase is connected
  liveTable: "live_posts",
  enquiriesTable: "enquiries",
  clientsTable: "clients",

  demoMode: true
};
