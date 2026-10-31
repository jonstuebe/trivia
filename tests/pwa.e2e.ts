import { test } from "@e2e-dev/web";
import { expect } from "e2e";
import { checkA11y } from "./support/axe";
import { answerRight, playToRung, questionHeading, startGame } from "./support/game";
import {
  checkForUpdate,
  installabilityErrors,
  serveNewDeploy,
  setOffline,
  updateWaiting,
  waitForServiceWorker,
} from "./support/offline";

// A type alias, not an interface, so it counts as JSON for `evaluate`.
type Manifest = {
  name: string;
  short_name: string;
  start_url: string;
  display: string;
  theme_color: string;
  background_color: string;
  icons: { src: string; sizes: string; purpose: string }[];
};

test("the app has a manifest and Chromium sees it as installable", async ({ app, screen, browser }) => {
  await app.open("/");
  await expect(screen.getByRole("heading", "Trivia", { level: 1 })).toBeVisible();

  const manifest = await browser.evaluate<Manifest>(async () => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    return (await fetch(link!.href)).json();
  });
  expect(manifest).toMatchObject({
    name: "Trivia",
    short_name: "Trivia",
    start_url: "/",
    display: "standalone",
    theme_color: "#05061a",
    background_color: "#05061a",
  });
  expect(manifest.icons.map((icon) => `${icon.sizes} ${icon.purpose}`)).toEqual([
    "192x192 any",
    "512x512 any",
    "512x512 maskable",
  ]);
  // Every icon the manifest names is there to download.
  const statuses = await browser.evaluate<number[], string[]>(
    (srcs) => Promise.all(srcs.map(async (src) => (await fetch(src)).status)),
    manifest.icons.map((icon) => icon.src),
  );
  expect(statuses).toEqual([200, 200, 200]);

  await waitForServiceWorker(browser);
  expect(await installabilityErrors()).toEqual([]);
});

test("the service worker registers on the first visit and takes control of the page", async ({
  app,
  screen,
  browser,
}) => {
  await app.open("/");
  await expect(screen.getByRole("heading", "Trivia", { level: 1 })).toBeVisible();
  await waitForServiceWorker(browser);
  const scope = await browser.evaluate<string>(async () => (await navigator.serviceWorker.ready).scope);
  expect(new URL(scope).pathname).toBe("/");
});

test("after one online visit to the Main menu, a deep link to a Topic never opened plays a whole Game offline", async ({
  app,
  screen,
  browser,
}) => {
  // Online, the Main menu only: no Topic file has been asked for yet.
  await app.open("/");
  await expect(screen.getByRole("heading", "Trivia", { level: 1 })).toBeVisible();
  await waitForServiceWorker(browser);

  await setOffline(true);
  expect(await browser.evaluate<boolean>(() => navigator.onLine)).toBe(false);

  // A deep link, opened cold, from Ready to play to Game over.
  await startGame(browser, screen, "/tv/fixture-sitcom");
  await playToRung(screen, 1, 15);
  await answerRight(screen);
  await expect(screen.getByRole("heading", "You won the million!", { level: 1 })).toBeFocused();

  // The other routes open offline too.
  await browser.goto("/privacy");
  await expect(screen.getByRole("heading", "Privacy", { level: 1 })).toBeVisible();
  // A mixed Movies Game draws on both Movies Titles' files, neither opened yet.
  await startGame(browser, screen, "/movies");
  await expect(questionHeading(screen, 1)).toBeVisible();
});

test("a new deploy shows the Update toast, off the Game screen, and Refresh switches to it", async ({
  app,
  screen,
  browser,
}) => {
  await app.open("/");
  await expect(screen.getByRole("heading", "Trivia", { level: 1 })).toBeVisible();
  await waitForServiceWorker(browser);
  const toast = screen.getByRole("complementary", "Update");
  await expect(toast).toHaveCount(0);

  // Mid-Game when the new version lands: no toast over the answers.
  const restore = serveNewDeploy();
  try {
    await startGame(browser, screen, "/tv/fixture-sitcom");
    await checkForUpdate(browser);
    await expect.poll(() => updateWaiting(browser)).toBe(true);
    await expect(toast).toHaveCount(0);

    // Back on the Main menu it shows; Later hides it.
    await screen.getByRole("button", "Main menu").tap();
    await expect(toast).toBeVisible();
    await expect(toast).toContainText("A new version of Trivia is ready.");
    await checkA11y(browser, "Main menu, with the Update toast");
    await screen.getByRole("button", "Later").tap();
    await expect(toast).toHaveCount(0);

    // A reload with the new worker still waiting shows it again; Refresh hands
    // over to the new worker and reloads, with the Saved game kept.
    await browser.reload();
    await expect(toast).toBeVisible();
    // A mark on this page, so the reload shows: a fresh page doesn't have it.
    await browser.evaluate<null>(() => {
      (window as { beforeRefresh?: boolean }).beforeRefresh = true;
      return null;
    });
    await screen.getByRole("button", "Refresh").tap();
    await expect
      .poll(() => browser.evaluate<boolean>(() => (window as { beforeRefresh?: boolean }).beforeRefresh === undefined))
      .toBe(true);
    await expect(screen.getByRole("heading", "Trivia", { level: 1 })).toBeVisible();
    expect(await updateWaiting(browser)).toBe(false);
    await expect(toast).toHaveCount(0);
    await expect(screen.getByRole("button", "Resume: Fixture Sitcom, question 1")).toBeVisible();
  } finally {
    restore();
  }
});
