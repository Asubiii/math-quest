# Math Quest

A mental-math battle game for fractions, decimals and percents. Every question is multiple choice. Fast answers hit harder, and winning a fight raises your Speed Rank, which shortens the timer and brings a stronger monster.

Play: https://asubiii.github.io/math-quest/

## Skills

- **Fraction Face-Off**: which of two fractions with different denominators is bigger (Woodland Trail)
- **Fractions → Decimals** (Hush Cave)
- **Decimals → Percents** (Coast Path)

## How fights work

- Answer before the timer bar runs out to hit. Answer in the first half for a critical hit (2× damage).
- A wrong answer or an empty timer costs a heart. Five hearts per fight.
- Every 5 right in a row adds +25% damage.
- Ten Speed Ranks per skill. The time goal drops from 60 seconds to 6 seconds per answer.
- Missed and slow facts come back more often.

Progress is saved in the browser on the device used to play.

## Reporting setup (tutor)

Each finished fight can be sent to a private Google Sheet.

1. Create a new Google Sheet. Open **Extensions > Apps Script**.
2. Replace the editor contents with `apps-script/Code.gs` and save.
3. Choose the `setup` function and press **Run**. Approve the permission prompt.
4. Press **Deploy > New deployment**, type **Web app**, execute as **Me**, access **Anyone**. Copy the web app URL.
5. Paste the URL into `js/config.js` as `REPORT_URL`, then commit and push.
6. Optional: run `createWeeklyEmail` once for a Sunday summary email.

The sheet gets four tabs: **Summary** (ranks, most-missed questions, mistake types), **Fights**, **Answers** and **Ranks**. Only the player's nickname is sent; no names or emails.

## Development

No build step. Serve the folder with any static server, for example `python3 -m http.server`. Run `npm test` to fuzz-test the question generators.

## Credits

Character, monster and backdrop art is from the Salita project and is not licensed for reuse. Human character base: Open Peeps by Pablo Stanley (CC0), via DiceBear (MIT).
