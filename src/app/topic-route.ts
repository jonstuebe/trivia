import { redirect } from "@tanstack/react-router";
import { topicFromPath } from "../game/topic";
import { controller } from "./game-services";

/**
 * The route options shared by every Topic URL (`/general`, `/tv`,
 * `/movies/<slug>`): the Topic read from the path, then the run-out check
 * that picks Ready to play or Not enough new questions. A path that isn't a
 * listed Topic goes to the Topic picker (Phase 5 adds a note saying why).
 */
export const topicRouteOptions = {
  beforeLoad: ({ location }: { location: { pathname: string } }) => {
    const topic = topicFromPath(location.pathname);
    if (!topic) throw redirect({ to: "/topics" });
    return { topic };
  },
  loader: ({ context }: { context: { topic: NonNullable<ReturnType<typeof topicFromPath>> } }) =>
    controller.checkTopic(context.topic),
  // Seen questions change while playing, so the check runs fresh on every visit.
  staleTime: 0,
  gcTime: 0,
};
