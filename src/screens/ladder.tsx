import { useEffect, useRef } from "react";
import type { RungView } from "./ladder-view";

const rowClass = (row: RungView) => [row.safe && "is-safe", row.state === "done" && "is-done"].filter(Boolean).join(" ");

/*
 * The Ladder comes in two shapes, and CSS shows one or the other, so screen
 * readers only ever meet one. Safe levels and the current Rung are said in
 * words as well as shown.
 */

/**
 * Both shapes take `stepping` while a right answer is revealed, the current
 * Rung having just moved up one, so the gold steps up into it (studio.css),
 * and `inert` while the stage is dimmed for the reveal wait.
 */
interface LadderProps {
  rows: RungView[];
  stepping?: boolean;
  inert?: boolean;
}

/** Desktop: a column on the right, Rung 15 at the top, the current Rung gold, the Safe levels white and bold. */
export function LadderColumn({ rows, stepping = false, inert = false }: LadderProps) {
  return (
    <ol className={`ladder${stepping ? " is-stepping" : ""}`} aria-label="Ladder" inert={inert}>
      {rows.map((row) => (
        <li key={row.rung} className={rowClass(row)} aria-current={row.state === "current" ? "step" : undefined}>
          <span>{row.rung}</span>
          <span>
            {row.prize}
            {row.safe && <span className="visually-hidden">, safe level</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Phones: a strip across the top, centred on the current Rung, short amounts, the Safe levels underlined. */
export function LadderStrip({ rows, stepping = false, inert = false }: LadderProps) {
  const strip = useRef<HTMLOListElement>(null);
  const current = rows.find((row) => row.state === "current")?.rung;

  // Centre the current Rung, scrolling the strip only, never the page.
  useEffect(() => {
    const list = strip.current;
    const chip = list?.querySelector<HTMLElement>('[aria-current="step"]');
    if (!list || !chip) return;
    list.scrollTo({ left: chip.offsetLeft - (list.clientWidth - chip.offsetWidth) / 2 });
  }, [current]);

  return (
    // Scrollable, so it takes focus for keyboard scrolling.
    <ol
      ref={strip}
      className={`ladder-strip${stepping ? " is-stepping" : ""}`}
      aria-label="Ladder"
      tabIndex={0}
      inert={inert}
    >
      {rows.map((row) => (
        <li key={row.rung} className={rowClass(row)} aria-current={row.state === "current" ? "step" : undefined}>
          <small>{row.rung}</small>
          {row.short}
          {row.safe && <span className="visually-hidden">, safe level</span>}
        </li>
      ))}
    </ol>
  );
}
