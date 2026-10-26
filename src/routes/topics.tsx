import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { storage } from "../app/game-services";
import type { TitleCategory } from "../content/schema";
import { listedTitles, offersMixedGame, topicFromPath, topicName } from "../game/topic";
import type { Topic } from "../game/types";
import { Button } from "../ui/lozenge";
import { formatMoney } from "../ui/money";
import { ScreenHeading } from "../ui/screen-heading";

interface PickerSearch {
  /** The Category being picked from, or none for the top level. */
  category?: TitleCategory;
}

export const Route = createFileRoute("/topics")({
  validateSearch: (search: Record<string, unknown>): PickerSearch =>
    search.category === "tv" || search.category === "movies" ? { category: search.category } : {},
  component: TopicPicker,
});

function TopicPicker() {
  const { category } = Route.useSearch();
  // Keyed by level, so the heading takes focus again on each level change.
  return category ? <CategoryLevel key={category} category={category} /> : <TopLevel key="top" />;
}

/** General, TV Shows and Movies; a Category with nothing to play isn't offered. */
function TopLevel() {
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
              <PersonalBestLine topic={general} />
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
function CategoryLevel({ category }: { category: TitleCategory }) {
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
          <PersonalBestLine topic={{ kind: "category", category }} />
        </Link>
      )}
      <ul className="tiles tiles--titles" aria-label={`${name} titles`}>
        {titles.map((title) => (
          <li key={title.slug}>
            <Link className="tile" to="/$category/$slug" params={{ category, slug: title.slug }}>
              {title.name}
              <PersonalBestLine topic={{ kind: "title", category, slug: title.slug }} />
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

function PersonalBestLine({ topic }: { topic: Topic }) {
  const best = storage.personalBest(topic);
  return <small>{best === undefined ? "Not played" : `Best ${formatMoney(best)}`}</small>;
}
