# Deploying JAY C O B on Railway + Supabase

Everything in this repository now runs against Supabase. The browser
layer is finished; what is left is creating the two accounts, pasting
three values and running one SQL file.

**Status: the project is already configured.**
`assets/js/config.js` carries the public URL and anon key for
`lgftgochlcbakovdhmhb.supabase.co`, so the site is in cloud mode as soon as
it is served. Two things remain, and both need your Supabase login:

1. **Run `supabase/install.sql`** in the SQL editor — one paste that
   creates every table, policy, trigger and bucket *and* publishes the
   website's settings, the eleven products and the live posts.
2. **Create your administrator** and promote it with `promote_staff`.

After that, open **`system-check.html`** on the deployed site: it tests the
connection live and tells you exactly what to fix if a line is red.

This page is the checklist. Work top to bottom — each step says who does
what, and how to tell it worked.

---

## How the system is wired

```
Visitor / customer            Admin console (admin.html)
        │                              │
        └────────────┬─────────────────┘
                     │  assets/js/cloud.js   (Supabase Auth + REST + Storage)
                     ▼
             Supabase project
   ┌─────────────────────────────────────────────┐
   │ auth.users      email + password accounts   │
   │ profiles        role: customer / staff …    │
   │ site_docs       settings · products ·       │
   │                 content · sections ·        │
   │                 live_posts                  │
   │ portal_docs     the console's database      │
   │ customer_docs   one dashboard per customer  │
   │ enquiries       contact-form submissions    │
   │ audit_log       who changed what, when      │
   │ storage         site-media (public) ·       │
   │                 kyc-documents (private)     │
   └─────────────────────────────────────────────┘
                     ▲
                     │  server.js answers /env.js with the keys
              Railway (this repository, Docker)
```

* `assets/js/cloud.js` is the only file that talks to the network. With no
  keys present the site falls back to browser storage, so nothing breaks
  before the accounts exist.
* `server.js` serves the static site and injects the Supabase URL and anon
  key from Railway environment variables, so no key is committed to Git.
* Row Level Security does the protecting: visitors can read the public
  site documents, only staff can change them, and a customer can only
  read/write their own dashboard document.

---

## Phase 1 — Supabase (about 10 minutes)

1. The project already exists: **`lgftgochlcbakovdhmhb`**
   (`https://lgftgochlcbakovdhmhb.supabase.co`). If you rebuild it from
   scratch, create a new project and paste the new URL + anon key into
   `assets/js/config.js` (or into the Railway variables in Phase 2).
   Keep the **service-role** key to yourself — it must never be in the
   repository or the browser.

2. Open **SQL Editor → New query**, paste the whole of
   [`supabase/install.sql`](supabase/install.sql) and press **Run**.

   That one file is the schema **plus** the seed: tables, policies,
   triggers and storage buckets, then the website's settings, the eleven
   products and the ten live-feed posts. Once it has run, the database —
   not the browser — is what every visitor reads.

   It is idempotent: running it twice is safe, and re-running never
   overwrites content an administrator has already edited.

   *Prefer the pieces separately?* `supabase/schema.sql`, then
   `supabase/seed.sql`. Using the Supabase CLI? The schema is also at
   `supabase/migrations/20261022000001_init.sql`.

   The seed is generated from the site's own defaults with
   `node tools/db/generate-seed.js && node tools/db/build-install.js`, so
   the database can never drift from the code.

3. Open **Project Settings → API** and copy:
   * **Project URL** — `https://xxxxx.supabase.co`
   * **anon public** key

4. (Recommended) **Authentication → Providers → Email**:
   * While testing, switch **Confirm email** off, so registration signs in
     immediately.
   * Before going live, switch it back on and edit the templates under
     **Authentication → Email Templates**.

5. Create the administrator:
   * **Authentication → Users → Add user** — email + password, tick
     “Auto confirm”.
   * Back in **SQL Editor**:

     ```sql
     select public.promote_staff('you@jaycobfinancial.mw');
     ```

     The reply should say `… is now an administrator.` (role `admin`, shown
     in the console as **Super Admin**).

     If that replies *"No profile matched"* — for example because the user
     was created before the schema was installed — run
     [`supabase/promote-admin.sql`](supabase/promote-admin.sql) instead: it
     creates the missing profile row and promotes the account, then prints
     a verification table.

6. Create the customer you will use for testing (either register through
   the website, or **Add user** the same way).

7. If this project was set up with an earlier build, run
   [`supabase/remove-demo-data.sql`](supabase/remove-demo-data.sql) — the
   console used to publish its demonstration book the first time an
   administrator signed in, and that book lives in `portal_docs → main`.
   The script names what it finds, deletes it and prints a verification
   table. The current build starts empty, so this is a one-off.

**Check:** in **Table Editor** the tables `profiles`, `site_docs`,
`portal_docs`, `customer_docs`, `enquiries` and `audit_log` all exist, and
`portal_docs` is empty until the console is opened for the first time.

---

## Phase 2 — Railway (about 5 minutes)

1. Push this branch to GitHub (already done) and open
   <https://railway.app> → **New Project → Deploy from GitHub repo** →
   choose `wwwbonfaceemmanuel-cmd/-jay-c-o-b-financial-services-`.
2. Railway reads `railway.json` and builds the `Dockerfile`
   (Node 20 + `server.js`). No build step, no dependencies.
3. Open the service → **Variables** → add:

   | Name | Value |
   | --- | --- |
   | `SUPABASE_URL` | your project URL from Phase 1 |
   | `SUPABASE_ANON_KEY` | the **anon public** key |

   Do **not** add the `service_role` key — it must never reach a browser.
4. **Settings → Networking → Generate Domain**.
5. Railway redeploys automatically. Open
   `https://<your-domain>/healthz`; it should return
   `{"status":"ok","cloud":true,...}`.

**Check:** `https://<your-domain>/env.js` shows your URL and anon key,
`https://<your-domain>/admin.html` asks for an email + password, and
`https://<your-domain>/system-check.html` runs the full diagnostic.

> Railway variables **override** `config.js`, so rotating the key later is a
> variable change plus a redeploy — no code edit.

---

## Phase 3 — First run through the system

Start at **`system-check.html`**. It reports, live: the configuration in
use, whether each table exists and is readable, whether the website
documents are published, whether the media bucket answers, and it can sign
in as your administrator to prove the staff policies accept the account
(it also tells you when an account is a customer rather than staff).

Then do these in order; each one proves a different part of the wiring.

1. **Website reads the cloud.** Open the home page. Footer phone, email
   and address come from `site_docs → settings` (the seeded defaults
   until the console publishes something).
2. **Admin sign-in.** `admin.html` → the email/password you promoted.
   A customer account must be refused with
   *“That account does not have administrator access.”*
3. **Publish something.** Website Settings → change the phone number →
   Save → reload the public site. The number changes for every visitor.
   `site_docs → settings` in Supabase shows the new value.
4. **Catalogue.** Site Catalogue → change Personal Loan to 27% → open the
   calculator; the rate field quotes 27.
5. **Live feed.** Live Feed → publish an update → it appears on
   `live.html` and in the corner notifications.
6. **Customer journey.** Register on the site → apply for a loan.
   In the console, the application appears in Applications → set it to
   *Approved* → sign in as the customer: status and notification updated.
7. **Console data.** Any console edit is stored in `portal_docs → main`;
   reopen the console from another browser and the same data is there.
8. **Contact form.** Send an enquiry → row appears in `enquiries`.
9. **Storage.** In the Live Feed editor, upload a photo → the file is in
   **Storage → site-media** and the post references its public URL.

If step 3 or 4 fails, the keys are wrong or the SQL was not run — check
`/healthz` first, then the browser console.

---

## What is already in place (no work for you)

| Area | State |
| --- | --- |
| Auth | Supabase email + password, session refresh, sign-out, password recovery |
| Roles | `customer` / `officer` / `credit` / `staff` / `admin`; self-promotion blocked by trigger |
| Website content | Settings, catalogue, page text, hidden sections → `site_docs` |
| Live feed | Posts, cards, About Us cards, photo upload → `site_docs` + Storage |
| Admin console | Whole portal database → `portal_docs` (staff only) |
| Customer dashboard | Loans, applications, repayments, tickets, notifications → `customer_docs` |
| Bridge | Website applications/tickets appear in the console; console decisions write back |
| Contact form | → `enquiries` |
| Audit | Every document change logged to `audit_log` |
| Security | RLS on every table, KYC bucket private per customer |

---

## What to send me, and what I will do next

**You send (Phase 1–2):** the Supabase project URL + anon key (or just
confirm Railway is deployed and the variables are set), plus the email of
the administrator account.

**I then do, in this order:**

1. **Smoke-test the live deployment** against your real project — every
   step in Phase 3, plus the automated suites re-pointed at production.
2. **Tighten auth flows for production** — email confirmation copy,
   password-reset redirect URLs (`https://<domain>/reset-password.html`),
   MFA enrolment through Supabase Auth, session timeout policy.
3. **KYC document uploads** to the private `kyc-documents` bucket, with
   signed URLs for staff review instead of inline images.
4. **Notifications** — Email/SMS through Supabase Edge Functions
   (Resend/Termii), driven by the `notifications` array and `enquiries`.
5. **Reporting** — read-only SQL views for the console dashboards
   (portfolio, arrears, collections) so numbers are computed in Postgres.
6. **Backups + audit review** — scheduled backup, retention, and an
   audit-log viewer in the console.

Nothing in that list requires the site to be offline; each item ships on
its own.

---

## Running it locally

**Against the real project** (what you have now):

```bash
node server.js            # http://localhost:8080
```

Keys come from `assets/js/config.js`, so nothing else is needed.

**Against the in-memory stand-in** (no Supabase account touched):

```bash
node tools/dev/mock-cloud.js          # http://127.0.0.1:54321
SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_ANON_KEY=dev-anon PORT=8000 node server.js
```

Staff sign-in: `admin@jaycob.mw / Admin123!`; customer:
`customer@jaycob.mw / Customer123!`.

**Without a backend** — the marketing pages and calculator draw from the
catalogue compiled into `assets/js/site-store.js`. There is no browser
database: the dashboard shows an empty account and a banner saying it is
not connected, and the console stays locked.

```bash
python3 -m http.server 8000
```

**Clearing an old installation.** Earlier builds wrote a demonstration
book into `portal_docs/main`. Run `supabase/remove-demo-data.sql` once in
the SQL Editor after deploying: it names what it finds, deletes the old
console document, any demonstration customer documents and the
demonstration login, then prints a verification table.

**Automated checks** (125 browser assertions):

```bash
npm install
npm test
```

---

## Costs and limits to plan for

* **Railway** — Hobby plan is enough for a static site; the container is
  idle most of the time.
* **Supabase** — free tier covers this project comfortably. Documents are
  JSON, so a few hundred customers is a few megabytes.
* **Storage** — live-feed photos are downscaled to 1200 px JPEG before
  upload; KYC documents are the larger item.
* **Custom domain** — add it in Railway → Settings → Networking, then set
  `https://yourdomain` as the Site URL and redirect URL in Supabase →
  Authentication → URL Configuration.

---

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Site never reaches Supabase | `/env.js` empty | Railway variables missing; redeploy |
| `new row violates row-level security` | account has no staff role | run `promote_staff` |
| Admin gate says *administrator access* | signed in as a customer | use the promoted account |
| Console data resets | remote write failing | check `/healthz`, then RLS policies |
| `Invalid login credentials` | wrong email/password, or unconfirmed email | Authentication → Users |
| Images missing after upload | bucket policies not applied | re-run the storage section of the schema |
| Dashboard bounces to login | session expired (>1 h idle) | sign in again |
