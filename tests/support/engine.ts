import { web } from "@e2e-dev/web";

/**
 * The journeys' browser, used by e2e.config.ts. It lives in its own module
 * because the runner loads the config file afresh but keeps one instance of
 * each file the config imports, so a journey that imports this gets the very
 * handle the runner drives, and `surfaceOf(chromium)` reaches its live
 * Playwright page and context (see offline.ts).
 *
 * Don't give it `headers`: that makes Playwright block service workers.
 */
export const chromium = web({
  browser: "chromium",
  // axe-core in every document, before the app's scripts, so
  // `checkA11y` (tests/support/axe.ts) can run it on any screen.
  initScripts: [{ path: "node_modules/axe-core/axe.min.js" }],
});
