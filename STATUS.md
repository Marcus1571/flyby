# STATUS — FlyBy

_Last updated: 2026-11-27_

## Where things stand

- Repo created (private). Research phase complete — see `findings.md` (2026-11-06).
- **Phase 0 code written and pushed** to the Apps Script project (2026-11-07):
  panel (presets, custom time, if-no-reply/regardless, cancel), BCC codes, 5-min
  engine, log sheet. Core logic unit-tested. See `KB.md`.
- **Verified in Gmail (2026-11-15)**: install, panel, preset reminder, BCC code, reply arrives.
  "No reply returns" verified. Scope narrowed to `gmail.modify`,
  tick every 5 min.
- **P1 slice 1 shipped, v0.2.0 (2026-11-15)**: Chrome extension compose button + custom time
  (`extension/`, engine accepts `u<epochMinutes>`). Verified live: custom-time mail returned with
  `FlyBy/No reply`; reply-cancel and no-reply return verified in Phase 0 tests.
- **P1 slice 2, v0.3.0 released (2026-11-17); verified live except the phone panel**: web API
  (`src/api.js`), extension thread button and follow-up text, auto follow-up send, private notes,
  recurring emails. Not tagged or released until verified. Details: CHANGELOG, KB §3-§8.
- **Live observations (2026-11-16, FlyBy log sheet + screenshots)**: web app deployed ("FlyBy API v0.3.0",
  @1, 2026-11-15 22:16 local); two `api-denied` (bad token, `ping`) at 22:16, none after. Follow-up results:
  test 05 `followup` sent to the original recipient (OK, old plain `reply()` code); test 06 `followup-failed`
  `Not found` (old code); test 07 `followup-failed at check recipients: Not found` (current safe code: nothing
  sent, safety worked, but `draft.getMessage()` right after `draft.update()` fails). Fix
  (`readDraftMessage` retries) pushed to @HEAD and **verified live: test 08 (2026-11-16 12:17)**, API `prepare` + `.f<key>`
  BCC tag + safe follow-up all worked; reply went To the original recipient only, thread shows 2 messages. Web app redeployed 2026-11-16 as @2
  "FlyBy API v0.3.1" (same URL and token, ping OK); redeploy after any change to `src/api.js` or what it calls.

- **v0.4.0 (2026-11-26): FlyBy band in Gmail web** (operator: the FlyBy state was invisible, e.g. after an "Ok" reply).
  Extension 0.4.0 draws a coloured strip in compose and above opened threads (Inbox and Sent); API `get` returns `labels`
  and `pending`; Apps Script deployed @15 (build `2026-11-26.a`, `get` checked live). **Not yet seen in Gmail**: the
  operator must rebuild/reload the extension (`cd extension && npm run build`, reload in `chrome://extensions`).
  **v0.4.1 (2026-11-26)**, after the operator's first look: compose band moved to a status bar above Send (the
  0.4.0 notice pushed Send below the screen); while a round is open but a reply is already in, the band turns green
  "closes at the next check" instead of blue/amber "if nobody replies" (seen on a test thread before the 5-min scan).
  Thread bands for waiting / no reply confirmed by the operator in Gmail.
  **v0.4.2 (2026-11-26)**: a reply that arrived before the Bcc scan was archived together with the thread (operator found
  test 222222 only in Sent); `setReminder` now leaves such a thread in the inbox.
  **v0.4.3 (2026-11-26)**: in 0.4.1/0.4.2 the compose band sat under the floating formatting toolbar; moved below the
  Send row.
  **v0.4.4 (2026-11-26)**: compose band below Send confirmed by the operator. The Bcc self-copy sat in the inbox up to
  5 minutes (operator: Apple Mail shows nothing like it, flyby-mail uses no Bcc); the extension now asks for the scan right
  after Send (API `scan`), so it is archived within seconds. Operator measured ~20 s (search lag): **v0.4.5** reads the
  sent thread directly instead. Not yet seen in Gmail.
  **v0.4.6 (2026-11-26): the repo is public.** Fresh one-commit history; the old history (v0.1.0–v0.4.5, 70 commits) is in the
  private repo `flyby-archive` and in a git bundle outside the repo. Commits now use the GitHub no-reply address. Other
  clones of the old history must be re-cloned, not pulled.
  **v0.5.0/0.5.1 (2026-11-27): guided install instead of native installers** (operator agreed): KB §2, three files per release
  (`Code.gs`, `appsscript.json`, `flyby-extension.zip`), the extension takes URL + token on its Options page. Not yet tried by
  a fresh user end to end. **v0.5.2**: no competing product named anywhere in the docs (AGENTS.md clean-room rule), InboxSDK licence
  notice in the extension. **2026-11-27: history restarted again** (operator: "clean everything"): the GitHub repo is
  deleted and recreated with one commit and one release (v0.5.2); earlier public commits and releases v0.4.6–v0.5.1 are in the
  private `flyby-archive` (branch `public-2026-11-26`, tags). Every other clone must be deleted and cloned again. The operator's own Chrome needs the 0.5.0 build reloaded and the two values pasted once (they are
  in the local, gitignored `extension/config.local.js`, which can then be deleted).
  Next, if wanted: "ack only" replies ("Ok", "thanks") keep the reminder and the band says so (proposal 2026-11-26).

## Decisions so far

- **Build it ourselves on Google Apps Script.** No maintained open-source project
  covers this feature set; the closest pieces are small single-author
  scripts (see findings). Gmail's own *Nudges* and *Schedule send* / *Snooze* already
  cover parts of it natively and FlyBy will not duplicate them.
- **Per-user self-install, no Marketplace publishing** — avoids Google's
  restricted-scope verification / paid security assessment entirely.
- The VPS is optional add-on infrastructure, never a core dependency.
- **First target: the operator's personal consumer Gmail account** (90 min/day
  trigger quota, one-time "unverified app" click-through).
- **Two-part design** (see findings, "In-compose UI needs a browser extension"): Apps Script
  engine + own Chrome extension for the in-compose "Remind me" bar on desktop;
  contextual card / BCC path on phone.

## Roadmap (visual: `docs/grand-plan.html`)

- **P0 — Follow-up engine (built, in test)**: Gmail panel (web + phone), BCC codes,
  if-no-reply / regardless, log sheet. Engine = Apps Script, free on Google.
- **P1 — Inside Gmail's compose window (slices 1-2 built; slice 2 unverified)**: own Chrome extension with the in-compose
  "Remind me [in 2 days] [if no reply]" bar and a return-to-inbox thread button;
  auto-send follow-up; notes; recurring emails.
- **P2 — Extras on the VPS**: inbox hold (deliver new mail in batches), AI wording check. (Open/click tracking dropped 2026-11-18, see `findings.md`.)
- **P3 — Yahoo / AOL users**: universal IMAP engine on the VPS (app password).
  **Zero-touch "watch everything I send"**: every sent mail gets a default deadline
  (e.g. 3 working days); unanswered → a reminder email placed in their inbox with
  one-click links ("again in 2 days", "stop watching"). No BCC, no folders. Optional
  LLM filter to skip mails that don't expect an answer. May swap with P2.
- **P4 — maybe**: native Apple Mail extension (FlyBy button in Apple Mail compose,
  to choose a non-default deadline). Likely needs a paid Apple developer account to
  install cleanly on someone else's Mac — weigh against the zero-touch default.

## Next step

Early reply detection VERIFIED live 2026-11-16 20:33 (@9, build .f): Ben's reply on `Claude Team` ended the reminder (label `FlyBy/Replied`, `status` waiting=0). Earlier: v1 (@8) matched nothing (search `in:inbox` per-message quirk, see findings); fixed in @9 (2026-11-16 20:3x). Original text: built and deployed @8 (2026-11-16 20:19): Ben's reply on `Claude Team` should clear `FlyBy/Waiting` -> `FlyBy/Replied` within ~5 min; verify (panel count 0, label, log `replied-early`).

v0.3.0 tagged and released 2026-11-17. Verified live since: normal reply detection (within one 5-min tick), recurring email (18:48 for the 18:45 slot). Homepage shows the last check time (`.k`, @14, not yet seen). Left: phone panel test, then P2. Known limit: the side panel does not redraw after a change made in the extension pop-up window (separate systems; use the panel's own buttons). Deploy only with `scripts/deploy.sh` (KB §1).

Verified live 2026-11-16: web API (`prepare ping set get cancel note`, bad token, bad code); `.f<key>` tag; safe auto follow-up
(test 08); recurring email (sent 17:48 for the 17:45 slot; `Recurrr 01` is still active, delete it from the panel homepage);
bounce / auto-reply filter (test 4); trigger follows the latest deployed version (now Version 3).

Verified from the operator's screenshots + log (2026-11-16 ~18:35): restyled compose menu looks good; panel preset "1 hour" (`set`, source `card`, due 19:32:05) with the note saved and shown; recurring list label (Daily, address on the text line); `Recurrr 01` deleted (`recurring-deleted`); new `recurr 2` saved with first send Tue 17 Nov 18:45 (matches the time picked in local time, so the recurring picker time zone fix holds, assuming 18:45 was the pick).

**ROOT CAUSE FOUND (2026-11-16 ~19:00): the `tick` trigger was deleted by `setReminder -> ensureTrigger` from the panel (see findings); fixed and deployed @6. `install` was run from the editor at 18:55 (trigger recreated, `status` API shows triggers=1). New web API actions `status` and `ensure-trigger` (deployed @7) let agents check/repair without the editor. VERIFIED 19:02: first tick 18:58:51, heartbeat 18:59:17 (`status`: triggers=1), and `test for point 3` was picked up and returned (inbox + `FlyBy/No reply`, tag due 18:39 = the time chosen in the compose picker). Compose-sent exact-time mail is therefore verified.** Original symptom (2026-11-16 18:46): compose-sent mail `test for point 3` (sent 18:34, tag `u29914179` = 18:39) was NOT picked up: still in the inbox, no `set` in the log 12 min later (earlier mails were picked up in ~3 min). Last logged activity 18:35:50. Suspects: trigger stopped / not running after the @4 deploy at ~18:37, or the 90 min/day trigger runtime quota. Added `tick-ok` heartbeat / `tick-slow` / `tick-skipped` (deployed @5, 18:5x). Need the Apps Script **Executions** page (screenshot) and the next log rows.

Thread modal verified live 2026-11-17 (operator screenshots): opens from the three-dot menu, note saved ("Done"), "In 1 hour" set (`FlyBy/Waiting`, panel shows Returns 17:52 if nobody replies). Found and fixed (not yet re-tested): modal did not close after set, US date format, silent empty "Set reminder". Fixes verified live 2026-11-17 (auto-close, `Tue, 17 Nov 2026, 18:59` format, empty-date prompt); modal Cancel removed `FlyBy/Waiting` but left the thread archived, so cancel now also moves it back to the inbox (build `2026-11-17.g`, deployed @10, API `status` reports it). Homepage waiting list now has a per-row Cancel button (build `2026-11-17.h`, deployed @11). Homepage Cancel verified live (row removed, toast, thread back in the inbox with no `FlyBy/Waiting`, checked via Gmail). Modal Cancel verified live (Claude Team: `FlyBy/Waiting` empty, thread in the inbox); it now also auto-closes (extension rebuilt, needs reload + Gmail refresh). Still to verify: the new row layout (`.i`, @12). Fixed 2026-11-17 (`.j`, @13): setting a reminder clears the old outcome labels (`Replied`, `No reply`, ...); not yet seen live.

Still to test:
1. (done) compose-sent mail `test for point 3`.
2. Thread-toolbar button: first live click did nothing (menu item cannot host a dropdown); rewritten to open a modal (2026-11-16 19:2x), needs: reload the extension, refresh Gmail, open the three-dot menu > FlyBy: return to inbox, then note / In 1 hour / Cancel (I check via API `get`).
3. (done 2026-11-16 19:07) Panel "At a specific time" picker: set from the panel (`card:custom`), stored due 19:12:00 = panel display = time picked; time zone fix verified for the panel picker too. `onPreset` earlier failure was the trigger bug (fixed).
4. Phone panel.

Then: **P3 (people outside Gmail) lives in the sibling repo `flyby-mail`**: a notarized Mac app with an Apple Mail extension (Compose button + picker, plus ⌃⌘R on any selected mail) and a menu-bar engine that runs on the user's Mac through Mail scripting. Decided 2026-11-19: the engine stays on the Mac, not on the VPS, until the extension is mature. Current release v0.2.2 (2026-11-23); its STATUS.md and AGENTS.md are the source of truth. **Incident 2026-11-23**: a second Mac on the same Yahoo account replayed about 10 old reminders (empty local state); fixed in v0.2.2 (mails first seen after their due time are never returned, 3 reminders per tick at most, duplicate check across machines). Considered, not started: shared state on the VPS (SQLite behind a small HTTP endpoint with an atomic claim and a per-account lease), only worth it when two machines run the engine continuously. The older A/B/C framing in `docs/p3-non-gmail.html` (Bcc via Apps Script / IMAP on the VPS / Apple Mail extension as alternatives) is superseded. P2 now holds only the inbox hold and the AI wording check. The VPS was inspected read-only 2026-11-16 (6 containers, `edge` network, ufw on); nothing has been changed there.
