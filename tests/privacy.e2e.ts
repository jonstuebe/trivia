import { test, type Browser } from "@e2e-dev/web";
import { expect } from "e2e";
import { checkA11y } from "./support/axe";

test("the privacy note opens from the Main menu, passes axe, and leads back", async ({ app, screen, browser }) => {
  await app.open("/");
  await screen.getByRole("link", "Privacy").tap();

  await expect(browser).toHaveURL("/privacy");
  await expect(screen.getByRole("heading", "Privacy", { level: 1 })).toBeFocused();
  await expect(screen.getByText(/anonymous page visits/)).toBeVisible();
  await checkA11y(browser, "Privacy note");

  await screen.getByRole("button", "← Main menu").tap();
  await expect(browser).toHaveURL("/");
  await expect(screen.getByRole("heading", "Trivia", { level: 1 })).toBeFocused();
});

test("/privacy opened directly is the privacy note, not a Category", async ({ app, screen, browser }) => {
  await app.open("/privacy");
  await expect(screen.getByRole("heading", "Privacy", { level: 1 })).toBeVisible();
  await expect(browser).toHaveURL("/privacy");
});

// The test build sets a stand-in site token and loads an empty same-origin
// script in place of Cloudflare's beacon (see src/analytics/beacon.ts), so
// these journeys watch for that request.

/** Counts requests for the test build's beacon stand-in from now on. */
async function watchBeacon(browser: Browser): Promise<{ requests: number }> {
  const seen = { requests: 0 };
  await browser.route("**/fixture-beacon.js", async (route) => {
    seen.requests += 1;
    await route.continue();
  });
  return seen;
}

/** How many beacon `<script>` elements the page has. */
function beaconScripts(browser: Browser): Promise<number> {
  return browser.evaluate<number>(() => document.querySelectorAll("script[data-cf-beacon]").length);
}

test("the beacon loads when the browser sends no privacy signal", async ({ app, screen, browser }) => {
  const beacon = await watchBeacon(browser);
  await app.open("/");
  await expect(screen.getByRole("heading", "Trivia", { level: 1 })).toBeVisible();

  await expect.poll(() => beacon.requests).toBe(1);
  expect(await beaconScripts(browser)).toBe(1);
});

test("the beacon isn't requested when Global Privacy Control is on", async ({ app, screen, browser }) => {
  await browser.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, "globalPrivacyControl", { get: () => true });
  });
  const beacon = await watchBeacon(browser);
  await app.open("/");
  await expect(screen.getByRole("heading", "Trivia", { level: 1 })).toBeVisible();

  // The beacon is added right after the first render, so by the time the Main
  // menu shows, it would be on the page. Load a second screen to be sure.
  await screen.getByRole("button", "Play").tap();
  await expect(screen.getByRole("heading", "Pick a topic", { level: 1 })).toBeVisible();
  expect(await beaconScripts(browser)).toBe(0);
  expect(beacon.requests).toBe(0);
});
