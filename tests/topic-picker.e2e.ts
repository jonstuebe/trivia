import { test } from "@e2e-dev/web";
import { expect } from "e2e";
import { checkA11y } from "./support/axe";
import { questionHeading } from "./support/game";

// The fixture build lists Fixture Heist and Fixture Saga under Movies (so
// "All Movies (mixed)" too), only Fixture Sitcom under TV, and leaves Fixture
// Drama out: it can't fill a Game.

test("the Topic picker lists each Category's Titles and Back returns to the Categories, by keyboard", async ({
  app,
  screen,
  browser,
}) => {
  await app.open("/topics");
  await expect(screen.getByRole("heading", "Pick a topic", { level: 1 })).toBeFocused();
  await expect(screen.getByText("That topic isn't available.")).toHaveCount(0);
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

test("a shared Title link opens that Title's Ready to play", async ({ app, screen, browser }) => {
  await app.open("/movies/fixture-heist");
  await expect(browser).toHaveURL("/movies/fixture-heist");
  await expect(screen.getByRole("heading", "Ready to play: Fixture Heist", { level: 1 })).toBeFocused();
  await expect(screen.getByRole("button", "Start")).toBeVisible();
  await checkA11y(browser, "Ready to play, from a shared link");
});

test("a bad Title link opens the Topic picker with a note, gone after a refresh", async ({ app, screen, browser }) => {
  // An unknown Title, and one below the picker's threshold.
  for (const path of ["/tv/not-a-show", "/tv/fixture-drama"]) {
    await app.open(path);
    await expect(browser).toHaveURL("/topics");
    await expect(screen.getByRole("heading", "Pick a topic", { level: 1 })).toBeFocused();
    await expect(screen.getByRole("status")).toHaveText("That topic isn't available.");
  }
  // Read out with the heading as it takes focus.
  await expect(screen.getByRole("heading", "Pick a topic", { level: 1 })).toHaveAttribute("aria-describedby", /.+/);
  await checkA11y(browser, "Topic picker with the unavailable note");

  await browser.reload();
  await expect(screen.getByRole("heading", "Pick a topic", { level: 1 })).toBeFocused();
  await expect(screen.getByText("That topic isn't available.")).toHaveCount(0);
});

test("a bad Category link opens the Topic picker with a note, gone after moving on", async ({
  app,
  screen,
  browser,
}) => {
  // An unknown Category, and one with too few listed Titles for a Mixed game.
  for (const path of ["/books", "/tv"]) {
    await app.open(path);
    await expect(browser).toHaveURL("/topics");
    await expect(screen.getByRole("heading", "Pick a topic", { level: 1 })).toBeFocused();
    await expect(screen.getByRole("status")).toHaveText("That topic isn't available.");
  }
  await checkA11y(browser, "Topic picker with the unavailable note");

  await screen.getByRole("link", "Movies").tap();
  await expect(screen.getByRole("heading", "Movies", { level: 1 })).toBeFocused();
  await expect(screen.getByText("That topic isn't available.")).toHaveCount(0);
  await screen.getByRole("button", "← Back").tap();
  await expect(screen.getByRole("heading", "Pick a topic", { level: 1 })).toBeFocused();
  await expect(screen.getByText("That topic isn't available.")).toHaveCount(0);

  // Browser Back to the picker's first visit doesn't bring it back either.
  await app.back();
  await expect(screen.getByRole("heading", "Movies", { level: 1 })).toBeVisible();
  await app.back();
  await expect(screen.getByRole("heading", "Pick a topic", { level: 1 })).toBeVisible();
  await expect(screen.getByText("That topic isn't available.")).toHaveCount(0);
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
