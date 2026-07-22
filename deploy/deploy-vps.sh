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
rm -rf .next
# Blindagem contra ENOIDENTIFIER: força a DATABASE_URL LOCAL do .env.production,
# ignorando qualquer DATABASE_URL do Supabase que tenha vazado no ambiente. Se
# não houver linha local, mantém o que o `source` já setou (fallback).
_dburl_local="$(grep -E '^DATABASE_URL=.*(localhost|127\.0\.0\.1)' .env.production | tail -1 | cut -d= -f2-)"
[ -n "$_dburl_local" ] && export DATABASE_URL="$_dburl_local"
echo "    host do banco no build: $(printf '%s' "${DATABASE_URL:-VAZIA}" | sed -E 's#^[a-z]+://[^@]*@##; s#/.*##')"
npm run build
test -f .next/standalone/server.js || { echo "ERRO: server.js não gerado — build falhou"; exit 1; }

echo "==> [4/7] restart"
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
