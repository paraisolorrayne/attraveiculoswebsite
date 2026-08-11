-- Cria `site_settings` no Postgres da VPS. Idempotente. Aplicar na VPS:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/20260811_site_settings_postgres_puro.sql
--
-- POR QUE ESTA MIGRATION EXISTE
--
-- A tabela nunca foi criada em banco nenhum. `20260109_create_site_settings.sql`
-- entrou no repo em 06/02/2026 e não chegou a rodar no Supabase — prova: ela
-- aparece ZERO vezes no dump `public.sql` de 22/07 que originou este Postgres
-- (o dump traz 25 tabelas). Não é caso de migração perdida no caminho da VPS;
-- ela nunca existiu.
--
-- Consequência, silenciosa por desenho: `/api/settings` é público, captura o
-- erro e devolve os defaults, então o site nunca pareceu quebrado. Só o log
-- acusava — 303 blocos de erro `42P01`, milhares de linhas por dia. E os dois
-- interruptores do painel de configurações nunca funcionaram: o PATCH em
-- /api/admin/settings responde 500 e as duas features ficam presas em `true`.
--
-- O QUE MUDOU EM RELAÇÃO À MIGRATION DE 06/02
--
-- Aquela era escrita para o Supabase e não roda aqui:
--   * `updated_by UUID REFERENCES auth.users(id)` — o schema `auth` não existe
--     neste banco. Passa a referenciar `public.admin_users(id)` (uuid), que é
--     quem de fato grava a configuração (a rota manda `admin.id`).
--   * RLS + policies para `anon`/`authenticated` — esses roles não existem
--     aqui. O controle de acesso mora na aplicação: /api/settings é leitura
--     pública por definição, e o PATCH exige admin em `getCurrentAdmin`.
--   * `GRANT ... TO anon, authenticated` — idem.
-- O trigger de `updated_at`, o índice por `key` e as duas linhas padrão
-- continuam iguais.

CREATE TABLE IF NOT EXISTS public.site_settings (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key         TEXT NOT NULL UNIQUE,
    value       JSONB NOT NULL DEFAULT 'true'::jsonb,
    description TEXT,
    updated_by  UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_site_settings_key ON public.site_settings(key);

-- `updated_at` no banco, não na aplicação: a rota já manda o campo, mas uma
-- escrita futura por script ou psql não passaria por ela.
CREATE OR REPLACE FUNCTION public.update_site_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS site_settings_updated_at ON public.site_settings;
CREATE TRIGGER site_settings_updated_at
    BEFORE UPDATE ON public.site_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_site_settings_updated_at();

-- Os dois defaults. `DO NOTHING` para não sobrescrever escolha já feita caso
-- esta migration rode de novo.
INSERT INTO public.site_settings (key, value, description) VALUES
    ('listen_to_content_enabled',   'true', 'Habilita a leitura em voz alta nos artigos do blog'),
    ('engine_sound_section_enabled','true', 'Habilita a seção Som do Motor na página inicial')
ON CONFLICT (key) DO NOTHING;
