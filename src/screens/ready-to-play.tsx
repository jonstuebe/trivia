import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { controller, startGame, storage } from "../app/game-services";
import { topicName } from "../game/topic";
import type { Topic } from "../game/types";
import { Button } from "../ui/lozenge";
import { formatMoney } from "../ui/money";
import { ScreenHeading } from "../ui/screen-heading";
import { MuteButton } from "./mute-button";

/**
 * The screen at a Topic's own URL: Ready to play, or Not enough new questions
 * when the Topic can't fill a Game with unseen Questions (`enoughNew` from
 * the controller's run-out check). Reset this topic turns it into Ready to
 * play; Play anyway starts the Game straight away, with repeats.
 */
export function ReadyToPlayOrNotEnough({ topic, enoughNew }: { topic: Topic; enoughNew: boolean }) {
  const [showing, setShowing] = useState<"readyToPlay" | "notEnough">(enoughNew ? "readyToPlay" : "notEnough");
  const [notice, setNotice] = useState<string>();
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const name = topicName(topic);

  const back = () =>
    void navigate(topic.kind === "general" ? { to: "/topics" } : { to: "/topics", search: { category: topic.category } });

  async function reset() {
    setBusy(true);
    try {
      await controller.resetTopic(topic);
    } finally {
      setBusy(false);
    }
    setNotice(`Seen questions for ${name} cleared.`);
    setShowing("readyToPlay");
  }

  async function start() {
    setBusy(true);
    try {
      await startGame(topic);
      await navigate({ to: "/game" });
    } finally {
      setBusy(false);
    }
  }

  const saved = storage.savedGame()?.context;
  const savedWarning = saved && (
    <p className="muted">
      ⚠ Starting will discard your saved {topicName(saved.topic)} game (question {saved.rung}).
    </p>
  );

  if (showing === "notEnough") {
    return (
      <main className="screen ready" key="notEnough">
        <ScreenHeading>Not enough new questions</ScreenHeading>
        <p>There aren't enough new {name} questions left for a whole game.</p>
        <p className="muted">Reset this topic to see them all as new, or play anyway (repeats come oldest-seen first).</p>
        {savedWarning}
        <div className="menu">
          <Button variant="primary" disabled={busy} onClick={() => void reset()}>
            Reset this topic
          </Button>
          <Button disabled={busy} onClick={() => void start()}>
            Play anyway
          </Button>
          <Button variant="quiet" onClick={back}>
            ← Back
          </Button>
        </div>
      </main>
    );
  }

  const best = storage.personalBest(topic);
  return (
    <main className="screen ready" key="readyToPlay">
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
      {savedWarning}
      <div className="menu">
        <Button variant="primary" disabled={busy} onClick={() => void start()}>
          Start
        </Button>
        <Button variant="quiet" onClick={back}>
          ← Back
        </Button>
      </div>
      <MuteButton />
    </main>
  );
}
