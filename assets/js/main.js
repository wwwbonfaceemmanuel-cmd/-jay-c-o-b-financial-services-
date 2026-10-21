/* =====================================================================
   Jay C.O.B Financial Services — shared site behaviour
   ===================================================================== */
(function () {
  "use strict";

  var header = document.querySelector(".site-header");
  var nav = document.getElementById("primary-nav");
  var navToggle = document.querySelector(".nav-toggle");

  /* ---------- Sticky header state ---------- */
  function onScroll() {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 8);
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- Mobile navigation ---------- */
  function closeNav() {
    if (!nav || !navToggle) return;
    nav.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
    document.body.style.removeProperty("overflow");
  }

  if (navToggle && nav) {
    navToggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(open));
      if (open) {
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.removeProperty("overflow");
      }
    });

    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) closeNav();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeNav();
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 960) closeNav();
    });
  }

  /* ---------- Scroll reveal ---------- */
  var reveals = document.querySelectorAll(".reveal");
  if (reveals.length) {
    if (!("IntersectionObserver" in window)) {
      reveals.forEach(function (el) { el.classList.add("is-in"); });
    } else {
      var revealObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-in");
              revealObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
      );
      reveals.forEach(function (el) { revealObserver.observe(el); });
    }
  }

  /* ---------- Animated counters ---------- */
  var counters = document.querySelectorAll("[data-count]");
  function animateCounter(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var decimals = parseInt(el.getAttribute("data-decimals") || "0", 10);
    var duration = 1400;
    var start = null;

    function frame(ts) {
      if (start === null) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      var value = target * eased;
      el.textContent = value.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      });
      if (progress < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  if (counters.length) {
    if (!("IntersectionObserver" in window)) {
      counters.forEach(function (el) {
        el.textContent = parseFloat(el.getAttribute("data-count")).toLocaleString("en-US");
      });
    } else {
      var counterObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              animateCounter(entry.target);
              counterObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.4 }
      );
      counters.forEach(function (el) { counterObserver.observe(el); });
    }
  }

  /* ---------- Current year ---------- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });

  /* ---------- Generic form validation ---------- */
  function setError(field, message) {
    if (!field) return;
    field.classList.add("has-error");
    var msg = field.querySelector(".error-msg");
    if (msg) msg.textContent = message;
  }

  function clearError(field) {
    if (field) field.classList.remove("has-error");
  }

  function validateForm(form) {
    var valid = true;
    form.querySelectorAll(".field").forEach(clearError);

    form.querySelectorAll("[required]").forEach(function (input) {
      var field = input.closest(".field") || input.closest(".check-row");
      var value = (input.value || "").trim();

      if (input.type === "checkbox") {
        if (!input.checked) {
          valid = false;
          if (field) {
            field.classList.add("has-error");
            var m = field.querySelector(".error-msg");
            if (m) m.textContent = "Please confirm to continue.";
          }
        }
        return;
      }

      if (!value) {
        valid = false;
        setError(field, "This field is required.");
        return;
      }

      if (input.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
        valid = false;
        setError(field, "Please enter a valid email address.");
      }

      if (input.type === "tel" && value.replace(/[^\d]/g, "").length < 7) {
        valid = false;
        setError(field, "Please enter a valid phone number.");
      }
    });

    return valid;
  }

  document.querySelectorAll("form[data-validate]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var status = form.querySelector(".form-status");

      if (!validateForm(form)) {
        if (status) {
          status.className = "form-status is-visible form-status--error";
          status.textContent = "Please check the highlighted fields and try again.";
        }
        var firstError = form.querySelector(".has-error input, .has-error select, .has-error textarea");
        if (firstError) firstError.focus();
        return;
      }

      var submitBtn = form.querySelector("[type='submit']");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.dataset.label = submitBtn.textContent;
        submitBtn.textContent = "Sending…";
      }

      // No backend is wired up: demonstrate the success state locally.
      setTimeout(function () {
        if (status) {
          status.className = "form-status is-visible";
          status.textContent =
            form.getAttribute("data-success") ||
            "Thank you — your message has been recorded. A consultant will respond within one business day.";
        }
        form.reset();
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = submitBtn.dataset.label || "Send";
        }
      }, 700);
    });
  });

  /* ---------- Newsletter ---------- */
  document.querySelectorAll("form[data-newsletter]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var input = form.querySelector("input[type='email']");
      var note = form.parentElement.querySelector(".newsletter-note");
      if (!input) return;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.value.trim())) {
        if (note) {
          note.textContent = "Please enter a valid email address.";
          note.style.color = "#e6a3a3";
        }
        input.focus();
        return;
      }
      if (note) {
        note.textContent = "You're on the list. Look out for the next briefing.";
        note.style.color = "#ecd7a6";
      }
      form.reset();
    });
  });

  /* ---------- Accordion single-open (optional) ---------- */
  document.querySelectorAll("[data-accordion] details").forEach(function (detail) {
    detail.addEventListener("toggle", function () {
      if (!detail.open) return;
      var group = detail.closest("[data-accordion]");
      group.querySelectorAll("details").forEach(function (other) {
        if (other !== detail) other.open = false;
      });
    });
  });

  /* ---------- Copy-to-clipboard (portal helpers) ---------- */
  document.querySelectorAll("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var text = btn.getAttribute("data-copy");
      if (!text) return;
      var done = function () {
        var original = btn.textContent;
        btn.textContent = "Copied";
        setTimeout(function () { btn.textContent = original; }, 1500);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(function () {});
      }
    });
  });
})();
