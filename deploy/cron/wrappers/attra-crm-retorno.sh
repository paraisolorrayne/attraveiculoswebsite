#!/usr/bin/env bash
set -euo pipefail
cd /var/www/attra
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
set -a
. /var/www/attra/.env.production
set +a
# Integração ainda não habilitada: evita erros periódicos durante o rollout.
if [[ -z "${CRM_RETURN_WEBHOOK_URL:-}" || -z "${CRM_RETURN_WEBHOOK_SECRET:-}" ]]; then exit 0; fi
curl --fail --silent --show-error --max-time 55 -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  "http://localhost:3000/api/cron/crm-retorno"
