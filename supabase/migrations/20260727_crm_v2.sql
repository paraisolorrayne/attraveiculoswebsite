-- Contrato v2 do webhook do CRM (Fykos → site): campos de 1ª classe +
-- remapeamento das etapas v1. Idempotente. Aplicar na VPS:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/20260727_crm_v2.sql

ALTER TABLE public.crm_cards
  ADD COLUMN IF NOT EXISTS fonte_evento        TEXT,
  ADD COLUMN IF NOT EXISTS situacao            TEXT,
  ADD COLUMN IF NOT EXISTS andamento           TEXT,
  ADD COLUMN IF NOT EXISTS impedimento         TEXT,
  ADD COLUMN IF NOT EXISTS proxima_acao        TEXT,
  ADD COLUMN IF NOT EXISTS proxima_acao_em     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS motivo_encerramento TEXT,
  ADD COLUMN IF NOT EXISTS veiculo_troca       TEXT,
  ADD COLUMN IF NOT EXISTS atribuido_em        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS primeiro_contato_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS encerrado_em        TIMESTAMPTZ;

-- Remapeamento v1 → v2 (idempotente: os WHERE só pegam valores v1)
UPDATE public.crm_cards SET etapa = 'novo'             WHERE etapa = 'aguardando_vendedor';
UPDATE public.crm_cards SET etapa = 'encerrado_ganho'  WHERE etapa = 'encerrado_sucesso';
UPDATE public.crm_cards
   SET etapa = 'em_atendimento',
       situacao = COALESCE(situacao, 'sem_atualizacao')
 WHERE etapa = 'sem_atualizacao';

SELECT 'ok: crm_cards v2' AS resultado;
