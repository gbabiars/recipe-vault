# Database boundary

`recipe-repository.ts` is the sole application adapter for recipe, ingredient, and step
queries. It accepts the authenticated owner ID explicitly and uses the request-scoped
Supabase client, so every query remains protected by the caller's JWT and database RLS.
Application features must not query Supabase directly.

`recordAudit` invokes the narrowly scoped `recipe_vault_record_audit_event` database function. It uses the caller JWT and only accepts the current authenticated owner; it records request ID and method, never headers, credentials, or recipe content.
