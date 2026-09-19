# Recipe Vault

Recipe Vault is a private-only recipe application built with Next.js, Clerk,
and Supabase. Clerk authenticates browser users; Supabase remains the data layer
and enforces Row Level Security (RLS). There is one configured Clerk owner—this
repository does not provide registration, sharing, invitations, or public data.

## Clerk and Supabase

The app uses Clerk's native Supabase third-party-auth integration. Clerk session
tokens are supplied to Supabase through its `accessToken` callback; the app does
not create a Supabase Auth session or use the deprecated shared-secret Clerk JWT
template. Recipe and audit ownership are Clerk string IDs, and RLS compares
`owner_id` with `auth.jwt()->>'sub'`.

The browser UI and `/api/v1` require the configured `RECIPE_VAULT_OWNER_ID`.
RLS separately checks that same owner is present in the database's private-owner
allow-list, so another signed-in Clerk user cannot create or access data.

Follow the [Clerk migration checklist](docs/clerk-migration-checklist.md) before
deployment. It covers Clerk and Supabase Dashboard setup, Vercel variables,
legacy UUID mapping, database migration order, MCP key creation, verification,
and rollback/revocation.

## Application API

The private browser-session API is under `/api/v1`. Identity comes from Clerk on
the server, never from a request owner field. Inputs are validated before the
recipe service runs; owned resources that do not exist return `404`.

| Method   | Path                  | Behavior                                                                                    |
| -------- | --------------------- | ------------------------------------------------------------------------------------------- |
| `GET`    | `/api/v1/recipes`     | Paginated owned summaries; supports `page`, `pageSize`, `search`, `tag`, and `dietaryFlag`. |
| `POST`   | `/api/v1/recipes`     | Creates an owned recipe from the canonical payload.                                         |
| `GET`    | `/api/v1/recipes/:id` | Returns an owned complete recipe.                                                           |
| `PATCH`  | `/api/v1/recipes/:id` | Validates and applies a partial update.                                                     |
| `DELETE` | `/api/v1/recipes/:id` | Deletes an owned recipe.                                                                    |

Successful browser/API writes record a safe audit event. Recipe bodies,
cookies, bearer credentials, and headers are never put in audit metadata or
application logs.

## MCP

`/api/mcp` is a private Streamable HTTP MCP endpoint with exactly three tools:
`search_recipes`, `get_recipe`, and create-only `save_recipe`. It accepts a
Clerk **user API key** as `Authorization: Bearer …`. The route verifies the key
server-side, requires its subject to match `RECIPE_VAULT_OWNER_ID`, and requires
`recipes:read` for search/get or `recipes:write` for save.

Clerk API keys are opaque credentials rather than Supabase JWTs. They are never
forwarded to Supabase. After verification, the server uses its server-only
Supabase service credential for this narrowly constrained MCP path; it is not
available to browser code or clients. Browser and `/api/v1` traffic still uses
RLS-scoped Clerk session JWTs directly.

The private owner creates MCP keys at `/mcp-keys`. Each key has either
`recipes:read` or `recipes:read` plus `recipes:write`; the displayed secret is
shown once and must be stored only in the intended MCP client. Existing keys can
be revoked from the same page. The general Clerk profile remains separate.

Use `MCP_ENDPOINT`, `OPENAI_API_KEY`, and `MCP_CLERK_API_KEY` only in a shell
when running `pnpm test:mcp:openai`; do not save credentials in the repository
or logs.

## Local development

1. Install Node.js 24+ and run `pnpm install`.
2. Copy `.env.example` to `.env.local` and enter development-only Clerk and
   Supabase values.
3. Configure the local Clerk third-party-auth domain in `supabase/config.toml`.
4. Start Supabase, apply migrations, and verify the database:

   ```sh
   pnpm supabase:start
   pnpm db:reset
   DATABASE_URL=... pnpm test:db
   ```

5. Run `pnpm dev` and open `http://localhost:3000`.

Use `pnpm format` after edits, then `pnpm lint`, `pnpm typecheck`, and
`pnpm test`; `pnpm check` runs the first three together. `/health` is a
configuration-free liveness route.

## Database

The schema lives in `supabase/migrations`. Recipes, ingredients, steps, and
audit events all have RLS. The Clerk migration changes `owner_id` and audit
actors from UUIDs linked to `auth.users` into text Clerk IDs; no user data is
synchronized between providers. Existing records require the deliberate mapping
step in the migration checklist.

`recipe_vault_record_audit_event` accepts Clerk string owner IDs and verifies
the current RLS caller owns the target recipe. The MCP server's service role may
also use it only after its route has verified the Clerk API key, owner, and
scope. Direct audit table writes remain unavailable to authenticated users.

## Security configuration

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and
`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` are public configuration. `CLERK_SECRET_KEY`
and `SUPABASE_SERVICE_ROLE_KEY` are server-only secrets. Never rename either
secret with a `NEXT_PUBLIC_` prefix, return it in a response, or put it in a log.

## Architecture

| Location               | Responsibility                               |
| ---------------------- | -------------------------------------------- |
| `src/app`              | Routes, pages, and route handlers            |
| `src/features/recipes` | Recipe UI and server actions                 |
| `src/lib/auth`         | Clerk identity and Supabase clients          |
| `src/lib/db`           | Recipe persistence adapter                   |
| `src/lib/recipes`      | Recipe-domain behavior and ownership scoping |
| `src/lib/validation`   | Shared input validation                      |
| `src/mcp`              | MCP transport, key policy, and tool adapters |
