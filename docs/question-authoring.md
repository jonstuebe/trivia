# Question authoring

The rules every Question follows. Decided in [Question authoring rules](https://github.com/jonstuebe/trivia/issues/9); the launch Titles and franchise rules come from [Launch Titles](https://github.com/jonstuebe/trivia/issues/4). The file format is `src/content/schema.ts`, and the terms are in `GLOSSARY.md`. Questions are written with the `write-questions` skill (`.claude/skills/write-questions/`), which applies these rules, runs the verification pass and runs the content checks.

Each Topic aims for about 75 Questions, 15 per Tier. A Title appears in the topic picker once it has about 20.

## Tier placement

A Tier is decided by roughly what share of that Topic's players would know the answer. For General, "players" means the general public.

| Tier | Rungs | Would know it | Who |
| --- | --- | --- | --- |
| 1 | 1–3 | ~90% | anyone who's seen it or heard of it |
| 2 | 4–6 | ~70% | a casual fan |
| 3 | 7–9 | ~50% | a regular fan |
| 4 | 10–12 | ~25% | a big fan |
| 5 | 13–15 | ~10% | a superfan |

## Wrong answers

- The same kind of thing as the right answer (four characters, four years, four cities), roughly the same length, and believable to someone unsure.
- Each one plainly wrong: never partly true, and never "all of the above".
- A Tier 1 Question may use one joke wrong answer, as the show does.

## Fact checking

- **`source`** is required for Tiers 3–5, and for any number, date or quote at any Tier. Elsewhere it is optional. It names where the fact can be checked: an episode (`S7E4`), a film and scene, or a page a reader can open. Players never see it.
- **Verification pass:** a fresh agent with web access re-checks every Question against a source and flags doubts, without seeing the author's reasoning.
- A flagged Question is either fixed, with a source both agents agree on, or dropped. Nothing flagged ships.
- The person does not spot-check, so the verification pass is the only check on facts.

## Movie franchises

- A movie Title covers its theatrical films only. The Star Wars Title excludes The Mandalorian, and the Marvel Cinematic Universe Title excludes the Disney+ series.
- The prompt names the film whenever the fact belongs to one film ("In Toy Story 3, …"), and leaves it out when the fact holds across the franchise. Pixar is one Title spanning unrelated films, so nearly every Pixar prompt names its film. Disney (the Walt Disney Animation Studios films) is the same, and a film that has a live-action remake always gets its year in the prompt, whether or not the fact differs in the remake ("In The Lion King (1994), …", "In Mulan (1998), …").
- Coverage is weighted toward the best-known films.

## Story vs making-of

TV and Movies Questions are mostly about the story: characters, plots, quotes. Up to about a fifth are about the cast, production and awards.

A story answer must be said or shown in the film or episode itself. A name or fact that appears only in the credits, a book, a script, an interview or a fan wiki does not count, however well known: the Beast's name "Adam", Andy's surname "Davis" and the "dianoga" in the trash compactor all fail. Cast, production and award Questions are the exception, since they are about the making of the film.

A prompt never names its own Title. In Mixed games the game shows the Title as a label above the Question, so the prompt stays clean. The build check matches the Title's name anywhere in the prompt, so film and character names that contain it fail too. Name the film by the rest of its title, and the character by first name:

| Title | Fails the check | Write instead |
| --- | --- | --- |
| Star Wars | "In Star Wars: A New Hope, …" | "In A New Hope, …" |
| Harry Potter | "In Harry Potter and the Goblet of Fire, …", "What is Harry Potter's …" | "In Goblet of Fire, …", "What is Harry's …" |
| Jurassic Park | "In Jurassic Park III, …", "In the first Jurassic Park film, …" | "In the third film, …", "In the 1993 film, …" |
| Friends | "How did Friends end?" | "How did the series end?" |

## General Subjects

Every General Question has a `subject`, which picks the Phone a Friend specialist. Each Subject gets about a quarter of General's ~75 Questions, spread across every Tier.

| `subject` | Covers |
| --- | --- |
| `history` | history, geography, politics, religion and mythology |
| `science` | science, nature, the human body, technology, maths |
| `sports` | sports, the Olympics, games |
| `pop culture` | film, TV, music, books, art, food and drink, famous people |

## Spelling and quoted lines

- Use American spelling: color, honor, favorite, flavor, defense. A proper name keeps its own spelling (the album Rumours).
- A right answer that is a line from the film or episode has no surrounding quote marks and no trailing full stop, but keeps a "!" or "?" if it is spoken that way (Bazinga!), and its wrong answers match its style. A fill-in-the-line prompt asks to complete the line and ends with its quoted start, closed by "…" inside the quote marks: Complete Leia's plea: "Help me, Obi-Wan Kenobi. You're my…"

## Avoid change and dispute

- Write facts that stay true: no "current", "latest" or "still". A record gets its date ("In 2008, who …").
- Exactly one defensible right answer, with no disputed superlatives.
- Plain wording: no tricks or double negatives.

## Build checks

`bun run check-content` runs these on every Topic file, on top of the schema. The code is `src/content/authoring-rules.ts` and `src/content/report.ts`.

Failures:

- No duplicate prompts across all files, ignoring case and punctuation.
- The four answers in a Question are all different.
- A prompt is at most 120 characters, and each answer at most 40.
- A TV or Movies prompt never contains its own Title's name, matched as whole words with the same capitals.

Not failures, printed on every run:

- A warning when the right answer is much longer than the wrong ones.
- A report of Questions per Tier, and per Subject for General.

The `source` rule and everything else above are not build checks: the author and the verification pass hold them.

## Writing a Topic file

1. Write new Questions without an `id`.
2. Run `bun run assign-ids` to give each one a short random ID. An ID never changes after that.
3. Run `bun run check-content`, and commit the Topic file with the topic index it writes.
