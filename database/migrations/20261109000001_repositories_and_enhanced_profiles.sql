-- ==============================================================================
-- MIGRATION 20261109000001: REPOSITORIES & ENHANCED PROFILES
-- ==============================================================================

-- 1. Enum for repository visibility
DO $$ BEGIN
  CREATE TYPE repository_visibility_enum AS ENUM ('PUBLIC', 'PRIVATE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE repository_item_type_enum AS ENUM ('ASSET', 'FONT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Enhance profiles with unique username and bio
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS password_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(lower(username));

-- 3. Create Repositories Table
CREATE TABLE IF NOT EXISTS public.repositories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(120) NOT NULL,
  description TEXT,
  visibility repository_visibility_enum NOT NULL DEFAULT 'PUBLIC',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_repository_slug UNIQUE (owner_id, slug)
);

-- 4. Create Repository Items (Many-to-many join for assets/fonts within repos)
CREATE TABLE IF NOT EXISTS public.repository_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  item_type repository_item_type_enum NOT NULL,
  item_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_repository_item UNIQUE (repository_id, item_type, item_id)
);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_repositories_owner_id ON public.repositories(owner_id);
CREATE INDEX IF NOT EXISTS idx_repositories_visibility ON public.repositories(visibility);
CREATE INDEX IF NOT EXISTS idx_repositories_slug ON public.repositories(slug);
CREATE INDEX IF NOT EXISTS idx_repository_items_repo_id ON public.repository_items(repository_id);
CREATE INDEX IF NOT EXISTS idx_repository_items_item ON public.repository_items(item_type, item_id);

-- 6. Trigger for updated_at
DROP TRIGGER IF EXISTS trg_repositories_updated_at ON public.repositories;
CREATE TRIGGER trg_repositories_updated_at
  BEFORE UPDATE ON public.repositories
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- 7. Row Level Security (RLS)
ALTER TABLE public.repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repository_items ENABLE ROW LEVEL SECURITY;

-- REPOSITORIES RLS:
-- Public can view PUBLIC repositories. Private are only visible to the owner or ADMIN.
CREATE POLICY "Public or owner can read repositories"
  ON public.repositories FOR SELECT
  USING (
    visibility = 'PUBLIC'
    OR (auth.uid() IS NOT NULL AND owner_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "Authenticated users can create repositories"
  ON public.repositories FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = auth.uid() OR public.is_admin()
  );

CREATE POLICY "Owners can update their repositories"
  ON public.repositories FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin())
  WITH CHECK (owner_id = auth.uid() OR public.is_admin());

CREATE POLICY "Owners can delete their repositories"
  ON public.repositories FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin());

-- REPOSITORY ITEMS RLS:
CREATE POLICY "Read repository items if parent repository is readable"
  ON public.repository_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.repositories r
      WHERE r.id = repository_items.repository_id
      AND (
        r.visibility = 'PUBLIC'
        OR (auth.uid() IS NOT NULL AND r.owner_id = auth.uid())
        OR public.is_admin()
      )
    )
  );

CREATE POLICY "Owners can manage repository items"
  ON public.repository_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.repositories r
      WHERE r.id = repository_items.repository_id
      AND (r.owner_id = auth.uid() OR public.is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.repositories r
      WHERE r.id = repository_items.repository_id
      AND (r.owner_id = auth.uid() OR public.is_admin())
    )
  );
