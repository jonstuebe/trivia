import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "../ui/lozenge";
import { ScreenHeading } from "../ui/screen-heading";

export const Route = createFileRoute("/topics")({
  component: TopicPicker,
});

// The Topic picker's place in the Studio shell, so Play has somewhere to go.
// Its Categories and Titles come with the Topic picker screen itself.
function TopicPicker() {
  const navigate = useNavigate();
  return (
    <main className="screen">
      <ScreenHeading>Pick a topic</ScreenHeading>
      <p className="muted">Choose a category.</p>
      <Button variant="quiet" onClick={() => void navigate({ to: "/" })}>
        ← Back
      </Button>
    </main>
  );
}
