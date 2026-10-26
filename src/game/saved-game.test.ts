import { describe, expect, it } from "vitest";
import { createSeededRandom } from "../random/random";
import { createDeviceStorage, createMemoryBackend, STORAGE_KEYS } from "../storage";
import { loadTopic } from "./load-topic";
import { restoreGame, saveGame, startGame } from "./machine";
import { savedGameFormat } from "./saved-game";
import type { Topic } from "./types";

const topic: Topic = { kind: "general" };

async function aGameWithEveryLifelineResult() {
  const questions = await loadTopic(topic);
  const game = startGame({
    topic,
    questions,
    random: createSeededRandom(4),
    topicQuestions: questions,
    seen: () => ({}),
  });
  game.send({ type: "fiftyFifty" });
  game.send({ type: "askTheAudience" });
  game.send({ type: "phoneAFriend" });
  game.send({ type: "callFriend", friend: "science" });
  return { game, questions };
}

describe("the Saved game format", () => {
  it("is version 1", () => {
    expect(savedGameFormat.version).toBe(1);
  });

  it("keeps a Game in device storage and gives it back whole, Lifeline results included", async () => {
    const { game, questions } = await aGameWithEveryLifelineResult();
    const backend = createMemoryBackend();
    createDeviceStorage(backend, { savedGame: savedGameFormat }).saveGame(saveGame(game));

    const saved = createDeviceStorage(backend, { savedGame: savedGameFormat }).savedGame();
    expect(saved).toBeDefined();
    const restored = restoreGame(saved!, { random: createSeededRandom(9), topicQuestions: questions, seen: () => ({}) });
    expect(restored.getSnapshot().value).toBe("choosing");
    expect(restored.getSnapshot().context).toEqual(game.getSnapshot().context);
  });

  it("drops a stored Game that isn't a whole Game", async () => {
    const { game } = await aGameWithEveryLifelineResult();
    const saved = saveGame(game);
    const broken = { ...saved, context: { ...saved.context, questions: saved.context.questions.slice(0, 3) } };
    const backend = createMemoryBackend({
      [STORAGE_KEYS.savedGame]: JSON.stringify({ version: 1, data: broken }),
    });
    expect(createDeviceStorage(backend, { savedGame: savedGameFormat }).savedGame()).toBeUndefined();
  });

  it("drops a stored Game in a step the Game doesn't have", async () => {
    const { game } = await aGameWithEveryLifelineResult();
    const backend = createMemoryBackend({
      [STORAGE_KEYS.savedGame]: JSON.stringify({ version: 1, data: { ...saveGame(game), value: "dancing" } }),
    });
    expect(createDeviceStorage(backend, { savedGame: savedGameFormat }).savedGame()).toBeUndefined();
  });
});
