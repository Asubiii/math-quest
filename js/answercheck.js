// Independent answer checker for the Quant drill. It never looks at how a question was built: it reads
// the printed stem and the four choices, works the problem out from scratch, and says whether the keyed
// choice is the one and only right answer.
//   Comparisons: evaluates each of (A), (B), (C) and tests every answer statement.
//   Computation: turns the words into an equation ("what number" = x, "less than" flips, ...) and solves it.
//   Sequences:   plugs each choice in and finds the simplest rule the whole sequence then follows; the
//                keyed choice must fit a strictly simpler rule than every other choice.
// Geometric comparisons (answers come from the figure) are not checked here.
// check(q) returns null when the key is right, or a string describing the problem.

const EPS = 1e-9;
const eq = (a, b) => Math.abs(a - b) <= EPS * Math.max(1, Math.abs(a), Math.abs(b));
const L = 'abcd';
const WORDNUM = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };

// ---------------------------------------------------------------- text → plain math
function plain(s) {
  return String(s)
    .replace(/(\d+)<span class=['"]fr['"]><span>(\d+)<\/span><span>(\d+)<\/span><\/span>/g, '($1+$2/$3)')
    .replace(/<span class=['"]fr['"]><span>(\d+)<\/span><span>(\d+)<\/span><\/span>/g, '($1/$2)')
    .replace(/<sup>(.*?)<\/sup>/g, '^($1)')
    .replace(/<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, '')
    .replace(/[−–]/g, '-').replace(/×/g, '*').replace(/÷/g, '/')
    .replace(/(\d),(\d{3})/g, '$1$2').replace(/\$/g, '').replace(/&nbsp;/g, ' ');
}

// ---------------------------------------------------------------- expression evaluator
// + − × ÷ ^ % √, parentheses, implicit multiplication (3x, 2(x+1)), "of" as ×, variables.
function evaluate(src, vars = {}) {
  const toks = src.match(/\d+(?:\.\d+)?|\.\d+|[a-z]+|[-+*/^()%√]/g) || [];
  let i = 0;
  const peek = () => toks[i], take = () => toks[i++];
  const startsPrimary = t => t !== undefined && (/^[\d.]/.test(t) || t === '(' || t === '√' || /^[a-z]$/.test(t));
  function primary() {
    const t = take();
    if (t === undefined) throw new Error('unexpected end in ' + src);
    if (t === '(') { const v = sum(); if (take() !== ')') throw new Error('missing ) in ' + src); return v; }
    if (t === '√') return Math.sqrt(postfix());
    if (/^[\d.]/.test(t)) return parseFloat(t);
    if (/^[a-z]$/.test(t)) { if (!(t in vars)) throw new Error('unknown variable ' + t + ' in ' + src); return vars[t]; }
    throw new Error(`bad token "${t}" in ${src}`);
  }
  function postfix() {
    let v = primary();
    for (;;) {
      if (peek() === '%') { take(); v /= 100; } else if (peek() === '^') { take(); v = Math.pow(v, unary()); } else break;
    }
    return v;
  }
  function unary() { if (peek() === '-') { take(); return -unary(); } if (peek() === '+') { take(); return unary(); } return postfix(); }
  function product() {
    let v = unary();
    for (;;) {
      const t = peek();
      if (t === '*' || t === 'of') { take(); v *= unary(); } else if (t === '/') { take(); v /= unary(); } else if (startsPrimary(t)) v *= unary();
      else break;
    }
    return v;
  }
  function sum() {
    let v = product();
    for (;;) { const t = peek(); if (t === '+') { take(); v += product(); } else if (t === '-') { take(); v -= product(); } else break; }
    return v;
  }
  const v = sum();
  if (i !== toks.length) throw new Error(`leftover "${toks.slice(i).join(' ')}" in ${src}`);
  return v;
}

// ---------------------------------------------------------------- comparisons
const UNIT = { inch: 1, inches: 1, foot: 12, feet: 12, yard: 36, yards: 36, cup: 1, cups: 1, pint: 2, pints: 2, quart: 4, quarts: 4,
  gallon: 16, gallons: 16, minute: 1, minutes: 1, hour: 60, hours: 60, ounce: 1, ounces: 1, pound: 16, pounds: 16 };
function itemValue(text, vars) {
  let s = text.trim().replace(/\band\b/g, '+');
  s = s.replace(/(\([^()]*\)|\d+(?:\.\d+)?)\s*([a-z]+)\b/g, (m, n, u) => (u in UNIT ? `(${n}*${UNIT[u]})` : m));
  return evaluate(s, vars);
}

// One answer statement → function of {A, B, C}.
function statement(text) {
  let s = plain(text).trim().replace(/\.$/, '').replace(/\(([ABC])\)/g, '$1');
  const W = { 'is greater than': '>', 'is more than': '>', 'is less than': '<', 'is equal to': '=' };
  const rel = (op, a, b) => ({ '>': a > b + EPS * Math.max(1, Math.abs(b)), '<': a < b - EPS * Math.max(1, Math.abs(b)), '=': eq(a, b), '≠': !eq(a, b) }[op]);
  let m;
  const val = (e, d) => evaluate(e.replace(/[ABC]/g, k => `(${d[k]})`));
  if ((m = s.match(/^([ABC]) (is greater than|is less than|is more than|is equal to) ([ABC]) which is (greater|less) than ([ABC])$/))) {
    const [, a, r1, b, r2, c] = m; return d => rel(W[r1], d[a], d[b]) && rel(r2 === 'greater' ? '>' : '<', d[b], d[c]);
  }
  if ((m = s.match(/^([ABC]) (is greater than|is less than|is more than|is equal to) ([ABC]) or ([ABC])$/))) {
    const [, a, r, b, c] = m; return d => rel(W[r], d[a], d[b]) && rel(W[r], d[a], d[c]);
  }
  if ((m = s.match(/^([ABC]) is (equal to|more than|greater than|less than) ([ABC]) and (equal to|more than|greater than|less than) ([ABC])$/))) {
    const [, a, r1, b, r2, c] = m, R = { 'equal to': '=', 'more than': '>', 'greater than': '>', 'less than': '<' };
    return d => rel(R[r1], d[a], d[b]) && rel(R[r2], d[a], d[c]);
  }
  if ((m = s.match(/^([ABC]) and ([ABC]) are equal$/))) { const [, a, b] = m; return d => eq(d[a], d[b]); }
  if ((m = s.match(/^([ABC]) and ([ABC]) are greater than ([ABC])$/))) { const [, a, b, c] = m; return d => rel('>', d[a], d[c]) && rel('>', d[b], d[c]); }
  if (/^A, B, and C are equal$/.test(s)) return d => eq(d.A, d.B) && eq(d.B, d.C);
  // Number-relationship statements (Barron's "(A) 108 (B) 36 (C) 136" kind).
  s = s.replace(/^Half of/, '(1/2)*').replace(/one third of/g, '(1/3)*').replace(/ minus /g, ' - ')
    .replace(/^(\w+) times ([ABC])/i, (x, w, k) => (WORDNUM[w.toLowerCase()] ? `${WORDNUM[w.toLowerCase()]}*${k}` : x))
    .replace(/is (\w+) times larger than/, (x, w) => (WORDNUM[w] ? `= ${WORDNUM[w]}*` : x))
    .replace(/is (\w+) times ([ABC])/, (x, w, k) => (WORDNUM[w] ? `= ${WORDNUM[w]}*${k}` : x));
  for (const [w, o] of Object.entries(W)) s = s.split(w).join(o);
  // Symbolic chain: A − B > C, A = B ≠ C, B < C < A ...
  const parts = s.split(/\s*(>|<|=|≠)\s*/);
  if (parts.length < 3 || parts.length % 2 === 0 || parts.some((p, k) => k % 2 === 0 && !/^[ABC\d\s+\-*/().]+$/.test(p))) throw new Error('unparsed statement: ' + text);
  if (parts.length === 5 && parts[1] === '≠' && parts[3] === '≠') return d => { const v = [val(parts[0], d), val(parts[2], d), val(parts[4], d)]; return !eq(v[0], v[1]) && !eq(v[1], v[2]) && !eq(v[0], v[2]); };
  return d => { for (let k = 1; k < parts.length; k += 2) if (!rel(parts[k], val(parts[k - 1], d), val(parts[k + 1], d))) return false; return true; };
}

function checkComparison(q) {
  const lines = plain(q.stem).split('\n');
  const lead = lines[0];
  const items = {};
  for (const ln of lines.slice(1)) { const m = ln.match(/^\(([ABC])\)\s*(.*)$/); if (m) items[m[1]] = m[2]; }
  if (Object.keys(items).length !== 3) return 'could not read (A), (B), (C)';
  let samples;
  const fixed = lead.match(/if x = (-?[\d.]+)/);
  if (fixed) samples = [{ x: +fixed[1] }];
  else if (/x and y are both positive/.test(lead)) {
    const P = [0.1, 0.5, 1, 2, 3, 7, 10, 50];
    samples = P.flatMap(x => P.map(y => ({ x, y })));
  } else if (/x is positive/.test(lead)) samples = [0.1, 0.5, 1, 2, 3, 7, 10, 50, 1000].map(x => ({ x }));
  else samples = [{}];
  const ds = samples.map(v => ({ A: itemValue(items.A, v), B: itemValue(items.B, v), C: itemValue(items.C, v) }));
  if (ds.some(d => Object.values(d).some(x => !Number.isFinite(x)))) return 'an item does not evaluate';
  const truth = q.choices.map(c => { const f = statement(c); return ds.map(f); });
  const always = truth.map(t => t.every(Boolean));
  const k = L.indexOf(q.ans);
  if (!always[k]) return `keyed (${q.ans}) "${plain(q.choices[k])}" is not true (values ${JSON.stringify(ds[0])})`;
  const others = always.map((t, i) => (t && i !== k ? L[i] : null)).filter(Boolean);
  if (others.length) return `(${others.join(', ')}) is also true (values ${JSON.stringify(ds[0])})`;
  return null;
}

// ---------------------------------------------------------------- computation
function checkComputation(q) {
  let s = plain(q.stem).toLowerCase().replace(/\?$/, '').trim();
  s = s.replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/g, w => WORDNUM[w]);
  s = s.replace(/what number/g, ' x ').replace(/\bwhen\b/g, ' ')
    .replace(/(\d+) (half|third|fourth|fifth|sixth)s? of/g, (m, n, w) => ` (${n}/${{ half: 2, third: 3, fourth: 4, fifth: 5, sixth: 6 }[w]}) * `)
    .replace(/times as much as/g, ' * ')
    .replace(/twice as much as/g, ' 2 * ').replace(/twice/g, ' 2 * ').replace(/half of/g, ' (1/2) * ')
    .replace(/(\d+(?:\.\d+)?)\s*(%|percent) of/g, ' ($1/100) * ')
    .replace(/multiplied by/g, ' * ').replace(/\btimes\b/g, ' * ').replace(/divided by/g, ' / ').replace(/\bof\b/g, ' * ')
    .replace(/added to/g, ' + ').replace(/more than/g, ' + ').replace(/less than/g, ' LESS ').replace(/subtracted from/g, ' FROM ')
    .replace(/\b(is equal to|equals|is|makes|leaves)\b/g, ' = ');
  const sides = s.split('=');
  if (sides.length !== 2) return 'could not read the equation: ' + s;
  // An additive side is terms joined by +, LESS (flip) and FROM (flip); each term is ordinary math.
  const side = (txt, x) => {
    const bits = txt.split(/\s+(\+|LESS|FROM)\s+/);
    let v = evaluate(bits[0].trim(), { x });
    for (let k = 1; k < bits.length; k += 2) { const t = evaluate(bits[k + 1].trim(), { x }); v = bits[k] === '+' ? v + t : t - v; }
    return v;
  };
  const f = x => side(sides[0], x) - side(sides[1], x);
  const f0 = f(0), f1 = f(1);
  if (eq(f1, f0)) return 'equation has no single solution: ' + s;
  const x = -f0 / (f1 - f0);
  if (!eq(f(x), 0) || !eq(f(2) - f0, 2 * (f1 - f0))) return 'equation is not linear: ' + s;
  const vals = q.choices.map(c => evaluate(plain(c)));
  const k = L.indexOf(q.ans);
  if (!eq(vals[k], x)) return `keyed (${q.ans}) ${plain(q.choices[k])} but the words give ${x} (${s})`;
  const dup = vals.map((v, i) => (i !== k && eq(v, x) ? L[i] : null)).filter(Boolean);
  if (dup.length) return `(${dup.join(', ')}) also equals ${x}`;
  return null;
}

// ---------------------------------------------------------------- sequences
const ROMAN = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
function fromRoman(s) {
  if (!/^M*(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/.test(s) || !s) return null;
  let v = 0; for (let k = 0; k < s.length; k++) { const a = ROMAN[s[k]], b = ROMAN[s[k + 1]] || 0; v += a < b ? -a : a; } return v;
}
// A term → list of numeric components (numbers stay numbers, each letter is its place in the alphabet).
function components(term, roman) {
  const t = plain(term).trim();
  if (roman) { const v = fromRoman(t); return v === null ? null : [v]; }
  const toks = t.match(/-?\(\d+(?:\+\d+)?\/\d+\)|-?\d+(?:\.\d+)?|[A-Z]/g);
  if (!toks) return null;
  return toks.map(x => (/^[A-Z]$/.test(x) ? x.charCodeAt(0) - 64 : evaluate(x)));
}

// Simplest-rule complexity a fully known sequence fits (Infinity if none). Rules: the same step each time
// (+c or ×c), two steps taking turns, two or three series mixed together, a number then a function of it,
// steps that themselves change by a rule, ratios that change by the same amount. A rule only counts as
// "found" when the sequence has more terms than the rule has free numbers; when it has exactly as many,
// the rule is only a weak fit (complexity + 10).
// A step "×c" only counts when c is a whole number, one over a whole number, or a half-step like 1.5:
// test-makers don't use ×8/7, and allowing it makes coincidences (49, 56, 64) look like rules.
const niceRatio = r => [r, 1 / r, 2 * r].some(v => Math.abs(v - Math.round(v)) < 1e-9 && Math.round(v) !== 0);
// Which step types fit phase ph of "s[i+1] = op_(i mod p)(s[i])": a set drawn from {'add', 'mul'}.
function phaseTypes(seq, p, ph) {
  const pairs = [];
  for (let i = ph; i + 1 < seq.length; i += p) pairs.push([seq[i], seq[i + 1]]);
  if (!pairs.length) return null;
  const t = new Set();
  if (pairs.every(([a, b]) => eq(b - a, pairs[0][1] - pairs[0][0]))) t.add('add');
  if (pairs.every(([a]) => a !== 0) && niceRatio(pairs[0][1] / pairs[0][0]) && pairs.every(([a, b]) => eq(b / a, pairs[0][1] / pairs[0][0]))) t.add('mul');
  return t;
}
function fitOps(seq, p) {
  for (let ph = 0; ph < p; ph++) { const t = phaseTypes(seq, p, ph); if (!t || !t.size) return false; }
  return true;
}
const opType = s => { const t = phaseTypes(s, 1, 0); return t && t.size ? t : null; };
const diffs = s => s.slice(1).map((v, i) => v - s[i]);
const ratios = s => (s.some(v => v === 0) ? null : s.slice(1).map((v, i) => v / s[i]));
const every = (s, p, j) => s.filter((_, i) => i % p === j);
// Each family: [complexity, terms needed for a confirmed fit, terms needed for a weak fit, test].
// A confirmed fit has at least one more term than the rule has free numbers; a weak fit only has
// exactly enough (complexity + 10).
function rulesFit(s) {
  const n = s.length, out = [];
  const add = (c, conf, weak, ok) => { if (n >= weak && ok()) out.push(n >= conf ? c : c + 10); };
  add(1, 3, 2, () => fitOps(s, 1));                                                      // same step each time
  add(2, 4, 3, () => fitOps(s, 2));                                                      // two steps take turns
  // two series mixed together; both the same kind of step is simpler than one + and one ×
  const sub2 = [every(s, 2, 0), every(s, 2, 1)].map(opType);
  if (sub2.every(Boolean) && every(s, 2, 1).length >= 2) {
    const same = [...sub2[0]].some(t => sub2[1].has(t));
    add(same ? 2 : 3, 5, 4, () => true);
  }
  // a number, then a function of it (3, 27, 5, 45 / 4, 16, 5, 25 / 81, 9, 64, 8)
  const base = every(s, 2, 0), pr = base.map((b, k) => [b, s[2 * k + 1]]).filter(x => x[1] !== undefined);
  const rel = pr.length >= 2 && [
    ([a, b]) => eq(b - a, pr[0][1] - pr[0][0]), ([a, b]) => a !== 0 && eq(b / a, pr[0][1] / pr[0][0]),
    ([a, b]) => eq(b, a * a), ([a, b]) => eq(a, b * b)].some(f => pr.every(f));
  add(2, 5, 4, () => rel && base.length >= 2 && fitOps(base, 1));
  add(3, 6, 5, () => rel && base.length >= 3 && fitOps(diffs(base), 1));
  add(3, 4, 3, () => fitOps(diffs(s), 1));                                               // steps change by a rule
  add(3, 4, 3, () => { const r = ratios(s); return !!r && r.length >= 2 && r.slice(1).every((v, i) => eq(v - r[i], r[1] - r[0])); });
  add(4, 6, 5, () => fitOps(diffs(s), 2));                                               // steps change by two turns
  add(4, 7, 6, () => [0, 1].every(j => { const t = every(s, 2, j); return t.length >= 3 && (fitOps(t, 1) || fitOps(diffs(t), 1)); }));
  add(5, 6, 4, () => fitOps(s, 3));                                                      // three steps take turns
  add(5, 9, 6, () => [0, 1, 2].every(j => every(s, 3, j).length >= 2 && fitOps(every(s, 3, j), 1)));
  return out.length ? Math.min(...out) : Infinity;
}
function seqComplexity(terms, roman) {
  const cs = terms.map(t => components(t, roman));
  if (cs.some(c => !c) || cs.some(c => c.length !== cs[0].length)) return Infinity;
  let worst = 0;
  for (let j = 0; j < cs[0].length; j++) worst = Math.max(worst, rulesFit(cs.map(c => c[j])));
  return worst;
}

function checkSequence(q) {
  const st = plain(q.stem);
  const m = st.match(/^In the sequence:? (.*?),? (?:\. \. \. ,|,)? ?((?:what|one number)[^]*)$/);
  if (!m) return 'could not read the sequence';
  const terms = m[1].split(/,\s*/).map(x => x.trim()).filter(Boolean), ask = m[2];
  const isBlank = t => /^_+$/.test(t);
  const choiceTerms = q.choices.map(c => plain(c).split(/,\s*/).map(x => x.trim()));
  const allTerms = [...terms.filter(t => !isBlank(t)), ...choiceTerms.flat()];
  const romanOK = allTerms.every(t => fromRoman(t) !== null);
  const score = romans => q.choices.map((_, i) => {
    const ct = choiceTerms[i];
    if (/wrong/.test(ask)) {
      if (ct.length !== 1) return Infinity;
      return Math.min(...terms.map((_, k) => seqComplexity(terms.map((t, j) => (j === k ? ct[0] : t)), romans)));
    }
    const blanks = terms.filter(isBlank).length;
    if (blanks) {
      if (ct.length !== blanks) return Infinity;
      let b = 0; return seqComplexity(terms.map(t => (isBlank(t) ? ct[b++] : t)), romans);
    }
    return seqComplexity([...terms, ...ct], romans);
  });
  let sc = score(romanOK);
  if (romanOK && sc.every(v => v === Infinity)) sc = score(false);
  const k = L.indexOf(q.ans);
  if (sc[k] === Infinity) return `keyed (${q.ans}) ${plain(q.choices[k])} fits no rule I know (${terms.join(', ')})`;
  const tie = sc.map((v, i) => (i !== k && v <= sc[k] ? `(${L[i]}) ${plain(q.choices[i])}` : null)).filter(Boolean);
  if (tie.length) return `${tie.join(' and ')} fits a rule as simple as the keyed (${q.ans}) ${plain(q.choices[k])} (${terms.join(', ')}; scores ${sc})`;
  return null;
}

export function check(q, type) {
  try {
    if (type === 'seq') return checkSequence(q);
    if (type === 'cmp') return checkComparison(q);
    if (type === 'comp') return checkComputation(q);
    return null;
  } catch (e) { return 'checker error: ' + e.message; }
}
export const _internal = { evaluate, statement, plain, seqComplexity };
