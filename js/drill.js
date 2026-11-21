// Drill page: endless Quantitative Skills practice in the Barron's question styles. Pick one style
// (or mix a whole type), tap a bubble, and see right away whether it's right and why.
// Computation questions also show the setup: what to write above each word, then the equation.
// Scores for each style are saved on this device.
import { sk } from './testmode.js?v=1795219928';
import { TYPES, MODES, make } from './drillbank.js?v=1795219928';
import { queueReport } from './report.js?v=1795219928';

const KEY = sk('math-quest-drill-v1');
const L = 'abcd';
const $ = s => document.querySelector(s);
let data = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } })();
data.modes = data.modes || {};
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* ignore */ } };

let pick = null, q = null, mine = null, showSetup = false, shownAt = 0, run = { n: 0, right: 0, streak: 0 };

const stat = id => data.modes[id] || { n: 0, right: 0 };
const pctTxt = s => (s.n ? `${s.right}/${s.n}` : '');
const typeStat = T => T.modes.reduce((a, [id]) => { const s = stat(id); return { n: a.n + s.n, right: a.right + s.right }; }, { n: 0, right: 0 });

export function openDrill() { pick = null; menu(); }

function menu() {
  $('#dr-sub').textContent = 'Barron\'s-style Quantitative questions, new numbers every time.';
  $('#dr-back').hidden = true;
  // One button per Quantitative question type; each draws from every Barron's style of that type.
  const EX = { seq: 'In the sequence: 3, 9, 27, 81, . . . , what number should come next?', cmp: 'Examine (A), (B), and (C): 25% of 60, ⅕ of 60, 0.3 × 60',
    geo: 'Shaded shapes, measuring cups, hourglasses, triangles, slopes', comp: 'What number is 8 more than 20% of 50?' };
  const btn = (id, name, ex, s) => `<button class="dr-pick" data-mix="${id}"><b>${name}</b><span>${ex}</span>${s.n ? `<small class="${s.right / s.n >= 0.8 ? 'good' : s.right / s.n < 0.5 ? 'low' : ''}">${s.right}/${s.n} right</small>` : ''}</button>`;
  const all = TYPES.reduce((a, T) => { const s = typeStat(T); return { n: a.n + s.n, right: a.right + s.right }; }, { n: 0, right: 0 });
  $('#dr-body').innerHTML = `<div class="dr-picks">${TYPES.map(T => btn(T.id, T.name, EX[T.id], typeStat(T))).join('')}${btn('all', 'Mix of all four', 'All four types mixed together', all)}</div>`;
  $('#dr-body').querySelectorAll('[data-mix]').forEach(b => b.onclick = () => start({ mix: b.dataset.mix }));
}

function start(p) { pick = p; run = { n: 0, right: 0, streak: 0 }; next(); }
function pickMode() {
  if (pick.mode) return pick.mode;
  const pool = pick.mix === 'all' ? TYPES : TYPES.filter(T => T.id === pick.mix);
  const T = pool[Math.floor(Math.random() * pool.length)];                 // each type equally often, then a style
  return T.modes[Math.floor(Math.random() * T.modes.length)][0];
}
function title() {
  if (pick.mode) return `${MODES[pick.mode].typeName}: ${MODES[pick.mode].name}`;
  return pick.mix === 'all' ? 'Mix of all four types' : TYPES.find(T => T.id === pick.mix).name;
}
function next() { q = make(pickMode()); mine = null; showSetup = false; shownAt = Date.now(); render(); scrollTo({ top: 0 }); }

// The question with each piece's annotation written above it.
function setupHTML(s) {
  const toks = s.pieces.map(([words, ann, flip]) => (ann === null || ann === undefined
    ? `<span class="tk plain${words === '?' ? ' qm' : ''}">${words}</span>`
    : `<span class="tk${flip ? ' flip' : ''}"><span class="an">${ann}${flip ? '<i>⇄</i>' : ''}</span><span class="wd">${words}</span></span>`)).join(' ');
  const flips = s.pieces.some(p => p[2]);
  return `<div class="dr-setup"><div class="dr-sh">Write it above the words</div><div class="dr-ann">${toks}</div>
    ${flips ? '<div class="dr-flipnote"><i>⇄</i> “less than” and “subtracted from” flip the order: the number after them goes first (5 less than 20 is 20 − 5).</div>' : ''}
    <div class="dr-sh">Then solve, right to left</div><div class="dr-steps">${s.steps.map(x => `<div>${x}</div>`).join('')}</div></div>`;
}

function render() {
  const m = MODES[q.mode], answered = !!mine, ok = mine === q.ans;
  $('#dr-sub').textContent = title();
  $('#dr-back').hidden = false;
  const runTxt = run.n ? `<b>${run.right} / ${run.n}</b> right${run.streak >= 3 ? ` · ${run.streak} in a row 🔥` : ''}` : 'Tap a bubble to answer.';
  const bubbles = q.choices.map((c, i) => {
    const l = L[i], cls = !answered ? '' : l === q.ans ? ' right' : l === mine ? ' wrong' : ' dim';
    return `<button class="pr-ch${cls}" data-a="${l}" ${answered ? 'disabled' : ''} aria-label="Answer ${l}"><span class="pr-bub">${l}</span><span class="pr-ct">${c}</span></button>`;
  }).join('');
  let fb = '';
  if (answered) {
    const right = q.choices[L.indexOf(q.ans)];
    fb = `<div class="pr-fb ${ok ? 'ok' : 'no'}"><div class="pr-verdict">${ok ? '✓ Correct!' : `✗ Not quite. The answer is (${q.ans}) ${right}`}</div>
      <p><b>Why.</b> ${q.why}${!ok ? ` You picked (${mine}) ${q.choices[L.indexOf(mine)]}.` : ''}</p>${q.setup ? setupHTML(q.setup) : ''}</div>`;
  } else if (q.setup && showSetup) fb = setupHTML(q.setup);
  $('#dr-body').innerHTML = `<div class="dr-run">${runTxt}</div>
    <div class="pr-q dr-q${answered ? (ok ? ' is-right' : ' is-wrong') : ''}">
      <div class="pr-qh"><span class="pr-topic">${m.typeName} · ${m.name}</span></div>
      <div class="pr-stem">${q.stem}</div>${q.fig ? `<div class="pr-fig">${q.fig}</div>` : ''}
      <div class="pr-chs">${bubbles}</div>${fb}
      ${!answered && q.setup && !showSetup ? '<button class="btn small dr-hint" id="dr-hint">Show the setup</button>' : ''}
    </div>
    <div class="row dr-nav">${answered ? '<button class="btn primary" id="dr-next">Next question →</button>' : '<button class="btn" id="dr-skip">Skip</button>'}</div>`;
  $('#dr-body').querySelectorAll('.pr-ch:not([disabled])').forEach(b => b.onclick = () => answer(b.dataset.a));
  const h = $('#dr-hint'); if (h) h.onclick = () => { showSetup = true; render(); };
  const n = $('#dr-next'); if (n) { n.onclick = next; n.focus({ preventScroll: true }); }
  const s = $('#dr-skip'); if (s) s.onclick = next;
}

function answer(a) {
  if (mine) return;
  mine = a;
  const ok = a === q.ans, st = (data.modes[q.mode] = data.modes[q.mode] || { n: 0, right: 0 });
  st.n++; if (ok) st.right++;
  run.n++; if (ok) { run.right++; run.streak++; } else run.streak = 0;
  save(); render();
  const txt = h => { const d = document.createElement('div'); d.innerHTML = h || ''; return d.textContent.replace(/\s+/g, ' ').trim(); };
  const m = MODES[q.mode], choice = l => `(${l}) ${txt(q.choices[L.indexOf(l)])}`;
  queueReport({ action: 'drill', needs: 2, answers: [{ time: new Date().toISOString(), type: m.typeName, style: m.name,
    q: txt(q.stem) + (q.fig ? ' [figure]' : ''), correct: choice(q.ans), chosen: choice(a), result: ok ? 'right' : 'wrong',
    sec: +((Date.now() - shownAt) / 1000).toFixed(1), setup: showSetup }] });
}

$('#dr-back').addEventListener('click', () => { pick = null; menu(); scrollTo({ top: 0 }); });
addEventListener('keydown', e => {
  if ($('#drill').hidden || !pick || !q) return;
  if (!mine && ['1', '2', '3', '4'].includes(e.key)) answer(L[+e.key - 1]);
  else if (mine && e.key === 'Enter' && e.target.tagName !== 'BUTTON') { e.preventDefault(); next(); }
});

export function drillSummary() {
  const all = Object.values(data.modes).reduce((a, s) => ({ n: a.n + s.n, right: a.right + s.right }), { n: 0, right: 0 });
  return all;
}
