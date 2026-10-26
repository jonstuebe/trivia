import { useEffect, useRef, useSyncExternalStore } from "react";
import type { PlayingGame } from "../game/game-controller";
import { ANSWER_POSITIONS } from "../game/types";
import { Dialog } from "../ui/dialog";
import { AnswerLozenge, Button, QuestionLozenge } from "../ui/lozenge";
import { ScreenHeading } from "../ui/screen-heading";
import { GameOverScreen } from "./game-over";
import { gameView } from "./game-view";
import { LadderColumn, LadderStrip } from "./ladder";
import { ladderView } from "./ladder-view";
import { useGameKeys } from "./use-game-keys";

/**
 * The Game at `/game`, from question 1 to Game over. Every move goes to the
 * Game controller; this only lays out what `gameView` says and moves focus.
 *
 * Top to bottom in the main column: the header ("Question n of 15 · for $X",
 * banked and safe), the phone Ladder strip, the Lifelines (#37), the Title
 * label in a Mixed game, the Question, the answers, then the reveal or the
 * Walk away link. The desktop Ladder is the second column. The confirm
 * dialogs sit over it all.
 */
export function GameScreen({ game }: { game: PlayingGame }) {
  const snapshot = useSyncExternalStore(game.subscribe, game.snapshot);
  useGameKeys(game);

  const over = game.gameOver();
  if (snapshot.status === "done" && over) return <GameOverScreen over={over} snapshot={snapshot} />;

  const view = gameView(snapshot);
  const { rung } = snapshot.context;
  const choosing = snapshot.matches("choosing");
  const ladder = ladderView(rung);

  return (
    <main className="screen game">
      <div className="game__main">
        <header className="game__top">
          {/* Keyed by Rung, so each new Question takes focus at its heading. */}
          <ScreenHeading key={rung} className="game__heading">
            {view.heading}
          </ScreenHeading>
          <p className="game__banked">
            Banked: <span className="money">{view.banked}</span> · Safe: <span className="money">{view.safe}</span>
          </p>
        </header>

        <LadderStrip rows={ladder} />

        {/* #37: the Lifeline ovals go here, above the Question. */}

        {view.titleLabel && <p className="game__title-label">{view.titleLabel}</p>}
        <QuestionLozenge>{snapshot.context.questions[rung - 1]!.question.prompt}</QuestionLozenge>

        <ul className="answers" aria-label="Answers">
          {ANSWER_POSITIONS.map((position) => {
            const answer = view.answers[position]!;
            return (
              <li key={position}>
                <AnswerLozenge
                  letter={answer.letter}
                  mark={answer.mark}
                  aria-label={answer.label}
                  disabled={!choosing}
                  onClick={() => game.send({ type: "pick", answer: position })}
                >
                  {answer.text}
                </AnswerLozenge>
              </li>
            );
          })}
        </ul>

        {view.reveal && (
          <Reveal key={rung} reveal={view.reveal} onNext={() => game.send({ type: "next" })} />
        )}
        {choosing && view.walkAway && (
          <Button variant="quiet" onClick={() => game.send({ type: "walkAway" })}>
            {view.walkAway.link}
          </Button>
        )}
      </div>
      <LadderColumn rows={ladder} />

      <Announcer text={view.announcement} />

      {view.finalAnswer && (
        <Dialog title={view.finalAnswer} onCancel={() => game.send({ type: "cancel" })}>
          <div className="dialog__buttons">
            <Button variant="primary" onClick={() => game.send({ type: "finalAnswer" })}>
              Final answer
            </Button>
            <Button onClick={() => game.send({ type: "cancel" })}>Cancel</Button>
          </div>
        </Dialog>
      )}
      {snapshot.matches("confirmingWalkAway") && view.walkAway && (
        <Dialog title={view.walkAway.confirm} onCancel={() => game.send({ type: "cancel" })}>
          <div className="dialog__buttons">
            <Button variant="primary" onClick={() => game.send({ type: "confirmWalkAway" })}>
              Walk away
            </Button>
            <Button onClick={() => game.send({ type: "cancel" })}>Cancel</Button>
          </div>
        </Dialog>
      )}
    </main>
  );
}

/** Right or wrong in words, with Next. Next takes focus, and the result is announced. */
function Reveal({ reveal, onNext }: { reveal: NonNullable<ReturnType<typeof gameView>["reveal"]>; onNext: () => void }) {
  const next = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    next.current?.focus();
  }, []);
  return (
    <div className="reveal">
      <p role="status" className={`reveal__message ${reveal.right ? "is-right" : "is-wrong"}`}>
        {reveal.message}
      </p>
      <Button ref={next} variant="primary" onClick={onNext}>
        {reveal.next}
      </Button>
    </div>
  );
}

/**
 * Says each new Question to screen readers: its Rung and prize, the
 * Question, then the four answers. Filled after the Question appears, so
 * it's heard as a change.
 */
function Announcer({ text }: { text: string }) {
  const region = useRef<HTMLParagraphElement>(null);
  // The text changes only with the Question (a new Rung, or a switched Question).
  useEffect(() => {
    if (region.current) region.current.textContent = text;
  }, [text]);
  return <p ref={region} className="visually-hidden" aria-live="polite" />;
}
