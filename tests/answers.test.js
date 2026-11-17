// Re-solves thousands of drill questions with the independent checker in answercheck.js and fails if
// any keyed answer is wrong or a second choice is also right.
//   node tests/answers.test.js            site generators (js/drillbank.js)
//   node tests/answers.test.js file.json  questions dumped from the printed-drill builder (Python)
import { readFileSync } from 'node:fs';
import { MODES, R } from '../js/drillbank.js';
import { check } from '../js/answercheck.js';

const N = +(process.env.N || 1500);
let bad = 0, total = 0;
const fails = {};
const note = (id, q, why) => {
  bad++;
  (fails[id] = fails[id] || []).push(why);
};

if (process.argv[2]) {
  const qs = JSON.parse(readFileSync(process.argv[2], 'utf8'));
  for (const q of qs) { total++; const why = check(q, q.type); if (why) note(q.mode, q, why); }
} else {
  for (const [id, m] of Object.entries(MODES)) {
    if (m.type === 'geo') continue;
    // Raw generator output (correct choice first), not make(), which already throws away anything that fails.
    for (let i = 0; i < N; i++) {
      let q; try { q = { ...m.fn(R), ans: 'a' }; } catch (e) { if (e.constructor.name === 'Retry') { i--; continue; } throw e; }
      total++; const why = check(q, m.type); if (why) note(id, q, why);
    }
  }
}
for (const [id, list] of Object.entries(fails)) {
  console.log(`✗ ${id}: ${list.length} bad`);
  [...new Set(list)].slice(0, 3).forEach(w => console.log('    ' + w));
}
console.log(bad ? `${bad} of ${total} questions have a wrong or doubled answer` : `answers: all ${total} questions re-solved and correct`);
process.exit(bad ? 1 : 0);
