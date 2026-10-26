import { test } from "@e2e-dev/web";
import { expect } from "e2e";
import { checkA11y } from "./support/axe";
import { questionHeading } from "./support/game";

// The fixture build lists Fixture Heist and Fixture Saga under Movies (so
// "All Movies (mixed)" too), only Fixture Sitcom under TV, and leaves Fixture
// Drama out: it can't fill a Game.

test("the Topic picker lists each Category's Titles and goes up one level with Back, by keyboard", async ({
  app,
  screen,
  browser,
}) => {
  await app.open("/topics");
  await expect(screen.getByRole("heading", "Pick a topic", { level: 1 })).toBeFocused();
  await expect(screen.getByRole("link", /^General/)).toBeVisible();
  await expect(screen.getByRole("link", "TV Shows")).toBeVisible();

  // General, TV Shows, then Movies.
  await browser.keyboard.press("Tab");
  await browser.keyboard.press("Tab");
  await browser.keyboard.press("Tab");
  await expect(screen.getByRole("link", "Movies")).toBeFocused();
  await browser.keyboard.press("Enter");

  await expect(browser).toHaveURL(/\/topics\?category=movies$/);
  await expect(screen.getByRole("heading", "Movies", { level: 1 })).toBeFocused();
  await expect(screen.getByRole("link", "All Movies (mixed)")).toBeVisible();
  await expect(screen.getByRole("link", "Fixture Heist")).toBeVisible();
  await expect(screen.getByRole("link", "Fixture Saga")).toBeVisible();
  await checkA11y(browser, "Topic picker: Movies");

  await screen.getByRole("button", "← Back").focus();
  await browser.keyboard.press("Enter");
  await expect(screen.getByRole("heading", "Pick a topic", { level: 1 })).toBeFocused();

  await screen.getByRole("link", "TV Shows").focus();
  await browser.keyboard.press("Enter");
  await expect(screen.getByRole("heading", "TV Shows", { level: 1 })).toBeFocused();
  await expect(screen.getByRole("link", /\(mixed\)/)).toHaveCount(0);
  await expect(screen.getByRole("link", /Fixture Drama/)).toHaveCount(0);
  await checkA11y(browser, "Topic picker: TV Shows");

  await screen.getByRole("link", "Fixture Sitcom").focus();
  await browser.keyboard.press("Enter");
  await expect(browser).toHaveURL("/tv/fixture-sitcom");
  await expect(screen.getByRole("heading", "Ready to play: Fixture Sitcom", { level: 1 })).toBeFocused();
  await expect(screen.getByText("Personal best: none yet")).toBeVisible();
  await checkA11y(browser, "Ready to play");

  // Back from Ready goes to the picker at the Topic's Category.
  await screen.getByRole("button", "← Back").focus();
  await browser.keyboard.press("Enter");
  await expect(screen.getByRole("heading", "TV Shows", { level: 1 })).toBeFocused();
  await screen.getByRole("button", "← Back").tap();
  await screen.getByRole("button", "← Back").tap();
  await expect(screen.getByRole("heading", "Trivia", { level: 1 })).toBeFocused();
});

test("a link to a Topic the picker doesn't list goes to the Topic picker", async ({ app, screen, browser }) => {
  await app.open("/tv/fixture-drama");
  await expect(browser).toHaveURL("/topics");
  await expect(screen.getByRole("heading", "Pick a topic", { level: 1 })).toBeVisible();

  // TV has one listed Title, so no Mixed game.
  await app.open("/tv");
  await expect(browser).toHaveURL("/topics");
});

test("a Topic runs out, shows Not enough new questions, and Reset this topic makes it playable again", async ({
  app,
  screen,
  browser,
}) => {
  // The fixture General has exactly one Game's worth, so starting one uses it up.
  await app.open("/topics");
  await screen.getByRole("link", /^General/).tap();
  await expect(screen.getByRole("heading", "Ready to play: General", { level: 1 })).toBeFocused();
  await screen.getByRole("button", "Start").tap();
  await expect(browser).toHaveURL("/game");

  await app.open("/general");
  await expect(screen.getByRole("heading", "Not enough new questions", { level: 1 })).toBeFocused();
  await expect(screen.getByText("There aren't enough new General questions left for a whole game.")).toBeVisible();
  await checkA11y(browser, "Not enough new questions");

  // Play anyway starts the Game straight away, repeats and all.
  await screen.getByRole("button", "Play anyway").focus();
  await browser.keyboard.press("Enter");
  await expect(browser).toHaveURL("/game");
  await expect(questionHeading(screen, 1)).toBeFocused();

  await app.open("/general");
  await screen.getByRole("button", "Reset this topic").focus();
  await browser.keyboard.press("Enter");
  await expect(screen.getByRole("heading", "Ready to play: General", { level: 1 })).toBeFocused();
  await expect(screen.getByRole("status")).toHaveText("Seen questions for General cleared.");
  await checkA11y(browser, "Ready to play after Reset this topic");

  // Playable again: still Ready on a fresh visit.
  await app.open("/general");
  await expect(screen.getByRole("heading", "Ready to play: General", { level: 1 })).toBeVisible();
});
