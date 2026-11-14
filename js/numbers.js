// Exact fraction helpers and the display formats the game uses.

export const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
export const R = (n, d = 1) => { const g = gcd(n, d) || 1; return { n: n / g, d: d / g }; };
export const val = r => r.n / r.d;
export const eq = (a, b) => a.n * b.d === b.n * a.d;
export const cmp = (a, b) => Math.sign(a.n * b.d - b.n * a.d);
export const mul = (a, k) => R(a.n * k, a.d);
export const key = r => `${r.n}/${r.d}`;

// Long division: integer part, non-repeating digits and the repeating block.
function divide(n, d) {
  const int = Math.floor(n / d);
  let rem = n % d;
  const digits = [], seen = new Map();
  while (rem !== 0 && !seen.has(rem)) {
    seen.set(rem, digits.length);
    rem *= 10;
    digits.push(Math.floor(rem / d));
    rem %= d;
  }
  if (rem === 0) return { int, fixed: digits.join(''), rep: '' };
  const at = seen.get(rem);
  return { int, fixed: digits.slice(0, at).join(''), rep: digits.slice(at).join('') };
}

export const terminates = r => divide(r.n, r.d).rep === '';

// 3/8 -> "0.375", 1/3 -> "0.333…", 1/6 -> "0.166…", 5/4 -> "1.25"
export function decStr(r) {
  const { int, fixed, rep } = divide(r.n, r.d);
  if (!fixed && !rep) return String(int);
  if (!rep) return `${int}.${fixed}`;
  let tail = fixed, reps = 0;
  while (tail.length < 3 || reps < 2) { tail += rep; reps++; }
  return `${int}.${tail}…`;
}

const VULGAR = { '1/3': '⅓', '2/3': '⅔' };
// Percent of a value: 3/8 -> "37.5%", 1/3 -> "33⅓%". Returns null when there is no tidy form.
export function pctStr(r) {
  const p = R(r.n * 100, r.d);
  if (terminates(p)) return decStr(p) + '%';
  const whole = Math.floor(p.n / p.d), frac = R(p.n - whole * p.d, p.d);
  const v = VULGAR[key(frac)];
  return v ? `${whole || ''}${v}%` : null;
}

// HTML for a stacked fraction (mixed number when improper).
export function fracHTML(r) {
  if (r.d === 1) return String(r.n);
  const whole = Math.floor(r.n / r.d), n = r.n - whole * r.d;
  const f = `<span class="frac"><span>${n}</span><span>${r.d}</span></span>`;
  return whole ? `<span class="mixed">${whole}${f}</span>` : f;
}
// Plain text form for reports: "3/8", "1 1/4".
export function fracText(r) {
  if (r.d === 1) return String(r.n);
  const whole = Math.floor(r.n / r.d), n = r.n - whole * r.d;
  return whole ? `${whole} ${n}/${r.d}` : `${n}/${r.d}`;
}

export const rand = n => Math.floor(Math.random() * n);
export const pick = a => a[rand(a.length)];
export function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
