import { createFileRoute } from "@tanstack/react-router";
import { topicKey } from "../game/topic";
import { topicRouteOptions } from "../app/topic-route";
import { TopicScreen } from "../screens/ready-to-play";

// `/tv` and `/movies`: the Category's Mixed game.
export const Route = createFileRoute("/$category/")({
  ...topicRouteOptions,
  component: Category,
});

function Category() {
  const { topic } = Route.useRouteContext();
  const { enoughNew } = Route.useLoaderData();
  return <TopicScreen key={topicKey(topic)} topic={topic} enoughNew={enoughNew} />;
}
