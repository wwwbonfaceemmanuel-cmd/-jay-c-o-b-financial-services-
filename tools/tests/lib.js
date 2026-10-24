/* Shared helpers for the browser suites (jsdom). */
"use strict";

const { JSDOM, VirtualConsole } = require("jsdom");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const BASE = process.env.TEST_BASE || "http://127.0.0.1:8000/";
const API = process.env.TEST_API || "http://127.0.0.1:54321";

/* Console noise that jsdom cannot avoid (no canvas, external fonts). */
const IGNORE = /Not implemented|getContext|canvas|fonts\.googleapis|Could not load link|navigation|css/i;

function reporter(title) {
  const state = { pass: 0, fail: 0, failures: [] };
  console.log("\n" + title);
  return {
    ok(name, cond, extra) {
      if (cond) {
        state.pass += 1;
        console.log("  \u2713 " + name);
      } else {
        state.fail += 1;
        state.failures.push(name + (extra ? " \u2014 " + extra : ""));
        console.log("  \u2717 " + name + (extra ? " \u2014 " + extra : ""));
      }
    },
    eq(name, actual, expected) {
      this.ok(name, actual === expected, "got " + JSON.stringify(actual) + " want " + JSON.stringify(expected));
    },
    done() {
      console.log("\nRESULT " + state.pass + "/" + (state.pass + state.fail));
      if (state.fail) console.log("FAILED: " + state.failures.join("; "));
      return state.fail === 0;
    }
  };
}

function makeDom(file, options) {
  options = options || {};
  const errors = [];
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => {
    const message = String((e && e.message) || e);
    if (!IGNORE.test(message)) errors.push(message);
  });

  const hash = options.hash || "";
  const dom = new JSDOM(fs.readFileSync(path.join(ROOT, file), "utf8"), {
    url: BASE + file + (options.query || "") + hash,
    runScripts: "dangerously",
    resources: "usable",
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(window) {
      /* jsdom has no fetch of its own — route it through node, so the page
         reaches the same origin the browser would. */
      window.fetch = (input, init) => fetch(new URL(input, window.location.href), init);
      /* A suite can stand in front of the network, to prove what the page
         does when a write is refused. */
      if (options.fetch) window.fetch = options.fetch(window.fetch);
      if (options.local) window.localStorage.setItem("jcob_mode", "local");
      Object.keys(options.seed || {}).forEach((key) => {
        try { window.localStorage.setItem(key, options.seed[key]); } catch (e) {}
      });
    }
  });

  return { dom, errors };
}

async function ready(dom, extraMs) {
  await new Promise((resolve) => {
    if (dom.window.document.readyState === "complete") return resolve();
    dom.window.addEventListener("load", resolve);
    setTimeout(resolve, 15000);
  });
  await sleep(extraMs || 450);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function rest(pathname, init) {
  const res = await fetch(API + "/rest/v1/" + pathname, Object.assign({
    headers: { apikey: process.env.TEST_ANON || "dev-anon", "Content-Type": "application/json" }
  }, init || {}));
  const text = await res.text();
  try { return JSON.parse(text); } catch (e) { return text; }
}

module.exports = { ROOT, BASE, API, reporter, makeDom, ready, sleep, rest };
