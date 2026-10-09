-- ==============================================================================
-- MIGRATION 001: INITIAL SCHEMA FOR DIGITAL ASSETS PLATFORM (PHASE 0)
-- ==============================================================================

-- 1. Custom Types & Enums
DO $$ BEGIN
  CREATE TYPE asset_type_enum AS ENUM ('ICON', 'FONT', 'ILLUSTRATION', 'LOGO', 'TEMPLATE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE asset_status_enum AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'ARCHIVED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE asset_file_format_enum AS ENUM ('SVG', 'PNG', 'WEBP', 'ICO', 'TTF', 'OTF', 'WOFF', 'WOFF2');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE user_role_enum AS ENUM ('USER', 'ADMIN');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Profiles Table (Linked 1:1 with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  display_name VARCHAR(100),
  avatar_url TEXT,
  role user_role_enum NOT NULL DEFAULT 'USER',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Categories Table (Dynamic, not hardcoded)
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(80) NOT NULL UNIQUE,
  slug VARCHAR(80) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Licenses Table
CREATE TABLE IF NOT EXISTS public.licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  url TEXT,
  commercial_use BOOLEAN NOT NULL DEFAULT TRUE,
  redistribution BOOLEAN NOT NULL DEFAULT FALSE,
  modification BOOLEAN NOT NULL DEFAULT TRUE,
  attribution_required BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Tags Table
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  slug VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Core Assets Table (Polymorphic: Icon, Font, Illustration, Logo, Template)
CREATE TABLE IF NOT EXISTS public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type asset_type_enum NOT NULL DEFAULT 'ICON',
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(140) NOT NULL UNIQUE,
  description TEXT,
  status asset_status_enum NOT NULL DEFAULT 'DRAFT',
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  license_id UUID REFERENCES public.licenses(id) ON DELETE RESTRICT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  download_count INTEGER NOT NULL DEFAULT 0,
  favorite_count INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Critical Business Rule: A PUBLISHED asset MUST have an assigned license
  CONSTRAINT chk_published_asset_must_have_license 
    CHECK (status != 'PUBLISHED' OR license_id IS NOT NULL)
);

-- 7. Asset Files Table (Decoupled binary storage metadata)
CREATE TABLE IF NOT EXISTS public.asset_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  format asset_file_format_enum NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL CHECK (file_size > 0),
  mime_type VARCHAR(100) NOT NULL,
  width INTEGER CHECK (width IS NULL OR width > 0),
  height INTEGER CHECK (height IS NULL OR height > 0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_asset_file_format UNIQUE (asset_id, format)
);

-- 8. Asset Tags (Many-to-Many)
CREATE TABLE IF NOT EXISTS public.asset_tags (
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (asset_id, tag_id)
);

-- 9. Downloads Telemetry Table
CREATE TABLE IF NOT EXISTS public.downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  format asset_file_format_enum NOT NULL,
  ip_hash VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Favorites Table
CREATE TABLE IF NOT EXISTS public.favorites (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, asset_id)
);

-- 11. Immutable Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action VARCHAR(80) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(100) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Triggers for automatic updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_assets_updated_at ON public.assets;
CREATE TRIGGER trg_assets_updated_at
  BEFORE UPDATE ON public.assets
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Trigger for Profile Creation on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    'USER'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
-- ==============================================================================
-- MIGRATION 002: ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- 1. Helper function to check if the current user is an Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 2. Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 3. PROFILES POLICIES
-- ------------------------------------------------------------------------------
-- Anyone can view profiles (public directory / author credits)
CREATE POLICY "Profiles are readable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

-- Users can update only their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id 
    AND (role = (SELECT role FROM public.profiles WHERE id = auth.uid()) OR public.is_admin())
  );

-- Admins can update any profile
CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 4. CATEGORIES, LICENSES, TAGS POLICIES
-- ------------------------------------------------------------------------------
-- Public Read
CREATE POLICY "Public read active categories"
  ON public.categories FOR SELECT
  USING (is_active = true OR public.is_admin());

CREATE POLICY "Public read licenses"
  ON public.licenses FOR SELECT
  USING (true);

CREATE POLICY "Public read tags"
  ON public.tags FOR SELECT
  USING (true);

-- Admin Mutations
CREATE POLICY "Admins manage categories"
  ON public.categories FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins manage licenses"
  ON public.licenses FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins manage tags"
  ON public.tags FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 5. ASSETS POLICIES
-- ------------------------------------------------------------------------------
-- SELECT: Published assets are public; drafts/reviews visible to author; admins see all
CREATE POLICY "Public read published assets"
  ON public.assets FOR SELECT
  USING (
    status = 'PUBLISHED'
    OR (auth.uid() IS NOT NULL AND author_id = auth.uid())
    OR public.is_admin()
  );

-- INSERT: Authenticated users can create drafts; Admins can create in any state
CREATE POLICY "Authenticated users can create draft assets"
  ON public.assets FOR INSERT
  TO authenticated
  WITH CHECK (
    (author_id = auth.uid() AND status = 'DRAFT')
    OR public.is_admin()
  );

-- UPDATE: Authors can edit own drafts/pending; Admins can edit any and change status
CREATE POLICY "Authors can update own non-published assets"
  ON public.assets FOR UPDATE
  TO authenticated
  USING (
    (author_id = auth.uid() AND status IN ('DRAFT', 'PENDING_REVIEW'))
    OR public.is_admin()
  )
  WITH CHECK (
    (author_id = auth.uid() AND status IN ('DRAFT', 'PENDING_REVIEW'))
    OR public.is_admin()
  );

-- DELETE: Authors can delete own drafts; Admins can delete any asset
CREATE POLICY "Authors can delete own draft assets"
  ON public.assets FOR DELETE
  TO authenticated
  USING (
    (author_id = auth.uid() AND status = 'DRAFT')
    OR public.is_admin()
  );

-- ------------------------------------------------------------------------------
-- 6. ASSET FILES & ASSET TAGS POLICIES
-- ------------------------------------------------------------------------------
-- Read files if parent asset is accessible
CREATE POLICY "Read asset files if asset is accessible"
  ON public.asset_files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.assets a
      WHERE a.id = asset_files.asset_id
      AND (a.status = 'PUBLISHED' OR a.author_id = auth.uid() OR public.is_admin())
    )
  );

-- Manage files for authors of draft assets or admins
CREATE POLICY "Manage asset files"
  ON public.asset_files FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assets a
      WHERE a.id = asset_files.asset_id
      AND (
        (a.author_id = auth.uid() AND a.status IN ('DRAFT', 'PENDING_REVIEW'))
        OR public.is_admin()
      )
    )
  );

-- Asset Tags: Public read
CREATE POLICY "Read asset tags"
  ON public.asset_tags FOR SELECT
  USING (true);

-- Manage asset tags
CREATE POLICY "Manage asset tags"
  ON public.asset_tags FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assets a
      WHERE a.id = asset_tags.asset_id
      AND (
        (a.author_id = auth.uid() AND a.status IN ('DRAFT', 'PENDING_REVIEW'))
        OR public.is_admin()
      )
    )
  );

-- ------------------------------------------------------------------------------
-- 7. FAVORITES & DOWNLOADS POLICIES
-- ------------------------------------------------------------------------------
-- Favorites: Private to each user
CREATE POLICY "Users manage their own favorites"
  ON public.favorites FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Downloads: Anyone can record a download; users view own; admins view all
CREATE POLICY "Record downloads"
  ON public.downloads FOR INSERT
  WITH CHECK (true);

CREATE POLICY "View downloads"
  ON public.downloads FOR SELECT
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR public.is_admin()
  );

-- ------------------------------------------------------------------------------
-- 8. AUDIT LOGS POLICIES
-- ------------------------------------------------------------------------------
-- Admins only can read audit logs
CREATE POLICY "Admins view audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Insert audit logs allowed for authenticated users (acting on their actions) or server
CREATE POLICY "Insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (true);
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
-- ==============================================================================
-- MIGRATION 004: STORAGE BUCKETS & STORAGE ACCESS POLICIES
-- ==============================================================================

-- 1. Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  (
    'assets', 
    'assets', 
    true, 
    52428800, -- 50MB
    ARRAY[
      'image/svg+xml',
      'image/png',
      'image/webp',
      'image/x-icon',
      'font/ttf',
      'font/otf',
      'font/woff',
      'font/woff2',
      'application/font-woff',
      'application/x-font-ttf',
      'application/x-font-opentype'
    ]
  ),
  (
    'temp-uploads', 
    'temp-uploads', 
    false, 
    52428800, 
    ARRAY[
      'image/svg+xml',
      'image/png',
      'image/webp',
      'image/x-icon',
      'font/ttf',
      'font/otf',
      'font/woff',
      'font/woff2'
    ]
  )
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Storage Policies for `assets` bucket
-- Public Read Access for assets bucket
CREATE POLICY "Public read assets objects"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'assets');

-- Authenticated Users can upload to user-owned path in temp-uploads or assets
CREATE POLICY "Authenticated users upload to assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'assets' 
    AND (auth.uid() IS NOT NULL)
  );

-- Admins can update/delete any object in assets bucket
CREATE POLICY "Admins manage assets storage"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'assets' 
    AND public.is_admin()
  );
-- ==============================================================================
-- MIGRATION 005: SEED DATA FOR CATEGORIES, LICENSES, AND TAGS (PHASE 0)
-- ==============================================================================

-- 1. Insert Default Dynamic Categories
INSERT INTO public.categories (name, slug, description, icon, is_active)
VALUES
  ('Business', 'business', 'Enterprise, office, management, and commerce assets', 'Briefcase', true),
  ('Finance', 'finance', 'Banking, currency, investment, and crypto assets', 'DollarSign', true),
  ('Shopping', 'shopping', 'E-commerce, cart, retail, and payment assets', 'ShoppingCart', true),
  ('Food', 'food', 'Cuisine, dining, beverages, and culinary assets', 'Utensils', true),
  ('Technology', 'technology', 'Hardware, software, cloud, and computing assets', 'Cpu', true),
  ('Transportation', 'transportation', 'Vehicles, logistics, aviation, and transit assets', 'Truck', true),
  ('Communication', 'communication', 'Chat, messaging, audio, and network assets', 'MessageSquare', true),
  ('Education', 'education', 'Academic, school, science, and learning assets', 'GraduationCap', true),
  ('Medical', 'medical', 'Healthcare, medicine, hospital, and clinic assets', 'Activity', true),
  ('Social', 'social', 'Community, media, sharing, and profile assets', 'Users', true),
  ('UI', 'ui', 'User interface controls, arrows, badges, and layout primitives', 'Layout', true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon;

-- 2. Insert Standard Digital Licenses
INSERT INTO public.licenses (name, slug, url, commercial_use, redistribution, modification, attribution_required)
VALUES
  (
    'MIT License', 
    'mit', 
    'https://opensource.org/licenses/MIT', 
    true, 
    true, 
    true, 
    true
  ),
  (
    'Creative Commons Zero (CC0 1.0)', 
    'cc0-1.0', 
    'https://creativecommons.org/publicdomain/zero/1.0/', 
    true, 
    true, 
    true, 
    false
  ),
  (
    'Creative Commons Attribution 4.0 (CC BY 4.0)', 
    'cc-by-4.0', 
    'https://creativecommons.org/licenses/by/4.0/', 
    true, 
    true, 
    true, 
    true
  ),
  (
    'Standard Platform Commercial License', 
    'platform-commercial', 
    'https://platform.example.com/licenses/commercial', 
    true, 
    false, -- No standalone redistribution
    true, 
    false
  ),
  (
    'Editorial / Personal Use Only', 
    'personal-editorial', 
    'https://platform.example.com/licenses/personal', 
    false, 
    false, 
    false, 
    true
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  url = EXCLUDED.url,
  commercial_use = EXCLUDED.commercial_use,
  redistribution = EXCLUDED.redistribution,
  modification = EXCLUDED.modification,
  attribution_required = EXCLUDED.attribution_required;

-- 3. Insert Common Tags
INSERT INTO public.tags (name, slug)
VALUES
  ('Minimal', 'minimal'),
  ('Outline', 'outline'),
  ('Solid', 'solid'),
  ('Vector', 'vector'),
  ('Modern', 'modern'),
  ('Geometric', 'geometric'),
  ('Dark Mode', 'dark-mode'),
  ('Responsive', 'responsive'),
  ('Mobile', 'mobile'),
  ('Web', 'web')
ON CONFLICT (slug) DO NOTHING;
