import { describe, expect, it } from "vitest";
import { shareOut, type ShareDevice } from "./share-out";

const TEXT = "Trivia · Movies\n$32,000";

/** A device whose share sheet and clipboard record what they were sent. */
function device(overrides: Partial<ShareDevice> & { shareFails?: Error; copyFails?: boolean } = {}) {
  const sent = { sheet: [] as string[], clipboard: [] as string[] };
  const { shareFails, copyFails, ...rest } = overrides;
  const d: ShareDevice = {
    touchPrimary: false,
    share: async ({ text }) => {
      if (shareFails) throw shareFails;
      sent.sheet.push(text);
    },
    copy: async (text) => {
      if (copyFails) throw new Error("NotAllowedError");
      sent.clipboard.push(text);
    },
    ...rest,
  };
  return { d, sent };
}

describe("Share", () => {
  it("on a phone or tablet (Web Share and a touch screen) opens the share sheet with the Share result", async () => {
    const { d, sent } = device({ touchPrimary: true });
    expect(await shareOut(TEXT, d)).toBe("shared");
    expect(sent).toEqual({ sheet: [TEXT], clipboard: [] });
  });

  it("on a desktop with Web Share (Safari, Chrome on Windows) copies instead", async () => {
    const { d, sent } = device({ touchPrimary: false });
    expect(await shareOut(TEXT, d)).toBe("copied");
    expect(sent).toEqual({ sheet: [], clipboard: [TEXT] });
  });

  it("on a touch screen without Web Share copies", async () => {
    const { d, sent } = device({ touchPrimary: true, share: undefined });
    expect(await shareOut(TEXT, d)).toBe("copied");
    expect(sent).toEqual({ sheet: [], clipboard: [TEXT] });
  });

  it("cancelling the share sheet does nothing: no copy, no error", async () => {
    const cancel = new DOMException("Share canceled", "AbortError");
    const { d, sent } = device({ touchPrimary: true, shareFails: cancel });
    expect(await shareOut(TEXT, d)).toBe("cancelled");
    expect(sent).toEqual({ sheet: [], clipboard: [] });
  });

  it("a share sheet that fails for another reason copies instead", async () => {
    const { d, sent } = device({ touchPrimary: true, shareFails: new DOMException("No gesture", "NotAllowedError") });
    expect(await shareOut(TEXT, d)).toBe("copied");
    expect(sent.clipboard).toEqual([TEXT]);
  });

  it("a copy that fails says so, so the text can be selected by hand", async () => {
    expect(await shareOut(TEXT, device({ copyFails: true }).d)).toBe("copyFailed");
  });

  it("with no clipboard at all, the copy fails", async () => {
    expect(await shareOut(TEXT, device({ copy: undefined }).d)).toBe("copyFailed");
  });
});
