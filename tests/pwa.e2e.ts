import { test } from "@e2e-dev/web";
import { expect } from "e2e";
import { answerRight, playToRung, questionHeading, startGame } from "./support/game";
import { installabilityErrors, setOffline, waitForServiceWorker } from "./support/offline";

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
