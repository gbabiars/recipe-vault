# Database boundary

`recipe-repository.ts` is the application adapter for recipe persistence. It
accepts the authenticated owner ID explicitly and uses the request-scoped Clerk
session JWT for browser/API access, so database RLS remains the enforcement
boundary. Application features must not query Supabase directly. Document reads
and writes use the complete JSONB recipe and its separate revision; a database
RPC performs atomic create, revision-checked replacement, or deletion.

`tag-repository.ts` owns document-derived tag inventory and name replacement.
`listFromDocuments(ownerId, options)` invokes
`recipe_vault_list_document_tag_inventory` and returns canonical names with
exact recipe usage counts. Inventory pages accept one name or usage cursor in
either direction (`after` or `before`) and return names in the selected display
order. `replaceDocumentTagName(ownerId, sourceName,
targetName)` invokes the owner-bound `recipe_vault_replace_document_tag` RPC;
it replaces names across affected documents atomically and collapses duplicates.
The document arrays are the only tag source in the target model. There is no
separate tags or recipe-tags table as an application data source.

The repository retains a legacy tag `list` method for compatibility, but its
`deleteUnused` and ID-based `merge` methods have been removed. The database
retains the old inventory, delete, and merge functions and tables as transition
history/read-only soak storage. The cutover migration revokes the legacy recipe
writer, unused-tag deletion, ID-based merge RPCs, and direct DML on legacy
recipe, child, and tag tables. Removing old storage and functions is a separate
future migration. Do not wire new application behavior to legacy tag storage.

`recordAudit` invokes the narrowly scoped
`recipe_vault_record_audit_event` database function. It accepts Clerk string
IDs, requires an owned target recipe, and records request ID and method, never
headers, credentials, or recipe content. The verified MCP adapter is the only
server-side service-role caller. It binds the verified Clerk user and checks
tool scope before creating the server-only Supabase client. Its owner-bound
recipe service can use document RPCs with the service-role client; never expose
that credential to a browser, route input, or MCP tool argument.

The backfill and reconciliation utility reads the legacy recipe and child rows
to convert and compare them with documents. It is a migration tool, not an
application query path. The [recipe document cutover runbook](../../../docs/recipe-document-cutover-runbook.md)
describes the pause, final refresh and reconciliation, cutover gate, and
rollback boundary.
