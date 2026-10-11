# Recipe document cutover runbook

This runbook describes a coordinated breaking change from normalized recipe
rows and tag tables to complete recipe documents. `recipes.document` becomes
required; document mutation RPCs become the only write path. Recipe tags are
stored in each document's `tags` array and derived for inventory. There is no
separate tag table in the target model. Recipe yield is optional.

**No production migration or write pause has been executed.** The migration and
SQL checks described here have only been applied and exercised against local
Supabase. Production execution requires a separately scheduled, reviewed
cutover with an operator who has access to the target environment.

## Before scheduling

1. Read the approved [recipe document storage specification](recipe-document-storage-spec.md)
   and [implementation plan](recipe-document-implementation-plan.md). Publish
   the breaking HTTP and MCP contracts to clients and agree on a maintenance
   window. Existing `/api/v1` and MCP clients must move together: `PATCH` is
   removed, document `PUT` uses a revision, and MCP recipe/tag contracts change.
2. Confirm the additive migrations and backfill have already been deployed to
   the target database. The cutover gate is
   `supabase/migrations/20261011045604_recipe_document_cutover.sql`; do not run
   it before all recipes have a valid document and the old application writers
   have stopped.
3. Take and verify a recoverable database backup. Export the legacy tag owner,
   ID, name, description, and recipe/tag links, including unused tags, to a
   durable archive and verify it can be read back. Those records cannot be
   reconstructed from recipe documents.
4. Review the intended database endpoint and migration state. Do not put
   credentials in this document, command history, or logs. The backfill tool
   rejects remote writes unless explicitly opted in and requires TLS server
   identity verification. Remote execution must follow a separately reviewed
   operational procedure and must not use this local-only runbook as its sole
   approval.

## Coordinated cutover

Keep the mutation pause active from the start of step 1 until the new application
version is healthy and verified in step 7. Reads may remain available if their
old instances cannot mutate data.

1. Disable recipe and tag mutations across the web UI, HTTP API, and MCP. Pause
   background jobs or integrations that can write recipes. Confirm requests are
   rejected or queued and that in-flight writes have drained. A UI-only pause
   is insufficient.
2. Stop routing traffic to every old application instance and verify they are
   drained. This prevents an old writer from changing normalized rows after
   the final refresh. Keep rollback operators and the backup available.
3. Using the explicitly configured database connection, catch up documents
   changed since the initial backfill:

   ```sh
   pnpm exec tsx scripts/backfill-recipe-documents.ts --refresh-stale
   ```

   Resolve every exception printed by the script; do not proceed with an
   incomplete refresh. Then run the independent parity reconciliation:

   ```sh
   pnpm exec tsx scripts/backfill-recipe-documents.ts --reconcile
   ```

   Reconciliation must report no missing, invalid, stale, or mismatched
   documents. Re-run refresh and reconcile after correcting any data issue.

4. Confirm the archive is verified, every recipe has a valid document, and no
   old writer remains. Apply the final cutover migration using the reviewed
   Supabase deployment process. It sets `document NOT NULL`, revokes direct
   DML on legacy recipe/child/tag tables, disables legacy write RPCs, and grants
   the document mutation RPCs. If its precondition fails, stop and return to
   reconciliation; do not bypass the guard.
5. Deploy the application release that uses document reads and writes across
   the private UI, HTTP API, and MCP boundary. Keep mutations paused while
   instances start. Verify health, document list/detail reads, create/replace
   with and without yield, stale revision conflict, delete, tag inventory and
   name replacement, plus Clerk ownership and MCP read/write scope behavior.
6. Confirm direct authenticated table mutation is denied and the new RPCs work
   only through their intended owner-bound paths. Check safe audit behavior and
   that the service-role credential remains isolated to the verified MCP
   adapter. Avoid logging recipe payloads or credentials during checks.
7. Reopen writes only after the new application is healthy and all checks pass.
   Monitor errors and document/tag inventory parity during the read-only legacy
   storage soak. Do not drop normalized recipe or tag storage in this release.

## Rollback boundary

### Before document writes reopen

If cutover fails before any user can write through the new document contract,
keep mutations paused. The committed rollback SQL is represented in
[`supabase/tests/recipe_document_cutover_rollback.sql`](../supabase/tests/recipe_document_cutover_rollback.sql): it restores nullable documents,
legacy table privileges and legacy RPC grants, and revokes document RPC grants.
It is a transactional test fixture, not an unattended production rollback
command. Have the database operator adapt and review the compensating SQL for
the target environment, then verify legacy writes and re-run document backfill
and reconciliation before another attempt. Roll back the application release
while the mutation pause remains active.

### After document writes reopen

Once writes have been accepted, old storage may not represent values such as a
non-serving yield, equipment, multiple notes, or a changed source URL. A reverse
migration can lose data. Keep the backup and legacy storage, pause mutations if
necessary, and prefer a forward repair against the document model. Preserve the
archived legacy tag metadata; document tags cannot reconstruct IDs,
descriptions, unused tags, or historical links.

## Local verification

The following commands are for a disposable local Supabase database only. The
local project uses the standard Postgres development password shown in its
configuration; do not copy local credentials to a hosted environment.

```sh
SUPABASE_TELEMETRY_DISABLED=1 pnpm supabase migration up --local
PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres \
  -v ON_ERROR_STOP=1 -f supabase/tests/recipe_document_cutover.sql
PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres \
  -v ON_ERROR_STOP=1 -f supabase/tests/recipe_document_cutover_rollback.sql
```

The cutover test verifies required documents, owner-bound document RPCs,
revision behavior, legacy DML denial, and document-backed tag replacement. The
rollback test checks the pre-write compensating privileges inside a transaction
and rolls its changes back. A passing local test does not establish production
readiness or execute any production migration.
