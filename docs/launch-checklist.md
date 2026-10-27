# Launch checklist

The checks a person runs by hand on trivia.jonstuebe.com before v1 is announced. Everything else is covered by the unit tests and the e2e journeys in CI; these five need a real phone, a real chat app or a real screen reader ([Testing approach](https://github.com/jonstuebe/trivia/issues/10), [Accessibility and keyboard play](https://github.com/jonstuebe/trivia/issues/14)). The terms are in `GLOSSARY.md`.

Phase 7 is done only when every check below has passed on the live site, or its failure is knowingly accepted (see **Recording results**). Change this doc when a check changes.

## Before you start

- The real build is deployed and trivia.jonstuebe.com serves it, not the workers.dev preview or the fixture build. Open https://trivia.jonstuebe.com on a laptop: the Main menu shows "Trivia" and the tagline "Fifteen questions. One million imaginary dollars.", and Play lists General, TV Shows and Movies.
- The site address is switched: a Share result ends in `trivia.jonstuebe.com/…`, not `workers.dev`.
- You have an iPhone on a current iOS, a Mac with Safari and Chrome, the Messages app and a Slack workspace you can post in (a DM to yourself is fine).
- Note the commit SHA that is live (the last deploy on `main`), for the Results table.

Run the checks in order: the first leaves an installed app on the iPhone that the later phone checks can use.

## 1. Install to an iPhone Home Screen, then play a Game in airplane mode

The app installs, and once it has loaded online, every Topic plays with no connection.

1. On the iPhone, with Wi-Fi or mobile data on, open https://trivia.jonstuebe.com in Safari.
2. Tap the Share button in Safari's toolbar, then **Add to Home Screen**. Check the name reads "Trivia", then tap **Add**.
3. Open Trivia from the Home Screen. Wait until the Main menu shows, then wait 10 more seconds so the whole app finishes downloading. (The Home Screen app keeps its own storage, apart from Safari, so it has to load once online itself.)
4. Close the app: swipe up from the bottom and swipe Trivia away.
5. Turn on airplane mode, and check Wi-Fi is off too (Control Center: both icons grey).
6. Open Trivia from the Home Screen.
7. Tap **Play**, then **Movies**, then **Pixar** (a Title not opened yet), then **Start**.
8. Play the Game to the end: answer until you miss, win or Walk away. Use at least one Lifeline on the way.
9. On Game over, tap **Main menu**. Then **Play** → **TV Shows** → **All TV Shows (mixed)** → **Start**, and answer one Question.
10. Tap **Main menu**, close the app as in step 4, and open it again from the Home Screen.
11. Turn airplane mode off.

**Pass when:**

- [ ] Step 3: the app opens full screen with no Safari address bar, the Home Screen icon is the logo disc, and the Sound switch and Menu theme work.
- [ ] Steps 6 to 9: every screen loads with no "offline" or browser error page. The Pixar Game plays all the way through: Questions, the Reveal wait, the Lifeline, the Ladder and Game over. The Mixed game shows each Question's Title above it.
- [ ] Step 9: the Main menu shows the Pixar Personal best.
- [ ] Step 10: the Main menu offers **Resume: TV Shows, question 2** (or the Rung you stopped on), and Resume opens that Game where it was left.

## 2. The share sheet on a real phone, and copying on desktop

Share opens the system share sheet on a phone and copies the Share result everywhere else.

**On the iPhone (Safari or the installed app):**

1. Play a Game on **TV Shows** → **Friends**. The quickest finish: answer Question 1 right, then tap **Walk away with $100** and confirm **Walk away**.
2. On Game over, tap **Share**.
3. Pick **Messages**, send the text to yourself, and look at it.
4. Tap **Share** again, then close the share sheet without picking anything.
5. In the sent message, tap the Topic link on its last line.

**On the Mac, in Safari and then in Chrome:**

6. Play and finish a Game on **General** the same way.
7. On Game over, click **Share**.
8. Paste into a new note or text file.

**Pass when:**

- [ ] Step 2: the iOS share sheet opens (not a "Copied" note), with the Share result as its text.
- [ ] Step 3: the sent text matches the Share result shown on Game over, line for line: "Trivia · Friends", the winnings, one emoji per Question reached (✅, then 🚶 for the Walk away), the Lifelines used or "No lifelines", and the Topic link (`trivia.jonstuebe.com/tv/…`). The emoji show as emoji, not boxes.
- [ ] Step 4: closing the sheet does nothing: no error, no note under Share.
- [ ] Step 5: the link opens Ready to play for Friends.
- [ ] Step 7: in both browsers, no share sheet opens, and "Copied" shows under Share.
- [ ] Step 8: the pasted text matches the Share result on screen, ending in `trivia.jonstuebe.com/general`.

## 3. The link preview pasted into Messages and Slack

A pasted link shows one card for the whole site: the logo disc on a blue spotlight, the name and the tagline. There are no per-Topic previews.

1. On the iPhone, in Messages, paste `https://trivia.jonstuebe.com` into a message to yourself and send it.
2. Send `https://trivia.jonstuebe.com/movies` the same way.
3. In Slack, paste `https://trivia.jonstuebe.com` into a message to yourself and send it.
4. Send `https://trivia.jonstuebe.com/tv` in Slack the same way.

Chat apps keep a preview once they have fetched it. If a card looks out of date because a link was pasted before the real build went live, add `?v=2` (or any new value) to the end of the link and paste it again.

**Pass when,** for all four links:

- [ ] A card appears with the logo disc on a blue spotlight, sharp rather than blurred or cropped through the disc.
- [ ] Its title is "Trivia" and its text is "Fifteen questions. One million imaginary dollars."
- [ ] The card shows trivia.jonstuebe.com, not workers.dev.
- [ ] Tapping or clicking the card opens the site: the Main menu for the bare address, Ready to play for the Topic links.

## 4. One VoiceOver Game on an iPhone

A whole Game can be played by ear, and nothing depends on seeing colour.

1. On the iPhone, turn on VoiceOver: **Settings** → **Accessibility** → **VoiceOver**. (Swipe right or left to move between items, double-tap to press the one in focus.)
2. Open https://trivia.jonstuebe.com in Safari, or the installed app, and turn the Sound switch off so VoiceOver is easy to hear.
3. From the Main menu, move to **Play** and double-tap. Pick **General**, then **Start**.
4. Listen to Question 1. Swipe through its four answers, then double-tap one.
5. In the Final answer dialog, swipe right past the last button.
6. Double-tap **Final answer** and listen through the Reveal wait and the reveal.
7. Double-tap **Next question**. On the next Questions, use **Ask the Audience**, then **Phone a Friend**: pick a Friend and listen to their answer. Use **50:50** too.
8. Once Walk away is offered, double-tap **Walk away with $…**, then **Cancel**. Keep playing until the Game ends (a miss or a Walk away both do).
9. On Game over, swipe through the whole screen, then double-tap **Share** and close the sheet.
10. Turn VoiceOver off.

**Pass when:**

- [ ] Step 4: each new Question is read with its Rung and prize, then the Question, then the four answers ("Question 1 for $100. … A: …"). Each answer is read with its letter.
- [ ] Step 5: focus stays inside the dialog: it wraps to the dialog's first item, never the page behind it.
- [ ] Step 6: VoiceOver says the answer is Locked in ("… is locked in. The answer is coming…"), then right or wrong in words ("✓ Correct! You've banked $100." or "✗ Wrong. The correct answer was …"), and focus lands on **Next question** or **See result**.
- [ ] Step 7: the audience vote is read as text ("The audience voted A: …%, …"), the Friend's guess is read as text once the phone stops ringing, and after 50:50 the two removed answers are no longer offered.
- [ ] Step 8: the Walk away dialog keeps focus inside it, and Cancel returns to the Question.
- [ ] Step 9: the headline, the winnings, the Personal best and the Share result text are all read, and every button has a spoken name.
- [ ] Throughout: every control can be reached by swiping, nothing is read as an unnamed "button" or "image", and right and wrong are always said in words, never only shown by colour.

## 5. One Game by keyboard only

A whole Game can be played on a laptop without touching the mouse or trackpad.

1. On the Mac, open https://trivia.jonstuebe.com in Chrome. Click once in the address bar, then put the mouse aside.
2. Press **Tab** until the page has focus, then Tab to **Play** and press **Enter**. Tab to **TV Shows**, Enter, then a Title, Enter, then **Start**, Enter.
3. In the Game, press **?**. Read the list of keys, then press **Esc**.
4. Press **B** (or **2**). In the Final answer dialog, press **Esc**.
5. Press **C**, then **Enter** for Final answer. Wait through the Reveal wait, then press **Enter** on Next question.
6. Press **F** for 50:50, **Q** for Ask the Audience and **P** for Phone a Friend (Tab to a Friend and press Enter). Press **S** before Question 11.
7. Press **M** twice.
8. Once Walk away is offered, press **W**, then **Esc**. Keep answering until the Game ends; if it reaches Question 11, press **S** there.
9. On Game over, Tab to **Share** and press Enter. Then Tab to **Main menu** and press Enter.

**Pass when:**

- [ ] Step 2: there is always a visible focus ring, and Tab goes through the controls in reading order.
- [ ] Step 3: the list of keys shows A–D or 1–4, Enter, Esc, W, F, Q, P, S, M and ?, and Esc closes it.
- [ ] Step 4: the dialog opens with focus inside it, Tab keeps cycling inside it, and Esc cancels back to the Question with nothing picked.
- [ ] Step 5: Enter locks the answer in, keys do nothing through the Reveal wait, and focus lands on **Next question** (or **See result**) so Enter moves on.
- [ ] Step 6: each Lifeline key uses that Lifeline once and its result shows as text. S does nothing before Question 11.
- [ ] Step 7: M turns the sound off and back on, and the Sound switch shows it.
- [ ] Step 8: W opens "Walk away with $…?" and Esc cancels it. At Question 11, S switches the Question.
- [ ] Step 9: "Copied" shows under Share, and Main menu is reached and pressed with the keyboard alone.

## Recording results

Tick each "Pass when" box as it passes. Then record the run in the Results table below, one row per check per device, and commit the change to `main`. A row says the date, the check, the device and browser (with the iOS or macOS version), the live commit SHA, and **Pass** or **Fail**.

**A failure becomes a bug ticket.** For every Fail, open a GitHub issue before moving on:

- Title: `Launch checklist: <check> fails on <device>`, for example `Launch checklist: VoiceOver reveal not read on iPhone`.
- Body: the step number, what "Pass when" expected, what happened instead, the device, OS and browser, and a screenshot or screen recording if it shows the problem.
- Label: `needs-triage`.

Put the issue link in the row's Notes. Once the fix is live, run the whole check again and add a new row; don't edit the failed one. A failure can also be knowingly accepted for launch: close its issue saying why, and write "accepted, see #…" in the row's Notes. v1 is announced only when every check has passed or its failures are accepted.

## Results

| Date | Check | Device and browser | Commit | Result | Notes |
| ---- | ----- | ------------------ | ------ | ------ | ----- |
|      |       |                    |        |        |       |
