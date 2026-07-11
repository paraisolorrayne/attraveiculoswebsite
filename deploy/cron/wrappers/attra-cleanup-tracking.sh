#!/usr/bin/env bash
# Retenção de dados: limpeza diária de tracking/caches >60 dias via
# /api/cron/cleanup-tracking. Disparado por /etc/cron.d/attra-cleanup-tracking.
# Log: /var/log/attra-cleanup-tracking.log
set -e
cd /var/www/attra
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
set -a
. /var/www/attra/.env.production
set +a
echo "===== $(date -Iseconds) — cleanup-tracking start ====="
curl -sS --max-time 300 "http://localhost:3000/api/cron/cleanup-tracking?secret=$CRON_SECRET"
echo ""
echo "===== $(date -Iseconds) — cleanup-tracking done ====="
