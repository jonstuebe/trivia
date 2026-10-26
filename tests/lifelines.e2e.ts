import { test } from "@e2e-dev/web";
import { expect } from "e2e";
import { checkA11y } from "./support/axe";
import { answerRight, playToRung, questionHeading, RIGHT_ANSWER, startGame } from "./support/game";

test("every Lifeline in one Game, by keyboard and by mouse, each result readable as text", async ({ screen, browser }) => {
  await startGame(browser, screen, "/tv/fixture-sitcom");

  // The ovals sit above the Question. Switch looks locked through question 10, and S does nothing.
  await expect(screen.getByRole("button", "50:50")).toBeVisible();
  await expect(screen.getByRole("button", "Switch the Question, locked until question 11")).toBeVisible();
  await browser.keyboard.press("s");
  await expect(screen.getByRole("button", "Switch the Question, locked until question 11")).toBeVisible();

  // ? lists every key, the Game's and the Lifelines'.
  await browser.keyboard.press("?");
  const keys = screen.getByRole("dialog", "Keys");
  await expect(keys).toBeVisible();
  for (const row of ["A or 1", "Enter", "Esc", "W", "F", "Q", "P", "S", "M", "?"]) {
    await expect(keys.getByText(row, { exact: true })).toBeVisible();
  }
  await expect(keys.getByText("Phone a Friend", { exact: true })).toBeVisible();
  await checkA11y(browser, "Keys");
  await browser.keyboard.press("Escape");
  await expect(screen.getByRole("dialog")).toHaveCount(0);
  await expect(questionHeading(screen, 1)).toBeFocused();

  await answerRight(screen);
  await playToRung(screen, 2, 11);
  await expect(screen.getByRole("button", "Switch the Question")).toBeEnabled();

  // 50:50 by key: two wrong answers go, from view and from picking.
  await browser.keyboard.press("f");
  await expect(browser.locator(".answers button")).toHaveCount(2);
  await expect(screen.getByRole("button", RIGHT_ANSWER)).toBeVisible();
  await expect(screen.getByText(/^50:50 took away [A-D] and [A-D]\.$/)).toBeAttached();
  await expect(screen.getByRole("button", "50:50, used")).toBeVisible();
  const gone = (await screen.getByText(/^50:50 took away/).textContent())!.match(/away ([A-D])/)![1]!;
  await browser.keyboard.press(gone.toLowerCase());
  await expect(screen.getByRole("dialog")).toHaveCount(0);
  await checkA11y(browser, "50:50");

  // Ask the Audience by mouse: a chart of the two answers left, and the vote in words.
  await screen.getByRole("button", "Ask the Audience").tap();
  await expect(screen.getByText(/^The audience voted [A-D]: \d+%, [A-D]: \d+%\.$/)).toBeVisible();
  await expect(browser.locator(".audience__bar")).toHaveCount(2);
  await expect(screen.getByRole("button", "Ask the Audience, used")).toBeVisible();
  await checkA11y(browser, "Ask the Audience");

  // Phone a Friend: Cancel doesn't spend it; picking a Friend gives their line.
  await browser.keyboard.press("p");
  const pick = screen.getByRole("dialog", "Who do you call?");
  await expect(pick).toBeVisible();
  await expect(screen.getByRole("button", "History buff")).toBeFocused();
  await checkA11y(browser, "Pick a friend");
  await screen.getByRole("button", "Cancel").tap();
  await expect(screen.getByRole("dialog")).toHaveCount(0);
  await expect(screen.getByRole("button", "Phone a Friend")).toBeVisible();
  await screen.getByRole("button", "Phone a Friend").tap();
  await screen.getByRole("button", "Pop-culture fan").tap();
  await expect(screen.getByText(/^Pop-culture fan: “.+”$/)).toBeVisible();
  await expect(screen.getByRole("button", "Phone a Friend, used")).toBeVisible();
  await checkA11y(browser, "Phone a Friend");

  // Switch the Question: a new Question, all four answers back, the audience and the Friend cleared.
  await screen.getByRole("button", "Switch the Question").tap();
  await expect(questionHeading(screen, 11)).toBeFocused();
  await expect(browser.locator(".answers button")).toHaveCount(4);
  await expect(screen.getByText(/^The audience voted/)).toHaveCount(0);
  await expect(screen.getByText(/^Pop-culture fan:/)).toHaveCount(0);
  await expect(screen.getByRole("button", "Switch the Question, used")).toBeVisible();
  await checkA11y(browser, "Switch the Question");

  await playToRung(screen, 11, 15);
  await answerRight(screen);
  await expect(screen.getByRole("heading", "You won the million!", { level: 1 })).toBeFocused();
  await expect(browser.locator("pre")).toContainText("✂️ 👥 📞 🔄");
});
