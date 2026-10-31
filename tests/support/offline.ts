import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
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

/**
 * Makes the server look like it has a new deploy: `sw.js` in the fixture
 * build gets one byte more, so the browser's next update check installs it as
 * a new worker, which then waits. (A Playwright route can't stand in: the
 * browser fetches a worker update past it.) `vite preview` reads files afresh
 * on each request. Call the returned function to put the file back.
 */
export function serveNewDeploy(): () => void {
  const file = join("dist-fixtures", "sw.js");
  const original = readFileSync(file, "utf8");
  writeFileSync(file, `${original}\n// a new deploy\n`);
  return () => writeFileSync(file, original);
}

/** Asks the browser to look for a new service worker now, as it does on a page load. */
export async function checkForUpdate(browser: Browser): Promise<void> {
  await browser.evaluate<null>(async () => {
    await (await navigator.serviceWorker.ready).update();
    return null;
  });
}

/** Whether a new worker has installed and is waiting to take over. */
export async function updateWaiting(browser: Browser): Promise<boolean> {
  return browser.evaluate<boolean>(async () => !!(await navigator.serviceWorker.getRegistration())?.waiting);
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
