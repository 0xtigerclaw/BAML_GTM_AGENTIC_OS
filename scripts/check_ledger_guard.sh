#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

LEDGER_FILE="PROJECT_LEDGER.md"

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  exit 0
fi

TRACKED_CHANGED_FILES=""
UNTRACKED_CHANGED_FILES=""

if [[ "${1:-}" == "--staged" ]]; then
  TRACKED_CHANGED_FILES="$(git diff --cached --name-only)"
elif [[ "${1:-}" == "--range" ]]; then
  if [[ -z "${2:-}" ]]; then
    echo "Usage: $0 --range <git-diff-range>" >&2
    exit 2
  fi
  TRACKED_CHANGED_FILES="$(git diff --name-only "$2")"
else
  TRACKED_CHANGED_FILES="$(git diff --name-only)"
  # Include untracked files for local guard runs.
  UNTRACKED_CHANGED_FILES="$(git ls-files --others --exclude-standard)"
fi

CHANGED_FILES="$(
  printf '%s\n%s\n' "$TRACKED_CHANGED_FILES" "$UNTRACKED_CHANGED_FILES" \
    | sed '/^$/d' \
    | sort -u
)"

if [[ -z "$CHANGED_FILES" ]]; then
  exit 0
fi

GIT_TOP="$(git rev-parse --show-toplevel)"
PROJECT_PREFIX="${ROOT_DIR#"$GIT_TOP"/}"
if [[ "$PROJECT_PREFIX" == "$ROOT_DIR" ]]; then
  PROJECT_PREFIX="."
fi
NORMALIZED_FILES="$(
  while IFS= read -r file; do
    if [[ "$file" == "$PROJECT_PREFIX/"* ]]; then
      echo "${file#"$PROJECT_PREFIX/"}"
    elif [[ "$file" != */* ]]; then
      echo "$file"
    fi
  done <<< "$CHANGED_FILES"
)"

if [[ -z "$NORMALIZED_FILES" ]]; then
  exit 0
fi

TRACKED_NORMALIZED_FILES="$(
  while IFS= read -r file; do
    if [[ "$file" == "$PROJECT_PREFIX/"* ]]; then
      echo "${file#"$PROJECT_PREFIX/"}"
    elif [[ "$file" != */* ]]; then
      echo "$file"
    fi
  done <<< "$TRACKED_CHANGED_FILES"
)"

RELEVANT_FILES="$(printf '%s\n' "$NORMALIZED_FILES" | rg -v '^(\.DS_Store|PROJECT_LEDGER\.md|memory/|docs/|\.next/|node_modules/|public/generated/|.*\.log$|.*\.pid$|.*\.tsbuildinfo$|\.run/)' || true)"

if [[ -z "$RELEVANT_FILES" ]]; then
  exit 0
fi

if printf '%s\n' "$TRACKED_NORMALIZED_FILES" | rg -q "^${LEDGER_FILE}$"; then
  exit 0
fi

echo "❌ Ledger guard: project files changed but ${LEDGER_FILE} was not updated."
echo
echo "Changed files requiring ledger update:"
printf '%s\n' "$RELEVANT_FILES" | sed 's/^/  - /'
echo
echo "Update ${LEDGER_FILE} with scope/changes/impact before committing."
exit 1
