#!/usr/bin/env bash
set -euo pipefail
# ============================================================================
# Fase 3 — Traz os DADOS do Supabase para o Postgres da VPS.
# RODE NA VPS (tem internet pro Supabase + localhost pro Postgres novo),
# DEPOIS de rodar deploy/postgres-setup.sh.
#
# O que faz:
#   1. pg_dump do schema `public` do Supabase (só as SUAS tabelas — sem o lixo
#      interno do Supabase: schemas auth/storage, RLS de roles deles, etc.)
#   2. Extrai id/email/hash de senha de auth.users (GoTrue) — só isso.
#   3. Restaura o schema public no Postgres da VPS (erros vão pro log p/ revisar).
#   4. Desliga RLS (o controle de acesso agora vive na API do Next).
#   5. Migra as senhas bcrypt -> admin_users.password_hash (casando por email).
#   6. Reescreve as URLs de storage *.supabase.co -> disco/Nginx.
#
# Uso:
#   export SUPABASE_DB_URL='postgresql://postgres:SENHA@db.<ref>.supabase.co:5432/postgres'
#   export DATABASE_URL='postgresql://attra:SENHA@localhost:5432/attra'
#   export SUPABASE_REF='vtqcoxcclpimzlikpmzs'                 # subdomínio antes de .supabase.co
#   # export MEDIA_PUBLIC_URL='https://attraveiculos.com.br/media'   # opcional (default abaixo)
#   bash deploy/migrate-data.sh
# ============================================================================

: "${SUPABASE_DB_URL:?defina SUPABASE_DB_URL (string do Supabase, :5432 direct)}"
: "${DATABASE_URL:?defina DATABASE_URL (postgres local: postgresql://attra:...@localhost:5432/attra)}"
: "${SUPABASE_REF:?defina SUPABASE_REF (ex.: vtqcoxcclpimzlikpmzs)}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORKDIR="${WORKDIR:-/var/www/attra-migracao}"
OLD_PREFIX="https://${SUPABASE_REF}.supabase.co/storage/v1/object/public/"
NEW_PREFIX="${MEDIA_PUBLIC_URL:-https://attraveiculos.com.br/media}/"
mkdir -p "$WORKDIR"; cd "$WORKDIR"

echo "==> [1/6] Dump do schema public do Supabase (só suas tabelas)..."
pg_dump "$SUPABASE_DB_URL" \
  --schema=public \
  --no-owner --no-privileges \
  --no-publications --no-subscriptions \
  --quote-all-identifiers \
  -f public.sql
echo "    ok: $(du -h public.sql | cut -f1) em $WORKDIR/public.sql"

echo "==> [2/6] Extrai senhas do GoTrue (auth.users) — só id/email/hash..."
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 \
  -c "\copy (SELECT id, email, encrypted_password FROM auth.users WHERE encrypted_password IS NOT NULL) TO 'auth_users.csv' WITH (FORMAT csv, HEADER true)"
echo "    ok: $(($(wc -l < auth_users.csv) - 1)) usuários com senha"

echo "==> [3/6] Restore do schema public na VPS (erros -> restore-errors.log)..."
# ON_ERROR_STOP=0: alguns objetos supabase-specific podem falhar (ex.: CREATE
# EXTENSION sem superuser — já criadas no setup). Revise o log ao final.
psql "$DATABASE_URL" -v ON_ERROR_STOP=0 -f public.sql 2> restore-errors.log || true
echo "    Erros relevantes do restore (ignore 'already exists' / permissão de extensão):"
grep -iE "^psql:.*(ERROR|ERRO)" restore-errors.log | grep -viE "already exists|já existe|extension" | head -30 || echo "    (nenhum)"

echo "==> [4/6] Desliga RLS em todas as tabelas public (acesso agora é via API Next)..."
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP
    EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
END $$;
SQL

echo "==> [5/6] Migra senhas bcrypt (GoTrue) -> admin_users.password_hash..."
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
CREATE TEMP TABLE _auth_import (id uuid, email text, encrypted_password text);
\copy _auth_import FROM 'auth_users.csv' WITH (FORMAT csv, HEADER true)
-- GoTrue usa bcrypt padrão -> bcryptjs.compare valida direto (ninguém reseta senha).
-- Casa por email (mais estável que por id).
UPDATE admin_users a
   SET password_hash = i.encrypted_password
  FROM _auth_import i
 WHERE lower(a.email) = lower(i.email)
   AND i.encrypted_password IS NOT NULL;
SQL

echo "==> [6/6] Reescreve URLs de storage *.supabase.co -> disco/Nginx..."
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -v old_prefix="$OLD_PREFIX" -v new_prefix="$NEW_PREFIX" \
  -f "$SCRIPT_DIR/rewrite-storage-urls.sql"

echo ""
echo "==> Verificação:"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -v old_prefix="$OLD_PREFIX" <<'SQL'
SELECT 'usuarios (c/ senha / total)' AS o,
       count(*) FILTER (WHERE password_hash IS NOT NULL) || ' / ' || count(*) AS n FROM admin_users;
SELECT 'blog posts'  AS o, count(*)::text AS n FROM dual_blog_posts;
SELECT 'noticias'    AS o, count(*)::text AS n FROM news_articles;
SELECT 'sons motor'  AS o, count(*)::text AS n FROM vehicle_sounds;
SELECT 'URLs supabase.co ainda em dual_blog_posts (deve ser 0)' AS o,
       count(*)::text AS n FROM dual_blog_posts
       WHERE content LIKE '%'||:'old_prefix'||'%' OR featured_image LIKE :'old_prefix'||'%';
SQL
echo ""
echo "OK. Confira os counts e o $WORKDIR/restore-errors.log."
echo "Depois: baixar os arquivos dos buckets p/ /var/www/attra-media/<bucket>/ (Fase 3 storage)."
