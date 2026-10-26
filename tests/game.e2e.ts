import { test } from "@e2e-dev/web";
import { expect } from "e2e";
import { checkA11y } from "./support/axe";
import { copiedText, fakeClipboard } from "./support/clipboard";
import { answerRight, playToRung, questionHeading, RIGHT_ANSWER, rightAnswerKey, startGame } from "./support/game";

test("a whole Game won by keyboard alone, from Start to Share and Play again", async ({ app, screen, browser }) => {
  await fakeClipboard(browser);
  await app.open("/tv/fixture-sitcom");
  await screen.getByRole("button", "Start").focus();
  await browser.keyboard.press("Enter");
  await expect(browser).toHaveURL("/game");
  await expect(questionHeading(screen, 1)).toBeFocused();
  // A single Title's Game has no Title label.
  await expect(browser.locator(".game__title-label")).toHaveCount(0);
  await checkA11y(browser, "Game");

  // Esc backs out of Final answer, and focus comes back.
  await browser.keyboard.press(await rightAnswerKey(screen));
  await expect(screen.getByRole("dialog", /: is that your final answer\?$/)).toBeVisible();
  await expect(screen.getByRole("button", "Final answer")).toBeFocused();
  await checkA11y(browser, "Final answer dialog");
  await browser.keyboard.press("Escape");
  await expect(screen.getByRole("dialog")).toHaveCount(0);
  await expect(questionHeading(screen, 1)).toBeFocused();

  // 1–4 pick as well as A–D.
  const letter = await rightAnswerKey(screen);
  await browser.keyboard.press(String("abcd".indexOf(letter) + 1));
  await browser.keyboard.press("Enter");
  await expect(screen.getByRole("status")).toHaveText("✓ Correct! You've banked $100.");
  await expect(screen.getByRole("button", RIGHT_ANSWER)).toHaveAccessibleName(/, ✓ correct$/);
  await expect(screen.getByRole("button", "Next question")).toBeFocused();
  await checkA11y(browser, "Reveal, right");
  await browser.keyboard.press("Enter");

  for (let rung = 2; rung <= 15; rung++) {
    await expect(questionHeading(screen, rung)).toBeFocused();
    await browser.keyboard.press(await rightAnswerKey(screen));
    await expect(screen.getByRole("button", "Final answer")).toBeFocused();
    await browser.keyboard.press("Enter");
    await browser.keyboard.press("Enter");
  }

  await expect(screen.getByRole("heading", "You won the million!", { level: 1 })).toBeFocused();
  await expect(screen.getByText("$1,000,000", { exact: true })).toBeVisible();
  await expect(screen.getByText("🎉 New personal best!")).toBeVisible();
  await expect(browser.locator("pre")).toHaveText(
    [
      "Trivia · Fixture Sitcom",
      "$1,000,000 🏆",
      "✅✅✅✅✅ ✅✅✅✅✅ ✅✅✅✅✅",
      "No lifelines",
      "trivia.jonstuebe.workers.dev/tv/fixture-sitcom",
    ].join("\n"),
  );
  await checkA11y(browser, "Game over, won");

  // Share, by keyboard. A desktop copies the Share result and says "Copied".
  await browser.keyboard.press("Tab");
  await expect(screen.getByRole("button", "Share")).toBeFocused();
  await browser.keyboard.press("Enter");
  await expect(screen.getByRole("status")).toHaveText("Copied");
  expect(await copiedText(browser)).toBe(
    [
      "Trivia · Fixture Sitcom",
      "$1,000,000 🏆",
      "✅✅✅✅✅ ✅✅✅✅✅ ✅✅✅✅✅",
      "No lifelines",
      "trivia.jonstuebe.workers.dev/tv/fixture-sitcom",
    ].join("\n"),
  );
  await checkA11y(browser, "Game over, copied");

  await browser.keyboard.press("Tab");
  await expect(screen.getByRole("button", "Play again")).toBeFocused();
  await browser.keyboard.press("Enter");
  // Fixture Sitcom has 4 Questions per Tier, so one Game leaves too few new ones.
  await expect(browser).toHaveURL("/tv/fixture-sitcom");
  await expect(screen.getByRole("heading", "Not enough new questions", { level: 1 })).toBeFocused();
  await screen.getByRole("button", "Play anyway").focus();
  await browser.keyboard.press("Enter");
  await expect(questionHeading(screen, 1)).toBeFocused();
  await screen.getByRole("button", "Main menu").tap();
  await expect(screen.getByRole("region", "Personal bests")).toContainText("Fixture Sitcom: $1,000,000");
});

test("a miss in a Mixed game drops to the Safe level, by mouse", async ({ screen, browser }) => {
  await startGame(browser, screen, "/movies");
  // Each Question in a Mixed game says which Title it's from.
  await expect(screen.getByText(/^Fixture (Heist|Saga)$/)).toBeVisible();
  // Desktop: the Ladder is a column, the answers 2×2.
  await expect(browser.locator('.ladder [aria-current="step"]')).toContainText("$100");
  expect(
    await browser.evaluate(() => getComputedStyle(document.querySelector(".answers")!).gridTemplateColumns.split(" ").length),
  ).toBe(2);
  await checkA11y(browser, "Game, Mixed");

  await playToRung(screen, 1, 12);
  await expect(browser.locator('.ladder [aria-current="step"]')).toContainText("$125,000");
  await expect(browser.locator(".ladder .is-safe")).toHaveCount(2);

  await screen.getByRole("button", /Wrong answer A/).tap();
  await screen.getByRole("button", "Final answer").tap();
  await expect(screen.getByRole("status")).toHaveText(
    "✗ Wrong. The correct answer was Right answer. You drop to $32,000.",
  );
  await expect(screen.getByRole("button", /Wrong answer A/)).toHaveAccessibleName(/, ✗ your answer, wrong$/);
  await expect(screen.getByRole("button", RIGHT_ANSWER)).toHaveAccessibleName(/, ✓ correct$/);
  await checkA11y(browser, "Reveal, wrong");
  await screen.getByRole("button", "See result").tap();

  await expect(screen.getByRole("heading", "Wrong answer. Game over.", { level: 1 })).toBeFocused();
  await expect(screen.getByText("The correct answer was: Right answer")).toBeVisible();
  await expect(screen.getByText("$32,000", { exact: true })).toBeVisible();
  await expect(browser.locator("pre")).toContainText("Trivia · Movies");
  await expect(browser.locator("pre")).toContainText("✅✅✅✅✅ ✅✅✅✅✅ ✅❌");
  await checkA11y(browser, "Game over, missed");

  await screen.getByRole("button", "Main menu").tap();
  await expect(browser).toHaveURL("/");
});

test("a walk away on a phone, by touch, keeps the winnings", async ({ screen, browser }) => {
  await browser.setViewport({ width: 390, height: 844 });
  await startGame(browser, screen, "/tv/fixture-sitcom");
  // Phone: the Ladder is a strip centred on the current Rung, the answers one column.
  await expect(browser.locator('.ladder-strip [aria-current="step"]')).toContainText("$100");
  expect(
    await browser.evaluate(() => getComputedStyle(document.querySelector(".answers")!).gridTemplateColumns.split(" ").length),
  ).toBe(1);
  // Walk away isn't offered on question 1.
  await expect(screen.getByRole("button", /^Walk away/)).toHaveCount(0);
  await checkA11y(browser, "Game, phone");

  await answerRight(screen);
  await playToRung(screen, 2, 3);
  await expect(browser.locator('.ladder-strip [aria-current="step"]')).toContainText("$300");

  await screen.getByRole("button", "Walk away with $200").tap();
  await expect(screen.getByRole("dialog", "Walk away with $200?")).toBeVisible();
  await checkA11y(browser, "Walk away dialog");
  await screen.getByRole("button", "Cancel").tap();
  await expect(screen.getByRole("dialog")).toHaveCount(0);

  // W asks again; it still confirms.
  await browser.keyboard.press("w");
  await screen.getByRole("button", "Walk away").tap();

  await expect(screen.getByRole("heading", "You walked away.", { level: 1 })).toBeFocused();
  await expect(screen.getByText("$200", { exact: true })).toBeVisible();
  await expect(browser.locator("pre")).toContainText("✅✅🚶");
  await checkA11y(browser, "Game over, walked away");

  await screen.getByRole("button", "Play again").tap();
  // Questions 1–3 were all Tier 1, which has 4: too few new ones for another Game.
  await expect(browser).toHaveURL("/tv/fixture-sitcom");
  await expect(screen.getByRole("heading", "Not enough new questions", { level: 1 })).toBeFocused();
  await screen.getByRole("button", "Play anyway").tap();
  await expect(questionHeading(screen, 1)).toBeFocused();
  await screen.getByRole("button", "Main menu").tap();
  await expect(screen.getByRole("region", "Personal bests")).toContainText("Fixture Sitcom: $200");
});

test("the Game screen with no Game in the tab goes to the Main menu", async ({ app, browser }) => {
  await app.open("/game");
  await expect(browser).toHaveURL("/");
});

test("a finished Game doesn't come back: Back from Game over, then forward to the Game screen, goes to the Main menu", async ({
  app,
  screen,
  browser,
}) => {
  await startGame(browser, screen, "/tv/fixture-sitcom");
  await playToRung(screen, 1, 2);
  await screen.getByRole("button", "Walk away with $100").tap();
  await screen.getByRole("button", "Walk away").tap();
  await expect(screen.getByRole("heading", "You walked away.", { level: 1 })).toBeFocused();

  await app.back();
  await expect(browser).toHaveURL("/tv/fixture-sitcom");
  await browser.evaluate(() => {
    history.forward();
    return null;
  });
  await expect(browser).toHaveURL("/");
  await expect(screen.getByRole("heading", "Trivia", { level: 1 })).toBeFocused();
});
