-- Carros que já tiveram criativo (tela inicial do admin por perfil, 14/11/2026).
--
-- A tela inicial de quem faz criativos mostra os carros novos do estoque que
-- ainda não têm peça. A fila `marketing_creatives` não serve para saber isso:
-- ela não guarda o id do carro (só um nome digitável) e a linha é apagada
-- quando a peça é publicada. Aqui fica um registro permanente, uma linha por
-- carro: o gerador grava quando a peça é exportada com um carro escolhido na
-- busca do estoque (origem 'gerador'), e o botão "Já tem" da tela inicial
-- grava à mão (origem 'manual') para a peça feita fora do gerador.
--
-- Idempotente. Na VPS: sudo -u postgres psql -d attra -v ON_ERROR_STOP=1 -f -

CREATE TABLE IF NOT EXISTS criativos_gerados (
  autoconf_id     bigint PRIMARY KEY,
  nome            text,
  origem          text NOT NULL DEFAULT 'gerador',
  pecas           integer NOT NULL DEFAULT 1,
  criado_por      text,
  criado_por_nome text,
  primeiro_em     timestamptz NOT NULL DEFAULT now(),
  ultimo_em       timestamptz NOT NULL DEFAULT now()
);

-- Criada pelo postgres (psql na VPS), a tabela seria do postgres e o app, que
-- conecta como attra, falharia ao ler e gravar. Mesmo padrão de 20261102.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'attra') THEN
    ALTER TABLE criativos_gerados OWNER TO attra;
  END IF;
END $$;
