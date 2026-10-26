import { describe, expect, it } from "vitest";
import { shareOut, type ShareDevice } from "./share-out";

const TEXT = "Trivia · Movies\n$32,000";

/** A device whose share sheet and clipboard record what they were sent. */
function recordingDevice(overrides: Partial<ShareDevice> & { shareFails?: Error; copyFails?: boolean } = {}) {
  const sent = { sheet: [] as string[], clipboard: [] as string[] };
  const { shareFails, copyFails, ...rest } = overrides;
  const device: ShareDevice = {
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
  return { device, sent };
}

describe("Share", () => {
  it("on a phone or tablet (Web Share and a touch screen) opens the share sheet with the Share result", async () => {
    const { device, sent } = recordingDevice({ touchPrimary: true });
    expect(await shareOut(TEXT, device)).toBe("shared");
    expect(sent).toEqual({ sheet: [TEXT], clipboard: [] });
  });

  it("on a desktop with Web Share (Safari, Chrome on Windows) copies instead", async () => {
    const { device, sent } = recordingDevice({ touchPrimary: false });
    expect(await shareOut(TEXT, device)).toBe("copied");
    expect(sent).toEqual({ sheet: [], clipboard: [TEXT] });
  });

  it("on a touch screen without Web Share copies", async () => {
    const { device, sent } = recordingDevice({ touchPrimary: true, share: undefined });
    expect(await shareOut(TEXT, device)).toBe("copied");
    expect(sent).toEqual({ sheet: [], clipboard: [TEXT] });
  });

  it("cancelling the share sheet does nothing: no copy, no error", async () => {
    const cancel = new DOMException("Share canceled", "AbortError");
    const { device, sent } = recordingDevice({ touchPrimary: true, shareFails: cancel });
    expect(await shareOut(TEXT, device)).toBe("cancelled");
    expect(sent).toEqual({ sheet: [], clipboard: [] });
  });

  it("a share sheet that fails for another reason copies instead", async () => {
    const noGesture = new DOMException("No gesture", "NotAllowedError");
    const { device, sent } = recordingDevice({ touchPrimary: true, shareFails: noGesture });
    expect(await shareOut(TEXT, device)).toBe("copied");
    expect(sent.clipboard).toEqual([TEXT]);
  });

  it("a copy that fails says so, so the text can be selected by hand", async () => {
    expect(await shareOut(TEXT, recordingDevice({ copyFails: true }).device)).toBe("copyFailed");
  });

  it("with no clipboard at all, the copy fails", async () => {
    expect(await shareOut(TEXT, recordingDevice({ copy: undefined }).device)).toBe("copyFailed");
  });
});
