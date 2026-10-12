# Recipe document cutover runbook

Recipe documents are the canonical storage model. This runbook covers removing
the normalized recipe and tag storage after application code no longer depends
on it. The forward migration is
`supabase/migrations/20261012133627_recipe_document_storage_cleanup.sql`.

The migration snapshots and compares every retained recipe field and audit
event before commit, so it rolls back if cleanup changes or removes them. It
preserves recipe IDs, owners, timestamps, complete documents, revisions,
generated title search text, audit events, Clerk ownership helpers and policies,
and document mutation and tag RPCs. It discards normalized
ingredient/step rows, catalog tag IDs and descriptions, unused tags, recipe/tag
links, legacy recipe columns, and the RPCs used exclusively by those structures.
No recipe document or audit event is deleted or rewritten.

## Preconditions

1. Confirm the additive document migrations and guarded cutover migration have
   been applied to the intended database. Verify the target's migration history
   and that every recipe has a valid document. Do not use this local runbook as
   approval to target a hosted database.
2. Deploy the application release that no longer imports or calls legacy
   normalized recipe or tag paths. Confirm all instances running the prior
   release have drained before proceeding.
3. Review the exact cleanup migration and confirm the database endpoint. The
   tag catalog's IDs, descriptions, unused entries, and historical links have
   no equivalent in the document model and will be removed.

## Rollout

1. Keep recipe mutations paused while deploying the application release and
   draining old instances. Reads can resume when the new version is healthy.
2. Verify the deployed application can list, read, create, replace, and delete
   document recipes; list and replace document-derived tag names; write audit
   events; enforce Clerk owner isolation; and enforce MCP scopes.
3. Apply the cleanup migration through the reviewed database deployment
   process only after the application release is active and old instances are
   drained. It is forward-only; do not apply it while any deployed process can
   query the removed columns, tables, or RPCs.
4. Verify the final schema and grants. Confirm the preserved recipe count and
   documents, revisions, owner IDs, timestamps, title projection, audit rows,
   RLS policies, and document RPC grants. Confirm legacy recipe columns,
   normalized child/tag tables, and legacy-only functions are absent.
5. Run document CRUD, search/list, tag inventory/replacement, audit, RLS
   isolation, and MCP scope checks against the cleaned database. Reopen writes
   only after the checks pass.

## Failure handling

The migration is transactional, so a failed migration does not leave a partial
cleanup. Stop and inspect the database error and dependencies; do not add
`CASCADE` or bypass a failed dependency. Correct the migration in a new reviewed
forward change. After successful cleanup, roll back application code only if it
does not refer to removed objects; otherwise repair forward with the document
contract. Preserve database backups under the operator's normal retention
policy.

## Local verification

These commands target only the disposable local Supabase database. They do not
apply the migration remotely or establish production readiness.

```sh
SUPABASE_TELEMETRY_DISABLED=1 pnpm supabase migration up --local
PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres \
  -v ON_ERROR_STOP=1 -f supabase/tests/recipe_document_storage_cleanup.sql
```

The cutover SQL tests were transition-only checks and have been removed after
the cutover. Backfill and reconciliation utilities remain available for
investigating older environments, but they depend on the normalized schema and
must not be run after cleanup. The cleanup assertion and document storage,
writer, delete, RLS, tag inventory/replacement, and concurrency checks verify
the retained document schema and active authorization/RPC boundaries, along
with the absence of legacy storage. Local success does not verify any hosted
database's migration state, deployment drain, data, or grants.
