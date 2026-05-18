-- Migration: Schedule Weekly News Ingestion via pg_cron
-- Date: 2026-05-17
-- Purpose: Restaurar o agendamento automático do news-ingestion após a
-- migração Vercel → VPS Interlivre + PM2 (commit 3a3f143).
--
-- O `vercel.json` (que continha o cron do news-ingestion) foi removido.
-- Esta migration recoloca o agendamento dentro do Supabase pg_cron, seguindo
-- exatamente o mesmo padrão da migration 20260420_blog_ai_automation.sql.
--
-- Endpoint chamado: /api/cron/news-ingestion
-- Job de origem:   src/lib/jobs/weekly-news-ingestion.ts
-- Frequência:      Domingo 03:00 UTC (= sábado 00:00 BRT / domingo 00:00 BRT
--                  durante horário padrão). O job interno já normaliza
--                  semanas em America/Sao_Paulo.

-- Extensões necessárias para HTTP cron jobs (idempotente)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================================================
-- Cron schedule
--
-- Supabase hosted Postgres não permite ALTER DATABASE SET, então URL e secret
-- ficam embutidos diretamente no corpo do cron. A tabela cron.job só é
-- acessível pelo service role, o que é aceitável.
--
-- Para rotacionar o CRON_SECRET: re-rode este arquivo (ou apenas o bloco
-- cron.schedule abaixo) com o novo valor — o cron.unschedule() anterior
-- torna isto idempotente.
-- ============================================================================

-- Remove agendamento prévio (idempotência)
DO $$
BEGIN
    PERFORM cron.unschedule('weekly-news-ingestion')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly-news-ingestion');
EXCEPTION WHEN OTHERS THEN
    -- Se o job não existia, ignora.
    NULL;
END $$;

-- Agenda execução semanal: domingo 03:00 UTC (= 00:00 BRT)
SELECT cron.schedule(
    'weekly-news-ingestion',
    '0 3 * * 0',
    $$
    SELECT net.http_post(
        url     := 'https://attraveiculos.com.br/api/cron/news-ingestion',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer 7ebccf573c72d2e69ad542c00a28621a6231dce696f37574b9dd532d2f5407ec'
        ),
        body    := '{}'::jsonb
    ) AS request_id;
    $$
);

-- Verificação manual pós-deploy:
--   SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'weekly-news-ingestion';
