import type { Browser } from "@e2e-dev/web";
import { expect, type Screen } from "e2e";

/**
 * Playing a Game in the journeys. Every fixture Question's correct answer is
 * the literal "Right answer" (the wrong ones are "Wrong answer A/B/C"), so a
 * journey can always find it.
 */

/** The correct answer's button, whichever letter it's at. */
export const RIGHT_ANSWER = /Right answer/;

/** The Game's heading for question `rung`: "Question 3 of 15 · for $300". */
export function questionHeading(screen: Screen, rung: number) {
  return screen.getByRole("heading", new RegExp(`^Question ${rung} of 15 · for \\$`), { level: 1 });
}

/** Opens a Topic's Ready to play at `path` and presses Start, landing on question 1. */
export async function startGame(browser: Browser, screen: Screen, path: string): Promise<void> {
  await browser.goto(path);
  await screen.getByRole("button", "Start").tap();
  await expect(browser).toHaveURL("/game");
  await expect(questionHeading(screen, 1)).toBeFocused();
}

/** Answers the question showing right, by mouse or touch: the answer, Final answer, then Next. */
export async function answerRight(screen: Screen): Promise<void> {
  await screen.getByRole("button", RIGHT_ANSWER).tap();
  await screen.getByRole("button", "Final answer").tap();
  await screen.getByRole("button", /^(Next question|See result)$/).tap();
}

/** Answers right from the question showing until question `rung` shows. */
export async function playToRung(screen: Screen, from: number, rung: number): Promise<void> {
  for (let at = from; at < rung; at++) {
    await expect(questionHeading(screen, at)).toBeVisible();
    await answerRight(screen);
  }
  await expect(questionHeading(screen, rung)).toBeFocused();
}

/** The key that picks the correct answer: its letter, lower case. */
export async function rightAnswerKey(screen: Screen): Promise<string> {
  const name = await screen.getByRole("button", RIGHT_ANSWER).getAttribute("aria-label");
  return name!.charAt(0).toLowerCase();
}
