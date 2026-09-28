# Database boundary

`recipe-repository.ts` is the application adapter for recipe, ingredient, and step
queries. It accepts the authenticated owner ID explicitly and normally uses the
request-scoped Clerk session JWT, so every browser/API query remains protected by
the caller's JWT and database RLS. Application features must not query Supabase
directly.

`recordAudit` invokes the narrowly scoped `recipe_vault_record_audit_event` database
function. It accepts Clerk string IDs, requires an owned target recipe, and records
request ID and method—never headers, credentials, or recipe content. The verified
MCP adapter is the only server-side service-role caller; it binds the verified Clerk
user and checks the tool scope before creating this repository.

Tags live in owner-scoped `tags` and `recipe_tags` tables. The stable tag ID and
association rows are authoritative; `recipes.tags` remains a database-maintained
compatibility projection for existing recipe API readers and filters. A recipe
insert or update that supplies the legacy array normalizes names, resolves or
creates tags with a unique owner/name constraint, and replaces associations in
one transaction. Tag rename and delete refresh affected recipe arrays; deletion
cascades associations, never recipes. Application recipe create/update uses
`recipe_vault_write_recipe` so recipe fields, details, and tags commit or roll
back together. Association rows have no direct authenticated write grant.

`RecipeRepository.listTags(ownerId, search)` reads up to 25 owned tag names in
alphabetical order for the existing HTTP endpoint. An empty search lists the
first 25; nonempty search matches a literal substring case-insensitively. The
caller's JWT and RLS still enforce ownership.

`tag-repository.ts` owns aggregate tag inventory reads for MCP. Its
`TagRepository.list(ownerId, options)` calls the stable
`recipe_vault_list_tag_inventory` RPC, which counts distinct associated recipes
and applies owner, search, usage, sort, and keyset cursor predicates in one
query. The RPC is `SECURITY INVOKER`, has an empty search path, and can be
executed only by `service_role`. Every call supplies the owner ID bound by the
verified MCP adapter; no model-controlled identity reaches the database.

`TagRepository.deleteUnused(ownerId, tagId)` calls the restricted
`recipe_vault_delete_unused_tag` RPC. It locks the owned tag row before
rechecking recipe associations, so an in-flight association cannot race the
zero-usage check. It returns `false` for both used tags and missing/unowned IDs
to avoid revealing another owner's tag existence. The RPC preserves the
existing tag-deletion trigger behavior and is executable only by `service_role`.
