# Publicar a aplicação com HTTPS

Este guia adiciona HTTPS a uma instalação que já executa `docker-compose.prod.yml`. O arquivo `docker-compose.https.yml` coloca um proxy Nginx na porta 443 na frente da aplicação e deixa de publicar a porta 3000. Banco, Nominatim e volumes de backup não são alterados.

## Pré-requisitos

- Instalação existente com `docker-compose.prod.yml` e o arquivo `.env` de produção (com `BETTER_AUTH_SECRET`).
- Docker Compose 2.24 ou superior (suporte a `!reset`) e OpenSSL 3 ou superior no servidor.
- Registro DNS do hostname público apontando para o servidor, sem registro AAAA para outro destino.
- Política de rede definida para a porta 443. Se o acesso deve ser restrito (por exemplo, apenas pela VPN), essa restrição precisa existir antes da ativação. Portas publicadas pelo Docker passam pelas regras de encaminhamento (`FORWARD`/`DOCKER-USER`), não pela cadeia `INPUT`; a restrição de outras portas, como a do SSH, não comprova a da 443.
- Certificado emitido para o hostname, cadeia intermediária e a chave privada correspondente, mantida somente no servidor.

## Variáveis usadas neste guia

| Variável | Padrão em `docker-run.sh` | Uso |
|---|---|---|
| `HTTPS_HOST` | `saudeterritorial.ufrgs.br` | Hostname público e nome dos arquivos do certificado |
| `TLS_CERT_DIR` | `/etc/ssl/saude-territorial` | Diretório da chave e da cadeia |
| `APP_DIR` | — | Diretório da instalação, onde estão os arquivos Compose |

O proxy espera dois arquivos:

- `$TLS_CERT_DIR/$HTTPS_HOST.key` — chave privada, `root:root`, modo `600`, em diretório com modo `700`.
- `$TLS_CERT_DIR/$HTTPS_HOST.fullchain.crt` — certificado do site seguido das intermediárias, modo `644`.

Os comandos a seguir rodam no servidor, em um shell administrativo:

```bash
sudo -i
export HTTPS_HOST=saudeterritorial.ufrgs.br
export TLS_CERT_DIR=/etc/ssl/saude-territorial
export APP_DIR=/caminho/da/instalacao
export BETTER_AUTH_URL="https://$HTTPS_HOST"
cd "$APP_DIR"
```

Passe valores diferentes pelo ambiente, não apenas pelo `.env`: o `docker-run.sh` lê `HTTPS_HOST` e `TLS_CERT_DIR` do ambiente e define `BETTER_AUTH_URL` a partir do hostname.

## 1. Gerar a chave e o pedido de certificado

Na primeira emissão, gere a chave no servidor e envie à autoridade certificadora **somente o CSR**:

```bash
install -d -o root -g root -m 700 "$TLS_CERT_DIR"
(umask 077 && openssl req -new -newkey rsa:2048 -noenc \
  -keyout "$TLS_CERT_DIR/$HTTPS_HOST.key" \
  -out "$TLS_CERT_DIR/$HTTPS_HOST.csr" \
  -subj "/CN=$HTTPS_HOST" \
  -addext "subjectAltName=DNS:$HTTPS_HOST")
```

Não gere a chave em outra máquina nem copie a chave para fora do servidor.

## 2. Instalar a cadeia de certificados

Envie ao servidor apenas os certificados públicos recebidos: o certificado do site e as intermediárias. Monte a cadeia nessa ordem, sem incluir a raiz:

```bash
new="$TLS_CERT_DIR/$HTTPS_HOST.fullchain.crt.new"
openssl x509 -in certificado-do-site.cer -out "$new"
openssl x509 -in intermediaria.pem >> "$new"
```

Se um arquivo estiver em formato DER, acrescente `-inform DER` ao comando correspondente.

Valide com as autoridades confiáveis do sistema e confira a correspondência com a chave antes de instalar:

```bash
openssl verify -purpose sslserver -verify_hostname "$HTTPS_HOST" \
  -untrusted "$new" "$new"

openssl x509 -in "$new" -pubkey -noout | openssl dgst -sha256
openssl pkey -in "$TLS_CERT_DIR/$HTTPS_HOST.key" -pubout | openssl dgst -sha256

chmod 644 "$new"
mv "$new" "$TLS_CERT_DIR/$HTTPS_HOST.fullchain.crt"
```

Os dois resumos SHA-256 devem ser iguais. Se a verificação não reconhecer a raiz, interrompa e confira a cadeia com quem emitiu o certificado; não instale uma raiz nova apenas para a validação passar.

## 3. Copiar os arquivos de deploy

Copie para `$APP_DIR`, na mesma versão do repositório que será implantada:

- `docker-compose.https.yml`
- `docker-run.sh`
- `deploy/nginx/default.conf.template`

Não coloque certificados ou chaves no checkout, no contexto de build ou em diretórios sincronizados. Não execute `deploy-rsync.sh -x` (ou qualquer `rsync --delete`) sem revisar antes o modo de simulação: ele remove arquivos que existem apenas no servidor.

## 4. Validar sem ativar

```bash
./docker-run.sh https --check
```

O comando verifica confiança, validade e hostname do certificado, a correspondência com a chave, a configuração do Compose e executa `nginx -t` em um container temporário. Não publica portas e não reinicia serviços. Pode baixar a imagem do Nginx. A aplicação precisa estar em execução para o Nginx resolver o upstream `app`.

Para testar apenas o template do Nginx, sem certificados reais e sem tocar na produção (Linux, requer Docker, OpenSSL, `curl` e `nsenter`):

```bash
bash scripts/test-https-proxy.sh
```

O teste usa credenciais sintéticas e um container sem rede e sem portas publicadas. Verifica TLS, encaminhamento de headers, rejeição de hostname inesperado e ausência de URLs nos logs, e remove tudo ao terminar.

## 5. Ativar

Antes da primeira ativação, salve a configuração atual e o identificador da imagem da aplicação em um diretório administrativo:

```bash
backup=$(mktemp -d /var/backups/saude-territorial-https.XXXXXX)
cp -p docker-compose.prod.yml docker-run.sh "$backup"/
docker image inspect --format '{{.Id}}' saude-territorial-prod-app > "$backup/app-image-id"
```

Não imprima nem salve a saída expandida de `docker compose config`: ela contém segredos.

Ative:

```bash
./docker-run.sh https
```

O comando repete as validações e recria **somente** `app` e `proxy`, com as imagens existentes. A aplicação fica indisponível por alguns segundos. A partir daqui, use sempre `./docker-run.sh https` nesta instalação: o modo `prod` ignora o overlay e volta a publicar a porta 3000 sem HTTPS.

## 6. Verificar

Pela rede autorizada, sem `-k`:

```bash
curl -sS -o /dev/null -w '%{http_code}\n' "https://$HTTPS_HOST/login"            # 200
curl -sS -o /dev/null -w '%{http_code}\n' "https://$HTTPS_HOST/map"              # 307 para /login
curl -sS -o /dev/null -w '%{http_code}\n' "https://$HTTPS_HOST/api/patients"     # 401

openssl s_client -connect "$HTTPS_HOST:443" -servername "$HTTPS_HOST" \
  -verify_hostname "$HTTPS_HOST" -verify_return_error </dev/null

docker compose -f docker-compose.prod.yml -f docker-compose.https.yml ps
```

Confira também:

- a porta 3000 não responde no servidor nem a partir de outra máquina;
- banco e Nominatim continuam `healthy`;
- login, mapa e logout funcionam no navegador com uma conta autorizada;
- se o acesso deve ser restrito, a porta 443 é bloqueada a partir de um ponto de teste fora da rede autorizada.

Os logs do proxy registram apenas horário, status e duração; não compartilhe cookies nem respostas com registros. O Nginx responde 421 a hostnames diferentes de `$HTTPS_HOST`. Não há listener na porta 80.

## 7. Atualizar a aplicação

`./docker-run.sh https` não reconstrói a imagem. Para implantar código novo:

```bash
(umask 077 && docker compose -f docker-compose.prod.yml exec -T db \
  pg_dump -U saude -d saude_territorial -Fc \
  > "/var/backups/saude-territorial-db-$(date +%Y%m%d%H%M).dump")

docker compose -f docker-compose.prod.yml -f docker-compose.https.yml build app
./docker-run.sh https
```

A aplicação executa as migrações pendentes ao iniciar, por isso faça o backup do banco antes. Atualize também os arquivos do passo 3 se tiverem mudado.

`NEXT_PUBLIC_APP_URL` é incorporada no build. Deixe essa variável indefinida (o cliente usa a origem do navegador) ou defina-a com a URL HTTPS antes do build.

## 8. Reverter

A reversão volta a publicar HTTP na porta 3000. Só execute se essa porta também estiver protegida pela política de rede; caso contrário, mantenha o serviço indisponível enquanto corrige o HTTPS.

```bash
export BETTER_AUTH_URL="http://$HTTPS_HOST:3000"
docker compose -f docker-compose.prod.yml up -d --no-deps --no-build --force-recreate app
docker compose -f docker-compose.prod.yml -f docker-compose.https.yml rm -sf proxy
```

O `BETTER_AUTH_URL` precisa voltar a ser a URL HTTP; com a URL HTTPS, o login deixa de funcionar na porta 3000.

Restaure `docker-compose.prod.yml` e `docker-run.sh` a partir do backup se tiverem sido alterados. Não use `down -v` nem remova volumes.

## 9. Renovar o certificado

O fluxo não renova automaticamente. Defina um responsável e acompanhe a validade:

```bash
openssl x509 -in "$TLS_CERT_DIR/$HTTPS_HOST.fullchain.crt" -noout -enddate
```

Para pedir a renovação mantendo a chave atual:

```bash
openssl req -new -key "$TLS_CERT_DIR/$HTTPS_HOST.key" \
  -out "$TLS_CERT_DIR/$HTTPS_HOST.csr" \
  -subj "/CN=$HTTPS_HOST" -addext "subjectAltName=DNS:$HTTPS_HOST"
```

Ao receber o novo certificado, guarde uma cópia da cadeia anterior (`cp -p "$TLS_CERT_DIR/$HTTPS_HOST.fullchain.crt" "$TLS_CERT_DIR/$HTTPS_HOST.fullchain.crt.old"`), repita os passos 2 e 4 e execute `./docker-run.sh https`, que recria o proxy com a nova cadeia. Se gerar uma chave nova, substitua a chave e a cadeia juntas. Depois, confira as datas e o fingerprint do certificado servido com `openssl s_client`.
