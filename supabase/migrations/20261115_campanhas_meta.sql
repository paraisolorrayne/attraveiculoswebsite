-- Campanhas do quadro de Marketing ligadas à Meta (14/11/2026).
--
-- O quadro era preenchido à mão. Agora os anúncios no ar na conta da Meta
-- entram sozinhos: cada campanha da Meta vira uma campanha do quadro e cada
-- carro anunciado vira um card. Só referência: ids e números, nenhuma imagem.
--
--   marketing_campaigns.meta_campaign_id  id da campanha na Meta
--   campaign_vehicles.meta_ad_ids         ids dos anúncios daquele carro (um
--                                         carro pode ter vídeo e carrossel)
--   campaign_vehicles.meta_no_ar          algum desses anúncios está ativo?
--   campaign_vehicles.meta_gasto_30d      gasto somado dos últimos 30 dias
--
-- Idempotente. Na VPS: sudo -u postgres psql -d attra -v ON_ERROR_STOP=1 -f -

ALTER TABLE marketing_campaigns ADD COLUMN IF NOT EXISTS meta_campaign_id text;
CREATE UNIQUE INDEX IF NOT EXISTS marketing_campaigns_meta_campaign_id_key
  ON marketing_campaigns (meta_campaign_id) WHERE meta_campaign_id IS NOT NULL;

ALTER TABLE campaign_vehicles ADD COLUMN IF NOT EXISTS meta_ad_ids text[] NOT NULL DEFAULT '{}';
ALTER TABLE campaign_vehicles ADD COLUMN IF NOT EXISTS meta_no_ar boolean;
ALTER TABLE campaign_vehicles ADD COLUMN IF NOT EXISTS meta_gasto_30d numeric(12,2);
