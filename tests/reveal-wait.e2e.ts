import { test, type Browser } from "@e2e-dev/web";
import { expect, type Screen } from "e2e";
import { checkA11y } from "./support/axe";
import { playToRung, questionHeading, RIGHT_ANSWER, startGame } from "./support/game";

/**
 * Turns the test build's instant reveals back off for the rest of this page
 * (tests/support/engine.ts turns them on at every page load), so the next
 * Final answer waits as a player's would.
 */
async function realRevealWait(browser: Browser): Promise<void> {
  await browser.evaluate(() => {
    localStorage.removeItem("trivia.fixtures.instantReveal");
    return null;
  });
}

/** The line shown through the reveal wait. */
function lockedInLine(screen: Screen) {
  return screen.getByText(/ is locked in\. The answer is coming…$/);
}

/** Picks the right answer and confirms it, returning when Final answer was pressed. */
async function lockInRight(screen: Screen): Promise<number> {
  await screen.getByRole("button", RIGHT_ANSWER).tap();
  await screen.getByRole("button", "Final answer").tap();
  return Date.now();
}

/** The animation running on the first element matching `selector`, or "none". */
function animationOf(browser: Browser, selector: string): Promise<string> {
  return browser.evaluate((query: string) => getComputedStyle(document.querySelector(query)!).animationName, selector);
}

/** Waits for the reveal's flash, step and fade to finish, so axe sees the colours they settle on. */
async function motionSettled(browser: Browser): Promise<void> {
  await browser.evaluate(async () => {
    await Promise.allSettled(document.getAnimations().map((animation) => animation.finished));
    return null;
  });
}

test("at Tier 5 the reveal waits about 5s, can't be skipped, then flashes green and steps up the Ladder", async ({
  screen,
  browser,
}) => {
  await startGame(browser, screen, "/tv/fixture-sitcom");
  await playToRung(screen, 1, 13);
  await realRevealWait(browser);

  const lockedAt = await lockInRight(screen);
  await expect(lockedInLine(screen)).toBeFocused();
  await expect(screen.getByRole("button", RIGHT_ANSWER)).toHaveAccessibleName(/: Right answer, locked in$/);
  await expect(browser.locator(".game.is-locked-in")).toHaveCount(1);
  await checkA11y(browser, "Reveal wait");

  // Neither keys nor clicks bring the reveal sooner.
  for (const key of ["Enter", "Escape", "a", "1", "w", "f"]) await browser.keyboard.press(key);
  await browser.evaluate(() => {
    document.querySelector<HTMLButtonElement>(".answer.is-picked")!.click();
    document.body.click();
    return null;
  });
  await expect(lockedInLine(screen)).toBeVisible();
  await expect(screen.getByRole("button", "Next question")).toHaveCount(0);

  await expect(screen.getByRole("button", "Next question")).toBeVisible({ timeout: 10_000 });
  const waited = Date.now() - lockedAt;
  expect(waited, "the Tier 5 reveal wait").toBeGreaterThanOrEqual(4_500);
  expect(waited, "the Tier 5 reveal wait").toBeLessThan(8_000);

  await expect(screen.getByRole("button", "Next question")).toBeFocused();
  await expect(screen.getByRole("status")).toHaveText("✓ Correct! You've banked $250,000.");
  await expect(lockedInLine(screen)).toHaveCount(0);
  await expect(browser.locator(".game.is-locked-in")).toHaveCount(0);
  expect(await animationOf(browser, ".answers.is-won .answer.is-right")).toBe("answer-flash");
  await expect(browser.locator('.ladder.is-stepping [aria-current="step"]')).toContainText("$500,000");
  expect(await animationOf(browser, '.ladder [aria-current="step"]')).toBe("rung-step-up");
  await motionSettled(browser);
  await checkA11y(browser, "Reveal, right, after the wait");

  await screen.getByRole("button", "Next question").tap();
  await expect(questionHeading(screen, 14)).toBeFocused();
});

test("with reduced motion the reveal waits about 1s even at Tier 5, and nothing flashes or slides", async ({
  screen,
  browser,
}) => {
  await browser.emulateMedia({ reducedMotion: "reduce" });
  await startGame(browser, screen, "/tv/fixture-sitcom");
  await playToRung(screen, 1, 13);
  await realRevealWait(browser);

  const lockedAt = await lockInRight(screen);
  await expect(lockedInLine(screen)).toBeFocused();
  await expect(screen.getByRole("button", "Next question")).toBeFocused({ timeout: 5_000 });
  const waited = Date.now() - lockedAt;
  expect(waited, "the reduced-motion reveal wait").toBeGreaterThanOrEqual(800);
  expect(waited, "the reduced-motion reveal wait").toBeLessThan(3_000);

  await expect(screen.getByRole("status")).toHaveText("✓ Correct! You've banked $250,000.");
  expect(await animationOf(browser, ".answers.is-won .answer.is-right")).toBe("none");
  expect(await animationOf(browser, '.ladder [aria-current="step"]')).toBe("none");
  await checkA11y(browser, "Reveal, right, reduced motion");
});

test("a refresh during the reveal wait comes back at the reveal, the answer still locked in", async ({
  screen,
  browser,
}) => {
  await startGame(browser, screen, "/tv/fixture-sitcom");
  await playToRung(screen, 1, 13);
  await realRevealWait(browser);

  await screen.getByRole("button", /Wrong answer A/).tap();
  await screen.getByRole("button", "Final answer").tap();
  await expect(lockedInLine(screen)).toBeFocused();
  await browser.reload();

  await expect(browser).toHaveURL("/game");
  await expect(screen.getByRole("button", "See result")).toBeFocused();
  await expect(screen.getByRole("status")).toHaveText("✗ Wrong. The correct answer was Right answer. You drop to $32,000.");
  await expect(screen.getByRole("button", /Wrong answer A/)).toHaveAccessibleName(/, ✗ your answer, wrong$/);
  await checkA11y(browser, "Reveal, wrong, after a refresh during the wait");

  await screen.getByRole("button", "See result").tap();
  await expect(screen.getByRole("heading", "Wrong answer. Game over.", { level: 1 })).toBeFocused();
});
