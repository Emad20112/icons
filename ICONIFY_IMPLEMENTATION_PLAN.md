# Iconify Integration Implementation Plan
**Project**: Digital Assets Platform — Iconify Dynamic Integration  
**Author**: Emad20112 <fyslbdh80@gmail.com>  
**Status**: Approved — Ready for Execution (Phase 2)

---

## 1. Architectural Blueprint

```
[ Browser / Client ]
        │  (Nuxt 3 Frontend - SSR & SPA)
        ▼
[ Internal Proxy / CDN ]
        │  (HTTP /api/v1/icons/*)
        ▼
┌─────────────────────────────────────────────────────────────┐
│ icon-platform-backend/ (Standalone Fastify / Node.js Engine)│
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 1. Security & Validation Layer (Zod, Helmet, CORS)    │  │
│  └───────────────────────────┬───────────────────────────┘  │
│                              ▼                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 2. Multi-tier Rate Limiter (IP, User, Endpoint, Global)  │  │
│  └───────────────────────────┬───────────────────────────┘  │
│                              ▼                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 3. Bounded In-Memory LRU Cache (Microsecond Hits)     │  │
│  └───────────────────────────┬───────────────────────────┘  │
│                              ▼                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 4. Request Coalescing (In-flight Promise Deduplication│  │
│  └───────────────────────────┬───────────────────────────┘  │
│                              ▼                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 5. Upstream Client (Circuit Breaker, Jitter, Timeout) │  │
│  └───────────────────────────┬───────────────────────────┘  │
└──────────────────────────────┼──────────────────────────────┘
                               ▼
               [ https://api.iconify.design ]
```

---

## 2. API Endpoint Specification

All endpoints are versioned under `/api/v1/icons`:

### 1. `GET /api/v1/icons/search`
- **Query Parameters**:
  - `query` / `q` (string, 1-100 chars, required)
  - `limit` (number, 1-100, default: 40)
  - `start` (number, >= 0, default: 0)
  - `prefix` / `collection` (string, optional, e.g. `lucide`, `heroicons`, `tabler`)
  - `category` (string, optional)
- **Response**:
  ```json
  {
    "icons": ["lucide:home", "heroicons:home", "tabler:home"],
    "total": 420,
    "limit": 40,
    "start": 0,
    "collections": { "lucide": { "name": "Lucide", "total": 1400 } }
  }
  ```

### 2. `GET /api/v1/icons/collections`
- **Query Parameters**:
  - `prefixes` (optional comma-separated list)
  - `category` (optional)
- **Response**: Dictionary of all collections with metadata (author, license, total icons, height, samples).

### 3. `GET /api/v1/icons/collections/:prefix`
- **Path Parameter**: `prefix` (alphanumeric with dashes, e.g. `lucide`, `ph`, `ri`).
- **Response**: Collection details, categories, uncategorized icons, prefixes, and license information.

### 4. `GET /api/v1/icons/:prefix/:name`
- **Path Parameters**: `prefix` (string), `name` (string).
- **Response**: Normalized Iconify JSON icon data (`body`, `width`, `height`, `left`, `top`, etc.).

### 5. `GET /api/v1/icons/:prefix/:name/svg`
- **Path Parameters**: `prefix` (string), `name` (string).
- **Query Parameters**:
  - `color` (hex / rgb / currentColor)
  - `size` / `width` / `height` (number, 8-512)
  - `download` (boolean, triggers attachment disposition)
- **Response**: Standalone, sanitized SVG file with Content-Type `image/svg+xml`.

### 6. `GET /health` & `GET /api/v1/health`
- **Response**: Health status, uptime, cache metrics, circuit breaker state, upstream latency stats.

---

## 3. Security & Abuse Prevention

1. **Strict Input Sanitization**:
   - `prefix` regex: `^[a-z0-9][a-z0-9-]{0,49}$`
   - `name` regex: `^[a-z0-9][a-z0-9-_:]{0,99}$`
   - Rejection of path traversal (`..`, `/`), control characters, and null bytes.
2. **SSRF Guard**:
   - Backend only queries whitelist of official Iconify API endpoints:
     - Primary: `https://api.iconify.design`
     - Secondary: `https://api.simplesvg.com`
   - Absolute prohibition of arbitrary proxying or user-defined URLs.
3. **SVG Sanitization**:
   - Every generated SVG is parsed and stripped of `<script>`, `onload`, `javascript:`, event handlers, external stylesheet links, and foreignObject tags.
4. **Multi-tier Rate Limiting**:
   - Per-IP rate limiting:
     - Search: 20 req/min
     - Collections: 30 req/min
     - Icon & SVG fetch: 60 req/min
   - Global upstream token bucket: maximum 200 requests/minute toward Iconify API to prevent provider throttling.
5. **Circuit Breaker**:
   - Trip threshold: 5 consecutive upstream 5xx errors or timeouts.
   - Reset timeout: 30 seconds.
   - Half-open state to safely probe recovery.

---

## 4. Frontend Integration Plan

1. **Composable (`useIconify.ts`)**:
   - Reactive search state, active collection, icon selection, pagination.
   - Built-in search debouncing (400ms) with `AbortController` cancellation for rapid keystrokes.
2. **UI Components (`components/iconify/`)**:
   - `IconifySearchInput.vue`: Debounced input with collection filter selector and clear button.
   - `IconifyCollectionPicker.vue`: Visual tags/chips for top collections (`Lucide`, `Tabler`, `Heroicons`, `Material Symbols`, etc.).
   - `IconifyGrid.vue`: Responsive CSS grid with skeleton loading, pagination, and empty state.
   - `IconifyDetailModal.vue`: SVG preview, color picker, size adjuster, copy icon name, copy SVG code, and instant SVG download.
3. **Explorer Page (`pages/icons/explore.vue`)**:
   - Dedicated route seamlessly linked into main navigation.
   - Full dark/light theme and Arabic RTL/English LTR layout integration.

---

## 5. Testing & Verification Strategy

- **Backend Unit Tests**:
  - Valid and invalid search queries.
  - Prefix and name validation rules.
  - Rate-limit thresholds and 429 response verification.
  - LRU cache hit/miss behavior and size bounds.
  - In-flight request deduplication (coalescing).
  - Circuit breaker trips and state transitions.
  - SSRF rejection tests.
- **Frontend Tests**:
  - Debounce and abort logic.
  - Loading, empty, and error state transitions.
  - SVG export and identifier copy actions.
- **Build Checks**:
  - Full TypeScript validation across both Backend and Frontend.
  - Independent build compilation (`npm run build`).

---

## 6. Commit & Delivery Schedule

- **Stage 1**: Architecture & Plan (Completed)
- **Stage 2**: Independent Backend Setup (Files, package.json, tsconfig)
- **Stage 3**: Iconify Upstream Client & Circuit Breaker
- **Stage 4**: In-Memory LRU Cache & Request Coalescing
- **Stage 5**: Multi-tier Rate Limiting Engine
- **Stage 6**: REST API Route Handlers
- **Stage 7**: Server Bootstrap & Health Observability
- **Stage 8**: Backend Automated Test Suite
- **Stage 9**: Backend Documentation & Dockerfile
- **Stage 10**: Frontend Composable & Network Integration
- **Stage 11**: Frontend UI Components & Explorer Page
- **Stage 12**: i18n Locales & Navigation Updates
- **Stage 13**: Security Audit & Production Verification
