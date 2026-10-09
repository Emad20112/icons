# Development & Testing Guide

## 1. Getting Started

### Prerequisites
- Node.js >= 20
- pnpm >= 9 (or npm >= 10)

### Setup
```bash
# Clone the repository
git checkout feat/phase-0-foundation

# Install dependencies
pnpm install

# Prepare Nuxt types
pnpm postinstall
```

---

## 2. Running Locally

### Development Server
```bash
pnpm dev
```
Runs at [http://localhost:3000](http://localhost:3000).

### Type Checking
```bash
pnpm typecheck
```

### Running Test Suite
```bash
pnpm test
```

### Building for Production
```bash
pnpm build
pnpm start
```

---

## 3. Database & Migrations

To apply SQL migrations to your Supabase project:

### Using Supabase CLI:
```bash
supabase db push
# or
supabase migration up
```

### Manual Execution:
Execute files in order inside the Supabase SQL editor:
1. `supabase/migrations/20261008000001_initial_schema.sql`
2. `supabase/migrations/20261008000002_rls_policies.sql`
3. `supabase/migrations/20261008000003_indexes.sql`
4. `supabase/migrations/20261008000004_storage_setup.sql`
5. `supabase/migrations/20261008000005_seed_data.sql`
