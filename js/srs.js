// Anki-style spaced repetition (the SM-2 scheduler Anki uses), with Anki's default settings:
// learning steps 1m and 10m, relearning step 10m, graduating interval 1 day, easy interval 4 days,
// starting ease 250%. 15 new cards a day (Anki's default is 20).

export const NEW_PER_DAY = 15; // enough for a 15-minute session
const LEARN = [1, 10], RELEARN = [10], GRAD = 1, EASY = 4, MIN = 60000, DAY = 86400000;

const startOfDay = (t = Date.now()) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
const dayDue = days => startOfDay() + Math.round(days) * DAY + 4 * 3600000; // reviews come due at 4am, like Anki
export const fresh = () => ({ state: 'new', due: 0, ivl: 0, ease: 2.5, step: 0, reps: 0, lapses: 0 });

// Returns the new card state for a rating: 1 Again, 2 Hard, 3 Good, 4 Easy.
export function answer(c, rating, now = Date.now()) {
  c = { ...c, reps: c.reps + 1, last: now };
  if (c.state === 'new' || c.state === 'learn') {
    c.state = 'learn';
    if (rating === 1) { c.step = 0; c.due = now + LEARN[0] * MIN; }
    else if (rating === 2) { c.due = now + (c.step === 0 ? (LEARN[0] + LEARN[1]) / 2 : LEARN[c.step]) * MIN; }
    else if (rating === 3) {
      if (c.step + 1 < LEARN.length) { c.step++; c.due = now + LEARN[c.step] * MIN; }
      else Object.assign(c, { state: 'review', ivl: GRAD, due: dayDue(GRAD) });
    } else Object.assign(c, { state: 'review', ivl: EASY, due: dayDue(EASY) });
    return c;
  }
  if (c.state === 'relearn') {
    if (rating === 1) { c.due = now + RELEARN[0] * MIN; }
    else Object.assign(c, { state: 'review', ivl: rating === 4 ? c.ivl + 1 : c.ivl, due: dayDue(rating === 4 ? c.ivl + 1 : c.ivl) });
    return c;
  }
  // review
  if (rating === 1) { Object.assign(c, { state: 'relearn', lapses: c.lapses + 1, ease: Math.max(1.3, c.ease - 0.2), ivl: Math.max(1, Math.round(c.ivl * 0.5)), due: now + RELEARN[0] * MIN }); return c; }
  if (rating === 2) { c.ease = Math.max(1.3, c.ease - 0.15); c.ivl = Math.max(c.ivl + 1, Math.round(c.ivl * 1.2)); }
  else if (rating === 3) { c.ivl = Math.max(c.ivl + 1, Math.round(c.ivl * c.ease)); }
  else { c.ivl = Math.max(c.ivl + 1, Math.round(c.ivl * c.ease * 1.3)); c.ease += 0.15; }
  c.due = dayDue(c.ivl);
  return c;
}

// Short label for when a rating would show the card again: "1m", "10m", "1d", "3mo".
export function preview(c, rating) {
  const n = answer(c, rating), ms = n.due - Date.now();
  if (n.state === 'learn' || n.state === 'relearn') return `${Math.max(1, Math.round(ms / MIN))}m`;
  const d = n.ivl;
  return d < 30 ? `${d}d` : d < 365 ? `${Math.round(d / 30)}mo` : `${(d / 365).toFixed(1)}y`;
}

// Stable pseudo-random number in [0, 1) from a string, so the new-card order holds for a whole day.
function hash01(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 1e6) / 1e6; }

// What to study next. cards: [{id, topic, ...}], states: {id: state}, newToday: count already introduced today.
// opts.weight(card) >= 1: topics with more Focus get their new cards first and their reviews earlier
//   (a weight-3 topic's review comes due after a third of its interval).
// opts.bumped(card): time the card's topic was last missed or marked Hard on a packet; a card not
//   reviewed since then comes due again now.
export function queue(cards, states, newToday, now = Date.now(), opts = {}) {
  const st = id => states[id] || fresh();
  const w = c => Math.max(1, (opts.weight && opts.weight(c)) || 1), bumped = c => (opts.bumped && opts.bumped(c)) || 0;
  const learning = cards.filter(c => ['learn', 'relearn'].includes(st(c.id).state));
  const learnNow = learning.filter(c => st(c.id).due <= now).sort((a, b) => st(a.id).due - st(b.id).due);
  const isDue = c => { const s = st(c.id); return s.due - (1 - 1 / w(c)) * s.ivl * DAY <= now || bumped(c) > (s.last || 0); };
  const reviews = cards.filter(c => st(c.id).state === 'review' && isDue(c)).sort((a, b) => w(b) - w(a) || st(a.id).due - st(b.id).due);
  const day = new Date(now).toDateString();
  const news = cards.filter(c => st(c.id).state === 'new')
    .map(c => [c, -Math.log(1 - hash01(c.id + day)) / w(c)]).sort((a, b) => a[1] - b[1]).map(x => x[0])
    .slice(0, Math.max(0, NEW_PER_DAY - newToday));
  const laterLearn = learning.filter(c => st(c.id).due > now).sort((a, b) => st(a.id).due - st(b.id).due);
  const next = learnNow[0] || reviews[0] || news[0] || null;
  return { next, counts: { new: news.length, learn: learning.length, due: reviews.length }, nextLearnAt: laterLearn[0] ? st(laterLearn[0].id).due : null };
}
