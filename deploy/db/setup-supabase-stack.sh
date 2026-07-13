#!/usr/bin/env bash
# Fase 1 da migração: sobe o Supabase self-hosted em Docker na VPS.
#
# Uso (na VPS, como root):
#   bash deploy/db/setup-supabase-stack.sh
#
# O que faz:
#   1. Clona o compose oficial do Supabase para /var/www/attra-db
#   2. Gera segredos novos (senha do Postgres, JWT_SECRET, ANON_KEY,
#      SERVICE_ROLE_KEY etc.) — ficam só em /var/www/attra-db/docker/.env
#   3. Restringe as portas do gateway (Kong) a 127.0.0.1 — nada exposto
#   4. Sobe o stack completo e testa a saúde
#
# Idempotente: se já existe .env, NÃO regenera segredos (só sobe/atualiza).
set -euo pipefail

DIR=/var/www/attra-db
PUBLIC_URL="https://db.attraveiculos.com.br"
SITE_URL="https://attraveiculos.com.br"

export PATH="/root/.nvm/versions/node/v20.20.0/bin:$PATH"

echo "==> [1/5] Código do stack (supabase/docker)"
if [ ! -d "$DIR/docker" ]; then
  rm -rf /tmp/supabase-src
  git clone --depth 1 --filter=blob:none --sparse https://github.com/supabase/supabase.git /tmp/supabase-src
  git -C /tmp/supabase-src sparse-checkout set docker
  mkdir -p "$DIR"
  cp -r /tmp/supabase-src/docker "$DIR/docker"
  rm -rf /tmp/supabase-src
  echo "    clonado em $DIR/docker"
else
  echo "    já existe em $DIR/docker — mantendo"
fi

cd "$DIR/docker"

echo "==> [2/5] Segredos e .env"
if [ -f .env ]; then
  echo "    .env já existe — mantendo segredos atuais"
else
  cp .env.example .env

  POSTGRES_PASSWORD=$(openssl rand -hex 24)
  JWT_SECRET=$(openssl rand -hex 32)
  DASHBOARD_PASSWORD=$(openssl rand -hex 16)
  SECRET_KEY_BASE=$(openssl rand -hex 48)
  VAULT_ENC_KEY=$(openssl rand -hex 16)

  # ANON_KEY / SERVICE_ROLE_KEY são JWTs HS256 assinados com o JWT_SECRET
  gerar_jwt() {
    node -e '
      const crypto = require("crypto");
      const [secret, role] = process.argv.slice(1);
      const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
      const iat = Math.floor(Date.now() / 1000);
      const header = b64({ alg: "HS256", typ: "JWT" });
      const payload = b64({ role, iss: "supabase", iat, exp: iat + 10 * 365 * 24 * 3600 });
      const sig = crypto.createHmac("sha256", secret).update(header + "." + payload).digest("base64url");
      console.log(header + "." + payload + "." + sig);
    ' "$1" "$2"
  }
  ANON_KEY=$(gerar_jwt "$JWT_SECRET" "anon")
  SERVICE_ROLE_KEY=$(gerar_jwt "$JWT_SECRET" "service_role")

  set_env() { sed -i "s|^$1=.*|$1=$2|" .env; }
  set_env POSTGRES_PASSWORD "$POSTGRES_PASSWORD"
  set_env JWT_SECRET "$JWT_SECRET"
  set_env ANON_KEY "$ANON_KEY"
  set_env SERVICE_ROLE_KEY "$SERVICE_ROLE_KEY"
  set_env DASHBOARD_PASSWORD "$DASHBOARD_PASSWORD"
  set_env SECRET_KEY_BASE "$SECRET_KEY_BASE"
  set_env VAULT_ENC_KEY "$VAULT_ENC_KEY"
  set_env SITE_URL "$SITE_URL"
  set_env API_EXTERNAL_URL "$PUBLIC_URL"
  set_env SUPABASE_PUBLIC_URL "$PUBLIC_URL"

  chmod 600 .env
  echo "    segredos gerados e gravados em $DIR/docker/.env (chmod 600)"
fi

echo "==> [3/5] Portas restritas a 127.0.0.1 (docker-compose.override.yml)"
cat > docker-compose.override.yml <<'EOF'
# Gateway e pooler só em localhost — acesso externo será via Nginx com TLS.
services:
  kong:
    ports: !override
      - "127.0.0.1:8000:8000/tcp"
  supavisor:
    ports: !override
      - "127.0.0.1:5432:5432/tcp"
      - "127.0.0.1:6543:6543/tcp"
EOF
echo "    ok"

echo "==> [4/5] Subindo o stack (primeira vez baixa ~3GB de imagens; paciência)"
docker compose pull -q
docker compose up -d
echo "    aguardando serviços ficarem saudáveis (até 3 min)..."
for i in $(seq 1 36); do
  unhealthy=$(docker compose ps --format '{{.Name}} {{.Health}}' | grep -cv "healthy" || true)
  [ "$unhealthy" -eq 0 ] && break
  sleep 5
done
docker compose ps

echo "==> [5/5] Smoke test do gateway"
ANON=$(grep '^ANON_KEY=' .env | cut -d= -f2)
auth_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 -H "apikey: $ANON" http://127.0.0.1:8000/auth/v1/health)
rest_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 -H "apikey: $ANON" http://127.0.0.1:8000/rest/v1/)
echo "    auth/v1/health -> $auth_code (esperado 200)"
echo "    rest/v1/       -> $rest_code (esperado 200)"

echo
echo "STACK_NO_AR — próximos passos: DNS db.attraveiculos.com.br -> IP da VPS,"
echo "vhost Nginx + certbot, e então as Fases 2-3 (restore do dump)."
