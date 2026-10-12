# Recipe library boundary

`recipe-service.ts` provides the owner-aware recipe command/query surface used
by the web UI, HTTP API, and MCP adapters. `index.ts` composes it with the
request-scoped repository. Application routes must use these services rather
than reaching into Supabase. Recipe create and replacement validate the complete
document; replacement checks the expected revision and returns a conflict when
the stored revision has changed. Ownership comes from authenticated Clerk
identity, never from a document or request field.

Recipe tag names are canonical lowercase ASCII with surrounding whitespace
removed and repeated internal ASCII spaces collapsed. Duplicate names are
removed after normalization. Tags are stored in each recipe document's
`tags: string[]`; they are not a separate durable catalog. `TagService.listFromRecipes(ownerId,
options)` returns only `{ name, usageCount }` values derived from that owner's
documents. `TagService.replaceNameInRecipes(ownerId, { sourceName, targetName
})` performs an owner-scoped atomic name replacement, deduplicating a recipe's
array if the target name is already present. Removing a name from its last
recipe removes it from inventory.

An authenticated consumer can list the derived inventory and replace a name
through the same domain service:

```ts
const page = await tagService.listFromRecipes(user.id, {
  sort: "name_asc",
  limit: 25,
});
await tagService.replaceNameInRecipes(user.id, {
  sourceName: "weeknight dinners",
  targetName: "weeknight",
});
```

Tag inventory and replacement use recipe documents only. The forward cleanup
migration removes the old catalog tables and their exclusive RPCs after the
application release without those paths is deployed.

Website import uses `readSource(url)` to fetch bounded HTTP HTML after checking
each DNS destination and redirect. `importRecipeDocumentContent(url)` extracts
and validates a document before it is saved by the recipe service. The submitted
URL is retained as `sourceUrl` when supplied. Sites that reject automated HTTP
requests return `access_denied` so the form can explain that another source or
manual entry is needed.

PDF import reads bounded embedded text in memory, then uses the same document
extraction and validation as website import. The first complete recipe in
document order is selected; no yield is invented. PDF.js runs as an external
Node package so its worker loads beside the library instead of from a Next.js
server chunk. Reader failures are classified into file format, damaged
structure, encryption, and server reader errors without returning PDF.js
exception text to the client.
