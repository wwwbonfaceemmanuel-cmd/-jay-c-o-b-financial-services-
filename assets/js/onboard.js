/* =====================================================================
   Application gate — the four things that must happen before a customer
   can apply for a loan.

     1. Read the terms and conditions. The Continue button appears only
        once the whole document has been read to the end.
     2. Accept them by ticking the agreement box.
     3. Create an account with an email address and a phone number, or
        with the phone number alone when there is no email — the
        one-time code then arrives by SMS.
     4. Write the full name and draw a signature.

   The account is created by Supabase Auth, the acceptance and the
   signature are stored in the customer's own document in Supabase, and
   the person then lands in the dashboard with the application open.
   Nothing is kept in the browser.
   ===================================================================== */
(function () {
  "use strict";

  var UI = window.JCOB_UI;
  var DATA = window.JCOB_DATA;
  var CLOUD = window.JCOB_CLOUD;

  var TERMS_VERSION = "2026-10-23";
  var ORIGIN = "apply";

  var state = {
    stage: "terms",
    method: "both",            // "both" (email + phone) or "phone"
    termsRead: false,
    accepted: null,            // { at, version }
    account: null,             // { identifier, channel }
    otp: { channel: "email", identifier: "", code: "" },
    signature: { w: 820, h: 240, strokes: [] },
    busy: false
  };

  function $(id) { return document.getElementById(id); }
  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function cloudOn() { return !!(CLOUD && CLOUD.enabled); }
  function isEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || "").trim()); }
  function digits(v) { return String(v || "").replace(/[^\d]/g, ""); }
  function isPhone(v) { var d = digits(v); return d.length >= 9 && d.length <= 15; }
  function normalPhone(v) {
    var d = digits(v);
    if (d.charAt(0) === "0") d = "265" + d.slice(1);
    if (d.slice(0, 3) !== "265" && d.length <= 9) d = "265" + d;
    return "+" + d;
  }
  function signedIn() {
    return !!(cloudOn() && CLOUD.auth && CLOUD.auth.isSignedIn && CLOUD.auth.isSignedIn());
  }
  function profileDoc() { return (DATA && DATA.get && DATA.get().profile) || {}; }

  /* ---------------- Terms ---------------- */
  var TERMS = [
    ["1. Who you are dealing with",
      "JAY C O B FINANCIAL SERVICES is a licensed money lender operating in Malawi. Our registered office is Plot 47/3, Area 47, Sector 3, Lilongwe. All amounts on this website and in every agreement are stated in Malawi Kwacha (MWK)."],
    ["2. What this application is",
      "This form is an application, not an offer of credit and not an agreement. Submitting it does not create a debt and does not commit us to lend. A loan exists only when an agreement is issued, signed by both parties and the money is disbursed."],
    ["3. Who may apply",
      "You must be at least 18 years old, a resident of Malawi, able to provide a valid national ID or passport, and able to show that you can afford the repayments. One application at a time is accepted per customer unless we agree otherwise in writing."],
    ["4. The information we collect",
      "We collect your name, contact details, national ID, employment and income information, bank or mobile money details, and the documents you upload. We also record the device and time of this application for fraud prevention and audit purposes."],
    ["5. Credit and affordability assessment",
      "We check affordability, existing debt and repayment history before approving any loan. We may verify your details with a credit reference bureau, your employer or your bank, and we may ask for further documents."],
    ["6. Pricing",
      "The interest rate, processing fee, insurance and any other charge that applies to your loan are shown to you before you sign. Rates are quoted per annum and are fixed for the term of the agreement unless the agreement says otherwise. Fees are disclosed in the Fees and Charges statement."],
    ["7. Repayments",
      "Repayments are made monthly on the dates shown in your repayment schedule, by Airtel Money, TNM Mpamba, bank transfer or at a branch. Late payments attract the charges set out in your agreement, and persistent non-payment is reported and may lead to recovery action."],
    ["8. Early settlement",
      "You may settle a loan early. Where you do, interest is recalculated on the reducing balance up to the settlement date and any unearned interest is removed. A settlement quotation is issued on request and is valid for seven days."],
    ["9. Your right to withdraw",
      "You may withdraw this application at any time before disbursement at no cost. After disbursement you may settle the loan early as described above. Withdrawing an application does not affect any other service you use."],
    ["10. Data protection",
      "We process your personal data lawfully and only for the purposes described in our Privacy Policy and Data Protection statement. Your ID and financial details are masked in the portal and are visible only to staff who need them. You may request a copy or a correction of your data at any time."],
    ["11. Electronic signature",
      "By typing your full name and drawing your signature you sign this application electronically. An electronic signature has the same effect as a handwritten one under the Electronic Transactions and Cyber Security Act. We keep the signature with the application record."],
    ["12. Communication",
      "We contact you by email, SMS, in-app notification and telephone about this application, your loan and your account. You can change notification preferences in your dashboard, but we will always send security and repayment notices."],
    ["13. Complaints",
      "If you are unhappy with a decision or our service, contact us first through the Complaints and Disputes process. We acknowledge complaints within two working days and aim to resolve them within fourteen. You may also complain to the Reserve Bank of Malawi."],
    ["14. Governing law",
      "This application and any agreement arising from it are governed by the laws of Malawi. Nothing in these terms removes any right you have under the Consumer Protection Act, the Financial Services Act or the Money Lenders Act."]
  ];

  function termsBody() {
    return TERMS.map(function (t) {
      return "<h3>" + esc(t[0]) + "</h3><p>" + esc(t[1]) + "</p>";
    }).join("") +
      '<h3>15. The documents that form this application</h3>' +
      '<p>These terms are read together with our <a href="terms.html" target="_blank" rel="noopener">Terms and Conditions</a>, ' +
      '<a href="privacy.html" target="_blank" rel="noopener">Privacy Policy</a>, ' +
      '<a href="loan-agreement-terms.html" target="_blank" rel="noopener">Loan Agreement Terms</a>, ' +
      '<a href="fees-disclosure.html" target="_blank" rel="noopener">Fees and Charges</a>, ' +
      '<a href="interest-rates-fees.html" target="_blank" rel="noopener">Interest Rates and Fees</a> and ' +
      '<a href="responsible-lending.html" target="_blank" rel="noopener">Responsible Lending Policy</a>. ' +
      'Where those documents and this page differ, the signed loan agreement prevails.</p>' +
      '<p class="onb-end"><strong>End of the terms.</strong> Version ' + TERMS_VERSION + '.</p>';
  }

  /* ---------------- Steps rail ---------------- */
  var STEPS = [
    { id: "terms", label: "Terms" },
    { id: "agree", label: "Accept" },
    { id: "account", label: "Account" },
    { id: "identity", label: "Signature" }
  ];

  function stepsRail() {
    var order = STEPS.map(function (s) { return s.id; });
    var at = order.indexOf(state.stage === "verify" ? "account" : state.stage);
    if (at < 0) at = 0;
    return '<ol class="app-stepper onb-steps">' + STEPS.map(function (s, i) {
      var cls = i === at ? "is-current" : i < at ? "is-done" : "";
      return '<li class="' + cls + '">' + esc(s.label) + "</li>";
    }).join("") + "</ol>";
  }

  function shell(inner, aside) {
    return '<div class="container" style="max-width:78rem;">' +
      '<div class="dash-grid onb-grid">' +
        '<div class="calc-panel" style="background:#fff;">' + stepsRail() + inner + "</div>" +
        '<aside class="onb-aside">' + (aside || "") + "</aside>" +
      "</div></div>";
  }

  function notice(kind, title, text) {
    var icon = kind === "warn" ? UI.ICONS.warn || UI.ICONS.info : UI.ICONS.info;
    return '<div class="notice notice--' + (kind || "info") + '">' + icon +
      "<div><strong>" + esc(title) + "</strong>" + esc(text) + "</div></div>";
  }

  /* ---------------- Stage 1: read the terms ---------------- */
  function stageTerms() {
    return shell(
      '<h2 class="onb-title">Terms and conditions</h2>' +
      '<p class="onb-sub">Read this to the end. The Continue button appears when you reach the last line.</p>' +
      '<div class="onb-terms" id="onb-terms" tabindex="0" role="region" aria-label="Terms and conditions">' +
        termsBody() +
      "</div>" +
      '<div class="onb-progress" aria-hidden="true"><span id="onb-read-fill" style="width:0%"></span></div>' +
      '<p class="onb-readnote" id="onb-readnote" role="status" aria-live="polite">Scroll to the end to continue · <b id="onb-read-pct">0%</b> read</p>' +
      '<div class="onb-actions">' +
        '<button class="btn btn--gold" type="button" id="onb-terms-next" hidden>Continue</button>' +
        '<a class="btn btn--ghost" href="index.html">Leave</a>' +
        '<span class="onb-hint">Full policies: <a href="terms.html" target="_blank" rel="noopener">Terms</a> · ' +
        '<a href="privacy.html" target="_blank" rel="noopener">Privacy</a> · ' +
        '<a href="fees-disclosure.html" target="_blank" rel="noopener">Fees</a></span>' +
      "</div>",
      '<div class="card onb-card">' +
        "<h3>Why we ask you to read first</h3>" +
        '<p class="text-small text-muted">The pricing, the late-payment charges and your right to withdraw are all set out in these terms. ' +
        "We ask every customer to read them before applying so that no one borrows without knowing what the loan costs.</p>" +
      "</div>" +
      '<div class="notice notice--warn" style="margin-top:1rem;">' + UI.ICONS.info +
        "<div><strong>Borrowing costs money</strong>Only borrow what you can repay. If you are unsure, use the " +
        '<a href="calculator.html">loan calculator</a> or call +265 999 123 456.</div></div>'
    );
  }

  function wireReading() {
    var box = $("onb-terms");
    var next = $("onb-terms-next");
    if (!box || !next) return;

    function paint(ratio) {
      var pct = Math.round(ratio * 100);
      var fill = $("onb-read-fill");
      var read = $("onb-read-pct");
      var note = $("onb-readnote");
      if (fill) fill.style.width = pct + "%";
      if (read) read.textContent = pct + "%";
      if (ratio >= 0.995) {
        if (!state.termsRead) {
          state.termsRead = true;
          next.hidden = false;
          next.focus({ preventScroll: true });
        }
        if (note) note.innerHTML = "You have reached the end. Continue when you are ready.";
      } else if (!state.termsRead && note) {
        note.innerHTML = "Scroll to the end to continue · <b>" + pct + "%</b> read";
      }
    }

    function check() {
      /* Before layout there is nothing to measure; wait for a scroll or a
         resize rather than assuming the document was read. */
      if (box.clientHeight <= 0 && box.scrollHeight <= 0) return;
      var max = box.scrollHeight - box.clientHeight;
      /* Everything fits on this screen, so everything has been seen. */
      if (max <= 4) return paint(1);
      paint(Math.max(0, Math.min(1, box.scrollTop / max)));
    }

    next.addEventListener("click", function () {
      if (!state.termsRead) return;
      go("agree");
    });

    box.addEventListener("scroll", check, { passive: true });
    box.addEventListener("wheel", function () { setTimeout(check, 30); }, { passive: true });
    box.addEventListener("touchmove", function () { setTimeout(check, 30); }, { passive: true });
    box.addEventListener("keyup", function () { setTimeout(check, 16); });
    window.addEventListener("resize", check);
    setTimeout(check, 60);
  }

  /* ---------------- Stage 2: accept ---------------- */
  function stageAgree() {
    return shell(
      '<h2 class="onb-title">Accept the terms</h2>' +
      '<p class="onb-sub">Two things must be true before you can create an account.</p>' +
      '<label class="onb-check"><input type="checkbox" id="onb-agree">' +
        "<span>I have read and accept the <a href=\"terms.html\" target=\"_blank\" rel=\"noopener\">Terms and Conditions</a>, " +
        "the <a href=\"privacy.html\" target=\"_blank\" rel=\"noopener\">Privacy Policy</a> and the " +
        "<a href=\"fees-disclosure.html\" target=\"_blank\" rel=\"noopener\">Fees and Charges</a> disclosure, " +
        "and I consent to my details being checked for credit and affordability assessment.</span></label>" +
      '<label class="onb-check"><input type="checkbox" id="onb-truth">' +
        "<span>I confirm that I am 18 or older and that the information I give in this application will be true and complete.</span></label>" +
      '<p class="onb-error" id="onb-agree-error" role="alert" hidden>Please tick both boxes to continue.</p>' +
      '<div class="onb-actions">' +
        '<button class="btn btn--ghost" type="button" id="onb-agree-back">Back</button>' +
        '<button class="btn btn--gold" type="button" id="onb-agree-next">Continue</button>' +
      "</div>",
      '<div class="card onb-card"><h3>What you are agreeing to</h3>' +
        '<ul class="card-list">' +
        "<li>An application, not a loan — we assess before we lend.</li>" +
        "<li>Your rate and fees are disclosed before you sign the agreement.</li>" +
        "<li>You may withdraw at any time before disbursement.</li>" +
        "<li>You can request a copy of your data at any time.</li>" +
        "</ul></div>"
    );
  }

  function wireAgree() {
    var next = $("onb-agree-next");
    if (!next) return;
    $("onb-agree-back").addEventListener("click", function () { go("terms"); });
    next.addEventListener("click", function () {
      var agree = $("onb-agree").checked;
      var truth = $("onb-truth").checked;
      var err = $("onb-agree-error");
      if (!agree || !truth) {
        err.hidden = false;
        err.textContent = !agree ? "Tick the box to accept the terms and conditions." : "Please confirm that you are 18 or older.";
        return;
      }
      err.hidden = true;
      state.accepted = { at: new Date().toISOString(), version: TERMS_VERSION, origin: ORIGIN };
      go(signedIn() ? nextStageAfterAccount() : "account");
    });
  }

  /* ---------------- Stage 3: the account ---------------- */
  function stageAccount() {
    var both = state.method === "both";
    return shell(
      '<h2 class="onb-title">Create your account</h2>' +
      '<p class="onb-sub">Your account keeps this application, your repayments and your documents in one place. ' +
        "We will send a one-time code to confirm it is you.</p>" +

      '<fieldset class="onb-methods"><legend>How should we reach you?</legend>' +
        '<label class="onb-method"><input type="radio" name="onb-method" value="both"' + (both ? " checked" : "") + ">" +
          "<span><b>Email address and phone number</b><small>A confirmation link by email, plus SMS for repayments.</small></span></label>" +
        '<label class="onb-method"><input type="radio" name="onb-method" value="phone"' + (both ? "" : " checked") + ">" +
          "<span><b>Phone number only</b><small>No email? Use your phone. The one-time code arrives by SMS.</small></span></label>" +
      "</fieldset>" +

      '<div class="onb-fields">' +
        '<div class="field" id="onb-email-field"' + (both ? "" : ' hidden') + ">" +
          '<label for="onb-email">Email address</label>' +
          '<input id="onb-email" type="email" autocomplete="email" placeholder="you@example.com" inputmode="email">' +
          '<span class="error-msg">Enter a valid email address</span>' +
        "</div>" +
        '<div class="field" id="onb-phone-field">' +
          '<label for="onb-phone">Phone number (for the one-time code)</label>' +
          '<input id="onb-phone" type="tel" autocomplete="tel" placeholder="+265 999 123 456" inputmode="tel">' +
          '<span class="error-msg">Enter a valid phone number, for example +265 999 123 456</span>' +
        "</div>" +
      "</div>" +
      '<div class="onb-fields" id="onb-password-fields"' + (both ? "" : ' hidden') + ">" +
        '<div class="field"><label for="onb-password">Password</label>' +
          '<div class="pw-wrap"><input id="onb-password" type="password" autocomplete="new-password" placeholder="At least 8 characters">' +
          '<button class="pw-toggle" type="button" data-pw-toggle="onb-password" aria-label="Show password" aria-pressed="false">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg></button></div>' +
          '<span class="hint">Use letters, numbers and a symbol.</span></div>' +
        '<div class="field"><label for="onb-password2">Confirm password</label>' +
          '<input id="onb-password2" type="password" autocomplete="new-password" placeholder="Repeat the password">' +
          '<span class="error-msg">Passwords do not match</span></div>' +
      "</div>" +

      '<div class="notice notice--info" id="onb-phone-note"' + (both ? " hidden" : "") + ">" + UI.ICONS.info +
        "<div><strong>No email needed</strong>We will text a six-digit code to your phone. You can sign in with that code every time — " +
        "there is no password to remember.</div></div>" +

      '<p class="onb-error" id="onb-account-error" role="alert" hidden></p>' +
      '<div class="onb-actions">' +
        '<button class="btn btn--ghost" type="button" id="onb-account-back">Back</button>' +
        '<button class="btn btn--gold" type="button" id="onb-account-next">Send my code</button>' +
        '<a class="btn btn--ghost" href="login.html">I already have an account</a>' +
      "</div>" +
      '<p class="text-small text-muted" style="margin-top:.8rem;">Already registered? Signing in skips this step and keeps this application.</p>',
      sideAccount()
    );
  }

  function sideAccount() {
    return '<div class="card onb-card"><h3>Why an account</h3>' +
      '<ul class="card-list">' +
      "<li>Your application and reference are saved to it.</li>" +
      "<li>Repayment schedules and receipts stay in one place.</li>" +
      "<li>KYC documents are stored privately, never in the browser.</li>" +
      "<li>You can sign out of every device at once.</li>" +
      "</ul></div>" +
      '<div class="notice notice--info" style="margin-top:1rem;">' + UI.ICONS.info +
      "<div><strong>Your data</strong>Your ID and signature are stored in Supabase and visible only to you and to staff who need them.</div></div>";
  }

  function wireAccount() {
    var next = $("onb-account-next");
    if (!next) return;

    document.querySelectorAll('input[name="onb-method"]').forEach(function (radio) {
      radio.addEventListener("change", function () {
        state.method = radio.value;
        var both = state.method === "both";
        $("onb-email-field").hidden = !both;
        $("onb-password-fields").hidden = !both;
        $("onb-phone-note").hidden = both;
      });
    });

    $("onb-account-back").addEventListener("click", function () { go("agree"); });

    next.addEventListener("click", function () {
      var err = $("onb-account-error");
      var phone = $("onb-phone").value.trim();
      var email = $("onb-email") ? $("onb-email").value.trim() : "";
      var both = state.method === "both";
      function fail(msg, el) {
        err.hidden = false; err.textContent = msg;
        if (el) el.focus();
      }
      err.hidden = true;

      if (!cloudOn()) {
        return fail("Account creation is unavailable — the account service cannot be reached. Please call +265 999 123 456.");
      }
      if (!isPhone(phone)) return fail("Enter a valid phone number, for example +265 999 123 456.", $("onb-phone"));
      if (both && !isEmail(email)) return fail("Enter a valid email address, or choose phone number only.", $("onb-email"));

      var pw = both ? $("onb-password").value : "";
      if (both) {
        if (String(pw).length < 8 || !/\d/.test(pw)) return fail("Choose a password of at least 8 characters that includes a number.", $("onb-password"));
        if (pw !== $("onb-password2").value) return fail("Passwords do not match.", $("onb-password2"));
      }

      busy(next, true, "Sending…");

      if (both) {
        CLOUD.auth.signUp({
          email: email, phone: normalPhone(phone), password: pw,
          fullName: profileDoc().fullName || "",
          accountNo: profileDoc().accountNumber || ""
        }).then(function (res) {
          busy(next, false);
          if (res && res.session) {
            state.account = { identifier: email, channel: "email" };
            return afterSignIn();
          }
          /* Email confirmation is switched on: confirm with a code. */
          state.otp = { channel: "email", identifier: email, code: "" };
          state.account = { identifier: email, channel: "email" };
          return go("verify");
        }).catch(function (e) {
          busy(next, false);
          var msg = String((e && e.message) || "We could not create the account.");
          if (/already|exists|registered/i.test(msg)) msg = "An account already uses that email address. Sign in instead, or use the phone number only.";
          fail(msg);
        });
        return;
      }

      CLOUD.auth.sendPhoneOtp(normalPhone(phone)).then(function () {
        busy(next, false);
        state.otp = { channel: "sms", identifier: normalPhone(phone), code: "" };
        state.account = { identifier: normalPhone(phone), channel: "sms" };
        go("verify");
      }).catch(function (e) {
        busy(next, false);
        fail(String((e && e.message) || "We could not send a code to that number."));
      });
    });
  }

  /* ---------------- Stage 3b: the one-time code ---------------- */
  function stageVerify() {
    var sms = state.otp.channel === "sms";
    return shell(
      '<h2 class="onb-title">Enter your code</h2>' +
      '<p class="onb-sub">We sent a six-digit code to <b id="onb-otp-target">' + esc(state.otp.identifier) + "</b>. " +
        (sms ? "It arrives by SMS." : "It arrives by email.") + "</p>" +
      '<div class="otp-row" id="onb-otp-row">' +
        [0, 1, 2, 3, 4, 5].map(function (i) {
          return '<input type="text" inputmode="numeric" maxlength="1" autocomplete="one-time-code" aria-label="Digit ' + (i + 1) + '">';
        }).join("") +
      "</div>" +
      '<p class="onb-error" id="onb-otp-error" role="alert" hidden></p>' +
      '<div class="onb-actions">' +
        '<button class="btn btn--ghost" type="button" id="onb-otp-back">Change details</button>' +
        '<button class="btn btn--gold" type="button" id="onb-otp-next">Verify and continue</button>' +
        '<button class="btn btn--ghost" type="button" id="onb-otp-resend">Send a new code</button>' +
      "</div>" +
      '<p class="text-small text-muted" style="margin-top:.8rem;">Codes expire after a few minutes. If you do not receive one, ' +
        '<button class="linkish" type="button" id="onb-otp-other">use the other method</button> or call +265 999 123 456.</p>',
      sideAccount()
    );
  }

  function wireVerify() {
    var inputs = Array.prototype.slice.call(document.querySelectorAll("#onb-otp-row input"));
    var next = $("onb-otp-next");
    if (!inputs.length || !next) return;
    var err = $("onb-otp-error");

    inputs.forEach(function (input, i) {
      input.addEventListener("input", function () {
        input.value = input.value.replace(/\D/g, "").slice(0, 1);
        if (input.value && inputs[i + 1]) inputs[i + 1].focus();
      });
      input.addEventListener("keydown", function (e) {
        if (e.key === "Backspace" && !input.value && inputs[i - 1]) inputs[i - 1].focus();
      });
      input.addEventListener("paste", function (e) {
        var text = String((e.clipboardData || window.clipboardData).getData("text") || "").replace(/\D/g, "");
        if (!text) return;
        e.preventDefault();
        text.split("").slice(0, inputs.length).forEach(function (ch, idx) { if (inputs[idx]) inputs[idx].value = ch; });
        inputs[Math.min(text.length, inputs.length - 1)].focus();
      });
    });
    if (inputs[0]) inputs[0].focus();

    $("onb-otp-back").addEventListener("click", function () { go("account"); });
    $("onb-otp-resend").addEventListener("click", function () { requestCode(); });
    $("onb-otp-other").addEventListener("click", function () {
      state.method = state.otp.channel === "sms" ? "both" : "phone";
      go("account");
    });

    next.addEventListener("click", function () {
      var code = inputs.map(function (i) { return i.value; }).join("");
      err.hidden = true;
      if (code.length !== 6) {
        err.hidden = false; err.textContent = "Enter all six digits of the code.";
        return;
      }
      busy(next, true, "Checking…");
      var done = state.otp.channel === "sms"
        ? CLOUD.auth.verifyPhoneOtp(state.otp.identifier, code)
        : CLOUD.auth.verifyOtp(state.otp.identifier, code);
      done.then(function () {
        busy(next, false);
        afterSignIn();
      }).catch(function (e) {
        busy(next, false);
        err.hidden = false;
        var msg = String((e && e.message) || "");
        err.textContent = /expired|invalid|incorrect|token/i.test(msg)
          ? "That code is incorrect or has expired. Send a new one."
          : (msg || "We could not verify that code.");
        inputs.forEach(function (i) { i.value = ""; });
        if (inputs[0]) inputs[0].focus();
      });
    });
  }

  function requestCode() {
    var send = state.otp.channel === "sms"
      ? CLOUD.auth.sendPhoneOtp(state.otp.identifier)
      : CLOUD.auth.sendOtp(state.otp.identifier);
    send.then(function () {
      UI.toast({ title: "New code sent", message: "It should arrive within a minute.", type: "info" });
    }).catch(function (e) {
      UI.toast({ title: "Could not send a code", message: String((e && e.message) || "Try again."), type: "danger" });
    });
  }

  /* ---------------- After sign-in ---------------- */
  function nextStageAfterAccount() {
    var p = profileDoc();
    var signed = p && p.signature && p.signature.strokes && p.signature.strokes.length;
    return signed ? "finish" : "identity";
  }

  function afterSignIn() {
    /* Read the customer's own document before writing to it. */
    var ready = (DATA && DATA.hydrate) ? DATA.hydrate() : Promise.resolve(true);
    Promise.resolve(ready).then(function () {
      go(nextStageAfterAccount());
    }).catch(function () {
      go("identity");
    });
  }

  /* ---------------- Stage 4: name and signature ---------------- */
  function stageIdentity() {
    var name = (profileDoc().fullName || "").trim();
    return shell(
      '<h2 class="onb-title">Sign your application</h2>' +
      '<p class="onb-sub">Two fields: your full name and your signature. Draw the signature exactly as you would on paper.</p>' +
      '<div class="onb-fields">' +
        '<div class="field field--full">' +
          '<label for="onb-fullname">A. Full name</label>' +
          '<input id="onb-fullname" type="text" autocomplete="name" placeholder="Enter your full name" value="' + esc(name) + '">' +
          '<span class="hint">As it appears on your national ID.</span>' +
          '<span class="error-msg">Enter your full name</span>' +
        "</div>" +
      "</div>" +
      '<div class="field" style="margin-top:.6rem;">' +
        '<label for="onb-sig">B. Signature</label>' +
        '<div class="sigpad" id="onb-sigpad">' +
          '<canvas id="onb-sig" tabindex="0" aria-label="Signature pad — draw your signature here" role="img"></canvas>' +
          '<span class="sigpad-baseline" aria-hidden="true"></span>' +
          '<span class="sigpad-empty" id="onb-sig-empty">Sign here</span>' +
        "</div>" +
        '<div class="sigpad-foot">' +
          '<span class="hint" id="onb-sig-hint">Draw with a finger, stylus or mouse.</span>' +
          '<button class="btn btn--ghost btn--sm" type="button" id="onb-sig-clear">Clear</button>' +
        "</div>" +
        '<span class="error-msg">Draw your signature in the box</span>' +
      "</div>" +
      '<label class="onb-check"><input type="checkbox" id="onb-sig-confirm">' +
        "<span>I confirm that I signed this application myself and that it is my legal signature.</span></label>" +
      '<p class="onb-error" id="onb-id-error" role="alert" hidden></p>' +
      '<div class="onb-actions">' +
        '<button class="btn btn--ghost" type="button" id="onb-id-back">Back</button>' +
        '<button class="btn btn--gold" type="button" id="onb-id-next">Save signature and continue</button>' +
      "</div>" +
      '<p class="text-small text-muted" style="margin-top:.8rem;">Your signature is stored with your account, not in this browser. ' +
        "It is attached to the loan agreement when the loan is approved.</p>",
      '<div class="card onb-card"><h3>What happens next</h3>' +
        '<ol class="card-list">' +
        "<li>Your dashboard opens with the application form ready.</li>" +
        "<li>Complete the five steps and submit.</li>" +
        "<li>We verify your documents within one working day.</li>" +
        "<li>You are told the decision in the dashboard and by SMS.</li>" +
        "</ol></div>"
    );
  }

  function drawSignature(pad, signature, ghost) {
    if (!pad) return;
    var ctx = null;
    try { ctx = pad.getContext("2d"); } catch (e) { ctx = null; }
    if (!ctx) {
      var empty = $("onb-sig-empty");
      if (empty) {
        empty.textContent = "This browser cannot show the signature pad. Please use a modern browser.";
        empty.classList.add("is-error");
      }
      return;
    }
    var w = pad.width, h = pad.height;
    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = ghost ? 2 : 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = ghost ? "#0f3d34" : "#081521";
    (signature.strokes || []).forEach(function (stroke) {
      if (!stroke.length) return;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (var i = 1; i < stroke.length; i++) ctx.lineTo(stroke[i].x, stroke[i].y);
      if (stroke.length === 1) ctx.lineTo(stroke[0].x + 0.4, stroke[0].y + 0.4);
      ctx.stroke();
    });
  }

  function wirePad() {
    var pad = $("onb-sig");
    var clear = $("onb-sig-clear");
    if (!pad) return;

    /* Match the drawing surface to the box on screen. */
    var rect = pad.getBoundingClientRect ? pad.getBoundingClientRect() : { width: 0, height: 0 };
    if (rect.width) pad.width = Math.round(rect.width);
    if (rect.height) pad.height = Math.round(rect.height);
    if (!pad.width) pad.width = state.signature.w;
    if (!pad.height) pad.height = state.signature.h;
    state.signature.w = pad.width;
    state.signature.h = pad.height;

    var drawing = false;
    var stroke = null;

    function point(e) {
      var r = pad.getBoundingClientRect ? pad.getBoundingClientRect() : { left: 0, top: 0, width: pad.width, height: pad.height };
      var sx = pad.width / (r.width || pad.width);
      var sy = pad.height / (r.height || pad.height);
      var cx = (e.clientX || 0) - (r.left || 0);
      var cy = (e.clientY || 0) - (r.top || 0);
      return { x: Math.round(cx * sx * 10) / 10, y: Math.round(cy * sy * 10) / 10 };
    }

    function start(e) {
      if (e.button != null && e.button !== 0) return;
      drawing = true;
      stroke = [point(e)];
      state.signature.strokes.push(stroke);
      var empty = $("onb-sig-empty");
      if (empty) empty.hidden = true;
      pad.classList.add("is-signing");
      drawSignature(pad, state.signature, false);
      if (e.preventDefault) e.preventDefault();
    }
    function move(e) {
      if (!drawing || !stroke) return;
      stroke.push(point(e));
      drawSignature(pad, state.signature, false);
      if (e.preventDefault) e.preventDefault();
    }
    function end() {
      drawing = false;
      stroke = null;
      pad.classList.remove("is-signing");
      pointCount();
    }

    function pointCount() {
      return state.signature.strokes.reduce(function (n, s) { return n + s.length; }, 0);
    }

    pad.addEventListener("pointerdown", start);
    pad.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    pad.addEventListener("mousedown", start);
    pad.addEventListener("mousemove", move);
    window.addEventListener("mouseup", end);
    pad.addEventListener("touchstart", function (e) {
      start(e.touches[0]);
    }, { passive: false });
    pad.addEventListener("touchmove", function (e) {
      move(e.touches[0]);
    }, { passive: false });
    pad.addEventListener("touchend", end);

    clear.addEventListener("click", function () {
      state.signature.strokes = [];
      drawSignature(pad, state.signature, false);
      var empty = $("onb-sig-empty");
      if (empty) empty.hidden = false;
      pad.classList.remove("has-ink");
    });

    state.signature.points = pointCount;

    var next = $("onb-id-next");
    if (!next) return;
    $("onb-id-back").addEventListener("click", function () { go(signedIn() ? "agree" : "account"); });

    next.addEventListener("click", function () {
      var err = $("onb-id-error");
      var nameEl = $("onb-fullname");
      err.hidden = true;

      var fullName = nameEl.value.trim().replace(/\s+/g, " ");
      if (fullName.length < 3 || fullName.indexOf(" ") < 0) {
        err.hidden = false; err.textContent = "Enter your full name — first name and surname, as on your ID.";
        nameEl.focus();
        return;
      }
      if (pointCount() < 12 || !state.signature.strokes.length) {
        err.hidden = false; err.textContent = "Draw your signature in the box before continuing.";
        pad.focus();
        return;
      }
      if (!$("onb-sig-confirm").checked) {
        err.hidden = false; err.textContent = "Tick the confirmation that the signature is yours.";
        return;
      }
      saveIdentity(fullName, next);
    });
  }

  function saveIdentity(fullName, button) {
    if (!DATA || !DATA.get) return;
    if (!signedIn()) {
      UI.toast({ title: "Session ended", message: "Sign in again to save your signature.", type: "danger" });
      go("account");
      return;
    }
    busy(button, true, "Saving…");
    var doc = DATA.get();
    doc.profile = doc.profile || {};
    doc.profile.fullName = fullName;
    doc.profile.signature = {
      version: 1,
      w: state.signature.w,
      h: state.signature.h,
      strokes: state.signature.strokes,
      signedAt: new Date().toISOString(),
      signerName: fullName
    };
    doc.profile.termsAccepted = state.accepted;
    doc.profile.accountMethod = state.account && state.account.channel === "sms" ? "phone" : "email";
    DATA.notify("Account", "Account created",
      "Welcome, " + fullName.split(" ")[0] + ". Your account is ready and your application can now be completed.", "In-app");

    var write = DATA.saveNow ? DATA.saveNow() : Promise.resolve(DATA.save());
    Promise.resolve(write).then(function () {
      var remote = (DATA.remote || {});
      if (remote.state === "error" || remote.state === "offline") {
        busy(button, false);
        UI.toast({
          title: "Not saved",
          message: "The database refused the write, so your signature was not stored. Nothing was kept in this browser.",
          type: "danger"
        });
        return;
      }
      state.stage = "done";
      busy(button, false);
      UI.toast({ title: "You are in", message: "Opening your dashboard with the application ready.", type: "success" });
      window.location.href = "dashboard.html#apply";
    });
  }

  function busy(button, on, label) {
    if (!button) return;
    if (on) {
      button.dataset.label = button.textContent;
      button.disabled = true;
      button.textContent = label || "Working…";
    } else {
      button.disabled = false;
      if (button.dataset.label) button.textContent = button.dataset.label;
    }
  }

  /* ---------------- Router ---------------- */
  function render() {
    var html = "";
    if (state.stage === "terms") html = stageTerms();
    else if (state.stage === "agree") html = stageAgree();
    else if (state.stage === "account") html = stageAccount();
    else if (state.stage === "verify") html = stageVerify();
    else html = stageIdentity();

    var host = $("apply-host");
    if (host) host.innerHTML = html;

    if (state.stage === "terms") wireReading();
    if (state.stage === "agree") wireAgree();
    if (state.stage === "account") wireAccount();
    if (state.stage === "verify") wireVerify();
    if (state.stage === "identity") wirePad();

    var heading = host && host.querySelector(".onb-title");
    if (heading) heading.setAttribute("tabindex", "-1");
  }

  function go(stage) {
    if (stage === "finish") return finish();
    state.stage = stage;
    render();
  }

  /* Already has a signature on file: go straight to the dashboard. */
  function finish() {
    window.location.href = "dashboard.html#apply";
  }

  window.JCOB_ONBOARD = {
    intercept: true,
    start: function () {
      if (signedIn() && DATA && DATA.hydrate) DATA.hydrate();
      if (signedIn()) {
        var p = profileDoc();
        state.account = { identifier: (p.email || p.phone || ""), channel: p.email ? "email" : "sms" };
      }
      state.stage = "terms";
      render();
    },
    state: function () { return state; }
  };

  document.addEventListener("DOMContentLoaded", function () {
    if (document.body.getAttribute("data-page") !== "apply") return;
    window.JCOB_ONBOARD.start();
  });
})();
