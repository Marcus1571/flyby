# CHANGELOG — FlyBy

## v0.5.3 (2026-11-27) — the thread band says when it cannot reach FlyBy

Why: the operator sent "222222" with a 1-hour reminder; the compose band showed, the sent thread had `FlyBy/Waiting` but no
band. The server answered `get` correctly (reminder due 13:03). The extension had reloaded as 0.5.2 with empty settings:
Chrome reports reloading an unpacked build as an "update", and the settings page opened only on "install", so the URL and
token were never asked for. Every web-app call failed ("not set up"); the compose band is local so it still showed, the
thread band hid the failure, and the reminder only started with the 5-minute check instead of seconds after Send.

Behavior changes
- `extension/src/background.js`: the settings page opens on install and on every update or reload while URL or token is
  missing (was: first install only).
- `extension/src/code.js` `threadBand`: a failed call returns a red band "FlyBy: could not read this conversation. <error>"
  instead of no band. `test/core.test.js`: the `ok: false` case now expects that band.
- `extension/manifest.json`, `extension/package.json`: 0.5.3. No Apps Script change.

## v0.5.2 (2026-11-27) — clean room in the docs, licence notices in the extension

Why: the operator wants FlyBy to stand on its own like any independent tool, with nothing a commercial vendor could object to:
no product names, no claim of being a copy, nothing taken from another product (none ever was, findings 2026-11-06 §6).

Behavior changes
- `extension/THIRD-PARTY-NOTICES.txt` (new): InboxSDK's MIT licence text. The release zip bundles InboxSDK, and MIT requires
  the notice to travel with copies. `extension/package.json` build copies it and the repo `LICENSE` into `dist/`; 0.5.2.
  `extension/manifest.json`: 0.5.2. No Apps Script change.

Other changes
- `AGENTS.md`: the project description no longer names the product FlyBy was inspired by; new clean-room rule (study
  other tools only as a user, copy nothing, never name competing products or present FlyBy as a copy of one).
- `README.md`, `STATUS.md`, `docs/grand-plan.html`, `findings.md`: commercial product and company names replaced by generic
  descriptions; borrowed feature names renamed (roadmap P2 "inbox hold"); competitor URLs and price list removed.
- Repository: deleted and recreated on GitHub with this release as its only commit and only release, so no earlier wording
  survives in public history or release pages. v0.4.6–v0.5.1 and their commits are in the private archive.

## v0.5.1 (2026-11-27) — settings button contrast

Why: white text on the orange Save button was 3.58:1, below WCAG AA (4.5:1) for 14 px text.

Behavior changes
- `extension/options.html`: button background `#e8590c` → `#c2410c` (5.18:1).
- `extension/manifest.json`, `extension/package.json`: 0.5.1. No Apps Script change.

## v0.5.0 (2026-11-27) — guided install, no Node, one extension build for everyone

Apps Script deployed @21 (build `2026-11-27.a`, API `status` checked live: trigger 1). Release v0.5.0 carries the three files.

Why: the operator wants FlyBy installable on Mac and Windows by people who are not developers. Native installers were weighed
and not built: the hard steps are Google's and Chrome's own browser clicks (consent screen, "Load unpacked"), which no
installer can do (findings 2026-11-26), so the install is a guided flow in `KB.md` §2 with three files attached to each release.

Behavior changes
- `extension/src/background.js`: reads the web app URL and token from `chrome.storage.local` (`apiUrl`, `apiToken`) on every
  call instead of importing them from `config.local.js` at build time; opens the Options page on first install. Before, every
  build carried its owner's token, so a build could not be shared or attached to a public release.
- `extension/options.html`, `extension/options.js` (new): settings page; checks the URL shape and a 64-hex token, saves, then
  sends `ping` and says whether FlyBy is connected.
- `extension/manifest.json`: `storage` permission, `options_page`; 0.5.0. `extension/package.json`: build copies the two new
  files and no longer creates `config.local.js`; 0.5.0.
- `extension/config.local.example.js`: deleted (nothing reads `config.local.js` any more; it stays gitignored).
- `src/api.js` `setupApi`: the log line now points at the extension's Options page. `src/engine.js`: `BUILD` `2026-11-27.a`.

Other changes
- `scripts/release-assets.sh` (new): builds `release/flyby-extension.zip`, `release/Code.gs` (all of `src/*.js` in one file;
  only literal top-level constants, so order does not matter) and `release/appsscript.json`. `.gitignore`: `release/`.
- `KB.md` §2 rewritten as the click-by-click install and update guide; §5, §7, §8 follow the Options page. `README.md`: an
  Install section pointing at KB §2.

## v0.4.6 (2026-11-26) — public repo, no personal data

Apps Script deployed @20 (icon URL change only).
Why: the operator made the repo public. The new public history starts with this release as one commit; the 70 earlier commits
and releases v0.1.0–v0.4.5 stay in a private archive repo (their author email and some early notes were personal).

Behavior changes
- `src/appsscript.json`, `extension/src/content.js`: the icon URL points at `assets/flyby-icon-48.png` in this repo
  (`raw.githubusercontent.com`) instead of a Drive file shared by link (a shared Drive page shows its owner).

Other changes
- `.clasp.json` (the operator's own project id) is no longer tracked; `.clasp.json.example` is the template, `.gitignore` lists it.
- `LICENSE`: MIT. Docs: personal names replaced (people in the P3 plan are now "Alex" and "Sam"), a personal reason removed from
  `findings.md`. `KB.md` §1: icon and `.clasp.json` notes.
- `extension/manifest.json`, `extension/package.json`: 0.4.6.

## v0.4.5 (2026-11-26) — scan the just-sent thread directly

Apps Script deployed @19 (build `2026-11-26.e`); full scan and `scan` checked live.
Why: the operator measured ~20 s before the Bcc copy left the inbox with 0.4.4. `GmailApp.search` does not see a just-sent mail
for ~15 s, so the 3 s call found nothing and the 15 s retry did the work.

Behavior changes
- `src/engine.js`: the per-thread body of `scanBccCodes` is now `scanThread(thread, last, addrs)` (same logic; the time zone is
  read only when a reminder is set). `scanBccCodes` loops over its search with it. `BUILD` `2026-11-26.e`.
- `src/api.js` `scan`: with a `threadId` that exists, calls `scanThread` on `GmailApp.getThreadById` (no search, `lastScan` not
  moved); without one, the full scan as before.
- `extension/src/content.js`: `scan` after 1 s, retries after 4 s and 15 s (was 3 s and 15 s).
- `extension/manifest.json`, `extension/package.json`: 0.4.5.

## v0.4.4 (2026-11-26) — Bcc self-copy leaves the inbox within seconds

Apps Script deployed @18 (build `2026-11-26.d`); `scan` checked live (ran, `lastScan` moved).
Why: the operator saw the Bcc copy of a just-sent mail sitting in the Gmail inbox ("pointless message"); Apple Mail shows nothing
like it. It stayed until the 5-minute tick set the reminder and archived the thread.

Behavior changes
- `src/api.js`: new action `scan` runs `scanBccCodes()` under the same user lock as `tick` (10 s wait; `{busy: true}` if a tick
  holds it, that tick does the same work) and returns the thread's reminder.
- `extension/src/content.js`: compose `sent` handler: if the mail carried a FlyBy tag, call `scan` after 3 s, and once more after
  15 s if no reminder exists yet (Gmail's search can lag a just-sent mail), then redraw that thread's band if it is open.
  `showBand` remembers the tag (`tagged`) for this.
- `src/engine.js`: `BUILD` `2026-11-26.d`. `extension/manifest.json`, `extension/package.json`: 0.4.4.

## v0.4.3 (2026-11-26) — compose band below the Send row

Why: the operator saw that the 0.4.1 compose band (status bar above the native Send row) was hidden under Gmail's floating
formatting toolbar; Send itself stayed visible.

Behavior changes
- `extension/src/content.js` `showBand`: `addStatusBar({height: 52})` without `addAboveNativeStatusBar`, so the band goes
  below the Send row where nothing floats. The bar gets `box-sizing: border-box` and padding `0 16px 8px` (InboxSDK's own
  CSS gives it `0 16px 16px`), then `setHeight(52)` again so InboxSDK re-measures and shrinks the body by exactly 52 px.
- `extension/manifest.json`, `extension/package.json`: 0.4.3. No Apps Script change.

## v0.4.2 (2026-11-26) — a reply that came before the scan stays in the inbox

Apps Script deployed @17 (build `2026-11-26.c`, checked live).
Why: the operator found test thread 222222 only in Sent, labelled `FlyBy/Replied`. The recipient replied within the 5 minutes before
`scanBccCodes` picked up the Bcc tag; `setReminder` then archived the thread, and archiving is per thread, so the reply
disappeared from the inbox. `processEarlyReplies` labelled it Replied in the same tick but never moves threads.

Behavior changes
- `src/engine.js` `setReminder`: reads the messages with the automatic-mail check (`toPlain(thread, true)`) and archives only
  when no real reply newer than the anchor is there; otherwise it logs `kept-in-inbox` and leaves the thread in the inbox.
  Applies to every way a reminder is set (Bcc scan, add-on card, API `set`). `myAddrs()` read once. `BUILD` `2026-11-26.c`.
- `extension/manifest.json`, `extension/package.json`: 0.4.2 (no extension code change; version follows the release).

## v0.4.1 (2026-11-26) — band fixes after the first look in Gmail

Apps Script deployed @16 (build `2026-11-26.b`); `get` checked live (returns `replied`).
Why: the operator tried 0.4.0 in Gmail. The thread bands worked, but (1) the compose band pushed the Send button below
the visible part of a tall compose window, and (2) a test thread with a reply already in still said "starts within
5 minutes ... if nobody replies" (the 5-minute scan had not run yet, so nothing was wrong, but the text was misleading).

Behavior changes
- `extension/src/content.js`: compose band uses `cv.addStatusBar({height: 44, addAboveNativeStatusBar: true})` instead of
  `addComposeNotice`. Before: the notice was inserted above the body without shrinking it, so Send went off screen. The
  status bar sets InboxSDK's statusbar-height CSS variable and the body shrinks.
- `src/api.js` `get`: new `replied` = a non-automatic reply newer than the open round's anchor (the reminder's `anchor`,
  or the date of the pending tagged message) is already there; false for "regardless" rounds and when nothing is open.
  Records the pending message's date (`pendingAt`) for that. `myAddrs()` is now read once for both checks.
- `extension/src/code.js` `threadBand`: `replied` with an open round (reminder or pending tag) gives a green band "a reply
  arrived, the reminder closes at the next check (within 5 minutes)"; it wins over amber/blue. Without an open round it is ignored.
- `extension/src/menu.js`: band text is one line, cut with an ellipsis, full text as tooltip (`title`); the icon spacing
  moved from flex `gap` to a margin so `text-overflow` works.
- `src/engine.js`: `BUILD` `2026-11-26.b`. `extension/manifest.json`, `extension/package.json`: 0.4.1.
- `test/core.test.js`: three `threadBand` cases for `replied`.

## v0.4.0 (2026-11-26) — coloured FlyBy band in Gmail web

Why: the operator could not see a thread's FlyBy state anywhere in the message, e.g. after an "Ok" reply ended a reminder.
Apps Script deployed @15 (build `2026-11-26.a`); API `get` checked live. The band itself is not yet seen in Gmail (needs the rebuilt extension).

Behavior changes
- `src/api.js` `get`: also returns `labels` (the thread's `FlyBy/*` labels) and `pending` (a FlyBy Bcc tag on a message
  the 5-minute scan has not processed yet: newer than `lastScan` minus `SCAN_OVERLAP_MS` and not in `doneMsgs`; `''` otherwise).
  Before: `{reminder, note}` only, so after a reminder ended nothing told the extension how.
- `extension/src/content.js`: new `registerThreadViewHandler` draws a band above every opened thread (`addNoticeBar`) from
  `get`; the compose button now shows a band in the compose window (`addComposeNotice`) when a reminder is chosen, removes it
  on *Clear reminder*, and shows it for a reopened draft that already carries a FlyBy Bcc address. The toolbar window redraws the
  band after *set* / *Cancel reminder*. `fmt` moved to module level (shared).
- `extension/src/code.js`: new pure helpers `tagOf`, `describeTag`, `composeBand`, `threadBand` (state -> colour + text;
  precedence: reminder, pending tag, Replied, Followed up, No reply, Returned).
- `extension/src/menu.js`: `band(kind, text)` with its own scoped CSS (amber wait, green done, red warn, blue info).
- `extension/manifest.json`, `extension/package.json`: 0.4.0.

No behavior change
- `src/engine.js`: `BUILD` `2026-11-26.a`. `test/core.test.js`: band tests. `.gitignore`: `.playwright-mcp/`, `.DS_Store`.
- `KB.md` §4: corrected (headers are also read by the early-reply check; "Ok" counts as a reply); §7 band; §8 `get` fields.

## v0.3.0 (2026-11-17) — verified live except the phone panel

Verified in Gmail 2026-11-16/17: web API, auto follow-up, recurring emails, early reply detection, thread pop-up window, panel homepage Cancel, cancel back to the inbox, label clearing. Not yet verified: the phone panel. Apps Script deployed as @13 (build `2026-11-17.j`). The user must re-authorize once (new scope) and deploy the web app (KB §8).

Behavior changes
- Panel homepage shows "Replies are checked every 5 minutes. Last check: <time>" under the waiting list (`src/card.js` `onHomepage`, reads the `lastScan` property every tick writes), so a reply that is not yet noticed is not mistaken for a bug (operator, 2026-11-17). `BUILD` `2026-11-17.k`, deployed @14.
- `setReminder` (`src/engine.js`) removes the outcome labels of an earlier round (`FlyBy/No reply`, `Returned`, `Followed up`, `Replied`) before adding `FlyBy/Waiting` (found live: "Claude Team" kept `FlyBy/Replied` while waiting again). `BUILD` `2026-11-17.j`, deployed @13.
- Pop-up window (extension thread modal): after a successful *Cancel reminder* it closes by itself after 1.5 s, like after setting a time (operator request, `extension/src/content.js`). *Save note* keeps it open.
- Homepage waiting list has a Cancel button per row (2026-11-17, operator request): `src/card.js` `onHomepage` keeps the thread id of each `t:` property (`id`) and adds a `Cancel` text button calling new `onCancelWaiting`, which runs `cancelReminder` (so the thread also returns to the inbox) and redraws the homepage; a thread Gmail no longer finds is dropped from the list (logged `cancel`, `thread not found`). `BUILD` `2026-11-17.h`, deployed @11. Follow-up (`2026-11-17.i`, @12): the "if no reply" / "regardless" text moved from the top label to a bottom label, because the button squeezed the top label to "if no…".
- Cancel returns the thread to the inbox (2026-11-17, found in the live modal test: after Cancel the thread stayed archived, i.e. vanished from the inbox): `cancelReminder` in `src/engine.js` now calls `moveToInbox()` when a reminder was stored; no stored reminder = no move. Used by the panel button and the API `cancel`. `BUILD` bumped to `2026-11-17.g`. Needs `scripts/deploy.sh`.
- Extension thread modal (2026-11-17, found in the first live test): after a successful preset/custom set the modal closes by itself after 1.5 s (it stayed open before); the status line uses the panel's format (`Tue, 17 Nov 2026, 17:52`) instead of the browser's US format with seconds; "Set reminder" with an empty date/time now shows the browser's "fill out this field" prompt instead of doing nothing (`extension/src/content.js`: `fmt`, `modal.close()`; `extension/src/menu.js`: `reportValidity`; this also applies to the compose menu, which shares `buildMenu`).
- BCC tags: `<code>[.r][.f<key>]`. `.r` = return regardless (previously every BCC code meant "if nobody
  replies"); `.f<key>` = follow-up text. An address with an unknown suffix is now ignored.
- After a "no reply" return, a stored follow-up text is sent automatically to the original To/Cc.
- The tick additionally runs recurring mail and cleans stale follow-up texts.

Files
- `src/api.js` (new): web app `doGet` (health) / `doPost` (token check in constant time, then
  `handleApi`). Actions `ping prepare set cancel note get` (KB §8). `setupApi()` creates the token once.
  Denied and failed calls are logged (`api-denied`, `api-error`).
- `src/appsscript.json`: scope `gmail.send` added; `webapp` block (execute as deploying user, access
  anonymous). Reformatted (no other change).
- `src/core.js`: new `parseTag`, `nextRun` (day/week/month, month clamped to month end, UTC arithmetic),
  `othersIn` (addresses in a header that are not mine). `findCode` now accepts anything `parseTag` accepts.
- `src/engine.js`: `readDraftMessage(draft, thread)` (retries, then re-fetch by id, then the thread's own draft; because `getMessage()` right after `draft.update()` threw `Not found` in live tests 06/07; behavior fix, verified live in test 08); `setReminder(..., followUp)` stores the text only when "if no reply" is on; new label
  `FlyBy/Followed up` (also created by `install`); `scanBccCodes` uses `parseTag`, takes the stored text
  (`takeFollowUp`) and logs `followup-missing` when the key has no text; `processDue` calls `sendFollowUp`
  (draft, recipient overwrite and check, send; deletes the draft on failure; logs `followup`,
  `followup-skipped`, `followup-failed` with the failing step); `dropStaleFollowUps` (7 days); notes
  (`getNote`/`setNote`); `processRecurring` (`GmailApp.sendEmail`, skips missed runs, logs
  `recurring-sent`/`recurring-failed`).
- `src/card.js`: follow-up text field in the panel and a "then sends your follow-up" line on a scheduled
  reminder; private note section with *Save note*; homepage section "Recurring emails" with *New recurring
  email* form (address, subject, message, every day/week/month, first send, validated), *Delete*;
  `onNote`, `onNewRecurring`, `onSaveRecurring`, `onDeleteRecurring`.
- `extension/` 0.3.0: new `src/background.js` (service worker; holds the token, calls the web app),
  `src/api.js` (message wrapper), `src/menu.js` (shared menu: only-if-no-reply checkbox, follow-up text,
  presets, date-time picker); `src/content.js` reworked: compose button now stores the follow-up via
  `prepare` and writes the full tag into Bcc, plus a new thread-toolbar button (set/change/cancel,
  note); `src/code.js`: `tagFor`, `newKey`, tag-aware `isRemindAddress`; `config.local.example.js`
  (copy to gitignored `config.local.js`); `manifest.json` version 0.3.0 and host permissions for
  `script.google.com` / `script.googleusercontent.com`; `package.json` build bundles `content.js` and
  `background.js` and creates `config.local.js` if missing; InboxSDK's own `background.js` is now
  imported from ours instead of copied.
- `test/core.test.js`: cases for `parseTag`, `nextRun`, `othersIn`, `tagFor`/`newKey`, tag addresses.
- `.gitignore`: `extension/config.local.js`.
- `src/card.js`: removed the redundant "FlyBy" card header on the homepage; conversation card header is now "Return conversation to inbox", recurring form "New recurring email" (the add-on bar above already says FlyBy).
- `src/card.js`: recurring list label said "dayly"; now Daily/Weekly/Monthly, and the recipient moved from the (truncated) top label to the text line (`subject → address`).
- `src/card.js`: date-time pickers ("At a specific time", recurring "First send") had no time zone offset, so a time typed as 16:45 was stored as 16:45 UTC = 17:45 in Vienna. New `tzOffsetMins` + `setTimeZoneOffsetInMins` on both pickers. Behavior fix, not yet re-verified.
- Reply detection ignores automatic mail (behavior change): `src/core.js` new `isAutomated(from, headers)` (Auto-Submitted != no, Precedence bulk/junk/auto_reply, X-Autoreply/X-Autorespond, mailer-daemon/postmaster senders); `isReplied` skips messages flagged `auto`. `src/engine.js` `toPlain(thread, withAuto)` reads those headers (`GmailMessage.getHeader`, one call per header per message, only in `processDue`); the `returned` log row notes ignored automatic messages. `test/core.test.js` cases added. Previously out-of-office replies and bounces cancelled reminders. Not yet verified live.
- `extension/src/menu.js`: the shared menu restyled in Gmail's Material look: one scoped `<style>` (all selectors under `.fb`, nothing leaks into Gmail), Google Sans/Roboto, outlined text boxes, presets as rounded chips in two columns, blue "Set reminder" button, secondary actions (Clear/Cancel/Save note) as text buttons under a divider. `buildMenu` signature unchanged. `extension/src/content.js`: dropped inline styles, status line gets `fb-status`. Look-only change, needs your visual check.
- `src/core.js` `repliedBy` (returns the counted message; `isReplied` wraps it); `src/engine.js` `replied` log rows now say which message counted and why (from, time, auto flag, anchor, own addresses). Added after the bounce filter failed in a live test.
- `docs/grand-plan.html`: roadmap picture brought up to date (P0 "DONE", P1 "NOW" and drawn as built, "being tested"). Docs only.
- Reliability (behavior fix, not yet verified live) in `src/engine.js`: `tick` runs scan / due / recurring / cleanup each in its own try/catch and logs `tick-error` (before, one failing step silently stopped the rest). `processDue` split into `processDue` + `dueOne`: before, the reminder was deleted before the work, so any error lost it; now an error keeps it and retries on the next tick, max 3 attempts (`due-failed`, then `due-gave-up`), counted in `r.fails`.
- `src/engine.js`: `BUILD` constant stamped into `replied`/`returned` log rows to show which code ran.
- `scripts/deploy.sh` (new): `clasp push` + `clasp deploy` onto the existing versioned deployment (id found from `clasp list-deployments`, not stored). Needed because the trigger and web app run the deployed version, not HEAD. `KB.md` §1 updated.
- `src/card.js`: follow-up field title was cut off ("...sent automatically if n…"); now title "Follow-up text" with the rest as hint.
- `src/engine.js` `tick`: logs `tick-skipped` when it cannot get the lock, `tick-slow` when a run exceeds 20 s, and an hourly `tick-ok` heartbeat (run time, reminders waiting); an idle tick used to leave no trace, so a stopped trigger was invisible. `BUILD` 2026-11-16.c.
- Bug fix (serious) `src/engine.js`: `setReminder` no longer calls `ensureTrigger()`; the function is now `resetTrigger()` and only `install()` calls it. Before, every reminder deleted and re-created the `tick` trigger; from the Gmail panel the re-creation failed (`onPreset` Failed, 18:32) and the trigger was lost, stopping all ticks until `install` is run again. `BUILD` 2026-11-16.d.
- `src/api.js`: new actions `status` (build, trigger count, lastScan, lastBeat, waiting, recurring) and `ensure-trigger` (creates the trigger only if missing). `src/engine.js` `ensureTriggerExists()`. Lets the operator/agents check and repair the engine without opening the editor.
- Bug fix `extension/src/content.js`: the thread-toolbar button "FlyBy: return to inbox" did nothing when clicked. It sits in Gmail's three-dot menu (a plain list), where InboxSDK cannot attach a dropdown, so `dropdown.el` failed silently. It now opens the same menu in a modal (`sdk.Widgets.showModalView`) at once and loads the thread's note/reminder state afterwards; errors are shown in the status line. `hasDropdown` removed. Not yet verified in Gmail.
- New behavior `src/engine.js`: early reply detection. `processEarlyReplies` (new tick step, one `GmailApp.search('label:FlyBy-Waiting')`, then `getLastMessageDate() > anchor` before reading messages; the first version used `in:inbox` too and matched nothing, because Gmail matches label and inbox on the same message while the reply lacks the label) ends an "if no reply" reminder as soon as a real reply arrives (not at the due time): reminder deleted, `FlyBy/Waiting` removed, new label `FlyBy/Replied` added (also now added by the due-time `replied` path; `install` creates it), log `replied-early`. Reported by the operator: Ben replied but the panel and label still said waiting until the due date. `BUILD` 2026-11-16.f, deployed @9. Verified live 2026-11-16 20:33.
- Icon: the black Material plane was invisible on dark Gmail themes. New orange (#eb6c36) plane: `assets/flyby-icon.svg` (source) and `assets/flyby-icon-48.png`; the PNG is hosted on Drive (link-shared, id `1ZmxBeqebWnGq7N-rouAjDMWMtnj2w-Ei`) because the repo is private. `src/appsscript.json` `logoUrl` and `extension/src/content.js` `ICON` now use `https://lh3.googleusercontent.com/d/<id>`.
- Docs: `KB.md` §1, 3, 4, 5, 6, 7 and new §8; `README.md`; `findings.md`; `STATUS.md`.

## v0.2.0 (2026-11-15) — P1 slice 1: compose-window "Remind me" button

- `src/core.js` `parseCode`: new absolute code `u<epochMinutes>` -> `{atMs}` (time-zone independent).
  Behavior change: BCC addresses like `me+u29714320@…` now set a reminder at that exact time.
- `src/engine.js` `dueFromCode`: returns `atMs` directly. `scanBccCodes`: no longer searches the
  fixed `BCC_CODES` addresses (Gmail cannot wildcard); searches all `from:me` mail since the last scan
  and `findCode` picks the codes. `BCC_CODES` removed. Behavior change: any valid code works, not
  only the fixed list.
- `extension/` (new): MV3 Chrome extension (InboxSDK + esbuild). `src/code.js` pure helpers,
  `src/content.js` the compose button, `manifest.json`, `config.js` (InboxSDK app ID).
- `test/core.test.js`: cases for `u` codes and the extension helpers.

## Phase 0 follow-ups (2026-11-15, verified in Gmail, shipped in v0.2.0)

- Engine, panel, BCC codes, log sheet (built 2026-11-07).
- `src/engine.js`: tick every 5 min instead of 10; `ensureTrigger` replaces any old trigger.
- `src/appsscript.json`: OAuth scope `gmail.modify` instead of full `mail.google.com`
  (no permanent-delete permission). Behavior change: the user re-authorizes once.
