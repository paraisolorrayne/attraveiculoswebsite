#!/usr/bin/env bash
# Avisa o IndexNow (Bing → Copilot e busca do ChatGPT) do que mudou no estoque
# e no blog, via /api/indexnow/sync. Disparado por /etc/cron.d/attra-indexnow-sync.
# Log: /var/log/attra-indexnow-sync.log
#
# Por que existe: sem o ping, um carro vendido continua sendo citado com preço
# por assistentes de IA até o Bingbot decidir voltar (avaliação AEO, 26/08/2026).
# Precisa de INDEXNOW_KEY no .env.production; sem ela a rota responde
# `desligado: true` e não envia nada.
set -e
cd /var/www/attra
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
set -a
. /var/www/attra/.env.production
set +a
echo "===== $(date -Iseconds) — indexnow-sync start ====="
curl -sS --max-time 120 -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  "http://localhost:3000/api/indexnow/sync"
echo ""
echo "===== $(date -Iseconds) — indexnow-sync done ====="
