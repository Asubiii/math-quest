// Drill page: endless Quantitative Skills practice in the Barron's question styles. Pick one style
// (or mix a whole type), tap a bubble, and see right away whether it's right and why.
// Computation questions also show the setup: what to write above each word, then the equation.
// Scores for each style are saved on this device.
import { sk } from './testmode.js?v=1794957318';
import { TYPES, MODES, make } from './quant.js?v=1794957318';

const KEY = sk('math-quest-drill-v1');
const L = 'abcd';
const $ = s => document.querySelector(s);
let data = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } })();
data.modes = data.modes || {};
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* ignore */ } };

let pick = null, q = null, mine = null, showSetup = false, run = { n: 0, right: 0, streak: 0 };

const stat = id => data.modes[id] || { n: 0, right: 0 };
const pctTxt = s => (s.n ? `${s.right}/${s.n}` : '');
const typeStat = T => T.modes.reduce((a, [id]) => { const s = stat(id); return { n: a.n + s.n, right: a.right + s.right }; }, { n: 0, right: 0 });

export function openDrill() { pick = null; menu(); }

function menu() {
  $('#dr-sub').textContent = 'Barron\'s-style Quantitative questions, new numbers every time.';
  $('#dr-back').hidden = true;
  $('#dr-body').innerHTML = `<button class="btn primary dr-all" data-mix="all">Mix all Quantitative</button>` + TYPES.map(T => {
    const ts = typeStat(T);
    return `<section class="dr-type"><div class="dr-th"><h2>${T.name}</h2><button class="btn small" data-mix="${T.id}">Mix all ${T.modes.length}</button>
      ${ts.n ? `<span class="dr-ts">${ts.right}/${ts.n} right</span>` : ''}</div>
      <div class="dr-modes">${T.modes.map(([id, name]) => { const s = stat(id); return `<button class="dr-mode" data-mode="${id}"><span>${name}</span>${s.n ? `<small class="${s.right / s.n >= 0.8 ? 'good' : s.right / s.n < 0.5 ? 'low' : ''}">${pctTxt(s)}</small>` : ''}</button>`; }).join('')}</div></section>`;
  }).join('');
  $('#dr-body').querySelectorAll('[data-mode]').forEach(b => b.onclick = () => start({ mode: b.dataset.mode }));
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
  return pick.mix === 'all' ? 'Mix of all Quantitative' : `${TYPES.find(T => T.id === pick.mix).name}: mixed`;
}
function next() { q = make(pickMode()); mine = null; showSetup = false; render(); scrollTo({ top: 0 }); }

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
