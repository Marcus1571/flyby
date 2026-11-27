// Run: node test/core.test.js
const assert = require('node:assert');
const { isAutomated, othersIn, parseCode, parseTag, nextRun, normAddr, findCode, isReplied, anchorOf } = require('../src/core.js');

assert.deepStrictEqual(parseCode('3h'), { hours: 3 });
assert.deepStrictEqual(parseCode('2d'), { days: 2, hour: 8 });
assert.deepStrictEqual(parseCode('1w'), { days: 7, hour: 8 });
assert.deepStrictEqual(parseCode('1mo'), { days: 30, hour: 8 });
assert.deepStrictEqual(parseCode('TM'), { days: 1, hour: 8 });
assert.deepStrictEqual(parseCode('u29714320'), { atMs: 29714320 * 60000 });
assert.strictEqual(parseCode('u123'), null);
assert.strictEqual(parseCode('0d'), null);
assert.strictEqual(parseCode('3x'), null);
assert.strictEqual(parseCode(''), null);

assert.deepStrictEqual(parseTag('2d'), { code: '2d', regardless: false, key: null });
assert.deepStrictEqual(parseTag('2d.r'), { code: '2d', regardless: true, key: null });
assert.deepStrictEqual(parseTag('u29714320.r.fa1b2c3d4'), { code: 'u29714320', regardless: true, key: 'a1b2c3d4' });
assert.strictEqual(parseTag('2d.x'), null);
assert.strictEqual(parseTag('news'), null);
assert.strictEqual(nextRun(Date.UTC(2026, 0, 31, 8), 'month'), Date.UTC(2026, 1, 28, 8)); // clamps to month end
assert.strictEqual(nextRun(Date.UTC(2026, 11, 15, 8), 'month'), Date.UTC(2027, 0, 15, 8));
assert.strictEqual(nextRun(0, 'week'), 7 * 86400e3);

assert.strictEqual(normAddr('Me <Jo.Doe+3d@GMail.com>'), 'jodoe@gmail.com');
assert.strictEqual(normAddr('a.b@corp.com'), 'a.b@corp.com');

const me = ['jodoe@gmail.com'];
assert.strictEqual(findCode('Bob <bob@x.com>, Jo <jo.doe+3d@gmail.com>', me), '3d');
assert.strictEqual(findCode('jodoe+tm@gmail.com', me), 'tm');
assert.strictEqual(findCode('jodoe+u29714320@gmail.com', me), 'u29714320');
assert.strictEqual(findCode('jodoe+3d.r.fabcdef12@gmail.com', me), '3d.r.fabcdef12');
assert.strictEqual(findCode('jodoe+news@gmail.com', me), null);      // not a code
assert.strictEqual(findCode('bob+3d@x.com', me), null);              // not my address
assert.strictEqual(findCode('', me), null);

const t0 = 1000;
const msgs = [
  { from: 'Bob <bob@x.com>', date: 500, draft: false },
  { from: 'Jo <jodoe@gmail.com>', date: t0, draft: false },
];
assert.strictEqual(anchorOf(msgs, me, 9999), t0);
assert.strictEqual(anchorOf([msgs[0]], me, 9999), 9999);
assert.strictEqual(isReplied(msgs, me, t0), false);                                   // Bob wrote before me
assert.strictEqual(isReplied(msgs.concat({ from: 'bob@x.com', date: 2000, draft: false }), me, t0), true);
assert.strictEqual(isReplied(msgs.concat({ from: 'jo.doe+x@gmail.com', date: 2000, draft: false }), me, t0), false); // me again
assert.strictEqual(isReplied(msgs.concat({ from: 'bob@x.com', date: 2000, draft: true }), me, t0), false);         // draft
console.log('core ok');

const { remindAddress, codeFor, isRemindAddress, tagFor, newKey } = require('../extension/src/code.js');
assert.strictEqual(remindAddress('jo.doe@gmail.com', '3d'), 'jo.doe+3d@gmail.com');
assert.strictEqual(remindAddress('jo.doe+x@gmail.com', '1h'), 'jo.doe+1h@gmail.com');
assert.strictEqual(codeFor(new Date(29714320 * 60000)), 'u29714320');
assert.strictEqual(parseCode(codeFor(new Date(1790000000000))).atMs, Math.round(1790000000000 / 60000) * 60000);
assert.strictEqual(isRemindAddress('jo.doe+3d@gmail.com', 'jo.doe@gmail.com'), true);
assert.strictEqual(isRemindAddress('jo.doe+u29714320@gmail.com', 'jo.doe@gmail.com'), true);
assert.strictEqual(isRemindAddress('jo.doe+news@gmail.com', 'jo.doe@gmail.com'), false);
assert.strictEqual(isRemindAddress('bob+3d@gmail.com', 'jo.doe@gmail.com'), false);
console.log('extension ok');
assert.strictEqual(tagFor('2d', false, null), '2d');
assert.strictEqual(tagFor('2d', true, 'abcdef12'), '2d.r.fabcdef12');
assert.strictEqual(isRemindAddress('jo.doe+2d.r.fabcdef12@gmail.com', 'jo.doe@gmail.com'), true);
assert.strictEqual(parseTag(tagFor('1h', false, newKey())).key.length, 6);
console.log('tags ok');

const mine2 = ['jo.doe@gmail.com'];
assert.deepStrictEqual(othersIn('Al <al@x.com>, "Doe, Bo" <bo@y.com>, jo.doe+1h@gmail.com, AL@x.com', mine2), ['al@x.com', 'bo@y.com']);
assert.deepStrictEqual(othersIn('Jo <jodoe@gmail.com>', mine2), []);
assert.deepStrictEqual(othersIn('', mine2), []);
console.log('recipients ok');

assert.strictEqual(isAutomated('Bob <bob@x.com>', {}), false);
assert.strictEqual(isAutomated('bob@x.com', { 'auto-submitted': 'auto-replied' }), true);
assert.strictEqual(isAutomated('bob@x.com', { 'auto-submitted': 'no' }), false);
assert.strictEqual(isAutomated('bob@x.com', { precedence: 'Bulk' }), true);
assert.strictEqual(isAutomated('bob@x.com', { precedence: 'list' }), false);
assert.strictEqual(isAutomated('bob@x.com', { 'x-autoreply': 'yes' }), true);
assert.strictEqual(isAutomated('Mail Delivery <MAILER-DAEMON@googlemail.com>', {}), true);
assert.strictEqual(isAutomated('postmaster@corp.com', null), true);
assert.strictEqual(isReplied(msgs.concat({ from: 'bob@x.com', date: 2000, auto: true }), me, t0), false); // auto-reply ignored
console.log('automated ok');

const { tagOf, describeTag, composeBand, threadBand } = require('../extension/src/code.js');
const f = ms => 'T' + ms;
assert.strictEqual(tagOf('jo.doe+2d.r@gmail.com'), '2d.r');
assert.deepStrictEqual(describeTag('2d', f), { when: 'in 2 days', regardless: false, followUp: false });
assert.deepStrictEqual(describeTag('u100.r', f), { when: 'on T6000000', regardless: true, followUp: false });
assert.strictEqual(composeBand('tm.fabc123x', f), 'FlyBy: back in your inbox tomorrow morning if nobody replies, then sends your follow-up');
assert.strictEqual(composeBand('1w.r', f), 'FlyBy: comes back to your inbox in 1 week');
assert.strictEqual(threadBand({ ok: false }, '', f), null);
assert.strictEqual(threadBand({ ok: true, labels: [] }, '', f), null);
assert.strictEqual(threadBand({ ok: true, reminder: { due: 5, noreply: true }, labels: ['FlyBy/Replied'] }, '', f).kind, 'wait'); // reminder wins
assert.strictEqual(threadBand({ ok: true, labels: ['FlyBy/Replied'] }, '2d', f).kind, 'info'); // new round not yet scanned
assert.strictEqual(threadBand({ ok: true, labels: ['FlyBy/Replied'] }, '', f).kind, 'done');
assert.strictEqual(threadBand({ ok: true, labels: ['FlyBy/No reply'] }, '', f).kind, 'warn');
assert.strictEqual(threadBand({ ok: true, replied: true, labels: [] }, '2d', f).kind, 'done'); // pending, but a reply is already in
assert.strictEqual(threadBand({ ok: true, replied: true, reminder: { due: 5, noreply: true }, labels: [] }, '', f).kind, 'done');
assert.strictEqual(threadBand({ ok: true, replied: true, labels: ['FlyBy/No reply'] }, '', f).kind, 'warn'); // replied only matters while a round is open
console.log('band ok');
