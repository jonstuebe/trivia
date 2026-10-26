# Game design

How the game plays: its rules and mechanics. Look and feel is out of scope. These decisions came out of a design session on 2026-10-25. Change this doc when a decision changes.

## The game

- One player in the hot seat. No accounts, no timer.
- The classic 15-question money ladder:

  | Question | Prize      | Question | Prize    | Question | Prize          |
  | -------- | ---------- | -------- | -------- | -------- | -------------- |
  | 1        | $100       | 6        | $2,000   | 11       | $64,000        |
  | 2        | $200       | 7        | $4,000   | 12       | $125,000       |
  | 3        | $300       | 8        | $8,000   | 13       | $250,000       |
  | 4        | $500       | 9        | $16,000  | 14       | $500,000       |
  | 5        | **$1,000** | 10       | **$32,000** | 15    | **$1,000,000** |

- **Safe levels** at question 5 ($1,000) and question 10 ($32,000). A wrong answer drops the player to their last safe level reached, or $0 before question 5.
- **Walk away** from question 2 onward to keep current winnings. It asks for confirmation first: "Walk away with $X?" with Walk away / Cancel.
- **Final answer:** picking an answer opens a "Final answer / Cancel" step. Only a confirmed answer counts.
- After a wrong answer, reveal the correct one. There are no explanations or fun facts after answers.
- Every question has exactly **4 options** (A–D) and one correct answer, never true/false. Shuffle answer positions each time a question is shown.

## Lifelines

Each lifeline can be used once per game. Several can be stacked on the same question.

- **50:50:** removes two wrong answers.
- **Ask the Audience:** a simulated vote chart.
- **Phone a Friend:** the player picks one of four specialist friends (history, science, sports, pop culture), who gives a simulated guess with a stated confidence. The phone rings first, with "Calling …" in place of their answer for a moment.
- **Switch the Question:** swaps the current question for another from the same difficulty tier. It is only available **after question 10**.

The audience and friend are simulated from the known answer. They are reliable on easy questions and get shakier as difficulty rises: the audience splits more, the friend is less sure, and both are sometimes wrong. After a 50:50 they only choose between the two answers left.

## Topics

There are two levels: a **category**, then optionally a **title** within it.

- **General:** its own general-knowledge set (history, science, geography, sports and so on), like the show. It has no titles.
- **TV Shows** and **Movies:** pick the whole category for a mixed game, or one specific show or movie. A mixed game draws from every title in the category, and shows each question's show or movie as a label above it. The question text itself doesn't name the title.

A movie title can be a single film or a franchise (its theatrical films only). A mixed game is offered only when the category has 2 or more titles. The launch titles are:

- **TV Shows:** Friends, The Big Bang Theory, Modern Family.
- **Movies:** Star Wars, Harry Potter, Marvel Cinematic Universe, Jurassic Park, Pixar (one title covering all Pixar films).

## Questions

- Claude writes the questions. They ship as **one JSON file per topic** (General, or one title), loaded only when that topic is picked. A mixed category game loads every title file in that category.
- Each question has one of **5 difficulty tiers**, matching ladder rungs 1–3, 4–6, 7–9, 10–12 and 13–15, placed by roughly how many fans of the topic would know it: about 90%, 70%, 50%, 25% and 10%.
- General questions spread evenly over four subjects, matching the friends: history, science, sports and pop culture.
- Each topic aims for about **75 questions**, 15 per tier, which is about 5 games before repeats.
- A title appears in the topic picker once it has about **20 questions**: enough for one game, plus spares in the top tiers for Switch the Question.

## Memory on the device

Everything below is kept in the browser on that device.

- **Seen questions:** a question counts as seen once shown, including one switched away from. Seen questions are tracked by question, so a question seen in a mixed game counts as seen when playing its title alone, and vice versa. New games prefer unseen questions.
- **A topic runs out:** once a topic can't fill a whole game (3 questions per tier) with unseen questions, tell the player and offer to reset that topic. Until they do, repeats are allowed, oldest-seen first.
- **Reset:** the main menu has a single "reset all" that clears every seen question, but not personal bests or a saved game. Resetting one topic from the run-out screen clears just that topic's questions; for TV Shows or Movies that includes every title in it.
- **Game in progress:** a refresh drops the player straight back into the game. A refresh during "Final answer?" comes back to the question with nothing picked; one during the wait after "Final answer" comes back at the reveal, the answer still locked in. Leaving through the main menu pauses it, and the menu offers Resume. Starting a new game instead discards the saved one: it doesn't count toward a personal best, and its questions stay seen.
- **Personal best:** best winnings per topic as picked, so "TV Shows" and "Friends" each have their own. Every finished game counts, including a walk away.
- **Mute:** sound is on by default and starts on the first tap or key press. The Sound switch on the main menu, Ready to play, in the game and on Game over (or M in the game) turns it off, and it stays off on every screen and after a reload.

## End of game

A game ends when the player wins, misses or walks away. The Game over screen shows the final winnings, the personal best, and a **shareable result** to copy as text, Wordle style:

- The topic and the winnings.
- One emoji per question reached: ✅ right, ❌ the miss, 🚶 walked away.
- The lifelines used.
- A link straight to that topic.

For example:

```
Trivia · Movies
$32,000
✅✅✅✅✅ ✅✅✅✅✅ ✅❌
✂️ 👥 🔄
trivia.jonstuebe.com/movies
```

The emoji come in groups of five, so each break falls on a safe level. 🏆 follows the winnings only for a full win. The lifelines show as ✂️ 50:50, 👥 Ask the Audience, 📞 Phone a Friend and 🔄 Switch the Question, or "No lifelines". On a phone, Share opens the share sheet; elsewhere it copies the text.

A topic link (`/general`, `/tv`, `/tv/friends` and so on) opens that topic's Ready to play screen. A link to a topic that can't be played opens the topic picker instead.

## Deferred

- A daily game where everyone gets the same questions.
- Multiplayer.
