# v1 build spec

How v1 gets built, in seven phases. Finishing phase 7 means v1 is built and launched. How the game plays is in `docs/game-design.md`, and the terms are in `GLOSSARY.md`. Each decision below links to the ticket that holds its detail; this doc only says which phase builds it.

These decisions came out of the [v1 phased build spec map](https://github.com/jonstuebe/trivia/issues/1), finished on 2026-10-26. Change this doc when a decision changes.

## How the phases work

- **One GitHub milestone per phase.** Build tickets are made when a phase starts, not ahead of time, so each phase can use what the one before it taught.
- **Phases run in order.** One exception: writing the real Questions (phase 7) can start once phase 2 ships.
- **Every phase deploys to a preview URL:** the Worker's free `workers.dev` address. A deploy only goes out from `main` after CI passes. trivia.jonstuebe.com is attached at launch, in phase 7.
- **Each phase ends with something live and testable** at the preview URL or in CI, listed under "Done when".
- **Tests come with the work, not after it.** Pure logic is written test-first. The e2e journeys and the accessibility work for each screen land with that screen.

## Phase 1: Foundations

The empty app, built, checked and deployed.

- Vite + React + TypeScript single-page app with bun, oxlint and TanStack Router ([Tech stack and hosting](https://github.com/jonstuebe/trivia/issues/2)).
- Vitest via bun, plus a seedable random source that all game randomness goes through ([Testing approach](https://github.com/jonstuebe/trivia/issues/10)).
- GitHub Actions running lint, type check and tests, deploying to Cloudflare Workers static assets only when they pass.

**Done when:** a placeholder page is live at the `workers.dev` preview URL, and a failing test stops the deploy.

## Phase 2: Content pipeline

Question files in, a checked topic index out.

- The Zod schema for one JSON file per Title in Category folders, and the generated topic index ([Question file format](https://github.com/jonstuebe/trivia/issues/3)).
- The six content build checks: duplicates, answer uniqueness, length limits, no Title name in prompts, a warning when answer length gives the answer away, and the per-Tier and per-Subject report ([Question authoring rules](https://github.com/jonstuebe/trivia/issues/9)).
- Fixture Topic files for the test build.
- `docs/question-authoring.md` and the `write-questions` project skill: write questions, run the verification pass, run the build checks.

**Done when:** CI fails on a broken question file, and the fixtures build into a topic index.

## Phase 3: Game engine

The whole game, with no UI. Test-first throughout.

- The XState machine for a Game: the Ladder, Safe levels, Final answer, Walk away and the four Lifelines ([Screen flow](https://github.com/jonstuebe/trivia/issues/6)).
- The audience and friend simulation, including a statistical test of the odds ([Audience and friend simulation](https://github.com/jonstuebe/trivia/issues/5)).
- Question selection: unseen first, Switch the Question from the same Tier, and detecting when a Topic runs out.
- Storage: seen questions, Personal bests, the Saved game and the mute setting, with versioned keys and recovery from unreadable data ([Data kept on the device](https://github.com/jonstuebe/trivia/issues/7)).
- Building the Share result text ([Share result and topic links](https://github.com/jonstuebe/trivia/issues/8)).

**Done when:** unit tests play whole Games end to end on the fixtures with seeded randomness: a win, a miss on each side of a Safe level, a walk away, every Lifeline, a Topic running out, and a restored Saved game.

## Phase 4: Playable screens

The game, playable in a browser.

- The six screens and their routes: Main menu, Topic picker, Ready to play, Not enough new questions, Game and Game over ([Screen flow](https://github.com/jonstuebe/trivia/issues/6), [Share result and topic links](https://github.com/jonstuebe/trivia/issues/8)).
- The Studio theme: tokens, the lozenge components, and a Ladder that's vertical on desktop and horizontal on phones ([Visual direction](https://github.com/jonstuebe/trivia/issues/11)).
- Keyboard shortcuts, focus management, screen-reader announcements and text equivalents for colour, built into each screen as it's made ([Accessibility and keyboard play](https://github.com/jonstuebe/trivia/issues/14)).
- TesterArmy e2e journeys with exact steps in Chromium against the fixtures, with axe failing CI on serious or critical issues ([Testing approach](https://github.com/jonstuebe/trivia/issues/10)).

**Done when:** a full Game on a fixture Topic can be played at the preview URL by mouse, touch or keyboard alone, and the e2e journeys pass in CI.

## Phase 5: Share, links and offline

The game leaves the tab: shared, linked, installed and played offline.

- The Share button: the share sheet on phones, copy elsewhere. Topic links open Ready to play, and a bad link goes to the Topic picker with a note ([Share result and topic links](https://github.com/jonstuebe/trivia/issues/8)).
- The PWA: installable and playable offline ([Tech stack and hosting](https://github.com/jonstuebe/trivia/issues/2)).
- The site-wide link preview: the Studio logo disc with "Fifteen questions. One million imaginary dollars." ([Visual direction](https://github.com/jonstuebe/trivia/issues/11)).
- The Cloudflare Web Analytics beacon, loaded only when the browser sends no GPC or DNT signal, and the privacy note on the Main menu ([Analytics and error reporting](https://github.com/jonstuebe/trivia/issues/13)).

**Done when:** a shared result opens the right Topic, the app installs on a phone and plays a Game offline, and the link preview shows when the preview URL is pasted into a chat.

## Phase 6: Sound and motion

The show feel.

- The generated Web Audio engine, on by default: Tier beds that grow more suspenseful, a reveal that draws out longer as the Tier rises, stings, Lifeline sounds, a menu theme and a remembered mute ([Visual direction](https://github.com/jonstuebe/trivia/issues/11)).
- Small, purposeful animation, and the reveal wait growing from about 1s to about 5s, cut to about 1s under reduced motion ([Accessibility and keyboard play](https://github.com/jonstuebe/trivia/issues/14)).
- A visible equivalent for every sound cue.

**Done when:** a Game at the preview URL plays with sound and motion, mute is remembered across visits, and reduced motion shortens the reveal.

## Phase 7: Content and launch

Real Questions, checked, then live.

- Writing the real Questions with the `write-questions` skill for General and every launch Title, about 75 per Topic. A Title ships once it has about 20 ([Launch Titles](https://github.com/jonstuebe/trivia/issues/4), [Question authoring rules](https://github.com/jonstuebe/trivia/issues/9)). This can start once phase 2 ships.
- The manual launch checklist: iPhone install and offline play, the share sheet, the link preview, and VoiceOver and keyboard-only runs ([Testing approach](https://github.com/jonstuebe/trivia/issues/10), [Accessibility and keyboard play](https://github.com/jonstuebe/trivia/issues/14)).
- Attaching trivia.jonstuebe.com to the Worker.

**Done when:** every launch Topic passes the build checks, the checklist is done, and trivia.jonstuebe.com serves the game. Then v1 is announced.

## Not in v1

A daily game, multiplayer and accounts.
