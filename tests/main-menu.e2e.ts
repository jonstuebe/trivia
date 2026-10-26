import { test } from "@e2e-dev/web";
import { expect } from "e2e";
import { checkA11y } from "./support/axe";

test("the Main menu opens, passes axe, and Play works with Tab and Enter", async ({ app, screen, browser }) => {
  await app.open("/");
  await expect(screen.getByRole("heading", "Trivia", { level: 1 })).toBeVisible();
  await checkA11y(browser, "Main menu");

  await browser.keyboard.press("Tab");
  await expect(screen.getByRole("button", "Play")).toBeFocused();
  await browser.keyboard.press("Enter");

  await expect(browser).toHaveURL("/topics");
  await expect(screen.getByRole("heading", "Pick a topic", { level: 1 })).toBeFocused();
  await checkA11y(browser, "Topic picker");
});
