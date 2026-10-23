# JAY C O B FINANCIAL SERVICES — lending website (v3)

A complete, responsive lending site and customer dashboard for **JAY C O B FINANCIAL SERVICES**,
a licensed money lender in Lilongwe, Malawi. Emerald-green and blue liquid-crystal theme,
all money in **Malawian Kwacha (MWK)**.

Plain HTML, CSS and JavaScript. No framework, no bundler, no runtime dependencies — deployable to
any static host (GitHub Pages, Netlify, Cloudflare Pages, S3, cPanel).

---

## What is included

### Public site

| Page | Contents |
| --- | --- |
| `index.html` | Branding, hero with Apply / Login / Register, five loan cards, eligibility overview, working calculator preview with basis selector, live feed + ticker + blog stream, how it works, why choose us, customer benefits, rates & repayment table, testimonials, FAQ, security & trust, contact |
| `about.html` | Overview, mission & vision, values, history timeline, leadership, registration & licensing, CSR, location & contact |
| `loan-products.html` | All eleven products with limits, terms, rates, fees, repayment frequency, eligibility and documents — each with a **worked example computed by the shared engine** (edit the amount or term and it re-quotes), plus a comparison table generated from the catalogue |
| `apply.html` | Five-step application: product & amount → personal/employment → business & bank → documents → review, with draft saving, reference number and confirmation |
| `calculator.html` | **Calculation basis dropdown (Monthly → 1 month, Annually → 1 year)**, **interest-rate basis dropdown (annual % p.a. / monthly % per month — applied exactly as quoted)**, **flat / reducing segmented selector**, amount, rate, term, disbursement date, monthly/fortnightly, processing & admin fees; **one preset per catalogue product (all eleven)** and **results sheet** in a fixed order — total amount, principal, interest rate, interest amount, duration period, schedule with dates, total repayment — plus a worked formula line, fees, APR, interest method, first/last instalment, dated schedule, CSV, print, reset and "Apply for This Loan" |
| `eligibility.html` | Eight-question preliminary check scored out of 100 with per-criterion explanations and an apply link |
| `how-it-works.html` | Ten steps from account creation to repayment and monitoring, with timings and requirements |
| `interest-rates-fees.html` | Rate table with indicative APR, flat vs reducing comparison, every charge, three worked examples, total cost of borrowing |
| `support.html` | Contact form, phone/email/address, help centre, payment guidance, security help, ticket tracking, complaints, hours, emergency line, FAQ |
| `register.html`, `login.html`, `verify.html`, `forgot-password.html`, `reset-password.html` | Registration, email-or-phone login, OTP verification, recovery, password reset, lockout and session handling |
| `dashboard.html` | Customer portal (hash-routed single page) |
| 14 legal pages | Privacy, Terms, Loan Agreement Terms, Cookies, Responsible Lending, Complaints, Data Protection, KYC, AML, Credit Reporting, Fees Disclosure, Customer Rights, Consent & Retention, Licensing |
| `live.html` | Live desk: animated feed widget, endless headline ticker, and the full live-blog stream |
| `admin.html` | Administrator console: publish / edit / delete announcements, cards, photo posts and blog posts, upload or link an image, choose one of seven motions, pin, unpublish |
| `services.html`, `insights.html`, `insight-*.html`, `contact.html`, `404.html` | Retained pages, re-skinned with the current header, footer and brand |
| `products.html`, `portal.html` | Aliases that forward old links to the loan products page and the dashboard login |

### Loan maths and rate quoting

`assets/js/finance.js` is the single engine behind the calculator, the product pages, the application summary, the rates page and the dashboard. It applies the rate in the unit the customer selects:

| Selection | Meaning | Example (MWK 100,000) |
| --- | --- | --- |
| Rate basis: **Monthly**, method: flat, 1 month | 25% of principal, charged once | Interest MWK 25,000 · repayment MWK 125,000 · one instalment due one month after disbursement |
| Rate basis: **Monthly**, method: reducing, 1 month | 25% on the opening balance | Interest MWK 25,000 · repayment MWK 125,000 |
| Rate basis: **Annual**, method: flat, 12 months | 25% of principal for the year, split into instalments | Interest MWK 25,000 · 12 × MWK 10,416.67 · repayment MWK 125,000 |

- There is **no hidden cap or re-quoting**: switching the rate-basis dropdown re-expresses the same cost (2% per month ⇄ 24% p.a.), and the figure you see is the figure used.
- **Calculation basis** only changes the unit of the term field: monthly = months (default 1), annually = years (default 1 year = 12 instalments) with the headline result shown per year.
- The **first instalment always falls one full period after the disbursement date**; the schedule table and CSV show each dated instalment, with opening/closing balances.
- Fees stay separate from the repayment figure: *Total repayment* is principal + interest, *Total amount* adds the processing/admin fees.
- Every figure is MWK and rounded for display only; the engine keeps full precision, adjusting the final instalment.

**One function, every product.** `JCOB_FINANCE.productQuote(product, { amount, termMonths })`
resolves a catalogue product (its rate, rate basis, method, fee and published limits) and runs the
same `amortize()` the calculator uses, clamping anything asked of it to those limits. Every surface
calls it, so no two pages can quote different numbers for the same loan:

| Surface | Quoted by |
| --- | --- |
| `index.html` product cards | a computed example line (`product-quotes.js`) |
| `loan-products.html` cards | the worked example panel, with editable amount and term |
| `loan-products.html` comparison table | rate, limits, term and fee written from the catalogue |
| `calculator.html` | the eleven catalogue presets, each loading its own rate, basis, method and fee |
| `apply.html` and the dashboard's apply flow | the summary, the review step and affordability, in the product's own unit |
| `interest-rates-fees.html` | the published rate schedule and the three worked examples, read from the catalogue |

A product card links into the calculator with its figures attached
(`calculator.html?product=…&amount=…&term=…&fee=…`), and the calculator recomputes the same answer.

### Signature pad

`assets/js/onboard.js` draws the signature with an interpolating spline (Catmull-Rom converted to
cubic Béziers), so the line passes through every point the pointer visits instead of joining samples
with straight segments — any shape, cursive or print, loops and flicks included. Points come from
pointer events with `setPointerCapture` and `getCoalescedEvents()`, the canvas backing store is sized
for the device pixel ratio, and the pad offers undo, clear and a keyboard backspace. The signature is
stored as strokes in the customer's document in Supabase, never in this browser.

### Live blog, announcements and motion system

Seventeen seeded posts across five formats — **announcement**, **card**, **photo update**, **live blog**
and **About us** —
each with its own motion: **slide, flap, swipe, rotate, spin, swap** and **endless float** (a looping
motion for standing notices). On top of that:

- an endless marquee **ticker** of every published headline, pausing on hover and focus;
- an auto-advancing feed (6.5 s) with previous / next / pause controls, dots and a live pulse;
- a corner **notification toast** that inherits the post's motion on every public page;
- the full **live-blog stream** on `live.html` and the four newest posts on the home page;
- seven **About Us cards** (mission, vision, values, history, licensing, CSR, contact) live in the same
  stream and the same admin list, each with a different motion — slide, swap, flap, rotate, spin,
  swipe and endless;
- **section live blogs**: fifteen further posts are tagged to a section and rendered as a compact
  three-up strip inside it — Security & trust and Why choose us on the home page, Customer stories
  under the testimonials, plus a strip on `eligibility.html` and on `loan-products.html`. Each strip
  is filtered by topic, keeps its own motion actions and hides itself if every post in that topic is
  unpublished;
- all of it managed from `admin.html` — password gate, image upload (resized to 1200 px and stored
  as a data URL) or image URL, text, link + button label, motion, pin, publish/unpublish, edit, delete,
  and a one-click **Add About Us cards** action that publishes or restores the seven story cards.
- the composer's **Show in section** selector targets one of the five strips (or the general feed), so
  an administrator controls exactly which section a post appears in.

Posts persist in `localStorage` (`jcob_live_posts_v1`) and read from a Supabase `live_posts` table
without code changes once `assets/js/config.js` is filled in.

### Customer dashboard (all sections)

Dashboard home (balance, active loans, outstanding, next repayment, totals, recent transactions,
notifications, quick actions), Apply for a loan (in-portal), Applications with tracker and
reviewer comments, Active loans, Loan details, Repayments (Airtel Money / Mpamba / bank transfer,
receipts, missing-payment reporting), Repayment schedules (table and calendar), Transactions,
Deposits, Withdrawals, Transfers (OTP-authorised), Savings goals, Statements, KYC & documents,
Notifications (13 types, read/unread, preferences), Support tickets, Profile, Account security
(password, MFA, sessions, login activity, sign out others, suspicious activity, closure) and
Settings (language, channels, marketing consent, privacy, accessibility, download/delete data).

---

## Empty by default — no sample data

The system holds no invented records. A new installation has no customers, no loans, no repayments,
no staff list, no balances and no demonstration logins:

* the public site reads its catalogue, settings and page text from `site_docs`;
* the admin console reads its book from `portal_docs` (configuration only until real records exist);
* each customer reads only their own document from `customer_docs`;
* sign-in, sign-up, one-time codes and password recovery all run through Supabase Auth;
* a brand-new account shows empty states — never somebody else's history.

There is no demonstration switch, no fixed OTP, no browser-side password store and no published
console password in this build. An installation without Supabase configured works as a website and
a calculator, and refuses sign-in and the console with a message telling the visitor to call.

### Supabase is the only store

Nothing is cached, mirrored or edited in the browser. The page holds the customer's document in
memory while it is open, reads it from `customer_docs` on load and writes every change straight back:

| What | Table | Who can read it |
| --- | --- | --- |
| Customer document (profile, loans, repayments, KYC, tickets) | `customer_docs` | the owner, and staff |
| Console book (customers, applications, ledger, staff) | `portal_docs` | staff only |
| Website content (settings, catalogue, page text, live posts) | `site_docs` | everyone |
| Enquiries | `enquiries` | staff, plus insert for a visitor |
| Roles and staff flags | `profiles` | the owner and staff |
| KYC files and site images | buckets `kyc-documents`, `site-media` | per policy |
| Passwords, one-time codes, recovery links | Supabase Auth | never exposed to the page |

The browser keeps one thing: the session token, so you stay signed in between pages. It is removed on
sign-out, together with any document an older build once cached. Old `jcob_app_v2` cache entries are
deleted automatically the first time a page loads.

The dashboard's top bar says exactly where the last change went — **Saved to your account** only
after the write to Supabase succeeds, **Not saved to the server** when it does not, and **Not
connected** when there is no account service at all. When the connection drops, the banner says so
and nothing is silently kept on the device.

If a project was set up with an earlier build, run **`supabase/remove-demo-data.sql`** once: it names
what it finds, clears the old console book from `portal_docs` and any demonstration customer
documents, then prints a verification table.

## Admin management portal

`admin.html` is the full management console for the business and the website. It signs staff in
against Supabase and requires a staff role (`admin`, `staff`, `officer` or `credit`) on the
`profiles` row; anyone else is refused. There is no bypass password, and without a reachable
Supabase project the console stays locked.

The portal ships with the complete back office: dashboard, customers, KYC, loan applications,
products, credit assessment, active loans, disbursement, guarantors and collateral, repayments,
schedules, collections, deposits, withdrawals, transfers, savings, fees, interest, ledger,
reconciliation, statements, support, messaging, admin users, roles, workflows, audit logs, security,
compliance, system settings, backups, reports, risk, branches, officers, payroll, accounting,
investors, partners, legal, API integrations, fraud, templates and the calculator.

### The WEBSITE group (site ↔ console connection)

| Module | What it manages | Where it appears on the site |
| --- | --- | --- |
| **Website Pages** | Scans each page and lists every section, heading, paragraph, card line and button. Edit text, change link targets, hide a whole section, or reset a page. | The page itself, on next load |
| **Live Feed** | Publish, edit, pin, unpublish or delete animated updates; choose type (announcement / card / photo / blog), section placement and one of seven motions; upload or link an image. | Home strips, live desk, ticker |
| **Site Catalogue** | The eleven lending products: annual rate, processing fee, amount limits, term range, summary, active state. | Calculator presets, application limits, product pages, rates tables |
| **Website Settings** | Brand, tagline, registration, licence, phones, emergency line, emails, address, hours, social links, calculator defaults, published lending policy. | Header, footer, contact blocks, support and legal pages, calculator defaults |

### How the connection works

- `assets/js/site-store.js` is the single shared store (`jcob_site_v1` in localStorage). The website
  reads it, the console writes it. Replacing `read()`/`write()` with Supabase calls connects both.
- `assets/js/site-content.js` runs on every public page and applies published text, link and
  section-visibility overrides, brand/contact replacements and catalogue values.
- `assets/js/site-admin.js` extends the console (it does not modify the console's own logic) with the
  WEBSITE group and the two-way bridge:
  - applications submitted on `apply.html` (`jcob_app_v1`) appear in **Loan Applications**;
  - support tickets from `support.html` appear in **Customer Support**;
  - approving, rejecting or requesting information in the console writes the status, reviewer note
    and a notification back to the customer's dashboard.
- The page scanner builds stable CSS paths from the same static HTML, so the console and the site
  always agree on what each block is.
- Everything degrades safely: with an empty store the website renders exactly as authored, and the
  console keeps working on its own local data.

### Cloud: Supabase behind Railway

The system runs on two modes, chosen automatically:

| Mode | When | Where data lives |
| --- | --- | --- |
| **Offline** | no Supabase keys | browser `localStorage` (site content only; no sign-in) |
| **Cloud** | `SUPABASE_URL` + `SUPABASE_ANON_KEY` present | Supabase Postgres, guarded by Row Level Security |

`assets/js/cloud.js` is the only module that speaks to the network — Auth, the document
endpoints and Storage uploads. Everything else keeps its existing calls (`JCOB_SITE.save()`,
`JCOB_DATA.persist()`, `JCOB_LIVE.savePosts()`), so the pages and the console did not need rewriting.

| Supabase table | Holds | Who can read / write |
| --- | --- | --- |
| `profiles` | one row per account, with `role` (`customer` / `officer` / `credit` / `staff` / `admin`) | owner, staff read all; role changes blocked for non-staff |
| `site_docs` | `settings`, `products`, `content`, `sections`, `live_posts` | public read, staff write |
| `portal_docs` | the admin console's own database (`main`) | staff only |
| `customer_docs` | one dashboard document per customer | owner, staff read/update |
| `enquiries` | contact-form submissions | anyone may submit, staff read |
| `audit_log` | every document change (who, what, when) | staff read, written by trigger |
| Storage | `site-media` (public photos), `kyc-documents` (private) | staff / owning customer |

Operational details:

- **Keys never enter Git.** `server.js` answers `/env.js` from the Railway environment; the same
  file is a harmless placeholder on a static host, where you paste keys into `assets/js/config.js`
  instead.
- **Sessions** refresh automatically; the UI session (`jcob_session_v1`) and the Supabase session
  (`jcob_cloud_session_v1`) are kept in step, so existing route guards keep working.
- **The admin gate** signs in with Supabase and refuses any account whose `profiles.role` is not a
  staff role. There is no bypass password.
- **The bridge** reads every `customer_docs` row, so website applications and tickets from all
  customers appear in the console; a decision writes the status, reviewer note and notification back
  to the right customer's document.
- **Photos** uploaded in the Live Feed editor go to the public `site-media` bucket after being
  downscaled to 1200 px JPEG; the post stores the public URL.
- **Fallback**: if the cloud is unreachable the dashboard shows a banner and refuses to pretend a
  change was saved; the console shows a `Cloud error` badge in the Website connection panel.

The project is already pointed at Supabase (`lgftgochlcbakovdhmhb`, `assets/js/config.js`). Two steps remain:
run `supabase/install.sql` (schema + seeded content in one paste), then promote your
administrator. Open
**`system-check.html`** on the deployed site for a live diagnosis — it tests the configuration,
every table, the website documents, the media bucket and a real administrator sign-in, and prints
the exact fix for anything red.

Full step-by-step, including accounts and the first-run checklist: **[DEPLOY.md](DEPLOY.md)**.

### Running the checks

```bash
npm install     # once — jsdom, for the browser suites
npm test        # starts the Supabase stand-in + server, runs 479 assertions
```

The suites in `tools/tests/` cover the build with no backend (public site, calculator, live desk,
single-file bundle, an empty dashboard that ignores a stale browser copy), the product quotes (the
flat-monthly rule, clamping, and every page against the engine), the signature pad (trace fidelity,
curve rendering, undo/clear), the header chrome (the bar and the footer share one emerald
token, every control restated on that ground, contrast maths, print), cloud mode (hydration,
catalogue, live feed, staff gate, role refusal, console persistence, decision round-trip,
registration, sign-in, recovery, enquiries, dashboard guard) and the diagnostic page. The cloud
suite also proves the browser holds no records: a change written in the dashboard lands in
`customer_docs`, and a stale copy left in localStorage is ignored and deleted.

The mock project in `tools/dev/mock-cloud.js` is test infrastructure only. It is never served by
the site and never loaded by a page.

## Project structure

```
.
├── *.html                      # pages (flat, relative links, portable)
├── server.js                   # zero-dependency static server + /env.js + /healthz (Railway)
├── env.js                      # placeholder runtime config for static hosts
├── Dockerfile · railway.json   # Railway build (Node 20)
├── DEPLOY.md                   # Supabase + Railway setup and first-run checklist
├── supabase/install.sql        # ONE PASTE: schema + seed (generated)
├── supabase/schema.sql         # tables, RLS policies, triggers, storage buckets
├── supabase/seed.sql           # settings, catalogue and live posts (generated)
├── supabase/migrations/        # same schema for the Supabase CLI
├── system-check.html           # live connection diagnostic (noindex)
├── tools/dev/mock-cloud.js     # in-memory Supabase stand-in for local testing
├── tools/tests/                # browser suites (npm test)
├── tools/db/                   # seed generator + installer builder
├── assets/
│   ├── css/styles.css          # tokens, v3 theme block, components, responsive, print
│   ├── img/                    # logo lockups, favicon, photography
│   └── js/
│       ├── config.js           # runtime config (table map, buckets, cloud switch)
│       ├── cloud.js            # Supabase client: auth, documents, storage
│       ├── finance.js          # MWK formatting, amortisation, APR, affordability, masking
│       ├── app-data.js         # customer document store (cloud + local cache)
│       ├── ui.js               # toasts, modals, bell, session, tables, pagination, print
│       ├── main.js             # site chrome, nav, reveal, validation, accordion
│       ├── auth.js             # registration, login, OTP, recovery, lockout
│       ├── apply.js            # five-step application wizard (public + in-dashboard)
│       ├── calculator.js       # full calculator
│       ├── quickcalc.js        # home-page mini calculator
│       ├── eligibility.js      # eligibility questionnaire
│       ├── rates.js            # worked examples on the rates page
│       ├── support.js          # contact form and ticket tracking
│       ├── dashboard.js        # customer dashboard SPA
│       ├── live.js             # animated live feed (shared by site + admin)
│       ├── site-store.js       # shared website store: settings, catalogue, content
│       ├── site-content.js     # applies published content to every public page
│       ├── site-admin.js       # admin ↔ website connector (Website group)
├── admin.html                  # admin management portal (Supabase staff sign-in)
├── single/index.html           # entire site in one self-contained file
├── tools/
│   ├── build.py                # static site builder (header/footer/scripts + legal + aliases)
│   ├── legal_docs.py           # legal document content
│   ├── retheme_legacy.py       # re-skins retained pages with the v3 chrome
│   └── pages/                  # page body fragments consumed by build.py
├── supabase/                    # schema, seed, one-step installer, migrations
├── sitemap.xml, robots.txt
└── README.md
```

## Single-file edition

`single/index.html` is the whole project in one 2.3 MB HTML document: 37 views (every page plus all
14 policies), the stylesheet, all JavaScript and every image inlined as data URIs. No assets folder,
no server, no build step — double-click it, email it, or upload it on its own to any host.

- Every internal link is rewritten to a hash route (`#/about`, `#/loan-products#business`,
  `#/support`), and links rendered by JavaScript are intercepted so nothing ever leaves the file.
- The dashboard is mounted inside the same document; its own sub-routes (`#repayments`,
  `#transactions`, …) still work, and signing out returns to the login view.
- Storage automatically falls back to memory when `localStorage` is unavailable (`file://`,
  private windows, sandboxed iframes), so nothing breaks offline.
- Only optional external request: Google Fonts; without a connection the system serif/sans stack
  is used.

```bash
python3 tools/build_single.py          # rebuild single/index.html from the checked-in pages
python3 tools/build_single.py --check  # also fail on external references / duplicate ids
```

The bundle opens the dashboard views with a preview session so a reviewer can walk them; it has no
accounts and no stored records.

## Building and checking

```bash
python3 tools/build.py          # rebuild pages from tools/pages + legal_docs
python3 tools/build.py --check  # verify every internal link and asset resolves
python3 tools/retheme_legacy.py # re-skin retained pages (idempotent)
python3 -m http.server 8000     # preview at http://localhost:8000
```

The site can also be served exactly as committed: `tools/build.py` output is checked in, so no
build step is required to deploy.

## Deploying to GitHub Pages

The site is already built and checked in, so Pages only needs three things:

1. **Settings → Pages → Build and deployment → Source = GitHub Actions** (one click, repo owner only —
   the API token used by automation cannot create the Pages site).
2. **Actions → "Deploy static site to GitHub Pages" → Re-run all jobs** (or push any commit to `main`).
3. Open <https://wwwbonfaceemmanuel-cmd.github.io/-jay-c-o-b-financial-services-/>.

The workflow (`.github/workflows/pages.yml`) copies the site into `_site`, fails the build if any of
the 17 key pages or the core assets are missing, then uploads and deploys the artifact. All links are
relative, so the repository sub-path (`/-jay-c-o-b-financial-services-/`) works without configuration.

Alternative hosts: any static host (Netlify, Cloudflare Pages, S3, cPanel) can serve the repository
root as-is — there is no build step at runtime.

## Design, accessibility and performance

- Emerald (`#04171a` → `#0d4a4b`) with blue liquid crystal (`#0a3f6b` → `#e6f3fd`) on an ice-paper base
  (`#eef4fa`), frosted glass surfaces, iridescent facet highlights and a slow ambient drift.
- **One chrome (v7):** the header block — announcement strip, nav bar and mobile drawer — is painted
  with the exact same `--emerald-chrome` gradient as the footer, with a gold rail along its bottom
  edge and light `--chrome-text` type restated for every control on that ground. The customer
  dashboard's app bar and the admin console's top bar use the same bar, so site and tools read as
  one product.
- **Golden edges (v5):** a fine gold frame around the viewport, a gold rail under the header and above
  the footer, gold hairline borders and a 3px gold top rail on every card, gold-edged panels, tables,
  legal documents and dashboard modules, plus gold figures, focus rings and separators. Gold is trim
  only — every gold-on-surface pair is checked for at least 4.5:1 contrast.
- Logo lockup in the header, footer, section headers, legal navigation, auth pages, receipts and
  printed documents.
- Responsive breakpoints at 1180, 1024, 760 and 520 px; the dashboard sidebar collapses to a
  drawer, tables scroll horizontally, grids reflow to one column.
- Keyboard-operable navigation, skip links, visible focus states, labelled fields with inline
  validation, `aria-live` status messages, semantic headings, and reduced-motion support.
- System-font fallbacks, defer-loaded scripts, SVG logos and lazy-loaded photography below the fold.

## Data layer

`assets/js/cloud.js` owns every network call. In cloud mode each feature persists itself:

| Feature | Function that saves | Supabase destination |
| --- | --- | --- |
| Website content, catalogue, settings, live feed | `JCOB_SITE.save()` / `setField()` / `setSection()` / `JCOB_LIVE.savePosts()` | `site_docs` |
| Admin console (all modules) | `save()` in `admin.html` | `portal_docs` |
| Customer dashboard (all panels) | `JCOB_DATA.save()` | `customer_docs` |
| Registration, sign-in, recovery | `JCOB_CLOUD.auth.*` | Supabase Auth + `profiles` |
| Contact form | `JCOB_CLOUD.from("enquiries")` | `enquiries` |
| Live-feed photos | `JCOB_CLOUD.storage.upload()` | Storage `site-media` |
| KYC documents (next phase) | — | Storage `kyc-documents` (private) |

With no keys the same calls fall back to `localStorage`, so the website keeps working offline and
the cloud can be switched on without touching the pages. Sign-in and the console require the cloud.

## Disclaimer

Company details, licence references, rates, decisions and reference numbers remain illustrative
until they are replaced in the admin console; no real credit is advanced and no money moves. Once
the Supabase connection is configured, submitted enquiries, applications, tickets and KYC uploads
are stored in your own Supabase project. Borrowing costs money — read the Responsible Lending
Policy, Fee Disclosure Statement and Terms and Conditions before entering any real agreement.
