// Generates thousands of questions per skill and rank and checks each one is well formed.
import { makeQuestion } from '../js/questions.js';
const mem = { pickKey: ks => ks[Math.floor(Math.random() * ks.length)], takeRetry: () => null };
let bad = 0; const short = {};
for (const skill of ['compare', 'frac2dec', 'pct'])
  for (let rank = 1; rank <= 10; rank++)
    for (let i = 0; i < 1500; i++) {
      const q = makeQuestion(skill, rank, mem);
      const want = skill === 'compare' ? 2 : 4;
      const texts = q.choices.map(c => c.text);
      const fail = q.choices.filter(c => c.correct).length !== 1 ? 'correct!=1'
        : q.choices.length !== want ? 'count' : new Set(texts).size !== texts.length ? 'dupe'
        : texts.some(t => !t || /NaN|undefined|null|Infinity/.test(t)) ? 'junk' : null;
      if (fail) { bad++; const k = skill + ':' + fail + ':' + q.key; short[k] = (short[k] || 0) + 1; }
    }
console.log(bad ? `FAIL ${bad}` : 'all ok'); console.log(Object.entries(short).slice(0, 30));
