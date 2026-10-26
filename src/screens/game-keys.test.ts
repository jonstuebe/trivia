import { describe, expect, it } from "vitest";
import { gameKeyEvent, keyList } from "./game-keys";

const press = (key: string, modifiers: { ctrlKey?: boolean; metaKey?: boolean; altKey?: boolean } = {}) =>
  gameKeyEvent({ key, ctrlKey: false, metaKey: false, altKey: false, ...modifiers });

describe("the Game's keys", () => {
  it("pick an answer with A–D or 1–4, in either case", () => {
    expect(["a", "B", "c", "D"].map((key) => press(key))).toEqual([0, 1, 2, 3].map((answer) => ({ type: "pick", answer })));
    expect(["1", "2", "3", "4"].map((key) => press(key))).toEqual([0, 1, 2, 3].map((answer) => ({ type: "pick", answer })));
  });

  it("give Final answer on Enter, Cancel on Esc and Walk away on W", () => {
    expect(press("Enter")).toEqual({ type: "finalAnswer" });
    expect(press("Escape")).toEqual({ type: "cancel" });
    expect(press("w")).toEqual({ type: "walkAway" });
    expect(press("W")).toEqual({ type: "walkAway" });
  });

  it("use the Lifelines with F, Q, P and S", () => {
    expect(["f", "Q", "p", "S"].map((key) => press(key))).toEqual([
      { type: "fiftyFifty" },
      { type: "askTheAudience" },
      { type: "phoneAFriend" },
      { type: "switchTheQuestion" },
    ]);
  });

  it("leave other keys, and any key with Ctrl, Cmd or Alt, to the browser", () => {
    expect(press("x")).toBeUndefined();
    expect(press("5")).toBeUndefined();
    expect(press("a", { ctrlKey: true })).toBeUndefined();
    expect(press("w", { metaKey: true })).toBeUndefined();
    expect(press("1", { altKey: true })).toBeUndefined();
  });

  it("are all listed for the ? key, with ? itself, as they'd be pressed", () => {
    expect(keyList()).toEqual([
      { keys: "A or 1", description: "Pick answer A" },
      { keys: "B or 2", description: "Pick answer B" },
      { keys: "C or 3", description: "Pick answer C" },
      { keys: "D or 4", description: "Pick answer D" },
      { keys: "Enter", description: "Final answer" },
      { keys: "Esc", description: "Cancel" },
      { keys: "W", description: "Walk away (still asks to confirm)" },
      { keys: "F", description: "50:50" },
      { keys: "Q", description: "Ask the Audience" },
      { keys: "P", description: "Phone a Friend" },
      { keys: "S", description: "Switch the Question" },
      { keys: "?", description: "Show the keys" },
    ]);
  });
});
