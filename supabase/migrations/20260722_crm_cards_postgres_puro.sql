-- crm_cards para POSTGRES PURO (pós-migração Supabase → Kysely/pg).
--
-- Substitui a parte de `crm_cards` do 20260717_roles_e_crm_cards.sql para o
-- banco próprio: mantém tabela + índices, mas NÃO liga RLS.
--
-- Por quê sem RLS: no Supabase o `service_role` bypassava o RLS-sem-policy, então
-- o webhook conseguia gravar. No Postgres puro, RLS ligado SEM policy bloqueia
-- TODO acesso de qualquer role que não seja a owner da tabela — o que derrubaria
-- os writes do webhook (Kysely/pg). O controle de acesso aqui é no route
-- (`X-Webhook-Secret` = FYKOS_CRM_SECRET); a tabela é populada só pelo servidor.
--
-- Idempotente. Aplicar com psql na connection string de produção do site:
--   psql "postgresql://..." -f supabase/migrations/20260722_crm_cards_postgres_puro.sql

CREATE TABLE IF NOT EXISTS public.crm_cards (
    id TEXT PRIMARY KEY,              -- id do lead no Fykos
    etapa TEXT NOT NULL,              -- etapa do funil (definida pelo Fykos)
    nome TEXT,
    telefone TEXT,
    email TEXT,
    veiculo TEXT,
    valor NUMERIC,
    origem TEXT,
    vendedor TEXT,
    dados JSONB,                      -- payload completo (extras no modal)
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_cards_etapa ON public.crm_cards(etapa);
CREATE INDEX IF NOT EXISTS idx_crm_cards_atualizado ON public.crm_cards(atualizado_em DESC);

-- Garante RLS DESLIGADO (idempotente): se um dump do Supabase trouxe o RLS ligado,
-- isto o remove; se a tabela é nova, é no-op.
ALTER TABLE public.crm_cards DISABLE ROW LEVEL SECURITY;

SELECT 'ok: crm_cards pronto (postgres puro, sem RLS)' AS resultado;
