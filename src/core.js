// Pure logic, no Apps Script services — unit-tested in Node (test/core.test.js).

// Presets shown in the card and accepted as BCC codes (me+3d@…); also u<epochMinutes> for an exact time.
// h = exact hours from now; d/w/mo = that many days ahead at 08:00 local; tm/ta = tomorrow 08:00/13:00.
const UNIT_DAYS = { d: 1, w: 7, mo: 30 }; // ponytail: month = 30 days, use real calendar months if anyone cares

function parseCode(code) {
  const c = String(code || '').toLowerCase();
  if (c === 'tm') return { days: 1, hour: 8 };
  if (c === 'ta') return { days: 1, hour: 13 };
  const at = c.match(/^u(\d{7,9})$/); // absolute time: u<minutes since epoch>, set by the Chrome extension
  if (at) return { atMs: +at[1] * 60000 };
  const m = c.match(/^(\d{1,3})(h|d|w|mo)$/);
  if (!m || +m[1] === 0) return null;
  const n = +m[1];
  return m[2] === 'h' ? { hours: n } : { days: n * UNIT_DAYS[m[2]], hour: 8 };
}

// Full BCC tag = <code>[.r][.f<key>]: ".r" = return regardless of replies; ".f<key>" = the extension
// stored a follow-up text under <key> (see the web API). Returns null if the code part is invalid.
function parseTag(tag) {
  const [codePart, ...flags] = String(tag || '').toLowerCase().split('.');
  const p = parseCode(codePart);
  if (!p) return null;
  const out = { code: codePart, regardless: false, key: null };
  for (const f of flags) {
    if (f === 'r') out.regardless = true;
    else if (/^f[a-z0-9]{6,12}$/.test(f)) out.key = f.slice(1);
    else return null;
  }
  return out;
}

// Next run of a recurring mail after `fromMs`. every: 'day' | 'week' | 'month'.
// ponytail: plain ms/UTC arithmetic, so the local hour drifts by 1h across a DST change; do it in the user's tz if it matters.
function nextRun(fromMs, every) {
  if (every === 'day') return fromMs + 86400e3;
  if (every === 'week') return fromMs + 7 * 86400e3;
  const d = new Date(fromMs), day = d.getUTCDate();
  d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + 1);
  d.setUTCDate(Math.min(day, new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()));
  return d.getTime();
}

// "Name <A.B+x@Gmail.com>" -> "ab@gmail.com" (plus-tag dropped; dots dropped for gmail.com).
function normAddr(s) {
  const m = String(s || '').match(/<([^>]+)>/);
  let a = (m ? m[1] : String(s || '')).trim().toLowerCase();
  let [local, domain] = a.split('@');
  if (!domain) return a;
  local = local.split('+')[0];
  if (domain === 'gmail.com' || domain === 'googlemail.com') { local = local.replace(/\./g, ''); domain = 'gmail.com'; }
  return local + '@' + domain;
}

// All addresses in a header like 'Jo <a@b.com>, "Doe, Al" <c@d.com>, e@f.com' that are not mine (plus-tags ignored).
function othersIn(header, myAddrs) {
  const mine = new Set(myAddrs.map(normAddr));
  const found = String(header || '').match(/<[^>]+>|[^\s,<>"]+@[^\s,<>"]+/g) || [];
  const out = found.map(a => a.replace(/[<>]/g, '').toLowerCase());
  return out.filter((a, i) => !mine.has(normAddr(a)) && out.indexOf(a) === i);
}

// Finds a FlyBy code in a header like "x <me+3d@gmail.com>, other@y.com" for one of my addresses.
function findCode(header, myAddrs) {
  const mine = new Set(myAddrs.map(normAddr));
  for (const part of String(header || '').split(',')) {
    const raw = (part.match(/<([^>]+)>/) || [, part])[1].trim().toLowerCase();
    const tag = (raw.split('@')[0].split('+')[1] || '');
    if (tag && mine.has(normAddr(raw)) && parseTag(tag)) return tag;
  }
  return null;
}

// Automatic mail is not an answer: out-of-office replies, bounces, mailing-list robots.
// h = lower-case header map {auto-submitted, precedence, x-autoreply, x-autorespond}; missing headers are fine.
function isAutomated(from, h) {
  h = h || {};
  const sub = String(h['auto-submitted'] || '').trim().toLowerCase();
  const prec = String(h['precedence'] || '').trim().toLowerCase();
  if (sub && sub !== 'no') return true;
  if (['bulk', 'junk', 'auto_reply'].includes(prec)) return true;
  if (h['x-autoreply'] || h['x-autorespond']) return true;
  return /^(mailer-daemon|postmaster)@/.test(normAddr(from));
}

// messages: [{from, date (ms), draft, auto?}] ; replied = a person other than me wrote after my anchor message.
function repliedBy(messages, myAddrs, anchorMs) {
  const mine = new Set(myAddrs.map(normAddr));
  return messages.find(m => !m.draft && !m.auto && m.date > anchorMs && !mine.has(normAddr(m.from))) || null;
}
function isReplied(messages, myAddrs, anchorMs) { return !!repliedBy(messages, myAddrs, anchorMs); }

// Anchor = my latest message in the thread (what the reply should answer); fallback: now.
function anchorOf(messages, myAddrs, nowMs) {
  const mine = new Set(myAddrs.map(normAddr));
  const own = messages.filter(m => !m.draft && mine.has(normAddr(m.from))).map(m => m.date);
  return own.length ? Math.max(...own) : nowMs;
}

if (typeof module !== 'undefined') module.exports = { repliedBy, isAutomated, othersIn, parseCode, parseTag, nextRun, normAddr, findCode, isReplied, anchorOf };
