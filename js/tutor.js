// Tutor page: set how much each topic is practiced (its Focus level), and see the student's progress.
// Every request carries the password; the Google Apps Script checks it before returning anything.
import { connected, postJSON, today } from './sync.js?v=1794958762';
import { loadDeck } from './flash.js?v=1794958762';

const $ = s => document.querySelector(s);
const PW_KEY = 'math-quest-tutor-pw';
const MAX_FOCUS = 5;
// SHA-256 of the tutor password, used only to show the page when the sheet is not connected yet.
// The data itself is protected by the check in the Apps Script.
const PW_HASH = '238f7723b8b8ede20e96a2b50ae29ceae31cc807bff9de7496e85309f66a0f40';

async function sha256(s) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
export const savedPassword = () => { try { return sessionStorage.getItem(PW_KEY); } catch { return null; } };

export async function tutorLogin(pw) {
  if (connected()) {
    try { const r = await postJSON({ action: 'tutor', op: 'login', password: pw }); if (!r.ok) return 'Wrong password.'; }
    catch { return 'Could not reach the Google Sheet. Check the internet connection.'; }
  } else if (await sha256(pw) !== PW_HASH) return 'Wrong password.';
  try { sessionStorage.setItem(PW_KEY, pw); } catch { /* ignore */ }
  return null;
}
export function tutorLogout() { try { sessionStorage.removeItem(PW_KEY); } catch { /* ignore */ } }

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const dayName = d => new Date(d + 'T12:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
const asDay = v => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : today(new Date(v)));

export async function openTutor() {
  const box = $('#tutor-body');
  if (!connected()) {
    box.innerHTML = `<div class="t-card"><h2>Connect the Google Sheet</h2>
      <p>The tutor page reads Victoria's progress from your private Google Sheet, which isn't connected yet.
      Follow "Reporting setup" in the repository README, then paste the web app URL into <code>js/config.js</code>.</p></div>`;
    return;
  }
  box.innerHTML = '<p class="t-muted">Loading…</p>';
  let d;
  try { d = await postJSON({ action: 'tutor', op: 'dashboard', password: savedPassword() }); }
  catch { box.innerHTML = '<p class="t-muted">Could not reach the Google Sheet.</p>'; return; }
  if (!d.ok) { box.innerHTML = '<p class="t-muted">The sheet refused the password. Sign out and sign in again.</p>'; return; }
  const deck = await loadDeck();
  render(d, deck);
}

function render(d, deck) {
  const states = d.flash?.states || {};
  const on = new Map(d.topics.map(t => [t.topic, t]));
  // Last 14 days of activity
  const days = [...Array(14)].map((_, i) => { const t = new Date(); t.setDate(t.getDate() - i); return today(t); }).filter(x => { const g = new Date(x + 'T12:00').getDay(); return g > 0 && g < 6; });
  const mins = (day, page) => Math.round(d.time.filter(r => asDay(r[0]) === day && r[1] === page).reduce((a, r) => a + Number(r[2] || 0), 0) / 60);
  const pk = day => { const rows = d.packets.filter(r => asDay(r[0]) === day); if (!rows.length) return '–'; const right = rows.filter(r => r[7] === 'right').length; return `${right}/${rows.length}`; };
  const reviewsOn = day => d.reviews.filter(r => asDay(r[0]) === day).length;
  const activity = `<table class="t-table"><tr><th>Day</th><th>Speed Study</th><th>Flashcards</th><th>Cards reviewed</th><th>Packet</th></tr>
    ${days.map(x => { const s = mins(x, 'speed'), f = mins(x, 'flash'); return `<tr><td>${dayName(x)}</td><td class="${s >= 15 ? 'ok' : s ? 'part' : ''}">${s} min</td><td class="${f >= 15 ? 'ok' : f ? 'part' : ''}">${f} min</td><td>${reviewsOn(x)}</td><td>${pk(x)}</td></tr>`; }).join('')}</table>`;

  // Topics with stats, highest Focus first
  const focusOf = t => Number((on.get(t) || {}).focus) || 0;
  const order = deck.topics.map((t, i) => [t, i]).sort((a, b) => focusOf(b[0]) - focusOf(a[0]) || a[1] - b[1]).map(x => x[0]);
  const topicRows = order.map(t => {
    const cards = deck.cards.filter(c => c.topic === t), st = cards.map(c => states[c.id]).filter(Boolean);
    const mature = st.filter(s => s.state === 'review' && s.ivl >= 21).length, seen = st.length;
    const recent = d.reviews.filter(r => r[2] === t), again = recent.filter(r => Number(r[3]) === 1).length;
    const info = on.get(t) || {};
    const f = focusOf(t);
    return `<tr><td><div class="focus" data-topic="${esc(t)}"><button type="button" class="f-btn" data-d="-1" aria-label="Less focus on ${esc(t)}" ${f <= 0 ? 'disabled' : ''}>−</button><span class="f-val">${f}</span><button type="button" class="f-btn" data-d="1" aria-label="More focus on ${esc(t)}" ${f >= MAX_FOCUS ? 'disabled' : ''}>+</button></div></td>
      <td><b>${esc(t)}</b>${info.reason ? `<div class="t-muted small">${esc(info.reason)}</div>` : ''}</td><td>${cards.length}</td><td>${seen}</td><td>${mature}</td>
      <td>${recent.length ? Math.round(100 * again / recent.length) + '%' : '–'}</td></tr>`;
  }).join('');
  const topics = `<table class="t-table"><tr><th>Focus</th><th>Topic</th><th>Cards</th><th>Seen</th><th>Learned</th><th>"Again" rate</th></tr>${topicRows}</table>
    <p class="t-muted small">"Learned" means the next review is 3 or more weeks away.</p>`;

  // Packet results, newest first
  const byDay = {};
  d.packets.forEach(r => (byDay[asDay(r[0])] = byDay[asDay(r[0])] || []).push(r));
  const packets = Object.keys(byDay).sort().reverse().slice(0, 10).map(day => {
    const rows = byDay[day], right = rows.filter(r => r[7] === 'right').length;
    const flag = rows.filter(r => r[7] !== 'right' || r[8] === 'yes');
    return `<div class="t-pk"><div class="t-pk-h"><b>${dayName(day)}</b> · ${esc(rows[0][2])} · ${right}/${rows.length} right</div>
      ${flag.length ? `<ul>${flag.map(r => `<li>Q${r[3]} · ${esc(r[4])} · ${r[7] === 'right' ? 'right' : r[7] === 'blank' ? 'blank' : `answered ${esc(r[5])}, correct ${esc(r[6])}`}${r[8] === 'yes' ? ' · <span class="hard">marked hard</span>' : ''}</li>`).join('')}</ul>` : '<p class="t-muted small">No misses or hard marks.</p>'}</div>`;
  }).join('') || '<p class="t-muted">No answer sheets graded yet.</p>';

  // Speed Study
  const fights = d.fights.slice(-8).reverse();
  const speed = fights.length ? `<table class="t-table"><tr><th>When</th><th>Rank</th><th>Result</th><th>Correct</th><th>Avg time</th></tr>
    ${fights.map(f => `<tr><td>${dayName(asDay(f[0]))}</td><td>${f[1]}</td><td>${esc(f[2])}</td><td>${f[4]}/${f[3]}</td><td>${Number(f[5]).toFixed(1)}s</td></tr>`).join('')}</table>`
    : '<p class="t-muted">No Speed Study fights yet.</p>';

  $('#tutor-body').innerHTML = `
    <div class="t-card"><h2>Last two weeks</h2><p class="t-muted small">Goal: 15 minutes each of Speed Study and Flashcards every weekday.</p>${activity}</div>
    <div class="t-card"><h2>Flashcard topics</h2><p class="t-muted small">All topics are always in Victoria's flashcards. Focus (0 to 5) makes a topic come up more often in Flashcards and Speed Study.
      Each missed or Hard packet question raises it by 1 (by 2 at most per packet), and a clean packet lowers it by 1. Speed Study uses Fractions, Decimals, Conversions, Percents, Geometry and Algebra (word problems).</p>${topics}</div>
    <div class="t-card"><h2>Packet answer sheets</h2>${packets}</div>
    <div class="t-card"><h2>Speed Study</h2>${speed}</div>`;
  $('#tutor-body').querySelectorAll('.focus').forEach(box => box.querySelectorAll('.f-btn').forEach(btn => btn.addEventListener('click', async () => {
    const val = box.querySelector('.f-val'), btns = box.querySelectorAll('.f-btn'), before = Number(val.textContent);
    const want = Math.max(0, Math.min(MAX_FOCUS, before + Number(btn.dataset.d)));
    if (want === before) return;
    btns.forEach(b => { b.disabled = true; });
    val.textContent = want;
    let now = before;
    try {
      const r = await postJSON({ action: 'tutor', op: 'setFocus', password: savedPassword(), topic: box.dataset.topic, focus: want });
      if (!r.ok) throw new Error();
      now = Number(r.focus ?? want);
    } catch { alert('Could not save that change. Try again.'); }
    val.textContent = now;
    btns[0].disabled = now <= 0; btns[1].disabled = now >= MAX_FOCUS;
  })));
}
