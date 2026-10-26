/**
 * A stand-in for the browser's AudioContext, for the unit tests (which run in
 * Node, with no Web Audio). It builds the nodes the cues ask for and records
 * every source that's started, so a test can tell whether anything played.
 */
export interface FakeAudio {
  /** Pass to the engine as `createContext`. */
  createContext: () => AudioContext;
  /** How many AudioContexts have been made. */
  contexts: number;
  /** Every oscillator or buffer source started, in order. */
  started: { kind: string; at: number }[];
  /** Every source stopped. */
  stopped: number;
  /** Moves the clock on. */
  advance(seconds: number): void;
}

function fakeParam(initial: number): AudioParam {
  const param = {
    value: initial,
    defaultValue: initial,
    setValueAtTime: (value: number) => ((param.value = value), param),
    linearRampToValueAtTime: (value: number) => ((param.value = value), param),
    exponentialRampToValueAtTime: (value: number) => ((param.value = value), param),
    setTargetAtTime: (value: number) => ((param.value = value), param),
    cancelScheduledValues: () => param,
    cancelAndHoldAtTime: () => param,
  };
  return param as unknown as AudioParam;
}

export function createFakeAudio(): FakeAudio {
  let now = 0;
  const audio: FakeAudio = {
    contexts: 0,
    started: [],
    stopped: 0,
    advance(seconds) {
      now += seconds;
    },
    createContext() {
      audio.contexts++;
      const node = () => ({ connect: (target: unknown) => target, disconnect: () => {} });
      const source = (kind: string) => ({
        ...node(),
        onended: null,
        start: (at = now) => void audio.started.push({ kind, at }),
        stop: () => void audio.stopped++,
      });
      const context = {
        state: "running",
        get currentTime() {
          return now;
        },
        sampleRate: 48000,
        destination: node(),
        resume: async () => {},
        createGain: () => ({ ...node(), gain: fakeParam(1) }),
        createOscillator: () => ({ ...source("oscillator"), type: "sine", frequency: fakeParam(440), detune: fakeParam(0) }),
        createBiquadFilter: () => ({ ...node(), type: "lowpass", frequency: fakeParam(350), Q: fakeParam(1), gain: fakeParam(0) }),
        createBuffer: (channels: number, length: number) => ({
          length,
          getChannelData: () => new Float32Array(length),
          numberOfChannels: channels,
        }),
        createBufferSource: () => ({ ...source("buffer"), buffer: null, loop: false, playbackRate: fakeParam(1) }),
      };
      return context as unknown as AudioContext;
    },
  };
  return audio;
}
