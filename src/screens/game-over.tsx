import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { setCurrentGame } from "../app/game-services";
import type { GameOver } from "../game/game-controller";
import { shownNow } from "../game/machine";
import { topicRoute } from "../game/topic";
import { Button } from "../ui/lozenge";
import { ScreenHeading } from "../ui/screen-heading";
import { gameOverView } from "./game-over-view";
import type { GameSnapshot } from "./game-view";
import { browserShareDevice, shareOut, type ShareOutcome } from "./share-out";

/**
 * Game over: how it ended, the correct answer after a miss, the winnings,
 * the Personal best and the Share result, then Play again (the Topic's Ready
 * to play, or Not enough new questions) and Main menu.
 */
export function GameOverScreen({ over, snapshot }: { over: GameOver; snapshot: GameSnapshot }) {
  const navigate = useNavigate();
  const shown = shownNow(snapshot.context);
  const view = gameOverView(over, shown.answers[shown.correct]);
  const topic = over.result.topic;

  function leave(to: "playAgain" | "mainMenu") {
    setCurrentGame(undefined);
    void (to === "mainMenu" ? navigate({ to: "/" }) : navigate(topicRoute(topic)));
  }

  return (
    <main className="screen game-over">
      <ScreenHeading>{view.headline}</ScreenHeading>
      {view.correctAnswer && (
        <p>
          The correct answer was: <strong>{view.correctAnswer}</strong>
        </p>
      )}
      <p className="game-over__leave">
        You leave with <span className="game-over__money">{view.winnings}</span>
      </p>
      <p>{view.personalBest}</p>
      <figure className="share">
        <figcaption className="muted">Share result</figcaption>
        <pre className="share__text">{view.share}</pre>
        <ShareButton text={view.share} />
      </figure>
      <div className="menu">
        <Button variant="primary" onClick={() => leave("playAgain")}>
          Play again
        </Button>
        <Button variant="quiet" onClick={() => leave("mainMenu")}>
          Main menu
        </Button>
      </div>
    </main>
  );
}

/** What Share says after it's pressed; the share sheet speaks for itself. */
const SHARE_NOTE: Partial<Record<ShareOutcome, string>> = {
  copied: "Copied",
  copyFailed: "Couldn't copy. Select the text above to copy it.",
};

/**
 * Share: the share sheet on phones and tablets, a copy elsewhere. The note
 * is a status region, so screen readers announce "Copied".
 */
function ShareButton({ text }: { text: string }) {
  const [note, setNote] = useState("");

  async function share() {
    // Cleared first, so a second "Copied" is announced again.
    setNote("");
    const outcome = await shareOut(text, browserShareDevice());
    setNote(SHARE_NOTE[outcome] ?? "");
  }

  return (
    <div className="share__actions">
      <Button onClick={() => void share()}>Share</Button>
      <p role="status" className="share__note">
        {note}
      </p>
    </div>
  );
}
