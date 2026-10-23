/* =====================================================================
   JAY C O B FINANCIAL SERVICES — runtime configuration
   ---------------------------------------------------------------------
   The site runs in two modes, chosen automatically:

   • NO BACKEND (no keys)
     The marketing pages still draw from the catalogue compiled into
     site-store.js. Accounts, the dashboard and the console are unavailable:
     nothing is stored in the browser.

   • CLOUD MODE (Supabase) — configured below
     Everything persists in Postgres behind Row Level Security.

   The values below are the project's PUBLIC connection details. The anon
   key is designed to be shipped to browsers: it can only do what the RLS
   policies in supabase/schema.sql allow. Never put the service-role key
   here, and never commit one.

   On Railway, server.js overrides these from the SUPABASE_URL and
   SUPABASE_ANON_KEY environment variables (served at /env.js), so the
   deployment can be re-pointed without a code change.
   ===================================================================== */
window.JCOB_CONFIG = {
  currency: "MWK",
  locale: "en-MW",

  /* Cloud (Supabase) — project: lgftgochlcbakovdhmhb */
  supabaseUrl: "https://lgftgochlcbakovdhmhb.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnZnRnb2NobGNiYWtvdmRobWhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExMzQzMzUsImV4cCI6MjEwNjcxMDMzNX0.rjBFbcv3OFv_34dMZaCxlqWPxSmjiPAGYv6V-28IoYk",

  /* "auto" → cloud as soon as a URL and key are present.
     Set to false to run without the account service even when keys exist. */
  useSupabase: "auto",

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
  }

};
