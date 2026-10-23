#!/usr/bin/env python3
"""Build a single, self-contained HTML file containing the whole site.

Every page becomes a hash-routed view inside one document; CSS, JavaScript and
images are inlined so the file works offline with no assets folder.

    python3 tools/build_single.py            # writes single/index.html
    python3 tools/build_single.py --check    # build + structural checks, non-zero exit on failure
"""
import base64
import mimetypes
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "single" / "index.html"
IMG_OPT = ROOT / ".cache" / "single-img"

# Views in navigation order. Aliases (portal/products) are redirects and are skipped.
SKIP = {"portal", "products", "404", "admin"}

NAV = [
    ("index", "Home"),
    ("about", "About"),
    ("loan-products", "Loan products"),
    ("calculator", "Calculator"),
    ("how-it-works", "How it works"),
    ("eligibility", "Eligibility"),
    ("interest-rates-fees", "Rates & fees"),
    ("support", "Support"),
]

# Extra links kept in the footer only.
FOOTER_EXTRA = ["apply", "login", "register", "privacy", "terms", "complaints", "licensing"]

JS_ORDER = [
    "config.js", "cloud.js", "site-store.js", "finance.js", "app-data.js", "ui.js", "live.js", "main.js",
    "auth.js", "apply.js", "calculator.js", "quickcalc.js", "eligibility.js",
    "rates.js", "support.js", "dashboard.js", "site-content.js", "product-quotes.js",
]

AUTH_PAGES = {"register": "register", "login": "login", "verify": "verify",
              "forgot-password": "forgot", "reset-password": "reset"}


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def slug_list():
    return sorted(p.stem for p in ROOT.glob("*.html")
                  if p.stem not in SKIP and p.name != OUT.name)


def data_uri(path: Path) -> str:
    mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    if path.suffix.lower() == ".svg":
        mime = "image/svg+xml"
    return "data:%s;base64,%s" % (mime, base64.b64encode(path.read_bytes()).decode("ascii"))


def optimize_jpeg(src: Path) -> Path:
    """Resize + recompress photos once, so the bundle stays small."""
    if not shutil.which("convert"):
        return src
    dest = IMG_OPT / src.name
    if dest.exists() and dest.stat().st_mtime >= src.stat().st_mtime:
        return dest
    IMG_OPT.mkdir(parents=True, exist_ok=True)
    try:
        subprocess.run(["convert", str(src), "-resize", "900x900>", "-strip",
                        "-quality", "72", str(dest)], check=True, capture_output=True)
        return dest if dest.exists() else src
    except Exception:
        return src


def image_map():
    """Every image inlined as a data URI, photos downscaled first."""
    out = {}
    for f in sorted((ROOT / "assets" / "img").iterdir()):
        if not f.is_file():
            continue
        out[f.name] = data_uri(optimize_jpeg(f) if f.suffix.lower() in (".jpg", ".jpeg") else f)
    return out


def extract(page: str):
    src = read(ROOT / (page + ".html"))
    title = re.search(r"<title>(.*?)</title>", src, re.S)
    desc = re.search(r'<meta name="description" content="(.*?)"', src, re.S)
    body = re.search(r"<body([^>]*)>(.*?)</body>", src, re.S)
    attrs, inner = body.group(1), body.group(2)
    inner = re.sub(r'<a class="skip-link".*?</a>', "", inner, count=1, flags=re.S)
    inner = re.sub(r'<header class="site-header".*?</header>', "", inner, count=1, flags=re.S)
    inner = re.sub(r'<footer class="site-footer".*?</footer>', "", inner, count=1, flags=re.S)
    if '<main id="main">' in inner:
        inner = inner.replace('<main id="main">', "", 1)
        cut = inner.rfind("</main>")
        if cut != -1:
            inner = inner[:cut] + inner[cut + len("</main>"):]
    inner = re.sub(r"<script\b.*?</script>", "", inner, flags=re.S)
    page_attr = (re.search(r'data-page="([^"]+)"', attrs) or [None, page])[1]
    return {
        "slug": page,
        "title": (title.group(1).strip() if title else page),
        "desc": (desc.group(1).strip() if desc else ""),
        "page": page_attr,
        "inner": inner.strip(),
    }


def rewrite_links(html: str, slugs) -> str:
    def rep(m):
        attr, href = m.group(1), m.group(2)
        if href.startswith(("http://", "https://", "mailto:", "tel:", "data:", "javascript:", "#")):
            return m.group(0)
        path, _, frag = href.partition("#")
        clean = path.split("?")[0]
        if not clean.endswith(".html"):
            return m.group(0)
        slug = clean[:-5]
        if slug == "index":
            base = "#/"
        elif slug in slugs:
            base = "#/" + slug
        else:
            return m.group(0)
        return '%s="%s%s"' % (attr, base, ("#" + frag) if frag else "")

    return re.sub(r'\b(href|src)="([^"]*\.html(?:[#?][^"]*)?)"', rep, html)


def inline_images(text: str, images) -> str:
    def rep(m):
        name = m.group(2)
        uri = images.get(name)
        return m.group(0) if uri is None else '%s="%s"' % (m.group(1), uri)

    return re.sub(r'\b(src|href)="assets/img/([^"]+)"', rep, text)


def patch_js(name: str, code: str, images=None) -> str:
    if name == "auth.js":
        old = ('    if (p === "register") initRegister();\n'
               '    if (p === "login") initLogin();\n'
               '    if (p === "verify") initVerify();\n'
               '    if (p === "forgot") initForgot();\n'
               '    if (p === "reset") initReset();')
        new = ('    /* single-file build: every auth view is present at once, so bind them all */\n'
               '    initRegister(); initLogin(); initVerify(); initForgot(); initReset();')
        assert old in code, "auth dispatcher not found"
        code = code.replace(old, new, 1)
    if name == "auth.js":
        code = code.replace('bindPwMeter("reset-password", "pw-meter", "pw-hint")',
                            'bindPwMeter("reset-password", "reset-pw-meter", "reset-pw-hint")')
    if name == "dashboard.js":
        # The bundle has no auth server: browsing it locally opens a preview
        # session so every dashboard view can be inspected in one file.
        old = 'var session = UI.getSession();'
        add = ('var session = UI.getSession();\n'
               '  if (!session && window.JCOB_SINGLE) {\n'
               '    session = UI.setSession({ authenticated: true, name: "Preview visitor",\n'
               '      email: "", identifier: "", single: true }, true);\n'
               '  }')
        assert old in code, "dashboard session guard not found"
        code = code.replace(old, add, 1)
    if images:
        code = re.sub(r'assets/img/([A-Za-z0-9._-]+)',
                      lambda m: images.get(m.group(1), m.group(0)), code)
    # any literal "page.html" assignment (location.href = "verify.html") becomes an in-file route
    code = re.sub(r'(["\'])([a-z0-9\-]+)\.html(\?[^"\']*)?\1',
                  lambda m: '"#/%s"' % ("" if m.group(2) == "index" else m.group(2)), code)
    return code


ROUTER = r"""
/* =====================================================================
   Single-file router
   ===================================================================== */
(function () {
  "use strict";
  var views = Array.prototype.slice.call(document.querySelectorAll(".sf-view"));
  var bySlug = {};
  views.forEach(function (v) { bySlug[v.getAttribute("data-view")] = v; });
  var header = document.querySelector(".site-header");
  var footer = document.querySelector(".site-footer");
  var lastSlug = null;

  function slugFor(hash) {
    var raw = (hash || "").replace(/^#/, "");
    if (!raw || raw === "/" || raw.charAt(0) === "?") return { slug: "index", anchor: "" };
    if (raw.charAt(0) !== "/") return { slug: "dashboard", anchor: "" }; // dashboard inner route
    var rest = raw.slice(1);
    var parts = rest.split("#");
    var slug = parts[0] || "index";
    if (slug.charAt(0) === "?") slug = "index";
    if (!bySlug[slug]) slug = "index";
    return { slug: slug, anchor: parts[1] || "" };
  }

  function setChrome(slug, view) {
    var dash = slug === "dashboard";
    document.body.classList.toggle("sf-dashboard", dash);
    if (header) header.hidden = dash;
    if (footer) footer.hidden = dash;
    var page = view.getAttribute("data-page") || "";
    if (page) document.body.setAttribute("data-page", page);
    else document.body.removeAttribute("data-page");
    var cls = view.getAttribute("data-body-class") || "";
    ["app-body", "sf-auth", "sf-legal"].forEach(function (c) {
      document.body.classList.toggle(c, cls.split(/\s+/).indexOf(c) >= 0);
    });
    var auth = view.getAttribute("data-auth-page");
    if (auth) document.body.setAttribute("data-auth-page", auth);
    else document.body.removeAttribute("data-auth-page");

    document.querySelectorAll("#primary-nav a.nav-link, .nav-mobile a").forEach(function (a) {
      var target = (a.getAttribute("href") || "").replace(/^#\/?/, "").split("#")[0];
      var match = target === slug || (slug === "index" && target === "");
      a.classList.toggle("is-active", match);
      if (match) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
  }

  function show(slug, anchor, opts) {
    opts = opts || {};
    if (slug === "dashboard" && window.JCOB_UI && !window.JCOB_UI.getSession()) {
      if (window.JCOB_UI) window.JCOB_UI.toast({ title: "Sign in to continue", message: "Your dashboard is available after signing in.", type: "error" });
      slug = "login";
      anchor = "";
      if (location.hash !== "#/login") { history.replaceState(null, "", "#/login"); }
    }
    var view = bySlug[slug] || bySlug.index;
    views.forEach(function (v) { v.hidden = v !== view; });
    document.body.classList.add("sf-ready");
    setChrome(slug, view);
    document.title = view.getAttribute("data-title") || document.title;
    var md = document.querySelector('meta[name="description"]');
    if (md && view.getAttribute("data-desc")) md.setAttribute("content", view.getAttribute("data-desc"));

    if (slug === "dashboard" && window.JCOB_DASH && lastSlug !== "dashboard") {
      try { window.JCOB_DASH.render(); } catch (err) { console.error(err); }
    }
    lastSlug = slug;

    if (!opts.keepScroll) {
      if (anchor) {
        var el = view.querySelector("#" + anchor.replace(/([^\w-])/g, "\\$1"));
        if (el) { el.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
      }
      window.scrollTo(0, 0);
    }
    if (!opts.noFocus) {
      var h1 = view.querySelector("h1");
      if (h1) { h1.setAttribute("tabindex", "-1"); h1.focus({ preventScroll: true }); }
    }
  }

  function route(opts) {
    var parsed = slugFor(location.hash);
    show(parsed.slug, parsed.anchor, opts);
  }

  window.addEventListener("hashchange", function () {
    var raw = location.hash.replace(/^#/, "");
    if (raw && raw.charAt(0) !== "/" && lastSlug === "dashboard") { return; } // dashboard's own router
    route();
  });

  /* Keep dynamically rendered .html links inside the bundle */
  document.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest ? e.target.closest("a[href]") : null;
    if (!a || a.target === "_blank") return;
    var href = a.getAttribute("href") || "";
    var m = href.match(/^([a-z0-9\-]+)\.html(#[^?]*)?(\?[^#]*)?$/i);
    if (!m) return;
    e.preventDefault();
    location.hash = "#/" + (m[1] === "index" ? "" : m[1]) + (m[2] || "");
  }, true);

  window.JCOB_ROUTER = { show: show, route: route };
  route({ noFocus: true });
})();
"""



STORAGE_SHIM = """
/* ==== single-file: storage fallback for file:// and sandboxed contexts ==== */
(function () {
  ["localStorage", "sessionStorage"].forEach(function (name) {
    var store;
    try {
      var probe = window[name];
      probe.setItem("__sf_probe", "1");
      probe.removeItem("__sf_probe");
      return;
    } catch (err) {}
    var data = {};
    store = {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
      setItem: function (k, v) { data[k] = String(v); },
      removeItem: function (k) { delete data[k]; },
      clear: function () { data = {}; },
      key: function (i) { return Object.keys(data)[i] || null; }
    };
    Object.defineProperty(store, "length", { get: function () { return Object.keys(data).length; } });
    try { Object.defineProperty(window, name, { configurable: true, get: function () { return store; } }); }
    catch (err2) { try { window[name] = store; } catch (err3) {} }
  });
})();
"""


def build():
    OUT.parent.mkdir(exist_ok=True)
    images = image_map()
    css = read(ROOT / "assets" / "css" / "styles.css")
    css = re.sub(r'url\("\.\./img/logo-mark\.svg"\)', 'url("%s")' % images["logo-mark.svg"], css)
    css += """
/* ---- single-file bundle ---- */
.sf-view[hidden] { display: none !important; }
body.sf-dashboard .site-header, body.sf-dashboard .site-footer { display: none; }
body.sf-ready .sf-view { animation: sf-fade .28s var(--ease); }
@keyframes sf-fade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { body.sf-ready .sf-view { animation: none; } }
.sf-note { background: var(--navy-900); color: #cfe3d6; font-size: .78rem; padding: .45rem 1rem; text-align: center; }
.sf-note strong { color: var(--gold-200); }
"""

    slugs = set(slug_list())
    index_src = read(ROOT / "index.html")
    header = re.search(r'(<header class="site-header".*?</header>)', index_src, re.S).group(1)
    # trim the header's own .html links, then inline its images
    header = rewrite_links(header, slugs)
    header = inline_images(header, images)

    footer = re.search(r'(<footer class="site-footer".*?</footer>)', index_src, re.S).group(1)
    footer = rewrite_links(footer, slugs)
    footer = inline_images(footer, images)

    views = []
    meta = []
    order = [n[0] for n in NAV] + [s for s in slug_list() if s not in [n[0] for n in NAV]]

    for slug in order:
        page = extract(slug)
        inner = page["inner"]
        if slug == "services":
            inner = inner.replace('id="personal"', 'id="personal-services"')
            inner = inner.replace('href="services.html#personal"', 'href="#/services#personal-services"')
            inner = inner.replace('href="#personal"', 'href="#personal-services"')
        if slug == "reset-password":
            inner = inner.replace('id="pw-meter"', 'id="reset-pw-meter"').replace('id="pw-hint"', 'id="reset-pw-hint"')
        if slug == "support":
            inner = inner.replace('id="faq"', 'id="faq-support"')
            inner = inner.replace('href="#faq"', 'href="#faq-support"')
        inner = rewrite_links(inner, slugs)
        inner = inline_images(inner, images)
        attrs = page
        views.append(
            '<section class="sf-view" data-view="%s" data-title="%s" data-desc="%s" data-page="%s" hidden>\n%s\n</section>'
            % (slug, attrs["title"].replace('"', "&quot;"), attrs["desc"].replace('"', "&quot;"),
               attrs["page"], inner)
        )
        meta.append((slug, attrs["title"]))

    js_parts = []
    for name in JS_ORDER:
        code = read(ROOT / "assets" / "js" / name)
        code = patch_js(name, code, images)
        js_parts.append("/* ==== %s ==== */\n%s" % (name, code))

    shim_js = """
/* ==== single-file: resolve ids inside the visible view first (apply panel, password meters) ==== */
(function () {
  var native = Document.prototype.getElementById;
  Document.prototype.getElementById = function (id) {
    var el = native.call(this, id);
    if (!el) return el;
    var owner = el.closest ? el.closest(".sf-view") : null;
    if (owner && !owner.hidden) return el;
    var views = document.querySelectorAll(".sf-view:not([hidden])");
    for (var i = 0; i < views.length; i++) {
      var all = views[i].getElementsByTagName("*");
      for (var j = 0; j < all.length; j++) if (all[j].id === id) return all[j];
    }
    return el;
  };
})();
"""

    bootstrap = """
/* ==== single-file bootstrap: preview session so the dashboard can be walked ==== */
window.JCOB_SINGLE = true;
try {
  if (window.JCOB_UI && !window.JCOB_UI.getSession()) {
    window.JCOB_UI.setSession({
      authenticated: true,
      name: "Preview visitor",
      email: "",
      identifier: "",
      at: new Date().toISOString()
    }, true);
  }
} catch (err) {}
"""
    js = STORAGE_SHIM + "\n\n" + "\n\n".join(js_parts)
    js = js.replace("/* ==== ui.js ==== */", "/* ==== ui.js ==== */", 1)
    marker = "/* ==== dashboard.js ==== */"
    js = js.replace(marker, bootstrap + "\n" + shim_js + "\n" + marker, 1) + ROUTER

    title = "JAY C O B FINANCIAL SERVICES — complete site"
    desc = ("Single-file edition of the JAY C O B FINANCIAL SERVICES website: loan products, "
            "calculator, eligibility check, application, customer dashboard, support and legal policies.")

    html = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>__TITLE__</title>
<meta name="description" content="__DESC__">
<meta name="theme-color" content="#03170f">
<meta name="robots" content="noindex">
<link rel="icon" href="__FAVICON__" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..700;1,9..144,400..600&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
__CSS__
</style>
</head>
<body data-page="index" data-single="true">
<a class="skip-link" href="#main">Skip to content</a>
<p class="sf-note"><strong>Single-file edition</strong> &mdash; every page, the calculator and the full customer dashboard in one HTML document. Reviewed with a preview session; no accounts or records are included.</p>
__HEADER__
<main id="main">
__VIEWS__
</main>
__FOOTER__
<script>
__JS__
</script>
</body>
</html>
"""
    for token, value in (("__TITLE__", title), ("__DESC__", desc), ("__FAVICON__", images["favicon.svg"]),
                         ("__CSS__", css), ("__HEADER__", header), ("__VIEWS__", "\n".join(views)),
                         ("__FOOTER__", footer), ("__JS__", js)):
        html = html.replace(token, value)
    OUT.write_text(html, encoding="utf-8")
    return html, meta


def check(html: str):
    problems = []
    if "<script src=" in html:
        problems.append("external script reference remains")
    if re.search(r'<link rel="stylesheet" href="(?!https)', html):
        problems.append("external stylesheet remains")
    if re.search(r'src="assets/', html):
        problems.append("external image reference remains")
    markup = re.sub(r"<script\b.*?</script>", "", html, flags=re.S)
    ids = re.findall(r'\sid="([^"]+)"', markup)
    dupes = sorted({i for i in ids if ids.count(i) > 1})
    if dupes:
        problems.append("duplicate ids: %s" % ", ".join(dupes[:10]))
    if not re.search(r'<section class="sf-view" data-view="dashboard"', html):
        problems.append("dashboard view missing")
    if html.count('class="sf-view"') < 30:
        problems.append("too few views")
    for token in ("JCOB_FINANCE", "JCOB_DATA", "JCOB_UI", "JCOB_APPLY", "JCOB_DASH", "JCOB_ROUTER"):
        if token not in html:
            problems.append("missing module %s" % token)
    return problems


if __name__ == "__main__":
    html, meta = build()
    size = OUT.stat().st_size
    print("wrote %s (%.1f MB, %d views)" % (OUT.name, size / 1048576, len(meta)))
    problems = check(html)
    for p in problems:
        print("  !", p)
    if "--check" in sys.argv and problems:
        sys.exit(1)
