-- Gerador de Criativos passa a gerar DOIS arquivos por peça — Stories 1080×1920
-- e Feed 1080×1350 (4:5, o formato que a Meta usa no feed de anúncios) — e envia
-- os dois ao board do Marketing automaticamente. Cada um vira um card próprio;
-- esta coluna diz qual é qual, para o board mostrar a proporção certa e o
-- Eduardo baixar o arquivo certo para cada posicionamento.
--
-- DEFAULT 'stories': tudo que já estava na fila era Stories (único formato até aqui).
--
-- Aplicar: psql "$DATABASE_URL" -f supabase/migrations/20260824_marketing_creatives_format.sql

ALTER TABLE public.marketing_creatives
    ADD COLUMN IF NOT EXISTS format TEXT NOT NULL DEFAULT 'stories';

SELECT 'ok: marketing_creatives.format (stories | feed)' AS resultado;
