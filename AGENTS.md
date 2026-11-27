# AGENTS.md — FlyBy

> **Read first, every session:** load `GOVERNANCE.md` and `USER.md` from the operator's
> private `governance` GitHub repo (see `GOVERNANCE.md` → "The two fixed, universal
> files" for how). They hold the operator's cross-project defaults. **This file wins
> when the two disagree on a FlyBy-specific fact**; cross-cutting principles (secrets
> handling, destructive-action caution, LT heads-up rule, etc.) still apply regardless.

## What this project is

FlyBy is a personal, zero-cost Gmail follow-up tool — first and foremost **"bring this
thread back if nobody replies"** — built by the operator with AI agents.

**Clean room, always (operator, 2026-11-27).** FlyBy is our own design built on Gmail's and
Google's public APIs. Commercial email tools may be studied only as users see them; never copy
their code, text, icons, screenshots, UI layout or other assets, never decompile or
reverse-engineer them. Never name competing commercial products or their makers in this repo
(README, docs, code, comments, commit messages, release notes), and never present FlyBy as a
copy, clone or alternative of one: describe the idea, not whose it is. Feature names are ours
too, not borrowed brand names. Naming the platforms and libraries FlyBy builds on (Gmail,
Google, Apple Mail, InboxSDK and its maker) and crediting open-source code is fine and required.

## Architecture (settled direction, 2026-11-06)

- **Core = one Google Apps Script project** running under the user's own Google
  account: a Gmail *Workspace add-on* (Card Service UI) plus time-driven triggers
  that do the actual checking. No server, no cost, no Google verification needed for
  personal use. Each user runs **their own copy** in their own account — never a
  shared multi-user deployment (that would trigger restricted-scope verification).
- **An optional VPS is the only backend** (moved from the home server, 2026-11-15), only for things Apps Script can't do:
  an IMAP engine for non-Gmail mailboxes (Yahoo/AOL), LLM-backed writing help. No open/click
  tracking (dropped 2026-11-18, see `findings.md`). Nothing in the core may depend on it.
  Isolated container, behind Cloudflare; any stored app passwords encrypted at rest.
- State lives in Gmail itself where possible (labels), plus `PropertiesService`
  for per-thread metadata. Gmail labels are the user-visible source of truth.

## Conventions

- Source: Apps Script (JavaScript), managed locally with `clasp`; `appsscript.json`
  manifest committed. No build step for `src/`; `extension/` has one (`npm run build`, esbuild),
  because MV3 cannot load InboxSDK remotely.
- Deploy with `scripts/deploy.sh`, never a bare `clasp push`: the time trigger and the web app run the deployed *version*, not HEAD (KB §1).
- Labels are namespaced under `FlyBy/` (e.g. `FlyBy/Waiting`, `FlyBy/No reply`).
- Every automatic action must be reversible and traceable to a label the user can see.
- Respect consumer Gmail quotas (see `findings.md` 2026-11-06): trigger interval
  5 min by default (operator's choice, 288 runs/day is well inside the 90 min/day
  runtime quota), never 1 min.
- Logging: rich, per `USER.md` — every trigger run records what it checked, what it
  changed and why, in a durable sheet/log, not just `console.log`.
- No real hostnames/IPs/emails in repo files (this repo follows the standard
  genericness rule).
