#!/usr/bin/env bash
# Popula o índice vetorial de veículos (tabela vehicle_embeddings) via
# /api/embeddings/sync. Disparado por /etc/cron.d/attra-embeddings-sync.
# Log: /var/log/attra-embeddings-sync.log
#
# Por que existe: sem ninguém chamando esse endpoint, vehicle_embeddings fica
# vazia e a camada semântica de /api/vehicles/search nunca acha nada — foi a
# causa do endpoint responder lista vazia para qualquer consulta (auditoria
# SEO/GEO de 01/08/2026, item A2).
set -e
cd /var/www/attra
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
set -a
. /var/www/attra/.env.production
set +a
echo "===== $(date -Iseconds) — embeddings-sync start ====="
curl -sS --max-time 300 -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  "http://localhost:3000/api/embeddings/sync"
echo ""
echo "===== $(date -Iseconds) — embeddings-sync done ====="
