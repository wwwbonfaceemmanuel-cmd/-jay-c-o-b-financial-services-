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
      "The interest rate, processing fee, insurance and any other charge that applies to your loan are shown to you before you sign. Rates are quoted per annum, or per month where a product is published monthly (the personal loan is quoted at 2% per month and opens on a one-month term). The rate is fixed for the term of the agreement unless the agreement says otherwise. Fees are disclosed in the Fees and Charges statement."],
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
        '<div class="calc-panel">' + stepsRail() + inner + "</div>" +
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

  /* ---------------- Stage 3: the account ----------------
     SMS is a convenience, not a requirement. When no messaging provider is
     connected the phone becomes an ordinary sign-in identifier: number plus
     password, confirmed later if SMS is switched on. */
  function smsReady() {
    return !!(CLOUD && CLOUD.auth && CLOUD.auth.smsAvailable && CLOUD.auth.smsAvailable());
  }

  function stageAccount() {
    var both = state.method === "both";
    var sms = smsReady();
    var phoneOnlyNoSms = !both && !sms;
    return shell(
      '<h2 class="onb-title">Create your account</h2>' +
      '<p class="onb-sub">Your account keeps this application, your repayments and your documents in one place. ' +
        (sms ? "We will send a one-time code to confirm it is you." : "You choose a password, and a code is sent later if the messaging service is connected.") + "</p>" +

      (sms ? "" : '<div class="notice notice--info" id="onb-sms-note">' + UI.ICONS.info +
        "<div><strong>SMS is not connected yet</strong>No part of the application waits for a text message. " +
        "Phone accounts use a password, and we can verify the number by SMS once the messaging provider is live.</div></div>") +

      '<fieldset class="onb-methods"><legend>How should we reach you?</legend>' +
        '<label class="onb-method"><input type="radio" name="onb-method" value="both"' + (both ? " checked" : "") + ">" +
          "<span><b>Email address and phone number</b><small>" +
          (sms ? "Confirmation by email, codes by SMS." : "Confirmation by email. The phone is used for repayment reminders.") +
          "</small></span></label>" +
        '<label class="onb-method"><input type="radio" name="onb-method" value="phone"' + (both ? "" : " checked") + ">" +
          "<span><b>Phone number only</b><small>" +
          (sms ? "No email? Use your phone. The code arrives by SMS." : "No email? Use your phone and a password. No text message is needed.") +
          "</small></span></label>" +
      "</fieldset>" +

      '<div class="onb-fields">' +
        '<div class="field" id="onb-email-field"' + (both ? "" : ' hidden') + ">" +
          '<label for="onb-email">Email address</label>' +
          '<input id="onb-email" type="email" autocomplete="email" placeholder="you@example.com" inputmode="email">' +
          '<span class="error-msg">Enter a valid email address</span>' +
        "</div>" +
        '<div class="field" id="onb-phone-field">' +
          '<label for="onb-phone">Phone number</label>' +
          '<input id="onb-phone" type="tel" autocomplete="tel" placeholder="+265 999 123 456" inputmode="tel">' +
          '<span class="error-msg">Enter a valid phone number, for example +265 999 123 456</span>' +
        "</div>" +
      "</div>" +

      '<div class="onb-fields" id="onb-password-fields"' + (both || phoneOnlyNoSms ? "" : ' hidden') + ">" +
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
        "<div><strong>" + (sms ? "No email needed" : "No email and no text message needed") + "</strong>" +
        (sms
          ? "We will text a six-digit code to your phone. You can sign in with that code every time — there is no password to remember."
          : "Your phone number and the password above are your sign-in. When the SMS provider is connected you can add text-message verification from Account security.") +
        "</div></div>" +

      '<p class="onb-error" id="onb-account-error" role="alert" hidden></p>' +
      '<div class="onb-actions">' +
        '<button class="btn btn--ghost" type="button" id="onb-account-back">Back</button>' +
        '<button class="btn btn--gold" type="button" id="onb-account-next">' +
          (both || !sms ? "Create my account" : "Send my code") + "</button>" +
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

    function syncMethod() {
      var both = state.method === "both";
      var sms = smsReady();
      $("onb-email-field").hidden = !both;
      $("onb-password-fields").hidden = !(both || !sms);
      $("onb-phone-note").hidden = both;
      next.textContent = both || !sms ? "Create my account" : "Send my code";
      var err = $("onb-account-error");
      if (err) err.hidden = true;
    }

    document.querySelectorAll('input[name="onb-method"]').forEach(function (radio) {
      radio.addEventListener("change", function () {
        state.method = radio.value;
        syncMethod();
      });
    });

    $("onb-account-back").addEventListener("click", function () { go("agree"); });

    next.addEventListener("click", function () {
      var err = $("onb-account-error");
      var phone = $("onb-phone").value.trim();
      var email = $("onb-email") ? $("onb-email").value.trim() : "";
      var both = state.method === "both";
      var sms = smsReady();
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

      var needsPassword = both || !sms;
      var pw = needsPassword ? $("onb-password").value : "";
      if (needsPassword) {
        if (String(pw).length < 8 || !/\d/.test(pw)) return fail("Choose a password of at least 8 characters that includes a number.", $("onb-password"));
        if (pw !== $("onb-password2").value) return fail("Passwords do not match.", $("onb-password2"));
      }

      busy(next, true, both || !sms ? "Creating…" : "Sending…");

      /* Phone only, with SMS connected: a code does the work. */
      if (!both && sms) {
        CLOUD.auth.sendPhoneOtp(normalPhone(phone)).then(function () {
          busy(next, false);
          state.otp = { channel: "sms", identifier: normalPhone(phone), code: "" };
          state.account = { identifier: normalPhone(phone), channel: "sms" };
          go("verify");
        }).catch(function (e) {
          busy(next, false);
          fail(String((e && e.message) || "We could not send a code to that number."));
        });
        return;
      }

      /* Email, or phone with a password. No code is required either way. */
      var details = {
        password: pw,
        fullName: profileDoc().fullName || "",
        accountNo: profileDoc().accountNumber || ""
      };
      if (email) details.email = email;
      details.phone = normalPhone(phone);

      CLOUD.auth.signUp(details).then(function (res) {
        busy(next, false);
        state.account = { identifier: email || normalPhone(phone), channel: email ? "email" : "phone" };
        if (res && res.session) return afterSignIn();

        /* Email confirmation is on: finish with a code to the address. */
        if (email) {
          state.otp = { channel: "email", identifier: email, code: "" };
          return go("verify");
        }
        return fail("We could not finish creating the account just now. Please use an email address or call +265 999 123 456.");
      }).catch(function (e) {
        busy(next, false);
        var msg = String((e && e.message) || "We could not create the account.");
        if (/already|exists|registered/i.test(msg)) {
          msg = email
            ? "An account already uses that email address. Sign in instead, or use the phone number only."
            : "An account already uses that phone number. Sign in instead, or reset your password.";
        }
        fail(msg);
      });
    });

    syncMethod();
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
          '<span class="hint" id="onb-sig-hint">Draw freely — cursive, print, loops, any shape. The line follows your finger, stylus or mouse exactly.</span>' +
          '<span class="sigpad-actions">' +
            '<button class="btn btn--ghost btn--sm" type="button" id="onb-sig-undo">Undo</button>' +
            '<button class="btn btn--ghost btn--sm" type="button" id="onb-sig-clear">Clear</button>' +
          "</span>" +
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

  /* ===================================================================
     Signature pad
     -------------------------------------------------------------------
     The ink follows the pointer exactly. Every sampled point becomes a
     knot of an interpolating spline (Catmull-Rom, converted to cubic
     Béziers), so the line passes through the trace itself instead of
     joining samples with straight segments — any shape, any handwriting,
     cursive or print, curves or loops, comes out as drawn.

     Fidelity comes from three things:
       • pointer events, with the capture held so a stroke that leaves the
         box is still recorded (and pointercancel ends it cleanly)
       • getCoalescedEvents(), which returns the points the browser batched
         between frames — a fast flick is no longer a few long chords
       • a backing store sized for the device pixel ratio, so a thin line
         stays thin and does not snap to a soft, jagged grid

     The stored shape is unchanged: signature.strokes is a list of strokes,
     each a list of {x, y} in CSS pixels, with signature.w / h recording the
     surface it was drawn on.
     =================================================================== */

  /* One stroke, drawn through every point it was recorded with. */
  function traceStroke(ctx, pts) {
    if (!pts || !pts.length) return;
    if (pts.length === 1) {
      /* a tap leaves a dot */
      ctx.beginPath();
      ctx.arc(pts[0].x, pts[0].y, Math.max(ctx.lineWidth / 2, 0.8), 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    if (pts.length === 2) {
      ctx.lineTo(pts[1].x, pts[1].y);
    } else {
      for (var i = 0; i < pts.length - 1; i += 1) {
        var p0 = pts[i - 1] || pts[0];
        var p1 = pts[i];
        var p2 = pts[i + 1];
        var p3 = pts[i + 2] || p2;
        /* Catmull-Rom → Bézier: the curve passes through p1 and p2 */
        var c1x = p1.x + (p2.x - p0.x) / 6;
        var c1y = p1.y + (p2.y - p0.y) / 6;
        var c2x = p2.x - (p3.x - p1.x) / 6;
        var c2y = p2.y - (p3.y - p1.y) / 6;
        ctx.bezierCurveTo(c1x, c1y, c2x, c2y, p2.x, p2.y);
      }
    }
    ctx.stroke();
  }

  function padContext(pad) {
    if (!pad) return null;
    var ctx = null;
    try { ctx = pad.getContext("2d"); } catch (e) { ctx = null; }
    return ctx || null;
  }

  function deviceScale() {
    var dpr = Number(window.devicePixelRatio) || 1;
    return Math.min(Math.max(dpr, 1), 3);
  }

  /* Size the backing store for the screen, and keep existing strokes in
     step if the box changed (rotation, a wider window, a printed sheet).
     Called when the pad is wired, when a stroke starts and when the window
     resizes — never per frame, because measuring forces a layout. */
  function fitPad(pad) {
    var rect = pad.getBoundingClientRect ? pad.getBoundingClientRect() : { width: 0, height: 0 };
    var nextW = Math.round(rect.width) || state.signature.w;
    var nextH = Math.round(rect.height) || state.signature.h;
    var prevW = state.signature.w || nextW;
    var prevH = state.signature.h || nextH;
    var dpr = deviceScale();

    pad.width = Math.max(Math.round(nextW * dpr), 1);
    pad.height = Math.max(Math.round(nextH * dpr), 1);

    if (nextW !== prevW || nextH !== prevH) {
      var sx = nextW / (prevW || nextW);
      var sy = nextH / (prevH || nextH);
      state.signature.strokes.forEach(function (stroke) {
        stroke.forEach(function (pt) {
          pt.x = Math.round(pt.x * sx * 10) / 10;
          pt.y = Math.round(pt.y * sy * 10) / 10;
        });
      });
    }
    state.signature.w = nextW;
    state.signature.h = nextH;
    pad.__jcobDpr = dpr;
    return dpr;
  }

  function drawSignature(pad, signature, ghost) {
    if (!pad) return;
    var ctx = padContext(pad);
    if (!ctx) {
      var empty = $("onb-sig-empty");
      if (empty) {
        empty.textContent = "This browser cannot show the signature pad. Please use a modern browser.";
        empty.classList.add("is-error");
      }
      return;
    }
    if (!pad.width || !pad.height) fitPad(pad);
    var dpr = pad.__jcobDpr || deviceScale();
    var w = state.signature.w;
    var h = state.signature.h;
    if (ctx.setTransform) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = ghost ? "#0f3d34" : "#081521";
    ctx.fillStyle = ctx.strokeStyle;
    (signature.strokes || []).forEach(function (stroke) {
      ctx.lineWidth = ghost ? 2 : 2.6;
      traceStroke(ctx, stroke);
    });
  }

  function wirePad() {
    var pad = $("onb-sig");
    var clear = $("onb-sig-clear");
    var undo = $("onb-sig-undo");
    if (!pad) return;
    /* The frame is styled, not the canvas: keep the state classes there so
       the dashed border turns solid while a stroke is in progress. */
    var wrap = $("onb-sigpad") || pad;

    /* Match the drawing surface to the box on screen (device-pixel crisp). */
    fitPad(pad);
    drawSignature(pad, state.signature, false);

    var drawing = false;
    var stroke = null;
    var rect = null;
    var frame = null;
    var lastPoint = null;

    function schedule() {
      if (frame) return;
      var run = function () {
        frame = null;
        drawSignature(pad, state.signature, false);
      };
      if (typeof window.requestAnimationFrame === "function") frame = window.requestAnimationFrame(run);
      else frame = window.setTimeout(run, 16);
    }

    function localPoint(e) {
      var box = rect || (pad.getBoundingClientRect ? pad.getBoundingClientRect() : null) ||
        { left: 0, top: 0, width: state.signature.w, height: state.signature.h };
      var clientX = e.clientX;
      var clientY = e.clientY;
      if (clientX == null && e.touches && e.touches[0]) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      }
      var w = state.signature.w || box.width || 1;
      var h = state.signature.h || box.height || 1;
      var sx = box.width ? w / box.width : 1;
      var sy = box.height ? h / box.height : 1;
      var x = ((clientX || 0) - (box.left || 0)) * sx;
      var y = ((clientY || 0) - (box.top || 0)) * sy;
      return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
    }

    function isEmptyScreen() {
      var empty = $("onb-sig-empty");
      if (empty) empty.hidden = true;
      wrap.classList.add("has-ink");
    }

    function begin(e) {
      if (e.button != null && e.button > 0) return;
      if (e.isPrimary === false) return;
      /* cheap once per stroke: the box may have changed since the last one */
      fitPad(pad);
      drawing = true;
      rect = pad.getBoundingClientRect ? pad.getBoundingClientRect() : null;
      stroke = [];
      state.signature.strokes.push(stroke);
      wrap.classList.add("is-signing");
      if (e.pointerId != null && typeof pad.setPointerCapture === "function") {
        try { pad.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      }
      var pt = localPoint(e);
      stroke.push(pt);
      lastPoint = pt;
      isEmptyScreen();
      schedule();
      if (e.preventDefault) e.preventDefault();
    }

    /* Every point the browser batched since the last frame, in order. */
    function extend(e) {
      if (!drawing || !stroke) return;
      var events = [e];
      if (typeof e.getCoalescedEvents === "function") {
        try {
          var batch = e.getCoalescedEvents();
          if (batch && batch.length) events = batch;
        } catch (err) { events = [e]; }
      }
      for (var i = 0; i < events.length; i += 1) {
        var pt = localPoint(events[i]);
        if (lastPoint && Math.abs(pt.x - lastPoint.x) < 0.2 && Math.abs(pt.y - lastPoint.y) < 0.2) continue;
        stroke.push(pt);
        lastPoint = pt;
      }
      schedule();
      if (e.preventDefault) e.preventDefault();
    }

    function finish(e) {
      if (!drawing) return;
      drawing = false;
      stroke = null;
      lastPoint = null;
      rect = null;
      wrap.classList.remove("is-signing");
      if (frame) {
        if (typeof window.cancelAnimationFrame === "function") window.cancelAnimationFrame(frame);
        frame = null;
      }
      drawSignature(pad, state.signature, false);
      pointCount();
      if (e && e.pointerId != null && typeof pad.releasePointerCapture === "function") {
        try { pad.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      }
    }

    function pointCount() {
      return state.signature.strokes.reduce(function (n, strokePts) { return n + strokePts.length; }, 0);
    }

    /* Pointer events where the browser supports them (touch, pen and mouse
       in one pipeline, with pressure-free but exact geometry). Set
       pointer capture is the mark of a browser that has them; jsdom and
       very old browsers fall back to the mouse and touch paths below. */
    var usePointer = typeof window.PointerEvent === "function" && typeof pad.setPointerCapture === "function";

    if (usePointer) {
      pad.addEventListener("pointerdown", begin);
      pad.addEventListener("pointermove", extend);
      pad.addEventListener("pointerup", finish);
      pad.addEventListener("pointercancel", finish);
      window.addEventListener("pointerup", finish);
    } else {
      pad.addEventListener("mousedown", begin);
      pad.addEventListener("mousemove", extend);
      window.addEventListener("mouseup", finish);
      pad.addEventListener("touchstart", function (e) {
        if (e.touches && e.touches.length > 1) return;
        begin(e.touches && e.touches[0] ? e.touches[0] : e);
      }, { passive: false });
      pad.addEventListener("touchmove", function (e) {
        extend(e.touches && e.touches[0] ? e.touches[0] : e);
      }, { passive: false });
      pad.addEventListener("touchend", finish);
      pad.addEventListener("touchcancel", finish);
    }

    /* A pointer that leaves the page (alt-tab, a native dialog) must not
       leave the pad stuck mid-stroke. */
    window.addEventListener("blur", finish);

    /* Rotation or a wider window: re-fit, then repaint the ink to scale. */
    var refit = function () {
      if (drawing) return;
      fitPad(pad);
      drawSignature(pad, state.signature, false);
    };
    window.addEventListener("resize", refit);
    window.addEventListener("orientationchange", refit);

    if (clear) {
      clear.addEventListener("click", function () {
        state.signature.strokes = [];
        stroke = null;
        lastPoint = null;
        drawSignature(pad, state.signature, false);
        var empty = $("onb-sig-empty");
        if (empty) { empty.hidden = false; empty.classList.remove("is-error"); }
        wrap.classList.remove("has-ink");
      });
    }

    if (undo) {
      undo.addEventListener("click", function () {
        state.signature.strokes.pop();
        drawSignature(pad, state.signature, false);
        var empty = $("onb-sig-empty");
        if (empty) empty.hidden = state.signature.strokes.length > 0;
        if (!state.signature.strokes.length) wrap.classList.remove("has-ink");
      });
    }

    /* Keyboard: space or enter clears a stray mark, backspace undoes. */
    pad.addEventListener("keydown", function (e) {
      if (e.key === "Backspace" && undo) { e.preventDefault(); undo.click(); }
    });

    state.signature.points = pointCount;

    var next = $("onb-id-next");
    if (!next) return;
    var back = $("onb-id-back");
    if (back) back.addEventListener("click", function () { go(signedIn() ? "agree" : "account"); });

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
    var verifiedByCode = !!(state.account && state.account.channel === "sms");
    doc.profile.accountMethod = verifiedByCode ? "phone" : (state.account && state.account.channel === "phone" ? "phone-password" : "email");
    /* A phone number is only "verified" when a code actually confirmed it.
       Until SMS is connected it stays pending, and the dashboard says so. */
    doc.profile.phoneVerified = verifiedByCode;
    if (verifiedByCode) doc.profile.phoneVerifiedAt = new Date().toISOString();
    doc.profile.smsAvailable = smsReady();
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
      /* Ask what the account service can do before offering it anything. */
      if (cloudOn() && CLOUD.auth && CLOUD.auth.loadCapabilities) {
        CLOUD.auth.loadCapabilities().then(function () {
          if (state.stage === "account") render();
        });
      }
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
