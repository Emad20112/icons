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
