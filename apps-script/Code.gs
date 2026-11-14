/**
 * Math Quest backend: a private Google Sheet that stores Victoria's progress and the tutor's
 * flashcard topic switches. The website talks to it through this web app.
 *
 * Setup (once):
 *   1. New Google Sheet > Extensions > Apps Script > replace everything with this file.
 *   2. Put the tutor password between the quotes on the TUTOR_PASSWORD line below. Save.
 *   3. Run "setup" and approve the permission prompt.
 *   4. Deploy > New deployment > type "Web app", Execute as "Me", Who has access "Anyone" > Deploy.
 *   5. Copy the web app URL into js/config.js on the website.
 * Optional: run "createWeeklyEmail" once to get a Sunday summary email.
 */

const TUTOR_PASSWORD = ''; // used by setup() only; stored privately in Script Properties

const SHEETS = {
  Topics: ['Topic', 'Active', 'Why it is on', 'Updated'],
  Packets: ['Date', 'Day', 'Section', 'Question', 'Topic', 'Her answer', 'Correct answer', 'Result', 'Marked hard'],
  Time: ['Date', 'Page', 'Seconds'],
  Reviews: ['Date', 'Card', 'Topic', 'Rating (1 again, 2 hard, 3 good, 4 easy)', 'Next interval (days)'],
  Fights: ['Time', 'Player', 'Skill', 'Speed rank', 'Goal (s)', 'Monster', 'Result', 'Questions', 'Correct', 'On time', 'Criticals',
    'Accuracy', 'Median (s)', 'Average (s)', 'Best combo', 'Rank after', 'Ranked up', 'Fight length (s)', 'Free play', 'Device'],
  Answers: ['Time', 'Player', 'Question type', 'Speed rank', 'Question', 'Correct answer', 'Her answer', 'Result', 'Mistake type', 'Seconds', 'Goal (s)'],
  State: ['Key', 'Value', 'Updated'],
};
const TOPICS = ['Fractions', 'Decimals', 'Conversions', 'Units', 'Ratios', 'Percents', 'Number Theory', 'Operations', 'Exponents',
  'Sequences', 'Roman Numerals', 'Algebra', 'Graphing', 'Geometry', 'Circles', 'Solids', 'Statistics', 'Probability'];
const START_ON = ['Fractions', 'Decimals', 'Conversions'];

function setup() {
  const ss = SpreadsheetApp.getActive();
  Object.keys(SHEETS).forEach(name => {
    const sh = ss.getSheetByName(name) || ss.insertSheet(name);
    if (sh.getLastRow() === 0) { sh.appendRow(SHEETS[name]); sh.setFrozenRows(1); sh.getRange(1, 1, 1, SHEETS[name].length).setFontWeight('bold'); }
  });
  const topics = ss.getSheetByName('Topics');
  if (topics.getLastRow() === 1) {
    topics.getRange(2, 1, TOPICS.length, 4).setValues(TOPICS.map(t => [t, START_ON.includes(t), START_ON.includes(t) ? 'Starting topic' : '', new Date()]));
    topics.getRange(2, 2, TOPICS.length, 1).insertCheckboxes();
  }
  if (TUTOR_PASSWORD) PropertiesService.getScriptProperties().setProperty('TUTOR_PASSWORD', TUTOR_PASSWORD);
  const blank = ss.getSheetByName('Sheet1');
  if (blank && blank.getLastRow() === 0) ss.deleteSheet(blank);
}

const json = x => ContentService.createTextOutput(JSON.stringify(x)).setMimeType(ContentService.MimeType.JSON);
const sheet = name => { const ss = SpreadsheetApp.getActive(); if (!ss.getSheetByName(name)) setup(); return ss.getSheetByName(name); };
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
function setTopic(topic, active, reason) {
  const sh = sheet('Topics'), data = sh.getDataRange().getValues(), i = data.findIndex((r, j) => j > 0 && r[0] === topic);
  if (i < 1) return false;
  sh.getRange(i + 1, 2, 1, 3).setValues([[!!active, clean(reason || (active ? 'Turned on by tutor' : '')), new Date()]]);
  return true;
}

function doGet(e) {
  const action = e && e.parameter && e.parameter.action;
  if (action === 'student') return json({ topics: activeTopics(), flash: getState('flash') });
  return ContentService.createTextOutput('Math Quest backend is running.');
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
  if (r.op === 'dashboard') {
    const fights = rows('Fights', 200).map(f => [f[0], f[3], f[6], f[7], f[8], f[13]]);
    return {
      ok: true, topics: rows('Topics').map(t => ({ topic: t[0], active: t[1] === true, reason: t[2], updated: t[3] })),
      flash: getState('flash'), reviews: rows('Reviews', 4000), time: rows('Time', 3000), packets: rows('Packets', 1500), fights,
    };
  }
  // A graded answer sheet: one row per question, then turn on the topics of missed or hard questions.
  if (r.op === 'packet') {
    const sh = sheet('Packets');
    const out = (r.rows || []).map(q => [clean(r.date), clean(r.day), clean(r.section), q.q, clean(q.topic), clean(q.answer || ''), clean(q.correct), clean(q.result), q.hard ? 'yes' : '']);
    if (out.length) sh.getRange(sh.getLastRow() + 1, 1, out.length, out[0].length).setValues(out);
    const turnedOn = [];
    (r.activate || []).forEach(t => { if (TOPICS.includes(t) && !activeTopics().includes(t)) { setTopic(t, true, `From ${r.day} packet (${r.date})`); turnedOn.push(t); } });
    return { ok: true, saved: out.length, turnedOn };
  }
  return { ok: false, error: 'unknown op' };
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
  const lines = ['Math Quest: last 7 days', '',
    `Speed Study: ${mins('speed')} min, ${fights.length} fights`,
    `Flashcards: ${mins('flash')} min, ${reviews.length} cards reviewed`,
    `Packets: ${packets.filter(r => r[7] === 'right').length}/${packets.length} right, ${packets.filter(r => r[8] === 'yes').length} marked hard`,
    '', `Flashcard topics on: ${activeTopics().join(', ') || 'none'}`, '', SpreadsheetApp.getActive().getUrl()];
  MailApp.sendEmail(Session.getEffectiveUser().getEmail(), 'Math Quest weekly summary', lines.join('\n'));
}
