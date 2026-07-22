-- Motivo de retirada do ar por ITEM de campanha (decidido com a Attra, 2026-07-22).
-- Cada veículo/reel pode ser retirado do ar com data + motivo, sem encerrar a
-- campanha inteira. Ver src/app/admin/marketing/components/campaign-modal.tsx.
--
-- NOTA: no cutover, `campaign_vehicles` não existia no Postgres da VPS (a migration
-- 20260212 não tinha sido aplicada na prod do Supabase, então não veio no dump).
-- Por isso este arquivo CRIA a tabela se faltar (postgres puro, sem RLS) e depois
-- adiciona as colunas — é idempotente e serve tanto pra base nova quanto existente.

CREATE TABLE IF NOT EXISTS public.campaign_vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
    vehicle_name TEXT NOT NULL,
    added_date DATE,
    notes TEXT,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_campaign_vehicles_campaign
  ON public.campaign_vehicles(campaign_id, display_order);
-- Controle de acesso é no route (Auth.js) — sem RLS no postgres puro.
ALTER TABLE public.campaign_vehicles DISABLE ROW LEVEL SECURITY;

ALTER TABLE public.campaign_vehicles ADD COLUMN IF NOT EXISTS ended_date DATE;
ALTER TABLE public.campaign_vehicles ADD COLUMN IF NOT EXISTS end_reason TEXT;

-- Motivos válidos (NULL = ainda no ar):
--   ganho            → Encerrado por ganho (vendido pelo patrocinado)
--   vendido_externo  → Vendido, mas não pelo patrocinado
--   performance      → Performance (desempenho ruim)
--   despriorizado    → Despriorizado
ALTER TABLE public.campaign_vehicles DROP CONSTRAINT IF EXISTS campaign_vehicles_end_reason_check;
ALTER TABLE public.campaign_vehicles ADD CONSTRAINT campaign_vehicles_end_reason_check
  CHECK (end_reason IS NULL OR end_reason IN ('ganho', 'vendido_externo', 'performance', 'despriorizado'));

SELECT 'ok: campaign_vehicles pronta (postgres puro, com ended_date/end_reason)' AS resultado;
