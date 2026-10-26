import { createFileRoute } from "@tanstack/react-router";
import { topicKey } from "../game/topic";
import { topicRouteOptions } from "../app/topic-route";
import { ReadyToPlayOrNotEnough } from "../screens/ready-to-play";

// `/tv` and `/movies`: the Category's Mixed game.
export const Route = createFileRoute("/$category/")({
  ...topicRouteOptions,
  component: Category,
});

function Category() {
  const { topic } = Route.useRouteContext();
  const { enoughNew } = Route.useLoaderData();
  return <ReadyToPlayOrNotEnough key={topicKey(topic)} topic={topic} enoughNew={enoughNew} />;
}
