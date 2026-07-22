-- Motivo de retirada do ar por ITEM de campanha (decidido com a Attra, 2026-07-22).
-- Cada veículo/reel pode ser retirado do ar com data + motivo, sem encerrar a
-- campanha inteira. Ver src/app/admin/marketing/components/campaign-modal.tsx.

ALTER TABLE campaign_vehicles ADD COLUMN IF NOT EXISTS ended_date DATE;
ALTER TABLE campaign_vehicles ADD COLUMN IF NOT EXISTS end_reason TEXT;

-- Motivos válidos (NULL = ainda no ar):
--   ganho            → Encerrado por ganho (vendido pelo patrocinado)
--   vendido_externo  → Vendido, mas não pelo patrocinado
--   performance      → Performance (desempenho ruim)
--   despriorizado    → Despriorizado
ALTER TABLE campaign_vehicles DROP CONSTRAINT IF EXISTS campaign_vehicles_end_reason_check;
ALTER TABLE campaign_vehicles ADD CONSTRAINT campaign_vehicles_end_reason_check
  CHECK (end_reason IS NULL OR end_reason IN ('ganho', 'vendido_externo', 'performance', 'despriorizado'));
