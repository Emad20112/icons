# ADR 001: Asset-First Domain Architecture

## Status
Accepted

## Context
The platform is slated to support multiple asset categories over its lifecycle: Icons, Fonts, Illustrations, Logos, Templates, and future media types. A naive design would create siloed tables like `icons`, `fonts`, `illustrations`, leading to fragmented auth, permissions, search, licensing, and marketplace systems.

## Decision
We establish a unified polymorphic `assets` table as the primary domain entity:
- Common core attributes (`name`, `slug`, `type`, `status`, `author_id`, `license_id`, `category_id`, `metadata`) reside on `assets`.
- `type` is an extensible enum (`ICON`, `FONT`, `ILLUSTRATION`, `LOGO`, `TEMPLATE`).
- Format-specific binary files decouple into `asset_files` (1:N relationship with `assets`), allowing one icon or font asset to have multiple file variants (e.g. SVG, PNG, WEBP, ICO or TTF, WOFF, WOFF2).
- Type-specific custom metadata is stored inside PostgreSQL `JSONB` on the asset and file records.

## Consequences
### Positive
- Unified RLS policies and access control across all asset categories.
- Single global search, licensing, tagging, and audit logging pipeline.
- Future asset types (3D models, audio, UI kits) can be added without database schema alterations.

### Negative
- Requires polymorphic type checks in UI rendering, handled cleanly via Vue strategy components.
