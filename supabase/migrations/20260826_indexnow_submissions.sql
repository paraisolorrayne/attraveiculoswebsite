-- Estado do IndexNow: última assinatura submetida por URL.
--
-- /api/indexnow/sync (cron de hora em hora) monta a lista de URLs do estoque e
-- do blog com uma "assinatura" (preço, status, data) e compara com esta tabela:
-- só o que mudou é enviado ao api.indexnow.org, e o que sumiu é enviado uma
-- última vez para o motor recrawlar e ver o 404/vendido. Sem a tabela, cada
-- rodada reenviaria tudo — o IndexNow tolera, mas trata como spam.
--
-- Aplicar: psql "$DATABASE_URL" -f supabase/migrations/20260826_indexnow_submissions.sql

CREATE TABLE IF NOT EXISTS public.indexnow_submissions (
    url TEXT PRIMARY KEY,
    assinatura TEXT NOT NULL,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.indexnow_submissions DISABLE ROW LEVEL SECURITY;

-- Na VPS esta migration roda como postgres (sudo -u postgres psql) e o app
-- conecta como attra. Sem isto a tabela fica do postgres e /api/indexnow/sync
-- falha ao ler/gravar. Idempotente: rodar de novo só reafirma o dono.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'attra') THEN
    ALTER TABLE public.indexnow_submissions OWNER TO attra;
  END IF;
END $$;

SELECT 'ok: indexnow_submissions pronta' AS resultado;
