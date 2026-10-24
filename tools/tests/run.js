/* =====================================================================
   Test runner
   ---------------------------------------------------------------------
   Starts the Supabase stand-in and the site server, runs every suite in a
   child process, then shuts both down. Nothing to install beyond the dev
   dependency:

     npm install
     npm test

   Ports are configurable if the defaults are busy:
     TEST_SITE_PORT=8100 TEST_MOCK_PORT=54400 npm test
   ===================================================================== */
"use strict";

const { spawn, execFile } = require("child_process");
const net = require("net");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const SITE_PORT = Number(process.env.TEST_SITE_PORT || 8099);
const MOCK_PORT = Number(process.env.TEST_MOCK_PORT || 54399);
const ANON = "dev-anon";

/* requests.test.js rewrites records in the stand-in database (it approves a
   name change), so it runs last; theme-generator.test.js publishes and then
   resets the house theme, so it runs before the suites that read settings. */
const SUITES = ["production.test.js", "local.test.js", "cloud.test.js", "apply.test.js", "quotes.test.js", "signature.test.js", "theme.test.js", "theme-generator.test.js", "premium.test.js", "palette.test.js", "header.test.js", "layout.test.js", "check.test.js", "requests.test.js"];

function waitForPort(port, timeoutMs) {
  const deadline = Date.now() + (timeoutMs || 20000);
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const socket = net.connect(port, "127.0.0.1");
      socket.once("connect", () => { socket.destroy(); resolve(); });
      socket.once("error", () => {
        socket.destroy();
        if (Date.now() > deadline) return reject(new Error("port " + port + " never opened"));
        setTimeout(attempt, 200);
      });
    };
    attempt();
  });
}

function runSuite(file, env) {
  return new Promise((resolve) => {
    const child = execFile(process.execPath, [path.join(__dirname, file)], {
      env: Object.assign({}, process.env, env),
      cwd: ROOT,
      maxBuffer: 8 * 1024 * 1024
    }, (err, stdout, stderr) => {
      process.stdout.write(stdout);
      if (stderr && !/ExperimentalWarning|--trace-warnings/.test(stderr)) process.stderr.write(stderr);
      resolve(!err);
    });
    child.on("error", () => resolve(false));
  });
}

(async () => {
  const children = [];
  const cleanup = () => children.forEach((c) => { try { c.kill("SIGTERM"); } catch (e) {} });
  process.on("exit", cleanup);
  process.on("SIGINT", () => { cleanup(); process.exit(130); });

  console.log("Starting the Supabase stand-in on :" + MOCK_PORT + " …");
  const mock = spawn(process.execPath, [path.join(ROOT, "tools/dev/mock-cloud.js")], {
    cwd: ROOT,
    env: Object.assign({}, process.env, { MOCK_PORT: String(MOCK_PORT), MOCK_ANON_KEY: ANON }),
    stdio: "ignore"
  });
  children.push(mock);

  console.log("Starting the site on :" + SITE_PORT + " …");
  const site = spawn(process.execPath, [path.join(ROOT, "server.js")], {
    cwd: ROOT,
    env: Object.assign({}, process.env, {
      PORT: String(SITE_PORT),
      SUPABASE_URL: "http://127.0.0.1:" + MOCK_PORT,
      SUPABASE_ANON_KEY: ANON
    }),
    stdio: "ignore"
  });
  children.push(site);

  try {
    await Promise.all([waitForPort(MOCK_PORT), waitForPort(SITE_PORT)]);
  } catch (err) {
    console.error("Could not start the test servers:", err.message);
    cleanup();
    process.exit(1);
  }

  const env = {
    TEST_BASE: "http://127.0.0.1:" + SITE_PORT + "/",
    TEST_API: "http://127.0.0.1:" + MOCK_PORT,
    TEST_ANON: ANON,
    NODE_NO_WARNINGS: "1"
  };

  let failed = 0;
  for (const suite of SUITES) {
    const ok = await runSuite(suite, env);
    if (!ok) failed += 1;
  }

  cleanup();
  console.log("\n" + (failed ? "FAILED " + failed + " suite(s)" : "All suites passed."));
  process.exit(failed ? 1 : 0);
})();
