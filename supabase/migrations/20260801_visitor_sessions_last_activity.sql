-- =====================================================
-- MIGRATION: last_activity_at em visitor_sessions
--
-- Por que existe: a coluna foi declarada em 20260226_tracking_improvements.sql,
-- mas aquela migration nunca chegou a rodar em produção (é da era Supabase e
-- traz políticas RLS + função plpgsql que não valem mais depois da migração
-- para Postgres puro). O código de tracking do heartbeat exige a coluna, e sem
-- ela /api/tracking/page-time falhava com "column last_activity_at does not
-- exist" — ou seja, duração de sessão continuava impossível de calcular.
--
-- Esta migration aplica SÓ a coluna e o índice: o resto daquele arquivo
-- (policies para o papel `authenticated`, update_session_heartbeat) pertence à
-- arquitetura antiga e não deve ser executado.
--
-- Cuidado deliberado com o valor das linhas existentes: ADD COLUMN com
-- DEFAULT NOW() carimbaria o instante do ALTER em todas as 16 mil sessões
-- antigas, e elas passariam a parecer "ativas agora". A varredura de sessões
-- ociosas (src/app/api/tracking/session/route.ts) fecha sessão cujo
-- last_activity_at > started_at, então isso encerraria em massa visitas que
-- nunca bateram heartbeat. Por isso as linhas existentes recebem started_at,
-- que é exatamente o estado "nunca pingou" que o código espera encontrar.
-- =====================================================

ALTER TABLE public.visitor_sessions
    ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;

UPDATE public.visitor_sessions
    SET last_activity_at = started_at
    WHERE last_activity_at IS NULL;

ALTER TABLE public.visitor_sessions
    ALTER COLUMN last_activity_at SET DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_sessions_last_activity
    ON public.visitor_sessions(last_activity_at);
