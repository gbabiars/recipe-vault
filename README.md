# Recipe Vault

Recipe Vault is a private-only recipe application. Iteration 4 adds an authenticated
remote MCP endpoint backed by Supabase OAuth 2.1; it does not add public registration,
sharing, API-key authentication, or external credentials.

## Application API (Iteration 3)

The private, browser-session authenticated API is under `/api/v1`. Every request requires a valid Supabase session; identity is read server-side from that session and never from a request user ID. This API is private/single-owner for v1 and Supabase RLS remains the database-level backstop. It does not enable signup, anonymous access, sharing, direct API credentials, or MCP authentication—those client-auth decisions are deferred to Iteration 4.

| Method   | Path                  | Behavior                                                                                                                                                                                |
| -------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`    | `/api/v1/recipes`     | Owned recipe summaries. Optional `page` (default 1), `pageSize` (1–100; default 25), `search`, `tag`, and `dietaryFlag`.                                                                |
| `POST`   | `/api/v1/recipes`     | Creates an owned recipe from the canonical Zod create payload. Ownership and audit fields are rejected.                                                                                 |
| `GET`    | `/api/v1/recipes/:id` | Returns a complete owned recipe. Missing and unowned recipes both return `404`.                                                                                                         |
| `PATCH`  | `/api/v1/recipes/:id` | Applies a non-empty partial patch, merges it with the owned recipe, then validates the complete result. Ingredient/step arrays replace their respective full collections when supplied. |
| `DELETE` | `/api/v1/recipes/:id` | Deletes an owned recipe and returns `204`; missing and unowned resources return `404`.                                                                                                  |

Successful creates, updates, and deletes record an audit event with actor, recipe identifier, event type, timestamp (database generated), request ID, and HTTP method. Recipe bodies, cookies, authorization values, and headers are not recorded. Responses use `{ "data": ... , "meta": { "requestId": ... } }`; errors use `{ "error": { "code", "message", "requestId", "details"? } }`. Invalid JSON is `400`, validation/query errors are `422`, no valid session is `401`, non-owned resources are non-enumerating `404`, and unexpected failures are generic `500`.

For example, while signed in locally:

```sh
curl -b 'your-local-session-cookie' 'http://localhost:3000/api/v1/recipes?search=pasta&page=1&pageSize=25'
curl -X POST -H 'content-type: application/json' -b 'your-local-session-cookie' http://localhost:3000/api/v1/recipes \\
  --data '{"title":"Example Pasta","tags":["weeknight"],"dietaryFlags":[],"ingredients":[{"displayOrder":1,"quantity":200,"unit":"g","ingredientName":"pasta"}],"steps":[{"stepOrder":1,"instruction":"Cook until tender."}]}'
```

Reads are limited to 120 requests/minute/user and writes to 30 requests/minute/user. The current in-memory limiter is a documented local-development fallback only; deploy a shared Vercel-compatible rate-limit provider before relying on limits in production. API logs are structured with request IDs and deliberately exclude credentials and recipe payloads.

## Local development

1. Install Node.js 24 or newer.
2. Run `pnpm install`.
3. Copy `.env.example` to `.env.local` and replace the public placeholders with your Supabase project URL and anon key.
4. Run `npm run dev`, then open `http://localhost:3000`. `GET /health` is a configuration-free liveness check and returns no configuration details.

Run the baseline checks with `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`, or run the first three with `pnpm check`. Format the repository with `pnpm format`; use `pnpm format:check` to verify formatting without changing files.

## MCP (Iteration 4)

The private Streamable HTTP MCP endpoint is `/api/mcp`. It exposes only
`search_recipes`, `get_recipe`, and the non-idempotent create-only `save_recipe`
tool. Supabase Auth is the OAuth 2.1 authorization server; an OAuth access token
is validated through Supabase JWKS and used exclusively to create the
RLS-scoped client passed into the existing recipe service. No personal API keys,
custom bearer tokens, service-role routines, or general-purpose tools are used.

See [the private operator guide](docs/mcp-operator-guide.md) and
[the deployment checklist](docs/mcp-deployment-checklist.md) for required
Supabase and Vercel dashboard configuration. Production deployment requires a
shared rate-limit provider; the bundled in-memory limiter is intentionally only
a local-development fallback.

## Browser tests

Playwright covers the signed-in recipe creation journey, including server-side form
validation and persistence. Start the local Supabase stack and apply migrations, then
create a local test-only account (email confirmation is disabled in `supabase/config.toml`):

```sh
pnpm supabase:start
pnpm db:reset
# Create a disposable account in local Supabase Studio at http://127.0.0.1:54323.
E2E_EMAIL='recipe-e2e@example.test' E2E_PASSWORD='a-test-password' pnpm test:e2e
```

The suite intentionally skips when these credentials are absent, so ordinary unit-test
runs never create accounts or write recipe data to a configured Supabase project.

Next.js generates `next-env.d.ts` while running development, type generation, and production builds. It is intentionally ignored by Git. The `pnpm typecheck` command runs `next typegen` first so generated Next.js types are always available.

## Supabase configuration

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are required when code creates a Supabase client. They are public project configuration, so the anon key may be present in browser bundles. Row Level Security and future application authorization must protect the data.

Never place `SUPABASE_SERVICE_ROLE_KEY` in `NEXT_PUBLIC_*` variables or browser code. Iteration 0 does not require or use a service-role key. If a later server-only task requires it, configure it only as a server environment variable and keep its use isolated to server code.

The app validates required public settings at client creation and names only missing variable names in errors; values are never logged or returned.

## Private admin interface (Iteration 2)

`/sign-in` accepts credentials for an account provisioned separately in Supabase. It has
no sign-up, invitation, or password-recovery UI, and failures use a generic access-denied
message. All `/recipes` pages and write actions obtain the authenticated user server-side
before using the recipe service; unauthenticated requests redirect to `/sign-in`.

The recipe list supports a title search plus optional tag and dietary-flag filters. Recipe
forms use the shared Zod create schema and preserve browser-entered fields on validation
errors. The repository remains backed by the authenticated user's anon-key session—not a
service role—and explicitly applies the owner ID in addition to the migration's RLS policy.

## Recipe database (Iteration 1)

The version-controlled schema is in `supabase/migrations/20260916000000_recipe_vault.sql`.
It uses four application tables:

| Table                 | Purpose                                                                                   |
| --------------------- | ----------------------------------------------------------------------------------------- |
| `recipes`             | The owner-scoped recipe record, timing, servings, tags, dietary flags, source, and notes. |
| `recipe_ingredients`  | Ordered ingredient rows belonging to one recipe.                                          |
| `recipe_steps`        | Ordered preparation steps belonging to one recipe.                                        |
| `recipe_audit_events` | Append-only write-event history for later trusted application and MCP logging.            |

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

The Supabase CLI is installed as a development dependency, so no separate global CLI
installation is needed. Start the local stack with `pnpm supabase:start`, inspect its
connection details with `pnpm supabase:status`, and apply all migrations with
`pnpm db:reset`. The reset command is for local development only; do not point it at a
shared or production database. Use `pnpm db:push` to apply pending migrations to a
linked remote project. The
included local config deliberately disables automatic seeding, so reset works without
an Auth fixture. Run ownership and constraint verification against the local database URL:

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

| Location               | Responsibility                                          |
| ---------------------- | ------------------------------------------------------- |
| `src/app`              | Next.js routes, layouts, and route handlers             |
| `src/features/recipes` | Recipe-specific UI, form conversion, and server actions |
| `src/lib/auth`         | Supabase browser/server clients and future auth policy  |
| `src/lib/db`           | Database repositories and access adapters               |
| `src/lib/recipes`      | Recipe-domain services and policy                       |
| `src/lib/validation`   | Shared validation schemas                               |
| `src/mcp`              | Future remote MCP transport and adapters                |

Features should use the domain and database boundaries rather than query Supabase directly. Route handlers should validate inputs before invoking domain services. The future MCP endpoint must use the same authorization and recipe-domain policies as the web/API surface.

## Deferred product decisions

- **Recipe visibility:** private-only.
- **First MCP client:** choose the initial client to validate in a later iteration; none is assumed here.

## Dependencies

The only non-Next runtime additions are `@supabase/ssr` and `@supabase/supabase-js`, the official Supabase clients needed for browser and server session handling. `tsx` is the small development-only loader that lets the native Node test runner exercise TypeScript without introducing a larger test framework.

This repository uses pnpm 11.23.0, pinned in `package.json` and `pnpm-lock.yaml`. `pnpm-workspace.yaml` is pnpm configuration (not a monorepo declaration); it permits install scripts only for the two transitive build tools required by the project.
