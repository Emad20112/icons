# ADR 003: Object Storage & Asset File Pipeline

## Status
Accepted

## Context
Assets encompass vector graphics, raster bitmaps, and font binaries. Storing binary BLOBs inside PostgreSQL slows database backups, inflates memory footprints, and prevents efficient edge CDN caching.

## Decision
1. PostgreSQL stores only metadata (`asset_files` table: file path, size, MIME type, dimensions, format, checksum).
2. Binary files are uploaded to Supabase Storage:
   - Partitioned paths: `assets/{type}s/{asset_id}/{format}/{filename}`
   - Staging uploads go to `temp-uploads` for virus/malware inspection and sanitization before promotion.
3. Storage Abstraction Layer:
   - All code accesses storage via a single `StorageService` interface (`upload`, `delete`, `move`, `getPublicUrl`, `getSignedUrl`).
   - No hardcoded URL concatenation or bucket references scattered across Vue components.
4. Security:
   - Strict MIME validation against an allowed whitelist.
   - SVG sanitization to strip malicious `<script>`, `onload`, and embedded code before storage.

## Consequences
### Positive
- Clean separation between transactional metadata and high-bandwidth binary delivery.
- Storage provider can be swapped (e.g. to AWS S3, Cloudflare R2, Google Cloud Storage) by implementing the `IStorageService` interface.
