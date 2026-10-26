import { createFileRoute } from "@tanstack/react-router";
import { topicKey } from "../game/topic";
import { topicRouteOptions } from "../app/topic-route";
import { ReadyToPlayOrNotEnough } from "../screens/ready-to-play";

export const Route = createFileRoute("/general")({
  ...topicRouteOptions,
  component: General,
});

function General() {
  const { topic } = Route.useRouteContext();
  const { enoughNew } = Route.useLoaderData();
  return <ReadyToPlayOrNotEnough key={topicKey(topic)} topic={topic} enoughNew={enoughNew} />;
}
