// Skill: words to equations (HSPT algebra), written the way Barron's HSPT book asks them:
// "Which expression best represents the following sentence?", the unknown is "a number", the choices
// use x, and numbers are digits ("the difference of twice a number and 6"). Each sentence is put
// together fresh from random parts (wording, numbers, names), so there are thousands of different ones. Sentences already
// shown on this device are skipped, so she doesn't see the same one twice.
// Levels: 0 = one step ("five less than a number n"), 1 = two steps ("five less than three times
// a number n", "three times the sum of ..."), 2 = full equations ("... is 20", "three times a number
// is eight more than the number").
import { rand, pick, shuffle } from './numbers.js?v=1794956358';

const between = (a, b) => a + rand(b - a + 1);
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const say = a => String(a);

// Expressions: t = text, h = HTML, f = value for a given number (used to make sure no wrong choice
// is secretly the same as the answer, like n + 5 and 5 + n).
const V = L => ({ t: L, h: `<i>${L}</i>`, f: n => n, atom: true });
const C = a => ({ t: String(a), h: String(a), f: () => a, atom: true });
const grp = x => (x.atom ? x : { t: `(${x.t})`, h: `(${x.h})`, f: x.f, atom: true });
const add = (x, y) => ({ t: `${x.t} + ${y.t}`, h: `${x.h} + ${y.h}`, f: n => x.f(n) + y.f(n) });
const sub = (x, y) => ({ t: `${x.t} − ${y.t}`, h: `${x.h} − ${y.h}`, f: n => x.f(n) - y.f(n) });
const mul = (k, x) => ({ t: `${k.t}${grp(x).t}`, h: `${k.h}${grp(x).h}`, f: n => k.f(n) * x.f(n), atom: x.atom });
const div = (x, y) => ({ t: `${grp(x).t}/${grp(y).t}`, h: `<span class="frac"><span>${x.h}</span><span>${y.h}</span></span>`, f: n => x.f(n) / y.f(n), atom: true });
const prodC = (k, a) => ({ t: `(${k} × ${a})`, h: `(${k} × ${a})`, f: () => k * a, atom: true });
const sq = x => ({ t: `${grp(x).t}²`, h: `${grp(x).h}<sup>2</sup>`, f: n => x.f(n) ** 2, atom: true });
const eqn = (x, y) => ({ t: `${x.t} = ${y.t}`, h: `${x.h} = ${y.h}`, f: n => x.f(n) - y.f(n), eq: true });
const PTS = [1.7, 3.3, 5.9];
const same = (a, b) => PTS.every(n => Math.abs(a.f(n) - b.f(n)) < 1e-9) || (a.eq && PTS.every(n => Math.abs(a.f(n) + b.f(n)) < 1e-9));

// Each form: (v = the letter, N = "a number n", a/k = numbers, A/K = how they are written) ->
// { phrase, ans, wrong: [[expression, mistake]], tip }
const ONE = {
  add: ({ v, N, a, A }) => ({
    phrase: pick([`${A} more than ${N}`, `${N} increased by ${A}`, `the sum of ${N} and ${A}`, `${A} added to ${N}`, `${N} plus ${A}`]),
    ans: add(v, C(a)), tip: '"More than", "increased by", "sum", "added to" and "plus" all mean add.',
    wrong: [[mul(C(a), v), 'multiplied instead of added'], [sub(v, C(a)), 'subtracted instead of added'], [sub(C(a), v), 'subtracted instead of added'], [div(v, C(a)), 'divided instead of added']],
  }),
  lessThan: ({ v, N, a, A }) => ({
    phrase: pick([`${A} less than ${N}`, `${A} fewer than ${N}`]),
    ans: sub(v, C(a)), tip: `"${a} less than" a number means start with the number and take ${a} away, so the order flips.`,
    wrong: [[sub(C(a), v), '"less than" flips the order'], [add(v, C(a)), 'added instead of subtracted'], [mul(C(a), v), 'multiplied instead of subtracted'], [div(v, C(a)), 'divided instead of subtracted']],
  }),
  sub: ({ v, N, a, A }) => ({
    phrase: pick([`${N} decreased by ${A}`, `${N} minus ${A}`, `the difference of ${N} and ${A}`, `${A} subtracted from ${N}`, `${N} reduced by ${A}`]),
    ans: sub(v, C(a)), tip: '"Decreased by", "minus", "reduced by" and "difference" mean subtract. "Subtracted from" means the second thing comes first.',
    wrong: [[sub(C(a), v), 'subtracted in the wrong order'], [add(v, C(a)), 'added instead of subtracted'], [mul(C(a), v), 'multiplied instead of subtracted'], [div(v, C(a)), 'divided instead of subtracted']],
  }),
  subFrom: ({ v, N, a, A }) => ({
    phrase: pick([`${N} subtracted from ${A}`, `${A} minus ${N}`, `${A} decreased by ${N}`, `the difference of ${A} and ${N}`]),
    ans: sub(C(a), v), tip: '"Subtracted from" flips the order: "n subtracted from 9" is 9 − n.',
    wrong: [[sub(v, C(a)), 'subtracted in the wrong order'], [add(C(a), v), 'added instead of subtracted'], [mul(C(a), v), 'multiplied instead of subtracted'], [div(C(a), v), 'divided instead of subtracted']],
  }),
  mul: ({ v, N, a, A }) => ({
    phrase: pick([`${A} times ${N}`, `the product of ${A} and ${N}`, `${N} multiplied by ${A}`,
      ...(a === 2 ? [`twice ${N}`, `double ${N}`] : a === 3 ? [`triple ${N}`] : [])]),
    ans: mul(C(a), v), tip: '"Times", "product", "multiplied by", "twice" (× 2) and "triple" (× 3) mean multiply.',
    wrong: [[add(v, C(a)), 'added instead of multiplied'], [div(v, C(a)), 'divided instead of multiplied'], [div(C(a), v), 'divided instead of multiplied'],
      [a === 2 ? sq(v) : sub(v, C(a)), a === 2 ? 'squared instead of doubled' : 'subtracted instead of multiplied']],
  }),
  div: ({ v, N, a, A }) => ({
    phrase: pick([`${N} divided by ${A}`, `the quotient of ${N} and ${A}`,
      ...(a === 2 ? [`half of ${N}`] : a === 3 ? [`one third of ${N}`] : a === 4 ? [`one fourth of ${N}`] : [])]),
    ans: div(v, C(a)), tip: '"Divided by" and "quotient" mean divide, first thing on top. "Half of" means divide by 2.',
    wrong: [[div(C(a), v), 'divided the wrong way'], [mul(C(a), v), 'multiplied instead of divided'], [sub(v, C(a)), 'subtracted instead of divided'], [add(v, C(a)), 'added instead of divided']],
  }),
  divInto: ({ v, N, a, A }) => ({
    phrase: pick([`${A} divided by ${N}`, `the quotient of ${A} and ${N}`]),
    ans: div(C(a), v), tip: 'The first thing named goes on top of the fraction.',
    wrong: [[div(v, C(a)), 'divided the wrong way'], [mul(C(a), v), 'multiplied instead of divided'], [sub(C(a), v), 'subtracted instead of divided'], [sub(v, C(a)), 'subtracted instead of divided']],
  }),
};
const TWO = {
  kPlus: ({ v, N, a, A, k, K, KN }) => ({
    phrase: pick([`${A} more than ${KN}`, `${A} more than the product of ${K} and ${N}`, `the sum of ${KN} and ${A}`, `${KN}, increased by ${A}`]),
    ans: add(mul(C(k), v), C(a)), tip: `Multiply first (${k} times the number), then add ${a}. No parentheses: only the number is multiplied.`,
    wrong: [[mul(C(k), add(v, C(a))), 'multiplied the whole sum'], [add(mul(C(a), v), C(k)), 'swapped the numbers'], [sub(mul(C(k), v), C(a)), 'subtracted instead of added'], [add(C(k), add(v, C(a))), 'added instead of multiplied']],
  }),
  kLess: ({ v, N, a, A, k, K, KN }) => ({
    phrase: pick([`${A} less than ${KN}`, `${A} less than the product of ${K} and ${N}`]),
    ans: sub(mul(C(k), v), C(a)), tip: `"${a} less than" something means that thing minus ${a}, so it is written last.`,
    wrong: [[sub(C(a), mul(C(k), v)), '"less than" flips the order'], [mul(C(k), sub(v, C(a))), 'multiplied the whole difference'], [add(mul(C(k), v), C(a)), 'added instead of subtracted'], [sub(mul(C(a), v), C(k)), 'swapped the numbers']],
  }),
  kMinus: ({ v, N, a, A, k, K, KN }) => ({
    phrase: pick([`${KN}, decreased by ${A}`, `${KN}, minus ${A}`, `the difference of ${KN} and ${A}`]),
    ans: sub(mul(C(k), v), C(a)), tip: `Multiply first, then take away ${a}.`,
    wrong: [[sub(v, prodC(k, a)), 'multiplied the two numbers together'], [sub(C(a), mul(C(k), v)), 'subtracted in the wrong order'], [mul(C(k), sub(v, C(a))), 'multiplied the whole difference'], [add(mul(C(k), v), C(a)), 'added instead of subtracted'], [sub(mul(C(a), v), C(k)), 'swapped the numbers']],
  }),
  kSum: ({ v, N, a, A, k, K, KN }) => ({
    phrase: pick([`${K} times the sum of ${N} and ${A}`, `the product of ${K} and the sum of ${N} and ${A}`]),
    ans: mul(C(k), add(v, C(a))), tip: '"Times the sum of" means the whole sum is multiplied, so it goes in parentheses.',
    wrong: [[add(mul(C(k), v), C(a)), 'left out the parentheses'], [mul(C(a), add(v, C(k))), 'swapped the numbers'], [mul(C(k), sub(v, C(a))), 'subtracted instead of added'], [add(C(k), add(v, C(a))), 'added instead of multiplied']],
  }),
  kDiff: ({ v, N, a, A, k, K, KN }) => ({
    phrase: pick([`${K} times the difference of ${N} and ${A}`, `the product of ${K} and the difference of ${N} and ${A}`]),
    ans: mul(C(k), sub(v, C(a))), tip: '"Times the difference of" means the whole difference is multiplied, so it goes in parentheses.',
    wrong: [[sub(mul(C(k), v), C(a)), 'left out the parentheses'], [mul(C(k), sub(C(a), v)), 'subtracted in the wrong order'], [mul(C(a), sub(v, C(k))), 'swapped the numbers'], [mul(C(k), add(v, C(a))), 'added instead of subtracted']],
  }),
  sumDiv: ({ v, N, a, A, k, K, KN }) => ({
    phrase: pick([`the sum of ${N} and ${A}, divided by ${K}`, `${N} plus ${A}, all divided by ${K}`]),
    ans: div(add(v, C(a)), C(k)), tip: 'The whole sum is divided, so all of it goes on top.',
    wrong: [[add(v, div(C(a), C(k))), 'only divided part of it'], [div(C(k), add(v, C(a))), 'divided the wrong way'], [div(sub(v, C(a)), C(k)), 'subtracted instead of added'], [mul(C(k), add(v, C(a))), 'multiplied instead of divided']],
  }),
  divPlus: ({ v, N, a, A, k, K, KN }) => ({
    phrase: pick([`${A} more than the quotient of ${N} and ${K}`, `${N} divided by ${K}, increased by ${A}`]), // not "5 more than n divided by 3": that could be read either way
    ans: add(div(v, C(k)), C(a)), tip: `Divide the number by ${k} first, then add ${a}.`,
    wrong: [[div(add(v, C(a)), C(k)), 'divided the whole sum'], [add(div(C(k), v), C(a)), 'divided the wrong way'], [add(div(v, C(a)), C(k)), 'swapped the numbers'], [add(mul(C(k), v), C(a)), 'multiplied instead of divided']],
  }),
  sqPlus: ({ v, N, a, A }) => ({
    phrase: pick([`${A} more than the square of ${N}`, `${N} squared, increased by ${A}`, `the sum of ${N} squared and ${A}`]),
    ans: add(sq(v), C(a)), tip: 'Square only the number, then add.',
    wrong: [[sq(add(v, C(a))), 'squared the whole sum'], [add(mul(C(2), v), C(a)), 'doubled instead of squared'], [sub(sq(v), C(a)), 'subtracted instead of added'], [mul(C(a), sq(v)), 'multiplied instead of added']],
  }),
};
const NAMES = [['Maria', 'She'], ['Jack', 'He'], ['Sofia', 'She'], ['Leo', 'He'], ['Ana', 'She'], ['Marcus', 'He'], ['Grace', 'She'], ['Diego', 'He'], ['Nora', 'She'], ['Sam', 'He']];
const IS = () => pick([' is ', ' equals ', ' is equal to ']);
const THREE = {
  // Any two-step phrase, finished with "is 27".
  ...Object.fromEntries(Object.entries(TWO).map(([name, make]) => [`eq_${name}`, o => {
    const f = make(o), c = between(10, 60);
    return { phrase: f.phrase + IS() + say(c), ans: eqn(f.ans, C(c)), tip: `"Is" means equals. ${f.tip}`, wrong: f.wrong.map(([w, tag]) => [eqn(w, C(c)), tag]) };
  }])),
  // Short stories, like Barron's money questions ("buys some ... and gets change").
  change: ({ k }) => {
    const [who, pro] = pick(NAMES), item = pick(['notebooks', 'pens', 'snacks', 'stickers', 'tickets', 'bracelets']), cost = k, back = between(1, 9);
    const total = cost * between(2, 9) + back;
    return {
      story: true, phrase: `${who} has $${total}. ${pro} buys some ${item} for $${cost} each and gets $${back} back in change.`,
      ans: eqn(sub(C(total), mul(C(cost), V('x'))), C(back)), tip: `Money spent is ${cost} times the number of ${item}; what is left is the change.`,
      wrong: [[eqn(sub(C(total), V('x')), { t: `${back} × ${cost}`, h: `${back} × ${cost}`, f: () => back * cost }), 'mixed up which number is multiplied'], [eqn(sub(C(total), mul(C(back), V('x'))), C(cost)), 'swapped the cost and the change'],
        [eqn(sub(mul(C(cost), V('x')), C(back)), C(total)), 'subtracted the change instead of adding it'], [eqn(add(C(total), mul(C(cost), V('x'))), C(back)), 'added instead of subtracted']],
    };
  },
  fee: () => {
    const [who] = pick(NAMES), [place, unit] = pick([['A gym', 'month'], ['A music school', 'lesson'], ['A bike shop', 'hour'], ['A swim club', 'week']]);
    const fee = between(2, 9) * 5, per = between(4, 15), paid = fee + per * between(2, 9);
    return {
      story: true, phrase: `${place} charges a $${fee} sign-up fee plus $${per} per ${unit}. ${who} paid $${paid} in all.`,
      ans: eqn(add(C(fee), mul(C(per), V('x'))), C(paid)), tip: `The fee is paid once; the $${per} is paid for each ${unit} (x of them).`,
      wrong: [[eqn(add(C(per), mul(C(fee), V('x'))), C(paid)), 'multiplied the one-time fee'], [eqn(mul(C(fee + per), V('x')), C(paid)), 'multiplied the fee too'],
        [eqn(sub(mul(C(per), V('x')), C(fee)), C(paid)), 'subtracted the fee instead of adding it'], [eqn(add(C(fee), C(per)), mul(C(paid), V('x'))), 'put x on the wrong side']],
    };
  },
  bothSides: ({ v, N, a, A, k, K, KN }) => ({
    phrase: pick([`${KN} is ${A} more than the number`, `${KN} equals the number increased by ${A}`, `the product of ${K} and ${N} is equal to the sum of the number and ${A}`]),
    ans: eqn(mul(C(k), v), add(v, C(a))), tip: '"Is" is the equals sign: write the words before it on the left and the words after it on the right.',
    wrong: [[eqn(add(mul(C(k), v), C(a)), v), 'put the "more than" on the wrong side'], [eqn(mul(C(k), v), sub(v, C(a))), 'subtracted instead of added'], [eqn(add(C(k), v), add(v, C(a))), 'added instead of multiplied'], [eqn(mul(C(k), v), mul(C(a), v)), 'multiplied instead of added']],
  }),
  lessBoth: ({ v, N, a, A, k, K, KN }) => ({
    phrase: pick([`${A} less than ${KN} is the number`, `${A} less than ${KN} equals the number`]),
    ans: eqn(sub(mul(C(k), v), C(a)), v), tip: `"${a} less than ${k} times a number" is ${k}${v.t} − ${a}; "is the number" puts ${v.t} on the other side.`,
    wrong: [[eqn(sub(C(a), mul(C(k), v)), v), '"less than" flips the order'], [eqn(mul(C(k), v), sub(v, C(a))), 'put the "less than" on the wrong side'], [eqn(mul(C(k), sub(v, C(a))), v), 'multiplied the whole difference'], [eqn(add(mul(C(k), v), C(a)), v), 'added instead of subtracted']],
  }),
};
export const WORD_FORMS = [ONE, TWO, THREE];

// Sentences start with a word, not a numeral: "Ten more than ...".
const cap = s => { s = s.replace(/^\d+/, d => (+d <= 12 ? WORDS[+d] : d)); return s[0].toUpperCase() + s.slice(1); };
// level 0/1/2; form: re-ask the same kind of sentence (new numbers) after a miss.
export function words(level, mem, form) {
  const forms = WORD_FORMS[level];
  for (let tries = 0; ; tries++) {
    const name = form && forms[form] && tries < 20 ? form : mem.pickKey(Object.keys(forms).map(f => `w2e:${f}`)).slice(4);
    const v = V('x'), a = between(2, level ? 15 : 40);
    let k; do { k = between(2, 9); } while (k === a);
    const o = { v, N: 'a number', a, A: say(a), k, K: say(k), KN: k === 2 && Math.random() < 0.6 ? 'twice a number' : `${k} times a number` };
    const f = forms[name](o);
    const sentence = f.story ? f.phrase : cap(f.phrase) + '.';
    const wrong = [];
    for (const [w, tag] of shuffle(f.wrong)) if (!same(w, f.ans) && !wrong.some(x => x.text === w.t || same(x.e, w)) && w.t !== f.ans.t) wrong.push({ html: w.h, text: w.t, tag, e: w });
    if (wrong.length < 3 && tries < 60) continue;
    if (tries < 40 && mem.seen && mem.seen(sentence)) continue;
    if (mem.markSeen) mem.markSeen(sentence);
    const choices = shuffle([{ html: f.ans.h, text: f.ans.t, correct: true }, ...wrong.slice(0, 3).map(({ e, ...c }) => ({ ...c, correct: false }))]);
    return {
      skill: 'words', key: `w2e:${name}`, form: name, level,
      prompt: `<span class="words">${sentence}</span>`, promptText: sentence,
      ask: f.story ? 'Which expression best represents this?' : 'Which expression best represents the following sentence?',
      choices, layout: 'grid', tip: `<b>${f.ans.h}</b> · ${f.tip}`,
    };
  }
}
