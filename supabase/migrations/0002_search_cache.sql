-- Search Results Cache
-- Patents: Never expire (null expires_at)
-- Web/Retail: Storage limit based with 7-day TTL backup

-- ============================================
-- SEARCH CACHE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.search_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    query_hash TEXT NOT NULL UNIQUE,
    search_type TEXT NOT NULL CHECK (search_type IN ('patent', 'web', 'retail')),
    query_params JSONB NOT NULL,
    results JSONB NOT NULL DEFAULT '[]',
    result_count INTEGER DEFAULT 0,
    source_api TEXT NOT NULL,
    expires_at TIMESTAMPTZ, -- NULL = never expires (for patents)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient lookup
CREATE INDEX IF NOT EXISTS idx_search_cache_query_hash ON public.search_cache(query_hash);
CREATE INDEX IF NOT EXISTS idx_search_cache_type ON public.search_cache(search_type);
CREATE INDEX IF NOT EXISTS idx_search_cache_created ON public.search_cache(created_at);
CREATE INDEX IF NOT EXISTS idx_search_cache_expires ON public.search_cache(expires_at) WHERE expires_at IS NOT NULL;

-- Auto-update updated_at
CREATE TRIGGER update_search_cache_updated_at
    BEFORE UPDATE ON public.search_cache
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
-- Search cache is global (not per-user) to maximize cache hits
-- All authenticated users can read, but insert/update via API only

ALTER TABLE public.search_cache ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated users
CREATE POLICY "Authenticated users can read cache" ON public.search_cache
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow service role full access (for API operations)
CREATE POLICY "Service role can manage cache" ON public.search_cache
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- CLEANUP FUNCTION
-- ============================================
-- Function to clean expired entries (run periodically via cron)
CREATE OR REPLACE FUNCTION public.cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.search_cache
    WHERE expires_at IS NOT NULL AND expires_at < NOW();

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
