-- Último acesso ao admin, separado do último login.
--
-- `last_login_at` só muda quando a pessoa digita a senha, e a sessão do
-- Auth.js se renova sozinha enquanto ela usa o painel — em 29/09 a tela de
-- Usuários mostrava 03/08 para quem entrava todo dia. Esta coluna é gravada a
-- cada visita autenticada (src/lib/auth/ultimo-acesso.ts).
--
-- Idempotente: o deploy-vps.sh roda este arquivo a cada deploy.

ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS ultimo_acesso_em timestamptz;

-- Ponto de partida honesto: até aqui, o que se sabe é o último login.
UPDATE admin_users SET ultimo_acesso_em = last_login_at
 WHERE ultimo_acesso_em IS NULL AND last_login_at IS NOT NULL;
