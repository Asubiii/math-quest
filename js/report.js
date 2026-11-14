// Sends each finished fight to the tutor's Google Sheet (via a Google Apps Script web app).
// Results queue on the device first, so nothing is lost when offline; the queue retries on the next load.

import { REPORT_URL } from './config.js?v=1794692624';

const QKEY = 'math-quest-outbox-v1';
const load = () => { try { return JSON.parse(localStorage.getItem(QKEY)) || []; } catch { return []; } };
const store = q => { try { localStorage.setItem(QKEY, JSON.stringify(q.slice(-3000))); } catch { /* ignore */ } };

export function queueReport(record) { const q = load(); q.push(record); store(q); return flush(); }

let flushing = false;
export async function flush() {
  if (!REPORT_URL || flushing || !navigator.onLine) return;
  flushing = true;
  try {
    let q = load();
    while (q.length) {
      // text/plain + no-cors avoids a CORS preflight, which Apps Script does not answer.
      await fetch(REPORT_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(q[0]) });
      q = load(); q.shift(); store(q);
    }
  } catch { /* offline or blocked: try again later */ } finally { flushing = false; }
}
addEventListener('online', flush);
