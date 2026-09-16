# Recipe Vault

Recipe Vault is a private-only recipe application. Iteration 1 adds the secure, migration-backed recipe data model; it deliberately does not include recipe UI, API routes, or an MCP endpoint.

## Local development

1. Install Node.js 24 or newer.
2. Run `pnpm install`.
3. Copy `.env.example` to `.env.local` and replace the public placeholders with your Supabase project URL and anon key.
4. Run `npm run dev`, then open `http://localhost:3000`. `GET /health` is a configuration-free liveness check and returns no configuration details.

Run the baseline checks with `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`, or run the first three with `pnpm check`.

Next.js generates `next-env.d.ts` while running development, type generation, and production builds. It is intentionally ignored by Git. The `pnpm typecheck` command runs `next typegen` first so generated Next.js types are always available.

## Supabase configuration

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are required when code creates a Supabase client. They are public project configuration, so the anon key may be present in browser bundles. Row Level Security and future application authorization must protect the data.

Never place `SUPABASE_SERVICE_ROLE_KEY` in `NEXT_PUBLIC_*` variables or browser code. Iteration 0 does not require or use a service-role key. If a later server-only task requires it, configure it only as a server environment variable and keep its use isolated to server code.

The app validates required public settings at client creation and names only missing variable names in errors; values are never logged or returned.

## Recipe database (Iteration 1)

The version-controlled schema is in `supabase/migrations/20260916000000_recipe_vault.sql`.
It uses four application tables:

| Table | Purpose |
| --- | --- |
| `recipes` | The owner-scoped recipe record, timing, servings, tags, dietary flags, source, and notes. |
| `recipe_ingredients` | Ordered ingredient rows belonging to one recipe. |
| `recipe_steps` | Ordered preparation steps belonging to one recipe. |
| `recipe_audit_events` | Append-only write-event history for later trusted application and MCP logging. |

Every recipe has one `owner_id` referencing `auth.users(id)`. Ingredients and steps
inherit ownership through their recipe. Audit events retain an `owner_id` so the owner
can later view their own history; recipe and user links become null if their source is
deleted, preserving the event record. Tags and dietary flags are lowercase `text[]`
columns: a lightweight, queryable free-form label format rather than a fixed taxonomy.
Labels allow letters, numbers, spaces, underscores, and hyphens.

All four tables have RLS enabled. `authenticated` users can create, select, update, and
delete only recipes where `owner_id = auth.uid()`, and can manipulate ingredients and
steps only through an owned recipe. They can select only their own audit events. There
are intentionally no audit-event write policies, so a normal authenticated JWT cannot
insert, alter, or delete audit history. `anon` is explicitly granted no access.
Trusted future server-side code may append audit records using a service role or a
narrowly scoped database function; a service-role key must remain server-only.

The database enforces nonblank required text, positive child ordering and servings,
nonnegative quantities and durations, unique child order per recipe, valid label
arrays, and a total time no shorter than prep plus cook time when all three are supplied.
Indexes support owner-scoped recent lists, title search, ordered children, and audit
history. `updated_at` is automatically refreshed on recipe, ingredient, and step
updates.

### Applying and verifying locally

Install and start the Supabase CLI locally, then apply the migration using your normal
local workflow (for example, `supabase start` followed by `supabase db reset`). The
included local config deliberately disables automatic seeding, so reset works without
an Auth fixture. Do not point reset commands at a shared or production database. Run
ownership and constraint verification against the local database URL:

```sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/recipe_rls_verification.sql
# equivalently: DATABASE_URL=... pnpm test:db
```

The verification script creates only two synthetic `.test` Auth identities inside a
transaction and always rolls it back. It checks owner CRUD, cross-owner and anonymous
denial, invalid values, and audit immutability.

`supabase/seed.sql` is an intentionally manual, development-only sample seed. Create a
local Auth user through the local Supabase dashboard, replace the placeholder UUID in
that file with its ID, and run it in the local SQL editor or through `psql`. It inserts
one fictional recipe only and refuses to run until an existing local Auth user ID is
provided. Never use it in shared, preview, or production environments.

## Vercel deployment

1. Import this repository into Vercel and use the default Next.js build settings (`pnpm build`).
2. In **Project Settings → Environment Variables**, add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for each needed environment (Production, Preview, and Development). Do not commit a `.env.local` file.
3. Add any future server-only secrets, such as a service-role key if explicitly needed, in the same Vercel environment-variable settings. Do not add them to source, GitHub Actions secrets unless CI truly needs them, logs, or client variables.
4. Deploy. The placeholder app and `/health` route build without Supabase settings because neither instantiates a client; protected functionality added later will require the variables.

Supabase project, Auth provider, redirect URL, and Vercel account configuration are manual setup steps and are intentionally not changed by this repository.

## Architecture boundaries

| Location | Responsibility |
| --- | --- |
| `src/app` | Next.js routes, layouts, and route handlers |
| `src/features/recipes` | Recipe-specific UI and feature composition |
| `src/lib/auth` | Supabase browser/server clients and future auth policy |
| `src/lib/db` | Database repositories and access adapters |
| `src/lib/recipes` | Recipe-domain services and policy |
| `src/lib/validation` | Shared validation schemas |
| `src/mcp` | Future remote MCP transport and adapters |

Features should use the domain and database boundaries rather than query Supabase directly. Route handlers should validate inputs before invoking domain services. The future MCP endpoint must use the same authorization and recipe-domain policies as the web/API surface.

## Deferred product decisions

- **Sign-in:** choose either Google-only sign-in restricted to the owner email or magic-link email restricted to the owner email before auth is implemented. No provider or owner email is guessed or configured here.
- **Recipe visibility:** private-only.
- **First MCP client:** choose the initial client to validate in a later iteration; none is assumed here.

## Dependencies

The only non-Next runtime additions are `@supabase/ssr` and `@supabase/supabase-js`, the official Supabase clients needed for browser and server session handling. `tsx` is the small development-only loader that lets the native Node test runner exercise TypeScript without introducing a larger test framework.

This repository uses pnpm 11.23.0, pinned in `package.json` and `pnpm-lock.yaml`. `pnpm-workspace.yaml` is pnpm configuration (not a monorepo declaration); it permits install scripts only for the two transitive build tools required by the project.
