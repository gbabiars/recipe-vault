# Clerk multi-user OAuth migration checklist

Use the full [Clerk OAuth MCP setup](mcp-oauth-setup.md) runbook for commands,
dashboard locations, verification, and security details. This page is the
short production change checklist.

1. Confirm the linked Supabase project reference is `twctwhuasfrkcsbjxkzk` and
   that it is the intended deployment target.
2. Check **Supabase → Project Settings → Integrations → GitHub** and choose one
   migration deployment mechanism. Never combine automatic production deploy
   with a manual `db push`.
3. Run the read-only owner-ID preflight from the full runbook. Confirm every
   existing `recipes.owner_id` is a real Clerk production user ID and an exact
   match; stop on any mismatch.
4. Confirm a restorable production backup or create external schema, role, and
   data dumps.
5. In Clerk, create the `recipes:read` and `recipes:write` OAuth scopes.
6. Enable CIMD if Clerk has enabled the beta for your account, DCR for clients
   without CIMD support, PKCE, consent, and the `offline_access` scope. Prefer
   opaque access tokens.
7. Enable Clerk's native Supabase integration and configure the matching Clerk
   domain in Supabase third-party authentication.
8. In Vercel, select Node 24, enable Corepack, configure production and isolated
   preview credentials, attach a customer-owned production domain, and remove
   `RECIPE_VAULT_OWNER_ID`.
9. Run `pnpm exec supabase db push --linked --dry-run`; it must show only
   `20260919000000_multi_user_clerk_oauth.sql`.
10. Apply that migration once, confirm migration history and the new policies,
    then deploy the matching application release.
11. Verify OAuth metadata, DCR onboarding, scope enforcement, two-user data
    isolation, and fallback-key revocation.
12. Revoke and replace any old permanent or unscoped MCP credentials.

The migration drops the former single-owner allow-list. If no post-migration
writes occurred, roll back the database backup and application release together.
If writes occurred, freeze writes and use a reviewed forward recovery migration
instead of restoring away new user data.
