-- ==============================================================================
-- MIGRATION 20261103000001: PHASE 6 - PROFESSIONAL FONT LIBRARY ARCHITECTURE
-- ==============================================================================

-- 1. Font Families Table
CREATE TABLE IF NOT EXISTS public.font_families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(140) NOT NULL UNIQUE,
  display_name VARCHAR(140) NOT NULL,
  description TEXT,
  designer VARCHAR(120),
  foundry VARCHAR(120),
  primary_category VARCHAR(60) NOT NULL DEFAULT 'sans_serif',
  secondary_categories TEXT[] DEFAULT '{}',
  arabic_style VARCHAR(60),
  language_support TEXT[] DEFAULT '{"latin"}',
  style_tags TEXT[] DEFAULT '{}',
  recommended_usage TEXT[] DEFAULT '{}',
  preview_image_path TEXT,
  preview_text_sample TEXT DEFAULT 'أبجد هوز حطي كلمن — The quick brown fox jumps over the lazy dog',
  license_type VARCHAR(60) NOT NULL DEFAULT 'OFL',
  license_url TEXT,
  license_metadata JSONB DEFAULT '{}',
  publication_status VARCHAR(40) NOT NULL DEFAULT 'DRAFT',
  ai_classification_status VARCHAR(40) NOT NULL DEFAULT 'pending',
  ai_confidence NUMERIC(4,3) CHECK (ai_confidence IS NULL OR (ai_confidence >= 0.0 AND ai_confidence <= 1.0)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Font Files Table (Weights, Styles, Formats)
CREATE TABLE IF NOT EXISTS public.font_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.font_families(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  storage_path TEXT NOT NULL,
  file_format VARCHAR(20) NOT NULL CHECK (file_format IN ('TTF', 'OTF', 'WOFF', 'WOFF2')),
  file_size INTEGER NOT NULL CHECK (file_size > 0),
  sha256_hash VARCHAR(64) NOT NULL,
  weight INTEGER NOT NULL DEFAULT 400 CHECK (weight >= 100 AND weight <= 900),
  style VARCHAR(40) NOT NULL DEFAULT 'normal' CHECK (style IN ('normal', 'italic', 'oblique')),
  subfamily_name VARCHAR(100),
  postscript_name VARCHAR(150),
  is_variable BOOLEAN NOT NULL DEFAULT FALSE,
  variable_axes JSONB DEFAULT '{}',
  character_count INTEGER DEFAULT 0,
  unicode_ranges TEXT[] DEFAULT '{}',
  technical_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Font Import Batches Table (Bulk ZIP Tracking)
CREATE TABLE IF NOT EXISTS public.font_import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  original_file_name VARCHAR(255) NOT NULL,
  storage_path TEXT,
  total_files INTEGER NOT NULL DEFAULT 0,
  processed_files INTEGER NOT NULL DEFAULT 0,
  failed_files INTEGER NOT NULL DEFAULT 0,
  duplicate_files INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(40) NOT NULL DEFAULT 'uploaded' CHECK (
    status IN ('uploaded', 'extracting', 'analyzing', 'classifying', 'completed', 'partially_completed', 'failed', 'cancelled')
  ),
  error_summary TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- 4. Font AI Jobs Table (Gemini Classification Pipeline)
CREATE TABLE IF NOT EXISTS public.font_ai_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  font_family_id UUID NOT NULL REFERENCES public.font_families(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL DEFAULT 'gemini',
  model VARCHAR(80) NOT NULL DEFAULT 'gemini-3.8-flash',
  prompt_version VARCHAR(20) NOT NULL DEFAULT 'v1.0',
  status VARCHAR(40) NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'completed', 'failed')
  ),
  result JSONB,
  confidence NUMERIC(4,3) CHECK (confidence IS NULL OR (confidence >= 0.0 AND confidence <= 1.0)),
  attempts INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 5. Indexes for Scalable Performance
CREATE INDEX IF NOT EXISTS idx_font_families_slug ON public.font_families(slug);
CREATE INDEX IF NOT EXISTS idx_font_families_publication_status ON public.font_families(publication_status);
CREATE INDEX IF NOT EXISTS idx_font_families_primary_category ON public.font_families(primary_category);
CREATE INDEX IF NOT EXISTS idx_font_families_arabic_style ON public.font_families(arabic_style);
CREATE INDEX IF NOT EXISTS idx_font_families_ai_status ON public.font_families(ai_classification_status);

CREATE INDEX IF NOT EXISTS idx_font_files_family_id ON public.font_files(family_id);
CREATE INDEX IF NOT EXISTS idx_font_files_sha256 ON public.font_files(sha256_hash);
CREATE INDEX IF NOT EXISTS idx_font_files_weight ON public.font_files(weight);
CREATE INDEX IF NOT EXISTS idx_font_files_format ON public.font_files(file_format);

CREATE INDEX IF NOT EXISTS idx_font_import_batches_status ON public.font_import_batches(status);
CREATE INDEX IF NOT EXISTS idx_font_ai_jobs_family_id ON public.font_ai_jobs(font_family_id);
CREATE INDEX IF NOT EXISTS idx_font_ai_jobs_status ON public.font_ai_jobs(status);

-- 6. Row Level Security (RLS) Policies
ALTER TABLE public.font_families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.font_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.font_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.font_ai_jobs ENABLE ROW LEVEL SECURITY;

-- 6.1 Font Families: Public can read PUBLISHED; Admins can read/write everything
CREATE POLICY "Public can view published font families"
  ON public.font_families FOR SELECT
  USING (publication_status = 'PUBLISHED');

CREATE POLICY "Admins have full access to font families"
  ON public.font_families FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- 6.2 Font Files: Public can read files of published families; Admins full access
CREATE POLICY "Public can view files of published families"
  ON public.font_files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.font_families
      WHERE id = font_files.family_id AND publication_status = 'PUBLISHED'
    )
  );

CREATE POLICY "Admins have full access to font files"
  ON public.font_files FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- 6.3 Import Batches & AI Jobs: Strictly Admins Only
CREATE POLICY "Admins have full access to font import batches"
  ON public.font_import_batches FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

CREATE POLICY "Admins have full access to font AI jobs"
  ON public.font_ai_jobs FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );
