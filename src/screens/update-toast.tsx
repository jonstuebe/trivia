import { useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { Button } from "../ui/lozenge";

/**
 * The Update toast: once a new deploy's service worker has downloaded and is
 * waiting, a small note at the foot of the screen says a new version is ready,
 * with Refresh to switch to it now and Later to hide it for this visit.
 *
 * It stays off the Game screen, where it would sit over the answers; it shows
 * on the next screen instead. Refresh is safe anywhere, since a refresh puts a
 * Game in progress straight back where it was.
 *
 * The browser looks for a new version on each page load; the app also looks
 * whenever it comes back to the foreground, so an installed app left open for
 * days still notices a deploy.
 */
export function UpdateToast() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({ onRegisteredSW: checkOnReturn });
  const [later, setLater] = useState(false);
  const inGame = useRouterState({ select: (state) => state.location.pathname === "/game" });

  if (!needRefresh || later || inGame) return null;
  return (
    <aside className="update-toast" aria-label="Update">
      <p role="status">A new version of Trivia is ready.</p>
      <div className="update-toast__buttons">
        <Button variant="quiet" onClick={() => setLater(true)}>
          Later
        </Button>
        <Button variant="primary" onClick={() => void updateServiceWorker()}>
          Refresh
        </Button>
      </div>
    </aside>
  );
}

/** Asks the server for a new service worker each time the app comes back into view. */
function checkOnReturn(_url: string, registration: ServiceWorkerRegistration | undefined) {
  if (!registration) return;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && navigator.onLine) void registration.update();
  });
}
