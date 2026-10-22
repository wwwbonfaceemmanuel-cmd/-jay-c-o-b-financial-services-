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
| `loan-products.html` | All eleven products with limits, terms, rates, fees, repayment frequency, eligibility, documents, plus a full comparison table |
| `apply.html` | Five-step application: product & amount → personal/employment → business & bank → documents → review, with draft saving, reference number and confirmation |
| `calculator.html` | **Calculation basis dropdown (Monthly → 1 month, Annually → 1 year)**, **flat / reducing segmented selector**, amount, rate, term, monthly/fortnightly, processing & admin fees, instalment, annual outlay, interest, total repayment, APR, amortisation preview, CSV, print, reset, "Apply for This Loan" |
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

### Live blog, announcements and motion system

Ten seeded posts across four formats — **announcement**, **card**, **photo update** and **live blog** —
each with its own motion: **slide, flap, swipe, rotate, spin, swap** and **endless float** (a looping
motion for standing notices). On top of that:

- an endless marquee **ticker** of every published headline, pausing on hover and focus;
- an auto-advancing feed (6.5 s) with previous / next / pause controls, dots and a live pulse;
- a corner **notification toast** that inherits the post's motion on every public page;
- the full **live-blog stream** on `live.html` and the four newest posts on the home page;
- all of it managed from `admin.html` — password gate, image upload (resized to 1200 px and stored
  as a data URL) or image URL, text, link + button label, motion, pin, publish/unpublish, edit and delete.

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

## Demo credentials

| Field | Value |
| --- | --- |
| Email | `demo@jaycobfinancial.mw` |
| Phone | `+265 999 123 456` |
| Password | `demo1234` |
| OTP | `123456` |
| Admin console | `admin2026` (on `admin.html`) |

Seeded customer **Memory Tembo** (`JC-ACC-100412`), wallet **MWK 615,000**, two loans
(`LN-2026-0412` personal, `LN-2026-0588` in arrears), four applications, two tickets and
thirteen notification types. All data lives in `localStorage` under `jcob_app_v1`; the session
key is `jcob_session_v1`. Clear site data to reset the demonstration.

---

## Project structure

```
.
├── *.html                      # pages (flat, relative links, portable)
├── assets/
│   ├── css/styles.css          # tokens, v3 theme block, components, responsive, print
│   ├── img/                    # logo lockups, favicon, photography
│   └── js/
│       ├── config.js           # Supabase-ready config stub
│       ├── finance.js          # MWK formatting, amortisation, APR, affordability, masking
│       ├── app-data.js         # single data layer (seeded demo store, localStorage)
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
│       ├── live.js / admin.js  # animated live feed and its admin console
│       └── portal.js           # legacy portal (superseded by dashboard.html)
├── single/index.html           # entire site in one self-contained file
├── tools/
│   ├── build.py                # static site builder (header/footer/scripts + legal + aliases)
│   ├── legal_docs.py           # legal document content
│   ├── retheme_legacy.py       # re-skins retained pages with the v3 chrome
│   └── pages/                  # page body fragments consumed by build.py
├── supabase/schema.sql         # future database schema
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

Demo login inside the bundle: `demo@jaycobfinancial.mw` / `demo1234`, OTP `123456`.

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
- Logo lockup in the header, footer, section headers, legal navigation, auth pages, receipts and
  printed documents.
- Responsive breakpoints at 1180, 1024, 760 and 520 px; the dashboard sidebar collapses to a
  drawer, tables scroll horizontally, grids reflow to one column.
- Keyboard-operable navigation, skip links, visible focus states, labelled fields with inline
  validation, `aria-live` status messages, semantic headings, and reduced-motion support.
- System-font fallbacks, defer-loaded scripts, SVG logos and lazy-loaded photography below the fold.

## Data and future Supabase connection

`assets/js/config.js` holds the project URL/key placeholders and feature flags. All reads and
writes go through `window.JCOB_DATA` (`assets/js/app-data.js`), so swapping the localStorage
adapter for Supabase queries is a single-file change. `supabase/schema.sql` sketches customers,
applications, loans, schedules, transactions, documents, notifications and tickets.

## Disclaimer

This is a demonstration environment. Company details, licence references, rates, decisions and
reference numbers are illustrative; no real credit is advanced, no money moves and no personal
data leaves the browser. Borrowing costs money — read the Responsible Lending Policy, Fee
Disclosure Statement and Terms and Conditions before entering any real agreement.
