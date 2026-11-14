/**
 * Math Quest reporting. Receives one record per finished fight and writes it to this spreadsheet.
 *
 * Setup (once): open a new Google Sheet > Extensions > Apps Script > paste this file > Run "setup"
 * > Deploy > New deployment > Web app > Execute as "Me", Who has access "Anyone" > copy the URL
 * into js/config.js. Optional: run "createWeeklyEmail" once to get a Sunday summary by email.
 */

const SHEETS = {
  Fights: ['Time', 'Player', 'Skill', 'Speed rank', 'Goal (s)', 'Monster', 'Result', 'Questions', 'Correct', 'On time', 'Criticals',
    'Accuracy', 'Median (s)', 'Average (s)', 'Best combo', 'Rank after', 'Ranked up', 'Fight length (s)', 'Free play', 'Device'],
  Answers: ['Time', 'Player', 'Skill', 'Speed rank', 'Question', 'Correct answer', 'Her answer', 'Result', 'Mistake type', 'Seconds', 'Goal (s)'],
  Ranks: ['Player', 'Skill', 'Speed rank', 'Goal (s)', 'Last played', 'Fights', 'Last rank-up'],
};

function setup() {
  const ss = SpreadsheetApp.getActive();
  Object.keys(SHEETS).forEach(name => {
    const sh = ss.getSheetByName(name) || ss.insertSheet(name);
    if (sh.getLastRow() === 0) { sh.appendRow(SHEETS[name]); sh.setFrozenRows(1); sh.getRange(1, 1, 1, SHEETS[name].length).setFontWeight('bold'); }
  });
  let sum = ss.getSheetByName('Summary');
  if (!sum) {
    sum = ss.insertSheet('Summary', 0);
    sum.getRange('A1').setValue('Math Quest summary').setFontWeight('bold').setFontSize(14);
    sum.getRange('A3').setValue('Current speed ranks').setFontWeight('bold');
    sum.getRange('A4').setFormula('=IFERROR(QUERY(Ranks!A:G,"select A,B,C,D,E,F,G where A is not null",1),"No fights yet")');
    sum.getRange('I3').setValue('Most-missed questions (wrong answers)').setFontWeight('bold');
    sum.getRange('I4').setFormula('=IFERROR(QUERY(Answers!A:K,"select E,F,count(A) where H=\'wrong\' group by E,F order by count(A) desc limit 15 label E \'Question\', F \'Answer\', count(A) \'Times missed\'",1),"None yet")');
    sum.getRange('M3').setValue('Most common mistake types').setFontWeight('bold');
    sum.getRange('M4').setFormula('=IFERROR(QUERY(Answers!A:K,"select I,count(A) where H=\'wrong\' and I is not null group by I order by count(A) desc limit 10 label I \'Mistake\', count(A) \'Times\'",1),"None yet")');
    sum.getRange('P3').setValue('Slowest correct questions (too slow)').setFontWeight('bold');
    sum.getRange('P4').setFormula('=IFERROR(QUERY(Answers!A:K,"select E,count(A),avg(J) where H=\'late\' group by E order by count(A) desc limit 15 label E \'Question\', count(A) \'Times late\', avg(J) \'Avg seconds\'",1),"None yet")');
    sum.getRange('A20').setValue('Fights per day').setFontWeight('bold');
    sum.getRange('A21').setFormula('=IFERROR(QUERY(Fights!A:T,"select toDate(A),count(B),sum(H),avg(L) where A is not null group by toDate(A) order by toDate(A) desc limit 30 label toDate(A) \'Day\', count(B) \'Fights\', sum(H) \'Questions\', avg(L) \'Accuracy\' format avg(L) \'0%\'",1),"None yet")');
  }
  const blank = ss.getSheetByName('Sheet1');
  if (blank && blank.getLastRow() === 0) ss.deleteSheet(blank);
}

function doGet() { return ContentService.createTextOutput('Math Quest reporting is running.'); }

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const r = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActive();
    if (!ss.getSheetByName('Fights')) setup();
    const clean = v => (typeof v === 'string' ? v.slice(0, 200).replace(/^[=+\-@]/, "'$&") : v); // no formulas from outside
    const when = new Date(r.time || Date.now());
    const player = clean(String(r.player || 'unknown'));
    const acc = r.questions ? r.correct / r.questions : 0;
    ss.getSheetByName('Fights').appendRow([when, player, clean(r.skill), r.rank, r.goal, clean(r.monster), clean(r.result), r.questions, r.correct, r.onTime, r.crits,
      acc, r.medianSec, r.avgSec, r.bestCombo, r.rankAfter, r.rankedUp ? 'yes' : '', r.seconds, r.freePlay ? 'yes' : '', clean(r.device)]);
    const fights = ss.getSheetByName('Fights'); fights.getRange(fights.getLastRow(), 12).setNumberFormat('0%');
    const rows = (r.answers || []).slice(0, 80).map(a => [when, player, clean(r.skill), r.rank, clean(a.q), clean(a.answer), clean(a.chosen), clean(a.result), clean(a.mistake || ''), a.sec, r.goal]);
    if (rows.length) { const sh = ss.getSheetByName('Answers'); sh.getRange(sh.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows); }
    // One row per player and skill with the latest rank.
    const ranks = ss.getSheetByName('Ranks'), data = ranks.getDataRange().getValues();
    let row = data.findIndex((d, i) => i > 0 && d[0] === player && d[1] === r.skill) + 1;
    const goalAfter = r.goalAfter || r.goal;
    if (!row) { ranks.appendRow([player, clean(r.skill), r.rankAfter, goalAfter, when, 1, r.rankedUp ? when : '']); }
    else {
      ranks.getRange(row, 3, 1, 3).setValues([[r.rankAfter, goalAfter, when]]);
      ranks.getRange(row, 6).setValue((Number(data[row - 1][5]) || 0) + 1);
      if (r.rankedUp) ranks.getRange(row, 7).setValue(when);
    }
    return ContentService.createTextOutput('ok');
  } catch (err) {
    return ContentService.createTextOutput('error: ' + err);
  } finally { lock.releaseLock(); }
}

/** Optional: run once to email yourself a summary every Sunday evening. */
function createWeeklyEmail() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'weeklyEmail').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('weeklyEmail').timeBased().onWeekDay(ScriptApp.WeekDay.SUNDAY).atHour(18).create();
}

function weeklyEmail() {
  const ss = SpreadsheetApp.getActive(), since = new Date(Date.now() - 7 * 864e5);
  const fights = ss.getSheetByName('Fights').getDataRange().getValues().slice(1).filter(f => f[0] >= since);
  const answers = ss.getSheetByName('Answers').getDataRange().getValues().slice(1).filter(a => a[0] >= since);
  const ranks = ss.getSheetByName('Ranks').getDataRange().getValues().slice(1);
  const lines = ['Math Quest: last 7 days', ''];
  if (!fights.length) lines.push('No fights played this week.');
  else {
    const q = fights.reduce((s, f) => s + f[7], 0), c = fights.reduce((s, f) => s + f[8], 0);
    const days = new Set(fights.map(f => Utilities.formatDate(f[0], Session.getScriptTimeZone(), 'yyyy-MM-dd'))).size;
    lines.push(fights.length + ' fights on ' + days + ' day(s), ' + q + ' questions, ' + Math.round(100 * c / Math.max(1, q)) + '% correct.');
    lines.push('Rank-ups this week: ' + (fights.filter(f => f[16] === 'yes').map(f => f[2] + ' to rank ' + f[15]).join('; ') || 'none'));
    const missed = {};
    answers.filter(a => a[7] === 'wrong').forEach(a => { const k = a[4] + '  (answer ' + a[5] + ')'; missed[k] = (missed[k] || 0) + 1; });
    const top = Object.keys(missed).sort((a, b) => missed[b] - missed[a]).slice(0, 8);
    if (top.length) { lines.push('', 'Most missed:'); top.forEach(k => lines.push('  ' + missed[k] + 'x  ' + k)); }
  }
  lines.push('', 'Current speed ranks:');
  ranks.forEach(r => lines.push('  ' + r[0] + ', ' + r[1] + ': rank ' + r[2]));
  lines.push('', ss.getUrl());
  MailApp.sendEmail(Session.getEffectiveUser().getEmail(), 'Math Quest weekly summary', lines.join('\n'));
}
