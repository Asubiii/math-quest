// Question generators for the four skills. Every question is multiple choice.
// A question: { skill, key, prompt (HTML), promptText, choices:[{html,text,correct,tag}], layout, tip (HTML) }
// Wrong choices carry a `tag` naming the mistake they represent, which goes to the tutor report.

import { angles } from './angles.js';
import { R, val, eq, cmp, mul, key, decStr, pctStr, fracHTML, fracText, terminates, rand, pick, shuffle } from './numbers.js';

export const SKILLS = {
  compare: { name: 'Fraction Face-Off', short: 'Compare fractions', area: 'Woodland Trail' },
  frac2dec: { name: 'Fractions → Decimals', short: 'Fraction to decimal', area: 'Hush Cave' },
  pct: { name: 'Decimals → Percents', short: 'Decimal to percent', area: 'Coast Path' },
  angles: { name: 'Angle Hunt', short: 'Missing angles', area: 'Cliff Summit' },
};

// ---------- Fact pools (fractions to memorize), by tier ----------
const F = (n, d, tier) => ({ r: R(n, d), tier });
const FRAC_POOL = [
  ...[[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 10], [3, 10], [7, 10], [9, 10]].map(([n, d]) => F(n, d, 1)),
  ...[[1, 3], [2, 3], [1, 8], [3, 8], [5, 8], [7, 8], [1, 20], [3, 20], [1, 25], [1, 100]].map(([n, d]) => F(n, d, 2)),
  ...[[1, 6], [5, 6], [1, 9], [2, 9], [4, 9], [5, 9], [7, 9], [8, 9], [7, 20], [9, 20], [5, 4], [3, 2], [7, 4], [11, 8]].map(([n, d]) => F(n, d, 3)),
];
const PCT_POOL = [
  ...[[1, 2], [1, 4], [3, 4], [1, 10], [1, 5], [3, 5], [9, 10], [1, 100], [1, 20]].map(([n, d]) => F(n, d, 1)),
  ...[[1, 8], [3, 8], [2, 25], [3, 100], [9, 20], [3, 2], [5, 4], [2, 1], [1, 40], [7, 10]].map(([n, d]) => F(n, d, 2)),
  ...[[1, 200], [7, 8], [5, 8], [1, 3], [2, 3], [13, 10], [1, 50], [3, 40]].map(([n, d]) => F(n, d, 3)),
];
const tierFor = rank => (rank <= 2 ? 2 : 3); // thirds and eighths from the start; sixths, ninths and mixed numbers from rank 3

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
const fracC = (r, tag) => (r && r.n > 0 ? { html: fracHTML(r), text: fracText(r), tag } : null);
const pctC = (r, tag) => { if (!r || r.n <= 0) return null; const s = pctStr(r); return s ? { html: s, text: s, tag } : null; };
// Tag order + shuffle of the rest, keeping `first` (if present) in front with probability p.
function prioritize(first, rest, p = 0.75) { const r = shuffle(rest.filter(Boolean)); return first && Math.random() < p ? [first, ...r] : [...r, ...(first ? [first] : [])]; }

// "Digits" mistake: 3/8 -> 0.38 (only for single-digit denominators of proper fractions).
function digitsDec(r) {
  const whole = Math.floor(r.n / r.d), n = r.n - whole * r.d;
  if (r.d >= 10 || n === 0) return null;
  const s = `${whole}.${n}${r.d}`;
  return { html: s, text: s, tag: 'digits (wrote 3/8 as 0.38)' };
}
const complement = r => (r.n < r.d && r.d - r.n !== r.n ? R(r.d - r.n, r.d) : null);

// ---------- Tips (one-line fast way, shown after a miss) ----------
function fracTip(r) {
  const d = r.d, whole = Math.floor(r.n / r.d);
  const base = {
    2: 'Half = 0.5', 4: 'Each fourth = 0.25', 5: 'Each fifth = 0.2', 10: 'Each tenth = 0.1', 8: 'Each eighth = 0.125',
    3: '⅓ = 0.333…, ⅔ = 0.666…', 6: '⅙ = 0.166…, ⅚ = 0.833…', 9: 'Ninths repeat the top: 4/9 = 0.444…',
    20: 'Each twentieth = 0.05', 25: 'Each twenty-fifth = 0.04', 100: 'Hundredths: two places',
  }[d] || '';
  return `${fracHTML(r)} = ${decStr(r)}${base ? ` · ${base}` : ''}${whole ? ' · whole number stays in front' : ''}`;
}
const pctTip = r => `${decStr(r)} = ${pctStr(r)} · move the decimal point 2 places`;

// ---------- Skill: fraction -> decimal (and back) ----------
// Wrong answers are kept simple: the "digits" mistake, the look-alike fraction, and the nearest common values.
const nearest = (r, list, n) => list.filter(x => !eq(x, r)).sort((a, b) => Math.abs(val(a) - val(r)) - Math.abs(val(b) - val(r))).slice(0, n);
function frac2dec(rank, mem) {
  const tier = tierFor(rank);
  const items = FRAC_POOL.filter(i => i.tier <= tier);
  const dirs = ['f2d'];
  const keys = items.flatMap(i => dirs.map(dr => `${dr}:${key(i.r)}`));
  const k = mem.pickKey(keys);
  const [dir, fk] = k.split(':');
  const [n, d] = fk.split('/').map(Number), r = R(n, d);
  const pool = items.map(i => i.r).filter(x => (val(x) > 1) === (val(r) > 1));
  if (dir === 'f2d') {
    const cands = prioritize(digitsDec(r), [
      decC(complement(r), 'mixed up with a similar fraction'),
      ...nearest(r, pool, 4).map(x => decC(x, 'close but wrong value')),
    ], 0.6);
    return {
      skill: 'frac2dec', key: k, prompt: fracHTML(r), promptText: `${fracText(r)} = ?`, ask: 'What is this as a decimal?',
      choices: shuffle(choiceSet({ html: decStr(r), text: decStr(r) }, cands)), layout: 'grid', tip: fracTip(r),
    };
  }
  // decimal -> fraction
  const s = decStr(r), m = s.match(/^0\.(\d{1,2})$/);
  let digitMistake = null;
  if (m) {
    const ds = m[1];
    if (ds.length === 1 && Number(ds) > 1) digitMistake = R(1, Number(ds));
    else if (ds.length === 2 && Number(ds[0]) > 0 && Number(ds[0]) < Number(ds[1])) digitMistake = R(Number(ds[0]), Number(ds[1]));
  }
  const cands = prioritize(fracC(digitMistake, 'digits (read 0.4 as 1/4)'), [
    ...nearest(r, pool, 4).map(x => fracC(x, 'close but wrong value')), fracC(complement(r), 'mixed up with a similar fraction'),
  ], 0.6);
  return {
    skill: 'frac2dec', key: k, prompt: s, promptText: `${s} = ?`, ask: 'What is this as a fraction?',
    choices: shuffle(choiceSet({ html: fracHTML(r), text: fracText(r) }, cands)), layout: 'grid', tip: fracTip(r),
  };
}

// ---------- Skill: decimal <-> percent (and fraction -> percent) ----------
// The wrong answers are the same digits with the decimal point in a different place.
function pct(rank, mem) {
  const tier = tierFor(rank);
  const items = PCT_POOL.filter(i => i.tier <= tier);
  const keys = items.filter(i => terminates(i.r)).map(i => `d2p:${key(i.r)}`);
  const k = mem.pickKey(keys);
  const [dir, fk] = k.split(':');
  const [n, d] = fk.split('/').map(Number), r = R(n, d);
  if (dir === 'd2p') {
    const cands = [pctC(R(r.n, r.d * 100), 'just added % sign'), pctC(mul(r, 10), 'decimal point (1 place off)'), pctC(R(r.n, r.d * 10), 'decimal point (1 place off)')];
    return {
      skill: 'pct', key: k, prompt: decStr(r), promptText: `${decStr(r)} = ?%`, ask: 'What is this as a percent?',
      choices: shuffle(choiceSet(pctC(r), cands)), layout: 'grid', tip: pctTip(r),
    };
  }
  if (dir === 'p2d') {
    const cands = [decC(mul(r, 100), 'just dropped % sign'), decC(mul(r, 10), 'decimal point (1 place off)'), decC(R(r.n, r.d * 10), 'decimal point (1 place off)')];
    return {
      skill: 'pct', key: k, prompt: pctStr(r), promptText: `${pctStr(r)} = ?`, ask: 'What is this as a decimal?',
      choices: shuffle(choiceSet({ html: decStr(r), text: decStr(r) }, cands)), layout: 'grid', tip: pctTip(r),
    };
  }
  // fraction -> percent
  const dig = r.d < 10 && r.n < r.d ? { html: `${r.n}${r.d}%`, text: `${r.n}${r.d}%`, tag: 'digits (wrote 3/8 as 38%)' } : null;
  const pool = FRAC_POOL.filter(i => i.tier <= tier).map(i => i.r).filter(x => pctStr(x) && (val(x) > 1) === (val(r) > 1) && (terminates(mul(x, 100)) || !terminates(mul(r, 100))));
  const cands = prioritize(dig, [...nearest(r, pool, 4).map(x => pctC(x, 'close but wrong value')), pctC(complement(r), 'mixed up with a similar fraction')], 0.6);
  return {
    skill: 'pct', key: k, prompt: fracHTML(r), promptText: `${fracText(r)} = ?%`, ask: 'What is this as a percent?',
    choices: shuffle(choiceSet(pctC(r), cands)), layout: 'grid', tip: `${fracHTML(r)} = ${decStr(r)} = ${pctStr(r)}`,
  };
}

// ---------- Skill: compare two fractions ----------
const raw = (n, d) => ({ n, d }); // not reduced: 4/6 stays 4/6 on screen
const between = (a, b) => a + rand(b - a + 1);
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
export function makeQuestion(skill, rank, mem) {
  const retry = mem.takeRetry(skill);
  if (retry) return { ...retry, choices: retry.layout === 'row2' ? retry.choices : shuffle(retry.choices), retry: true };
  return GEN[skill](rank, mem);
}
