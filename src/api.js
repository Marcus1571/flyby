// Web API for the Chrome extension (and later the VPS engine): POST JSON {token, action, ...}.
// Deployed as a web app ("execute as me", access "anyone"); the secret token in script properties is the only key.
// Create the token once by running setupApi() in the editor.

function setupApi() {
  if (!props().getProperty('apiToken')) props().setProperty('apiToken', Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, ''));
  Logger.log('FlyBy API token (paste it on the Chrome extension\'s Options page, never in git): ' + props().getProperty('apiToken'));
}

function doGet() { return reply({ ok: true, name: 'FlyBy' }); }

function doPost(e) {
  let b;
  try { b = JSON.parse(e.postData.contents); } catch (err) { return reply({ ok: false, error: 'bad json' }); }
  if (!tokenOk(b.token)) { logEvent('api-denied', '', null, 'bad token, action ' + b.action); return reply({ ok: false, error: 'unauthorized' }); }
  try { return reply(handleApi(b)); }
  catch (err) { logEvent('api-error', b.threadId || '', null, b.action + ': ' + err); return reply({ ok: false, error: String(err) }); }
}

function reply(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }

function tokenOk(t) {
  const want = props().getProperty('apiToken') || '', got = String(t || '');
  if (!want || want.length !== got.length) return false;
  let diff = 0;
  for (let i = 0; i < want.length; i++) diff |= want.charCodeAt(i) ^ got.charCodeAt(i); // constant time
  return diff === 0;
}

function threadById(id) {
  const t = GmailApp.getThreadById(String(id || ''));
  if (!t) throw new Error('thread not found');
  return t;
}

function handleApi(b) {
  const tz = Session.getScriptTimeZone();
  switch (b.action) {
    case 'ping': return { ok: true };
    case 'prepare': { // follow-up text for a mail that is still being written; the BCC tag carries the key
      if (!/^[a-z0-9]{6,12}$/.test(b.key || '') || !b.text) throw new Error('bad key or text');
      props().setProperty('fu:' + b.key, JSON.stringify({ text: String(b.text).slice(0, 4000), at: Date.now() }));
      return { ok: true };
    }
    case 'set': { // existing thread: code = 2d | u<epochMinutes> ...
      const thread = threadById(b.threadId);
      if (!parseCode(b.code)) throw new Error('bad code');
      const r = setReminder(thread, dueFromCode(b.code, Date.now(), tz), b.noreply !== false, 'api:' + b.code, b.followUp);
      if (typeof b.note === 'string') setNote(b.threadId, b.note);
      return { ok: true, due: r.due };
    }
    case 'cancel': cancelReminder(threadById(b.threadId)); return { ok: true };
    case 'note': threadById(b.threadId); setNote(b.threadId, b.text); return { ok: true };
    case 'get': { // labels: the FlyBy/* outcome labels, so the extension's band can say "replied" / "no reply" after the reminder is gone
      const id = String(b.threadId), t = GmailApp.getThreadById(id);
      const labels = t ? t.getLabels().map(l => l.getName()).filter(n => n.startsWith('FlyBy/')) : [];
      const reminder = getReminder(id);
      // pending: a sent message with a FlyBy Bcc tag that scanBccCodes has not processed yet (it runs every 5 minutes)
      let pending = '', pendingAt = 0;
      const addrs = myAddrs();
      if (!reminder && t) {
        const last = +(props().getProperty('lastScan') || 0), done = JSON.parse(props().getProperty('doneMsgs') || '[]');
        for (const m of t.getMessages()) {
          if (m.isDraft() || m.getDate().getTime() < last - SCAN_OVERLAP_MS || done.includes(m.getId())) continue;
          const tag = findCode([m.getBcc(), m.getTo(), m.getCc()].join(','), addrs);
          if (tag) { pending = tag; pendingAt = m.getDate().getTime(); }
        }
      }
      // replied: a real reply is already there but the next tick (every 5 minutes) has not closed the reminder yet
      const anchor = reminder ? (reminder.noreply ? reminder.anchor : 0) : (pending && !parseTag(pending).regardless ? pendingAt : 0);
      const replied = !!(anchor && t && repliedBy(toPlain(t, true), addrs, anchor));
      return { ok: true, reminder, note: getNote(id), labels, pending, replied };
    }
    case 'scan': { // run the Bcc scan now: the extension calls it right after Send, so the self-copy of the Bcc leaves the inbox in seconds instead of up to 5 minutes
      const lock = LockService.getUserLock(); // same lock as tick: never two scans at once
      if (!lock.tryLock(10000)) return { ok: true, busy: true, reminder: null }; // a tick is running and does the same
      try {
        const t = b.threadId ? GmailApp.getThreadById(String(b.threadId)) : null;
        // the just-sent thread directly (no search lag); lastScan untouched, the tick's own scan still covers everything else
        if (t) scanThread(t, +(props().getProperty('lastScan') || Date.now()), myAddrs()); else scanBccCodes();
      } finally { lock.releaseLock(); }
      return { ok: true, reminder: b.threadId ? getReminder(String(b.threadId)) : null };
    }
    case 'status': { // health check for the operator and agents: is the trigger there, when did it last run
      const all = props().getProperties(), keys = Object.keys(all);
      return { ok: true, build: BUILD, now: Date.now(), triggers: ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'tick').length,
               lastScan: +all.lastScan || null, lastBeat: +all.lastBeat || null,
               waiting: keys.filter(k => k.startsWith('t:')).length, recurring: keys.filter(k => k.startsWith('rec:')).length };
    }
    case 'ensure-trigger': { const created = ensureTriggerExists(); logEvent('ensure-trigger', '', null, created ? 'trigger was missing: created' : 'trigger present'); return { ok: true, created }; }
    default: throw new Error('unknown action');
  }
}
