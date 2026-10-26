import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "../ui/lozenge";
import { ScreenHeading } from "../ui/screen-heading";

export const Route = createFileRoute("/")({
  component: MainMenu,
});

function MainMenu() {
  const navigate = useNavigate();
  return (
    <main className="screen hero">
      <div className="logo">
        <ScreenHeading className="">Trivia</ScreenHeading>
      </div>
      <p className="muted">Fifteen questions. One million dollars.</p>
      <div className="menu">
        <Button variant="primary" onClick={() => void navigate({ to: "/topics" })}>
          Play
        </Button>
      </div>
    </main>
  );
}
