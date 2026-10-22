/* =====================================================================
   JAY C O B FINANCIAL SERVICES — runtime configuration
   ---------------------------------------------------------------------
   The site runs in two modes, chosen automatically:

   • OFFLINE MODE (no keys)
     The website, catalogue and calculator read browser localStorage. Sign-in,
     the admin console and the customer dashboard need cloud mode.

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

  /* Cloud (Supabase) — project: cybaejegytnvtitznofp */
  supabaseUrl: "https://cybaejegytnvtitznofp.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5YmFlamVneXRudnRpdHpub2ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2OTc2MDQsImV4cCI6MjEwODI3MzYwNH0.GFtYtTLnN31Sts4FjbUEuDqiN3ukQtIuT6e52UN5H34",

  /* "auto" → cloud as soon as a URL and key are present.
     Set to false to stay on localStorage even with keys configured. */
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
  },

  /* Legacy keys kept so older modules keep working. */
  liveTable: "live_posts",
  enquiriesTable: "enquiries",
  clientsTable: "clients"
};
