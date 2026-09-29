#!/usr/bin/env bash
set -euo pipefail

ENV="${1:-dev}"

case "$ENV" in
  dev)
    docker compose -f docker-compose.dev.yml up
    ;;
  prod)
    docker compose -f docker-compose.prod.yml up --build -d
    ;;
  *)
    echo "Usage: $0 [dev|prod]" >&2
    exit 1
    ;;
esac
