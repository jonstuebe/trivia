import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "../ui/lozenge";
import { ScreenHeading } from "../ui/screen-heading";

// A static path, so the router ranks it above `/$category`.
export const Route = createFileRoute("/privacy")({
  component: PrivacyNote,
});

/** The privacy note, linked from the Main menu: what's counted, and what stays on the device. */
function PrivacyNote() {
  const navigate = useNavigate();
  return (
    <main className="screen privacy">
      <ScreenHeading>Privacy</ScreenHeading>
      <p>
        Trivia counts anonymous page visits through Cloudflare Web Analytics, which uses no cookies and doesn't
        identify you. If your browser sends a privacy signal (Global Privacy Control or Do Not Track), nothing is
        counted at all. Your game progress, Personal bests and the questions you've seen stay on this device and
        are never sent anywhere.
      </p>
      <Button variant="quiet" onClick={() => void navigate({ to: "/" })}>
        ← Main menu
      </Button>
    </main>
  );
}
