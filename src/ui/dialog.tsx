import { useEffect, useId, useLayoutEffect, useRef, type ReactNode } from "react";

/**
 * A confirm dialog: "Final answer / Cancel", "Walk away with $X? / Cancel",
 * and the others that ask before going on. It opens as a modal `<dialog>`
 * while mounted, so focus is trapped inside it and the screen behind it is
 * inert, and the stage dims behind it (studio.css). Render it only while it
 * should show.
 *
 * - Focus starts on its first control, so put the confirming one first:
 *   Enter then confirms.
 * - Esc calls `onCancel`, as the Cancel button should.
 * - On closing, focus goes back to where it was when it opened, unless the
 *   screen moves it on (as the reveal does to Next).
 */
export function Dialog({
  title,
  onCancel,
  children,
}: {
  /** The question asked, as the dialog's heading and accessible name. */
  title: ReactNode;
  onCancel: () => void;
  /** The dialog's buttons, and anything else shown under the title. */
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const cancel = useRef(onCancel);
  useEffect(() => {
    cancel.current = onCancel;
  });

  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const returnTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
    return () => {
      dialog.close();
      if (returnTo?.isConnected) returnTo.focus();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        // Esc: the screen decides what Cancel means, and unmounts the dialog.
        event.preventDefault();
        cancel.current();
      }}
      onClose={() => {
        // Closed by the browser while still meant to show (a second Esc): treat it as Cancel.
        if (ref.current?.isConnected) cancel.current();
      }}
    >
      <h2 id={titleId} className="dialog__title">
        {title}
      </h2>
      {children}
    </dialog>
  );
}
