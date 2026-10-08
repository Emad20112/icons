-- ==============================================================================
-- MIGRATION 003: INDEXES FOR PERFORMANCE, FILTERING & SEARCH READINESS
-- ==============================================================================

-- 1. Assets Table Indexes
CREATE INDEX IF NOT EXISTS idx_assets_slug ON public.assets(slug);
CREATE INDEX IF NOT EXISTS idx_assets_type ON public.assets(type);
CREATE INDEX IF NOT EXISTS idx_assets_status ON public.assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_author_id ON public.assets(author_id);
CREATE INDEX IF NOT EXISTS idx_assets_category_id ON public.assets(category_id);
CREATE INDEX IF NOT EXISTS idx_assets_license_id ON public.assets(license_id);
CREATE INDEX IF NOT EXISTS idx_assets_created_at ON public.assets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assets_featured_status ON public.assets(is_featured, status) WHERE is_featured = TRUE;

-- Composite index for fast published asset exploration
CREATE INDEX IF NOT EXISTS idx_assets_status_type_created 
  ON public.assets(status, type, created_at DESC) 
  WHERE status = 'PUBLISHED';

-- Full Text Search Index readiness (PostgreSQL GIN tsvector for name & description)
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_assets_search_vector ON public.assets USING gin(search_vector);

-- 2. Categories & Tags Indexes
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_active ON public.categories(is_active);

CREATE INDEX IF NOT EXISTS idx_tags_slug ON public.tags(slug);
CREATE INDEX IF NOT EXISTS idx_asset_tags_asset_id ON public.asset_tags(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_tags_tag_id ON public.asset_tags(tag_id);

-- 3. Licenses Indexes
CREATE INDEX IF NOT EXISTS idx_licenses_slug ON public.licenses(slug);

-- 4. Asset Files Indexes
CREATE INDEX IF NOT EXISTS idx_asset_files_asset_id ON public.asset_files(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_files_format ON public.asset_files(format);

-- 5. Downloads & Favorites Indexes
CREATE INDEX IF NOT EXISTS idx_downloads_asset_id ON public.downloads(asset_id);
CREATE INDEX IF NOT EXISTS idx_downloads_user_id ON public.downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_asset_id ON public.favorites(asset_id);

-- 6. Audit Logs Indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
