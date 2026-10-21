/* =====================================================================
   Contact form + ticket tracking for the public help centre
   ===================================================================== */
(function () {
  "use strict";

  var UI = window.JCOB_UI;
  var DATA = window.JCOB_DATA;
  var form = document.getElementById("support-form");
  var status = document.getElementById("support-status");
  var lookupForm = document.getElementById("ticket-form");

  function $(id) { return document.getElementById(id); }

  function fieldError(input, message) {
    var field = input.closest(".field");
    if (!field) return;
    field.classList.add("has-error");
    var msg = field.querySelector(".error-msg");
    if (msg) msg.textContent = message;
  }

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      form.querySelectorAll(".field").forEach(function (f) { f.classList.remove("has-error"); });

      var name = $("sf-name").value.trim();
      var email = $("sf-email").value.trim();
      var category = $("sf-category").value;
      var subject = $("sf-subject").value.trim();
      var message = $("sf-message").value.trim();
      var consent = $("sf-consent").checked;
      var ok = true;

      if (!name) { fieldError($("sf-name"), "Enter your full name."); ok = false; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { fieldError($("sf-email"), "Enter a valid email address."); ok = false; }
      if (!category) { fieldError($("sf-category"), "Choose a category."); ok = false; }
      if (!subject) { fieldError($("sf-subject"), "Add a subject."); ok = false; }
      if (message.length < 10) { fieldError($("sf-message"), "Please describe your request in a little more detail."); ok = false; }
      if (!consent) { ok = false; UI.toast({ title: "Consent required", message: "Please accept the privacy consent to continue.", type: "danger" }); }

      if (!ok) {
        status.className = "form-status is-visible form-status--error";
        status.textContent = "Please correct the highlighted fields.";
        var first = form.querySelector(".has-error input, .has-error select, .has-error textarea");
        if (first) first.focus();
        return;
      }

      var file = $("sf-file").files && $("sf-file").files[0];
      if (file && file.size > 5 * 1024 * 1024) {
        fieldError($("sf-file"), "Maximum attachment size is 5 MB.");
        status.className = "form-status is-visible form-status--error";
        status.textContent = "The attachment is too large.";
        return;
      }

      var ref = DATA ? DATA.reference("TKT") : "TKT-2026-" + Math.floor(1000 + Math.random() * 9000);

      if (DATA) {
        var db = DATA.get();
        db.tickets.unshift({
          ref: ref, category: category, subject: subject, status: "Open",
          created: new Date().toISOString(), updated: new Date().toISOString(),
          messages: [{ from: name, text: message, date: new Date().toISOString() }]
        });
        DATA.save();
        DATA.notify("Support", "Support request received",
          "Ticket " + ref + " (" + category + ") was received. We reply within one working day.", "In-app + Email");
      }

      status.className = "form-status is-visible";
      status.innerHTML = "Thank you, " + name.replace(/[<>&]/g, "") + ". Your ticket reference is <strong>" + ref +
        "</strong>. A confirmation has been sent to " + email.replace(/[<>&]/g, "") +
        ". Keep this reference to track progress.";
      form.reset();
      UI.toast({ title: "Message sent", message: "Ticket " + ref + " created.", type: "success" });
      var tracker = $("ticket-ref");
      if (tracker) tracker.value = ref;
    });
  }

  if (lookupForm) {
    lookupForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var ref = $("ticket-ref").value.trim().toUpperCase();
      var out = $("ticket-result");
      var st = $("ticket-status");
      out.hidden = true;
      out.innerHTML = "";

      if (!ref) {
        st.className = "form-status is-visible form-status--error";
        st.textContent = "Enter a ticket reference, for example TKT-2026-0042.";
        return;
      }

      var ticket = DATA ? DATA.get().tickets.filter(function (t) { return t.ref.toUpperCase() === ref; })[0] : null;

      if (!ticket) {
        st.className = "form-status is-visible form-status--error";
        st.textContent = "We could not find ticket " + ref + ". Check the reference and try again, or call +265 999 123 456.";
        return;
      }

      st.className = "form-status is-visible";
      st.textContent = "Ticket found.";
      var tone = ticket.status === "Resolved" ? "ok" : ticket.status === "Open" ? "warn" : "info";
      out.hidden = false;
      out.innerHTML = '<div class="app-panel" style="margin-top:.8rem;"><div class="app-panel-head"><div><h3 style="font-size:.95rem;">' +
        ticket.subject + '</h3><p>' + ticket.ref + " · " + ticket.category + '</p></div>' +
        UI.statusPill(ticket.status === "Resolved" ? "Resolved" : ticket.status === "Open" ? "Pending" : "In progress") +
        '</div><div class="app-panel-body"><ol class="tracker-body" style="margin:0;">' +
        ticket.messages.map(function (m) {
          return '<li class="tracker-step is-done"><span class="tracker-dot"></span><div><strong>' + m.from + "</strong><p class=\"text-tiny text-muted\">" +
            new Date(m.date).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) +
            "</p><p>" + m.text + "</p></div></li>";
        }).join("") + "</ol>" +
        '<p class="text-tiny text-muted">Status: <span class="pill pill--' + tone + '">' + ticket.status + "</span> · last updated " +
        new Date(ticket.updated).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) + "</p></div></div>";
    });
  }
})();
