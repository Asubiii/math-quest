# Math Quest

HSPT practice site with two student pages and a tutor page.

- **Speed Study**: a mental-math battle game. Every question is multiple choice; fast answers hit harder, and winning a fight raises the Speed Rank, which shortens the timer and brings a stronger monster.
- **Flashcards**: Anki-style spaced repetition over the HSPT math deck (Anki's default scheduler settings). Only topics the tutor turns on are shown. Progress is saved on the device and copied to the tutor's sheet.
- **Tutor page**: password protected. Switch flashcard topics on and off, and see daily minutes, cards reviewed, packet results and Speed Study fights.

The opening screen offers Student login (no password) or Tutor login.

Play: https://asubiii.github.io/math-quest/

## What it covers

One game mode mixes four kinds of question, with numbers generated fresh each time so answers can't be memorized:

- **Compare fractions**: which of two fractions with different denominators is bigger
- **Fraction to decimal**
- **Decimal to percent** (fewer of these)
- **Missing angles**: complementary, supplementary and vertical angles, triangle angle sums, right and isosceles triangles, exterior angles, parallel lines

## How fights work

- Answer before the timer bar runs out to hit. Answer in the first half for a critical hit (2× damage).
- A wrong answer or an empty timer costs a heart. Five hearts per fight.
- Every 5 right in a row adds +25% damage.
- Ten Speed Ranks. The time goal drops from 60 seconds to 6 seconds per answer.
- Missed and slow questions come back later, and weak question families come up more often.

Progress is saved in the browser on the device used to play.

## Google Sheet setup (tutor)

Progress, topic switches and packet results live in a private Google Sheet.

1. Create a new Google Sheet. Open **Extensions > Apps Script**.
2. Replace the editor contents with `apps-script/Code.gs`, put the tutor password in `TUTOR_PASSWORD`, and save.
3. Choose the `setup` function and press **Run**. Approve the permission prompt.
4. Press **Deploy > New deployment**, type **Web app**, execute as **Me**, access **Anyone**. Copy the web app URL.
5. Paste the URL into `js/config.js` as `REPORT_URL`, then commit and push.
6. Optional: run `createWeeklyEmail` once for a Sunday summary email.

The sheet gets tabs for **Topics** (flashcard switches), **Packets** (graded answer sheets), **Time**, **Reviews**, **Fights**, **Answers** and **State**. The tutor password is stored in the script's private properties, never in this repository.

The flashcards come from the Anki deck source; regenerate `assets/cards.json` with `export_cards.py` from the tutoring folder.

## Development

No build step. Run `python3 scripts/bump.py` before each push so browsers pick up every changed file at once. Serve the folder with any static server, for example `python3 -m http.server`. Run `npm test` to fuzz-test the question generators.

## Credits

Character, monster and backdrop art is from the Salita project and is not licensed for reuse. Human character base: Open Peeps by Pablo Stanley (CC0), via DiceBear (MIT).

Effects are drawn on a 320-pixel-wide canvas so they match the pixel art. Sounds are generated in the browser (no audio files) and can be muted from the map screen.
