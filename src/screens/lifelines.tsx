import { useEffect, useRef } from "react";
import type { GameEvent } from "../game/machine";
import type { Friend } from "../game/types";
import { Dialog } from "../ui/dialog";
import { Button } from "../ui/lozenge";
import { keyList } from "./game-keys";
import type { LifelinesView } from "./lifelines-view";

/**
 * The Lifeline ovals above the Question, then whatever the Lifelines have
 * said about it: the 50:50's two removed answers (to screen readers), the
 * audience's vote as a chart and in words, and the Friend's line. A result
 * takes focus when it appears, so it's read next.
 */
export function Lifelines({ view, onUse }: { view: LifelinesView; onUse: (event: GameEvent) => void }) {
  return (
    <div className="lifelines-area">
      <ul className="lifelines" aria-label="Lifelines">
        {view.ovals.map((oval) => (
          <li key={oval.lifeline}>
            <button
              type="button"
              className={`lifeline${oval.state === "ready" ? "" : ` is-${oval.state}`}`}
              aria-disabled={!oval.enabled}
              aria-keyshortcuts={oval.key}
              title={oval.name}
              onClick={() => {
                if (oval.enabled) onUse(oval.event);
              }}
            >
              <span aria-hidden="true">{oval.label}</span>
              <span className="visually-hidden">
                {oval.name}
                {oval.status && `, ${oval.status}`}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {view.fiftyFifty && (
        <p role="status" className="visually-hidden">
          {view.fiftyFifty}
        </p>
      )}
      {view.audience && <AudienceVote audience={view.audience} />}
      {view.friend && <FriendLine line={view.friend} />}
    </div>
  );
}

/** Focuses the element it's given once, when it appears. */
function useFocusOnMount<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return ref;
}

function AudienceVote({ audience }: { audience: NonNullable<LifelinesView["audience"]> }) {
  const ref = useFocusOnMount<HTMLElement>();
  return (
    <figure ref={ref} tabIndex={-1} className="audience">
      <figcaption className="audience__caption">Ask the Audience</figcaption>
      {/* The chart; the line under it says the same in words. */}
      <div className="audience__chart" aria-hidden="true">
        {audience.bars.map((bar) => (
          <div key={bar.letter} className="audience__column">
            <span className="audience__percent">{bar.percent}%</span>
            <span className="audience__track">
              <span className="audience__bar" style={{ height: `${bar.percent}%` }} />
            </span>
            <span className="audience__letter">{bar.letter}</span>
          </div>
        ))}
      </div>
      <p className="audience__text">{audience.text}</p>
    </figure>
  );
}

function FriendLine({ line }: { line: string }) {
  const ref = useFocusOnMount<HTMLParagraphElement>();
  return (
    <p ref={ref} tabIndex={-1} className="friend-line">
      {line}
    </p>
  );
}

/** Phone a Friend's "Who do you call?": the four Friends, then Cancel, which doesn't spend it. */
export function PickFriendDialog({
  pick,
  onCall,
  onCancel,
}: {
  pick: NonNullable<LifelinesView["pickFriend"]>;
  onCall: (friend: Friend) => void;
  onCancel: () => void;
}) {
  return (
    <Dialog title={pick.title} onCancel={onCancel}>
      <p className="dialog__note">{pick.subject}</p>
      <div className="dialog__buttons">
        {pick.friends.map(({ friend, name }) => (
          <Button key={friend} onClick={() => onCall(friend)}>
            {name}
          </Button>
        ))}
        <Button variant="quiet" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </Dialog>
  );
}

/** The `?` list: every Game key, as `GAME_KEYS` has them. */
export function KeysDialog({ onClose }: { onClose: () => void }) {
  return (
    <Dialog title="Keys" onCancel={onClose}>
      <dl className="keys">
        {keyList().map((row) => (
          <div key={row.keys} className="keys__row">
            <dt>
              <kbd>{row.keys}</kbd>
            </dt>
            <dd>{row.description}</dd>
          </div>
        ))}
      </dl>
      <div className="dialog__buttons">
        <Button variant="primary" onClick={onClose}>
          Close
        </Button>
      </div>
    </Dialog>
  );
}
