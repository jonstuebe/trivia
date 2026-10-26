import { createFileRoute } from "@tanstack/react-router";
import { topicKey } from "../game/topic";
import { topicRouteOptions } from "../app/topic-route";
import { TopicScreen } from "../screens/ready-to-play";

// `/tv/<slug>` and `/movies/<slug>`: one Title.
export const Route = createFileRoute("/$category/$slug")({
  ...topicRouteOptions,
  component: Title,
});

function Title() {
  const { topic } = Route.useRouteContext();
  const { enoughNew } = Route.useLoaderData();
  return <TopicScreen key={topicKey(topic)} topic={topic} enoughNew={enoughNew} />;
}
