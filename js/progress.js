// Saved progress on this device: nickname, speed rank per skill, fact memory (spaced repetition),
// missed questions to retry, and which monsters have been beaten in which skill.

export const GOALS = [60, 45, 35, 28, 22, 17, 13, 10, 8, 6];     // seconds per answer, rank 1..10
export const GOAL_SCALE = { compare: 1, frac2dec: 1, pct: 1, angles: 1.5 }; // angle sums take a step or two of arithmetic
export const MAX_RANK = GOALS.length;
export const goalFor = (skill, rank) => GOALS[Math.min(rank, MAX_RANK) - 1] * GOAL_SCALE[skill];
export const baseDamage = rank => 10 + 3 * (Math.min(rank, MAX_RANK) - 1);
export const MIXED_UNLOCK = 1; // rank needed in each of the other three skills (1 = always open)

const KEY = 'math-quest-save-v1';
const blank = () => ({
  name: '', created: Date.now(), device: Math.random().toString(36).slice(2, 10),
  ranks: { compare: 1, frac2dec: 1, pct: 1, angles: 1 },
  stars: {},            // monsterId -> [skills beaten]
  facts: {},            // fact key -> { box, seen, right, wrong, slow }
  retry: { compare: [], frac2dec: [], pct: [], angles: [] },
  best: {},             // skill -> { combo, avg }
  fights: 0,
});

let save = blank();
try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.ranks) save = { ...blank(), ...s, ranks: { ...blank().ranks, ...s.ranks }, retry: { ...blank().retry, ...(s.retry || {}) } }; } catch { /* storage unavailable: play without saving */ }
if ((save.v || 1) < 2) { save.retry = blank().retry; save.v = 2; } // question formats changed in v2: drop old saved questions
export const state = () => save;
export function persist() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch { /* ignore */ } }
export function resetAll() { const name = save.name; save = blank(); save.name = name; persist(); }

export const mixedUnlocked = () => ['compare', 'frac2dec', 'pct'].every(s => save.ranks[s] >= MIXED_UNLOCK);

// ----- Memory used by the question generators -----
const WEIGHT = [7, 4, 2.5, 1.5, 1];
export function memoryFor(recent) {
  return {
    pickKey(keys) {
      const pool = keys.filter(k => !recent.includes(k));
      const list = pool.length ? pool : keys;
      const w = list.map(k => WEIGHT[save.facts[k]?.box ?? 0]);
      let x = Math.random() * w.reduce((a, b) => a + b, 0);
      for (let i = 0; i < list.length; i++) { x -= w[i]; if (x <= 0) return list[i]; }
      return list[list.length - 1];
    },
    takeRetry(skill) {
      const q = save.retry[skill];
      if (!q.length || Math.random() > 0.3) return null;
      const i = q.findIndex(x => !recent.includes(x.key));
      return i < 0 ? null : q[i];
    },
  };
}

// outcome: 'fast' (correct, before timer), 'late' (correct after timer), 'wrong'
export function recordAnswer(q, outcome) {
  const f = save.facts[q.key] || (save.facts[q.key] = { box: 0, seen: 0, right: 0, wrong: 0, slow: 0 });
  f.seen++;
  if (outcome === 'fast') { f.right++; f.box = Math.min(4, f.box + 1); }
  else if (outcome === 'late') { f.right++; f.slow++; f.box = Math.max(0, f.box - 1); }
  else { f.wrong++; f.box = 0; }
  // Missed or slow questions come back later (kept as the full question so it can be re-asked).
  const list = save.retry[q.skill], i = list.findIndex(x => x.key === q.key);
  if (outcome === 'fast') { if (i >= 0) list.splice(i, 1); }
  else if (i < 0) { const { retry, ...plain } = q; list.push(plain); if (list.length > 12) list.shift(); }
}

export function awardStar(monsterId, skill) {
  const s = save.stars[monsterId] || (save.stars[monsterId] = []);
  if (!s.includes(skill)) s.push(skill);
}
