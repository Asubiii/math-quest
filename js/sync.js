// Talks to the tutor's Google Sheet (Google Apps Script web app, URL in config.js).
// Writes that need no answer go through the offline queue in report.js; reads and tutor calls use these.
import { REPORT_URL as API } from './config.js?v=1794957318';

export const connected = () => !!API;

export async function getJSON(action, params = {}) {
  const u = new URL(API);
  u.searchParams.set('action', action);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const r = await fetch(u, { cache: 'no-store' });
  return r.json();
}

// POST with a JSON reply. text/plain avoids a CORS preflight, which Apps Script does not answer.
export async function postJSON(body) {
  const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) });
  return r.json();
}

export const today = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
