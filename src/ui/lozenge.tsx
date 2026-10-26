import type { ButtonHTMLAttributes, ReactNode } from "react";

/** The Question, in its centred lozenge. */
export function QuestionLozenge({ children }: { children: ReactNode }) {
  return <p className="lozenge lozenge--question">{children}</p>;
}

type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "type">;

/** One answer: its gold letter ("A:"), then its text. */
export function AnswerLozenge({ letter, children, ...props }: ButtonProps & { letter: string }) {
  return (
    <button type="button" className="lozenge answer" {...props}>
      <span className="answer__letter">{letter}:</span>
      <span>{children}</span>
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
