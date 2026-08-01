-- =====================================================
-- MIGRATION: permissões por usuário no admin
--
-- Até aqui o acesso vinha só do papel, por uma matriz fixa em código
-- (src/lib/auth/roles.ts). Esta coluna guarda EXCEÇÕES por pessoa, no
-- formato { "<prefixo de rota>": true | false } — `true` concede uma
-- seção que o papel não teria, `false` revoga uma que teria.
--
-- Exemplo: { "/admin/visitors": true } para alguém de Marketing ver a
-- análise de visitantes sem virar Operador nem Admin.
--
-- Vazio ({}) = comportamento idêntico ao de hoje, decidido só pelo papel.
-- A área de gestão de usuários é imune a exceção (garantido em código).
-- =====================================================

ALTER TABLE public.admin_users
    ADD COLUMN IF NOT EXISTS secoes_extras JSONB NOT NULL DEFAULT '{}'::jsonb;
