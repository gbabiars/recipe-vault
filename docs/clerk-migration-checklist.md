# Clerk multi-user OAuth migration checklist

Use the full [Clerk OAuth MCP setup](mcp-oauth-setup.md) runbook for commands,
dashboard locations, verification, and security details. This page is the
short production change checklist.

1. Confirm all existing `recipes.owner_id` values are real Clerk production
   user IDs, and correct any mismatches.
2. Back up the production Supabase database.
3. In Clerk, create the `recipes:read` and `recipes:write` OAuth scopes.
4. Enable CIMD if Clerk has enabled the beta for your account, DCR for clients
   without CIMD support, PKCE, consent, and the `offline_access` scope. Prefer
   opaque access tokens.
5. Enable Clerk's native Supabase integration and configure the matching Clerk
   domain in Supabase third-party authentication.
6. Set the five Clerk and Supabase environment variables documented in
   `.env.example`; remove `RECIPE_VAULT_OWNER_ID`.
7. Apply `20260919000000_multi_user_clerk_oauth.sql` before deploying the
   matching application release.
8. Verify OAuth metadata, DCR onboarding, scope enforcement, two-user data
   isolation, and fallback-key revocation.
9. Revoke and replace any old permanent or unscoped MCP credentials.

The migration drops the former single-owner allow-list. Roll back the database
backup and the application release together if rollback is necessary.
