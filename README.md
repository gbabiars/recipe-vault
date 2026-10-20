# Recipe Vault

Recipe Vault is a private, multi-user recipe application built with Next.js,
Clerk, and Supabase. Every authenticated Clerk user receives an isolated vault;
there are no public recipes, sharing, or cross-user access.

The app supports recipe creation, editing, search, tags, and website and PDF
imports. Private pages provide navigation to Recipes and Settings, while
sign-in is standalone. See the [recipe contracts](docs/reference/recipes.md)
for the current UI and HTTP API behavior, the [MCP contracts](docs/reference/mcp.md)
for remote tools and views, and the [architecture overview](docs/architecture/overview.md)
for the module map. The [security and ownership standard](docs/standards/security-and-ownership.md)
defines required access boundaries.

## Local development

1. Use Node.js 24 or newer and pnpm 11.23.0.
2. Run `pnpm install`.
3. Copy `.env.example` to `.env.local` and add the remote Supabase and Clerk
   values. Add LaunchDarkly's client-side ID and server-side SDK key to enable
   feature flags. `pnpm dev` uses this remote database by default.
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

Use the [verification standard](docs/standards/verification.md) for formatting,
checks, tests, and commit messages. For MCP configuration and deployment, use
the [OAuth setup guide](docs/guides/mcp-oauth-setup.md).

## Component development

Run `pnpm storybook` and open `http://localhost:6006` to develop and review
components and page compositions. Storybook discovers `.stories.*` and `.mdx`
files under `src`. Start with the [component index](src/components/ui/index.mdx)
and family guides or use Storybook's component docs tools. The
[UI composition](docs/standards/ui/composition.md),
[Storybook authoring](docs/standards/ui/storybook-authoring.md), and
[accessibility](docs/standards/ui/accessibility.md) standards define shared
rules. With Storybook running, its MCP server at `http://localhost:6006/mcp`
exposes `docs-list` and `docs-show` for component discovery and prop guidance.

Use `pnpm build-storybook` to create a production Storybook build. Its
`storybook-static/` output is not committed.

## Configuration and monitoring

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and
`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` are public client configuration.
`NEXT_PUBLIC_LD_CLIENT_ID` is LaunchDarkly's public client-side ID. Private
pages use the Clerk user ID as the LaunchDarkly user context key without
sending a name or email. The server signs that key with `LD_SDK_KEY` for
LaunchDarkly secure mode; enable secure mode in each environment and make each
flag available to client-side SDKs before reading it in the browser.

`CLERK_SECRET_KEY`, `LD_SDK_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are
server-only. The [security standard](docs/standards/security-and-ownership.md)
defines how they may be used and protected.

The app reports browser, Node.js, and Edge errors to the `recipe-vault` Sentry
project on Vercel Preview and Production deployments, with request tracing
sampled at 10%. Sentry does not initialize in local development.
`NEXT_PUBLIC_SENTRY_DSN` is public project configuration; configure it only
in deployed environments. Set `SENTRY_DSN` only when a separate server-side
value is useful. SDK user info is disabled; event filters remove user objects
and `user.*` tags. Telemetry omits cookies, headers, request and response
bodies, URL query values, database query data, and stack-frame local
variables. Session Replay is disabled because pages can contain private
recipes.

Set `SENTRY_AUTH_TOKEN` as a build secret to upload source maps and create
Sentry releases during production builds. The build detects the Git commit
for the release by default; set `SENTRY_RELEASE` during the build to use a
different identifier, such as the deployed commit SHA.

The private [Recipe Vault plugin](plugins/recipe-vault/README.md) packages a
recipe import skill for local distribution. It connects to a separately
configured Recipe Vault MCP endpoint.
