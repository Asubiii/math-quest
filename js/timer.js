// Counts active study time per page per day (only while the page is visible and she has
// touched it in the last 90 seconds) and sends it to the tutor's sheet each minute.
import { queueReport } from './report.js?v=1794804625';
import { today } from './sync.js?v=1794804625';

const KEY = 'math-quest-time-v1', IDLE_MS = 90000, GOAL_MIN = 15;
let page = null, last = Date.now(), lastInput = Date.now(), unsent = {};
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const save = d => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* ignore */ } };

['pointerdown', 'keydown', 'touchstart'].forEach(e => addEventListener(e, () => { lastInput = Date.now(); }, { passive: true }));

function tick() {
  const now = Date.now(), dt = Math.min(now - last, 5000);
  last = now;
  if (!page || document.hidden || now - lastInput > IDLE_MS) return;
  const d = load(), day = today();
  d[day] = d[day] || {};
  d[day][page] = (d[day][page] || 0) + dt / 1000;
  save(d);
  unsent[page] = (unsent[page] || 0) + dt / 1000;
}
setInterval(tick, 1000);

export function flushTime() {
  for (const [p, s] of Object.entries(unsent)) if (s >= 5) { queueReport({ action: 'time', date: today(), page: p, seconds: Math.round(s) }); unsent[p] = 0; }
}
setInterval(flushTime, 60000);
document.addEventListener('visibilitychange', () => { if (document.hidden) flushTime(); });

export function startTiming(p) { tick(); page = p; last = Date.now(); lastInput = Date.now(); }
export function stopTiming() { tick(); page = null; flushTime(); }
export const minutesToday = p => Math.floor(((load()[today()] || {})[p] || 0) / 60);
export { GOAL_MIN };
