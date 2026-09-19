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
2. If Clerk has enabled its beta **Client ID Metadata Document (CIMD)** support
   for your account, enable **Publish CIMD support** and allow compatible
   clients according to your client-admission policy. Clerk currently requires
   contacting support to enable this beta.
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

### 2.4 Configure user admission and optional fallback keys

1. Configure Clerk sign-up and invitation policy to match who may have a Recipe
   Vault account. For a closed product, disable public sign-up and invite users.
2. Enable Clerk **User API keys** only if you need to support MCP clients that
   cannot complete OAuth.
3. Do not treat DCR as user provisioning. It registers client software; Clerk's
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
6. If compatibility keys are required, visit `http://localhost:3000/mcp-keys`,
   create a scoped key with a 30-, 90-, or 365-day lifetime, and configure the
   older client to call `http://localhost:3000/api/mcp` with
   `Authorization: Bearer <key>`.
7. Confirm a key with only `recipes:read` cannot call `save_recipe`.
8. Revoke the fallback key and confirm it stops working.
9. Run `pnpm format`, `pnpm check`, `pnpm peers check`, and `pnpm build`.

OAuth access tokens are short lived. Requesting `offline_access` allows a client
to obtain a refresh token and renew access without requiring another sign-in on
every access-token expiration. Long-lived API keys are therefore a compatibility
feature, not a requirement for OAuth-capable MCP clients.

## 6. Deploy the Supabase migration

### 6.1 Current repository state

As verified on 2026-09-19, this checkout is linked to the Supabase project named
`Recipe Vault`, project reference `twctwhuasfrkcsbjxkzk`. The remote migration
history contains the first three repository migrations. The one pending remote
migration is:

```text
20260919000000_multi_user_clerk_oauth.sql
```

Do not infer that this project is production from its name. Before any remote
write, open the Supabase Dashboard and verify that the project reference in the
browser URL is exactly `twctwhuasfrkcsbjxkzk` and that this is the environment
you intend to change.

### 6.2 Choose exactly one migration deployment mechanism

First open **Supabase Dashboard → Project Settings → Integrations → GitHub**.

- If **Deploy to production** is enabled for this repository's `main` branch,
  merging or pushing the migration to `main` applies it automatically. Do not
  also run `db push` manually. Require the Supabase deployment check to pass.
- If that integration is absent or production deployment is disabled, use the
  manual CLI procedure below.

The repository has no GitHub Actions migration workflow. Vercel does not apply
Supabase migrations. A Vercel deployment and a database migration are separate
operations.

For this one-time authorization change, a controlled manual push is the clearest
option if automatic Supabase production deployment is not already configured.
For future work, Supabase recommends its GitHub integration or a dedicated CI
pipeline so only one actor deploys migrations.

### 6.3 Run the production data preflight

In **Supabase Dashboard → SQL Editor**, select the exact target project and run
these read-only queries:

```sql
select count(*) as recipe_count,
       count(distinct owner_id) as distinct_owner_count
from public.recipes;

select owner_id, count(*) as recipe_count
from public.recipes
group by owner_id
order by owner_id;

select user_id
from public.recipe_vault_private_owners
order by user_id;

select distinct recipes.owner_id
from public.recipes
left join public.recipe_vault_private_owners owners
  on owners.user_id = recipes.owner_id
where owners.user_id is null;

select distinct owner_id
from public.recipes
where owner_id !~ '^user_[A-Za-z0-9]+$';
```

Stop if either of the last two queries returns a row. For every distinct
`owner_id`, open **Clerk Dashboard → Users**, find the production user, and
confirm its Clerk user ID is an exact match. Do not guess or transform an ID.
If a mapping is required, create and review a separate data migration with the
explicit old-to-new mapping before applying this policy migration.

The migration does not rewrite recipes. It:

1. Drops the policies that require membership in the single-owner allow-list.
2. Creates per-user policies comparing `owner_id` to the verified Clerk `sub`
   claim for recipes, ingredients, steps, and audit events.
3. Replaces the audit function so any authenticated Clerk user can audit only
   their own recipe; the trusted service-role MCP adapter remains supported.
4. Drops `recipe_vault_is_private_owner()`.
5. Drops `recipe_vault_private_owners`.

It runs inside a PostgreSQL transaction. A SQL error rolls back the migration,
but a successful migration intentionally removes the old allow-list table.

### 6.4 Confirm a recoverable backup

For a paid Supabase project, open **Database → Backups** and confirm a completed
backup or PITR recovery point exists from immediately before the deployment.
Record its timestamp.

For a project without a restorable Dashboard backup, create logical dumps into
an encrypted directory outside this repository. Do not commit them:

```sh
mkdir -p ../recipe-vault-backup-2026-09-19
pnpm exec supabase db dump --linked --file ../recipe-vault-backup-2026-09-19/schema.sql
pnpm exec supabase db dump --linked --role-only --file ../recipe-vault-backup-2026-09-19/roles.sql
pnpm exec supabase db dump --linked --data-only --use-copy --file ../recipe-vault-backup-2026-09-19/data.sql
```

The CLI may request the target project's database password. Supabase database
backups do not contain Storage objects; back up Storage separately if the
project begins using it.

### 6.5 Preview the exact remote change

From the repository root, authenticate with the Supabase CLI if needed, then
verify the target and migration history:

```sh
pnpm exec supabase login
pnpm exec supabase link --project-ref twctwhuasfrkcsbjxkzk
pnpm exec supabase migration list --linked
pnpm exec supabase db push --linked --dry-run
```

The dry run must list only `20260919000000_multi_user_clerk_oauth.sql`. Stop if
it lists an older migration, reports a remote-only migration, targets a different
project, or proposes seed data. Do not use `--include-seed`.

Never run `supabase db reset --linked`; that command destroys and rebuilds the
remote database.

### 6.6 Apply the migration manually

Only when the preflight and backup are complete, and only if the GitHub
integration is not deploying this migration, run:

```sh
pnpm exec supabase db push --linked
```

Read the confirmation prompt and verify the project and migration name before
accepting. Do not use `--include-all` to bypass a history mismatch. If the CLI
suggests `migration repair`, stop and investigate rather than repairing history
blindly.

Then verify local and remote history match:

```sh
pnpm exec supabase migration list --linked
```

### 6.7 Verify the resulting policies

Run this read-only SQL in the Supabase SQL Editor:

```sql
select to_regclass('public.recipe_vault_private_owners') is null
  as old_allow_list_removed;

select to_regprocedure('public.recipe_vault_is_private_owner()') is null
  as old_owner_function_removed;

select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in (
    'recipes',
    'recipe_ingredients',
    'recipe_steps',
    'recipe_audit_events'
  )
order by tablename, policyname;

select version
from supabase_migrations.schema_migrations
where version = '20260919000000';
```

Both Boolean checks must be `true`, the policies must have names beginning
`Clerk users can`, and the migration-history query must return one row.

Do not run the repository's `recipe_rls_verification.sql` against production:
although it rolls back its fixtures, it intentionally performs write attempts.
Run that verification only against local or disposable preview databases.

### 6.8 Rollback rule

If the migration fails, its transaction should leave the previous schema in
place; capture the error and do not run `migration repair` automatically.

If the migration succeeds but production verification fails before users create
new data, restore the recorded backup and redeploy the previous application
commit together. If users have written data after migration, do not restore an
old backup blindly because that would discard their writes. Freeze writes and
create a reviewed forward recovery migration instead.

## 7. Configure and deploy Vercel

### 7.1 What is and is not currently configured

This repository contains no `vercel.json`, no committed Vercel project metadata,
and no Vercel deployment workflow. The local checkout is not linked through a
`.vercel/project.json` file, and the Vercel CLI is not installed locally. Those
facts do not prove that a Vercel project does not already exist; verify in the
Vercel Dashboard.

No `vercel.json` is required for the current application. Next.js route handlers
are supported directly by Vercel, `/mcp` explicitly uses the Node.js runtime,
and the MCP tools perform bounded database operations. Do not increase function
duration unless a future MCP tool performs genuinely long-running work.

### 7.2 Create or inspect the Vercel project

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

### 7.3 Use separate environment credentials

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

Delete `RECIPE_VAULT_OWNER_ID` from every Vercel environment. Do not add
`SUPABASE_DB_PASSWORD`, `SUPABASE_ACCESS_TOKEN`, or a database connection string
to the Vercel application; runtime code does not need them.

For Preview deployments, use Clerk development keys and a separate hosted
Supabase staging project or Supabase preview branch configured to trust that
Clerk development domain. Never expose the production service-role key to an
untrusted preview deployment. If there is no isolated preview database, do not
enable authenticated preview testing against production.

Vercel environment-variable edits affect only new deployments. Redeploy after
every relevant variable change.

### 7.4 Configure the production domain

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

### 7.5 Controlled release sequence

1. Complete Clerk production OAuth, scope, domain, DCR/CIMD, and Supabase
   integration settings.
2. Complete Vercel Production variables and the custom domain.
3. Produce a Vercel Preview deployment with isolated development/staging
   credentials and confirm the build log uses Node 24 and pnpm 11.23.0.
4. Complete the Supabase preflight and backup.
5. Choose one release path:
   - **Manual Supabase push:** apply the migration with `db push`, verify it,
     then push the application commit to the Vercel production branch.
   - **Supabase GitHub integration:** merge the tested branch to `main` once.
     That merge triggers both Supabase and Vercel. Monitor both deployment
     checks and do not test or announce the release until the Supabase migration
     and Vercel deployment have both succeeded.
6. Confirm Vercel reports the deployment as **Ready**. Inspect runtime logs for
   Clerk, MCP, or Supabase errors without logging credentials.
7. Verify these public endpoints return successful JSON responses:
   - `https://<production-domain>/.well-known/oauth-protected-resource/mcp`
   - `https://<production-domain>/.well-known/oauth-authorization-server`
8. Connect a DCR-capable MCP client using only
   `https://<production-domain>/mcp`, complete consent, and exercise search,
   get, and save.
9. Repeat the isolation test with two admitted production test users.
10. Test `/api/mcp` only for a client that requires the API-key fallback, then
    revoke its test key.

## 8. Credential model

- **Preferred:** `/mcp` with Clerk OAuth, CIMD when available, DCR as the broad
  compatibility path, PKCE, consent, custom scopes, and `offline_access`. This
  works for every admitted user without per-user app registration.
- **Fallback:** `/api/mcp` with a Clerk user API key. Create the narrowest scope
  and shortest practical lifetime. The UI allows 30, 90, or 365 days and
  defaults to 90 days.
- **Never send to clients:** `CLERK_SECRET_KEY` or
  `SUPABASE_SERVICE_ROLE_KEY`. The service-role key remains only in the trusted
  MCP server adapter after Clerk authenticates the caller and binds their user
  ID.

Official references:

- [Clerk: Build an MCP server in Next.js](https://clerk.com/docs/nextjs/guides/ai/mcp/build-mcp-server)
- [Clerk: How Clerk implements OAuth](https://clerk.com/docs/guides/configure/auth-strategies/oauth/how-clerk-implements-oauth)
- [Clerk: User API keys](https://clerk.com/docs/guides/development/machine-auth/api-keys)
- [Supabase: Clerk third-party authentication](https://supabase.com/docs/guides/auth/third-party/clerk)
- [Supabase: Database migrations](https://supabase.com/docs/guides/deployment/database-migrations)
- [Supabase: Database backups](https://supabase.com/docs/guides/platform/backups)
- [Vercel: Environment variables](https://vercel.com/docs/environment-variables)
- [Vercel: Package managers](https://vercel.com/docs/package-managers)
- [Clerk: Deploy to Vercel](https://clerk.com/docs/guides/development/deployment/vercel)
