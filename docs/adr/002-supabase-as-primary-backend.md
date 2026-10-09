# ADR 002: Supabase as Primary Backend Engine

## Status
Accepted

## Context
The platform requires production-grade relational integrity, battle-tested authentication (JWT sessions, OAuth readiness), fine-grained Row Level Security (RLS), and scalable object storage.

## Decision
We adopt Supabase (PostgreSQL 16 + GoTrue Auth + PostgREST + Storage API) as the primary backend:
- PostgreSQL RLS enforces security at the data layer, ensuring unauthorized read/write access is blocked even if application code suffers a logical regression.
- Nuxt Server (Nitro) acts as an authenticated intermediary and security barrier for administrative operations requiring the `SUPABASE_SERVICE_ROLE_KEY`.
- The frontend client strictly uses the public Anon key (`NUXT_PUBLIC_SUPABASE_ANON_KEY`) with user sessions.
- An abstraction repository layer (`server/services` & `composables`) ensures that switching database drivers or introducing an external microservice in Phase 2+ requires minimal code changes.

## Consequences
### Positive
- Declarative security policies via SQL RLS.
- Built-in session persistence, user management, and JWT validation.
- Native storage bucket access policies synced with SQL auth.

### Negative
- Developers must maintain migration scripts for all schema changes rather than relying on GUI dashboard modifications.
