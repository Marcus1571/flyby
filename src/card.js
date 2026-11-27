// Gmail add-on UI (Card Service). Contextual card works in Gmail web and the Gmail mobile apps.

const PRESETS = [
  [['1h', 'In 1 hour'], ['2h', 'In 2 hours'], ['4h', 'In 4 hours']],
  [['tm', 'Tomorrow morning'], ['ta', 'Tomorrow afternoon']],
  [['2d', 'In 2 days'], ['4d', 'In 4 days'], ['1w', 'In 1 week']],
  [['2w', 'In 2 weeks'], ['1mo', 'In 1 month']],
];

function tzOf(e) { return (e.commonEventObject.timeZone || {}).id || Session.getScriptTimeZone(); }
// Minutes east of UTC for tz at ms. Without this the date-time pickers read what you type as UTC (seen live 2026-11-16).
function tzOffsetMins(tz, ms) {
  const z = Utilities.formatDate(new Date(ms), tz, 'Z'); // e.g. "+0100"
  return (z[0] === '-' ? -1 : 1) * (+z.slice(1, 3) * 60 + +z.slice(3, 5));
}
function fmt(ms, tz) { return Utilities.formatDate(new Date(ms), tz, 'EEE d MMM yyyy, HH:mm'); }

function threadOf(e) {
  if (e.gmail.accessToken) GmailApp.setCurrentMessageAccessToken(e.gmail.accessToken);
  return GmailApp.getMessageById(e.gmail.messageId).getThread();
}

function onGmailMessage(e) { return buildThreadCard(threadOf(e), tzOf(e)); }

function buildThreadCard(thread, tz) {
  const r = getReminder(thread.getId());
  const card = CardService.newCardBuilder().setHeader(CardService.newCardHeader().setTitle('Return conversation to inbox'));

  if (r) {
    card.addSection(CardService.newCardSection()
      .addWidget(CardService.newDecoratedText().setTopLabel('Scheduled').setWrapText(true)
        .setText(`Returns ${fmt(r.due, tz)}` + (r.noreply ? ' <b>if nobody replies</b>' : ' <b>regardless</b>') + (r.followUp ? '<br>then sends your follow-up' : '')))
      .addWidget(CardService.newTextButton().setText('Cancel reminder')
        .setOnClickAction(CardService.newAction().setFunctionName('onCancel'))));
  }

  const opts = CardService.newCardSection().setHeader(r ? 'Change it' : 'Remind me')
    .addWidget(CardService.newSelectionInput().setType(CardService.SelectionInputType.CHECK_BOX)
      .setFieldName('noreply').addItem('only if nobody replies', 'yes', r ? r.noreply : true));
  for (const row of PRESETS) {
    const set = CardService.newButtonSet();
    row.forEach(([code, text]) => set.addButton(CardService.newTextButton().setText(text)
      .setOnClickAction(CardService.newAction().setFunctionName('onPreset').setParameters({ code }))));
    opts.addWidget(set);
  }
  opts.addWidget(CardService.newTextInput().setFieldName('followup').setMultiline(true)
    .setTitle('Follow-up text').setHint('Sent automatically if nobody replies').setValue((r && r.followUp) || ''));
  card.addSection(opts);

  card.addSection(CardService.newCardSection().setHeader('Note (private)')
    .addWidget(CardService.newTextInput().setFieldName('note').setMultiline(true).setTitle('Note').setValue(getNote(thread.getId())))
    .addWidget(CardService.newTextButton().setText('Save note')
      .setOnClickAction(CardService.newAction().setFunctionName('onNote'))));

  const now = Date.now();
  card.addSection(CardService.newCardSection().setHeader('At a specific time')
    .addWidget(CardService.newDateTimePicker().setFieldName('at').setTitle('Date and time')
      .setTimeZoneOffsetInMins(tzOffsetMins(tz, now)).setValueInMsSinceEpoch(dueFromCode('2d', now, tz)))
    .addWidget(CardService.newTextButton().setText('Confirm')
      .setOnClickAction(CardService.newAction().setFunctionName('onCustom'))));
  return card.build();
}

function wantsNoReply(e) {
  const f = (e.commonEventObject.formInputs || {}).noreply;
  return !!(f && f.stringInputs.value.includes('yes'));
}

function followUpText(e) {
  const f = (e.commonEventObject.formInputs || {}).followup;
  return f && f.stringInputs.value[0] ? f.stringInputs.value[0].trim() : '';
}

function respond(thread, tz, msg) {
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(buildThreadCard(thread, tz)))
    .setNotification(CardService.newNotification().setText(msg)).build();
}

function onPreset(e) {
  const thread = threadOf(e), tz = tzOf(e);
  const r = setReminder(thread, dueFromCode(e.commonEventObject.parameters.code, Date.now(), tz), wantsNoReply(e), 'card', followUpText(e));
  return respond(thread, tz, `FlyBy: back ${fmt(r.due, tz)}${r.noreply ? ' if no reply' : ''}${r.followUp ? ', then follow-up' : ''}`);
}

function onCustom(e) {
  const thread = threadOf(e), tz = tzOf(e);
  const f = (e.commonEventObject.formInputs || {}).at;
  const due = f && f.dateTimeInput && f.dateTimeInput.msSinceEpoch;
  if (!due || due <= Date.now()) return respond(thread, tz, 'FlyBy: pick a time in the future');
  const r = setReminder(thread, +due, wantsNoReply(e), 'card:custom', followUpText(e));
  return respond(thread, tz, `FlyBy: back ${fmt(r.due, tz)}${r.noreply ? ' if no reply' : ''}${r.followUp ? ', then follow-up' : ''}`);
}

function onNote(e) {
  const thread = threadOf(e), tz = tzOf(e), f = (e.commonEventObject.formInputs || {}).note;
  setNote(thread.getId(), f ? f.stringInputs.value[0] : '');
  return respond(thread, tz, 'FlyBy: note saved');
}

function onCancel(e) {
  const thread = threadOf(e), tz = tzOf(e);
  cancelReminder(thread);
  return respond(thread, tz, 'FlyBy: reminder cancelled');
}

// Homepage (Gmail web sidebar, nothing open): everything FlyBy is waiting on.
function onHomepage(e) {
  const tz = tzOf(e), all = props().getProperties();
  const list = Object.keys(all).filter(k => k.startsWith('t:')).map(k => Object.assign(JSON.parse(all[k]), { id: k.slice(2) })).sort((a, b) => a.due - b.due);
  const sec = CardService.newCardSection().setHeader(`Waiting on ${list.length} conversation(s)`);
  list.slice(0, 50).forEach(r => sec.addWidget(CardService.newDecoratedText().setWrapText(true)
    .setTopLabel(fmt(r.due, tz)).setText(r.subject || '(no subject)').setBottomLabel(r.noreply ? 'if no reply' : 'regardless')
    .setButton(CardService.newTextButton().setText('Cancel')
      .setOnClickAction(CardService.newAction().setFunctionName('onCancelWaiting').setParameters({ id: r.id })))));
  if (!list.length) sec.addWidget(CardService.newTextParagraph().setText(
    'Nothing pending. Open a conversation to set a reminder, or BCC yourself at <b>yourname+3d@gmail.com</b> when sending.'));
  const last = +all.lastScan; // written by every tick, so it doubles as "last time FlyBy looked"
  sec.addWidget(CardService.newTextParagraph().setText(`<font color="#5f6368">Replies are checked every 5 minutes. Last check: ${last ? fmt(last, tz) : 'not yet'}</font>`));
  const card = CardService.newCardBuilder().addSection(sec);

  const rec = CardService.newCardSection().setHeader('Recurring emails');
  Object.keys(all).filter(k => k.startsWith('rec:')).forEach(k => {
    const x = JSON.parse(all[k]);
    rec.addWidget(CardService.newDecoratedText().setWrapText(true).setTopLabel(`${{ day: 'Daily', week: 'Weekly', month: 'Monthly' }[x.every] || x.every} · next ${fmt(x.next, tz)}`).setText(`${x.subject} → ${x.to}`)
      .setButton(CardService.newTextButton().setText('Delete')
        .setOnClickAction(CardService.newAction().setFunctionName('onDeleteRecurring').setParameters({ key: k }))));
  });
  rec.addWidget(CardService.newTextButton().setText('New recurring email')
    .setOnClickAction(CardService.newAction().setFunctionName('onNewRecurring')));
  return card.addSection(rec).build();
}

function onNewRecurring(e) {
  const tz = tzOf(e), s = CardService.newCardSection()
    .addWidget(CardService.newTextInput().setFieldName('to').setTitle('To (one address)'))
    .addWidget(CardService.newTextInput().setFieldName('subject').setTitle('Subject'))
    .addWidget(CardService.newTextInput().setFieldName('body').setMultiline(true).setTitle('Message'))
    .addWidget(CardService.newSelectionInput().setType(CardService.SelectionInputType.DROPDOWN).setFieldName('every').setTitle('Repeats')
      .addItem('every day', 'day', false).addItem('every week', 'week', true).addItem('every month', 'month', false))
    .addWidget(CardService.newDateTimePicker().setFieldName('first').setTitle('First send')
      .setTimeZoneOffsetInMins(tzOffsetMins(tz, Date.now())).setValueInMsSinceEpoch(dueFromCode('1d', Date.now(), tz)))
    .addWidget(CardService.newTextButton().setText('Save')
      .setOnClickAction(CardService.newAction().setFunctionName('onSaveRecurring')));
  return CardService.newActionResponseBuilder().setNavigation(CardService.newNavigation()
    .pushCard(CardService.newCardBuilder().setHeader(CardService.newCardHeader().setTitle('New recurring email')).addSection(s).build())).build();
}

function onSaveRecurring(e) {
  const f = e.commonEventObject.formInputs || {}, val = k => (f[k] && f[k].stringInputs ? f[k].stringInputs.value[0] : '').trim();
  const first = f.first && f.first.dateTimeInput && +f.first.dateTimeInput.msSinceEpoch;
  const msg = t => CardService.newActionResponseBuilder().setNotification(CardService.newNotification().setText(t)).build();
  if (!/^[^@\s,]+@[^@\s,]+\.[^@\s,]+$/.test(val('to'))) return msg('FlyBy: enter exactly one valid address');
  if (!val('subject') || !val('body')) return msg('FlyBy: subject and message are required');
  if (!first || first <= Date.now()) return msg('FlyBy: pick a first send time in the future');
  const key = 'rec:' + Utilities.getUuid().slice(0, 8);
  props().setProperty(key, JSON.stringify({ to: val('to'), subject: val('subject'), body: val('body'), every: val('every') || 'week', next: first }));
  logEvent('recurring-set', key, { subject: val('subject'), due: first, noreply: '', source: 'card' }, `${val('every')} to ${val('to')}`);
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().popToRoot().updateCard(onHomepage(e)))
    .setNotification(CardService.newNotification().setText('FlyBy: recurring email saved')).build();
}

// Cancel from the homepage list. A thread Gmail no longer finds is still dropped from the list.
function onCancelWaiting(e) {
  const id = e.commonEventObject.parameters.id, thread = GmailApp.getThreadById(id);
  if (thread) cancelReminder(thread); else { props().deleteProperty('t:' + id); logEvent('cancel', id, null, 'thread not found'); }
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(onHomepage(e)))
    .setNotification(CardService.newNotification().setText('FlyBy: reminder cancelled')).build();
}

function onDeleteRecurring(e) {
  props().deleteProperty(e.commonEventObject.parameters.key);
  logEvent('recurring-deleted', e.commonEventObject.parameters.key, null, '');
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(onHomepage(e)))
    .setNotification(CardService.newNotification().setText('FlyBy: recurring email deleted')).build();
}
