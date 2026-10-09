# System Architecture Document: Digital Assets Platform (Phase 0)

## 1. Architectural Vision
The platform is designed around the **Polymorphic Asset Model**, ensuring that adding new digital asset types (Fonts, 3D Models, Vector Illustrations, Audio) does not require altering core authentication, permissions, tagging, search, or storage layers.

```text
                        ┌─────────────────────────────────────┐
                        │        Client: Vue 3 / Nuxt 4       │
                        │  (Tailwind CSS + Lucide + Pinia/    │
                        │        Composables State)           │
                        └──────────────────┬──────────────────┘
                                           │
                        ┌──────────────────┴──────────────────┐
                        │        Nuxt Nitro Server Layer      │
                        │  - Security Middleware              │
                        │  - Zod Input & File Validation      │
                        │  - SVG Sanitization Pipeline        │
                        │  - Audit Logging Emitter            │
                        └─────────┬─────────────────┬─────────┘
                                  │                 │
                (Service Role/Privileged Ops)       │ (Direct Anon Queries)
                                  │                 │
                                  ▼                 ▼
             ┌────────────────────────────────────────────────────────┐
             │                     Supabase Backend                   │
             │                                                        │
             │   ┌────────────────────┐      ┌────────────────────┐   │
             │   │   Supabase Auth    │      │  Supabase Storage  │   │
             │   │    (GoTrue/JWT)    │      │ (Bucket: `assets`) │   │
             │   └─────────┬──────────┘      └─────────┬──────────┘   │
             │             │                           │              │
             │             ▼                           ▼              │
             │   ┌────────────────────────────────────────────────┐   │
             │   │          PostgreSQL 16 Engine with RLS         │   │
             │   │   - profiles (1:1 with auth.users)             │   │
             │   │   - assets (Polymorphic: Icon, Font, etc.)     │   │
             │   │   - asset_files (1:N variants: SVG, PNG, WOFF) │   │
             │   │   - categories, tags, asset_tags               │   │
             │   │   - licenses, downloads, favorites             │   │
             │   │   - audit_logs (Immutable activity trail)      │   │
             │   └────────────────────────────────────────────────┘   │
             └────────────────────────────────────────────────────────┘
```

---

## 2. Core Architectural Layers

### 2.1 Presentation Layer (Vue 3 / Nuxt 4)
- **Framework:** Nuxt 4 mode (`compatibilityVersion: 4`), Vue 3 Composition API with `<script setup lang="ts">`.
- **Styling:** Tailwind CSS with standardized design tokens (background, foreground, primary, secondary, muted, border, destructive, accent).
- **Icons:** Lucide Icons (`lucide-vue-next`).
- **Components Organization:**
  - `components/ui`: Fundamental design tokens and primitives (Button, Input, Badge, Card, Modal, Dropdown, Table).
  - `components/layout`: Header, Footer, Container, Navigation.
  - `components/assets`: Asset card, Asset filter bar, Asset file grid, Asset detail modal.
  - `components/admin`: Category management, License management, Audit log viewer.
  - `components/common`: EmptyState, ErrorState, LoadingState, ConfirmDialog.

### 2.2 Domain & Business Logic Layer
- **Composables:** Encapsulate reactive state and user actions (`useAuth`, `useAssets`, `useStorage`, `useAudit`, `useToast`).
- **Repositories & Services:**
  - `AssetService`: Coordinates asset lifecycle (draft -> review -> published), slug generation, license enforcement, and tagging.
  - `StorageService`: Centralized abstraction for uploading, generating URLs, validating file signatures, and deleting storage objects.
  - `AuditService`: Emits structured audit records for compliance and traceability.

### 2.3 Data Access & Backend Layer
- **Supabase Client:** Dual client pattern:
  1. *Public Anon Client:* Used for standard queries respecting user JWT and PostgreSQL RLS.
  2. *Server-Side Service Role Client:* Guarded strictly within Nitro server endpoints (`server/`) for elevated operations (moderation, audit recording, user role updates).
- **Relational Integrity:** Foreign key constraints, unique constraints on slugs, composite uniqueness on `(asset_id, format)`.

---

## 3. Asset Lifecycle State Machine

```text
   [User creates Asset]
             │
             ▼
        ┌─────────┐
        │  DRAFT  │ ◄─────── (Author edits metadata & uploads files)
        └────┬────┘
             │ (Author submits for review)
             ▼
    ┌─────────────────┐
    │ PENDING_REVIEW  │
    └────────┬────────┘
             │ (Admin moderates)
      ┌──────┴──────┐
      │             │
      ▼             ▼
┌───────────┐ ┌───────────┐
│ PUBLISHED │ │ REJECTED  │
└─────┬─────┘ └───────────┘
      │
      ▼ (Admin deactivates)
┌───────────┐
│ ARCHIVED  │
└───────────┘
```

- **Invariants:**
  - Only `ADMIN` can transition an asset to `PUBLISHED`, `REJECTED`, or `ARCHIVED`.
  - An asset can only transition to `PUBLISHED` if `license_id` is non-null.
  - Only assets in `PUBLISHED` state are visible to unauthenticated public visitors.
