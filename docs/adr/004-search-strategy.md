# ADR 004: Search Strategy (Phase 0 vs Future Engine)

## Status
Accepted

## Context
A digital asset platform requires fast text search across names, tags, categories, and descriptions. While dedicated search engines (Meilisearch, Algolia, Elasticsearch) excel at typo-tolerance and hybrid vector search, introducing them in Phase 0 adds unnecessary operational complexity.

## Decision
1. **Phase 0 (Current):**
   - Utilize PostgreSQL Full-Text Search via a generated `tsvector` column (`search_vector`) indexed with GIN.
   - Relational filtering on `type`, `category_id`, `license_id`, `tags`, and `status`.
   - High performance for thousands of assets without extra daemon infrastructure.
2. **Phase 1+ Transition Readiness:**
   - Database schemas already isolate `tags` via `asset_tags` join table and normalized slugs.
   - The query interface is encapsulated inside `AssetRepository`/`AssetService`.
   - When transitioning to Meilisearch in future phases, the frontend and API contract remain 100% identical; only the repository implementation redirects to the search index.
