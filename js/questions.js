// Question generators for the four question types, which are mixed together in one game mode. Every question is multiple choice.
// A question: { skill, key, prompt (HTML), promptText, choices:[{html,text,correct,tag}], layout, tip (HTML) }
// Wrong choices carry a `tag` naming the mistake they represent, which goes to the tutor report.

import { angles } from './angles.js';
import { R, val, eq, cmp, mul, key, decStr, pctStr, fracHTML, fracText, terminates, rand, pick, shuffle } from './numbers.js';

export const SKILLS = {
  compare: { name: 'Compare fractions', weight: 3 },
  frac2dec: { name: 'Fraction to decimal', weight: 3 },
  pct: { name: 'Decimal to percent', weight: 1 }, // only a few of these
  angles: { name: 'Missing angles', weight: 3 },
};

// ---------- Choice helpers ----------
function choiceSet(correct, cands, n = 3) {
  // correct: {html,text}; cands: [{html,text,tag}] in priority order (first ones more likely).
  const out = [{ ...correct, correct: true }], seen = new Set([correct.text]);
  for (const c of cands) {
    if (out.length > n) break;
    if (!c || !c.text || seen.has(c.text)) continue;
    seen.add(c.text);
    out.push({ ...c, correct: false });
  }
  return out;
}
const decC = (r, tag) => (r && r.n > 0 ? { html: decStr(r), text: decStr(r), tag } : null);
const pctC = (r, tag) => { if (!r || r.n <= 0) return null; const s = pctStr(r); return s ? { html: s, text: s, tag } : null; };
const between = (a, b) => a + rand(b - a + 1);
// Fraction exactly as written (not reduced), with an optional whole number in front.
const rawHTML = (w, n, d) => { const f = `<span class="frac"><span>${n}</span><span>${d}</span></span>`; return w ? `<span class="mixed">${w}${f}</span>` : f; };
const rawText = (w, n, d) => (w ? `${w} ${n}/${d}` : `${n}/${d}`);

// ---------- Skill: fraction -> decimal ----------
// The numbers are generated fresh each time (any numerator over a family of denominators, sometimes
// with a whole number), so the answers have to be worked out, not memorized as a list.
const DEN_TIERS = [[4, 5, 10, 20, 25, 50], [3, 8], [6, 9, 40]];
function fracTip(w, n, d) {
  const r = R(w * d + n, d), shown = rawHTML(w, n, d);
  let how;
  if (100 % d === 0 && d !== 100) how = `×${100 / d} top and bottom: ${n}/${d} = ${n * (100 / d)}/100`;
  else how = { 8: 'each eighth = 0.125', 40: 'each fortieth = 0.025', 3: '⅓ = 0.333…, ⅔ = 0.666…', 6: 'each sixth = 0.166…', 9: 'ninths repeat the top: 4/9 = 0.444…' }[d] || '';
  return `${shown} = <b>${decStr(r)}</b>${how ? ` · ${how}` : ''}${w ? ' · the whole number stays in front' : ''}`;
}
function frac2dec(rank, mem) {
  const dens = DEN_TIERS.slice(0, rank <= 2 ? 1 : rank <= 5 ? 2 : 3).flat();
  const d = Number(mem.pickKey(dens.map(x => `f2d:den${x}`)).slice(7));
  const n = between(1, d - 1), w = rank >= 4 && Math.random() < 0.25 ? between(1, 3) : 0;
  const r = R(w * d + n, d), W = x => (x ? R(x.n + w * x.d, x.d) : null), proper = (a, b) => (a > 0 && a < b ? R(a, b) : null);
  const digits = d < 10 ? { html: `${w}.${n}${d}`, text: `${w}.${n}${d}`, tag: 'digits (wrote 3/8 as 0.38)' } : null;
  const cands = [
    ...shuffle([
      decC(W(proper(n + 1, d)), 'one part off'), decC(W(proper(n - 1, d)), 'one part off'),
      decC(W(proper(d - n, d)), 'mixed up with the leftover part'),
      d > 10 ? decC(W(R(n, 100)), 'used the top number as hundredths') : null,
      d >= 10 ? decC(W(R(n, 10)), 'used the top number as tenths') : null,
      digits, digits,
    ].filter(Boolean)),
    decC(W(proper(n + 2, d)), 'two parts off'), decC(W(proper(n - 2, d)), 'two parts off'), decC(W(R(n, d * 10)), 'decimal point'),
  ].filter(c => c && c.text !== decStr(r));
  return {
    skill: 'frac2dec', key: `f2d:den${d}`, prompt: rawHTML(w, n, d), promptText: `${rawText(w, n, d)} = ?`, ask: 'What is this as a decimal?',
    choices: shuffle(choiceSet({ html: decStr(r), text: decStr(r) }, cands)), layout: 'grid', tip: fracTip(w, n, d),
  };
}

// ---------- Skill: decimal -> percent ----------
// Random decimals; the wrong answers are the same digits with the decimal point in a different place.
function pct(rank) {
  const places = rank <= 2 ? between(1, 2) : between(1, 3);
  let n; do { n = between(1, 10 ** places - 1); } while (n % 10 === 0);
  const whole = rank >= 5 && Math.random() < 0.25 ? between(1, 2) : 0;
  const r = R(whole * 10 ** places + n, 10 ** places);
  const cands = [pctC(R(r.n, r.d * 100), 'just added % sign'), pctC(mul(r, 10), 'decimal point (1 place off)'), pctC(R(r.n, r.d * 10), 'decimal point (1 place off)')];
  return {
    skill: 'pct', key: `d2p:${places}place${whole ? '+whole' : ''}`, prompt: decStr(r), promptText: `${decStr(r)} = ?%`, ask: 'What is this as a percent?',
    choices: shuffle(choiceSet(pctC(r), cands)), layout: 'grid', tip: `${decStr(r)} = <b>${pctStr(r)}</b> · move the decimal point 2 places right`,
  };
}

// ---------- Skill: compare two fractions ----------
const raw = (n, d) => ({ n, d }); // not reduced: 4/6 stays 4/6 on screen
function comparePair(type, window_) {
  for (let tries = 0; tries < 200; tries++) {
    let a, b;
    if (type === 'spread') {
      const d1 = between(3, 12), d2 = between(3, 12); a = raw(between(1, d1 - 1), d1); b = raw(between(1, d2 - 1), d2);
      if (Math.abs(val(a) - val(b)) < 0.15) continue;
    }
    else if (type === 'half') {
      const d1 = between(3, 12), d2 = between(3, 12);
      a = raw(between(1, Math.ceil(d1 / 2) - 1), d1); b = raw(between(Math.floor(d2 / 2) + 1, d2 - 1), d2);
      if (!a.n || 2 * a.n >= a.d || 2 * b.n <= b.d) continue;
    } else if (type === 'missing') { const k = pick([1, 1, 2]), d1 = between(k + 2, 12), d2 = between(k + 2, 12); a = raw(d1 - k, d1); b = raw(d2 - k, d2); }
    else if (type === 'close') {
      const d1 = between(4, 12), d2 = between(4, 12); a = raw(between(1, d1 - 1), d1); b = raw(between(1, d2 - 1), d2);
      const diff = Math.abs(val(a) - val(b)); if (diff === 0 || diff > (window_ || 0.08)) continue;
    } else if (type === 'equal') {
      const bd = between(2, 6), bn = between(1, bd - 1), base = R(bn, bd), k1 = between(1, 2), k2 = between(k1 + 1, 4);
      if (base.d * k2 > 15) continue; a = raw(base.n * k1, base.d * k1); b = raw(base.n * k2, base.d * k2);
    }
    if (type !== 'equal' && (cmp(a, b) === 0)) continue;
    if (a.d === b.d || a.n === b.n) continue; // always different denominators (and tops), so there is no shortcut
    return Math.random() < 0.5 ? [a, b] : [b, a];
  }
  return [raw(1, 2), raw(1, 3)];
}
function compare(rank) {
  const types = rank <= 2 ? ['spread', 'half', 'half', 'missing'] : rank <= 5 ? ['half', 'missing', 'close', 'close'] : ['close'];
  const type = pick(types);
  const [a, b] = comparePair(type, rank <= 5 ? 0.12 : 0.07), c = cmp(a, b);
  const fh = x => `<span class="frac"><span>${x.n}</span><span>${x.d}</span></span>`, ft = x => `${x.n}/${x.d}`;
  const big = c > 0 ? a : b, small = c > 0 ? b : a;
  const tip = {
    spread: `Cross-multiply: ${a.n}×${b.d} = ${a.n * b.d} vs ${b.n}×${a.d} = ${b.n * a.d}.`,
    half: `${fh(small)} is less than ½ and ${fh(big)} is more than ½.`,
    missing: `Each is short of 1. ${fh(R(small.d - small.n, small.d))} is a bigger gap than ${fh(R(big.d - big.n, big.d))}, so ${fh(big)} is closer to 1.`,
    close: `Cross-multiply: ${a.n}×${b.d} = ${a.n * b.d} vs ${b.n}×${a.d} = ${b.n * a.d}.`,
    equal: `They simplify to the same fraction: ${fh(R(a.n, a.d))}.`,
  }[type];
  const wrongTag = { spread: 'far-apart pair', half: 'missed the ½ benchmark', missing: 'missed "closer to 1"', close: 'close pair', equal: 'missed equal fractions' }[type];
  const choices = [
    { html: fh(a), text: ft(a), correct: c > 0, tag: wrongTag },
    { html: fh(b), text: ft(b), correct: c < 0, tag: wrongTag },
  ];
  return {
    skill: 'compare', key: `cmp:${type}:${ft(a)}|${ft(b)}`, prompt: '',
    promptText: `${ft(a)} vs ${ft(b)}`, ask: 'Which fraction is bigger?', choices, layout: 'row2', tip,
  };
}

const GEN = { compare, frac2dec, pct, angles };
// Weighted pick of the next question type, never the same type three times in a row.
export function pickType(lastTypes) {
  const block = lastTypes.length >= 2 && lastTypes[lastTypes.length - 1] === lastTypes[lastTypes.length - 2] ? lastTypes[lastTypes.length - 1] : null;
  const bag = Object.keys(GEN).filter(k => k !== block).flatMap(k => Array(SKILLS[k].weight).fill(k));
  return pick(bag);
}
export function makeQuestion(skill, rank, mem) {
  const retry = mem.takeRetry(skill);
  if (retry) return { ...retry, choices: retry.layout === 'row2' ? retry.choices : shuffle(retry.choices), retry: true };
  return GEN[skill](rank, mem);
}
