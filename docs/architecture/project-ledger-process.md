# Project Ledger Process

This repo uses a single project ledger at `PROJECT_LEDGER.md` as the authoritative change log for scope, architecture contracts, and material updates.
Workspace-level pointer also exists at `/Users/swayam/clawd/PROJECT_LEDGER.md`.

## Enforcement

- Pre-commit hook runs `scripts/check_ledger_guard.sh --staged`.
- Commits are blocked when code/config files change without a matching `PROJECT_LEDGER.md` update.
- CI also enforces this in GitHub Actions (`.github/workflows/ledger-guard.yml`).
- Install once per clone:
  - `npm run hooks:install`

## How to verify locally

- Run `npm run check:ledger` before commit.
- If it fails, the output lists files that require a ledger update.
- Pre-commit hook will block the commit until `PROJECT_LEDGER.md` is updated.

## Daily automated ledger task

- Gateway scheduler creates a daily task for `Dewey`:
  - title format: `Daily Project Ledger Update - YYYY-MM-DD`
  - default schedules: `15:00` and `21:00` `Europe/Amsterdam` (CET/CEST)
  - expected outputs:
    - `PROJECT_LEDGER.md` updated (if material changes)
    - `memory/MEMORY.md` curated updates (durable decisions/risks/runbooks)
    - daily summary note in workspace memory file
- Configurable via env:
  - `PROJECT_LEDGER_CRONS` (comma-separated cron expressions, preferred)
  - `PROJECT_LEDGER_CRON` (single cron expression, backward-compatible)
  - `PROJECT_LEDGER_TIMEZONE` (IANA timezone)
- Task description includes deterministic “Today Activity Summary” generated from Convex tasks/activity at scheduling time.
- Manual trigger for validation:
  - `npm run trigger:ledger:update`
- Check latest scheduled task status:
  - `npm run check:ledger:task`
- Check debug input/output logs for Dewey ledger runs:
  - `npm run check:ledger:debug`
- Archive ledger debug payloads to dedicated JSONL files:
  - `npm run archive:ledger:debug`
  - output defaults to `memory/ledger_debug_archive/YYYY-MM-DD.jsonl`
  - archive state cursor defaults to `memory/ledger_debug_archive/state.json`
- Distillation checklist template:
  - `memory/DISTILLATION_TEMPLATE.md`

## Destructive maintenance isolation

- Daily/source sync flows (`sync:sources`, import scripts) are non-destructive.
- Explicit destructive actions must run through dedicated maintenance commands only:
  - `npm run maint:destructive:rss:purge`
  - `npm run maint:destructive:links:ignore`
- Both commands are dry-run first and require explicit execution flags + confirmation tokens.

## Usage Rules

- Update `PROJECT_LEDGER.md` in the same change set as code/config behavior changes.
- Each entry should include:
  - date
  - files changed
  - reason
  - impact
  - rollback note

## Relation to memory files

- `PROJECT_LEDGER.md`: project source of truth and audit trail.
- `memory/*.md`: assistant/session continuity notes.
