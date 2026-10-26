import { test } from "@e2e-dev/web";
import { expect } from "e2e";
import { checkA11y } from "./support/axe";
import { answerRight, playToRung, questionHeading, RIGHT_ANSWER, startGame } from "./support/game";

test("a refresh mid-Game lands back in it, and one during Final answer comes back with nothing picked", async ({
  screen,
  browser,
}) => {
  await startGame(browser, screen, "/tv/fixture-sitcom");
  await playToRung(screen, 1, 3);

  await browser.reload();
  await expect(browser).toHaveURL("/game");
  await expect(questionHeading(screen, 3)).toBeFocused();
  await expect(screen.getByText("Banked: $200 · Safe: $0")).toBeVisible();
  await checkA11y(browser, "Game, resumed after a refresh");

  await screen.getByRole("button", RIGHT_ANSWER).tap();
  await expect(screen.getByRole("dialog", /: is that your final answer\?$/)).toBeVisible();
  await browser.reload();
  await expect(questionHeading(screen, 3)).toBeFocused();
  await expect(screen.getByRole("dialog")).toHaveCount(0);
  await expect(browser.locator(".answer.is-selected")).toHaveCount(0);

  // And it plays on from there.
  await answerRight(screen);
  await expect(questionHeading(screen, 4)).toBeFocused();
});

test("Main menu pauses the Game, Ready to play warns before discarding it, and Resume continues it", async ({
  screen,
  browser,
}) => {
  await startGame(browser, screen, "/tv/fixture-sitcom");
  await answerRight(screen);
  await expect(questionHeading(screen, 2)).toBeFocused();

  await screen.getByRole("button", "Main menu").tap();
  await expect(browser).toHaveURL("/");
  await expect(screen.getByRole("heading", "Trivia", { level: 1 })).toBeFocused();
  await expect(screen.getByRole("button", "Resume: Fixture Sitcom, question 2")).toBeVisible();
  await checkA11y(browser, "Main menu, with a Saved game");

  // Ready to play says starting would discard it; backing out leaves it.
  await screen.getByRole("button", "Play").tap();
  await screen.getByRole("link", /^General/).tap();
  await expect(screen.getByText("⚠ Starting will discard your saved Fixture Sitcom game (question 2).")).toBeVisible();
  await checkA11y(browser, "Ready to play, with a Saved game");
  await screen.getByRole("button", "← Back").tap();
  await screen.getByRole("button", "← Back").tap();
  await expect(browser).toHaveURL("/");

  await screen.getByRole("button", "Resume: Fixture Sitcom, question 2").tap();
  await expect(browser).toHaveURL("/game");
  await expect(questionHeading(screen, 2)).toBeFocused();
  await expect(screen.getByText("Banked: $100 · Safe: $0")).toBeVisible();
});

test("the Main menu shows the Personal bests, and Reset all asks first, then clears seen Questions only", async ({
  screen,
  browser,
}) => {
  await browser.goto("/");
  await expect(screen.getByText("None yet")).toBeVisible();

  await startGame(browser, screen, "/tv/fixture-sitcom");
  await playToRung(screen, 1, 3);
  await screen.getByRole("button", "Walk away with $200").tap();
  await screen.getByRole("button", "Walk away").tap();
  // Then a Game left in progress.
  await screen.getByRole("button", "Play again").tap();
  await screen.getByRole("button", "Play anyway").tap();
  await screen.getByRole("button", "Start").tap();
  await screen.getByRole("button", "Main menu").tap();

  await expect(screen.getByRole("region", "Personal bests")).toContainText("Fixture Sitcom: $200");

  await screen.getByRole("button", "Reset all seen questions").tap();
  await expect(screen.getByRole("dialog", /^Forget every question you have seen/)).toBeVisible();
  await expect(screen.getByRole("button", "Reset all")).toBeFocused();
  await checkA11y(browser, "Reset all dialog");
  // Focus stays in the dialog.
  await browser.keyboard.press("Tab");
  await expect(screen.getByRole("button", "Cancel")).toBeFocused();
  await browser.keyboard.press("Escape");
  await expect(screen.getByRole("dialog")).toHaveCount(0);
  await expect(screen.getByRole("button", "Reset all seen questions")).toBeFocused();
  expect(await browser.evaluate(() => localStorage.getItem("trivia.seen"))).not.toBeNull();

  await screen.getByRole("button", "Reset all seen questions").tap();
  await screen.getByRole("button", "Reset all").tap();
  await expect(screen.getByRole("status")).toHaveText("All seen questions cleared.");
  expect(await browser.evaluate(() => localStorage.getItem("trivia.seen"))).toBeNull();
  // The Personal bests and the Saved game stay.
  await expect(screen.getByRole("region", "Personal bests")).toContainText("Fixture Sitcom: $200");
  await expect(screen.getByRole("button", "Resume: Fixture Sitcom, question 1")).toBeVisible();
  await checkA11y(browser, "Main menu, after Reset all");

  // Fixture Sitcom has new Questions again.
  await browser.goto("/tv/fixture-sitcom");
  await expect(screen.getByRole("button", "Start")).toBeVisible();
});
