-- Alteração e evento de retorno são gravados na mesma transação.
-- Sem FK: a auditoria e as entregas sobrevivem à remoção do card pelo emissor.
CREATE TABLE IF NOT EXISTS crm_eventos_saida (
  sequencia BIGSERIAL PRIMARY KEY,
  id UUID NOT NULL UNIQUE,
  card_id TEXT NOT NULL,
  corpo TEXT NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  entregue_em TIMESTAMPTZ,
  tentativas INTEGER NOT NULL DEFAULT 0,
  proxima_tentativa_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  ultimo_erro TEXT
);
CREATE INDEX IF NOT EXISTS crm_eventos_saida_pendentes
  ON crm_eventos_saida (proxima_tentativa_em, sequencia) WHERE entregue_em IS NULL;
CREATE INDEX IF NOT EXISTS crm_eventos_saida_card_pendentes
  ON crm_eventos_saida (card_id, sequencia) WHERE entregue_em IS NULL;
