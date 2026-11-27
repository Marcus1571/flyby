// Pure helpers, unit-tested in Node (test/core.test.js). Codes are parsed by src/core.js in the engine.

// Same presets as the Gmail panel (src/card.js): [code, label].
const PRESETS = [['1h', 'In 1 hour'], ['2h', 'In 2 hours'], ['4h', 'In 4 hours'], ['tm', 'Tomorrow morning'],
  ['ta', 'Tomorrow afternoon'], ['2d', 'In 2 days'], ['4d', 'In 4 days'], ['1w', 'In 1 week'],
  ['2w', 'In 2 weeks'], ['1mo', 'In 1 month']];

// Tag = code[.r][.f<key>]: ".r" regardless of replies, ".f<key>" a follow-up text stored under <key>.
function tagFor(code, regardless, key) { return code + (regardless ? '.r' : '') + (key ? '.f' + key : ''); }
function newKey() { return Array.from(crypto.getRandomValues(new Uint8Array(5)), b => (b % 36).toString(36)).join('') + 'x'; }

// "Jo.Doe@gmail.com" + "3d" -> "Jo.Doe+3d@gmail.com"
function remindAddress(userEmail, code) {
  const [local, domain] = String(userEmail).split('@');
  return `${local.split('+')[0]}+${code}@${domain}`;
}

// Exact time -> code. Epoch minutes are time-zone independent.
function codeFor(date) { return 'u' + Math.round(date.getTime() / 60000); }

// Is this Bcc address one of mine carrying a FlyBy code? (so a new choice can replace it)
function isRemindAddress(addr, userEmail) {
  const [local, domain] = String(userEmail).toLowerCase().split('@');
  const m = String(addr).toLowerCase().match(/^([^@+]+)\+([\w.]+)@(.+)$/);
  return !!m && m[1] === local.split('+')[0] && m[3] === domain && /^(u\d{7,9}|\d{1,3}(h|d|w|mo)|tm|ta)(\.r)?(\.f[a-z0-9]{6,12})?$/.test(m[2]);
}

// "Jo.Doe+2d.r@gmail.com" -> "2d.r"
function tagOf(addr) { const m = String(addr).match(/\+([\w.]+)@/); return m ? m[1] : ''; }

// Tag -> {when, regardless, followUp}: "in 2 days" / fmt(exact time); fmt(ms) formats a date for the user.
function describeTag(tag, fmt) {
  const [code, ...rest] = String(tag).split('.');
  const preset = PRESETS.find(p => p[0] === code);
  const when = preset ? preset[1].toLowerCase() : /^u\d+$/.test(code) ? 'on ' + fmt(+code.slice(1) * 60000) : 'in ' + code;
  return { when, regardless: rest.includes('r'), followUp: rest.some(x => x.startsWith('f')) };
}

// Text of the compose band for the chosen tag.
function composeBand(tag, fmt) {
  const d = describeTag(tag, fmt);
  return d.regardless ? `FlyBy: comes back to your inbox ${d.when}`
    : `FlyBy: back in your inbox ${d.when} if nobody replies` + (d.followUp ? ', then sends your follow-up' : '');
}

// What the thread band shows: {kind, text} or null. cur = API "get" answer, pendingTag = a FlyBy Bcc tag on a sent
// message the engine has not picked up yet ('' if none).
function threadBand(cur, pendingTag, fmt) {
  if (!cur || !cur.ok) return null;
  const r = cur.reminder, has = l => (cur.labels || []).includes('FlyBy/' + l);
  if (cur.replied && (r || pendingTag)) return { kind: 'done', text: 'FlyBy: a reply arrived, the reminder closes at the next check (within 5 minutes)' };
  if (r) return { kind: 'wait', text: r.noreply
    ? `FlyBy: waiting for a reply. Back in your inbox ${fmt(r.due)} if nobody answers` + (r.followUp ? ', then sends your follow-up' : '')
    : `FlyBy: comes back to your inbox ${fmt(r.due)}` };
  if (pendingTag) return { kind: 'info', text: composeBand(pendingTag, fmt).replace(/^FlyBy: /, 'FlyBy (starts within 5 minutes): ') };
  if (has('Replied')) return { kind: 'done', text: 'FlyBy: a reply arrived, the reminder ended' };
  if (has('Followed up')) return { kind: 'warn', text: 'FlyBy: nobody replied, your follow-up was sent' };
  if (has('No reply')) return { kind: 'warn', text: 'FlyBy: nobody replied, brought back to your inbox' };
  if (has('Returned')) return { kind: 'info', text: 'FlyBy: brought back to your inbox as scheduled' };
  return null;
}

if (typeof module !== 'undefined') module.exports = { PRESETS, tagFor, newKey, remindAddress, codeFor, isRemindAddress, tagOf, describeTag, composeBand, threadBand };
