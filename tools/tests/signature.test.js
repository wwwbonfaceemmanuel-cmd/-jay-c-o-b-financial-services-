/* Signature pad — the ink follows the pointer, not a polyline.
   -----------------------------------------------------------------------
   The complaint was that a signature came out as straight lines and angles:
   the pad joined whatever points it happened to sample. These checks walk
   the real application funnel to the signature step, then drive the pad
   with a smooth, curved trace and inspect both what was stored and what
   was painted.

   What must be true:
     • every point the pointer visits is recorded, in order, un-rounded
       beyond a tenth of a pixel — the trace is not thinned or straightened
     • the line is painted with curves through those points (Bézier, from
       a Catmull-Rom spline), not with lineTo chords
     • the canvas is sized for the device pixel ratio, so a thin stroke
       stays thin on a retina screen
     • undo removes one stroke, clear removes all of them, and an empty pad
       is still refused by the step
   ========================================================================= */
"use strict";

const { reporter, makeDom, ready, sleep } = require("./lib");

const t = reporter("[signature pad — freehand ink]");

function click(w, el) {
  el.dispatchEvent(new w.MouseEvent("click", { bubbles: true, cancelable: true }));
}

function fakeScroll(w, el, { scrollHeight = 2400, clientHeight = 500 } = {}) {
  Object.defineProperty(el, "scrollHeight", { value: scrollHeight, configurable: true });
  Object.defineProperty(el, "clientHeight", { value: clientHeight, configurable: true });
  Object.defineProperty(el, "scrollTop", { value: 0, writable: true, configurable: true });
}

function scrollTo(w, el, top) {
  el.scrollTop = top;
  el.dispatchEvent(new w.Event("scroll"));
}

function testPhone() {
  const tail = String(Date.now()).slice(-6);
  return "0999 " + tail.slice(0, 3) + " " + tail.slice(3);
}

/* A recording 2D context: jsdom has no canvas, and we want to see the path
   commands rather than pixels. */
function stubContext() {
  const ops = [];
  const state = { lineWidth: 0, strokeStyle: "", lineCap: "", lineJoin: "", fillStyle: "" };
  const args = (a) => Array.prototype.slice.call(a);
  const ctx = {
    ops,
    setTransform(...a) { ops.push(["setTransform", ...a]); },
    clearRect(...a) { ops.push(["clearRect", ...a]); },
    beginPath() { ops.push(["beginPath"]); },
    moveTo(...a) { ops.push(["moveTo", ...a]); },
    lineTo(...a) { ops.push(["lineTo", ...a]); },
    bezierCurveTo(...a) { ops.push(["bezierCurveTo", ...a]); },
    quadraticCurveTo(...a) { ops.push(["quadraticCurveTo", ...a]); },
    arc(...a) { ops.push(["arc", ...a]); },
    stroke() { ops.push(["stroke"]); },
    fill() { ops.push(["fill"]); }
  };
  Object.defineProperty(ctx, "lineWidth", { get: () => state.lineWidth, set: (v) => { state.lineWidth = v; } });
  Object.defineProperty(ctx, "strokeStyle", { get: () => state.strokeStyle, set: (v) => { state.strokeStyle = v; } });
  Object.defineProperty(ctx, "fillStyle", { get: () => state.fillStyle, set: (v) => { state.fillStyle = v; } });
  Object.defineProperty(ctx, "lineCap", { get: () => state.lineCap, set: (v) => { state.lineCap = v; } });
  Object.defineProperty(ctx, "lineJoin", { get: () => state.lineJoin, set: (v) => { state.lineJoin = v; } });
  return ctx;
}

(async () => {
  const { dom, errors } = makeDom("apply.html");
  await ready(dom, 900);
  const w = dom.window;
  const d = w.document;

  /* ---- reach the signature step through the real funnel ---- */
  const terms = d.getElementById("onb-terms");
  fakeScroll(w, terms);
  scrollTo(w, terms, 2000);
  click(w, d.getElementById("onb-terms-next"));
  await sleep(120);
  d.getElementById("onb-agree").checked = true;
  d.getElementById("onb-truth").checked = true;
  click(w, d.getElementById("onb-agree-next"));
  await sleep(150);

  const phoneRadio = d.querySelector('input[name="onb-method"][value="phone"]');
  phoneRadio.checked = true;
  phoneRadio.dispatchEvent(new w.Event("change", { bubbles: true }));
  await sleep(60);
  const phone = testPhone();
  d.getElementById("onb-phone").value = phone;
  d.getElementById("onb-password").value = "Chisomo2026";
  d.getElementById("onb-password2").value = "Chisomo2026";
  click(w, d.getElementById("onb-account-next"));
  await sleep(1600);

  const pad = d.getElementById("onb-sig");
  t.ok("the signature step opened", !!pad);
  if (!pad) { process.exit(t.done() ? 0 : 1); }

  d.getElementById("onb-fullname").value = "Chisomo Banda";
  d.getElementById("onb-sig-confirm").checked = true;

  /* an empty pad is refused */
  click(w, d.getElementById("onb-id-next"));
  await sleep(120);
  t.eq("an empty pad is refused", d.getElementById("onb-id-error").hidden, false);

  /* ---- the pad now paints into a canvas we can inspect ---- */
  const ctx = stubContext();
  pad.getContext = () => ctx;

  /* A curved trace, sampled finely — like a hand moving through a loop. */
  const stroke = [];
  for (let i = 0; i <= 40; i++) {
    const a = (i / 40) * Math.PI * 1.6;
    stroke.push([120 + Math.round(Math.cos(a) * (40 + i * 2)), 80 + Math.round(Math.sin(a) * (30 + i))]);
  }

  pad.dispatchEvent(new w.MouseEvent("mousedown", { bubbles: true, clientX: stroke[0][0], clientY: stroke[0][1], button: 0 }));
  for (let i = 1; i < stroke.length; i++) {
    pad.dispatchEvent(new w.MouseEvent("mousemove", { bubbles: true, clientX: stroke[i][0], clientY: stroke[i][1] }));
  }
  w.dispatchEvent(new w.MouseEvent("mouseup", { bubbles: true }));
  await sleep(60);

  const stored = w.JCOB_ONBOARD.state().signature.strokes || [];
  t.eq("one stroke was recorded", stored.length, 1);
  const pts = stored[0] || [];
  t.eq("every sampled point was kept", pts.length, stroke.length);
  const drift = pts.reduce((worst, pt, i) => Math.max(worst, Math.abs(pt.x - stroke[i][0]), Math.abs(pt.y - stroke[i][1])), 0);
  t.ok("the stored trace is the pointer's trace", drift <= 0.1, "worst drift " + drift + "px");

  /* ---- what was painted: curves, not chords ---- */
  const beziers = ctx.ops.filter((o) => o[0] === "bezierCurveTo").length;
  const lines = ctx.ops.filter((o) => o[0] === "lineTo").length;
  t.ok("the stroke is painted with Bézier curves", beziers >= stroke.length - 3, beziers + " curve segments");
  t.eq("no straight-line chords join the samples", lines, 0);
  t.ok("the path starts where the pointer went down",
    ctx.ops.some((o) => o[0] === "moveTo" && Math.abs(o[1] - stroke[0][0]) < 0.2));
  t.ok("the outline is round-capped and joined", ctx.lineCap === "round" && ctx.lineJoin === "round");

  /* the frame shows its signing state */
  t.ok("the pad frame marks progress", d.getElementById("onb-sigpad").classList.contains("has-ink"));

  /* ---- the surface is device-pixel crisp ---- */
  const dpr = Math.min(Math.max(w.devicePixelRatio || 1, 1), 3);
  t.ok("the backing store is scaled for the screen",
    pad.width >= Math.round(w.JCOB_ONBOARD.state().signature.w * dpr) - 1,
    pad.width + " device pixels for " + w.JCOB_ONBOARD.state().signature.w + " css pixels");
  const transform = ctx.ops.filter((o) => o[0] === "setTransform").pop();
  t.ok("the context is scaled by the device ratio", transform && Math.abs(transform[1] - dpr) < 0.01);

  /* ---- undo removes one stroke, clear removes them all ---- */
  const undo = d.getElementById("onb-sig-undo");
  const clear = d.getElementById("onb-sig-clear");
  t.ok("the pad offers undo", !!undo);

  /* second stroke */
  pad.dispatchEvent(new w.MouseEvent("mousedown", { bubbles: true, clientX: 300, clientY: 120, button: 0 }));
  for (let i = 1; i < 8; i++) {
    pad.dispatchEvent(new w.MouseEvent("mousemove", { bubbles: true, clientX: 300 + i * 4, clientY: 120 + i * 3 }));
  }
  w.dispatchEvent(new w.MouseEvent("mouseup", { bubbles: true }));
  await sleep(40);
  t.eq("a second stroke is recorded", w.JCOB_ONBOARD.state().signature.strokes.length, 2);

  click(w, undo);
  await sleep(30);
  t.eq("undo removes the last stroke only", w.JCOB_ONBOARD.state().signature.strokes.length, 1);

  click(w, clear);
  await sleep(30);
  t.eq("clear removes every stroke", w.JCOB_ONBOARD.state().signature.strokes.length, 0);
  t.eq("the empty prompt comes back", d.getElementById("onb-sig-empty").hidden, false);

  /* ---- a redrawn signature still saves through the funnel ---- */
  pad.dispatchEvent(new w.MouseEvent("mousedown", { bubbles: true, clientX: 200, clientY: 100, button: 0 }));
  for (let i = 1; i < 30; i++) {
    pad.dispatchEvent(new w.MouseEvent("mousemove", { bubbles: true, clientX: 200 + i * 5, clientY: 100 + Math.round(Math.sin(i / 3) * 20) }));
  }
  w.dispatchEvent(new w.MouseEvent("mouseup", { bubbles: true }));
  await sleep(40);

  click(w, d.getElementById("onb-id-next"));
  await sleep(1600);
  const saved = w.JCOB_DATA.get().profile.signature;
  t.ok("the signature reaches the profile", !!(saved && saved.strokes.length));
  t.ok("with real points", saved.strokes.reduce((n, s) => n + s.length, 0) >= 12);
  t.ok("and the stored surface is recorded", saved.w > 0 && saved.h > 0);

  t.eq("no script errors", errors.length, 0, errors.slice(0, 2).join(" | "));
  w.close();
  process.exit(t.done() ? 0 : 1);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
