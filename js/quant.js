// Quantitative Skills question generators for the Drill page: a port of packets/build_quant_drill.py.
// Every template is modeled on a worked example or practice question in the Barron's HSPT book
// (Chapter 5, Quantitative Skills): same wording, same kind of pattern, same answer-choice style,
// with new numbers every time. Each template is its own drill mode.
// Computation questions also carry the setup: what to write above each word ("what number" -> x,
// "more than" -> +, "20% of 50" -> 10), the equation that makes, and the steps to solve it.

// ---------------------------------------------------------------- random
export const R = {
  random: Math.random,
  randint: (a, b) => a + Math.floor(Math.random() * (b - a + 1)),
  randrange: n => Math.floor(Math.random() * n),
  uniform: (a, b) => a + Math.random() * (b - a),
  choice: a => a[Math.floor(Math.random() * a.length)],
  shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
  sample(a, k) { return R.shuffle(a.slice()).slice(0, k); },
};
const range = (a, b, s = 1) => { if (b === undefined) { b = a; a = 0; } const o = []; for (let i = a; s > 0 ? i < b : i > b; i += s) o.push(i); return o; };

// ---------------------------------------------------------------- exact fractions
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };
class Fr {
  constructor(n, d = 1) { if (d < 0) { n = -n; d = -d; } const g = gcd(n, d); this.n = n / g; this.d = d / g; }
  static of(x) { if (x instanceof Fr) return x; if (Number.isInteger(x)) return new Fr(x, 1); const p = 1e6; return new Fr(Math.round(x * p), p); }
  add(x) { x = Fr.of(x); return new Fr(this.n * x.d + x.n * this.d, this.d * x.d); }
  sub(x) { x = Fr.of(x); return new Fr(this.n * x.d - x.n * this.d, this.d * x.d); }
  mul(x) { x = Fr.of(x); return new Fr(this.n * x.n, this.d * x.d); }
  div(x) { x = Fr.of(x); return new Fr(this.n * x.d, this.d * x.n); }
  neg() { return new Fr(-this.n, this.d); }
  get int() { return this.d === 1; }
  valueOf() { return this.n / this.d; }
  key() { return `${this.n}/${this.d}`; }
}
export const F = (n, d = 1) => new Fr(n, d);
const isFr = x => x instanceof Fr;
const V = x => (isFr(x) ? x.n / x.d : x);                     // number for comparing
const EPS = 1e-9;
const eq = (a, b) => Math.abs(V(a) - V(b)) < EPS, gt = (a, b) => V(a) - V(b) > EPS, lt = (a, b) => V(b) - V(a) > EPS;
const denOf = x => (isFr(x) ? x.d : Number.isInteger(x) ? 1 : Fr.of(x).d);

// ---------------------------------------------------------------- formatting (as in math_bank.py)
export function fr(x, mixed = true) {
  x = Fr.of(x);
  if (x.d === 1) return String(x.n);
  const a = Math.abs(x.n), w = Math.floor(a / x.d), n = a % x.d, sign = x.n < 0 ? '−' : '';
  const f = `<span class='fr'><span>${n}</span><span>${x.d}</span></span>`;
  if (w && mixed) return `${sign}${w}${f}`;
  if (w) return `${sign}<span class='fr'><span>${a}</span><span>${x.d}</span></span>`;
  return sign + f;
}
export function num(x) {
  let s;
  if (isFr(x) && x.d === 1) s = String(x.n);
  else if (!isFr(x) && Number.isInteger(x)) s = String(x);
  else s = V(x).toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
  if (s === '-0') s = '0';
  return s.replace('-', '−');
}
const showNum = v => (denOf(v) !== 1 ? fr(v) : num(v));
const comma = n => n.toLocaleString('en-US');
const sup = n => `<sup>${n}</sup>`;
const LET = i => String.fromCharCode(65 + i);
const WORDS = { 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten', 11: 'eleven', 12: 'twelve' };
const ROMAN = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
export function roman(n) { let s = ''; for (const [v, r] of ROMAN) while (n >= v) { s += r; n -= v; } return s; }

class Retry extends Error {}
const need = (c, msg = '') => { if (!c) throw new Retry(msg); };

// Four distinct choices: the correct one, the listed mistakes, then near values to fill.
function opts(correct, wrongs, show = String, near = null) {
  const out = [correct], seen = new Set([show(correct)]);
  const numeric = x => typeof x === 'number' || isFr(x);
  for (const w of wrongs) {
    if (out.length === 4) break;
    if (w === null || w === undefined) continue;
    const s = show(w);
    if (/\d\.\d{4,}/.test(s)) continue;
    if (!seen.has(s) && (!numeric(w) || V(w) >= 0 || (numeric(correct) && V(correct) < 0))) { seen.add(s); out.push(w); }
  }
  const step = near || 1;
  let k = 1;
  if (typeof correct === 'string') {
    const m = correct.match(/\d+(\.\d+)?/), base = m ? parseFloat(m[0]) : 0;
    const st = near ? step : base >= 50 ? 10 : base >= 15 ? 5 : 1;
    while (out.length < 4) {
      for (const v of [base + k * st, base - k * st]) {
        if (out.length < 4 && v > 0 && m) {
          const c = correct.slice(0, m.index) + num(v) + correct.slice(m.index + m[0].length);
          if (!seen.has(c)) { seen.add(c); out.push(c); }
        }
      }
      if (++k > 50) throw new Retry('opts');
    }
    return out;
  }
  while (out.length < 4) {
    for (const cand of [Fr.of(correct).add(k * step), Fr.of(correct).sub(k * step)]) {
      if (out.length < 4 && !seen.has(show(cand)) && (V(cand) > 0 || V(correct) <= 0)) { seen.add(show(cand)); out.push(cand); }
    }
    if (++k > 60) throw new Retry('opts');
  }
  return out.map(o => show(o));
}

function Q(topic, stem, choices, why, fig = null, extra = {}) {
  need(choices.length === 4 && new Set(choices).size === 4, 'choices');
  return { topic, stem, choices, why, fig, ...extra };
}

// ---------------------------------------------------------------- SVG helpers
const INK = '#111', SHADE = '#9a9a9a';
const f1 = x => (Math.round(x * 10) / 10).toFixed(1);
const svg = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
const t = (x, y, s, size = 15, anchor = 'middle') => `<text x="${f1(x)}" y="${f1(y)}" font-family="Times New Roman, serif" font-size="${size}" text-anchor="${anchor}" dominant-baseline="central" fill="${INK}">${s}</text>`;
const it = s => `<tspan font-style='italic'>${s}</tspan>`;
const rad = d => (d * Math.PI) / 180, deg = r_ => (r_ * 180) / Math.PI;

// ---------------------------------------------------------------- answer statements (Barron's forms)
function perms(X, k) { if (!k) return [[]]; const o = []; X.forEach((x, i) => perms(X.filter((_, j) => j !== i), k - 1).forEach(p => o.push([x, ...p]))); return o; }
function combs(X, k) { if (!k) return [[]]; const o = []; X.forEach((x, i) => combs(X.slice(i + 1), k - 1).forEach(p => o.push([x, ...p]))); return o; }
const ABC = ['A', 'B', 'C'];

function statements(style, labels = null, noun = 'dots') {
  const lb = labels || { A: '(A)', B: '(B)', C: '(C)' };
  const S = [], P = perms(ABC, 3), C2 = combs(ABC, 2), P2 = perms(ABC, 2);
  const other = (a, b) => ABC.find(x => x !== a && x !== b);
  if (style === 'sym') {
    for (const [a, b, c] of P) {
      S.push([`${lb[a]} > ${lb[b]} > ${lb[c]}`, d => gt(d[a], d[b]) && gt(d[b], d[c])],
        [`${lb[a]} < ${lb[b]} < ${lb[c]}`, d => lt(d[a], d[b]) && lt(d[b], d[c])],
        [`${lb[a]} = ${lb[b]} > ${lb[c]}`, d => eq(d[a], d[b]) && gt(d[b], d[c])],
        [`${lb[a]} > ${lb[b]} = ${lb[c]}`, d => gt(d[a], d[b]) && eq(d[b], d[c])],
        [`${lb[a]} − ${lb[b]} > ${lb[c]}`, d => gt(V(d[a]) - V(d[b]), d[c])],
        [`${lb[a]} + ${lb[b]} < ${lb[c]}`, d => lt(V(d[a]) + V(d[b]), d[c])],
        [`${lb[a]} − ${lb[b]} = ${lb[c]}`, d => eq(V(d[a]) - V(d[b]), d[c])]);
    }
    for (const [a, b] of C2) S.push([`${lb[a]} = ${lb[b]}`, d => eq(d[a], d[b])]);
    for (const [a, b] of P2) { S.push([`${lb[a]} > ${lb[b]}`, d => gt(d[a], d[b])]); S.push([`${lb[a]} < ${lb[b]}`, d => lt(d[a], d[b])]); }
    S.push([`${lb.A} = ${lb.B} = ${lb.C}`, d => eq(d.A, d.B) && eq(d.B, d.C)]);
  } else if (style === 'eq') {
    for (const [a, b, c] of [['A', 'B', 'C'], ['B', 'C', 'A'], ['A', 'C', 'B']]) S.push([`${lb[a]} = ${lb[b]} ≠ ${lb[c]}`, d => eq(d[a], d[b]) && !eq(d[b], d[c])]);
    S.push([`${lb.A} ≠ ${lb.B} = ${lb.C}`, d => !eq(d.A, d.B) && eq(d.B, d.C)]);
    S.push([`${lb.A} = ${lb.B} = ${lb.C}`, d => eq(d.A, d.B) && eq(d.B, d.C)]);
    S.push([`${lb.A} ≠ ${lb.B} ≠ ${lb.C}`, d => !eq(d.A, d.B) && !eq(d.B, d.C) && !eq(d.A, d.C)]);
  } else if (['word', 'shade', 'count', 'cup'].includes(style)) {
    const [more, less, eqs, alleq] = {
      word: ['is greater than', 'is less than', 'are equal', '(A), (B), and (C) are equal.'],
      shade: ['is shaded more than', 'is shaded less than', 'are shaded equally', '(A), (B), and (C) are shaded equally.'],
      count: [`has more ${noun} than`, `has fewer ${noun} than`, `have the same number of ${noun}`, `(A), (B), and (C) have the same number of ${noun}.`],
      cup: ['holds more water than', 'holds less water than', 'hold the same amount of water', '(A), (B), and (C) hold the same amount of water.'],
    }[style];
    for (const [a, b] of P2) { S.push([`${lb[a]} ${more} ${lb[b]}.`, d => gt(d[a], d[b])]); S.push([`${lb[a]} ${less} ${lb[b]}.`, d => lt(d[a], d[b])]); }
    for (const [a, b, c] of P) {
      S.push([`${lb[a]} ${more} ${lb[b]} or ${lb[c]}.`, d => gt(d[a], d[b]) && gt(d[a], d[c])]);
      if (style === 'word') {
        S.push([`${lb[a]} is greater than ${lb[b]} which is greater than ${lb[c]}.`, d => gt(d[a], d[b]) && gt(d[b], d[c])],
          [`${lb[a]} is less than ${lb[b]} which is greater than ${lb[c]}.`, d => lt(d[a], d[b]) && gt(d[b], d[c])],
          [`${lb[a]} is equal to ${lb[b]} and less than ${lb[c]}.`, d => eq(d[a], d[b]) && lt(d[b], d[c])],
          [`${lb[a]} is more than ${lb[b]} and equal to ${lb[c]}.`, d => gt(d[a], d[b]) && eq(d[a], d[c])]);
      }
      if (style === 'count') {
        S.push([`${lb[a]} has more than ${lb[b]} and less than ${lb[c]}.`, d => lt(d[b], d[a]) && lt(d[a], d[c])],
          [`${lb[a]} has two more than ${lb[b]}.`, d => eq(d[a], V(d[b]) + 2)],
          [`${lb[a]} has twice as many as ${lb[b]}.`, d => eq(d[a], 2 * V(d[b]))]);
      }
    }
    for (const [a, b] of C2) {
      const c = other(a, b);
      S.push([`${lb[a]} and ${lb[b]} ${eqs}.`, d => eq(d[a], d[b])]);
      if (style === 'word') S.push([`${lb[a]} and ${lb[b]} are greater than ${lb[c]}.`, d => gt(d[a], d[c]) && gt(d[b], d[c])]);
    }
    S.push([alleq, d => eq(d.A, d.B) && eq(d.B, d.C)]);
  } else if (style === 'angle') {
    for (const [a, b] of P2) { S.push([`${lb[a]} is greater than ${lb[b]}.`, d => gt(d[a], d[b])]); S.push([`${lb[a]} is less than ${lb[b]}.`, d => lt(d[a], d[b])]); }
    for (const [a, b] of C2) S.push([`${lb[a]} is equal to ${lb[b]}.`, d => eq(d[a], d[b])]);
    for (const [a, b, c] of P) S.push([`${lb[a]} is greater than ${lb[b]} which is greater than ${lb[c]}.`, d => gt(d[a], d[b]) && gt(d[b], d[c])]);
    S.push(['All angles are equal.', d => eq(d.A, d.B) && eq(d.B, d.C)]);
  }
  return S;
}

// One statement true for every sample, three false for every sample.
function pickChoices(r, samples, S, preferRich = true) {
  const T = [], Fa = [];
  for (const [text, f] of S) {
    const res = new Set(samples.map(d => !!f(d)));
    if (res.size === 1 && res.has(true)) T.push(text); else if (res.size === 1 && res.has(false)) Fa.push(text);
  }
  need(T.length && Fa.length >= 3, 'statements');
  const rich = s => ABC.reduce((n, k) => n + s.split(`(${k})`).length - 1 + s.split(`∠${k}`).length - 1 + s.split(` ${k} `).length - 1, 0) + (/which| or |≠/.test(s) ? 2 : 0);
  T.sort((a, b) => rich(b) - rich(a));
  const pick = preferRich && r.random() < 0.75 ? r.choice(T.slice(0, 3)) : r.choice(T);
  return [pick, ...r.sample(Fa, 3)];
}

const LEAD = 'Examine (A), (B), and (C) and find the best answer.';
const valStr = v => (isFr(v) && v.mul(1000).int) || (!isFr(v) && Number.isInteger(v * 1000)) ? num(v) : fr(v);
function compare(r, items, topic, { style = null, lead = LEAD, why = null, fig = null, samples = null, S = null } = {}) {
  const d = {}; items.forEach(([, v], i) => { d[ABC[i]] = v; });
  style = style || (r.random() < 0.65 ? 'sym' : 'word');
  const shown = items.map(([s], i) => (s ? `(${ABC[i]}) ${s}` : '')).filter(Boolean);
  const stem = lead + (shown.length ? '<br>' + shown.join('<br>') : '');
  if (why === null) why = 'Values: ' + ABC.map(k => `(${k}) = ${valStr(d[k])}`).join(', ') + '.';
  return Q(topic, stem, pickChoices(r, samples || [d], S || statements(style)), why, fig);
}

// ================================================================ SEQUENCES
const NEXT = ['what number comes next?', 'what number should come next?'];
function seqQ(r, terms, ask, ans, wrongs, why, show = num) {
  const tx = terms.map(x => (typeof x === 'string' ? x : show(x))).join(', ');
  const stem = `In the sequence: ${tx}${terms.some(x => typeof x === 'string' && x.includes('___')) ? '' : ', . . .'}${terms.some(x => typeof x === 'string' && x.includes('___')) ? ',' : ' ,'} ${ask}`;
  return Q('Sequences', stem, Array.isArray(ans) ? ans : opts(ans, wrongs, show), why);
}
const neg = num;

function s_add(r) { const a = r.randint(6, 70), d = r.choice([3, 4, 6, 7, 8, 9, 12, 13]); const s = range(5).map(i => a + d * i); return seqQ(r, s.slice(0, 4), r.choice(NEXT), s[4], [s[0], s[3] - d + 1, s[4] + 5], `Add ${d} each time.`); }
function s_bigsub(r) { const a = r.randint(400, 950), d = r.choice([6, 7, 8, 9, 11, 12]); const s = range(5).map(i => a - d * i); return seqQ(r, s.slice(0, 4), 'what comes next?', s[4], [s[3] + 1, s[4] - 80, s[4] + 2 * d], `Subtract ${d} each time.`); }
function s_allneg(r) { const a = r.randint(40, 95), d = r.choice([4, 5, 6, 7, 8, 9]); const s = range(5).map(i => -(a - d * i)); return seqQ(r, s.slice(0, 4), r.choice(NEXT), s[4], [-s[4], s[4] + 2, s[4] - 2 * d], `The numbers go up by ${d}: −${a}, −${a - d}, … next is ${neg(s[4])}.`); }
function s_negblank(r) {
  const p = r.randint(11, 16), q = p - 1, a = r.randint(22, 38), s = [a];
  for (let i = 0; i < 5; i++) s.push(s[s.length - 1] - (i % 2 === 0 ? p : q));
  const i = 3, terms = s.map((x, j) => (j !== i ? x : '_____'));
  return seqQ(r, terms, 'what number belongs in the blank?', s[i], [s[i] + 3, -s[i], s[2] - p], `Subtract ${p}, then ${q}, and repeat; the blank is ${neg(s[i])}.`);
}
function s_blank(r) {
  const a = r.randint(2, 20), d = r.choice([9, 11, 12, 13, 14, 16]); const s = range(4).map(i => a + d * i);
  return Q('Sequences', `In the sequence: ${s[0]}, _____, ${s[2]}, ${s[3]}, . . . , what number should fill in the blank?`, opts(s[1], [s[1] + 2, s[3] + d + 1, s[2] - s[0] + 1], num), `Add ${d} each time; the blank is ${s[1]}.`);
}
function s_letters(r) {
  let st = r.randint(0, 6), d = r.choice([2, 3, 4]);
  if (r.random() < 0.3) { st = r.randint(16, 25); d = -r.choice([2, 3]); }
  const s = range(5).map(i => LET(st + d * i));
  need(s.every(c => c >= 'A' && c <= 'Z') && LET(st + d * 5) >= 'A' && LET(st + d * 5) <= 'Z');
  return Q('Sequences', `In the sequence: ${s.slice(0, 4).join(', ')}, . . . , what letter should come next?`, [s[4], LET(st + d * 4 + 1), LET(st + d * 4 - 1), LET(st + d * 5)], `Skip ${d > 0 ? 'ahead' : 'back'} ${Math.abs(d)} letters each time.`);
}
function s_diffs(r) { const a = r.randint(1, 20), k = r.randint(1, 3), s = [a]; for (let i = 0; i < 5; i++) s.push(s[s.length - 1] + k + i); return seqQ(r, s.slice(0, 5), 'what comes next?', s[5], [s[4] + (s[4] - s[3]), s[5] + 2, s[5] - 1], `The differences are ${range(5).map(i => '+' + (k + i)).join(', ')}.`); }
function s_two_alt(r) {
  const a = r.randint(3, 25), p = r.randint(2, 5); let q = r.randint(3, 7); if (p === q) q++;
  const s = [a]; for (let i = 0; i < 7; i++) s.push(s[s.length - 1] + (i % 2 === 0 ? p : q));
  return Q('Sequences', `In the sequence: ${s.slice(0, 5).join(', ')}, . . . , what two numbers come next?`, [`${s[5]}, ${s[6]}`, `${s[5] + 1}, ${s[6] + 1}`, `${s[4] + q}, ${s[4] + q + p}`, `${s[5]}, ${s[6] + 2}`], `The differences are +${p}, +${q}, +${p}, +${q} …`);
}
function s_mult(r) { const m = r.choice([2, 3, 4]), a = r.randint(2, m < 4 ? 7 : 4); const s = range(5).map(i => a * m ** i); return seqQ(r, s.slice(0, 4), r.choice(NEXT), s[4], [s[3] + (s[3] - s[2]), s[4] + m, s[3] * (m + 1)], `Multiply by ${m} each time.`); }
function s_dec(r) {
  const kind = r.choice(['start', 'double', 'times3']);
  if (kind === 'start') {
    const m = r.choice([2, 3, 4, 5]), a = r.choice([2, 3, 5]), first = F(a, m).mul(100).int ? num(F(a, m)) : fr(F(a, m));
    const s = [a, a * m, a * m * m];
    return Q('Sequences', `In the sequence: ${first}, ${s.join(', ')}, . . . , ${r.choice(NEXT)}`, opts(a * m ** 3, [s[2] + s[1], 2 * s[2], s[2] * m * m], num), `Multiply by ${m} each time (${first} × ${m} = ${a}).`);
  }
  if (kind === 'double') {
    const a = r.choice([F(3, 20), F(1, 5), F(3, 10), F(1, 20), F(3, 8), F(3, 40)]); const s = range(5).map(i => a.mul(2 ** i));
    return seqQ(r, s.slice(0, 4), r.choice(NEXT), s[4], [s[3].add(F(1, 10)), s[4].mul(10), s[3].add(1)], 'Double each time.');
  }
  const a = F(r.randint(11, 25), 10); const s = range(4).map(i => a.mul(3 ** i));
  return seqQ(r, s.slice(0, 3), r.choice(NEXT), s[3], [s[2].add(s[2].sub(s[1])), s[3].add(2), s[2].add(2)], 'Multiply by 3 each time.');
}
function s_div_frac(r) {
  const m = r.choice([3, 4, 5]), e = r.choice(range(2, 10).filter(x => x % m)); const s = range(4).map(i => e * m ** (3 - i)); const ans = F(e, m);
  const ch = [fr(ans), '1', F(m, e).key() !== ans.key() ? fr(F(m, e)) : '2', String(e - 1)];
  if (new Set(ch).size < 4) ch[3] = String(e + 1);
  return Q('Sequences', `In the sequence: ${s.join(', ')}, . . . , what number comes next?`, ch, `Divide by ${m} each time: ${e} ÷ ${m} = ${fr(ans)}.`);
}
function gen(start, ops, n) {
  const s = [Fr.of(start)];
  for (let i = 0; i < n - 1; i++) { const [op, v] = ops[i % ops.length], x = s[s.length - 1]; s.push(op === '÷' ? x.div(v) : op === '×' ? x.mul(v) : op === '+' ? x.add(v) : x.sub(v)); }
  return s;
}
function s_mixops(r) {
  const kind = r.choice(['÷÷', '÷+', '−÷', '×+']); let s, ops;
  for (let n = 0; n < 500; n++) {
    let start;
    if (kind === '÷÷') { ops = [['÷', 2], ['÷', 4]]; start = r.choice([3, 5, 7, 9, 11]) * 64; }
    else if (kind === '÷+') { ops = [['÷', 2], ['+', r.choice([4, 6, 8, 10, 12])]]; start = r.randint(10, 60) * 4; }
    else if (kind === '−÷') { ops = [['−', r.choice([2, 4, 6])], ['÷', 2]]; start = r.randint(20, 70); }
    else { ops = [['×', 2], ['+', r.choice([1, 2, 3])]]; start = r.randint(2, 9); }
    s = gen(start, ops, 6);
    if (s.every(x => V(x) > 0) && s.every(x => x.mul(2).int) && s.slice(0, 5).every(x => x.int)) break;
  }
  const name = ops.map(([o, v]) => `${o} ${v}`).join(', '), nxt = s[5];
  const back = s[4].sub(s[3].sub(s[4]));
  const wrong = [V(back) > 0 ? back : s[4].add(3), nxt.mul(2).add(1), nxt.add(ops[1][0] === '+' ? ops[1][1] : 1)];
  return seqQ(r, s.slice(0, 5), r.choice(NEXT), nxt, wrong, `The pattern is ${name}, ${name} …; next is ${num(nxt)}.`);
}
function s_wrong(r) {
  const p = r.randint(1, 4), q = r.choice([8, 9, 10, 11]), s = [r.randint(5, 30)];
  for (let i = 0; i < 5; i++) s.push(s[s.length - 1] + (i % 2 === 0 ? p : q));
  const i = r.randint(2, 4), bad = s[i] + r.choice([1, -1, 2]), shown = [...s.slice(0, i), bad, ...s.slice(i + 1)];
  return Q('Sequences', `In the sequence ${shown.join(', ')}, . . . , one number is wrong. That number should be`,
    opts(s[i], [bad + 2 !== s[i] ? bad + 2 : bad - 3, s[i] + q - p, s[i] - 2 !== bad ? s[i] - 2 : s[i] + 4], num), `The pattern is +${p}, +${q}; ${bad} should be ${s[i]}.`);
}
function s_every_other(r) {
  const a = r.randint(2, 12), d = r.randint(2, 6); let b = r.randint(2, 14); const e = r.randint(2, 5); if (a === b) b += 3;
  const s = []; for (let i = 0; i < 4; i++) s.push(a + d * i, b + e * i);
  return seqQ(r, s.slice(0, 6), r.choice(NEXT), s[6], [s[7], s[5] + e, s[6] + d], `Every other number: ${a}, ${a + d}, ${a + 2 * d} … (add ${d}); next is ${s[6]}.`);
}
function s_squares(r) {
  if (r.random() < 0.5) {
    const n = r.randint(6, 12); const terms = []; for (let i = 0; i < 3; i++) terms.push((n - i) ** 2, n - i);
    return seqQ(r, terms.slice(0, 5), r.choice(NEXT), n - 2, [(n - 3) ** 2, (n - 2) ** 2 + 1, n - 3], `Pairs of a square and its square root: ${(n - 2) ** 2} is followed by ${n - 2}.`);
  }
  const n = r.randint(3, 8); const terms = []; for (let i = 0; i < 3; i++) terms.push(n + i, (n + i) ** 2);
  return seqQ(r, terms, r.choice(NEXT), n + 3, [(n + 3) ** 2, (n + 2) ** 2 + 1, n + 4], `Every other number: ${n}, ${n + 1}, ${n + 2}, … each followed by its square; next is ${n + 3}.`);
}
function s_blanks2(r) {
  const a = r.randint(2, 9); let p = r.randint(3, 5); const q = r.randint(1, 3); if (p === q) p++;
  const s = [a]; for (let i = 0; i < 6; i++) s.push(s[s.length - 1] + (i % 2 === 0 ? p + Math.floor(i / 2) : q + Math.floor(i / 2)));
  return Q('Sequences', `In the sequence: ${s.slice(0, 5).join(', ')}, _____, _____, what numbers belong in the blanks?`, [`${s[5]}, ${s[6]}`, `${s[4] + p}, ${s[4] + p + q}`, `${s[5]}, ${s[6] + 2}`, `${s[5] - 1}, ${s[6] - 3}`],
    `Differences: +${p}, +${q}, +${p + 1}, +${q + 1}, +${p + 2}, +${q + 2}.`);
}
function s_diffgrow(r) {
  const a = r.randint(2, 9), k = r.choice([2, 3, 4, 5]), s = [a]; for (let i = 0; i < 5; i++) s.push(s[s.length - 1] + k * (i + 1));
  return seqQ(r, s.slice(0, 5), r.choice(NEXT), s[5], [s[4] + k * 4, s[5] + 1, s[4] + 2 * (s[4] - s[3])], `The differences are +${k}, +${2 * k}, +${3 * k}, +${4 * k}; next add ${5 * k}.`);
}
function s_three_next(r) {
  let s, ups, downs;
  for (let n = 0; n < 200; n++) {
    const a = r.randint(5, 20), u = r.choice([10, 11, 12, 13, 14]), v = r.choice([4, 5, 6]);
    s = [a]; ups = range(5).map(i => u - 2 * i); downs = range(5).map(i => v - i);
    for (let i = 0; i < 4; i++) { const top = s[s.length - 1] + ups[i]; s.push(top, top - downs[i]); }
    if (s.every(x => x > 0)) break;
  }
  const j = a => a.join(', ');
  return Q('Sequences', `In the sequence: ${j(s.slice(0, 6))}, . . . , what three numbers come next?`,
    [j(s.slice(6, 9)), j([s[6] + 1, s[7] + 1, s[8]]), j([s[6], s[6] + ups[3] + 2, s[8] + 2]), j([s[5] + ups[2], s[6] - 1, s[8] - 3])],
    `Differences: +${ups[0]}, −${downs[0]}, +${ups[1]}, −${downs[1]}, +${ups[2]}, −${downs[2]}, +${ups[3]} …`);
}
function s_letnum(r) {
  if (r.random() < 0.5) {
    const n = r.randint(1, 6), d = r.choice([2, 3, 5]), L0 = r.randint(0, 10), dl = r.choice([1, 2]);
    const f = i => `${n + d * i}${LET(L0 + dl * i)}`;
    return Q('Sequences', `In the sequence: ${range(4).map(f).join(', ')}, . . . , what comes next?`, [f(4), `${n + d * 4}${LET(L0 + dl * 4 + 1)}`, `${n + d * 3 + 1}${LET(L0 + dl * 4)}`, `${n + d * 3 + 1}${LET(L0 + dl * 4 + 1)}`], `Numbers +${d}; letters skip ahead ${dl}.`);
  }
  const a = r.randint(2, 5), k = r.choice([2, 3]), L0 = r.randint(1, 6), nums = gen(a, [['×', 2], ['+', k]], 6).map(V);
  const f = i => `${nums[i]}${LET(L0 + 2 * i)}`;
  return Q('Sequences', `In the sequence: ${range(5).map(f).join(', ')}, . . . , what comes next?`, [f(5), `${nums[4] + k}${LET(L0 + 10)}`, `${nums[5]}${LET(L0 + 9)}`, `${nums[4] * 3}${LET(L0 + 10)}`], `Numbers: × 2, + ${k}, × 2, + ${k} …; letters: every other letter.`);
}
function s_three(r) {
  const form = r.choice(['numfirst', 'numfirst_x', 'letfirst']);
  if (form.startsWith('numfirst')) {
    const n = r.randint(18, 40), d = r.choice([2, 3, 4]), L1 = r.randint(0, 8), L2 = r.randint(18, 25), sep = form.endsWith('_x') ? ' × ' : '';
    const f = i => `${n - d * i}${sep}${LET(L1 + i)}${LET(L2 - i)}`;
    return Q('Sequences', `In the sequence: ${range(4).map(f).join(', ')}, . . . , what comes next?`,
      [f(4), `${n - d * 4}${sep}${LET(L2 - 4)}${LET(L1 + 4)}`, `${n + d}${sep}${LET(L1 + 4)}${LET(L2 - 4)}`, `${n - d * 4}${sep}${LET(L1 + 3)}${LET(L2 - 3)}`], `Number −${d}; first letter forward one; second letter back one.`);
  }
  const L1 = r.randint(0, 5), dl = r.choice([2, 3]), L2 = r.randint(20, 25), n = r.randint(1, 4), d = r.choice([2, 3]);
  const f = i => `${LET(L1 + dl * i)}${LET(L2 - i)}${n + d * i}`;
  return Q('Sequences', `In the sequence: ${range(3).map(f).join(', ')}, . . . , what comes next?`,
    [f(3), `${LET(L1 + dl * 3 - 1)}${LET(L2 - 3)}${n + d * 3}`, `${LET(L1 + dl * 2 + 1)}${LET(L2 - 2)}${n + d * 2 + 1}`, `${LET(L1 + dl * 3 + 2)}${LET(L2 - 1)}${n + d * 4}`], `First letter skips ahead ${dl}; second letter goes back one; number +${d}.`);
}
function s_letx(r) {
  const L0 = r.randint(2, 12), n = r.choice([4, 5, 6]), d = r.choice([5, 6, 7, 8]); const f = i => `${LET(L0 + 2 * i)} × ${d * (n - i)}`;
  return Q('Sequences', `In the sequence: ${range(4).map(f).join(', ')}, . . . , what comes next?`,
    [f(4), `${LET(L0 + 8)} × ${d * (n - 4) + 1}`, `${LET(L0 + 7)} × ${d * (n - 4)}`, `${LET(L0 + 7)} × ${d * (n - 3)}`], `Letters skip one each time; numbers go down by ${d}.`);
}
function s_roman(r) {
  const kind = r.choice(['add', 'x2', 'sub']); let s, why;
  if (kind === 'add') { const a = r.randint(1, 9), d = r.choice([2, 3, 4]); s = range(5).map(i => a + d * i); why = `${s.slice(0, 4).join(', ')}: add ${d}`; }
  else if (kind === 'x2') {
    const a = r.randint(2, 4), k = r.choice([2, 3]); s = gen(a, [['×', 2], ['+', k]], 6).map(V);
    const ans = s[5];
    return Q('Roman Numerals', `In the sequence: ${s.slice(0, 5).map(roman).join(', ')}, . . . , what comes next?`, [roman(ans), roman(ans - 1), roman(ans + 9), roman(s[4] + 2)], `${s.slice(0, 5).join(', ')}: × 2, + ${k}; next is ${ans} = ${roman(ans)}.`);
  } else { const a = r.randint(28, 39), d = r.choice([3, 4, 5, 6]); s = range(5).map(i => a - d * i); why = `${s.slice(0, 4).join(', ')}: subtract ${d}`; }
  const ans = s[4];
  return Q('Roman Numerals', `In the sequence: ${s.slice(0, 4).map(roman).join(', ')}, . . . , what number comes next?`, [roman(ans), roman(ans + 2), roman(ans - 2), roman(ans + 10)], `${why}; next is ${ans} = ${roman(ans)}.`);
}
const sgn = v => (v > 0 ? `+ ${v}` : `− ${-v}`);
function s_negdec(r) {
  const a = F(r.choice([1, 2, 3, 4, 5]), 10); let s, why, wr;
  if (r.random() < 0.4) {
    const m = r.choice([2, 3, 4]); s = range(5).map(i => a.neg().mul(m ** i));
    why = `Multiply by ${m} each time; the numbers stay negative.`; wr = [s[4].neg(), s[3].add(s[3].sub(s[2])), s[3].mul(m + 1)];
  } else {
    const ms = r.choice([[4, 3, 2, 1], [2, 3, 4, 5], [5, 4, 3, 2]]); s = [a.neg()]; for (const m of ms) s.push(s[s.length - 1].mul(m));
    why = `Multiply by ${ms[0]}, then ${ms[1]}, then ${ms[2]}; next multiply by ${ms[3]}: ${num(s[4])}.`; wr = [s[3].mul(ms[2]), s[4].neg(), s[3].add(s[3].sub(s[2]))];
  }
  return seqQ(r, s.slice(0, 4), r.choice(NEXT), s[4], wr, why);
}
function s_altdiv(r) {
  const [a, b] = r.choice([[6, 2], [4, 2], [5, 2], [3, 2], [4, 3], [6, 3], [8, 2]]);
  if (r.random() < 0.6) {
    const e = r.choice([2, 3, 5, 7]); const s = [F(e * a * a * b * b)]; for (let i = 0; i < 4; i++) s.push(s[s.length - 1].div(i % 2 === 0 ? a : b));
    return seqQ(r, s.slice(0, 4), r.choice(NEXT), s[4], [s[3].div(a), s[3].sub(b), s[2].div(a)], `Divide by ${a}, then by ${b}, and repeat; ${num(s[3])} ÷ ${b} = ${num(s[4])}.`);
  }
  const s = [F(r.choice([1, 2, 3]))]; for (let i = 0; i < 4; i++) s.push(s[s.length - 1].mul(i % 2 === 0 ? a : b));
  return seqQ(r, s.slice(0, 4), r.choice(NEXT), s[4], [s[3].mul(a), s[3].add(s[3].sub(s[2])), s[4].add(b)], `Multiply by ${a}, then by ${b}, and repeat; ${num(s[3])} × ${b} = ${num(s[4])}.`);
}
function s_shrink(r) {
  let d0, step, a;
  if (r.random() < 0.5) { d0 = r.choice([60, 70, 80, 90]); step = 10; a = r.randint(30, 60) * 10 + r.choice([0, 0, 5]); }
  else { d0 = r.randint(7, 11); step = 1; a = r.randint(40, 90); }
  const diffs = range(5).map(i => d0 - step * i), s = [a]; for (const d of diffs) s.push(s[s.length - 1] - d);
  return seqQ(r, s.slice(0, 4), r.choice(NEXT), s[4], [s[4] - step, s[4] + step, s[3] - diffs[0]], `Subtract ${diffs[0]}, ${diffs[1]}, ${diffs[2]} (each time ${step} less); next subtract ${diffs[3]}.`);
}
function s_updown(r) {
  let ops, a;
  if (r.random() < 0.5) { ops = [-r.randint(9, 16), -r.randint(3, 7)]; a = r.randint(80, 140); } else { ops = [-r.randint(5, 9), r.randint(10, 15)]; a = r.randint(30, 70); }
  const s = [a]; for (let i = 0; i < 5; i++) s.push(s[s.length - 1] + ops[i % 2]);
  return seqQ(r, s.slice(0, 5), r.choice(NEXT), s[5], [s[4] + ops[1], s[4] - ops[0], s[5] + 10], `The pattern is ${sgn(ops[0])}, ${sgn(ops[1])}, and repeat; next ${sgn(ops[0])}.`);
}
function s_mid2(r) {
  const a = r.randint(2, 15); let p = r.randint(2, 4), q = r.randint(5, 9); if (r.random() < 0.5) [p, q] = [q, p];
  const s = [a]; for (let i = 0; i < 7; i++) s.push(s[s.length - 1] + (i % 2 === 0 ? p : q));
  const terms = [...s.slice(0, 3), '___', '___', ...s.slice(5, 8)];
  return Q('Sequences', `In the sequence: ${terms.join(', ')}, . . . , what two numbers are missing?`, [`${s[3]}, ${s[4]}`, `${s[2] + q}, ${s[2] + q + p}`, `${s[3] + 1}, ${s[4] + 1}`, `${s[3]}, ${s[4] + 2}`],
    `The pattern is +${p}, +${q}, and repeat: ${s[2]} + ${p} = ${s[3]}, ${s[3]} + ${q} = ${s[4]}.`);
}
function s_pairmult(r) {
  if (r.random() < 0.5) {
    const k = r.choice([3, 4, 6, 7, 8, 9, 11]), n = r.randint(2, 6), d = r.choice([1, 2, 3]); const s = []; for (let i = 0; i < 3; i++) s.push(n + d * i, k * (n + d * i));
    return seqQ(r, s.slice(0, 5), r.choice(NEXT), s[5], [s[4] + d, s[3] + k, s[5] + k], `Each number is followed by ${k} times itself: ${s[4]} × ${k} = ${s[5]}.`);
  }
  const a = r.randint(40, 90), da = r.choice([3, 4, 5, 6, 7]), b = r.randint(2, 5); const s = []; for (let i = 0; i < 3; i++) s.push(a - da * i, b * 2 ** i);
  return seqQ(r, s.slice(0, 5), r.choice(NEXT), s[5], [s[4] - da, 3 * b, 8 * b], `Two sequences take turns: ${s[0]}, ${s[2]}, ${s[4]} (− ${da}) and ${s[1]}, ${s[3]}, … (× 2); next is ${s[5]}.`);
}
function s_ln_hard(r) {
  const kind = r.choice(['mult', 'altnum', 'half', 'plus_times']);
  if (kind === 'mult') {
    const k = r.choice([11, 12, 14, 15, 16, 17, 18]), m = r.choice([1, 2]), L1 = r.randint(0, 8), L2 = r.randint(19, 25);
    const f = (i, dn = 0, d1 = 0, d2 = 0) => `${k * (m + i) + dn}${LET(L1 + i + d1)}${LET(L2 - i + d2)}`;
    return Q('Sequences', `In the sequence: ${range(4).map(i => f(i)).join(', ')}, . . . , what should come next?`, [f(4), f(4, 0, 1, 0), f(4, 0, 0, 2), f(4, k, 0, 0)], `Numbers go up by ${k}; first letter forward one; second letter back one.`);
  }
  if (kind === 'altnum') {
    const a = r.randint(30, 70), p = r.randint(4, 8), q = r.randint(2, p - 1), L0 = r.randint(0, 10), dl = r.choice([2, 3]);
    const n = [a, a - p, a - p + q, a - 2 * p + q], L = i => LET(L0 + dl * i);
    return Q('Sequences', `In the sequence: ${range(3).map(i => `${n[i]}${L(i)}`).join(', ')}, . . . , what comes next?`, [`${n[3]}${L(3)}`, `${n[2] + q}${L(3)}`, `${n[3]}${LET(L0 + dl * 3 + 1)}`, `${n[2] - q}${L(3)}`], `Numbers: − ${p}, + ${q}, − ${p}; letters skip ahead ${dl}.`);
  }
  if (kind === 'half') {
    const e = r.choice([5, 6, 7, 9, 11, 13]), L0 = r.randint(12, 25), dl = r.choice([2, 3]); const n = [8 * e, 4 * e, 2 * e, e], L = i => LET(L0 - dl * i);
    return Q('Sequences', `In the sequence: ${range(3).map(i => `${L(i)} + ${n[i]}`).join(', ')}, . . . , what should come next?`, [`${L(3)} + ${e}`, `${LET(L0 - dl * 3 + 1)} + ${e}`, `${L(3)} + ${e + 2}`, `${LET(L0 - dl * 3 - 1)} + ${e}`], `Letters go back ${dl}; numbers are cut in half.`);
  }
  const n0 = r.randint(2, 6), L0 = r.randint(0, 8); const n = [n0, n0 + 2, 3 * (n0 + 2), 3 * (n0 + 2) + 2, 3 * (3 * (n0 + 2) + 2)], L = i => LET(L0 + 4 * i);
  return Q('Sequences', `In the sequence: ${range(4).map(i => `${L(i)}${n[i]}`).join(', ')}, . . . , what comes next?`, [`${L(4)}${n[4]}`, `${L(4)}${n[3] + 2}`, `${LET(L0 + 15)}${n[4]}`, `${L(4)}${n[3] * 2}`], 'Letters skip ahead 4; numbers + 2, × 3, + 2, × 3.');
}
function s_letpairs(r) {
  let ch, n, f, d1, d2;
  for (let k = 0; k < 200; k++) {
    d1 = r.choice([2, 3, 4]); d2 = r.choice([1, 2, 3]); n = r.choice([3, 4]);
    const L1 = r.randint(d1 * n + 1, 25), L2 = r.randint(0, 24 - d2 * n), flip = r.random() < 0.5;
    const pair = (a, b) => (flip ? LET(b) + LET(a) : LET(a) + LET(b)); f = i => pair(L1 - d1 * i, L2 + d2 * i);
    ch = [f(n), pair(L1 - d1 * n, L2 + d2 * n + 1), pair(L1 - d1 * n + 1, L2 + d2 * n), pair(L2 + d2 * n, L1 - d1 * n)];
    if (new Set(ch).size === 4) break;
  }
  return Q('Sequences', `In the sequence: ${range(n).map(f).join(', ')}, . . . , what comes next?`, ch, `One letter goes back ${d1}; the other goes forward ${d2}.`);
}
function s_roman2(r) {
  const kind = r.choice(['x2plus', 'altadd', 'x3']); let s, why;
  if (kind === 'x2plus') { const k = r.choice([3, 4, 5]); s = gen(r.randint(1, 3), [['×', 2], ['+', k]], 6).map(V); why = `× 2, + ${k}`; }
  else if (kind === 'altadd') { const [p, q] = r.sample([2, 3, 4, 5, 6], 2); s = gen(r.randint(1, 6), [['+', p], ['+', q]], 6).map(V); why = `+ ${p}, + ${q}`; }
  else { const k = r.choice([1, 2, 3, 4]); s = gen(r.randint(2, 4), [['×', 3], ['−', k]], 6).map(V); why = `× 3, − ${k}`; }
  const ans = s[5];
  return Q('Roman Numerals', `In the sequence: ${s.slice(0, 5).map(roman).join(', ')}, . . . , what numeral should come next?`, opts(ans, [ans + 10, ans - 1, s[4] + (s[4] - s[3])], roman), `${s.slice(0, 5).join(', ')}: ${why}; next is ${ans} = ${roman(ans)}.`);
}

// ================================================================ COMPARISONS
const ufr = (n, d) => `<span class='fr'><span>${n}</span><span>${d}</span></span>`;
function c_frac_bench(r) {
  const bench = r.choice([F(1, 4), F(1, 2)]); const out = [[ufr(bench.n, bench.d), bench]];
  while (out.length < 3) {
    const d = r.randint(9, 30), n = Math.floor(V(bench) * d) + r.choice([-1, 1, 2, 0]);
    if (n > 0 && n < d && gcd(n, d) === 1 && !out.some(([, v]) => eq(v, F(n, d)))) out.push([ufr(n, d), F(n, d)]);
  }
  r.shuffle(out);
  return compare(r, out, 'Fractions', { why: `Compare each to ${fr(bench)}: ` + out.map(([, v], i) => `(${ABC[i]}) ${fr(v)}`).join(', ') + '.' });
}
function c_frac_close(r) {
  const out = [];
  while (out.length < 3) { const d = r.randint(5, 13), n = r.randint(Math.floor(d / 2) + 1, d - 1); if (gcd(n, d) === 1 && !out.some(([, v]) => eq(v, F(n, d)))) out.push([ufr(n, d), F(n, d)]); }
  return compare(r, out, 'Fractions', { style: 'word' });
}
function c_fdp(r) {
  const f0 = r.choice([F(1, 4), F(1, 5), F(1, 3), F(3, 4), F(2, 5), F(1, 2), F(3, 5)]); const base = Math.round(V(f0) * 100);
  let p = base + r.choice([0, 1, -1, 2]), dv = F(base + r.choice([0, -2, 1, 3]), 100);
  if (f0.key() === '1/3') [p, dv] = r.choice([[33, F(34, 100)], [34, F(34, 100)], [33, F(33, 100)], [30, F(35, 100)]]);
  const items = r.shuffle([[fr(f0), f0], [`${p}%`, F(p, 100)], [num(dv), dv]]);
  return compare(r, items, 'Conversions', { why: 'As percents: ' + items.map(([, v], i) => `(${ABC[i]}) ${v.mul(100).int ? num(v.mul(100)) : '33⅓'}%`).join(', ') + '.' });
}
function c_pct3(r) {
  const tens = [10, 20, 30, 40, 50, 60, 70], items = [];
  while (items.length < 3) { const p = r.choice(tens), n = r.choice([...tens, 80, 90, 25, 15, 35]); if (p !== n) items.push([`${p}% of ${n}`, F(p * n, 100)]); }
  return compare(r, items, 'Percents');
}
function c_pct_frac(r) {
  const k = r.choice([3, 4, 6, 7, 8, 9]), v = r.randint(3, 9), [p, n] = r.choice([[10, 10 * v], [20, 5 * v], [50, 2 * v]]);
  const pool = [[`${p}% of ${n}`, F(p * n, 100)], [`${fr(F(1, k))} of ${k * v}`, F(v)], [`${n}% of ${p}`, F(p * n, 100)], [`${fr(F(1, k))} of ${k * (v + 1)}`, F(v + 1)]];
  return compare(r, r.shuffle([pool[0], pool[1], r.choice(pool.slice(2))]), 'Percents');
}
function c_pct_big(r) {
  const items = [];
  while (items.length < 3) { const p = r.choice([100, 200, 300, 150]), n = r.randint(15, 70); if (p === 150 && n % 2) continue; items.push([`${p}% of ${n}`, F(p * n, 100)]); }
  return compare(r, items, 'Percents');
}
function c_pemdas(r) {
  let a, b, c; do { a = r.randint(2, 9); b = r.randint(4, 9); c = r.randint(2, 8); } while ((a * b) % c || c >= b);
  const pool = [[`${a} × (${b} + ${c})`, a * (b + c)], [`(${a} × ${b}) ÷ ${c}`, F(a * b, c)], [`${a} + (${b} × ${c})`, a + b * c], [`(${a} × ${b}) + ${c}`, a * b + c], [`${c} + (${a} × ${b})`, a * b + c], [`${a} × (${b} − ${c})`, a * (b - c)]];
  return compare(r, r.sample(pool, 3), 'Operations');
}
function c_dist_xy(r) {
  let k = r.randint(3, 9); const m = r.randint(2, 6); if (k === m) k++;
  const forms = [[`${k}x + ${m}y`, (x, y) => k * x + m * y], [`${k}(x + y)`, (x, y) => k * (x + y)], [`${k}x + y`, (x, y) => k * x + y], [`${m}(x − y)`, (x, y) => m * (x - y)], [`${k}x + ${k}y`, (x, y) => k * x + k * y]];
  let pick, ch;
  for (let n = 0; n < 200; n++) {
    pick = r.sample(forms, 3);
    const samples = [[1, 1], [2, 7], [5, 3], [0.5, 9], [10, 0.2], [3, 3]].map(([x, y]) => Object.fromEntries(pick.map(([, f], i) => [ABC[i], f(x, y)])));
    try { ch = pickChoices(r, samples, statements(r.choice(['sym', 'word']))); break; } catch (e) { if (!(e instanceof Retry)) throw e; }
  }
  need(ch);
  return Q('Algebra', 'Examine (A), (B), and (C) and find the best answer when x and y are both positive.<br>' + pick.map(([s], i) => `(${ABC[i]}) ${s}`).join('<br>'), ch, 'Distribute, then compare the x terms and the y terms.');
}
function c_xpos(r) {
  const a = r.randint(5, 9), b = r.randint(1, 4), c = r.randint(6, 12), d = r.randint(1, 3);
  const forms = r.shuffle([[`x + (${a} − ${b})`, x => x + a - b], [`${a} + x`, x => a + x], [`${c} + (${d} + x)`, x => c + d + x]]);
  const samples = [1, 2, 5, 0.5, 12].map(x => Object.fromEntries(forms.map(([, f], i) => [ABC[i], f(x)])));
  return Q('Algebra', 'Examine (A), (B), and (C) and find the best answer when x is positive.<br>' + forms.map(([s], i) => `(${ABC[i]}) ${s}`).join('<br>'),
    pickChoices(r, samples, statements(r.choice(['sym', 'word']))), 'Simplify each: ' + forms.map(([, f], i) => `(${ABC[i]}) x + ${f(0)}`).join(', ') + '.');
}
function c_exp(r) {
  let pool;
  if (r.random() < 0.5) { const b = r.choice([2, 3]); pool = [3, 4, 5].map(e => [`${b}${sup(e)}`, b ** e]).concat([[`${b * b}${sup(2)}`, b ** 4], [`${b * b}${sup(3)}`, b ** 6]]); }
  else { const [a, b] = r.choice([[2, 3], [2, 5], [3, 4]]); pool = [[`${b} × ${a}${sup(2)}`, b * a * a], [`${a} × ${b}${sup(2)}`, a * b * b], [`${a} × ${b}${sup(3)}`, a * b ** 3], [`${b} × ${a}${sup(3)}`, b * a ** 3]]; }
  return compare(r, r.sample(pool, 3), 'Exponents');
}
function c_rad(r) {
  const [a, b] = r.choice([[2, 3], [2, 5], [3, 5], [2, 7], [3, 7], [5, 6], [2, 11]]); const rv = x => Math.round(x * 1e9) / 1e9;
  const pool = [[`√${a * b}`, rv(Math.sqrt(a * b))], [`√${a} × √${b}`, rv(Math.sqrt(a) * Math.sqrt(b))], [`√${a} + √${b}`, rv(Math.sqrt(a) + Math.sqrt(b))], [`√(${a} + ${b})`, rv(Math.sqrt(a + b))]];
  return compare(r, r.shuffle([pool[0], pool[1], r.choice(pool.slice(2))]), 'Exponents', { style: 'eq', why: `√${a} × √${b} = √${a * b}; a sum of square roots cannot be combined that way.` });
}
function c_sci(r) {
  const digits = r.randint(1100, 9899), m = F(digits, 1000); let pool;
  if (r.random() < 0.5) pool = [[comma(digits), F(digits)], [`${num(m)} × 10${sup(2)}`, m.mul(100)], [`${num(m.div(10))} × 10`, m], [`${num(m)} × 10${sup(3)}`, m.mul(1000)]];
  else pool = [[`${num(m)} × 10${sup(1)}`, m.mul(10)], [`${num(m.mul(10))} × 10${sup('−2')}`, m.div(10)], [`${num(m.mul(100))} × 10${sup('−3')}`, m.div(10)], [`${num(m.mul(10))} × 10${sup('−1')}`, m], [`${num(m.mul(100))} × 10${sup('−2')}`, m]];
  return compare(r, r.sample(pool, 3), 'Exponents');
}
const UNITS = { length: [['inches', 1], ['feet', 12], ['yards', 36]], volume: [['cups', 1], ['pints', 2], ['quarts', 4], ['gallons', 16]], time: [['minutes', 1], ['hours', 60]], weight: [['ounces', 1], ['pounds', 16]] };
function c_measure(r) {
  const us = UNITS[r.choice(Object.keys(UNITS))], items = [];
  while (items.length < 3) {
    const [name, f0] = r.choice(us), n = f0 === 1 ? r.choice([1, 2, 3, 4, 5, 6, 18, 24, 30, 36, 40, 48, 90, 120]) : r.choice([1, 2, 3]);
    const label = n === 1 ? ({ inches: 'inch', feet: 'foot' }[name] || name.slice(0, -1)) : name;
    if (!items.some(x => x[0] === label && x[2] === n)) items.push([label, n * f0, n]);
  }
  const its = items.map(([label, v, n]) => [`${n} ${label}`, v]);
  return compare(r, its, 'Measurement', { why: `In ${us[0][0]}: ` + its.map(([, v], i) => `(${ABC[i]}) ${num(v)}`).join(', ') + '.' });
}
function c_numrel(r) {
  let T, Fa, Av, Bv, Cv, k;
  for (let n = 0; n < 500; n++) {
    Bv = r.choice([12, 15, 16, 18, 20, 24, 27, 30, 36, 45]); k = r.choice([2, 3, 4]); Av = k * Bv; Cv = r.randint(Bv + 5, Av + 30);
    const rel = [
      [`${WORDS[k][0].toUpperCase() + WORDS[k].slice(1)} times (B) is equal to (A).`, true],
      Av > Cv ? [`(A) minus (C) is equal to ${Av - Cv + r.choice([2, 3, 5])}.`, false] : [`(C) minus (A) is equal to ${Cv - Av + r.choice([2, 4])}.`, false],
      ['(C) is two times larger than (B).', Cv === 2 * Bv],
      ['Half of (B) is greater than one third of (C).', Bv / 2 > Cv / 3],
      ['(A) is less than (C).', Av < Cv],
      [`(A) is ${WORDS[k + 1] || k + 1} times (B).`, false],
      [`(C) minus (B) is equal to ${Cv - Bv}.`, true],
    ];
    T = rel.filter(x => x[1]).map(x => x[0]); Fa = rel.filter(x => !x[1]).map(x => x[0]);
    if (Fa.length >= 3) break;
  }
  return Q('Operations', `${LEAD}<br>(A) ${Av}<br>(B) ${Bv}<br>(C) ${Cv}`, [r.choice(T), ...r.sample(Fa, 3)], `(A) = ${k} × (B); (C) − (B) = ${Cv - Bv}.`);
}
function c_neg_ops(r) {
  const a = r.randint(3, 12), b = r.randint(2, 9), c = r.randint(2, 5); let pool;
  if (r.random() < 0.5) pool = [[`(−${a} + ${b}) × ${c}`, (-a + b) * c], [`(−${b} × ${a}) × ${c}`, -a * b * c], [`(−${a} × ${b}) + ${c}`, -a * b + c], [`−${a} + (${b} × ${c})`, -a + b * c], [`(${a} − ${b}) × (−${c})`, (a - b) * -c]];
  else pool = [[`(${b} − ${a}) − ${c}`, b - a - c], [`${a} − (${b} − ${c})`, a - b + c], [`(${a} − ${c}) − ${b}`, a - c - b], [`${c} − (${b} − ${a})`, c - b + a], [`${a} − ${b} − ${c}`, a - b - c]];
  return compare(r, r.sample(pool, 3), 'Operations');
}
function c_xval(r) {
  const x = r.choice([2, 3, 4, 5, 6]), a = r.randint(2, 9), b = r.randint(1, 8), k = r.randint(2, 5), m = r.randint(2, 6);
  const pool = [[`${a} − x + ${b}`, a - x + b], [`${m * x} ÷ x`, m], [`${a} + ${b} − x`, a + b - x], [`x${sup(2)} − ${b}`, x * x - b], [`${k}x − ${a}`, k * x - a], [`${k}(x − ${b})`, k * (x - b)], [`x + x + ${b}`, 2 * x + b], [`${a}x ÷ ${a}`, x]];
  return compare(r, r.sample(pool, 3), 'Algebra', { lead: `Examine (A), (B), and (C) and find the best answer if x = ${x}.` });
}
function c_decops(r) {
  const n = r.randint(2, 12), d = r.choice([F(1, 10), F(2, 10), F(5, 10), F(25, 100), F(4, 10)]);
  const pool = [[`${n} ÷ ${num(d)}`, F(n).div(d)], [`${n} × ${num(d)}`, d.mul(n)], [`${num(d)} ÷ ${n}`, d.div(n)], [`${num(d)} × ${n}`, d.mul(n)], [`${n} + ${num(d)}`, d.add(n)]];
  return compare(r, r.sample(pool, 3), 'Decimals');
}
function c_exp_mix(r) {
  if (r.random() < 0.3) { const n = r.randint(3, 9); return compare(r, r.sample([[`1${sup(n)}`, 1], [`1 × ${n}`, n], [`${n}${sup(1)}`, n], [`${n}${sup(2)}`, n * n]], 3), 'Exponents'); }
  const s = r.randint(4, 9), a = r.randint(1, 20), b = r.randint(2, 4), c = r.randint(1, 15), k = r.randint(2, 3), m = r.randint(2, 5), e = r.randint(4, 6), g = r.randint(1, 15);
  return compare(r, r.sample([[`${s}${sup(2)} − ${a}`, s * s - a], [`${b}${sup(3)} − ${c}`, b ** 3 - c], [`${k} × ${m}${sup(2)}`, k * m * m], [`2${sup(e)} − ${g}`, 2 ** e - g]], 3), 'Exponents');
}
function c_time(r) {
  const h = r.randint(1, 3), m1 = r.choice([h * 60 + 30, h * 60 + r.choice([15, 20, 25, 35, 45]), (h + 1) * 60 + r.choice([5, 10])]);
  const hh = r.choice([h, h + 1, ...(h > 1 ? [h - 1] : [])]), mm = r.choice([5, 10, 15, 30, 50]);
  const pool = [[`${h}.5 hours`, h * 60 + 30], [`${m1} minutes`, m1], [`${hh} hour${hh > 1 ? 's' : ''} and ${mm} minutes`, hh * 60 + mm], [`${h}${fr(F(1, 4))} hours`, h * 60 + 15]];
  const items = r.sample(pool, 3);
  return compare(r, items, 'Measurement', { why: 'In minutes: ' + items.map(([, v], i) => `(${ABC[i]}) ${v}`).join(', ') + '.' });
}
function c_pct_money(r) {
  let items = [];
  while (items.length < 3) { const p = r.choice([10, 15, 20, 25, 30, 40, 50, 60, 75]), d = r.choice([10, 20, 30, 40, 50, 60, 80]); const txt = `${p}% of $${d}.00`; if (!items.some(x => x[0] === txt)) items.push([txt, F(p * d, 100)]); }
  const p0 = items[0][0].split('%')[0];
  if (r.random() < 0.5 && ['10', '20', '30', '40', '50', '60', '80'].includes(p0)) { const d0 = items[0][0].split('% of $')[1].split('.')[0]; items[2] = [`${d0}% of $${p0}.00`, items[0][1]]; }
  items = r.shuffle(items);
  return compare(r, items, 'Percents', { why: 'Values: ' + items.map(([, v], i) => `(${ABC[i]}) $${V(v).toFixed(2)}`).join(', ') + '.' });
}
function c_fdp_big(r) {
  const f0 = r.choice([F(2, 5), F(3, 8), F(5, 8), F(3, 4), F(1, 8), F(3, 5), F(7, 10), F(1, 4)]);
  const pool = [[`${num(f0.mul(100))}%`, f0], [num(f0), f0], [num(f0.add(F(2, 100))), f0.add(F(2, 100))], [`${num(f0.mul(1000).add(20))}%`, f0.mul(10).add(F(2, 10))], [`${num(f0.mul(10))}%`, f0.div(10)], [num(f0.mul(10)), f0.mul(10)]];
  const items = r.shuffle([[fr(f0), f0], ...r.sample(pool, 2)]);
  return compare(r, items, 'Conversions', { why: 'As decimals: ' + items.map(([, v], i) => `(${ABC[i]}) ${num(v)}`).join(', ') + '.' });
}

// ================================================================ GEOMETRIC COMPARISONS
function circleFig(n, shaded, cx, cy, rr = 34) {
  const b = [];
  for (let i = 0; i < n; i++) {
    const a0 = rad(-90 + (360 * i) / n), a1 = rad(-90 + (360 * (i + 1)) / n);
    const x0 = cx + rr * Math.cos(a0), y0 = cy + rr * Math.sin(a0), x1 = cx + rr * Math.cos(a1), y1 = cy + rr * Math.sin(a1);
    if (shaded.has(i)) b.push(`<path d="M${cx},${cy} L${f1(x0)},${f1(y0)} A${rr},${rr} 0 0 1 ${f1(x1)},${f1(y1)} Z" fill="${SHADE}"/>`);
    b.push(`<line x1="${cx}" y1="${cy}" x2="${f1(x0)}" y2="${f1(y0)}" stroke="${INK}" stroke-width="1.3"/>`);
  }
  b.push(`<circle cx="${cx}" cy="${cy}" r="${rr}" fill="none" stroke="${INK}" stroke-width="2"/>`);
  return b.join('');
}
const threeFigs = (draws, h = 112) => svg(330, h, draws.map((dr, i) => { const x = 55 + i * 110; return dr(x) + t(x, h - 12, `(${ABC[i]})`, 14); }).join(''));
const shadedWhy = vals => 'Shaded: ' + vals.map((v, i) => `(${ABC[i]}) ${fr(v)}`).join(', ') + '.';
function g_circles(r) {
  const vals = [], draws = [];
  for (let i = 0; i < 3; i++) {
    let n = r.choice([4, 6, 6, 8]), k = r.randint(1, n - 1);
    if (i === 2 && r.random() < 0.4) { const v = vals[0]; for (const n2 of [4, 6, 8]) if (v.mul(n2).int) { n = n2; k = V(v.mul(n2)); } }
    const sh = new Set(r.sample(range(n), k)); draws.push(x => circleFig(n, sh, x, 44)); vals.push(F(k, n));
  }
  return compare(r, vals.map(v => ['', v]), 'Fractions', { style: 'shade', why: shadedWhy(vals), fig: threeFigs(draws) });
}
function rectFig(c, rw, shaded, x, y, w = 60, h = 44) {
  const cw = w / c, ch = h / rw;
  return [...shaded.map(i => `<rect x="${f1(x + (i % c) * cw)}" y="${f1(y + Math.floor(i / c) * ch)}" width="${f1(cw)}" height="${f1(ch)}" fill="#222"/>`),
    ...range(1, c).map(k => `<line x1="${f1(x + k * cw)}" y1="${y}" x2="${f1(x + k * cw)}" y2="${y + h}" stroke="${INK}" stroke-width="1.5"/>`),
    ...range(1, rw).map(k => `<line x1="${x}" y1="${f1(y + k * ch)}" x2="${x + w}" y2="${f1(y + k * ch)}" stroke="${INK}" stroke-width="1.5"/>`),
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${INK}" stroke-width="2"/>`].join('');
}
function g_rects(r) {
  const vals = [], draws = [];
  for (let i = 0; i < 3; i++) { const [c, rw] = r.choice([[2, 2], [2, 1], [4, 1], [3, 1], [2, 2], [4, 2]]), n = c * rw, k = r.randint(1, n - 1), sh = r.sample(range(n), k); draws.push(x => rectFig(c, rw, sh, x - 30, 20)); vals.push(F(k, n)); }
  return compare(r, vals.map(v => ['', v]), 'Fractions', { style: 'shade', why: shadedWhy(vals), fig: threeFigs(draws, 100) });
}
const SLOTS = [0.2, 0.5, 0.8].flatMap(y => [0.25, 0.75].map(x => [x, y])).concat([[0.5, 0.35], [0.5, 0.65], [0.5, 0.5]]);
function domino(x, n, r) {
  const w = 58, h = 74;
  return `<rect x="${x - w / 2}" y="6" width="${w}" height="${h}" rx="12" fill="none" stroke="${INK}" stroke-width="2"/>` +
    r.sample(SLOTS, n).map(([sx, sy]) => `<circle cx="${f1(x - w / 2 + sx * w + r.uniform(-3, 3))}" cy="${f1(6 + sy * h + r.uniform(-3, 3))}" r="5.5" fill="${INK}"/>`).join('');
}
const dotsWhy = vals => 'Dots: ' + vals.map((v, i) => `(${ABC[i]}) ${v}`).join(', ') + '.';
const DOTS_LEAD = 'Examine the number of dots in (A), (B), and (C) and find the best answer.';
function g_dominoes(r) {
  const vals = range(3).map(() => r.randint(3, 9)); if (r.random() < 0.5) vals[2] = vals[0] <= 7 ? vals[0] + 2 : vals[0];
  return compare(r, vals.map(v => ['', v]), 'Counting', { style: 'count', why: dotsWhy(vals), lead: DOTS_LEAD, fig: threeFigs(vals.map(n => x => domino(x, n, r)), 104), S: statements('count', null, 'dots') });
}
function dotGrid(x, n, r, w = 96, h = 64, cols = 6, rows = 4) {
  const cw = w / cols, ch = h / rows, x0 = x - w / 2, y0 = 8;
  const b = [...range(cols + 1).map(k => `<line x1="${f1(x0 + k * cw)}" y1="${y0}" x2="${f1(x0 + k * cw)}" y2="${y0 + h}" stroke="${INK}" stroke-width="0.8"/>`),
    ...range(rows + 1).map(k => `<line x1="${x0}" y1="${f1(y0 + k * ch)}" x2="${x0 + w}" y2="${f1(y0 + k * ch)}" stroke="${INK}" stroke-width="0.8"/>`)];
  const used = r.sample(range(1, cols), Math.min(n, cols - 1)).concat(n < cols ? [] : r.sample(range(1, cols), n - cols + 1));
  used.slice(0, n).forEach((cx, i) => {
    const cy = i < cols - 1 ? r.randint(1, rows - 1) : r.choice([1, 3]), px = x0 + cx * cw, py = y0 + cy * ch;
    b.push(`<rect x="${f1(px - 3.5)}" y="${f1(py - 3.5)}" width="7" height="7" transform="rotate(45 ${f1(px)} ${f1(py)})" fill="${INK}"/>`);
  });
  return b.join('');
}
function g_dotgrid(r) {
  const vals = range(3).map(() => r.randint(3, 5));
  return compare(r, vals.map(v => ['', v]), 'Counting', { style: 'count', why: dotsWhy(vals), lead: DOTS_LEAD, fig: threeFigs(vals.map(n => x => dotGrid(x, n, r)), 100), S: statements('count', null, 'dots') });
}
const COINS = { penny: [1, 18], nickel: [5, 19.5], dime: [10, 16.5], quarter: [25, 22] };
const coin = (cx, cy, name) => { const [, rr] = COINS[name]; return `<circle cx="${cx}" cy="${cy}" r="${rr}" fill="${name === 'penny' ? '#d9a27a' : '#e4e4e4'}" stroke="${INK}" stroke-width="1.5"/><circle cx="${cx}" cy="${cy}" r="${rr - 3}" fill="none" stroke="#777" stroke-width="0.7"/>` + t(cx, cy, name.toUpperCase(), 7.5); };
function g_coins(r) {
  const groups = range(3).map(() => range(r.choice([1, 1, 2, 2])).map(() => r.choice(Object.keys(COINS))));
  const vals = groups.map(g => g.reduce((s, c) => s + COINS[c][0], 0));
  const draw = (x, g) => ({ 1: [[0, 0]], 2: [[-20, -12], [18, 14]] }[g.length]).map(([dx, dy], i) => coin(x + dx, 40 + dy, g[i])).join('');
  return compare(r, vals.map(v => ['', v]), 'Money', { style: 'sym', why: 'Cents: ' + vals.map((v, i) => `(${ABC[i]}) ${v}`).join(', ') + '.', lead: 'Examine the value of the coins in (A), (B), and (C) and find the best answer.', fig: threeFigs(groups.map(g => x => draw(x, g)), 112) });
}
function tri_sides(r) {
  let sides;
  for (let n = 0; n < 200; n++) {
    if (r.random() < 0.5) { const s = r.randint(5, 9), o = r.randint(4, 12); sides = r.choice([[s, s, o], [s, o, s], [o, s, s]]); } else sides = r.sample(range(4, 13), 3);
    const [a, b, c] = sides;
    if (a + b > c && a + c > b && b + c > a && Math.max(...sides) < 1.7 * Math.min(...sides) + 2) break;
  }
  const [a, b, c] = sides;
  const ang = (x, y, z) => Math.round(deg(Math.acos((y * y + z * z - x * x) / (2 * y * z))) * 1e6) / 1e6;
  const vals = { A: ang(a, b, c), B: ang(b, a, c), C: ang(c, a, b) };
  const Bp = [0, 0], Cp = [a, 0], ax = (c * c + a * a - b * b) / (2 * a), Ap = [ax, Math.sqrt(Math.max(c * c - ax * ax, 0.01))];
  const xs = [Bp[0], Cp[0], Ap[0]], mn = Math.min(...xs), mx = Math.max(...xs), k = Math.min(190 / (mx - mn), 82 / Ap[1]);
  const W = 320, H = Ap[1] * k + 34, off = (W - (mx - mn) * k) / 2, P = q => [off + (q[0] - mn) * k, H - 16 - q[1] * k];
  const A2 = P(Ap), B2 = P(Bp), C2 = P(Cp), cx = (A2[0] + B2[0] + C2[0]) / 3, cy = (A2[1] + B2[1] + C2[1]) / 3;
  const body = [`<polygon points="${f1(A2[0])},${f1(A2[1])} ${f1(B2[0])},${f1(B2[1])} ${f1(C2[0])},${f1(C2[1])}" fill="none" stroke="${INK}" stroke-width="2"/>`];
  for (const [p, nm] of [[A2, 'A'], [B2, 'B'], [C2, 'C']]) { const dx = p[0] - cx, dy = p[1] - cy, d = Math.hypot(dx, dy); body.push(t(p[0] + (dx / d) * 12, p[1] + (dy / d) * 12, it(nm), 14)); }
  for (const [[p, q], L] of [[[B2, C2], a], [[C2, A2], b], [[A2, B2], c]]) { const mx2 = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2, dx = mx2 - cx, dy = my - cy, d = Math.hypot(dx, dy); body.push(t(mx2 + (dx / d) * 11, my + (dy / d) * 11, String(L), 13)); }
  return Q('Geometry', 'Examine angles A, B, and C and find the best answer.', pickChoices(r, [vals], statements('angle', { A: '∠A', B: '∠B', C: '∠C' })),
    `The bigger angle is across from the longer side: ∠A faces ${a}, ∠B faces ${b}, ∠C faces ${c}.`, svg(W, Math.floor(H) + 4, body.join('')));
}
function line_angles(r) {
  const k = r.choice([20, 25, 30, 35, 40, 50, 55, 60, 65, 70]), vals = { A: 90, B: k, C: 90 - k }, ox = 150, oy = 92, rr = rad(90 - k);
  const ex = ox + 80 * Math.cos(rr), ey = oy - 80 * Math.sin(rr);
  const body = [`<line x1="40" y1="${oy}" x2="270" y2="${oy}" stroke="${INK}" stroke-width="2"/>`, `<line x1="${ox}" y1="${oy}" x2="${ox}" y2="8" stroke="${INK}" stroke-width="2"/>`,
    `<line x1="${ox}" y1="${oy}" x2="${f1(ex)}" y2="${f1(ey)}" stroke="${INK}" stroke-width="2"/>`, `<polyline points="${ox - 10},${oy} ${ox - 10},${oy - 10} ${ox},${oy - 10}" fill="none" stroke="${INK}" stroke-width="1.2"/>`, t(100, 70, it('A'), 15)];
  const mb = rad(90 - k / 2), mc = rad((90 - k) / 2), show = r.choice(['B', 'C']);
  body.push(t(ox + 50 * Math.cos(mb), oy - 50 * Math.sin(mb) - 4, it('B'), 15), t(ox + 58 * Math.cos(mc) + 6, oy - 58 * Math.sin(mc), it('C'), 15));
  const lm = show === 'B' ? mb : mc; body.push(t(ox + 26 * Math.cos(lm), oy - 26 * Math.sin(lm), `${vals[show]}°`, 11));
  return Q('Geometry', 'Examine angles A, B, and C and find the best answer.', pickChoices(r, [vals], statements('angle', { A: 'A', B: 'B', C: 'C' })),
    `A = 90°, B = ${k}°, C = ${90 - k}° (A, B and C make a straight line, 180°).`, svg(310, 100, body.join('')));
}
function right_tri(r) {
  const a = r.choice([25, 30, 35, 40, 50, 55, 60, 65]); let W = 150, Hh = 150 * Math.tan(rad(a)); const s = Math.min(1, 90 / Hh); W *= s; Hh *= s;
  const x0 = 110, y0 = 100;
  const body = [`<polygon points="${x0},${y0} ${f1(x0 + W)},${y0} ${x0},${f1(y0 - Hh)}" fill="none" stroke="${INK}" stroke-width="2"/>`, `<polyline points="${x0},${y0 - 10} ${x0 + 10},${y0 - 10} ${x0 + 10},${y0}" fill="none" stroke="${INK}" stroke-width="1.2"/>`,
    t(x0 - 10, y0 + 6, it('C'), 14), t(x0 + W + 10, y0 + 6, it('A'), 14), t(x0 - 10, y0 - Hh - 4, it('B'), 14)];
  const labeled = r.random() < 0.5; if (labeled) body.push(t(x0 + W - 34, y0 - 9, `${a}°`, 11));
  const pool = [['∠C is equal to (∠A + ∠B).', true], ['∠C is greater than (∠A + ∠B).', false], ['∠A is greater than ∠C.', false], ['∠B is greater than ∠C.', false], ['All angles are equal.', false], ['∠C is less than ∠B.', false], ['∠A + ∠B is less than ∠C.', false]];
  if (labeled) pool.push([`∠B is ${90 - a > a ? 'greater' : 'less'} than ∠A.`, 90 - a !== a], [`∠B is ${90 - a > a ? 'less' : 'greater'} than ∠A.`, false]);
  const T = pool.filter(x => x[1]).map(x => x[0]), Fa = pool.filter(x => !x[1]).map(x => x[0]);
  return Q('Geometry', 'Examine the triangle and find the best answer.', [r.choice(T), ...r.sample(Fa, 3)], '∠C = 90°, so ∠A + ∠B = 90° = ∠C' + (labeled ? `; ∠A = ${a}°, ∠B = ${90 - a}°.` : '.'), svg(320, 112, body.join('')));
}
function cup(x, n, k) {
  const w = 40, h = 76, y0 = 10;
  return `<rect x="${x - w / 2}" y="${f1(y0 + h - (h * k) / n)}" width="${w}" height="${f1((h * k) / n)}" fill="#b9cfe0"/><polyline points="${x - w / 2},${y0} ${x - w / 2},${y0 + h} ${x + w / 2},${y0 + h} ${x + w / 2},${y0}" fill="none" stroke="${INK}" stroke-width="2"/>` +
    range(1, n).map(i => { const yy = y0 + h - (h * i) / n; return `<line x1="${x + w / 2 - 9}" y1="${f1(yy)}" x2="${x + w / 2}" y2="${f1(yy)}" stroke="${INK}" stroke-width="1.2"/>`; }).join('');
}
function g_cups(r) {
  const vals = [], draws = [];
  for (let i = 0; i < 3; i++) {
    let n = r.choice([2, 3, 4, 4, 8]), k = r.randint(1, n - 1);
    if (i === 2 && r.random() < 0.4) { const v = vals[0]; for (const n2 of [2, 4, 8, 3]) if (v.mul(n2).int && n2 !== n) { n = n2; k = V(v.mul(n2)); break; } }
    const nn = n, kk = k; draws.push(x => cup(x, nn, kk)); vals.push(F(k, n));
  }
  return compare(r, vals.map(v => ['', v]), 'Fractions', { style: 'cup', why: 'Filled: ' + vals.map((v, i) => `(${ABC[i]}) ${fr(v)} cup`).join(', ') + '.', fig: threeFigs(draws, 106),
    lead: 'Each measuring cup holds 1 cup when full. Examine (A), (B), and (C) and find the best answer.', S: statements('cup') });
}
function g_slopes(r) {
  const pool = [F(1, 2), F(2), F(-2), F(1), F(-1), F(3), F(-1, 2), F(1, 3), F(-3)], sl = r.sample(pool, 3), U = 26, x0 = 160, y0 = 92, body = [];
  for (let i = -3; i < 4; i++) body.push(`<line x1="${x0 + i * U}" y1="${y0 - 3 * U}" x2="${x0 + i * U}" y2="${y0 + 3 * U}" stroke="#ccc" stroke-width="0.8"/>`, `<line x1="${x0 - 3 * U}" y1="${y0 + i * U}" x2="${x0 + 3 * U}" y2="${y0 + i * U}" stroke="#ccc" stroke-width="0.8"/>`);
  body.push(`<line x1="${x0 - 3 * U - 6}" y1="${y0}" x2="${x0 + 3 * U + 6}" y2="${y0}" stroke="${INK}" stroke-width="1.5"/>`, `<line x1="${x0}" y1="${y0 - 3 * U - 6}" x2="${x0}" y2="${y0 + 3 * U + 6}" stroke="${INK}" stroke-width="1.5"/>`);
  for (const i of [-3, -2, -1, 1, 2, 3]) body.push(t(x0 + i * U, y0 + 9, String(i).replace('-', '−'), 9), t(x0 - 9, y0 - i * U, String(i).replace('-', '−'), 9));
  const used = [], labels = [];
  sl.forEach((m, li) => {
    const nm = ABC[li], mv = V(m), xm = Math.min(3, 3 / Math.abs(mv)), ex = x0 + xm * U, ey = y0 - mv * xm * U;
    body.push(`<line x1="${f1(x0 - xm * U)}" y1="${f1(y0 + mv * xm * U)}" x2="${f1(ex)}" y2="${f1(ey)}" stroke="${INK}" stroke-width="2"/>`);
    const cands = [];
    for (const sg of li % 2 === 0 ? [1, -1] : [-1, 1]) for (const fc of [1, 0.8, 0.6]) { const px = x0 + sg * xm * U * fc, py = y0 - sg * mv * xm * U * fc; cands.push([px + 22, py], [px - 22, py]); }
    let [lx, ly] = cands[0];
    for (const [cx, cy] of cands) if (cx >= 22 && cx <= 308 && cy >= 8 && cy <= 182 && used.every(([ux, uy]) => Math.abs(cx - ux) > 44 || Math.abs(cy - uy) > 13)) { [lx, ly] = [cx, cy]; break; }
    used.push([lx, ly]);
    labels.push(t(lx, ly, `Line ${it(nm)}`, 11).replace('<text ', '<text paint-order="stroke" stroke="#fff" stroke-width="3.5" '));
  });
  const d = { A: sl[0], B: sl[1], C: sl[2] }, S = [], sv = v => (v.d !== 1 ? fr(v) : num(v));
  const uniq = [...new Map(pool.map(v => [v.key(), v])).values()];
  for (const nm of ABC) for (const v of uniq) S.push([`${nm} = ${sv(v)}`, dd => eq(dd[nm], v)]);
  for (const [a, b] of perms(ABC, 2)) S.push([`${a} < ${b}`, dd => lt(dd[a], dd[b])]);
  const T = S.filter(([, f]) => f(d)).map(x => x[0]), Fa = S.filter(([, f]) => !f(d)).map(x => x[0]);
  return Q('Algebra', 'Examine the slopes of lines A, B, and C and find the best answer.', [r.choice(T), ...r.sample(Fa, 3)],
    'Slopes (rise over run): ' + ABC.map(k => `${k} = ${sv(d[k])}`).join(', ') + '.', svg(330, 190, body.concat(labels).join('')).replace('<svg ', '<svg style="max-height:190px" '));
}
function g_transversal(r) {
  const th = r.choice([115, 120, 125, 130, 135, 140]), big = th, small = 180 - th, vals = {};
  for (const k of 'ABCDEFGH') vals[k] = 'ADEH'.includes(k) ? big : small;
  const lean = 1 / Math.tan(rad(180 - th)), y1 = 32, y2 = 88, xi1 = 160, xi2 = 160 - (y2 - y1) * lean;
  const body = [`<line x1="30" y1="${y1}" x2="300" y2="${y1}" stroke="${INK}" stroke-width="2"/>`, `<line x1="30" y1="${y2}" x2="300" y2="${y2}" stroke="${INK}" stroke-width="2"/>`, `<line x1="${f1(xi1 + 28 * lean)}" y1="4" x2="${f1(xi2 - 22 * lean)}" y2="110" stroke="${INK}" stroke-width="2"/>`];
  for (const [[xi, yi], [tl, tr, bl, br]] of [[[xi1, y1], 'ABCD'], [[xi2, y2], 'EFGH']]) body.push(t(xi - 16, yi - 10, it(tl), 14), t(xi + 30, yi - 10, it(tr), 14), t(xi - 30, yi + 12, it(bl), 14), t(xi + 16, yi + 12, it(br), 14));
  const S = [], L8 = [...'ABCDEFGH'];
  for (const [a, b] of combs(L8, 2)) { S.push([`${a} = ${b}`, vals[a] === vals[b]]); S.push([`${a} + ${b} = 180°`, vals[a] + vals[b] === 180]); }
  for (const [a, b] of perms(L8, 2)) S.push([`${a} > ${b}`, vals[a] > vals[b]]);
  const T = S.filter(([s, v]) => v && !s.includes('180')).map(x => x[0]).concat(S.filter(([s, v]) => v && s.includes('180')).slice(0, 3).map(x => x[0]));
  const Fa = S.filter(([, v]) => !v).map(x => x[0]);
  return Q('Geometry', 'The two horizontal lines are parallel. Examine angles A through H and find the best answer.', [r.choice(T), ...r.sample(Fa, 3)],
    `A, D, E, H are the larger angles (${big}°); B, C, F, G are the smaller (${small}°).`, svg(330, 114, body.join('')).replace('<svg ', '<svg style="max-height:134px" '));
}
function triangleFig(A, B, labels) {
  const C = 180 - A - B, L = [0, 0], Rt = [1, 0], ac = Math.sin(rad(B)) / Math.sin(rad(C)), T = [ac * Math.cos(rad(A)), ac * Math.sin(rad(A))];
  const xs = [0, 1, T[0]], mn = Math.min(...xs), mx = Math.max(...xs), k = Math.min(200 / (mx - mn), 110 / T[1]), W = (mx - mn) * k + 60, H = T[1] * k + 50;
  const p = q => [30 + (q[0] - mn) * k, H - 25 - q[1] * k], L2 = p(L), R2 = p(Rt), T2 = p(T);
  const b = [`<polygon points="${f1(L2[0])},${f1(L2[1])} ${f1(R2[0])},${f1(R2[1])} ${f1(T2[0])},${f1(T2[1])}" fill="none" stroke="${INK}" stroke-width="2"/>`];
  const cx = (L2[0] + R2[0] + T2[0]) / 3, cy = (L2[1] + R2[1] + T2[1]) / 3;
  [L2, R2, T2].forEach((v, i) => { const dx = cx - v[0], dy = cy - v[1], d = Math.hypot(dx, dy); b.push(t(v[0] + (dx / d) * 24, v[1] + (dy / d) * 24, labels[i], 14)); });
  return svg(Math.floor(W), Math.floor(H), b.join(''));
}
function g_tri180(r) {
  let a, b, c; do { a = r.choice(range(30, 91, 5)); b = r.choice(range(30, 91, 5)); c = 180 - a - b; } while (!(c >= 25 && c <= 100));
  const S = statements('angle', { A: '∠A', B: '∠B', C: '∠C' }).concat([['∠C is equal to (∠A + ∠B).', d => eq(d.C, d.A + d.B)], ['∠C is greater than (∠A + ∠B).', d => gt(d.C, d.A + d.B)]]);
  return Q('Geometry', `In the triangle, ∠A = ${a}° and ∠B = ${b}°. Examine angles A, B, and C and find the best answer.`, pickChoices(r, [{ A: a, B: b, C: c }], S), `∠C = 180° − ${a}° − ${b}° = ${c}°.`, triangleFig(a, b, [it('A'), it('B'), it('C')]));
}
function g_bar(r) {
  const names = r.sample(['Ana', 'Ben', 'Cal', 'Dee', 'Eli', 'Fay', 'Gus', 'Ivy'], 4), vals = names.map(() => r.randint(1, 10)), body = [], x0 = 30, y0 = 96, H = 84, top = 10;
  for (let v = 0; v <= top; v += 2) { const y = y0 - (v / top) * H; body.push(`<line x1="${x0}" y1="${f1(y)}" x2="310" y2="${f1(y)}" stroke="#bbb" stroke-width="0.8"/>`, t(x0 - 6, y, String(v), 11, 'end')); }
  names.forEach((n, i) => { const v = vals[i], bx = x0 + 18 + i * 70; body.push(`<rect x="${bx}" y="${f1(y0 - (v / top) * H)}" width="34" height="${f1((v / top) * H)}" fill="${SHADE}" stroke="${INK}" stroke-width="1.2"/>`, t(bx + 17, y0 + 12, n, 12)); });
  body.push(`<line x1="${x0}" y1="${y0}" x2="310" y2="${y0}" stroke="${INK}" stroke-width="1.5"/><line x1="${x0}" y1="${y0}" x2="${x0}" y2="${y0 - H}" stroke="${INK}" stroke-width="1.5"/>`);
  const d = Object.fromEntries(names.map((n, i) => [n, vals[i]])), [a, b, c, e] = names;
  const pool = [[`the books ${a} read`, d[a]], [`the books ${b} read`, d[b]], [`the books ${c} and ${e} read together`, d[c] + d[e]], [`twice the books ${e} read`, 2 * d[e]], [`the books ${b} and ${c} read together`, d[b] + d[c]], [`the books ${c} read`, d[c]]];
  const items = r.sample(pool, 3);
  return compare(r, items, 'Graphs', { style: 'sym', why: 'Graph: ' + names.map(n => `${n} ${d[n]}`).join(', ') + '. Values: ' + items.map(([, v], i) => `(${ABC[i]}) ${v}`).join(', ') + '.',
    lead: 'The graph shows how many books four students read. Examine (A), (B), and (C) and find the best answer.', fig: svg(320, 112, body.join('')) });
}
function g_mixed(r) {
  const vals = [], draws = [];
  for (let i = 0; i < 3; i++) {
    if (i === 1) { const n = r.choice([4, 6, 8]), k = r.randint(1, n - 1), sh = new Set(r.sample(range(n), k)); draws.push(x => circleFig(n, sh, x, 44)); vals.push(F(k, n)); }
    else { const [c, rw] = r.choice([[2, 2], [2, 1], [4, 1], [4, 2]]), n = c * rw, k = r.randint(1, n - 1), sh = r.sample(range(n), k); draws.push(x => rectFig(c, rw, sh, x - 30, 22)); vals.push(F(k, n)); }
  }
  return compare(r, vals.map(v => ['', v]), 'Fractions', { style: 'shade', why: shadedWhy(vals), fig: threeFigs(draws) });
}
function hourglass(x, f) {
  const w = 52, H = 40, y0 = 6, mid = y0 + H, bot = y0 + 2 * H, ht = H * Math.sqrt(1 - f), b = [], hw = ((w / 2) * ht) / H;
  if (f < 1) b.push(`<polygon points="${x},${mid} ${f1(x - hw)},${f1(mid - ht)} ${f1(x + hw)},${f1(mid - ht)}" fill="#c9a86a"/>`);
  if (f > 0) b.push(`<polygon points="${x - w / 2},${bot} ${x + w / 2},${bot} ${f1(x + hw)},${f1(mid + ht)} ${f1(x - hw)},${f1(mid + ht)}" fill="#c9a86a"/>`);
  b.push(`<polygon points="${x - w / 2},${y0} ${x + w / 2},${y0} ${x + 2},${mid} ${x + w / 2},${bot} ${x - w / 2},${bot} ${x - 2},${mid}" fill="none" stroke="${INK}" stroke-width="2"/>`,
    `<line x1="${x - w / 2 - 6}" y1="${y0}" x2="${x + w / 2 + 6}" y2="${y0}" stroke="${INK}" stroke-width="3"/>`, `<line x1="${x - w / 2 - 6}" y1="${bot}" x2="${x + w / 2 + 6}" y2="${bot}" stroke="${INK}" stroke-width="3"/>`);
  return b.join('');
}
function g_hourglass(r) {
  const opt = [F(1, 4), F(1, 2), F(3, 4), F(0), F(1)], vals = range(3).map(() => r.choice(opt));
  while (new Set(vals.map(v => v.key())).size === 1) vals[1] = r.choice(opt.slice(0, 3));
  const d = { A: vals[0], B: vals[1], C: vals[2] }, S = [];
  for (const k of ABC) S.push([`(${k}) shows the most time passed.`, dd => ABC.every(j => j === k || gt(dd[k], dd[j]))]);
  for (const [a, b] of perms(ABC, 2)) S.push([`(${a}) shows more time passed than (${b}).`, dd => gt(dd[a], dd[b])]);
  for (const [a, b] of combs(ABC, 2)) S.push([`(${a}) and (${b}) show the same time has passed.`, dd => eq(dd[a], dd[b])]);
  S.push(['All three show the same time has passed.', dd => eq(dd.A, dd.B) && eq(dd.B, dd.C)]);
  return Q('Measurement', 'Each hourglass started with all of its sand in the top. Examine (A), (B), and (C) and find the best answer.', pickChoices(r, [d], S),
    'Sand already fallen: ' + ABC.map(k => `(${k}) ${V(d[k]) === 1 ? 'all' : V(d[k]) === 0 ? 'none' : fr(d[k])}`).join(', ') + '.', threeFigs(vals.map(f => x => hourglass(x, V(f))), 108));
}
function polyomino(r, n, cols = 4, rows = 3) {
  const cells = new Set([`${r.randrange(cols)},${r.randrange(rows)}`]);
  while (cells.size < n) {
    const [cx, cy] = r.choice([...cells].sort()).split(',').map(Number), [dx, dy] = r.choice([[1, 0], [-1, 0], [0, 1], [0, -1]]);
    if (cx + dx >= 0 && cx + dx < cols && cy + dy >= 0 && cy + dy < rows) cells.add(`${cx + dx},${cy + dy}`);
  }
  return cells;
}
function areaFig(x, cells, tri, cols = 4, rows = 3, s = 18) {
  const x0 = x - (cols * s) / 2, y0 = 8;
  const b = [...cells].map(c => { const [cx, cy] = c.split(',').map(Number); return `<rect x="${x0 + cx * s}" y="${y0 + cy * s}" width="${s}" height="${s}" fill="${SHADE}"/>`; });
  if (tri) {
    const [[cx, cy], o] = tri, pts = [[x0 + cx * s, y0 + cy * s], [x0 + cx * s + s, y0 + cy * s], [x0 + cx * s + s, y0 + cy * s + s], [x0 + cx * s, y0 + cy * s + s]];
    pts.splice(o, 1); b.push(`<polygon points="${pts.map(([a, c]) => `${a},${c}`).join(' ')}" fill="${SHADE}"/>`);
  }
  b.push(...range(cols + 1).map(k => `<line x1="${x0 + k * s}" y1="${y0}" x2="${x0 + k * s}" y2="${y0 + rows * s}" stroke="#777" stroke-width="0.8"/>`), ...range(rows + 1).map(k => `<line x1="${x0}" y1="${y0 + k * s}" x2="${x0 + cols * s}" y2="${y0 + k * s}" stroke="#777" stroke-width="0.8"/>`));
  return b.join('');
}
function g_grid_area(r) {
  const vals = [], draws = [];
  const freeOf = cells => [...cells].flatMap(c => { const [a, b] = c.split(',').map(Number); return [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [a + dx, b + dy]); })
    .filter(([a, b]) => a >= 0 && a < 4 && b >= 0 && b < 3 && !cells.has(`${a},${b}`));
  for (let i = 0; i < 3; i++) {
    let cells = polyomino(r, r.randint(4, 8)), tri = null;
    if (r.random() < 0.5) { const free = freeOf(cells); if (free.length) tri = [r.choice(free), r.randrange(4)]; }
    if (i === 2 && r.random() < 0.4) {
      const target = vals[0], n = Math.floor(V(target)); cells = polyomino(r, n); tri = null;
      if (target.d === 2) { const free = freeOf(cells); tri = free.length ? [r.choice(free), r.randrange(4)] : null; if (!tri) cells = polyomino(r, n + 1); }
    }
    const v = F(cells.size).add(tri ? F(1, 2) : 0); vals.push(v);
    const c = cells, tr = tri; draws.push(x => areaFig(x, c, tr));
  }
  return compare(r, vals.map(v => ['', v]), 'Geometry', { style: r.choice(['sym', 'word']), why: 'Area in squares: ' + vals.map((v, i) => `(${ABC[i]}) ${num(v)}`).join(', ') + '.', fig: threeFigs(draws, 92),
    lead: 'Each small square has an area of 1. Examine the shaded areas of (A), (B), and (C) and find the best answer.' });
}

// ================================================================ COMPUTATION (Barron's forms) with the word-by-word setup
// Each question is built from pieces: [words, what to write above them] (null = nothing above).
// Pieces marked FLIP ("less than", "subtracted from") put the number after them first.
const FLIP = true;
const w = (n, r, p = 0.35) => (WORDS[n] && r.random() < p ? WORDS[n] : String(n));
function calc(pieces, ans, wrongs, steps, why, topic = 'Operations') {
  const stem = pieces.map(p => p[0]).join(' ').replace(/ \?$/, '?');
  return Q(topic, stem, opts(ans, wrongs, showNum), why, null, { setup: { pieces, steps } });
}
const WN = ['What number', 'x'], WHAT = ['what number', 'x'], IS = ['is', '='], Qm = ['?', null];
const pct = (p, b, v) => [`${p}% of ${b}`, num(v)];
const frOf = (f0, b, v) => [`${fr(f0)} of ${b}`, num(v)];
const P = x => [String(x), null];                                   // a number is already itself
const Wd = (n, r, p) => { const t_ = w(n, r, p); return [t_, t_ === String(n) ? null : String(n)]; };   // "six" -> 6

function k_mult_less(r) {
  const a = r.randint(3, 9), x = r.randint(3, 12), n = r.randint(2, 15), m = a * x + n;
  return calc([WN, ['multiplied by', '×'], P(a), IS, Wd(n, r), ['less than', '−', FLIP], P(m), Qm], x, [m - n, x + n, a * x],
    [`x × ${a} = ${m} − ${n}`, `x × ${a} = ${m - n}`, `x = ${m - n} ÷ ${a} = ${x}`], `${n} less than ${m} is ${a * x}; ${a * x} ÷ ${a} = ${x}.`);
}
function k_mult_more(r) {
  const a = r.randint(3, 12), x = r.randint(4, 9), tot = a * x, n = r.randint(5, tot - 5);
  return calc([WN, ['multiplied by', '×'], P(a), ['is equal to', '='], P(n), ['more than', '+'], P(tot - n), Qm], x, [tot, x + 2, tot - a],
    [`x × ${a} = ${n} + ${tot - n}`, `x × ${a} = ${tot}`, `x = ${tot} ÷ ${a} = ${x}`], `${n} + ${tot - n} = ${tot}; ${tot} ÷ ${a} = ${x}.`);
}
function k_sub_makes(r) {
  const n = r.randint(3, 12), m = r.randint(8, 25), big = n + m + r.randint(5, 30), ans = big - n - m;
  return calc([WN, ['subtracted from', '−', FLIP], P(big), ['makes', '='], Wd(n, r), ['more than', '+'], P(m), Qm], ans, [n + m, big - m, ans + 2],
    [`${big} − x = ${n} + ${m}`, `${big} − x = ${n + m}`, `x = ${big} − ${n + m} = ${ans}`], `${n} more than ${m} is ${n + m}; ${big} − ${n + m} = ${ans}.`);
}
function k_sub_makes_less(r) {
  const n = r.randint(3, 12), m = r.randint(20, 60), tgt = m - n, big = tgt + r.randint(8, 40);
  return calc([WN, ['subtracted from', '−', FLIP], P(big), ['makes', '='], Wd(n, r), ['less than', '−', FLIP], P(m), Qm], big - tgt, [big - (m + n), tgt, big - m],
    [`${big} − x = ${m} − ${n}`, `${big} − x = ${tgt}`, `x = ${big} − ${tgt} = ${big - tgt}`], `${n} less than ${m} is ${tgt}; ${big} − ${tgt} = ${big - tgt}.`);
}
function k_times_what(r) {
  let a, b, c; do { a = r.randint(2, 6); b = r.randint(3, 12); c = r.randint(2, 9); } while ((b * c) % a || (b * c) / a === b);
  const x = (b * c) / a;
  return calc([P(a), ['times', '×'], WHAT, IS, P(b), ['times', '×'], P(c), Qm], x, [b * c, b * c * a, b + c],
    [`${a} × x = ${b} × ${c}`, `${a} × x = ${b * c}`, `x = ${b * c} ÷ ${a} = ${x}`], `${b} × ${c} = ${b * c}; ${b * c} ÷ ${a} = ${x}.`);
}
function k_more_frac(r) {
  const d = r.choice([3, 4, 5, 6, 7, 8, 9]), b = d * r.randint(3, 9), n = r.randint(4, 15), v = b / d;
  return calc([WN, IS, P(n), ['more than', '+'], frOf(F(1, d), b, v), Qm], v + n, [b - n, v, v * n],
    [`x = ${n} + ${v}`, `x = ${v + n}`], `${fr(F(1, d))} of ${b} = ${v}; ${v} + ${n} = ${v + n}.`, 'Fractions');
}
function k_more_pct(r) {
  let p, b, v; do { p = r.choice([10, 15, 20, 25, 30, 35, 40, 50, 5, 12]); b = r.choice([20, 30, 40, 50, 60, 80, 90, 120, 200]); v = F(p * b, 100); } while (!v.int);
  const n = r.randint(3, 15), vv = V(v);
  return calc([WN, IS, P(n), ['more than', '+'], pct(p, b, vv), Qm], vv + n, [vv, b + n, vv * 2 + n],
    [`x = ${n} + ${vv}`, `x = ${vv + n}`], `${p}% of ${b} = ${vv}; plus ${n} = ${vv + n}.`, 'Percents');
}
function k_sub_pct(r) {
  const p = r.choice([10, 20, 25, 50]); let b = r.choice([40, 60, 80, 120, 36, 48]); if (!F(p * b, 100).int) b = 40;
  const v = (p * b) / 100, big = v + r.randint(8, 40);
  return calc([WN, ['subtracted from', '−', FLIP], P(big), IS, pct(p, b, v), Qm], big - v, [v, big + v, big - v + 1],
    [`${big} − x = ${v}`, `x = ${big} − ${v} = ${big - v}`], `${p}% of ${b} = ${v}; ${big} − ${v} = ${big - v}.`, 'Percents');
}
function k_less_frac(r) {
  const f0 = r.choice([F(2, 3), F(3, 4), F(2, 5), F(3, 5), F(5, 6), F(1, 3)]), b = f0.d * r.randint(8, 30), v = V(f0.mul(b)), n = r.randint(3, Math.min(25, v - 2));
  const alt = f0.mul(b - n);
  return calc([WN, IS, P(n), ['less than', '−', FLIP], frOf(f0, b, v), Qm], v - n, [v + n, v, alt.int ? V(alt) : v - n + 4],
    [`x = ${v} − ${n}`, `x = ${v - n}`], `${fr(f0)} of ${b} = ${v}; minus ${n} = ${v - n}.`, 'Fractions');
}
function k_twice_frac(r) {
  const d = r.choice([3, 4, 5, 6, 8, 10]), b = d * r.randint(5, 40), v = b / d;
  return calc([WN, IS, ['twice as much as', '2 ×'], frOf(F(1, d), b, v), Qm], 2 * v, [v, 3 * v, 2 * b],
    [`x = 2 × ${v}`, `x = ${2 * v}`], `${fr(F(1, d))} of ${b} = ${v}; twice that is ${2 * v}.`, 'Fractions');
}
function k_twice_nonunit(r) {
  const f0 = r.choice([F(2, 3), F(3, 4), F(2, 5), F(3, 5), F(5, 6), F(3, 8)]), b = f0.d * r.randint(4, 15), v = V(f0.mul(b));
  const [mult, word] = r.choice([[2, 'twice as much as'], [2, 'twice as much as'], [3, 'three times as much as']]);
  return calc([WN, IS, [word, `${mult} ×`], frOf(f0, b, v), Qm], mult * v, [v, (mult * b) / f0.d, mult * v + f0.d],
    [`x = ${mult} × ${v}`, `x = ${mult * v}`], `${fr(f0)} of ${b} = ${v}; ${mult === 2 ? 'twice' : 'three times'} that is ${mult * v}.`, 'Fractions');
}
function k_frac_pct(r) {
  const d = r.choice([2, 4, 5]), p = r.choice([10, 20, 40, 50]); let b = r.choice([100, 200, 300, 400, 500]), v = F(p * b, 100);
  if (!v.div(d).int) { b = 200; v = F(p * b, 100); }
  const ans = v.div(d);
  return calc([WN, IS, [fr(F(1, d)), fr(F(1, d))], ['of', '×'], [`${p} percent of ${b}`, num(v)], Qm], ans, [v, F(b, d), ans.add(d)],
    [`x = ${fr(F(1, d))} × ${num(v)}`, `x = ${num(v)} ÷ ${d} = ${num(ans)}`], `${p}% of ${b} = ${num(v)}; ${fr(F(1, d))} of that = ${num(ans)}.`, 'Percents');
}
function k_frac_what(r) {
  const d = r.choice([2, 3, 4, 5]), n = r.randint(2, 9), m = r.randint(8, 30), tgt = n + m;
  return calc([[fr(F(1, d)), fr(F(1, d))], ['of', '×'], WHAT, IS, Wd(n, r, 0.6), ['more than', '+'], P(m), Qm], tgt * d, [tgt, tgt % d === 0 ? tgt / d : tgt * d + d, (m - n) * d],
    [`${fr(F(1, d))} × x = ${n} + ${m}`, `${fr(F(1, d))} × x = ${tgt}`, `x = ${tgt} × ${d} = ${tgt * d}`], `${n} more than ${m} is ${tgt}; ${tgt} × ${d} = ${tgt * d}.`, 'Fractions');
}
function k_frac_times(r) {
  const d = r.choice([3, 4, 5, 6]), a = r.randint(3, 9), b = r.randint(3, 9), p = a * b, ans = F(p, d);
  let wr; if (ans.int) wr = [p, ans.add(2), ans.mul(2)]; else { const alt = F(a, d).mul(b).add(F(1, d)); wr = [p, ans.add(1), alt.key() !== ans.key() ? alt : ans.add(3)]; }
  return calc([WN, IS, [fr(F(1, d)), fr(F(1, d))], ['of', '×'], P(a), ['times', '×'], P(b), Qm], ans, wr,
    [`x = ${fr(F(1, d))} × ${a} × ${b}`, `x = ${fr(F(1, d))} × ${p}`, `x = ${p} ÷ ${d} = ${showNum(ans)}`], `${a} × ${b} = ${p}; ${fr(F(1, d))} of ${p} = ${fr(ans)}.`, 'Fractions');
}
function k_frac_what_times(r) {
  let f0, a, b, tgt, ans;
  for (let n = 0; n < 100; n++) { f0 = r.choice([F(1, 2), F(1, 3), F(1, 4), F(1, 5), F(1, 6), F(2, 3), F(3, 4)]); a = r.randint(3, 12); b = r.randint(3, 9); tgt = a * b; ans = F(tgt).div(f0); if (ans.int) break; }
  need(ans.int);
  const half = f0.mul(tgt);
  return calc([[fr(f0), fr(f0)], ['of', '×'], WHAT, IS, P(a), ['times', '×'], P(b), Qm], ans, [tgt, half.int ? half : tgt + f0.d, F(a + b).div(f0)],
    [`${fr(f0)} × x = ${a} × ${b}`, `${fr(f0)} × x = ${tgt}`, `x = ${tgt} ÷ ${fr(f0)} = ${num(ans)}`], `${a} × ${b} = ${tgt}; ${tgt} ÷ ${fr(f0)} = ${num(ans)}.`, 'Fractions');
}
function k_sq_pct(r) {
  const [b, e] = r.choice([[5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [2, 4], [2, 5], [3, 3], [4, 3]]), pw = b ** e;
  let p, n, v; do { p = r.choice([10, 20, 25, 50, 75]); n = r.choice([20, 25, 40, 60, 80, 36, 44, 50, 100]); v = F(p * n, 100); } while (!(v.int && V(v) < pw - 2));
  v = V(v); const verb = r.choice(['is', 'makes']);
  const head = verb === 'makes' ? [['What number when', 'x'], ['subtracted from', '−', FLIP]] : [WN, ['subtracted from', '−', FLIP]];
  return calc([...head, [`${b}${sup(e)}`, String(pw)], [verb, '='], pct(p, n, v), Qm], pw - v, [v, b * e > v ? b * e - v : pw + v, pw - v + 2],
    [`${pw} − x = ${v}`, `x = ${pw} − ${v} = ${pw - v}`], `${b}${sup(e)} = ${pw}; ${p}% of ${n} = ${v}; ${pw} − ${v} = ${pw - v}.`, 'Exponents');
}
function k_added_pow(r) {
  const [b, e] = r.choice([[2, 3], [2, 4], [3, 2], [4, 2], [5, 2], [2, 5], [3, 3]]), pw = b ** e;
  let p, n, v; do { p = r.choice([10, 20, 25, 50, 75]); n = r.choice([40, 60, 80, 100, 120, 140, 160, 200]); v = F(p * n, 100); } while (!(v.int && V(v) > pw + 2));
  v = V(v);
  return calc([WN, ['added to', '+'], [`${b}${sup(e)}`, String(pw)], IS, pct(p, n, v), Qm], v - pw, [v + pw, v > b * e ? v - b * e : v + b * e, v],
    [`x + ${pw} = ${v}`, `x = ${v} − ${pw} = ${v - pw}`], `${b}${sup(e)} = ${pw}; ${p}% of ${n} = ${v}; ${v} − ${pw} = ${v - pw}.`, 'Exponents');
}
function k_leaves(r) {
  const n = r.randint(3, 12), a = r.randint(2, 9), b = r.randint(3, 9), tgt = n + a * b, big = tgt + r.randint(10, 60);
  return calc([WN, ['subtracted from', '−', FLIP], P(big), ['leaves', '='], P(n), ['more than', '+'], P(a), ['times', '×'], P(b), Qm], big - tgt, [tgt, big - a * b, big > (n + a) * b ? big - (n + a) * b : big - tgt + 3],
    [`${big} − x = ${n} + ${a} × ${b}`, `${big} − x = ${n} + ${a * b} = ${tgt}`, `x = ${big} − ${tgt} = ${big - tgt}`], `${n} + ${a} × ${b} = ${tgt}; ${big} − ${tgt} = ${big - tgt}.`);
}
function k_leaves_less_frac(r) {
  const f0 = r.choice([F(1, 2), F(1, 3), F(1, 4), F(1, 5), F(2, 3), F(3, 4), F(2, 5)]), n = f0.d * r.randint(6, 20), v = V(f0.mul(n)), k = r.randint(2, Math.min(9, v - 2));
  const tgt = v - k, big = tgt + r.randint(8, 40), verb = r.choice(['leaves', 'makes']);
  return calc([WN, ['subtracted from', '−', FLIP], P(big), [verb, '='], Wd(k, r), ['less than', '−', FLIP], frOf(f0, n, v), Qm], big - tgt, [tgt, big - (v + k), big - v],
    [`${big} − x = ${v} − ${k}`, `${big} − x = ${tgt}`, `x = ${big} − ${tgt} = ${big - tgt}`], `${fr(f0)} of ${n} = ${v}; ${k} less is ${tgt}; ${big} − ${tgt} = ${big - tgt}.`, 'Fractions');
}
function k_left_half(r) {
  const part = r.choice(['half', 'one third', 'one fourth']), d = { half: 2, 'one third': 3, 'one fourth': 4 }[part], k = r.randint(2, 9), x = d * r.randint(k + 6, k + 25), lhs = x / d - k;
  return calc([P(lhs), IS, Wd(k, r, 0.7), ['less than', '−', FLIP], [`${part} of`, `${fr(F(1, d))} ×`], WHAT, Qm], x, [lhs * d, x / d, x + d],
    [`${lhs} = ${fr(F(1, d))} × x − ${k}`, `${lhs} + ${k} = ${fr(F(1, d))} × x`, `${x / d} = ${fr(F(1, d))} × x`, `x = ${x / d} × ${d} = ${x}`], `${lhs} is ${k} less than ${x / d}; ${x / d} is ${part} of ${x}.`);
}
// Two more forms from the Barron's practice tests (also in the weekly packets).
function k_add_is_pct(r) {
  const p = r.choice([20, 25, 50, 75]), base = r.choice([40, 60, 80, 100, 120]), v = (p * base) / 100, a = r.randint(2, v - 1);
  return calc([WN, ['added to', '+'], P(a), IS, pct(p, base, v), Qm], v - a, [v + a, v, base - a],
    [`x + ${a} = ${v}`, `x = ${v} − ${a} = ${v - a}`], `${p}% of ${base} = ${v}; ${v} − ${a} = ${v - a}.`, 'Percents');
}
function k_div_equal(r) {
  const [b, c] = r.choice([[24, 6], [36, 9], [45, 5], [56, 8], [30, 3], [42, 7], [48, 6], [63, 9], [72, 8]]), q = b / c, a = r.choice([2, 3, 4, 5]);
  return calc([WN, ['divided by', '÷'], P(a), ['is equal to', '='], P(b), ['divided by', '÷'], P(c), Qm], a * q, [q, q % a === 0 ? q / a : q + a, a * c],
    [`x ÷ ${a} = ${b} ÷ ${c}`, `x ÷ ${a} = ${q}`, `x = ${q} × ${a} = ${a * q}`], `${b} ÷ ${c} = ${q}; ${q} × ${a} = ${a * q}.`);
}

// ================================================================ modes
// Each Barron's question style is its own mode. ex = a short example of the wording.
export const TYPES = [
  { id: 'seq', name: 'Sequences', modes: [
    ['s_add', 'Add the same amount', s_add], ['s_bigsub', 'Subtract the same amount', s_bigsub], ['s_mult', 'Multiply each time', s_mult],
    ['s_allneg', 'Negative numbers', s_allneg], ['s_negdec', 'Negative decimals', s_negdec], ['s_dec', 'Fractions and decimals', s_dec],
    ['s_div_frac', 'Divide down to a fraction', s_div_frac], ['s_altdiv', 'Two multipliers taking turns', s_altdiv], ['s_mixops', 'Two operations taking turns', s_mixops],
    ['s_diffs', 'Differences grow by 1', s_diffs], ['s_diffgrow', 'Differences grow by more', s_diffgrow], ['s_shrink', 'Differences shrink', s_shrink],
    ['s_updown', 'Down and up', s_updown], ['s_two_alt', 'Two numbers next', s_two_alt], ['s_three_next', 'Three numbers next', s_three_next],
    ['s_every_other', 'Every other number', s_every_other], ['s_pairmult', 'Two series mixed together', s_pairmult], ['s_squares', 'Squares and square roots', s_squares],
    ['s_blank', 'Fill in the blank', s_blank], ['s_negblank', 'Fill in the blank (negatives)', s_negblank], ['s_blanks2', 'Two blanks at the end', s_blanks2],
    ['s_mid2', 'Two missing in the middle', s_mid2], ['s_wrong', 'One number is wrong', s_wrong], ['s_letters', 'Letters', s_letters],
    ['s_letpairs', 'Letter pairs', s_letpairs], ['s_letnum', 'Numbers with letters', s_letnum], ['s_letx', 'Letter × number', s_letx],
    ['s_three', 'Three patterns at once', s_three], ['s_ln_hard', 'Letters and numbers (harder)', s_ln_hard], ['s_roman', 'Roman numerals', s_roman],
    ['s_roman2', 'Roman numerals (two steps)', s_roman2],
  ] },
  { id: 'cmp', name: 'Comparisons', modes: [
    ['c_frac_bench', 'Fractions near ½ or ¼', c_frac_bench], ['c_frac_close', 'Close fractions', c_frac_close], ['c_fdp', 'Fraction, decimal, percent', c_fdp],
    ['c_fdp_big', 'Decimal-point traps', c_fdp_big], ['c_pct3', 'Percent of a number', c_pct3], ['c_pct_frac', 'Percent vs. fraction of', c_pct_frac],
    ['c_pct_big', 'Percents over 100%', c_pct_big], ['c_pct_money', 'Percent of money', c_pct_money], ['c_pemdas', 'Order of operations', c_pemdas],
    ['c_neg_ops', 'Negatives and parentheses', c_neg_ops], ['c_decops', 'Multiplying and dividing decimals', c_decops], ['c_exp', 'Exponents', c_exp],
    ['c_exp_mix', 'Exponents with + and −', c_exp_mix], ['c_rad', 'Square roots', c_rad], ['c_sci', 'Scientific notation', c_sci],
    ['c_xpos', 'x is positive', c_xpos], ['c_dist_xy', 'x and y (distributing)', c_dist_xy], ['c_xval', 'Plug in x', c_xval],
    ['c_measure', 'Measurements', c_measure], ['c_time', 'Hours and minutes', c_time], ['c_numrel', 'Statements about three numbers', c_numrel],
  ] },
  { id: 'geo', name: 'Geometric Comparisons', modes: [
    ['g_circles', 'Shaded circles', g_circles], ['g_rects', 'Shaded rectangles', g_rects], ['g_mixed', 'Shaded circles and rectangles', g_mixed],
    ['g_grid_area', 'Shaded area on a grid', g_grid_area], ['g_cups', 'Measuring cups', g_cups], ['g_hourglass', 'Hourglasses', g_hourglass],
    ['g_dominoes', 'Counting dots (dominoes)', g_dominoes], ['g_dotgrid', 'Counting dots (grid)', g_dotgrid], ['g_coins', 'Coins', g_coins],
    ['g_bar', 'Bar graph', g_bar], ['g_tri180', 'Triangle angles add to 180°', g_tri180], ['tri_sides', 'Triangle sides and angles', tri_sides],
    ['right_tri', 'Right triangle', right_tri], ['line_angles', 'Angles on a line', line_angles], ['g_transversal', 'Parallel lines', g_transversal],
    ['g_slopes', 'Slopes of lines', g_slopes],
  ] },
  { id: 'comp', name: 'Computation', modes: [
    ['k_more_pct', 'What number is __ more than __% of __?', k_more_pct], ['k_more_frac', 'What number is __ more than a fraction of __?', k_more_frac],
    ['k_less_frac', 'What number is __ less than a fraction of __?', k_less_frac], ['k_twice_frac', 'Twice as much as a fraction of __', k_twice_frac],
    ['k_twice_nonunit', 'Twice / three times as much as __ of __', k_twice_nonunit], ['k_frac_pct', 'A fraction of __ percent of __', k_frac_pct],
    ['k_frac_times', 'A fraction of __ times __', k_frac_times], ['k_frac_what', 'A fraction of what number is __ more than __?', k_frac_what],
    ['k_frac_what_times', 'A fraction of what number is __ times __?', k_frac_what_times], ['k_times_what', '__ times what number is __ times __?', k_times_what],
    ['k_mult_less', 'Multiplied by __ is __ less than __', k_mult_less], ['k_mult_more', 'Multiplied by __ is equal to __ more than __', k_mult_more],
    ['k_div_equal', 'Divided by __ is equal to __ divided by __', k_div_equal], ['k_sub_makes', 'Subtracted from __ makes __ more than __', k_sub_makes],
    ['k_sub_makes_less', 'Subtracted from __ makes __ less than __', k_sub_makes_less], ['k_sub_pct', 'Subtracted from __ is __% of __', k_sub_pct],
    ['k_sq_pct', 'Subtracted from a power is __% of __', k_sq_pct], ['k_added_pow', 'Added to a power is __% of __', k_added_pow],
    ['k_add_is_pct', 'Added to __ is __% of __', k_add_is_pct], ['k_leaves', 'Subtracted from __ leaves __ more than __ times __', k_leaves],
    ['k_leaves_less_frac', 'Subtracted from __ leaves __ less than a fraction of __', k_leaves_less_frac], ['k_left_half', '__ is __ less than half of what number?', k_left_half],
  ] },
];
export const MODES = Object.fromEntries(TYPES.flatMap(T => T.modes.map(([id, name, fn]) => [id, { id, name, fn, type: T.id, typeName: T.name }])));

// One question from a mode, with the choices shuffled and the answer letter recorded.
export function make(modeId) {
  const m = MODES[modeId];
  for (let tries = 0; tries < 60; tries++) {
    try {
      const q = m.fn(R), order = R.shuffle([0, 1, 2, 3]);
      return { ...q, mode: modeId, choices: order.map(i => q.choices[i]), ans: 'abcd'[order.indexOf(0)] };
    } catch (e) { if (!(e instanceof Retry)) throw e; }
  }
  throw new Error(`${modeId}: could not make a question`);
}
