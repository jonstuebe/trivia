import { describe, expect, it } from "vitest";
import { CUES, type CueName } from "./cues";
import { createFakeAudio } from "./fake-audio";

describe("every cue", () => {
  it.each(Object.keys(CUES) as CueName[])("%s makes a sound and ends by itself", (name) => {
    const audio = createFakeAudio();
    const context = audio.createContext();
    CUES[name]({ context, destination: context.destination, now: 0 });
    expect(audio.started.length).toBeGreaterThan(0);
    expect(audio.stopped).toBe(audio.started.length);
  });
});
