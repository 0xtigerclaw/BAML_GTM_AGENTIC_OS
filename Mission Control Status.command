#!/bin/bash
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

# Detect shell
USER_SHELL="${SHELL:-/bin/zsh}"
SHELL_NAME=$(basename "$USER_SHELL")

if [ "$SHELL_NAME" = "zsh" ]; then
  PROFILE="$HOME/.zshrc"
elif [ "$SHELL_NAME" = "bash" ]; then
  PROFILE="$HOME/.bash_profile"
else
  PROFILE=""
fi

CMD="./start.sh status"

if [ -n "$PROFILE" ] && [ -f "$PROFILE" ]; then
  "$USER_SHELL" -ic "source \"$PROFILE\"; $CMD"
else
  $CMD
fi

echo
read -p "Press Enter to close..."
