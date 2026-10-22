/* =====================================================================
   Runtime environment
   ---------------------------------------------------------------------
   On Railway, server.js answers this exact path with the values of the
   SUPABASE_URL and SUPABASE_ANON_KEY environment variables, so keys are
   never committed to the repository.

   On any other static host (GitHub Pages, a USB stick, python -m
   http.server) this file is served as-is and the site stays in demo
   mode unless you paste keys into assets/js/config.js instead.
   ===================================================================== */
window.__JCOB_ENV__ = window.__JCOB_ENV__ || {};
