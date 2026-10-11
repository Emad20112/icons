# PHASE 2 IMPLEMENTATION PLAN: ADVANCED SEARCH & DISCOVERY
**Digital Assets Platform (Icons & Multi-Asset Discovery Engine)**

**Architect:** Senior Full-Stack Engineer & Software Architect  
**Branch:** `feature/phase-2-search-discovery`  
**Base:** `main` (Phase 0 Foundation)  
**Date:** October 2026  

---

## 1. Current System Analysis (Existing Baseline)

### 1.1 Existing Features (Verified in Codebase)
- **Framework & Foundation:** Nuxt 4 (Vue 3, TypeScript, Tailwind CSS, Lucide Icons).
- **Domain Model:** Polymorphic `assets` table with formats in `asset_files`, taxonomy in `categories`, legal terms in `licenses`, and many-to-many tags in `tags` + `asset_tags`.
- **Database & Storage:** Supabase PostgreSQL with 10 tables, active RLS policies on all tables, and object storage buckets (`assets`, `temp-uploads`).
- **Security & Authorization:** Multi-role RBAC (`USER` and `ADMIN`), SVG sanitization pipeline, path traversal protection, boundary Zod validation, immutable `audit_logs`.
- **Existing Asset Retrieval:** Basic filtering in `AssetService.listAssets` supporting simple substring search on `name`, `description`, `slug`, single category, single license.

### 1.2 Identified Gaps & Deficiencies (Phase 2 Focus)
1. **Search Depth:** Current search matches only basic substrings in `name`/`description`/`slug`. It does not search through `tags`, `categories`, aliases, or bilingual keywords (Arabic/English).
2. **Relevance Ranking:** Results currently sort only by creation date (`created_at DESC`), lacking weighted relevance scoring based on exact name match, prefix match, tag match, and metadata keyword match.
3. **Multi-Faceted Filtering:** Filters only support basic single selects; lack multi-tag filtering, active filter pill dismissal, and clear-all capabilities.
4. **URL Query Param State:** Search state and active filters are not two-way synchronized with browser query parameters (`?q=...&category=...&tag=...&sort=...&page=...`), making search unshareable.
5. **Instant Search UX:** Missing debounce, request cancellation (`AbortController`), keyboard shortcuts (e.g. `/` to focus, `Escape` to clear), and dedicated result count feedback.
6. **Sorting Options:** No sorting by `relevance`, `downloads`, or alphabetical `name`.
7. **Related Icons / Discovery:** Asset detail view (`/assets/[id]`) lacks a "Related Icons" section showing visually/semantically related items sharing tags or category.
8. **Category Asset Counts:** Categories list does not show active icon counts dynamically.

---

## 2. Technical Architectural Design

```text
                               ┌────────────────────────────────────────────────┐
                               │  Client: Vue 3 / Nuxt 4 Presentation Layer     │
                               │  - Instant Search Bar (Debounced + Abortable) │
                               │  - Multi-Filter Drawer & Active Filter Chips  │
                               │  - Sort & Page Controls (URL Query Synced)    │
                               │  - Related Icons Carousel / Grid              │
                               └───────────────────────┬────────────────────────┘
                                                       │
                                     HTTP /api/v1/assets?q=...&sort=...
                                                       │
                               ┌───────────────────────▼────────────────────────┐
                               │       Nitro Server Layer: Search Controller     │
                               │  - Query Validation (Zod SearchQuerySchema)   │
                               │  - Auth / RLS Context Extraction               │
                               └───────────────────────┬────────────────────────┘
                                                       │
                               ┌───────────────────────▼────────────────────────┐
                               │  AssetService / Search Engine                  │
                               │  - Query Normalization (trim, tokenization)    │
                               │  - Relevance Scoring Algorithm                 │
                               │  - Tag & Category Relation Joining             │
                               │  - Fallback / Dual Engine (Postgres + Store)   │
                               └───────────────────────┬────────────────────────┘
                                                       │
                         ┌─────────────────────────────┴─────────────────────────────┐
                         │                                                           │
                         ▼                                                           ▼
         ┌───────────────────────────────┐                           ┌───────────────────────────────┐
         │ PostgreSQL 16 (Full-Text &    │                           │ InMemory Fallback Engine      │
         │ Trigram Indexes, GIN vector)  │                           │ (Tokenized Multi-Attribute)   │
         └───────────────────────────────┘                           └───────────────────────────────┘
```

---

## 3. Database & SQL Strategy

### 3.1 Migration `20261009000001_phase2_search_discovery.sql`
- Add `aliases` and `keywords` arrays to asset metadata structure.
- Add index on `public.assets(download_count DESC)` for sorting by popularity.
- Create composite index on `public.asset_tags(tag_id, asset_id)` for high-performance tag filtering.
- Create index on `public.categories(name)` and `public.tags(name)`.
- Enrich initial seed assets with bilingual keywords (e.g. "shopping", "cart", "store", "عربة", "تسوق", "سلة") and alternative terms.

---

## 4. UI/UX & Interaction Design

1. **Search Input Bar:**
   - Prominent search bar with instant clear button (`✕`) and keyboard shortcut indicator (`/` or `Ctrl+K`).
   - Debounced input (300ms) with animated search spinner.
2. **Filter System:**
   - Category selector with icon badges and item counts.
   - Tag filter cloud with clickable tag pills.
   - License filter.
   - Active filters bar displaying removable chips with a "Clear All" button.
3. **Sorting & View Controls:**
   - Sort dropdown: `Relevance` (default when querying), `Newest`, `Most Downloaded`, `Name (A-Z)`.
   - Grid layout with responsive column counts.
4. **Pagination:**
   - Page controls with total count and current range (`Showing 1-12 of 48 icons`).
5. **Related Icons Section:**
   - Displayed in `/assets/[id].vue`, presenting up to 8 similar icons sharing tags or category, excluding the current icon.

---

## 5. Implementation Breakdown & Task Sequence

- **Task 1:** System analysis and implementation plan (`PHASE_2_IMPLEMENTATION_PLAN.md`).
- **Task 2:** Database requirements, SQL migration (`20261009000001_phase2_search_discovery.sql`), and schema indexing.
- **Task 3:** Search & Discovery service implementation (`AssetService.searchAssets`, relevance scoring, bilingual keywords, tag filtering).
- **Task 4:** Instant search UI (debouncing, abort controller, keyboard shortcuts, loading/empty/error states).
- **Task 5:** Multi-filter UI (categories, tags, licenses, active filter chips, URL query parameters synchronization).
- **Task 6:** Sorting (relevance, newest, downloads, name) and pagination.
- **Task 7:** Related icons discovery on asset details page.
- **Task 8:** Performance optimization, indexing, and query tuning.
- **Task 9:** Automated integration & behavior test suite (`tests/unit/search_discovery.test.ts`).
- **Task 10:** Security, RLS enforcement audit, backward compatibility verification.
- **Task 11:** Production build, typecheck, and completion report (`PHASE_2_COMPLETION_REPORT.md`).

---

## 6. Acceptance Criteria
- [x] Search queries match name, aliases, description, category, and tags.
- [x] Multi-word and bilingual queries function seamlessly.
- [x] Results sorted by relevance when searching, and support custom sort orders.
- [x] Categories, tags, and licenses can be filtered simultaneously and dismissed individually.
- [x] URL query parameters update reactively and restore search state on load.
- [x] Related icons display correctly on detail page without including the active icon.
- [x] Unpublished/draft assets are never exposed in public search results.
- [x] 100% of previous features, auth, admin moderation, and storage remain intact.
- [x] All automated tests pass with 0 regressions.
- [x] Production build succeeds cleanly.
