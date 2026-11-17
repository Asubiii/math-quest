// Question generators for the five question types, which are mixed together in one game mode. Every question is multiple choice.
// A question: { skill, key, prompt (HTML), promptText, choices:[{html,text,correct,tag}], layout, tip (HTML) }
// Wrong choices carry a `tag` naming the mistake they represent, which goes to the tutor report.

import { words } from './words.js?v=1794957524';
import { angles } from './angles.js?v=1794957524';
import { R, val, eq, cmp, mul, key, decStr, pctStr, fracHTML, fracText, terminates, rand, pick, shuffle } from './numbers.js?v=1794957524';

// topics: the flashcard topics each question type practices. A topic's Focus level (raised when she
// misses a packet question or marks it Hard) makes the matching question type come up more often.
export const SKILLS = {
  compare: { name: 'Compare fractions', weight: 3, topics: ['Fractions'] },
  frac2dec: { name: 'Fraction to decimal', weight: 3, topics: ['Decimals', 'Conversions', 'Fractions'] },
  pct: { name: 'Decimal to percent', weight: 1, topics: ['Percents', 'Conversions'] }, // only a few of these
  angles: { name: 'Missing angles', weight: 3, topics: ['Geometry'] },
  words: { name: 'Words to equations', weight: 3, topics: ['Algebra'] },
};

// Every question is easy (0), medium (1) or hard (2). Each rank mixes all three, so there are always
// some quick wins and some that take real work; higher ranks lean harder.
export function level(rank) {
  const mix = rank <= 2 ? [0.5, 0.35, 0.15] : rank <= 5 ? [0.3, 0.4, 0.3] : [0.2, 0.35, 0.45];
  const x = Math.random();
  return x < mix[0] ? 0 : x < mix[0] + mix[1] ? 1 : 2;
}
// Focus 0 keeps the base mix; each level of the most-focused matching topic adds half the base share again.
export function skillWeight(k, focus = {}) {
  const f = Math.max(0, ...SKILLS[k].topics.map(t => Number(focus[t]) || 0));
  return SKILLS[k].weight * (1 + f / 2);
}

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
// Decimals of other fractions that are close in value (5/8 = 0.625 next to 0.6 and 0.666…), so the
// answer can't be found by guessing roughly how big the fraction is.
const NEAR_DENS = [3, 4, 5, 6, 8, 9, 10, 12, 16, 20, 25, 40];
function nearDecimals(r, gap) {
  const v = val(r), out = [];
  for (const e of NEAR_DENS) for (let m = 1; m < e * 4; m++) {
    const x = R(m, e); if (eq(x, r) || Math.abs(val(x) - v) > gap) continue;
    out.push(x);
  }
  return shuffle(out);
}
function frac2dec(rank, mem, lv = level(rank)) {
  const dens = [DEN_TIERS[0], [...DEN_TIERS[0], ...DEN_TIERS[1]], [...DEN_TIERS[1], ...DEN_TIERS[2]]][lv];
  const d = Number(mem.pickKey(dens.map(x => `f2d:den${x}`)).slice(7));
  const n = between(1, d - 1), w = lv >= 1 && Math.random() < 0.25 ? between(1, 3) : 0;
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
  // Medium: one close-in-value choice; hard: two. Easy keeps the usual mistakes only.
  if (lv) cands.unshift(...nearDecimals(r, lv === 2 ? 0.06 : 0.1).slice(0, lv).map(x => decC(x, 'close in value: needed the exact decimal')));
  return {
    skill: 'frac2dec', key: `f2d:den${d}`, level: lv, prompt: rawHTML(w, n, d), promptText: `${rawText(w, n, d)} = ?`, ask: 'What is this as a decimal?',
    choices: shuffle(choiceSet({ html: decStr(r), text: decStr(r) }, cands)), layout: 'grid', tip: fracTip(w, n, d),
  };
}

// ---------- Skill: decimal (or fraction) -> percent ----------
// Wrong answers are mostly close to the right one (37.5% next to 35.7%, 37.05% and 38%), plus one with
// the decimal point moved, so she has to convert exactly instead of estimating.
const pctFmt = th => `${+(th / 1000).toFixed(3)}%`;           // thousandths of a percent -> "37.5%"
function nearPercents(th) {
  const str = String(+(th / 1000).toFixed(3)), out = [];
  const digits = str.replace('.', ''), dot = str.indexOf('.');
  const fromDigits = ds => { const t = dot < 0 ? ds : ds.slice(0, dot) + '.' + ds.slice(dot); return Math.round(Number(t) * 1000); };
  // swap two neighbouring digits: 37.5 -> 35.7, 45 -> 54
  for (let i = 0; i < digits.length - 1; i++) if (digits[i] !== digits[i + 1]) out.push([fromDigits(digits.slice(0, i) + digits[i + 1] + digits[i] + digits.slice(i + 2)), 'mixed up the digits']);
  if (dot > 0) out.push([Math.round(Number(str.slice(0, dot + 1) + '0' + str.slice(dot + 1)) * 1000), 'added a zero']); // 37.5 -> 37.05
  if (th % 1000) out.push([Math.round(th / 1000) * 1000, 'rounded instead of converting']);                         // 37.5 -> 38
  const unit = th % 1000 ? (th % 100 ? (th % 10 ? 1 : 10) : 100) : 1000;
  out.push([th + unit, 'one off in the last digit'], [th - unit, 'one off in the last digit']);
  if (th >= 15000) out.push([th + 5000, 'estimated'], [th - 5000, 'estimated']);
  return shuffle(out.filter(([x]) => x > 0 && x !== th && x / th < 1.6 && th / x < 1.6));
}
function pct(rank, mem, lv = level(rank)) {
  let r, prompt, text, kind;
  if (lv === 2 && Math.random() < 0.5) {                       // hard: fraction -> percent
    const d = pick([8, 8, 16, 40, 3, 6, 12, 20, 25]), n = between(1, d - 1);
    r = R(n, d); if (!pctStr(r) || r.d < 3) return pct(rank, mem, lv);
    prompt = rawHTML(0, n, d); text = `${n}/${d}`; kind = 'frac';
  } else {
    const places = [between(1, 2), 3, pick([3, 4])][lv];
    let n; do { n = between(1, 10 ** places - 1); } while (n % 10 === 0);
    const whole = lv === 2 && Math.random() < 0.4 ? between(1, 2) : 0;
    r = R(whole * 10 ** places + n, 10 ** places); prompt = decStr(r); text = decStr(r); kind = `${places}place${whole ? '+whole' : ''}`;
  }
  const right = pctStr(r);
  const th = terminates(R(r.n * 100, r.d)) ? Math.round(val(r) * 100000) : null;
  const near = th != null ? nearPercents(th).map(([x, tag]) => ({ html: pctFmt(x), text: pctFmt(x), tag }))
    : [R(Math.round(val(r) * 100) + 1, 100), R(Math.round(val(r) * 100) - 1, 100), R(Math.floor(val(r) * 100), 100)].map(x => pctC(x, 'rounded instead of converting'));
  const shifts = shuffle([pctC(mul(r, 10), 'moved the decimal point the wrong amount'), pctC(R(r.n, r.d * 10), 'moved the decimal point the wrong amount'), pctC(R(r.n, r.d * 100), 'just added a % sign')]);
  const cands = lv === 0 ? [shifts[0], shifts[1], ...near, shifts[2]] : [...near.slice(0, 2), shifts[0], ...near.slice(2), ...shifts.slice(1)];
  return {
    skill: 'pct', key: `d2p:${kind}`, level: lv, prompt, promptText: `${text} = ?%`, ask: 'What is this as a percent?',
    choices: shuffle(choiceSet({ html: right, text: right }, cands)), layout: 'grid',
    tip: kind === 'frac' ? `${prompt} = <b>${right}</b> · ${decStr(r)} as a decimal, then move the decimal point 2 places right` : `${text} = <b>${right}</b> · move the decimal point 2 places right`,
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
function compare(rank, mem, lv = level(rank)) {
  const type = pick([['spread', 'half', 'half', 'missing'], ['half', 'missing', 'close', 'close'], ['close']][lv]);
  const [a, b] = comparePair(type, lv < 2 ? 0.12 : 0.04), c = cmp(a, b);
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
    skill: 'compare', key: `cmp:${type}:${ft(a)}|${ft(b)}`, level: lv, prompt: '',
    promptText: `${ft(a)} vs ${ft(b)}`, ask: 'Which fraction is bigger?', choices, layout: 'row2', tip,
  };
}

const GEN = {
  compare, frac2dec, pct,
  angles: (rank, mem, lv = level(rank)) => ({ ...angles([2, 5, 9][lv]), level: lv }), // angles.js picks its figures by rank
  words: (rank, mem, lv = level(rank), form) => words(lv, mem, form),
};
// Weighted pick of the next question type, never the same type three times in a row.
export function pickType(lastTypes, focus = {}) {
  const block = lastTypes.length >= 2 && lastTypes[lastTypes.length - 1] === lastTypes[lastTypes.length - 2] ? lastTypes[lastTypes.length - 1] : null;
  const ks = Object.keys(GEN).filter(k => k !== block), ws = ks.map(k => skillWeight(k, focus));
  let x = Math.random() * ws.reduce((a, b) => a + b, 0);
  for (let i = 0; i < ks.length; i++) { x -= ws[i]; if (x < 0) return ks[i]; }
  return ks[ks.length - 1];
}
export function makeQuestion(skill, rank, mem) {
  const retry = mem.takeRetry(skill);
  // A missed word problem comes back as the same kind of sentence with new numbers, never the same one.
  if (retry && skill === 'words') return { ...GEN.words(rank, mem, retry.level, retry.form), retry: true };
  if (retry) return { ...retry, choices: retry.layout === 'row2' ? retry.choices : shuffle(retry.choices), retry: true };
  return GEN[skill](rank, mem);
}
