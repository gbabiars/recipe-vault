# Recipe library boundary

`recipe-service.ts` provides the ownership-aware recipe command/query surface used by the web UI and `/api/v1`.
`index.ts` composes it with the request-scoped repository. Future application APIs must
reuse this service rather than reaching into Supabase from routes. Updates are patches: the service first obtains the owned recipe, merges the patch, and revalidates the full canonical recipe before persistence.

Recipe tag names are canonical lowercase ASCII with surrounding whitespace
removed and repeated internal ASCII spaces collapsed to one. The recipe input
schema removes duplicates after normalization. Tags with distinct canonical
names remain distinct. The database applies the
same tag rule to legacy array writes and existing data during backfill.

Recipe listing filters by canonical tag name. `RecipeService.listTags(ownerId,
search)` exposes the bounded owned tag catalog to the authenticated API.

`TagService.list(ownerId, options)` provides exact usage counts, filters,
deterministic sorting, and keyset pagination for MCP tag inventory. The MCP
adapter receives only `OwnerBoundTagService`, whose `list(options)` call derives
the owner from verified authentication. `OwnerBoundTagService.deleteUnused(tagId)`
uses that same bound owner and refuses deletion unless the database confirms the
tag still has zero recipe associations at deletion time.
`OwnerBoundTagService.merge(sourceTagId, targetTagId)` consolidates only the two
explicitly selected IDs under the same verified owner; it never performs name
matching.

Website import uses `readSource(url)` to fetch bounded HTTP HTML after checking each
DNS destination and redirect. `importRecipeInput(url)` extracts a canonical recipe
through AI Gateway and validates it before the API calls `RecipeService.create`.
The submitted URL remains the recipe's source URL.
Sites that reject automated HTTP requests return `access_denied` so the form can
explain that another source or manual entry is needed.
