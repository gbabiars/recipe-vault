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

`TagService.list(ownerId, options)` provides exact usage counts, optional tag
descriptions, filters, deterministic sorting, and forward (`after`) and reverse
(`before`) keyset pagination for tag inventory. Descriptions are omitted when
the database value is `NULL`. The private `/tags` page uses the authenticated
session client, shows all owner tags in name order, and requests 25 tags per
page. Invalid URL cursors restart at the first page. The MCP adapter receives
only `OwnerBoundTagService`, whose `list(options)` call derives the owner from
verified authentication. `OwnerBoundTagService.deleteUnused(tagId)`
uses that same bound owner and refuses deletion unless the database confirms the
tag still has zero recipe associations at deletion time.
`OwnerBoundTagService.merge(sourceTagId, targetTagId)` consolidates only the two
explicitly selected IDs under the same verified owner; it never performs name
matching.

An authenticated application consumer can read descriptions through the same
inventory service:

```ts
const page = await tagService.list(user.id, {
  usage: "all",
  sort: "name_asc",
  limit: 25,
});
const description = page.tags[0]?.description;
```

The application can seek to the page immediately before a visible tag by
passing that tag as the `before` cursor:

```ts
const previousPage = await tagService.list(user.id, {
  usage: "all",
  sort: "name_asc",
  limit: 25,
  before: {
    usageCount: currentPage.tags[0].usageCount,
    name: currentPage.tags[0].name,
    id: currentPage.tags[0].id,
  },
});
```

Website import uses `readSource(url)` to fetch bounded HTTP HTML after checking each
DNS destination and redirect. `importRecipeInput(url)` extracts a canonical recipe
through AI Gateway and validates it before the API calls `RecipeService.create`.
The submitted URL remains the recipe's source URL.
Sites that reject automated HTTP requests return `access_denied` so the form can
explain that another source or manual entry is needed.

PDF import reads bounded embedded text in memory, then uses the same AI
extraction and canonical validation as website import. The first complete
recipe in document order is selected, with no source URL attached.
PDF.js runs as an external Node package so its worker loads beside the library
instead of from a Next.js server chunk. Reader failures are classified into
file format, damaged structure, encryption, and server reader errors without
returning PDF.js exception text to the client.
