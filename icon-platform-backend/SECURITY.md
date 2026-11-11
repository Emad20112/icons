# Security Architecture & Policies

## 1. Threat Model & Mitigations

### 1.1 Server-Side Request Forgery (SSRF)
- **Risk**: An attacker manipulates backend requests to access internal private networks (e.g. AWS metadata `169.254.169.254`, localhost, internal microservices).
- **Mitigation**: Strict URL validation via `RequestValidator.validateUpstreamUrl`. The backend **only** communicates with explicitly whitelisted domains:
  - `api.iconify.design`
  - `api.simplesvg.com`
  - `api.unisvg.com`
- User-supplied URLs are never fetched under any circumstances.

### 1.2 Upstream Throttling & Resource Starvation
- **Risk**: A spike in traffic or malicious scraping exhausts Iconify rate limits or local memory.
- **Mitigation**:
  1. **In-Flight Request Deduplication**: Identical in-flight requests share a single upstream promise.
  2. **Bounded LRU Cache**: Memory usage is capped at `CACHE_MAX_ENTRIES` (default 5000), evicting oldest keys automatically.
  3. **Multi-tier Rate Limiting**: Per-IP limits protect both the backend and upstream services.
  4. **Circuit Breaker**: If upstream returns 5 consecutive failures, circuit opens and serves instant 503 instead of hanging or bombarding the external provider.

### 1.3 SVG Stored / Reflected XSS
- **Risk**: Malicious icons containing embedded `<script>`, `onload=`, or `javascript:` URI handlers executing in user browsers.
- **Mitigation**: `SvgSanitizer` cleans every SVG document, stripping all executable tags, event handlers, external style links, and scripts before returning with `image/svg+xml`.

### 1.4 Path Traversal & Injection
- **Risk**: Attempting directory traversal via `../../` in collection prefix or icon names.
- **Mitigation**: Strict regex whitelisting:
  - Prefix: `^[a-z0-9][a-z0-9-]{0,49}$`
  - Name: `^[a-z0-9][a-z0-9-_:]{0,99}$`
  - Rejection of null bytes, slashes, backslashes, and control characters.
