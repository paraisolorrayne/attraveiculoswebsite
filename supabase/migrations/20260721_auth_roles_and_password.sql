-- Fase 5 da migração (auth próprio, Auth.js) — ver docs/MIGRACAO_POSTGRES_PURO.md.
--
-- 1. Expande o enum admin_role com os novos níveis (owner/operador/marketing).
--    admin e gerente já existem (005_admin_users.sql). ADD VALUE é idempotente
--    (IF NOT EXISTS, PG 10+) e não pode ser usado no MESMO statement que já
--    consome o novo valor — aqui só adicionamos, então é seguro.
ALTER TYPE admin_role ADD VALUE IF NOT EXISTS 'owner';
ALTER TYPE admin_role ADD VALUE IF NOT EXISTS 'operador';
ALTER TYPE admin_role ADD VALUE IF NOT EXISTS 'marketing';

-- 2. Coluna de senha própria (bcrypt). Antes as senhas viviam no GoTrue
--    (auth.users.encrypted_password). No cutover, os hashes bcrypt são copiados
--    pra cá casando por admin_users.id = auth.users.id (mesmo UUID).
--    Auth.js (Credentials) valida email+senha contra esta coluna.
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS password_hash TEXT;

COMMENT ON COLUMN admin_users.password_hash IS
  'Hash bcrypt da senha (migrado do GoTrue auth.users.encrypted_password no cutover). Auth.js Credentials valida contra esta coluna.';

-- Níveis pretendidos (atribuir no cutover, ver docs):
--   admin total  → Lorrayne   | owner → Cris  | operador → Pedro Spini
--   marketing    → Eduardo     | gerente → (a definir)
