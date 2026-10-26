import { surfaceOf, type Browser } from "@e2e-dev/web";
import { expect } from "e2e";
import { chromium } from "./engine";

/**
 * The PWA in the journeys. The `browser` fixture can't switch the network
 * off or ask Chromium about installing, so these reach the attempt's raw
 * Playwright context through `surfaceOf`. Each attempt gets a fresh context,
 * so a service worker never carries over from one test to the next.
 */

function surface() {
  const live = surfaceOf(chromium);
  if (!live) throw new Error("surfaceOf: the engine in e2e.config.ts isn't a web() handle");
  return live;
}

/** Switches the network off (or back on) for the page and its service worker. */
export async function setOffline(offline: boolean): Promise<void> {
  await surface().context().setOffline(offline);
}

/**
 * Waits for the first visit's service worker to finish downloading the app
 * and take control of the page, so everything is cached from here on.
 */
export async function waitForServiceWorker(browser: Browser): Promise<void> {
  // `ready` resolves once a worker is active, which can still be "activating".
  await expect
    .poll(() => browser.evaluate<string | null>(async () => (await navigator.serviceWorker.ready).active?.state ?? null))
    .toBe("activated");
  await expect
    .poll(() => browser.evaluate<boolean>(() => navigator.serviceWorker.controller !== null))
    .toBe(true);
}

/** Why Chromium won't offer to install the page: empty when it would. */
export async function installabilityErrors(): Promise<string[]> {
  const page = surface().page();
  const cdp = await page.context().newCDPSession(page);
  try {
    const { installabilityErrors } = await cdp.send("Page.getInstallabilityErrors");
    return installabilityErrors.map((error) => error.errorId);
  } finally {
    await cdp.detach();
  }
}
