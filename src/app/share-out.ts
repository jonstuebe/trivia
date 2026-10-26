/**
 * Share on Game over: sends the Share result out of the tab. Phones and
 * tablets get the system share sheet; everywhere else, desktop Safari and
 * Chrome on Windows included (they have Web Share too), copies the text.
 */

/** What the browser offers for sharing. `browserShareDevice()` reads the real one. */
export interface ShareDevice {
  /** `navigator.share`, when the browser has the Web Share API. */
  share?: (data: { text: string }) => Promise<void>;
  /** Whether the primary input is touch, so this is a phone or tablet. */
  touchPrimary: boolean;
  /** `navigator.clipboard.writeText`, when there is a clipboard. */
  copy?: (text: string) => Promise<void>;
}

/**
 * How a Share went: `shared` (the sheet took it), `cancelled` (the sheet was
 * closed, so nothing happens), `copied`, or `copyFailed` (the text stays on
 * screen to select by hand).
 */
export type ShareOutcome = "shared" | "cancelled" | "copied" | "copyFailed";

export async function shareOut(text: string, device: ShareDevice): Promise<ShareOutcome> {
  if (device.share && device.touchPrimary) {
    try {
      await device.share({ text });
      return "shared";
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return "cancelled";
      // Any other failure (no user gesture, say): copy instead.
    }
  }
  if (!device.copy) return "copyFailed";
  try {
    await device.copy(text);
    return "copied";
  } catch {
    return "copyFailed";
  }
}

/** The browser's share sheet and clipboard, as `shareOut` needs them. */
export function browserShareDevice(): ShareDevice {
  return {
    share: typeof navigator.share === "function" ? (data) => navigator.share(data) : undefined,
    touchPrimary: matchMedia("(pointer: coarse)").matches,
    copy: navigator.clipboard ? (text) => navigator.clipboard.writeText(text) : undefined,
  };
}
