-- Cria as tabelas da newsletter no Postgres da VPS. Idempotente. Aplicar:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/20260811_newsletter_postgres_puro.sql
--
-- MESMA HISTÓRIA DO site_settings
--
-- `20260227_create_banners_newsletter.sql` entrou no repo em 27/02/2026 e nunca
-- rodou: as duas tabelas aparecem ZERO vezes no dump `public.sql` de 22/07 que
-- originou este Postgres. Nunca existiram no Supabase.
--
-- O caso mais caro é `newsletter_subscribers`: `/api/newsletter/subscribe` é
-- rota PÚBLICA. Ninguém tinha visto erro dela no log porque ninguém chegou a se
-- inscrever — quem tentasse, falhava. É captura de lead parada desde fevereiro.
--
-- ESCOLHAS EM RELAÇÃO À MIGRATION DE 27/02
--
--  * Sem RLS e sem policies com `auth.role()`: esse schema não existe no
--    Postgres puro. O acesso já é decidido na aplicação — /api/newsletter/
--    subscribe é público por definição e as rotas de /api/admin exigem admin.
--  * `status` vira TEXT com CHECK em vez de ENUM: o tipo em src/lib/db/types.ts
--    é `Generated<string>`, e um ENUM obrigaria ALTER TYPE a cada status novo.
--    O CHECK guarda os mesmos quatro valores e sai do caminho depois.
--  * `recipient_count` ganha NOT NULL: o tipo é `Generated<number>`, não
--    `number | null` — sem isso o código leria null onde promete número.
--  * `site_banners` e `lead_notes`, que aquela migration também criava, ficam
--    de fora: nenhuma linha do código atual as consulta. Criar tabela que
--    ninguém usa é o começo do próximo desencontro entre schema e código.

CREATE TABLE IF NOT EXISTS public.newsletter_campaigns (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           TEXT NOT NULL,
    subject         TEXT,
    featured_image  TEXT,
    sections        JSONB NOT NULL DEFAULT '[]'::jsonb,
    html_content    TEXT,
    status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'scheduled', 'sent', 'cancelled')),
    scheduled_at    TIMESTAMPTZ,
    sent_at         TIMESTAMPTZ,
    recipient_count INTEGER NOT NULL DEFAULT 0,
    created_by      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           TEXT NOT NULL,
    name            TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    source          TEXT NOT NULL DEFAULT 'manual',
    subscribed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    unsubscribed_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- O índice é ÚNICO porque a rota de inscrição faz upsert por e-mail
-- (`onConflict('email')`): sem a unicidade, o ON CONFLICT não tem em que se
-- apoiar e a inscrição repetida falha em vez de reativar o inscrito.
CREATE UNIQUE INDEX IF NOT EXISTS idx_newsletter_subscribers_email
    ON public.newsletter_subscribers (email);

CREATE INDEX IF NOT EXISTS idx_newsletter_campaigns_status
    ON public.newsletter_campaigns (status);
