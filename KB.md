# KB — FlyBy

Canonical reference: how FlyBy works, how to install it, every option.
Pitch: [`README.md`](README.md) · Current state: [`STATUS.md`](STATUS.md)

## 1. Components

| File | Role |
|---|---|
| `src/appsscript.json` | Manifest: Gmail add-on (homepage + contextual card), scopes, time zone. |
| `src/core.js` | Pure logic (codes, BCC tags, address normalisation, reply detection, recurring-date maths). Tested by `node test/core.test.js`. |
| `src/engine.js` | Reminder storage, the 5-minute `tick` trigger, BCC-tag scan, auto follow-up, notes, recurring mail, log sheet, `install()`. |
| `src/card.js` | Card Service UI: panel for a conversation, homepage with recurring emails. |
| `src/api.js` | Web app (`doGet`/`doPost`) the Chrome extension calls. See §8. |
| `extension/` | Chrome extension (InboxSDK): "Remind me" button in compose, "FlyBy" button in the thread toolbar. See §7. |

Deployed with **`scripts/deploy.sh`** (project id in `.clasp.json`, root `src/`; that file is local and gitignored, copy `.clasp.json.example` and put your own `scriptId` in it): it runs `clasp push` and then moves the versioned deployment to the new code. **A plain `clasp push` is not enough**: the time-driven `tick` trigger and the web app run the *deployed version* (Apps Script > Triggers shows "Deployment: Version N"), not HEAD, so they keep running old code until a new version is deployed (found 2026-11-16).

**Icon.** Orange plane, `assets/flyby-icon.svg` is the source. The add-on needs a public HTTPS URL, so `appsscript.json` and the extension use the repo's own `assets/flyby-icon-48.png` through `raw.githubusercontent.com` (since 2026-11-26; before, a Drive file shared by link, whose page shows the owner's name). It only resolves while the repo is public and the file stays on `main`.

> **Trigger rule:** only `install()` creates/replaces the `tick` trigger. Never do it from the add-on or web app: that path can delete it and fail to recreate it, silently stopping every reminder (2026-11-16). If reminders stop, call the web API `status` (trigger count must be 1) and `ensure-trigger`, or run `install` from the editor.

## 2. Install (once per Google account)

About 15 minutes, the same on Mac and Windows, nothing to install on the computer except Chrome. Every user runs their own
copy under their own Google account; nobody else's server sees the mail. The steps that need clicks are Google's and Chrome's
own (consent screens, "Load unpacked"); no installer can do them for you.

Download the three files from the latest [GitHub Release](https://github.com/Marcus1571/flyby/releases/latest):
`Code.gs`, `appsscript.json`, `flyby-extension.zip`. Unzip `flyby-extension.zip` into a folder you keep (Chrome loads the
extension from there; deleting the folder removes it).

**A. Your own copy of the engine (Apps Script)**

1. Open [script.google.com](https://script.google.com) with the Gmail account FlyBy should watch → **New project**. Rename
   it "FlyBy" (click "Untitled project").
2. **Project Settings** (gear, left) → tick **Show "appsscript.json" manifest file in editor**, and set **Time zone** to yours
   (BCC codes such as `tm` = tomorrow 08:00 use it, §5).
3. **Editor** (`< >`, left) → open `appsscript.json`, replace everything with the downloaded `appsscript.json`, then set
   `"timeZone"` back to yours if it changed (e.g. `"America/New_York"`). Open `Code.gs`, replace everything with the
   downloaded `Code.gs`. Save (⌘S / Ctrl+S).
4. In the toolbar pick the function **`install`** → **Run** → **Review permissions** → your account. Google warns "Google
   hasn't verified this app": **Advanced → Go to FlyBy (unsafe)** → **Allow**. It is your own script, so this warning is
   expected. This creates the `FlyBy/…` labels, the 5-minute check and the **FlyBy log** sheet in your Drive.
5. Pick **`setupApi`** → **Run**. The **Execution log** shows `FlyBy API token (…): <64 characters>`. Keep this tab open.
6. **Deploy → New deployment** → gear → **Web app**. Execute as **Me**, Who has access **Anyone** → **Deploy** →
   **Authorize** if asked (same warning as step 4) → copy the **Web app URL** (ends in `/exec`).
   "Anyone" only makes the address reachable; every call needs your token (§8).
7. **Deploy → Test deployments** → **Install** (Gmail add-on). Reload Gmail: the FlyBy panel is in the right sidebar on the
   web and under each message in the Gmail phone app. BCC codes (§3b) work from here on, from any device.

**B. The Chrome extension** (Remind me button, coloured band; Gmail on the web in Chrome or another Chromium browser)

8. Open `chrome://extensions` → switch on **Developer mode** (top right) → **Load unpacked** → choose the unzipped folder.
9. The **FlyBy settings** page opens by itself (later: the extension's **Details → Extension options**). Paste the web app
   URL (step 6) and the token (step 5) → **Save and test** must say "FlyBy is connected". Reload Gmail.

Chrome may show "Disable developer mode extensions" at startup: choose to keep it. That is the cost of not paying for a Web
Store listing.

**Updating** to a newer release: replace `Code.gs` (and `appsscript.json` if the release notes say so, keeping your time
zone), save, then **Deploy → Manage deployments** → pencil → Version **New version** → **Deploy** (the web app keeps its URL
and token; it keeps running the old code until you do this, §1). Unzip the new `flyby-extension.zip` over the same folder
and press reload on its card in `chrome://extensions`. Settings are kept.

**Developers** with Node and clasp: `.clasp.json` from `.clasp.json.example` with your own `scriptId`, then
`scripts/deploy.sh` (§1); the extension is built with `cd extension && npm install && npm run build` (§7).
`scripts/release-assets.sh` builds the three release files into `release/` (gitignored).

## 3. Setting a reminder

**a) From the FlyBy panel** — open any conversation (Gmail web right sidebar, or the
FlyBy icon at the bottom of a message in the Gmail phone app):
- "only if nobody replies" checkbox (default on) — off = return **regardless**.
- Presets: 1 h, 2 h, 4 h, tomorrow morning (08:00), tomorrow afternoon (13:00),
  2 days, 4 days, 1 week, 2 weeks, 1 month (day-based presets land at 08:00).
- "At a specific time" date-time picker → Confirm.
- **Follow-up text** (optional, only with "if nobody replies"): if nobody replied by the due time, FlyBy
  also sends this text as a reply on the thread (see §4). Applies to the preset or time you pick next.
- When scheduled: shows the return time ("then sends your follow-up" if set) and a **Cancel reminder** button.
- **Note (private)**: one free-text note per conversation (max 2000 chars), saved with *Save note*, shown in the panel.

**b) BCC code, from any device or mail app** — add `yourname+<code>@gmail.com` to
Bcc (To/Cc also work) when sending. The full tag is `<code>[.r][.f<key>]`: no suffix = "if nobody
replies"; `.r` = return **regardless**; `.f<key>` = a follow-up text stored under `<key>` (the Chrome
extension creates it, §7/§8). Example: `yourname+2d.r@gmail.com`.

| Code | Returns |
|---|---|
| `1h` `2h` `3h` `4h` `6h` `8h` `12h` | that many hours after sending |
| `tm` / `ta` | tomorrow 08:00 / 13:00 |
| `1d`…`7d`, `10d`, `14d` | that many days later, 08:00 |
| `1w`…`4w` | weeks later, 08:00 |
| `1mo` `2mo` `3mo` | 30/60/90 days later, 08:00 |

Also accepted: any `<n>h|d|w|mo` and `u<minutes since epoch>` (exact time, set by the Chrome
extension). The scan reads all sent mail since the last scan (30 min overlap) and looks for a tag in To/Cc/Bcc.
An invalid suffix makes the whole address "not a code" (ignored).
Picked up within ~5 minutes of sending. The BCC copy to yourself lands in the inbox first
(Gmail keeps it for `+tag` addresses); the engine archives the thread when it picks it up. Sent from Gmail web with the
extension (since 0.4.4), the extension calls the API `scan` with the thread id 1 s after Send (retries after 4 s and 15 s if
no reminder exists yet); the server reads that thread directly (`scanThread`, no search), so the copy leaves the inbox within
seconds. `GmailApp.search` needed ~15 s to see a just-sent mail (0.4.4 measured ~20 s end to end, 2026-11-26). From other apps and devices the 5-minute tick still does it.
(Apple Mail with flyby-mail uses no Bcc at all: its engine on the Mac watches Sent, so no copy exists there.)

## 4. What happens

- Setting a reminder **archives** the conversation and labels it `FlyBy/Waiting`, except when a real reply is already in
  (a reply that arrived before the 5-minute Bcc scan): then it stays in the inbox, log event `kept-in-inbox` (since 0.4.2).
  A reply from someone still lands in your inbox normally. **Cancel reminder** removes the label and moves the conversation back to the inbox (only when a reminder was stored; cancelling a thread with none leaves it where it is).
- **A real reply ends an "if no reply" reminder at once** (checked every 5 min, not only at the due time): each tick looks at the `FlyBy/Waiting` threads that have a message newer than your last one, and if a person (not an out-of-office or
  bounce) wrote after your last message, the reminder is deleted, the label becomes `FlyBy/Replied` and the log gets `replied-early`.
  "Regardless" reminders are never ended early.
- At the due time (checked every 5 min):
  - "if no reply" and someone other than you wrote after **your last message** →
    nothing returns; label becomes `FlyBy/Replied`; logged as `replied`.
  - otherwise → moved back to inbox, marked unread, labelled `FlyBy/No reply`
    (or `FlyBy/Returned` for "regardless").
- **Auto follow-up** (only if a follow-up text was set and nobody replied): right after the thread returns,
  FlyBy sends a threaded reply with that text to the people in To/Cc of your **last message** (never to you,
  no one else). Gmail's `reply()` on your own message goes back to you, so FlyBy builds a draft, overwrites the
  recipients, checks them, and only then sends; on any mismatch nothing is sent and the draft is deleted.
  Success adds label `FlyBy/Followed up`. If only you are in To/Cc, it is skipped (`followup-skipped`).
  Needs scope `gmail.send`.
- **Cancel from the homepage**: every row of the "Waiting on N conversation(s)" list has a *Cancel* button (same effect as cancelling inside the thread: label removed, thread back in the inbox).
- **Recurring emails**: panel homepage → *New recurring email* (one address, subject, message, every
  day/week/month, first send time). Sent by the tick from your account via `GmailApp.sendEmail`; if the
  script was paused, missed runs are skipped, not sent in a burst. Delete from the homepage list.
  Month steps clamp to the month end; times are UTC arithmetic, so the local hour can shift by 1 h across
  a daylight-saving change.
- Reply detection counts any non-draft message from an address that isn't yours
  (your account address + Gmail aliases, ignoring `+tags` and dots). Automatic mail
  does **not** count: a message is ignored if it has `Auto-Submitted` (anything but `no`), `Precedence: bulk|junk|auto_reply`,
  `X-Autoreply`/`X-Autorespond`, or comes from `mailer-daemon@`/`postmaster@`. The `returned` log row then says
  `(ignored N automatic message(s))`. Limits: an auto-reply that sets none of these headers still counts; headers
  are read when a reminder is due and by the 5-minute early-reply check (`processEarlyReplies`). A short human
  reply such as "Ok" counts as a reply and ends the reminder (no content check).

## 5. Storage, log, time zone

- UserProperties keys (500 KB store, 9 KB per value):
  - `t:<threadId>` → `{due, noreply, anchor, subject, set, source, followUp?}` (a reminder).
  - `fu:<key>` → `{text, at}`: follow-up text waiting for its sent mail; consumed when the BCC tag is
    picked up, dropped after 7 days if never used.
  - `n:<threadId>` → the private note.
  - `rec:<id>` → `{to, subject, body, every, next}` (a recurring email).
  - `apiToken` → secret for the web API (§8). `doneMsgs` → last 200 handled message ids.
- Log: spreadsheet "FlyBy log" — one row per event, with subject, due, mode, source (`card`, `card:custom`,
  `bcc:<tag>`, `api:<code>`, `recurring`). Events: `install set cancel replied returned gone` and
  `replied-early tick-ok tick-slow tick-skipped tick-error due-failed due-gave-up followup followup-skipped followup-failed followup-missing recurring-set recurring-sent
  recurring-failed recurring-deleted api-denied api-error`. Failures carry the step that failed.
- Time zone: the panel uses your Gmail time zone; BCC codes use the manifest
  `timeZone` (Project Settings → Time zone; the repo ships `Europe/Vienna`) — change it there when you move.

## 6. Quotas (consumer Gmail)

The trigger does one Gmail search per run plus a few calls per *due* reminder —
far below 90 min/day runtime and 20,000 Gmail ops/day. Follow-ups and recurring mails count against the
100 recipients/day send quota of a consumer account.

## 7. Chrome extension

`extension/` (InboxSDK, MV3, version 0.5.3) adds two buttons and a coloured status band to Gmail on the web:

- **Remind me** in the compose window: dropdown with the presets, a native date-time picker, an
  "only if nobody replies" checkbox, an optional follow-up text, and *Clear reminder*. Choosing one puts
  the matching tag address into Bcc (replacing any earlier FlyBy address; the chip is the confirmation).
  If a follow-up text was typed, the extension first stores it through the web API (`prepare`) under a
  random key that travels in the tag (`.f<key>`); if saving fails, no address is added.
- **FlyBy: return to inbox** in the thread toolbar (more-actions section): for a mail you already sent. Same
  menu plus a private note, *Save note*, *Cancel reminder*, and it shows the current reminder. Talks to the
  web API directly (`set`, `note`, `cancel`, `get`).
- **FlyBy band** (since 0.4.0): a coloured strip with the FlyBy state, drawn by the extension, never part of the mail.
  - In the compose window, below the Send row (InboxSDK `addStatusBar`, height 52, border-box, padding `0 16px 8px`), as soon
    as a reminder is chosen or when a draft with a FlyBy Bcc address is reopened: amber, "back in your inbox in 2 days if
    nobody replies" (or "comes back … " for regardless). Not `addComposeNotice`: that one does not shrink the compose body,
    so in a tall compose window it pushed Send below the screen (seen 2026-11-26); the status bar sets InboxSDK's
    `--inboxsdk-total-added-statusbar-height` and the body shrinks to fit. Not `addAboveNativeStatusBar` either: the
    floating formatting toolbar sits over that spot and covered the band (seen 2026-11-26, 0.4.1). Long text is cut with "…" (full text on hover).
  - Above the messages of any opened thread, Inbox or Sent (InboxSDK `ThreadView.addNoticeBar`), from the API `get`:
    amber = waiting (with the due time); blue = sent with a tag the 5-minute scan has not picked up yet, or returned as
    scheduled; green = `FlyBy/Replied` (a reply ended the reminder), or `replied` from `get` while a round is still open
    (reply already in, the next tick closes it: "closes at the next check"); red = `FlyBy/No reply` / `FlyBy/Followed up`.
    No FlyBy state = no band. A failed `get` (not set up, wrong token, web app unreachable) shows a red band with the error
    (since 0.5.3; before, it showed nothing, which looked like "no reminder"). Redrawn after set/cancel in the toolbar window. Logic in `src/code.js` `threadBand`
    (tested), look in `src/menu.js` `band`.
  - One web-app call per opened thread (about 1-2 s before the band appears).

Files: `src/content.js` (Gmail UI), `src/menu.js` (shared menu), `src/code.js` (pure helpers, tested),
`src/api.js` (message to the worker), `src/background.js` (service worker: holds the token, calls the web
app with the URL + token from storage), `options.html`/`options.js` (settings page), `config.js` (InboxSDK app ID).

Settings (since 0.5.0): the web app URL and token are entered on the extension's Options page (`options.html` +
`options.js`, opens by itself on install and on every update or reload while URL or token is missing, since 0.5.3: reloading an unpacked build counts as an update) and kept in `chrome.storage.local`; `background.js` reads them for every
call. Before 0.5.0 they were bundled into the build from `config.local.js`, so a built extension carried its owner's token;
now one build serves everyone and is attached to each release (§2). The page checks the URL shape
(`https://script.google.com/…/s/<id>/exec`, Workspace `/a/macros/<domain>/` too) and a 64-character hex token, saves, then
sends `ping` through the worker.

Install for users: §2. Build from source: `cd extension && npm install && npm run build`, then **Load unpacked** →
`extension/dist`; rebuild and reload after changes. The build step exists because MV3 cannot load remote code, so InboxSDK
is bundled with esbuild; the build also copies `LICENSE` and `THIRD-PARTY-NOTICES.txt` (InboxSDK's MIT licence, which a
bundled copy must carry) into `dist/`. `config.js` holds the shared InboxSDK app ID (free, registered once at register.inboxsdk.com, not a
secret; a fork may register its own).
Host permissions: `mail.google.com`, `script.google.com`, `script.googleusercontent.com` (the web app
answers through a redirect to the latter).

## 8. Web API (`src/api.js`)

The extension (and later the VPS) talk to the engine over HTTPS: `POST` JSON `{token, action, ...}` to the
web app URL, `Content-Type: text/plain` (avoids a CORS preflight). Replies `{ok, ...}` or `{ok:false, error}`.

| action | fields | does |
|---|---|---|
| `ping` | | `{ok:true}` |
| `prepare` | `key` (6-12 a-z0-9), `text` | stores a follow-up text under `fu:<key>` for a mail still being written |
| `set` | `threadId`, `code`, `noreply` (default true), `followUp?`, `note?` | sets a reminder on an existing thread; returns `due` |
| `cancel` | `threadId` | cancels the reminder |
| `note` | `threadId`, `text` | saves (or clears, if empty) the note |
| `get` | `threadId` | `{reminder, note, labels, pending, replied}`: `labels` = the thread's `FlyBy/*` labels; `pending` = a FlyBy Bcc tag on a sent message that the scan has not processed yet (`''` if none); `replied` = a real (non-automatic) reply newer than the reminder's anchor, or newer than the pending tagged message, is already there and the next tick has not closed the round yet (always false for "regardless") |
| `scan` | `threadId` (optional) | under the `tick` lock: with a known thread, checks only that thread (`scanThread`, `lastScan` untouched), else runs the full Bcc scan; `{reminder}` of that thread afterwards, or `{busy: true}` if a tick held the lock for 10 s (it does the same scan) |
| `status` | | `{build, triggers, lastScan, lastBeat, waiting, recurring}`: is the `tick` trigger there and when did it last run |
| `ensure-trigger` | | creates the `tick` trigger only if none exists (never deletes); logs `ensure-trigger` |

Setup (once): §2 steps 5-6 and 9 (token from `setupApi`, web app deployment, both pasted into the extension's Options).
After code changes, update the *same* deployment (Manage deployments → edit → new version, or `scripts/deploy.sh`), or the
URL keeps serving old code (§1).

Security: "Anyone" means the URL is reachable by anyone; the only key is the 64-character random token
(compared in constant time; wrong tokens are logged as `api-denied`). Treat token and URL as secrets; the token sits in the
extension's `chrome.storage.local` (this Chrome profile only). To rotate: delete the `apiToken` script property, run
`setupApi` again, paste the new token on the Options page.
