-- Adiciona colunas pro composite final gerado por Flux Fill Pro
-- (inpainting do background mantendo o carro original intacto).
--
-- Pipeline:
--   1. Foto original → BRIA RMBG-2.0 → no_bg_public_url (já existente)
--   2. no_bg + mask invertida → Flux Fill Pro → composite_public_url
--
-- Coluna composite_* é NULLABLE — pode ser populada em momento diferente
-- do rembg (etapas separadas) e o componente cai pro fallback no_bg+bg
-- fixo quando composite ainda não está pronto.
--
-- Invalidação de cache do composite é MANUAL via SQL:
--   UPDATE vehicle_hero_asset SET composite_public_url = NULL;
-- (cron vai detectar e regenerar — alinhado com a decisão do usuário).

ALTER TABLE vehicle_hero_asset
  ADD COLUMN IF NOT EXISTS composite_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS composite_public_url   TEXT,
  ADD COLUMN IF NOT EXISTS composite_generated_at TIMESTAMPTZ;

-- Index pra buscar veículos que ainda não têm composite gerado
-- (útil pra script de preprocess saber quais faltam).
CREATE INDEX IF NOT EXISTS idx_vehicle_hero_asset_pending_composite
  ON vehicle_hero_asset (vehicle_id)
  WHERE composite_public_url IS NULL;
