---
name: write-questions
description: Write or extend a trivia Topic file (General, or a TV or Movies Title) to the authoring rules, verify every Question against a source, and pass the content checks. Use when asked to write, add or fill in Questions for a Topic.
---

Write Questions into one Topic file so that every one is true, sourced and placed in the right Tier. The rules are `docs/question-authoring.md`: read all of it first, and hold every Question to every rule in it. The file format is `src/content/schema.ts`.

The content folder is `content/` unless the person names another. For a dry run, use a folder in your scratch space and pass `--content <dir>` (plus `--out <file>` to `check-content`, so the real topic index is left alone).

## 1. Find the gaps

Run `bun run check-content` and read the report for this Topic: Questions per Tier, and per Subject for General. Read the Topic file if it exists, so new Questions don't repeat old ones.

Done when you have a count to write per Tier (and per Subject for General), aiming at 15 per Tier and about 75 per Topic, or the number the person asked for.

## 2. Write the Questions

Write each Question into the Topic file without an `id`. A new file is `content/general.json`, or `content/tv/<slug>.json` / `content/movies/<slug>.json` with the Title's display name in `title`.

Done when every Question meets every rule in `docs/question-authoring.md`, and carries a `source` wherever the rules require one.

## 3. Assign IDs

Run `bun run assign-ids`. Done when it reports the new IDs written.

## 4. Verification pass

Dispatch a **fresh subagent** with web access as the verifier. Its brief holds only the rules doc's path and the Questions as `id`, `tier`, `prompt`, `correct`, `wrong` and `subject`: leave out the `source` notes and your reasoning, so it checks each fact from scratch. Ask it to find its own source for every Question and to return, per `id`, either _confirmed_ with its source, or _flagged_ with the doubt and its source. A doubt is anything the rules cover: the fact, a second defensible answer, a partly true wrong answer, a fact that can change, or a Tier far from its share of players.

For every flagged Question, either:

- **fix** it and send the fix with your source back to the same verifier (SendMessage), until it confirms the Question against a source you both accept; write that source into `source`, or
- **drop** it from the file.

Done when the verifier has confirmed every Question left in the file. Nothing flagged stays.

## 5. Content checks

Run `bun run check-content`. Fix every error and rerun until it passes. Then read the report: fix each warning (an over-long right answer gives itself away), and check the counts match what step 1 set out to write. A fixed Question whose fact changed goes back through step 4.

Done when the check passes with no warnings on this Topic, and the counts are what you planned.

## 6. Hand over

Commit the Topic file with the topic index `check-content` wrote. Report the Questions added per Tier (and Subject), how many the verifier flagged, and which were fixed or dropped.
