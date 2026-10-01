# Recipe Vault

Recipe Vault is a private, multi-user recipe application built with Next.js,
Clerk, and Supabase. Every authenticated Clerk user receives an isolated vault;
the application has no public recipes, sharing, or cross-user access.

Private pages show a sidebar at 768px and wider. Below 768px, a Recipe Vault
title bar opens a left navigation drawer. Both provide Recipes and an account
menu with Settings and Sign out. Settings at `/settings` links to Profile
(`/user-profile`); sign-in remains a standalone page. The root URL redirects to
`/recipes`.

## Authentication and data access

Clerk is the only identity provider. Browser and `/api/v1` requests use Clerk
session tokens through Supabase's native third-party-auth `accessToken`
integration. Supabase row-level security compares each row's text `owner_id`
with `auth.jwt()->>'sub'`.

MCP requests use Clerk OAuth at the Next.js boundary. OAuth access tokens are
never sent to Supabase. After verification, the MCP adapter binds the Clerk
user ID to a server-only recipe service; only that adapter can use the Supabase
service-role credential.

Account admission remains a Clerk setting. Dynamic Client Registration lets MCP
clients register automatically, but it does not create Recipe Vault users or
change the Clerk instance's sign-up policy.

## Application API

The authenticated API is under `/api/v1`. Identity always comes from Clerk and
never from a request owner field.

| Method   | Path                  | Behavior                                                                 |
| -------- | --------------------- | ------------------------------------------------------------------------ |
| `GET`    | `/api/v1/recipes`     | Paginated owned summaries with search and filters.                       |
| `GET`    | `/api/v1/tags`        | First 25 owned tag names, or a `search` substring match, alphabetically. |
| `POST`   | `/api/v1/recipes`     | Creates an owned recipe.                                                 |
| `GET`    | `/api/v1/recipes/:id` | Returns one owned complete recipe.                                       |
| `PATCH`  | `/api/v1/recipes/:id` | Validates and applies a partial update.                                  |
| `DELETE` | `/api/v1/recipes/:id` | Deletes an owned recipe.                                                 |

The tag endpoint returns `{ data: [{ name }], meta: { requestId } }` with a
private `no-store` response. An empty or omitted `search` lists the first 25.

Recipe `tags: string[]` remains the API format. Tag IDs and associations live
in owner-scoped database tables; the array is a synchronized compatibility
projection until recipe readers and writers move to the new model. The tag
migration backfills existing arrays using lowercase names, trimmed surrounding
whitespace, and one space for repeated internal spaces. Similar names are kept
separate. Recipe writes are atomic database transactions, including tag creation
and ingredient and step changes. The MCP exposes owner-scoped tag inventory and
tag maintenance operations; a dedicated tag-management UI remains future work.
Apply the tag migration before deploying the application code that calls the new
recipe write function. The migration retains the array and installs its sync
triggers, so older application instances can continue writing during rollout.

Recipe ingredients use `displayOrder`, `ingredientName`, optional free-text
`amount` (up to 128 trimmed characters), and optional `notes`. Amounts can
preserve source wording such as `1 1/2 cups` or `to taste`.
Apply the ingredient amount migration before deploying application code that
uses this contract; it converts existing quantity/unit values before dropping
those columns.

Successful writes record safe audit events. Recipe bodies, cookies,
credentials, and request headers are never placed in audit metadata or
application logs.

## MCP

The remote MCP endpoint is `/mcp`. It uses Clerk OAuth 2.1, PKCE,
consent, automatic client onboarding (CIMD where available, with DCR for broad
client compatibility), and the standard OAuth metadata endpoints:

- `/.well-known/oauth-protected-resource/mcp`
- `/.well-known/oauth-authorization-server`

The server exposes `list_tags`, `delete_unused_tag`, `merge_tags`,
`search_recipes`, `get_recipe`, and create-only `save_recipe`. Read tools require
`recipes:read`; tag maintenance and save require `recipes:write`. `list_tags`
returns each owned tag's ID, name, and exact associated-recipe count, with
literal search, used/unused filtering, usage sorting, and cursor pagination.
An agent can remove an unused tag by ID or merge an explicitly selected source
tag into a target; merge preserves recipe associations, deduplicates recipes
that already have both, and never guesses similar names.

For MCP Apps-capable hosts, `get_recipe` also renders a portable, read-only
recipe view after the model searches for and selects a recipe ID. The same tool
continues to return its existing JSON text response in hosts without MCP Apps
support. The view has no new scopes, authentication policy, external network
access, or write behavior; it receives only recipe fields needed for display.

MCP connections use the OAuth flow at `/mcp`; users sign in and grant consent
from their MCP client.

See [OAuth MCP setup](docs/mcp-oauth-setup.md) for exact local, Clerk, Supabase,
hosting, rollout, and verification instructions.

## Local development

1. Use Node.js 24 or newer and pnpm 11.23.0.
2. Run `pnpm install`.
3. Copy `.env.example` to `.env.local` and add the remote Supabase and Clerk
   values. `pnpm dev` uses this remote database by default.
4. To use a local Supabase database instead, create an ignored `.env.local-db`
   file containing local replacements for all three Supabase variables below.
   Obtain the values after `pnpm supabase:start` with `pnpm supabase:status`.

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-local-publishable-key
   SUPABASE_SERVICE_ROLE_KEY=your-local-service-role-key
   ```

5. Confirm the Clerk development domain under `[auth.third_party.clerk]` in
   `supabase/config.toml`.
6. Run `pnpm supabase:start`, `pnpm db:reset`, and the database verification.
7. Run `pnpm dev` for remote data or `pnpm dev:local` for local data, then open
   `http://localhost:3000`.

After edits, run `pnpm format`, then `pnpm check` and `pnpm build`.
For commits, follow the [message convention](AGENTS.md#commit-messages).

## Component development

Run `pnpm storybook` and open `http://localhost:6006` to develop and review
components in isolation. Storybook discovers `.stories.*` and `.mdx` files
under `src`. Start with the [UI intent index](src/components/ui/README.md) to
choose a component and read its colocated MDX guidance and stories.
Select a story in the sidebar, then open the Code panel below its canvas to
view the rendered source snippet with that story's args.

With Storybook running, its MCP server at `http://localhost:6006/mcp` exposes
`docs-list` and `docs-show` for component discovery, guidance, stories, and API.

Keep component styling in CSS modules. `src/app/globals.css` contains shared
tokens, sitewide element defaults, and the `.visually-hidden` accessibility
utility. Use that global class to keep labels available to assistive technology
when they should not appear visually.

Use `--color-interaction-neutral-hover` and
`--color-interaction-neutral-active` for neutral button and interactive Card
state overlays. Their transparent colors blend with the surface beneath the
control, including default and subtle cards. Use the solid `--color-background-*`
tokens for surfaces themselves.

Use `pnpm build-storybook` to create a production Storybook build. Its output
is written to `storybook-static/` and is not committed.

The [UI intent index](src/components/ui/README.md) owns component and
composition guidance, including page headers, fields, actions, cards, and lists.

## Security configuration

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and
`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` are public client configuration.
`CLERK_SECRET_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are server-only. Never add a
`NEXT_PUBLIC_` prefix to either secret, expose them to an MCP client, or log
them.

## Error monitoring

The app reports browser, Node.js, and Edge errors to the `recipe-vault` Sentry
project on Vercel Preview and Production deployments, with request tracing sampled
at 10%. Sentry does not initialize in local development. `NEXT_PUBLIC_SENTRY_DSN`
is public project configuration; configure it in deployed environments only. Set
`SENTRY_DSN` only when a separate server-side value is useful. SDK user info is
disabled, and event filters remove user objects and `user.*` tags. Telemetry also
omits cookies, headers, request and response bodies, URL query values, database
query data, and stack-frame local variables; URL query strings are removed from
events, breadcrumbs, and spans. Session Replay is not enabled because pages can
contain private recipes.

Set `SENTRY_AUTH_TOKEN` as a build secret to upload source maps and create Sentry
releases during production builds. The build detects the Git commit for the
release by default; set `SENTRY_RELEASE` during the build to use a different
identifier, such as the deployed commit SHA. Sentry telemetry remains disabled
for local development even when the public DSN is configured.

## Recipe imports

The recipes menu always offers manual recipe creation and website import.

## Architecture

| Location               | Responsibility                                                    |
| ---------------------- | ----------------------------------------------------------------- |
| `src/app`              | Thin pages, API routes, OAuth metadata, and MCP route handlers.   |
| `src/components/app`   | Shared private sidebar, navigation, and brand.                    |
| `src/features/recipes` | Recipe UI and feature composition.                                |
| `src/lib/auth`         | Clerk identity, OAuth verification, and Supabase clients.         |
| `src/lib/db`           | Recipe persistence and Supabase access.                           |
| `src/lib/recipes`      | Ownership-aware domain services.                                  |
| `src/lib/validation`   | Shared input schemas.                                             |
| `src/mcp`              | MCP transport composition, principals, scopes, and tool adapters. |

## Design token follow-up

The private layout uses shared sidebar and content width tokens alongside the
existing semantic color, spacing, radius, and typography tokens. Text and
heading variants use semantic font tokens backed by shared font-size,
line-height, and weight primitives. Motion durations are still hard-coded,
including 150ms transitions. Some page rules also use literal spacing and
radius values.
