import { web } from "@e2e-dev/web";
import { INSTANT_REVEAL_KEY } from "../../src/content/fixture-mode";

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
  // Then instant reveals (INSTANT_REVEAL_KEY in src/content/fixture-mode.ts),
  // so journeys that climb the Ladder skip the reveal wait. Set again on every
  // page load; `realRevealWait` (game.ts) clears it to time the real wait.
  // Page source rather than a function, so it can carry the key: a function
  // is sent to the page as its text, without what it closes over. A document
  // without storage (about:blank) has no reveal to wait for.
  initScripts: [
    { path: "node_modules/axe-core/axe.min.js" },
    `try { localStorage.setItem(${JSON.stringify(INSTANT_REVEAL_KEY)}, "on"); } catch {}`,
  ],
});
