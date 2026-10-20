# Database standard

Features access Supabase through repositories in `src/lib/db`; the
[code organization standard](code-organization.md) owns this dependency rule.
Repositories accept the authenticated owner ID, use the request-scoped Clerk
session JWT for ordinary browser and API access, validate returned rows, and
return the shared domain shape. Database writes use owner-bound functions and
revision checks where the operation replaces existing recipe content.

Preserve row-level security as the enforcement boundary for ordinary requests.
Database functions that read or change recipes must retain an explicit owner
predicate and the caller's RLS context. Do not substitute a caller-supplied
owner or service-role client for that path. The sole service-role exception is
defined in the [security and ownership standard](security-and-ownership.md).

Keep tag inventory derived from recipe tag arrays; do not introduce a separate
tag catalog without an explicit product change. Name replacement across an
owner's recipes is atomic and removes duplicate target names. Preserve revision
conflict behavior for complete recipe replacement.

For schema, RPC, or RLS changes, use a disposable local database to run the
affected migration and database tests. Include concurrency checks when the
changed operation can race. The [verification standard](verification.md) gives
the broader check policy; the [database reference](../reference/database.md)
describes the current storage and query implementation.
