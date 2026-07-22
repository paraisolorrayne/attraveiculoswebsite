#!/usr/bin/env bash
set -euo pipefail
# ============================================================================
# Fase 7 (preparo) — Configura .env.production + Nginx /media/ na VPS.
# RODE NA VPS, como root. Seguro rodar ANTES do cutover: não derruba o site
# (o app só relê o .env no próximo deploy; o /media/ é rota nova, sem conflito).
# Idempotente: re-rodar não duplica variáveis nem regenera o AUTH_SECRET.
#
# Uso:
#   sudo bash deploy/setup-env-nginx.sh
#   # sobrescrevendo a senha do banco, se você trocou:
#   sudo DATABASE_URL='postgresql://attra:SENHA@localhost:5432/attra' bash deploy/setup-env-nginx.sh
# ============================================================================

APP_DIR="${APP_DIR:-/var/www/attra}"
MEDIA_ROOT="${MEDIA_ROOT:-/var/www/attra-media}"
DOMAIN="${DOMAIN:-attraveiculos.com.br}"
DB_URL="${DATABASE_URL:-postgresql://attra:tQdWT41RqlgPZVky@localhost:5432/attra}"
ENV_FILE="$APP_DIR/.env.production"
STAMP="$(date +%Y%m%d%H%M%S)"

# ---------------------------------- 1) .env ----------------------------------
echo "==> [1/2] Variáveis em $ENV_FILE"
[ -f "$ENV_FILE" ] || touch "$ENV_FILE"
cp "$ENV_FILE" "${ENV_FILE}.bak.${STAMP}"
# garante quebra de linha no fim antes de acrescentar
[ -s "$ENV_FILE" ] && [ -n "$(tail -c1 "$ENV_FILE")" ] && echo >> "$ENV_FILE"

set_env() {  # set_env KEY VALUE — substitui a linha existente ou acrescenta
  local key="$1" val="$2"
  if grep -qE "^[[:space:]]*${key}=" "$ENV_FILE"; then
    grep -vE "^[[:space:]]*${key}=" "$ENV_FILE" > "${ENV_FILE}.tmp" && mv "${ENV_FILE}.tmp" "$ENV_FILE"
    echo "    (substituído) $key"
  else
    echo "    (adicionado)  $key"
  fi
  printf '%s=%s\n' "$key" "$val" >> "$ENV_FILE"
}

set_env DATABASE_URL "$DB_URL"
if grep -qE "^[[:space:]]*AUTH_SECRET=" "$ENV_FILE"; then
  echo "    (mantido)     AUTH_SECRET já existe (não regenero pra não invalidar sessões)"
else
  set_env AUTH_SECRET "$(openssl rand -base64 32)"
fi

# --------------------------------- 2) Nginx ----------------------------------
echo "==> [2/2] Nginx: location /media/ -> ${MEDIA_ROOT}"
# procura em TODO o /etc/nginx (não só sites-enabled/conf.d); override: NGINX_CONF=...
CONF="${NGINX_CONF:-$(grep -rlE "server_name[^;]*${DOMAIN}|proxy_pass[^;]*:3000" /etc/nginx/ 2>/dev/null | grep -v '\.bak' | head -1 || true)}"
BLOCK="    location /media/ { alias ${MEDIA_ROOT}/; access_log off; expires 30d; add_header Cache-Control \"public, immutable\"; }"

if [ -z "$CONF" ]; then
  echo "    !! Não achei o config do Nginx automaticamente. Adicione este bloco à mão"
  echo "       dentro do server {} HTTPS, e rode 'nginx -t && systemctl reload nginx':"
  echo "$BLOCK"
elif grep -q "location /media/" "$CONF"; then
  echo "    (mantido) /media/ já configurado em $CONF"
else
  echo "    config: $CONF"
  BAK="${CONF}.bak.${STAMP}"; cp "$CONF" "$BAK"
  if grep -q "ssl_certificate_key" "$CONF"; then
    awk -v b="$BLOCK" '{print} !d && /ssl_certificate_key/{print b; d=1}' "$CONF" > "${CONF}.tmp"
  else
    awk -v b="$BLOCK" '!d && /location[[:space:]]*\/[[:space:]]*\{/{print b; d=1} {print}' "$CONF" > "${CONF}.tmp"
  fi
  mv "${CONF}.tmp" "$CONF"
  if nginx -t 2>/tmp/attra-nginx-test.log; then
    systemctl reload nginx
    echo "    /media/ adicionado e Nginx recarregado ✅"
  else
    cp "$BAK" "$CONF"
    echo "    !! nginx -t falhou — alteração REVERTIDA. Detalhe:"; cat /tmp/attra-nginx-test.log
    echo "    Adicione o bloco à mão (impresso acima) e recarregue."
  fi
fi

echo ""
echo "============================================================"
echo "OK. Teste o /media/ (deve dar 200 e Content-Type image/png):"
echo "  curl -sI https://${DOMAIN}/media/vehicle-hero-assets/hero/999695-1783094420393.png | head -3"
echo ""
echo "As variáveis só entram em vigor no CUTOVER (próximo deploy)."
echo "Backups: ${ENV_FILE}.bak.${STAMP}  e o do Nginx (se editado)."
echo "============================================================"
