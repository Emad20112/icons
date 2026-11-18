-- Add owner download control on repositories and optional owner tracking on custom font families
ALTER TABLE repositories
  ADD COLUMN IF NOT EXISTS allow_download BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE font_families
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_font_families_owner ON font_families(owner_id);
