#!/usr/bin/env bash
# Gera o post do blog (seg, qua e sex) chamando /api/cron/blog-ai: do Instagram, ou do estoque sem token da Meta.
# Disparado por /etc/cron.d/attra-blog-ai. Log: /var/log/attra-blog.log
set -e
cd /var/www/attra
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
set -a
. /var/www/attra/.env.production
set +a
echo "===== $(date -Iseconds) — blog-ai start ====="
curl -sS --max-time 300 "http://localhost:3000/api/cron/blog-ai?secret=$CRON_SECRET"
echo ""
echo "===== $(date -Iseconds) — blog-ai done ====="
