#!/usr/bin/env python3
"""
Static site builder for JAY C O B FINANCIAL SERVICES (v3 — emerald × gold).

Pages are authored as body fragments in tools/pages/*.html and wrapped with
the shared header, footer and script stack defined here. Legal documents are
generated from tools/legal_docs.py. Run from anywhere:

    python3 tools/build.py

Set  python3 tools/build.py --check  to verify every output exists and every
internal link resolves.
"""
from __future__ import annotations

import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGES_DIR = Path(__file__).resolve().parent / "pages"

BRAND = "JAY C O B FINANCIAL SERVICES"
BRAND_SHORT = "JAY C O B"
PHONE = "+265 999 123 456"
PHONE_ALT = "+265 888 456 789"
EMAIL = "hello@jaycobfinancial.mw"
SUPPORT_EMAIL = "support@jaycobfinancial.mw"
ADDRESS = "Plot 47/3, Area 47, Sector 3, Lilongwe, Malawi"

BASE_SCRIPTS = ["env.js", "assets/js/config.js", "assets/js/demo-mode.js",
                "assets/js/cloud.js",
                "assets/js/site-store.js", "assets/js/finance.js",
                "assets/js/demo-customer.js", "assets/js/demo-portal.js",
                "assets/js/app-data.js", "assets/js/ui.js", "assets/js/main.js",
                "assets/js/live.js", "assets/js/site-content.js"]


def esc(value: str) -> str:
    return html.escape(value, quote=True)


# --------------------------------------------------------------------------
# Shared chrome
# --------------------------------------------------------------------------
NAV = [
    ("index.html", "Home"),
    ("about.html", "About"),
    ("loan-products.html", "Loan products"),
    ("calculator.html", "Calculator"),
    ("how-it-works.html", "How it works"),
    ("interest-rates-fees.html", "Rates &amp; fees"),
    ("support.html", "Support"),
]

HEADER = """  <a class="skip-link" href="#main">Skip to content</a>

  <header class="site-header">
    <div class="header-topline">
      <div class="container">
        <p>Licensed money lender · Lilongwe, Malawi · All amounts in MWK</p>
        <div class="topline-right">
          <a href="tel:+265999123456">%(phone)s</a>
          <span class="sep" aria-hidden="true">|</span>
          <a href="mailto:%(email)s">%(email)s</a>
          <span class="sep" aria-hidden="true">|</span>
          <a href="support.html">Help centre</a>
        </div>
      </div>
    </div>
    <div class="container header-inner">
      <a class="brand" href="index.html" aria-label="%(brand)s — home">
        <img class="brand-logo" src="assets/img/logo-full.svg" alt="%(brand)s" width="268" height="64">
      </a>

      <nav class="nav" id="primary-nav" aria-label="Primary">
        <ul class="nav-list">
%(nav_items)s
          <li class="nav-dd">
            <a class="nav-link%(dd_active)s" href="eligibility.html" aria-haspopup="true">Apply</a>
            <ul class="nav-dd-menu">
              <li><a href="apply.html">Loan application<span class="dd-note">Five steps · save and resume</span></a></li>
              <li><a href="eligibility.html">Eligibility check<span class="dd-note">Two-minute preliminary result</span></a></li>
              <li><a href="calculator.html">Loan calculator<span class="dd-note">Estimate instalments in MWK</span></a></li>
              <li><a href="register.html">Create an account<span class="dd-note">New customer registration</span></a></li>
            </ul>
          </li>
          <li class="nav-mobile-only"><a class="nav-link" href="login.html">Customer login</a></li>
          <li class="nav-mobile-only"><a class="nav-link" href="dashboard.html">My dashboard</a></li>
        </ul>
      </nav>

      <div class="header-actions">
        <a class="btn btn--ghost btn--sm" href="login.html">Customer login</a>
        <a class="btn btn--gold btn--sm" href="apply.html">Apply for a Loan</a>
      </div>

      <button class="nav-toggle" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="primary-nav">
        <span></span><span></span><span></span>
      </button>
    </div>
  </header>
"""

SOCIAL = """
        <div class="social-row" aria-label="Follow us">
          <a class="social-icon" href="https://www.facebook.com/" aria-label="Facebook" rel="noopener"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.55-1.5h1.65V3.6A22 22 0 0 0 14.3 3.5c-2.4 0-4 1.45-4 4.1V9.9H7.6V13h2.7v8z"/></svg></a>
          <a class="social-icon" href="https://www.linkedin.com/" aria-label="LinkedIn" rel="noopener"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.9 8.6H3.6V21h3.3zM5.2 3a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8M21 13.7c0-3.3-1.8-4.8-4.1-4.8a3.5 3.5 0 0 0-3.2 1.8V8.6H10.4V21h3.3v-6.5c0-1.5.6-2.4 1.9-2.4s1.9.9 1.9 2.5V21H21z"/></svg></a>
          <a class="social-icon" href="https://wa.me/265999123456" aria-label="WhatsApp" rel="noopener"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2m0 1.8a8.2 8.2 0 0 1 6.9 12.6l-.4.5.6 2.1-2.2-.6-.5.3A8.2 8.2 0 1 1 12 3.8m-3.1 3.7c-.2 0-.5.1-.7.4s-1 1-1 2.3.9 2.6 1 2.8 1.7 2.8 4.3 3.8c2.1.8 2.6.7 3 .6s1.4-.6 1.6-1.1.2-1 .2-1.1-.2-.2-.4-.3l-1.7-.8c-.2-.1-.4-.1-.6.1l-.8 1c-.1.1-.3.2-.5.1a6.7 6.7 0 0 1-3.4-3c-.1-.2 0-.4.1-.5l.6-.7c.1-.2.1-.3 0-.5l-.7-1.6c-.1-.3-.3-.3-.5-.3z"/></svg></a>
          <a class="social-icon" href="mailto:%(email)s" aria-label="Email us"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg></a>
        </div>
"""

FOOTER = """  <footer class="site-footer">
    <div class="container">
      <div class="footer-top">
        <div class="footer-about">
          <a class="brand" href="index.html" aria-label="%(brand)s — home">
            <img class="brand-logo brand-logo--light" src="assets/img/logo-full-light.svg" alt="%(brand)s" width="268" height="64">
          </a>
          <p>Licensed money lender providing personal, business, salary-based and agricultural loans across Malawi. Transparent pricing in MWK, responsible lending and a customer dashboard that keeps you in control.</p>
          <p class="footer-badges"><span class="tag-chip">Licensed lender</span> <span class="tag-chip">MWK lending</span> <span class="tag-chip">Data protected</span></p>
          %(social)s
        </div>

        <div>
          <h4>Quick links</h4>
          <ul class="footer-links">
            <li><a href="index.html">Home</a></li>
            <li><a href="about.html">About us</a></li>
            <li><a href="how-it-works.html">How it works</a></li>
            <li><a href="calculator.html">Loan calculator</a></li>
            <li><a href="eligibility.html">Eligibility check</a></li>
            <li><a href="support.html">Help centre</a></li>
          </ul>
        </div>

        <div>
          <h4>Loan products</h4>
          <ul class="footer-links">
            <li><a href="loan-products.html#personal">Personal loan</a></li>
            <li><a href="loan-products.html#business">Business loan</a></li>
            <li><a href="loan-products.html#emergency">Emergency loan</a></li>
            <li><a href="loan-products.html#salary">Salary-based loan</a></li>
            <li><a href="loan-products.html#agricultural">Agricultural loan</a></li>
            <li><a href="loan-products.html#secured">Secured loan</a></li>
          </ul>
        </div>

        <div>
          <h4>Legal &amp; policies</h4>
          <ul class="footer-links">
            <li><a href="privacy.html">Privacy policy</a></li>
            <li><a href="terms.html">Terms &amp; conditions</a></li>
            <li><a href="loan-agreement-terms.html">Loan agreement terms</a></li>
            <li><a href="complaints.html">Complaints &amp; disputes</a></li>
            <li><a href="responsible-lending.html">Responsible lending</a></li>
            <li><a href="fees-disclosure.html">Fees &amp; charges</a></li>
            <li><a href="licensing.html">Licensing disclosures</a></li>
          </ul>
        </div>

        <div>
          <h4>Customer care</h4>
          <ul class="footer-contact">
            <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 4h4l2 5-2.5 1.5a12 12 0 0 0 6 6L15 14l5 2v4a16 16 0 0 1-16-16"/></svg><a href="tel:+265999123456">%(phone)s</a></li>
            <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg><a href="mailto:%(support_email)s">%(support_email)s</a></li>
            <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11"/><circle cx="12" cy="10" r="2.5"/></svg><span>%(address)s</span></li>
            <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg><span>Mon–Fri 08:00–17:00 · Sat 09:00–12:00</span></li>
          </ul>
          <a class="btn btn--gold btn--sm" href="apply.html" style="margin-top:1rem;">Apply for a Loan</a>
          <a class="btn btn--line-gold btn--sm" href="login.html" style="margin-top:.5rem;">Customer login</a>
        </div>
      </div>

      <p class="disclaimer">JAY C O B FINANCIAL SERVICES is a licensed money lender operating in Malawi. Credit is subject to affordability and credit assessment. Interest rates, fees and charges are disclosed before an agreement is signed. Borrowing costs money — consider whether a loan is right for you, and read the Responsible Lending Policy, Fee Disclosure Statement and Terms and Conditions. This website is a demonstration environment: figures, decisions and reference numbers are illustrative and no real credit is advanced.</p>

      <div class="footer-bottom">
        <p>© <span data-year>2026</span> JAY C O B FINANCIAL SERVICES. All rights reserved.</p>
        <div class="footer-legal">
          <a href="privacy.html">Privacy</a>
          <a href="terms.html">Terms</a>
          <a href="cookies.html">Cookies</a>
          <a href="complaints.html">Complaints</a>
          <a href="customer-rights.html">Customer rights</a>
          <a href="aml.html">AML</a>
          <a href="licensing.html">Regulatory</a>
        </div>
      </div>
    </div>
  </footer>
"""

DASHBOARD_HEADER = ""

HEAD = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>%(title)s</title>
  <meta name="description" content="%(desc)s">
  <meta name="theme-color" content="#06262a">
  <meta property="og:title" content="%(title)s">
  <meta property="og:description" content="%(desc)s">
  <meta property="og:type" content="website">
  <meta property="og:image" content="assets/img/logo-full.svg">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="canonical" href="%(slug)s.html">
  <link rel="icon" href="assets/img/favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..700;1,9..144,400..600&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="assets/css/styles.css">
%(extra_css)s</head>
<body%(body_attrs)s>
%(header)s
%(body)s
%(footer)s
%(scripts)s
</body>
</html>
"""


def nav_html(active: str) -> str:
    items = []
    for href, label in NAV:
        cls = "nav-link is-active" if href == active else "nav-link"
        items.append('          <li><a class="%s" href="%s">%s</a></li>' % (cls, href, label))
    return "\n".join(items)


def header_html(active: str) -> str:
    dd_active = " is-active" if active in ("apply.html", "eligibility.html") else ""
    return HEADER % {
        "brand": BRAND,
        "phone": PHONE,
        "email": EMAIL,
        "nav_items": nav_html(active),
        "dd_active": dd_active,
    }


def footer_html() -> str:
    return FOOTER % {
        "brand": BRAND,
        "phone": PHONE,
        "support_email": SUPPORT_EMAIL,
        "address": ADDRESS,
        "email": EMAIL,
        "social": SOCIAL % {"email": EMAIL},
    }


def scripts_html(extra) -> str:
    out = []
    for src in list(BASE_SCRIPTS) + list(extra):
        out.append('  <script src="%s" defer></script>' % src)
    return "\n".join(out)


# --------------------------------------------------------------------------
# Page registry
# --------------------------------------------------------------------------
PAGES = {
    "index": dict(title="JAY C O B FINANCIAL SERVICES — Loans in Malawi",
                  desc="Licensed money lender offering personal, business, emergency, salary-based and agricultural loans in Malawi. Apply online in MWK, check your eligibility and repay from your customer dashboard.",
                  extra=["assets/js/quickcalc.js"]),
    "about": dict(title="About us — JAY C O B FINANCIAL SERVICES",
                  desc="Our story, mission, values, leadership, licensing and community work. A licensed Malawian lender built around transparent, responsible credit.",
                  extra=[]),
    "loan-products": dict(title="Loan products — JAY C O B FINANCIAL SERVICES",
                          desc="Eleven loan products with MWK limits, 1–84 month terms, interest rates, fees, eligibility and required documents. Compare and apply online.",
                          extra=[]),
    "calculator": dict(title="Loan calculator — JAY C O B FINANCIAL SERVICES",
                       desc="Estimate your monthly repayment, total interest and fees in MWK. Choose flat or reducing interest, monthly or fortnightly repayment and see a full amortisation preview.",
                       extra=["assets/js/calculator.js"]),
    "apply": dict(title="Apply for a loan — JAY C O B FINANCIAL SERVICES",
                  desc="Apply for a loan online in five steps: product, personal details, business and bank details, documents, review. Save a draft and get a reference number.",
                  extra=["assets/js/apply.js"], body_attrs=' data-page="apply"'),
    "eligibility": dict(title="Eligibility check — JAY C O B FINANCIAL SERVICES",
                        desc="Check your loan eligibility in two minutes. Age, residency, employment, income and documents, with a preliminary result and clear next steps.",
                        extra=["assets/js/eligibility.js"]),
    "how-it-works": dict(title="How it works — JAY C O B FINANCIAL SERVICES",
                         desc="Ten clear steps from creating an account to repaying and monitoring your loan, with timelines, requirements and what happens at each stage.",
                         extra=[]),
    "interest-rates-fees": dict(title="Interest rates & fees — JAY C O B FINANCIAL SERVICES",
                                desc="Interest rates, APR, flat versus reducing balance, processing, admin, late and early repayment charges, worked examples and the total cost of borrowing.",
                                extra=["assets/js/rates.js"]),
    "support": dict(title="Support & help centre — JAY C O B FINANCIAL SERVICES",
                    desc="Contact support, browse FAQs, track a ticket, report a missing payment, raise a complaint or use the emergency contact line.",
                    extra=["assets/js/support.js"]),
    "register": dict(title="Create an account — JAY C O B FINANCIAL SERVICES",
                     desc="Register for a customer account to apply for loans, upload documents and manage repayments.",
                     extra=["assets/js/auth.js"], body_attrs=' data-auth-page="register" data-page="auth"'),
    "login": dict(title="Customer login — JAY C O B FINANCIAL SERVICES",
                  desc="Sign in with your email or phone number to manage loans, repayments and documents.",
                  extra=["assets/js/auth.js"], body_attrs=' data-auth-page="login" data-page="auth"'),
    "verify": dict(title="Verify your account — JAY C O B FINANCIAL SERVICES",
                   desc="Enter the six-digit one-time code sent to your email or phone to verify your account.",
                   extra=["assets/js/auth.js"], body_attrs=' data-auth-page="verify" data-page="auth"'),
    "forgot-password": dict(title="Forgot password — JAY C O B FINANCIAL SERVICES",
                            desc="Recover access to your customer account by email or SMS.",
                            extra=["assets/js/auth.js"], body_attrs=' data-auth-page="forgot" data-page="auth"'),
    "reset-password": dict(title="Reset password — JAY C O B FINANCIAL SERVICES",
                           desc="Choose a new password for your customer account.",
                           extra=["assets/js/auth.js"], body_attrs=' data-auth-page="reset" data-page="auth"'),
}


def render_public(slug: str, meta: dict) -> str:
    body_path = PAGES_DIR / ("%s.html" % slug)
    body = body_path.read_text(encoding="utf-8")
    body = body.replace("{{PHONE}}", PHONE).replace("{{EMAIL}}", EMAIL)
    body = body.replace("{{SUPPORT_EMAIL}}", SUPPORT_EMAIL).replace("{{ADDRESS}}", ADDRESS)
    return HEAD % {
        "title": meta["title"],
        "desc": esc(meta["desc"]),
        "slug": slug,
        "extra_css": "".join('  <link rel="stylesheet" href="%s">\n' % c for c in meta.get("css", [])),
        "body_attrs": meta.get("body_attrs", ""),
        "header": header_html(slug + ".html"),
        "body": body,
        "footer": footer_html(),
        "scripts": scripts_html(meta.get("extra", [])),
    }


# --------------------------------------------------------------------------
# Legal pages
# --------------------------------------------------------------------------
def legal_body(doc) -> str:
    sections = []
    for heading, paras in doc["sections"]:
        sections.append("          <section>\n            <h2>%s</h2>\n%s\n          </section>" % (
            heading, "\n".join("            <p>%s</p>" % p for p in paras)))
    nav_links = "\n".join(
        '            <li><a href="%s.html"%s>%s</a></li>' % (
            d["slug"], ' class="is-active"' if d["slug"] == doc["slug"] else "", d["nav"])
        for d in LEGAL_DOCS)
    return """    <main id="main">
    <section class="page-hero">
      <div class="container page-hero-inner">
        <nav class="breadcrumb" aria-label="Breadcrumb"><a href="index.html">Home</a><span class="sep">/</span><span>Legal</span><span class="sep">/</span><span>%(title)s</span></nav>
        <span class="eyebrow">Legal &amp; disclosures</span>
        <h1>%(title)s</h1>
        <p class="lead">%(summary)s</p>
      </div>
    </section>

    <section class="section">
      <div class="container legal-layout">
        <aside class="legal-nav">
          <p class="brand-chip"><img src="assets/img/logo-mark.svg" alt="" width="22" height="22"> Policies</p>
          <ul>
%(nav_links)s
          </ul>
        </aside>
        <article class="legal-body">
          <p class="legal-meta">Version %(version)s · Last updated %(updated)s · Applies to all customers in Malawi</p>
%(sections)s
          <div class="notice notice--info">%(icon)s<div><strong>Questions about this document?</strong>Email <a href="mailto:%(support_email)s">%(support_email)s</a> or call <a href="tel:+265999123456">%(phone)s</a>. You can also raise a formal complaint through our <a href="complaints.html">complaints process</a>.</div></div>
        </article>
      </div>
    </section>
    </main>
""" % {
        "title": doc["title"],
        "summary": doc["summary"],
        "nav_links": nav_links,
        "version": doc["version"],
        "updated": doc["updated"],
        "sections": "\n".join(sections),
        "icon": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
        "support_email": SUPPORT_EMAIL,
        "phone": PHONE,
    }


def build_legal() -> int:
    count = 0
    for doc in LEGAL_DOCS:
        slug = doc["slug"]
        page = HEAD % {
            "title": "%s — JAY C O B FINANCIAL SERVICES" % doc["title"],
            "desc": esc(doc["summary"]),
            "slug": slug,
            "extra_css": "",
            "body_attrs": ' data-page="legal"',
            "header": header_html(slug + ".html"),
            "body": legal_body(doc),
            "footer": footer_html(),
            "scripts": scripts_html([]),
        }
        (ROOT / ("%s.html" % slug)).write_text(page, encoding="utf-8")
        count += 1
    return count


# --------------------------------------------------------------------------
# Dashboard shell
# --------------------------------------------------------------------------
def build_dashboard() -> None:
    body = (PAGES_DIR / "dashboard.html").read_text(encoding="utf-8")
    body = body.replace("{{PHONE}}", PHONE).replace("{{SUPPORT_EMAIL}}", SUPPORT_EMAIL)
    page = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>My dashboard — JAY C O B FINANCIAL SERVICES</title>
  <meta name="description" content="Manage loans, repayments, documents and account security from your JAY C O B FINANCIAL SERVICES customer dashboard.">
  <meta name="robots" content="noindex, nofollow">
  <meta name="theme-color" content="#06262a">
  <link rel="icon" href="assets/img/favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..700;1,9..144,400..600&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="assets/css/styles.css">
</head>
<body class="app-body" data-page="dashboard">
%(body)s
  <script src="env.js" defer></script>
  <script src="assets/js/config.js" defer></script>
  <script src="assets/js/demo-mode.js" defer></script>
  <script src="assets/js/cloud.js" defer></script>
  <script src="assets/js/finance.js" defer></script>
  <script src="assets/js/demo-customer.js" defer></script>
  <script src="assets/js/demo-portal.js" defer></script>
  <script src="assets/js/app-data.js" defer></script>
  <script src="assets/js/ui.js" defer></script>
  <script src="assets/js/apply.js" defer></script>
  <script src="assets/js/dashboard.js" defer></script>
</body>
</html>
""" % {"body": body}
    (ROOT / "dashboard.html").write_text(page, encoding="utf-8")


# --------------------------------------------------------------------------
# Legacy aliases (old inbound links keep working)
# --------------------------------------------------------------------------
ALIASES = {
    "products": ("loan-products.html", "Loan products", "Our product range has moved to a dedicated loan products page with limits, terms, rates and required documents."),
    "portal": ("login.html?next=dashboard.html", "Customer portal", "The customer portal is now the secure customer dashboard. Sign in to continue."),
}


def build_aliases() -> int:
    for slug, (target, label, blurb) in ALIASES.items():
        body = """    <main id="main">
    <section class="section">
      <div class="container" style="max-width:40rem;">
        <div class="card" style="text-align:center;padding:clamp(1.6rem,4vw,2.6rem);">
          <p class="brand-chip" style="justify-content:center;"><img src="assets/img/logo-mark.svg" alt="" width="22" height="22"> %(brand)s</p>
          <h1 style="font-size:clamp(1.5rem,3vw,2rem);">%(label)s</h1>
          <p style="margin-top:.7rem;">%(blurb)s</p>
          <p style="margin-top:1.2rem;"><a class="btn btn--gold" href="%(target)s">Continue to %(label_lower)s</a></p>
          <p class="text-tiny text-muted" style="margin-top:.8rem;">If you are not redirected automatically, use the button above.</p>
        </div>
      </div>
    </section>
    </main>
    <script>window.location.replace("%(target)s");</script>
""" % {"brand": BRAND, "label": label, "label_lower": label.lower(), "blurb": blurb, "target": target}

        page = HEAD % {
            "title": "%s — JAY C O B FINANCIAL SERVICES" % label,
            "desc": esc(blurb),
            "slug": slug,
            "extra_css": '  <meta http-equiv="refresh" content="0; url=%s">\n' % target,
            "body_attrs": "",
            "header": header_html(""),
            "body": body,
            "footer": footer_html(),
            "scripts": scripts_html([]),
        }
        (ROOT / ("%s.html" % slug)).write_text(page, encoding="utf-8")
    return len(ALIASES)


# --------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------
def main() -> int:
    built = 0
    for slug, meta in PAGES.items():
        out = render_public(slug, meta)
        (ROOT / ("%s.html" % slug)).write_text(out, encoding="utf-8")
        built += 1
    built += build_legal()
    built += build_aliases()
    build_dashboard()
    built += 1
    print("Built %d pages." % built)

    if "--check" in sys.argv:
        return check()
    return 0


def check() -> int:
    missing = []
    for f in sorted(ROOT.glob("*.html")):
        text = f.read_text(encoding="utf-8")
        for href in re.findall(r'href="([^"#?:]+\.html)[^"]*"', text):
            if href.startswith(("http", "//")):
                continue
            if not (ROOT / href).exists():
                missing.append((f.name, href))
        for src in re.findall(r'(?:src|href)="(assets/[^"?]+)"', text):
            if not (ROOT / src).exists():
                missing.append((f.name, src))
    if missing:
        for page, target in missing:
            print("MISSING %-28s -> %s" % (page, target))
        return 1
    print("All internal links resolve.")
    return 0


if __name__ == "__main__":
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from legal_docs import LEGAL_DOCS  # noqa: E402

    sys.exit(main())
