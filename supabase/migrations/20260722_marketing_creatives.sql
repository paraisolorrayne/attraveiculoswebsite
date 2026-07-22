-- Fila de criativos para publicar no patrocinado (ponte Gerador → board do Eduardo).
-- Postgres puro, sem RLS (acesso controlado nos routes via Auth.js).
--
-- Fluxo: Pedro gera no /admin/gerador-criativos e marca "enviar ao patrocinado"
-- → a imagem (PNG 1080×1920, sem passar por WhatsApp) é salva no disco e vira um
-- card aqui → Eduardo baixa em qualidade cheia direto do board → ao marcar
-- "publicado", o card E a imagem são apagados (sem lixo no banco/disco).
--
-- Aplicar: psql "$DATABASE_URL" -f supabase/migrations/20260722_marketing_creatives.sql

CREATE TABLE IF NOT EXISTS public.marketing_creatives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    image_url TEXT NOT NULL,             -- URL pública (/media/creatives/...)
    vehicle_name TEXT,                   -- veículo do criativo (se informado)
    created_by UUID,                     -- quem gerou (admin_users.id)
    created_by_name TEXT,                -- nome pra exibir no card
    status TEXT NOT NULL DEFAULT 'pendente',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_marketing_creatives_created ON public.marketing_creatives(created_at DESC);
ALTER TABLE public.marketing_creatives DISABLE ROW LEVEL SECURITY;

SELECT 'ok: marketing_creatives pronta (postgres puro, sem RLS)' AS resultado;
