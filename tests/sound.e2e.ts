import type { Browser } from "@e2e-dev/web";
import { test } from "@e2e-dev/web";
import { expect, type Screen } from "e2e";
import { checkA11y } from "./support/axe";
import { answerRight, questionHeading, RIGHT_ANSWER, startGame } from "./support/game";

/** The Sound switch, on every screen that has one. */
const soundSwitch = (screen: Screen) => screen.getByRole("switch", "Sound");

/** Checks the Sound switch says `on` or `off`, in words and to screen readers. */
async function expectSound(screen: Screen, state: "on" | "off"): Promise<void> {
  await expect(soundSwitch(screen)).toHaveText(`Sound: ${state}`);
  await expect(soundSwitch(screen)).toHaveAttribute("aria-checked", state === "on" ? "true" : "false");
}

/**
 * What the sound engine shows on `<html>`, since the journeys can't hear:
 * `sound` ("on" or "off"), `soundCues` (how many cues have played) and
 * `soundLastCue`.
 */
function soundData(browser: Browser, key: "sound" | "soundCues" | "soundLastCue"): Promise<string | null> {
  return browser.evaluate<string | null, string>((name) => document.documentElement.dataset[name] ?? null, key);
}

test("the mute set on one screen holds on the others and after a reload, and M toggles it", async ({
  app,
  screen,
  browser,
}) => {
  await app.open("/");
  await expectSound(screen, "on");
  await soundSwitch(screen).tap();
  await expectSound(screen, "off");
  await checkA11y(browser, "Main menu, muted");

  await browser.reload();
  await expectSound(screen, "off");

  await browser.goto("/tv/fixture-sitcom");
  await expectSound(screen, "off");
  await soundSwitch(screen).focus();
  await browser.keyboard.press("Enter");
  await expectSound(screen, "on");
  await browser.keyboard.press("Space");
  await expectSound(screen, "off");
  await checkA11y(browser, "Ready to play, muted");

  await screen.getByRole("button", "Start").tap();
  await expect(questionHeading(screen, 1)).toBeFocused();
  await expectSound(screen, "off");
  await checkA11y(browser, "Game, muted");

  await browser.keyboard.press("m");
  await expectSound(screen, "on");
  await browser.keyboard.press("M");
  await expectSound(screen, "off");

  await browser.reload();
  await expect(questionHeading(screen, 1)).toBeFocused();
  await expectSound(screen, "off");

  // M is in the list of keys.
  await browser.keyboard.press("?");
  const keys = screen.getByRole("dialog", "Keys");
  await expect(keys.getByText("M", { exact: true })).toBeVisible();
  await expect(keys.getByText("Sound on or off", { exact: true })).toBeVisible();
  await browser.keyboard.press("Escape");
  await expect(screen.getByRole("dialog")).toHaveCount(0);
});

test("Final answer plays the lock-in sting, and a muted page plays nothing", async ({ screen, browser }) => {
  await startGame(browser, screen, "/tv/fixture-sitcom");
  expect(await soundData(browser, "sound")).toBe("on");

  await screen.getByRole("button", RIGHT_ANSWER).tap();
  await screen.getByRole("button", "Final answer").tap();
  await expect.poll(() => soundData(browser, "soundCues")).toBe("1");
  expect(await soundData(browser, "soundLastCue")).toBe("lockIn");
  await screen.getByRole("button", "Next question").tap();
  await expect(questionHeading(screen, 2)).toBeFocused();

  await soundSwitch(screen).tap();
  await expectSound(screen, "off");
  await answerRight(screen);
  await expect(questionHeading(screen, 3)).toBeFocused();
  expect(await soundData(browser, "sound")).toBe("off");
  expect(await soundData(browser, "soundCues")).toBe("1");
});
