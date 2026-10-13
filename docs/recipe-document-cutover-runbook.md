# Recipe column storage cutover

The recipe contract remains unchanged while persistence moves from one JSONB
document to typed columns, text arrays, and JSONB ingredient/equipment arrays.
The forward migration is
`supabase/migrations/20261013140710_recipe_column_storage.sql`.

## Preconditions

1. Confirm the intended database has all preceding recipe migrations applied
   and every recipe has a valid document. Inspect migration history and counts
   through the approved deployment process; this runbook does not authorize a
   hosted database change.
2. Deploy the matching application and migration as a coordinated cutover.
   Pause recipe traffic and drain older instances before changing the schema.
3. Review the migration target and confirm the conversion assertions preserve
   recipe IDs, owners, revisions, timestamps, and audit history.

## Rollout

1. Pause recipe creates, edits, deletes, and tag changes across the web, HTTP,
   and MCP entry points. Reads may also be paused while the schema changes.
2. Apply the forward migration through the reviewed database deployment
   process. It converts existing documents, validates the new columns, and
   removes the old document projection only after comparing retained rows.
3. Deploy the repository version that reads the new columns. Verify recipe
   list, detail, create, replace, delete, search, tag inventory/replacement,
   audit writes, owner isolation, and MCP scope enforcement.
4. Resume traffic only after those checks pass. Confirm the final migration
   history, columns, indexes, RLS policies, and RPC grants.

## Failure handling

The migration is transactional. If conversion or assertions fail, stop and
inspect the database error; do not bypass failed checks or use `CASCADE`.
Correct the issue in a new reviewed forward migration. After the migration has
committed, repair forward or restore through the operator's database recovery
process; the old JSONB column is removed as part of the cutover.

## Local verification

Use a disposable local Supabase database to apply all migrations and run the
focused SQL suite. Local success does not verify hosted migration state,
deployment drain, data, or grants.
