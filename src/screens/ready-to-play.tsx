import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { controller, startGame, storage } from "../app/game-services";
import { questionCount, topicName } from "../game/topic";
import type { Topic } from "../game/types";
import { Button } from "../ui/lozenge";
import { formatMoney } from "../ui/money";
import { ScreenHeading } from "../ui/screen-heading";

/**
 * The screen at a Topic's own URL: Ready to play, or Not enough new questions
 * when the Topic can't fill a Game with unseen Questions (`enoughNew` from
 * the controller's run-out check). Reset this topic or Play anyway turn it
 * into Ready to play.
 */
export function TopicScreen({ topic, enoughNew }: { topic: Topic; enoughNew: boolean }) {
  const [view, setView] = useState<"ready" | "notEnough">(enoughNew ? "ready" : "notEnough");
  const [notice, setNotice] = useState<string>();
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const name = topicName(topic);

  const back = () =>
    void navigate(topic.kind === "general" ? { to: "/topics" } : { to: "/topics", search: { category: topic.category } });

  async function reset() {
    setBusy(true);
    await controller.resetTopic(topic);
    setBusy(false);
    setNotice(`Seen questions for ${name} cleared.`);
    setView("ready");
  }

  async function start() {
    setBusy(true);
    await startGame(topic);
    await navigate({ to: "/game" });
  }

  if (view === "notEnough") {
    return (
      <main className="screen ready" key="notEnough">
        <ScreenHeading>Not enough new questions</ScreenHeading>
        <p>
          You've seen almost all {questionCount(topic)} {name} questions.
        </p>
        <p className="muted">
          There aren't enough new ones left for a whole game. Reset this topic to see them all as new, or play anyway
          (repeats come oldest-seen first).
        </p>
        <div className="menu">
          <Button variant="primary" disabled={busy} onClick={() => void reset()}>
            Reset this topic
          </Button>
          <Button onClick={() => setView("ready")}>Play anyway</Button>
          <Button variant="quiet" onClick={back}>
            ← Back
          </Button>
        </div>
      </main>
    );
  }

  const best = storage.personalBest(topic);
  const saved = storage.savedGame()?.context;
  return (
    <main className="screen ready" key="ready">
      <ScreenHeading className="ready-title">
        <span className="ready-title__kicker">Ready to play: </span>
        <span className="ready-title__topic">{name}</span>
      </ScreenHeading>
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      <p>
        Personal best:{" "}
        {best === undefined ? <span className="muted">none yet</span> : <span className="money">{formatMoney(best)}</span>}
      </p>
      {saved && (
        <p className="muted">
          ⚠ Starting will discard your saved {topicName(saved.topic)} game (question {saved.rung}).
        </p>
      )}
      <div className="menu">
        <Button variant="primary" disabled={busy} onClick={() => void start()}>
          Start
        </Button>
        <Button variant="quiet" onClick={back}>
          ← Back
        </Button>
      </div>
    </main>
  );
}
