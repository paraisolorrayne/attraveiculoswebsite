-- Backfill das datas de 1ª classe a partir do JSONB `dados` (cards do contrato
-- v1, que guardava atribuido_em/encerrado_em como extras). Idempotente: só
-- preenche coluna vazia e só quando o valor do JSONB parece ISO-8601.
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/20260728_crm_v2_backfill_datas.sql

UPDATE public.crm_cards
   SET encerrado_em = (dados->>'encerrado_em')::timestamptz
 WHERE encerrado_em IS NULL
   AND dados->>'encerrado_em' ~ '^\d{4}-\d{2}-\d{2}[T ]';

UPDATE public.crm_cards
   SET atribuido_em = (dados->>'atribuido_em')::timestamptz
 WHERE atribuido_em IS NULL
   AND dados->>'atribuido_em' ~ '^\d{4}-\d{2}-\d{2}[T ]';

SELECT
  count(*) FILTER (WHERE encerrado_em IS NOT NULL) AS com_encerrado_em,
  count(*) FILTER (WHERE atribuido_em IS NOT NULL) AS com_atribuido_em
FROM public.crm_cards;
