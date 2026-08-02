#!/usr/bin/env bash
# Install git hooks into the repo (idempotent).
# - Generates the pre-commit framework hook (detect-secrets) into `.githooks/`
# - Points core.hooksPath at the versioned `.githooks/` directory
# - Enables the Conventional Commits prepare-commit-msg validator
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

chmod +x .githooks/prepare-commit-msg

# Locate pre-commit (global or project venv).
PRE_COMMIT=""
if command -v pre-commit >/dev/null 2>&1; then
  PRE_COMMIT="pre-commit"
elif [[ -x ".venv/bin/pre-commit" ]]; then
  PRE_COMMIT=".venv/bin/pre-commit"
fi

if [[ -n "$PRE_COMMIT" ]]; then
  # pre-commit refuses to install while core.hooksPath is set, so generate its
  # hook first (into .git/hooks), then copy it into our versioned hooks dir.
  if git config --get core.hooksPath >/dev/null 2>&1; then
    git config --unset-all core.hooksPath
  fi
  "$PRE_COMMIT" install --hook-type pre-commit >/dev/null
  cp .git/hooks/pre-commit .githooks/pre-commit
  chmod +x .githooks/pre-commit
else
  echo "pre-commit not found; skipping detect-secrets hook." >&2
fi

git config core.hooksPath .githooks
echo "Hooks active: $(git config core.hooksPath)"
