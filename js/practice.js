// Weekly Practice page: the week's HSPT packet on screen. She taps a bubble to answer (and the Hard
// bubble for anything that felt hard); each answer is graded the moment she taps it, with the correct
// answer, how to solve it, a test strategy and video links. Answers lock once chosen, like the real test.
// Answers are saved on the device. Days she already did on paper come pre-filled from her graded sheet.
import { sk, TEST } from './testmode.js?v=1794956358';
import { queueReport } from './report.js?v=1794956358';
import { PRACTICE_SYNC } from './config.js?v=1794956358';
import { today } from './sync.js?v=1794956358';

const KEY = sk('math-quest-practice-v1');
const L = 'abcd';
const $ = s => document.querySelector(s);
const noDot = s => String(s).replace(/\.\s*$/, '');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let saved = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } })();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch { /* ignore */ } };

let index = null, week = null, dayIdx = 0;
const weekCache = {};

async function loadIndex() { if (!index) index = await fetch('assets/practice/index.json', { cache: 'no-store' }).then(r => r.json()); return index; }
async function loadWeek(id) {
  if (!weekCache[id]) {
    const w = await fetch(`assets/practice/${id}.json`).then(r => r.json());
    w.days.forEach(d => d.sections.forEach(s => s.groups.forEach(g => g.questions.forEach(q => {
      q.fb = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(q.fb), c => c.charCodeAt(0))));
    }))));
    weekCache[id] = w;
  }
  return weekCache[id];
}
const currentWeekId = idx => {
  const t = today(), past = idx.weeks.filter(w => w.week <= t);
  return (past.length ? past[past.length - 1] : idx.weeks[0]).week;
};

// Her marks for one day: saved on this device, else the paper answer sheet, else empty.
function marks(day) {
  const w = (saved[week.week] = saved[week.week] || {});
  if (!w[day.day]) {
    w[day.day] = !day.paper ? {} : Object.fromEntries(Object.entries(day.paper).map(([n, m]) => [n, { a: m.a || '', h: m.h, paper: true }]));
  }
  return w[day.day];
}
const questions = day => day.sections.flatMap(s => s.groups.flatMap(g => g.questions.map(q => ({ ...q, section: s.name }))));
function score(day) {
  const m = marks(day), qs = questions(day);
  const done = qs.filter(q => m[q.n] && (m[q.n].a || m[q.n].paper));
  return { done: done.length, right: done.filter(q => m[q.n].a === q.fb.ans).length, total: qs.length, paper: qs.some(q => m[q.n] && m[q.n].paper) };
}

export async function practiceSummary() {
  try {
    const idx = await loadIndex(); week = await loadWeek(currentWeekId(idx));
    const d = week.days.find(x => x.date === today()) || week.days.find(x => score(x).done < x.total) || week.days[0];
    const s = score(d);
    return { day: d.day, ...s };
  } catch { return null; }
}

export async function openPractice() {
  const idx = await loadIndex();
  const id = week && idx.weeks.some(w => w.week === week.week) ? week.week : currentWeekId(idx);
  week = await loadWeek(id);
  const t = week.days.findIndex(d => d.date === today());
  dayIdx = t >= 0 ? t : Math.max(0, week.days.findIndex(d => score(d).done < d.total));
  $('#pr-week').innerHTML = idx.weeks.map(w => `<option value="${w.week}"${w.week === id ? ' selected' : ''}>${esc(w.label)}</option>`).join('');
  $('#pr-week').hidden = idx.weeks.length < 2;
  $('#pr-sub').textContent = idx.weeks.find(w => w.week === id).label;
  render();
}
$('#pr-week').addEventListener('change', async e => { week = await loadWeek(e.target.value); dayIdx = 0; $('#pr-sub').textContent = index.weeks.find(w => w.week === week.week).label; render(); });

function tabs() {
  $('#pr-tabs').innerHTML = week.days.map((d, i) => {
    const s = score(d), dt = new Date(d.date + 'T12:00');
    const chip = s.done ? `${s.right}/${s.total}` : `${s.total} Qs`;
    return `<button class="pr-tab${i === dayIdx ? ' on' : ''}${s.done === s.total ? ' done' : ''}" data-i="${i}" role="tab" aria-selected="${i === dayIdx}">
      <b>${d.day.slice(0, 3)}</b><small>${dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</small><span>${chip}</span></button>`;
  }).join('');
  $('#pr-tabs').querySelectorAll('.pr-tab').forEach(b => b.onclick = () => { dayIdx = +b.dataset.i; render(); scrollTo({ top: 0 }); });
}

function head(day) {
  const s = score(day), pct = s.done ? Math.round((100 * s.right) / s.done) : 0;
  const kind = day.sections.map(x => x.name).join(', ').replace(/, ([^,]*)$/, ' and $1');
  $('#pr-head').innerHTML = `<div><h2>${day.day}</h2><div class="pr-kind">${esc(kind)} · ${s.total} questions</div></div>
    <div class="pr-score">${s.done ? `<b>${s.right} / ${s.done}</b> right${s.done < s.total ? ` · ${s.total - s.done} to go` : ` · ${pct}%`}` : 'Tap a bubble to answer. You see the answer right away.'}
    <div class="meter"><i style="width:${(100 * s.done) / s.total}%"></i></div></div>
    ${s.paper ? '<div class="pr-paper">Filled in from the answer sheet you sent. Review anything marked below.</div>' : ''}`;
}

function feedback(q, m) {
  const her = m.a, ok = her === q.fb.ans, blank = !her;
  const right = q.choices[L.indexOf(q.fb.ans)];
  let h = `<div class="pr-fb ${ok ? 'ok' : 'no'}"><div class="pr-verdict">${ok ? '✓ Correct!' : blank ? `Left blank. The answer is (${q.fb.ans}).` : `✗ Not quite. The answer is (${q.fb.ans}) ${noDot(right)}.`}${m.h ? ' <span class="pr-hardtag">marked Hard</span>' : ''}</div>`;
  const how = `<p><b>How to solve it.</b> ${esc(q.fb.how)}${!ok && her ? ` You picked (${her}) ${noDot(q.choices[L.indexOf(her)])}; go through the steps above to spot where your work went a different way.` : ''}</p>`
    + (q.fb.strat ? `<p><b>Strategy for the test.</b> ${esc(q.fb.strat)}</p>` : '')
    + (q.fb.vids.length ? `<p><b>Watch:</b> ${q.fb.vids.map(([t, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a>`).join(' · ')}</p>` : '');
  h += ok && !m.h ? `<details><summary>How to solve it</summary>${how}</details>` : how;
  return h + '</div>';
}

function qHTML(q, m) {
  const mk = m[q.n] || {}, answered = !!(mk.a || mk.paper);
  const bubbles = q.choices.map((c, i) => {
    const l = L[i], cls = !answered ? '' : l === q.fb.ans ? ' right' : l === mk.a ? ' wrong' : ' dim';
    return `<button class="pr-ch${cls}${l === mk.a ? ' picked' : ''}" data-n="${q.n}" data-a="${l}" ${answered ? 'disabled' : ''} aria-label="Answer ${l}">
      <span class="pr-bub">${l}</span><span class="pr-ct">${c}</span></button>`;
  }).join('');
  return `<div class="pr-q${answered ? (mk.a === q.fb.ans ? ' is-right' : ' is-wrong') : ''}" id="pq-${q.n}">
    <div class="pr-qh"><span class="pr-n">${q.n}</span><span class="pr-topic">${esc(q.topic)}</span>
      <button class="pr-hard${mk.h ? ' on' : ''}" data-n="${q.n}" aria-pressed="${!!mk.h}"><span class="pr-bub"></span>Hard</button></div>
    ${q.stem ? `<div class="pr-stem">${q.stem}</div>` : ''}${q.fig ? `<div class="pr-fig">${q.fig}</div>` : ''}
    <div class="pr-chs">${bubbles}</div>
    ${answered ? feedback(q, mk) : ''}</div>`;
}

function render() {
  const day = week.days[dayIdx], m = marks(day);
  tabs(); head(day);
  $('#pr-body').innerHTML = day.sections.map(s => `<h3 class="pr-sec">${esc(s.name)}</h3>` + s.groups.map(g =>
    (g.directions ? `<div class="pr-dir">${esc(g.directions)}</div>` : '')
    + (g.passage ? `<div class="pr-dir">Questions ${g.first}–${g.last} refer to the following passage.</div><div class="pr-passage">${g.passage}</div>` : '')
    + g.questions.map(q => qHTML(q, m)).join('')).join('')).join('')
    + (dayIdx < week.days.length - 1 ? `<div class="row pr-next"><button class="btn" id="pr-next">Next: ${week.days[dayIdx + 1].day} →</button></div>` : '');
  bind();
}

function rerenderQ(n) {
  const day = week.days[dayIdx], q = questions(day).find(x => x.n === n);
  const el = document.getElementById(`pq-${n}`);
  el.outerHTML = qHTML(q, marks(day));
  head(day); tabs(); bind();
}

function bind() {
  $('#pr-body').querySelectorAll('.pr-ch:not([disabled])').forEach(b => b.onclick = () => choose(+b.dataset.n, b.dataset.a));
  $('#pr-body').querySelectorAll('.pr-hard').forEach(b => b.onclick = () => toggleHard(+b.dataset.n));
  const nx = $('#pr-next'); if (nx) nx.onclick = () => { dayIdx++; render(); scrollTo({ top: 0 }); };
}

function choose(n, a) {
  const day = week.days[dayIdx], m = marks(day);
  if (m[n] && (m[n].a || m[n].paper)) return;
  m[n] = { ...(m[n] || {}), a, t: Date.now() };
  save(); rerenderQ(n); maybeSend(day);
}
function toggleHard(n) {
  const day = week.days[dayIdx], m = marks(day);
  m[n] = { ...(m[n] || { a: '' }), h: !(m[n] && m[n].h) };
  save(); rerenderQ(n); if (score(day).done === score(day).total) maybeSend(day, true);
}

// When a whole day is answered, send it to the tutor's sheet like a graded answer sheet
// (raises the Focus of missed and Hard topics). Re-sending a day replaces it there.
function maybeSend(day, again = false) {
  const s = score(day);
  if (TEST || !PRACTICE_SYNC || s.done < s.total || s.paper) return;
  const w = saved[week.week], sentKey = `${day.day}#sent`;
  if (w[sentKey] && !again) return;
  const m = marks(day);
  const rows = questions(day).map(q => {
    const a = (m[q.n] && m[q.n].a) || '';
    return { n: q.n, q: q.n, section: q.section, topic: q.topic, answer: a, correct: q.fb.ans, result: !a ? 'blank' : a === q.fb.ans ? 'right' : 'wrong', hard: !!(m[q.n] && m[q.n].h) };
  });
  queueReport({ action: 'practice', date: day.date, day: day.day, rows });
  w[sentKey] = Date.now(); save();
}
