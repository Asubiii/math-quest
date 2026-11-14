// Skill: missing angles (HSPT geometry). Complementary and supplementary angles, vertical angles,
// triangle angle sums, right and isosceles triangles, exterior angles and parallel lines.
// Each question draws its figure to scale as an SVG.

import { rand, pick, shuffle } from './numbers.js?v=1794692624';

const between = (a, b) => a + rand(b - a + 1);
const rad = d => d * Math.PI / 180;
const f = n => +n.toFixed(1);
const pt = (cx, cy, r, deg) => [f(cx + r * Math.cos(rad(deg))), f(cy - r * Math.sin(rad(deg)))];
const line = (a, b, cls = '') => `<line class="${cls}" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`;
// Arc from angle a0 to a1 (degrees, counter-clockwise, measured like on a protractor).
const arc = (cx, cy, r, a0, a1, cls) => { const s = pt(cx, cy, r, a0), e = pt(cx, cy, r, a1); return `<path class="arc ${cls}" d="M${s[0]} ${s[1]} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 0 ${e[0]} ${e[1]}"/>`; };
const text = (p, s, cls) => `<text class="${cls}" x="${p[0]}" y="${p[1]}">${s}</text>`;
// An angle at a point between two directions: arc plus its label ("65°" or "?").
function mark(cx, cy, a0, a1, label, r = 20) {
  const known = label !== '?', mid = (a0 + a1) / 2, span = a1 - a0;
  const lr = r + (span < 40 ? 24 : span < 60 ? 18 : 14);
  return arc(cx, cy, r, a0, a1, known ? 'known' : 'ask') + text(pt(cx, cy, lr, mid), known ? `${label}°` : '?', known ? 'lbl' : 'lbl ask');
}
const svg = body => `<svg class="diagram" viewBox="0 0 240 150" role="img" aria-label="Angle diagram">${body}</svg>`;
const dirDeg = (v, p) => Math.atan2(-(p[1] - v[1]), p[0] - v[0]) * 180 / Math.PI;
// Mark the interior angle at vertex v of a triangle (between the directions to p and q).
function markAt(v, p, q, label, r = 15) {
  let a = dirDeg(v, p), b = dirDeg(v, q);
  if (a > b) [a, b] = [b, a];
  if (b - a > 180) [a, b] = [b, a + 360];
  return mark(v[0], v[1], a, b, label, r);
}
function square(v, p, q, s = 9) {
  const u = x => { const d = [x[0] - v[0], x[1] - v[1]], l = Math.hypot(...d); return [d[0] / l * s, d[1] / l * s]; };
  const a = u(p), b = u(q);
  return `<path class="arc known" d="M${f(v[0] + a[0])} ${f(v[1] + a[1])} L${f(v[0] + a[0] + b[0])} ${f(v[1] + a[1] + b[1])} L${f(v[0] + b[0])} ${f(v[1] + b[1])}"/>`;
}
// Triangle with base angles A (left) and B (right), scaled to fit the box. Returns its three corners.
function triPoints(A, B, box = { x0: 28, x1: 212, y0: 22, y1: 128 }) {
  const C = 180 - A - B, ac = Math.sin(rad(B)) / Math.sin(rad(C));
  const cx = ac * Math.cos(rad(A)), cy = ac * Math.sin(rad(A));
  const xmin = Math.min(0, cx), xmax = Math.max(1, cx);
  const s = Math.min((box.x1 - box.x0) / (xmax - xmin), (box.y1 - box.y0) / cy);
  const ox = (box.x0 + box.x1) / 2 - ((xmin + xmax) / 2) * s;
  return [[f(ox), box.y1], [f(ox + s), box.y1], [f(ox + cx * s), f(box.y1 - cy * s)]];
}
const triPath = P => `<path class="shape" d="M${P[0]} L${P[1]} L${P[2]} Z"/>`;
function tick(p, q) {
  const m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], d = [q[0] - p[0], q[1] - p[1]], l = Math.hypot(...d), n = [-d[1] / l * 5, d[0] / l * 5];
  return line([f(m[0] - n[0]), f(m[1] - n[1])], [f(m[0] + n[0]), f(m[1] + n[1])], 'tick');
}

// Wrong answers: each named mistake, then near misses to fill.
function choices(correct, mistakes) {
  const out = [{ html: `${correct}°`, text: `${correct}°`, correct: true }], seen = new Set([correct]);
  const add = (v, tag) => { if (out.length < 4 && Number.isInteger(v) && v > 0 && v < 360 && !seen.has(v)) { seen.add(v); out.push({ html: `${v}°`, text: `${v}°`, correct: false, tag }); } };
  shuffle(mistakes).forEach(([v, tag]) => add(v, tag));
  shuffle([10, -10, 20, -20, 5, -5, 15, -15]).forEach(d => add(correct + d, 'arithmetic slip'));
  return shuffle(out);
}

const TYPES = {
  // "What is the complement of 35°?" (no figure)
  compWord(step) {
    const x = between(2, 16) * 5 + (step === 1 ? between(0, 4) : 0), ans = 90 - x;
    return { key: 'ang:complement-word', prompt: `<span class="word-q">complement of <b>${x}°</b></span>`, promptText: `Complement of ${x}°`, ask: 'Complementary angles add to 90°.',
      ans, mistakes: [[180 - x, 'used 180 instead of 90'], [x, 'repeated the given angle']], tip: `Complementary angles add to 90°: 90 − ${x} = <b>${ans}°</b>` };
  },
  suppWord(step) {
    const x = between(4, 32) * 5 + (step === 1 ? between(0, 4) : 0), ans = 180 - x;
    return { key: 'ang:supplement-word', prompt: `<span class="word-q">supplement of <b>${x}°</b></span>`, promptText: `Supplement of ${x}°`, ask: 'Supplementary angles add to 180°.',
      ans, mistakes: [[90 - x, 'used 90 instead of 180'], [x, 'repeated the given angle'], [360 - x, 'used 360']], tip: `Supplementary angles add to 180°: 180 − ${x} = <b>${ans}°</b>` };
  },
  // Two angles that make a right angle.
  complementary(step) {
    const x = between(4, 14) * 5 + (step === 1 ? between(0, 4) : 0), ans = 90 - x, V = [62, 128], flip = Math.random() < 0.5;
    const lo = flip ? '?' : x, hi = flip ? x : '?', cut = flip ? ans : x;
    const body = line(V, [205, 128], 'shape') + line(V, [62, 18], 'shape') + line(V, pt(V[0], V[1], 125, cut), 'shape') + square(V, [205, 128], [62, 18])
      + mark(V[0], V[1], 0, cut, lo, 34) + mark(V[0], V[1], cut, 90, hi, 50);
    return { key: 'ang:complementary', prompt: svg(body), promptText: `Right angle split: ${x}° + ? = 90°`, ask: 'The two angles make a right angle. Find <b>?</b>',
      ans, mistakes: [[180 - x, 'used 180 instead of 90'], [x, 'repeated the given angle']], tip: `A right angle is 90°: 90 − ${x} = <b>${ans}°</b>` };
  },
  // Two angles on a straight line.
  supplementary(step) {
    const x = between(6, 30) * 5 + (step === 1 ? between(0, 4) : 0), ans = 180 - x, V = [120, 118], flip = Math.random() < 0.5;
    const cut = flip ? ans : x;
    const body = line([18, 118], [222, 118], 'shape') + line(V, pt(V[0], V[1], 100, cut), 'shape')
      + mark(V[0], V[1], 0, cut, flip ? '?' : x, 24) + mark(V[0], V[1], cut, 180, flip ? x : '?', 24);
    return { key: 'ang:supplementary', prompt: svg(body), promptText: `Straight line: ${x}° + ? = 180°`, ask: 'The angles are on a straight line. Find <b>?</b>',
      ans, mistakes: [[Math.abs(90 - x), 'used 90 instead of 180'], [x, 'repeated the given angle'], [360 - x, 'used 360']], tip: `A straight line is 180°: 180 − ${x} = <b>${ans}°</b>` };
  },
  // Two crossing lines: the angle straight across is equal.
  vertical(step) {
    const x = between(6, 26) * 5 + (step === 1 ? between(0, 4) : 0), V = [120, 75], t = 12;
    const body = line(pt(V[0], V[1], 105, t), pt(V[0], V[1], 105, t + 180), 'shape') + line(pt(V[0], V[1], 72, t + x), pt(V[0], V[1], 72, t + x + 180), 'shape')
      + mark(V[0], V[1], t, t + x, x, 24) + mark(V[0], V[1], t + 180, t + x + 180, '?', 24);
    return { key: 'ang:vertical', prompt: svg(body), promptText: `Vertical angles: across from ${x}°`, ask: 'Two straight lines cross. Find the angle across, <b>?</b>',
      ans: x, mistakes: [[180 - x, 'used the neighbor angle (180 − x)'], [Math.abs(90 - x), 'used 90'], [360 - x, 'used 360']], tip: `Angles straight across from each other (vertical angles) are equal: <b>${x}°</b>` };
  },
  // Two crossing lines: the angle next to the given one.
  adjacent(step) {
    const x = between(6, 26) * 5 + (step === 1 ? between(0, 4) : 0), ans = 180 - x, V = [120, 75], t = 12;
    const body = line(pt(V[0], V[1], 105, t), pt(V[0], V[1], 105, t + 180), 'shape') + line(pt(V[0], V[1], 72, t + x), pt(V[0], V[1], 72, t + x + 180), 'shape')
      + mark(V[0], V[1], t, t + x, x, 24) + mark(V[0], V[1], t + x, t + 180, '?', 24);
    return { key: 'ang:adjacent', prompt: svg(body), promptText: `Crossing lines: next to ${x}°`, ask: 'Two straight lines cross. Find the angle next to it, <b>?</b>',
      ans, mistakes: [[x, 'thought neighbor angles are equal'], [Math.abs(90 - x), 'used 90'], [360 - x, 'used 360']], tip: `Neighbors on a straight line add to 180°: 180 − ${x} = <b>${ans}°</b>` };
  },
  triangle(step) {
    let A, B, C;
    do { A = between(6, 20) * 5 + (step === 1 ? between(0, 4) : 0); B = between(6, 20) * 5 + (step === 1 ? between(0, 4) : 0); C = 180 - A - B; } while (C < 25 || C > 115);
    const P = triPoints(A, B), ask = pick([0, 1, 2]), vals = [A, B, C], ans = vals[ask], given = vals.filter((_, i) => i !== ask);
    const lab = i => (i === ask ? '?' : vals[i]);
    const body = triPath(P) + markAt(P[0], P[1], P[2], lab(0)) + markAt(P[1], P[0], P[2], lab(1)) + markAt(P[2], P[0], P[1], lab(2));
    return { key: 'ang:triangle', prompt: svg(body), promptText: `Triangle: ${given[0]}°, ${given[1]}°, ?`, ask: 'Find the missing angle <b>?</b>',
      ans, mistakes: [[given[0] + given[1], 'added the two angles only'], [180 - given[0], 'subtracted only one angle'], [180 - given[1], 'subtracted only one angle'], [360 - given[0] - given[1], 'used 360 instead of 180']],
      tip: `Triangle angles add to 180°: 180 − ${given[0]} − ${given[1]} = <b>${ans}°</b>` };
  },
  rightTriangle(step) {
    const x = between(5, 13) * 5 + (step === 1 ? between(0, 4) : 0), ans = 90 - x;
    const P = triPoints(90, x), top = Math.random() < 0.5; // P[0] is the right-angle corner
    const body = triPath(P) + square(P[0], P[1], P[2]) + markAt(P[1], P[0], P[2], top ? x : '?') + markAt(P[2], P[0], P[1], top ? '?' : ans);
    const given = top ? x : ans, want = top ? ans : x;
    return { key: 'ang:right-triangle', prompt: svg(body), promptText: `Right triangle: 90°, ${given}°, ?`, ask: 'Right triangle. Find the missing angle <b>?</b>',
      ans: want, mistakes: [[180 - given, 'forgot the 90° corner'], [90 + given, 'added instead of subtracting'], [given, 'repeated the given angle']],
      tip: `The two small angles of a right triangle add to 90°: 90 − ${given} = <b>${want}°</b>` };
  },
  isosceles() {
    const base = between(7, 15) * 5, apex = 180 - 2 * base, askApex = Math.random() < 0.5;
    const P = triPoints(base, base);
    const body = triPath(P) + tick(P[0], P[2]) + tick(P[1], P[2])
      + (askApex ? markAt(P[0], P[1], P[2], base) + markAt(P[2], P[0], P[1], '?') : markAt(P[2], P[0], P[1], apex) + markAt(P[0], P[1], P[2], '?'));
    return askApex
      ? { key: 'ang:isosceles-top', prompt: svg(body), promptText: `Isosceles: base angle ${base}°, top ?`, ask: 'The marked sides are equal. Find the top angle <b>?</b>',
        ans: apex, mistakes: [[180 - base, 'subtracted only one base angle'], [base, 'thought all angles are equal'], [90 - base, 'used 90']], tip: `Both base angles are ${base}°: 180 − ${base} − ${base} = <b>${apex}°</b>` }
      : { key: 'ang:isosceles-base', prompt: svg(body), promptText: `Isosceles: top angle ${apex}°, base ?`, ask: 'The marked sides are equal. Find the base angle <b>?</b>',
        ans: base, mistakes: [[180 - apex, 'forgot to split between two angles'], [apex, 'thought all angles are equal'], [90 - apex, 'used 90']], tip: `The base angles are equal: (180 − ${apex}) ÷ 2 = <b>${base}°</b>` };
  },
  // Exterior angle = sum of the two far interior angles.
  exterior(step) {
    let A, C, B;
    do { A = between(6, 16) * 5 + (step === 1 ? between(0, 4) : 0); C = between(6, 16) * 5 + (step === 1 ? between(0, 4) : 0); B = 180 - A - C; } while (B < 35 || B > 110);
    const P = triPoints(A, B, { x0: 22, x1: 172, y0: 24, y1: 124 }), ext = [P[1][0] + 46, P[1][1]], ans = A + C;
    const body = triPath(P) + line(P[1], ext, 'shape') + markAt(P[0], P[1], P[2], A) + markAt(P[2], P[0], P[1], C) + markAt(P[1], ext, P[2], '?', 17);
    return { key: 'ang:exterior', prompt: svg(body), promptText: `Exterior angle: inside ${A}° and ${C}°`, ask: 'Find the outside angle <b>?</b>',
      ans, mistakes: [[B, 'found the inside angle instead'], [180 - A, 'used only one inside angle'], [180 - C, 'used only one inside angle']],
      tip: `An outside angle equals the two far inside angles: ${A} + ${C} = <b>${ans}°</b>` };
  },
  // Parallel lines cut by a third line.
  parallel(step) {
    const x = between(8, 24) * 5 + (step === 1 ? between(0, 4) : 0), same = Math.random() < 0.6, ans = same ? x : 180 - x;
    const y1 = 46, y2 = 108, dx = (y2 - y1) / Math.tan(rad(x)), T = [120 + dx / 2, y1], Bm = [120 - dx / 2, y2], e = 30;
    const ex = d => [f(d[0] + e * Math.cos(rad(x)) * 1), f(d[1] - e * Math.sin(rad(x)))], ex2 = d => [f(d[0] - e * Math.cos(rad(x))), f(d[1] + e * Math.sin(rad(x)))];
    const body = line([18, y1], [222, y1], 'shape') + line([18, y2], [222, y2], 'shape') + line(ex(T), ex2(Bm), 'shape')
      + text([212, y1 - 7], '▸', 'par') + text([212, y2 - 7], '▸', 'par')
      + mark(T[0], T[1], 0, x, x, 18) + (same ? mark(Bm[0], Bm[1], 0, x, '?', 18) : mark(Bm[0], Bm[1], x, 180, '?', 18));
    return { key: same ? 'ang:parallel-equal' : 'ang:parallel-supp', prompt: svg(body), promptText: `Parallel lines: ${x}° and ? (${same ? 'same position' : 'other side'})`, ask: 'The two flat lines are parallel. Find <b>?</b>',
      ans, mistakes: [[same ? 180 - x : x, same ? 'thought matching angles add to 180' : 'thought the angles are equal'], [Math.abs(90 - x), 'used 90'], [360 - x, 'used 360']],
      tip: same ? `Angles in the same position on parallel lines are equal: <b>${x}°</b>` : `It sits on a straight line next to a matching ${x}°: 180 − ${x} = <b>${ans}°</b>` };
  },
};

export function angles(rank) {
  const step = rank <= 3 ? 5 : 1; // multiples of 5 first, any whole number later
  const pool = rank <= 2 ? ['compWord', 'suppWord', 'complementary', 'supplementary', 'vertical', 'triangle', 'triangle']
    : rank <= 5 ? ['complementary', 'supplementary', 'vertical', 'adjacent', 'triangle', 'triangle', 'rightTriangle', 'isosceles', 'compWord', 'suppWord']
      : ['supplementary', 'vertical', 'adjacent', 'triangle', 'rightTriangle', 'isosceles', 'exterior', 'exterior', 'parallel', 'parallel'];
  const q = TYPES[pick(pool)](step);
  return { skill: 'angles', key: q.key, prompt: q.prompt, promptText: q.promptText, ask: q.ask, choices: choices(q.ans, q.mistakes), layout: 'grid', tip: q.tip };
}
