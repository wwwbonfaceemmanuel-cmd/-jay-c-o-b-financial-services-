/* =====================================================================
   JAY C O B FINANCIAL SERVICES — local Supabase stand-in (development only)
   ---------------------------------------------------------------------
   Lets the whole system be exercised on a laptop before the real
   Supabase project exists. It speaks just enough of the Supabase API
   for this site: Auth (password, refresh, signup, logout, recover),
   the PostgREST document endpoints and Storage uploads.

   This is NOT a security layer — it keeps everything in memory and does
   not enforce Row Level Security. Never deploy it.

   Run:
     node tools/dev/mock-cloud.js            # http://127.0.0.1:54321
     SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_ANON_KEY=dev-anon node server.js

   Seed accounts: admin@jaycob.mw / Admin123!  (staff role)
                  customer@jaycob.mw / Customer123!  (customer role)
   ===================================================================== */
"use strict";

const http = require("http");

const PORT = Number(process.env.MOCK_PORT || 54321);
/* No messaging provider by default, like the real project until one is
   connected. MOCK_SMS=on simulates a connected provider. */
let smsOn = process.env.MOCK_SMS === "on";
const ANON_KEY = process.env.MOCK_ANON_KEY || "dev-anon";

let seq = 0;
const nextId = (prefix) => prefix + "-" + (++seq).toString(36).padStart(4, "0");

const users = [
  { id: "11111111-1111-4111-8111-111111111111", email: "admin@jaycob.mw", password: "Admin123!", role: "admin", meta: { full_name: "Aubrey Chirwa" } },
  { id: "22222222-2222-4222-8222-222222222222", email: "customer@jaycob.mw", password: "Customer123!", role: "customer", meta: { full_name: "Mock Cloud Customer", phone: "+265 999 123 456" } }
];

const tables = {
  site_docs: [
    { id: "settings", data: { brand: "JAY C O B FINANCIAL SERVICES", phone: "+265 999 777 888", calc: { amount: 1000000, term: 3 } }, updated_at: new Date().toISOString() },
    { id: "products", data: [{ id: "personal", name: "Personal Loan", rate: 31, fee: 2, min: 100000, max: 15000000, minTerm: 6, maxTerm: 48, active: true }], updated_at: new Date().toISOString() },
    { id: "content", data: {}, updated_at: new Date().toISOString() },
    { id: "sections", data: {}, updated_at: new Date().toISOString() },
    { id: "live_posts", data: [{ id: "lv-cloud-1", type: "announcement", title: "Cloud launch", body: "Published from Supabase.", link: "live.html", linkLabel: "Read", animation: "slide", pinned: false, published: true, date: new Date().toISOString() }], updated_at: new Date().toISOString() }
  ],
  portal_docs: [],
  customer_docs: [
    {
      owner: users[1].id,
      data: {
        profile: { fullName: "Mock Cloud Customer", email: "customer@jaycob.mw", phone: "+265 999 123 456", accountNumber: "JC-ACC-100412", kyc: "Verified", district: "Lilongwe" },
        applications: [{ ref: "APP-CLOUD-001", product: "Personal Loan", amount: 1000000, term: 12, purpose: "Cloud test", submitted: new Date().toISOString(), status: "pending", stage: 1, documents: [] }],
        tickets: [], notifications: [], loans: [], transactions: [], documents: [], statements: [], drafts: []
      },
      updated_at: new Date().toISOString()
    }
  ],
  profiles: users.map((u) => ({
    id: u.id, full_name: u.meta.full_name, email: u.email, phone: u.meta.phone || "",
    account_no: "JC-ACC-" + u.id.slice(0, 4), role: u.role, status: "active",
    created_at: new Date().toISOString(), updated_at: new Date().toISOString()
  })),
  enquiries: [],
  audit_log: []
};

const PK = { site_docs: "id", portal_docs: "id", customer_docs: "owner", profiles: "id", enquiries: "id", audit_log: "id" };
const tokens = new Map();
const refreshTokens = new Map();
const otps = new Map();

function sessionFor(user) {
  const token = "tok-" + Math.random().toString(36).slice(2) + "-" + user.id.slice(0, 6);
  const refresh = "ref-" + Math.random().toString(36).slice(2);
  tokens.set(token, user.id);
  refreshTokens.set(refresh, user.id);
  return {
    access_token: token,
    token_type: "bearer",
    expires_in: 3600,
    refresh_token: refresh,
    user: { id: user.id, email: user.email, phone: user.phone || null, user_metadata: user.meta }
  };
}

function body(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (c) => { raw += c; });
    req.on("end", () => {
      if (!raw) return resolve(null);
      if (!/json/.test(req.headers["content-type"] || "")) return resolve(Buffer.from(raw));
      try { resolve(JSON.parse(raw)); } catch (e) { resolve(null); }
    });
  });
}

function match(row, filters) {
  return filters.every(([col, expr]) => {
    const [op, ...rest] = expr.split(".");
    const value = rest.join(".");
    if (op === "eq") return String(row[col]) === value;
    if (op === "in") {
      const list = value.replace(/^\(|\)$/g, "").split(",").map((v) => v.replace(/^"|"$/g, ""));
      return list.includes(String(row[col]));
    }
    if (op === "is") return value === "null" ? row[col] == null : String(row[col]) === value;
    return true;
  });
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization,apikey,content-type,prefer,accept,x-upsert,x-client-info",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS"
};

function send(res, status, payload, headers) {
  const bodyText = payload === null || payload === undefined ? "" : JSON.stringify(payload);
  res.writeHead(status, Object.assign({ "Content-Type": "application/json" }, CORS, headers || {}));
  res.end(bodyText);
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS);
    return res.end();
  }

  const url = new URL(req.url, "http://localhost");
  const pathname = url.pathname;

  /* ---------------- auth ---------------- */
  if (pathname === "/auth/v1/token") {
    const data = await body(req);
    const grant = url.searchParams.get("grant_type");
    if (grant === "refresh_token") {
      const uid = refreshTokens.get(data && data.refresh_token);
      const user = users.find((u) => u.id === uid);
      if (!user) return send(res, 400, { error: "invalid_grant", message: "Invalid refresh token" });
      return send(res, 200, sessionFor(user));
    }
    const email = String((data && data.email) || "").toLowerCase();
    const phone = String((data && data.phone) || "");
    const user = email
      ? users.find((u) => String(u.email || "").toLowerCase() === email)
      : users.find((u) => u.phone && u.phone === phone);
    if (!user || user.password !== (data && data.password)) {
      return send(res, 400, { error: "invalid_grant", message: "Invalid login credentials" });
    }
    return send(res, 200, sessionFor(user));
  }

  if (pathname === "/auth/v1/signup") {
    const data = (await body(req)) || {};
    if (!data.email && !data.phone) {
      return send(res, 400, { message: "An email address or phone number is required" });
    }
    if (data.email && users.some((u) => String(u.email || "").toLowerCase() === String(data.email).toLowerCase())) {
      return send(res, 400, { message: "User already registered" });
    }
    if (data.phone && users.some((u) => u.phone && u.phone === data.phone)) {
      return send(res, 400, { message: "User already registered" });
    }
    const user = {
      id: "u-" + Math.random().toString(36).slice(2, 10),
      email: data.email || null,
      phone: data.phone || null,
      password: data.password,
      role: "customer",
      meta: Object.assign({}, data.data || {}, data.phone ? { phone: data.phone } : {})
    };
    users.push(user);
    tables.profiles.push({
      id: user.id, full_name: user.meta.full_name || "", email: user.email || "",
      phone: user.phone || user.meta.phone || "", account_no: "JC-ACC-" + user.id.slice(0, 6).toUpperCase(),
      role: "customer", status: "active", created_at: new Date().toISOString(), updated_at: new Date().toISOString()
    });
    return send(res, 200, sessionFor(user));
  }

  if (pathname === "/auth/v1/logout") return send(res, 204, null, { "Content-Type": "text/plain" });

  if (pathname === "/auth/v1/user") {
    const token = String(req.headers.authorization || "").replace("Bearer ", "");
    const user = users.find((u) => u.id === tokens.get(token));
    if (!user) return send(res, 401, { message: "Invalid token" });
    return send(res, 200, { id: user.id, email: user.email, phone: user.phone || null, user_metadata: user.meta });
  }

  if (pathname === "/auth/v1/recover") return send(res, 200, {});

  /* Test hook: connect or disconnect the pretend SMS provider. */
  if (pathname === "/__mock/sms") {
    const data = (await body(req)) || {};
    smsOn = data.on === true;
    return send(res, 200, { sms: smsOn });
  }

  /* One-time codes, by email or by SMS. Every code issued here is 123456
     and is deleted once used, like the real service. */
  if (pathname === "/auth/v1/otp") {
    const data = (await body(req)) || {};
    const identifier = data.phone || data.email;
    if (!identifier) return send(res, 400, { message: "A phone number or email address is required" });
    otps.set(String(identifier), "123456");
    return send(res, 200, {});
  }

  if (pathname === "/auth/v1/verify") {
    const data = (await body(req)) || {};
    const identifier = String(data.phone || data.email || "");
    if (!identifier) return send(res, 400, { message: "A phone number or email address is required" });
    if (otps.get(identifier) !== String(data.token || "")) {
      return send(res, 400, { message: "Token has expired or is invalid" });
    }
    otps.delete(identifier);
    let user = users.find((u) => (data.phone && u.phone === data.phone) ||
      (data.email && String(u.email || "").toLowerCase() === String(data.email).toLowerCase()));
    if (!user) {
      user = {
        id: "u-" + Math.random().toString(36).slice(2, 10),
        email: data.email || null,
        phone: data.phone || null,
        password: "",
        role: "customer",
        meta: data.phone ? { phone: data.phone } : {}
      };
      users.push(user);
      tables.profiles.push({
        id: user.id, full_name: "", email: user.email || "", phone: user.phone || "",
        account_no: "JC-ACC-" + user.id.slice(0, 6).toUpperCase(), role: "customer",
        status: "active", created_at: new Date().toISOString(), updated_at: new Date().toISOString()
      });
    }
    return send(res, 200, sessionFor(user));
  }

  if (pathname === "/auth/v1/settings") {
    return send(res, 200, {
      mailer_autoconfirm: true,
      phone_autoconfirm: smsOn,
      external: { email: true, phone: smsOn }
    });
  }

  /* ---------------- storage ---------------- */
  if (pathname.startsWith("/storage/v1/object/")) {
    const parts = pathname.split("/").filter(Boolean); // storage, v1, object, bucket, ...path
    const bucket = parts[3];
    const objectPath = parts.slice(4).join("/");
    if (req.method === "POST") {
      const blob = await body(req);
      const size = blob && blob.length ? blob.length : 0;
      return send(res, 200, { Key: bucket + "/" + objectPath, size });
    }
    return send(res, 200, { bucket, path: objectPath, publicUrl: "http://127.0.0.1:" + PORT + "/storage/v1/object/public/" + bucket + "/" + objectPath });
  }

  /* Public object reads: bucket-missing vs object-missing, like Supabase. */
  if (pathname.startsWith("/storage/v1/object/public/")) {
    const bucket = pathname.split("/")[5];
    if (!["site-media", "kyc-documents"].includes(bucket)) {
      return send(res, 404, { statusCode: "404", error: "Not Found", message: "Bucket not found" });
    }
    return send(res, 404, { statusCode: "404", error: "Not Found", message: "Object not found" });
  }

  /* ---------------- rest ---------------- */
  if (pathname.startsWith("/rest/v1/")) {
    const table = pathname.replace("/rest/v1/", "");
    if (!tables[table]) return send(res, 404, { message: "Unknown table " + table });
    const filters = [...url.searchParams.entries()].filter(([k]) => !["select", "order", "limit", "on_conflict"].includes(k));
    const rows = tables[table];
    const prefer = req.headers.prefer || "";
    const wantObject = /vnd\.pgrst\.object/.test(req.headers.accept || "");

    if (req.method === "GET") {
      let out = rows.filter((r) => match(r, filters));
      const order = url.searchParams.get("order");
      if (order) {
        const [col, dir] = order.split(".");
        out = out.slice().sort((a, b) => {
          const av = a[col], bv = b[col];
          if (av === bv) return 0;
          return (av > bv ? 1 : -1) * (dir === "desc" ? -1 : 1);
        });
      }
      const limit = Number(url.searchParams.get("limit") || 0);
      if (limit) out = out.slice(0, limit);
      if (wantObject) {
        if (!out.length) return send(res, 406, { message: "JSON object requested, multiple (or no) rows returned" });
        return send(res, 200, out[0]);
      }
      return send(res, 200, out);
    }

    if (req.method === "POST") {
      const payload = await body(req);
      const list = Array.isArray(payload) ? payload : [payload];
      const key = PK[table] || "id";
      const saved = list.map((row) => {
        const existing = rows.find((r) => row[key] !== undefined && String(r[key]) === String(row[key]));
        if (existing && /merge-duplicates/.test(prefer)) {
          Object.assign(existing, row, { updated_at: new Date().toISOString() });
          return existing;
        }
        const created = Object.assign({}, row);
        if (created[key] === undefined) created[key] = nextId("row");
        if (!created.created_at) created.created_at = new Date().toISOString();
        created.updated_at = new Date().toISOString();
        rows.push(created);
        return created;
      });
      if (!/return=representation/.test(prefer)) return send(res, 201, null, { "Content-Type": "text/plain" });
      return send(res, 201, Array.isArray(payload) ? saved : saved[0]);
    }

    if (req.method === "PATCH") {
      const patch = await body(req);
      const touched = rows.filter((r) => match(r, filters));
      touched.forEach((r) => Object.assign(r, patch, { updated_at: new Date().toISOString() }));
      if (!/return=representation/.test(prefer)) return send(res, 204, null, { "Content-Type": "text/plain" });
      return send(res, 200, touched);
    }

    if (req.method === "DELETE") {
      const keep = rows.filter((r) => !match(r, filters));
      tables[table] = keep;
      return send(res, 204, null, { "Content-Type": "text/plain" });
    }
  }

  send(res, 404, { message: "Not found: " + pathname });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("Mock Supabase on http://127.0.0.1:" + PORT);
  console.log("anon key: " + ANON_KEY);
  console.log("staff: admin@jaycob.mw / Admin123!   customer: customer@jaycob.mw / Customer123!");
});
