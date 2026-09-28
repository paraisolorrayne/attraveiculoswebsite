#!/usr/bin/env bash
#
# Sobe a atribuição de campanha (pixel do catálogo, aviso de clique, endpoints,
# wbraid/gbraid) numa passada só.
#
# RODAR NO SEU MAC, não na VPS:
#
#     bash deploy/subir-atribuicao.sh
#
# Ele pede o token da Fykos, grava as variáveis, roda a migration, faz o deploy
# e confere se subiu. No fim imprime a chave que você manda para a Fykos.
#
# A ORDEM IMPORTA e é por isso que isto é um script e não uma lista de comandos:
# a migration tem de ir ANTES do código novo, senão o site passa a gravar sessão
# em coluna que ainda não existe e o rastreamento quebra. Como ela só acrescenta
# colunas opcionais, rodá-la com o código antigo no ar é seguro.
set -euo pipefail

HOST="${ATTRA_VPS:-attra-vps}"

# A chave, quando o bloco do host não declara a dele no ~/.ssh/config.
#
#     ATTRA_SSH_KEY=~/.ssh/id_gitlab_bookie bash deploy/subir-atribuicao.sh
#
# Existe para o script rodar sem exigir que você edite a config do SSH — isso é
# ajuste da sua máquina, e não é papel de um script de deploy fazer por você.
# O conserto definitivo é acrescentar `IdentityFile` no bloco do host.
CHAVE="${ATTRA_SSH_KEY:-}"
SSH=(ssh -o ConnectTimeout=15)
if [ -n "$CHAVE" ]; then
  CHAVE="${CHAVE/#\~/$HOME}"
  [ -f "$CHAVE" ] || { printf 'ERRO: chave não encontrada: %s\n' "$CHAVE" >&2; exit 1; }
  SSH+=(-i "$CHAVE" -o IdentitiesOnly=yes)
fi
APP=/var/www/attra
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATION="$RAIZ/supabase/migrations/20260927_visitor_sessions_wbraid_gbraid.sql"
URL_FYKOS="https://app.fykos.com.br/webhooks/site/aviso-clique"

azul()  { printf '\n\033[1;34m==> %s\033[0m\n' "$1"; }
erro()  { printf '\033[1;31mERRO: %s\033[0m\n' "$1" >&2; exit 1; }
ok()    { printf '    \033[32m✓\033[0m %s\n' "$1"; }

[ -f "$MIGRATION" ] || erro "não achei a migration em $MIGRATION — rode de dentro do repositório"

# ── 1. Acesso ────────────────────────────────────────────────────────────────
azul "1/6  Conferindo acesso à VPS ($HOST)"
# A saída de erro do ssh é MOSTRADA, não engolida: "não consegui conectar" sem o
# motivo manda a pessoa procurar rede quando o problema é chave, e vice-versa.
if ! ERRO_SSH=$("${SSH[@]}" -o BatchMode=yes "$HOST" "test -d $APP" 2>&1); then
  [ -n "$ERRO_SSH" ] && printf '    \033[33m%s\033[0m\n' "$ERRO_SSH"

  # Chave recusada com o bloco do host sem IdentityFile: o ssh só ofereceu as
  # chaves de nome padrão, e a da VPS não é uma delas. Todos os outros hosts
  # desta config declaram a sua; este é o único que não declara.
  if grep -qi "permission denied\|publickey" <<<"$ERRO_SSH" \
     && ! awk -v h="$HOST" '$1=="Host" && $2==h{d=1;next} $1=="Host"{d=0} d' ~/.ssh/config 2>/dev/null | grep -qi identityfile; then
    erro "a chave foi recusada, e o bloco '$HOST' do seu ~/.ssh/config não diz qual chave usar.
      Os outros hosts do arquivo declaram a sua. Descubra qual é a da VPS:

          for k in ~/.ssh/*.pub; do
            ssh -o BatchMode=yes -o IdentitiesOnly=yes -i \"\${k%.pub}\" $HOST true 2>/dev/null \\
              && echo \"FUNCIONA: \${k%.pub}\" && break
          done

      Conserto definitivo — no bloco '$HOST':   IdentityFile ~/.ssh/<a-que-funcionou>
      Ou, sem mexer na config, rode:            ATTRA_SSH_KEY=~/.ssh/<a-que-funcionou> bash $0"
  fi

  # A causa mais comum não é rede: é o script ter rodado com OUTRO usuário. O
  # alias e a chave moram em ~/.ssh do dono da máquina, então rodando como root
  # (o que acontece ao chamar pelo `!` do Claude Code) o alias simplesmente não
  # existe e o ssh tenta resolver "attra-vps" como se fosse um domínio.
  if [ "$(id -u)" -eq 0 ]; then
    erro "este script está rodando como root, e o root não tem a sua config de SSH.
      O alias '$HOST' e a chave moram no ~/.ssh da SUA conta.

      Abra o Terminal do Mac e rode lá:

          cd $RAIZ && bash deploy/subir-atribuicao.sh

      (chamado pelo Claude Code, ele roda como root e o alias não existe)"
  fi
  erro "não consegui entrar em '$HOST'.
      Veja os aliases disponíveis com:  grep '^Host' ~/.ssh/config
      E rode com o certo:               ATTRA_VPS=o-alias bash $0"
fi
ok "conectado"

# ── 2. O código está no GitHub? ──────────────────────────────────────────────
# O deploy puxa de origin/master. Se o que está aqui não foi enviado, subiria
# uma versão anterior sem ninguém perceber.
azul "2/6  Conferindo se o código local já foi enviado"
cd "$RAIZ"
git fetch -q origin master
if [ "$(git rev-parse HEAD)" != "$(git rev-parse origin/master)" ]; then
  erro "o HEAD local não é igual a origin/master — faça 'git push origin master' antes"
fi
ok "origin/master = $(git log --oneline -1)"

# ── 3. Variáveis ─────────────────────────────────────────────────────────────
azul "3/6  Variáveis de ambiente"
echo "    O token da Fykos não aparece na tela nem fica no histórico."
printf '    Cole o token da Fykos e tecle Enter: '
read -rs TOKEN_FYKOS
echo
[ -n "$TOKEN_FYKOS" ] || erro "token vazio"

# A nossa chave, dos endpoints que a Fykos consulta.
#
# Se já existir na VPS, é REAPROVEITADA: gerar outra invalidaria silenciosamente
# a que a Fykos já tem configurada, e o sintoma apareceria só quando eles
# tentassem consultar — 401 sem explicação, dias depois.
CHAVE_SITE="$("${SSH[@]}" "$HOST" "grep -m1 '^SITE_ATRIBUICAO_API_KEY=' $APP/.env.production 2>/dev/null | cut -d= -f2-" || true)"
if [ -n "$CHAVE_SITE" ]; then
  ok "reaproveitando a SITE_ATRIBUICAO_API_KEY que já estava na VPS"
else
  CHAVE_SITE="$(openssl rand -hex 32)"
fi

# Gravação idempotente: apaga a linha antiga antes de acrescentar, senão rodar
# duas vezes deixa a variável duplicada no arquivo.
"${SSH[@]}" "$HOST" "bash -s" <<REMOTO
set -euo pipefail
cd $APP
cp .env.production ".env.production.bak-\$(date +%Y%m%d-%H%M%S)"
sed -i '/^FYKOS_AVISO_CLIQUE_URL=/d;/^FYKOS_AVISO_CLIQUE_TOKEN=/d;/^SITE_ATRIBUICAO_API_KEY=/d' .env.production
cat >> .env.production <<'FIM'
FYKOS_AVISO_CLIQUE_URL=$URL_FYKOS
FYKOS_AVISO_CLIQUE_TOKEN=$TOKEN_FYKOS
SITE_ATRIBUICAO_API_KEY=$CHAVE_SITE
FIM
chmod 600 .env.production
REMOTO
ok "três variáveis gravadas (com backup do .env.production)"

# ── 4. Migration, ANTES do código ────────────────────────────────────────────
azul "4/6  Migration (wbraid/gbraid)"
# Mandada por stdin: assim não depende de o arquivo já ter chegado na VPS.
# `-v ON_ERROR_STOP=1` para o script parar aqui em vez de seguir para o deploy
# com o banco pela metade.
"${SSH[@]}" "$HOST" "cd $APP && set -a && . ./.env.production && set +a && \
  _db=\"\$(grep -E '^DATABASE_URL=.*(localhost|127\.0\.0\.1)' .env.production | tail -1 | cut -d= -f2-)\" && \
  [ -n \"\$_db\" ] && export DATABASE_URL=\"\$_db\"; \
  psql \"\$DATABASE_URL\" -v ON_ERROR_STOP=1 -q -f -" < "$MIGRATION"
ok "colunas wbraid/gbraid no lugar"

# ── 5. Deploy ────────────────────────────────────────────────────────────────
azul "5/6  Deploy (o site sai do ar só durante o build)"
if ! "${SSH[@]}" "$HOST" "cd $APP && bash deploy/deploy-vps.sh"; then
  printf '\033[1;31m\n  O DEPLOY FALHOU. Tentando subir a versão anterior...\033[0m\n'
  "${SSH[@]}" "$HOST" "pm2 start attra >/dev/null 2>&1 || pm2 restart attra >/dev/null 2>&1" || true
  "${SSH[@]}" "$HOST" "curl -s -o /dev/null -w '  site: %{http_code}\n' --max-time 20 http://localhost:3000/" || true
  erro "deploy interrompido — a saída acima diz onde parou"
fi
ok "deploy concluído"

# ── 6. Conferência ───────────────────────────────────────────────────────────
azul "6/6  Conferindo o que subiu"

# O endpoint tem de existir e RECUSAR sem chave. 401 é a resposta certa;
# 503 significa que a variável não chegou no processo, e 404 que a rota não subiu.
CODIGO=$("${SSH[@]}" "$HOST" "curl -s -o /dev/null -w '%{http_code}' --max-time 20 http://localhost:3000/api/sessions/abcdef123456")
case "$CODIGO" in
  401) ok "endpoint de atribuição no ar e exigindo chave (401)" ;;
  503) erro "o endpoint subiu mas SITE_ATRIBUICAO_API_KEY não chegou no processo — rode 'pm2 restart attra --update-env' na VPS" ;;
  404) erro "a rota /api/sessions não subiu — o build pegou o commit certo?" ;;
  *)   erro "resposta inesperada do endpoint: $CODIGO" ;;
esac

# A URL do aviso precisa estar no ambiente DO PROCESSO, não só no arquivo: o pm2
# guarda o ambiente do primeiro start, e variável nova sem --update-env não chega.
#
# Separa "não consegui olhar" de "olhei e não está lá". Tratar os dois como
# falha daria alarme falso depois de um deploy que deu certo, se o `pm2 env`
# não existir nesta versão — e alarme falso no fim de um deploy é pior que
# silêncio, porque ensina a ignorar o script.
if AMBIENTE=$("${SSH[@]}" "$HOST" "pm2 env attra 2>/dev/null") && [ -n "$AMBIENTE" ]; then
  if grep -q FYKOS_AVISO_CLIQUE_URL <<<"$AMBIENTE"; then
    ok "aviso de clique configurado no processo"
  else
    erro "FYKOS_AVISO_CLIQUE_URL não chegou no processo — rode 'pm2 restart attra --update-env' na VPS"
  fi
else
  printf '    \033[33m!\033[0m não consegui ler o ambiente do processo (pm2 env indisponível).\n'
  printf '      O deploy restarta com --update-env, então deve estar certo.\n'
fi

"${SSH[@]}" "$HOST" "curl -s -o /dev/null -w '    site: %{http_code}\n' --max-time 20 http://localhost:3000/"

cat <<FIM

$(printf '\033[1;32m✓ No ar.\033[0m')

Mande esta chave para a Fykos (é a dos endpoints de consulta deles):

    SITE_ATRIBUICAO_API_KEY=$CHAVE_SITE

Ainda falta, e não depende de deploy:
  1. remover o disparo de ViewContent vazio no GTM e publicar o contêiner;
  2. corrigir "Mercepdes" no cadastro do veículo no AutoConf.
FIM
