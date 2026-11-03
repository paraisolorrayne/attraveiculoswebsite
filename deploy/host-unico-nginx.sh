#!/usr/bin/env bash
set -euo pipefail
# ============================================================================
# Um host só, em um salto (handoff de SEO de 02/11/2026, Tarefa 1).
#
# Em 02/11/2026, http://www.attraveiculos.com.br levava dois saltos até a URL
# final: o nginx mandava para https://www (301, com $host) e o Next, de lá,
# para https://attraveiculos.com.br (308). Este script troca o destino dos
# redirects HTTP do nginx para o domínio sem www, então todo http:// chega
# direto. O https://www continua com o redirect do next.config (um salto).
#
# RODE NA VPS, como root. Idempotente; faz backup e desfaz se `nginx -t` falhar.
#   ssh attra-vps 'cd /var/www/attra && bash deploy/host-unico-nginx.sh'
# ============================================================================

DOMAIN="${DOMAIN:-attraveiculos.com.br}"
STAMP="$(date +%Y%m%d%H%M%S)"
CONF="${NGINX_CONF:-$(grep -rlE "server_name[^;]*${DOMAIN}" /etc/nginx/ 2>/dev/null | grep -v '\.bak' | head -1 || true)}"

if [ -z "$CONF" ]; then
  echo "!! Não achei o config do Nginx com server_name ${DOMAIN}. Rode com NGINX_CONF=/caminho/do/arquivo."
  exit 1
fi
echo "==> config: $CONF"

DE='return 301 https://$host$request_uri;'
PARA="return 301 https://${DOMAIN}\$request_uri;"

if ! grep -qF "$DE" "$CONF"; then
  echo "    Nenhum 'return 301 https://\$host\$request_uri;' no arquivo. Redirects HTTP de agora:"
  grep -n "return 30[18]" "$CONF" || echo "    (nenhum)"
  echo "    Nada alterado."
  exit 0
fi

BAK="${CONF}.bak.${STAMP}"
cp "$CONF" "$BAK"
# sed com | como separador: o texto tem / e $, mas não |.
sed -i "s|return 301 https://\$host\$request_uri;|${PARA}|g" "$CONF"
echo "    antes → depois:"
diff "$BAK" "$CONF" || true

if nginx -t 2>/tmp/attra-nginx-test.log; then
  systemctl reload nginx
  echo "    Nginx recarregado ✅"
else
  cp "$BAK" "$CONF"
  echo "!! nginx -t falhou: alteração DESFEITA. Detalhe:"; cat /tmp/attra-nginx-test.log
  exit 1
fi

echo ""
echo "Conferência (cada linha deve ser 301 para https://${DOMAIN}/):"
for u in "http://${DOMAIN}/" "http://www.${DOMAIN}/"; do
  printf '  %-36s → ' "$u"
  curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' "$u"
done
printf '  %-36s → ' "https://www.${DOMAIN}/"
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' "https://www.${DOMAIN}/"
