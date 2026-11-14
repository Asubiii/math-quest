// Question generators for the four skills. Every question is multiple choice.
// A question: { skill, key, prompt (HTML), promptText, choices:[{html,text,correct,tag}], layout, tip (HTML) }
// Wrong choices carry a `tag` naming the mistake they represent, which goes to the tutor report.

import { R, val, eq, cmp, mul, key, decStr, pctStr, fracHTML, fracText, terminates, rand, pick, shuffle } from './numbers.js';

export const SKILLS = {
  compare: { name: 'Fraction Face-Off', short: 'Compare fractions', area: 'Woodland Trail' },
  frac2dec: { name: 'Fractions → Decimals', short: 'Fraction to decimal', area: 'Hush Cave' },
  pct: { name: 'Decimals ↔ Percents', short: 'Decimal and percent', area: 'Coast Path' },
  mixed: { name: 'Mixed Showdown', short: 'Order mixed numbers', area: 'Cliff Summit' },
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
const tierFor = rank => (rank <= 2 ? 1 : rank <= 4 ? 2 : 3);

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
function neighbors(r) {
  const whole = Math.floor(r.n / r.d), n = r.n - whole * r.d, d = r.d, w = x => R(x.n + whole * x.d, x.d);
  const out = [];
  if (n > 0) {
    out.push(w(R(n, d + 1)));
    if (d - 1 > n) out.push(w(R(n, d - 1)));
    if (n + 1 < d) out.push(w(R(n + 1, d)));
    if (n - 1 > 0) out.push(w(R(n - 1, d)));
  }
  return out.filter(x => !eq(x, r));
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
function frac2dec(rank, mem) {
  const tier = tierFor(rank);
  const items = FRAC_POOL.filter(i => i.tier <= tier);
  const dirs = rank >= 3 ? ['f2d', 'f2d', 'f2d', 'd2f'] : ['f2d'];
  const keys = items.flatMap(i => dirs.map(dr => `${dr}:${key(i.r)}`));
  const k = mem.pickKey(keys);
  const [dir, fk] = k.split(':');
  const [n, d] = fk.split('/').map(Number), r = R(n, d);
  if (dir === 'f2d') {
    const trunc = !terminates(r) && r.n < r.d && decStr(r).match(/^0\.(\d)\1\1…$/) ? R(Number(decStr(r)[2]), 10) : null;
    const cands = prioritize(digitsDec(r), [
      decC(complement(r), 'mixed up with a similar fraction'),
      ...shuffle(neighbors(r)).slice(0, 2).map(x => decC(x, 'close but wrong fraction')),
      decC(R(r.n, r.d * 10), 'decimal point'), decC(mul(r, 10), 'decimal point'),
      decC(trunc, 'cut off a repeating decimal'),
    ]);
    return {
      skill: 'frac2dec', key: k, prompt: fracHTML(r), promptText: `${fracText(r)} = ?`, ask: 'As a decimal?',
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
  const near = items.map(i => i.r).filter(x => !eq(x, r)).sort((a, b) => Math.abs(val(a) - val(r)) - Math.abs(val(b) - val(r))).slice(0, 3);
  const cands = prioritize(fracC(digitMistake, 'digits (read 0.4 as 1/4)'), [
    ...near.map(x => fracC(x, 'close but wrong fraction')), fracC(complement(r), 'mixed up with a similar fraction'),
  ]);
  return {
    skill: 'frac2dec', key: k, prompt: s, promptText: `${s} = ?`, ask: 'As a fraction?',
    choices: shuffle(choiceSet({ html: fracHTML(r), text: fracText(r) }, cands)), layout: 'grid', tip: fracTip(r),
  };
}

// ---------- Skill: decimal <-> percent (and fraction -> percent) ----------
function pct(rank, mem) {
  const tier = tierFor(rank);
  const items = PCT_POOL.filter(i => i.tier <= tier);
  const keys = items.flatMap(i => {
    const ks = [`d2p:${key(i.r)}`, `p2d:${key(i.r)}`];
    if (rank >= 3 && i.r.d <= 40 && i.r.d !== 1) ks.push(`f2p:${key(i.r)}`);
    return ks;
  });
  const k = mem.pickKey(keys);
  const [dir, fk] = k.split(':');
  const [n, d] = fk.split('/').map(Number), r = R(n, d);
  const shifts = (fn, tagSmall, tagBig) => [fn(mul(r, 10), 'decimal point (1 place off)'), fn(R(r.n, r.d * 10), 'decimal point (1 place off)'),
    fn(R(r.n, r.d * 100), tagSmall), fn(mul(r, 100), tagBig)];
  if (dir === 'd2p') {
    const [a, b, small, big] = shifts(pctC, 'just added % sign', 'decimal point (2 places off)');
    return {
      skill: 'pct', key: k, prompt: decStr(r), promptText: `${decStr(r)} = ?%`, ask: 'As a percent?',
      choices: shuffle(choiceSet(pctC(r), prioritize(small, [a, b, big]))), layout: 'grid', tip: pctTip(r),
    };
  }
  if (dir === 'p2d') {
    const [a, b, small, big] = shifts(decC, 'decimal point (2 places off)', 'just dropped % sign');
    return {
      skill: 'pct', key: k, prompt: pctStr(r), promptText: `${pctStr(r)} = ?`, ask: 'As a decimal?',
      choices: shuffle(choiceSet({ html: decStr(r), text: decStr(r) }, prioritize(big, [a, b, small]))), layout: 'grid', tip: pctTip(r),
    };
  }
  // fraction -> percent
  const dig = r.d < 10 && r.n < r.d ? { html: `${r.n}${r.d}%`, text: `${r.n}${r.d}%`, tag: 'digits (wrote 3/8 as 38%)' } : null;
  const cands = prioritize(dig, [...shuffle(neighbors(r)).slice(0, 2).map(x => pctC(x, 'close but wrong fraction')),
    pctC(complement(r), 'mixed up with a similar fraction'), pctC(mul(r, 10), 'decimal point'), pctC(R(r.n, r.d * 10), 'decimal point')]);
  return {
    skill: 'pct', key: k, prompt: fracHTML(r), promptText: `${fracText(r)} = ?%`, ask: 'As a percent?',
    choices: shuffle(choiceSet(pctC(r), cands)), layout: 'grid', tip: `${fracHTML(r)} = ${decStr(r)} = ${pctStr(r)}`,
  };
}

// ---------- Skill: compare two fractions ----------
const raw = (n, d) => ({ n, d }); // not reduced: 4/6 stays 4/6 on screen
const between = (a, b) => a + rand(b - a + 1);
function comparePair(type) {
  for (let tries = 0; tries < 200; tries++) {
    let a, b;
    if (type === 'sameDen') { const d = between(3, 12); a = raw(between(1, d - 1), d); b = raw(between(1, d - 1), d); }
    else if (type === 'sameNum') { const n = between(1, 6); a = raw(n, between(n + 1, 12)); b = raw(n, between(n + 1, 12)); }
    else if (type === 'half') {
      const d1 = between(3, 12), d2 = between(3, 12);
      a = raw(between(1, Math.ceil(d1 / 2) - 1), d1); b = raw(between(Math.floor(d2 / 2) + 1, d2 - 1), d2);
      if (!a.n || 2 * a.n >= a.d || 2 * b.n <= b.d) continue;
    } else if (type === 'missing') { const k = pick([1, 1, 2]), d1 = between(k + 2, 12), d2 = between(k + 2, 12); a = raw(d1 - k, d1); b = raw(d2 - k, d2); }
    else if (type === 'close') {
      const d1 = between(4, 12), d2 = between(4, 12); a = raw(between(1, d1 - 1), d1); b = raw(between(1, d2 - 1), d2);
      const diff = Math.abs(val(a) - val(b)); if (diff === 0 || diff > 0.08 || d1 === d2) continue;
    } else if (type === 'equal') {
      const bd = between(2, 6), bn = between(1, bd - 1), base = R(bn, bd), k1 = between(1, 2), k2 = between(k1 + 1, 4);
      if (base.d * k2 > 15) continue; a = raw(base.n * k1, base.d * k1); b = raw(base.n * k2, base.d * k2);
    }
    if (type !== 'equal' && (cmp(a, b) === 0)) continue;
    if (a.n === b.n && a.d === b.d) continue;
    return Math.random() < 0.5 ? [a, b] : [b, a];
  }
  return [raw(1, 2), raw(1, 3)];
}
function compare(rank) {
  const types = rank <= 2 ? ['sameDen', 'sameNum', 'sameNum'] : rank <= 5 ? ['sameDen', 'sameNum', 'half', 'half', 'missing', 'missing', 'close'] : ['half', 'missing', 'close', 'close', 'close'];
  const type = Math.random() < 0.12 ? 'equal' : pick(types);
  const [a, b] = comparePair(type), c = cmp(a, b);
  const fh = x => `<span class="frac"><span>${x.n}</span><span>${x.d}</span></span>`, ft = x => `${x.n}/${x.d}`;
  const big = c > 0 ? a : b, small = c > 0 ? b : a;
  const tip = {
    sameDen: `Same bottom number: the bigger top wins, so ${fh(big)} is bigger.`,
    sameNum: `Same top number: a smaller bottom means bigger pieces, so ${fh(big)} wins.`,
    half: `${fh(small)} is less than ½ and ${fh(big)} is more than ½.`,
    missing: `Each is short of 1. ${fh(R(small.d - small.n, small.d))} is a bigger gap than ${fh(R(big.d - big.n, big.d))}, so ${fh(big)} is closer to 1.`,
    close: `Cross-multiply: ${a.n}×${b.d} = ${a.n * b.d} vs ${b.n}×${a.d} = ${b.n * a.d}.`,
    equal: `They simplify to the same fraction: ${fh(R(a.n, a.d))}.`,
  }[type];
  const wrongTag = { sameDen: 'picked smaller top', sameNum: 'thought bigger bottom = bigger', half: 'missed the ½ benchmark', missing: 'missed "closer to 1"', close: 'close pair', equal: 'missed equal fractions' }[type];
  const choices = [
    { html: fh(a), text: ft(a), correct: c > 0, tag: c === 0 ? 'missed equal fractions' : wrongTag },
    { html: '=', text: '=', correct: c === 0, tag: 'thought they were equal' },
    { html: fh(b), text: ft(b), correct: c < 0, tag: c === 0 ? 'missed equal fractions' : wrongTag },
  ];
  return {
    skill: 'compare', key: `cmp:${type}:${ft(a)}|${ft(b)}`, prompt: '',
    promptText: `${ft(a)} vs ${ft(b)}`, ask: 'Which is bigger?', choices, layout: 'row3', tip,
  };
}

// ---------- Skill: mixed formats (order / greatest / least) ----------
const MIX_POOL = FRAC_POOL.map(i => i.r).concat(PCT_POOL.map(i => i.r)).filter((r, i, a) => val(r) <= 1.5 && a.findIndex(x => eq(x, r)) === i);
function showAs(r, fmt) {
  if (fmt === 'pct' && pctStr(r)) return { html: pctStr(r), text: pctStr(r) };
  if (fmt === 'dec' || (fmt === 'pct' && !pctStr(r))) return { html: decStr(r), text: decStr(r) };
  return { html: fracHTML(r), text: fracText(r) };
}
function pickClose(count, rank) {
  const [gap, range] = rank <= 3 ? [0.1, 1.5] : rank <= 6 ? [0.04, 0.4] : [0.01, 0.25];
  for (let t = 0; t < 400; t++) {
    const set = shuffle(MIX_POOL).slice(0, count).sort((a, b) => val(a) - val(b));
    const vs = set.map(val);
    if (vs[vs.length - 1] - vs[0] > range) continue;
    if (vs.some((v, i) => i && v - vs[i - 1] < gap)) continue;
    return shuffle(set);
  }
  return shuffle(MIX_POOL).slice(0, count);
}
function mixed(rank) {
  const fmts = ['frac', 'dec', 'pct'];
  const type = pick(['order', 'order', 'greatest', 'least']);
  const count = type === 'order' ? 3 : 4;
  const vals = pickClose(count, rank);
  let fs = shuffle([...fmts, ...fmts]).slice(0, count);
  if (new Set(fs).size < 2) fs = ['frac', 'dec', 'pct', 'dec'].slice(0, count);
  const shown = vals.map((r, i) => ({ r, ...showAs(r, fs[i]) }));
  const tip = shown.map(s => `${s.html} = ${decStr(s.r)}`).join(' · ');
  const keyStr = `mix:${type}:${shown.map(s => s.text).join('|')}`;
  if (type === 'order') {
    const sorted = shown.slice().sort((a, b) => cmp(a.r, b.r));
    const perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
    const opts = [perms[0], ...shuffle(perms.slice(1)).slice(0, 3)].map((p, i) => ({
      html: p.map(j => sorted[j].html).join('<span class="lt">&lt;</span>'), text: p.map(j => sorted[j].text).join(' < '),
      correct: i === 0, tag: 'wrong order',
    }));
    return {
      skill: 'mixed', key: keyStr, prompt: shown.map(s => s.html).join('<span class="comma">,</span>'),
      promptText: `Order: ${shown.map(s => s.text).join(', ')}`, ask: 'Least to greatest?', choices: shuffle(opts), layout: 'list', tip,
    };
  }
  const target = shown.slice().sort((a, b) => (type === 'greatest' ? cmp(b.r, a.r) : cmp(a.r, b.r)))[0];
  return {
    skill: 'mixed', key: keyStr, prompt: '', promptText: `Which is ${type}: ${shown.map(s => s.text).join(', ')}`,
    ask: type === 'greatest' ? 'Which is the <b>greatest</b>?' : 'Which is the <b>least</b>?',
    choices: shown.map(s => ({ html: s.html, text: s.text, correct: s === target, tag: type === 'greatest' ? 'picked a smaller one' : 'picked a bigger one' })),
    layout: 'grid', tip,
  };
}

const GEN = { compare, frac2dec, pct, mixed };
export function makeQuestion(skill, rank, mem) {
  const retry = mem.takeRetry(skill);
  if (retry) return { ...retry, choices: retry.layout === 'row3' ? retry.choices : shuffle(retry.choices), retry: true };
  return GEN[skill](rank, mem);
}
