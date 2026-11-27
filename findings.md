# findings — FlyBy

Append-only research log. Newest first.

## 2026-11-27 — clean room: what could give a vendor grounds to complain

- Checked the whole tracked tree. Code, icon (`assets/flyby-icon.svg`, our own orange plane) and UI text are our own; nothing
  was ever decompiled or copied (§6 of 2026-11-06). UI strings are ordinary phrases ("Remind me", "Return to inbox", "Only if
  nobody replies"). Functionality and ideas are not protected; names and marketing that imply a link to someone else's
  product are the risk, so the docs no longer name any competing product or company (AGENTS.md rule).
- Bundled third-party code must carry its licence: the release zip ships InboxSDK (MIT OR Apache-2.0) and now includes its
  MIT text. The Apps Script code bundles nothing.
- Not done, needs the operator: older public commits (since `6f66cbb`) still contain the old wording in their docs; only a
  history rewrite (force-push, re-created tags/releases) removes it. Patents were not searched.
- "Gmail", "Google", "Chrome", "Apple Mail" are named only to say what FlyBy works with ("FlyBy for Gmail"), the usual
  descriptive use.

## 2026-11-26 — going public and an installer: what blocks what

- Pre-publish audit of the full history (70 commits): gitleaks clean; `config.local.js` (API token) never committed; no web-app
  deployment id or URL in any file. Not secret but personal: every commit's author email is the operator's private Gmail
  (flyby-mail, already public, has the same); the operator's first name and a test-account name appear in `docs/grand-plan.html`,
  a CHANGELOG line and older STATUS/findings text; `.clasp.json` holds the operator's own `scriptId` (harmless to others, but a
  public copy should ship an example file, each user creates their own project).
- Installer: the hard steps are Google's, not ours. Enabling the Apps Script API (user settings toggle, needed by clasp), the
  OAuth consent for the script's scopes, and loading an unpacked Chrome extension all need the user in a browser; none can be
  scripted away. A web app deployed "execute as me" asks the owner for consent on first open, so setup (install + token) could
  run there in one click. A Chrome Web Store listing (unlisted, one-time developer fee) would replace "Load unpacked" but then
  the extension needs a settings page for each user's own URL + token instead of the baked-in `config.local.js`.
- No documented `/copy` URL for standalone Apps Script projects (Docs/Sheets have one); the editor's Overview page has
  "Make a copy" for a shared script. Unverified option; needs a live try.

## 2026-11-26 — a FlyBy band inside Gmail web: InboxSDK supports it

- InboxSDK 2.2.35 (installed) has `ThreadView.addNoticeBar()` (an element above the thread's messages, works in any
  view including Sent) and `ComposeView.addComposeNotice()` (an element in the compose window's notice area) and
  `addStatusBar()` (bottom of compose). All give a plain `el` to fill, so colour and text are ours. Used for v0.4.0.
- Showing "about to start" on a just-sent mail: reading the Bcc in the page would stay stale after a cancel (the tag
  stays in the sent message forever), so the server decides: `get` reports a tag only on a message the scan has not
  processed yet (newer than `lastScan` minus the overlap and not in `doneMsgs`).
- The hidden browser cannot check Gmail itself (needs the operator's Google login and the unpacked extension); the band
  styles were rendered on a local test page instead. Apple Mail side: flyby-mail `findings.md` 2026-11-26.


## 2026-11-18 (latest) — P3 plan under revision: Alex will not learn a Bcc rule; Apple Mail extension and IMAP engine are two halves, not alternatives

- Operator: Alex is a technophobe and will never use a Bcc code. For them it must feel like the Gmail panel: pick the time and
  "if no reply" in a button, nothing else. That makes option A (Bcc) unusable for Alex (it may still suit Sam) and
  corrects the page `docs/p3-non-gmail.html`, which wrongly presented the IMAP engine (B) and the Apple Mail extension (C)
  as alternatives. They are the front end and the engine of one system, like the Chrome extension and Apps Script for Gmail.
- Verified in Apple's MailKit docs (2026-11-18): a compose extension gets a toolbar button with our own view (so a time picker
  works) and can add custom headers to the outgoing message (`MEComposeSessionHandler`, `additionalHeaders(for:)`). The message
  action handler only runs "as the system downloads" a message and can mark read/unread, move to the account's Archive, Junk or
  Trash, flag or colour; no custom folders, nothing on a timer. The docs state nothing about background work or mailbox access.
  So the extension alone cannot archive now and bring a conversation back later.
- Therefore the engine must read and move mail itself: IMAP on the VPS (works with the Mac off, shows on iPhone too). Yahoo/AOL
  are folder-based: a message lives in one folder. Received mail can be MOVED out of the inbox and back (the real messages);
  a mail they sent can only be COPIED into the inbox (original stays in Sent).
- Open: paid Apple developer account needed to install on Alex's Mac (conflicts with the zero-cost principle); `additionalHeaders`
  behaviour with Yahoo accounts and Sent-copy headers to be tested; the Mail extension covers the Mac only, not the iPhone.

---

## 2026-11-18 (later) — P3: do we need an IMAP server for Alex and Sam?

- Question from the operator, who also noted Apple Mail (Alex) and an unknown mail app (Sam). Answer: not first. Any
  solution needs three things: know what to watch, know if someone answered, return the mail where they look. Only
  "know if someone answered" requires reading their mailbox (IMAP for Yahoo/AOL; a Mail extension plus a helper app on
  a Mac; Microsoft sign-in for Outlook). A reminder email without reply detection needs no mailbox access at all.
- Option A (recommended start): Alex Bccs an address that carries the time; the FlyBy Gmail mailbox's Apps Script
  saves it and, at the date, emails Alex a reminder with links ("they replied" / "again in 2 days") served by the
  existing web app. Works in any mail app, no passwords, no VPS. Limits: blind to replies; the mailbox receives copies
  of Bcc'd mails (keep only subject, recipients, date); allowlist senders (From can be forged); bends the AGENTS.md
  "each user runs their own copy" rule (no Google verification needed, since only the operator grants access).
- Option C caveat (unverified): a Mail extension runs only when Mail calls it, so deadlines need a helper app running
  on the Mac; Alex's mails say "Sent from my iPhone", where extensions do not exist; distributing to others needs a paid
  Apple developer account (a free one should do for the operator's own Mac).
- Details and decision tree: `docs/p3-non-gmail.html`.

---

## 2026-11-18 — Open/click tracking dropped from the roadmap

- Decision (operator): no tracking pixel and no link rewriting, so no "if not opened / if no links clicked". The
  idea came from copying a commercial tool's feature list into the roadmap (2026-11-06), not from a stated need; FlyBy's
  purpose is "bring it back if nobody replies".
- Why it is a weak signal: Outlook, Thunderbird and many corporate setups block remote images by default (missed
  opens); Apple Mail Privacy Protection and Gmail's image proxy fetch images without a human reading (false opens,
  and a false open would wrongly suppress a reminder); a missing open says nothing either way. Click tracking has the
  same trust problem and means rewriting every link.
- Do not propose it again without a new reason. Roadmap P2 now holds only the inbox hold and the AI wording check.

## 2026-11-15 (later) — Phase 0 live test: BCC copy lands in the inbox

- Verified in Gmail: panel sets a reminder (archives, `FlyBy/Waiting`, shows return time + Cancel);
  `+1h` BCC code is picked up within one 5-min tick; a reply lands in the inbox normally.
- **Wrong assumption corrected**: Gmail does NOT drop the self-BCC copy when the address carries a
  `+tag`. The copy arrives in the inbox as a normal message; the engine then labels the thread
  `FlyBy/Waiting` and archives it, so the clutter lasts at most one tick (~5 min).
- Narrowed OAuth scope: `gmail.modify` replaces full `mail.google.com` (no permanent delete).

---

## 2026-11-15 — Backend moves from the home server to a VPS

- Reason: the home server would be left unattended for long stretches.
  A VPS has a public IP (no tunnel for tracking/zero-touch links) and datacenter uptime.
- Cost: P3 app passwords now sit on a rented, internet-facing host → encrypt at rest,
  IMAP engine on a private port, own container, behind Cloudflare.
- Older entries below still say "home server"; read that as the VPS.

---

## 2026-11-09 (later) — Self-BCC clutter, zero-touch mode, Apple Mail extension

- **Gmail self-BCC**: Gmail treats the BCC copy to yourself as a duplicate of the Sent
  copy and silently drops it (Google Groups user reports, 2010–2013; not official) → no
  second copy in the inbox. FlyBy finds the Sent copy, which keeps the Bcc header.
  Verify in the Phase 0 test. A dedicated "trashcan" Gmail is therefore not needed for
  Gmail users, and would make things worse (engine would have to read a 2nd account).
- **Zero-touch mode for non-Gmail users (replaces BCC/folder idea for P3)**: the IMAP
  engine watches *every* sent message, applies a default deadline, and drops a reminder
  email into the inbox with one-click links. Commercial follow-up tools offer the same
  idea as a paid tier. Costs: needs a public HTTPS endpoint on the home server for the
  links; full-mailbox access via app password → trust/privacy conversation with the user;
  noise from mails that need no answer (newsletters replies, "thanks!") → filter by
  heuristics (external recipient, has "?" …) or an LLM check.
- **Apple Mail extension (MailKit, macOS 12+)**: a compose-session handler can add a
  toolbar button to the compose window (`MEComposeIcon`), show a custom view
  (`viewController(for:)`, subclass of `MEExtensionViewController`), set additional
  headers on outgoing mail, and check before send (WWDC21 "Build Mail app extensions").
  So a "Remind me" button that stamps an `X-FlyBy` header is feasible. Open: the host
  app must be signed; installing on another person's Mac without warnings likely needs
  a paid Apple Developer ID + notarization — unverified.

---

## 2026-11-09 — Non-Gmail users: options and open questions

- Plus-addressing (`name+3d@`) is a Gmail feature; Yahoo/AOL don't offer it the same
  way (unverified — check before P3). So for Yahoo/AOL the BCC target should be a
  FlyBy-owned collector mailbox (e.g. a dedicated free Gmail "robot" account with
  `+code` addresses); the engine still reads the user's own Sent/Inbox over IMAP to
  detect replies (Apple Mail and webmail keep Bcc in the sent copy — verify per client).
- Folder-based alternative works in every IMAP client: user files the sent mail into
  a `FlyBy/3d`-style folder; engine watches those folders.
- Returning a thread over IMAP can't "bump to top" reliably across clients → deliver a
  reminder email (APPEND or send) quoting the original — shows on every device.
- Apple Mail native option (P4, unverified): macOS MailKit compose-session extensions
  can show a view from the compose toolbar and add custom headers to outgoing mail —
  a FlyBy header in the sent copy would let the engine find it. Needs Xcode + Swift;
  feasibility to confirm before committing.

---

## 2026-11-06 (later) — In-compose UI needs a browser extension, not a Gmail add-on

Operator screenshots of a current commercial follow-up tool show a "Send Later" button, a "Remind me [in 2 days]
[if no reply / if not clicked / if not opened / regardless]" bar and "Track" / "Meet"
buttons **inside Gmail's own compose window**, plus an icon in the thread
toolbar opening "Return conversation to inbox… [if no reply] [with a note]", with
presets (1h … 1 month), natural-language "at a specific time" ("Monday 9am",
"2 business days") and "random time".

A Gmail add-on **cannot** draw UI inside the compose window or react to Send — that
UX is only possible from a **browser extension** that injects into Gmail's web page.
So such a tool = Chrome extension (desktop) + its maker's servers + separate mobile apps.

Implication for FlyBy — split into two parts:
- **Desktop UX: our own Chrome extension**, loaded "unpacked" in developer mode
  (no Chrome Web Store, no review, free). Libraries that hook Gmail's page:
  - `InboxSDK` (made by Streak, open source, MIT/Apache-2.0; free app ID required) —
    compose-window buttons, thread toolbar buttons, presending/sent events.
  - `gmail.js` (`gmail-js` on npm, MIT, MV2+MV3 compatible, needs jQuery) —
    lower-level observers on Gmail's own requests, incl. send.
  Risk: both depend on Gmail's undocumented page internals → can break when Google
  changes Gmail; InboxSDK absorbs most of that for its many commercial users.
- **Engine: Apps Script** (unchanged) — does the checking and returning on a timer,
  runs even with the laptop closed. The extension only *records the user's choice*
  (label the sent thread + due date).
- **Phone**: Chrome extensions don't run in the Gmail app → contextual add-on card
  on an opened sent message, and/or the BCC-plus-address path.

---

## 2026-11-06 — Initial research: features, alternatives, feasibility

### 1. What a Gmail follow-up tool does (commercial feature inventory)

Sources: public product pages and blog posts of commercial Gmail follow-up tools, third-party how-tos.
Feature names below are generic descriptions, not product names.

| Feature | What it does | FlyBy verdict |
|---|---|---|
| **Return if no reply** | At compose time or later, pick a date; thread returns to inbox at that time. Conditions: *if nobody replies*, *if not opened*, *if no links clicked*, *regardless*. A reply cancels it. | **Core. Phase 0.** "Not opened / not clicked" need tracking → Phase 2. |
| **Auto follow-up** | Write the follow-up at compose time; sent automatically only if no reply. | Phase 1 (Apps Script can reply in-thread). |
| Send Later | Scheduled send. | **Skip** — Gmail native *Schedule send* covers it. |
| Email reminders / snooze | Archive now, return at time X. | **Skip** — Gmail native *Snooze* covers it. |
| Response tracking / Insights | Dashboard of what got replies. | Phase 1–2 (cheap once labels exist). |
| Read receipts / click tracking | Pixel + link redirect. | Phase 2, needs a public HTTPS endpoint (home server). Unreliable by nature: Apple Mail Privacy Protection prefetches (false opens), some clients block images. |
| Recurring email | Send on a schedule. | Phase 1 (time trigger). |
| Notes on messages | Private note attached to a thread. | Phase 1 (PropertiesService / Sheet keyed by thread id, shown in contextual card). |
| Inbox hold | Holds new mail, delivers in batches, exceptions. | Phase 2: toggle a Gmail filter (skip inbox → label) via Gmail API settings, release on schedule. |
| Writing check | AI writing-quality score. | Phase 2 — LLM via home server. |
| Meeting scheduling / polls / bookable schedule | Booking pages. | Out of scope for now; Google Calendar *Appointment schedules* is free natively. |

Pricing (for the "is it worth it" baseline): a limited free tier, then about $5 to $50 a month
(billed annually).

### 2. Does an open-source / free alternative already exist?

**Verdict: no maintained open-source project covers this. We'd be (near) first to do
it as a complete package — but the building blocks are proven.**

- **Gmail native *Nudges*** (Settings → General → Nudges → "Suggest emails to follow up
  on"): free, ML-chosen, you can't choose which emails or when, many never nudge,
  never writes the follow-up. Worth turning on anyway as a safety net.
- **Apple Mail "Follow Up"** (iOS 16 / macOS Ventura+): resurfaces sent mail with no
  reply after ~3 days; ML-chosen. Works with any account in Apple Mail — relevant
  for Yahoo/AOL users as a zero-effort stopgap (account-type support not confirmed).
- Open-source scripts (all small, single-author):
  - `vallode/sequel-for-gmail` — closest match: Apps Script **Card Service** add-on,
    TypeScript, follow-up thresholds, up to 3-step auto follow-up (drafts only).
  - `abhitim55-lgtm/gmail-followup-tool` — MIT, add-on + time trigger, in-thread
    auto follow-up, stops on reply; 0 stars, new. Useful quota notes.
  - `sryo/GmailTidy` — GPL-3.0, "Ping" resurfaces unanswered threads once; also
    Gemini-drafted replies. 6 stars.
  - `Eugene-Bond/gmail-automation-tools` — label + ISO-8601 interval label → auto
    reminder replies until answered.
  - `Aldo-f/script.google` — FollowUpReminder (no reply after WAIT_DAYS).
  - Jonathan Kim's classic "Gmail No Response" script — labels sent mail containing
    "?" with no reply (heavily forked, old).
  - Snooze/send-later scripts: `cpiekacz/Gmail-Snooze` (MIT), `vitaly/gmail-later`,
    `webdigi/GmailScheduler` (MIT), `jiehan1029/snooze-outbox-gmail-addon`.
  - Older self-hosted: `ChimeraCoder/go-yo` (Go + offlineimap, 2013), Bumper (PHP,
    follow-up-by-email service, 2011), mxHero (SourceForge).
- Commercial tools with free tiers exist too: no-reply alerts in mail trackers, follow-up-by-email services
  (from about $12/yr), IMAP mail clients for any provider, CRM add-ons for Gmail.

License note: we write our own code; if we ever borrow from the above, MIT is fine,
GPL-3.0 (GmailTidy) would force GPL on FlyBy — read for ideas only.

### 3. Can a self-made add-on run in my own Gmail? — Yes.

- **Install**: Apps Script editor → Deploy → *Test deployments* → Install. Add-on
  appears in Gmail (refresh tab). Testers must be in the script owner's domain, so
  for other people the model is: **each person installs their own copy**.
- **Verification**: Gmail scopes (`gmail.modify`, etc.) are *restricted*, which
  normally means OAuth verification + paid third-party security assessment —
  **but personal use is an explicit exemption**. On a consumer account you click
  through a one-time "Google hasn't verified this app" warning once. Unverified apps are
  capped at 100 users — irrelevant for us. On a Workspace domain the owner's own
  domain gets the normal flow (no warning).
- **Mobile**: contextual cards (opening a message) work in the Gmail Android/iOS
  apps; homepage cards don't; compose-trigger mobile support is unconfirmed →
  design a compose-time path that doesn't need the add-on (plus-address BCC + filter).
- **No on-send hook exists** for add-ons. Compose triggers can read recipients
  (`draftAccess: METADATA`) and modify body/subject/recipients, but can't know when
  the draft is sent → reminders attach to the *sent thread*, not the draft.
- **Triggers**: Workspace add-ons can't use simple triggers; whether add-on-created
  time triggers are frequency-limited is undocumented. Since we own the script,
  install the time trigger from the editor (`install()`), as other tools do.
  **Verify in Phase 0.**
- **External backend alternative** (Gmail API from home server): an OAuth app left in
  *Testing* status has refresh tokens that expire every 7 days; switching to
  *In production* without verification removes that for personal use. Not needed
  for Phase 0.

### 4. Consumer Gmail quotas that shape the design (Apps Script)

| Limit | Consumer | Workspace |
|---|---|---|
| Trigger total runtime | 90 min/day | 6 h/day |
| Per execution | 6 min | 6 min |
| Email recipients sent | 100/day | 1,500/day |
| Gmail read/write ops | 20,000/day | 50,000/day |
| UrlFetch | 20,000/day | 100,000/day |
| Triggers per user per script | 20 | 20 |
| PropertiesService | 500 KB total, 9 KB/value | same |

A 10–15 min trigger that inspects only `label:FlyBy/Waiting` threads stays far
inside these. A 1-min trigger is a known way to silently exhaust the runtime quota.

### 5. Non-Gmail users (Yahoo / AOL)

A Gmail add-on can't help them. Options, cheapest first: (a) Apple Mail Follow Up /
Spark (no work for us); (b) move to Gmail; (c) FlyBy Phase 3 — an IMAP engine on the
home server. Yahoo and AOL (same mail platform) still allow IMAP with an
**app password** (AOL needs 2-step verification on first). That
means storing their app passwords on the home server — real security weight, decide
deliberately.

### 6. Reverse engineering commercial tools

Not needed and not done: everything FlyBy needs is publicly documented Gmail behaviour plus
our own design. A clean-room implementation avoids any licence or terms-of-service question.
Keep REA for debugging our own artifacts only; other products may be observed as a user, never
decompiled, and nothing is lifted from them (AGENTS.md).

## 2026-11-15/16 — Findings from building auto follow-up and the web API

- **`GmailMessage.reply()` on a message you sent goes back to you**, not to the original recipients
  (observed in an earlier session; NOT reproduced in the log: test 05's plain `reply()` went to the original recipient). So the auto follow-up builds a draft with `createDraftReply`, overwrites the
  recipients with `draft.update`, re-reads and checks them, and only then sends. `draft.update` returns a
  draft with a new id; keep the returned one.
- **Extension to engine channel**: the Gmail page must never hold the API token, so the content script
  messages the MV3 service worker, which calls the Apps Script web app. Web app access has to be "Anyone"
  for a non-Google caller; the long random token is then the only key. The reply comes via a redirect to
  `script.googleusercontent.com`, hence that host permission. Sending `text/plain` avoids a CORS preflight,
  which Apps Script cannot answer.
- **Follow-up text path**: the text cannot ride in an email address, so it is stored first (`prepare`) under
  a random key and the key goes into the BCC tag (`.f<key>`). Unused texts expire after 7 days.
- **Live log 2026-11-15 (FlyBy log sheet)**: plain `reply()` follow-up on test 05 went to the original
  recipient (`followup`, 24 chars). Test 06 failed with `Not found`; test 07, running the safe draft path,
  failed `at check recipients: Not found` and sent nothing: `draft.getMessage()` on the draft returned by
  `draft.update()` is not found immediately. Fix: `readDraftMessage` retries and re-fetches with
  `GmailApp.getDraft(id)`. Thread 07 in Gmail confirms the recipients were right (To original recipient, tag only in Bcc, no leftover draft); the only fault is the read-back. Second fallback added: the thread's own draft message. **Verified 2026-11-16 (test 08, run via API `prepare` + Gmail send, log `followup`): the retries fixed it.**
- **Apps Script deployments**: a web app deployment is pinned to a version, while the time trigger and
  `clasp push` use @HEAD. After code changes, create a new version on the deployment or the web app keeps
  serving old code (deployment @1 already differs from HEAD in `core.js`/`engine.js`).
- **Still unverified (as of 2026-11-16)**: the safe `sendFollowUp` in a live Gmail account, including that the
  recipient check in `sendFollowUp` holds for Cc-only and multi-recipient threads.

- **Gmail add-on chrome (2026-11-16, seen live)**: the dark top bar of the side panel shows only the manifest `name`; `logoUrl` appears in the Gmail side rail (and add-on list), not in that bar. A logo next to the name inside the panel needs a card header (`setImageUrl`), which repeats the name as a second line: decided against.
- **DateTimePicker time zone (confirmed 2026-11-16)**: without `setTimeZoneOffsetInMins` the Card Service picker reads and shows the time as UTC: a recurring email set for 16:45 was logged as due 17:45 (Vienna, UTC+1). Fix: set the offset from the user's time zone (`commonEventObject.timeZone`). Panel picker had the same bug.
- **Bounce filter FAILED live (2026-11-16 17:41)**: a Gmail `Address not found` bounce (sender `mailer-daemon@googlemail.com`, arrived after my mail) was still counted as a reply (`replied, no action`), although `isAutomated` returns true for that sender in Node and the live code matches the repo. Cause unknown. `replied` log rows now name the counted message (from, time, auto flag, anchor, my addresses). Retest: `FlyBy bounce test 2`.
- **Recurring email verified live 2026-11-16**: saved from the panel, sent by the 5-min tick within 3 min of its slot (`recurring-sent`). The panel picker had been storing the time as UTC (+1 h); see the DateTimePicker finding.
- **Bounce test 2 (17:56) also `replied`, and its log detail was the OLD plain `no action`**, although the diagnostic build had been pushed at 17:49 and HEAD pulled back contains it. So the code that handled it was not the pushed HEAD (stale trigger, a second trigger, or deployment caching: unknown). Added `BUILD` id to `replied`/`returned` rows; retest `FlyBy bounce test 3` sent 18:00, due 18:06. If the row has no `[2026-11-16.b]`, something else is running: check script.google.com Triggers and Executions.
- **ROOT CAUSE of the bounce-filter "failures" (2026-11-16, from the Triggers page screenshot)**: the only trigger (`tick`, time-based) showed `Deployment: Version 2`. Triggers run the deployed version, not HEAD. Redeploying the web app as @2 (12:4x) pinned the trigger to a snapshot older than the auto-reply filter, the diagnostics and the engine hardening, so tests at 17:41 and 17:56 ran old code (hence the old `no action` text). Not a logic bug in `isAutomated`. Fix: `scripts/deploy.sh` (push + deploy new version); deployed @3 at 18:11. **Confirmed (Triggers page, 2026-11-16 ~18:15): after deploying @3 the trigger shows `Version 3`, so it follows the latest deployed version automatically; `scripts/deploy.sh` is enough, no trigger edit needed.**
- **Bounce filter VERIFIED live 2026-11-16 (test 4, deployed version 3)**: `returned ... [2026-11-16.b] no reply (ignored 1 automatic message(s))` for a mail to a nonexistent address: the `Address not found` bounce from mailer-daemon was ignored and the thread came back to the inbox. The earlier failures were the stale deployed version, not the filter.
- **ROOT CAUSE of the stopped ticks (2026-11-16, Executions page + code)**: `setReminder()` called `ensureTrigger()`, which deletes the `tick` trigger and creates a new one. From the Gmail panel (add-on context) the delete worked but creating failed: `onPreset` at 18:32:03 shows Failed (7.9 s). No trigger was left, so no tick ran after 18:29:18 and `test for point 3` (sent 18:34) was never picked up. The Executions page shows ticks every 5 min taking 1-12 s (quota was never the problem). Fix: reminders never touch the trigger; only `install()` (`resetTrigger`, run from the editor) replaces it. The lost trigger must be recreated once by running `install`.
- **Recovery verified (2026-11-16 19:02)**: after `install` at 18:55 the trigger ran again (first tick 18:58:51, `tick-ok` 18:59:17, `status` triggers=1) and the stuck `test for point 3` was returned. Web API `status` read at 19:02 matches.
- **InboxSDK thread buttons in the "more" (three-dot) menu cannot have a dropdown (seen live 2026-11-16: the click did nothing, no feedback)**. Use `sdk.Widgets.showModalView` for UI there; dropdowns only work for buttons on the toolbar itself and for compose buttons.
- **Gmail search matches per message, not per thread (seen live 2026-11-16)**: `label:FlyBy-Waiting in:inbox` found nothing for Alex's thread, because the `FlyBy/Waiting` label is on my old message and the reply (in the inbox) has no label. A label added to a thread does not reach later messages. Query the label alone and filter in code. Also: first tick after the trigger was recreated took 25 s (backlog), later ticks about 4 s.
- **Early reply detection verified live (2026-11-16 20:33, build .f)**: Alex's reply on `Claude Team` cleared `FlyBy/Waiting`, added `FlyBy/Replied` (all 3 messages), `status` waiting=0.

## 2026-11-23 — P3 second-Mac incident (pointer)

Installing the Mac engine on a second Mac with the same Yahoo account replayed ~10 old reminders into the user's own inbox (empty local state, no lateness limit). Root cause, fix (flyby-mail v0.2.2) and the shared-state idea: `flyby-mail/findings.md` 2026-11-23. Verified afterwards: both Macs on 0.2.2, the second Mac reused the first Mac's reminder instead of sending another.
