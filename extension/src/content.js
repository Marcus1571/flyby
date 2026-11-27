import * as InboxSDK from '@inboxsdk/core';
import { APP_ID } from '../config.js';
import { remindAddress, isRemindAddress, tagFor, newKey, tagOf, composeBand, threadBand } from './code.js';
import { api } from './api.js';
import { buildMenu, el, btn, band } from './menu.js';

const ICON = 'https://raw.githubusercontent.com/Marcus1571/flyby/main/assets/flyby-icon-48.png';
const fmt = ms => new Date(ms).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const bands = new Map(); // threadId -> redraw() of the open thread's band, so the toolbar modal can refresh it

InboxSDK.load(2, APP_ID).then(sdk => {
  const me = sdk.User.getEmailAddress();

  // ---- compose window: the choice becomes a BCC address; the engine does the rest after sending ----
  sdk.Compose.registerComposeViewHandler(cv => {
    let notice = null, tagged = '';
    function showBand(tag) {
      tagged = tag || ''; // coloured band below the Send row while a reminder is chosen
      if (notice) { notice.destroy(); notice = null; }
      // a status bar, not addComposeNotice: only the status bar shrinks the compose body, the notice pushed Send out of view.
      // Below Send, not addAboveNativeStatusBar: the floating formatting toolbar covered it there (both seen 2026-11-26).
      if (tag) {
        notice = cv.addStatusBar({ height: 52 });
        Object.assign(notice.el.style, { boxSizing: 'border-box', padding: '0 16px 8px' });
        notice.setHeight(52); // re-measure after the padding change so the body shrinks by exactly this much
        notice.el.append(band('wait', composeBand(tag, fmt)));
      }
    }
    function setBcc(tag) {
      const others = cv.getBccRecipients().map(c => c.emailAddress).filter(a => !isRemindAddress(a, me));
      cv.setBccRecipients(tag ? others.concat(remindAddress(me, tag)) : others);
      showBand(tag);
    }
    // Gmail files the Bcc self-copy in the inbox; the 5-minute scan would archive it. Ask for the scan now instead.
    cv.on('sent', async ev => {
      if (!tagged) return;
      const id = await ev.getThreadID();
      for (const wait of [1000, 4000, 15000]) { // the server reads this thread directly; retries in case it is not saved yet
        await new Promise(r => setTimeout(r, wait));
        const res = await api({ action: 'scan', threadId: id });
        if (!res.ok) console.warn('FlyBy: scan after send failed', res.error);
        if (res.reminder) break;
      }
      bands.get(id)?.();
    });
    const existing = cv.getBccRecipients().map(c => c.emailAddress).find(a => isRemindAddress(a, me)); // reopened draft
    if (existing) showBand(tagOf(existing));

    cv.addButton({
      title: 'Remind me', tooltip: 'Bring this back to my inbox if nobody replies', hasDropdown: true, type: 'MODIFIER', iconUrl: ICON,
      onClick: ({ dropdown }) => {
        const status = el('div', { textContent: '', className: 'fb-status' });
        const pick = async (code, { noreply, followUp }) => {
          let key = null;
          if (followUp) { // store the text first; the key travels in the address
            key = newKey();
            status.textContent = 'Saving follow-up…';
            const res = await api({ action: 'prepare', key, text: followUp });
            if (!res.ok) { status.textContent = 'Follow-up not saved: ' + res.error; return; }
          }
          setBcc(tagFor(code, !noreply, key));
          dropdown.close();
        };
        dropdown.el.replaceChildren(buildMenu('Remind me', pick, [btn('Clear reminder', () => { setBcc(null); dropdown.close(); }), status]));
      },
    });
  });

  // ---- open thread (Inbox, Sent, anywhere): coloured band above the messages with the FlyBy state ----
  sdk.Conversations.registerThreadViewHandler(async tv => {
    const id = await tv.getThreadIDAsync();
    let bar = null;
    const draw = async () => {
      const cur = await api({ action: 'get', threadId: id });
      if (tv.destroyed) return;
      if (!cur.ok) console.warn('FlyBy band: get failed', cur.error);
      const b = threadBand(cur, cur.pending || '', fmt);
      if (bar) { bar.destroy(); bar = null; }
      if (b) { bar = tv.addNoticeBar(); bar.el.append(band(b.kind, b.text)); }
    };
    bands.set(id, draw);
    tv.on('destroy', () => { if (bands.get(id) === draw) bands.delete(id); });
    draw();
  });

  // ---- thread toolbar: set / change / cancel for a mail you already sent, plus a private note ----
  // The button sits in Gmail's "more" menu, a plain list: InboxSDK cannot attach a dropdown there (the click did nothing),
  // so the menu opens in a modal window instead.
  sdk.Toolbars.registerThreadButton({
    title: 'FlyBy: return to inbox', iconUrl: ICON, positions: ['THREAD'],
    threadSection: sdk.Toolbars.SectionNames.OTHER,
    onClick: async ({ selectedThreadViews }) => {
      const status = el('div', { textContent: 'Loading…', className: 'fb-status' });
      const note = el('textarea', { rows: 2, placeholder: 'Private note' });
      const say = res => { status.textContent = res.ok ? 'Done' : 'Error: ' + res.error; return res; };
      let threadId = null, modal;
      const needThread = () => { if (!threadId) status.textContent = 'Error: could not read the thread id'; return !!threadId; };

      const pick = async (code, { noreply, followUp }) => {
        if (!needThread()) return;
        const res = say(await api({ action: 'set', threadId, code, noreply, followUp, note: note.value }));
        if (res.ok) { status.textContent = 'Returns ' + fmt(res.due); bands.get(threadId)?.(); setTimeout(() => modal.close(), 1500); }
      };
      const box = buildMenu('Return to inbox', pick, [
        note, btn('Save note', async () => { if (needThread()) say(await api({ action: 'note', threadId, text: note.value })); }),
        btn('Cancel reminder', async () => { if (needThread() && say(await api({ action: 'cancel', threadId })).ok) { bands.get(threadId)?.(); setTimeout(() => modal.close(), 1500); } }), status]);
      modal = sdk.Widgets.showModalView({ title: 'FlyBy', el: box, chrome: true, buttons: [] }); // visible at once; the rest loads below

      try {
        threadId = await selectedThreadViews[0].getThreadIDAsync();
        const cur = await api({ action: 'get', threadId });
        if (!cur.ok) { status.textContent = 'Error: ' + cur.error; return; }
        note.value = cur.note || '';
        status.textContent = cur.reminder ? 'Scheduled: ' + fmt(cur.reminder.due) : 'No reminder set';
      } catch (err) { status.textContent = 'Error: ' + err; }
    },
  });
});
