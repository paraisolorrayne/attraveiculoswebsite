#!/usr/bin/env bash
# Instala/atualiza os wrappers e crontabs das rotinas automáticas da Attra na VPS
# a partir das cópias versionadas neste repo. Idempotente — pode rodar quantas
# vezes quiser. Valida com `ls` no fim (o passo que faltava quando o wrapper
# de news "sumia" e ninguém percebia).
#
# Uso (na VPS, como root):
#   cd /var/www/attra && sudo bash deploy/cron/install-crons.sh
set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
JOBS=(attra-blog-ai attra-news-ingestion attra-hero-preprocess attra-cleanup-tracking)

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  echo "ERRO: rode como root (sudo) — escreve em /usr/local/bin e /etc/cron.d." >&2
  exit 1
fi

echo "==> Wrappers -> /usr/local/bin (0755)"
for job in "${JOBS[@]}"; do
  install -m 0755 "$SRC/wrappers/$job.sh" "/usr/local/bin/$job.sh"
  echo "    /usr/local/bin/$job.sh"
done

echo "==> Crontabs -> /etc/cron.d (0644, root) "
for job in "${JOBS[@]}"; do
  # /etc/cron.d exige 0644, dono root e SEM indentação nas linhas.
  install -m 0644 -o root -g root "$SRC/cron.d/$job" "/etc/cron.d/$job"
  echo "    /etc/cron.d/$job"
done

# O cron geralmente relê /etc/cron.d sozinho (via mtime); reload por garantia.
systemctl reload cron 2>/dev/null || systemctl reload crond 2>/dev/null || true

echo "==> Validação"
ls -la /usr/local/bin/attra-*.sh
echo
for job in "${JOBS[@]}"; do
  test -x "/usr/local/bin/$job.sh" || { echo "ERRO: /usr/local/bin/$job.sh não executável"; exit 1; }
  test -f "/etc/cron.d/$job"       || { echo "ERRO: /etc/cron.d/$job ausente"; exit 1; }
done
echo "OK — ${#JOBS[@]} wrappers + ${#JOBS[@]} crontabs instalados e validados."
