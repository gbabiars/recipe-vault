# Recipe column storage implementation

The recipe object remains the application contract. Persistence is handled by
the repository, which maps typed database columns and JSONB arrays to the
validated object and back.

## Database fields

Store `title`, `description`, and optional `source_url` as text; time values as
nullable integer columns; optional yield amount and unit as paired nullable
numeric/text columns; and `tags`, `notes`, and `instructions` as ordered
`text[]` columns. Store `ingredients` and `equipment` as JSONB arrays of
validated objects. Preserve `id`, `owner_id`, `revision`, and timestamps as
database metadata.

## Implementation steps

1. Create a new migration with the Supabase CLI. Convert every current document
   into columns transactionally, preserve metadata and audit history, and
   compare the reconstructed recipe against its source before removing
   `document` and `title_text`.
2. Replace document-dependent SQL for write, delete, search, tag inventory, and
   tag replacement. Keep the owner-bound RPC boundary, optimistic revision
   checks, owner lock, RLS, and grants. Rebuild title substring search against
   the title column and preserve current matching and ordering behavior.
3. Update the repository to select and assemble the current recipe shape from
   the columns. Continue validating at the repository/service boundary and
   retain current HTTP and MCP contracts.
4. Update SQL fixtures, seed data, and storage documentation to use the new
   schema. Keep earlier migrations immutable.

## Verification and deployment

Run focused repository tests and all database SQL checks against a disposable
local database. Check conversion parity, optional yield/time, ordered arrays,
constraints, CRUD and conflicts, search, tag replacement concurrency, RLS, and
MCP owner/scope boundaries. Format the integrated changes and run `pnpm check`.

For cutover, pause recipe traffic, apply the schema migration, deploy the
matching application, verify recipe and tag operations plus owner isolation,
then resume traffic. Do not apply the migration to a hosted database as part of
this code change.
