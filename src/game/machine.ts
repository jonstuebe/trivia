import { assign, createActor, setup, type Actor, type Snapshot, type StateValueFrom } from "xstate";
import { shuffle, type Random } from "../random/random";
import { LADDER_LENGTH, prizeForRung, winningsAfterMiss, winningsBeforeRung } from "./ladder";
import {
  ANSWER_POSITIONS,
  type AnswerPosition,
  type Friend,
  type GameEnding,
  type GameQuestion,
  type GameResult,
  type Lifeline,
  type QuestionOutcome,
  type SeenQuestions,
  type ShownQuestion,
  type Topic,
} from "./types";
import { drawSwitch, switchCandidates } from "./selection";
import { askTheAudience, phoneAFriend, type AudienceResult, type FriendResult } from "./simulation";

/**
 * What a Game needs from outside that isn't plain data: given when a Game
 * starts and again when it's restored, and never saved with it.
 */
export interface GameDependencies {
  /** Shuffles answers and rolls the Lifelines. */
  random: Random;
  /** All of the Topic's loaded Questions, for Switch the Question to draw from. */
  topicQuestions: readonly GameQuestion[];
  /**
   * Reads the Seen questions on this device as they are now, so Switch draws
   * unseen first even after Questions shown during this Game were marked.
   */
  readSeen: () => SeenQuestions;
}

/** What a new Game is started from. */
export interface GameInput extends GameDependencies {
  topic: Topic;
  /** One Question per Rung, in Ladder order. */
  questions: readonly GameQuestion[];
}

/** Everything a Game knows: plain data, so a snapshot can be saved and restored. */
export interface GameContext {
  topic: Topic;
  /** The 15 Questions with their answers in shown order; Rung n is `questions[n - 1]`. */
  questions: ShownQuestion[];
  /** The Rung being played, 1–15. */
  rung: number;
  /** The answer waiting on "Final answer / Cancel", or the confirmed one while revealing. */
  picked: AnswerPosition | null;
  /** The Lifelines used so far, in the order used. */
  lifelinesUsed: Lifeline[];
  /** The two wrong answers a 50:50 took away on this question, or none. */
  removed: AnswerPosition[];
  /** The Ask the Audience vote on this question, rolled once. */
  audience: AudienceResult | null;
  /** What the Friend said on this question's Phone a Friend call, rolled once. */
  friend: FriendResult | null;
  /** The Question Switch the Question swapped out, if used: shown, so it counts as a Seen question. */
  switchedAway: GameQuestion[];
  /** Set once the Game ends; also the machine's output. */
  result: GameResult | null;
}

/** The finished-Game record for an ending on the current Rung. */
function resultFor(context: GameContext, ending: GameEnding): GameResult {
  const { rung } = context;
  const rights: QuestionOutcome[] = Array(ending === "won" ? LADDER_LENGTH : rung - 1).fill("right");
  const last: QuestionOutcome[] = ending === "missed" ? ["miss"] : ending === "walkedAway" ? ["walkedAway"] : [];
  const winnings =
    ending === "won" ? prizeForRung(LADDER_LENGTH) : ending === "missed" ? winningsAfterMiss(rung) : winningsBeforeRung(rung);
  return {
    topic: context.topic,
    ending,
    winnings,
    reached: [...rights, ...last],
    lifelinesUsed: [...context.lifelinesUsed],
  };
}

/** What the player can do in a Game. Events that don't fit the current step are ignored. */
export type GameEvent =
  /** Picks an answer, opening "Final answer / Cancel". A 50:50-removed answer can't be picked. */
  | { type: "pick"; answer: AnswerPosition }
  /** Confirms the picked answer. */
  | { type: "finalAnswer" }
  /** Backs out of "Final answer", "Walk away" or the pick of a Friend to choosing. */
  | { type: "cancel" }
  /** Asks "Walk away with $X? / Cancel". Offered from question 2. */
  | { type: "walkAway" }
  /** Confirms the Walk away, ending the Game with the current winnings. */
  | { type: "confirmWalkAway" }
  /** Moves on from the reveal: to the next question, or to the end of the Game. */
  | { type: "next" }
  /** 50:50: removes two wrong answers. */
  | { type: "fiftyFifty" }
  /** Ask the Audience: shows their vote, over only the answers still in play. */
  | { type: "askTheAudience" }
  /** Phone a Friend: opens the pick of the four Friends. Cancel backs out without spending it. */
  | { type: "phoneAFriend" }
  /** Calls the chosen Friend, spending Phone a Friend. */
  | { type: "callFriend"; friend: Friend }
  /** Switch the Question: after question 10, swaps in another Question from the same Tier. */
  | { type: "switchTheQuestion" };

/** A Question with its answers shuffled into the order shown. */
export function showQuestion(question: GameQuestion, random: Random): ShownQuestion {
  const answers = shuffle([question.correct, ...question.wrong], random) as [string, string, string, string];
  return { question, answers, correct: answers.indexOf(question.correct) as AnswerPosition };
}

/** The Question on screen now: the one on the Rung being played. */
export function shownNow(context: Pick<GameContext, "questions" | "rung">): ShownQuestion {
  return context.questions[context.rung - 1]!;
}

function unused(context: GameContext, lifeline: Lifeline): boolean {
  return !context.lifelinesUsed.includes(lifeline);
}

/** The answers not taken away by a 50:50. */
function remaining(context: GameContext): AnswerPosition[] {
  return ANSWER_POSITIONS.filter((position) => !context.removed.includes(position));
}

/** What the next question starts with: no answer picked and no Lifeline results showing. */
const freshQuestion = { picked: null, removed: [], audience: null, friend: null } satisfies Partial<GameContext>;

/** Switch the Question is only offered after question 10. */
const LAST_RUNG_WITHOUT_SWITCH = 10;

/** The Game machine, with its outside dependencies closed over so the context stays plain data. */
function gameMachineWith({ random, topicQuestions, readSeen }: GameDependencies) {
  /** Every Question this Game has drawn, so Switch never brings one back. */
  const inGame = (context: GameContext) => [...context.questions.map((shown) => shown.question), ...context.switchedAway];
  const drawReplacement = (context: GameContext) =>
    drawSwitch(topicQuestions, shownNow(context).question.tier, inGame(context), readSeen(), random);
  /** Whether the Tier has a Question left to switch to, without rolling anything. */
  const canDrawReplacement = (context: GameContext) =>
    switchCandidates(topicQuestions, shownNow(context).question.tier, inGame(context)).length > 0;

  return setup({
    types: {
      input: {} as Omit<GameInput, keyof GameDependencies>,
      context: {} as GameContext,
      events: {} as GameEvent,
      output: {} as GameResult,
    },
    guards: {
      pickedRight: ({ context }) => context.picked === shownNow(context).correct,
      onLastRung: ({ context }) => context.rung === LADDER_LENGTH,
      /** Walk away is offered from question 2. */
      pastFirstRung: ({ context }) => context.rung >= 2,
      stillInPlay: ({ context, event }) => event.type === "pick" && !context.removed.includes(event.answer),
      fiftyFiftyUnused: ({ context }) => unused(context, "fiftyFifty"),
      askTheAudienceUnused: ({ context }) => unused(context, "askTheAudience"),
      phoneAFriendUnused: ({ context }) => unused(context, "phoneAFriend"),
      switchAvailable: ({ context }) =>
        unused(context, "switchTheQuestion") && context.rung > LAST_RUNG_WITHOUT_SWITCH && canDrawReplacement(context),
    },
    actions: {
      finish: assign({ result: ({ context }, ending: GameEnding) => resultFor(context, ending) }),
      useFiftyFifty: assign(({ context }) => {
        const { correct } = shownNow(context);
        const wrong = ANSWER_POSITIONS.filter((position) => position !== correct);
        return {
          removed: shuffle(wrong, random).slice(0, 2).sort(),
          lifelinesUsed: [...context.lifelinesUsed, "fiftyFifty" as const],
        };
      }),
      useAskTheAudience: assign(({ context }) => ({
        audience: askTheAudience({ shown: shownNow(context), remaining: remaining(context), random }),
        lifelinesUsed: [...context.lifelinesUsed, "askTheAudience" as const],
      })),
      callFriend: assign(({ context, event }) => {
        if (event.type !== "callFriend") return {};
        const shown = shownNow(context);
        return {
          friend: phoneAFriend({ shown, remaining: remaining(context), friend: event.friend, random }),
          lifelinesUsed: [...context.lifelinesUsed, "phoneAFriend" as const],
        };
      }),
      // A switch brings back all four answers, because the 50:50 is spent, and clears the audience and the Friend.
      useSwitch: assign(({ context }) => ({
        ...freshQuestion,
        questions: context.questions.map((shown, i) =>
          i === context.rung - 1 ? showQuestion(drawReplacement(context)!, random) : shown,
        ),
        switchedAway: [...context.switchedAway, shownNow(context).question],
        lifelinesUsed: [...context.lifelinesUsed, "switchTheQuestion" as const],
      })),
    },
  }).createMachine({
    id: "game",
    context: ({ input }) => ({
      topic: input.topic,
      questions: input.questions.map((question) => showQuestion(question, random)),
      rung: 1,
      picked: null,
      lifelinesUsed: [],
      removed: [],
      audience: null,
      friend: null,
      switchedAway: [],
      result: null,
    }),
    output: ({ context }) => context.result!,
    initial: "choosing",
    states: {
      choosing: {
        on: {
          pick: {
            guard: "stillInPlay",
            target: "confirmingAnswer",
            actions: assign({ picked: ({ event }) => event.answer }),
          },
          walkAway: { guard: "pastFirstRung", target: "confirmingWalkAway" },
          fiftyFifty: { guard: "fiftyFiftyUnused", actions: "useFiftyFifty" },
          askTheAudience: { guard: "askTheAudienceUnused", actions: "useAskTheAudience" },
          phoneAFriend: { guard: "phoneAFriendUnused", target: "pickingFriend" },
          switchTheQuestion: { guard: "switchAvailable", actions: "useSwitch" },
        },
      },
      pickingFriend: {
        on: {
          cancel: { target: "choosing" },
          callFriend: { target: "choosing", actions: "callFriend" },
        },
      },
      confirmingWalkAway: {
        on: {
          cancel: { target: "choosing" },
          confirmWalkAway: { target: "finished", actions: { type: "finish", params: "walkedAway" } },
        },
      },
      confirmingAnswer: {
        on: {
          cancel: { target: "choosing", actions: assign({ picked: null }) },
          finalAnswer: [{ guard: "pickedRight", target: "revealing.right" }, { target: "revealing.wrong" }],
        },
      },
      revealing: {
        initial: "right",
        states: {
          right: {
            on: {
              next: [
                { guard: "onLastRung", target: "#game.finished", actions: { type: "finish", params: "won" } },
                {
                  target: "#game.choosing",
                  actions: assign({ rung: ({ context }) => context.rung + 1, ...freshQuestion }),
                },
              ],
            },
          },
          wrong: {
            on: {
              next: { target: "#game.finished", actions: { type: "finish", params: "missed" } },
            },
          },
        },
      },
      finished: { type: "final" },
    },
  });
}

type GameMachine = ReturnType<typeof gameMachineWith>;
export type GameActor = Actor<GameMachine>;

/** Starts a new Game at question 1. */
export function startGame({ topic, questions, ...dependencies }: GameInput): GameActor {
  if (questions.length !== LADDER_LENGTH) {
    throw new RangeError(`A Game needs ${LADDER_LENGTH} Questions, got ${questions.length}`);
  }
  return createActor(gameMachineWith(dependencies), { input: { topic, questions } }).start();
}

/**
 * A Game as plain JSON-safe data: its step in `value`, everything else in
 * `context` (every Lifeline result included), and `status`/`output` once
 * finished. Save it as is; it restores with `restoreGame`.
 */
export type SavedGameSnapshot = Snapshot<GameResult> & {
  value: StateValueFrom<GameMachine>;
  context: GameContext;
};

/**
 * The Game's state now, ready to save. A picked answer isn't saved until it's
 * confirmed, so a Game waiting on "Final answer?" is saved back at the
 * Question with nothing picked.
 */
export function saveGame(game: GameActor): SavedGameSnapshot {
  const saved = game.getPersistedSnapshot() as SavedGameSnapshot;
  if (saved.value !== "confirmingAnswer") return saved;
  return { ...saved, value: "choosing", context: { ...saved.context, picked: null } };
}

/** Picks a saved Game back up exactly where it was. Lifeline results come from the save, never rerolled. */
export function restoreGame(saved: SavedGameSnapshot, dependencies: GameDependencies): GameActor {
  // The snapshot already holds the context, so the input is never read.
  return createActor(gameMachineWith(dependencies), { snapshot: saved, input: undefined as never }).start();
}
