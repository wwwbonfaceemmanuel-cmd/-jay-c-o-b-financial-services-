# Jay C.O.B Financial Services — website

A complete, responsive marketing site with a live-updates newsroom, a Malawian-kwacha loan
calculator and a self-contained demo client portal — for **Jay C.O.B Financial Services**, a
fictional financial planning and advisory practice based in Lilongwe, Malawi.

Plain HTML, CSS and JavaScript. No build step, no dependencies, deployable anywhere that serves
static files (GitHub Pages, Netlify, Cloudflare Pages, S3, cPanel).

**Currency:** every amount across the site is displayed in **Malawian Kwacha (MWK)**.

---

## Pages

| File | Purpose |
| --- | --- |
| `index.html` | Home: hero, sector strip, live desk, services, differentiators, counters, process, packages, testimonials, calculator teaser, insights |
| `about.html` | Story, mission/vision, values, team, office details |
| `services.html` | Six service areas with anchors, method, FAQs |
| `products.html` | Three core packages, four add-ons, comparison table, fee FAQs — all priced in MWK |
| `insights.html` | Article index, newsletter and a live-update strip |
| `insight-building-budget.html` | Article: budgeting framework for Malawian salaries |
| `insight-sme-credit.html` | Article: SME loan documentation |
| `insight-agri-finance.html` | Article: seasonal agribusiness cash-flow planning |
| `calculator.html` | Loan calculator: monthly/annual basis, flat/reducing formulas, dated schedule, CSV + print |
| `live.html` | Live newsroom: animated announcements, cards and photo updates, plus archive |
| `admin.html` | Administrator console to publish, pin, edit, hide and delete live updates |
| `portal.html` | Client login + dashboard: overview, accounts, statements, printable receipts, documents, messages |
| `contact.html` | Validated enquiry form, office details, map panel, FAQs |
| `404.html` | Friendly not-found page |

## Project structure

```
.
├── index.html … contact.html       # pages (flat, so links stay relative and portable)
├── 404.html
├── assets/
│   ├── css/styles.css              # tokens, layout, components, animations, responsive, print
│   ├── img/
│   │   ├── logo-mark.svg           # mark only (favicon, chips, notification, receipts)
│   │   ├── logo-full.svg           # lockup on light backgrounds
│   │   ├── logo-full-light.svg     # lockup on dark backgrounds
│   │   └── hero / team / insight photography
│   └── js/
│       ├── config.js               # currency + Supabase settings (the connection point)
│       ├── main.js                 # nav, reveals, counters, forms, password reveal
│       ├── calculator.js           # MWK loan maths, schedule, CSV, print
│       ├── live.js                 # live feed, animations, notifications, Supabase loader
│       ├── admin.js                # administrator console
│       └── portal.js               # login, recovery, receipts, portal tabs
├── supabase/schema.sql             # starter tables + row-level security policies
├── robots.txt · sitemap.xml
├── .nojekyll
└── .github/workflows/pages.yml     # automatic GitHub Pages deployment
```

## Demo credentials

| Area | Credentials |
| --- | --- |
| Client portal (`portal.html`) | Email `demo@jaycobfinancial.mw` **or** phone `+265 999 123 456` · password `demo1234` |
| Admin console (`admin.html`) | Password `admin2026` |

The client login accepts an **email address or a phone number**, has a **show/hide password**
button, **Forgot password**, and **Recover my account** (identifier + client reference) flows.
Receipts open in a printable letterhead view with the Jay C.O.B logo.

Everything runs in the browser: sessions live in `localStorage`/`sessionStorage`, and statements,
receipts and documents are generated and downloaded locally. **Do not enter real banking
credentials or ID numbers.**

## Loan calculator

`calculator.html` computes in MWK with:

- **Calculation basis** dropdown — monthly (term in months, default **1**) or annual (term in
  years, default **1**; repayments still scheduled monthly).
- **Formula selector** — flat rate or reducing balance (reducing is the default).
- Results: **total amount**, **principal**, **duration period**, **interest amount**, **monthly
  payment**, arrangement fee and **total repayment**.
- A full **repayment schedule with dated rows** (due date, opening balance, payment, interest,
  principal, closing balance), CSV export and a print-friendly plan.
- An automatic comparison line showing what the other formula would cost at the same rate.

Maths: reducing balance uses the standard annuity formula
`P·r / (1 − (1+r)⁻ⁿ)`; flat rate charges `P × rate × years` and divides principal + interest evenly.

## Live updates (system-managed)

- The feed appears on the home page, the insights page and the dedicated `live.html` newsroom.
- Each post is an **announcement**, a **card** (headline + call to action) or an **image** update.
- Five entrance motions: **slide, flap (flip board), swipe, rotate and spin**.
- Auto-rotates with previous/next, pause, dots and hover/focus pausing. Reduced-motion users get a
  static presentation.
- A dismissible **notification toast** shows the newest post on every page, with the logo.
- Administrators publish from `admin.html`: type, title, message, link, image, animation, pinned
  and published flags, plus edit/publish/delete and "restore demo posts".

Posts are stored in `localStorage` under `jcob_live_posts_v1` until Supabase is connected.

## Branding / logo usage

The logo appears in the header and footer of every page, on page-hero brand chips, in navy section
watermarks and CTA bands, on forms and the calculator, on the results panel, login and admin cards,
the dashboard, live-update posts and notifications, and on printable receipts.

- `assets/img/logo-full.svg` — light backgrounds
- `assets/img/logo-full-light.svg` — dark backgrounds
- `assets/img/logo-mark.svg` — square icon contexts

## Connecting Supabase later

Everything backend-related is isolated so the demo can become live without rewriting pages:

1. Create a Supabase project and run `supabase/schema.sql` (tables: `live_posts`, `enquiries`,
   `clients`, `statements`, with row-level security).
2. Open `assets/js/config.js` and set:
   ```js
   useSupabase: true,
   supabaseUrl: "https://YOUR-PROJECT.supabase.co",
   supabaseAnonKey: "YOUR-PUBLIC-ANON-KEY"
   ```
3. `assets/js/live.js` will fetch published `live_posts` over the REST API and re-render the feed,
   notification and archive. The admin console sends the same fields.
4. Move administrator sign-in to Supabase Auth with an `app_metadata.role = "admin"` claim, and the
   RLS policies in the schema file apply.
5. Client authentication, statements and enquiries follow the same pattern — the demo logic is
   confined to `portal.js`, `main.js` and `admin.js`.

Never ship a service-role key in the browser bundle; only the public anon key belongs in `config.js`.

## Run locally

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Or `npx serve .`.

## Customising

- **Brand colours and typography:** the `:root` block at the top of `assets/css/styles.css`
  (`--navy-*`, `--gold-*`, font families). The whole site follows.
- **Business details:** search for `hello@jaycobfinancial.mw`, `+265 999 123 456` and `Area 47`
  across the HTML files, plus the receipt footer in `assets/js/portal.js` and `sitemap.xml`.
- **Photography:** replace files in `assets/img/` keeping the same names/aspect ratios.
- **Fees and packages:** indicative MWK figures live in `products.html` and `services.html`.
- **Demo passwords:** `assets/js/portal.js` (`DEMO_PASSWORD`) and `assets/js/admin.js`
  (`GATE_PASSWORD`); both should move server-side before launch.

## Deployment

The included workflow (`.github/workflows/pages.yml`) publishes the repository root on every push
to `main`. In the repository settings, set **Pages → Source** to **GitHub Actions** once.

Because the repository name starts with a hyphen, the site URL will look like:

```
https://<username>.github.io/-jay-c-o-b-financial-services-/
```

All internal links are relative, so the site also works from a subdirectory or a custom domain.
`404.html` is picked up automatically by GitHub Pages and Netlify.

## Accessibility & performance notes

- Semantic landmarks, skip link, visible focus states, labelled form controls and live regions.
- Mobile navigation is keyboard accessible, closes on `Esc` and restores page scroll.
- Animations respect `prefers-reduced-motion`; the live carousel can be paused manually; there is a
  print stylesheet for the repayment plan and receipts.
- Forms validate inline with `aria-live` status messages. They intentionally do not post anywhere —
  wire them to Supabase, Formspree, Netlify Forms or your CRM before launch.
- Images carry `width`/`height`, the hero is eagerly loaded, everything else is lazy-loaded.
- Fonts load from Google Fonts with system-font fallbacks.

## Important

This is a **demonstration site**. The company, team, client testimonials, registration references,
figures and contact details are placeholders. Replace them with verified information, and have any
regulatory or compliance statements reviewed, before publishing commercially.
