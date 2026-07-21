#!/usr/bin/env bash
set -euo pipefail
# ============================================================================
# Fase 1 — Provisiona o Postgres na VPS (RODE NA VPS, como root ou com sudo).
# Ubuntu/Debian. Instala PG17 + pgvector e deixa user/db/extensões prontos
# para o restore da Fase 3 (deploy/migrate-data.sh).
#
# PG17 para casar com a versão do Supabase (17.x): o pg_dump precisa ser >= a
# versão do servidor de origem, e restaurar dump novo em servidor antigo quebra.
#
# Uso:
#   sudo ATTRA_DB_PASSWORD='uma-senha-forte-sem-aspas' bash deploy/postgres-setup.sh
#
# Idempotente: pode rodar de novo sem estragar nada.
# ============================================================================

: "${ATTRA_DB_PASSWORD:?defina ATTRA_DB_PASSWORD='senha-forte' antes de rodar}"
PG_VERSION="${PG_VERSION:-17}"
DB_NAME="${DB_NAME:-attra}"
DB_USER="${DB_USER:-attra}"

echo "==> Instalando PostgreSQL $PG_VERSION + pgvector..."
apt-get update
if ! apt-get install -y "postgresql-$PG_VERSION" "postgresql-contrib-$PG_VERSION" "postgresql-$PG_VERSION-pgvector" 2>/dev/null; then
  echo "    (repo padrão não tem PG$PG_VERSION — adicionando o PGDG oficial)"
  apt-get install -y curl ca-certificates gnupg lsb-release
  curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /etc/apt/trusted.gpg.d/pgdg.gpg
  echo "deb https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list
  apt-get update
  apt-get install -y "postgresql-$PG_VERSION" "postgresql-contrib-$PG_VERSION" "postgresql-$PG_VERSION-pgvector"
fi

systemctl enable --now postgresql
echo "==> Versão instalada:"
sudo -u postgres psql -tAc "SELECT version();"

echo "==> Criando role + database (idempotente)..."
sudo -u postgres psql <<SQL
DO \$do\$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='$DB_USER') THEN
    CREATE ROLE $DB_USER WITH LOGIN PASSWORD '$ATTRA_DB_PASSWORD';
  ELSE
    ALTER ROLE $DB_USER WITH LOGIN PASSWORD '$ATTRA_DB_PASSWORD';
  END IF;
END \$do\$;
SELECT 'CREATE DATABASE $DB_NAME OWNER $DB_USER'
  WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname='$DB_NAME')\gexec
SQL

echo "==> Extensões (espelhando o layout do Supabase: schema 'extensions') + roles stub..."
sudo -u postgres psql -d "$DB_NAME" <<SQL
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS vector      SCHEMA extensions;  -- embeddings / busca semântica (<=>)
CREATE EXTENSION IF NOT EXISTS pgcrypto    SCHEMA extensions;  -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;  -- uuid_generate_v4() (defaults do Supabase)
CREATE EXTENSION IF NOT EXISTS pg_trgm     SCHEMA extensions;  -- similaridade de texto
-- deixa os tipos/funcs das extensões acessíveis SEM prefixo (o código usa ::vector "cru"
-- e o dump do Supabase referencia extensions.<x> — os dois resolvem via search_path):
ALTER DATABASE $DB_NAME SET search_path = public, extensions;
GRANT ALL   ON SCHEMA public     TO $DB_USER;
GRANT USAGE ON SCHEMA extensions TO $DB_USER;
-- roles que o dump do Supabase referencia em policies/grants; inertes aqui, mas
-- precisam existir pra o restore não quebrar:
DO \$do\$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon')          THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role')  THEN CREATE ROLE service_role NOLOGIN; END IF;
END \$do\$;
SQL

echo ""
echo "============================================================"
echo "OK! Postgres pronto. Ponha no .env.production da app (na VPS):"
echo ""
echo "  DATABASE_URL=postgresql://$DB_USER:SUA_SENHA@localhost:5432/$DB_NAME"
echo ""
echo "(localhost — a porta 5432 NÃO precisa ficar exposta pra internet.)"
echo "Próximo passo: deploy/migrate-data.sh (Fase 3 — trazer os dados)."
echo "============================================================"
