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
back together. Ingredient amounts are nullable text; the writer accepts the same
optional free-text amount used by the recipe input contract. Association rows have
no direct authenticated write grant.

`RecipeRepository.listTags(ownerId, search)` reads up to 25 owned tag names in
alphabetical order for the existing HTTP endpoint. An empty search lists the
first 25; nonempty search matches a literal substring case-insensitively. The
caller's JWT and RLS still enforce ownership.

`tag-repository.ts` owns aggregate tag inventory reads for the application and MCP. Its
`TagRepository.list(ownerId, options)` calls the stable
`recipe_vault_list_tag_inventory` RPC, which counts distinct associated recipes
and applies owner, search, usage, sort, and keyset cursor predicates in one
query. It supports `after` and `before` cursors; the reverse query selects the
nearest preceding page and returns its rows in normal sort order, with the
lookahead row last so `hasMore` remains directional. It also returns the
optional nullable free-text tag description; a
database `NULL` maps to an omitted `description` property. The RPC is
`SECURITY INVOKER`, has an empty search path, and can be executed by
`authenticated` and `service_role`. An
authenticated request uses its session JWT, so the existing owner RLS policies
filter both tags and associations. The verified MCP adapter still supplies its
bound owner ID while using its server-only `service_role` client.

`TagRepository.deleteUnused(ownerId, tagId)` calls the restricted
`recipe_vault_delete_unused_tag` RPC. It locks the owned tag row before
rechecking recipe associations, so an in-flight association cannot race the
zero-usage check. It returns `false` for both used tags and missing/unowned IDs
to avoid revealing another owner's tag existence. The RPC preserves the
existing tag-deletion trigger behavior and is executable only by `service_role`.

`TagRepository.merge(ownerId, sourceTagId, targetTagId)` calls the restricted
`recipe_vault_merge_tags` RPC. It locks both owned tag rows in ascending UUID
order, which serializes against FK-backed association writes and prevents
reverse-direction merges from acquiring the pair in opposite orders. The RPC
deletes overlapping source links before retargeting remaining links, then removes
the source tag in the same transaction. Existing `recipe_tags` triggers refresh
only affected `recipes.tags` projections; ingredients and other recipe fields
are left alone. Same, missing, and unowned IDs return the same false result.
