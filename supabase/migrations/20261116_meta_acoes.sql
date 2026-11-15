-- Registro de quem pausou ou reativou anúncio na Meta pelo painel (15/11/2026).
--
-- O painel passou a escrever na Meta (pausar e reativar anúncio). Cada pedido
-- fica aqui, tenha dado certo ou não: quem, quando, qual carro, quais anúncios
-- e o que a Meta respondeu. Só texto e ids.
--
-- Idempotente. Na VPS: sudo -u postgres psql -d attra -v ON_ERROR_STOP=1 -f -

CREATE TABLE IF NOT EXISTS meta_acoes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id    uuid,
  carro      text NOT NULL,
  acao       text NOT NULL,           -- 'pausar' | 'reativar'
  motivo     text,
  ad_ids     text[] NOT NULL DEFAULT '{}',
  por        text,
  por_nome   text,
  resultado  text NOT NULL,           -- 'ok' ou a mensagem de erro
  criado_em  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS meta_acoes_criado_em_idx ON meta_acoes (criado_em DESC);

-- Criada pelo postgres, a tabela seria do postgres e o app (attra) não gravaria.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'attra') THEN
    ALTER TABLE meta_acoes OWNER TO attra;
  END IF;
END $$;

-- Motivo novo de pausa: troca de criativo (preço mudou, arte nova). O carro
-- continua sendo anunciado, então o card NÃO encerra: fica aberto, marcado, e
-- volta sozinho para "no ar" quando o anúncio novo do mesmo carro entrar.
ALTER TABLE campaign_vehicles DROP CONSTRAINT IF EXISTS campaign_vehicles_end_reason_check;
ALTER TABLE campaign_vehicles ADD CONSTRAINT campaign_vehicles_end_reason_check
  CHECK (end_reason IS NULL OR end_reason IN ('ganho', 'vendido_externo', 'performance', 'despriorizado', 'troca_criativo'));
