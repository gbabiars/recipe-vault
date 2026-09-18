# Clerk migration checklist

Complete these steps in a maintenance window. Keep the former Supabase Auth
configuration in place until the post-deploy checks pass; the application no
longer uses it, but it is the fastest rollback path.

1. In Clerk, create or select the private application. Disable public sign-up
   and create the one owner account. Record its Clerk ID (`user_…`), not an
   email address.
2. In Clerk Dashboard, activate **Supabase integration** and copy its Clerk
   domain. This native integration adds the required `role: authenticated`
   claim to Clerk session tokens; do not configure the deprecated Supabase JWT
   template or share a Supabase signing secret.
3. In Supabase Dashboard, add **Clerk** under Authentication → Sign In /
   Providers and paste that Clerk domain. For local development set
   `[auth.third_party.clerk] enabled = true` and its `domain` in
   `supabase/config.toml`; never commit a real production domain or secret.
4. Before applying the migration, record each existing recipe owner UUID. Apply
   the migration, then run these statements in the Supabase SQL editor with
   the actual values, once per legacy owner:

   ```sql
   update public.recipes set owner_id = 'user_your_clerk_owner' where owner_id = 'legacy-supabase-uuid';
   update public.recipe_audit_events set owner_id = 'user_your_clerk_owner' where owner_id = 'legacy-supabase-uuid';
   update public.recipe_audit_events set actor_id = 'user_your_clerk_owner' where actor_id = 'legacy-supabase-uuid';
   insert into public.recipe_vault_private_owners (user_id) values ('user_your_clerk_owner') on conflict do nothing;
   ```

   The migration intentionally does not guess this identity mapping. Until the
   final insert, RLS denies every Clerk user.

5. In Vercel set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`,
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and
   `RECIPE_VAULT_OWNER_ID` (the same Clerk ID). For MCP only, also set the
   server-only `SUPABASE_SERVICE_ROLE_KEY`. Never prefix either secret with
   `NEXT_PUBLIC_`, place a key in a client, or put it in logs.
6. In Clerk Dashboard → API keys, enable **User API keys**. Create the MCP key
   for the private owner with `recipes:read` for search/get and add
   `recipes:write` only when save is needed. Store the displayed secret once in
   the MCP client; it cannot be retrieved later. The app accepts it only as
   `Authorization: Bearer …` on `/api/mcp`.
7. Deploy migrations before the application code. Verify browser sign-in, an
   owned recipe read/write, audit creation, and that a second Clerk account is
   denied. Verify a read-only key cannot call `save_recipe`, then revoke it in
   Clerk and confirm it immediately stops working.
8. To roll back before any further schema changes, deploy the prior application
   version, remove the Clerk owner row to lock access, revoke affected API keys,
   and restore the prior UUID owner values from the mapping recorded in step 4.
   Do not drop the migration or relax RLS as a rollback shortcut.

The MCP adapter verifies each Clerk API key server-side and checks its owner and
tool scope before constructing its server-only Supabase client. API keys are not
JWTs and are never sent to Supabase. Browser/API requests instead carry native
Clerk session tokens directly to Supabase, where RLS uses `auth.jwt()->>'sub'`.
