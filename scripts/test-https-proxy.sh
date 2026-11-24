#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRATCH="$(mktemp -d)"
CONTAINER=""

cleanup() {
  if [[ -n "$CONTAINER" ]]; then
    docker rm -f "$CONTAINER" >/dev/null
  fi
  rm -rf -- "$SCRATCH"
}
trap cleanup EXIT

umask 077
openssl req -x509 -newkey rsa:2048 -noenc -days 2 \
  -keyout "$SCRATCH/test.key" -out "$SCRATCH/test.crt" \
  -subj /CN=app.example.org -addext subjectAltName=DNS:app.example.org \
  2>/dev/null

cat > "$SCRATCH/upstream.conf" <<'NGINX'
server {
    listen 3000;
    access_log off;
    error_log /dev/null;
    location / {
        return 200 "$http_host|$http_x_forwarded_proto|$http_x_forwarded_for";
    }
}
NGINX

CONTAINER="$(docker run -d --network none --add-host app:127.0.0.1 \
  -e HTTPS_HOST=app.example.org -e 'NGINX_ENVSUBST_FILTER=^HTTPS_HOST$' \
  -v "$ROOT/deploy/nginx/default.conf.template:/etc/nginx/templates/default.conf.template:ro" \
  -v "$SCRATCH/test.crt:/etc/nginx/tls/fullchain.crt:ro" \
  -v "$SCRATCH/test.key:/etc/nginx/tls/private.key:ro" \
  -v "$SCRATCH/upstream.conf:/etc/nginx/conf.d/upstream.conf:ro" \
  nginx:1.28-alpine)"

for ATTEMPT in 1 2 3 4 5; do
  if docker exec "$CONTAINER" test -s /var/run/nginx.pid; then
    break
  fi
  if [[ "$ATTEMPT" == 5 ]]; then
    echo "Nginx não iniciou no prazo de 5 segundos." >&2
    exit 1
  fi
  printf '%s Aguardando inicialização do Nginx...\n' "$(date -u +%FT%TZ)"
  sleep 1
done

docker exec "$CONTAINER" nginx -t
PID="$(docker inspect "$CONTAINER" --format '{{.State.Pid}}')"
CURL=(nsenter -t "$PID" -n -- curl --noproxy '*' --connect-timeout 3 --max-time 10
  --silent --show-error --cacert "$SCRATCH/test.crt"
  --resolve app.example.org:443:127.0.0.1)

BODY="$("${CURL[@]}" --fail -H 'X-Forwarded-Proto: http' \
  -H 'X-Forwarded-For: 203.0.113.99' \
  'https://app.example.org/?fixture=synthetic-sensitive-marker')"
[[ "$BODY" == 'app.example.org|https|127.0.0.1' ]]
echo "PASS: TLS sintético verificado; hostname, protocolo e IP encaminhados corretamente."

STATUS="$("${CURL[@]}" -H 'Host: other.example.org' \
  -o /dev/null -w '%{http_code}' https://app.example.org/)"
[[ "$STATUS" == 421 ]]
echo "PASS: hostname inesperado rejeitado com HTTP 421."

LOGS="$(docker logs "$CONTAINER" 2>&1)"
if grep -Fq synthetic-sensitive-marker <<< "$LOGS"; then
  echo "FAIL: URL de teste registrada nos logs do proxy." >&2
  exit 1
fi
grep -Eq 'status=200 duration=' <<< "$LOGS"
grep -Eq 'status=421 duration=' <<< "$LOGS"
echo "PASS: logs registram status e duração, sem a URL de teste."

[[ "$(docker inspect "$CONTAINER" --format '{{.HostConfig.NetworkMode}}')" == none ]]
[[ "$(docker inspect "$CONTAINER" --format '{{json .HostConfig.PortBindings}}')" == '{}' ]]
echo "PASS: teste sem rede e sem portas publicadas; recursos temporários removidos ao sair."
