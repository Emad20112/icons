# Security Architecture & Policies

## 1. Threat Modeling & Defense-in-Depth

```text
[Incoming Request]
       │
       ▼
[1. Nitro Security Headers Middleware]
       │ (HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy)
       ▼
[2. Rate Limiting Strategy]
       │ (IP-based sliding window)
       ▼
[3. Authentication & JWT Validation]
       │ (Supabase GoTrue bearer tokens verified)
       ▼
[4. Boundary Zod Schema Validation]
       │ (Sanitize input, strict types, trim strings, reject unknowns)
       ▼
[5. File & SVG Sanitizer Pipeline]
       │ (Strip scripts, dangerous tags, check MIME & magic bytes)
       ▼
[6. Service Layer RBAC Verification]
       │ (Check USER vs ADMIN capabilities)
       ▼
[7. PostgreSQL Row Level Security (RLS)]
       │ (Hardened SQL database layer protection)
       ▼
[8. Audit Logging]
       │ (Record actor, action, target entity, timestamp)
       ▼
[Success Response (Never leaks internal traces or DB schemas)]
```

---

## 2. Secrets Management & Boundaries

| Secret / Config Key | Boundary | Storage Location | Exposure Risk |
| :--- | :--- | :--- | :--- |
| `NUXT_PUBLIC_SUPABASE_URL` | Public Client & Server | `.env` / runtimeConfig.public | None (Intended for client) |
| `NUXT_PUBLIC_SUPABASE_ANON_KEY` | Public Client & Server | `.env` / runtimeConfig.public | Low (Protected by RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Strict Server Only** | `.env` / runtimeConfig | **CRITICAL: Bypasses RLS** |

### Critical Rule:
The `SUPABASE_SERVICE_ROLE_KEY` is **never imported** in any Vue component or composable under `app/`, `components/`, or `pages/`. It is only referenced inside `server/` endpoints.

---

## 3. SVG & File Upload Sanitization Strategy

Vectors (SVG files) can embed malicious JavaScript via `<script>`, `onload`, `onclick`, `href="javascript:..."`, `<foreignObject>`, and `<use>` links.

Our security sanitizer enforces:
1. Removal of all `<script>` elements.
2. Removal of all `on*` event handlers (`onload`, `onerror`, `onclick`, etc.).
3. Removal of `javascript:` or `data:text/html` URLs.
4. Stripping of `<foreignObject>` and external entity declarations (`<!ENTITY ...>`).
5. Whitelisting valid SVG attributes (`xmlns`, `viewBox`, `path`, `circle`, `rect`, `fill`, `stroke`, etc.).

---

## 4. Error Handling & Information Disclosure
- Database stack traces and raw SQL error messages are never sent to the client.
- Unified error classes (`AppError`, `ValidationError`, `AuthorizationError`, `NotFoundError`) provide user-friendly messages with structured codes.
