# Trivia

An online web app trivia game in the spirit of _Who Wants to Be a Millionaire_, where the player picks the topic before playing.

- **General:** a mixed-topic game, close to the classic Millionaire format.
- **Broad topics:** e.g. **TV shows** or **Movies**, with questions drawn from many titles in that category.
- **Subcategories:** a single specific TV show or movie.

The launch Titles are Friends, The Big Bang Theory and Modern Family for TV, and the Star Wars, Harry Potter, Marvel Cinematic Universe, Jurassic Park and Pixar franchises for Movies. The concept is still taking shape, so expect this section to change.

How the game plays (the ladder, lifelines, topics, the question files and what's remembered on the device) is in `docs/game-design.md`.

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five default labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
