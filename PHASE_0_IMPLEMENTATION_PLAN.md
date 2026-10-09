# PHASE 0 IMPLEMENTATION PLAN: FOUNDATION
**Digital Assets Platform (Icons, Fonts, Illustrations, Logos, Templates)**

**Role:** Senior Software Architect + Senior Full-Stack Engineer + Security Engineer + UI/UX Engineer  
**Stage:** Phase 0: Foundation (Strict Scope - No Phase 1+ Features)  
**Target Stack:** Vue 3 / Nuxt 4, TypeScript, Tailwind CSS, Lucide Icons, Supabase (PostgreSQL + RLS + Auth + Storage), Vitest

---

## 1. Executive Summary & Goals
Phase 0 establishes a robust, highly extensible, and production-grade foundation for a multi-tenant, multi-asset digital platform. The architecture treats assets polymorphically (`Asset` as base entity with `type: ICON | FONT | ILLUSTRATION | LOGO | TEMPLATE`), decoupling binary file storage (Supabase Storage) from metadata (PostgreSQL).

All business operations, authentication, permissions, and file uploads are governed by strict Row Level Security (RLS), Zod validation schemas, server-side audit logs, and unified error handling.

---

## 2. System Architecture
```text
Client (Vue 3 / Nuxt 4 + Tailwind CSS + Lucide Icons)
  ├── Pages & Layouts (Responsive, Accessible, Semantic HTML)
  ├── Features Modules (auth, assets, categories, tags, licenses, audit)
  ├── Composables (useAuth, useAssets, useStorage, useAudit, useToast)
  └── Services & Repositories (Data Access Layer Abstraction)
           │
           ▼
Nuxt Server Layer (Nitro Engine / Node.js)
  ├── Server API Handlers (/api/v1/assets, /api/v1/upload, /api/v1/audit)
  ├── Security Middlewares (Secure Headers, Rate Limiting Strategy)
  ├── Server Services (AssetService, StorageService, AuditService, SecuritySanitizer)
  └── Supabase Client (Anon Client for client queries / Service Role for privileged server ops)
           │
           ▼
Supabase & PostgreSQL 16
  ├── Auth Engine (JWT, Supabase Auth `auth.users`)
  ├── PostgreSQL Database (Relational Schema with RLS Enabled)
  │    ├── profiles (1:1 with auth.users, roles: USER, ADMIN)
  │    ├── assets (Core entity, polymorphic types, status workflow)
  │    ├── asset_files (1:N files per asset, format, size, dimensions, path)
  │    ├── categories (Dynamic hierarchy, slug, icon)
  │    ├── tags & asset_tags (Many-to-many indexing)
  │    ├── licenses (Legal compliance, commercial/redistribution terms)
  │    ├── downloads & favorites (User engagement telemetry)
  │    └── audit_logs (Immutable operational trail)
  └── Storage Buckets
       ├── `assets` (Public read for published files, partitioned paths)
       └── `temp-uploads` (Staging area for virus/format inspection)
```

---

## 3. Database Schema Specification

### 3.1 Types & Enums
- `asset_type_enum`: `'ICON'`, `'FONT'`, `'ILLUSTRATION'`, `'LOGO'`, `'TEMPLATE'`
- `asset_status_enum`: `'DRAFT'`, `'PENDING_REVIEW'`, `'PUBLISHED'`, `'REJECTED'`, `'ARCHIVED'`
- `asset_file_format_enum`: `'SVG'`, `'PNG'`, `'WEBP'`, `'ICO'`, `'TTF'`, `'OTF'`, `'WOFF'`, `'WOFF2'`
- `user_role_enum`: `'USER'`, `'ADMIN'`

### 3.2 Tables
1. **`profiles`**
   - `id`: `UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE`
   - `email`: `VARCHAR(255) NOT NULL`
   - `display_name`: `VARCHAR(100)`
   - `avatar_url`: `TEXT`
   - `role`: `user_role_enum NOT NULL DEFAULT 'USER'`
   - `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
   - `updated_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`

2. **`categories`**
   - `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `name`: `VARCHAR(80) NOT NULL UNIQUE`
   - `slug`: `VARCHAR(80) NOT NULL UNIQUE`
   - `description`: `TEXT`
   - `icon`: `VARCHAR(50)`
   - `is_active`: `BOOLEAN NOT NULL DEFAULT TRUE`
   - `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`

3. **`licenses`**
   - `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `name`: `VARCHAR(100) NOT NULL UNIQUE`
   - `slug`: `VARCHAR(100) NOT NULL UNIQUE`
   - `url`: `TEXT`
   - `commercial_use`: `BOOLEAN NOT NULL DEFAULT TRUE`
   - `redistribution`: `BOOLEAN NOT NULL DEFAULT FALSE`
   - `modification`: `BOOLEAN NOT NULL DEFAULT TRUE`
   - `attribution_required`: `BOOLEAN NOT NULL DEFAULT TRUE`
   - `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`

4. **`tags`**
   - `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `name`: `VARCHAR(50) NOT NULL UNIQUE`
   - `slug`: `VARCHAR(50) NOT NULL UNIQUE`
   - `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`

5. **`assets`**
   - `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `type`: `asset_type_enum NOT NULL DEFAULT 'ICON'`
   - `name`: `VARCHAR(120) NOT NULL`
   - `slug`: `VARCHAR(140) NOT NULL UNIQUE`
   - `description`: `TEXT`
   - `status`: `asset_status_enum NOT NULL DEFAULT 'DRAFT'`
   - `author_id`: `UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT`
   - `license_id`: `UUID REFERENCES licenses(id) ON DELETE RESTRICT`
   - `category_id`: `UUID REFERENCES categories(id) ON DELETE SET NULL`
   - `is_featured`: `BOOLEAN NOT NULL DEFAULT FALSE`
   - `download_count`: `INTEGER NOT NULL DEFAULT 0`
   - `favorite_count`: `INTEGER NOT NULL DEFAULT 0`
   - `metadata`: `JSONB NOT NULL DEFAULT '{}'::jsonb`
   - `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
   - `updated_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
   - *Constraint*: `CHECK (status != 'PUBLISHED' OR license_id IS NOT NULL)`

6. **`asset_files`**
   - `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `asset_id`: `UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE`
   - `format`: `asset_file_format_enum NOT NULL`
   - `file_path`: `TEXT NOT NULL`
   - `file_size`: `BIGINT NOT NULL`
   - `mime_type`: `VARCHAR(100) NOT NULL`
   - `width`: `INTEGER`
   - `height`: `INTEGER`
   - `metadata`: `JSONB NOT NULL DEFAULT '{}'::jsonb`
   - `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
   - `UNIQUE(asset_id, format)`

7. **`asset_tags`**
   - `asset_id`: `UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE`
   - `tag_id`: `UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE`
   - `PRIMARY KEY (asset_id, tag_id)`

8. **`downloads`**
   - `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `asset_id`: `UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE`
   - `user_id`: `UUID REFERENCES profiles(id) ON DELETE SET NULL`
   - `format`: `asset_file_format_enum NOT NULL`
   - `ip_hash`: `VARCHAR(64)`
   - `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`

9. **`favorites`**
   - `user_id`: `UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE`
   - `asset_id`: `UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE`
   - `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
   - `PRIMARY KEY (user_id, asset_id)`

10. **`audit_logs`**
    - `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
    - `actor_id`: `UUID REFERENCES profiles(id) ON DELETE SET NULL`
    - `action`: `VARCHAR(80) NOT NULL`
    - `entity_type`: `VARCHAR(50) NOT NULL`
    - `entity_id`: `VARCHAR(100) NOT NULL`
    - `metadata`: `JSONB NOT NULL DEFAULT '{}'::jsonb`
    - `ip_address`: `VARCHAR(45)`
    - `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`

---

## 4. Row Level Security (RLS) Strategy
All tables have `ENABLE ROW LEVEL SECURITY`.
- `profiles`:
  - SELECT: Authenticated users can view all profiles; Anonymous can view public profile fields.
  - UPDATE: Users can update their own profile; Admins can update any profile (except modifying role, which requires service role/admin check).
- `assets`:
  - SELECT: Anyone can read `status = 'PUBLISHED'`. Authors can read their own assets in any status. Admins can read all assets.
  - INSERT: Authenticated users can insert assets with `status = 'DRAFT'`. Admins can insert in any status.
  - UPDATE: Authors can update their own assets if `status IN ('DRAFT', 'PENDING_REVIEW')`. Only Admins can set `status = 'PUBLISHED' | 'REJECTED' | 'ARCHIVED'` or update featured flag.
  - DELETE: Authors can delete own drafts. Admins can delete any asset.
- `asset_files`:
  - SELECT: Readable if parent asset is readable under RLS.
  - INSERT/UPDATE/DELETE: Authors for draft assets or Admins.
- `categories`, `licenses`, `tags`:
  - SELECT: Public read access.
  - INSERT/UPDATE/DELETE: Admins only.
- `favorites`:
  - SELECT/INSERT/DELETE: User can only access `user_id = auth.uid()`.
- `downloads`:
  - INSERT: Allowed for public/authenticated users.
  - SELECT: User can view own downloads; Admins can view aggregate.
- `audit_logs`:
  - SELECT: Admins only.
  - INSERT: Server-side service role or secure database triggers only.

---

## 5. Storage Strategy
- Bucket: `assets` (Public read for approved assets).
- Directory structure:
  ```text
  assets/
    icons/{asset_id}/{format}/{filename}
    fonts/{asset_id}/{format}/{filename}
    illustrations/{asset_id}/{format}/{filename}
    logos/{asset_id}/{format}/{filename}
    templates/{asset_id}/{format}/{filename}
  ```
- Storage Service interface:
  - `uploadFile(bucket, path, fileBuffer, mimeType, options)`
  - `deleteFile(bucket, path)`
  - `getPublicUrl(bucket, path)`
  - `getSignedUrl(bucket, path, expiresIn)`
  - `sanitizeFilename(name)`
  - `validateFile(file, allowedFormats, maxSizeBytes)`

---

## 6. Security Model
1. **Zero Secret Leakage**:
   - `SUPABASE_SERVICE_ROLE_KEY` is strictly server-side (`server/` directory / Nitro runtime config only).
   - `NUXT_PUBLIC_SUPABASE_URL` and `NUXT_PUBLIC_SUPABASE_ANON_KEY` are safe for client-side.
2. **SVG Sanitization**:
   - Dedicated sanitizer removing `<script>`, `onload`, `javascript:`, foreign objects, embedded external resources.
3. **Input Validation**:
   - Strict Zod schemas for all models (AssetCreateSchema, AssetUpdateSchema, LicenseSchema, CategorySchema, FileUploadSchema).
4. **Secure Headers**:
   - Helmet / Nitro route rules configuring CSP, X-Frame-Options (allowing AI Studio preview embedding), X-Content-Type-Options, Referrer-Policy.
5. **Audit Logging**:
   - All mutations emit an audit log entry with actor ID, action, entity type, diff metadata, and timestamp.

---

## 7. Folder Structure
```text
/
├── app/
│   ├── app.vue
│   ├── router.options.ts
│   └── assets/
│       └── css/main.css
├── components/
│   ├── ui/               # Base UI primitives (Button, Input, Badge, Card, Modal, etc.)
│   ├── layout/           # AppHeader, AppFooter, AppSidebar, Container
│   ├── assets/           # AssetCard, AssetGrid, AssetFilter, AssetUploadModal
│   ├── admin/            # AuditLogTable, CategoryManager, LicenseManager
│   └── common/           # EmptyState, ErrorState, LoadingState, ConfirmDialog
├── composables/          # useAuth, useAssets, useStorage, useAudit, useToast
├── features/             # Domain modules: auth, assets, categories, licenses
├── layouts/              # default.vue, admin.vue, auth.vue
├── middleware/           # auth.ts, admin.ts
├── pages/
│   ├── index.vue         # Asset explorer & Foundation showcase
│   ├── assets/
│   │   ├── index.vue
│   │   └── [id].vue      # Asset details & download
│   ├── auth/
│   │   ├── login.vue
│   │   └── register.vue
│   ├── admin/
│   │   ├── index.vue     # Admin overview & system health
│   │   ├── assets.vue    # Asset moderation & lifecycle
│   │   ├── categories.vue
│   │   ├── licenses.vue
│   │   └── audit.vue     # Audit trail
│   └── profile.vue
├── server/
│   ├── api/
│   │   ├── v1/
│   │   │   ├── assets/
│   │   │   ├── categories/
│   │   │   ├── licenses/
│   │   │   ├── storage/
│   │   │   └── audit/
│   ├── services/         # Server-side business logic (AssetService, StorageService, AuditService)
│   ├── utils/            # Sanitizer, Zod schemas, errors, logger, supabaseClient
│   └── middleware/       # Security headers, request logging
├── lib/                  # Shared utilities & constants
├── types/                # Domain TypeScript interfaces & enums
├── database/
│   ├── migrations/       # SQL migrations
│   └── seed/             # Initial seeds for categories & licenses
├── tests/
│   ├── unit/             # Validation, sanitizer, business rules
│   └── integration/      # Auth, RLS simulation, API endpoints
├── docs/
│   ├── adr/
├── nuxt.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── vitest.config.ts
```

---

## 8. Implementation Steps
1. **Environment & Tooling**:
   - Setup `package.json`, `nuxt.config.ts`, `tailwind.config.ts`, `tsconfig.json`, `vitest.config.ts`, `.env.example`.
   - Install dependencies (`nuxt`, `vue`, `vue-router`, `tailwindcss`, `@tailwindcss/vite` or postcss, `lucide-vue-next`, `zod`, `@supabase/supabase-js`, `vitest`).
2. **Database & SQL Migrations**:
   - Write SQL migrations for Schema, RLS, Indexes, Storage, and Seed data.
3. **Core TypeScript Types & Validation**:
   - Define domain types in `types/` and Zod validation schemas in `lib/validation/`.
4. **Server Infrastructure & Security**:
   - Unified error classes (`AppError`, `ValidationError`, `AuthorizationError`, `NotFoundError`).
   - SVG & Filename sanitizers.
   - Structured logger.
   - Server-side Supabase client wrapper & In-memory fallback layer for seamless local verification.
5. **Storage Abstraction**:
   - Implement storage service for single-point access.
6. **Composables & State Management**:
   - `useAuth`, `useAssets`, `useStorage`, `useAudit`.
7. **UI Component System**:
   - Button, Input, Select, Badge, Card, Modal, EmptyState, LoadingState, Toast, ConfirmDialog.
8. **Pages & Views**:
   - Asset catalog with filters (Type, Category, License, Search).
   - Asset detail view with download & metadata.
   - Admin management (Asset lifecycle DRAFT -> PUBLISHED, Category & License manager, Audit log viewer).
   - Authentication (Login/Register/Role toggle).
   - System Verification & Acceptance Criteria Dashboard.
9. **Automated Testing**:
   - Write comprehensive Vitest test suites. Run tests and ensure all pass.
10. **Documentation & ADRs**:
    - `README.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DEVELOPMENT.md`, ADRs 001-004, `PHASE_0_COMPLETION_REPORT.md`.
11. **Build & Verification**:
    - Run typecheck, tests, build, and verify server on port 3000.

---

## 9. Acceptance Criteria
- [x] TypeScript passes with zero errors
- [x] Production build passes cleanly
- [x] Vitest unit & integration test suites pass 100%
- [x] Supabase connection and client/server architecture implemented
- [x] All 10 relational tables created with strict constraints
- [x] Row Level Security (RLS) policies defined for all tables
- [x] Roles USER and ADMIN strictly enforced with authorization checks
- [x] Storage abstraction layer handles file upload, validation, and sanitization
- [x] Published assets strictly require a valid License
- [x] Dynamic categories and many-to-many tags system
- [x] Full audit log captures all admin and asset mutations
- [x] Zero exposed secrets; security headers & SVG XSS sanitizer in place
- [x] Modern, accessible, responsive SaaS UI built with Tailwind CSS and Lucide
- [x] Complete documentation suite and ADRs provided
