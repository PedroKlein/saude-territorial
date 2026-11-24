# Publicar a aplicação com HTTPS na porta 443

Use este procedimento para adicionar HTTPS a uma instalação Docker já existente, sem recriar o banco, o Nominatim ou os volumes de backup. O endereço previsto é **https://saudeterritorial.ufrgs.br**. A imagem da aplicação deve estar disponível e os serviços existentes devem estar em execução.

## 1. Confirmar os pré-requisitos

- Docker Compose 2.24 ou superior, com suporte a `!reset`, e OpenSSL 3 ou superior.
- DNS de `saudeterritorial.ufrgs.br` apontando para a VM correta, sem um registro AAAA para outro destino.
- Política de rede confirmada com o CPD: TCP 443 permitido pela VPN e bloqueado fora dela. O overlay publica apenas IPv4; não altera regras de firewall.
- Certificado emitido, cadeia intermediária e chave privada correspondente, mantida no servidor.
- Autorização para uma breve interrupção da aplicação.

**Não publicar a porta antes de confirmar a restrição à VPN.** Portas publicadas pelo Docker passam pelas regras de encaminhamento, não apenas pela cadeia `INPUT`. A restrição da porta SSH não prova que a porta 443 esteja protegida. Se necessário, o CPD deve definir a política de ingresso ou autorizar regras específicas para Docker; não deduzir os intervalos da VPN a partir do IP da VM.

Verifique o DNS pela VPN:

```bash
dig saudeterritorial.ufrgs.br A +noall +answer
dig saudeterritorial.ufrgs.br AAAA +noall +answer
```

## 2. Preparar os arquivos sem substituir a instalação

Coloque apenas estes arquivos na instalação, preservando o `docker-compose.prod.yml` e os arquivos de ambiente já existentes:

- `docker-compose.https.yml`
- `docker-run.sh`
- `deploy/nginx/default.conf.template`

Na VM atual, a instalação fica em `/home/giflach/teste`. É necessário acesso administrativo para atravessar o diretório pessoal do proprietário. Primeiro use uma área separada para revisão; copie para a instalação somente após aprovação.

Não execute uma sincronização ampla com `rsync --delete`: o Compose do servidor contém Nominatim e backups que não estão no Compose básico deste checkout. O overlay HTTPS mantém essas definições e altera apenas a porta da aplicação, sua origem de autenticação e o novo proxy.

Não coloque certificados ou chaves no checkout, no contexto de build ou em diretórios sujeitos à sincronização. Não baixe a chave privada da VM.

## 3. Instalar a cadeia de certificados

Depois de liberar o acesso aos arquivos recebidos, envie **somente os certificados públicos** para uma área de preparação no servidor. Execute com os caminhos dessa área:

```bash
openssl x509 -in saudeterritorial.ufrgs.br.cer \
  -out saudeterritorial.ufrgs.br.leaf.crt

openssl verify -purpose sslserver \
  -verify_hostname saudeterritorial.ufrgs.br \
  -untrusted intermediate_2025.pem saudeterritorial.ufrgs.br.leaf.crt

cat saudeterritorial.ufrgs.br.leaf.crt intermediate_2025.pem \
  > saudeterritorial.ufrgs.br.fullchain.crt
```

A ordem é certificado do site, seguido das intermediárias. Não inclua o certificado raiz no `fullchain`; não instale uma nova raiz de confiança apenas para fazer a validação passar. Se o OpenSSL não reconhecer a raiz, interrompa e verifique o pacote de autoridades confiáveis do sistema e a cadeia com o CPD.

Na primeira instalação, coloque o `fullchain` ao lado da chave já existente:

```bash
sudo install -o root -g root -m 644 \
  saudeterritorial.ufrgs.br.fullchain.crt \
  /etc/ssl/saude-territorial/saudeterritorial.ufrgs.br.fullchain.crt
```

A chave permanece em `/etc/ssl/saude-territorial/saudeterritorial.ufrgs.br.key`, com proprietário `root`, modo `600` e diretório com modo `700`. O proxy monta os dois arquivos como somente leitura. Em uma renovação, preserve primeiro uma cópia protegida do certificado anterior.

## 4. Validar sem ativar HTTPS

Na instalação existente, em um shell administrativo:

```bash
sudo -i
cd /home/giflach/teste
export HTTPS_HOST=saudeterritorial.ufrgs.br
export TLS_CERT_DIR=/etc/ssl/saude-territorial
./docker-run.sh https --check
```

O comando verifica confiança, validade, hostname e correspondência da chave; valida o Compose e executa `nginx -t` em um container temporário, sem publicar portas e sem iniciar dependências. Não recria a aplicação, o banco ou o Nominatim. Pode baixar a imagem do Nginx e criar recursos temporários do Compose. A aplicação existente precisa ser resolvível como `app` na rede Docker para a validação do upstream.

Os padrões são `HTTPS_HOST=saudeterritorial.ufrgs.br` e `TLS_CERT_DIR=/etc/ssl/saude-territorial`. Se forem necessários outros valores, passe-os no ambiente do comando, não apenas no `.env`:

```bash
HTTPS_HOST=app.example.org TLS_CERT_DIR=/etc/ssl/example \
  ./docker-run.sh https --check
```

Para testar o template em um checkout Linux sem certificados reais ou alteração da produção:

```bash
sudo bash scripts/test-https-proxy.sh
```

Esse teste baixa a imagem do Nginx se necessário, gera credenciais sintéticas e usa um container com rede desabilitada e nenhuma porta publicada. Verifica TLS, encaminhamento dos headers, rejeição de hostname inesperado e ausência de URLs nos logs. A inicialização tem um limite de 5 segundos; os containers e as credenciais temporárias são removidos ao sair. Requer Docker, OpenSSL, `curl` e `nsenter` no host Linux.

## 5. Ativar após aprovação

Antes da primeira ativação, salve a configuração de produção e os identificadores das imagens em um diretório administrativo com modo `700`, fora da instalação. Não imprima a configuração expandida do Compose: ela pode conter senhas.

Com o certificado instalado e DNS/rede confirmados:

```bash
./docker-run.sh https
```

Esse é o comando de ativação e reaplicação do HTTPS. Ele executa novamente as validações e recria **somente `app` e `proxy`**, usando as imagens existentes. A recriação também atualiza os mounts após a substituição de certificados. Há uma breve interrupção a cada execução. O banco, o Nominatim e seus volumes não são reiniciados pelo comando.

A porta 3000 deixa de ser publicada. A autenticação recebe `BETTER_AUTH_URL=https://saudeterritorial.ufrgs.br`; o Nginx encaminha o hostname e o protocolo HTTPS e desativa buffering para preservar streaming do Next.js. Os logs do proxy registram apenas horário, status e duração, sem URLs, cookies ou dados dos registros.

Esse comando não reconstrói uma nova versão da aplicação. Se for necessária uma atualização de código, revise a sincronização e execute o build separadamente antes da reaplicação. Os comandos `dev` e `prod` continuam com o comportamento anterior; **não use `prod` na instalação HTTPS**, pois ele ignora o overlay e volta a publicar a porta 3000.

O cliente de autenticação usa a origem do navegador quando `NEXT_PUBLIC_APP_URL` não está definido no build. Se uma imagem antiga tiver outra origem fixada nessa variável, será necessário reconstruí-la com a origem correta ou sem essa variável; mudar apenas o ambiente do container não altera variáveis públicas já incorporadas no JavaScript.

## 6. Verificar pela VPN e fora dela

```bash
curl --noproxy '*' -I https://saudeterritorial.ufrgs.br/login
curl --noproxy '*' -I https://saudeterritorial.ufrgs.br/map
curl --noproxy '*' -o /dev/null -w '%{http_code}\n' \
  https://saudeterritorial.ufrgs.br/api/patients

docker compose -f docker-compose.prod.yml -f docker-compose.https.yml ps
```

Sem autenticação, espere `/login` disponível, `/map` redirecionando para login e `/api/patients` negando acesso. Não use `-k` e não compartilhe cookies ou respostas contendo registros. No navegador, verifique login, sessão, mapa e logout em uma conta autorizada.

Confirme também que a porta 3000 não é acessível externamente, que o banco e o Nominatim continuam saudáveis e que os volumes mantêm os mesmos nomes. Use um ponto de teste autorizado **fora da VPN** para confirmar o bloqueio da porta 443; não desconecte a VPN que sustenta a sessão administrativa durante a alteração.

Para inspecionar a cadeia servida:

```bash
openssl s_client -connect saudeterritorial.ufrgs.br:443 \
  -servername saudeterritorial.ufrgs.br \
  -verify_hostname saudeterritorial.ufrgs.br -verify_return_error </dev/null
```

Se o Nginx retornar 421, confira o hostname solicitado. Não há listener HTTP na porta 80 neste procedimento.

## 7. Reverter a primeira ativação

Se o HTTPS falhar, os arquivos base e as imagens anteriores permanecem disponíveis. **A reversão abaixo restaura HTTP na porta 3000:** só execute se essa porta também estiver restrita à VPN. Caso contrário, mantenha o serviço indisponível enquanto corrige HTTPS, em vez de reabrir HTTP sem proteção.

```bash
docker compose -f docker-compose.prod.yml up -d --no-deps --no-build app
docker compose -f docker-compose.prod.yml -f docker-compose.https.yml rm -sf proxy
```

Não use `down -v` nem remova volumes. Confira a saúde dos serviços e a configuração base contra o backup anterior. O procedimento não define HSTS, evitando fixar HTTPS no navegador antes de concluir a validação.

## 8. Renovar com o CPD

O certificado atual expira em **06/06/2027 às 13:06:12 UTC**. Defina um responsável e solicite a renovação com antecedência, conforme o prazo do CPD; este fluxo não implementa renovação automática.

Preserve a cadeia anterior em uma área administrativa, valide a nova emissão e a correspondência da chave, substitua o `fullchain` e execute novamente `./docker-run.sh https --check` e `./docker-run.sh https`. Não substitua a chave existente sem um novo CSR e certificado correspondentes. Após a troca, confira o fingerprint e as datas do certificado realmente servido.
