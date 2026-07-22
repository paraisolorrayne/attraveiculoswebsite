-- Gate de qualidade do recorte de fundo (rembg) no vehicle_hero_asset.
--
-- Contexto: os modelos de remoção de fundo às vezes "comem" partes do carro
-- (lataria escura, rodas, vidro). Agora rodamos DOIS modelos e cruzamos o
-- resultado (ver src/lib/rembg-quality). Se o recorte não atinge a integridade
-- + concordância mínimas, NÃO geramos o no_bg e o hero usa a foto original.
--
-- Esta migração:
--   1. Torna no_bg_* NULLABLE — uma linha "rejected" não tem PNG recortado.
--   2. Adiciona rembg_score (nota 0-100) e rembg_status ('accepted'|'rejected')
--      pra CACHEAR a decisão e o cron não re-billar a mesma foto reprovada.

ALTER TABLE vehicle_hero_asset
    ALTER COLUMN no_bg_storage_path DROP NOT NULL,
    ALTER COLUMN no_bg_public_url   DROP NOT NULL;

ALTER TABLE vehicle_hero_asset
    ADD COLUMN IF NOT EXISTS rembg_score  REAL,
    ADD COLUMN IF NOT EXISTS rembg_status TEXT
        CHECK (rembg_status IN ('accepted', 'rejected'));

-- Linhas antigas (anteriores ao gate) têm no_bg preenchido e status NULL —
-- o código as trata como 'accepted' (fallback retrocompatível).
COMMENT ON COLUMN vehicle_hero_asset.rembg_status IS
    'accepted = no_bg válido; rejected = recorte reprovado no gate, hero usa foto original. NULL = linha legada (tratada como accepted).';
