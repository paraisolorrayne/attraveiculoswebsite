-- Inventory snapshots: cache the last successful AutoConf API response so the
-- site can fall back to it when the upstream API errors (instead of the stale
-- list_vehicle.json bundled at build time).
CREATE TABLE IF NOT EXISTS public.inventory_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL,
    payload JSONB NOT NULL,
    vehicle_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_snapshots_source_created
    ON public.inventory_snapshots(source, created_at DESC);

ALTER TABLE public.inventory_snapshots ENABLE ROW LEVEL SECURITY;

-- Anyone can read (the site renders from the public anon key on SSR)
CREATE POLICY "Anyone can read inventory snapshots"
    ON public.inventory_snapshots FOR SELECT
    TO anon, authenticated
    USING (true);

-- Only the service role writes (writes happen from server-side code with the
-- admin client). No INSERT/UPDATE/DELETE policy for anon/authenticated.

GRANT SELECT ON public.inventory_snapshots TO anon, authenticated;

-- Retention helper: prune snapshots older than 30 days, keeping at least the
-- most recent row per source. Called manually or via scheduled job.
CREATE OR REPLACE FUNCTION public.prune_old_inventory_snapshots()
RETURNS void AS $$
BEGIN
    DELETE FROM public.inventory_snapshots s
    WHERE s.created_at < NOW() - INTERVAL '30 days'
      AND s.id NOT IN (
          SELECT DISTINCT ON (source) id
          FROM public.inventory_snapshots
          ORDER BY source, created_at DESC
      );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
