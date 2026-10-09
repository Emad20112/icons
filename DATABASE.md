# Database Architecture & Row Level Security (RLS) Specification

## 1. Relational Entities & Schema Definition

### 1.1 `profiles`
Links directly to Supabase Auth `auth.users(id)`:
```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  display_name VARCHAR(100),
  avatar_url TEXT,
  role user_role_enum NOT NULL DEFAULT 'USER', -- 'USER' | 'ADMIN'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 1.2 `categories`
Dynamic taxonomy categories:
```sql
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(80) NOT NULL UNIQUE,
  slug VARCHAR(80) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 1.3 `licenses`
Legal usage terms attached to digital assets:
```sql
CREATE TABLE public.licenses (
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
```

### 1.4 `tags` & `asset_tags`
Many-to-many relationship preventing comma-delimited strings:
```sql
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  slug VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.asset_tags (
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (asset_id, tag_id)
);
```

### 1.5 `assets`
The central polymorphic asset entity:
```sql
CREATE TABLE public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type asset_type_enum NOT NULL DEFAULT 'ICON', -- ICON, FONT, ILLUSTRATION, LOGO, TEMPLATE
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(140) NOT NULL UNIQUE,
  description TEXT,
  status asset_status_enum NOT NULL DEFAULT 'DRAFT', -- DRAFT, PENDING_REVIEW, PUBLISHED, REJECTED, ARCHIVED
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  license_id UUID REFERENCES public.licenses(id) ON DELETE RESTRICT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  download_count INTEGER NOT NULL DEFAULT 0,
  favorite_count INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_published_asset_must_have_license 
    CHECK (status != 'PUBLISHED' OR license_id IS NOT NULL)
);
```

### 1.6 `asset_files`
Multiple binary formats per asset stored with metadata:
```sql
CREATE TABLE public.asset_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  format asset_file_format_enum NOT NULL, -- SVG, PNG, WEBP, ICO, TTF, OTF, WOFF, WOFF2
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL CHECK (file_size > 0),
  mime_type VARCHAR(100) NOT NULL,
  width INTEGER,
  height INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_asset_file_format UNIQUE (asset_id, format)
);
```

### 1.7 `downloads` & `favorites`
User interaction tracking:
```sql
CREATE TABLE public.downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  format asset_file_format_enum NOT NULL,
  ip_hash VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.favorites (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, asset_id)
);
```

### 1.8 `audit_logs`
Immutable compliance and activity trail:
```sql
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action VARCHAR(80) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(100) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 2. Row Level Security (RLS) Matrix

| Entity | Operation | Anonymous Visitor | Authenticated User | Admin User |
| :--- | :--- | :--- | :--- | :--- |
| **profiles** | SELECT | Allowed (public fields) | Allowed | Allowed |
| | UPDATE | Denied | Allowed (Own record only) | Allowed (All records) |
| **assets** | SELECT | `status = 'PUBLISHED'` only | Published + Own drafts/pending | All assets |
| | INSERT | Denied | Allowed (`status = 'DRAFT'`) | Allowed (Any status) |
| | UPDATE | Denied | Own non-published assets | Any asset & status |
| | DELETE | Denied | Own drafts only | Any asset |
| **asset_files** | SELECT | Inherited from asset visibility | Inherited | All |
| | MUTATE | Denied | Author of non-published asset | Admin |
| **categories** | SELECT | `is_active = TRUE` | `is_active = TRUE` | All |
| | MUTATE | Denied | Denied | Allowed |
| **licenses** | SELECT | Allowed | Allowed | Allowed |
| | MUTATE | Denied | Denied | Allowed |
| **tags** | SELECT | Allowed | Allowed | Allowed |
| | MUTATE | Denied | Denied | Allowed |
| **favorites** | SELECT/MUTATE | Denied | Own favorites only (`user_id = auth.uid()`) | All |
| **audit_logs** | SELECT | Denied | Denied | Allowed |
| | INSERT | System/Trigger only | System/Trigger only | System/Trigger only |
