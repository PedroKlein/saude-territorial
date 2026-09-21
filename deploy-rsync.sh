#!/usr/bin/env bash
set -euo pipefail

REMOTE="${1:?Usage: $0 user@host:/path/to/app}"

EXCLUDES=(
  .git/
  node_modules/
  .next/
  out/
  .direnv/
  .pnpm-store/

  # Secrets / env
  .env
  .env.local
  ".env*.local"

  # Local dev state
  auth.db
  .auth-state.json

  # Build artifacts
  "*.tsbuildinfo"
  next-env.d.ts
  coverage/
  test-results/
  screenshots/

  # Agent/editor scratch
  .pi
  .pi-subagents
  .a5c
  .omp
  .gitnexus
  .review-screens
  .claude/
  .agents/

  # OS junk
  .DS_Store
  "*.pem"
)

EXCLUDE_ARGS=()
for pattern in "${EXCLUDES[@]}"; do
  EXCLUDE_ARGS+=(--exclude "$pattern")
done

MODE="--dry-run"
if [[ "${2:-}" == "-x" ]]; then
  MODE=""
fi

rsync --verbose --progress --recursive --delete $MODE "${EXCLUDE_ARGS[@]}" ./ "$REMOTE"

if [[ -n "$MODE" ]]; then
  echo ""
  echo "Dry run complete. Run with -x to execute:"
  echo "  $0 $REMOTE -x"
fi
