# PHASE 6 — TECHNICAL ARCHITECTURE & IMPLEMENTATION PLAN
## Professional Font Library & AI-Powered Font Classification

**Platform:** Digital Assets Platform (Nuxt 3 / Vue 3 / TypeScript / Tailwind CSS / Supabase / PostgreSQL / Gemini AI)  
**Lead Engineer:** Emad20112 (`fyslbdh80@gmail.com`)  
**Branch:** `feature/phase-6-font-library`  
**Status:** Approved & Ready for Execution  

---

### 1. Executive Summary & Repository Audit

An exhaustive audit of the existing codebase confirms:
- **Framework & Foundation:** Nuxt 3.15.4, Vue 3.5.13, TypeScript 5.7.3, Tailwind CSS 3.4.17.
- **Backend Architecture:** Dual-mode architecture combining Supabase (PostgreSQL 15+ with Row Level Security, Storage Buckets, and Auth) with a high-fidelity in-memory database store (`server/utils/mockStore.ts`) ensuring 100% reproducible testing and preview operation.
- **Previous Phases Status:**
  - *Phase 0 (Foundation):* Multi-tenant polymorphic asset model, RLS policies, audit logs, licensing, storage buckets (`assets`, `temp-uploads`).
  - *Phase 1 & 2 (Icon Library & Discovery):* Advanced faceted search, weighted relevance ranking, bilingual tags and categories.
  - *Phase 3 (Image to Icon):* Client/server image rasterization, multi-size PNG/WebP/ICO generation.
  - *Phase 4 (Image to SVG / Vectorizer):* Pure client vectorization using ImageTracer, color quantization, Bezier curves.
  - *Phase 5 (Icon Editor):* Headless vector engine, canvas rendering, layers, commands/undo/redo, multi-format and Vue 3 / React component code export.
- **Phase 6 Scope:** Implement an enterprise-grade Font Library with bulk ZIP import, metadata parsing (TTF, OTF, WOFF, WOFF2), family grouping, specimen preview generation, AI-powered font classification (multimodal Gemini 3.8 Flash), admin review workflows, search/filtering, and individual/bulk download engines.

---

### 2. Architectural Design & Separation of Concerns

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             PRESENTATION LAYER (UI)                              │
│  /pages/fonts/index.vue       /pages/fonts/[slug].vue      /pages/admin/fonts/*  │
│  FontCard.vue                 CustomTextPreview.vue        AiReviewCard.vue      │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │ Composables (useFontLibrary, useFontImport)
┌────────────────────────────────────────▼─────────────────────────────────────────┐
│                           SERVER API LAYER (Nitro / H3)                          │
│  /api/v1/fonts                /api/v1/fonts/:slug/download                       │
│  /api/v1/fonts/import         /api/v1/fonts/ai/classify & review                 │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │ Service Orchestration
┌────────────────────────────────────────▼─────────────────────────────────────────┐
│                              FONT ENGINE SERVICES                                │
│  ┌───────────────────────┐  ┌──────────────────────┐  ┌───────────────────────┐  │
│  │  FontZipImportService │  │ FontMetadataService  │  │  FontFamilyGrouper    │  │
│  │  (Safe ZIP streaming, │  │ (opentype.js parser, │  │  (Weight/style/axes   │  │
│  │   traversal & bombs)  │  │  Unicode & language) │  │   clustering engine)  │  │
│  └───────────────────────┘  └──────────────────────┘  └───────────────────────┘  │
│  ┌───────────────────────┐  ┌──────────────────────┐  ┌───────────────────────┐  │
│  │  FontPreviewService   │  │  FontAiClassifier    │  │  FontDownloadService  │  │
│  │  (SVG/Canvas specimen │  │  (Gemini 3.8 Flash,  │  │  (Single weight file  │  │
│  │   card generation)    │  │   Zod Schema guard)  │  │   or Family ZIP pack) │  │
│  └───────────────────────┘  └──────────────────────┘  └───────────────────────┘  │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │ Data Access & Storage
┌────────────────────────────────────────▼─────────────────────────────────────────┐
│                       PERSISTENCE & SECURITY LAYER                               │
│  PostgreSQL 15+ / Supabase RLS  │  Supabase Storage (fonts/, previews/)          │
│  font_families, font_files,     │  SHA256 Content-addressable storage,           │
│  font_import_batches,           │  Zero binary blobs in SQL,                     │
│  font_ai_jobs, font_tags        │  Strict MIME & signature verification          │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

### 3. Database Schema Design (PostgreSQL & RLS)

#### 3.1 Tables
1. **`font_families`**: Primary entity for font families.
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `name VARCHAR(120) NOT NULL`
   - `slug VARCHAR(140) NOT NULL UNIQUE`
   - `display_name VARCHAR(140)`
   - `description TEXT`
   - `designer VARCHAR(120)`
   - `foundry VARCHAR(120)`
   - `primary_category VARCHAR(60) NOT NULL DEFAULT 'sans_serif'`
   - `secondary_categories TEXT[] DEFAULT '{}'`
   - `arabic_style VARCHAR(60)` (e.g. `naskh`, `kufi`, `ruqah`, `thuluth`, `diwani`, `nastaliq`, `modern`)
   - `language_support TEXT[] DEFAULT '{"latin"}'`
   - `style_tags TEXT[] DEFAULT '{}'`
   - `recommended_usage TEXT[] DEFAULT '{}'`
   - `preview_image_path TEXT`
   - `license_type VARCHAR(60) DEFAULT 'OFL'`
   - `license_url TEXT`
   - `publication_status VARCHAR(40) NOT NULL DEFAULT 'DRAFT'` (`DRAFT`, `PENDING_REVIEW`, `PUBLISHED`, `ARCHIVED`)
   - `ai_classification_status VARCHAR(40) DEFAULT 'pending'` (`pending`, `processing`, `ai_suggested`, `approved`, `rejected`)
   - `ai_confidence NUMERIC(4,3)`
   - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
   - `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

2. **`font_files`**: Individual font files (weights/styles/formats).
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `family_id UUID NOT NULL REFERENCES font_families(id) ON DELETE CASCADE`
   - `file_name VARCHAR(255) NOT NULL`
   - `storage_path TEXT NOT NULL`
   - `file_format VARCHAR(20) NOT NULL` (`TTF`, `OTF`, `WOFF`, `WOFF2`)
   - `file_size INTEGER NOT NULL`
   - `sha256_hash VARCHAR(64) NOT NULL`
   - `weight INTEGER NOT NULL DEFAULT 400` (100 to 900)
   - `style VARCHAR(40) NOT NULL DEFAULT 'normal'` (`normal`, `italic`, `oblique`)
   - `subfamily_name VARCHAR(100)`
   - `postscript_name VARCHAR(150)`
   - `is_variable BOOLEAN NOT NULL DEFAULT FALSE`
   - `variable_axes JSONB DEFAULT '{}'`
   - `character_count INTEGER DEFAULT 0`
   - `unicode_ranges TEXT[] DEFAULT '{}'`
   - `technical_metadata JSONB DEFAULT '{}'`
   - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

3. **`font_import_batches`**: Tracking batch ZIP and multi-file imports.
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `uploaded_by UUID REFERENCES profiles(id)`
   - `original_file_name VARCHAR(255) NOT NULL`
   - `storage_path TEXT`
   - `total_files INTEGER NOT NULL DEFAULT 0`
   - `processed_files INTEGER NOT NULL DEFAULT 0`
   - `failed_files INTEGER NOT NULL DEFAULT 0`
   - `duplicate_files INTEGER NOT NULL DEFAULT 0`
   - `status VARCHAR(40) NOT NULL DEFAULT 'uploaded'` (`uploaded`, `extracting`, `analyzing`, `classifying`, `completed`, `failed`, `cancelled`)
   - `error_summary TEXT[] DEFAULT '{}'`
   - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
   - `completed_at TIMESTAMPTZ`

4. **`font_ai_jobs`**: Tracking multimodal AI font classification tasks.
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `font_family_id UUID NOT NULL REFERENCES font_families(id) ON DELETE CASCADE`
   - `provider VARCHAR(50) NOT NULL DEFAULT 'gemini'`
   - `model VARCHAR(80) NOT NULL DEFAULT 'gemini-3.8-flash'`
   - `prompt_version VARCHAR(20) NOT NULL DEFAULT 'v1.0'`
   - `status VARCHAR(40) NOT NULL DEFAULT 'pending'`
   - `result JSONB`
   - `confidence NUMERIC(4,3)`
   - `attempts INTEGER NOT NULL DEFAULT 0`
   - `error_message TEXT`
   - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
   - `completed_at TIMESTAMPTZ`

---

### 4. Step-by-Step Task Breakdown

| Task # | Scope | Key Deliverables |
|---|---|---|
| **TASK 01** | Architecture Audit & Technical Design | Implementation Plan, ADR documentation, Git branch setup. |
| **TASK 02** | Database Architecture & Migrations | Migration SQL `20261103000001_phase6_font_library.sql`, TypeScript interfaces, `mockStore` extension. |
| **TASK 03** | Font Storage & File Management | Content-addressable storage paths, SHA-256 deduplication, mime/signature validation. |
| **TASK 04** | Secure Bulk ZIP Import | `fontZipImportService.ts`: Zip bomb guard, ratio checks, traversal sanitization, multi-file extraction. |
| **TASK 05** | Background Processing & Job Management | Async task executor, batch progress calculation, retry/cancel/resume hooks. |
| **TASK 06** | Font Metadata Extraction Engine | `fontMetadataService.ts`: `opentype.js` parsing, postscript names, weights, Unicode ranges, Arabic script detection. |
| **TASK 07** | Font Family Detection & Grouping | `fontFamilyGrouper.ts`: Fuzzy clustering on typographic families, weights (100-900), and italic detection. |
| **TASK 08** | Font Preview Generation | `fontPreviewService.ts`: Dynamic SVG specimen rendering for Arabic and Latin text pangrams. |
| **TASK 09** | AI-Powered Font Classification | `fontAiClassificationService.ts`: Gemini 3.8 Flash multimodal classifier, Zod schema validation, Arabic calligraphy taxonomy. |
| **TASK 10** | AI Review & Admin Dashboard | `pages/admin/fonts/ai-review.vue`: Admin curation dashboard, batch approve/reject/edit. |
| **TASK 11** | Font Library User Interface | `pages/fonts/index.vue` and `pages/fonts/[slug].vue`: Responsive cards, weights list, custom text preview. |
| **TASK 12** | Advanced Search & Filters | Multi-facet filter sidebar: Categories, Arabic styles, weights, languages, licenses. |
| **TASK 13** | Individual & Bulk Downloads | `fontDownloadService.ts`: Single font file and multi-weight Family ZIP downloads. |
| **TASK 14** | Import Management Dashboard | `pages/admin/fonts/import.vue`: Batch upload interface, progress bar, real-time log viewer. |
| **TASK 15** | Licensing & Publication Safety | License validation (OFL, Apache, Commercial, Unknown), publication gating. |
| **TASK 16** | Internationalization & Responsive UI | Full `ar.json` and `en.json` translations, RTL/LTR layout polish, header integration. |
| **TASK 17** | Performance & Reliability | Memory streaming, batch size limits, rate limits, audit logging. |
| **TASK 18** | Automated Testing & Regression | Comprehensive Vitest suites for ZIP security, metadata extraction, family grouping, AI validation, and UI. |

---

### 5. Risk Assessment & Mitigations

1. **ZIP Bombs & Archive Traversal:**
   - *Mitigation:* Strict limits: Max ZIP size 100MB, max uncompressed size 250MB, max compression ratio 10:1, max 1000 files per archive. Path traversal sequences (`../`, absolute paths) are stripped and normalized.
2. **Untrusted Binary Executables Disguised as Fonts:**
   - *Mitigation:* Magic byte header verification (SFNT headers: `0x00010000`, `OTTO`, `true`, `typ1`, `wOFF`, `wOF2`). Non-font files are immediately filtered out.
3. **AI Hallucination & External Rate Limits:**
   - *Mitigation:* Multimodal prompt uses structured JSON response schemas validated via Zod. Confidence threshold gating (< 0.70 flags `needs_review`). Strict rate limiting and offline test mocks protect against API quotas.
4. **Memory Leaks during Large Font File Operations:**
   - *Mitigation:* Node.js Buffer streaming, chunk-based batch processing, immediate garbage collection of intermediate buffers.
