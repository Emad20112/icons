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
