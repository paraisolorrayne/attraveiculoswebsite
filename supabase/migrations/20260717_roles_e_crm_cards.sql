-- Papéis definitivos do admin + visão CRM read-only (populada pelo Fykos).
--
-- Perfis: admin (Lorrayne) · owner (Cris) · operador (Pedro) ·
-- marketing (Eduardo — só o kanban de marketing). O valor legado
-- 'gerente' permanece no enum (Postgres não remove valores) e é tratado
-- como operador pelo código.
--
-- Aplicar com psql (connection string do Session pooler):
--   psql "postgresql://..." -f supabase/migrations/20260717_roles_e_crm_cards.sql

-- 1) Novos papéis (fora de transação — exigência do ALTER TYPE)
ALTER TYPE admin_role ADD VALUE IF NOT EXISTS 'owner';
ALTER TYPE admin_role ADD VALUE IF NOT EXISTS 'operador';
ALTER TYPE admin_role ADD VALUE IF NOT EXISTS 'marketing';

-- 2) Reatribui os usuários atuais
UPDATE admin_users SET role = 'owner'    WHERE email = 'cristiane@attraveiculos.com.br';
UPDATE admin_users SET role = 'operador' WHERE email = 'pedro.spini@attraveiculos.com.br';

-- 3) Cards do CRM — populados exclusivamente pelo Fykos via webhook
--    (sem ação manual no painel; visão somente leitura)
CREATE TABLE IF NOT EXISTS public.crm_cards (
    id TEXT PRIMARY KEY,              -- id do lead no Fykos
    etapa TEXT NOT NULL,              -- etapa do funil (livre, definida pelo Fykos)
    nome TEXT,
    telefone TEXT,
    email TEXT,
    veiculo TEXT,
    valor NUMERIC,
    origem TEXT,
    vendedor TEXT,
    dados JSONB,                      -- payload completo pra campos futuros
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_cards_etapa ON public.crm_cards(etapa);
CREATE INDEX IF NOT EXISTS idx_crm_cards_atualizado ON public.crm_cards(atualizado_em DESC);

-- RLS ligado SEM policies: só o service role (server) lê/escreve
ALTER TABLE public.crm_cards ENABLE ROW LEVEL SECURITY;

SELECT 'ok: papéis + crm_cards' AS resultado;
