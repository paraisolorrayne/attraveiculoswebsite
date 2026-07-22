#!/usr/bin/env bash
set -euo pipefail
# ============================================================================
# Fase 3 (storage) — Baixa os ARQUIVOS de mídia do Supabase pro disco da VPS.
# RODE NA VPS, DEPOIS do migrate-data.sh (que já reescreveu as URLs no banco).
#
# Estratégia: lê do banco todas as URLs de mídia (já no domínio novo), reconstrói
# a URL pública ANTIGA do Supabase (que continua servindo os arquivos enquanto o
# projeto existe) e baixa cada uma pra ${MEDIA_ROOT}/<bucket>/<path>. Só baixa o
# que o site realmente referencia (colunas + imagens inline no conteúdo do blog).
#
# Uso:
#   export DATABASE_URL='postgresql://attra:SENHA@localhost:5432/attra'
#   export SUPABASE_REF='vtqcoxcclpimzlikpmzs'
#   # export MEDIA_ROOT=/var/www/attra-media         # opcional (default)
#   # export MEDIA_PUBLIC_URL=https://attraveiculos.com.br/media   # opcional
#   bash deploy/migrate-storage-files.sh
# ============================================================================

: "${DATABASE_URL:?defina DATABASE_URL (postgres local da VPS)}"
: "${SUPABASE_REF:?defina SUPABASE_REF (ex.: vtqcoxcclpimzlikpmzs)}"
MEDIA_ROOT="${MEDIA_ROOT:-/var/www/attra-media}"
NEW_PREFIX="${MEDIA_PUBLIC_URL:-https://attraveiculos.com.br/media}/"
OLD_PREFIX="https://${SUPABASE_REF}.supabase.co/storage/v1/object/public/"
URLS_FILE="$(mktemp)"

echo "==> Coletando URLs de mídia do banco (colunas + inline no blog)..."
# Junta os campos de mídia num blob e extrai as URLs no domínio novo.
psql "$DATABASE_URL" -tAc "
  SELECT sound_file_url      FROM vehicle_sounds
  UNION ALL SELECT no_bg_public_url     FROM vehicle_hero_asset
  UNION ALL SELECT composite_public_url FROM vehicle_hero_asset
  UNION ALL SELECT featured_image       FROM dual_blog_posts
  UNION ALL SELECT content              FROM dual_blog_posts
" | grep -oE "${NEW_PREFIX//./\\.}[^[:space:]\"'\\<>)]+" | sort -u > "$URLS_FILE" || true

total=$(wc -l < "$URLS_FILE")
echo "    $total arquivo(s) referenciado(s)."
[ "$total" -eq 0 ] && { echo "Nada a baixar."; rm -f "$URLS_FILE"; exit 0; }

ok=0; fail=0; skip=0
while IFS= read -r url; do
  [ -z "$url" ] && continue
  rel="${url#"$NEW_PREFIX"}"          # <bucket>/<path>
  dest="$MEDIA_ROOT/$rel"
  old="$OLD_PREFIX$rel"
  if [ -s "$dest" ]; then skip=$((skip+1)); continue; fi
  mkdir -p "$(dirname "$dest")"
  if curl -fsSL --max-time 60 "$old" -o "$dest"; then
    ok=$((ok+1))
  else
    fail=$((fail+1)); rm -f "$dest"
    echo "    FALHOU: $old"
  fi
done < "$URLS_FILE"

rm -f "$URLS_FILE"
echo ""
echo "==> Concluído: $ok baixado(s), $skip já existia(m), $fail falha(s)."
echo "    Arquivos em: $MEDIA_ROOT/"
[ "$fail" -gt 0 ] && echo "    (revise as falhas acima — podem ser arquivos órfãos já removidos do bucket)"
# Ajuste de dono pra o Nginx/PM2 servirem (troque www-data se seu Nginx usar outro user):
chown -R www-data:www-data "$MEDIA_ROOT" 2>/dev/null || true
exit 0
