-- Carros que já passaram pelo estoque do site (handoff de SEO de 02/11/2026).
--
-- A ficha de um carro vendido dava 404: quando o carro sai da AutoConf, o site
-- não sabe mais nada dele. Com o registro, a ficha fica no ar por 90 dias com
-- o selo "Vendido", "Quero um igual" e os similares do estoque, e depois faz
-- redirect permanente para /comprar/{marca} (src/lib/veiculos-publicados.ts).
--
-- Só entra aqui o que a listagem da AutoConf mostrou: slug inventado continua
-- 404. `dados` é o Vehicle já mapeado, com até 6 fotos.
--
-- Idempotente. Na VPS: sudo -u postgres psql -d attra -v ON_ERROR_STOP=1 -f -

CREATE TABLE IF NOT EXISTS veiculos_publicados (
  autoconf_id    bigint PRIMARY KEY,
  slug           text NOT NULL,
  marca          text,
  dados          jsonb NOT NULL,
  primeiro_visto timestamptz NOT NULL DEFAULT now(),
  ultimo_visto   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS veiculos_publicados_ultimo_visto_idx
  ON veiculos_publicados (ultimo_visto DESC);

-- Criada pelo postgres (psql na VPS), a tabela seria do postgres e o app, que
-- conecta como attra, falharia ao ler e gravar. Mesmo padrão de 20260826.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'attra') THEN
    ALTER TABLE veiculos_publicados OWNER TO attra;
  END IF;
END $$;
