import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { controller, currentGame, setCurrentGame } from "../app/game-services";
import { GameScreen } from "../screens/game-screen";

// The Game, and Game over when it ends. With no Game in this tab (a refresh,
// Resume from the Main menu, or a link straight here) it brings back the
// Saved game, one saved during "Final answer?" back at the Question with
// nothing picked; with none saved it goes to the Main menu. A finished Game
// is only shown as the Game over it reached on this visit: coming back to
// `/game` later (Back, then Forward) lets go of it, so that goes to the Main
// menu too.
export const Route = createFileRoute("/game")({
  beforeLoad: async () => {
    const game = currentGame();
    if (game && !game.gameOver()) return;
    setCurrentGame(undefined);
    const resumed = await controller.resumeGame();
    if (!resumed) throw redirect({ to: "/" });
    setCurrentGame(resumed);
  },
  component: Game,
});

function Game() {
  // Held for the screen's life: leaving Game over clears the tab's current Game.
  const [game] = useState(currentGame);
  return game ? <GameScreen game={game} /> : null;
}
