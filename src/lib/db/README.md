# Database boundary

`recipe-repository.ts` is the sole application adapter for recipe, ingredient, and step
queries. It accepts the authenticated owner ID explicitly and normally uses the
request-scoped Clerk session JWT, so every browser/API query remains protected by
the caller's JWT and database RLS. Application features must not query Supabase
directly.

`recordAudit` invokes the narrowly scoped `recipe_vault_record_audit_event` database
function. It accepts Clerk string IDs, requires an owned target recipe, and records
request ID and method—never headers, credentials, or recipe content. The verified
MCP adapter is the only server-side service-role caller; it binds the verified Clerk
user and checks the tool scope before creating this repository.
