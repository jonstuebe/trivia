import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { currentGame } from "../app/game-services";
import { GameScreen } from "../screens/game-screen";

// The Game, and Game over when it ends. With no Game in this tab (a refresh,
// or a link straight here) it goes to the Main menu; bringing back the Saved
// game on a refresh is #38.
export const Route = createFileRoute("/game")({
  beforeLoad: () => {
    if (!currentGame()) throw redirect({ to: "/" });
  },
  component: Game,
});

function Game() {
  // Held for the screen's life: leaving Game over clears the tab's current Game.
  const [game] = useState(currentGame);
  return game ? <GameScreen game={game} /> : null;
}
