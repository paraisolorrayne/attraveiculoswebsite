-- Área da agência (spec 2026-10-02-area-agencia-design.md).
--
-- Agências (Media House primeiro, EB depois) cadastram as próprias campanhas e
-- veem Visitantes e um mini CRM filtrados por elas. A trava entre agências é
-- de banco: o mesmo ID (ou o mesmo nome na mesma plataforma) não pertence a
-- duas — índice único, que vale mesmo com dois cadastros simultâneos.
--
-- Idempotente.

ALTER TYPE admin_role ADD VALUE IF NOT EXISTS 'agencia';

CREATE TABLE IF NOT EXISTS agencias (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome             text NOT NULL,
  slug             text NOT NULL UNIQUE,
  -- Só para SUGERIR campanhas ainda não cadastradas ("detectadas"). Não decide
  -- a qual agência uma visita pertence: quem decide é o cadastro.
  prefixos         text[] NOT NULL DEFAULT '{}',
  utm_medium_marca text[] NOT NULL DEFAULT '{}',
  criado_em        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agencia_campanhas (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agencia_id       uuid NOT NULL REFERENCES agencias(id),
  plataforma       text NOT NULL CHECK (plataforma IN ('google', 'meta', 'webmotors')),
  nome             text NOT NULL CHECK (btrim(nome) <> ''),
  id_externo       text CHECK (id_externo IS NULL OR btrim(id_externo) <> ''),
  destino          text NOT NULL DEFAULT 'site' CHECK (destino IN ('site', 'whatsapp')),
  mensagem_prefixo text,
  inicio           date NOT NULL DEFAULT current_date,
  fim              date,
  criado_por       uuid,
  criado_em        timestamptz NOT NULL DEFAULT now(),
  atualizado_por   uuid,
  atualizado_em    timestamptz NOT NULL DEFAULT now()
);

-- O ID da WebMotors tem letras e chega no utm_id com a caixa que o portal
-- quiser: 'WM-AbC' e 'wm-abc' são a mesma campanha. (O índice com caixa, de
-- uma versão anterior desta migration, só existiu em bancos locais.)
DROP INDEX IF EXISTS agencia_campanhas_id_externo_unico;
CREATE UNIQUE INDEX IF NOT EXISTS agencia_campanhas_id_externo_unico_ci
  ON agencia_campanhas (plataforma, lower(btrim(id_externo))) WHERE id_externo IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS agencia_campanhas_nome_unico
  ON agencia_campanhas (plataforma, lower(btrim(nome)));
CREATE INDEX IF NOT EXISTS agencia_campanhas_agencia_idx ON agencia_campanhas (agencia_id);

ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS agencia_id uuid REFERENCES agencias(id);

INSERT INTO agencias (nome, slug, prefixos, utm_medium_marca)
VALUES ('Media House', 'media-house', '{va-,[va],%5bva%5d}', '{mediahouse}')
ON CONFLICT (slug) DO NOTHING;
