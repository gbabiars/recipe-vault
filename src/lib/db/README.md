# Database boundary

`recipe-repository.ts` is the application adapter for recipe persistence. It
accepts the authenticated owner ID explicitly and uses the request-scoped Clerk
session JWT for browser/API access, so database RLS remains the enforcement
boundary. Application features must not query Supabase directly. Reads select
the recipe's typed columns, string arrays, and ingredient/equipment JSONB, then
assemble and validate the existing `Recipe` shape. Writes send complete content
to an owner-bound database RPC, which atomically creates or revision-checks a
replacement and returns a transient assembled document with its revision.

`RecipeRepository.listRecipes(ownerId, search, tags, offset, limit)` calls
`recipe_vault_search_recipe_documents`. The invoker function requires an owner
ID and returns a page plus the pre-pagination total. Its transient document
payload is mapped through the same validation as row reads. A nonempty search is a
literal, case-insensitive substring matched within one title, description,
ingredient name, equipment name, or tag. Selected exact tag names match any
selected value and combine with text search using AND. The function keeps an
explicit owner predicate and runs with the caller's RLS context. Application
code goes through the request-scoped repository; the verified MCP adapter
calls through its owner-bound service. The authenticated RPC grant also stays
protected by the explicit owner predicate and RLS.

`tag-repository.ts` owns document-derived tag inventory and name replacement.
`listTags(ownerId, options)` invokes
`recipe_vault_list_document_tag_inventory` and returns canonical names with
exact recipe usage counts. Inventory pages accept one name or usage cursor in
either direction (`after` or `before`) and return names in the selected display
order. `replaceTagName(ownerId, sourceName, targetName)` invokes the owner-bound `recipe_vault_replace_document_tag` RPC;
it replaces names across affected documents atomically and collapses duplicates.
The recipe tag arrays are the only tag source in the target model. There is no
separate tags or recipe-tags table as an application data source.

The storage migration removes the single recipe `document` column while
retaining the public recipe document contract at the repository boundary.
Simple recipe values are stored in columns, string collections in `text[]`,
and ingredient/equipment structures in JSONB. Keep
`recipe_vault_set_updated_at` because the recipes table still uses its trigger;
keep Clerk ownership helpers, audit storage, and recipe mutation/tag RPCs.

`recordAudit` invokes the narrowly scoped
`recipe_vault_record_audit_event` database function. It accepts Clerk string
IDs, requires an owned target recipe, and records request ID and method, never
headers, credentials, or recipe content. The verified MCP adapter is the only
server-side service-role caller. It binds the verified Clerk user and checks
tool scope before creating the server-only Supabase client. Its owner-bound
recipe service can use document RPCs with the service-role client; never expose
that credential to a browser, route input, or MCP tool argument.

The [recipe document cutover runbook](../../../docs/recipe-document-cutover-runbook.md)
describes application deployment, the forward cleanup migration, and the
post-migration verification boundary.
