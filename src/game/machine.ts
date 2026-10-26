import { assign, createActor, setup, type Actor } from "xstate";
import { shuffle, type Random } from "../random/random";
import { LADDER_LENGTH, prizeForRung, winningsAfterMiss, winningsBeforeRung } from "./ladder";
import type {
  AnswerPosition,
  GameEnding,
  GameQuestion,
  GameResult,
  Lifeline,
  QuestionOutcome,
  ShownQuestion,
  Topic,
} from "./types";

/** What a new Game is started from. */
export interface GameInput {
  topic: Topic;
  /** One Question per Rung, in Ladder order. */
  questions: readonly GameQuestion[];
  /** Shuffles each Question's answers. Only used at the start, so the Game itself stays plain data. */
  random: Random;
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
  /** Picks an answer, opening "Final answer / Cancel". */
  | { type: "pick"; answer: AnswerPosition }
  /** Confirms the picked answer. */
  | { type: "finalAnswer" }
  /** Backs out of "Final answer" or "Walk away" to choosing. */
  | { type: "cancel" }
  /** Moves on from the reveal: to the next question, or to the end of the Game. */
  | { type: "next" };

/** A Question with its answers shuffled into the order shown. */
export function showQuestion(question: GameQuestion, random: Random): ShownQuestion {
  const answers = shuffle([question.correct, ...question.wrong], random) as [string, string, string, string];
  return { question, answers, correct: answers.indexOf(question.correct) as AnswerPosition };
}

export const gameMachine = setup({
  types: {
    input: {} as GameInput,
    context: {} as GameContext,
    events: {} as GameEvent,
  },
  guards: {
    pickedRight: ({ context }) => context.picked === context.questions[context.rung - 1]!.correct,
    onLastRung: ({ context }) => context.rung === LADDER_LENGTH,
  },
  actions: {
    finish: assign({ result: ({ context }, ending: GameEnding) => resultFor(context, ending) }),
  },
}).createMachine({
  id: "game",
  context: ({ input }) => ({
    topic: input.topic,
    questions: input.questions.map((question) => showQuestion(question, input.random)),
    rung: 1,
    picked: null,
    lifelinesUsed: [],
    result: null,
  }),
  output: ({ context }) => context.result!,
  initial: "choosing",
  states: {
    choosing: {
      on: {
        pick: { target: "confirmingAnswer", actions: assign({ picked: ({ event }) => event.answer }) },
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
                actions: assign({ rung: ({ context }) => context.rung + 1, picked: null }),
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

export type GameActor = Actor<typeof gameMachine>;

/** Starts a new Game at question 1. */
export function startGame(input: GameInput): GameActor {
  if (input.questions.length !== LADDER_LENGTH) {
    throw new RangeError(`A Game needs ${LADDER_LENGTH} Questions, got ${input.questions.length}`);
  }
  return createActor(gameMachine, { input }).start();
}

