# Jay C.O.B Financial Services — website

A complete, responsive marketing website plus a self-contained demo client portal for
**Jay C.O.B Financial Services**, a fictional financial planning and advisory practice based in
Lilongwe, Malawi.

Built with plain HTML, CSS and JavaScript — no build step, no dependencies, deployable anywhere
that serves static files (GitHub Pages, Netlify, Cloudflare Pages, S3, cPanel).

---

## Pages

| File | Purpose |
| --- | --- |
| `index.html` | Home: hero, services, differentiators, live counters, process, packages, testimonials, calculator teaser, insights |
| `about.html` | Story, mission/vision, values, team, office details |
| `services.html` | Six detailed service areas with anchors, method, FAQs |
| `products.html` | Three core packages, four add-ons, comparison table, fee FAQs |
| `insights.html` | Article index and newsletter sign-up |
| `insight-building-budget.html` | Article: budgeting framework for Malawian salaries |
| `insight-sme-credit.html` | Article: SME loan documentation |
| `insight-agri-finance.html` | Article: seasonal agribusiness cash-flow planning |
| `calculator.html` | Loan repayment + savings projection calculator |
| `portal.html` | Demo client portal (sign-in, overview, accounts, statements, documents, messages) |
| `contact.html` | Validated enquiry form, office details, map panel, FAQs |
| `404.html` | Friendly not-found page |

## Project structure

```
.
├── index.html … contact.html       # pages (flat, so all links are relative and portable)
├── 404.html
├── assets/
│   ├── css/styles.css              # design tokens, layout, components, responsive rules
│   ├── img/                        # hero, team and insight photography + favicon
│   └── js/
│       ├── main.js                 # nav, reveal animations, counters, forms, newsletter
│       ├── calculator.js           # loan + savings maths
│       └── portal.js               # demo auth, tabs, CSV/text downloads
├── robots.txt
├── sitemap.xml
├── .nojekyll                       # tells GitHub Pages to serve files as-is
└── .github/workflows/pages.yml     # optional automatic deployment
```

## Run locally

Any static server works:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Or `npx serve .` if you prefer Node.

## Demo client portal

- URL: `portal.html`
- Email: `demo@jaycobfinancial.mw`
- Password: `demo1234`

The credentials are pre-filled and printed on the sign-in card. Everything in the portal runs in
the browser: the session is kept in `localStorage`/`sessionStorage`, and statements and documents
are generated and downloaded locally as CSV/text files. No data leaves the device. **Do not enter
real banking credentials or ID numbers.**

## Customising

- **Brand colours and typography** live in the `:root` block at the top of `assets/css/styles.css`.
  Change `--navy-*`, `--gold-*` and the two font families there and the whole site follows.
- **Business details** (phone, email, address, hours) are repeated across the HTML files. Search for
  `hello@jaycobfinancial.mw`, `+265 999 123 456` and `Area 47` to replace them consistently.
  The same values also appear in `assets/js/portal.js` (demo contact links) and `sitemap.xml`.
- **Photography** is in `assets/img/`. Replace files with the same names and aspect ratios to swap
  imagery without touching the markup.
- **Fees** shown on `products.html` and `services.html` are indicative examples; update them before
  going live.

## Deployment

### GitHub Pages (automatic)

The included workflow at `.github/workflows/pages.yml` publishes the repository root on every push
to `main`. In the repository settings, set **Pages → Source** to **GitHub Actions** once.

Because the repository name starts with a hyphen, the site URL will look like:

```
https://<username>.github.io/-jay-c-o-b-financial-services-/
```

All internal links are relative, so the site also works from a subdirectory or a custom domain.

### Other hosts

Upload the repository contents (excluding `.git`, `.github` and this README if you like) to the
web root. `404.html` is picked up automatically by GitHub Pages and Netlify.

## Accessibility & performance notes

- Semantic landmarks (`header`, `nav`, `main`, `footer`, `article`), skip link, visible focus states.
- Mobile navigation is keyboard accessible, closes on `Esc` and restores page scroll.
- Scroll-reveal animations respect `prefers-reduced-motion`; there is a print stylesheet.
- Forms validate inline with `aria-live` status messages. They intentionally do not post anywhere —
  wire them to your CRM, Formspree, Netlify Forms or an API endpoint before launch.
- Images carry `width`/`height`, hero art is eagerly loaded, everything else is lazy-loaded.
- Fonts are loaded from Google Fonts with a system-font fallback if the network is unavailable.

## Important

This is a **demonstration site**. The company, team, client testimonials, registration references,
figures and contact details are placeholders. Replace them with verified information, and have any
regulatory or compliance statements reviewed, before publishing commercially.
