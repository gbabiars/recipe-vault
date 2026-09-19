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

## 6. Deploy to production

1. Complete the Clerk and Supabase dashboard configuration above in the
   production instances before deploying the new application code.
2. Back up the production database.
3. Confirm every existing `recipes.owner_id` is the intended Clerk production
   user ID. Correct data before applying the migration if necessary.
4. Set the five environment variables from section 1 in the hosting provider.
   Remove `RECIPE_VAULT_OWNER_ID` from the hosting environment.
5. Apply `supabase/migrations/20260919000000_multi_user_clerk_oauth.sql` to the
   production Supabase project with the project's normal migration workflow.
6. Deploy the Next.js application.
7. Open these production URLs and confirm both return OAuth metadata:
   - `https://<host>/.well-known/oauth-protected-resource/mcp`
   - `https://<host>/.well-known/oauth-authorization-server`
8. Connect a new DCR-capable MCP client using only `https://<host>/mcp`, complete
   consent, and exercise all three tools.
9. Repeat the isolation test with two admitted production test users.
10. Test any client that must use the `/api/mcp` fallback, then revoke and
    replace old permanent or unscoped credentials.

Apply the database migration and compatible application release as one rollout.
Rolling back only one side would restore mismatched authorization assumptions.

## 7. Credential model

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
