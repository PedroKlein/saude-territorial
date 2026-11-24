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
  https)
    if [[ $# -gt 2 || ( $# -eq 2 && "$2" != "--check" ) ]]; then
      echo "Usage: $0 https [--check]" >&2
      exit 1
    fi

    export HTTPS_HOST="${HTTPS_HOST:-saudeterritorial.ufrgs.br}"
    export BETTER_AUTH_URL="https://$HTTPS_HOST"
    export TLS_CERT_DIR="${TLS_CERT_DIR:-/etc/ssl/saude-territorial}"
    CHAIN="$TLS_CERT_DIR/$HTTPS_HOST.fullchain.crt"
    KEY="$TLS_CERT_DIR/$HTTPS_HOST.key"

    openssl verify -purpose sslserver -verify_hostname "$HTTPS_HOST" \
      -untrusted "$CHAIN" "$CHAIN"
    CERT_PUBLIC_KEY="$(openssl x509 -in "$CHAIN" -pubkey -noout | openssl dgst -sha256)"
    KEY_PUBLIC_KEY="$(openssl pkey -in "$KEY" -pubout | openssl dgst -sha256)"
    if [[ "$CERT_PUBLIC_KEY" != "$KEY_PUBLIC_KEY" ]]; then
      echo "O certificado e a chave privada não correspondem." >&2
      exit 1
    fi

    COMPOSE=(docker compose -f docker-compose.prod.yml -f docker-compose.https.yml)
    "${COMPOSE[@]}" config --quiet
    "${COMPOSE[@]}" run --rm --no-deps -T proxy nginx -t </dev/null

    if [[ "${2:-}" == "--check" ]]; then
      exit 0
    fi
    "${COMPOSE[@]}" up -d --no-deps --no-build --force-recreate app proxy
    ;;
  *)
    echo "Usage: $0 [dev|prod|https [--check]]" >&2
    exit 1
    ;;
esac
