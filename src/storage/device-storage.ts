import * as z from "zod";
import type { Topic } from "../game/types";
import type { StorageBackend } from "./backend";
import { createVersionedKey, type Migration } from "./versioned-key";

/**
 * How the Saved game is stored: its current version, shape and migrations.
 * The Game machine owns the record, so the caller supplies this.
 */
export interface SavedGameFormat<T> {
  version: number;
  schema: z.ZodType<T>;
  migrations?: Record<number, Migration>;
}

export interface DeviceStorageOptions<T> {
  savedGame: SavedGameFormat<T>;
  /**
   * Asks the browser to keep this site's storage, guarding against Safari's
   * eviction of sites not on the Home Screen. In the browser:
   * `() => navigator.storage.persist()`. Left out, nothing is asked.
   */
  persist?: () => Promise<boolean>;
}

/** The storage key names, each holding `{version, data}`. */
export const STORAGE_KEYS = {
  seen: "trivia.seen",
  personalBests: "trivia.personalBests",
  savedGame: "trivia.savedGame",
  settings: "trivia.settings",
} as const;

/** Question ID → the running counter from when it was last shown. */
const seenSchema = z.record(z.string(), z.int().min(1));

/** Topic key → the best winnings from a finished Game in that Topic as picked. */
const personalBestsSchema = z.record(z.string(), z.int().min(0));

/** The player's settings: for now, just the remembered mute. */
const settingsSchema = z.object({ muted: z.boolean() });

/** The key a Topic's Personal best is kept under: `general`, `tv`, `tv/friends`. */
export function topicKey(topic: Topic): string {
  switch (topic.kind) {
    case "general":
      return "general";
    case "category":
      return topic.category;
    case "title":
      return `${topic.category}/${topic.slug}`;
  }
}

/** Everything the game remembers on this device. */
export function createDeviceStorage<T>(backend: StorageBackend, options: DeviceStorageOptions<T>) {
  const seen = createVersionedKey(backend, {
    name: STORAGE_KEYS.seen,
    version: 1,
    schema: seenSchema,
    initial: () => ({}),
  });
  const personalBests = createVersionedKey(backend, {
    name: STORAGE_KEYS.personalBests,
    version: 1,
    schema: personalBestsSchema,
    initial: () => ({}),
  });
  const savedGame = createVersionedKey(backend, {
    name: STORAGE_KEYS.savedGame,
    version: options.savedGame.version,
    schema: options.savedGame.schema.optional(),
    migrations: options.savedGame.migrations,
    initial: () => undefined,
    // A Game in progress that can't be read is just dropped.
    unreadable: "drop",
  });
  const settings = createVersionedKey(backend, {
    name: STORAGE_KEYS.settings,
    version: 1,
    schema: settingsSchema,
    initial: () => ({ muted: false }),
  });

  let persistRequested = false;

  return {
    /**
     * Call when a Game starts: the first time, asks for persistent storage.
     * A refusal, or a browser that can't ask, is ignored.
     */
    async gameStarted(): Promise<void> {
      if (persistRequested || !options.persist) return;
      persistRequested = true;
      try {
        await options.persist();
      } catch {
        // Storage still works, it just may be evicted.
      }
    },

    /** Each seen Question's counter: the higher, the more recently shown. */
    seenQuestions(): ReadonlyMap<string, number> {
      return new Map(Object.entries(seen.read()));
    },

    /** Records a Question as shown, making it the newest seen. */
    markSeen(questionId: string): void {
      const counters = seen.read();
      const newest = Math.max(0, ...Object.values(counters));
      seen.write({ ...counters, [questionId]: newest + 1 });
    },

    /** Reset all, from the Main menu: clears every seen Question, and nothing else. */
    resetAll(): void {
      seen.clear();
    },

    /**
     * Reset this Topic, from Not enough new questions: clears the seen entries
     * for the Topic's Questions. For a Category, pass every Title's Questions.
     */
    resetTopic(questionIds: Iterable<string>): void {
      const counters = seen.read();
      for (const id of questionIds) delete counters[id];
      seen.write(counters);
    },

    /** The best winnings in this Topic as picked, or `undefined` if no Game in it has finished. */
    personalBest(topic: Topic): number | undefined {
      return personalBests.read()[topicKey(topic)];
    },

    /**
     * Counts a finished Game (won, missed or walked away) towards the Topic's
     * Personal best. Says what the best now is, and whether this Game set it.
     */
    recordWinnings(topic: Topic, winnings: number): { best: number; isNew: boolean } {
      const bests = personalBests.read();
      const key = topicKey(topic);
      const previous = bests[key];
      if (previous !== undefined && previous >= winnings) return { best: previous, isNew: false };
      personalBests.write({ ...bests, [key]: winnings });
      return { best: winnings, isNew: true };
    },

    /** The one Game in progress, or `undefined` if there is none. */
    savedGame(): T | undefined {
      return savedGame.read();
    },

    /** Keeps the Game in progress, replacing any Saved game. Call after every step. */
    saveGame(game: T): void {
      savedGame.write(game);
    },

    /** Removes the Saved game, at Game over. */
    clearSavedGame(): void {
      savedGame.clear();
    },

    /** Whether the player has turned the sound off. */
    muted(): boolean {
      return settings.read().muted;
    },

    setMuted(muted: boolean): void {
      settings.write({ ...settings.read(), muted });
    },
  };
}

export type DeviceStorage<T> = ReturnType<typeof createDeviceStorage<T>>;
