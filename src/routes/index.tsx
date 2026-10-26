import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: MainMenu,
});

function MainMenu() {
  return (
    <main>
      <h1>Trivia</h1>
      <p>Main menu coming soon: pick a Topic and climb the Ladder.</p>
    </main>
  );
}
