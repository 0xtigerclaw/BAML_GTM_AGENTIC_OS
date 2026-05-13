#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

GIT_TOP="$(git rev-parse --show-toplevel)"
HOOKS_DIR="$GIT_TOP/.githooks"
mkdir -p "$HOOKS_DIR"
chmod +x scripts/check_ledger_guard.sh

cat > "$HOOKS_DIR/pre-commit" <<EOF
#!/usr/bin/env bash
set -euo pipefail

bash "$GIT_TOP/mission-control/scripts/check_ledger_guard.sh" --staged
EOF

chmod +x "$HOOKS_DIR/pre-commit"
git config core.hooksPath "$HOOKS_DIR"

echo "✅ Git hooks installed (core.hooksPath=$HOOKS_DIR)"
