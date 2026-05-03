-- Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- Table: vehicle_embeddings
-- Stores Jina embedding vectors for each vehicle, enabling semantic search.
CREATE TABLE IF NOT EXISTS vehicle_embeddings (
    id            BIGSERIAL PRIMARY KEY,
    vehicle_id    INTEGER   NOT NULL UNIQUE,
    vehicle_slug  TEXT      NOT NULL,
    passage_text  TEXT      NOT NULL,
    embedding     VECTOR(1024) NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast nearest-neighbour queries (HNSW — no training data required,
-- works correctly from the first insert unlike IVFFlat)
CREATE INDEX IF NOT EXISTS idx_vehicle_embeddings_hnsw
    ON vehicle_embeddings
    USING hnsw (embedding vector_cosine_ops);

-- Index by vehicle_id for upsert/lookup
CREATE INDEX IF NOT EXISTS idx_vehicle_embeddings_vehicle_id
    ON vehicle_embeddings (vehicle_id);

-- RLS: allow anonymous read for semantic search; restrict write to service_role
ALTER TABLE vehicle_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read_embeddings"  ON vehicle_embeddings FOR SELECT TO anon        USING (true);
CREATE POLICY "auth_read_embeddings"  ON vehicle_embeddings FOR SELECT TO authenticated USING (true);
CREATE POLICY "service_write_embeddings" ON vehicle_embeddings FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Function: match_vehicles
-- Accepts a query embedding and returns the nearest vehicles.
CREATE OR REPLACE FUNCTION match_vehicles(
    query_embedding VECTOR(1024),
    match_count     INT DEFAULT 20,
    match_threshold FLOAT DEFAULT 0.3
)
RETURNS TABLE (
    vehicle_id    INTEGER,
    vehicle_slug  TEXT,
    passage_text  TEXT,
    similarity    FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ve.vehicle_id,
        ve.vehicle_slug,
        ve.passage_text,
        1 - (ve.embedding <=> query_embedding) AS similarity
    FROM vehicle_embeddings ve
    WHERE 1 - (ve.embedding <=> query_embedding) > match_threshold
    ORDER BY ve.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
