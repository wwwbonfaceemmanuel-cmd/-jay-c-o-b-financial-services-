/* =====================================================================
   Customer authentication
   Register · login (email or phone) · OTP verification · password reset
   · lockout protection · session expiry · MFA bridge

   Every credential is checked by Supabase Auth: passwords, one-time codes
   and recovery links. There is no demonstration account, no fixed code and
   no browser-side password store in this build.
   ===================================================================== */
(function () {
  "use strict";

  var UI = window.JCOB_UI;
  var DATA = window.JCOB_DATA;
  var F = window.JCOB_FINANCE;
  var CLOUD = window.JCOB_CLOUD;
  var PENDING_KEY = "jcob_pending_verify";

  function $(id) { return document.getElementById(id); }
  function page() {
    return document.body.getAttribute("data-auth-page") || "";
  }

  function cloudOn() { return !!(CLOUD && CLOUD.enabled); }

  function isEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); }
  function digits(v) { return String(v || "").replace(/[^\d]/g, ""); }
  function isPhone(v) { var d = digits(v); return d.length >= 9 && d.length <= 15; }
  function isIdentifier(v) { return isEmail(v) || isPhone(v); }

  function passwordScore(pw) {
    var score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return Math.min(score, 5);
  }

  function bindPwMeter(inputId, meterId, hintId) {
    var input = $(inputId), meter = $(meterId), hint = $(hintId);
    if (!input || !meter) return;
    input.addEventListener("input", function () {
      var s = passwordScore(input.value);
      var colors = ["#c3ccd8", "#a83b34", "#2a7fc9", "#2a76b8", "#318d7a", "#177764"];
      meter.querySelectorAll("i").forEach(function (bar, i) {
        bar.style.background = i < s ? colors[s] : "var(--line)";
      });
      if (hint) {
        var labels = ["", "Very weak", "Weak", "Fair", "Good", "Strong"];
        hint.textContent = input.value ? "Strength: " + labels[s] + " · use 8+ characters with a number and a symbol" : "Use at least 8 characters, including a number and a symbol.";
      }
    });
  }

  function fieldError(input, message) {
    var field = input.closest(".field");
    if (!field) return;
    field.classList.add("has-error");
    var msg = field.querySelector(".error-msg");
    if (msg) msg.textContent = message;
  }
  function clearErrors(form) {
    form.querySelectorAll(".field").forEach(function (f) { f.classList.remove("has-error"); });
  }

  /* ---------------- Registration ---------------- */
  function initRegister() {
    var form = $("register-form");
    if (!form) return;
    bindPwMeter("reg-password", "pw-meter", "pw-hint");

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      clearErrors(form);
      var first = $("reg-first").value.trim();
      var last = $("reg-last").value.trim();
      var dob = $("reg-dob").value;
      var gender = $("reg-gender").value;
      var nid = $("reg-nid").value.trim();
      var phone = $("reg-phone").value.trim();
      var email = $("reg-email").value.trim();
      var pw = $("reg-password").value;
      var pw2 = $("reg-confirm").value;
      var consent = $("reg-consent").checked;
      var ok = true;

      if (!first) { fieldError($("reg-first"), "Enter your first name."); ok = false; }
      if (!last) { fieldError($("reg-last"), "Enter your surname."); ok = false; }
      if (!dob) { fieldError($("reg-dob"), "Enter your date of birth."); ok = false; }
      else {
        var age = (Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000);
        if (age < 18) { fieldError($("reg-dob"), "You must be at least 18 years old to register."); ok = false; }
      }
      if (!nid || nid.length < 6) { fieldError($("reg-nid"), "Enter a valid national ID number."); ok = false; }
      if (!isPhone(phone)) { fieldError($("reg-phone"), "Enter a valid Malawian phone number."); ok = false; }
      if (!isEmail(email)) { fieldError($("reg-email"), "Enter a valid email address."); ok = false; }
      if (passwordScore(pw) < 3) { fieldError($("reg-password"), "Choose a stronger password (8+ characters, letters and numbers)."); ok = false; }
      if (pw !== pw2) { fieldError($("reg-confirm"), "Passwords do not match."); ok = false; }
      if (!consent) { fieldError($("reg-consent"), "You must accept the terms and privacy policy."); ok = false; }
      if (!ok) return;

      var account = {
        firstName: first, lastName: last, fullName: first + " " + last,
        dob: dob, gender: gender, nid: nid, phone: phone, email: email,
        marketing: $("reg-marketing").checked
      };

      if (!cloudOn()) {
        var offline = $("register-status");
        if (offline) {
          offline.className = "form-status is-visible form-status--error";
          offline.textContent = "Account creation is unavailable right now — the registration service cannot be reached. Please call +265 999 123 456 or try again later.";
        }
        return;
      }

      {
        var status = $("register-status");
        if (status) {
          status.className = "form-status is-visible";
          status.textContent = "Creating your secure account…";
        }
        CLOUD.auth.signUp({
          email: email, password: pw, fullName: account.fullName,
          phone: phone, nid: nid, dob: dob, gender: gender
        }).then(function (res) {
          if (res && res.needsConfirmation) {
            if (status) {
              status.className = "form-status is-visible";
              status.textContent = "Check " + email + " for the confirmation link, then sign in. Your account is created but not yet active.";
            }
            UI.toast({ title: "Confirm your email", message: "We sent a confirmation link to " + email + ".", type: "info" });
            return;
          }
          UI.toast({ title: "Account created", message: "Welcome to JAY C O B Financial Services.", type: "success" });
          window.location.href = "dashboard.html";
        }).catch(function (err) {
          var message = String((err && err.message) || "Registration failed");
          if (/already|exists|registered/i.test(message)) message = "An account with that email already exists. Sign in instead, or reset your password.";
          if (status) {
            status.className = "form-status is-visible form-status--error";
            status.textContent = message;
          }
          UI.toast({ title: "Could not create the account", message: message, type: "danger" });
        });
        return;
      }
    });
  }

  /* ---------------- Verify (OTP) ---------------- */
  function initVerify() {
    var form = $("verify-form");
    if (!form) return;
    var inputs = Array.prototype.slice.call(document.querySelectorAll(".otp-row input"));
    var status = $("verify-status");
    var pending = null;
    try { pending = JSON.parse(sessionStorage.getItem(PENDING_KEY) || "null"); } catch (e) {}

    var target = $("verify-target");
    if (target && pending && pending.identifier) target.textContent = pending.identifier;

    inputs.forEach(function (input, i) {
      input.addEventListener("input", function () {
        input.value = input.value.replace(/\D/g, "").slice(0, 1);
        if (input.value && inputs[i + 1]) inputs[i + 1].focus();
      });
      input.addEventListener("keydown", function (e) {
        if (e.key === "Backspace" && !input.value && inputs[i - 1]) inputs[i - 1].focus();
      });
      input.addEventListener("paste", function (e) {
        var text = (e.clipboardData || window.clipboardData).getData("text").replace(/\D/g, "");
        if (!text) return;
        e.preventDefault();
        text.split("").slice(0, inputs.length).forEach(function (ch, idx) {
          if (inputs[idx]) inputs[idx].value = ch;
        });
        inputs[Math.min(text.length, inputs.length - 1)].focus();
      });
    });

    var countdown = $("resend-timer");
    var resendBtn = $("resend-btn");
    var seconds = 45;
    if (resendBtn) resendBtn.disabled = true;
    var tick = setInterval(function () {
      if (!countdown) return;
      seconds--;
      if (seconds <= 0) {
        clearInterval(tick);
        countdown.textContent = "You can now request a new code.";
        if (resendBtn) resendBtn.disabled = false;
      } else {
        countdown.textContent = "You can request a new code in " + seconds + "s.";
      }
    }, 1000);

    function codeTarget() {
      return pending && pending.identifier && isEmail(pending.identifier) ? pending.identifier : "";
    }

    function requestCode(silent) {
      var target = codeTarget();
      if (!cloudOn()) {
        UI.toast({ title: "Unavailable", message: "Verification codes are sent by the account service, which cannot be reached right now.", type: "danger" });
        return;
      }
      if (!target) {
        UI.toast({ title: "Email needed", message: "Sign in with your email address first, then request a code.", type: "danger" });
        return;
      }
      CLOUD.auth.sendOtp(target).then(function () {
        UI.toast({ title: "Code sent", message: "A fresh 6-digit code is on its way to " + target + ".", type: "info" });
      }).catch(function (err) {
        UI.toast({ title: "Could not send a code", message: String((err && err.message) || "Please try again."), type: "danger" });
      });
      if (!silent) {
        seconds = 45;
        if (resendBtn) resendBtn.disabled = true;
      }
    }

    if (resendBtn) {
      resendBtn.addEventListener("click", function () { requestCode(false); });
    }

    /* First arrival: ask for a code if the page was opened without one. */
    if (pending && pending.identifier && cloudOn()) requestCode(true);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var code = inputs.map(function (i) { return i.value; }).join("");
      if (code.length !== 6) {
        status.className = "form-status is-visible form-status--error";
        status.textContent = "Enter all six digits of your verification code.";
        return;
      }
      if (!cloudOn()) {
        status.className = "form-status is-visible form-status--error";
        status.textContent = "Verification is unavailable — this deployment is not connected to the account service. Please call +265 999 123 456.";
        return;
      }
      if (!codeTarget()) {
        status.className = "form-status is-visible form-status--error";
        status.textContent = "We do not know which account to verify. Sign in again with your email address.";
        return;
      }

      status.className = "form-status is-visible";
      status.textContent = "Checking your code…";

      CLOUD.auth.verifyOtp(codeTarget(), code).then(function (res) {
        var profile = (res && res.profile) || (CLOUD.auth.profile && CLOUD.auth.profile()) || {};
        var name = profile.full_name || (pending && pending.name) || "";
        var email = profile.email || codeTarget();
        UI.setSession({
          authenticated: true,
          name: name,
          identifier: email,
          email: email,
          account: profile.account_no || "",
          cloud: true
        }, true);

        try { sessionStorage.removeItem(PENDING_KEY); } catch (err) {}
        DATA.notify("Account verification", "Account verified",
          "Your email address is verified. Welcome to JAY C O B Financial Services.", "In-app + Email");
        status.className = "form-status is-visible";
        status.textContent = "Verified. Redirecting to your dashboard…";
        setTimeout(function () { window.location.href = "dashboard.html"; }, 700);
      }).catch(function (err) {
        var message = String((err && err.message) || "");
        if (/expired|invalid|incorrect/i.test(message)) message = "That code is incorrect or has expired. Request a new one.";
        status.className = "form-status is-visible form-status--error";
        status.textContent = message || "We could not verify that code. Request a new one.";
        inputs.forEach(function (i) { i.value = ""; });
        if (inputs[0]) inputs[0].focus();
      });
    });
  }

  /* ---------------- Login ---------------- */
  function initLogin() {
    var form = $("login-form");
    if (!form) return;
    var idInput = $("login-id");
    var pwInput = $("login-password");
    var status = $("login-status");
    var note = $("lockout-note");

    var attempts = UI.tryCount();
    if (attempts.lockedUntil && attempts.lockedUntil > Date.now()) {
      lockOut(new Date(attempts.lockedUntil));
    }

    function lockOut(until) {
      var remaining = Math.ceil((until - Date.now()) / 1000);
      if (note) {
        note.hidden = false;
        note.textContent = "Too many failed attempts. Your account is temporarily locked. Try again in " +
          Math.ceil(remaining / 60) + " minute(s), or reset your password.";
      }
      form.querySelectorAll("input, button[type=submit]").forEach(function (el) { el.disabled = true; });
      var timer = setInterval(function () {
        remaining = Math.ceil((until - Date.now()) / 1000);
        if (remaining <= 0) {
          clearInterval(timer);
          UI.clearTryCount();
          if (note) note.hidden = true;
          form.querySelectorAll("input, button[type=submit]").forEach(function (el) { el.disabled = false; });
        } else if (note) {
          note.textContent = "Account locked. Try again in " + Math.ceil(remaining / 60) + " minute(s).";
        }
      }, 1000);
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      clearErrors(form);
      var identifier = idInput.value.trim();
      var password = pwInput.value;
      var ok = true;

      if (!isIdentifier(identifier)) { fieldError(idInput, "Enter a valid email address or phone number."); ok = false; }
      if (!password) { fieldError(pwInput, "Enter your password."); ok = false; }
      if (!ok) return;

      /* Supabase Auth is the only authority: the password, the lockout
         and the session all come from the account service. */
      if (!cloudOn()) {
        status.className = "form-status is-visible form-status--error";
        status.textContent = "Sign-in is unavailable — this deployment is not connected to the authentication service. Please call +265 999 123 456.";
        return;
      }

      if (!isEmail(identifier)) {
        fieldError(idInput, "Use the email address on your account. Phone sign-in is enabled once SMS is configured.");
        return;
      }

      status.className = "form-status is-visible";
      status.textContent = "Signing you in…";

      CLOUD.auth.signIn(identifier, password).then(function (res) {
        UI.clearTryCount();
        var profile = (res && res.profile) || {};
        var name = profile.full_name || identifier;
        var remember = $("login-remember") && $("login-remember").checked;
        UI.setSession({
          authenticated: true,
          name: name,
          identifier: identifier,
          email: identifier,
          account: profile.account_no || "",
          cloud: true
        }, remember);
        status.textContent = "Signed in. Opening your dashboard…";
        var next = new URLSearchParams(location.search).get("next");
        setTimeout(function () {
          ToastOnLogin(name);
          window.location.href = next && next.indexOf("dashboard") >= 0 ? next : "dashboard.html";
        }, 350);
      }).catch(function (err) {
        var message = String((err && err.message) || "");
        if (/invalid|credentials|grant/i.test(message)) message = "That email and password do not match an account.";
        else if (/confirm/i.test(message)) message = "Please confirm your email address before signing in.";
        var tries = UI.tryCount();
        tries.count = (tries.count || 0) + 1;
        if (tries.count >= 5) {
          tries.lockedUntil = Date.now() + 5 * 60 * 1000;
          UI.setTryCount(tries);
          UI.toast({ title: "Account locked", message: "Five failed attempts. Locked for 5 minutes.", type: "danger" });
          lockOut(new Date(tries.lockedUntil));
          return;
        }
        UI.setTryCount(tries);
        status.className = "form-status is-visible form-status--error";
        status.textContent = message + " " + (5 - tries.count) + " attempt(s) remaining before a temporary lock.";
      });
    });

    function ToastOnLogin(name) {
      UI.toast({ title: "Welcome back, " + name.split(" ")[0], message: "You are signed in securely. Session expires after 30 minutes of inactivity.", type: "success" });
    }

    /* OTP sign-in shortcut */
    var otpBtn = $("login-otp");
    if (otpBtn) {
      otpBtn.addEventListener("click", function () {
        var identifier = idInput.value.trim();
        if (!isIdentifier(identifier)) {
          fieldError(idInput, "Enter your email or phone number first.");
          return;
        }
        if (!cloudOn()) {
          fieldError(idInput, "One-time codes need the account service. Please call +265 999 123 456.");
          return;
        }
        if (!isEmail(identifier)) {
          fieldError(idInput, "Use the email address on your account to receive a code.");
          return;
        }
        try {
          sessionStorage.setItem(PENDING_KEY, JSON.stringify({ mode: "login", identifier: identifier }));
        } catch (err) {}
        CLOUD.auth.sendOtp(identifier).then(function () {
          window.location.href = "verify.html";
        }).catch(function (err) {
          fieldError(idInput, String((err && err.message) || "We could not send a code to that address."));
        });
      });
    }
  }

  /* ---------------- Forgot password ---------------- */
  function initForgot() {
    var form = $("forgot-form");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var input = $("forgot-id");
      var status = $("forgot-status");
      clearErrors(form);
      if (!isIdentifier(input.value.trim())) {
        fieldError(input, "Enter a valid email address or phone number.");
        return;
      }
      status.className = "form-status is-visible";
      status.textContent = "Sending a single-use reset link…";

      if (cloudOn() && isEmail(input.value.trim())) {
        CLOUD.auth.recover(input.value.trim()).then(function () {
          status.innerHTML = 'If an account matches <strong>' + input.value.trim() +
            '</strong>, a reset link has been sent by email and expires in 30 minutes.';
        }).catch(function () {
          status.className = "form-status is-visible form-status--error";
          status.textContent = "We could not send the reset link just now. Please try again.";
        });
        return;
      }

      status.className = "form-status is-visible form-status--error";
      status.textContent = "Password recovery is unavailable — this deployment is not connected to the authentication service. Please call +265 999 123 456.";
    });
  }

  /* ---------------- Reset password ---------------- */
  function initReset() {
    var form = $("reset-form");
    if (!form) return;
    bindPwMeter("reset-password", "pw-meter", "pw-hint");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      clearErrors(form);
      var pw = $("reset-password").value;
      var pw2 = $("reset-confirm").value;
      var status = $("reset-status");
      var ok = true;
      if (passwordScore(pw) < 3) { fieldError($("reset-password"), "Choose a stronger password (8+ characters, letters and numbers)."); ok = false; }
      if (pw !== pw2) { fieldError($("reset-confirm"), "Passwords do not match."); ok = false; }
      if (!ok) return;

      if (!cloudOn() || !CLOUD.auth.adoptedLink()) {
        status.className = "form-status is-visible form-status--error";
        status.textContent = "Open the reset link we emailed you, then choose your new password. The link expires after 30 minutes.";
        return;
      }

      status.className = "form-status is-visible";
      status.textContent = "Saving your new password…";

      CLOUD.auth.updatePassword(pw).then(function () {
        UI.clearTryCount();
        status.className = "form-status is-visible";
        status.textContent = "Password updated. Redirecting to sign in…";
        setTimeout(function () { window.location.href = "login.html?reset=1"; }, 900);
      }).catch(function (err) {
        var message = String((err && err.message) || "");
        if (/expired|invalid|token/i.test(message)) message = "That reset link has expired. Request a new one.";
        status.className = "form-status is-visible form-status--error";
        status.textContent = message || "We could not save that password. Request a new reset link.";
      });
    });
  }

  /* ---------------- Page bootstrap ---------------- */
  document.addEventListener("DOMContentLoaded", function () {
    var p = page();
    if (p === "register") initRegister();
    if (p === "login") initLogin();
    if (p === "verify") initVerify();
    if (p === "forgot") initForgot();
    if (p === "reset") initReset();

    /* Password reveal is handled once, by JCOB_UI.initPasswordToggles(). */

    if (p === "login" && new URLSearchParams(location.search).get("reset") === "1") {
      UI.toast({ title: "Password updated", message: "Sign in with your new password.", type: "success" });
    }

    /* Sign-out links anywhere in the auth area */
    document.querySelectorAll("[data-logout]").forEach(function (el) {
      el.addEventListener("click", function (e) {
        e.preventDefault();
        if (cloudOn()) CLOUD.auth.signOut();
        UI.clearSession();
        UI.toast({ title: "Signed out", message: "You have been signed out securely.", type: "success" });
        setTimeout(function () { window.location.href = "login.html"; }, 450);
      });
    });
  });
})();
