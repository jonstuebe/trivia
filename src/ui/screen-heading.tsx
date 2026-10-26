import { useEffect, useRef, type ReactNode } from "react";

/**
 * A screen's `h1`. It takes focus when the screen appears, so keyboard and
 * screen-reader users start at the top of the new screen. It's styled as a
 * screen title unless `className` gives it a look of its own. `describedBy`
 * names a note read out with the heading when it takes focus.
 */
export function ScreenHeading({
  className = "screen-title",
  describedBy,
  children,
}: {
  className?: string;
  describedBy?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <h1 ref={ref} tabIndex={-1} className={className} aria-describedby={describedBy}>
      {children}
    </h1>
  );
}
