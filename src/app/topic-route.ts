import { redirect } from "@tanstack/react-router";
import { topicFromPath } from "../game/topic";
import { controller } from "./game-services";

/**
 * The route options shared by every Topic URL (`/general`, `/tv`,
 * `/movies/<slug>`): the Topic read from the path, then the run-out check
 * that picks Ready to play or Not enough new questions. A path that isn't a
 * listed Topic goes to the Topic picker with "That topic isn't available",
 * flagged in history state (see `topicUnavailable`).
 */
export const topicRouteOptions = {
  beforeLoad: ({ location }: { location: { pathname: string } }) => {
    const topic = topicFromPath(location.pathname);
    if (!topic) throw redirect({ to: "/topics", state: { topicUnavailable: true }, replace: true });
    return { topic };
  },
  loader: ({ context }: { context: { topic: NonNullable<ReturnType<typeof topicFromPath>> } }) =>
    controller.checkTopic(context.topic),
  // Seen questions change while playing, so the check runs fresh on every visit.
  staleTime: 0,
  gcTime: 0,
};

declare module "@tanstack/history" {
  interface HistoryState {
    /**
     * Set on the Topic picker's entry by a link to a Topic that can't be
     * played, so the picker shows "That topic isn't available". The picker
     * clears it once read, so a refresh or Back to that entry shows no note.
     */
    topicUnavailable?: true;
  }
}
