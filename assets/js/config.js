/* =====================================================================
   JAY C O B FINANCIAL SERVICES — runtime configuration
   ---------------------------------------------------------------------
   The site runs in two modes, chosen automatically:

   • DEMO MODE (default, no keys)
     The live feed, catalogue, admin console and customer dashboard all
     read and write browser localStorage, so the whole system can be
     reviewed without a backend.

   • CLOUD MODE (Supabase)
     Set a project URL and the public anon key below — or, on Railway,
     set the SUPABASE_URL and SUPABASE_ANON_KEY environment variables and
     server.js serves them to the browser at /env.js. Everything then
     persists in Postgres behind Row Level Security.

   Railway / Supabase steps are in DEPLOY.md. Never put a service-role
   key in this file: it is public. The anon key is safe because every
   table is protected by RLS (supabase/schema.sql).
   ===================================================================== */
window.JCOB_CONFIG = {
  currency: "MWK",
  locale: "en-MW",

  /* Cloud (Supabase). Leave blank for demo mode. */
  supabaseUrl: "",          // e.g. "https://xxxxxxxxxxxx.supabase.co"
  supabaseAnonKey: "",      // public anon key (never a service-role key)

  /* "auto" → cloud as soon as a URL and key are present.
     Set to false to stay on localStorage even with keys configured. */
  useSupabase: "auto",
  demoMode: true,

  /* Table map — matches supabase/schema.sql. */
  tables: {
    site: "site_docs",
    portal: "portal_docs",
    customer: "customer_docs",
    profiles: "profiles",
    enquiries: "enquiries"
  },

  /* Storage buckets (created by the schema, or by hand in the dashboard). */
  buckets: {
    media: "site-media",
    kyc: "kyc-documents"
  },

  /* Legacy keys kept so older modules keep working. */
  liveTable: "live_posts",
  enquiriesTable: "enquiries",
  clientsTable: "clients"
};
