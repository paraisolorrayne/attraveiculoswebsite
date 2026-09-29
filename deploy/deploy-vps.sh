#!/usr/bin/env bash
# Deploy completo da Attra na VPS + (opcional) manutenção do banco Supabase.
#
# Uso (na VPS, como root, após git pull):
#   bash deploy/deploy-vps.sh                          # só deploy
#   bash deploy/deploy-vps.sh "postgresql://..."       # deploy + migration de retenção + faxina + VACUUM
#
# A connection string é a do painel Supabase (Connect → Session pooler).
# Passos: git pull → npm ci → build (com pm2 parado, evita o ENOTEMPTY do
# cache standalone) → restart → crons → smoke test → [banco].
set -euo pipefail

APP_DIR=/var/www/attra
DB_URL="${1:-}"

cd "$APP_DIR"
export PATH="/root/.nvm/versions/node/v20.20.0/bin:$PATH"

echo "==> [1/7] git pull"
git pull --ff-only origin master

echo "==> [2/7] env + dependências"
set -a; source .env.production; set +a
npm ci

echo "==> [3/7] build (site fica fora do ar só nesta etapa)"
pm2 stop attra

# A versão que está no ar é GUARDADA, não apagada.
#
# Apagar antes de construir foi o que derrubou o site em 27/09: o build falhou,
# e como não havia mais `.next` não existia nada para servir — o pm2 ficou em
# `errored` e a única saída era consertar o build com o site fora. Guardando,
# uma falha volta ao ar em segundos.
rm -rf .next.anterior
[ -d .next ] && mv .next .next.anterior
# Blindagem contra ENOIDENTIFIER. Nesta VPS a porta 5432 tem DOIS donos:
#
#     [::1]:5432      → o Postgres do site
#     127.0.0.1:5432  → o supavisor (pooler) do Supabase que roda em Docker
#
# `localhost` vira um ou outro conforme a ordem de DNS do Node, e quando cai no
# IPv4 toda query volta `no tenant identifier provided`. Foi a causa do
# ENOIDENTIFIER de julho e do admin fora em 28/09 (quando o ipv4first abaixo
# vazou para o processo). O `?host=::1` fixa o Postgres do site independente
# da ordem de DNS — `[::1]` direto na URL o driver `pg` não aceita.
banco_local() {
  local url
  url="$(grep -E '^DATABASE_URL=.*(localhost|127\.0\.0\.1|::1)' .env.production | tail -1 | cut -d= -f2-)"
  [ -n "$url" ] || return 0
  case "$url" in
    *host=*) : ;;
    *\?*) url="$url&host=::1" ;;
    *)    url="$url?host=::1" ;;
  esac
  export DATABASE_URL="$url"
}
banco_local
echo "    banco no build: $(printf '%s' "${DATABASE_URL:-VAZIA}" | sed -E 's#^[a-z]+://[^@]*@##')"
# IPv4 no build. O `next/font/google` busca o CSS da fonte em tempo de build, e
# pelo IPv6 deste servidor a resposta do Google vem num formato que o loader não
# consegue ler — quebra com `Cannot read properties of null (reading '1')` em
# @next/font/dist/google/loader.js, que parece erro de código e é de rota.
# Medido em 27/09: pelo IPv6 o build falha sempre, com IPv4 passa sempre.
#
# SÓ no comando do build, nunca exportado: exportado, o `--update-env` do
# restart levava o ipv4first para o site no ar.
if ! NODE_OPTIONS="--dns-result-order=ipv4first${NODE_OPTIONS:+ $NODE_OPTIONS}" npm run build \
   || [ ! -f .next/standalone/server.js ]; then
  echo "ERRO: build falhou — restaurando a versão anterior e subindo o site"
  rm -rf .next
  if [ -d .next.anterior ]; then
    mv .next.anterior .next
    # --update-env: leva a DATABASE_URL blindada e tira o ipv4first que o pm2 guardou.
    export NODE_OPTIONS="${NODE_OPTIONS:-}"
    NODE_OPTIONS="${NODE_OPTIONS//--dns-result-order=ipv4first/}"
    pm2 restart attra --update-env
    echo "    site de volta no ar com a versão anterior. Corrija o build e rode de novo."
  else
    echo "    NÃO havia versão anterior guardada — o site segue fora até o build passar."
  fi
  exit 1
fi
rm -rf .next.anterior

echo "==> [4/7] restart"
# `--update-env` copia o ambiente DO SHELL, não lê .env.production. Sem o
# source abaixo, toda variável NOVA adicionada ao arquivo nunca chegava no
# processo: o app seguia com o ambiente salvo pelo pm2 no primeiro start, e a
# variável parecia ignorada sem nenhum erro. Foi o que aconteceu com
# EMAIL_FROM em 03/08/2026.
if [ -f .env.production ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env.production
  set +a
fi
# O source acima devolve o `localhost` cru; reaplica a blindagem para o site no ar.
banco_local
# Exportado mesmo vazio: o pm2 guardou o ipv4first no deploy de 28/09, e só
# sobrescrever a variável tira ele do processo.
export NODE_OPTIONS="${NODE_OPTIONS:-}"
NODE_OPTIONS="${NODE_OPTIONS//--dns-result-order=ipv4first/}"
pm2 restart attra --update-env
pm2 save

echo "==> [5/7] crons"
bash deploy/cron/install-crons.sh

echo "==> [6/7] smoke test"
sleep 3
# Rotas públicas devem responder 200
for path in / /blog; do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 "http://localhost:3000$path")
  echo "    $path -> $code"
  [ "$code" = "200" ] || { echo "ERRO: $path não respondeu 200"; exit 1; }
done
# Rota de admin SEM sessão deve redirecionar pro login (auth ativo). 307/302 = OK.
acode=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 "http://localhost:3000/admin/gerador-criativos")
echo "    /admin/gerador-criativos -> $acode (esperado 307/302: redirect pro login)"
case "$acode" in
  307|302|200) : ;;
  *) echo "ERRO: rota de admin devolveu $acode (esperava redirect ou 200)"; exit 1 ;;
esac

if [ -z "$DB_URL" ]; then
  echo "==> [7/7] banco: pulado (sem connection string). Para incluir:"
  echo "    bash deploy/deploy-vps.sh 'postgresql://...'"
  echo "OK — deploy concluído."
  exit 0
fi

echo "==> [7/7] banco: migration de retenção + faxina + VACUUM"
command -v psql >/dev/null || { apt-get update -qq && apt-get install -y -qq postgresql-client; }

echo "    -- tamanho ANTES:"
psql "$DB_URL" -tAc "SELECT pg_size_pretty(pg_database_size(current_database()));"

echo "    -- aplicando migration 20260712_fix_cleanup_add_inventory.sql"
psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/20260712_fix_cleanup_add_inventory.sql

echo "    -- executando cleanup_old_tracking_data(60):"
psql "$DB_URL" -c "SELECT * FROM public.cleanup_old_tracking_data(60);"

echo "    -- VACUUM FULL (recupera o espaço; pode levar alguns minutos)"
psql "$DB_URL" -c "SET statement_timeout=0; VACUUM FULL public.inventory_snapshots;"
psql "$DB_URL" -c "SET statement_timeout=0; VACUUM FULL public.visitor_sessions;"
psql "$DB_URL" -c "SET statement_timeout=0; VACUUM FULL public.visitor_page_views;"
psql "$DB_URL" -c "SET statement_timeout=0; VACUUM FULL public.identity_events;"

echo "    -- tamanho DEPOIS:"
psql "$DB_URL" -tAc "SELECT pg_size_pretty(pg_database_size(current_database()));"

echo "    -- teste do cron de retenção de ponta a ponta:"
/usr/local/bin/attra-cleanup-tracking.sh || true

echo "OK — deploy + manutenção do banco concluídos."
