// Screens and the fight loop.
import { SKILLS, makeQuestion, pickType } from './questions.js?v=1794957524';
import { state, persist, goalFor, baseDamage, MAX_RANK, memoryFor, recordAnswer, awardStar } from './progress.js?v=1794957524';
import { Scene, MONSTERS, BACKDROPS, bgUrl, loadManifest, paintMonster } from './battle.js?v=1794957524';
import { queueReport, flush } from './report.js?v=1794957524';
import { flashData } from './flash.js?v=1794957524';
import { sfx, unlock, isMuted, setMuted } from './sfx.js?v=1794957524';

const $ = s => document.querySelector(s);
const MODE = 'all', SKILL_ORDER = [MODE]; // one game mode that mixes every question type
const HEARTS = 5, HITS_TO_WIN = 16;
const fmt = s => s.toFixed(1) + 's';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const median = a => { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

function show(id) {
  document.querySelectorAll('.screen').forEach(s => s.hidden = s.id !== id);
  window.scrollTo(0, 0);
}

// ---------- Map ----------
function opponent(skill) {
  const s = state(), rank = s.ranks[skill], mastered = s.mastered?.[skill];
  return mastered ? MONSTERS[Math.floor(Math.random() * MONSTERS.length)] : MONSTERS[rank - 1];
}
async function map() {
  await loadManifest();
  show('map');
  const s = state();
  $('#hello').textContent = `Hi, ${s.name}!`;
  const stars = Object.values(s.stars).reduce((a, b) => a + b.filter(k => SKILL_ORDER.includes(k)).length, 0);
  $('#star-count').textContent = `${stars}/10`;
  const wrap = $('#areas'); wrap.innerHTML = '';
  for (const skill of SKILL_ORDER) {
    const rank = s.ranks[skill], locked = false, mastered = s.mastered?.[skill];
    const mon = MONSTERS[Math.min(rank, MAX_RANK) - 1];
    const card = document.createElement('button');
    card.className = 'area' + (locked ? ' locked' : '');
    card.innerHTML = `
      <div class="area-art"><div class="portrait"></div></div>
      <div class="area-info">
        <div class="area-place">Fractions · Decimals · Percents · Angles · Word problems</div>
        <div class="area-name">${mastered ? 'Free play' : `Fight the ${mon.name}`}</div>
        <div class="area-rank">${mastered ? 'Mastered! Free play' : `Speed Rank ${rank} · ${fmt(goalFor(skill, rank))} per answer`}</div>
        <div class="pips">${Array.from({ length: MAX_RANK }, (_, i) => `<i class="${i < rank - 1 || mastered ? 'on' : i === rank - 1 ? 'now' : ''}"></i>`).join('')}</div>
        <div class="area-next">${mastered ? `Fight any monster at ${fmt(goalFor(skill, MAX_RANK))}` : 'Tap to start'}</div>
      </div>`;
    card.querySelector('.area-art').style.backgroundImage = `linear-gradient(rgba(24,22,20,.05), rgba(24,22,20,.45)), url(${bgUrl(BACKDROPS[skill][Math.min(rank, MAX_RANK) - 1])})`;
    paintMonster(card.querySelector('.portrait'), mon.id, 'battle_idle', 0, 96);
    if (!locked) card.addEventListener('click', () => startFight(skill));
    else card.disabled = true;
    wrap.appendChild(card);
  }
}
$('#to-bestiary').addEventListener('click', bestiary);
$('#to-help').addEventListener('click', () => $('#help').showModal());
$('#help-close').addEventListener('click', () => $('#help').close());

// ---------- Bestiary ----------
function bestiary() {
  show('bestiary');
  const s = state(), grid = $('#beasts'); grid.innerHTML = '';
  MONSTERS.forEach((m, i) => {
    const got = s.stars[m.id] || [];
    const card = document.createElement('div');
    card.className = 'beast' + (got.length ? '' : ' unknown');
    card.innerHTML = `<div class="portrait"></div><div class="beast-name">${got.length ? m.name : '???'}</div>
      <div class="beast-stars"><span class="${got.length ? 'on' : ''}">★</span></div>
      <p>${got.length ? m.blurb : `Speed Rank ${i + 1} opponent`}</p>`;
    paintMonster(card.querySelector('.portrait'), m.id, 'battle_idle', 0, 88);
    grid.appendChild(card);
  });
}
$('#bestiary-back').addEventListener('click', map);

// ---------- Fight ----------
const scene = new Scene($('#scene'));
let F = null; // current fight

async function startFight(skill) {
  const s = state(), rank = s.ranks[skill], mastered = !!s.mastered?.[skill];
  const mon = opponent(skill), goal = goalFor(skill, rank), base = baseDamage(rank);
  F = {
    skill, rank, mastered, mon, goal, base, hpMax: base * HITS_TO_WIN, hp: base * HITS_TO_WIN, hearts: HEARTS,
    combo: 0, bestCombo: 0, types: [], log: [], times: [], crits: 0, recent: [], started: Date.now(), over: false,
  };
  show('battle');
  await scene.setup(mon.id, BACKDROPS[skill][mastered ? Math.floor(Math.random() * 10) : rank - 1]);
  $('#mon-name').textContent = mon.name;
  $('#rank-badge').textContent = mastered ? 'Free play' : `Speed Rank ${rank}`;
  $('#goal').textContent = fmt(goal);
  renderHud();
  $('#qpanel').hidden = true;
  const intro = $('#intro');
  intro.querySelector('h2').textContent = `${mon.name} blocks the path!`;
  intro.querySelector('p').innerHTML = `Answer before the bar runs out to hit (about <b>${fmt(goal)}</b>). Answer in the first half for a <b>critical hit</b> and double damage.`;
  intro.hidden = false;
  $('#fight-go').focus();
}
$('#fight-go').addEventListener('click', () => { unlock(); sfx.appear(); $('#intro').hidden = true; $('#qpanel').hidden = false; nextQuestion(); });
$('#flee').addEventListener('click', () => { if (F) { F.over = true; cancelAnimationFrame(F.raf); } scene.stop(); map(); });

function renderHud() {
  $('#hearts').innerHTML = Array.from({ length: HEARTS }, (_, i) => `<span class="${i < F.hearts ? 'full' : ''}">♥</span>`).join('');
  $('#hp-fill').style.width = `${Math.max(0, F.hp / F.hpMax) * 100}%`;
  $('#hp-text').textContent = `${Math.max(0, F.hp)}/${F.hpMax}`;
  const bonus = comboBonus();
  $('#combo').textContent = F.combo >= 2 ? `Combo ×${F.combo}${bonus ? ` · +${bonus * 100}% dmg` : ''}` : '';
  $('#you-avg').textContent = F.times.length ? fmt(F.times.reduce((a, b) => a + b, 0) / F.times.length) : '–';
}
const comboBonus = () => Math.min(1, Math.floor(F.combo / 5) * 0.25);

function nextQuestion() {
  if (F.over) return;
  const type = pickType(F.types, flashData().focus); F.types.push(type);
  const q = makeQuestion(type, F.rank, memoryFor(F.recent));
  F.goal = goalFor(type, F.rank); $('#goal').textContent = fmt(F.goal);
  F.q = q; F.late = false; F.locked = false;
  F.recent.push(q.key); if (F.recent.length > 4) F.recent.shift();
  $('#ask').innerHTML = q.ask;
  $('#prompt').innerHTML = q.prompt;
  $('#prompt').hidden = !q.prompt;
  $('#tip').classList.remove('on');
  const box = $('#choices');
  box.className = 'choices ' + q.layout;
  box.innerHTML = q.choices.map((c, i) => `<button class="choice" data-i="${i}"><kbd>${i + 1}</kbd><span>${c.html}</span></button>`).join('');
  box.querySelectorAll('.choice').forEach(b => b.addEventListener('click', () => answer(+b.dataset.i)));
  F.t0 = performance.now();
  const bar = $('#timer-fill'), wrap = $('#timer');
  wrap.classList.remove('late');
  const step = () => {
    if (F.over || F.answered === F.q) return;
    const t = (performance.now() - F.t0) / 1000, f = Math.min(1, t / F.goal);
    bar.style.transform = `scaleX(${1 - f})`;
    wrap.classList.toggle('crit', t <= F.goal / 2);
    if (t >= F.goal && !F.late) { F.late = true; wrap.classList.add('late'); tooSlow(); }
    F.raf = requestAnimationFrame(step);
  };
  cancelAnimationFrame(F.raf); F.answered = null; step();
}

async function tooSlow() {
  F.locked = true;
  scene.popup('hero', 'Too slow!', 'slow'); scene.aura(false);
  await scene.monsterAttack(() => { F.hearts--; F.combo = 0; renderHud(); sfx.hurt(); });
  if (F.hearts <= 0) return endFight(false);
  if (F.answered !== F.q) F.locked = false;
}

async function answer(i) {
  if (F.locked || F.over || F.answered === F.q) return;
  F.locked = true; F.answered = F.q;
  cancelAnimationFrame(F.raf);
  const q = F.q, c = q.choices[i], sec = (performance.now() - F.t0) / 1000;
  const buttons = [...document.querySelectorAll('#choices .choice')];
  const right = q.choices.find(x => x.correct);
  const entry = { type: SKILLS[q.skill].name, q: q.promptText, answer: right.text, chosen: c.text, sec: +sec.toFixed(2), goal: F.goal, late: F.late };
  if (c.correct) {
    const outcome = F.late ? 'late' : 'fast', crit = !F.late && sec <= F.goal / 2;
    buttons[i].classList.add('right');
    if (outcome === 'fast') { F.combo++; F.bestCombo = Math.max(F.bestCombo, F.combo); F.times.push(sec); } else F.combo = 0;
    if (F.combo && F.combo % 5 === 0) { scene.banner(`COMBO ×${F.combo}!`); sfx.combo(); }
    scene.aura(F.combo >= 5);
    if (crit) F.crits++;
    const mult = F.late ? 0.5 : crit ? 2 : 1, dmg = Math.round(F.base * mult * (1 + (F.late ? 0 : comboBonus())));
    entry.result = crit ? 'critical' : outcome === 'fast' ? 'hit' : 'late';
    F.log.push(entry); recordAnswer(q, outcome);
    renderHud();
    await scene.heroAttack(() => {
      F.hp -= dmg; renderHud(); (crit ? sfx.crit : F.late ? sfx.late : sfx.hit)();
      scene.popup('monster', crit ? `CRITICAL! ${dmg}` : F.late ? `Late hit ${dmg}` : `${dmg}`, crit ? 'crit' : F.late ? 'late' : 'hit');
    }, crit);
    if (F.hp <= 0) { scene.aura(false); sfx.win(); await scene.defeat(); return endFight(true); }
    return nextQuestion();
  }
  // Wrong answer: show the right one and the fast way, monster strikes (unless it already did for this question).
  buttons[i].classList.add('wrong');
  buttons[q.choices.indexOf(right)].classList.add('right');
  entry.result = 'wrong'; entry.mistake = c.tag || '';
  F.log.push(entry); recordAnswer(q, 'wrong');
  F.combo = 0; renderHud(); scene.aura(false); sfx.wrong();
  $('#tip').innerHTML = q.tip; $('#tip').classList.add('on');
  const t0 = Date.now();
  if (!F.late) await scene.monsterAttack(() => { F.hearts--; renderHud(); scene.popup('hero', 'Miss!', 'slow'); sfx.hurt(); });
  if (F.hearts <= 0) { await sleep(900); return endFight(false); }
  await sleep(Math.max(0, 2200 - (Date.now() - t0)));
  nextQuestion();
}
document.addEventListener('keydown', e => {
  if ($('#battle').hidden) return;
  if (!$('#intro').hidden && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); $('#fight-go').click(); return; }
  if (!F || !F.q || $('#qpanel').hidden) return;
  let i = { 1: 0, 2: 1, 3: 2, 4: 3 }[e.key];
  if (F.q.layout === 'row2') i = { ArrowLeft: 0, ArrowRight: 1 }[e.key] ?? i;
  if (i !== undefined && i < F.q.choices.length) answer(i);
});

async function endFight(won) {
  if (F.over) return;
  F.over = true; cancelAnimationFrame(F.raf);
  scene.aura(false);
  if (!won) { sfx.lose(); await scene.heroHurtDown(); }
  scene.stop();
  const s = state(), rankBefore = F.rank;
  let rankedUp = false;
  if (won) {
    awardStar(F.mon.id, F.skill);
    if (!F.mastered) {
      if (F.rank < MAX_RANK) { s.ranks[F.skill] = F.rank + 1; rankedUp = true; }
      else { s.mastered = { ...(s.mastered || {}), [F.skill]: true }; }
    }
  }
  s.fights++;
  const correct = F.log.filter(e => e.result !== 'wrong'), onTime = F.log.filter(e => e.result === 'hit' || e.result === 'critical');
  const best = s.best[F.skill] || (s.best[F.skill] = { combo: 0 });
  best.combo = Math.max(best.combo, F.bestCombo);
  persist();

  const allTimes = F.log.map(e => e.sec);
  queueReport({
    player: s.name, device: s.device, time: new Date().toISOString(), skill: 'All skills',
    rank: rankBefore, goal: goalFor(MODE, rankBefore), monster: F.mon.name, result: won ? 'won' : 'lost', freePlay: F.mastered,
    questions: F.log.length, correct: correct.length, onTime: onTime.length, crits: F.crits,
    medianSec: +median(allTimes).toFixed(2), avgSec: allTimes.length ? +(allTimes.reduce((a, b) => a + b, 0) / allTimes.length).toFixed(2) : 0,
    bestCombo: F.bestCombo, rankAfter: s.ranks[F.skill], goalAfter: goalFor(F.skill, s.ranks[F.skill]), rankedUp, seconds: Math.round((Date.now() - F.started) / 1000),
    answers: F.log,
  });

  // Result screen
  show('result');
  const r = $('#result');
  r.classList.toggle('won', won);
  const acc = F.log.length ? Math.round(100 * correct.length / F.log.length) : 0;
  const next = MONSTERS[s.ranks[F.skill] - 1];
  let headline, sub;
  if (won && rankedUp) {
    headline = `${F.mon.name} defeated!`;
    sub = `<div class="rankup">Speed Rank up! ${rankBefore} → ${rankBefore + 1}</div>
      <p>New goal: <b>${fmt(goalFor(MODE, rankBefore))} → ${fmt(goalFor(MODE, rankBefore + 1))}</b> per answer · damage <b>${baseDamage(rankBefore)} → ${baseDamage(rankBefore + 1)}</b></p>
      <p>Next opponent: <b>${next.name}</b></p>`;
  } else if (won) {
    headline = `${F.mon.name} defeated!`;
    sub = F.mastered ? '<p>Free play win. Keep that speed sharp!</p>' : `<div class="rankup">Speed Study mastered!</div><p>You beat the final boss at ${fmt(goalFor(MODE, MAX_RANK))} per answer.</p>`;
  } else {
    headline = `${F.mon.name} got away…`;
    const wrong = F.log.filter(e => e.result === 'wrong').length, slow = F.log.filter(e => e.late).length;
    sub = `<p>Your rank stays at ${rankBefore}. Hearts lost: ${wrong} wrong, ${slow} too slow. Try again!</p>`;
  }
  if (won && (rankedUp || !F.mastered)) setTimeout(sfx.rankup, 250);
  $('#result-title').textContent = headline;
  $('#result-sub').innerHTML = sub;
  $('#result-stats').innerHTML = [
    ['Accuracy', `${acc}%`], ['Avg time', allTimes.length ? fmt(allTimes.reduce((a, b) => a + b, 0) / allTimes.length) : '–'],
    ['Criticals', F.crits], ['Best combo', F.bestCombo],
  ].map(([k, v]) => `<div><b>${v}</b><span>${k}</span></div>`).join('');
  const misses = F.log.filter(e => e.result === 'wrong' || e.late);
  $('#review').innerHTML = misses.length ? `<h3>Practice these</h3><ul>${[...new Map(misses.map(m => [m.q, m])).values()].slice(0, 6)
    .map(m => `<li><span>${m.q.replace(' = ?', '').replace('?%', '')}</span><b>${m.answer}</b></li>`).join('')}</ul>` : '';
  paintMonster($('#result-portrait'), (won && !F.mastered ? next : F.mon).id, 'battle_idle', 0, 110);
  $('#again').textContent = won ? (F.mastered || !rankedUp ? 'Fight again' : `Fight ${next.name}`) : 'Try again';
  $('#again').onclick = () => startFight(F.skill);
}
$('#result-map').addEventListener('click', map);

// ---------- Sound toggle ----------
const soundBtn = $('#sound');
const paintSound = () => { soundBtn.textContent = isMuted() ? '🔇' : '🔊'; soundBtn.setAttribute('aria-label', isMuted() ? 'Turn sound on' : 'Turn sound off'); };
soundBtn.addEventListener('click', () => { setMuted(!isMuted()); paintSound(); unlock(); if (!isMuted()) sfx.combo(); });
paintSound();

// Opened from app.js (student home).
export { map as openSpeed, show };
flush();
