# Clerk OAuth MCP setup

This runbook configures Recipe Vault's standard Clerk + Next.js + Supabase
architecture. Perform the Clerk and Supabase dashboard steps separately for the
development and production instances and projects.

## 1. Update the local checkout

1. Install Node.js 24 or newer and pnpm 11.23.0.
2. From the repository root, run `pnpm install`.
3. Copy `.env.example` to `.env.local` if `.env.local` does not already exist.
4. Add these public values to `.env.local`:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
5. Add these server-only values:
   - `CLERK_SECRET_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
6. Remove the obsolete `RECIPE_VAULT_OWNER_ID` value, if present.
7. In `supabase/config.toml`, set `[auth.third_party.clerk].enabled` to `true`
   and set `domain` to the Clerk development instance domain shown in Clerk's
   Supabase integration screen.

Do not reuse production credentials locally. Never expose either server-only
secret through a `NEXT_PUBLIC_*` variable, a client response, or a log.

## 2. Configure Clerk in the web dashboard

Select the Clerk instance for the environment you are configuring.

### 2.1 Connect Supabase

1. Open **Integrations** and select **Supabase**.
2. Activate Clerk's native Supabase integration.
3. Copy the Clerk domain that Clerk provides; you will use it in Supabase and
   the matching local `supabase/config.toml` environment.
4. Do not create or retain the deprecated Supabase JWT template. This codebase
   uses Clerk session tokens and Supabase's native third-party-auth support.

### 2.2 Add the MCP scopes

1. Open **OAuth applications**, then **Scopes**.
2. Create `recipes:read` with a user-facing description such as “Read your
   recipes.”
3. Create `recipes:write` with a user-facing description such as “Create
   recipes in your vault.”
4. Make both scopes available to OAuth applications.

### 2.3 Enable automatic MCP client onboarding

1. Open the OAuth application settings.
2. Enable **Publish CIMD support** for compatible clients and allow them
   according to your client-admission policy.
3. Enable **Publish DCR support** for clients that do not support CIMD. DCR is
   the broad-compatibility path and remains necessary for those clients.
4. Include `recipes:read`, `recipes:write`, and `offline_access` in the allowed
   default scopes.
5. Require PKCE. CIMD clients always use PKCE with the `S256` method.
6. Keep the authorization consent screen enabled so users can review access.
7. Prefer opaque access tokens when the Clerk dashboard offers the choice; they
   support immediate server-side revocation.

With CIMD or DCR enabled, compatible MCP clients onboard themselves. You do not
create one Clerk OAuth application for each Recipe Vault user. CIMD clients
identify themselves with their HTTPS metadata URL; DCR clients register
themselves automatically. The user still signs in to an existing Recipe Vault
account and grants consent.

### 2.4 Configure user admission

1. Configure Clerk sign-up and invitation policy to match who may have a Recipe
   Vault account. For a closed product, disable public sign-up and invite users.
2. Do not treat DCR as user provisioning. It registers client software; Clerk's
   user policy controls who can sign in.

## 3. Configure Supabase in the web dashboard

Select the matching Supabase project.

1. Open **Authentication**, then the **Third-Party Auth** or **Sign In / Providers**
   area, and add Clerk.
2. Paste the Clerk domain from the Clerk Supabase integration screen.
3. Open the project's API settings and copy:
   - the project URL into `NEXT_PUBLIC_SUPABASE_URL`;
   - the publishable key into `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`;
   - the service-role key into the server-only `SUPABASE_SERVICE_ROLE_KEY`.
4. Do not enable a second end-user identity system for Recipe Vault. Clerk is
   the identity provider; Supabase verifies Clerk session tokens for browser
   and application API access.

## 4. Apply and verify the local database change

1. Start local Supabase with `pnpm supabase:start`.
2. Rebuild the local database with `pnpm db:reset`.
3. Get the local database connection string with `pnpm supabase:status`.
4. Set `DATABASE_URL` to that local connection string and run `pnpm test:db`.
5. Confirm the verification passes for two different Clerk subject IDs: each
   user can create and read their own recipe, and neither can read the other's.

The migration preserves existing recipe `owner_id` values. They must already be
real Clerk user IDs before production migration. It removes the former
single-owner allow-list and changes row-level security to per-user ownership.

## 5. Verify the application locally

1. Run `pnpm dev` and open `http://localhost:3000`.
2. Sign in as one Clerk user, create a recipe, and confirm it appears.
3. Sign out, sign in as a second admitted Clerk user, and confirm the first
   user's recipe is not visible.
4. Configure an OAuth-capable MCP client with only
   `http://localhost:3000/mcp`. Do not supply a client ID or secret when the
   client supports DCR.
5. Complete the Clerk sign-in and consent flow. Confirm search, get, and save
   operate only on that Clerk user's recipes.
6. Run `pnpm format`, `pnpm check`, and `pnpm build`.

OAuth access tokens are short lived. Requesting `offline_access` allows a client
to obtain a refresh token and renew access without requiring another sign-in on
every access-token expiration.

## 6. Configure and deploy Vercel

### 6.1 What is and is not currently configured

This repository contains no `vercel.json`, committed Vercel project metadata,
or Vercel deployment workflow. Check the Vercel Dashboard for an existing
project before creating one.

No `vercel.json` is required for the current application. Next.js route handlers
are supported directly by Vercel, `/mcp` explicitly uses the Node.js runtime,
and the MCP tools perform bounded database operations. Do not increase function
duration unless a future MCP tool performs genuinely long-running work.

### 6.2 Create or inspect the Vercel project

1. Open the Vercel Dashboard and locate a project connected to
   `gbabiars/recipe-vault`.
2. If none exists, choose **Add New → Project**, import that GitHub repository,
   and set the root directory to the repository root (`.`).
3. Under **Settings → Build and Deployment**, verify:
   - Framework Preset: **Next.js**
   - Node.js Version: **24.x**
   - Build Command: default Next.js command or `pnpm build`
   - Output Directory: leave unset
4. Do not set a plain `pnpm install` override. Vercel documents that a plain
   override can select an older pnpm. This repository pins `pnpm@11.23.0` in
   `package.json`.
5. Add `ENABLE_EXPERIMENTAL_COREPACK=1` to Development, Preview, and Production
   so Vercel honors the pinned `packageManager` value. Verify the deployment log
   reports pnpm 11.23.0.

Vercel's current standard package-manager table lists pnpm through version 10,
while this repository is intentionally pinned to pnpm 11.23.0. Corepack is the
documented mechanism for honoring that pin, but the Preview build is the release
gate: if the log does not show pnpm 11.23.0 or dependency installation fails,
stop. Do not silently let Vercel select an older pnpm or change the repository's
pin without a separate compatibility decision.

### 6.3 Use separate environment credentials

Open **Vercel Project → Settings → Environment Variables**. Add the following
to Production with production values:

| Variable                               | Production value                        | Exposure            |
| -------------------------------------- | --------------------------------------- | ------------------- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`    | Clerk production `pk_live_...`          | Browser-safe        |
| `CLERK_SECRET_KEY`                     | Matching Clerk production `sk_live_...` | Server-only         |
| `NEXT_PUBLIC_SUPABASE_URL`             | Production Supabase project URL         | Browser-safe        |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Production publishable key              | Browser-safe        |
| `SUPABASE_SERVICE_ROLE_KEY`            | Production service-role key             | Server-only         |
| `ENABLE_EXPERIMENTAL_COREPACK`         | `1`                                     | Build configuration |
| `NEXT_PUBLIC_SENTRY_DSN`               | Sentry `recipe-vault` project DSN       | Browser-safe        |

Delete `RECIPE_VAULT_OWNER_ID` from every Vercel environment. Do not add
`SUPABASE_DB_PASSWORD`, `SUPABASE_ACCESS_TOKEN`, or a database connection string
to the Vercel application; runtime code does not need them.

For Preview deployments, use Clerk development keys and a separate hosted
Supabase staging project or Supabase preview branch configured to trust that
Clerk development domain. Never expose the production service-role key to an
untrusted preview deployment. If there is no isolated preview database, do not
enable authenticated preview testing against production.

Add `NEXT_PUBLIC_SENTRY_DSN` to Preview as well if Sentry should collect events
from preview deployments. The app uses Vercel's `NEXT_PUBLIC_VERCEL_ENV` marker
to initialize Sentry only for Preview and Production deployments, never local
development.

Vercel environment-variable edits affect only new deployments. Redeploy after
every relevant variable change.

### 6.4 Configure the production domain

Clerk requires a customer-owned domain for a production instance; a
`*.vercel.app` URL is not sufficient for production.

1. In **Vercel Project → Settings → Domains**, add the intended production
   domain and complete Vercel's DNS instructions.
2. In the Clerk production instance, open **Domains**, set that application
   domain, and complete Clerk's DNS records.
3. After the Clerk production domain is verified, copy the current production
   publishable and secret keys into Vercel Production. Domain changes can cause
   Clerk to issue an updated publishable key.
4. In the Clerk production instance, activate the Supabase integration.
5. In the production Supabase project, open **Authentication → Third-Party Auth**,
   add Clerk, and paste the production Clerk domain. The local
   `[auth.third_party.clerk]` entry does not configure the hosted project.

Use Clerk's default Account Portal consent page unless there is a concrete need
for a custom consent route.

### 6.5 Controlled release sequence

1. Complete Clerk production OAuth, scope, domain, DCR/CIMD, and Supabase
   integration settings.
2. Complete Vercel Production variables and the custom domain.
3. Produce a Vercel Preview deployment with isolated development/staging
   credentials and confirm the build log uses Node 24 and pnpm 11.23.0.
4. Review pending Supabase migrations, confirm the target project, and complete a pre-deployment backup.
5. Choose one release path:
   - **Manual Supabase push:** apply reviewed pending migrations with `db push`
     and verify migration history before deploying the application commit.
   - **Supabase GitHub integration:** merge the tested branch to `main` once.
     Monitor Supabase and Vercel deployment checks, and do not test or announce
     the release until both the database migration and application deployment
     have succeeded.
6. Confirm Vercel reports the deployment as **Ready**. Inspect runtime logs for
   Clerk, MCP, or Supabase errors without logging credentials.
7. Verify these public endpoints return successful JSON responses:
   - `https://<production-domain>/.well-known/oauth-protected-resource/mcp`
   - `https://<production-domain>/.well-known/oauth-authorization-server`
8. Connect a DCR-capable MCP client using only
   `https://<production-domain>/mcp`, complete consent, and exercise search,
   get, and save.
9. Repeat the isolation test with two admitted production test users.

## 7. Credential model

The [security and ownership standard](../standards/security-and-ownership.md)
defines the credential boundary. These setup reminders apply when configuring
an MCP deployment:

- **Preferred:** `/mcp` with Clerk OAuth, CIMD when available, DCR as the broad
  compatibility path, PKCE, consent, custom scopes, and `offline_access`. This
  works for every admitted user without per-user app registration.
- **Never send to clients:** `CLERK_SECRET_KEY` or
  `SUPABASE_SERVICE_ROLE_KEY`. The service-role key remains only in the trusted
  MCP server adapter after Clerk authenticates the caller and binds their user
  ID.

Official references:

- [Clerk: CIMD general availability](https://clerk.com/changelog)
- [Clerk: Build an MCP server in Next.js](https://clerk.com/docs/nextjs/guides/ai/mcp/build-mcp-server)
- [Clerk: How Clerk implements OAuth](https://clerk.com/docs/guides/configure/auth-strategies/oauth/how-clerk-implements-oauth)
- [Supabase: Clerk third-party authentication](https://supabase.com/docs/guides/auth/third-party/clerk)
- [Supabase: Database migrations](https://supabase.com/docs/guides/deployment/database-migrations)
- [Supabase: Database backups](https://supabase.com/docs/guides/platform/backups)
- [Vercel: Environment variables](https://vercel.com/docs/environment-variables)
- [Vercel: Package managers](https://vercel.com/docs/package-managers)
- [Clerk: Deploy to Vercel](https://clerk.com/docs/guides/development/deployment/vercel)
