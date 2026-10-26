import type { Browser } from "@e2e-dev/web";
import { test } from "@e2e-dev/web";
import { expect, type Screen } from "e2e";
import { checkA11y } from "./support/axe";
import { answerRight, playToRung, questionHeading, RIGHT_ANSWER, startGame } from "./support/game";

/** The Sound switch, on every screen that has one. */
const soundSwitch = (screen: Screen) => screen.getByRole("switch", "Sound");

/** Checks the Sound switch says `on` or `off`, in words and to screen readers. */
async function expectSound(screen: Screen, state: "on" | "off"): Promise<void> {
  await expect(soundSwitch(screen)).toHaveText(`Sound: ${state}`);
  await expect(soundSwitch(screen)).toHaveAttribute("aria-checked", state === "on" ? "true" : "false");
}

/**
 * What the sound engine shows on `<html>`, since the journeys can't hear:
 * `sound` ("on" or "off"), `soundCues` (how many cues have played),
 * `soundLastCue` and `soundBed` (the bed playing).
 */
function soundData(browser: Browser, key: "sound" | "soundCues" | "soundLastCue" | "soundBed"): Promise<string | null> {
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

/** The bed playing, or null for none. */
const bedNow = (browser: Browser) => soundData(browser, "soundBed");

test("the suspense bed climbs by Tier, draws out through the reveal wait, carries on through a Lifeline, and stops on Walk away", async ({
  screen,
  browser,
}) => {
  await startGame(browser, screen, "/tv/fixture-sitcom");
  await expect.poll(() => bedNow(browser)).toBe("tier1");

  // Through a Lifeline's dialog, and after it, the bed carries on.
  await screen.getByRole("button", "Phone a Friend").tap();
  await expect(screen.getByRole("dialog", "Who do you call?")).toBeVisible();
  expect(await bedNow(browser)).toBe("tier1");
  await screen.getByRole("button", "Pop-culture fan").tap();
  await expect(screen.getByRole("dialog")).toHaveCount(0);
  expect(await bedNow(browser)).toBe("tier1");

  await playToRung(screen, 1, 4);
  expect(await bedNow(browser)).toBe("tier2");

  // The real reveal wait (2s at Tier 2): the locked-in bed plays across it, then gives way to the reveal.
  await browser.evaluate(() => {
    localStorage.removeItem("trivia.fixtures.instantReveal");
    return null;
  });
  await screen.getByRole("button", RIGHT_ANSWER).tap();
  await screen.getByRole("button", "Final answer").tap();
  await expect(screen.getByText(/ is locked in\. The answer is coming…$/)).toBeFocused();
  expect(await bedNow(browser)).toBe("tier2LockedIn");
  await expect(screen.getByRole("button", "Next question")).toBeFocused();
  expect(await bedNow(browser)).toBeNull();
  await screen.getByRole("button", "Next question").tap();
  await expect(questionHeading(screen, 5)).toBeFocused();
  expect(await bedNow(browser)).toBe("tier2");

  // Muting stops it at once; unmuting brings back the same Tier.
  await soundSwitch(screen).tap();
  await expectSound(screen, "off");
  expect(await bedNow(browser)).toBeNull();
  await soundSwitch(screen).tap();
  await expectSound(screen, "on");
  expect(await bedNow(browser)).toBe("tier2");

  await screen.getByRole("button", "Walk away with $500").tap();
  await expect(screen.getByRole("dialog", "Walk away with $500?")).toBeVisible();
  expect(await bedNow(browser)).toBe("tier2");
  await screen.getByRole("button", "Walk away").tap();
  await expect(screen.getByRole("heading", "You walked away.", { level: 1 })).toBeFocused();
  expect(await bedNow(browser)).toBeNull();
});

test("the bed stops on leaving the Game for the Main menu, and on a wrong answer's Game over", async ({ screen, browser }) => {
  await startGame(browser, screen, "/tv/fixture-sitcom");
  await expect.poll(() => bedNow(browser)).toBe("tier1");
  await screen.getByRole("button", "Main menu").tap();
  await expect(screen.getByRole("button", "Resume: Fixture Sitcom, question 1")).toBeVisible();
  expect(await bedNow(browser)).toBeNull();

  await screen.getByRole("button", "Resume: Fixture Sitcom, question 1").tap();
  await expect(questionHeading(screen, 1)).toBeFocused();
  expect(await bedNow(browser)).toBe("tier1");
  await screen.getByRole("button", /Wrong answer A/).tap();
  await screen.getByRole("button", "Final answer").tap();
  await screen.getByRole("button", "See result").tap();
  await expect(screen.getByRole("heading", "Wrong answer. Game over.", { level: 1 })).toBeFocused();
  expect(await bedNow(browser)).toBeNull();
});
