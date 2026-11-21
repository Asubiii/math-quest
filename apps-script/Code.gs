/**
 * HSPT Math Prep backend: a private Google Sheet that stores Victoria's progress and how much each
 * topic should be practiced (its Focus level). The website talks to it through this web app.
 *
 * Setup (once):
 *   1. New Google Sheet > Extensions > Apps Script > replace everything with this file.
 *      (Or a standalone script at script.google.com: put the sheet's ID in SHEET_ID below.)
 *   2. Put the tutor password between the quotes on the TUTOR_PASSWORD line below. Save.
 *   3. Run "setup" and approve the permission prompt.
 *   4. Deploy > New deployment > type "Web app", Execute as "Me", Who has access "Anyone" > Deploy.
 *   5. Copy the web app URL into js/config.js on the website.
 * Optional: run "createWeeklyEmail" once to get a Sunday summary email.
 */

const SHEET_ID = ''; // empty when the script is attached to the sheet itself
const TUTOR_PASSWORD = ''; // used by setup() only; stored privately in Script Properties

const SHEETS = {
  Topics: ['Topic', 'Active', 'Focus (0 normal, up to 5)', 'Why', 'Updated'],
  Packets: ['Date', 'Day', 'Section', 'Question', 'Topic', 'Her answer', 'Correct answer', 'Result', 'Marked hard'],
  Time: ['Date', 'Page', 'Seconds'],
  Reviews: ['Date', 'Card', 'Topic', 'Rating (1 again, 2 hard, 3 good, 4 easy)', 'Next interval (days)'],
  Fights: ['Time', 'Player', 'Skill', 'Speed rank', 'Goal (s)', 'Monster', 'Result', 'Questions', 'Correct', 'On time', 'Criticals',
    'Accuracy', 'Median (s)', 'Average (s)', 'Best combo', 'Rank after', 'Ranked up', 'Fight length (s)', 'Free play', 'Device'],
  Answers: ['Time', 'Player', 'Question type', 'Speed rank', 'Question', 'Correct answer', 'Her answer', 'Result', 'Mistake type', 'Seconds', 'Goal (s)'],
  Drill: ['Time', 'Question type', 'Style', 'Question', 'Correct answer', 'Her answer', 'Result', 'Seconds', 'Looked at setup'],
  State: ['Key', 'Value', 'Updated'],
};
const TOPICS = ['Fractions', 'Decimals', 'Conversions', 'Units', 'Ratios', 'Percents', 'Number Theory', 'Operations', 'Exponents',
  'Sequences', 'Roman Numerals', 'Algebra', 'Graphing', 'Geometry', 'Circles', 'Solids', 'Statistics', 'Probability'];
// Every topic is on. Focus makes a topic come up more often in Flashcards and Speed Study:
// missed or Hard packet questions raise it, a clean packet lowers it. These are her known weak spots
// from the class practice tests (Isaac, Nov 2026): sequences, algebra word problems, comparisons.
const START_FOCUS = { Sequences: 2, Algebra: 2, Operations: 2, Fractions: 1, Percents: 1, Decimals: 1 };
const MAX_FOCUS = 5;
// The website checks this before sending Quant Drill answers and in-progress practice days,
// so an older deployment never receives records it would misfile as fights.
const VERSION = 2;

function setup() {
  const ss = book();
  Object.keys(SHEETS).forEach(name => {
    const sh = ss.getSheetByName(name) || ss.insertSheet(name);
    if (sh.getLastRow() === 0) { sh.appendRow(SHEETS[name]); sh.setFrozenRows(1); sh.getRange(1, 1, 1, SHEETS[name].length).setFontWeight('bold'); }
  });
  const topics = ss.getSheetByName('Topics');
  if (topics.getLastRow() === 1) {
    topics.getRange(2, 1, TOPICS.length, 5).setValues(TOPICS.map(t => [t, true, START_FOCUS[t] || 0, START_FOCUS[t] ? 'Weak spot on class practice tests' : '', new Date()]));
    topics.getRange(2, 2, TOPICS.length, 1).insertCheckboxes();
  }
  if (TUTOR_PASSWORD) PropertiesService.getScriptProperties().setProperty('TUTOR_PASSWORD', TUTOR_PASSWORD);
  const blank = ss.getSheetByName('Sheet1');
  if (blank && blank.getLastRow() === 0) ss.deleteSheet(blank);
}

const book = () => (SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActive());
const json = x => ContentService.createTextOutput(JSON.stringify(x)).setMimeType(ContentService.MimeType.JSON);
const sheet = name => { const ss = book(); if (!ss.getSheetByName(name)) setup(); return ss.getSheetByName(name); };
const clean = v => (typeof v === 'string' ? v.slice(0, 300).replace(/^[=+\-@]/, "'$&") : v); // never store a formula from outside
const tz = () => Session.getScriptTimeZone();
const cell = v => (v instanceof Date ? Utilities.formatDate(v, tz(), "yyyy-MM-dd'T'HH:mm:ss") : v);
function rows(name, limit) {
  const sh = sheet(name), n = sh.getLastRow() - 1;
  if (n <= 0) return [];
  const take = Math.min(n, limit || n);
  return sh.getRange(sh.getLastRow() - take + 1, 1, take, sh.getLastColumn()).getValues().map(r => r.map(cell));
}
function getState(key) {
  const r = rows('State').find(x => x[0] === key);
  return r ? JSON.parse(r[1]) : null;
}
function setState(key, value) {
  const sh = sheet('State'), data = sh.getDataRange().getValues(), i = data.findIndex((r, j) => j > 0 && r[0] === key);
  const row = [key, JSON.stringify(value), new Date()];
  if (i > 0) sh.getRange(i + 1, 1, 1, 3).setValues([row]); else sh.appendRow(row);
}
const activeTopics = () => rows('Topics').filter(r => r[1] === true).map(r => r[0]);
const focusMap = () => Object.fromEntries(rows('Topics').map(r => [r[0], Number(r[2]) || 0]));
const bumpedMap = () => getState('bumped') || {};
function topicRow(topic) {
  const sh = sheet('Topics'), data = sh.getDataRange().getValues(), i = data.findIndex((r, j) => j > 0 && r[0] === topic);
  return i < 1 ? null : { sh, n: i + 1, row: data[i] };
}
function setTopic(topic, active, reason) {
  const t = topicRow(topic);
  if (!t) return false;
  t.sh.getRange(t.n, 2).setValue(!!active);
  t.sh.getRange(t.n, 4, 1, 2).setValues([[clean(reason || (active ? 'Turned on by tutor' : 'Turned off by tutor')), new Date()]]);
  return true;
}
function setFocus(topic, focus, reason) {
  const t = topicRow(topic);
  if (!t) return false;
  const f = Math.max(0, Math.min(MAX_FOCUS, Math.round(Number(focus) || 0)));
  t.sh.getRange(t.n, 3).setValue(f);
  t.sh.getRange(t.n, 4, 1, 2).setValues([[clean(reason || 'Set by tutor'), new Date()]]);
  return f;
}

function doGet(e) {
  const action = e && e.parameter && e.parameter.action;
  if (action === 'version') return json({ version: VERSION });
  if (action === 'student') return json({ topics: activeTopics(), focus: focusMap(), bumped: bumpedMap(), flash: getState('flash') });
  return ContentService.createTextOutput('HSPT Math Prep backend is running.');
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const r = JSON.parse(e.postData.contents);
    switch (r.action) {
      case 'time': sheet('Time').appendRow([clean(r.date), clean(r.page), Number(r.seconds) || 0]); return json({ ok: true });
      case 'review': sheet('Reviews').appendRow([clean(r.date), clean(r.card), clean(r.topic), Number(r.rating) || 0, Number(r.ivl) || 0]); return json({ ok: true });
      case 'flashState': {
        const old = getState('flash');
        if (!old || (r.flash.updated || 0) >= (old.updated || 0)) setState('flash', r.flash);
        return json({ ok: true });
      }
      case 'practice': return json(savePacket(r));
      case 'drill': return json(saveDrill(r));
      case 'tutor': return json(tutor(r));
      default: logFight(r); return json({ ok: true });
    }
  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally { lock.releaseLock(); }
}

function tutor(r) {
  const pw = PropertiesService.getScriptProperties().getProperty('TUTOR_PASSWORD');
  if (!pw || r.password !== pw) return { ok: false, error: 'password' };
  if (r.op === 'login') return { ok: true };
  if (r.op === 'setTopic') return { ok: setTopic(r.topic, r.active) };
  if (r.op === 'setFocus') { const f = setFocus(r.topic, r.focus); return { ok: f !== false, focus: f }; }
  if (r.op === 'dashboard') {
    const fights = rows('Fights', 200).map(f => [f[0], f[3], f[6], f[7], f[8], f[13]]);
    return {
      ok: true, topics: rows('Topics').map(t => ({ topic: t[0], active: t[1] === true, focus: Number(t[2]) || 0, reason: t[3], updated: t[4] })),
      flash: getState('flash'), reviews: rows('Reviews', 4000), time: rows('Time', 3000), packets: rows('Packets', 1500), fights,
      drill: rows('Drill', 3000),
    };
  }
  // A graded answer sheet: one row per question. Each missed or Hard question raises its topic's Focus
  // by 1 (2 if both), so it comes up more often; a topic answered cleanly in this packet drops by 1.
  // Re-sending the same day's sheet replaces it instead of counting twice.
  if (r.op === 'packet') return savePacket(r);
  return { ok: false, error: 'unknown op' };
}

// A graded day (paper answer sheet, or a finished Weekly Practice day sent from the site).
function savePacket(r) {
  {
    const sh = sheet('Packets');
    const old = sh.getDataRange().getValues();
    for (let i = old.length - 1; i >= 1; i--) if (cell(old[i][0]).slice(0, 10) === String(r.date).slice(0, 10)) sh.deleteRow(i + 1);
    const out = (r.rows || []).map(q => [clean(r.date), clean(r.day), clean(q.section || r.section), q.q, clean(q.topic), clean(q.answer || ''), clean(q.correct), clean(q.result), q.hard ? 'yes' : '']);
    if (out.length) sh.getRange(sh.getLastRow() + 1, 1, out.length, out[0].length).setValues(out);
    const done = getState('packetsCounted') || {}, focus = focusMap(), bumped = bumpedMap(), changes = {};
    if (!done[r.date] && !r.partial) { // an unfinished day shows its answers but changes no Focus yet
      const up = {}, seen = new Set();
      (r.rows || []).forEach(q => {
        if (!TOPICS.includes(q.topic)) return;
        seen.add(q.topic);
        const n = (q.result !== 'right' ? 1 : 0) + (q.hard ? 1 : 0);
        if (n) up[q.topic] = (up[q.topic] || 0) + n;
      });
      seen.forEach(t => {
        const before = focus[t] || 0, after = Math.max(0, Math.min(MAX_FOCUS, before + (up[t] ? Math.min(up[t], 2) : -1)));
        if (after !== before) { setFocus(t, after, `${up[t] ? 'Missed or Hard' : 'Clean'} on ${r.day} packet (${r.date})`); changes[t] = after; }
        if (up[t]) bumped[t] = Date.now();
      });
      done[r.date] = true; setState('packetsCounted', done); setState('bumped', bumped);
    }
    return { ok: true, saved: out.length, focus: changes };
  }
}

// Quant Drill answers, one row each.
function saveDrill(r) {
  const out = (r.answers || []).slice(0, 200).map(a => [new Date(a.time || Date.now()), clean(a.type), clean(a.style), clean(a.q), clean(a.correct),
    clean(a.chosen), clean(a.result), Number(a.sec) || 0, a.setup ? 'yes' : '']);
  if (out.length) { const sh = sheet('Drill'); sh.getRange(sh.getLastRow() + 1, 1, out.length, out[0].length).setValues(out); }
  return { ok: true, saved: out.length };
}

function logFight(r) {
  const when = new Date(r.time || Date.now()), player = clean(String(r.player || 'unknown'));
  const acc = r.questions ? r.correct / r.questions : 0;
  const fights = sheet('Fights');
  fights.appendRow([when, player, clean(r.skill), r.rank, r.goal, clean(r.monster), clean(r.result), r.questions, r.correct, r.onTime, r.crits,
    acc, r.medianSec, r.avgSec, r.bestCombo, r.rankAfter, r.rankedUp ? 'yes' : '', r.seconds, r.freePlay ? 'yes' : '', clean(r.device)]);
  fights.getRange(fights.getLastRow(), 12).setNumberFormat('0%');
  const out = (r.answers || []).slice(0, 80).map(a => [when, player, clean(a.type || r.skill), r.rank, clean(a.q), clean(a.answer), clean(a.chosen), clean(a.result), clean(a.mistake || ''), a.sec, a.goal || r.goal]);
  if (out.length) { const sh = sheet('Answers'); sh.getRange(sh.getLastRow() + 1, 1, out.length, out[0].length).setValues(out); }
}

/** Optional: run once to email yourself a summary every Sunday evening. */
function createWeeklyEmail() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'weeklyEmail').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('weeklyEmail').timeBased().onWeekDay(ScriptApp.WeekDay.SUNDAY).atHour(18).create();
}

function weeklyEmail() {
  const since = Utilities.formatDate(new Date(Date.now() - 7 * 864e5), tz(), 'yyyy-MM-dd');
  const inWeek = d => String(d).slice(0, 10) >= since;
  const time = rows('Time').filter(r => inWeek(r[0])), reviews = rows('Reviews').filter(r => inWeek(r[0]));
  const packets = rows('Packets').filter(r => inWeek(r[0])), fights = rows('Fights').filter(r => inWeek(r[0]));
  const mins = p => Math.round(time.filter(r => r[1] === p).reduce((a, r) => a + Number(r[2]), 0) / 60);
  const lines = ['HSPT Math Prep: last 7 days', '',
    `Speed Study: ${mins('speed')} min, ${fights.length} fights`,
    `Flashcards: ${mins('flash')} min, ${reviews.length} cards reviewed`,
    `Packets: ${packets.filter(r => r[7] === 'right').length}/${packets.length} right, ${packets.filter(r => r[8] === 'yes').length} marked hard`,
    '', `Flashcard topics on: ${activeTopics().join(', ') || 'none'}`, '', book().getUrl()];
  MailApp.sendEmail(Session.getEffectiveUser().getEmail(), 'HSPT Math Prep weekly summary', lines.join('\n'));
}
