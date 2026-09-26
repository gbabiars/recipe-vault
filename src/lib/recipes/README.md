# Recipe library boundary

`recipe-service.ts` provides the ownership-aware recipe command/query surface used by the web UI and `/api/v1`.
`index.ts` composes it with the request-scoped repository. Future application APIs must
reuse this service rather than reaching into Supabase from routes. Updates are patches: the service first obtains the owned recipe, merges the patch, and revalidates the full canonical recipe before persistence.

Recipe tag names are canonical lowercase ASCII with surrounding whitespace
removed and repeated internal ASCII spaces collapsed to one. The recipe input
schema removes duplicates after normalization. Tags with distinct canonical
names remain distinct; dietary flags stay separate. The database applies the
same tag rule to legacy array writes and existing data during backfill.

`tag-service.ts` provides owner-aware tag catalog operations: `list` (optional
substring search and bounded offset/limit), `get`, `create`, `rename`, `delete`,
and `listRecipes`. Tags return stable IDs, canonical names, and recipe counts.
Create reuses an exact owner/name match; rename returns `renamed`, `conflict`, or
`not_found`. Missing or foreign tags return `null` from lookups and associated
recipe listings. `OwnerBoundTagService` binds the verified MCP owner for later
tools. Recipe listing by tag ID uses any-match association filtering; existing
public recipe name filters and recipe response shapes remain compatible.
