-- Área da agência: escopo por MARCADOR, sem cadastro de campanha
-- (spec docs/superpowers/specs/2026-10-02-area-agencia-escopo-por-marcador-design.md).
--
-- Roda depois da 20261002_agencias.sql, tenha ela ido ao ar antes ou junto.
-- Idempotente. Na VPS: sudo -u postgres psql -d attra -v ON_ERROR_STOP=1 -f -

-- IDs de campanha que contam como marcador (utm_id). Existe pela PMax da Media
-- House, que desde 29/09 chega sem nome e com utm_medium=cpc, só com o ID.
ALTER TABLE agencias ADD COLUMN IF NOT EXISTS ids_campanha text[] NOT NULL DEFAULT '{}';

-- Marcadores da Media House. Aditivo: acrescenta o que faltar e mantém o que
-- tiver sido incluído depois, então reaplicar não desfaz mudança nenhuma.
UPDATE agencias SET
  prefixos         = ARRAY(SELECT DISTINCT unnest(prefixos || '{va-,[va],%5bva%5d}'::text[]) ORDER BY 1),
  utm_medium_marca = ARRAY(SELECT DISTINCT unnest(utm_medium_marca || '{mediahouse}'::text[]) ORDER BY 1),
  ids_campanha     = ARRAY(SELECT DISTINCT unnest(ids_campanha || '{24295047322,24283864992}'::text[]) ORDER BY 1)
WHERE slug = 'media-house';

-- O cadastro de campanhas deixou de existir: a agência vê o que tem o marcador dela.
DROP TABLE IF EXISTS agencia_campanhas;
