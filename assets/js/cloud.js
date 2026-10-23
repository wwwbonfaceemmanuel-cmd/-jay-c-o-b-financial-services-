/* =====================================================================
   JAY C O B FINANCIAL SERVICES — Supabase client (no dependencies)
   ---------------------------------------------------------------------
   One small client used by every module on the site. Nothing else in the
   project talks to the network directly, so switching between offline
   and the live cloud (Supabase behind Railway)
   happens here and nowhere else.

   CONFIGURATION
   The project URL and the public anon key are read, in order, from
     window.__JCOB_ENV__      (served at runtime by server.js on Railway)
     window.JCOB_CONFIG       (assets/js/config.js — paste keys for static
                               hosting such as GitHub Pages)
   Cloud mode is on as soon as both values exist and useSupabase is not
   false. With no keys the marketing pages still work; nothing is stored in
   the browser.

   DATA MODEL (see supabase/schema.sql)
     site_docs      id → jsonb    public read, staff write
                    ids: settings | products | content | sections | live_posts
     portal_docs    id → jsonb    staff only (the admin console database)
     customer_docs  owner → jsonb one document per signed-in customer
     profiles       one row per Supabase Auth user, carries the role
     enquiries      contact-form submissions

   PUBLIC API (window.JCOB_CLOUD)
     enabled, url, key, ready
     from(table)              → query builder (select/insert/update/
                                upsert/delete + eq/in/order/limit/single)
     docs.get(kind, id)       → { data, updated_at } | null
     docs.put(kind, id, data) → saved row
     customer.load() / customer.save(data)
     auth.signIn / signUp / signOut / session / user / profile /
     auth.isStaff / auth.onChange
     storage.upload(bucket, path, blob)
     status()                 → short human string for badges
   ===================================================================== */
(function () {
  "use strict";

  var CFG = window.JCOB_CONFIG || {};
  var ENV = window.__JCOB_ENV__ || {};
  var SESSION_KEY = "jcob_cloud_session_v1";
  var ROLE_STAFF = ["admin", "staff", "officer", "credit"];

  function pick(a, b) {
    return a !== undefined && a !== null && String(a).trim() !== "" ? a : b;
  }

  var url = String(pick(ENV.supabaseUrl, CFG.supabaseUrl) || "").replace(/\/+$/, "");
  var key = String(pick(ENV.supabaseAnonKey, CFG.supabaseAnonKey) || "");
  var wanted = pick(ENV.useSupabase, CFG.useSupabase);

  /* Test escape hatch: ?local=1 (or localStorage jcob_mode = "local") forces
     the site to behave as if the account service were unreachable, so the
     fail-closed paths can be exercised. It never stores records.
     site on browser storage even when keys are configured. Useful for
     previewing the layout and for automated tests. */
  var forcedLocal = false;
  try {
    forcedLocal = window.localStorage.getItem("jcob_mode") === "local";
    if (/[?&]local=1\b/.test(window.location.search)) forcedLocal = true;
  } catch (e) {}

  var enabled = !!url && !!key && !forcedLocal && wanted !== false && wanted !== "false";

  var TABLES = Object.assign({
    site: "site_docs",
    portal: "portal_docs",
    customer: "customer_docs",
    profiles: "profiles",
    enquiries: "enquiries"
  }, CFG.tables || {});

  /* ---------------- session storage ---------------- */

  function readSession() {
    try {
      var raw = window.localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      var s = JSON.parse(raw);
      return s && s.access_token ? s : null;
    } catch (e) { return null; }
  }

  function writeSession(s) {
    try {
      if (s) window.localStorage.setItem(SESSION_KEY, JSON.stringify(s));
      else window.localStorage.removeItem(SESSION_KEY);
    } catch (e) {}
  }

  var session = readSession();
  var profile = null;
  var listeners = [];

  /* A confirmation or recovery email lands back on the site with the
     session in the URL fragment. Take it, store it, and tidy the address
     bar so the tokens are not left on screen or in history. */
  function adoptRecoveryLink() {
    var hash = String((window.location && window.location.hash) || "").replace(/^#/, "");
    if (!hash || hash.indexOf("access_token=") < 0) return false;
    var params;
    try { params = new URLSearchParams(hash); } catch (e) { return false; }
    var type = params.get("type") || "";
    if (type !== "recovery" && type !== "signup" && type !== "magiclink" && type !== "invite") return false;
    var access = params.get("access_token");
    if (!access) return false;
    session = {
      access_token: access,
      refresh_token: params.get("refresh_token") || "",
      expires_at: Date.now() + (Number(params.get("expires_in")) || 3600) * 1000 - 5000,
      token_type: "bearer",
      user: null
    };
    writeSession(session);
    try {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    } catch (e) {}
    return true;
  }

  var adoptedLink = adoptRecoveryLink();

  /* Pages guard on JCOB_UI.getSession(), which lives in localStorage.
     When a cloud session is already stored, seed that guard immediately so
     a refresh on dashboard.html does not bounce to the login page before
     the profile request finishes. */
  (function primeUiSession() {
    if (!session || !session.user) return;
    try {
      if (window.localStorage.getItem("jcob_session_v1") || window.sessionStorage.getItem("jcob_session_v1")) return;
      var meta = session.user.user_metadata || {};
      window.localStorage.setItem("jcob_session_v1", JSON.stringify({
        authenticated: true,
        name: meta.full_name || session.user.email || "Customer",
        email: session.user.email || "",
        identifier: session.user.email || "",
        at: new Date().toISOString(),
        cloud: true
      }));
    } catch (e) {}
  })();

  function emit() {
    listeners.forEach(function (fn) { try { fn({ session: session, profile: profile }); } catch (e) {} });
    try { document.dispatchEvent(new CustomEvent("jcob:auth", { detail: { session: session, profile: profile } })); } catch (e) {}
  }

  function expired(s, slack) {
    if (!s || !s.expires_at) return false;
    return Date.now() + (slack || 60000) >= s.expires_at;
  }

  /* ---------------- low-level request ---------------- */

  function authHeader() {
    return "Bearer " + ((session && session.access_token) || key);
  }

  function parseError(status, text) {
    var message = text || ("HTTP " + status);
    try {
      var parsed = JSON.parse(text);
      message = parsed.message || parsed.msg || parsed.error_description || parsed.error || message;
    } catch (e) {}
    var err = new Error(message);
    err.status = status;
    return err;
  }

  function request(path, opts) {
    opts = opts || {};
    var headers = Object.assign({ apikey: key, Authorization: authHeader() }, opts.headers || {});
    if (opts.body !== undefined) headers["Content-Type"] = "application/json";
    return window.fetch(url + path, {
      method: opts.method || "GET",
      headers: headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      cache: "no-store"
    }).then(function (res) {
      if (res.status === 401 && session && !opts.retried) {
        return refresh().then(function (ok) {
          if (!ok) throw parseError(401, "Session expired");
          return request(path, Object.assign({}, opts, { retried: true }));
        });
      }
      if (res.status === 204) return null;
      return res.text().then(function (text) {
        if (!res.ok) throw parseError(res.status, text);
        if (!text) return null;
        try { return JSON.parse(text); } catch (e) { return text; }
      });
    });
  }

  function qs(filters, opts) {
    var parts = [];
    (filters || []).forEach(function (f) { parts.push(f[0] + "=" + f[1]); });
    if (opts.select) parts.push("select=" + encodeURIComponent(opts.select));
    if (opts.order) parts.push("order=" + opts.order);
    if (opts.limit) parts.push("limit=" + opts.limit);
    return parts.length ? "?" + parts.join("&") : "";
  }

  function encodeValue(v) {
    if (v === null) return "null";
    if (typeof v === "boolean" || typeof v === "number") return String(v);
    return encodeURIComponent(String(v));
  }

  /* ---------------- query builder ---------------- */

  function builder(table, method, payload) {
    var filters = [];
    var state = { select: "*", order: "", limit: 0, single: false, upsert: false, onConflict: "" };

    var api = {
      select: function (cols) { state.select = cols || "*"; return api; },
      eq: function (col, val) { filters.push([col, "eq." + encodeValue(val)]); return api; },
      in: function (col, values) {
        filters.push([col, "in.(" + (values || []).map(encodeValue).join(",") + ")"]);
        return api;
      },
      order: function (col, dir) { state.order = col + "." + (dir || "asc"); return api; },
      limit: function (n) { state.limit = n; return api; },
      single: function () { state.single = true; return api; },
      onConflict: function (cols) { state.onConflict = cols; return api; },
      upsert: function (rows, conflict) {
        method = "POST";
        state.upsert = true;
        state.onConflict = conflict || state.onConflict;
        payload = rows;
        return api;
      },
      insert: function (rows) { method = "POST"; payload = rows; return api; },
      update: function (patch) { method = "PATCH"; payload = patch; return api; },
      remove: function () { method = "DELETE"; return api; },
      run: run
    };

    function run() {
      var opts = { method: method, select: state.select, order: state.order, limit: state.limit };
      var headers = {};
      if (state.upsert) headers.Prefer = "resolution=merge-duplicates,return=representation";
      else if (method === "POST" || method === "PATCH" || method === "DELETE") headers.Prefer = "return=representation";
      if (state.single) headers.Accept = "application/vnd.pgrst.object+json";
      var path = "/rest/v1/" + table + qs(filters, opts);
      if (state.onConflict) path += (path.indexOf("?") >= 0 ? "&" : "?") + "on_conflict=" + state.onConflict;
      return request(path, { method: method, headers: headers, body: payload });
    }

    api.then = function (res, rej) { return run().then(res, rej); };
    api.catch = function (rej) { return run().catch(rej); };
    return api;
  }

  function from(table) { return builder(table, "GET"); }

  /* ---------------- docs API ---------------- */

  function docTable(kind) {
    var t = TABLES[kind];
    if (!t) throw new Error("Unknown document store: " + kind);
    return t;
  }

  function getDoc(kind, id) {
    if (!enabled) return Promise.resolve(null);
    return from(docTable(kind)).select("data,updated_at").eq("id", id).limit(1).run()
      .then(function (rows) {
        var row = Array.isArray(rows) ? rows[0] : rows;
        return row ? { data: row.data, updated_at: row.updated_at } : null;
      })
      .catch(function () { return null; });
  }

  function putDoc(kind, id, data) {
    if (!enabled) return Promise.resolve(null);
    return from(docTable(kind))
      .upsert({ id: id, data: data, updated_at: new Date().toISOString() }, "id")
      .run()
      .then(function (rows) { return Array.isArray(rows) ? rows[0] : rows; });
  }

  /* ---------------- customer document ---------------- */

  function uid() { return (session && session.user && session.user.id) || null; }

  var customer = {
    load: function () {
      if (!enabled || !uid()) return Promise.resolve(null);
      return from(TABLES.customer).select("data,updated_at").eq("owner", uid()).limit(1).run()
        .then(function (rows) {
          var row = Array.isArray(rows) ? rows[0] : rows;
          return row ? { data: row.data, updated_at: row.updated_at } : null;
        })
        .catch(function () { return null; });
    },
    save: function (data) {
      if (!enabled || !uid()) return Promise.resolve(null);
      return from(TABLES.customer)
        .upsert({ owner: uid(), data: data, updated_at: new Date().toISOString() }, "owner")
        .run()
        .then(function (rows) { return Array.isArray(rows) ? rows[0] : rows; })
        .catch(function () { return null; });
    },
    /* Staff write: update one customer document (admin console bridge). */
    saveFor: function (owner, data) {
      if (!enabled || !owner) return Promise.resolve(null);
      return from(TABLES.customer)
        .upsert({ owner: owner, data: data, updated_at: new Date().toISOString() }, "owner")
        .run()
        .then(function (rows) { return Array.isArray(rows) ? rows[0] : rows; })
        .catch(function () { return null; });
    },
    /* Staff view: every customer document (the admin console bridge). */
    all: function () {
      if (!enabled) return Promise.resolve([]);
      return from(TABLES.customer).select("owner,data,updated_at").order("updated_at", "desc").limit(500).run()
        .then(function (rows) { return Array.isArray(rows) ? rows : []; })
        .catch(function () { return []; });
    }
  };

  /* ---------------- auth ---------------- */

  function authCall(path, body, method) {
    return window.fetch(url + "/auth/v1/" + path, {
      method: method || "POST",
      headers: { apikey: key, Authorization: authHeader(), "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store"
    }).then(function (res) {
      return res.text().then(function (text) {
        if (!res.ok) throw parseError(res.status, text);
        return text ? JSON.parse(text) : null;
      });
    });
  }

  function normaliseAuth(payload) {
    if (!payload || !payload.access_token) return null;
    return {
      access_token: payload.access_token,
      refresh_token: payload.refresh_token,
      expires_at: Date.now() + (payload.expires_in || 3600) * 1000 - 5000,
      token_type: payload.token_type || "bearer",
      user: payload.user || null
    };
  }

  function refresh() {
    if (!session || !session.refresh_token) return Promise.resolve(false);
    return window.fetch(url + "/auth/v1/token?grant_type=refresh_token", {
      method: "POST",
      headers: { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: session.refresh_token }),
      cache: "no-store"
    }).then(function (res) {
      return res.text().then(function (text) {
        if (!res.ok) { signOutLocal(); return false; }
        var next = normaliseAuth(JSON.parse(text));
        if (!next) { signOutLocal(); return false; }
        session = next;
        writeSession(session);
        return true;
      });
    }).catch(function () { return false; });
  }

  /* The cached customer document is a convenience copy of the real row in
     customer_docs. It is removed on sign-out so a shared phone does not
     keep the last customer's loans and identity details readable. */
  function clearCustomerCache() {
    try {
      var id = session && session.user && session.user.id;
      if (id) window.localStorage.removeItem("jcob_app_v2:" + id);
      window.localStorage.removeItem("jcob_app_v2");
    } catch (e) {}
  }

  function signOutLocal() {
    clearCustomerCache();
    session = null;
    profile = null;
    writeSession(null);
    try { if (window.JCOB_UI && window.JCOB_UI.clearSession) window.JCOB_UI.clearSession(); } catch (e) {}
    emit();
  }

  /* The person behind the current token, straight from the auth service. */
  function loadUser() {
    if (!session || !session.access_token) return Promise.resolve(null);
    return window.fetch(url + "/auth/v1/user", {
      headers: { apikey: key, Authorization: authHeader() },
      cache: "no-store"
    }).then(function (res) {
      return res.text().then(function (text) {
        if (!res.ok) throw parseError(res.status, text);
        var user = text ? JSON.parse(text) : null;
        if (user && session) { session.user = user; writeSession(session); }
        return user;
      });
    });
  }

  function loadProfile() {
    if (!uid()) return Promise.resolve(null);
    return from(TABLES.profiles).select("*").eq("id", uid()).limit(1).run()
      .then(function (rows) {
        profile = (Array.isArray(rows) ? rows[0] : rows) || null;
        return profile;
      })
      .catch(function () { return null; });
  }

  function bridgeUiSession() {
    if (!profile || !window.JCOB_UI || !window.JCOB_UI.setSession) return;
    var current = window.JCOB_UI.getSession && window.JCOB_UI.getSession();
    if (current && current.authenticated) return;
    window.JCOB_UI.setSession({
      authenticated: true,
      name: profile.full_name || (session.user && session.user.email) || "Customer",
      email: profile.email || (session.user && session.user.email) || "",
      identifier: profile.email || (session.user && session.user.email) || "",
      account: profile.account_no || "",
      cloud: true
    }, true);
  }

  function signIn(email, password) {
    if (!enabled) return Promise.reject(new Error("Cloud is not configured"));
    return authCall("token?grant_type=password", { email: email, password: password })
      .then(function (payload) {
        var next = normaliseAuth(payload);
        if (!next) throw new Error("No session returned");
        session = next;
        writeSession(session);
        return loadProfile().then(function (p) {
          bridgeUiSession();
          emit();
          return { session: session, profile: p };
        });
      });
  }

  function signUp(input) {
    if (!enabled) return Promise.reject(new Error("Cloud is not configured"));
    var meta = {
      full_name: input.fullName || "",
      phone: input.phone || "",
      account_no: input.accountNo || ""
    };
    return authCall("signup", { email: input.email, password: input.password, data: meta })
      .then(function (payload) {
        var next = normaliseAuth(payload);
        if (!next) return { needsConfirmation: true, user: (payload && payload.user) || (payload && payload.id ? payload : null) };
        session = next;
        writeSession(session);
        return ensureProfile(input).then(function (p) {
          bridgeUiSession();
          emit();
          return { session: session, profile: p };
        });
      });
  }

  function ensureProfile(input) {
    input = input || {};
    if (!uid()) return Promise.resolve(null);
    return loadProfile().then(function (existing) {
      if (existing) return existing;
      var row = {
        id: uid(),
        full_name: input.fullName || (session.user && (session.user.user_metadata || {}).full_name) || "",
        email: input.email || (session.user && session.user.email) || "",
        phone: input.phone || (session.user && (session.user.user_metadata || {}).phone) || "",
        account_no: input.accountNo || "JC-ACC-" + String(uid()).slice(0, 6).toUpperCase(),
        role: "customer"
      };
      return from(TABLES.profiles).upsert(row, "id").run()
        .then(function (rows) { profile = (Array.isArray(rows) ? rows[0] : rows) || row; emit(); return profile; })
        .catch(function () { return null; });
    });
  }

  function signOut() {
    var token = session && session.access_token;
    if (enabled && token) {
      window.fetch(url + "/auth/v1/logout", {
        method: "POST",
        headers: { apikey: key, Authorization: "Bearer " + token },
        cache: "no-store"
      }).catch(function () {});
    }
    signOutLocal();
    return Promise.resolve(true);
  }

  function recover(email) {
    if (!enabled) return Promise.reject(new Error("Cloud is not configured"));
    return authCall("recover", { email: email });
  }

  /* Set a new password from a recovery link. Supabase checks the token. */
  function updatePassword(password) {
    if (!enabled) return Promise.reject(new Error("Cloud is not configured"));
    if (!session || !session.access_token) return Promise.reject(new Error("Open the reset link from your email first."));
    return window.fetch(url + "/auth/v1/user", {
      method: "PUT",
      headers: { apikey: key, Authorization: authHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({ password: password }),
      cache: "no-store"
    }).then(function (res) {
      return res.text().then(function (text) {
        if (!res.ok) throw parseError(res.status, text);
        return text ? JSON.parse(text) : true;
      });
    });
  }

  /* A one-time code sent to the address on the account. Supabase issues,
     stores and expires it; nothing is validated in the browser. */
  function sendOtp(email) {
    if (!enabled) return Promise.reject(new Error("Cloud is not configured"));
    return authCall("otp", { email: email, create_user: false });
  }

  /* Exchange the emailed code for a session. */
  function verifyOtp(email, token) {
    if (!enabled) return Promise.reject(new Error("Cloud is not configured"));
    return authCall("verify", { type: "email", email: email, token: token })
      .then(function (payload) {
        var next = normaliseAuth(payload);
        if (!next) throw new Error("That code is incorrect or has expired.");
        session = next;
        writeSession(session);
        return loadProfile().then(function (p) {
          bridgeUiSession();
          emit();
          return { session: session, profile: p };
        });
      });
  }

  function isStaff(p) {
    var role = String((p || profile || {}).role || "").toLowerCase();
    return ROLE_STAFF.indexOf(role) >= 0;
  }

  /* ---------------- storage ---------------- */

  var storage = {
    upload: function (bucket, path, blob) {
      if (!enabled) return Promise.reject(new Error("Cloud is not configured"));
      return window.fetch(url + "/storage/v1/object/" + bucket + "/" + path, {
        method: "POST",
        headers: {
          apikey: key,
          Authorization: authHeader(),
          "Content-Type": (blob && blob.type) || "application/octet-stream",
          "x-upsert": "true"
        },
        body: blob
      }).then(function (res) {
        if (!res.ok) return res.text().then(function (t) { throw parseError(res.status, t); });
        return {
          path: path,
          bucket: bucket,
          publicUrl: url + "/storage/v1/object/public/" + bucket + "/" + path
        };
      });
    },
    publicUrl: function (bucket, path) {
      return url + "/storage/v1/object/public/" + bucket + "/" + path;
    }
  };

  /* ---------------- boot ---------------- */

  /* The UI layer clears its own session on sign-out and on expiry; the
     cloud session follows it, without a second round-trip. */
  if (typeof document !== "undefined") {
    document.addEventListener("jcob:signout", function () {
      if (!session) return;
      session = null;
      profile = null;
      writeSession(null);
    });
  }

  var ready = (function () {
    if (!enabled) return Promise.resolve(null);
    var boot = expired(session, 0) ? refresh() : Promise.resolve(true);
    return boot.then(function () {
      if (!session) return null;
      var who = session.user ? Promise.resolve(session.user) : loadUser().catch(function () { return null; });
      return who.then(function () {
        return loadProfile();
      }).then(function (p) {
        if (session && session.access_token) bridgeUiSession();
        emit();
        return p;
      });
    }).catch(function () { return null; });
  })();

  function status() {
    if (!enabled) return "This device only";
    if (!session) return "Cloud · signed out";
    return "Cloud · " + (profile ? (profile.role === "customer" ? "customer" : profile.role) : "signed in");
  }

  window.JCOB_CLOUD = {
    enabled: enabled,
    forcedLocal: forcedLocal,
    url: url,
    key: key,
    tables: TABLES,
    ready: ready,
    from: from,
    docs: { get: getDoc, put: putDoc },
    customer: customer,
    storage: storage,
    status: status,
    refresh: refresh,
    auth: {
      signIn: signIn,
      signUp: signUp,
      recover: recover,
      updatePassword: updatePassword,
      adoptedLink: adoptedLink,
      sendOtp: sendOtp,
      verifyOtp: verifyOtp,
      signOut: signOut,
      ensureProfile: ensureProfile,
      refresh: refresh,
      session: function () { return session; },
      user: function () { return (session && session.user) || null; },
      profile: function () { return profile; },
      isStaff: isStaff,
      isSignedIn: function () { return !!session; },
      onChange: function (fn) { if (typeof fn === "function") listeners.push(fn); },
      reloadProfile: loadProfile
    },
    /* Exposed for tests and for the console's connection panel. */
    _request: request
  };
})();
