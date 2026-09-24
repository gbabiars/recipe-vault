# Recipe Vault

Recipe Vault is a private, multi-user recipe application built with Next.js,
Clerk, and Supabase. Every authenticated Clerk user receives an isolated vault;
the application has no public recipes, sharing, or cross-user access.

Private pages share a sidebar with Recipes and Settings. Settings at `/settings`
links to Profile (`/user-profile`) and MCP keys (`/mcp-keys`); sign-in remains a
standalone page. The root URL redirects to `/recipes`.

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

For MCP Apps-capable hosts, `get_recipe` also renders a portable, read-only
recipe view after the model searches for and selects a recipe ID. The same tool
continues to return its existing JSON text response in hosts without MCP Apps
support. The view has no new scopes, authentication policy, external network
access, or write behavior; it receives only recipe fields needed for display.

`/api/mcp` is a compatibility endpoint for clients that cannot complete OAuth.
It accepts expiring, scoped Clerk user API keys created at `/mcp-keys`. OAuth is
the default and should be preferred for every compatible client.

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

## Component development

Run `pnpm storybook` and open `http://localhost:6006` to develop and review
components in isolation. Storybook discovers `.stories.*` and `.mdx` files
under `src`; the starter stories in `src/stories` demonstrate the pattern.
Select a story in the sidebar, then open the Code panel below its canvas to
view the rendered source snippet with that story's args.

Use `pnpm build-storybook` to create a production Storybook build. Its output
is written to `storybook-static/` and is not committed.

Checkbox and radio choices own their labels and optional help text:

```tsx
import { CheckboxGroup, CheckboxGroupItem, CheckboxInput } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio";

<CheckboxInput label="Email me updates" name="updates" value="yes" />

<CheckboxGroup label="Ingredients" name="ingredients">
  <CheckboxGroupItem value="basil" label="Basil" helpText="Fresh leaves." />
  <CheckboxGroupItem value="parsley" label="Parsley" />
</CheckboxGroup>

<RadioGroup label="Visibility" name="visibility" required>
  <RadioGroupItem value="private" label="Private" />
  <RadioGroupItem value="shared" label="Shared" helpText="Visible to others." />
</RadioGroup>
```

`Grid` in `src/components/ui/grid` supports fixed equal columns or card columns
that reflow from a minimum width. Use the optional `GridItem` for spans in fixed
column layouts; responsive spans use the grid's width at 40rem (`sm`) and 60rem
(`md`). Direct children and semantic elements such as `ul` and `li` are supported.

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
| `src/components/app`   | Shared private sidebar, navigation, and brand.                    |
| `src/features/recipes` | Recipe UI and feature composition.                                |
| `src/lib/auth`         | Clerk identity, API-key SDK adapter, and Supabase clients.        |
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
