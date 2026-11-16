// Entry point: login choice (student or tutor), the student home with its two pages, and the tutor page.
import { openSpeed, show } from './main.js?v=1794804625';
import { state, persist, goalFor } from './progress.js?v=1794804625';
import { MONSTERS, loadManifest, paintMonster } from './battle.js?v=1794804625';
import { openFlash, summary, pull, pushNow } from './flash.js?v=1794804625';
import { openTutor, tutorLogin, tutorLogout, savedPassword, startTest, inTest } from './tutor.js?v=1794804625';
import { startTiming, stopTiming, minutesToday, GOAL_MIN } from './timer.js?v=1794804625';

const $ = s => document.querySelector(s);
const ROLE_KEY = 'math-quest-role';
const getRole = () => { try { return localStorage.getItem(ROLE_KEY); } catch { return null; } };
const setRole = r => { try { r ? localStorage.setItem(ROLE_KEY, r) : localStorage.removeItem(ROLE_KEY); } catch { /* ignore */ } };

// ---------- Login ----------
function login() {
  stopTiming();
  show('login');
  $('#tutor-form').hidden = true;
  $('.login-choices').hidden = false;
}
$('#login-student').addEventListener('click', () => { setRole('student'); state().name = 'Victoria'; persist(); home(); });
$('#login-tutor').addEventListener('click', () => {
  $('.login-choices').hidden = true; $('#tutor-form').hidden = false; $('#tutor-err').textContent = ''; $('#tutor-pw').value = ''; $('#tutor-pw').focus();
});
$('#tutor-cancel').addEventListener('click', login);
$('#tutor-test').addEventListener('click', () => { startTest(); setRole('tutor'); tutor(); });
$('#tutor-form').addEventListener('submit', async e => {
  e.preventDefault();
  $('#tutor-err').textContent = 'Checking…';
  const err = await tutorLogin($('#tutor-pw').value);
  if (err) { $('#tutor-err').textContent = err; return; }
  setRole('tutor'); tutor();
});

// ---------- Student home ----------
async function home() {
  stopTiming();
  show('home');
  await loadManifest();
  const s = state(), rank = s.ranks.all || 1, mon = MONSTERS[Math.min(rank, 10) - 1];
  paintMonster($('#home-mon'), mon.id, 'battle_idle', 0, 84);
  const meter = (bar, meta, m, extra) => { $(bar).style.width = `${Math.min(100, (100 * m) / GOAL_MIN)}%`; $(meta).innerHTML = `<b>${m} / ${GOAL_MIN} min</b> today${m >= GOAL_MIN ? ' ✓' : ''} · ${extra}`; };
  meter('#speed-bar', '#speed-meta', minutesToday('speed'), `Speed Rank ${rank} · next: ${mon.name}`);
  meter('#flash-bar', '#flash-meta', minutesToday('flash'), '…');
  await pull();
  const sm = await summary();
  meter('#flash-bar', '#flash-meta', minutesToday('flash'), sm.topics ? `${sm.due + sm.learn} to review · ${sm.new} new` : 'no topics yet');
}
$('#go-speed').addEventListener('click', () => { startTiming('speed'); openSpeed(); });
$('#go-flash').addEventListener('click', () => { startTiming('flash'); show('flash'); openFlash(); });
$('#speed-home').addEventListener('click', home);
$('#flash-home').addEventListener('click', () => { pushNow(); home(); });
$('#signout').addEventListener('click', () => { setRole(null); login(); });

// ---------- Tutor ----------
function tutor() { stopTiming(); show('tutor'); openTutor(); }
$('#tutor-refresh').addEventListener('click', openTutor);
$('#tutor-signout').addEventListener('click', () => { tutorLogout(); setRole(null); login(); });

// ---------- Boot ----------
const role = getRole();
if (role === 'student') { state().name = 'Victoria'; home(); }
else if (role === 'tutor' && (savedPassword() || inTest())) tutor();
else login();
export { goalFor };
