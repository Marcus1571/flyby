// Engine: time-driven trigger (tick) + reminder storage. State = Gmail labels + UserProperties.

const L_WAITING = 'FlyBy/Waiting', L_NOREPLY = 'FlyBy/No reply', L_RETURNED = 'FlyBy/Returned', L_FOLLOWED = 'FlyBy/Followed up', L_REPLIED = 'FlyBy/Replied';
// Stamped into 'replied'/'returned' log rows so a row shows which code produced it (a stale trigger was suspected 2026-11-16).
const BUILD = '2026-11-27.a';
const SCAN_OVERLAP_MS = 30 * 60 * 1000;

function props() { return PropertiesService.getUserProperties(); }
function myAddrs() { return [Session.getEffectiveUser().getEmail()].concat(GmailApp.getAliases()); }

function label(name) {
  if (!GmailApp.getUserLabelByName('FlyBy')) GmailApp.createLabel('FlyBy');
  return GmailApp.getUserLabelByName(name) || GmailApp.createLabel(name);
}

// Resolve a parsed code ({hours} or {days, hour}) to an absolute ms in the user's time zone.
function dueFromCode(code, nowMs, tz) {
  const p = parseCode(code);
  if (!p) throw new Error('Unknown FlyBy code: ' + code);
  if (p.atMs) return p.atMs;
  if (p.hours) return nowMs + p.hours * 3600e3;
  const day = Utilities.formatDate(new Date(nowMs + p.days * 86400e3), tz, 'yyyy-MM-dd');
  return Utilities.parseDate(day + ' ' + p.hour + ':00', tz, 'yyyy-MM-dd H:mm').getTime();
}

function getReminder(threadId) { const v = props().getProperty('t:' + threadId); return v ? JSON.parse(v) : null; }

function setReminder(thread, dueMs, onlyIfNoReply, source, followUp) {
  const msgs = toPlain(thread, true), addrs = myAddrs();
  const r = { due: dueMs, noreply: !!onlyIfNoReply, anchor: anchorOf(msgs, addrs, Date.now()),
              subject: thread.getFirstMessageSubject().slice(0, 120), set: Date.now(), source: source };
  if (followUp && onlyIfNoReply) r.followUp = String(followUp).slice(0, 4000);
  props().setProperty('t:' + thread.getId(), JSON.stringify(r));
  // a new reminder starts a new round: drop the outcome labels of the previous one
  [L_NOREPLY, L_RETURNED, L_FOLLOWED, L_REPLIED].forEach(n => thread.removeLabel(label(n)));
  thread.addLabel(label(L_WAITING));
  // a reply that came in before the reminder was set (the Bcc scan runs every 5 minutes) must stay in the inbox:
  // archiving is per thread, so it hid the reply too (seen 2026-11-26). A later reply brings the thread back by itself.
  if (repliedBy(msgs, addrs, r.anchor)) logEvent('kept-in-inbox', thread.getId(), r, 'a reply is already in');
  else thread.moveToArchive();
  logEvent('set', thread.getId(), r, '');
  return r; // never touch the trigger here: deleting it from the add-on context and failing to recreate it stopped every reminder (2026-11-16)
}

function cancelReminder(thread) {
  const r = getReminder(thread.getId());
  props().deleteProperty('t:' + thread.getId());
  thread.removeLabel(label(L_WAITING));
  if (r) thread.moveToInbox(); // the user cancelled to handle it themselves; no reminder stored = leave the thread where it is
  logEvent('cancel', thread.getId(), r, '');
}

// withAuto: also read the headers that mark automatic mail (one extra Gmail call per message), used when judging replies.
function toPlain(thread, withAuto) {
  return thread.getMessages().map(m => {
    const p = { from: m.getFrom(), date: m.getDate().getTime(), draft: m.isDraft() };
    if (withAuto) {
      const h = {};
      for (const k of ['Auto-Submitted', 'Precedence', 'X-Autoreply', 'X-Autorespond']) {
        try { h[k.toLowerCase()] = m.getHeader(k); } catch (e) { /* header unreadable: treated as absent */ }
      }
      p.auto = isAutomated(p.from, h);
    }
    return p;
  });
}

// ---- trigger ----

function tick() {
  const lock = LockService.getUserLock();
  if (!lock.tryLock(5000)) { logEvent('tick-skipped', '', null, 'could not get the lock (a previous run still active?)'); return; }
  const t0 = Date.now();
  try {
    // each step on its own: one failing step must not stop the others (and is logged, not silent)
    for (const [name, fn] of [['scan', scanBccCodes], ['replies', processEarlyReplies], ['due', processDue], ['recurring', processRecurring], ['cleanup', dropStaleFollowUps]]) {
      try { fn(); } catch (err) { logEvent('tick-error', '', null, name + ': ' + err); }
    }
  } finally {
    lock.releaseLock();
    // Empty ticks leave no trace, so: one heartbeat row per hour, and a warning when a run is slow (daily runtime quota: 90 min).
    const ms = Date.now() - t0, beat = +(props().getProperty('lastBeat') || 0);
    const waiting = Object.keys(props().getProperties()).filter(k => k.startsWith('t:')).length;
    if (ms > 20000) logEvent('tick-slow', '', null, `${ms} ms [${BUILD}]`);
    if (Date.now() - beat > 3300e3) { props().setProperty('lastBeat', String(Date.now())); logEvent('tick-ok', '', null, `heartbeat: last run ${ms} ms, ${waiting} reminder(s) waiting [${BUILD}]`); }
  }
}

// Sent mail carrying me+<code>@… in To/Cc/Bcc becomes a reminder (works from any device/app).
function scanBccCodes() {
  const now = Date.now();
  const last = +(props().getProperty('lastScan') || (now - 86400e3));
  // Gmail can't wildcard addresses, so look at all my recent sent mail and let findCode pick the codes.
  const q = `from:me after:${Math.floor((last - SCAN_OVERLAP_MS) / 1000)}`;
  const addrs = myAddrs();
  for (const thread of GmailApp.search(q, 0, 50)) scanThread(thread, last, addrs);
  props().setProperty('lastScan', String(now));
}

// One thread of the scan. Also called directly by the API right after Send: GmailApp.search can take ~15 s to see a
// just-sent mail, getThreadById sees it at once (operator measured ~20 s with the search-only version, 2026-11-26).
function scanThread(thread, last, addrs) {
  if (getReminder(thread.getId())) return;
  for (const m of thread.getMessages().reverse()) {
    if (m.isDraft() || m.getDate().getTime() < last - SCAN_OVERLAP_MS) continue;
    const tag = findCode([m.getBcc(), m.getTo(), m.getCc()].join(','), addrs);
    if (!tag) continue;
    const t = parseTag(tag);
    const done = JSON.parse(props().getProperty('doneMsgs') || '[]');
    if (done.includes(m.getId())) return; // already handled once (reminder finished inside overlap window)
    const followUp = t.key && !t.regardless ? takeFollowUp(t.key) : null;
    if (t.key && !followUp) logEvent('followup-missing', thread.getId(), null, 'no text stored under key ' + t.key);
    setReminder(thread, dueFromCode(t.code, m.getDate().getTime(), Session.getScriptTimeZone()), !t.regardless, 'bcc:' + tag, followUp);
    props().setProperty('doneMsgs', JSON.stringify(done.concat(m.getId()).slice(-200)));
    return;
  }
}

// A real reply (not an out-of-office/bounce) ends an "if no reply" reminder now instead of at the due time.
// One search per tick for the waiting threads. Do NOT add "in:inbox": Gmail matches per message, and the label sits on my
// old message while the reply (the one in the inbox) has no label, so the combination matched nothing (seen live 2026-11-16).
// ponytail: 50 waiting threads max per tick; the due-time check still covers the rest.
function processEarlyReplies() {
  const addrs = myAddrs();
  for (const thread of GmailApp.search('label:FlyBy-Waiting', 0, 50)) {
    const id = thread.getId(), r = getReminder(id);
    if (!r || !r.noreply) continue; // "regardless" reminders stay until due
    if (thread.getLastMessageDate().getTime() <= r.anchor) continue; // nothing newer than my message: skip the expensive read
    const by = repliedBy(toPlain(thread, true), addrs, r.anchor);
    if (!by) continue;
    props().deleteProperty('t:' + id);
    thread.removeLabel(label(L_WAITING)).addLabel(label(L_REPLIED));
    logEvent('replied-early', id, r, `reply from ${by.from} at ${new Date(by.date).toISOString()} [${BUILD}]`);
  }
}

function processDue() {
  const now = Date.now(), all = props().getProperties(), addrs = myAddrs();
  for (const key of Object.keys(all).filter(k => k.startsWith('t:'))) {
    const r = JSON.parse(all[key]), id = key.slice(2);
    if (r.due > now) continue;
    try { dueOne(key, id, r, addrs); } catch (err) {
      // the reminder is kept and retried on the next tick (max 3 attempts), never lost on an error
      r.fails = (r.fails || 0) + 1;
      if (r.fails < 3) { props().setProperty(key, JSON.stringify(r)); logEvent('due-failed', id, r, `attempt ${r.fails}, will retry: ${err}`); }
      else { props().deleteProperty(key); logEvent('due-gave-up', id, r, `after ${r.fails} attempts: ${err}`); }
    }
  }
}

function dueOne(key, id, r, addrs) {
  const thread = GmailApp.getThreadById(id);
  props().deleteProperty(key);
  if (!thread) { logEvent('gone', id, r, 'thread deleted'); return; }
  thread.removeLabel(label(L_WAITING));
  const msgs = r.noreply ? toPlain(thread, true) : [];
  const by = r.noreply ? repliedBy(msgs, addrs, r.anchor) : null;
  if (by) { thread.addLabel(label(L_REPLIED)); logEvent('replied', id, r, `no action [${BUILD}]: counted ${by.from} at ${new Date(by.date).toISOString()} (auto=${by.auto}; ${msgs.length} msgs, anchor ${new Date(r.anchor).toISOString()}, mine: ${addrs.join(',')})`); return; }
  const ignored = msgs.filter(m => m.auto && m.date > r.anchor).length; // automatic mail does not count as an answer
  thread.moveToInbox().markUnread().addLabel(label(r.noreply ? L_NOREPLY : L_RETURNED));
  logEvent('returned', id, r, `[${BUILD}] ` + (r.noreply ? 'no reply' + (ignored ? ` (ignored ${ignored} automatic message(s))` : '') : 'regardless'));
  if (r.followUp) sendFollowUp(thread, r, id);
}

// Auto follow-up: a threaded reply to the people I originally wrote to (To/Cc), never to myself.
// GmailMessage.reply on my own message goes back to me (seen live, 2026-11-15), so the draft's recipients are
// overwritten and checked BEFORE sending; on any mismatch nothing is sent. The log records who got it.
function sendFollowUp(thread, r, id) {
  let draft, step = 'read thread';
  try {
    const last = thread.getMessages().filter(m => !m.isDraft()).pop(), addrs = myAddrs();
    const to = othersIn(last.getTo(), addrs), cc = othersIn(last.getCc(), addrs).filter(a => !to.includes(a));
    if (!to.length && !cc.length) { logEvent('followup-skipped', id, r, 'nobody but me in To/Cc'); return; }
    step = 'createDraftReply';
    draft = last.createDraftReply(r.followUp);
    step = 'draft.update';
    draft = draft.update((to.length ? to : cc).join(','), 'Re: ' + thread.getFirstMessageSubject(), r.followUp,
                         { cc: to.length ? cc.join(',') : '' }); // update gives the draft a new id: keep the returned one
    step = 'check recipients';
    const m = readDraftMessage(draft, thread), got = othersIn(m.getTo() + ',' + m.getCc(), []);
    if (got.length !== to.length + cc.length || othersIn(m.getTo() + ',' + m.getCc(), addrs).length !== got.length) {
      throw new Error('draft recipients differ from the original: ' + m.getTo() + ' / ' + m.getCc());
    }
    step = 'send';
    const sent = draft.send();
    draft = null;
    thread.addLabel(label(L_FOLLOWED));
    logEvent('followup', id, r, 'sent to ' + sent.getTo() + (sent.getCc() ? ' cc ' + sent.getCc() : '') + ' (' + r.followUp.length + ' chars)');
  } catch (err) {
    if (draft) { try { draft.deleteDraft(); } catch (e) { /* ignore */ } }
    logEvent('followup-failed', id, r, 'at ' + step + ': ' + err);
  }
}

// draft.update() returns a draft that getMessage() sometimes cannot find yet ("Not found", seen live 2026-11-15,
// tests 06/07): retry with the draft object, then re-fetched by id, then the thread's own draft message.
// ponytail: 4 tries, 1.5 s apart.
function readDraftMessage(draft, thread) {
  let err;
  for (let i = 0; i < 4; i++) {
    try {
      if (i === 0) return draft.getMessage();
      if (i === 1) return GmailApp.getDraft(draft.getId()).getMessage();
      const d = thread.getMessages().filter(m => m.isDraft()).pop();
      if (d) return d;
    } catch (e) { err = e; }
    Utilities.sleep(1500);
  }
  throw err || new Error('draft message not found');
}

// ---- follow-up texts waiting for their sent mail (stored by the web API under a random key) ----

function takeFollowUp(key) {
  const v = props().getProperty('fu:' + key);
  if (!v) return null;
  props().deleteProperty('fu:' + key);
  return JSON.parse(v).text;
}

function dropStaleFollowUps() {
  const all = props().getProperties(), old = Date.now() - 7 * 86400e3;
  Object.keys(all).filter(k => k.startsWith('fu:') && JSON.parse(all[k]).at < old).forEach(k => props().deleteProperty(k));
}

// ---- notes: one private text per thread, shown in the Gmail panel ----

function getNote(threadId) { return props().getProperty('n:' + threadId) || ''; }
function setNote(threadId, text) {
  if (text) props().setProperty('n:' + threadId, String(text).slice(0, 2000)); else props().deleteProperty('n:' + threadId);
}

// ---- recurring mail: rec:<id> = {to, subject, body, every, next} ----

function processRecurring() {
  const now = Date.now(), all = props().getProperties();
  for (const key of Object.keys(all).filter(k => k.startsWith('rec:'))) {
    const rec = JSON.parse(all[key]);
    if (rec.next > now) continue;
    try {
      GmailApp.sendEmail(rec.to, rec.subject, rec.body);
      logEvent('recurring-sent', key, { subject: rec.subject, due: rec.next, noreply: '', source: 'recurring' }, 'to ' + rec.to);
    } catch (err) { logEvent('recurring-failed', key, { subject: rec.subject, due: rec.next, noreply: '', source: 'recurring' }, String(err)); }
    do { rec.next = nextRun(rec.next, rec.every); } while (rec.next <= now); // skip runs missed while paused
    props().setProperty(key, JSON.stringify(rec));
  }
}

// Creates the trigger only when none exists (safe to call from the web API); never deletes.
function ensureTriggerExists() {
  if (ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'tick')) return false;
  ScriptApp.newTrigger('tick').timeBased().everyMinutes(5).create();
  return true;
}

// Only install() (run from the editor, fully authorized) may replace the trigger.
function resetTrigger() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'tick').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('tick').timeBased().everyMinutes(5).create();
}

// Run once from the Apps Script editor: authorizes, creates labels, trigger and log sheet.
function install() {
  [L_WAITING, L_NOREPLY, L_RETURNED, L_FOLLOWED, L_REPLIED].forEach(label);
  resetTrigger();
  logEvent('install', '', null, 'trigger every 5 min');
  Logger.log('FlyBy installed. Log sheet: ' + logSheet().getParent().getUrl());
}

// ---- rich log: one Google Sheet row per action, durable and filterable ----

function logSheet() {
  const id = props().getProperty('logSheet');
  if (id) { try { return SpreadsheetApp.openById(id).getSheets()[0]; } catch (e) { /* recreate below */ } }
  const ss = SpreadsheetApp.create('FlyBy log');
  props().setProperty('logSheet', ss.getId());
  const sh = ss.getSheets()[0];
  sh.appendRow(['time', 'event', 'threadId', 'subject', 'due', 'onlyIfNoReply', 'source', 'detail']);
  sh.setFrozenRows(1);
  return sh;
}

function logEvent(event, threadId, r, detail) {
  try {
    logSheet().appendRow([new Date(), event, threadId, r ? r.subject : '', r ? new Date(r.due) : '',
                          r ? r.noreply : '', r ? r.source : '', detail]);
  } catch (e) { console.error('FlyBy log failed', event, threadId, e); }
}
