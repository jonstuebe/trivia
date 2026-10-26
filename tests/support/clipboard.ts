import type { Browser } from "@e2e-dev/web";

/**
 * A stand-in clipboard for the journeys. Headless Chromium refuses
 * `navigator.clipboard.writeText` without the clipboard-write permission,
 * and `web()` targets can't grant permissions (`app.permissions` is
 * mobile-only), so the journeys swap in a clipboard that keeps what it's
 * given. Call it before the page opens; it applies from the next navigation.
 */
export async function fakeClipboard(browser: Browser): Promise<void> {
  await browser.addInitScript(() => {
    let copied: string | null = null;
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          copied = text;
        },
        readText: async () => copied ?? "",
      },
    });
  });
}

/** What the page last copied to the stand-in clipboard. */
export function copiedText(browser: Browser): Promise<string> {
  return browser.evaluate(() => navigator.clipboard.readText());
}
