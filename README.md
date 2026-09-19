# Recipe Vault

Recipe Vault is a private, multi-user recipe application built with Next.js,
Clerk, and Supabase. Every authenticated Clerk user receives an isolated vault;
the application has no public recipes, sharing, or cross-user access.

## Authentication and data access

Clerk is the only identity provider. Browser and `/api/v1` requests use Clerk
session tokens through Supabase's native third-party-auth `accessToken`
integration. Supabase row-level security compares each row's text `owner_id`
with `auth.jwt()->>'sub'`.

MCP requests use Clerk authentication at the Next.js boundary. Clerk OAuth and
API-key credentials are never sent to Supabase. After verification, the MCP
adapter binds the Clerk user ID to a server-only recipe service; only that
adapter can use the Supabase service-role credential.

Account admission remains a Clerk setting. Dynamic Client Registration lets MCP
clients register automatically, but it does not create Recipe Vault users or
change the Clerk instance's sign-up policy.

## Application API

The authenticated API is under `/api/v1`. Identity always comes from Clerk and
never from a request owner field.

| Method   | Path                  | Behavior                                           |
| -------- | --------------------- | -------------------------------------------------- |
| `GET`    | `/api/v1/recipes`     | Paginated owned summaries with search and filters. |
| `POST`   | `/api/v1/recipes`     | Creates an owned recipe.                           |
| `GET`    | `/api/v1/recipes/:id` | Returns one owned complete recipe.                 |
| `PATCH`  | `/api/v1/recipes/:id` | Validates and applies a partial update.            |
| `DELETE` | `/api/v1/recipes/:id` | Deletes an owned recipe.                           |

Successful writes record safe audit events. Recipe bodies, cookies,
credentials, and request headers are never placed in audit metadata or
application logs.

## MCP

The primary remote MCP endpoint is `/mcp`. It uses Clerk OAuth 2.1, PKCE,
consent, automatic client onboarding (CIMD where available, with DCR for broad
client compatibility), and the standard OAuth metadata endpoints:

- `/.well-known/oauth-protected-resource/mcp`
- `/.well-known/oauth-authorization-server`

The server exposes `search_recipes`, `get_recipe`, and create-only
`save_recipe`. Read tools require `recipes:read`; save requires
`recipes:write`.

`/api/mcp` is a compatibility endpoint for clients that cannot complete OAuth.
It accepts expiring, scoped Clerk user API keys created at `/mcp-keys`. OAuth is
the default and should be preferred for every compatible client.

See [OAuth MCP setup](docs/mcp-oauth-setup.md) for exact local, Clerk, Supabase,
hosting, rollout, and verification instructions.

## Local development

1. Use Node.js 24 or newer and pnpm 11.23.0.
2. Run `pnpm install`.
3. Copy `.env.example` to `.env.local` and add development Clerk and Supabase
   values.
4. Confirm the Clerk development domain under `[auth.third_party.clerk]` in
   `supabase/config.toml`.
5. Run `pnpm supabase:start`, `pnpm db:reset`, and the database verification.
6. Run `pnpm dev` and open `http://localhost:3000`.

After edits, run `pnpm format`, then `pnpm check` and `pnpm build`.

## Security configuration

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and
`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` are public client configuration.
`CLERK_SECRET_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are server-only. Never add a
`NEXT_PUBLIC_` prefix to either secret, expose them to an MCP client, or log
them.

## Architecture

| Location               | Responsibility                                                    |
| ---------------------- | ----------------------------------------------------------------- |
| `src/app`              | Thin pages, API routes, OAuth metadata, and MCP route handlers.   |
| `src/features/recipes` | Recipe UI and feature composition.                                |
| `src/lib/auth`         | Clerk identity, API-key SDK adapter, and Supabase clients.        |
| `src/lib/db`           | Recipe persistence and Supabase access.                           |
| `src/lib/recipes`      | Ownership-aware domain services.                                  |
| `src/lib/validation`   | Shared input schemas.                                             |
| `src/mcp`              | MCP transport composition, principals, scopes, and tool adapters. |
