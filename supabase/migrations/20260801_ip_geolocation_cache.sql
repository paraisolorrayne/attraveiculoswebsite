-- =====================================================
-- MIGRATION: tabela ip_geolocation_cache
--
-- Terceira peça órfã da 20260226_tracking_improvements.sql, que nunca rodou
-- em produção (é da era Supabase e carrega políticas RLS e função plpgsql
-- que não valem mais depois da migração para Postgres puro).
--
-- Sem a tabela, /api/geolocation falha na consulta ao cache a cada visita e
-- registra erro no log; o código segue para as APIs externas, então a cidade
-- continua sendo resolvida (99% das sessões têm cidade) — o que se perde é o
-- cache: cada visita repete a chamada externa, com latência e limite de uso.
--
-- Aqui vai só a tabela e o índice de expiração; RLS e GRANTs do arquivo
-- original pertencem à arquitetura antiga (papel `authenticated` do Supabase)
-- e não se aplicam: a aplicação conecta como dono do banco.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.ip_geolocation_cache (
    ip_address INET PRIMARY KEY,
    country_code TEXT,
    region TEXT,
    city TEXT,
    cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days')
);

-- A leitura filtra por expires_at > now(); o índice evita varrer a tabela
-- inteira conforme ela cresce.
CREATE INDEX IF NOT EXISTS idx_ip_geolocation_cache_expires
    ON public.ip_geolocation_cache(expires_at);
