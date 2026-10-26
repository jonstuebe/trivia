import type { Random } from "../random/random";
import type { DeviceStorage } from "../storage";
import { loadTopic } from "./load-topic";
import { restoreGame, saveGame, shownNow, startGame, type GameActor, type GameEvent, type SavedGameSnapshot } from "./machine";
import { canFillGame, drawGame } from "./selection";
import type { GameResult, Topic } from "./types";

/**
 * Plays Games the way the app does, wired to device storage: every Question
 * shown is marked seen, the Saved game is rewritten after every step, and at
 * Game over it's cleared and the Personal best updated. No UI: the screens
 * drive it with `send` and read `snapshot`.
 */

export interface GameControllerOptions {
  storage: DeviceStorage<SavedGameSnapshot>;
  /** The source for draws, answer shuffles and Lifeline rolls: unseeded in the app, seeded in tests. */
  random: Random;
}

/** What the Game over screen shows besides the result. */
export interface GameOver {
  result: GameResult;
  /** The Topic's Personal best, counting this Game. */
  personalBest: number;
  /** Whether this Game set it. */
  newPersonalBest: boolean;
}

/** A Game being played. */
export interface PlayingGame {
  /** The Game as it is now: its step (`value`), `context`, and `can(event)` for what's offered. */
  snapshot(): ReturnType<GameActor["getSnapshot"]>;
  /** Sends a player's move. One that doesn't fit the current step is ignored. */
  send(event: GameEvent): void;
  /** Calls `listener` after every step, once it's been saved. Returns the unsubscribe. */
  subscribe(listener: () => void): () => void;
  /** Set once the Game is over, with the Personal best already updated. */
  gameOver(): GameOver | undefined;
}

export function createGameController({ storage, random }: GameControllerOptions) {
  /** Wraps a running Game so each step marks, saves or finishes it. `marked` is what it has already marked seen. */
  function play(actor: GameActor, marked: Set<string>): PlayingGame {
    const listeners = new Set<() => void>();
    let over: GameOver | undefined;

    function afterStep() {
      if (over) return;
      const snapshot = actor.getSnapshot();
      const { context } = snapshot;
      const showing = shownNow(context).question.id;
      if (!marked.has(showing)) {
        storage.markSeen(showing);
        marked.add(showing);
      }
      if (snapshot.status === "done") {
        storage.clearSavedGame();
        const { best, isNew } = storage.recordWinnings(context.topic, snapshot.output.winnings);
        over = { result: snapshot.output, personalBest: best, newPersonalBest: isNew };
      } else {
        storage.saveGame(saveGame(actor));
      }
      for (const listener of listeners) listener();
    }

    afterStep();
    return {
      snapshot: () => actor.getSnapshot(),
      send(event) {
        if (over) return;
        actor.send(event);
        afterStep();
      },
      subscribe(listener) {
        listeners.add(listener);
        return () => void listeners.delete(listener);
      },
      gameOver: () => over,
    };
  }

  return {
    /**
     * The run-out check, for Ready to play: whether the Topic can fill a whole
     * Game with unseen Questions. When it can't, show Not enough new
     * questions; a Game can still start, with repeats.
     */
    async checkTopic(topic: Topic): Promise<{ enoughNew: boolean }> {
      return { enoughNew: canFillGame(await loadTopic(topic), storage.seenQuestions()) };
    },

    /** Reset this topic: clears the seen entries for its Questions, every Title's for a Category. */
    async resetTopic(topic: Topic): Promise<void> {
      storage.resetTopic((await loadTopic(topic)).map((question) => question.id));
    },

    /**
     * Starts a new Game in `topic`, drawing unseen Questions first, then
     * repeats oldest-seen first. Discards any Saved game: it doesn't count
     * toward a Personal best, and its Questions stay seen.
     */
    async startGame(topic: Topic): Promise<PlayingGame> {
      const topicQuestions = await loadTopic(topic);
      const questions = drawGame(topicQuestions, storage.seenQuestions(), random);
      storage.clearSavedGame();
      void storage.gameStarted();
      const actor = startGame({ topic, questions, random, topicQuestions, seen: storage.seenQuestions });
      return play(actor, new Set());
    },

    /** The Saved game's Topic, for the Main menu's Resume, or `undefined` when there's no Game in progress. */
    savedTopic(): Topic | undefined {
      return storage.savedGame()?.context.topic;
    },

    /**
     * Picks the Saved game back up exactly where it was; one saved during
     * "Final answer?" is back at the Question with nothing picked. Its
     * Questions are the saved copies, so it resumes even if an update changed
     * or removed the Topic; Switch then has nothing to draw from.
     */
    async resumeGame(): Promise<PlayingGame | undefined> {
      const saved = storage.savedGame();
      if (!saved) return undefined;
      const { topic, questions, rung, switchedAway } = saved.context;
      const topicQuestions = await loadTopic(topic).catch(() => []);
      const actor = restoreGame(saved, { random, topicQuestions, seen: storage.seenQuestions });
      // Everything shown before the save was marked seen then.
      const marked = new Set([
        ...questions.slice(0, rung).map((shown) => shown.question.id),
        ...switchedAway.map((question) => question.id),
      ]);
      return play(actor, marked);
    },
  };
}

export type GameController = ReturnType<typeof createGameController>;
