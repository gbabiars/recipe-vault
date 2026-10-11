# Recipe document implementation plan

Revision: 3

Status: proposed implementation plan. The
[recipe document schema and storage proposal](recipe-document-storage-spec.md)
defines the target. This plan does not authorize application or database changes.

## Outcome and constraints

Store each complete recipe as one JSONB document, with the recipe ID, trusted Clerk
owner ID, revision, and timestamps in relational columns. Keep title search and
document-based tag filtering as targeted queries. Preserve private visibility,
existing title substring search, tag filtering and usage counts, import behavior,
recipe audit events, and MCP scope enforcement through the transition. After
cutover, no separate `tags` or `recipe_tags` table remains: each owner's recipe
documents are the source of tag names.

The logical recipe document has no owner or revision field. The repository
assembles `id` from the primary key when returning it. Arrays supply their own
order; the target does not store ingredient or instruction order numbers.

## Agreed migration decisions and rollout assumption

1. **Missing legacy yield:** Existing `servings` is nullable. Omit `yield` when
   no amount is known. Convert a positive serving count to
   `{ amount: servings, unit: "servings" }`. Inspect nonpositive legacy values
   and omit them only when the source truly has no stated yield; never invent
   one. If `yield` is present, its amount and unit must be valid.
2. **Legacy step duration:** The target has instruction strings without a
   duration field. Append ` (Duration: N minutes)` to an instruction with a
   non-null duration of `N`, including zero. Convert from the original row so
   repeating a backfill produces the same string.
3. **External contract:** Current `/api/v1` and MCP recipe contracts cannot
   represent non-serving yields, equipment, or multiple recipe notes. Change
   the existing HTTP and MCP recipe contracts in one coordinated cutover. New
   writes may omit `yield`; no compatibility default is invented.
4. **Cutover writes (plan assumption):** Use a short recipe-write pause for the final
   backfill and application cutover. This avoids a lasting pair of competing
   recipe representations. Reads remain available during the pause.
5. **Document-sourced tags:** A tag exists only while at least one owned recipe
   contains its canonical name. Tag IDs, descriptions, and unused tags are not
   in the target model. Archive the old owner/tag ID/name/description records
   and recipe/tag links, including unused tags, before retiring their tables;
   the new app will not display or edit that metadata.

## Proposed consuming interfaces

The recipe service stays the only application entry point to the repository.
Its new document methods return the agreed recipe and storage revision as a
separate envelope:

```ts
const current = await recipeService.getDocument(ownerId, recipeId);
if (!current) return notFound();

const saved = await recipeService.replaceDocument(
  ownerId,
  { ...current.recipe, title: "Garlic fried rice" },
  current.revision,
);
// A stale revision returns a conflict result rather than overwriting a newer edit.
```

The updated HTTP read returns `{ recipe, revision }`. A full-document write
supplies the expected revision. The API derives `ownerId` from the
authenticated session; clients never submit it:

```ts
const { recipe, revision } = await getRecipeDocument(recipeId);
await replaceRecipeDocument(recipeId, { recipe: editedRecipe, expectedRevision: revision });
```

The web form can edit the document as one value. Recipe updates replace the
complete validated content. The existing `/api/v1` and MCP recipe contracts
change together at cutover; the new HTTP write is a full-document replacement
with a required revision.

| Existing HTTP route         | Cutover contract                                                                                             |
| --------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `GET /api/v1/recipes/:id`   | Return `{ recipe, revision }`                                                                                |
| `POST /api/v1/recipes`      | Accept the complete document content without `id`; `yield` may be omitted; the server assigns `id` and owner |
| `PUT /api/v1/recipes/:id`   | Replace the complete document with `expectedRevision`; return a conflict on stale revision                   |
| `PATCH /api/v1/recipes/:id` | Remove the old partial-update contract at coordinated cutover                                                |

The list response will use a document-derived summary. The existing MCP
`save_recipe` input will allow yield to be absent and accept equipment and notes;
read and search tools will expose the new document shape. Document the breaking
contract before cutover.

Tag consumers use canonical names and derived usage counts. A rename or merge
replaces the source name across the owner's recipes; the target name may already
exist, in which case each recipe retains one copy. There is no operation for
deleting an unused tag because the inventory cannot contain one:

```ts
const page = await tagService.listFromRecipes(ownerId, {
  sort: "usage_desc",
  limit: 25,
});
await tagService.replaceNameInRecipes(ownerId, {
  sourceName: "quick meals",
  targetName: "weeknight",
});
```

The `/tags` page and `GET /api/v1/tags` show only `{ name, usageCount }` values
derived from recipes. The MCP `list_tags` result drops IDs, descriptions, and
the `unused` filter. Replace ID-based `merge_tags` with a name-based operation;
remove `delete_unused_tag`. Document these breaking tag contracts alongside the
recipe contract.

## Implementation steps

### 1. Inventory and conversion contract

- Query a disposable local database and then the intended migration dataset
  read-only for counts of missing or nonpositive servings, non-null step
  durations, missing ingredient/step rows, tag descriptions, unused tags, and
  values that violate the new document constraints. Report counts and IDs
  without logging recipe content.
- Define pure conversion from the old read model: `summary` becomes
  `description` (empty string when absent); a positive `servings` becomes
  `{ amount: servings, unit: "servings" }` and absent servings omit `yield`;
  scalar recipe `notes` becomes `[]` or a one-item array; ingredient and step
  rows follow their existing order;
  equipment becomes `[]`; canonical tag names and source URL retain their
  current values. Archive the old tag owner, ID, name, and description records,
  plus recipe/tag links, outside the product before removing their tables;
  confirm the archive can be read back.
- Apply the agreed conversion decisions and test omitted values, ordering,
  tag normalization, and appended step durations. Confirm the write-pause
  assumption before scheduling cutover.

**Verify:** focused conversion tests; an inventory report with no unhandled
rows and a verified archive of tag metadata that the document cannot represent.

### 2. Add document validation and repository contracts

- Add the agreed create/read document schema in `src/lib/validation`; validate
  complete documents at application boundaries. Accept an omitted `yield`,
  reject `null`, and require a positive amount and nonempty unit when present.
  Replace the old timing rule that requires total time to exceed prep plus
  cook, because the agreed schema treats total time as independent elapsed time.
- Add a document mapper and the new service/repository methods under
  `src/lib/recipes` and `src/lib/db`. Keep owner binding in service calls.
- Define document-derived tag service results as `{ name, usageCount }`, with
  name-based cursors for deterministic pagination. Remove ID, description, and
  `unused` fields from the target API and MCP shapes.
- Specify conflict, missing-recipe, and invalid-document results so API and
  web callers can handle them without leaking database errors.

**Verify:** focused validation, service, and repository tests. Review the
consuming calls above before implementing their signatures.

### 3. Add storage without switching readers

- Add nullable `recipes.document jsonb` and `revision` in an additive
  migration. Keep the current columns and child tables during backfill.
- Add a database-side JSON Schema constraint for the complete nested document,
  using the Supabase-supported `pg_jsonschema` extension. It must allow `yield`
  to be absent while checking its fields when present, as well as checking
  ingredient/equipment objects, instruction and note arrays, tags, optional
  time fields, and source URL, not just top-level keys. Test representative
  documents against both this constraint and application validation so they
  do not drift. Plan the final `NOT NULL` constraint only after all rows pass.
- Derive `title_text` from `document.title` and use the existing `pg_trgm`
  extension with a GIN `gin_trgm_ops` index for `ILIKE '%term%'` search. Retain
  an owner-leading recent-list index. Avoid a broad JSONB GIN index until a
  concrete JSON containment query needs one.
- Filter an owner's recipes by exact tag-name containment in
  `document -> 'tags'`; derive tag inventory and exact usage counts by
  expanding the arrays only from that owner's recipes. Measure these queries
  with representative data, then add a targeted GIN expression index on the
  tag array if filtering needs it. Do not add a durable tag projection table.
- Keep `owner_id` as a database column and preserve current Clerk-bound RLS.
  At write cutover, revoke direct authenticated recipe INSERT/UPDATE/DELETE
  grants so document mutations can only use scoped database functions that
  share the owner-level transaction lock. Preserve owned SELECT access and
  handle deletion through an explicitly owner-bound function.
  Test that a direct authenticated `UPDATE recipes SET document = ...` is
  denied even for an owned row.

**Verify:** local migration, RLS checks for each owner and cross-owner denial,
direct-document-write denial, and representative `EXPLAIN` plans for title
substring and owner-scoped tag queries. Call the database writer
directly with malformed nested fields, missing required arrays, and invalid
present yield values; each must fail without changing data. A valid document
without `yield` must succeed.

### 4. Backfill and verify documents

- Backfill in bounded, restartable batches using the agreed converter. Keep old
  reads and writes active while initial batches run.
- Compare each generated document to its old recipe and child rows, including
  array order, optional fields, canonical tag names, notes, and source URL.
  Compare distinct tag names and usage counts from documents with the old
  associations. Count and resolve every exception; do not silently skip rows.
- Keep track of rows changed after their initial conversion so the final
  cutover can catch them up before document presence is enforced.

**Verify:** zero unconverted or mismatched recipes; repeatable backfill on a
disposable database; tested recovery if a batch stops midway.

### 5. Derive tag operations from recipe documents

- Read tag inventory by expanding `document.tags` from owner-filtered recipes,
  grouping by canonical name, and counting distinct recipes. Paginate with a
  deterministic name-based cursor; for usage sorting, use `(usageCount, name)`.
  Filtering recipes by a name uses exact JSONB array containment.
- Implement owner-bound name replacement for rename and merge. Lock affected
  recipe rows in a stable order, replace the source name, deduplicate when the
  target is already present, and bump each changed recipe's `revision` in the
  same database transaction. Acquire the same owner-scoped transaction lock
  before inspecting tag membership in recipe creates, replacements, deletions,
  and bulk name replacements. Overlapping replacements serialize; the later
  operation rechecks current source-name membership. If its source no longer
  exists, return a missing-source result without changing
  recipes. After a completed replacement, a future save may add the old name
  again because there is no alias registry. For high-fanout operations, define
  a maintenance path before using large transactions; never expose a partly
  completed merge.
- The bulk replacement database function must compare the authenticated
  caller's trusted Clerk JWT identity to `owner_id`, just like the recipe writer.
  Only the verified MCP adapter may call it with a service-role client, and that
  adapter supplies its bound owner after enforcing tag-write scope; tool input
  cannot supply an independent owner identity. A stale recipe revision must fail
  so an older edit cannot restore a replaced name. Keep MCP tag-read scope on
  inventory operations.
- Remove unused-tag deletion from target services. Removing a tag from the last
  recipe automatically removes it from inventory.

**Verify:** exact filtering and counts, duplicate collapse, deterministic
pagination, name replacement, concurrent recipe edits, two overlapping bulk
replacements in both orders, rollback on failure, authenticated wrong-owner
direct RPC calls, and MCP owner/scope denial. Check query plans at representative
scale.

### 6. Implement document reads and writes behind the current contract

- Add document repository reads and document-derived list summaries. Keep the
  current public readers active while verifying parity for pagination order,
  title substring matching, and tag filtering.
- Add an atomic document-write RPC that checks `(owner_id, id, revision)` on
  replacement and commits the complete document.
  Its database-side JSON Schema constraint must reject invalid content even
  when a caller bypasses the application validator.
  Authenticated calls must compare the trusted Clerk identity from the JWT to
  `owner_id`. Service-role calls use the verified MCP adapter's bound owner;
  an owner value supplied in RPC arguments is not independent proof of that
  identity. The adapter alone may hold the server-only service-role client.
- Reject invalid and stale writes without changing the document. Preserve
  recipe audit events and safe error responses.

**Verify:** focused repository and service tests, SQL transaction and conflict
tests, RLS and direct-write denial, and MCP attempts to supply another owner or
bypass write scope.

### 7. Prepare each application consumer

- Update the private detail and list views to render document fields, including
  absent or non-serving yields, equipment, and note arrays. Change the `/tags`
  page to show document-derived names and counts without IDs, descriptions, or
  unused tags. Verify component tests and affected Storybook stories.
- Update the private create/edit form and server actions to submit complete
  documents and expected revisions. Let users leave yield blank; omit the field
  on submission. Verify create and edit with no yield, stale conflict, and
  deletion interactions in the browser component project.
- Update website and PDF extraction/adapters to produce the new validated
  content without inventing a yield. Verify omitted yield, source URL
  preservation, bounded extraction failures, and recipes with no source URL.
- Stage these paths on the branch without deploying their new write behavior
  until the coordinated cutover; test each against the document repository
  locally.

**Verify:** focused component, action, import, and service tests after each
consumer change.

### 8. Prepare HTTP and MCP contracts, then cut over together

- Update the existing HTTP route handlers and MCP recipe tool schemas to the
  new document contract, including optional yield and revision conflict.
  Replace tag inventory, name replacement, and pagination contracts; remove
  unused-tag deletion. Verify scope enforcement and owner binding on all MCP
  tools.
- Publish the breaking contract. During a scheduled write pause, disable
  recipe and tag mutations in the UI, HTTP API, and MCP, temporarily revoke
  direct authenticated DML where needed, and drain old application instances.
  A UI-only pause is insufficient.
- Backfill the final changed rows, recompare documents, enforce document
  presence, activate document readers and writers, then reopen writes. Keep
  old columns and child tables, including the tag tables, for a read-only soak;
  no target write may update them after cutover.

**Verify:** API and MCP contract tests, owner/scope denial, final backfill
parity, a simulated old-instance write during the pause, and `pnpm check` for
the cross-boundary change.

### 9. Remove old recipe and tag storage after a read/write soak

- Confirm all consumers read and write documents, derived tag counts match an
  independent document scan, and the archive of legacy tag metadata is
  complete. Drop unused recipe fields, ingredient and step tables, `tags`,
  `recipe_tags`, old recipe and tag RPCs, and obsolete triggers/indexes in a
  separate migration. Retain recipe audit events and owner RLS.
- Update the root and boundary READMEs to describe the new contract and
  ownership rules. Do not hand-edit generated files.
- Obtain an independent review of owner binding, RLS, MCP scope enforcement,
  service-role access, bulk tag replacement, and migration rollback behavior.

**Verify:** disposable-database migration from the old schema, full `pnpm
test:db`, targeted API/MCP/browser checks, `pnpm check`, and `pnpm build` when
Next.js integration is affected. Review query plans after data has realistic
size; add further indexes only for measured search needs.

## Rollback boundary

Before new document writes are enabled, old readers and tables remain the
fallback. After accepting values that the old schema cannot represent (such as
cookie yields, equipment, or multiple notes), a complete reverse migration is
not lossless. Keep a verified database backup and favor a forward repair after
that point. Tag IDs, descriptions, and unused tags also cannot be reconstructed
from documents; retain their verified archive. Do not drop old storage in the
same release as write cutover.
