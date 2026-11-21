// Sends results to the tutor's Google Sheet (via a Google Apps Script web app).
// Results queue on the device first, so nothing is lost when offline; the queue retries on the next load.
// A record marked `needs: n` waits until the deployed script reports version n or newer, so an older
// deployment never receives an action it doesn't know (it would file it as a fight).
// A record with a `key` replaces any unsent record with the same key (one in-progress practice day).
import { TEST } from './testmode.js?v=1795219928';

import { REPORT_URL } from './config.js?v=1795219928';

const QKEY = 'math-quest-outbox-v1';
const load = () => { try { return JSON.parse(localStorage.getItem(QKEY)) || []; } catch { return []; } };
const store = q => { try { localStorage.setItem(QKEY, JSON.stringify(q.slice(-3000))); } catch { /* ignore */ } };

export function queueReport(record) {
  if (TEST) return;
  let q = load();
  if (record.key) q = q.filter(r => r.key !== record.key);
  q.push(record); store(q);
  return flush();
}

let serverVersion = 0, checkedAt = 0;
async function version() {
  if (serverVersion >= 2 || Date.now() - checkedAt < 60000) return serverVersion;
  checkedAt = Date.now();
  try {
    const u = new URL(REPORT_URL); u.searchParams.set('action', 'version');
    const r = await fetch(u, { cache: 'no-store' }).then(x => x.json());
    serverVersion = Number(r.version) || 1;
  } catch { serverVersion = serverVersion || 0; } // old script answers with plain text: treat as version 1
  return serverVersion;
}

let flushing = false, again = false;
export async function flush() {
  if (!REPORT_URL || !navigator.onLine) return;
  if (flushing) { again = true; return; }
  flushing = true;
  try {
    do {
      again = false;
      const v = load().some(r => r.needs) ? await version() : 0;
      for (;;) {
        const rec = load().find(r => !r.needs || r.needs <= v);
        if (!rec) break;
        const { needs, key, ...body } = rec;
        // text/plain + no-cors avoids a CORS preflight, which Apps Script does not answer.
        await fetch(REPORT_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) });
        const q = load(), i = q.findIndex(r => JSON.stringify(r) === JSON.stringify(rec)); // first copy only
        if (i >= 0) { q.splice(i, 1); store(q); }
      }
    } while (again);
  } catch { /* offline or blocked: try again later */ } finally { flushing = false; }
}
addEventListener('online', flush);
setInterval(flush, 120000); // also picks up held records once a newer script is deployed
