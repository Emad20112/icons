# Digital Assets Platform — Phase 0 Foundation

A production-grade, highly scalable foundation for a multi-category digital assets platform. Architected for **Icons, Fonts, Illustrations, Logos, and Templates**, with extensible design, strict Row Level Security (RLS), multi-role authorization, decoupled object storage, and audit logging.

Built with **Vue 3, Nuxt 4 (Composition API & `<script setup lang="ts">`), TypeScript, Tailwind CSS, Lucide Icons, and Supabase (PostgreSQL + RLS + Auth + Storage)**.

---

## 🚀 Key Highlights & Architectural Principles

- **Polymorphic Asset Architecture:** Core entity is `assets` (with `type: ICON | FONT | ILLUSTRATION | LOGO | TEMPLATE`). Never locked to icons only.
- **Decoupled Binary Storage:** PostgreSQL stores relational metadata and file metrics (`asset_files`), while binary data resides in Supabase Storage under structured paths (`assets/{type}s/{asset_id}/{format}/...`).
- **Strict Row Level Security (RLS):** 10 PostgreSQL tables with comprehensive RLS policies. Unauthenticated users only see `PUBLISHED` assets. Regular users cannot publish or modify other users' assets.
- **Multi-Role Authorization:** Clean role hierarchy (`USER` and `ADMIN`) with forward-compatible design for future `CREATOR`, `MODERATOR`, and `ENTERPRISE` roles.
- **Mandatory Licensing:** Assets in `PUBLISHED` status are prevented by database constraints and service validation from existing without an associated license.
- **Security-First Pipeline:** Centralized Zod validation, SVG XSS sanitization, filename sanitization, secure HTTP headers, and zero client-side secret leakage (`SUPABASE_SERVICE_ROLE_KEY` is strictly server-side).
- **Immutable Audit Trail:** All administrative and critical lifecycle mutations (creation, updates, status changes, license creations) are logged in `audit_logs`.
- **Zero-Friction Local Verification:** Seamless integration with remote Supabase, combined with a built-in server-side local fallback store for immediate preview and testing.

---

## 📂 Project Organization

```text
├── app/                  # Nuxt 4 App directory (app.vue, router config, css)
├── components/           # Reusable UI components
│   ├── ui/               # Design system primitives (Button, Input, Badge, Card, Modal, etc.)
│   ├── layout/           # AppHeader, AppFooter, AppSidebar, Container
│   ├── assets/           # AssetCard, AssetGrid, AssetFilter, AssetUploadModal
│   ├── admin/            # AuditLogTable, CategoryManager, LicenseManager
│   └── common/           # EmptyState, ErrorState, LoadingState, ConfirmDialog
├── composables/          # Vue Composables (useAuth, useAssets, useStorage, useAudit, useToast)
├── database/             # Database migrations & seeds
│   ├── migrations/       # SQL migrations (001 schema, 002 RLS, 003 indexes, 004 storage, 005 seed)
│   └── seed/             # Seed fixtures
├── docs/                 # Architecture Decision Records (ADR)
│   └── adr/              # ADR 001 to 004
├── lib/                  # Shared libraries, Zod schemas, constants, errors
├── server/               # Nuxt Nitro Server
│   ├── api/              # RESTful API endpoints (/api/v1/...)
│   ├── services/         # Server business logic (AssetService, StorageService, AuditService)
│   ├── utils/            # Sanitizers, logger, Supabase clients, auth helpers
│   └── middleware/       # Security headers, rate limiting, request tracing
├── tests/                # Automated Vitest test suites
├── types/                # Strict TypeScript domain interfaces & enums
├── ARCHITECTURE.md       # Comprehensive system architecture documentation
├── DATABASE.md           # Relational schema, RLS policies, indexing documentation
├── SECURITY.md           # Security model, sanitization, secret management, RLS rules
└── DEVELOPMENT.md        # Local setup, testing, and contribution guide
```

---

## 🛠️ Quick Start

### 1. Prerequisites
- Node.js >= 20.x (Recommended: v22)
- pnpm >= 9.x (or npm >= 10)

### 2. Installation
```bash
pnpm install
```

### 3. Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Configure your Supabase URL and Anon Key. If left as defaults, the app boots into integrated development mode.

### 4. Running the Development Server
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Running Tests
```bash
pnpm test
```

### 6. Production Build
```bash
pnpm build
pnpm start
```

---

## 📑 Core Documentation
- [Architecture Overview](ARCHITECTURE.md)
- [Database Schema & RLS](DATABASE.md)
- [Security Model](SECURITY.md)
- [Development & Testing Guide](DEVELOPMENT.md)
- [ADRs](docs/adr/)
