-- Data retention cleanup for tracking + IP cache tables (>60 days).
-- Função idempotente que pode ser chamada manualmente, por agendador externo
-- (cron na VPS, GitHub Action) ou via pg_cron quando disponível.
--
-- Tabelas no escopo (confirmadas com o time):
--   - visitor_page_views    (viewed_at)
--   - visitor_sessions      (started_at)
--   - identity_events       (created_at)
--   - ip_geolocation_cache  (cached_at)
--   - ip_company_cache      (cached_at)
--
-- Tabelas explicitamente FORA do escopo: leads, conversion_events,
-- dual_blog_posts, marketing_campaigns, newsletter_subscribers — esses são
-- dados de negócio e não devem ser apagados por retenção.

CREATE OR REPLACE FUNCTION public.cleanup_old_tracking_data(
    retention_days INTEGER DEFAULT 60
)
RETURNS TABLE (
    table_name TEXT,
    rows_deleted BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    cutoff_date TIMESTAMPTZ := NOW() - (retention_days || ' days')::INTERVAL;
    v_count BIGINT;
BEGIN
    -- Order matters: page_views referencia sessions (FK CASCADE), mas deletar
    -- explicitamente é mais rápido e gera diagnóstico por tabela.
    DELETE FROM public.visitor_page_views WHERE viewed_at < cutoff_date;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    table_name := 'visitor_page_views'; rows_deleted := v_count; RETURN NEXT;

    DELETE FROM public.visitor_sessions WHERE started_at < cutoff_date;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    table_name := 'visitor_sessions'; rows_deleted := v_count; RETURN NEXT;

    DELETE FROM public.identity_events WHERE created_at < cutoff_date;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    table_name := 'identity_events'; rows_deleted := v_count; RETURN NEXT;

    DELETE FROM public.ip_geolocation_cache WHERE cached_at < cutoff_date;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    table_name := 'ip_geolocation_cache'; rows_deleted := v_count; RETURN NEXT;

    DELETE FROM public.ip_company_cache WHERE cached_at < cutoff_date;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    table_name := 'ip_company_cache'; rows_deleted := v_count; RETURN NEXT;

    RETURN;
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_tracking_data IS
    'Remove dados de tracking/cache mais antigos que retention_days (default 60). Retorna contagem por tabela.';

-- Service role pode executar para automações server-side
GRANT EXECUTE ON FUNCTION public.cleanup_old_tracking_data(INTEGER) TO service_role;

-- Agendamento via pg_cron (Supabase Cloud expõe a extensão sob o schema
-- 'cron'). O DO block torna a migration tolerante a ambientes sem pg_cron:
-- se a extensão não existir, a função fica disponível para chamada manual.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
        CREATE EXTENSION IF NOT EXISTS pg_cron;

        -- Remove agendamento anterior (idempotência) antes de recriar
        PERFORM cron.unschedule('cleanup-old-tracking-data')
        WHERE EXISTS (
            SELECT 1 FROM cron.job WHERE jobname = 'cleanup-old-tracking-data'
        );

        PERFORM cron.schedule(
            'cleanup-old-tracking-data',
            '0 3 * * *', -- todo dia às 03:00 UTC (00:00 BRT)
            $cron$ SELECT public.cleanup_old_tracking_data(60); $cron$
        );
    END IF;
END $$;
