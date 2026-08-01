-- =====================================================
-- MIGRATION: confiabilidade do identificador de visitante
--
-- Até 01/08/2026 o `visitor_id` era o hash das características do aparelho,
-- sem componente aleatório: aparelhos iguais geravam o MESMO id e pessoas
-- distintas viravam a mesma linha (um "dispositivo" chegou a 1.705 sessões).
-- Qualquer tentativa de ligar uma PESSOA às visitas dela por esse caminho
-- trazia sessões de estranhos — e com elas a campanha errada.
--
-- O cliente novo gera id aleatório e passa a informar o esquema usado. Esta
-- coluna guarda isso para o servidor saber em quais linhas pode confiar.
-- Linhas existentes ficam com 'aparelho' (não confiáveis) — é a verdade sobre
-- elas, e a atribuição as ignora.
-- =====================================================

ALTER TABLE public.visitor_fingerprints
    ADD COLUMN IF NOT EXISTS origem_id TEXT NOT NULL DEFAULT 'aparelho';

CREATE INDEX IF NOT EXISTS idx_fingerprints_origem_id
    ON public.visitor_fingerprints(origem_id);
