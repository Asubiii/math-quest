// Generates thousands of questions for every Quantitative drill mode and checks each one:
// four different choices, no broken values, and for Computation, that the worked steps end on the right answer.
import { MODES, make } from '../js/quant.js';
const plain = s => String(s).replace(/<span class='fr'><span>(.*?)<\/span><span>(.*?)<\/span><\/span>/g, ' $1/$2').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
let bad = 0; const why = {};
const note = (m, k, ex) => { bad++; const key = `${m}:${k}`; if (!why[key]) why[key] = ex; };
for (const id of Object.keys(MODES)) {
  for (let i = 0; i < 2000; i++) {
    let q;
    try { q = make(id); } catch (e) { note(id, 'throw', e.message); continue; }
    const all = [q.stem, ...q.choices, q.why, ...(q.setup ? q.setup.steps : [])].join(' | ');
    if (q.choices.length !== 4 || new Set(q.choices).size !== 4) note(id, 'dupe', q.choices);
    if (/NaN|undefined|null|Infinity|\[object/.test(all)) note(id, 'junk', all);
    if (!'abcd'.includes(q.ans)) note(id, 'ans', q.ans);
    if (q.setup) {
      const right = plain(q.choices['abcd'.indexOf(q.ans)]), last = plain(q.setup.steps.at(-1)).split('= ').pop().trim();
      if (last !== right) note(id, 'steps', `${plain(q.stem)} | ${q.setup.steps.map(plain).join(' ; ')} | ans ${right}`);
      const stem = plain(q.stem), joined = plain(q.setup.pieces.map(p => p[0]).join(' ').replace(/ \?$/, '?'));
      if (stem !== joined) note(id, 'pieces', stem);
      if (/−\d|^-/.test(right) || /−/.test(right)) note(id, 'negative', stem);
    }
  }
}
console.log(Object.keys(MODES).length, 'modes');
console.log(bad ? `FAIL ${bad}` : 'all ok'); for (const [k, v] of Object.entries(why).slice(0, 30)) console.log(k, JSON.stringify(v).slice(0, 300));
