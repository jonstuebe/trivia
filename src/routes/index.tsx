import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useId, useState } from "react";
import { storage } from "../app/game-services";
import { mainMenuView } from "../screens/main-menu-view";
import { Dialog } from "../ui/dialog";
import { Button } from "../ui/lozenge";
import { ScreenHeading } from "../ui/screen-heading";

export const Route = createFileRoute("/")({
  component: MainMenu,
});

/**
 * The Main menu: Resume when a Game is saved (then Play steps back), Play,
 * the Personal bests, and Reset all seen questions behind a confirm.
 */
function MainMenu() {
  const navigate = useNavigate();
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [notice, setNotice] = useState<string>();
  const bestsId = useId();

  const saved = storage.savedGame()?.context;
  const view = mainMenuView({ saved, personalBest: storage.personalBest });

  function resetAll() {
    storage.resetAll();
    setConfirmingReset(false);
    setNotice("All seen questions cleared.");
  }

  return (
    <main className="screen hero">
      <div className="logo">
        <ScreenHeading className="">Trivia</ScreenHeading>
      </div>
      <p className="muted">Fifteen questions. One million dollars.</p>
      <div className="menu">
        {/* /game brings the Saved game back. */}
        {view.resume && (
          <Button variant="primary" onClick={() => void navigate({ to: "/game" })}>
            {view.resume}
          </Button>
        )}
        <Button variant={view.resume ? "secondary" : "primary"} onClick={() => void navigate({ to: "/topics" })}>
          Play
        </Button>
      </div>

      <section className="bests" aria-labelledby={bestsId}>
        <h2 id={bestsId} className="section-title">
          Personal bests
        </h2>
        {view.personalBests.length === 0 ? (
          <p className="muted">None yet</p>
        ) : (
          <ul className="bests__list">
            {view.personalBests.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}
      </section>

      <div role="status">{notice && <p className="notice">{notice}</p>}</div>
      <Button variant="quiet" onClick={() => setConfirmingReset(true)}>
        Reset all seen questions
      </Button>

      {confirmingReset && (
        <Dialog
          title="Forget every question you have seen, so they can all come up as new again?"
          onCancel={() => setConfirmingReset(false)}
        >
          <div className="dialog__buttons">
            <Button variant="primary" onClick={resetAll}>
              Reset all
            </Button>
            <Button onClick={() => setConfirmingReset(false)}>Cancel</Button>
          </div>
        </Dialog>
      )}
    </main>
  );
}
