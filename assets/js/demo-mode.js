/* =====================================================================
   JAY C O B FINANCIAL SERVICES — demonstration mode switch
   ---------------------------------------------------------------------
   Production behaviour is the default: the system starts empty and every
   number on screen comes from the database or from the signed-in account.

   Demonstration data is available for reviews and automated tests, but
   only when it is asked for explicitly:

       ?demo=1        on any page  → switches it on (remembered)
       ?demo=0        on any page  → switches it off
       jcob_demo=1    in storage   → on
       jcob_demo removed           → off

   Nothing else enables it. There is no build flag, no key and no code
   path that turns it on for a normal visitor.
   ===================================================================== */
(function () {
  "use strict";

  var KEY = "jcob_demo";
  var search = "";
  try { search = window.location.search || ""; } catch (e) { search = ""; }

  var wanted = null;
  if (/[?&]demo=1\b/.test(search)) wanted = true;
  else if (/[?&]demo=0\b/.test(search)) wanted = false;

  var stored = false;
  try { stored = window.localStorage.getItem(KEY) === "1"; } catch (e) { stored = false; }

  if (wanted === null) wanted = stored;
  else {
    try {
      if (wanted) window.localStorage.setItem(KEY, "1");
      else window.localStorage.removeItem(KEY);
    } catch (e) { /* storage unavailable — the query string still decides */ }
  }

  var on = !!wanted;

  window.JCOB_DEMO = {
    key: KEY,
    enabled: on,
    on: function () { return on; },
    off: function () { return !on; },
    /* The demonstration dataset lives in demo-customer.js and
       demo-portal.js. Those files only define functions; nothing in them
       runs unless this switch asked for it. */
    data: function () {
      if (!on) return null;
      return window.JCOB_DEMO_CUSTOMER || null;
    }
  };

  try { document.documentElement.setAttribute("data-demo", on ? "1" : "0"); } catch (e) {}
})();
