import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { setCurrentGame } from "../app/game-services";
import type { PlayingGame } from "../game/game-controller";
import { ANSWER_POSITIONS } from "../game/types";
import { Dialog } from "../ui/dialog";
import { AnswerLozenge, Button, QuestionLozenge } from "../ui/lozenge";
import { ScreenHeading } from "../ui/screen-heading";
import { GameOverScreen } from "./game-over";
import { gameView } from "./game-view";
import { LadderColumn, LadderStrip } from "./ladder";
import { ladderView } from "./ladder-view";
import { KeysDialog, Lifelines, PickFriendDialog } from "./lifelines";
import { lifelinesView } from "./lifelines-view";
import { MuteButton } from "./mute-button";
import { useGameKeys, useMuteKey, useShowKeysKey } from "./use-game-keys";
import { useGameSounds } from "./use-game-sounds";
import { usePhoneCall } from "./use-phone-call";
import { useRevealWait } from "./use-reveal-wait";

/**
 * The Game at `/game`, from question 1 to Game over. Every move goes to the
 * Game controller; this only lays out what `gameView` says and moves focus.
 *
 * Top to bottom in the main column: the header ("Question n of 15 · for $X"),
 * the phone Ladder strip, the Lifelines and their results,
 * the Title label in a Mixed game, the Question, the answers, then the reveal
 * or the Walk away and Main menu links, then the Sound switch. The desktop Ladder is the second
 * column. The confirm dialogs, Pick a friend and the `?` list of keys sit
 * over it all.
 *
 * After Final answer comes the reveal wait: the stage dims, the locked-in
 * answer stays lit, and a line in the reveal's place says the answer is
 * coming, until `useRevealWait` reveals it. A right answer then flashes and
 * the Ladder steps up; under reduced motion nothing flashes or slides
 * (studio.css).
 */
export function GameScreen({ game }: { game: PlayingGame }) {
  const snapshot = useSyncExternalStore(game.subscribe, game.snapshot);
  useGameKeys(game);
  useMuteKey();
  useGameSounds(game);
  const calling = usePhoneCall(game);
  const [showingKeys, setShowingKeys] = useState(false);
  useShowKeysKey(() => setShowingKeys(true));
  const navigate = useNavigate();
  const { rung } = snapshot.context;
  const { question } = snapshot.context.questions[rung - 1]!;
  useRevealWait(game, snapshot.matches("lockedIn"), question.tier);

  const over = game.gameOver();
  if (snapshot.status === "done" && over) return <GameOverScreen over={over} snapshot={snapshot} />;

  const view = gameView(snapshot);
  const lifelines = lifelinesView(snapshot, { calling });
  const choosing = snapshot.matches("choosing");
  const ladder = ladderView(view.ladderRung);
  const stepping = view.ladderRung !== rung;
  // The reveal wait dims the Ladder, the Lifelines and the Title label, and
  // makes them inert: nothing there can be used until the reveal. The
  // heading, the Question and the locked-in answer stay lit.
  const dimmed = view.lockedIn !== undefined;

  return (
    <main className={`screen game${dimmed ? " is-locked-in" : ""}`}>
      <div className="game__main">
        <header className="game__top">
          {/* Keyed by the Question, so each new one (a switched one too) takes focus at its heading. */}
          <ScreenHeading key={`${rung}:${question.id}`} className="game__heading">
            {view.heading}
          </ScreenHeading>
        </header>

        <LadderStrip rows={ladder} stepping={stepping} inert={dimmed} />

        <Lifelines view={lifelines} onUse={(event) => game.send(event)} inert={dimmed} />

        {view.titleLabel && (
          <p className="game__title-label" inert={dimmed}>
            {view.titleLabel}
          </p>
        )}
        <QuestionLozenge>{question.prompt}</QuestionLozenge>

        <ul className={`answers${view.reveal?.right ? " is-won" : ""}`} aria-label="Answers">
          {ANSWER_POSITIONS.map((position) => {
            const answer = view.answers[position]!;
            // Taken away by the 50:50: its place stays, empty, so the others don't move.
            if (answer.removed) return <li key={position} className="answers__gone" />;
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

        {view.lockedIn && <LockedIn key={rung} text={view.lockedIn} />}
        {view.reveal && (
          <Reveal key={rung} reveal={view.reveal} onNext={() => game.send({ type: "next" })} />
        )}
        {choosing && view.walkAway && (
          <Button variant="quiet" onClick={() => game.send({ type: "walkAway" })}>
            {view.walkAway.link}
          </Button>
        )}
        {choosing && (
          <Button
            variant="quiet"
            onClick={() => {
              // Main menu pauses: the Game is saved after every step, so this
              // just lets go of it in this tab, and Resume brings it back.
              setCurrentGame(undefined);
              void navigate({ to: "/" });
            }}
          >
            Main menu
          </Button>
        )}
        <MuteButton />
      </div>
      <LadderColumn rows={ladder} stepping={stepping} inert={dimmed} />

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
      {lifelines.pickFriend && (
        <PickFriendDialog
          pick={lifelines.pickFriend}
          onCall={(friend) => game.send({ type: "callFriend", friend })}
          onCancel={() => game.send({ type: "cancel" })}
        />
      )}
      {showingKeys && <KeysDialog onClose={() => setShowingKeys(false)} />}
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
 * Through the reveal wait: the locked-in answer in words, and that the
 * reveal is coming. It takes focus, so screen readers say it and focus isn't
 * left on a disabled answer; the reveal then moves focus to Next.
 */
function LockedIn({ text }: { text: string }) {
  const line = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    line.current?.focus();
  }, []);
  return (
    <p ref={line} tabIndex={-1} className="locked-in">
      {text}
    </p>
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
