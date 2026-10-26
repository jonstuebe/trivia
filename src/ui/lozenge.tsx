import type { ComponentPropsWithRef, ReactNode } from "react";

/** The Question, in its centred lozenge. */
export function QuestionLozenge({ children }: { children: ReactNode }) {
  return <p className="lozenge lozenge--question">{children}</p>;
}

type ButtonProps = Omit<ComponentPropsWithRef<"button">, "className" | "type">;

/** How an answer is shown: picked (amber), right (green, ✓) or wrong (red, ✗). */
export type AnswerLozengeMark = "none" | "picked" | "right" | "wrong";

const MARK_ICON: Partial<Record<AnswerLozengeMark, string>> = { right: "✓", wrong: "✗" };

/**
 * One answer: its gold letter ("A:"), then its text, and at the reveal a ✓ or
 * ✗. The icon is decorative; say the reveal in words in `aria-label`.
 */
export function AnswerLozenge({
  letter,
  mark = "none",
  children,
  ...props
}: ButtonProps & { letter: string; mark?: AnswerLozengeMark }) {
  const icon = MARK_ICON[mark];
  return (
    <button type="button" className={`lozenge answer${mark === "none" ? "" : ` is-${mark}`}`} {...props}>
      <span className="answer__letter">{letter}:</span>
      <span className="answer__text">{children}</span>
      {icon && (
        <span className="answer__mark" aria-hidden="true">
          {icon}
        </span>
      )}
    </button>
  );
}

/**
 * A screen's button. `primary` (gold) is the screen's main action, `secondary`
 * (blue outline) the rest, and `quiet` an underlined text button for actions
 * kept out of the way, such as Walk away or Reset all.
 */
export function Button({
  variant = "secondary",
  ...props
}: ButtonProps & { variant?: "primary" | "secondary" | "quiet" }) {
  const className =
    variant === "quiet" ? "link-quiet" : `lozenge lozenge--button${variant === "primary" ? " lozenge--primary" : ""}`;
  return <button type="button" className={className} {...props} />;
}
