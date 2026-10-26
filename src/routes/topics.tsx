import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import type { TitleCategory } from "../content/schema";
import { listedTitles, offersMixedGame, topicFromPath, topicName } from "../game/topic";
import { Button } from "../ui/lozenge";
import { ScreenHeading } from "../ui/screen-heading";

interface PickerSearch {
  /** The Category being picked from, or none for General, TV Shows and Movies. */
  category?: TitleCategory;
}

export const Route = createFileRoute("/topics")({
  validateSearch: (search: Record<string, unknown>): PickerSearch =>
    search.category === "tv" || search.category === "movies" ? { category: search.category } : {},
  component: TopicPicker,
});

function TopicPicker() {
  const { category } = Route.useSearch();
  // Keyed by what's being picked, so the heading takes focus again on each change.
  return category ? <PickerCategory key={category} category={category} /> : <PickerTop key="top" />;
}

/** General, TV Shows and Movies; a Category with nothing to play isn't offered. */
function PickerTop() {
  const navigate = useNavigate();
  const categories = (["tv", "movies"] as const).filter((category) => listedTitles(category).length > 0);
  const general = topicFromPath("/general");
  return (
    <main className="screen">
      <ScreenHeading>Pick a topic</ScreenHeading>
      <p className="muted">Choose a category.</p>
      <ul className="tiles">
        {general && (
          <li>
            <Link className="tile" to="/general">
              General
            </Link>
          </li>
        )}
        {categories.map((category) => (
          <li key={category}>
            <Link className="tile" to="/topics" search={{ category }}>
              {topicName({ kind: "category", category })}
            </Link>
          </li>
        ))}
      </ul>
      {!general && categories.length === 0 && <p className="muted">No topics yet.</p>}
      <Button variant="quiet" onClick={() => void navigate({ to: "/" })}>
        ← Back
      </Button>
    </main>
  );
}

/** One Category's listed Titles, after "All … (mixed)" when it has 2 or more. */
function PickerCategory({ category }: { category: TitleCategory }) {
  const navigate = useNavigate();
  const name = topicName({ kind: "category", category });
  const titles = listedTitles(category);
  const mixed = offersMixedGame(category);
  return (
    <main className="screen">
      <ScreenHeading>{name}</ScreenHeading>
      <p className="muted">{mixed ? "Play every title mixed together, or pick one." : "Pick a title."}</p>
      {mixed && (
        <Link className="tile" to="/$category" params={{ category }}>
          All {name} (mixed)
        </Link>
      )}
      <ul className="tiles tiles--titles" aria-label={`${name} titles`}>
        {titles.map((title) => (
          <li key={title.slug}>
            <Link className="tile" to="/$category/$slug" params={{ category, slug: title.slug }}>
              {title.name}
            </Link>
          </li>
        ))}
      </ul>
      <Button variant="quiet" onClick={() => void navigate({ to: "/topics", search: {} })}>
        ← Back
      </Button>
    </main>
  );
}
