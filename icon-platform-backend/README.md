# Icon Platform Backend (Iconify Dynamic Integration)

Production-ready, standalone backend service integrating the official [Iconify Public API](https://iconify.design/docs/api/) dynamically without permanently storing icon datasets or SVG assets on our infrastructure.

## 🚀 Key Features

- **Strict Frontend/Backend Separation**: Fully independent microservice, ready to reside in its own private GitHub repository.
- **Dynamic On-the-Fly Retrieval**: Searches, browses collections, and renders SVGs on demand.
- **Zero Permanent Local Storage**: No database bloat, no permanent storage costs.
- **Bounded LRU In-Memory Cache**: Configurable TTLs per asset type with strict memory caps.
- **In-flight Request Coalescing**: Duplicate concurrent requests share a single upstream HTTP call.
- **Multi-tiered Rate Limiting**: Per-IP, per-endpoint, and global upstream safety ceiling with HTTP 429 and `Retry-After` headers.
- **Upstream Protection & Circuit Breaker**: Auto-trips during upstream outages; supports fallback host (`api.simplesvg.com`).
- **SSRF & XSS Defenses**: Strict URL whitelisting, regex input sanitization, and full SVG script stripping.
- **Observability**: Live metrics, uptime tracking, and `/health` probes.

---

## 🛠️ Quick Start

### 1. Prerequisites
- Node.js >= 20.0.0
- npm / pnpm / yarn

### 2. Installation
```bash
npm install
```

### 3. Environment Configuration
Copy the example configuration:
```bash
cp .env.example .env
```

### 4. Running Locally
```bash
# Development mode with hot-reload:
npm run dev

# Production build and run:
npm run build
npm start
```

### 5. Running Tests
```bash
npm run test
```

---

## 📡 API Overview

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Service health status and circuit breaker state |
| `GET` | `/api/v1/health` | Comprehensive metrics and rate-limiter stats |
| `GET` | `/api/v1/icons/search` | Search icons across all or specific collections |
| `GET` | `/api/v1/icons/collections` | List all available icon collections |
| `GET` | `/api/v1/icons/collections/:prefix` | Get metadata and icon list for a collection |
| `GET` | `/api/v1/icons/:prefix/:name` | Get raw Iconify JSON icon data |
| `GET` | `/api/v1/icons/:prefix/:name/svg` | Get rendered and sanitized standalone SVG |

For detailed parameters, headers, and schemas, consult [API_DOCUMENTATION.md](./API_DOCUMENTATION.md).
