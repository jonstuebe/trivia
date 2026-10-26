import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { currentGame } from "../app/game-services";
import { topicName } from "../game/topic";
import { Button } from "../ui/lozenge";
import { ScreenHeading } from "../ui/screen-heading";

export const Route = createFileRoute("/game")({
  component: Game,
});

// A placeholder so Start has somewhere to go: the Game screen (#39) replaces it.
function Game() {
  const navigate = useNavigate();
  const game = currentGame();
  return (
    <main className="screen">
      <ScreenHeading>Game</ScreenHeading>
      {game && <p className="muted">Playing {topicName(game.snapshot().context.topic)}.</p>}
      <Button variant="quiet" onClick={() => void navigate({ to: "/" })}>
        Main menu
      </Button>
    </main>
  );
}
