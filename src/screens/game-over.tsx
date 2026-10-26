import { useNavigate } from "@tanstack/react-router";
import { setCurrentGame } from "../app/game-services";
import type { GameOver } from "../game/game-controller";
import { shownNow } from "../game/machine";
import type { Topic } from "../game/types";
import { Button } from "../ui/lozenge";
import { ScreenHeading } from "../ui/screen-heading";
import { gameOverView } from "./game-over-view";
import type { GameSnapshot } from "./game-view";

/**
 * Game over: how it ended, the correct answer after a miss, the winnings,
 * the Personal best and the Share result, then Play again (the Topic's Ready
 * to play, or Not enough new questions) and Main menu. The Share button is
 * Phase 5.
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

/** The route of a Topic's own screen. */
function topicRoute(topic: Topic) {
  if (topic.kind === "general") return { to: "/general" } as const;
  if (topic.kind === "category") return { to: "/$category", params: { category: topic.category } } as const;
  return { to: "/$category/$slug", params: { category: topic.category, slug: topic.slug } } as const;
}
