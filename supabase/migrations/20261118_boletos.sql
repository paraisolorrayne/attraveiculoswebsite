-- Boletos dos clientes, cadastrados pelo financeiro (18/11/2026).
--
-- A tela de cobranças existiu até 11/07/2026 dentro do CRM antigo e saiu junto
-- com ele (migration 20260711_drop_removed_modules). Volta sozinha, sem o CRM:
-- o boleto guarda o nome e o telefone da pessoa, que é o que vem na planilha
-- do financeiro, em vez de depender de um cadastro de clientes.
--
-- "Vencido" não é coluna: é o boleto aberto cuja data já passou. Gravado, o
-- status envelhecia sozinho e mentia no dia seguinte.
--
-- Idempotente. Na VPS: sudo -u postgres psql -d attra -v ON_ERROR_STOP=1 -f -

CREATE TABLE IF NOT EXISTS boletos (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome               text NOT NULL,
  -- Só dígitos, com DDD e sem o 55: 34999990000.
  telefone           text NOT NULL,
  email              text,
  vencimento         date NOT NULL,
  valor              numeric(12,2),
  descricao          text,
  -- A que o boleto se refere, como vem na planilha do financeiro: o carro, a
  -- placa e, quando a linha é um intervalo de parcelas, qual parcela de quantas.
  carro              text,
  placa              text,
  parcela            integer,
  parcelas           integer,
  status             text NOT NULL DEFAULT 'aberto'
                     CHECK (status IN ('aberto', 'em_negociacao', 'pago', 'cancelado')),
  pago_em            date,
  -- 'manual' (um por vez) ou 'planilha' (em lote; lote_id junta os da mesma planilha).
  origem             text NOT NULL DEFAULT 'manual',
  lote_id            uuid,
  lembretes          integer NOT NULL DEFAULT 0,
  ultimo_lembrete_em timestamptz,
  -- O que o Fykos devolve da conversa com o cliente (agente Ângela):
  -- a data em que ele disse que paga, o comprovante que mandou (só o link,
  -- nunca o arquivo) e o motivo quando o lembrete não foi entregue.
  promessa_em        date,
  comprovante_em     timestamptz,
  comprovante_url    text,
  falha_envio        text,
  criado_por         text,
  criado_por_nome    text,
  criado_em          timestamptz NOT NULL DEFAULT now(),
  atualizado_em      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS boletos_vencimento_idx ON boletos (vencimento);
CREATE INDEX IF NOT EXISTS boletos_abertos_idx ON boletos (vencimento) WHERE status IN ('aberto', 'em_negociacao');
CREATE INDEX IF NOT EXISTS boletos_telefone_idx ON boletos (telefone);

-- O que foi feito em cada boleto: cadastro, lembrete, contato, pagamento.
CREATE TABLE IF NOT EXISTS boleto_eventos (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boleto_id  uuid NOT NULL REFERENCES boletos(id) ON DELETE CASCADE,
  tipo       text NOT NULL,
  descricao  text,
  por        text,
  por_nome   text,
  criado_em  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS boleto_eventos_boleto_idx ON boleto_eventos (boleto_id, criado_em DESC);
-- O id do evento que veio do Fykos: o mesmo evento entregue duas vezes entra uma vez só.
ALTER TABLE boleto_eventos ADD COLUMN IF NOT EXISTS id_externo text;
CREATE UNIQUE INDEX IF NOT EXISTS boleto_eventos_id_externo_key ON boleto_eventos (id_externo) WHERE id_externo IS NOT NULL;

-- Fila do que o painel avisa ao Fykos (boleto cadastrado, pago, cancelado...).
-- O aviso entra aqui na mesma transação da mudança e sai em ordem; se o Fykos
-- estiver fora do ar, fica na fila e o cron tenta de novo. Mesmo desenho de
-- crm_eventos_saida (20260908).
CREATE TABLE IF NOT EXISTS boleto_eventos_saida (
  sequencia            bigserial PRIMARY KEY,
  id                   uuid NOT NULL UNIQUE,
  evento               text NOT NULL,
  corpo                text NOT NULL,
  criado_em            timestamptz NOT NULL DEFAULT now(),
  entregue_em          timestamptz,
  tentativas           integer NOT NULL DEFAULT 0,
  proxima_tentativa_em timestamptz NOT NULL DEFAULT now(),
  ultimo_erro          text
);
CREATE INDEX IF NOT EXISTS boleto_eventos_saida_pendentes ON boleto_eventos_saida (sequencia) WHERE entregue_em IS NULL;

-- Criadas pelo postgres, as tabelas seriam do postgres e o app (attra) não leria.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'attra') THEN
    ALTER TABLE boletos OWNER TO attra;
    ALTER TABLE boleto_eventos OWNER TO attra;
    ALTER TABLE boleto_eventos_saida OWNER TO attra;
    ALTER SEQUENCE boleto_eventos_saida_sequencia_seq OWNER TO attra;
  END IF;
END $$;
