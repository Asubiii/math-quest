// Flashcards page: Anki-style review of the HSPT deck, limited to the topics the tutor has turned on.
// Progress is saved on the device and copied to the tutor's sheet, so it carries between sessions.
import { answer, preview, queue } from './srs.js?v=1794692624';
import { connected, getJSON, today } from './sync.js?v=1794692624';
import { queueReport } from './report.js?v=1794692624';
import { minutesToday, GOAL_MIN } from './timer.js?v=1794692624';

const KEY = 'math-quest-flash-v1';
export const DEFAULT_TOPICS = ['Fractions', 'Decimals', 'Conversions'];
const $ = s => document.querySelector(s);

let deck = null, cur = null, shown = false, pushTimer = null;
let data = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; } })()
  || { states: {}, topics: DEFAULT_TOPICS, newDay: '', newCount: 0, updated: 0 };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* ignore */ } };

export async function loadDeck() { if (!deck) deck = await fetch('assets/cards.json').then(r => r.json()); return deck; }

// Get the tutor's topic switches and the newest saved progress from the sheet.
export async function pull() {
  if (!connected()) return false;
  try {
    const r = await getJSON('student');
    if (Array.isArray(r.topics)) data.topics = r.topics;
    if (r.flash && (r.flash.updated || 0) > (data.updated || 0)) Object.assign(data, r.flash);
    save();
    return true;
  } catch { return false; }
}
function pushSoon() {
  clearTimeout(pushTimer);
  pushTimer = setTimeout(pushNow, 20000);
}
export function pushNow() {
  clearTimeout(pushTimer);
  const { states, newDay, newCount, updated } = data;
  queueReport({ action: 'flashState', flash: { states, newDay, newCount, updated } });
}
document.addEventListener('visibilitychange', () => { if (document.hidden && pushTimer) pushNow(); });

const activeCards = () => deck.cards.filter(c => data.topics.includes(c.topic));
function newToday() { if (data.newDay !== today()) { data.newDay = today(); data.newCount = 0; } return data.newCount; }
export async function summary() {
  await loadDeck();
  const q = queue(activeCards(), data.states, newToday());
  return { ...q.counts, topics: data.topics.length };
}

export async function openFlash() {
  await loadDeck();
  await pull();
  shown = false;
  render();
}

function cardHTML(c, back) {
  let h = `<div class="ak-topic">${c.topic}</div><div class="ak-q">${c.q}</div>`;
  if (back) {
    h += `<div class="ak-a">${c.a}</div>`;
    if (c.ex.length) h += `<div class="ak-ex"><div class="ak-exh">Example</div>${c.ex.map(l => `<div>${l}</div>`).join('')}</div>`;
    if (c.dia) h += `<img class="ak-dia" src="${c.dia}" alt="">`;
  }
  return h;
}

function render() {
  const q = queue(activeCards(), data.states, newToday());
  cur = q.next;
  $('#ak-new').textContent = q.counts.new; $('#ak-learn').textContent = q.counts.learn; $('#ak-due').textContent = q.counts.due;
  $('#ak-time').textContent = `${minutesToday('flash')} / ${GOAL_MIN} min today`;
  const card = $('#ak-card'), btns = $('#ak-buttons');
  if (!data.topics.length) {
    card.innerHTML = '<div class="ak-done"><h2>No topics yet</h2><p>Your tutor turns on topics from your practice packets. Check back after your next answer sheet.</p></div>';
    btns.innerHTML = ''; return;
  }
  if (!cur) {
    const wait = q.nextLearnAt ? Math.max(1, Math.ceil((q.nextLearnAt - Date.now()) / 60000)) : null;
    card.innerHTML = `<div class="ak-done"><h2>Done for now! 🎉</h2><p>${wait ? `A card you're still learning comes back in ${wait} minute${wait > 1 ? 's' : ''}.` : 'You finished today\'s cards. New ones unlock tomorrow.'}</p>
      <p class="ak-topics">Topics: ${data.topics.join(', ')}</p></div>`;
    btns.innerHTML = wait ? '<button class="btn" id="ak-refresh">Check again</button>' : '';
    if (wait) { $('#ak-refresh').onclick = render; clearTimeout(render.t); render.t = setTimeout(() => { if (!$('#flash').hidden) render(); }, Math.min(wait * 60000, 600000)); }
    return;
  }
  card.innerHTML = cardHTML(cur, shown);
  if (!shown) {
    btns.innerHTML = '<button class="btn primary ak-show" id="ak-show">Show answer</button>';
    $('#ak-show').onclick = () => { shown = true; render(); };
  } else {
    const st = data.states[cur.id] || { state: 'new', due: 0, ivl: 0, ease: 2.5, step: 0, reps: 0, lapses: 0 };
    btns.innerHTML = [['Again', 1, 'again'], ['Hard', 2, 'hard'], ['Good', 3, 'good'], ['Easy', 4, 'easy']]
      .map(([l, r, c]) => `<button class="ak-rate ${c}" data-r="${r}"><small>${preview(st, r)}</small>${l}</button>`).join('');
    btns.querySelectorAll('.ak-rate').forEach(b => b.onclick = () => rate(+b.dataset.r));
  }
}

function rate(r) {
  if (!cur) return;
  const before = data.states[cur.id];
  if (!before || before.state === 'new') data.newCount = newToday() + 1;
  data.states[cur.id] = answer(before || { state: 'new', due: 0, ivl: 0, ease: 2.5, step: 0, reps: 0, lapses: 0 }, r);
  data.updated = Date.now();
  save();
  queueReport({ action: 'review', date: today(), card: cur.id, topic: cur.topic, rating: r, ivl: data.states[cur.id].ivl });
  pushSoon();
  shown = false;
  render();
}

addEventListener('keydown', e => {
  if ($('#flash').hidden || e.target.tagName === 'INPUT') return;
  if (!shown && (e.key === ' ' || e.key === 'Enter') && cur) { e.preventDefault(); shown = true; render(); }
  else if (shown && ['1', '2', '3', '4'].includes(e.key)) rate(+e.key);
  else if (shown && e.key === ' ') { e.preventDefault(); rate(3); }
});

export const flashData = () => data;
