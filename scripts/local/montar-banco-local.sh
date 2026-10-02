#!/usr/bin/env bash
#
# Banco local para ver a área da agência (e o resto do admin) rodando ANTES do
# deploy. Traz SÓ o esquema de produção — nenhuma linha de dado: as sessões
# guardam IP e os cards do CRM guardam nome e telefone. Os dados vêm depois,
# sintéticos, de scripts/local/seed-agencia.ts.
#
# Rodar no Mac, como você mesma (não como root):
#
#     bash scripts/local/montar-banco-local.sh
#
# Variáveis opcionais:
#   BANCO_LOCAL  nome do banco local (padrão: attra_local)
#   SSH_ATTRA    comando de ssh até a VPS (padrão: "ssh attra-vps")
set -euo pipefail

BANCO="${BANCO_LOCAL:-attra_local}"
read -ra SSH <<< "${SSH_ATTRA:-ssh attra-vps}"
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ESQUEMA="$(mktemp -t attra-esquema-XXXXXX).sql"
trap 'rm -f "$ESQUEMA"' EXIT

echo "==> esquema de produção (sem dados)"
"${SSH[@]}" 'sudo -u postgres pg_dump --schema-only --no-owner --no-privileges attra' > "$ESQUEMA"
grep -q 'CREATE TABLE public.visitor_sessions' "$ESQUEMA" || { echo "ERRO: o dump não trouxe o esquema esperado"; exit 1; }

echo "==> papéis herdados do Supabase (sem login, só para as políticas do esquema existirem)"
for papel in $(grep -oE '\bTO (anon|authenticated|service_role|supabase_[a-z_]+)\b' "$ESQUEMA" | awk '{print $2}' | sort -u); do
  psql -X -q -d postgres -v ON_ERROR_STOP=1 -c "do \$\$ begin if not exists (select 1 from pg_roles where rolname = '$papel') then create role $papel nologin; end if; end \$\$" > /dev/null
  echo "    $papel"
done

echo "==> recriando o banco $BANCO"
dropdb --if-exists "$BANCO"
createdb "$BANCO"
psql -X -q -d "$BANCO" -v ON_ERROR_STOP=1 -f "$ESQUEMA" > /dev/null

echo "==> migrations novas (idempotentes)"
for m in 20260929_admin_users_ultimo_acesso 20261002_descarta_correlacao_por_horario 20261002_agencias; do
  psql -X -q -d "$BANCO" -v ON_ERROR_STOP=1 -f "$RAIZ/supabase/migrations/$m.sql" > /dev/null
  echo "    ok: $m"
done

echo "ok: banco $BANCO pronto, só com o esquema."
echo "    Agora: npx tsx scripts/local/seed-agencia.ts"
