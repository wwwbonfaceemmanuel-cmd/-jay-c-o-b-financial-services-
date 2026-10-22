/* =====================================================================
   Admin console — publish and manage LIVE updates
   Demo gate password: admin2026 (stored in sessionStorage only)
   Data is written to localStorage until Supabase is connected.
   ===================================================================== */
(function () {
  "use strict";

  var gate = document.getElementById("admin-gate");
  if (!gate) return;

  var ADMIN_KEY = "jcob_admin_ok";
  var GATE_PASSWORD = "admin2026";

  var consoleWrap = document.getElementById("admin-console");
  var gateForm = document.getElementById("admin-gate-form");
  var gateStatus = document.getElementById("admin-gate-status");
  var gatePassword = document.getElementById("admin-password");

  var form = document.getElementById("post-form");
  var list = document.getElementById("admin-list");
  var titleEl = document.getElementById("post-title");
  var typeEl = document.getElementById("post-type");
  var bodyEl = document.getElementById("post-body");
  var linkEl = document.getElementById("post-link");
  var linkLabelEl = document.getElementById("post-link-label");
  var imageEl = document.getElementById("post-image");
  var customImageEl = document.getElementById("post-image-custom");
  var customImageWrap = document.getElementById("post-image-custom-wrap");
  var animationEl = document.getElementById("post-animation");
  var pinnedEl = document.getElementById("post-pinned");
  var publishedEl = document.getElementById("post-published");
  var submitBtn = document.getElementById("post-submit");
  var cancelBtn = document.getElementById("post-cancel");
  var statusEl = document.getElementById("post-status");
  var formHeading = document.getElementById("post-form-heading");
  var fileEl = document.getElementById("post-image-file");
  var previewWrap = document.getElementById("post-image-preview");
  var previewImg = document.getElementById("post-image-preview-img");
  var clearImageBtn = document.getElementById("post-image-clear");
  var editingId = null;
  var uploadedImage = "";

  function showPreview(src) {
    uploadedImage = src || "";
    if (!previewWrap || !previewImg) return;
    if (uploadedImage) {
      previewImg.src = uploadedImage;
      previewWrap.hidden = false;
    } else {
      previewImg.removeAttribute("src");
      previewWrap.hidden = true;
    }
  }

  /* Downscale uploads so a data URL fits comfortably in localStorage */
  function readImageFile(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error("read failed")); };
      reader.onload = function () {
        var img = new Image();
        img.onerror = function () { resolve(String(reader.result || "")); };
        img.onload = function () {
          try {
            var max = 1200;
            var scale = Math.min(1, max / Math.max(img.width, img.height));
            var canvas = document.createElement("canvas");
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);
            canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL("image/jpeg", 0.82));
          } catch (err) {
            resolve(String(reader.result || ""));
          }
        };
        img.src = String(reader.result || "");
      };
      reader.readAsDataURL(file);
    });
  }

  if (fileEl) {
    fileEl.addEventListener("change", function () {
      var file = fileEl.files && fileEl.files[0];
      if (!file) return;
      if (!/^image\//.test(file.type)) {
        statusEl.className = "form-status is-visible form-status--error";
        statusEl.textContent = "That file is not an image. Choose a JPG, PNG or WebP file.";
        return;
      }
      readImageFile(file).then(function (dataUri) {
        showPreview(dataUri);
        statusEl.className = "form-status is-visible";
        statusEl.textContent = "Image ready: " + file.name + ". It will be attached when you publish.";
      }).catch(function () {
        statusEl.className = "form-status is-visible form-status--error";
        statusEl.textContent = "Could not read that image. Try a smaller file or paste a URL instead.";
      });
    });
  }

  if (clearImageBtn) {
    clearImageBtn.addEventListener("click", function () {
      showPreview("");
      if (fileEl) fileEl.value = "";
    });
  }

  function refresh() {
    if (window.JCOB_LIVE && window.JCOB_LIVE.initFeeds) window.JCOB_LIVE.initFeeds();
    renderList();
  }

  function unlock() {
    gate.hidden = true;
    consoleWrap.hidden = false;
    refresh();
  }

  try {
    if (window.sessionStorage.getItem(ADMIN_KEY) === "1") unlock();
  } catch (e) {}

  if (gateForm) {
    gateForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (gatePassword.value === GATE_PASSWORD) {
        try { window.sessionStorage.setItem(ADMIN_KEY, "1"); } catch (err) {}
        gateStatus.className = "form-status";
        gateStatus.textContent = "";
        unlock();
      } else {
        gateStatus.className = "form-status is-visible form-status--error";
        gateStatus.textContent = "Incorrect password. The demo password is admin2026.";
        gatePassword.focus();
        gatePassword.select();
      }
    });
  }

  /* ---------------- Form helpers ---------------- */
  function imageValue() {
    if (uploadedImage) return uploadedImage;
    if (imageEl.value === "custom") {
      return (customImageEl.value || "").trim();
    }
    return imageEl.value;
  }

  imageEl.addEventListener("change", function () {
    customImageWrap.hidden = imageEl.value !== "custom";
    if (imageEl.value !== "custom" && typeEl.value === "image" && !imageEl.value) {
      imageEl.value = "assets/img/insight-business.jpg";
    }
  });

  function resetForm() {
    editingId = null;
    form.reset();
    typeEl.value = "announcement";
    animationEl.value = "slide";
    pinnedEl.checked = false;
    publishedEl.checked = true;
    imageEl.value = "";
    customImageWrap.hidden = true;
    if (fileEl) fileEl.value = "";
    showPreview("");
    formHeading.textContent = "Publish a live update";
    submitBtn.textContent = "Publish update";
    if (cancelBtn) cancelBtn.hidden = true;
    statusEl.className = "form-status";
    statusEl.textContent = "";
  }

  if (cancelBtn) {
    cancelBtn.hidden = true;
    cancelBtn.addEventListener("click", resetForm);
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var title = titleEl.value.trim();
    var body = bodyEl.value.trim();
    var type = typeEl.value;

    if (!title || !body) {
      statusEl.className = "form-status is-visible form-status--error";
      statusEl.textContent = "A title and a message are required.";
      return;
    }
    if (type === "image" && !imageValue()) {
      statusEl.className = "form-status is-visible form-status--error";
      statusEl.textContent = "Choose or upload an image for a photo update.";
      return;
    }

    var posts = window.JCOB_LIVE.getPosts();
    var payload = {
      id: editingId || "lv-" + Date.now(),
      type: type,
      title: title,
      body: body,
      link: linkEl.value.trim(),
      linkLabel: linkLabelEl.value.trim() || "Read more",
      image: imageValue(),
      animation: animationEl.value,
      pinned: pinnedEl.checked,
      published: publishedEl.checked,
      date: new Date().toISOString()
    };

    if (editingId) {
      posts = posts.map(function (p) { return p.id === editingId ? payload : p; });
    } else {
      posts.unshift(payload);
    }

    if (window.JCOB_LIVE.savePosts(posts)) {
      statusEl.className = "form-status is-visible";
      statusEl.textContent = editingId
        ? "Update saved. The live feed has been refreshed."
        : "Published. The update is now live in the feed and as a notification.";
      resetForm();
      refresh();
    } else {
      statusEl.className = "form-status is-visible form-status--error";
      statusEl.textContent = "Could not save locally. Check that browser storage is enabled.";
    }
  });

  /* ---------------- Admin list ---------------- */
  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function shortDate(iso) {
    var d = new Date(iso);
    return isNaN(d) ? "" : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }

  function renderList() {
    var posts = window.JCOB_LIVE.getPosts();
    if (!posts.length) {
      list.innerHTML = '<p class="text-small text-muted">No updates yet. Publish the first one.</p>';
      return;
    }
    var labels = (window.JCOB_LIVE && window.JCOB_LIVE.typeLabels) || {};
    var anims = (window.JCOB_LIVE && window.JCOB_LIVE.animationLabels) || {};
    list.innerHTML = posts.map(function (p) {
      var type = p.type || "announcement";
      var thumb = p.image
        ? '<img class="admin-thumb" src="' + escapeHtml(p.image) + '" alt="" loading="lazy">'
        : '<span class="admin-type">' + escapeHtml((labels[type] || type).slice(0, 3)) + "</span>";
      return '<div class="admin-item' + (p.published === false ? " is-hidden" : "") + '" data-id="' + escapeHtml(p.id) + '">' +
        thumb +
        "<div><strong>" + escapeHtml(p.title) + "</strong>" +
        '<span class="meta">' + (labels[type] || type) + " · " + shortDate(p.date) + " · " +
        escapeHtml(anims[p.animation] || p.animation || "slide") +
        " · " + (p.published === false ? "draft" : "published") + (p.pinned ? " · pinned" : "") + "</span></div>" +
        '<div class="admin-actions">' +
        '<button class="icon-btn" type="button" data-action="toggle" title="Publish / unpublish">' + (p.published === false ? "◻" : "◼") + "</button>" +
        '<button class="icon-btn" type="button" data-action="edit" title="Edit">✎</button>' +
        '<button class="icon-btn icon-btn--danger" type="button" data-action="delete" title="Delete">✕</button>' +
        "</div></div>";
    }).join("");
  }

  list.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-action]");
    if (!btn) return;
    var item = btn.closest("[data-id]");
    var id = item.getAttribute("data-id");
    var posts = window.JCOB_LIVE.getPosts();
    var post = posts.filter(function (p) { return p.id === id; })[0];
    if (!post) return;

    var action = btn.getAttribute("data-action");
    if (action === "delete") {
      if (!window.confirm("Delete “" + post.title + "”? This cannot be undone.")) return;
      window.JCOB_LIVE.savePosts(posts.filter(function (p) { return p.id !== id; }));
      refresh();
    } else if (action === "toggle") {
      post.published = post.published === false;
      window.JCOB_LIVE.savePosts(posts);
      refresh();
    } else if (action === "edit") {
      editingId = id;
      typeEl.value = post.type || "announcement";
      titleEl.value = post.title || "";
      bodyEl.value = post.body || "";
      linkEl.value = post.link || "";
      linkLabelEl.value = post.linkLabel || "";
      animationEl.value = post.animation || "slide";
      pinnedEl.checked = !!post.pinned;
      publishedEl.checked = post.published !== false;

      var preset = post.image || "";
      if (preset.indexOf("data:") === 0) {
        imageEl.value = "";
        customImageWrap.hidden = true;
        customImageEl.value = "";
        showPreview(preset);
      } else {
        var known = Array.prototype.some.call(imageEl.options, function (o) { return o.value === preset; });
        showPreview("");
        if (preset && !known) {
          imageEl.value = "custom";
          customImageWrap.hidden = false;
          customImageEl.value = preset;
        } else {
          imageEl.value = preset;
          customImageWrap.hidden = true;
          customImageEl.value = "";
        }
      }

      formHeading.textContent = "Edit live update";
      submitBtn.textContent = "Save changes";
      cancelBtn.hidden = false;
      statusEl.className = "form-status";
      statusEl.textContent = "";
      if (form.scrollIntoView) form.scrollIntoView({ behavior: "smooth", block: "center" });
      titleEl.focus({ preventScroll: true });
    }
  });

  var resetBtn = document.getElementById("reset-posts");
  if (resetBtn) {
    resetBtn.addEventListener("click", function () {
      if (!window.confirm("Restore the ten demo updates? Your published changes will be removed.")) return;
      try { window.localStorage.removeItem(window.JCOB_LIVE.KEY); } catch (e) {}
      resetForm();
      refresh();
      statusEl.className = "form-status is-visible";
      statusEl.textContent = "Demo updates restored.";
    });
  }

  renderList();
})();
