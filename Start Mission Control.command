#!/bin/bash
set -e

# Debug logging
exec > >(tee "$HOME/mission_control_startup.log") 2>&1
echo "Starting Mission Control Wrapper at $(date)"

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

# Detect shell
USER_SHELL="${SHELL:-/bin/zsh}"
SHELL_NAME=$(basename "$USER_SHELL")
echo "Detected shell: $USER_SHELL ($SHELL_NAME)"

if [ "$SHELL_NAME" = "zsh" ]; then
  PROFILE="$HOME/.zshrc"
elif [ "$SHELL_NAME" = "bash" ]; then
  PROFILE="$HOME/.bash_profile"
else
  echo "Unsupported shell: $SHELL_NAME"
  exit 1
fi

CMD="./start.sh --detach --open"

if [ -f "$PROFILE" ]; then
  echo "Sourcing $PROFILE and running command..."
  "$USER_SHELL" -ic "source \"$PROFILE\"; $CMD"
else
  echo "Profile $PROFILE not found, running directly..."
  $CMD
fi
